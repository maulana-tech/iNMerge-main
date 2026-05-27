import {
  ISSUE_ADDRESS,
  ISSUE_ABI,
  MANTLE_USD_ADDRESS,
  MANTLE_USD_ABI,
} from "@/config/const";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { toast } from "sonner";
import React from "react";
import { claimRewardParams } from "@/utils/types";

const MANTLE_SEPOLIA_EXPLORER = "https://sepolia.mantlescan.xyz/tx/";

export const useClaimRewards = (prLink: string) => {
  const [claimRewards, setClaimRewards] =
    React.useState<claimRewardParams | null>(null);

  const {
    data: claimHash,
    isPending: isClaimPending,
    writeContract: writeClaim,
  } = useWriteContract();

  const {
    data: approvalHash,
    isPending: isApprovalPending,
    writeContract: writeApproval,
  } = useWriteContract();

  const { data: usedPRLinksData, error: isError } = useReadContract({
    address: ISSUE_ADDRESS,
    abi: ISSUE_ABI,
    functionName: "usedPRLinks",
    args: [prLink],
  });

  const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } =
    useWaitForTransactionReceipt({
      hash: approvalHash,
    });

  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } =
    useWaitForTransactionReceipt({
      hash: claimHash,
    });

  const handleClaimRewards = async (params: claimRewardParams) => {
    try {
      if (isError) {
        console.error("Error checking PR:", isError);
        toast.error("Failed to check PR status");
        return;
      }

      if (usedPRLinksData === true) {
        toast.error("PR Already used", {
          description: "This PR already been claimed",
        });
        return;
      }
      writeApproval({
        abi: MANTLE_USD_ABI,
        address: MANTLE_USD_ADDRESS,
        functionName: "approve",
        args: [ISSUE_ADDRESS, BigInt(params.bountyAmount)],
      });
      setClaimRewards(params);
    } catch (err) {
      toast.error("Transaction Failed", {
        description:
          err instanceof Error ? err.message : "Unexpected error occurred",
      });
      throw err;
    }
  };

  React.useEffect(() => {
    if (isApprovalSuccess && claimRewards) {
      const accessToken = sessionStorage.getItem("accessToken") || "";
      writeClaim({
        address: ISSUE_ADDRESS,
        abi: ISSUE_ABI,
        functionName: "claimReward",
        args: [
          claimRewards.issueId,
          claimRewards.prLink,
          claimRewards.isMerged,
          accessToken,
        ],
      });
      setClaimRewards(null);
    }
  }, [isApprovalSuccess, claimRewards, writeClaim]);


  React.useEffect(() => {
    if (approvalHash) {
      toast.success("Token Approval Initiated", {
        description: (
          <a
            href={`${MANTLE_SEPOLIA_EXPLORER}${approvalHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline"
          >
            View Transaction on Mantle Sepolia Explorer
          </a>
        ),
      });
    }
  }, [approvalHash]);

  return {
    isClaimPending,
    handleClaimRewards,
    isClaimConfirming,
    isClaimSuccess,
    isApprovalPending,
    isApprovalConfirming,
    usedPRLinksData,
    claimHash,
  };
};
