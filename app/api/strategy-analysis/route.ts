import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Asset = "USDC" | "EURC";
type RiskPreference = "conservative" | "balanced" | "growth";

export async function POST(request: Request) {
  let body: { asset?: Asset; riskPreference?: RiskPreference };
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

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      error: "AI analysis is not connected yet. Add GROQ_API_KEY to the Vercel project environment variables to enable it.",
    }, { status: 503 });
  }

  const candidates = asset === "USDC"
    ? [
        { name: "Galaxy USDC", provider: "Morpho vault", status: "candidate integration; not verified live" },
        { name: "Keyrock Prime USDC", provider: "Morpho vault", status: "candidate integration; not verified live" },
      ]
    : [];

  const systemPrompt = `You are Ultima's cautious stablecoin strategy analyst for Arc Mainnet (chain ID 5042). You analyze options; you never execute transactions or provide guarantees. Never invent APY, yield, TVL, liquidity, audits, risk scores, contract addresses, integrations, or live chain facts. The supplied candidates are unverified UI placeholders, not confirmed live vaults. No live APY, liquidity, audit, or contract verification data is available. If no candidates are supplied, clearly say no ${asset} strategies are currently listed in the app. Explain the next evidence needed before any deposit: verified contract and token addresses, current onchain APY methodology/history, liquidity/withdrawal constraints, permissions, audit/security evidence, and chain compatibility. Discuss general risks without claiming a specific candidate has or lacks a property. Tailor the analysis to the risk preference. Be concise, clear, useful, and non-promotional. End with a short 'Current status' sentence that says deposits should not be made through these unverified candidates.`;

  const userPrompt = JSON.stringify({
    asset,
    network: "Arc Mainnet",
    riskPreference,
    verifiedLiveDataAvailable: false,
    candidates,
    task: "Write a structured strategy analysis with headings: Snapshot, Key trade-offs, What to verify, and Current status. Do not treat the candidate list as verified opportunities.",
  });

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
          { role: "user", content: userPrompt },
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
