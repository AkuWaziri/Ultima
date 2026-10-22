"use client";

import { useCallback, useEffect, useState } from "react";
import { AppKit } from "@circle-fin/app-kit";
import type { EarnVaultInfo } from "@circle-fin/app-kit";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
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

type Section = "Dashboard" | "Explore" | "Swap" | "Strategies" | "My positions" | "Activity";

const navItems: { label: Section; icon: typeof LayoutDashboard }[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Explore", icon: Compass },
  { label: "Swap", icon: ArrowDownUp },
  { label: "Strategies", icon: Bot },
  { label: "My positions", icon: Wallet },
  { label: "Activity", icon: Activity },
];

const vaults = [
  {
    name: "Galaxy USDC",
    provider: "Morpho vault",
    initials: "G",
    tone: "violet",
    description: "A curated USDC lending strategy.",
    tags: ["USDC", "Arc"],
    status: "Needs live verification",
  },
  {
    name: "Keyrock Prime USDC",
    provider: "Morpho vault",
    initials: "K",
    tone: "blue",
    description: "A USDC strategy curated for capital efficiency.",
    tags: ["USDC", "Arc"],
    status: "Needs live verification",
  },
];

const ARC_TESTNET = { chainId: "0x4cef52", chainName: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: ["https://rpc.testnet.arc.io"], blockExplorerUrls: ["https://explorer.testnet.arc.io"] } as const;
const TOKEN_ADDRESSES = { USDC: "0x3600000000000000000000000000000000000000", EURC: "0x89b50855aa3be2f677cd6303cec089b5f319d72a" } as const;

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
  const [search, setSearch] = useState("");
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
  const [earnAmount, setEarnAmount] = useState("1");
  const [earnBusy, setEarnBusy] = useState(false);
  const [earnStatus, setEarnStatus] = useState("");
  const [earnPosition, setEarnPosition] = useState<unknown>(null);
  const [swapBusy, setSwapBusy] = useState(false);
  const [swapStatus, setSwapStatus] = useState("");
  const [swapQuote, setSwapQuote] = useState<{ amountOut: string; effectiveRate: string } | null>(null);
  const [txHistory, setTxHistory] = useState<UltimaTransaction[]>([]);
  const [yieldEarned, setYieldEarned] = useState<string | null>(null);

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
        body: JSON.stringify({ asset, riskPreference }),
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
    try {
      const readTokenBalance = async (token: string) => {
        const data = "0x70a08231" + address.toLowerCase().replace("0x", "").padStart(64, "0");
        const rpcProvider = provider as unknown as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
        const raw = await rpcProvider.request({ method: "eth_call", params: [{ to: token, data }, "latest"] }) as string;
        return (Number(BigInt(raw || "0x0")) / 1_000_000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
      };
      const [usdc, eurc] = await Promise.all([readTokenBalance(TOKEN_ADDRESSES.USDC), readTokenBalance(TOKEN_ADDRESSES.EURC)]);
      setUsdcBalance(usdc);
      setEurcBalance(eurc);
    } catch {
      setNotice("Could not read token balances. Check your Arc Testnet connection and retry.");
    } finally { setBalancesLoading(false); }
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

  const getSwapQuote = async () => {
    const provider = (window as Window & { ethereum?: EthereumProvider }).ethereum;
    if (!provider || !walletAddress || !connected || walletChainId !== 5042002) { setSwapStatus("Connect your wallet to Arc Testnet first."); return; }
    if (!swapAmount || !Number.isFinite(Number(swapAmount)) || Number(swapAmount) <= 0) { setSwapStatus("Enter a valid amount greater than zero."); return; }
    setSwapBusy(true); setSwapStatus(""); setSwapQuote(null);
    try {
      const adapter = await createViemAdapterFromProvider({ provider });
      const result = await appKit.estimateSwap({
        from: { adapter, chain: "Arc_Testnet", address: walletAddress },
        tokenIn: swapFrom,
        tokenOut: swapFrom === "USDC" ? "EURC" : "USDC",
        amountIn: swapAmount,
      });
      const amountOut = result.estimatedOutput.amount;
      setSwapQuote({ amountOut, effectiveRate: (Number(amountOut) / Number(swapAmount)).toFixed(6) });
    } catch (error) {
      setSwapStatus(error instanceof Error ? error.message : "A live quote is unavailable. Try a smaller amount or retry later.");
    } finally { setSwapBusy(false); }
  };

  const runSwap = async () => {
    const provider = (window as Window & { ethereum?: EthereumProvider }).ethereum;
    if (!provider || !walletAddress || !connected) { setSwapStatus("Connect your wallet first."); return; }
    const amount = Number(swapAmount);
    if (!Number.isFinite(amount) || amount <= 0) { setSwapStatus("Enter a valid amount greater than zero."); return; }
    setSwapBusy(true); setSwapStatus("");
    try {
      const adapter = await createViemAdapterFromProvider({ provider });
      const result = await appKit.swap({
        from: { adapter, chain: "Arc_Testnet" },
        tokenIn: swapFrom,
        tokenOut: swapFrom === "USDC" ? "EURC" : "USDC",
        amountIn: swapAmount,
      });
      const outcome = result as { txHash?: string; explorerUrl?: string; amountOut?: string };
      setSwapStatus(outcome.explorerUrl ? `Swap submitted: ${outcome.explorerUrl}` : `Swap completed. Transaction: ${outcome.txHash ?? "confirmed by App Kit"}`);
      if (outcome.txHash) recordTransaction({ action: "Swap", asset: `${swapFrom} → ${swapFrom === "USDC" ? "EURC" : "USDC"}`, amount: swapAmount, txHash: outcome.txHash, explorerUrl: outcome.explorerUrl ?? `https://explorer.testnet.arc.io/tx/${outcome.txHash}` });
      setSwapQuote(null);
      await refreshWalletBalances(walletAddress);
    } catch (error) {
      setSwapStatus(error instanceof Error ? error.message : "Swap failed. Check testnet liquidity and try a smaller amount.");
    } finally { setSwapBusy(false); }
  };

  const runEarnAction = async (action: "quote" | "deposit" | "position" | "withdraw") => {
    const provider = (window as Window & { ethereum?: EthereumProvider }).ethereum;
    if (!provider || !walletAddress || !connected || walletChainId !== 5042002) { setEarnStatus("Connect your wallet to Arc Testnet to use a testnet vault."); return; }
    if (!selectedVaultAddress) { setEarnStatus("No active testnet vault is available for this asset."); return; }
    const amount = Number(earnAmount);
    if (action !== "position" && (!Number.isFinite(amount) || amount <= 0)) { setEarnStatus("Enter a valid amount greater than zero."); return; }
    setEarnBusy(true); setEarnStatus("");
    try {
      const adapter = await createViemAdapterFromProvider({ provider });
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
        const adapterForPosition = await createViemAdapterFromProvider({ provider });
        const updatedPosition = await appKit.earn.getPosition({ from: { adapter: adapterForPosition, chain: "Arc_Testnet" }, vaultAddress: selectedVaultAddress });
        setEarnPosition(updatedPosition);
        setYieldEarned((updatedPosition as { pnl?: { totalYieldEarned?: string } }).pnl?.totalYieldEarned ?? null);
        await refreshWalletBalances(walletAddress);
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

  const filteredVaults = vaults.filter((vault) =>
    vault.tags[0] === asset &&
    (vault.name + " " + vault.provider).toLowerCase().includes(search.toLowerCase())
  );

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

        <div className="nav-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${section === label ? "active" : ""}`} onClick={() => navigate(label)}>
              <Icon size={18} strokeWidth={1.9} /><span>{label}</span>
              {label === "Explore" && <span className="nav-count">2</span>}
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
                  
                  <h1>Make your money<br className="mobile-break" /> <span>work smarter.</span></h1>
                  
                </div>
                <div className="welcome-art" aria-hidden="true">
                  <div className="orbit orbit-one" /><div className="orbit orbit-two" />
                  <div className="art-coin coin-back">€</div><div className="art-coin coin-front">$</div>
                  <div className="art-spark spark-one"></div><div className="art-spark spark-two"></div>
                </div>
              </div>

              <button className="faucet-mini-tab" type="button" onClick={() => setFaucetOpen(true)} aria-haspopup="dialog"><span className="faucet-mini-icon"><Droplets size={18} /></span><span className="faucet-mini-copy"><strong>USDC Faucet</strong><small>Get 20 test USDC</small></span><span className="faucet-mini-amount">Get test USDC <ArrowRight size={15} /></span></button>

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
                  <div className="metric-value">0</div>
                  <div className="metric-foot">Your positions, all in one place</div>
                </div>
              </div>


            </>
          )}

          {section === "Explore" && (
            <>
              <div className="subpage-heading"><h1>Explore Stablecoins Yeilds</h1><p>USDC and EURC on Arc.</p></div>
              <section className="section-block">
                <div className="asset-switch vault-asset-cards" role="group" aria-label="Choose asset">
                  <button className={asset === "USDC" ? "asset-tab token-usdc selected" : "asset-tab token-usdc"} onClick={() => { setAsset("USDC"); setSelectedVaultAddress(liveVaults.find((vault) => vault.asset === "USDC")?.address || ""); }}><span className="token token-usdc">$</span><span className="vault-card-label"><strong>USDC vaults</strong><small>Dollar stablecoin</small></span><span className="vault-card-arrow"><ArrowRight size={17} /></span></button>
                  <button className={asset === "EURC" ? "asset-tab token-eurc selected" : "asset-tab token-eurc"} onClick={() => { setAsset("EURC"); setSelectedVaultAddress(liveVaults.find((vault) => vault.asset === "EURC")?.address || ""); }}><span className="token token-eurc">€</span><span className="vault-card-label"><strong>EURC vaults</strong><small>Euro stablecoin</small></span><span className="vault-card-arrow"><ArrowRight size={17} /></span></button>
                </div>
                <div className="data-note"><ShieldCheck size={16} /><span>Testing mode: only active vaults returned by Circle Earn Kit are listed here. APYs are provider data, not guaranteed returns. Testnet tokens have no real-world value.</span></div>
                <section className="live-earn-panel">
                  <div className="live-earn-heading"><div><div className="eyebrow">ARC TESTNET · LIVE DATA</div><h3>Try a real yield position</h3><p>Vaults and APYs are loaded from Circle Earn Kit. Deposits and withdrawals require wallet approval.</p></div><button className="live-earn-refresh" type="button" onClick={() => { setVaultsLoading(true); void appKit.earn.exploreVaults({ chain: "Arc_Testnet", sortBy: "apy" }).then((result) => { const active = result.vaults.filter((vault) => vault.status === "active" && Boolean(vault.address) && (vault.asset === "USDC" || vault.asset === "EURC")); setLiveVaults(active); setSelectedVaultAddress((current) => current || active[0]?.address || ""); }).catch(() => setEarnStatus("Could not refresh vaults. Try again.")).finally(() => setVaultsLoading(false)); }}><Activity size={14} /> Refresh vaults</button></div>
                  {vaultsLoading ? <div className="live-earn-empty">Loading USDC and EURC testnet vaults from Circle Earn Kit…</div> : liveVaults.length === 0 ? <div className="live-earn-empty"><ShieldCheck size={18} /><span>No active USDC or EURC testnet vaults were returned. Refresh to retry; deposits stay disabled until a real supported vault is found.</span></div> : liveVaults.filter((vault) => vault.asset === asset).length === 0 ? <div className="live-earn-empty"><ShieldCheck size={18} /><span>No active {asset} testnet vault is currently available from Circle Earn Kit. Switch assets or refresh later. Deposits remain disabled until a real vault is available.</span></div> : <>
                    <div className="live-vault-list">{liveVaults.filter((vault) => vault.asset === asset).map((vault) => <button type="button" key={vault.address} className={selectedVaultAddress === vault.address ? "live-vault-option selected" : "live-vault-option"} aria-pressed={selectedVaultAddress === vault.address} onClick={() => { setSelectedVaultAddress(vault.address); setEarnPosition(null); setEarnStatus(""); }}><span className={`swap-coin ${vault.asset === "EURC" ? "eurc" : "usdc"}`}>{vault.asset === "EURC" ? "€" : "$"}</span><span className="live-vault-copy"><strong>{vault.name}</strong><small>{vault.protocol} · {vault.asset} · {vault.address?.slice(0, 6)}…{vault.address?.slice(-4)}</small></span><span className="live-vault-apy">{typeof vault.currentApy === "number" ? `${(vault.currentApy * 100).toFixed(2)}% APY` : "APY unavailable"}<small>View details <ArrowRight size={12} /></small></span></button>)}</div>
                    {(() => { const selectedVault = liveVaults.find((vault) => vault.address === selectedVaultAddress && vault.asset === asset); if (!selectedVault) return null; return <div className="vault-detail-card">
                      <div className="vault-detail-top"><div><div className="eyebrow">SELECTED VAULT · ARC TESTNET</div><h4>{selectedVault.name}</h4><p>{selectedVault.protocol} · {selectedVault.asset}</p></div><span className={`vault-detail-token ${asset === "EURC" ? "eurc" : "usdc"}`}>{asset === "EURC" ? "€" : "$"}</span></div>
                      <div className="vault-detail-metrics"><div><span>Current APY</span><strong>{typeof selectedVault.currentApy === "number" ? `${(selectedVault.currentApy * 100).toFixed(2)}%` : "Not available"}</strong><small>Variable, not guaranteed</small></div><div><span>Deposit asset</span><strong>{selectedVault.asset}</strong><small>Arc Testnet</small></div></div>
                      <div className="vault-address-line"><span>Vault contract</span><code>{selectedVault.address}</code><button type="button" onClick={() => { void navigator.clipboard?.writeText(selectedVault.address || ""); setEarnStatus("Vault address copied."); }}>Copy</button></div>
                      <p className="vault-detail-note">Choose an amount and preview the deposit. When you continue, your connected wallet will show the transaction for you to review and sign. Only use testnet tokens here.</p>
                       <div className="vault-wallet-balance"><span>Wallet balance · {asset}</span><strong>{!connected || walletChainId !== 5042002 ? "Connect to Arc Testnet to view" : balancesLoading ? "Loading balance…" : (asset === "USDC" ? usdcBalance : eurcBalance) === null ? "Balance unavailable" : `${asset === "USDC" ? usdcBalance : eurcBalance} ${asset}`}</strong><button type="button" disabled={!connected || walletChainId !== 5042002 || balancesLoading || (asset === "USDC" ? usdcBalance : eurcBalance) === null || Number((asset === "USDC" ? usdcBalance : eurcBalance)?.replaceAll(",", "")) <= 0} onClick={() => setEarnAmount((asset === "USDC" ? usdcBalance : eurcBalance)?.replaceAll(",", "") || "")}>Use max</button></div>
                       <div className="earn-actions-row"><label>Amount ({asset})<input type="number" min="0.000001" step="any" value={earnAmount} onChange={(event) => setEarnAmount(event.target.value)} /></label><div className="earn-action-buttons"><button type="button" onClick={() => runEarnAction("quote")} disabled={earnBusy || !selectedVaultAddress}>Preview deposit</button><button type="button" onClick={() => runEarnAction("deposit")} disabled={earnBusy || !selectedVaultAddress || !connected || walletChainId !== 5042002}>{connected && walletChainId === 5042002 ? "Deposit & sign" : "Connect wallet to deposit"}</button><button type="button" onClick={() => runEarnAction("position")} disabled={earnBusy || !selectedVaultAddress || !connected || walletChainId !== 5042002}>My position</button><button type="button" onClick={() => runEarnAction("withdraw")} disabled={earnBusy || !selectedVaultAddress || !connected || walletChainId !== 5042002}>Withdraw</button></div></div>
                      {earnBusy && <div className="live-earn-status" role="status">Waiting for wallet approval or testnet confirmation…</div>}
                      {earnStatus && <div className="live-earn-status" role="status">{earnStatus}</div>}
                      {earnPosition && <pre className="earn-result-json">{JSON.stringify(earnPosition, null, 2)}</pre>}
                    </div>; })()}
                  </>}
                </section>
              </section>

            </>
          )}

          {section === "Swap" && (
            <>
              <div className="subpage-heading"><div className="eyebrow"><ArrowDownUp size={14} /> ARC SWAP</div><h1>Swap <span>stablecoins.</span></h1><p>Exchange USDC and EURC on Arc, in either direction.</p></div>
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
                  <button type="button" className="swap-direction" onClick={() => { setSwapFrom((current) => current === "USDC" ? "EURC" : "USDC"); setSwapQuote(null); }} aria-label="Switch swap direction"><ArrowDownUp size={18} /></button>
                  <div className="swap-token-box swap-receive">
                    <div className="swap-token-label"><span>You receive</span><span>Estimated amount</span></div>
                    <div className="swap-token-row"><div className="swap-estimate"> {swapQuote ? swapQuote.amountOut : "0.00"}</div><div className="swap-token-select static"><span className={`swap-coin ${(swapFrom === "USDC" ? "eurc" : "usdc")}`}>{swapFrom === "USDC" ? "€" : "$"}</span>{swapFrom === "USDC" ? "EURC" : "USDC"}</div></div>
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
                <aside className="swap-side-note"><div className="swap-side-icon"><ShieldCheck size={20} /></div><h3>Built for stablecoins on Arc</h3><p>Swap supports the two directions: USDC to EURC and EURC to USDC. A live price, slippage estimate, token balances and transaction confirmation will appear once a verified route is integrated.</p><div className="swap-side-pair"><span className="swap-coin usdc">$</span><ArrowRight size={15} /><span className="swap-coin eurc">€</span><strong>USDC ↔ EURC</strong></div></aside>
              </section>
            </>
          )}

          {section === "Strategies" && (
            <>
              <div className="subpage-heading"><div className="eyebrow"><Bot size={14} /> INTELLIGENCE</div><h1>Strategy <span>analyst.</span></h1><p>Compare risk trade-offs with Ultima Intelligence before making a decision.</p></div>
              <div className="strategy-toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search strategies" aria-label="Search strategies" /></div><div className="filter-pill"><SlidersHorizontal size={15} /> {asset} on Arc <ChevronDown size={14} /></div></div>
              <section className="ai-strategy-panel" aria-labelledby="ai-strategy-title">
                <div className="ai-panel-visual"><Bot size={24} /></div>
                <div className="ai-panel-main">
                  <div className="eyebrow">ULTIMA INTELLIGENCE</div>
                  <h2 id="ai-strategy-title">AI strategy analyst</h2>
                  <p>Compare the trade-offs for USDC or EURC strategies on Arc, based on the information currently available. This does not execute transactions.</p>
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
                  <div className="ai-safety-note"><ShieldCheck size={15} /> Candidate integrations only. Live APY, liquidity, audits and contract details are not yet verified.</div>
                  {analysisError && <div className="ai-result ai-result-error" role="alert">{analysisError}</div>}
                  {analysisResult && <div className="ai-result" role="status">{analysisResult}</div>}
                </div>
              </section>
              <div className="strategy-grid full-strategy-grid">
                {filteredVaults.map((vault) => <StrategyCard key={vault.name} vault={vault} onExplore={() => setNotice("Live vault verification and deposit integration are the next build step.")} />)}
              </div>
              {filteredVaults.length === 0 && <div className="empty-state"><div className="empty-icon"><Search size={20} /></div><strong>{asset === "EURC" ? "No EURC strategies listed yet" : "No strategies found"}</strong><p>{asset === "EURC" ? "EURC is supported in Ultima. Strategy options will appear after eligible Arc vaults are verified." : "Try a different name."}</p></div>}
              <div className="data-note"><ShieldCheck size={16} /><span>These are candidate integrations, not live yield offers. Rates, liquidity, vault permissions and contract details must be verified before deposits are enabled.</span></div>
            </>
          )}

          {section === "My positions" && (
            <>
              <div className="subpage-heading"><div className="eyebrow"><Wallet size={14} /> YOUR PORTFOLIO</div><h1>All your positions, <span>in one place.</span></h1><p>Track balances and strategy performance after connecting your wallet.</p></div>
              <div className="empty-state large-empty"><div className="empty-illustration"><Wallet size={26} /><span>+</span></div><h2>No positions yet</h2><p>Connect your wallet and choose a verified strategy to see your stablecoin positions here.</p><button className="connect-button" onClick={connectWallet}><Wallet size={16} /> Connect wallet</button></div>
            </>
          )}

          {section === "Activity" && (
            <>
              <div className="subpage-heading"><div className="eyebrow"><Activity size={14} /> TRANSACTION HISTORY</div><h1>Your activity, <span>clearly tracked.</span></h1><p>Deposits, withdrawals and contract interactions will be listed here.</p></div>
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
              <article><span>04</span><div><strong>Deposit only after verification</strong><p>Ultima&apos;s listed vaults are currently awaiting live onchain verification. Deposits are not enabled here. Do not send funds to an unverified contract.</p></div></article>
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
            <div className="faucet-claim-summary"><span>Amount</span><strong>20 USDC (planned)</strong><span>Availability</span><strong>Circle faucet limits apply</strong><span>Network</span><strong>Arc Testnet</strong></div>
            <div className="faucet-warning"><ShieldCheck size={17} /><span>This is testnet USDC with no real-world value. Ultima’s custom 20 USDC faucet is not live yet because its funded on-chain faucet contract has not been deployed. Use Circle&apos;s official faucet for test funds for now.</span></div>
            <a className="faucet-claim-button" href="https://faucet.circle.com/" target="_blank" rel="noreferrer"><Droplets size={16} /> Get testnet USDC <ExternalLink size={14} /></a>
          </section>
        </div>
      )}

      {notice && <div className="toast" role="status"><CircleCheck size={17} /><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={15} /></button></div>}
    </main>
  );
}

