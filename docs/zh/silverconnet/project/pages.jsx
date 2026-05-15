/* global React */
const { useState: useState2 } = React;

/* helper avatar with hue from string */
const hueOf = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};
const PAvatar = ({ name, size = 48 }) => {
  const h = hueOf(name);
  const initial = name.charAt(0).toUpperCase();
  const colors = ["#5B8DEF", "#3D9970", "#A36BD8", "#D2A036"];
  const bg = colors[name.charCodeAt(0) % 4];
  return (
    <span className="avatar-circle" style={{ width: size, height: size, fontSize: size * 0.4, background: bg, flexShrink: 0 }}>{initial}</span>);

};

/* tiny inline illustration — abstract warm shapes (placeholder, not "AI slop") */
const TeaTimeIllu = ({ w = 140, h = 100 }) =>
<svg viewBox="0 0 140 100" width={w} height={h} style={{ display: "block" }}>
    <defs>
      <linearGradient id="ill1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="var(--brand)" stopOpacity="0.6" />
        <stop offset="1" stopColor="var(--brand)" stopOpacity="0.2" />
      </linearGradient>
    </defs>
    <circle cx="105" cy="35" r="24" fill="var(--brand-soft)" />
    <path d="M30 80 q15 -40 50 -38 q35 2 50 38" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" />
    {/* tea cup */}
    <path d="M40 60 h36 v18 a10 10 0 0 1 -10 10 h-16 a10 10 0 0 1 -10 -10 z" fill="url(#ill1)" />
    <path d="M76 64 q12 0 12 8 q0 8 -12 8" fill="none" stroke="var(--brand)" strokeWidth="2.5" />
    <path d="M50 56 q-2 -8 3 -12 M58 56 q-2 -8 3 -12 M66 56 q-2 -8 3 -12" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
  </svg>;


/* ============================================================
   1) LOGIN PAGE  — Auth shell, no header except theme toggle
   ============================================================ */
const LoginPage = ({ desktop = false }) => {
  return (
    <div className="frame" style={{ background: "var(--bg-base)" }}>
      {!desktop && <StatusBar />}
      {/* theme toggle floating */}
      <div style={{ position: "absolute", top: desktop ? 24 : 56, right: 20, display: "flex", gap: 8, zIndex: 5 }}>
        <button className="icon-btn"><Icon d={I.sun} size={18} /></button>
        <button className="icon-btn" style={{ fontSize: 11, fontWeight: 800 }}>中</button>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: desktop ? "48px" : "32px 24px 80px", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", gap: 24 }}>
          {/* brand */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <span className="brand-dot" style={{ width: 56, height: 56, borderRadius: 18, fontSize: 28 }}>S</span>
            <h1 className="h1" style={{ fontSize: desktop ? 32 : 28, margin: 0, textAlign: "center", letterSpacing: "-0.025em" }}>
              欢迎回到 SilverConnect
            </h1>
            <p style={{ color: "var(--text-secondary)", margin: 0, textAlign: "center", fontSize: 16, lineHeight: 1.5, maxWidth: 400 }}>
              一个账号，既能预约服务，也能成为服务者赚取收入。
            </p>
          </div>

          {/* form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="label">邮箱地址</label>
              <input className="input" type="email" defaultValue="margaret@example.com" />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <label className="label">密码</label>
                <a style={{ color: "var(--brand)", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>忘记密码？</a>
              </div>
              <input className="input" type="password" defaultValue="••••••••" />
              <div className="t-ter fs-13" style={{ marginTop: 6 }}>至少 8 位</div>
            </div>
            <button className="btn btn--primary btn--block">登录</button>
          </div>

          {/* or divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text-tertiary)", fontSize: 13 }}>
            <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span>或</span>
            <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          {/* social */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="btn btn--secondary btn--block">
              <Icon d={I.google} size={18} stroke={0} />
              用 Google 继续
            </button>
            <button className="btn btn--secondary btn--block">
              <Icon d={I.apple} size={18} stroke={0} fill="currentColor" />
              用 Apple 继续
            </button>
          </div>

          <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 15 }}>
            还没有账号？ <a style={{ color: "var(--brand)", fontWeight: 700, textDecoration: "none" }}>注册</a>
          </div>
          <div style={{ textAlign: "center", color: "var(--text-tertiary)", fontSize: 12, lineHeight: 1.5 }}>
            登录即表示同意 <u>服务条款</u> 与 <u>隐私政策</u>
          </div>
        </div>
      </div>
    </div>);

};

