import { thinkAndCode } from "../lib/nvidia.js";
import { getFileContent, getRepoFileTree, parseRepoUrl } from "../lib/github.js";
import type { OnChainIssue } from "../lib/contract.js";

const SYSTEM_PROMPT = `You are an expert software engineer AI agent.
Your job is to solve GitHub issues by writing code changes.

Rules:
- Analyze the issue carefully before writing any code
- Read the relevant files first to understand the codebase
- Produce minimal, correct changes — do not refactor unrelated code
- Return ONLY a JSON object with the structure below, no extra text

Response format:
{
  "analysis": "brief explanation of the problem and approach",
  "files": [
    {
      "path": "relative/path/to/file.ts",
      "content": "full file content after changes",
      "commitMessage": "short commit message for this file"
    }
  ],
  "prTitle": "Pull Request title",
  "prBody": "Pull Request description explaining what was changed and why"
}`;

export interface SolverResult {
  analysis: string;
  files: Array<{
    path: string;
    content: string;
    commitMessage: string;
  }>;
  prTitle: string;
  prBody: string;
}

export async function solveIssue(issue: OnChainIssue, githubIssueBody: string): Promise<SolverResult> {
  const { owner, repo } = parseRepoUrl(issue.repoLink);

  // get file tree for context
  const fileTree = await getRepoFileTree(issue.repoLink);

  // read README if exists
  let readme = "";
  try {
    readme = await getFileContent(issue.repoLink, "README.md");
    readme = readme.slice(0, 2000); // cap to avoid token overflow
  } catch {
    // no README, continue
  }

  const userPrompt = `
Repository: ${owner}/${repo}
Issue title: ${issue.githubProjectId}
Issue description: ${githubIssueBody}
Bounty: ${Number(issue.bountyAmount) / 1e18} mUSD

File tree:
${fileTree.join("\n")}

${readme ? `README (truncated):\n${readme}` : ""}

Based on the issue, identify which files need to be changed and solve the issue.
If you need to read a specific file to understand context, mention it in your analysis but proceed with your best solution based on available information.
`.trim();

  const raw = await thinkAndCode(SYSTEM_PROMPT, userPrompt);

  // extract JSON from response (model may wrap it in markdown)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`NVIDIA model returned non-JSON response:\n${raw}`);

  return JSON.parse(jsonMatch[0]) as SolverResult;
}

export async function refineWithFileContent(
  issue: OnChainIssue,
  githubIssueBody: string,
  filePath: string,
  previousAnalysis: string
): Promise<SolverResult> {
  const fileContent = await getFileContent(issue.repoLink, filePath);

  const userPrompt = `
Issue: ${issue.githubProjectId}
Description: ${githubIssueBody}

File to modify: ${filePath}
Current content:
\`\`\`
${fileContent}
\`\`\`

Previous analysis: ${previousAnalysis}

Now produce the final solution for this file.
`.trim();

  const raw = await thinkAndCode(SYSTEM_PROMPT, userPrompt);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`NVIDIA model returned non-JSON response:\n${raw}`);

  return JSON.parse(jsonMatch[0]) as SolverResult;
}
