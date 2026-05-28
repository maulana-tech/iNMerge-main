import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const MODEL = process.env.NVIDIA_MODEL ?? "meta/llama-3.3-70b-instruct";

export async function POST(req: NextRequest) {
  if (!process.env.NVIDIA_API_KEY) {
    return NextResponse.json({ error: "NVIDIA_API_KEY not configured" }, { status: 503 });
  }

  const nvidia = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: "https://integrate.api.nvidia.com/v1",
  });

  const { projectName, description, repoLink, githubProjectId } = await req.json();

  try {
    const response = await nvidia.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert software engineer AI agent analyzing GitHub issues.
Given an issue, produce a concise action plan in JSON format:
{
  "summary": "one sentence summary of the problem",
  "approach": "brief technical approach (2-3 sentences)",
  "steps": ["step 1", "step 2", "step 3"],
  "estimatedComplexity": "low | medium | high",
  "estimatedTime": "e.g. 5-10 minutes"
}
Return ONLY the JSON, no extra text.`,
        },
        {
          role: "user",
          content: `Project: ${projectName}
Issue ID: ${githubProjectId}
Repo: ${repoLink}
Description: ${description}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 1024,
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const plan = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Could not parse plan" };

    return NextResponse.json({ plan });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
