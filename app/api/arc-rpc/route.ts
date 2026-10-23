import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { method?: unknown; params?: unknown };
    if (body.method !== "eth_chainId" && body.method !== "eth_call") {
      return NextResponse.json({ error: { message: "RPC method is not allowed." } }, { status: 400 });
    }
    if (!Array.isArray(body.params)) {
      return NextResponse.json({ error: { message: "Invalid RPC parameters." } }, { status: 400 });
    }
    const response = await fetch("https://rpc.testnet.arc.io", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: body.method, params: body.params }),
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ error: { message: `Arc Testnet RPC returned HTTP ${response.status}.` } }, { status: 502 });
    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({ error: { message: "Arc Testnet RPC is temporarily unreachable. Retry in a moment." } }, { status: 502 });
  }
}
