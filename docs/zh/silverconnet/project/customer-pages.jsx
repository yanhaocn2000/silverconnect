/* global React, StatusBar, AppHeader, BottomTabBar, Icon, I */
const { useState: useS3 } = React;

/* shared helpers */
const Av = ({ name, size = 44 }) => {
  const colors = ["#5B8DEF", "#3D9970", "#A36BD8", "#D2A036", "#C25A78"];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return <span className="avatar-circle" style={{ width: size, height: size, fontSize: size * 0.4, background: bg, flexShrink: 0 }}>{name.charAt(0).toUpperCase()}</span>;
};
const Stars = ({ n = 5, filled = 5, size = 16 }) => (
  <span style={{ display: "inline-flex", gap: 1 }}>
    {Array.from({ length: n }).map((_, i) => (
      <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < filled ? "#E0A800" : "transparent"} stroke={i < filled ? "#E0A800" : "var(--text-tertiary)"} strokeWidth="1.5"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9L2 9.3l6.9-1L12 2z" /></svg>
    ))}
  </span>
);
const SubHeader = ({ title, back = true }) => (
  <div className="appheader">
    <div className="flex center gap-3">
      {back && <button className="icon-btn"><Icon d={I.arrowLeft} /></button>}
      <span className="bold fs-18">{title}</span>
    </div>
    <div className="header-right">
      <button className="icon-btn"><Icon d={I.sun} size={18} /></button>
      <span className="avatar-circle" style={{ width: 36, height: 36, fontSize: 14, background: "var(--brand)" }}>M</span>
    </div>
  </div>
);

/* tiny "stuck-bottom" CTA bar */
const StickyCTA = ({ children, primary, secondary }) => (
  <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg-surface)", padding: "14px 20px", display: "flex", gap: 10 }}>
    {secondary}
    {primary || children}
  </div>
);

/* ============================================================
   1) SEARCH
   ============================================================ */