/* ============================================================
   2) CUSTOMER HOME
   ============================================================ */
const CATS = [
{ k: "cleaning", emoji: "🧹", name: "家居保洁", from: 35, providers: 124, color: "#FCEBE3" },
{ k: "cooking", emoji: "🍳", name: "上门做饭", from: 42, providers: 87, color: "#FBEFD4" },
{ k: "garden", emoji: "🌿", name: "花园打理", from: 38, providers: 56, color: "#E5F3EA" },
{ k: "care", emoji: "🤝", name: "个人护理", from: 55, providers: 68, color: "#F0E6F8" },
{ k: "repair", emoji: "🔧", name: "家居维修", from: 48, providers: 92, color: "#E3ECFA" }];


const CategoryTile = ({ c, large = false }) =>
<button className="cat-tile" style={{ minHeight: large ? 156 : 132 }}>
    <span className="cat-tile-emoji" style={{ background: c.color }}>{c.emoji}</span>
    <div>
      <div className="bold fs-18" style={{ marginBottom: 2 }}>{c.name}</div>
      <div className="t-ter fs-13 tabular">起 <span className="t-sec semibold">${c.from}</span>/小时 · 含 GST</div>
    </div>
    <div className="t-ter fs-12 tabular" style={{ marginTop: "auto" }}>{c.providers} 位已认证服务者</div>
  </button>;


const ProviderCard = ({ name, cat, rating, reviews, distance, price, badges = [] }) =>
<div className="pcard">
    <PAvatar name={name} size={56} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className="flex between center" style={{ marginBottom: 4 }}>
        <span className="bold fs-18">{name}</span>
        <span className="bold tabular fs-18">${price}<span className="t-ter fs-13" style={{ fontWeight: 600 }}>/h</span></span>
      </div>
      <div className="t-sec fs-13" style={{ marginBottom: 6 }}>{cat}</div>
      <div className="flex center gap-3 fs-13 t-sec tabular">
        <span className="flex center gap-2"><Icon d={I.star_fill.d} size={14} fill="currentColor" stroke={0} style={{ color: "#E0A800" }} />{rating} <span className="t-ter">({reviews})</span></span>
        <span className="t-ter">·</span>
        <span className="flex center gap-2"><Icon d={I.pin} size={13} />{distance} km</span>
      </div>
      <div className="flex gap-2" style={{ marginTop: 8, flexWrap: "wrap" }}>
        {badges.map((b) => <span key={b} className="chip chip--success" style={{ fontSize: 12, padding: "2px 8px" }}><Icon d={I.verified} size={12} />{b}</span>)}
      </div>
    </div>
  </div>;


