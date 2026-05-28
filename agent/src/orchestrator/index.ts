import "dotenv/config";
import { createPublicClient, createWalletClient, http, parseAbi, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { octokit } from "../lib/github.js";
import { thinkAndCode } from "../lib/nvidia.js";

const mantleSepolia = {
  id: 5003,
  name: "Mantle Sepolia",
  nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
  rpcUrls: { default: { http: [process.env.MANTLE_RPC_URL ?? "https://rpc.sepolia.mantle.xyz"] } },
} as const;

const account = privateKeyToAccount(process.env.WORKER_PRIVATE_KEY as `0x${string}`);
const walletClient = createWalletClient({ account, chain: mantleSepolia, transport: http() });
const publicClient = createPublicClient({ chain: mantleSepolia, transport: http() });

const ISSUE_ADDRESS = process.env.ISSUE_ADDRESS as `0x${string}`;
const MUSD_ADDRESS = process.env.MANTLEUSD_ADDRESS as `0x${string}`;

const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 value) returns (bool)",
]);

const ISSUE_ABI = parseAbi([
  "function createIssue(string _githubProjectId, uint256 _bountyAmount, string _projectName, string _description, string _repoLink, uint256 _deadline, uint256 _maxClaims) nonpayable",
]);

export interface BountyRequest {
  repoLink: string;        // e.g. "https://github.com/owner/repo"
  issueNumber: number;     // GitHub issue number
  bountyAmountMUSD: number; // e.g. 10 = 10 mUSD
  maxClaims?: number;      // default 1
  deadlineDays?: number;   // default 7
}

async function enrichIssueWithAI(
  title: string,
  body: string,
  repoLink: string
): Promise<{ projectName: string; description: string }> {
  const raw = await thinkAndCode(
    `You are a helpful assistant that summarizes GitHub issues for a bounty platform.
Return ONLY a JSON object: { "projectName": "...", "description": "..." }
projectName: short name of the project (from repo URL or title)
description: 2-3 sentence summary of what needs to be done`,
    `Repo: ${repoLink}\nIssue title: ${title}\nIssue body: ${body?.slice(0, 1000) ?? "(empty)"}`
  );

  const match = raw.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  return { projectName: repoLink.split("/").pop() ?? "Unknown", description: title };
}

export async function createBounty(req: BountyRequest) {
  const { repoLink, issueNumber, bountyAmountMUSD, maxClaims = 1, deadlineDays = 7 } = req;

  // fetch GitHub issue for context
  const urlMatch = repoLink.match(/github\.com\/([^/]+)\/([^/\s]+)/);
  if (!urlMatch) throw new Error(`Invalid repo URL: ${repoLink}`);
  const [, owner, repo] = urlMatch;

  console.log(`Fetching issue #${issueNumber} from ${owner}/${repo}...`);
  const { data: ghIssue } = await octokit.issues.get({ owner, repo, issue_number: issueNumber });

  // use AI to enrich the description
  const { projectName, description } = await enrichIssueWithAI(
    ghIssue.title,
    ghIssue.body ?? "",
    repoLink
  );

  const githubProjectId = `${owner}/${repo}#${issueNumber}`;
  const bountyWei = parseEther(bountyAmountMUSD.toString());
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineDays * 86400);

  // approve mUSD spending
  console.log(`Approving ${bountyAmountMUSD} mUSD...`);
  const approveTx = await walletClient.writeContract({
    address: MUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [ISSUE_ADDRESS, bountyWei],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTx });

  // create bounty on-chain
  console.log(`Creating bounty for ${githubProjectId}...`);
  const createTx = await walletClient.writeContract({
    address: ISSUE_ADDRESS,
    abi: ISSUE_ABI,
    functionName: "createIssue",
    args: [githubProjectId, bountyWei, projectName, description, repoLink, deadline, BigInt(maxClaims)],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: createTx });
  console.log(`Bounty created! tx: ${receipt.transactionHash}`);

  return { githubProjectId, projectName, description, txHash: receipt.transactionHash };
}

// CLI usage: npx tsx src/orchestrator/index.ts <repoLink> <issueNumber> <bountyMUSD>
const [, , repoArg, issueArg, amountArg] = process.argv;
if (repoArg && issueArg && amountArg) {
  createBounty({
    repoLink: repoArg,
    issueNumber: Number(issueArg),
    bountyAmountMUSD: Number(amountArg),
  }).then(console.log).catch(console.error);
}
