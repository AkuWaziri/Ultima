import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Asset = "USDC" | "EURC";
type RiskPreference = "conservative" | "balanced" | "growth";
type VaultSnapshot = {
  name: string;
  protocol: string;
  asset: Asset;
  currentApy?: number | null;
  status: string;
};

export async function POST(request: Request) {
  let body: { asset?: Asset; riskPreference?: RiskPreference; vaults?: VaultSnapshot[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please submit a valid analysis request." }, { status: 400 });
  }

  const asset = body.asset;
  const riskPreference = body.riskPreference;
  if (!asset || !["USDC", "EURC"].includes(asset) ||
      !riskPreference || !["conservative", "balanced", "growth"].includes(riskPreference)) {
    return NextResponse.json({ error: "Choose USDC or EURC and a risk preference." }, { status: 400 });
  }

  const vaults = Array.isArray(body.vaults) ? body.vaults.slice(0, 30).filter((vault) =>
    vault && typeof vault.name === "string" &&
    typeof vault.protocol === "string" &&
    vault.asset === asset &&
    typeof vault.status === "string"
  ).map((vault) => ({
    name: vault.name.slice(0, 120),
    protocol: vault.protocol.slice(0, 80),
    asset: vault.asset,
    status: vault.status.slice(0, 40),
    currentApy: typeof vault.currentApy === "number" && Number.isFinite(vault.currentApy)
      ? vault.currentApy
      : null,
  })) : [];

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      error: "AI analysis is not connected yet. The app owner needs to add GROQ_API_KEY to the Vercel project environment variables.",
    }, { status: 503 });
  }

  const systemPrompt = `You are Ultima's cautious stablecoin strategy analyst for Arc Testnet (chain ID 5042002). The app is testnet-only. Analyze trade-offs; never execute transactions, recommend a guaranteed return, or imply testnet tokens have real-world value. The supplied vault snapshot is metadata discovered by the client from Circle Earn Kit and is not an independent security audit. Never invent APY, yield, TVL, liquidity, audits, risk scores, contract addresses, protocol integrations, or live chain facts. Only discuss a current APY when a numeric value is supplied; it is a variable snapshot, not a promise. If the supplied vault list is empty, clearly state that no active ${asset} vault is currently available from Circle Earn Kit on Arc Testnet. Discuss general smart-contract, liquidity, stablecoin, and withdrawal risks without claiming a specific vault has or lacks a property unless supplied metadata supports it. Tailor the explanation to the risk preference. Use headings: Snapshot, Key trade-offs, What to verify, and Testnet status. Be concise, clear, useful, and non-promotional. End by reminding the user to use testnet tokens only.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        temperature: 0.2,
        max_tokens: 700,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: JSON.stringify({
              network: "Arc Testnet",
              chainId: 5042002,
              asset,
              riskPreference,
              discoveredVaults: vaults,
              task: "Explain only the supplied testnet vault metadata and the evidence a user should review before interacting. Do not invent missing details.",
            }),
          },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "The AI provider could not complete the analysis. Please try again later." }, { status: 502 });
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content;
    if (typeof analysis !== "string" || !analysis.trim()) {
      return NextResponse.json({ error: "The AI provider returned an empty analysis. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ analysis: analysis.trim() });
  } catch {
    return NextResponse.json({ error: "Could not reach the AI provider. Please try again later." }, { status: 502 });
  }
}