const CustomerHome = ({ desktop = false }) =>
<div className="frame">
    {!desktop && <StatusBar />}
    <AppHeader desktop={desktop} />

    <div className={"page-main" + (desktop ? " page-main--lg" : "")}>
      <div style={{ maxWidth: desktop ? 1080 : "none", margin: "0 auto", display: "flex", flexDirection: "column", gap: desktop ? 28 : 24 }}>
        {/* greeting */}
        <div className="illu" style={{ padding: desktop ? "32px 36px" : "24px 22px", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div className="t-sec fs-14 semibold" style={{ marginBottom: 6 }}>下午好 · {new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })}</div>
            <h1 className="h1" style={{ fontSize: desktop ? 36 : 30, margin: 0, color: "var(--text-primary)" }}>
              你好，<span style={{ color: "var(--brand)" }}>玛格丽特</span>
            </h1>
            <div className="t-sec" style={{ marginTop: 8, fontSize: desktop ? 16 : 15 }}>今天想约一位上门帮手吗？</div>
          </div>
          <TeaTimeIllu w={desktop ? 180 : 120} h={desktop ? 130 : 90} />
        </div>

        {/* search */}
        <div className="search">
          <Icon d={I.search} size={20} />
          <input placeholder="搜索服务、服务者或地点" />
          <button className="btn btn--primary btn--sm" style={{ padding: "8px 16px", minHeight: 36 }}>搜索</button>
        </div>

        {/* categories */}
        <div>
          <div className="flex between center" style={{ marginBottom: 14 }}>
            <h2 className="h1" style={{ fontSize: 22, margin: 0 }}>探索服务</h2>
            <a className="t-brand semibold fs-14">查看全部 →</a>
          </div>
          <div style={{
          display: "grid",
          gridTemplateColumns: desktop ? "repeat(5, 1fr)" : "1fr 1fr",
          gap: 12
        }}>
            {CATS.map((c) => <CategoryTile key={c.k} c={c} large={desktop} />)}
          </div>
        </div>

        {/* recent + featured */}
        <div style={{ display: "grid", gridTemplateColumns: desktop ? "1.4fr 1fr" : "1fr", gap: 20 }}>
          <div>
            <div className="flex between center" style={{ marginBottom: 14 }}>
              <h2 className="h1" style={{ fontSize: 22, margin: 0 }}>最近合作</h2>
              <a className="t-brand semibold fs-14">全部 →</a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <ProviderCard name="梅 · 张" cat="家居保洁 · 已合作 8 次" rating="4.9" reviews={47} distance="2.3" price={45} badges={["已认证", "急救证"]} />
              <ProviderCard name="汤姆 · 林" cat="花园打理 · 已合作 3 次" rating="4.8" reviews={32} distance="4.1" price={42} badges={["已认证"]} />
            </div>
          </div>
          <div>
            <div className="flex between center" style={{ marginBottom: 14 }}>
              <h2 className="h1" style={{ fontSize: 22, margin: 0 }}>本周推荐</h2>
              <span className="chip chip--brand fs-12">编辑精选</span>
            </div>
            <ProviderCard name="安娜 · 王" cat="个人护理 · 持照护士" rating="5.0" reviews={89} distance="3.7" price={58} badges={["已认证", "急救证", "周末可约"]} />
          </div>
        </div>
      </div>
    </div>

    {!desktop && <BottomTabBar active="home" />}
    {!desktop && <button className="fab-ai"><Icon d={I.chat} size={16} />问 AI</button>}
    {!desktop && <button className="sos">SOS</button>}
  </div>;


/* ============================================================
   3) PROVIDER WORKBENCH
   ============================================================ */
