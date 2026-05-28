import "dotenv/config";
import { getAllIssues, claimReward, type OnChainIssue } from "../lib/contract.js";
import { solveIssue, refineWithFileContent } from "./solver.js";
import {
  forkRepo,
  createBranch,
  getDefaultBranchSha,
  commitFile,
  createPullRequest,
  getIssueDetails,
  parseRepoUrl,
} from "../lib/github.js";

const WORKER_ADDRESS = process.env.WORKER_ADDRESS?.toLowerCase() ?? "";
const POLL_INTERVAL = Number(process.env.POLL_INTERVAL_MS ?? 30_000);

// track issues we already attempted in this session
const attempted = new Set<string>();

function log(msg: string) {
  console.log(`[worker ${new Date().toISOString()}] ${msg}`);
}

function isClaimable(issue: OnChainIssue): boolean {
  if (!issue.isOpen) return false;
  if (issue.currentClaims >= issue.maxClaims) return false;
  if (Number(issue.deadline) * 1000 < Date.now()) return false;
  if (attempted.has(issue.id.toString())) return false;
  return true;
}

async function parseIssueNumber(githubProjectId: string): Promise<number | null> {
  // githubProjectId format: "owner/repo#123" or just a number
  const match = githubProjectId.match(/#(\d+)$/);
  if (match) return Number(match[1]);
  if (/^\d+$/.test(githubProjectId)) return Number(githubProjectId);
  return null;
}

async function handleIssue(issue: OnChainIssue) {
  attempted.add(issue.id.toString());
  log(`Attempting issue #${issue.id}: "${issue.projectName}" — ${Number(issue.bountyAmount) / 1e18} mUSD`);

  try {
    const upstream = parseRepoUrl(issue.repoLink);

    // fetch GitHub issue body for full context
    const issueNumber = await parseIssueNumber(issue.githubProjectId);
    let githubIssueBody = issue.description;
    if (issueNumber) {
      try {
        const ghIssue = await getIssueDetails(issue.repoLink, issueNumber);
        githubIssueBody = `${ghIssue.title}\n\n${ghIssue.body ?? ""}`;
      } catch {
        log(`Could not fetch GitHub issue body, using on-chain description`);
      }
    }

    // step 1: AI solves the issue
    log(`Sending issue to NVIDIA model for analysis...`);
    let solution = await solveIssue(issue, githubIssueBody);

    // step 2: if solution has files, refine each one with actual file content
    if (solution.files.length > 0) {
      log(`Refining solution for ${solution.files.length} file(s)...`);
      solution = await refineWithFileContent(
        issue,
        githubIssueBody,
        solution.files[0].path,
        solution.analysis
      );
    }

    if (solution.files.length === 0) {
      log(`No file changes produced — skipping`);
      return;
    }

    // step 3: fork repo & create branch
    log(`Forking ${upstream.owner}/${upstream.repo}...`);
    const fork = await forkRepo(issue.repoLink);
    await new Promise((r) => setTimeout(r, 3000)); // wait for fork to be ready

    const branchName = `inmerg-fix-${issue.id}-${Date.now()}`;
    const baseSha = await getDefaultBranchSha(fork);
    await createBranch(fork, branchName, baseSha);
    log(`Created branch ${branchName}`);

    // step 4: commit changes
    for (const file of solution.files) {
      await commitFile(fork, branchName, file.path, file.content, file.commitMessage);
      log(`Committed ${file.path}`);
    }

    // step 5: open PR
    const prUrl = await createPullRequest(
      upstream,
      fork,
      branchName,
      solution.prTitle,
      `${solution.prBody}\n\n---\n_Solved by iNMerg Worker Agent_`
    );
    log(`PR created: ${prUrl}`);

    // step 6: claim reward on-chain (PR not merged yet — AVS will validate after merge)
    log(`Submitting claim for issue #${issue.id}...`);
    const receipt = await claimReward(issue.id, prUrl);
    log(`Claim submitted! tx: ${receipt.transactionHash}`);

  } catch (err) {
    log(`Error handling issue #${issue.id}: ${String(err)}`);
  }
}

async function poll() {
  log("Polling for open bounties...");
  try {
    const issues = await getAllIssues();
    const claimable = issues.filter(isClaimable);
    log(`Found ${claimable.length} claimable issue(s) out of ${issues.length} total`);

    for (const issue of claimable) {
      await handleIssue(issue);
    }
  } catch (err) {
    log(`Poll error: ${String(err)}`);
  }
}

async function main() {
  log("iNMerg Worker Agent started");
  log(`Model: ${process.env.NVIDIA_MODEL ?? "meta/llama-3.3-70b-instruct"}`);
  log(`Wallet: ${WORKER_ADDRESS || "(not set)"}`);

  await poll();
  setInterval(poll, POLL_INTERVAL);
}

main();