const SearchPage = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="搜索" />
    <div className="page-main">
      <div className="search" style={{ marginBottom: 20 }}>
        <Icon d={I.search} size={20} />
        <input defaultValue="保洁" />
        <button className="icon-btn" style={{ width: 28, height: 28, border: "none" }}><Icon d={I.x} size={14} /></button>
      </div>
      <div className="t-sec fs-14 semibold" style={{ marginBottom: 12 }}>"保洁" 的结果 · 12 项</div>

      <div className="t-ter fs-12 semibold" style={{ textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>服务者</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {[["梅 · 张", "家居保洁", "4.9", 47], ["丽 · 王", "家居保洁", "4.8", 29]].map(([n, c, r, rv]) => (
          <div key={n} className="card" style={{ padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
            <Av name={n} size={40} />
            <div style={{ flex: 1 }}>
              <div className="bold fs-15">{n}</div>
              <div className="t-sec fs-13">{c} · ★ {r} ({rv})</div>
            </div>
            <Icon d={I.arrowRight} size={16} />
          </div>
        ))}
      </div>

      <div className="t-ter fs-12 semibold" style={{ textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>服务类别</div>
      <div className="flex gap-2" style={{ flexWrap: "wrap", marginBottom: 20 }}>
        {["家居保洁", "深度保洁", "搬家后清洁"].map(s => <span key={s} className="chip chip--brand">{s}</span>)}
      </div>

      <div className="t-ter fs-12 semibold" style={{ textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>帮助文章</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {["如何取消已确认的预订", "保洁服务的安全须知"].map(t => (
          <div key={t} className="card" style={{ padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="fs-15 semibold">{t}</span>
            <Icon d={I.arrowRight} size={16} />
          </div>
        ))}
      </div>
    </div>
    <BottomTabBar active="services" />
  </div>
);

/* ============================================================
   2) SERVICES LIST
   ============================================================ */
const CATS_L = [
  { k: "cleaning", emoji: "🧹", name: "家居保洁", lo: 35, hi: 65, n: 124, bg: "#FCEBE3", desc: "日常打扫 · 深度清洁 · 厨卫消毒" },
  { k: "cooking", emoji: "🍳", name: "上门做饭", lo: 42, hi: 70, n: 87, bg: "#FBEFD4", desc: "家常菜 · 节庆宴客 · 备餐" },
  { k: "garden", emoji: "🌿", name: "花园打理", lo: 38, hi: 60, n: 56, bg: "#E5F3EA", desc: "修剪 · 浇水 · 除草" },
  { k: "care", emoji: "🤝", name: "个人护理", lo: 55, hi: 90, n: 68, bg: "#F0E6F8", desc: "起居协助 · 陪伴 · 持照护理" },
  { k: "repair", emoji: "🔧", name: "家居维修", lo: 48, hi: 85, n: 92, bg: "#E3ECFA", desc: "水电 · 家具组装 · 小修小补" },
];
const ServicesList = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="服务" back={false} />
    <div className="page-main">
      <div className="banner banner--info" style={{ marginBottom: 16 }}>
        <Icon d={I.verified} size={16} />
        <span>所有价格已含 GST · 仅显示已认证服务者</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {CATS_L.map(c => (
          <div key={c.k} className="card" style={{ padding: 16, display: "flex", gap: 14, alignItems: "center", cursor: "pointer" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0 }}>{c.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="bold fs-18">{c.name}</div>
              <div className="t-sec fs-13" style={{ marginBottom: 6 }}>{c.desc}</div>
              <div className="fs-13 t-ter tabular"><span className="t-sec semibold">${c.lo}–${c.hi}/h</span> · {c.n} 位服务者</div>
            </div>
            <Icon d={I.arrowRight} size={18} />
          </div>
        ))}
      </div>
    </div>
    <BottomTabBar active="services" />
  </div>
);

/* ============================================================
   3) CATEGORY DETAIL
   ============================================================ */
const CategoryPage = () => {
  const list = [
    { name: "梅 · 张", rating: "4.9", reviews: 47, dist: "2.3", price: 45, badges: ["已认证", "急救证"] },
    { name: "丽 · 王", rating: "4.8", reviews: 29, dist: "3.7", price: 42, badges: ["已认证"] },
    { name: "Sarah · Chen", rating: "4.7", reviews: 81, dist: "5.1", price: 48, badges: ["已认证", "周末"] },
    { name: "汤姆 · 林", rating: "4.9", reviews: 32, dist: "4.0", price: 50, badges: ["已认证", "急救证"] },
  ];
  return (
    <div className="frame">
      <StatusBar />
      <SubHeader title="家居保洁" />
      <div className="page-main">
        <div className="t-sec fs-14 tabular" style={{ marginBottom: 14 }}>AU · $35–$65/小时 · 含 GST</div>
        <div className="flex gap-2" style={{ flexWrap: "nowrap", overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
          {[["评分", "5.0★"], ["距离", "5km"], ["语言", "中文"], ["周末可约"], ["女性服务者"], ["急救证"]].map((p, i) => (
            <button key={i} className="chip" style={{ background: i === 0 ? "var(--brand-soft)" : "var(--chip-bg)", color: i === 0 ? "var(--brand-ink)" : "var(--chip-fg)", flexShrink: 0, padding: "8px 14px", border: "none" }}>{p.join(" · ")}</button>
          ))}
        </div>
        <div className="flex between center" style={{ marginBottom: 12 }}>
          <span className="t-sec fs-13 semibold">{list.length} 位可约</span>
          <button className="chip" style={{ background: "transparent" }}>排序 · 推荐 ▾</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map(p => (
            <div key={p.name} className="pcard">
              <Av name={p.name} size={52} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex between">
                  <span className="bold fs-17">{p.name}</span>
                  <span className="bold tabular">${p.price}<span className="t-ter fs-13" style={{ fontWeight: 600 }}>/h</span></span>
                </div>
                <div className="fs-13 t-sec tabular" style={{ marginTop: 4 }}>★ {p.rating} ({p.reviews}) · {p.dist} km</div>
                <div className="flex gap-2" style={{ marginTop: 6, flexWrap: "wrap" }}>
                  {p.badges.map(b => <span key={b} className="chip chip--success" style={{ fontSize: 11, padding: "1px 8px" }}>{b}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomTabBar active="services" />
    </div>
  );
};

/* ============================================================
   4) PROVIDER DETAIL
   ============================================================ */
const ProviderDetail = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="" />
    <div className="page-main">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Av name="梅 · 张" size={96} />
        <div className="h1" style={{ fontSize: 24 }}>梅 · 张</div>
        <div className="fs-14 t-sec tabular">★ 4.9 (47 条评价)</div>
        <div className="flex gap-2" style={{ flexWrap: "wrap", justifyContent: "center" }}>
          <span className="chip chip--success"><Icon d={I.verified} size={12} />已认证</span>
          <span className="chip chip--success">急救证</span>
          <span className="chip chip--brand">家居保洁</span>
          <span className="chip">中文 · English</span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="bold fs-15" style={{ marginBottom: 8 }}>关于我</div>
        <div className="t-sec fs-15" style={{ lineHeight: 1.55 }}>从事家居保洁 6 年，特别熟悉照顾长者的家庭。会做深度清洁、厨卫消毒。说中文，性格细致耐心。</div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 0 }}>
        <div className="bold fs-15" style={{ padding: "16px 20px 8px" }}>提供的服务</div>
        {[["家居保洁 · 2 小时", "CLEAN-2H", 90], ["深度清洁 · 4 小时", "DEEP-4H", 180]].map(([t, c, p]) => (
          <div key={c} className="flex between center" style={{ padding: "12px 20px", borderTop: "1px solid var(--border)" }}>
            <div>
              <div className="semibold fs-15">{t}</div>
              <div className="t-ter fs-12 tabular">{c}</div>
            </div>
            <span className="bold tabular fs-16">${p}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="flex between center" style={{ marginBottom: 12 }}>
          <span className="bold fs-15">评价</span>
          <span className="t-sec fs-13 tabular">★ 4.9 · 47 条</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
          <div className="h1 tabular" style={{ fontSize: 40, lineHeight: 1 }}>4.9</div>
          <div style={{ flex: 1 }}>
            {[5, 4, 3, 2, 1].map(s => (
              <div key={s} className="flex center gap-2" style={{ marginBottom: 3 }}>
                <span className="t-sec fs-12 tabular" style={{ width: 14 }}>{s}</span>
                <div style={{ flex: 1, height: 6, background: "var(--bg-surface-2)", borderRadius: 999 }}>
                  <div style={{ height: 6, background: "#E0A800", borderRadius: 999, width: [88, 9, 2, 1, 0][5 - s] + "%" }} />
                </div>
                <span className="t-ter fs-11 tabular" style={{ width: 24, textAlign: "right" }}>{[41, 4, 1, 1, 0][5 - s]}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <div className="flex center gap-2" style={{ marginBottom: 6 }}><Stars filled={5} size={14} /><span className="t-ter fs-12">10月 5日</span></div>
          <div className="fs-14" style={{ lineHeight: 1.55 }}>梅非常细心，会主动帮老人擦窗户和阳台。已经预约了下个月。</div>
          <div className="t-ter fs-12" style={{ marginTop: 4 }}>— 玛格丽特</div>
        </div>
      </div>
    </div>
    <StickyCTA
      secondary={<button className="icon-btn" style={{ width: 52, height: 52 }}><Icon d={I.chat} size={20} /></button>}
      primary={<button className="btn btn--primary" style={{ flex: 1 }}>继续 · 起价 $45 含 GST</button>}
    />
  </div>
);

/* ============================================================
   5-8) BOOKING WIZARD (4 STEPS)
   ============================================================ */
const WizProgress = ({ step }) => (
  <div className="flex gap-2" style={{ padding: "16px 20px", background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}>
    {[1, 2, 3, 4].map(n => (
      <div key={n} style={{ flex: 1, height: 6, borderRadius: 999, background: n <= step ? "var(--brand)" : "var(--bg-surface-2)" }} />
    ))}
  </div>
);
const wizShell = (step, title, body, ctaLabel = "下一步") => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="预约服务" />
    <WizProgress step={step} />
    <div className="page-main">
      <div className="t-ter fs-12 semibold" style={{ textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>第 {step} 步 / 4</div>
      <h2 className="h1" style={{ fontSize: 24, margin: "0 0 16px" }}>{title}</h2>
      {body}
    </div>
    <StickyCTA primary={<button className="btn btn--primary btn--block">{ctaLabel}</button>} />
  </div>
);
const BookStep1 = () => wizShell(1, "选择服务", (
  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    {[
      ["家居保洁", "CLEAN-2H · 2 小时", 90, true],
      ["深度清洁", "DEEP-4H · 4 小时", 180, false],
      ["搬家后清洁", "MOVEOUT-3H · 3 小时", 150, false],
    ].map(([n, c, p, sel]) => (
      <label key={c} className="card" style={{
        padding: 16, cursor: "pointer", display: "flex", gap: 12, alignItems: "center",
        borderColor: sel ? "var(--brand)" : "var(--border)",
        background: sel ? "var(--brand-soft)" : "var(--bg-surface)",
        borderWidth: 1.5,
      }}>
        <input type="radio" name="srv" defaultChecked={sel} style={{ accentColor: "var(--brand)", width: 20, height: 20 }} />
        <div style={{ flex: 1 }}>
          <div className="bold fs-16">{n}</div>
          <div className="t-sec fs-13">{c}</div>
        </div>
        <span className="bold tabular fs-16">${p}</span>
      </label>
    ))}
  </div>
));
const BookStep2 = () => wizShell(2, "选择服务者与时间", (
  <div>
    <div className="label">服务者</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
      {[["梅 · 张", "服务半径 5 km", true], ["丽 · 王", "服务半径 8 km", false]].map(([n, d, sel]) => (
        <label key={n} className="card" style={{ padding: 14, display: "flex", gap: 12, alignItems: "center", borderColor: sel ? "var(--brand)" : "var(--border)", background: sel ? "var(--brand-soft)" : "var(--bg-surface)", borderWidth: 1.5, cursor: "pointer" }}>
          <input type="radio" name="p" defaultChecked={sel} style={{ accentColor: "var(--brand)", width: 20, height: 20 }} />
          <Av name={n} size={40} />
          <div>
            <div className="bold fs-15">{n}</div>
            <div className="t-sec fs-12">{d}</div>
          </div>
        </label>
      ))}
    </div>
    <div className="label">服务时间</div>
    <input className="input" type="datetime-local" defaultValue="2026-05-15T10:00" />
    <div className="t-ter fs-12" style={{ marginTop: 6 }}>需提前 1 小时预约</div>
  </div>
));
const BookStep3 = () => wizShell(3, "选择地址", (
  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    {[
      ["Home", "123 Bondi Rd, Bondi NSW 2026", true, true],
      ["儿子家", "45 Park St, Sydney NSW 2000", false, false],
    ].map(([lbl, addr, def, sel]) => (
      <label key={lbl} className="card" style={{ padding: 16, display: "flex", gap: 12, alignItems: "flex-start", borderColor: sel ? "var(--brand)" : "var(--border)", background: sel ? "var(--brand-soft)" : "var(--bg-surface)", borderWidth: 1.5, cursor: "pointer" }}>
        <input type="radio" name="a" defaultChecked={sel} style={{ accentColor: "var(--brand)", width: 20, height: 20, marginTop: 2 }} />
        <Icon d={I.pin} size={20} style={{ color: "var(--brand)", marginTop: 1 }} />
        <div style={{ flex: 1 }}>
          <div className="flex center gap-2"><span className="bold fs-15">{lbl}</span>{def && <span className="chip chip--brand" style={{ fontSize: 11, padding: "0 6px" }}>默认</span>}</div>
          <div className="t-sec fs-13">{addr}</div>
        </div>
      </label>
    ))}
    <button className="dotted-cta"><Icon d={I.plus} size={16} />添加新地址</button>
  </div>
));
const BookStep4 = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="预约服务" />
    <WizProgress step={4} />
    <div className="page-main">
      <div className="t-ter fs-12 semibold" style={{ textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>第 4 步 / 4</div>
      <h2 className="h1" style={{ fontSize: 24, margin: "0 0 16px" }}>确认并完成</h2>
      <div className="card" style={{ marginBottom: 14 }}>
        {[
          ["服务", "家居保洁 · 2 小时"],
          ["服务者", "梅 · 张"],
          ["时间", "5月 15日 周五 10:00"],
          ["地址", "123 Bondi Rd"],
        ].map(([k, v]) => (
          <div key={k} className="flex between" style={{ padding: "10px 0", borderBottom: k === "地址" ? "none" : "1px solid var(--border)" }}>
            <span className="t-sec fs-14">{k}</span>
            <span className="semibold fs-14">{v}</span>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="flex between fs-14" style={{ marginBottom: 6 }}><span className="t-sec">服务费</span><span className="tabular">$81.82</span></div>
        <div className="flex between fs-14" style={{ marginBottom: 6 }}><span className="t-sec">GST 10%</span><span className="tabular">$8.18</span></div>
        <div className="flex between" style={{ paddingTop: 8, borderTop: "1px solid var(--border)" }}><span className="bold">合计（含税）</span><span className="bold tabular fs-18">$90.00</span></div>
      </div>
      <div className="banner banner--info" style={{ marginBottom: 14 }}>
        <Icon d={I.clock} size={16} />距开始前 24 小时可免费取消
      </div>
      <label className="label">备注（可选）</label>
      <textarea className="input" style={{ height: 80, padding: 14, resize: "none" }} placeholder="楼下保安会让你进，按 502" />
    </div>
    <StickyCTA primary={<button className="btn btn--primary btn--block">确认并支付 $90.00</button>} />
  </div>
);

/* ============================================================
   9) BOOKINGS LIST
   ============================================================ */
const BookingsList = () => {
  const [tab, setTab] = useS3("up");
  return (
    <div className="frame">
      <StatusBar />
      <SubHeader title="我的预约" back={false} />
      <div className="flex" style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)", padding: "0 20px" }}>
        {[["up", "即将进行"], ["past", "历史"], ["rec", "周期性"]].map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "14px 0", border: "none", background: "transparent", fontWeight: 700, fontSize: 14, color: tab === k ? "var(--brand)" : "var(--text-secondary)", borderBottom: tab === k ? "2px solid var(--brand)" : "2px solid transparent" }}>{lbl}</button>
        ))}
      </div>
      <div className="page-main" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          ["梅 · 张", "家居保洁", "5月 15 · 10:00", "已确认", 90, "chip--success"],
          ["汤姆 · 林", "花园打理", "5月 17 · 14:00", "待支付", 75, "chip--warn"],
          ["安娜 · 王", "个人护理", "5月 22 · 09:00", "已确认", 110, "chip--success"],
        ].map((b, i) => (
          <div key={i} className="card" style={{ padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
            <Av name={b[0]} size={48} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="bold fs-16">{b[0]}</div>
              <div className="t-sec fs-13">{b[1]}</div>
              <div className="t-ter fs-12 tabular" style={{ marginTop: 2 }}>{b[2]}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="bold tabular fs-15">${b[4]}</div>
              <span className={"sbadge " + b[5]} style={{ marginTop: 4 }}>{b[3]}</span>
            </div>
          </div>
        ))}
      </div>
      <BottomTabBar active="bookings" />
    </div>
  );
};

/* ============================================================
   10) BOOKING DETAIL
   ============================================================ */
const BookingDetail = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="预约详情" />
    <div className="page-main">
      <div className="flex between center" style={{ marginBottom: 8 }}>
        <span className="sbadge chip--success">已确认</span>
        <span className="t-ter fs-13 tabular">#8a4f29c1</span>
      </div>
      <div className="banner banner--info" style={{ marginBottom: 16 }}>
        <Icon d={I.clock} size={16} />距开始前 47 小时 · 可免费取消
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="flex center gap-3" style={{ marginBottom: 14 }}>
          <Av name="梅 · 张" size={52} />
          <div>
            <div className="bold fs-17">梅 · 张</div>
            <div className="t-sec fs-13">CLEAN-2H · 2 小时</div>
          </div>
        </div>
        {[
          [I.cal, "5月 15日 周五 · 10:00 – 12:00"],
          [I.pin, "123 Bondi Rd, Bondi NSW 2026"],
          [I.wallet, "$90.00 AUD · 已支付"],
        ].map(([ic, t], i) => (
          <div key={i} className="flex center gap-3" style={{ padding: "10px 0", borderTop: "1px solid var(--border)", fontSize: 14 }}>
            <Icon d={ic} size={18} style={{ color: "var(--text-tertiary)" }} />
            <span>{t}</span>
          </div>
        ))}
      </div>

      {/* timeline */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="bold fs-15" style={{ marginBottom: 14 }}>状态</div>
        {[
          ["已下单", "5月 13 · 14:32", "done"],
          ["已确认", "5月 13 · 14:35", "done"],
          ["进行中", "—", "wait"],
          ["已完成", "—", "wait"],
        ].map(([t, d, st], i, arr) => (
          <div key={i} className="flex gap-3" style={{ position: "relative" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 22, height: 22, borderRadius: 999, background: st === "done" ? "var(--success)" : "var(--bg-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 800 }}>
                {st === "done" ? "✓" : i + 1}
              </div>
              {i < arr.length - 1 && <div style={{ width: 2, flex: 1, background: st === "done" ? "var(--success)" : "var(--border)", minHeight: 20 }} />}
            </div>
            <div style={{ paddingBottom: i < arr.length - 1 ? 16 : 0, flex: 1 }}>
              <div className="semibold fs-14">{t}</div>
              <div className="t-ter fs-12 tabular">{d}</div>
            </div>
          </div>
        ))}
      </div>
      <button className="dotted-cta" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>我有问题 · 报告</button>
    </div>
    <StickyCTA
      secondary={<><button className="btn btn--danger btn--sm" style={{ minWidth: 52 }}><Icon d={I.x} size={18} /></button><button className="btn btn--secondary btn--sm">改期</button></>}
      primary={<button className="btn btn--primary" style={{ flex: 1 }}>联系服务者</button>}
    />
  </div>
);

/* ============================================================
   11) RECURRING
   ============================================================ */
const RecurringPage = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="周期性预约" />
    <div className="page-main">
      <div className="flex gap-3 fs-13 t-sec semibold" style={{ marginBottom: 14 }}>
        <span><span className="bold t-brand">2</span> 活跃</span>
        <span style={{ color: "var(--text-tertiary)" }}>·</span>
        <span><span className="bold">0</span> 暂停</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          ["梅 · 张", "家居保洁", "每周 · 周五 10:00", "5月 8日", "active"],
          ["汤姆 · 林", "花园打理", "每两周 · 周日 14:00", "4月 22日", "active"],
        ].map((r, i) => (
          <div key={i} className="card">
            <div className="flex gap-3 center" style={{ marginBottom: 12 }}>
              <Av name={r[0]} size={44} />
              <div style={{ flex: 1 }}>
                <div className="bold fs-15">{r[1]} · {r[0]}</div>
                <div className="t-sec fs-13">{r[2]}</div>
                <div className="t-ter fs-12">下次执行 {r[3]}</div>
              </div>
              <span className="chip chip--success" style={{ fontSize: 11 }}>活跃</span>
            </div>
            <div className="flex gap-2">
              <button className="btn btn--secondary btn--sm" style={{ flex: 1 }}>暂停</button>
              <button className="btn btn--danger btn--sm" style={{ flex: 1 }}>结束</button>
            </div>
          </div>
        ))}
      </div>
      <button className="dotted-cta" style={{ marginTop: 12 }}><Icon d={I.plus} size={16} />添加周期性预约</button>
    </div>
    <BottomTabBar active="bookings" />
  </div>
);

/* ============================================================
   12) PAYMENT
   ============================================================ */
const PaymentPage = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="支付" />
    <div className="page-main">
      <div className="flex center gap-2 fs-13 t-sec" style={{ marginBottom: 16 }}>🔒 安全支付 · 由 Stripe 处理</div>
      <button className="btn btn--block" style={{ background: "#000", color: "#fff", marginBottom: 8 }}>
         Pay
      </button>
      <button className="btn btn--secondary btn--block" style={{ marginBottom: 14 }}>
        <Icon d={I.google} size={16} stroke={0} />Google Pay
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text-tertiary)", fontSize: 13, marginBottom: 14 }}>
        <span style={{ flex: 1, height: 1, background: "var(--border)" }} /><span>或用银行卡</span><span style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>

      <div className="card" style={{ borderColor: "var(--brand)", borderWidth: 1.5, marginBottom: 14 }}>
        <label className="label">卡号</label>
        <input className="input" defaultValue="4242 4242 4242 4242" style={{ marginBottom: 10 }} />
        <div className="flex gap-2" style={{ marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="label">有效期</label>
            <input className="input" defaultValue="12/28" />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">CVV</label>
            <input className="input" defaultValue="123" />
          </div>
        </div>
        <label className="label">持卡人姓名</label>
        <input className="input" defaultValue="MARGARET WANG" />
      </div>

      <div className="card card--inset">
        <div className="flex between fs-14" style={{ marginBottom: 6 }}><span className="t-sec">小计</span><span className="tabular">$81.82</span></div>
        <div className="flex between fs-14" style={{ marginBottom: 6 }}><span className="t-sec">GST 10%</span><span className="tabular">$8.18</span></div>
        <div className="flex between" style={{ paddingTop: 8, borderTop: "1px solid var(--border)" }}><span className="bold">合计</span><span className="bold tabular fs-18">$90.00</span></div>
      </div>
    </div>
    <StickyCTA primary={<button className="btn btn--primary btn--block">🔒 支付 $90.00</button>} />
  </div>
);

/* ============================================================
   13) PAYMENT SUCCESS
   ============================================================ */
const PaymentSuccess = () => (
  <div className="frame">
    <StatusBar />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <div style={{ width: 88, height: 88, borderRadius: 999, background: "var(--success-soft)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 5 5L20 7" /></svg>
      </div>
      <h1 className="h1" style={{ fontSize: 28, margin: "0 0 8px" }}>预约已确认</h1>
      <div className="t-sec fs-15" style={{ marginBottom: 32, maxWidth: 280 }}>梅 · 张 已接受你的预约</div>
      <div className="card" style={{ width: "100%", textAlign: "left", marginBottom: 20 }}>
        <div className="flex gap-3 center" style={{ marginBottom: 14 }}>
          <Av name="梅 · 张" size={44} />
          <div>
            <div className="bold fs-15">梅 · 张</div>
            <div className="t-sec fs-13">家居保洁 · 2 小时</div>
          </div>
        </div>
        <div className="flex center gap-2 t-sec fs-13" style={{ marginBottom: 4 }}><Icon d={I.cal} size={14} />5月 15日 · 10:00</div>
        <div className="flex center gap-2 t-sec fs-13" style={{ marginBottom: 4 }}><Icon d={I.pin} size={14} />123 Bondi Rd</div>
        <div className="flex center gap-2 t-sec fs-13 tabular"><Icon d={I.wallet} size={14} />已付 $90.00</div>
      </div>
      <button className="btn btn--primary btn--block" style={{ marginBottom: 8 }}><Icon d={I.cal} size={16} />加入日历</button>
      <button className="btn btn--ghost btn--block t-brand">查看预约 →</button>
    </div>
  </div>
);

/* ============================================================
   14) FEEDBACK
   ============================================================ */
const FeedbackPage = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="留下反馈" />
    <div className="page-main">
      <h2 className="h1" style={{ fontSize: 22, margin: "0 0 4px" }}>给梅 · 张 评分</h2>
      <div className="t-sec fs-14" style={{ marginBottom: 20 }}>你的反馈帮助其他家庭做选择</div>
      <div className="card" style={{ textAlign: "center", marginBottom: 20 }}>
        <Av name="梅 · 张" size={64} />
        <div className="bold fs-16" style={{ marginTop: 8 }}>家居保洁 · 5月 13日</div>
        <div className="flex center gap-2" style={{ justifyContent: "center", marginTop: 14 }}>
          {[1, 2, 3, 4, 5].map(s => (
            <button key={s} style={{ background: "none", border: "none", padding: 4 }}>
              <Stars n={1} filled={s <= 5 ? 1 : 0} size={36} />
            </button>
          ))}
        </div>
      </div>
      <div className="label">这次服务怎么样？</div>
      <div className="flex gap-2" style={{ flexWrap: "wrap", marginBottom: 16 }}>
        {["守时", "专业", "干净", "友好", "公道"].map((t, i) => (
          <span key={t} className={"chip " + (i < 3 ? "chip--brand" : "")} style={{ padding: "8px 14px", fontSize: 14 }}>{t}</span>
        ))}
      </div>
      <label className="label">说几句</label>
      <textarea className="input" style={{ height: 100, padding: 14, resize: "none" }} placeholder="梅非常细心..." />
    </div>
    <StickyCTA primary={<button className="btn btn--primary btn--block">提交并放款</button>} />
  </div>
);

/* ============================================================
   15) DISPUTE
   ============================================================ */
const DisputePage = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="发起纠纷" />
    <div className="page-main">
      <h2 className="h1" style={{ fontSize: 22, margin: "0 0 4px" }}>申诉这次服务</h2>
      <div className="t-sec fs-14" style={{ marginBottom: 16 }}>预约 #8a4f29c1 · 梅 · 张</div>
      <div className="banner banner--warn" style={{ marginBottom: 16 }}>
        <Icon d={I.alert} size={16} />请如实陈述。虚假申诉会影响你的账户。
      </div>
      <div className="label">问题类型</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {[["服务者未到", true], ["服务未完成", false], ["造成损坏", false], ["其他", false]].map(([t, sel]) => (
          <label key={t} className="card" style={{ padding: 12, display: "flex", gap: 10, alignItems: "center", cursor: "pointer", borderColor: sel ? "var(--brand)" : "var(--border)", background: sel ? "var(--brand-soft)" : "var(--bg-surface)" }}>
            <input type="radio" name="t" defaultChecked={sel} style={{ accentColor: "var(--brand)", width: 18, height: 18 }} />
            <span className="semibold fs-14">{t}</span>
          </label>
        ))}
      </div>
      <label className="label">详细描述（≥ 20 字）</label>
      <textarea className="input" style={{ height: 100, padding: 14, resize: "none", marginBottom: 12 }} defaultValue="服务者未按时到达，电话无人接听..." />
      <label className="label">证据（图片 / PDF · 每个 ≤ 10MB）</label>
      <button className="dotted-cta" style={{ marginBottom: 16 }}>📷 上传文件</button>
      <div className="label">希望的处理</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[["重做", false], ["部分退款", true], ["全额退款", false]].map(([t, sel]) => (
          <label key={t} className="card" style={{ padding: 12, display: "flex", gap: 10, alignItems: "center", cursor: "pointer", borderColor: sel ? "var(--brand)" : "var(--border)", background: sel ? "var(--brand-soft)" : "var(--bg-surface)" }}>
            <input type="radio" name="o" defaultChecked={sel} style={{ accentColor: "var(--brand)", width: 18, height: 18 }} />
            <span className="semibold fs-14">{t}</span>
          </label>
        ))}
      </div>
    </div>
    <StickyCTA primary={<button className="btn btn--primary btn--block">提交申诉</button>} />
  </div>
);

/* ============================================================
   16) CHAT
   ============================================================ */
const ChatPage = () => (
  <div className="frame">
    <StatusBar />
    <div className="appheader" style={{ padding: "0 16px" }}>
      <div className="flex center gap-3">
        <button className="icon-btn"><Icon d={I.arrowLeft} /></button>
        <div style={{ width: 40, height: 40, borderRadius: 999, background: "var(--brand-soft)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon d={I.bot} size={20} />
        </div>
        <div>
          <div className="bold fs-15">SilverConnect 助手</div>
          <div className="t-sec fs-12 flex center gap-2"><span className="badge-dot" style={{ color: "var(--success)" }} />在线</div>
        </div>
      </div>
      <span className="chip" style={{ fontSize: 12 }}>AU 🇦🇺</span>
    </div>
    <div className="page-main" style={{ background: "var(--bg-base)" }}>
      {[
        ["ai", "你好玛格丽特，有什么可以帮你？"],
        ["me", "我下周想找人帮忙打扫家里"],
        ["ai", "好的。家居保洁通常 $35–$65/小时，含 GST。你大概什么时候有空？"],
        ["me", "周五上午"],
        ["ai", "我帮你找到了 4 位评分 4.8 以上、周五上午有空的服务者。要看看吗？"],
      ].map(([who, t], i) => (
        <div key={i} style={{ display: "flex", justifyContent: who === "me" ? "flex-end" : "flex-start", marginBottom: 10 }}>
          <div style={{
            maxWidth: "78%", padding: "10px 14px", borderRadius: 18, fontSize: 15, lineHeight: 1.45,
            background: who === "me" ? "var(--brand)" : "var(--bg-surface)",
            color: who === "me" ? "#fff" : "var(--text-primary)",
            border: who === "me" ? "none" : "1px solid var(--border)",
            borderBottomRightRadius: who === "me" ? 4 : 18,
            borderBottomLeftRadius: who === "me" ? 18 : 4,
          }}>{t}</div>
        </div>
      ))}
    </div>
    <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg-surface)", padding: 12, display: "flex", gap: 8, alignItems: "center" }}>
      <button className="icon-btn"><Icon d={I.plus} size={20} /></button>
      <input className="input" style={{ flex: 1, height: 44 }} placeholder="说点什么..." />
      <button className="icon-btn" style={{ background: "var(--brand)", color: "#fff", border: "none" }}><Icon d={I.send} size={18} /></button>
    </div>
  </div>
);

const ChatEmergency = () => (
  <div className="frame" style={{ background: "#3a0d0a" }}>
    <StatusBar />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center", color: "#fff" }}>
      <div style={{ width: 96, height: 96, borderRadius: 999, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, animation: "pulse 1.5s infinite" }}>
        <Icon d={I.alert} size={48} />
      </div>
      <h1 className="h1" style={{ fontSize: 32, margin: "0 0 8px", color: "#fff" }}>紧急情况</h1>
      <div style={{ fontSize: 15, opacity: 0.85, marginBottom: 32, maxWidth: 280 }}>遇到紧急情况请立即拨打 <b>000</b>。我们也会通知你设置的紧急联系人。</div>
      <a className="btn btn--block" style={{ background: "#fff", color: "#3a0d0a", fontSize: 22, padding: "20px", marginBottom: 12, fontWeight: 800 }}>
        📞 拨打 000
      </a>
      <button className="btn btn--block" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}>通知紧急联系人</button>
      <button className="btn btn--ghost" style={{ color: "#fff", marginTop: 24, opacity: 0.7 }}>关闭</button>
    </div>
  </div>
);

/* ============================================================
   17) NOTIFICATIONS
   ============================================================ */
const NotificationsPage = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="通知" back={false} />
    <div className="flex" style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)", padding: "0 20px" }}>
      {[["全部", true], ["预约", false], ["AI", false], ["系统", false]].map(([k, sel]) => (
        <button key={k} style={{ flex: 1, padding: "12px 0", border: "none", background: "transparent", fontWeight: 700, fontSize: 14, color: sel ? "var(--brand)" : "var(--text-secondary)", borderBottom: sel ? "2px solid var(--brand)" : "2px solid transparent" }}>{k}</button>
      ))}
    </div>
    <div className="page-main">
      {[
        ["📅", "预约已确认", "梅 · 张 已接受你 5月 15日 的预约", "3 分钟前", true, "var(--brand-soft)"],
        ["💬", "新评价回复", "汤姆 · 林 回复了你的评价", "昨天", true, "var(--success-soft)"],
        ["📅", "明天的预约提醒", "5月 14 周三 14:00 · 花园打理", "1 天前", false, "var(--brand-soft)"],
        ["⚙️", "隐私政策更新", "我们更新了用户隐私政策", "3 天前", false, "var(--bg-surface-2)"],
      ].map((n, i) => (
        <div key={i} style={{ display: "flex", gap: 12, padding: "14px 20px", borderBottom: "1px solid var(--border)", background: n[4] ? "var(--brand-soft)" : "var(--bg-surface)", alignItems: "flex-start" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: n[5], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{n[0]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex between" style={{ gap: 8 }}>
              <span className="bold fs-14">{n[1]}</span>
              {n[4] && <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--brand)", flexShrink: 0, marginTop: 6 }} />}
            </div>
            <div className="t-sec fs-13" style={{ marginTop: 2 }}>{n[2]}</div>
            <div className="t-ter fs-12" style={{ marginTop: 4 }}>{n[3]}</div>
          </div>
        </div>
      ))}
    </div>
    <BottomTabBar active="chat" />
  </div>
);

/* ============================================================
   18) PROFILE MENU
   ============================================================ */
const ProfileMenu = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="我的" back={false} />
    <div className="page-main">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <Av name="玛格丽特 · 陈" size={96} />
        <div className="h1" style={{ fontSize: 22 }}>玛格丽特 · 陈</div>
        <div className="t-ter fs-13">会员自 2024年 3月</div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {[
          ["👤", "编辑资料", "姓名 · 电话 · 语言"],
          ["🔒", "账户安全", "密码 · 两步验证"],
          ["📍", "地址", "已保存 2 个"],
          ["💳", "支付方式", "•••• 4242"],
          ["🚨", "紧急联系人", "已设置 2 位"],
          ["❤️", "收藏的服务者", "5 位"],
          ["🔔", "通知设置", ""],
          ["👨‍👩‍👧", "家庭成员", "1 位邀请待定"],
        ].map(([ic, t, sub], i, arr) => (
          <div key={t} className="flex center gap-3" style={{ padding: 16, borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer" }}>
            <span style={{ fontSize: 22 }}>{ic}</span>
            <div style={{ flex: 1 }}>
              <div className="semibold fs-15">{t}</div>
              {sub && <div className="t-ter fs-12">{sub}</div>}
            </div>
            <Icon d={I.arrowRight} size={16} style={{ color: "var(--text-tertiary)" }} />
          </div>
        ))}
      </div>
      <button className="btn btn--danger btn--block" style={{ marginTop: 16 }}>退出登录</button>
    </div>
    <BottomTabBar active="profile" />
  </div>
);

/* ============================================================
   19-26) PROFILE SUB-PAGES
   ============================================================ */
const ProfileEdit = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="编辑资料" />
    <div className="page-main">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
        <Av name="玛格丽特 · 陈" size={96} />
        <button className="btn btn--ghost btn--sm t-brand" style={{ marginTop: 8 }}>更换头像</button>
      </div>
      {[
        ["姓名", "玛格丽特 · 陈"],
        ["邮箱", "margaret@example.com"],
        ["电话", "+61 4 1234 5678"],
      ].map(([l, v]) => (
        <div key={l} style={{ marginBottom: 14 }}>
          <label className="label">{l}</label>
          <input className="input" defaultValue={v} />
        </div>
      ))}
      <label className="label">界面语言</label>
      <select className="input" defaultValue="zh">
        <option value="zh">简体中文</option><option value="en">English</option>
      </select>
    </div>
    <StickyCTA primary={<button className="btn btn--primary btn--block">保存</button>} />
  </div>
);

const SecurityPage = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="账户安全" />
    <div className="page-main">
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="bold fs-15" style={{ marginBottom: 12 }}>修改密码</div>
        <label className="label">当前密码</label>
        <input className="input" type="password" style={{ marginBottom: 10 }} />
        <label className="label">新密码</label>
        <input className="input" type="password" style={{ marginBottom: 10 }} />
        <label className="label">确认新密码</label>
        <input className="input" type="password" />
      </div>
      <div className="card" style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--success-soft)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon d={I.shield} size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="bold fs-15">两步验证</div>
          <div className="t-sec fs-13">额外一层登录保护</div>
        </div>
        <button className="btn btn--secondary btn--sm">启用</button>
      </div>
      <div className="card">
        <div className="bold fs-15" style={{ marginBottom: 12 }}>登录会话</div>
        <div className="flex between center" style={{ marginBottom: 12 }}>
          <div>
            <div className="semibold fs-14">本设备 · iPhone 14</div>
            <div className="t-ter fs-12">Sydney · 刚才活跃</div>
          </div>
          <span className="chip chip--success" style={{ fontSize: 11 }}>当前</span>
        </div>
        <button className="btn btn--danger btn--sm btn--block">全部登出其他设备</button>
      </div>
    </div>
    <StickyCTA primary={<button className="btn btn--primary btn--block">保存</button>} />
  </div>
);

const AddressesPage = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="已保存地址" />
    <div className="page-main">
      {[
        ["Home", "123 Bondi Rd, Bondi NSW 2026", true],
        ["儿子家", "45 Park St, Sydney NSW 2000", false],
      ].map(([l, a, def]) => (
        <div key={l} className="card" style={{ marginBottom: 10, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <Icon d={I.pin} size={20} style={{ color: "var(--brand)", marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div className="flex center gap-2"><span className="bold fs-15">{l}</span>{def && <span className="chip chip--brand" style={{ fontSize: 11, padding: "0 8px" }}>默认</span>}</div>
            <div className="t-sec fs-13" style={{ marginTop: 2 }}>{a}</div>
            <div className="flex gap-3" style={{ marginTop: 10, fontSize: 13 }}>
              {!def && <a className="t-brand semibold">设为默认</a>}
              <a className="t-sec semibold">编辑</a>
              <a className="semibold" style={{ color: "var(--danger)" }}>删除</a>
            </div>
          </div>
        </div>
      ))}
      <button className="dotted-cta" style={{ marginTop: 8 }}><Icon d={I.plus} size={16} />添加新地址</button>
    </div>
  </div>
);

const AddressNewPage = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="添加新地址" />
    <div className="page-main">
      <div style={{ marginBottom: 14 }}>
        <label className="label">标签</label>
        <input className="input" defaultValue="Home" />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label className="label">街道地址 *</label>
        <input className="input" placeholder="例如：123 Bondi Rd" />
      </div>
      <div className="flex gap-2" style={{ marginBottom: 14 }}>
        <div style={{ flex: 2 }}>
          <label className="label">城市 *</label>
          <input className="input" defaultValue="Bondi" />
        </div>
        <div style={{ flex: 1 }}>
          <label className="label">州 *</label>
          <select className="input"><option>NSW</option><option>VIC</option></select>
        </div>
      </div>
      <div>
        <label className="label">邮编</label>
        <input className="input" defaultValue="2026" style={{ maxWidth: 160 }} />
      </div>
    </div>
    <StickyCTA primary={<button className="btn btn--primary btn--block">保存地址</button>} />
  </div>
);

const PaymentMethodsPage = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="支付方式" />
    <div className="page-main">
      <div className="banner banner--info" style={{ marginBottom: 14 }}>🔒 卡片信息由 Stripe 加密保管</div>
      <div className="card" style={{ marginBottom: 10, display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ width: 52, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #1A1F71, #4A6FE5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 11, letterSpacing: 1 }}>VISA</div>
        <div style={{ flex: 1 }}>
          <div className="flex center gap-2"><span className="bold tabular fs-15">•••• 4242</span><span className="chip chip--brand" style={{ fontSize: 11, padding: "0 8px" }}>默认</span></div>
          <div className="t-ter fs-12 tabular">有效期 12/2028</div>
        </div>
        <button className="icon-btn"><Icon d={I.more} size={16} /></button>
      </div>
      <div className="card" style={{ marginBottom: 10, display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ width: 52, height: 36, borderRadius: 8, background: "#EB001B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 11 }}>MC</div>
        <div style={{ flex: 1 }}>
          <div className="bold tabular fs-15">•••• 8881</div>
          <div className="t-ter fs-12 tabular">有效期 06/2027</div>
        </div>
        <a className="t-brand semibold fs-13">设为默认</a>
      </div>
      <button className="dotted-cta" style={{ marginTop: 8 }}><Icon d={I.plus} size={16} />添加银行卡</button>
    </div>
  </div>
);

const AddCardPage = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="添加银行卡" />
    <div className="page-main">
      <div className="banner banner--info" style={{ marginBottom: 16 }}>🔒 由 Stripe 安全处理</div>
      <div className="card" style={{ borderStyle: "dashed", textAlign: "center", padding: 32 }}>
        <Icon d={I.wallet} size={48} style={{ color: "var(--text-tertiary)", marginBottom: 12 }} />
        <div className="bold fs-16" style={{ marginBottom: 8 }}>即将开放</div>
        <div className="t-sec fs-14" style={{ marginBottom: 16 }}>Stripe Elements 表单将在下一个版本上线。</div>
        <a className="t-brand semibold fs-14">← 返回</a>
      </div>
    </div>
  </div>
);

const EmergencyContactsPage = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="紧急联系人" />
    <div className="page-main">
      <div className="t-sec fs-14" style={{ marginBottom: 16 }}>遇到紧急情况时，我们会立即通知这些人。</div>
      {[
        ["李 · 陈", "女儿", "+61 4 9876 5432", true],
        ["David · Wang", "朋友", "+61 4 1111 2222", false],
      ].map(([n, r, p, prim]) => (
        <div key={n} className="card" style={{ marginBottom: 10, display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--danger-soft)", color: "var(--danger)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            📞
          </div>
          <div style={{ flex: 1 }}>
            <div className="flex center gap-2"><span className="bold fs-15">{n}</span>{prim && <span className="chip chip--danger" style={{ fontSize: 11, padding: "0 8px" }}>主要</span>}</div>
            <div className="t-sec fs-13">{r} · <span className="tabular">{p}</span></div>
          </div>
          <button className="icon-btn"><Icon d={I.more} size={16} /></button>
        </div>
      ))}
      <button className="dotted-cta"><Icon d={I.plus} size={16} />添加紧急联系人</button>
    </div>
  </div>
);

const FavouritesPage = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="收藏的服务者" />
    <div className="page-main" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[
        ["梅 · 张", "家居保洁", "4.9", 47, "2.3", 45],
        ["汤姆 · 林", "花园打理", "4.8", 32, "4.1", 42],
        ["安娜 · 王", "个人护理", "5.0", 89, "3.7", 58],
      ].map(p => (
        <div key={p[0]} className="pcard">
          <Av name={p[0]} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex between"><span className="bold fs-16">{p[0]}</span><Icon d={I.heart} size={18} fill="var(--brand)" stroke="var(--brand)" /></div>
            <div className="t-sec fs-13">{p[1]}</div>
            <div className="t-ter fs-12 tabular" style={{ marginTop: 2 }}>★ {p[2]} ({p[3]}) · {p[4]} km · ${p[5]}/h</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const NotifPrefsPage = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="通知偏好" />
    <div className="page-main">
      <div className="t-ter fs-12 semibold" style={{ textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>渠道</div>
      <div className="card" style={{ padding: 0, marginBottom: 16 }}>
        {[["邮件", true], ["短信", true], ["推送", false]].map(([k, on], i, a) => (
          <div key={k} className="flex between center" style={{ padding: 16, borderBottom: i < a.length - 1 ? "1px solid var(--border)" : "none" }}>
            <span className="semibold fs-15">{k}</span>
            <div style={{ width: 44, height: 26, borderRadius: 999, background: on ? "var(--brand)" : "var(--border-strong)", padding: 3, display: "flex" }}>
              <div style={{ width: 20, height: 20, borderRadius: 999, background: "#fff", marginLeft: on ? "auto" : 0, transition: "0.2s" }} />
            </div>
          </div>
        ))}
      </div>
      <div className="t-ter fs-12 semibold" style={{ textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>主题</div>
      <div className="card" style={{ padding: 0 }}>
        {[["预约状态", "预约确认、改期、取消", true], ["服务提醒", "开始前提醒", true], ["支付", "收据与退款", true], ["营销", "活动与折扣", false]].map((k, i, a) => (
          <div key={k[0]} className="flex between center" style={{ padding: 16, borderBottom: i < a.length - 1 ? "1px solid var(--border)" : "none" }}>
            <div>
              <div className="semibold fs-15">{k[0]}</div>
              <div className="t-ter fs-12">{k[1]}</div>
            </div>
            <div style={{ width: 44, height: 26, borderRadius: 999, background: k[2] ? "var(--brand)" : "var(--border-strong)", padding: 3, display: "flex", flexShrink: 0 }}>
              <div style={{ width: 20, height: 20, borderRadius: 999, background: "#fff", marginLeft: k[2] ? "auto" : 0 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
    <StickyCTA primary={<button className="btn btn--primary btn--block">保存</button>} />
  </div>
);

const FamilyPage = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="家庭成员" />
    <div className="page-main">
      <div className="t-sec fs-14" style={{ marginBottom: 16 }}>家人可以帮你查看预约或代付费用。</div>
      <div className="card" style={{ marginBottom: 10, display: "flex", gap: 12, alignItems: "center" }}>
        <Av name="玛格丽特" size={44} />
        <div style={{ flex: 1 }}>
          <div className="bold fs-15">玛格丽特 · 陈（你）</div>
          <div className="t-ter fs-12">margaret@example.com</div>
        </div>
        <span className="chip chip--brand" style={{ fontSize: 11 }}>管理员</span>
      </div>
      <div className="card" style={{ marginBottom: 10, display: "flex", gap: 12, alignItems: "center" }}>
        <Av name="李 · 陈" size={44} />
        <div style={{ flex: 1 }}>
          <div className="flex center gap-2"><span className="bold fs-15">李 · 陈</span><span className="chip chip--warn" style={{ fontSize: 11 }}>待接受</span></div>
          <div className="t-ter fs-12">lily@example.com</div>
        </div>
        <span className="chip" style={{ fontSize: 11 }}>付款人</span>
      </div>
      <div className="card" style={{ borderStyle: "dashed", marginTop: 14 }}>
        <div className="bold fs-15" style={{ marginBottom: 12 }}>邀请家庭成员</div>
        <label className="label">姓名</label>
        <input className="input" placeholder="例如：李 · 陈" style={{ marginBottom: 10 }} />
        <label className="label">邮箱</label>
        <input className="input" type="email" placeholder="family@example.com" style={{ marginBottom: 12 }} />
        <label className="flex center gap-2 fs-14" style={{ marginBottom: 14 }}>
          <input type="checkbox" defaultChecked style={{ accentColor: "var(--brand)", width: 18, height: 18 }} />
          可代我预约和付款
        </label>
        <button className="btn btn--primary btn--block">发送邀请</button>
      </div>
    </div>
  </div>
);

/* ============================================================
   27) SAFETY REPORT
   ============================================================ */
const SafetyReportPage = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="" />
    <div className="page-main">
      <div className="flex center gap-3" style={{ marginBottom: 6 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--danger-soft)", color: "var(--danger)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon d={I.shield} size={24} />
        </div>
        <h2 className="h1" style={{ fontSize: 22, margin: 0 }}>报告安全事件</h2>
      </div>
      <div className="t-sec fs-14" style={{ marginBottom: 16 }}>你的报告将由专员严格保密处理。</div>
      <div className="card" style={{ background: "#3a0d0a", color: "#fff", border: "none", marginBottom: 20 }}>
        <div className="bold fs-15" style={{ color: "#fff", marginBottom: 4 }}>遇到紧急情况？</div>
        <div className="fs-13" style={{ opacity: 0.85, marginBottom: 12 }}>请立即拨打 000 或打开 SOS。</div>
        <button className="btn btn--block" style={{ background: "#fff", color: "#3a0d0a" }}>打开 SOS</button>
      </div>
      <label className="label">严重程度</label>
      <div className="flex gap-2" style={{ marginBottom: 16 }}>
        {[["低", "chip"], ["中", "chip chip--warn"], ["高", "chip chip--danger"]].map(([t, c], i) => (
          <button key={t} className={c + (i === 1 ? " " : "")} style={{ flex: 1, padding: "12px", fontSize: 15, border: "1.5px solid var(--border)", background: i === 1 ? "var(--brand-soft)" : "var(--bg-surface)", color: i === 1 ? "var(--brand-ink)" : "var(--text-primary)", borderColor: i === 1 ? "var(--brand)" : "var(--border)" }}>{t}</button>
        ))}
      </div>
      <label className="label">什么时候发生的</label>
      <input className="input" type="datetime-local" defaultValue="2026-05-13T14:30" style={{ marginBottom: 16 }} />
      <label className="label">详细描述（≥ 30 字）</label>
      <textarea className="input" style={{ height: 100, padding: 14, resize: "none", marginBottom: 12 }} placeholder="尽量具体描述发生了什么..." />
      <label className="label">证据（可选）</label>
      <button className="dotted-cta" style={{ marginBottom: 16 }}>📷 添加照片 / 录音 / 视频</button>
      <label className="flex center gap-2 fs-14">
        <input type="checkbox" style={{ accentColor: "var(--brand)", width: 18, height: 18 }} />
        我已联系警方
      </label>
    </div>
    <StickyCTA primary={<button className="btn btn--primary btn--block">提交报告</button>} />
  </div>
);

/* ============================================================
   28) ACCOUNT SETTINGS
   ============================================================ */
const AccountSettings = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="账户设置" />
    <div className="page-main">
      {[
        ["界面语言", ["简体中文", "繁体中文", "English", "日本語", "한국어"]],
        ["所在国家", ["澳大利亚 🇦🇺", "美国 🇺🇸", "加拿大 🇨🇦"]],
        ["时区", ["Australia/Sydney", "America/New_York", "UTC"]],
        ["币种", ["AUD", "USD", "CAD"]],
      ].map(([l, opts]) => (
        <div key={l} style={{ marginBottom: 14 }}>
          <label className="label">{l}</label>
          <select className="input">{opts.map(o => <option key={o}>{o}</option>)}</select>
        </div>
      ))}
    </div>
    <StickyCTA primary={<button className="btn btn--primary btn--block">保存</button>} />
  </div>
);

/* ============================================================
   29) PRIVACY
   ============================================================ */
const PrivacyPage = () => (
  <div className="frame">
    <StatusBar />
    <SubHeader title="隐私与数据" />
    <div className="page-main">
      <div className="t-ter fs-12 semibold" style={{ textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>数据使用</div>
      <div className="card" style={{ padding: 0, marginBottom: 20 }}>
        {[
          ["数据分析", "帮助我们改进产品", true],
          ["营销内容", "新功能与活动推送", false],
          ["与家人共享", "家庭成员可看到预约", true],
        ].map((k, i, a) => (
          <label key={k[0]} className="flex center gap-3" style={{ padding: 16, borderBottom: i < a.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer" }}>
            <input type="checkbox" defaultChecked={k[2]} style={{ accentColor: "var(--brand)", width: 20, height: 20 }} />
            <div style={{ flex: 1 }}>
              <div className="semibold fs-15">{k[0]}</div>
              <div className="t-ter fs-12">{k[1]}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="bold fs-15" style={{ marginBottom: 6 }}>下载我的数据</div>
        <div className="t-sec fs-13" style={{ marginBottom: 12 }}>导出你在 SilverConnect 的全部数据（JSON）。</div>
        <button className="btn btn--secondary btn--block"><Icon d={I.download} size={16} />生成导出</button>
      </div>

      <div className="card" style={{ borderColor: "var(--danger)" }}>
        <div className="bold fs-15" style={{ color: "var(--danger)", marginBottom: 6 }}>删除账号</div>
        <div className="t-sec fs-13" style={{ marginBottom: 12 }}>此操作不可撤销。所有预约、地址、聊天记录都会被永久删除。</div>
        <label className="label">输入"DELETE"确认</label>
        <input className="input" placeholder="DELETE" style={{ marginBottom: 12 }} />
        <button className="btn btn--danger btn--block" style={{ background: "var(--danger)", color: "#fff" }}>永久删除账号</button>
      </div>
    </div>
  </div>
);

Object.assign(window, {
  SearchPage, ServicesList, CategoryPage, ProviderDetail,
  BookStep1, BookStep2, BookStep3, BookStep4,
  BookingsList, BookingDetail, RecurringPage,
  PaymentPage, PaymentSuccess, FeedbackPage, DisputePage,
  ChatPage, ChatEmergency, NotificationsPage,
  ProfileMenu, ProfileEdit, SecurityPage, AddressesPage, AddressNewPage,
  PaymentMethodsPage, AddCardPage, EmergencyContactsPage, FavouritesPage, NotifPrefsPage, FamilyPage,
  SafetyReportPage, AccountSettings, PrivacyPage,
});