function StrategyCard({ vault, onExplore }: { vault: (typeof vaults)[number]; onExplore: () => void }) {
  return (
    <article className={`strategy-card strategy-card-${vault.tone}`}>
      <div className="strategy-card-top">
        <div className={`protocol-logo ${vault.tone} asset-logo ${vault.tags[0] === "EURC" ? "asset-logo-eurc" : "asset-logo-usdc"}`} aria-label={`${vault.tags[0] === "EURC" ? "EURC euro" : "USDC"} token logo`}>
          <span aria-hidden="true">{vault.tags[0] === "EURC" ? "€" : "$"}</span>
        </div>
        <div className="strategy-title"><h3>{vault.name}</h3><span>{vault.provider}</span></div>
        <button className="card-more" aria-label={`More about ${vault.name}`} onClick={onExplore}><ArrowUpRight size={17} /></button>
      </div>
      <p className="strategy-description">{vault.description}</p>
      <div className="strategy-details">
        <div><span className="detail-label">Live APY</span><strong className="apy-pending">Awaiting verification</strong></div>
        <div><span className="detail-label">Network</span><strong><span className="mini-network-dot" /> Arc</strong></div>
      </div>
      <div className="strategy-card-bottom">
        <div className="tag-row"><span className="tag">{vault.tags[0]}</span><span className="tag">Morpho</span><span className="verify-tag"><ShieldCheck size={13} /> Pending checks</span></div>
        <button className="explore-button" onClick={onExplore}>Explore <ArrowRight size={15} /></button>
      </div>
    </article>
  );
}