const ProviderWorkbench = ({ desktop = false, reviewState = "active" }) => {
  // reviewState: "review" shows amber banner; "active" hides it
  const isReview = reviewState === "review";
  const jobs = [
  { time: "10:00", customer: "玛格丽特 · 陈", cat: "家居保洁 · 2 小时", price: 90, status: "已确认", color: "var(--brand)" },
  { time: "13:30", customer: "约翰 · 史密斯", cat: "个人护理 · 1 小时", price: 70, status: "进行中", color: "#5B8DEF" },
  { time: "16:00", customer: "丽萍 · 黄", cat: "家居保洁 · 3 小时", price: 135, status: "已确认", color: "#3D9970" }];

  return (
    <div className="frame">
      {!desktop && <StatusBar />}
      <AppHeader desktop={desktop} initial="梅" initialColor="#3D9970" />
      <div className={"page-main" + (desktop ? " page-main--lg" : "")}>
        <div style={{ maxWidth: desktop ? 980 : "none", margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* greeting */}
          <div>
            <h1 className="h1" style={{ fontSize: desktop ? 32 : 28, margin: 0 }}>你好，梅</h1>
            <div className="t-sec fs-14" style={{ marginTop: 4 }}>
              {new Date().toLocaleDateString("zh-CN", { weekday: "long", month: "long", day: "numeric" })} · 今天有 3 个派单
            </div>
          </div>

          {/* compliance banner */}
          {isReview &&
          <div className="banner banner--warn">
              <Icon d={I.alert} size={18} />
              <div style={{ flex: 1 }}>
                <div className="bold" style={{ marginBottom: 2 }}>账户审核中</div>
                <div className="fs-13">还差 1 项：Stripe 收款账号未启用。审核通过前，新派单暂不会派给你。</div>
              </div>
              <a className="t-brand semibold fs-13">查看进度 →</a>
            </div>
          }

          {/* earnings card */}
          <div className="card" style={{ background: "linear-gradient(135deg, var(--brand) 0%, color-mix(in oklab, var(--brand) 70%, #ff9d6e) 100%)", color: "#fff", border: "none", padding: 24 }}>
            <div className="flex between" style={{ alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>本周收益</div>
                <div className="h1 tabular" style={{ fontSize: desktop ? 44 : 36, marginTop: 8, color: "#fff" }}>$1,247<span style={{ fontSize: 20, opacity: 0.7 }}>.50</span></div>
                <div className="flex gap-4 tabular" style={{ marginTop: 12, fontSize: 14 }}>
                  <span><span style={{ opacity: 0.7 }}>托管中</span> <b>$420.00</b></span>
                  <span style={{ opacity: 0.3 }}>·</span>
                  <span><span style={{ opacity: 0.7 }}>已到账</span> <b>$827.50</b></span>
                </div>
              </div>
              <Icon d={I.arrowRight} size={22} />
            </div>
          </div>

          {/* stats */}
          <div style={{ display: "grid", gridTemplateColumns: desktop ? "repeat(4, 1fr)" : "1fr 1fr", gap: 12 }}>
            {[
            { label: "本月完成", val: "28", sub: "派单" },
            { label: "平均评分", val: "4.9", sub: "★ · 47 条" },
            { label: "周完成率", val: "100%", sub: "无取消" },
            { label: "应答时长", val: "8m", sub: "中位数" }].
            map((s) =>
            <div key={s.label} className="stat">
                <div className="t-ter fs-12 semibold" style={{ textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{s.label}</div>
                <div className="h1 tabular" style={{ fontSize: 26 }}>{s.val}</div>
                <div className="t-sec fs-13">{s.sub}</div>
              </div>
            )}
          </div>

          {/* today's jobs */}
          <div>
            <div className="flex between center" style={{ marginBottom: 14 }}>
              <h2 className="h1" style={{ fontSize: 22, margin: 0 }}>今天的派单</h2>
              <a className="t-brand semibold fs-14">查看全部 →</a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {jobs.map((j, i) =>
              <div key={i} className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 56, textAlign: "center", flexShrink: 0 }}>
                    <div className="bold tabular" style={{ fontSize: 18 }}>{j.time}</div>
                    <div className="t-ter fs-12">今天</div>
                  </div>
                  <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} />
                  <PAvatar name={j.customer} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="bold fs-16">{j.customer}</div>
                    <div className="t-sec fs-13">{j.cat}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="bold tabular fs-16">${j.price}</div>
                    <span className={"sbadge " + (j.status === "进行中" ? "chip--brand" : "chip--success")} style={{ marginTop: 4 }}>{j.status}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {!desktop && <ProviderTabBar active="workbench" />}
    </div>);

};

/* ============================================================
   4) ADMIN DISPUTES
   ============================================================ */
const DISPUTES = [
{ id: "D-8a4f29c1", customer: "玛格丽特 · 陈", provider: "梅 · 张", amount: 240, status: "open", sla: "2小时前", reason: "服务者未按时到达，电话无人接听。预约时段过去 45 分钟后我自己联系了另一位帮手。", current: true },
{ id: "D-3b9e07d2", customer: "约翰 · 史密斯", provider: "汤姆 · 林", amount: 156, status: "evidence_needed", sla: "1天前" },
{ id: "D-1f2a55b9", customer: "丽萍 · 黄", provider: "鲍勃 · 周", amount: 480, status: "open", sla: "4小时前" },
{ id: "D-9c7d1e8a", customer: "Elaine · Wong", provider: "Anna · Wang", amount: 95, status: "decided", sla: "昨天" },
{ id: "D-2e6b40a3", customer: "David · Liu", provider: "梅 · 张", amount: 320, status: "open", sla: "6小时前" },
{ id: "D-7a4f8c11", customer: "Sarah · Chen", provider: "鲍勃 · 周", amount: 210, status: "closed", sla: "3天前" }];


const statusInfo = {
  open: { label: "未处理", cls: "chip--danger" },
  evidence_needed: { label: "需补证据", cls: "chip--warn" },
  decided: { label: "已裁决", cls: "chip--success" },
  closed: { label: "已关闭", cls: "" }
};

const AdminDisputes = ({ desktop = true }) => {
  const [verdict, setVerdict] = useState2("partial");
  return (
    <div className="frame">
      {!desktop && <StatusBar />}
      {desktop ? <AdminTopBar /> :
      <div className="adminbar">
          <button className="icon-btn"><Icon d={I.menu} size={20} /></button>
          <span className="brand-wordmark"><span className="brand-dot">S</span>Admin</span>
        </div>
      }
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {desktop && <AdminSidebar active="disputes" />}
        <div style={{ flex: 1, padding: desktop ? 32 : 16, overflowY: "auto", position: "relative" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div className="flex between center" style={{ marginBottom: 20 }}>
              <div>
                <h1 className="h1" style={{ fontSize: 30, margin: 0 }}>纠纷</h1>
                <div className="t-sec fs-14" style={{ marginTop: 4 }}>{DISPUTES.filter((d) => d.status === "open" || d.status === "evidence_needed").length} 个案件待处理 · SLA 24h</div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn--secondary btn--sm"><Icon d={I.download} size={16} />导出</button>
              </div>
            </div>

            {/* filter bar */}
            <div className="card" style={{ padding: "12px 16px", display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
              <Icon d={I.filter} size={16} />
              <span className="fs-13 semibold">状态</span>
              <select className="input" defaultValue="open" style={{ height: 36, width: 180, fontSize: 14, padding: "0 10px" }}>
                <option value="all">全部</option>
                <option value="open">未处理</option>
                <option value="ev">需补证据</option>
                <option value="dec">已裁决</option>
                <option value="closed">已关闭</option>
              </select>
              <span className="fs-13 semibold" style={{ marginLeft: 8 }}>金额</span>
              <select className="input" style={{ height: 36, width: 140, fontSize: 14, padding: "0 10px" }}>
                <option>全部</option><option>≥ $200</option>
              </select>
              <button className="btn btn--secondary btn--sm" style={{ marginLeft: "auto" }}>应用</button>
            </div>

            {/* table */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>编号</th>
                    <th>顾客</th>
                    <th>服务者</th>
                    <th style={{ textAlign: "right" }}>金额</th>
                    <th>状态</th>
                    <th>提交</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {DISPUTES.map((d) =>
                  <tr key={d.id} className={d.current ? "active" : ""}>
                      <td><span className="bold tabular t-brand">{d.id}</span></td>
                      <td>{d.customer}</td>
                      <td>{d.provider}</td>
                      <td className="tabular semibold" style={{ textAlign: "right" }}>${d.amount}.00</td>
                      <td><span className={"sbadge " + statusInfo[d.status].cls}>{statusInfo[d.status].label}</span></td>
                      <td className="t-sec fs-13"><Icon d={I.clock} size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />{d.sla}</td>
                      <td style={{ textAlign: "right" }}><button className="icon-btn" style={{ width: 32, height: 32 }}><Icon d={I.more} size={16} /></button></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* DRAWER */}
          {desktop &&
          <div className="drawer">
              <div className="flex between center" style={{ marginBottom: 16 }}>
                <div>
                  <div className="t-ter fs-12 semibold" style={{ letterSpacing: 0.5, textTransform: "uppercase" }}>案件编号</div>
                  <div className="h1 tabular" style={{ fontSize: 22, marginTop: 2 }}>D-8a4f29c1</div>
                </div>
                <button className="icon-btn"><Icon d={I.x} size={18} /></button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div className="card card--inset" style={{ padding: 12 }}>
                  <div className="t-ter fs-12 semibold">顾客</div>
                  <div className="bold fs-14" style={{ marginTop: 2 }}>玛格丽特 · 陈</div>
                  <div className="t-sec fs-12">margaret@example.com</div>
                </div>
                <div className="card card--inset" style={{ padding: 12 }}>
                  <div className="t-ter fs-12 semibold">服务者</div>
                  <div className="bold fs-14" style={{ marginTop: 2 }}>梅 · 张</div>
                  <div className="t-sec fs-12">3 次纠纷历史</div>
                </div>
                <div className="card card--inset" style={{ padding: 12 }}>
                  <div className="t-ter fs-12 semibold">金额</div>
                  <div className="bold fs-14 tabular" style={{ marginTop: 2 }}>$240.00 AUD</div>
                </div>
                <div className="card card--inset" style={{ padding: 12 }}>
                  <div className="t-ter fs-12 semibold">预订</div>
                  <div className="bold fs-14 tabular t-brand" style={{ marginTop: 2 }}>B-94c1f0a8</div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div className="bold fs-14" style={{ marginBottom: 8 }}>纠纷理由</div>
                <div className="card card--inset" style={{ padding: 12, fontSize: 14, lineHeight: 1.55 }}>
                  服务者未按时到达，电话无人接听。预约时段过去 45 分钟后我自己联系了另一位帮手。希望能全额退款。
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div className="bold fs-14" style={{ marginBottom: 8 }}>对话</div>
                <div className="card card--inset" style={{ padding: 12, fontSize: 13, color: "var(--text-secondary)" }}>
                  <div style={{ marginBottom: 8 }}><b style={{ color: "var(--text-primary)" }}>梅 · 张</b> · 1天前<br />我当天临时被警察封路，已尝试联系顾客。</div>
                  <div><b style={{ color: "var(--text-primary)" }}>玛格丽特</b> · 1天前<br />没有收到任何短信或电话。</div>
                </div>
              </div>

              {/* verdict form */}
              <div className="bold fs-14" style={{ marginBottom: 10 }}>裁决</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {[
              ["full", "全额退款", "$240.00"],
              ["partial", "部分退款", "$120.00 建议"],
              ["reject", "驳回主张", "不退款"],
              ["escalate", "升级 · 要求更多证据", ""]].
              map(([k, lbl, sub]) =>
              <label key={k} className="card" style={{
                padding: 12, cursor: "pointer",
                borderColor: verdict === k ? "var(--brand)" : "var(--border)",
                background: verdict === k ? "var(--brand-soft)" : "var(--bg-surface)",
                display: "flex", alignItems: "center", gap: 10
              }}>
                    <input type="radio" name="v" checked={verdict === k} onChange={() => setVerdict(k)} style={{ accentColor: "var(--brand)" }} />
                    <span className="bold fs-14" style={{ flex: 1 }}>{lbl}</span>
                    {sub && <span className="t-sec fs-13 tabular">{sub}</span>}
                  </label>
              )}
              </div>

              {verdict === "partial" &&
            <div style={{ marginBottom: 14 }}>
                  <label className="label">退款金额 (AUD)</label>
                  <input className="input" defaultValue="120.00" style={{ height: 44 }} />
                </div>
            }

              <div style={{ marginBottom: 14 }}>
                <label className="label">裁决备注</label>
                <textarea className="input" style={{ height: 80, padding: "12px 16px", resize: "none" }} placeholder="可选 — 仅内部可见" />
              </div>

              <button className="btn btn--primary btn--block">应用裁决</button>
            </div>
          }
        </div>
      </div>
    </div>);

};

Object.assign(window, { LoginPage, CustomerHome, ProviderWorkbench, AdminDisputes });