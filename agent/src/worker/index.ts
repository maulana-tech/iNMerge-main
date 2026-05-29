import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";
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

// ── env validation ────────────────────────────────────────────────────────────
const REQUIRED_VARS = [
  "NVIDIA_API_KEY",
  "GITHUB_TOKEN",
  "WORKER_PRIVATE_KEY",
  "ISSUE_ADDRESS",
  "MANTLEUSD_ADDRESS",
] as const;

for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    console.error(`[worker] FATAL: missing required env var: ${key}`);
    process.exit(1);
  }
}

const account = privateKeyToAccount(process.env.WORKER_PRIVATE_KEY as `0x${string}`);
const WORKER_ADDRESS = account.address.toLowerCase();
const POLL_INTERVAL = Number(process.env.POLL_INTERVAL_MS ?? 30_000);

// track issues attempted this session (resets on restart — acceptable, contract rejects duplicates)
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

function parseIssueNumber(githubProjectId: string): number | null {
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
    const issueNumber = parseIssueNumber(issue.githubProjectId);
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

    // step 2: if solution has files, refine with actual file content
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

    // step 6: submit claim on-chain (AVS validates after merge)
    log(`Submitting claim for issue #${issue.id}...`);
    const receipt = await claimReward(issue.id, prUrl);
    log(`Claim submitted! tx: ${receipt.transactionHash}`);

  } catch (err) {
    log(`Error on issue #${issue.id}: ${String(err)}`);
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

// ── graceful shutdown ─────────────────────────────────────────────────────────
let timer: ReturnType<typeof setInterval>;

function shutdown(signal: string) {
  log(`Received ${signal}, shutting down gracefully...`);
  clearInterval(timer);
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("uncaughtException", (err) => {
  log(`Uncaught exception: ${String(err)}`);
  // keep running — poll errors are non-fatal
});
process.on("unhandledRejection", (reason) => {
  log(`Unhandled rejection: ${String(reason)}`);
});

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  log("iNMerg Worker Agent started");
  log(`Model: ${process.env.NVIDIA_MODEL ?? "meta/llama-3.3-70b-instruct"}`);
  log(`Wallet: ${WORKER_ADDRESS}`);
  log(`Poll interval: ${POLL_INTERVAL}ms`);
  log(`Contract: ${process.env.ISSUE_ADDRESS}`);

  await poll();
  timer = setInterval(poll, POLL_INTERVAL);
}

main().catch((err) => {
  log(`Fatal startup error: ${String(err)}`);
  process.exit(1);
});
