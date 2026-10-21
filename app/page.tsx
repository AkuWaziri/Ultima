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
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [notificationTelegram, setNotificationTelegram] = useState("");
  const [notificationPrefs, setNotificationPrefs] = useState({
    positionUpdates: true,
    transactionUpdates: true,
    riskAlerts: true,
    productUpdates: false,
  });
  const [notificationSaved, setNotificationSaved] = useState(false);

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
          <div className="brand-mark" aria-label="Ultima logo"><svg viewBox="0 0 32 32" role="img" aria-hidden="true"><path className="paper-u" d="M6.5 5.5h5.2v13.1c0 3.5 1.5 5.5 4.3 5.5s4.3-2 4.3-5.5V5.5h5.2v13.7c0 6.3-3.6 9.8-9.5 9.8s-9.5-3.5-9.5-9.8V5.5Z"/><circle className="u-red-dot" cx="25.5" cy="6.3" r="3.1"/></svg></div>
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
            
            <div className="mobile-brand" aria-label="Ultima"><div className="brand-mark"><svg viewBox="0 0 32 32" role="img" aria-hidden="true"><path className="paper-u" d="M6.5 5.5h5.2v13.1c0 3.5 1.5 5.5 4.3 5.5s4.3-2 4.3-5.5V5.5h5.2v13.7c0 6.3-3.6 9.8-9.5 9.8s-9.5-3.5-9.5-9.8V5.5Z"/><circle className="u-red-dot" cx="25.5" cy="6.3" r="3.1"/></svg></div><span className="brand-name">ultima</span></div>
            <div className="breadcrumb">Workspace <span>/</span> <strong>{section}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className="network-chip"><span className="network-dot" /> Arc Mainnet</div>
            <button className="icon-button notification-button" aria-label="Notification settings" title="Notification settings" onClick={openNotificationSettings}><Bell size={18} /><i /></button>
            <button className="connect-button" onClick={connectWallet}><Wallet size={16} /> {connected ? "Wallet connected" : "Connect wallet"}</button>
            <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
          </div>
        </header>

        <div className="page-content">
          {section === "Overview" && (
            <>
              <div className="welcome-row">
                <div>
                  
                  <h1>Make your money<br className="mobile-break" /> <span>work smarter.</span></h1>
                  
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
