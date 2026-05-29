import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const mantleSepolia = {
  id: 5003,
  name: "Mantle Sepolia",
  nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
  rpcUrls: { default: { http: [process.env.MANTLE_RPC_URL ?? "https://rpc.sepolia.mantle.xyz"] } },
} as const;

export const publicClient = createPublicClient({
  chain: mantleSepolia,
  transport: http(),
});

export function getWalletClient() {
  const account = privateKeyToAccount(process.env.WORKER_PRIVATE_KEY as `0x${string}`);
  return createWalletClient({ account, chain: mantleSepolia, transport: http() });
}

const ISSUE_ABI = parseAbi([
  "function getAllIssues() view returns ((uint256 id, string githubProjectId, uint256 bountyAmount, string projectName, string description, string repoLink, uint256 deadline, bool isOpen, address owner, uint256 maxClaims, uint256 currentClaims)[])",
  "function getIssueDetails(uint256 _issueId) view returns ((uint256 id, string githubProjectId, uint256 bountyAmount, string projectName, string description, string repoLink, uint256 deadline, bool isOpen, address owner, uint256 maxClaims, uint256 currentClaims))",
  "function claimReward(uint256 _issueId, string _prLink, bool _isMerged, string _accessToken) nonpayable",
  "function validateClaim(uint256 _issueId, uint256 _claimIndex, bool _isValid) nonpayable",
  "function claims(uint256, uint256) view returns (string prLink, bool isMerged, address developer, bool isValidated, uint256 timestamp, string accessToken)",
  "function claimCounts(uint256) view returns (uint256)",
]);

const ISSUE_ADDRESS = process.env.ISSUE_ADDRESS as `0x${string}`;

export interface OnChainIssue {
  id: bigint;
  githubProjectId: string;
  bountyAmount: bigint;
  projectName: string;
  description: string;
  repoLink: string;
  deadline: bigint;
  isOpen: boolean;
  owner: `0x${string}`;
  maxClaims: bigint;
  currentClaims: bigint;
}

export async function getAllIssues(): Promise<OnChainIssue[]> {
  const issues = await publicClient.readContract({
    address: ISSUE_ADDRESS,
    abi: ISSUE_ABI,
    functionName: "getAllIssues",
  });
  return issues as OnChainIssue[];
}

export async function claimReward(
  issueId: bigint,
  prLink: string,
  accessToken: string = ""
) {
  const wallet = getWalletClient();
  const hash = await wallet.writeContract({
    address: ISSUE_ADDRESS,
    abi: ISSUE_ABI,
    functionName: "claimReward",
    args: [issueId, prLink, true, accessToken],
  });
  return publicClient.waitForTransactionReceipt({ hash });
}

export async function getClaimCount(issueId: bigint): Promise<bigint> {
  return publicClient.readContract({
    address: ISSUE_ADDRESS,
    abi: ISSUE_ABI,
    functionName: "claimCounts",
    args: [issueId],
  }) as Promise<bigint>;
}

export async function validateClaim(
  issueId: bigint,
  claimIndex: bigint
) {
  const wallet = getWalletClient();
  const hash = await wallet.writeContract({
    address: ISSUE_ADDRESS,
    abi: ISSUE_ABI,
    functionName: "validateClaim",
    args: [issueId, claimIndex, true],
  });
  return publicClient.waitForTransactionReceipt({ hash });
}
