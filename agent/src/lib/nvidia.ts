import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY!,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

const MODEL = process.env.NVIDIA_MODEL ?? "meta/llama-3.3-70b-instruct";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chat(messages: Message[], options?: {
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages,
    temperature: options?.temperature ?? 0.2,
    max_tokens: options?.maxTokens ?? 4096,
  });

  return response.choices[0]?.message?.content ?? "";
}

export async function thinkAndCode(systemPrompt: string, userPrompt: string): Promise<string> {
  return chat([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], { temperature: 0.1, maxTokens: 8192 });
}
