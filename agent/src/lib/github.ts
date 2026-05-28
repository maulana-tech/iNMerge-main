import { Octokit } from "@octokit/rest";

export const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export interface RepoInfo {
  owner: string;
  repo: string;
}

export function parseRepoUrl(repoLink: string): RepoInfo {
  // handles: https://github.com/owner/repo or owner/repo
  const match = repoLink.match(/github\.com\/([^/]+)\/([^/\s]+)/);
  if (match) return { owner: match[1], repo: match[2].replace(/\.git$/, "") };

  const parts = repoLink.split("/");
  if (parts.length >= 2) return { owner: parts[0], repo: parts[1] };

  throw new Error(`Cannot parse repo URL: ${repoLink}`);
}

export async function getIssueDetails(repoLink: string, issueNumber: number) {
  const { owner, repo } = parseRepoUrl(repoLink);
  const { data } = await octokit.issues.get({ owner, repo, issue_number: issueNumber });
  return data;
}

export async function getRepoFileTree(repoLink: string, maxFiles = 60): Promise<string[]> {
  const { owner, repo } = parseRepoUrl(repoLink);
  const { data } = await octokit.git.getTree({ owner, repo, tree_sha: "HEAD", recursive: "1" });
  return (data.tree ?? [])
    .filter((f) => f.type === "blob")
    .map((f) => f.path!)
    .filter((p) => !p.startsWith("node_modules") && !p.startsWith(".git"))
    .slice(0, maxFiles);
}

export async function getFileContent(repoLink: string, path: string): Promise<string> {
  const { owner, repo } = parseRepoUrl(repoLink);
  const { data } = await octokit.repos.getContent({ owner, repo, path });
  if ("content" in data && data.encoding === "base64") {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }
  throw new Error(`Cannot read file: ${path}`);
}

export async function forkRepo(repoLink: string): Promise<RepoInfo> {
  const { owner, repo } = parseRepoUrl(repoLink);
  const { data } = await octokit.repos.createFork({ owner, repo });
  return { owner: data.owner.login, repo: data.name };
}

export async function createBranch(fork: RepoInfo, branchName: string, fromSha: string) {
  await octokit.git.createRef({
    owner: fork.owner,
    repo: fork.repo,
    ref: `refs/heads/${branchName}`,
    sha: fromSha,
  });
}

export async function getDefaultBranchSha(fork: RepoInfo): Promise<string> {
  const { data } = await octokit.repos.get({ owner: fork.owner, repo: fork.repo });
  const branch = data.default_branch;
  const { data: ref } = await octokit.git.getRef({
    owner: fork.owner,
    repo: fork.repo,
    ref: `heads/${branch}`,
  });
  return ref.object.sha;
}

export async function commitFile(
  fork: RepoInfo,
  branch: string,
  path: string,
  content: string,
  message: string,
  existingSha?: string
) {
  await octokit.repos.createOrUpdateFileContents({
    owner: fork.owner,
    repo: fork.repo,
    path,
    message,
    content: Buffer.from(content).toString("base64"),
    branch,
    ...(existingSha ? { sha: existingSha } : {}),
  });
}

export async function createPullRequest(
  upstream: RepoInfo,
  fork: RepoInfo,
  branch: string,
  title: string,
  body: string
): Promise<string> {
  const { data } = await octokit.pulls.create({
    owner: upstream.owner,
    repo: upstream.repo,
    title,
    body,
    head: `${fork.owner}:${branch}`,
    base: "main",
  });
  return data.html_url;
}
