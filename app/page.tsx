"use client";

import { useCallback, useEffect, useState } from "react";
import { AppKit } from "@circle-fin/app-kit";
import type { EarnVaultInfo } from "@circle-fin/app-kit";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import { createPublicClient, createWalletClient, custom, decodeFunctionResult, encodeFunctionData, formatUnits, http, isAddress, parseUnits } from "viem";
import type { CreateViemAdapterFromProviderParams } from "@circle-fin/adapter-viem-v2";
import {
  Activity, ArrowDownLeft, ArrowDownRight, ArrowRight, ArrowUpRight, ArrowDownUp, Bell,
  ChevronDown, CircleHelp, Command, Compass, ExternalLink, Eye, EyeOff,
  LayoutDashboard, Menu, Plus, Search, ShieldCheck, Bot, Wallet, X,
  Zap, Landmark, Clock3, CircleCheck, SlidersHorizontal, Droplets
} from "lucide-react";

type EthereumProvider = CreateViemAdapterFromProviderParams["provider"] & { on?: (event: string, handler: (...args: unknown[]) => void) => void; removeListener?: (event: string, handler: (...args: unknown[]) => void) => void };
const appKit = new AppKit();

type UltimaTransaction = { id: string; action: string; asset: string; amount: string; txHash: string; explorerUrl: string; createdAt: string };
type WalletPosition = { vaultAddress: string; name: string; asset: string; currentBalance: string; currentApy: number | null; principalDeposited: string | null; totalYieldEarned: string | null };

type Section = "Dashboard" | "Explore" | "Swap" | "Strategies" | "My positions" | "Activity";

const navItems: { label: Section; icon: typeof LayoutDashboard }[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Explore", icon: Compass },
  { label: "Swap", icon: ArrowDownUp },
  { label: "Strategies", icon: Bot },
  { label: "My positions", icon: Wallet },
  { label: "Activity", icon: Activity },
];

const ARC_TESTNET = { chainId: "0x4cef52", chainName: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: ["https://rpc.testnet.arc.io"], blockExplorerUrls: ["https://explorer.testnet.arc.io"] } as const;
const TOKEN_ADDRESSES = { USDC: "0x3600000000000000000000000000000000000000", EURC: "0x89b50855aa3be2f677cd6303cec089b5f319d72a" } as const;
const ARC_V2_ROUTER = "0xe27d5d256b370604f1ff060fb489c6a8e3f8a6d9" as const;
const arcSwapChain = { id: 5042002, name: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: { default: { http: ["/api/arc-rpc"] } } } as const;
const swapRouterAbi = [
  { type: "function", name: "getAmountsOut", stateMutability: "view", inputs: [{ name: "amountIn", type: "uint256" }, { name: "path", type: "address[]" }], outputs: [{ name: "amounts", type: "uint256[]" }] },
  { type: "function", name: "swapExactTokensForTokens", stateMutability: "nonpayable", inputs: [{ name: "amountIn", type: "uint256" }, { name: "amountOutMin", type: "uint256" }, { name: "path", type: "address[]" }, { name: "to", type: "address" }, { name: "deadline", type: "uint256" }], outputs: [{ name: "amounts", type: "uint256[]" }] },
] as const;
const swapTokenAbi = [
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
] as const;
const arcSwapPublicClient = createPublicClient({ chain: arcSwapChain, transport: http("/api/arc-rpc") });

