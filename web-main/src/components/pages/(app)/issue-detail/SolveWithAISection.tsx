"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Loader2, ChevronDown, ChevronUp, Zap, Clock, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IssueDetails } from "@/utils/types";

interface AgentPlan {
  summary: string;
  approach: string;
  steps: string[];
  estimatedComplexity: "low" | "medium" | "high";
  estimatedTime: string;
}

interface SolveWithAISectionProps {
  issueDetails: IssueDetails;
  issueId: string;
}

const complexityColor = {
  low: "text-green-600 bg-green-50 border-green-200",
  medium: "text-yellow-600 bg-yellow-50 border-yellow-200",
  high: "text-red-600 bg-red-50 border-red-200",
};

export default function SolveWithAISection({ issueDetails, issueId }: SolveWithAISectionProps) {
  const [plan, setPlan] = useState<AgentPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzed, setAnalyzed] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/agent/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: issueDetails.projectName,
          description: issueDetails.description,
          repoLink: issueDetails.repoLink,
          githubProjectId: issueId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to analyze");
      setPlan(data.plan);
      setAnalyzed(true);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Solve with AI Agent</h3>
            <p className="text-xs text-gray-500">Powered by NVIDIA NIM</p>
          </div>
        </div>

        {analyzed && (
          <button
            onClick={() => setIsExpanded((v) => !v)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {!analyzed && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Let an AI agent analyze this issue and automatically create a Pull Request solution.
              The agent will fork the repo, implement a fix, and submit a claim on your behalf.
            </p>
            <Button
              className="w-full bg-black hover:bg-gray-800 text-white cursor-pointer"
              onClick={handleAnalyze}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing issue...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Analyze & Solve with AI
                </span>
              )}
            </Button>
            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
          </div>
        )}

        <AnimatePresence>
          {analyzed && plan && isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-700">{plan.summary}</p>
              </div>

              {/* Meta badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border ${
                    complexityColor[plan.estimatedComplexity] ?? complexityColor.medium
                  }`}
                >
                  <BarChart2 className="w-3 h-3" />
                  {plan.estimatedComplexity} complexity
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border text-gray-600 bg-gray-50 border-gray-200">
                  <Clock className="w-3 h-3" />
                  {plan.estimatedTime}
                </span>
              </div>

              {/* Approach */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Approach
                </h4>
                <p className="text-sm text-gray-700">{plan.approach}</p>
              </div>

              {/* Steps */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Action Plan
                </h4>
                <ol className="space-y-1.5">
                  {plan.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-black text-white text-xs flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Agent note */}
              <div className="border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
                <p className="text-xs text-gray-500 leading-relaxed">
                  <span className="font-medium text-gray-700">How it works:</span> The Worker Agent
                  is polling open bounties every 30s. It will pick up this issue, implement the
                  solution above, open a PR, and submit the claim automatically. Make sure the
                  Worker Agent is running with sufficient mUSD and GitHub access.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer"
                onClick={() => { setPlan(null); setAnalyzed(false); }}
              >
                Re-analyze
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
