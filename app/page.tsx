"use client";

import { useState } from "react";
import {
  Activity, ArrowDownLeft, ArrowDownRight, ArrowRight, ArrowUpRight, Bell,
  ChevronDown, CircleHelp, Command, Compass, ExternalLink, Eye, EyeOff,
  LayoutDashboard, Menu, Plus, Search, ShieldCheck, Sparkles, Wallet, X,
  Zap, Landmark, Clock3, CircleCheck, SlidersHorizontal
} from "lucide-react";

type Section = "Overview" | "Strategies" | "My positions" | "Activity";

const navItems: { label: Section; icon: typeof LayoutDashboard }[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Strategies", icon: Compass },
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

export default function Home() {
  const [section, setSection] = useState<Section>("Overview");
  const [asset, setAsset] = useState<"USDC" | "EURC">("USDC");
  const [connected, setConnected] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const connectWallet = () => {
    setNotice("Wallet connection is the next integration step. No wallet has been connected.");
    window.setTimeout(() => setNotice(""), 4200);
  };

  const navigate = (next: Section) => {
    setSection(next);
    setMobileOpen(false);
  };

  const filteredVaults = vaults.filter((vault) =>
    (vault.name + " " + vault.provider).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="app-shell">
      {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><span>u</span><i /></div>
          <span className="brand-name">ultima</span>
          <button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>

        <div className="network-pill"><span className="network-dot" /> Arc Mainnet <ChevronDown size={14} /></div>

        <div className="nav-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${section === label ? "active" : ""}`} onClick={() => navigate(label)}>
              <Icon size={18} strokeWidth={1.9} /><span>{label}</span>
              {label === "Strategies" && <span className="nav-count">2</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><CircleHelp size={17} /></div>
            <div><strong>New to yield?</strong><p>Learn how strategies work before you deposit.</p></div>
            <ArrowUpRight size={15} className="help-arrow" />
          </div>
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
            <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
            <div className="breadcrumb">Workspace <span>/</span> <strong>{section}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className="network-chip"><span className="network-dot" /> Arc Mainnet</div>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice("You’re all caught up. Alerts will appear here once enabled.")}><Bell size={18} /><i /></button>
            <button className="connect-button" onClick={connectWallet}><Wallet size={16} /> {connected ? "Wallet connected" : "Connect wallet"}</button>
          </div>
        </header>

        <div className="page-content">
          {section === "Overview" && (
            <>
              <div className="welcome-row">
                <div>
                  <div className="eyebrow"><Sparkles size={14} /> YOUR STABLECOIN WORKSPACE</div>
                  <h1>Make your money<br className="mobile-break" /> <span>work smarter.</span></h1>
                  <p className="welcome-subtitle">A clearer way to explore stablecoin yield on Arc.</p>
                </div>
                <div className="welcome-art" aria-hidden="true">
                  <div className="orbit orbit-one" /><div className="orbit orbit-two" />
                  <div className="art-coin coin-back">€</div><div className="art-coin coin-front">$</div>
                  <div className="art-spark spark-one">✦</div><div className="art-spark spark-two">✳</div>
                </div>
              </div>

              <div className="metrics-grid">
                <div className="metric-card balance-card">
                  <div className="metric-top"><span>Total balance</span><button className="plain-icon" onClick={() => setShowBalance(!showBalance)} aria-label={showBalance ? "Hide balance" : "Show balance"}>{showBalance ? <Eye size={16} /> : <EyeOff size={16} />}</button></div>
                  <div className="metric-value">{showBalance ? "$0.00" : "••••••"}</div>
                  <div className="metric-foot"><span className="metric-dot lavender" /> Connect wallet to view your assets</div>
                  <div className="balance-decoration"><div /><div /><div /></div>
                </div>
                <div className="metric-card">
                  <div className="metric-top"><span>Yield earned</span><span className="metric-icon mint"><Activity size={16} /></span></div>
                  <div className="metric-value">$<span className="zero">0.00</span></div>
                  <div className="metric-foot"><span className="subtle-pill">Ready when you are</span></div>
                </div>
                <div className="metric-card">
                  <div className="metric-top"><span>Active positions</span><span className="metric-icon peach"><Landmark size={16} /></span></div>
                  <div className="metric-value">0</div>
                  <div className="metric-foot">Your positions, all in one place</div>
                </div>
              </div>

              <section className="section-block">
                <div className="section-heading">
                  <div><h2>Explore strategies</h2><p>Start with USDC. More assets are on the way.</p></div>
                  <button className="text-link" onClick={() => navigate("Strategies")}>View all strategies <ArrowRight size={16} /></button>
                </div>
                <div className="asset-switch" role="group" aria-label="Choose asset">
                  <button className={asset === "USDC" ? "asset-tab selected" : "asset-tab"} onClick={() => setAsset("USDC")}><span className="token token-usdc">$</span> USDC <span className="asset-live">START HERE</span></button>
                  <button className="asset-tab disabled" onClick={() => { setAsset("EURC"); setNotice("EURC support is planned after the USDC flow is verified."); window.setTimeout(() => setNotice(""), 3500); }}><span className="token token-eurc">€</span> EURC <span className="soon-pill">Soon</span></button>
                </div>
                <div className="strategy-grid">
                  {vaults.slice(0, 2).map((vault) => (
                    <StrategyCard key={vault.name} vault={vault} onExplore={() => navigate("Strategies")} />
                  ))}
                </div>
                <div className="data-note"><ShieldCheck size={16} /><span>Rates and vault safety checks will be shown only after live onchain verification. No estimated APY is presented as current.</span></div>
              </section>

              <section className="bottom-grid">
                <div className="panel activity-panel">
                  <div className="panel-heading"><div><h2>Recent activity</h2><p>Your onchain activity at a glance</p></div><button className="small-text-link" onClick={() => navigate("Activity")}>See all <ArrowRight size={14} /></button></div>
                  <div className="empty-state compact-empty"><div className="empty-icon"><Clock3 size={20} /></div><div><strong>Nothing here yet</strong><p>Your deposits and withdrawals will show up here.</p></div></div>
                </div>
                <div className="panel network-panel">
                  <div className="panel-heading"><div><h2>Built for Arc</h2><p>Fast, stablecoin-native infrastructure</p></div><div className="arc-symbol">a</div></div>
                  <div className="network-stat"><div className="network-stat-icon"><Zap size={17} /></div><div><strong>Arc Mainnet</strong><span>Chain ID 5042</span></div><span className="status-live"><i /> Network selected</span></div>
                  <div className="network-footer"><span>Designed for USDC-first strategies</span><ArrowUpRight size={15} /></div>
                </div>
              </section>
            </>
          )}

          {section === "Strategies" && (
            <>
              <div className="subpage-heading"><div className="eyebrow"><Compass size={14} /> DISCOVER</div><h1>Find your <span>next strategy.</span></h1><p>Compare verified opportunities before you put funds to work.</p></div>
              <div className="strategy-toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search strategies" aria-label="Search strategies" /></div><div className="filter-pill"><SlidersHorizontal size={15} /> USDC on Arc <ChevronDown size={14} /></div></div>
              <div className="strategy-grid full-strategy-grid">
                {filteredVaults.map((vault) => <StrategyCard key={vault.name} vault={vault} onExplore={() => setNotice("Live vault verification and deposit integration are the next build step.")} />)}
              </div>
              {filteredVaults.length === 0 && <div className="empty-state"><div className="empty-icon"><Search size={20} /></div><strong>No strategies found</strong><p>Try a different name.</p></div>}
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
                <div className="empty-state"><div className="empty-icon"><Clock3 size={20} /></div><strong>No transactions yet</strong><p>Your Arc transactions will appear here after you interact with a strategy.</p></div>
              </div>
            </>
          )}

          <footer className="page-footer"><span>© 2026 Ultima</span><span><span className="footer-dot" /> Arc Mainnet · Chain ID 5042</span><span>Built for clarity, not guesswork.</span></footer>
        </div>
      </section>

      {notice && <div className="toast" role="status"><CircleCheck size={17} /><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={15} /></button></div>}
    </main>
  );
}

function StrategyCard({ vault, onExplore }: { vault: (typeof vaults)[number]; onExplore: () => void }) {
  return (
    <article className="strategy-card">
      <div className="strategy-card-top">
        <div className={`protocol-logo ${vault.tone}`}>{vault.initials}<span className="protocol-spark">✦</span></div>
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
