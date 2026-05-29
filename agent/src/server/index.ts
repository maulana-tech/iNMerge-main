import "dotenv/config";
import * as http from "node:http";
import { URL } from "node:url";

const PORT = Number(process.env.PORT ?? 8080);
const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ?? "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET ?? "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? "";

function json(res: http.ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

async function exchangeGithubCode(code: string): Promise<Record<string, string>> {
  const resp = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code }),
  });
  return resp.json();
}

async function checkPrMerged(prUrl: string): Promise<boolean> {
  const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return false;
  const [, owner, repo, pull] = match;
  const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pull}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" },
  });
  if (!resp.ok) return false;
  const data = await resp.json();
  return data.merged === true;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const path = url.pathname;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (path === "/api/auth/github" && req.method === "GET") {
    const code = url.searchParams.get("code");
    if (!code) return json(res, 400, { error: "Missing code parameter" });

    try {
      const result = await exchangeGithubCode(code);
      if (result.error) return json(res, 400, { error: result.error_description || result.error });
      return json(res, 200, { success: true, data: { access_token: result.access_token } });
    } catch (err) {
      return json(res, 500, { error: "GitHub OAuth exchange failed" });
    }
  }

  if (path === "/api/proof/generate" && req.method === "GET") {
    const prUrl = url.searchParams.get("url");
    if (!prUrl) return json(res, 400, { error: "Missing url parameter" });

    const auth = req.headers.authorization?.replace("Bearer ", "");
    if (!auth) return json(res, 401, { error: "Missing authorization token" });

    try {
      const isMerged = await checkPrMerged(prUrl);
      const proof = {
        prUrl,
        isMerged,
        verifiedAt: new Date().toISOString(),
        zkProof: isMerged ? `zk-proof-${Buffer.from(prUrl).toString("base64").slice(0, 16)}` : null,
      };
      return json(res, 200, proof);
    } catch (err) {
      return json(res, 500, { error: "Proof generation failed" });
    }
  }

  if (path === "/health") return json(res, 200, { status: "ok" });
  return json(res, 404, { error: "Not found" });
});

export function startServer() {
  server.listen(PORT, () => {
    console.log(`[server] HTTP server listening on port ${PORT}`);
  });
}