export default function Home() {
  const [section, setSection] = useState<Section>("Dashboard");
  const [asset, setAsset] = useState<"USDC" | "EURC">("USDC");
  const [swapFrom, setSwapFrom] = useState<"USDC" | "EURC">("USDC");
  const [swapAmount, setSwapAmount] = useState("");
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletChainId, setWalletChainId] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [eurcBalance, setEurcBalance] = useState<string | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const [yieldExplainerOpen, setYieldExplainerOpen] = useState(false);
  const [faucetOpen, setFaucetOpen] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [notificationTelegram, setNotificationTelegram] = useState("");
  const [notificationPrefs, setNotificationPrefs] = useState({
    positionUpdates: true,
    transactionUpdates: true,
    riskAlerts: true,
    productUpdates: false,
  });
  const [notificationSaved, setNotificationSaved] = useState(false);
  const [riskPreference, setRiskPreference] = useState<"conservative" | "balanced" | "growth">("balanced");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [liveVaults, setLiveVaults] = useState<EarnVaultInfo[]>([]);
  const [vaultsLoading, setVaultsLoading] = useState(true);
  const [selectedVaultAddress, setSelectedVaultAddress] = useState("");
  const [expandedVaultAddress, setExpandedVaultAddress] = useState("");
  const [earnAmount, setEarnAmount] = useState("1");
  const [earnBusy, setEarnBusy] = useState(false);
  const [earnStatus, setEarnStatus] = useState("");
  const [earnPosition, setEarnPosition] = useState<unknown>(null);
  const [swapBusy, setSwapBusy] = useState(false);
  const [swapStatus, setSwapStatus] = useState("");
  const [swapQuote, setSwapQuote] = useState<{ amountOut: string; effectiveRate: string } | null>(null);
  const [txHistory, setTxHistory] = useState<UltimaTransaction[]>([]);
  const [yieldEarned, setYieldEarned] = useState<string | null>(null);
  const [walletPositions, setWalletPositions] = useState<WalletPosition[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [ultimaAsset, setUltimaAsset] = useState<"USDC" | "EURC">("USDC");
  const [ultimaAmount, setUltimaAmount] = useState("1");
  const [ultimaBusy, setUltimaBusy] = useState(false);
  const [ultimaStatus, setUltimaStatus] = useState("");
  const [ultimaVaultBalances, setUltimaVaultBalances] = useState<Record<"USDC" | "EURC", string | null>>({ USDC: null, EURC: null });
  const [ultimaTotalAssets, setUltimaTotalAssets] = useState<Record<"USDC" | "EURC", string | null>>({ USDC: null, EURC: null });
  const [ultimaTxHash, setUltimaTxHash] = useState("");
  const ultimaVaultAddress = process.env.NEXT_PUBLIC_ULTIMA_VAULT_ADDRESS ?? "";
  const ultimaVaultConfigured = isAddress(ultimaVaultAddress);

  const [positionsChecked, setPositionsChecked] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("ultima-testnet-transactions");
      if (saved) setTxHistory(JSON.parse(saved) as UltimaTransaction[]);
    } catch { /* Ignore malformed local history. */ }
  }, []);

  useEffect(() => {
    const matchingVault = liveVaults.find((vault) => vault.asset === asset);
    const selectedVault = liveVaults.find((vault) => vault.address === selectedVaultAddress);
    if (matchingVault && selectedVault?.asset !== asset) setSelectedVaultAddress(matchingVault.address);
    else if (!matchingVault && selectedVault && selectedVault.asset !== asset) setSelectedVaultAddress("");
  }, [asset, liveVaults, selectedVaultAddress]);

  useEffect(() => {
    let cancelled = false;
    const loadVaults = async () => {
      setVaultsLoading(true);
      try {
        const result = await appKit.earn.exploreVaults({ chain: "Arc_Testnet", sortBy: "apy" });
        const active = result.vaults.filter((vault) => vault.status === "active" && Boolean(vault.address) && (vault.asset === "USDC" || vault.asset === "EURC"));
        if (!cancelled) {
          setLiveVaults(active);
          setSelectedVaultAddress((current) => current || active[0]?.address || "");
        }
      } catch {
        if (!cancelled) setEarnStatus("Live testnet vault discovery is temporarily unavailable. Retry in a moment.");
      } finally {
        if (!cancelled) setVaultsLoading(false);
      }
    };
    void loadVaults();
    return () => { cancelled = true; };
  }, []);

  const openNotificationSettings = () => {
    try {
      const saved = window.localStorage.getItem("ultima-notification-settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        setNotificationEmail(parsed.email || "");
        setNotificationTelegram(parsed.telegram || "");
        setNotificationPrefs({
          positionUpdates: parsed.preferences?.positionUpdates ?? true,
          transactionUpdates: parsed.preferences?.transactionUpdates ?? true,
          riskAlerts: parsed.preferences?.riskAlerts ?? true,
          productUpdates: parsed.preferences?.productUpdates ?? false,
        });
      }
    } catch {
      // Keep the current form values if saved settings cannot be read.
    }
    setNotificationSaved(false);
    setNotificationSettingsOpen(true);
  };

  const saveNotificationSettings = () => {
    const settings = {
      email: notificationEmail.trim(),
      telegram: notificationTelegram.trim().replace(/^@/, ""),
      preferences: notificationPrefs,
    };
    window.localStorage.setItem("ultima-notification-settings", JSON.stringify(settings));
    setNotificationTelegram(settings.telegram);
    setNotificationSaved(true);
    window.setTimeout(() => setNotificationSaved(false), 3500);
  };

  const runStrategyAnalysis = async () => {
    setAnalysisLoading(true);
    setAnalysisError("");
    setAnalysisResult("");
    try {
      const response = await fetch("/api/strategy-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset, riskPreference, vaults: liveVaults.filter((vault) => vault.asset === asset).map((vault) => ({ name: vault.name, protocol: vault.protocol, asset: vault.asset, currentApy: typeof vault.currentApy === "number" ? vault.currentApy : null, status: vault.status })) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Strategy analysis is temporarily unavailable.");
      setAnalysisResult(payload.analysis);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "Could not run strategy analysis.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const refreshWalletBalances = useCallback(async (address: string) => {
    const provider = (window as Window & { ethereum?: EthereumProvider }).ethereum;
    if (!provider) return;
    setBalancesLoading(true);
    const walletRpc = provider as unknown as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
    const rpcCall = async (method: string, params: unknown[]) => {
      // Read balances from Arc's public RPC first so a wallet's custom RPC configuration
      // cannot prevent read-only balance checks. Fall back to the connected wallet RPC.
      try {
        const response = await fetch("/api/arc-rpc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method, params }),
        });
        if (!response.ok) throw new Error(`Arc RPC HTTP ${response.status}`);
        const payload = await response.json() as { result?: unknown; error?: { message?: string } };
        if (payload.error) throw new Error(payload.error.message || "Arc RPC returned an error.");
        if (payload.result === undefined) throw new Error("Arc RPC returned no result.");
        return payload.result;
      } catch (publicRpcError) {
        try {
          return await walletRpc.request({ method, params });
        } catch (walletRpcError) {
          const publicMessage = publicRpcError instanceof Error ? publicRpcError.message : "Public RPC request failed";
          const walletMessage = walletRpcError instanceof Error ? walletRpcError.message : "Wallet RPC request failed";
          throw new Error(`Public RPC: ${publicMessage}; wallet RPC: ${walletMessage}`);
        }
      }
    };
    try {
      const chainHex = await rpcCall("eth_chainId", []) as string;
      if (Number.parseInt(chainHex, 16) !== 5042002) {
        setNotice("Your wallet is not connected to Arc Testnet. Switch networks and retry.");
        return;
      }
      const readTokenBalance = async (token: string) => {
        const data = "0x70a08231" + address.toLowerCase().replace("0x", "").padStart(64, "0");
        const raw = await rpcCall("eth_call", [{ to: token, data }, "latest"]) as string;
        if (!raw || !/^0x[0-9a-fA-F]+$/.test(raw)) throw new Error("The network returned an invalid balance response.");
        return (Number(BigInt(raw)) / 1_000_000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
      };
      const [usdcResult, eurcResult] = await Promise.allSettled([
        readTokenBalance(TOKEN_ADDRESSES.USDC),
        readTokenBalance(TOKEN_ADDRESSES.EURC),
      ]);
      if (usdcResult.status === "fulfilled") setUsdcBalance(usdcResult.value);
      if (eurcResult.status === "fulfilled") setEurcBalance(eurcResult.value);
      const failedAssets = [
        ...(usdcResult.status === "rejected" ? ["USDC"] : []),
        ...(eurcResult.status === "rejected" ? ["EURC"] : []),
      ];
      if (failedAssets.length === 2) {
        const errors = [usdcResult, eurcResult]
          .filter((result): result is PromiseRejectedResult => result.status === "rejected")
          .map((result) => result.reason instanceof Error ? result.reason.message : "RPC request failed");
        setNotice(`Could not read token balances. ${errors[0]}`);
      } else if (failedAssets.length) {
        setNotice(`Could not read ${failedAssets[0]} balance. The other token balance loaded.`);
      } else {
        setNotice("");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not read Arc Testnet balances. Retry in a moment.");
    } finally {
      setBalancesLoading(false);
    }
  }, []);

  const connectWallet = async () => {
    const provider = (window as Window & { ethereum?: EthereumProvider }).ethereum;
    if (!provider) { setNotice("No compatible wallet found. Install MetaMask, Rabby, or another EVM wallet."); return; }
    try {
      // Wallet RPC methods are broader than viem's typed provider method union.
      // Keep this local cast limited to the EIP-1193 network-setup calls.
      const walletRpc = provider as unknown as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
      try {
        await walletRpc.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_TESTNET.chainId }] });
      } catch (switchError) {
        if ((switchError as { code?: number })?.code !== 4902) throw switchError;
        await walletRpc.request({ method: "wallet_addEthereumChain", params: [{ ...ARC_TESTNET, rpcUrls: [...ARC_TESTNET.rpcUrls], blockExplorerUrls: [...ARC_TESTNET.blockExplorerUrls] }] });
      }
      const accounts = await walletRpc.request({ method: "eth_requestAccounts" }) as string[];
      const chainHex = await walletRpc.request({ method: "eth_chainId" }) as string;
      const address = accounts?.[0];
      const chainId = Number.parseInt(chainHex, 16);
      if (!address) { setNotice("No wallet account was selected."); return; }
      if (chainId !== 5042002) { setNotice("Switch your wallet to Arc Testnet to continue."); return; }
      setWalletAddress(address); setWalletChainId(chainId); setConnected(true);
      setNotice("Wallet connected to Arc Testnet.");
      await refreshWalletBalances(address);
    } catch { setNotice("Wallet connection was cancelled or failed. Try again."); }
  };

  useEffect(() => {
    const provider = (window as Window & { ethereum?: EthereumProvider }).ethereum;
    if (!provider?.on) return;
    const onAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (!accounts?.[0]) {
        setConnected(false); setWalletAddress(""); setUsdcBalance(null); setEurcBalance(null);
      } else { setWalletAddress(accounts[0]); setConnected(true); void refreshWalletBalances(accounts[0]); }
    };
    const onChainChanged = (...args: unknown[]) => {
      const chainId = Number.parseInt(String(args[0]), 16);
      setWalletChainId(chainId);
      if (chainId !== 5042002) { setNotice("Ultima is configured for Arc Testnet. Switch networks to continue."); setUsdcBalance(null); setEurcBalance(null); }
      else if (walletAddress) void refreshWalletBalances(walletAddress);
    };
    provider.on("accountsChanged", onAccountsChanged);
    provider.on("chainChanged", onChainChanged);
    return () => { provider.removeListener?.("accountsChanged", onAccountsChanged); provider.removeListener?.("chainChanged", onChainChanged); };
  }, [refreshWalletBalances, walletAddress]);

  const getSwapQuote = useCallback(async () => {
    if (!walletAddress || !connected || walletChainId !== 5042002) { setSwapStatus("Connect your wallet to Arc Testnet first."); return; }
    if (!swapAmount || !Number.isFinite(Number(swapAmount)) || Number(swapAmount) <= 0) { setSwapQuote(null); setSwapStatus("Enter a valid amount greater than zero."); return; }
    setSwapBusy(true); setSwapStatus(""); setSwapQuote(null);
    try {
      const tokenIn = TOKEN_ADDRESSES[swapFrom];
      const tokenOut = TOKEN_ADDRESSES[swapFrom === "USDC" ? "EURC" : "USDC"];
      const amountIn = parseUnits(swapAmount, 6);
      const amounts = await arcSwapPublicClient.readContract({
        address: ARC_V2_ROUTER, abi: swapRouterAbi, functionName: "getAmountsOut", args: [amountIn, [tokenIn, tokenOut]],
      });
      const amountOut = amounts[amounts.length - 1];
      if (!amountOut || amountOut <= BigInt(0)) throw new Error("No usable USDC/EURC liquidity is available for this amount.");
      const formattedOutput = Number(formatUnits(amountOut, 6)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6, useGrouping: false });
      const rate = Number(formatUnits(amountOut, 6)) / Number(swapAmount);
      setSwapQuote({ amountOut: formattedOutput, effectiveRate: rate.toFixed(6) });
      setSwapStatus(`Live Arc Testnet pool quote: ${swapAmount} ${swapFrom} → ${formattedOutput} ${swapFrom === "USDC" ? "EURC" : "USDC"}.`);
    } catch (error) {
      setSwapQuote(null);
      setSwapStatus(error instanceof Error && /revert|execution reverted|insufficient_output_amount/i.test(error.message)
        ? "No route or insufficient liquidity is available for this amount on Arc Testnet."
        : error instanceof Error ? `Could not fetch the on-chain quote: ${error.message}` : "Could not fetch a live on-chain quote. Retry shortly.");
    } finally { setSwapBusy(false); }
  }, [walletAddress, connected, walletChainId, swapAmount, swapFrom]);

  useEffect(() => {
    if (section !== "Swap" || !connected || walletChainId !== 5042002 || !swapAmount || !Number.isFinite(Number(swapAmount)) || Number(swapAmount) <= 0) { setSwapQuote(null); return; }
    const timer = window.setTimeout(() => { void getSwapQuote(); }, 500);
    return () => window.clearTimeout(timer);
  }, [section, connected, walletChainId, swapAmount, swapFrom, getSwapQuote]);

  const runSwap = async () => {
    const provider = (window as Window & { ethereum?: EthereumProvider }).ethereum;
    if (!provider || !walletAddress || !connected) { setSwapStatus("Connect your wallet first."); return; }
    if (walletChainId !== 5042002) { setSwapStatus("Switch your wallet to Arc Testnet before swapping."); return; }
    const amount = Number(swapAmount);
    if (!Number.isFinite(amount) || amount <= 0) { setSwapStatus("Enter a valid amount greater than zero."); return; }
    setSwapBusy(true); setSwapStatus("");
    try {
      const account = walletAddress as `0x${string}`;
      const tokenIn = TOKEN_ADDRESSES[swapFrom];
      const tokenOut = TOKEN_ADDRESSES[swapFrom === "USDC" ? "EURC" : "USDC"];
      const amountIn = parseUnits(swapAmount, 6);
      const amounts = await arcSwapPublicClient.readContract({ address: ARC_V2_ROUTER, abi: swapRouterAbi, functionName: "getAmountsOut", args: [amountIn, [tokenIn, tokenOut]] });
      const quotedOut = amounts[amounts.length - 1];
      if (!quotedOut || quotedOut <= BigInt(0)) throw new Error("No usable liquidity is available for this swap.");
      const amountOutMin = quotedOut * BigInt(995) / BigInt(1000);
      const walletClient = createWalletClient({ account, chain: arcSwapChain, transport: custom(provider as never) });
      const allowance = await arcSwapPublicClient.readContract({ address: tokenIn, abi: swapTokenAbi, functionName: "allowance", args: [account, ARC_V2_ROUTER] });
      if (allowance < amountIn) {
        setSwapStatus("Approve token spending in your wallet…");
        const approveHash = await walletClient.writeContract({ address: tokenIn, abi: swapTokenAbi, functionName: "approve", args: [ARC_V2_ROUTER, amountIn], gas: BigInt(100000) });
        const approveReceipt = await arcSwapPublicClient.waitForTransactionReceipt({ hash: approveHash });
        if (approveReceipt.status !== "success") throw new Error("Token approval failed on Arc Testnet. No swap was submitted.");
      }
      setSwapStatus("Review and confirm the swap in your wallet…");
      const txHash = await walletClient.writeContract({
        address: ARC_V2_ROUTER, abi: swapRouterAbi, functionName: "swapExactTokensForTokens",
        args: [amountIn, amountOutMin, [tokenIn, tokenOut], account, BigInt(Math.floor(Date.now() / 1000) + 1200)],
        gas: BigInt(250000),
      });
      setSwapStatus("Swap submitted. Waiting for Arc Testnet confirmation…");
      const receipt = await arcSwapPublicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") throw new Error(`Swap transaction reverted. View it on Arc Explorer: https://explorer.testnet.arc.io/tx/${txHash}`);
      const explorerUrl = `https://explorer.testnet.arc.io/tx/${txHash}`;
      setSwapStatus(`Swap confirmed: ${explorerUrl}`);
      recordTransaction({ action: "Swap", asset: `${swapFrom} → ${swapFrom === "USDC" ? "EURC" : "USDC"}`, amount: swapAmount, txHash, explorerUrl });
      setSwapQuote(null);
      await refreshWalletBalances(walletAddress);
    } catch (error) {
      setSwapStatus(error instanceof Error ? error.message : "Swap failed. Check Arc Testnet liquidity and retry.");
    } finally { setSwapBusy(false); }
  };

  const readUltimaContractState = async (address = walletAddress) => {
    const provider = (window as Window & { ethereum?: EthereumProvider }).ethereum;
    if (!provider || !address || !ultimaVaultConfigured) return;
    const rpc = provider as unknown as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
    const balanceAbi = [{ type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "asset", type: "address" }, { name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] }] as const;
    const totalAbi = [{ type: "function", name: "totalAssets", stateMutability: "view", inputs: [{ name: "asset", type: "address" }], outputs: [{ name: "", type: "uint256" }] }] as const;
    const call = async (to: string, data: string) => rpc.request({ method: "eth_call", params: [{ to, data }, "latest"] }) as Promise<`0x${string}`>;
    const assets = ["USDC", "EURC"] as const;
    const results = await Promise.all(assets.map(async (symbol) => {
      const token = TOKEN_ADDRESSES[symbol] as `0x${string}`;
      const [balanceRaw, totalRaw] = await Promise.all([
        call(ultimaVaultAddress, encodeFunctionData({ abi: balanceAbi, functionName: "balanceOf", args: [token, address as `0x${string}`] })),
        call(ultimaVaultAddress, encodeFunctionData({ abi: totalAbi, functionName: "totalAssets", args: [token] })),
      ]);
      const balance = decodeFunctionResult({ abi: balanceAbi, functionName: "balanceOf", data: balanceRaw }) as bigint;
      const total = decodeFunctionResult({ abi: totalAbi, functionName: "totalAssets", data: totalRaw }) as bigint;
      return [symbol, formatUnits(balance, 6), formatUnits(total, 6)] as const;
    }));
    setUltimaVaultBalances(Object.fromEntries(results.map(([symbol, balance]) => [symbol, balance])) as Record<"USDC" | "EURC", string>);
    setUltimaTotalAssets(Object.fromEntries(results.map(([symbol, , total]) => [symbol, total])) as Record<"USDC" | "EURC", string>);
  };

  const waitForUltimaReceipt = async (hash: string) => {
    const provider = (window as Window & { ethereum?: EthereumProvider }).ethereum;
    if (!provider) throw new Error("Wallet provider is unavailable.");
    const rpc = provider as unknown as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
    for (let attempt = 0; attempt < 90; attempt += 1) {
      const receipt = await rpc.request({ method: "eth_getTransactionReceipt", params: [hash] }) as { status?: string } | null;
      if (receipt) {
        if (receipt.status === "0x0") throw new Error("The transaction reverted. No deposit or withdrawal was recorded.");
        return;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 2000));
    }
    throw new Error("Transaction is still pending. Check the explorer before retrying.");
  };

  const runUltimaContractAction = async (action: "deposit" | "withdraw") => {
    const provider = (window as Window & { ethereum?: EthereumProvider }).ethereum;
    if (!provider || !connected || !walletAddress) { setUltimaStatus("Connect your wallet first."); return; }
    if (walletChainId !== 5042002) { setUltimaStatus("Switch to Arc Testnet before interacting with UltimaVault."); return; }
    if (!ultimaVaultConfigured) { setUltimaStatus("UltimaVault is not configured yet. Deploy the contract to Arc Testnet, then set NEXT_PUBLIC_ULTIMA_VAULT_ADDRESS in Vercel and redeploy."); return; }
    if (!/^\\d+(\\.\\d{1,6})?$/.test(ultimaAmount) || Number(ultimaAmount) <= 0) { setUltimaStatus(`Enter a positive ${ultimaAsset} amount with no more than 6 decimal places.`); return; }
    setUltimaBusy(true); setUltimaStatus(""); setUltimaTxHash("");
    const rpc = provider as unknown as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
    try {
      const amount = parseUnits(ultimaAmount, 6);
      const tokenAddress = TOKEN_ADDRESSES[ultimaAsset] as `0x${string}`;
      const vaultAbi = [
        { type: "function", name: "deposit", stateMutability: "nonpayable", inputs: [{ name: "asset", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
        { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [{ name: "asset", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
      ] as const;
      if (action === "deposit") {
        const allowanceAbi = [{ type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }] }] as const;
        const allowanceData = encodeFunctionData({ abi: allowanceAbi, functionName: "allowance", args: [walletAddress as `0x${string}`, ultimaVaultAddress as `0x${string}`] });
        const allowanceRaw = await rpc.request({ method: "eth_call", params: [{ to: tokenAddress, data: allowanceData }, "latest"] }) as `0x${string}`;
        const allowance = decodeFunctionResult({ abi: allowanceAbi, functionName: "allowance", data: allowanceRaw }) as bigint;
        if (allowance < amount) {
          setUltimaStatus(`Approve ${ultimaAsset} in your wallet, then confirm the approval transaction.`);
          const approveData = encodeFunctionData({ abi: [{ type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "value", type: "uint256" }], outputs: [{ name: "", type: "bool" }] }], functionName: "approve", args: [ultimaVaultAddress as `0x${string}`, amount] });
          const approveHash = await rpc.request({ method: "eth_sendTransaction", params: [{ from: walletAddress, to: tokenAddress, data: approveData }] }) as string;
          setUltimaTxHash(approveHash);
          await waitForUltimaReceipt(approveHash);
        }
      }
      setUltimaStatus(action === "deposit" ? `Confirm the Ultima ${ultimaAsset} deposit in your wallet.` : `Confirm the Ultima ${ultimaAsset} withdrawal in your wallet.`);
      const data = encodeFunctionData({ abi: vaultAbi, functionName: action, args: [tokenAddress, amount] });
      const hash = await rpc.request({ method: "eth_sendTransaction", params: [{ from: walletAddress, to: ultimaVaultAddress, data }] }) as string;
      setUltimaTxHash(hash);
      setUltimaStatus("Transaction submitted. Waiting for Arc Testnet confirmation…");
      await waitForUltimaReceipt(hash);
      await Promise.all([readUltimaContractState(), refreshWalletBalances(walletAddress)]);
      setUltimaStatus(`Ultima ${ultimaAsset} ${action} confirmed. Contract balances have been refreshed.`);
    } catch (error) {
      setUltimaStatus(error instanceof Error ? error.message : "Transaction failed. Check your wallet and Arc Testnet connection.");
    } finally {
      setUltimaBusy(false);
    }
  };

  const refreshAllPositions = async () => {
    const provider = (window as Window & { ethereum?: EthereumProvider }).ethereum;
    if (!provider || !walletAddress || !connected || walletChainId !== 5042002) {
      setEarnStatus("Connect your wallet to Arc Testnet to check positions.");
      return;
    }
    if (liveVaults.length === 0) {
      setWalletPositions([]);
      setPositionsChecked(true);
      setEarnStatus("No active Circle Earn Kit testnet vaults are available to check.");
      return;
    }
    setPositionsLoading(true);
    try {
      const adapter = await createViemAdapterFromProvider({ provider });
      const results = await Promise.all(liveVaults.map(async (vault) => {
        try {
          const result = await appKit.earn.getPosition({
            from: { adapter, chain: "Arc_Testnet" },
            vaultAddress: vault.address,
          });
          const position = result as {
            currentBalance?: string;
            currentApy?: number;
            pnl?: { principalDeposited?: string; totalYieldEarned?: string };
          };
          if (!position.currentBalance || !Number.isFinite(Number(position.currentBalance)) || Number(position.currentBalance) <= 0) return null;
          return {
            vaultAddress: vault.address,
            name: vault.name,
            asset: vault.asset,
            currentBalance: position.currentBalance,
            currentApy: typeof position.currentApy === "number" ? position.currentApy : null,
            principalDeposited: position.pnl?.principalDeposited ?? null,
            totalYieldEarned: position.pnl?.totalYieldEarned ?? null,
          } satisfies WalletPosition;
        } catch {
          return null;
        }
      }));
      setWalletPositions(results.filter((position): position is WalletPosition => position !== null));
      setPositionsChecked(true);
    } catch {
      setEarnStatus("Could not refresh wallet positions. Check your Arc Testnet connection and retry.");
    } finally {
      setPositionsLoading(false);
    }
  };

  const createEarnAdapter = async (provider: EthereumProvider) => {
    const routedReadMethods = new Set([
      "eth_chainId",
      "eth_call",
      "eth_getBalance",
      "eth_getBlockByNumber",
      "eth_getCode",
      "eth_getTransactionCount",
      "eth_estimateGas",
      "eth_gasPrice",
      "eth_maxPriorityFeePerGas",
    ]);
    const walletRpc = provider as unknown as {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
    const routedProvider = {
      request: async (args: { method: string; params?: unknown[] }) => {
        if (!routedReadMethods.has(args.method)) {
          return walletRpc.request(args);
        }
        const response = await fetch("/api/arc-rpc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: args.method, params: args.params ?? [] }),
        });
        const payload = await response.json() as { result?: unknown; error?: { message?: string } };
        if (!response.ok || payload.error) {
          throw new Error(payload.error?.message || "Arc Testnet RPC request failed.");
        }
        if (payload.result === undefined) throw new Error("Arc Testnet RPC returned no result.");
        return payload.result;
      },
      on: provider.on?.bind(provider),
      removeListener: provider.removeListener?.bind(provider),
    } as unknown as EthereumProvider;

    return createViemAdapterFromProvider({
      provider: routedProvider,
      getPublicClient: ({ chain }) => createPublicClient({
        chain,
        transport: http("/api/arc-rpc"),
      }),
    });
  };

  const runEarnAction = async (action: "quote" | "deposit" | "position" | "withdraw") => {
    const provider = (window as Window & { ethereum?: EthereumProvider }).ethereum;
    if (!provider || !walletAddress || !connected || walletChainId !== 5042002) { setEarnStatus("Connect your wallet to Arc Testnet to use a testnet vault."); return; }
    if (!selectedVaultAddress) { setEarnStatus("No active testnet vault is available for this asset."); return; }
    const amount = Number(earnAmount);
    if (action !== "position" && (!Number.isFinite(amount) || amount <= 0)) { setEarnStatus("Enter a valid amount greater than zero."); return; }
    setEarnBusy(true); setEarnStatus("");
    try {
      const adapter = await createEarnAdapter(provider);
      let result: unknown;
      if (action === "quote") result = await appKit.earn.getDepositQuote({ from: { adapter, chain: "Arc_Testnet" }, vaultAddress: selectedVaultAddress, amount: earnAmount });
      else if (action === "deposit") result = await appKit.earn.deposit({ from: { adapter, chain: "Arc_Testnet" }, vaultAddress: selectedVaultAddress, amount: earnAmount });
      else if (action === "position") {
        result = await appKit.earn.getPosition({ from: { adapter, chain: "Arc_Testnet" }, vaultAddress: selectedVaultAddress });
        setEarnPosition(result);
        setYieldEarned((result as { pnl?: { totalYieldEarned?: string } }).pnl?.totalYieldEarned ?? null);
      } else result = await appKit.earn.withdraw({ from: { adapter, chain: "Arc_Testnet" }, vaultAddress: selectedVaultAddress, amount: earnAmount });
      const output = result as { txHash?: string; explorerUrl?: string; currentBalance?: string; pnl?: { totalYieldEarned?: string } };
      if (action === "position") {
        setEarnStatus("Position refreshed from the live testnet vault.");
      } else if (action === "quote") {
        setEarnStatus("Deposit quote ready. Review the quote details below before depositing.");
        setEarnPosition(result);
      } else {
        setEarnStatus(output.explorerUrl ? `${action === "deposit" ? "Deposit" : "Withdrawal"} submitted: ${output.explorerUrl}` : `${action === "deposit" ? "Deposit" : "Withdrawal"} submitted. ${output.txHash ?? ""}`);
        setEarnPosition(result);
        const tx = result as { txHash?: string; explorerUrl?: string };
        if (tx.txHash) recordTransaction({ action: action === "deposit" ? "Deposit" : "Withdraw", asset, amount: earnAmount, txHash: tx.txHash, explorerUrl: tx.explorerUrl ?? `https://explorer.testnet.arc.io/tx/${tx.txHash}` });
        const adapterForPosition = await createEarnAdapter(provider);
        const updatedPosition = await appKit.earn.getPosition({ from: { adapter: adapterForPosition, chain: "Arc_Testnet" }, vaultAddress: selectedVaultAddress });
        setEarnPosition(updatedPosition);
        setYieldEarned((updatedPosition as { pnl?: { totalYieldEarned?: string } }).pnl?.totalYieldEarned ?? null);
        await refreshWalletBalances(walletAddress);
        await refreshAllPositions();
      }
    } catch (error) {
      setEarnStatus(error instanceof Error ? error.message : "The vault action failed. Check your balance and try again.");
    } finally { setEarnBusy(false); }
  };

  const recordTransaction = (record: Omit<UltimaTransaction, "id" | "createdAt">) => {
    const entry: UltimaTransaction = { ...record, id: `${record.txHash}-${Date.now()}`, createdAt: new Date().toISOString() };
    setTxHistory((current) => {
      const next = [entry, ...current].slice(0, 50);
      try { window.localStorage.setItem("ultima-testnet-transactions", JSON.stringify(next)); } catch { /* Keep the in-memory history. */ }
      return next;
    });
  };

  const navigate = (next: Section) => {
    setSection(next);
    setMobileOpen(false);
  };

  return (
    <main className="app-shell">
      {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark" aria-label="Ultima logo"><svg viewBox="0 0 32 32" role="img" aria-hidden="true"><path className="paper-u" d="M6.5 5.5h5.2v13.1c0 3.5 1.5 5.5 4.3 5.5s4.3-2 4.3-5.5V5.5h5.2v13.7c0 6.3-3.6 9.8-9.5 9.8s-9.5-3.5-9.5-9.8V5.5Z"/><circle className="u-red-dot" cx="25.5" cy="6.3" r="3.1"/></svg></div>
          <span className="brand-name">ultima</span>
          <button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>

        <div className="network-pill"><span className="network-dot" /> Arc Testnet <ChevronDown size={14} /></div>

        <nav className="primary-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${section === label ? "active" : ""}`} onClick={() => navigate(label)}>
              <Icon size={18} strokeWidth={1.9} /><span>{label}</span>
              {label === "Explore" && <span className="nav-count">{liveVaults.filter((vault) => vault.asset === asset).length}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button className="help-card" type="button" onClick={() => setYieldExplainerOpen(true)} aria-haspopup="dialog">
            <div className="help-icon"><CircleHelp size={17} /></div>
            <div><strong>New to yield?</strong><p>Learn how strategies work before you deposit.</p></div>
            <ArrowUpRight size={15} className="help-arrow" />
          </button>
          <div className="sidebar-foot">
            <div className="avatar">U</div>
            <div className="profile-copy"><strong>Guest workspace</strong><span>Connect to get started</span></div>
            <SlidersHorizontal size={17} className="muted-icon" />
          </div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            
            <div className="mobile-brand" aria-label="Ultima"><div className="brand-mark"><svg viewBox="0 0 32 32" role="img" aria-hidden="true"><path className="paper-u" d="M6.5 5.5h5.2v13.1c0 3.5 1.5 5.5 4.3 5.5s4.3-2 4.3-5.5V5.5h5.2v13.7c0 6.3-3.6 9.8-9.5 9.8s-9.5-3.5-9.5-9.8V5.5Z"/><circle className="u-red-dot" cx="25.5" cy="6.3" r="3.1"/></svg></div><span className="brand-name">ultima</span></div>
            <div className="breadcrumb">Workspace <span>/</span> <strong>{section}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className="network-chip"><span className="network-dot" /> Arc Testnet</div>
            <button className="icon-button notification-button" aria-label="Notification settings" title="Notification settings" onClick={openNotificationSettings}><Bell size={18} /><i /></button>
            <button className="connect-button" onClick={connectWallet}><Wallet size={16} /> {connected && walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "Connect wallet"}</button>
            <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
          </div>
        </header>

        <div className="page-content">
          {section === "Dashboard" && (
            <>
              <div className="welcome-row">
                <div>
                  
                  <h1>Overview</h1>
                  
                </div>
                <div className="welcome-art" aria-hidden="true">
                  <div className="orbit orbit-one" /><div className="orbit orbit-two" />
                  <div className="art-coin coin-back">€</div><div className="art-coin coin-front">$</div>
                  <div className="art-spark spark-one"></div><div className="art-spark spark-two"></div>
                </div>
              </div>

              <button className="faucet-mini-tab" type="button" onClick={() => setFaucetOpen(true)} aria-haspopup="dialog"><span className="faucet-mini-icon"><Droplets size={18} /></span><span className="faucet-mini-copy"><strong>Testnet faucet</strong><small>Request test USDC</small></span><span className="faucet-mini-amount">Get test tokens <ArrowRight size={15} /></span></button>

              <div className="metrics-grid">
                <div className="metric-card balance-card">
                  <div className="metric-top"><span>Total balance</span><button className="plain-icon" onClick={() => setShowBalance(!showBalance)} aria-label={showBalance ? "Hide balance" : "Show balance"}>{showBalance ? <Eye size={16} /> : <EyeOff size={16} />}</button></div>
                  <div className="metric-value">{showBalance ? (usdcBalance === null || eurcBalance === null ? "—" : `${(Number(usdcBalance.replaceAll(",", "")) + Number(eurcBalance.replaceAll(",", ""))).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`) : "••••••"}</div>
                  <div className="metric-foot"><span className="metric-dot lavender" /> {connected ? "Arc Testnet wallet assets" : "Connect wallet to view your assets"}</div>
                  <div className="balance-decoration"><div /><div /><div /></div>
                </div>
                <div className="metric-card token-balance-card">
                  <div className="metric-top"><span>EURC balance</span><span className="metric-icon lavender">€</span></div>
                  <div className="metric-value">{showBalance ? (balancesLoading ? "Loading…" : eurcBalance ?? "—") : "••••••"}</div>
                  <div className="metric-foot">{walletAddress ? "ERC-20 balance on Arc Testnet" : "Connect wallet to load balance"}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-top"><span>Yield earned</span><span className="metric-icon mint"><Activity size={16} /></span></div>
                  <div className="metric-value">$<span className="zero">{yieldEarned ?? "—"}</span></div>
                  <div className="metric-foot"><span className="subtle-pill">{yieldEarned === null ? "Check position to load yield" : "Accrued testnet yield"}</span></div>
                </div>
                <div className="metric-card">
                  <div className="metric-top"><span>Active positions</span><span className="metric-icon peach"><Landmark size={16} /></span></div>
                  <div className="metric-value">{positionsChecked ? walletPositions.length : <span className="zero">—</span>}</div>
                  <div className="metric-foot">Refresh positions to load live count</div>
                </div>
              </div>


            </>
          )}

          {section === "Explore" && (
            <>
              <div className="subpage-heading"><h1>Explore Stablecoins Yeilds</h1><p>USDC and EURC on Arc.</p></div>
              <section className="section-block">
                <div className="asset-switch vault-asset-cards" role="group" aria-label="Choose asset">
                  <button className={asset === "USDC" ? "asset-tab token-usdc selected" : "asset-tab token-usdc"} onClick={() => { setAsset("USDC"); setSelectedVaultAddress(liveVaults.find((vault) => vault.asset === "USDC")?.address || ""); }}><span className="token token-usdc">$</span><span className="vault-card-label"><strong>USDC vaults</strong><small>Dollar stablecoin</small></span></button>
                  <button className={asset === "EURC" ? "asset-tab token-eurc selected" : "asset-tab token-eurc"} onClick={() => { setAsset("EURC"); setSelectedVaultAddress(liveVaults.find((vault) => vault.asset === "EURC")?.address || ""); }}><span className="token token-eurc">€</span><span className="vault-card-label"><strong>EURC vaults</strong><small>Euro stablecoin</small></span></button>
                </div>
                <section className="live-earn-panel">
                  <div className="live-earn-heading"><div><h3>Available vaults</h3><p>Only active vaults returned by Circle Earn Kit are listed here.</p></div><button className="live-earn-refresh" type="button" onClick={() => { setVaultsLoading(true); void appKit.earn.exploreVaults({ chain: "Arc_Testnet", sortBy: "apy" }).then((result) => { const active = result.vaults.filter((vault) => vault.status === "active" && Boolean(vault.address) && (vault.asset === "USDC" || vault.asset === "EURC")); setLiveVaults(active); setSelectedVaultAddress((current) => current || active[0]?.address || ""); }).catch(() => setEarnStatus("Could not refresh vaults. Try again.")).finally(() => setVaultsLoading(false)); }}><Activity size={14} /> Refresh vaults</button></div>
                  {vaultsLoading ? <div className="live-earn-empty">Loading USDC and EURC testnet vaults from Circle Earn Kit…</div> : liveVaults.length === 0 ? <div className="live-earn-empty"><ShieldCheck size={18} /><span>No active USDC or EURC testnet vaults were returned. Refresh to retry; deposits stay disabled until a real supported vault is found.</span></div> : liveVaults.filter((vault) => vault.asset === asset).length === 0 ? <div className="live-earn-empty"><ShieldCheck size={18} /><span>No active {asset} testnet vault is currently available from Circle Earn Kit. Switch assets or refresh later. Deposits remain disabled until a real vault is available.</span></div> : <>
                    <div className="live-vault-list">{liveVaults.filter((vault) => vault.asset === asset).map((vault) => <button type="button" key={vault.address} className={expandedVaultAddress === vault.address ? "live-vault-option selected" : "live-vault-option"} aria-pressed={expandedVaultAddress === vault.address} onClick={() => { setSelectedVaultAddress(vault.address); setExpandedVaultAddress((current) => current === vault.address ? "" : vault.address); setEarnPosition(null); setEarnStatus(""); }}><span className={`swap-coin ${vault.asset === "EURC" ? "eurc" : "usdc"}`}>{vault.asset === "EURC" ? "€" : "$"}</span><span className="live-vault-copy"><strong>{vault.name}</strong><small>{vault.protocol} · {vault.asset} stablecoin</small></span><span className="live-vault-apy">{typeof vault.currentApy === "number" ? `${(vault.currentApy * 100).toFixed(2)}% APY` : "APY unavailable"}<small>{expandedVaultAddress === vault.address ? "Hide details" : "View details"} <ArrowRight size={12} /></small></span></button>)}</div>
                    {(() => { const selectedVault = liveVaults.find((vault) => vault.address === selectedVaultAddress && vault.asset === asset); if (!selectedVault || expandedVaultAddress !== selectedVault.address) return null; return <div className="vault-detail-card">
                      <div className="vault-detail-top"><div><div className="eyebrow">SELECTED VAULT · ARC TESTNET</div><h4>{selectedVault.name}</h4><p>{selectedVault.protocol} · {selectedVault.asset}</p></div><span className={`vault-detail-token ${asset === "EURC" ? "eurc" : "usdc"}`}>{asset === "EURC" ? "€" : "$"}</span></div>
                      <div className="vault-detail-metrics"><div><span>Current APY</span><strong>{typeof selectedVault.currentApy === "number" ? `${(selectedVault.currentApy * 100).toFixed(2)}%` : "Not available"}</strong><small>Variable, not guaranteed</small></div><div><span>Deposit asset</span><strong>{selectedVault.asset}</strong><small>Arc Testnet</small></div></div>
                      <p className="vault-detail-note">Choose an amount and preview the deposit. When you continue, your connected wallet will show the transaction for you to review and sign. Only use testnet tokens here.</p>
                       <div className="vault-wallet-balance"><span>Wallet balance · {asset}</span><strong>{!connected || walletChainId !== 5042002 ? "Connect to Arc Testnet to view" : balancesLoading ? "Loading balance…" : (asset === "USDC" ? usdcBalance : eurcBalance) === null ? "Balance unavailable" : `${asset === "USDC" ? usdcBalance : eurcBalance} ${asset}`}</strong><button type="button" disabled={!connected || walletChainId !== 5042002 || balancesLoading || (asset === "USDC" ? usdcBalance : eurcBalance) === null || Number((asset === "USDC" ? usdcBalance : eurcBalance)?.replaceAll(",", "")) <= 0} onClick={() => setEarnAmount((asset === "USDC" ? usdcBalance : eurcBalance)?.replaceAll(",", "") || "")}>Use max</button></div>
                       <div className="earn-actions-row"><label>Amount ({asset})<input type="number" min="0.000001" step="any" value={earnAmount} onChange={(event) => setEarnAmount(event.target.value)} /></label><div className="earn-action-buttons"><button type="button" onClick={() => runEarnAction("quote")} disabled={earnBusy || !selectedVaultAddress}>Preview deposit</button><button type="button" onClick={() => runEarnAction("deposit")} disabled={earnBusy || !selectedVaultAddress || !connected || walletChainId !== 5042002}>{connected && walletChainId === 5042002 ? "Deposit & sign" : "Connect wallet to deposit"}</button><button type="button" onClick={() => runEarnAction("withdraw")} disabled={earnBusy || !selectedVaultAddress || !connected || walletChainId !== 5042002}>Withdraw</button><button type="button" onClick={() => runEarnAction("position")} disabled={earnBusy || !selectedVaultAddress || !connected || walletChainId !== 5042002}>Refresh position</button></div></div>
                      {earnBusy && <div className="live-earn-status" role="status">Waiting for wallet approval or testnet confirmation…</div>}
                      {earnStatus && <div className="live-earn-status" role="status">{earnStatus}</div>}
                      {earnPosition !== null && earnPosition !== undefined && typeof earnPosition === "object" && earnPosition !== null && <div className="earn-result-summary"><strong>Latest vault response</strong>{Object.entries(earnPosition as Record<string, unknown>).filter(([key]) => ["vaultName", "asset", "amount", "currentBalance", "currentApy", "sharePrice", "expectedShares", "txHash"].includes(key)).map(([key, value]) => <div key={key}><span>{key === "currentApy" ? "Current APY" : key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}</span><strong>{key === "currentApy" && typeof value === "number" ? `${(value * 100).toFixed(2)}%` : typeof value === "object" ? JSON.stringify(value) : String(value)}</strong></div>)}{typeof (earnPosition as { explorerUrl?: unknown }).explorerUrl === "string" && <a href={(earnPosition as { explorerUrl: string }).explorerUrl} target="_blank" rel="noreferrer">View transaction on Arc Testnet explorer <ExternalLink size={13} /></a>}</div>}
                    </div>; })()}
                  </>}
                </section>
              </section>

            </>
          )}

          {section === "Swap" && (
            <>
              <div className="subpage-heading"><div className="eyebrow"><ArrowDownUp size={14} /> ULTIMA STABLECOINS DEX</div><p>Exchange USDC and EURC on Arc, in either direction.</p></div>
              <section className="swap-layout">
                <div className="swap-card">
                  <div className="swap-card-heading"><div><h2>Swap tokens</h2><p>Choose the token you send and receive.</p></div><span className="swap-network"><span className="network-dot" /> Arc Testnet</span></div>
                  <div className="swap-token-box">
                    <div className="swap-token-label"><span>You pay</span><span>Balance: {swapFrom === "USDC" ? (usdcBalance ?? "—") : (eurcBalance ?? "—")}</span></div>
                    <div className="swap-token-row">
                      <input type="number" min="0" step="any" inputMode="decimal" placeholder="0.00" value={swapAmount} onChange={(event) => { setSwapAmount(event.target.value); setSwapQuote(null); }} aria-label="Amount to swap" />
                      <button type="button" className="swap-token-select" aria-label={`Pay with ${swapFrom}`}><span className={`swap-coin ${swapFrom.toLowerCase()}`}>{swapFrom === "USDC" ? "$" : "€"}</span>{swapFrom}<ChevronDown size={15} /></button>
                    </div>
                  </div>
                  <button type="button" className="swap-direction" onClick={() => { setSwapFrom((current) => current === "USDC" ? "EURC" : "USDC"); setSwapQuote(null); setSwapStatus(""); }} aria-label="Switch swap direction"><ArrowDownUp size={18} /></button>
                  <div className="swap-token-box swap-receive">
                    <div className="swap-token-label"><span>You receive · {swapFrom === "USDC" ? "EURC" : "USDC"}</span><span>{swapQuote ? "Live estimate" : "Estimated amount"}</span></div>
                    <div className="swap-token-row"><div className="swap-estimate" aria-live="polite">{swapQuote ? swapQuote.amountOut : "0.00"}</div><div className="swap-token-select static"><span className={`swap-coin ${(swapFrom === "USDC" ? "eurc" : "usdc")}`}>{swapFrom === "USDC" ? "€" : "$"}</span>{swapFrom === "USDC" ? "EURC" : "USDC"}</div></div>
                  </div>
                  <div className="swap-info-list">
                    <div><span>Network</span><strong>Arc Testnet</strong></div>
                    <div><span>Exchange rate</span><strong>{swapQuote ? `1 ${swapFrom} ≈ ${swapQuote.effectiveRate} ${swapFrom === "USDC" ? "EURC" : "USDC"}` : "Get a live quote before swapping"}</strong></div>
                    <div><span>Network fee</span><strong>Shown before confirmation</strong></div>
                  </div>
                  <button type="button" className="swap-quote-button" onClick={getSwapQuote} disabled={swapBusy || !connected || walletChainId !== 5042002 || !swapAmount || Number(swapAmount) <= 0}>{swapBusy ? "Fetching quote…" : "Get live quote"}</button>
                  <button type="button" className="swap-submit" onClick={runSwap} disabled={swapBusy || !connected || walletChainId !== 5042002 || !swapAmount || Number(swapAmount) <= 0 || !swapQuote}><ArrowDownUp size={16} /> {swapBusy ? "Waiting for wallet…" : `Swap ${swapFrom} for ${swapFrom === "USDC" ? "EURC" : "USDC"}`}</button>
                  {swapStatus && <p className="swap-notice" role="status"><ShieldCheck size={15} /> {swapStatus}</p>}
                  <p className="swap-notice"><ShieldCheck size={15} /> Testnet only. Review the wallet request carefully. Swap availability depends on live routing and liquidity; no rate is guaranteed before submission.</p>
                </div>
              </section>
            </>
          )}

          {section === "Strategies" && (
            <>
              <div className="subpage-heading"><div className="eyebrow"><Bot size={14} /> INTELLIGENCE</div><h1>Strategy <span>analyst.</span></h1></div>
              <section className="ai-strategy-panel" aria-labelledby="ai-strategy-title">
                <div className="ai-panel-visual"><Bot size={24} /></div>
                <div className="ai-panel-main">
                  <div className="eyebrow">ULTIMA INTELLIGENCE</div>
                  <h2 id="ai-strategy-title">AI strategy analyst</h2>
                  <p>Explore yield strategy trade-offs for USDC or EURC on Arc. Analysis supports your decision; it does not execute transactions or guarantee returns.</p>
                  <div className="ai-panel-controls">
                    <label>Asset
                      <select value={asset} onChange={(event) => { setAsset(event.target.value as "USDC" | "EURC"); setAnalysisResult(""); setAnalysisError(""); }}>
                        <option value="USDC">USDC</option>
                        <option value="EURC">EURC</option>
                      </select>
                    </label>
                    <label>Risk preference
                      <select value={riskPreference} onChange={(event) => { setRiskPreference(event.target.value as "conservative" | "balanced" | "growth"); setAnalysisResult(""); setAnalysisError(""); }}>
                        <option value="conservative">Conservative</option>
                        <option value="balanced">Balanced</option>
                        <option value="growth">Growth-oriented</option>
                      </select>
                    </label>
                    <button className="ai-analyze-button" onClick={runStrategyAnalysis} disabled={analysisLoading}>
                      <Bot size={16} /> {analysisLoading ? "Analyzing…" : "Analyze strategies"}
                    </button>
                  </div>
                  <div className="ai-safety-note"><ShieldCheck size={15} /> Analysis may include general guidance. Treat APYs, liquidity, protocol safety, and other figures as unverified unless explicitly backed by live data.</div>
                  {analysisError && <div className="ai-result ai-result-error" role="alert">{analysisError}</div>}
                  {analysisResult && <div className="ai-result" role="status">{analysisResult}</div>}
                </div>
              </section>
            </>
          )}

          {section === "My positions" && (
            <>
              <div className="subpage-heading"><div className="eyebrow"><Wallet size={14} /> YOUR PORTFOLIO</div><h1>All your positions, <span>in one place.</span></h1></div>
              <section className="panel" style={{ padding: 24, marginBottom: 24 }}>
                <div className="eyebrow"><ShieldCheck size={14} /> ULTIMA SMART CONTRACT</div>
                <h2 style={{ margin: "10px 0 6px" }}>Test UltimaVault</h2>
                <p style={{ margin: "0 0 18px", color: "var(--muted, #777)", lineHeight: 1.6 }}>
                  Test USDC and EURC deposits and withdrawals through Ultima&apos;s own Arc Testnet contract. Each stablecoin has separate balances. This custody contract does not generate yield by itself.
                </p>
                {!ultimaVaultConfigured ? (
                  <div className="empty-state"><strong>Contract address not configured</strong><p>Deploy the two-asset contract to Arc Testnet first, then set <code>NEXT_PUBLIC_ULTIMA_VAULT_ADDRESS</code> in Vercel and redeploy.</p></div>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
                      {(["USDC", "EURC"] as const).map((symbol) => (
                        <div className="metric-card" key={symbol}>
                          <span className="detail-label">Your {symbol} balance</span>
                          <strong>{ultimaVaultBalances[symbol] === null ? "Not loaded" : `${Number(ultimaVaultBalances[symbol]).toLocaleString("en-US", { maximumFractionDigits: 6 })} ${symbol}`}</strong>
                          <span className="detail-label" style={{ marginTop: 8 }}>Total held</span>
                          <strong>{ultimaTotalAssets[symbol] === null ? "Not loaded" : `${Number(ultimaTotalAssets[symbol]).toLocaleString("en-US", { maximumFractionDigits: 6 })} ${symbol}`}</strong>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                      <select aria-label="Stablecoin for UltimaVault" value={ultimaAsset} onChange={(event) => setUltimaAsset(event.target.value as "USDC" | "EURC")} style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border, #ddd)", background: "var(--surface, white)", color: "inherit" }}>
                        <option value="USDC">USDC</option>
                        <option value="EURC">EURC</option>
                      </select>
                      <input aria-label={`${ultimaAsset} amount for UltimaVault`} inputMode="decimal" value={ultimaAmount} onChange={(event) => setUltimaAmount(event.target.value)} placeholder={`${ultimaAsset} amount`} style={{ minWidth: 150, maxWidth: 220, padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border, #ddd)", background: "var(--surface, white)", color: "inherit" }} />
                      <button className="connect-button" onClick={() => void runUltimaContractAction("deposit")} disabled={!connected || walletChainId !== 5042002 || ultimaBusy}><ArrowDownLeft size={16} /> {ultimaBusy ? "Processing…" : `Deposit ${ultimaAsset}`}</button>
                      <button className="connect-button" onClick={() => void runUltimaContractAction("withdraw")} disabled={!connected || walletChainId !== 5042002 || ultimaBusy}><ArrowUpRight size={16} /> {ultimaBusy ? "Processing…" : `Withdraw ${ultimaAsset}`}</button>
                      <button className="explore-button" onClick={() => void readUltimaContractState().catch(() => setUltimaStatus("Could not read UltimaVault. Confirm both token addresses and the Arc Testnet deployment."))} disabled={!connected || walletChainId !== 5042002 || ultimaBusy}><Activity size={16} /> Refresh contract</button>
                    </div>
                    {ultimaStatus && <p role="status" style={{ marginTop: 14, lineHeight: 1.6 }}>{ultimaStatus}</p>}
                    {ultimaTxHash && <p style={{ marginTop: 8 }}><a href={`https://explorer.testnet.arc.io/tx/${ultimaTxHash}`} target="_blank" rel="noreferrer">View latest transaction on Arc Explorer <ExternalLink size={14} /></a></p>}
                    <p style={{ marginTop: 14, fontSize: 12, color: "var(--muted, #777)", overflowWrap: "anywhere" }}>Contract: <a href={`https://explorer.testnet.arc.io/address/${ultimaVaultAddress}`} target="_blank" rel="noreferrer">{ultimaVaultAddress}</a></p>
                  </>
                )}
              </section>
              <div className="positions-toolbar">
                <button className="connect-button" onClick={() => void refreshAllPositions()} disabled={!connected || walletChainId !== 5042002 || positionsLoading}>
                  <Activity size={16} /> {positionsLoading ? "Checking positions…" : "Refresh positions"}
                </button>
                {!connected && <span>Connect your wallet to load positions.</span>}
              </div>
              {walletPositions.length > 0 ? <div className="strategy-grid full-strategy-grid">
                {walletPositions.map((position) => <article className="strategy-card" key={position.vaultAddress}>
                  <div className="strategy-card-top"><div className={`protocol-logo ${position.asset === "EURC" ? "blue" : "violet"}`}>{position.asset === "EURC" ? "€" : "$"}</div><div className="strategy-title"><h3>{position.name}</h3><span>{position.asset} · Arc Testnet</span></div><a className="card-more" href={`https://explorer.testnet.arc.io/address/${position.vaultAddress}`} target="_blank" rel="noreferrer" aria-label="View vault on Arc Testnet explorer"><ExternalLink size={15} /></a></div>
                  <div className="strategy-details"><div><span className="detail-label">Current position</span><strong>{position.currentBalance} {position.asset}</strong></div><div><span className="detail-label">Current APY</span><strong>{position.currentApy === null ? "Unavailable" : `${(position.currentApy * 100).toFixed(2)}%`}</strong></div></div>
                  <div className="strategy-card-bottom"><span className="tag">Testnet only</span><button className="explore-button" onClick={() => { setAsset(position.asset as "USDC" | "EURC"); setSelectedVaultAddress(position.vaultAddress); setExpandedVaultAddress(position.vaultAddress); navigate("Explore"); }}>Manage position <ArrowRight size={15} /></button></div>
                  <p className="strategy-description">Principal: {position.principalDeposited ?? "Unavailable"} {position.asset} · Yield/loss: {position.totalYieldEarned ?? "Unavailable"} {position.asset}</p>
                </article>)}
              </div> : <div className="empty-state large-empty"><div className="empty-illustration"><Wallet size={26} /><span>+</span></div><h2>{positionsLoading ? "Checking your positions…" : positionsChecked ? "No active positions found" : "Check your positions"}</h2><p>{positionsChecked ? "No positive balance was returned for the currently available Circle Earn Kit vaults. If you deposited elsewhere, this list may not include that vault yet." : "Connect your wallet and refresh to read balances from the currently supported testnet vaults."}</p>{!connected && <button className="connect-button" onClick={connectWallet}><Wallet size={16} /> Connect wallet</button>}</div>}
            </>
          )}

          {section === "Activity" && (
            <>
              <div className="subpage-heading"><div className="eyebrow"><Activity size={14} /> TRANSACTION HISTORY</div><h1>Your activity, <span>clearly tracked.</span></h1></div>
              <div className="activity-table panel">
                <div className="table-head"><span>TRANSACTION</span><span>NETWORK</span><span>STATUS</span><span>DATE</span></div>
                {txHistory.length === 0 ? <div className="empty-state"><div className="empty-icon"><Clock3 size={20} /></div><strong>No testnet transactions yet</strong><p>Successful swaps, deposits and withdrawals made through Ultima will appear here on this device.</p></div> : <div className="activity-record-list">{txHistory.map((tx) => <div className="activity-record" key={tx.id}><div className="activity-record-icon"><ArrowUpRight size={16} /></div><div className="activity-record-main"><strong>{tx.action} · {tx.asset}</strong><span>{new Date(tx.createdAt).toLocaleString()}</span></div><div className="activity-record-amount">{tx.amount}</div><a href={tx.explorerUrl} target="_blank" rel="noreferrer" aria-label="View transaction on Arc Testnet explorer"><ExternalLink size={15} /></a></div>)}</div>}
              </div>
            </>
          )}

          <footer className="page-footer">
            <div className="footer-brand"><div className="brand-mark footer-brand-mark" aria-label="Ultima logo"><svg viewBox="0 0 32 32" role="img" aria-hidden="true"><path className="paper-u" d="M6.5 5.5h5.2v13.1c0 3.5 1.5 5.5 4.3 5.5s4.3-2 4.3-5.5V5.5h5.2v13.7c0 6.3-3.6 9.8-9.5 9.8s-9.5-3.5-9.5-9.8V5.5Z"/><circle className="u-red-dot" cx="25.5" cy="6.3" r="3.1"/></svg></div><strong>ultima</strong><span>© 2026</span></div>
            <span className="footer-tagline">Built for clarity, smarter.</span>
            <div className="footer-socials" aria-label="Social platforms">
              <a className="footer-social footer-x" href="https://x.com" target="_blank" rel="noreferrer" aria-label="X (Twitter)" title="X (Twitter)">𝕏</a>
              <a className="footer-social" href="https://telegram.org" target="_blank" rel="noreferrer" aria-label="Telegram" title="Telegram">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 4.2 18.4 19c-.24 1.05-.86 1.3-1.74.8l-4.82-3.55-2.33 2.24c-.26.26-.48.48-.98.48l.35-4.9 8.92-8.06c.39-.35-.08-.54-.6-.19L6.18 12.7 1.5 11.24c-1.02-.32-1.04-1.02.22-1.52L20 2.65c.84-.31 1.58.2 1.3 1.55Z" fill="currentColor"/></svg>
              </a>
            </div>
          </footer>
        </div>
      </section>

      {yieldExplainerOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setYieldExplainerOpen(false);
        }}>
          <section className="yield-modal" role="dialog" aria-modal="true" aria-labelledby="yield-explainer-title">
            <div className="yield-modal-head">
              <div className="yield-modal-icon"><Bot size={21} /></div>
              <button className="icon-button" aria-label="Close yield explainer" onClick={() => setYieldExplainerOpen(false)}><X size={18} /></button>
            </div>
            <div className="eyebrow">THE BASICS</div>
            <h2 id="yield-explainer-title">How stablecoin yield works</h2>
            <p className="yield-modal-intro">Yield is a return you may earn by putting stablecoins to work in a lending or other onchain strategy. Returns are not guaranteed, and your funds can be at risk.</p>
            <div className="yield-steps">
              <article><span>01</span><div><strong>Choose an asset</strong><p>Select USDC or EURC, depending on which stablecoin you hold and want to use.</p></div></article>
              <article><span>02</span><div><strong>Review the strategy</strong><p>Check how it works, expected return, liquidity, fees, contract permissions and independent security information before committing funds.</p></div></article>
              <article><span>03</span><div><strong>Understand the risks</strong><p>Stablecoins can lose their peg. Smart contracts, lending markets and liquidity can fail or change. Past returns do not guarantee future results.</p></div></article>
              <article><span>04</span><div><strong>Deposit only after verification</strong><p>Only active vaults returned by Circle Earn Kit are shown. This is testnet: use test tokens only and review each wallet transaction before signing.</p></div></article>
            </div>
            <div className="yield-modal-note"><ShieldCheck size={16} /> Ultima will show current rates and enable strategy actions only after the relevant onchain details are verified.</div>
            <div className="yield-modal-actions"><button className="connect-button" onClick={() => { setYieldExplainerOpen(false); navigate("Strategies"); }}>Explore strategies <ArrowUpRight size={15} /></button></div>
          </section>
        </div>
      )}

      {notificationSettingsOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setNotificationSettingsOpen(false);
        }}>
          <section className="notification-modal" role="dialog" aria-modal="true" aria-labelledby="notification-title">
            <div className="notification-modal-head">
              <div className="notification-modal-icon"><Bell size={19} /></div>
              <button className="icon-button" aria-label="Close notification settings" onClick={() => setNotificationSettingsOpen(false)}><X size={18} /></button>
            </div>
            <h2 id="notification-title">Notification settings</h2>
            <p className="notification-intro">Choose where Ultima should contact you and which updates matter.</p>
            <label className="notification-field">
              <span>Email address</span>
              <input type="email" autoComplete="email" placeholder="you@example.com" value={notificationEmail} onChange={(event) => setNotificationEmail(event.target.value)} />
            </label>
            <label className="notification-field">
              <span>Telegram username</span>
              <div className="telegram-input"><span>@</span><input autoComplete="off" placeholder="yourusername" value={notificationTelegram} onChange={(event) => setNotificationTelegram(event.target.value.replace(/^@/, ""))} /></div>
              <small>Enter your username without the @. A Telegram bot connection will be required to deliver messages.</small>
            </label>
            <div className="notification-options-title">Send me updates about</div>
            <div className="notification-options">
              {([
                ["positionUpdates", "Position updates", "Changes to your strategy positions."],
                ["transactionUpdates", "Transactions", "Deposit, withdrawal and transaction status."],
                ["riskAlerts", "Risk alerts", "Important strategy or position warnings."],
                ["productUpdates", "Product updates", "New strategies and Ultima announcements."],
              ] as const).map(([key, label, description]) => (
                <label className="notification-option" key={key}>
                  <span><strong>{label}</strong><small>{description}</small></span>
                  <input type="checkbox" checked={notificationPrefs[key]} onChange={(event) => setNotificationPrefs((current) => ({ ...current, [key]: event.target.checked }))} />
                </label>
              ))}
            </div>
            <div className="notification-modal-footer">
              <span className="notification-disclaimer">Preferences are saved in this browser. Delivery is not connected yet.</span>
              <button className="connect-button" onClick={saveNotificationSettings}>Save preferences</button>
            </div>
            {notificationSaved && <div className="notification-saved" role="status"><CircleCheck size={15} /> Preferences saved on this device.</div>}
          </section>
        </div>
      )}

      {faucetOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setFaucetOpen(false)}>
          <section className="faucet-modal" role="dialog" aria-modal="true" aria-labelledby="faucet-title" onClick={(event) => event.stopPropagation()}>
            <div className="faucet-modal-head"><div className="faucet-modal-icon"><Droplets size={22} /></div><button className="icon-button" type="button" aria-label="Close faucet" onClick={() => setFaucetOpen(false)}><X size={18} /></button></div>
            <div className="eyebrow">ARC TESTNET FAUCET</div><h2 id="faucet-title">Get testnet USDC</h2><p className="faucet-modal-intro">Request test funds for Arc Testnet.</p>
            <div className="faucet-claim-summary"><span>Amount</span><strong>Set by the official faucet</strong><span>Availability</span><strong>Faucet limits apply</strong><span>Network</span><strong>Arc Testnet</strong></div>
            <div className="faucet-warning"><ShieldCheck size={17} /><span>This is testnet USDC with no real-world value. Ultima does not distribute tokens itself. Use Circle&apos;s official faucet to request test funds.</span></div>
            <a className="faucet-claim-button" href="https://faucet.circle.com/" target="_blank" rel="noreferrer"><Droplets size={16} /> Get testnet USDC <ExternalLink size={14} /></a>
          </section>
        </div>
      )}

      {notice && <div className="toast" role="status"><CircleCheck size={17} /><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={15} /></button></div>}
    </main>
  );
}

