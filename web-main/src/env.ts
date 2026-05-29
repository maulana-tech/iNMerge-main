import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /*
   * Serverside Environment variables, not available on the client.
   * Will throw if you access these variables on the client.
   */
  server: {
    NVIDIA_API_KEY: z.string().min(1).optional(),
    NVIDIA_MODEL: z.string().optional(),
  },
  /*
   * Environment variables available on the client (and server).
   *
   * 💡 You'll get type errors if these are not prefixed with NEXT_PUBLIC_.
   */
  client: {
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().min(1),
    NEXT_PUBLIC_ISSUE_ADDRESS: z.string().min(1),
    NEXT_PUBLIC_MANTLEUSD_ADDRESS: z.string().min(1),
    NEXT_PUBLIC_GITHUB_CLIENT_ID: z.string().min(1),
    NEXT_PUBLIC_ZK_BACKEND_GET_ACCESS_TOKEN: z.string().min(1),
    NEXT_PUBLIC_ZK_BACKEND_GENERATE_PROOF: z.string().min(1),
  },
  /*
   * Due to how Next.js bundles environment variables on Edge and Client,
   * we need to manually destructure them to make sure all are included in bundle.
   *
   * 💡 You'll get type errors if not all variables from `server` & `client` are included here.
   */
  runtimeEnv: {
    NVIDIA_API_KEY: process.env.NVIDIA_API_KEY,
    NVIDIA_MODEL: process.env.NVIDIA_MODEL,
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    NEXT_PUBLIC_ISSUE_ADDRESS: process.env.NEXT_PUBLIC_ISSUE_ADDRESS,
    NEXT_PUBLIC_MANTLEUSD_ADDRESS: process.env.NEXT_PUBLIC_MANTLEUSD_ADDRESS,
    NEXT_PUBLIC_GITHUB_CLIENT_ID:
      process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
    NEXT_PUBLIC_ZK_BACKEND_GET_ACCESS_TOKEN:
      process.env.NEXT_PUBLIC_ZK_BACKEND_GET_ACCESS_TOKEN,
    NEXT_PUBLIC_ZK_BACKEND_GENERATE_PROOF:
      process.env.NEXT_PUBLIC_ZK_BACKEND_GENERATE_PROOF,
  },
});
