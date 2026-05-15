/* global React */
const { useState } = React;

/* ============== ICONS (inline svg) ============== */
const Icon = ({ d, size = 20, stroke = 2, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);
const I = {
  home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  bookings: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  chat: <path d="M21 12a8 8 0 0 1-12.5 6.7L3 20l1.3-5.5A8 8 0 1 1 21 12z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a7 7 0 0 1 14 0v1" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
  flag: <><path d="M4 4v17" /><path d="M4 4h13l-2 4 2 4H4" /></>,
  arrowRight: <path d="M5 12h14M12 5l7 7-7 7" />,
  arrowLeft: <path d="M19 12H5M12 5l-7 7 7 7" />,
  bell: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></>,
  cal: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  wallet: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M16 13h3" /></>,
  star: <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9L2 9.3l6.9-1L12 2z" />,
  verified: <><path d="m9 12 2 2 4-4" /><circle cx="12" cy="12" r="10" /></>,
  star_fill: { d: "m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9L2 9.3l6.9-1L12 2z", fill: "currentColor", stroke: "currentColor" },
  apple: <path d="M16.4 1.4a4 4 0 0 1-1 3 3.4 3.4 0 0 1-2.7 1.3 4 4 0 0 1 1-2.9A4.3 4.3 0 0 1 16.4 1.4ZM20 17.3a9.8 9.8 0 0 1-1 1.8c-.6 1-1.4 2.1-2.4 2.1s-1.3-.6-2.6-.6-1.7.6-2.6.6-1.8-1.1-2.4-2.1c-1.7-2.5-3-7-1.3-10A4.7 4.7 0 0 1 11.6 7c1 0 1.9.7 2.6.7s1.9-.8 3.2-.7a4.5 4.5 0 0 1 3.6 1.9 4.4 4.4 0 0 0-2.1 3.7 4.3 4.3 0 0 0 2.6 4 9 9 0 0 1-.5 1.1Z" />,
  google: (
    <>
      <path d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.7h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" fill="#4285F4" stroke="none" />
      <path d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5a6 6 0 0 1-8.9-3.1H3.2v2.6A10 10 0 0 0 12 22z" fill="#34A853" stroke="none" />
      <path d="M6.5 13.9a6 6 0 0 1 0-3.8V7.5H3.2a10 10 0 0 0 0 9l3.3-2.6z" fill="#FBBC05" stroke="none" />
      <path d="M12 6.4a5.4 5.4 0 0 1 3.8 1.5l2.9-2.9A10 10 0 0 0 3.2 7.5l3.3 2.6A6 6 0 0 1 12 6.4z" fill="#EA4335" stroke="none" />
    </>
  ),
  shield: <path d="M12 2 4 5v7c0 5 3.5 9 8 10 4.5-1 8-5 8-10V5l-8-3z" />,
  scale: <><path d="M12 3v18" /><path d="M7 7h10l-2 6h-6L7 7z" /><circle cx="6" cy="20" r="2" /><circle cx="18" cy="20" r="2" /></>,
  users: <><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0M17 11a4 4 0 1 0 0-8M22 21a7 7 0 0 0-5-6.7" /></>,
  trending: <><path d="m3 17 6-6 4 4 8-8" /><path d="M14 7h7v7" /></>,
  bot: <><rect x="4" y="8" width="16" height="12" rx="2" /><path d="M12 8V4M9 12h.01M15 12h.01M9 16h6" /></>,
  cog: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.4 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.4l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.6 7l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  pin: <><path d="M12 22s8-7.5 8-13a8 8 0 1 0-16 0c0 5.5 8 13 8 13z" /><circle cx="12" cy="9" r="3" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  alert: <><path d="m21.7 18-9-15.6a2 2 0 0 0-3.4 0L.3 18a2 2 0 0 0 1.7 3h18a2 2 0 0 0 1.7-3z" /><path d="M12 9v4M12 17h.01" /></>,
  send: <><path d="m22 2-7 20-4-9-9-4 20-7z" /><path d="M22 2 11 13" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  filter: <><path d="M3 6h18M7 12h10M11 18h2" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5M12 15V3" /></>,
  external: <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6M10 14 21 3" /></>,
  more: <><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></>,
  refresh: <><path d="M21 3v6h-6M3 21v-6h6" /><path d="M3.5 9a9 9 0 0 1 14.8-3.4L21 9M20.5 15a9 9 0 0 1-14.8 3.4L3 15" /></>,
  x: <><path d="M18 6 6 18M6 6l18 12" /></>,
  menu: <><path d="M3 6h18M3 12h18M3 18h18" /></>,
  power: <><path d="M18.4 6.6a9 9 0 1 1-12.7 0" /><path d="M12 2v10" /></>,
};

/* ============== STATUS BAR (mobile) ============== */
const StatusBar = ({ time = "9:41" }) => (
  <div className="statusbar">
    <span>{time}</span>
    <span className="icons">
      <svg width="18" height="11" viewBox="0 0 18 11" fill="currentColor"><rect x="0" y="6" width="3" height="5" rx="0.5" /><rect x="5" y="4" width="3" height="7" rx="0.5" /><rect x="10" y="2" width="3" height="9" rx="0.5" /><rect x="15" y="0" width="3" height="11" rx="0.5" /></svg>
      <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M1 4.5 A 10 10 0 0 1 15 4.5" /><path d="M3.5 6.5 A 6 6 0 0 1 12.5 6.5" /><path d="M6 8.5 A 2.5 2.5 0 0 1 10 8.5" /><circle cx="8" cy="9.5" r="0.8" fill="currentColor" /></svg>
      <svg width="24" height="11" viewBox="0 0 24 11" fill="none" stroke="currentColor" strokeWidth="1"><rect x="0.5" y="0.5" width="20" height="10" rx="2.5" /><rect x="2" y="2" width="17" height="7" rx="1.2" fill="currentColor" /><rect x="21" y="3.5" width="1.5" height="4" rx="0.5" fill="currentColor" /></svg>
    </span>
  </div>
);

/* ============== APP HEADER ============== */
const AppHeader = ({ desktop = false, withBack = false, title = null, signedIn = true, initial = "M", initialColor = "var(--brand)" }) => (
  <div className={"appheader" + (desktop ? " appheader--desktop" : "")}>
    <div className="flex center gap-3">
      {withBack && (
        <button className="icon-btn" aria-label="back">
          <Icon d={I.arrowLeft} />
        </button>
      )}
      <span className={"brand-wordmark" + (desktop ? " brand-wordmark--lg" : "")}>
        <span className="brand-dot">S</span>
        SilverConnect
      </span>
      {desktop && (
        <nav className="flex gap-2" style={{ marginLeft: 24 }}>
          {["首页", "找服务", "我的预约", "消息"].map((s, i) => (
            <a key={s} className="sidenav-item" style={{ padding: "8px 14px", color: i === 0 ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: i === 0 ? 700 : 500 }}>{s}</a>
          ))}
        </nav>
      )}
    </div>
    <div className="header-right">
      <button className="donate-pill"><Icon d={I.heart} size={16} fill="currentColor" stroke={0} />{desktop && "捐款"}</button>
      <button className="icon-btn" aria-label="theme"><Icon d={I.sun} size={18} /></button>
      {desktop && <button className="icon-btn" aria-label="country" style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>AU</button>}
      {desktop && <button className="icon-btn" aria-label="lang" style={{ fontSize: 11, fontWeight: 800 }}>中</button>}
      {signedIn ? (
        <span className="avatar-circle" style={{ background: initialColor }}>{initial}</span>
      ) : (
        <button className="btn btn--primary btn--sm">登录</button>
      )}
    </div>
  </div>
);

/* ============== BOTTOM TAB BAR (customer) ============== */
const BottomTabBar = ({ active = "home" }) => {
  const tabs = [
    { k: "home", label: "首页", icon: I.home },
    { k: "services", label: "服务", icon: I.grid },
    { k: "bookings", label: "预约", icon: I.bookings },
    { k: "chat", label: "消息", icon: I.chat },
    { k: "profile", label: "我的", icon: I.user },
  ];
  return (
    <div className="tabbar">
      {tabs.map((t) => (
        <button key={t.k} className={"tabbar-item" + (active === t.k ? " active" : "")}>
          <span className="tab-pill"><Icon d={t.icon} size={20} stroke={active === t.k ? 2.4 : 1.8} /></span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
};

/* ============== PROVIDER TAB BAR ============== */
const ProviderTabBar = ({ active = "workbench" }) => {
  const tabs = [
    { k: "workbench", label: "工作台", icon: I.home },
    { k: "jobs", label: "派单", icon: I.briefcase },
    { k: "calendar", label: "日历", icon: I.cal },
    { k: "earnings", label: "收益", icon: I.wallet },
    { k: "profile", label: "我的", icon: I.user },
  ];
  return (
    <div className="tabbar">
      {tabs.map((t) => (
        <button key={t.k} className={"tabbar-item" + (active === t.k ? " active" : "")}>
          <span className="tab-pill"><Icon d={t.icon} size={20} /></span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
};

/* ============== ADMIN SHELL CHROME ============== */
const AdminTopBar = () => (
  <div className="adminbar">
    <span className="brand-wordmark brand-wordmark--lg">
      <span className="brand-dot">S</span>
      SilverConnect <span style={{ color: "var(--text-tertiary)", fontWeight: 600, marginLeft: 4 }}>Admin</span>
    </span>
    <div style={{ flex: 1 }} />
    <span className="t-ter fs-13">admin@silverconnect.com</span>
    <button className="icon-btn"><Icon d={I.sun} size={18} /></button>
    <button className="icon-btn" aria-label="logout"><Icon d={I.power} size={18} /></button>
  </div>
);

const AdminSidebar = ({ active = "disputes" }) => {
  const main = [
    { k: "overview", label: "概览", icon: I.grid },
    { k: "disputes", label: "纠纷", icon: I.scale, badge: 7 },
    { k: "safety", label: "安全", icon: I.shield, badge: 2 },
    { k: "providers", label: "服务者", icon: I.users },
    { k: "refunds", label: "退款", icon: I.wallet },
    { k: "analytics", label: "数据分析", icon: I.trending },
  ];
  const sec = [
    { k: "reports", label: "评价审核", icon: I.flag },
    { k: "customers", label: "顾客", icon: I.user },
    { k: "bookings", label: "预订", icon: I.bookings },
    { k: "payments", label: "财务", icon: I.wallet },
    { k: "ai", label: "AI 对话", icon: I.bot },
    { k: "settings", label: "设置", icon: I.cog },
  ];
  return (
    <aside className="sidebar">
      <div className="sidenav-section">主操作</div>
      {main.map((it) => (
        <div key={it.k} className={"sidenav-item" + (active === it.k ? " active" : "")}>
          <Icon d={it.icon} size={18} />
          <span style={{ flex: 1 }}>{it.label}</span>
          {it.badge && <span className="chip chip--warn" style={{ padding: "2px 7px", fontSize: 11 }}>{it.badge}</span>}
        </div>
      ))}
      <div className="sidenav-section" style={{ marginTop: 16 }}>次操作</div>
      {sec.map((it) => (
        <div key={it.k} className={"sidenav-item" + (active === it.k ? " active" : "")}>
          <Icon d={it.icon} size={18} />
          <span>{it.label}</span>
        </div>
      ))}
    </aside>
  );
};

Object.assign(window, { Icon, I, StatusBar, AppHeader, BottomTabBar, ProviderTabBar, AdminTopBar, AdminSidebar });
