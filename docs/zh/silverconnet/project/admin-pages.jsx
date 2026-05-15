/* global React */
const { useState: useStateA } = React;

const AdminShell = ({ activeNav, children, breadcrumb }) => (
  <div className="frame">
    <AdminTopBar />
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <AdminSidebar active={activeNav} />
      <div style={{ flex: 1, padding: 32, overflowY: "auto", position: "relative" }}>
        {breadcrumb && <div className="t-ter fs-13" style={{ marginBottom: 8 }}>{breadcrumb}</div>}
        {children}
      </div>
    </div>
  </div>
);

const Kpi = ({ label, value, sub, trend, accent }) => (
  <div className="stat" style={accent ? { background: "var(--brand-soft)", borderColor: "color-mix(in oklab, var(--brand) 25%, transparent)" } : {}}>
    <div className="t-ter fs-12 semibold" style={{ textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{label}</div>
    <div className="h1 tabular" style={{ fontSize: 30 }}>{value}</div>
    <div className="flex between center" style={{ marginTop: 6 }}>
      <span className="t-sec fs-13">{sub}</span>
      {trend && <span className={"fs-12 semibold"} style={{ color: trend.startsWith("+") ? "var(--success)" : "var(--danger)" }}>{trend}</span>}
    </div>
  </div>
);

/* ============================================================
   1) OVERVIEW DASHBOARD
   ============================================================ */
const AdminOverview = () => {
  const hrs = ["00", "03", "06", "09", "12", "15", "18", "21"];
  const data = [12, 8, 6, 22, 38, 45, 52, 31];
  return (
    <AdminShell activeNav="overview">
      <div className="flex between center" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="h1" style={{ fontSize: 32, margin: 0 }}>运营概览</h1>
          <div className="t-sec fs-14" style={{ marginTop: 4 }}>2026年5月13日 · 周三 · 实时更新（30 秒）</div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn--secondary btn--sm">本周</button>
          <button className="btn btn--secondary btn--sm">导出 PDF</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        <Kpi label="活跃顾客" value="3,142" sub="本周 +218 新增" trend="+7.4%" accent />
        <Kpi label="已认证服务者" value="487" sub="新增 12 · 待审 23" trend="+2.5%" />
        <Kpi label="本周成交额" value="$48,720" sub="GMV · 含 GST" trend="+12.1%" />
        <Kpi label="平台抽成" value="$5,846" sub="净收入 12%" trend="+11.8%" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 22 }}>
        <div className="card" style={{ padding: 22 }}>
          <div className="flex between center" style={{ marginBottom: 14 }}>
            <div className="bold fs-16">订单量 · 24 小时</div>
            <div className="t-ter fs-12">每 30 秒刷新</div>
          </div>
          <div className="bars" style={{ height: 180 }}>
            {data.map((h, i) => <div key={i} className={"bar" + (i === 6 ? " active" : "")} style={{ height: (h / 60) * 100 + "%" }} />)}
          </div>
          <div className="flex between t-ter fs-11 tabular" style={{ marginTop: 8 }}>
            {hrs.map((h) => <span key={h}>{h}:00</span>)}
          </div>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div className="bold fs-16" style={{ marginBottom: 14 }}>需要关注</div>
          {[
            { icon: I.scale, lbl: "纠纷未处理", val: 7, cls: "var(--danger)", soft: "var(--danger-soft)" },
            { icon: I.shield, lbl: "安全事件", val: 2, cls: "var(--danger)", soft: "var(--danger-soft)" },
            { icon: I.users, lbl: "服务者待审", val: 23, cls: "var(--warning)", soft: "var(--warning-soft)" },
            { icon: I.flag, lbl: "评价被举报", val: 5, cls: "var(--warning)", soft: "var(--warning-soft)" },
            { icon: I.wallet, lbl: "退款待执行", val: 3, cls: "var(--text-secondary)", soft: "var(--bg-surface-2)" },
          ].map((r, i, a) => (
            <div key={i} className="flex between center" style={{ padding: "10px 0", borderBottom: i < a.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div className="flex center gap-3">
                <div style={{ width: 32, height: 32, borderRadius: 999, background: r.soft, color: r.cls, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon d={r.icon} size={16} />
                </div>
                <span className="fs-14">{r.lbl}</span>
              </div>
              <span className="bold tabular fs-18">{r.val}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card" style={{ padding: 22 }}>
          <div className="bold fs-16" style={{ marginBottom: 12 }}>热门品类（本周）</div>
          {[
            ["家居保洁", 145, 38],
            ["上门做饭", 87, 23],
            ["个人护理", 68, 18],
            ["花园打理", 42, 11],
            ["家居维修", 38, 10],
          ].map(([n, v, pct]) => (
            <div key={n} className="flex center gap-3" style={{ padding: "8px 0" }}>
              <span className="fs-14" style={{ width: 100 }}>{n}</span>
              <div style={{ flex: 1, height: 8, background: "var(--bg-surface-2)", borderRadius: 999 }}>
                <div style={{ width: pct + "%", height: "100%", background: "var(--brand)", borderRadius: 999 }} />
              </div>
              <span className="bold tabular fs-13" style={{ width: 50, textAlign: "right" }}>{v}</span>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div className="bold fs-16" style={{ marginBottom: 14 }}>近期事件</div>
          {[
            ["14:08", "纠纷 D-8a4f29c1 已升级", "var(--danger)"],
            ["13:42", "服务者梅·张审核通过", "var(--success)"],
            ["13:15", "退款 R-3492 已执行 $156", "var(--text-secondary)"],
            ["12:50", "顾客 SOS 已联系警方", "var(--danger)"],
            ["12:30", "服务者王·小红 WWVP 待审", "var(--warning)"],
          ].map(([t, msg, c], i) => (
            <div key={i} className="flex center gap-3" style={{ padding: "8px 0" }}>
              <span className="badge-dot" style={{ color: c, width: 8, height: 8 }} />
              <span className="t-ter fs-12 tabular" style={{ width: 50 }}>{t}</span>
              <span className="fs-13">{msg}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
};

/* ============================================================
   2) ANALYTICS
   ============================================================ */
const AnalyticsPage = () => {
  const months = ["12月", "1月", "2月", "3月", "4月", "5月"];
  const gmv = [28, 35, 42, 48, 55, 68];
  return (
    <AdminShell activeNav="analytics" breadcrumb="数据分析 / 总览">
      <div className="flex between center" style={{ marginBottom: 20 }}>
        <h1 className="h1" style={{ fontSize: 28, margin: 0 }}>数据分析</h1>
        <div className="flex gap-2">
          <select className="input" style={{ height: 36, width: 140, fontSize: 13, padding: "0 10px" }}>
            <option>近 6 个月</option>
          </select>
          <button className="btn btn--secondary btn--sm"><Icon d={I.download} size={14} />导出</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        <Kpi label="MAU" value="3,142" sub="周环比" trend="+7.4%" />
        <Kpi label="单均客单价" value="$72.40" sub="" trend="+2.1%" />
        <Kpi label="完成率" value="94.2%" sub="" trend="+0.8%" />
        <Kpi label="NPS" value="58" sub="顾客满意度" trend="+4" />
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 22 }}>
        <div className="flex between center" style={{ marginBottom: 18 }}>
          <div className="bold fs-16">GMV 走势（千 AUD）</div>
          <div className="flex gap-2">
            <span className="chip chip--brand" style={{ fontSize: 12 }}>● 总成交</span>
            <span className="chip" style={{ fontSize: 12 }}>● 平台抽成</span>
          </div>
        </div>
        <svg viewBox="0 0 600 220" style={{ width: "100%", height: 220 }}>
          {[0, 1, 2, 3, 4].map((i) => <line key={i} x1="40" x2="600" y1={20 + i * 40} y2={20 + i * 40} stroke="var(--border)" strokeDasharray="3,4" />)}
          {[80, 60, 40, 20, 0].map((v, i) => <text key={i} x="30" y={24 + i * 40} fill="var(--text-tertiary)" fontSize="11" textAnchor="end">{v}k</text>)}
          {/* area */}
          <path d={`M 40 ${180 - (gmv[0] / 80) * 160} ${gmv.map((v, i) => `L ${40 + (i * 560) / 5} ${180 - (v / 80) * 160}`).join(" ")} L 600 180 L 40 180 Z`} fill="var(--brand-soft)" opacity="0.6" />
          {/* line */}
          <polyline points={gmv.map((v, i) => `${40 + (i * 560) / 5},${180 - (v / 80) * 160}`).join(" ")} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {gmv.map((v, i) => (
            <circle key={i} cx={40 + (i * 560) / 5} cy={180 - (v / 80) * 160} r="4" fill="var(--brand)" stroke="#fff" strokeWidth="2" />
          ))}
          {months.map((m, i) => <text key={m} x={40 + (i * 560) / 5} y="210" fill="var(--text-tertiary)" fontSize="11" textAnchor="middle">{m}</text>)}
        </svg>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div className="card" style={{ padding: 22 }}>
          <div className="bold fs-15" style={{ marginBottom: 12 }}>用户漏斗</div>
          {[
            ["注册", 1820, "100%"],
            ["完成资料", 1480, "81%"],
            ["首次下单", 980, "54%"],
            ["二次复购", 612, "34%"],
          ].map(([k, v, pct], i) => (
            <div key={k} style={{ marginBottom: 12 }}>
              <div className="flex between fs-13" style={{ marginBottom: 4 }}>
                <span>{k}</span>
                <span className="bold tabular">{v} <span className="t-ter">{pct}</span></span>
              </div>
              <div style={{ height: 8, background: "var(--bg-surface-2)", borderRadius: 999 }}>
                <div style={{ width: pct, height: "100%", background: "var(--brand)", borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div className="bold fs-15" style={{ marginBottom: 12 }}>城市分布</div>
          {[
            ["Sydney", 42],
            ["Melbourne", 28],
            ["Brisbane", 14],
            ["Perth", 9],
            ["其他", 7],
          ].map(([c, p]) => (
            <div key={c} className="flex between center" style={{ padding: "8px 0" }}>
              <span className="fs-13">{c}</span>
              <div style={{ flex: 1, height: 6, background: "var(--bg-surface-2)", borderRadius: 999, margin: "0 12px" }}>
                <div style={{ width: p + "%", height: "100%", background: "var(--brand)", borderRadius: 999 }} />
              </div>
              <span className="bold tabular fs-13" style={{ width: 32, textAlign: "right" }}>{p}%</span>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div className="bold fs-15" style={{ marginBottom: 12 }}>留存（首单后）</div>
          <div className="h1 tabular" style={{ fontSize: 34 }}>34.2%</div>
          <div className="t-sec fs-13" style={{ marginBottom: 14 }}>30 天复购率 · 行业平均 22%</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
            {Array.from({ length: 28 }).map((_, i) => {
              const v = [0.9, 0.7, 0.6, 0.5, 0.45, 0.4, 0.38][Math.floor(i / 4)] - (i % 4) * 0.04;
              return <div key={i} style={{ aspectRatio: 1, borderRadius: 4, background: `color-mix(in oklab, var(--brand) ${Math.max(v * 100, 8)}%, var(--bg-surface-2))` }} />;
            })}
          </div>
          <div className="t-ter fs-11" style={{ marginTop: 8 }}>4 周热力图 · 颜色越深留存越高</div>
        </div>
      </div>
    </AdminShell>
  );
};

/* ============================================================
   3) DISPUTE DETAIL
   ============================================================ */
const DisputeDetailPage = () => (
  <AdminShell activeNav="disputes" breadcrumb="纠纷 / D-8a4f29c1">
    <div className="flex between" style={{ marginBottom: 20 }}>
      <div>
        <div className="flex center gap-3" style={{ marginBottom: 6 }}>
          <span className="t-ter fs-13 tabular bold">D-8a4f29c1</span>
          <span className="sbadge chip--danger">未处理</span>
          <span className="chip chip--warn fs-12"><Icon d={I.clock} size={12} />SLA 剩 17h</span>
        </div>
        <h1 className="h1" style={{ fontSize: 26, margin: 0 }}>服务者未按时到达</h1>
      </div>
      <div className="flex gap-2">
        <button className="btn btn--secondary btn--sm">分配给 …</button>
        <button className="btn btn--secondary btn--sm">升级</button>
        <button className="btn btn--primary btn--sm">应用裁决 →</button>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
      <div className="card" style={{ padding: 16 }}>
        <div className="t-ter fs-12 semibold" style={{ marginBottom: 8 }}>顾客</div>
        <div className="flex center gap-3">
          <span className="avatar-circle" style={{ width: 40, height: 40, fontSize: 16, background: "#5B8DEF" }}>玛</span>
          <div>
            <div className="bold fs-14">玛格丽特 · 陈</div>
            <div className="t-ter fs-12">75 岁 · 已注册 14 个月</div>
          </div>
        </div>
        <div className="t-sec fs-13" style={{ marginTop: 10 }}>历史纠纷：1 起 · 已解决</div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div className="t-ter fs-12 semibold" style={{ marginBottom: 8 }}>服务者</div>
        <div className="flex center gap-3">
          <span className="avatar-circle" style={{ width: 40, height: 40, fontSize: 16, background: "#3D9970" }}>梅</span>
          <div>
            <div className="bold fs-14">梅 · 张</div>
            <div className="t-ter fs-12">★ 4.9 · 已完成 84 单</div>
          </div>
        </div>
        <div className="t-sec fs-13" style={{ marginTop: 10 }}>历史纠纷：3 起 · 2 起服务者承担</div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div className="t-ter fs-12 semibold" style={{ marginBottom: 8 }}>预订</div>
        <div className="bold tabular t-brand fs-14">B-94c1f0a8</div>
        <div className="t-sec fs-13" style={{ marginTop: 6 }}>家居保洁 · 2小时</div>
        <div className="t-sec fs-13">5月12日 · 10:00</div>
        <div className="bold tabular fs-15" style={{ marginTop: 8 }}>$240.00 AUD</div>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 22 }}>
      <div className="card" style={{ padding: 22 }}>
        <div className="bold fs-15" style={{ marginBottom: 10 }}>顾客陈述</div>
        <div className="t-sec fs-14" style={{ lineHeight: 1.6 }}>
          服务者未按时到达，电话无人接听。预约时段过去 45 分钟后我自己联系了另一位帮手。希望能全额退款。
        </div>
      </div>
      <div className="card" style={{ padding: 22 }}>
        <div className="bold fs-15" style={{ marginBottom: 10 }}>服务者答复</div>
        <div className="t-sec fs-14" style={{ lineHeight: 1.6 }}>
          我当天临时被警察封路，已尝试联系顾客。短信因为顾客号码停机未发送成功。
        </div>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
      <div className="card" style={{ padding: 22 }}>
        <div className="bold fs-15" style={{ marginBottom: 14 }}>证据时间线</div>
        {[
          ["10:00", "预约开始时间", null],
          ["10:08", "服务者位置：距离 4.2km", "GPS"],
          ["10:21", "顾客拨打服务者电话 · 未接通", "通话记录"],
          ["10:35", "服务者上传警车封路照片", "上传"],
          ["10:45", "顾客在群里发起纠纷", "工单"],
        ].map(([t, msg, src], i) => (
          <div key={i} className="flex gap-3" style={{ padding: "10px 0", borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}>
            <span className="t-sec fs-13 tabular bold" style={{ width: 50 }}>{t}</span>
            <span className="fs-13" style={{ flex: 1 }}>{msg}</span>
            {src && <span className="chip fs-11" style={{ padding: "2px 8px" }}>{src}</span>}
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div className="bold fs-15" style={{ marginBottom: 14 }}>裁决预览</div>
        <div className="card card--inset" style={{ padding: 14, marginBottom: 12 }}>
          <div className="t-ter fs-12 semibold">选定裁决</div>
          <div className="bold fs-15" style={{ marginTop: 4 }}>部分退款 $120.00</div>
          <div className="t-sec fs-12" style={{ marginTop: 6 }}>服务者保留 $120 用于交通成本，顾客获得 50% 退款。</div>
        </div>
        <div className="card card--inset" style={{ padding: 14 }}>
          <div className="t-ter fs-12 semibold" style={{ marginBottom: 6 }}>影响</div>
          <div className="fs-13" style={{ lineHeight: 1.6 }}>
            • 顾客 +$120 退款<br />
            • 服务者档案标记：1 次"未按时到达"<br />
            • 双方收到自动通知
          </div>
        </div>
      </div>
    </div>
  </AdminShell>
);

/* ============================================================
   4) SAFETY LIST
   ============================================================ */
const SafetyListPage = () => {
  const incidents = [
    { id: "S-7421", lvl: "high", customer: "Elaine · Wong", type: "SOS 触发", time: "12 分钟前", state: "active" },
    { id: "S-7420", lvl: "high", customer: "David · Liu", type: "服务期间受伤", time: "2 小时前", state: "investigating" },
    { id: "S-7419", lvl: "med", customer: "Sarah · Chen", type: "顾客反映言语骚扰", time: "今早", state: "investigating" },
    { id: "S-7418", lvl: "low", customer: "John · Smith", type: "服务者迟到", time: "昨天", state: "closed" },
    { id: "S-7417", lvl: "high", customer: "玛格丽特 · 陈", type: "陌生人尾随", time: "2 天前", state: "closed" },
  ];
  const lvlCfg = {
    high: { lbl: "高", cls: "chip--danger" },
    med: { lbl: "中", cls: "chip--warn" },
    low: { lbl: "低", cls: "" },
  };
  const stateCfg2 = {
    active: { lbl: "进行中 · 实时", cls: "chip--danger" },
    investigating: { lbl: "调查中", cls: "chip--warn" },
    closed: { lbl: "已关闭", cls: "" },
  };
  return (
    <AdminShell activeNav="safety">
      <div className="flex between center" style={{ marginBottom: 22 }}>
        <div>
          <h1 className="h1" style={{ fontSize: 28, margin: 0 }}>安全事件</h1>
          <div className="t-sec fs-14" style={{ marginTop: 4 }}>2 个紧急 · 1 个调查中 · SLA 1h</div>
        </div>
        <div className="flex gap-2">
          <span className="chip chip--danger" style={{ fontSize: 13 }}>● 24/7 待命</span>
          <button className="btn btn--secondary btn--sm">导出周报</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr><th>编号</th><th>等级</th><th>顾客</th><th>类型</th><th>状态</th><th>触发时间</th><th></th></tr>
          </thead>
          <tbody>
            {incidents.map((i) => (
              <tr key={i.id} className={i.state === "active" ? "active" : ""}>
                <td><span className="bold tabular t-brand">{i.id}</span></td>
                <td><span className={"sbadge " + lvlCfg[i.lvl].cls}>{lvlCfg[i.lvl].lbl}</span></td>
                <td>{i.customer}</td>
                <td>{i.type}</td>
                <td><span className={"sbadge " + stateCfg2[i.state].cls}>{stateCfg2[i.state].lbl}</span></td>
                <td className="t-sec fs-13">{i.time}</td>
                <td><button className="btn btn--primary btn--sm">查看 →</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
};

/* ============================================================
   5) SAFETY DETAIL
   ============================================================ */
const SafetyDetailPage = () => (
  <AdminShell activeNav="safety" breadcrumb="安全 / S-7421">
    <div className="flex between" style={{ marginBottom: 20 }}>
      <div>
        <div className="flex center gap-3" style={{ marginBottom: 6 }}>
          <span className="t-ter fs-13 tabular bold">S-7421</span>
          <span className="sbadge chip--danger">高优 · 进行中</span>
          <span className="chip chip--brand fs-12">● 实时定位</span>
        </div>
        <h1 className="h1" style={{ fontSize: 26, margin: 0 }}>SOS 触发 · Elaine · Wong</h1>
        <div className="t-sec fs-14" style={{ marginTop: 4 }}>12 分钟前 · 顾客主动按下 SOS 按钮</div>
      </div>
      <div className="flex gap-2">
        <button className="btn btn--danger btn--sm"><Icon d={I.alert} size={14} />联系警方</button>
        <button className="btn btn--primary btn--sm"><Icon d={I.send} size={14} />联系顾客</button>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ height: 280, background: "linear-gradient(135deg, #d3e0d4 0%, #c1d6c4 100%)", position: "relative" }}>
          <svg viewBox="0 0 400 280" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
            <path d="M 0 120 Q 100 100 200 130 T 400 110" stroke="#fff" strokeWidth="6" fill="none" />
            <path d="M 100 0 L 130 280" stroke="#fff" strokeWidth="3" fill="none" opacity="0.6" />
            <path d="M 280 0 L 250 280" stroke="#fff" strokeWidth="3" fill="none" opacity="0.6" />
            <circle cx="220" cy="140" r="20" fill="var(--danger)" opacity="0.3" />
            <circle cx="220" cy="140" r="12" fill="var(--danger)" />
            <circle cx="220" cy="140" r="6" fill="#fff" />
          </svg>
          <div style={{ position: "absolute", bottom: 12, left: 12, right: 12, background: "rgba(255,255,255,0.95)", borderRadius: 12, padding: 12 }}>
            <div className="bold fs-14">实时位置</div>
            <div className="t-sec fs-12">42 King St, Sydney NSW · 精度 ±5m · 30 秒前更新</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div className="bold fs-15" style={{ marginBottom: 14 }}>事件流</div>
        {[
          ["14:08:42", "顾客长按 SOS 按钮", "var(--danger)"],
          ["14:08:45", "已自动通知 3 位紧急联系人", "var(--brand)"],
          ["14:09:12", "AI 拨打回访电话 · 未接", "var(--warning)"],
          ["14:12:08", "管理员介入（你）", "var(--text-secondary)"],
          ["14:14:00", "等待处理决策 ↓", null],
        ].map(([t, msg, c], i, a) => (
          <div key={i} className="flex gap-3" style={{ padding: "8px 0" }}>
            <span className="t-ter fs-11 tabular" style={{ width: 60 }}>{t}</span>
            {c && <span className="badge-dot" style={{ color: c, width: 8, height: 8, marginTop: 6 }} />}
            <span className="fs-13" style={{ flex: 1 }}>{msg}</span>
          </div>
        ))}
        <button className="btn btn--secondary btn--block" style={{ marginTop: 14 }}>添加管理员备注</button>
      </div>
    </div>

    <div className="card" style={{ padding: 22 }}>
      <div className="bold fs-15" style={{ marginBottom: 14 }}>紧急联系人 · 已通知</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[["女儿 Sarah", "+61 422 ··· ···", "已送达"], ["儿子 Michael", "+61 411 ··· ···", "已读"], ["家庭医生", "+61 2 9··· ···", "未读"]].map(([n, p, s]) => (
          <div key={n} className="card card--inset" style={{ padding: 14 }}>
            <div className="bold fs-14">{n}</div>
            <div className="t-ter fs-12 tabular" style={{ marginTop: 2 }}>{p}</div>
            <div className={"chip fs-11 " + (s === "已读" ? "chip--success" : s === "未读" ? "chip--warn" : "")} style={{ marginTop: 8, padding: "2px 8px" }}>{s}</div>
          </div>
        ))}
      </div>
    </div>
  </AdminShell>
);

/* ============================================================
   6) PROVIDERS LIST
   ============================================================ */
const ProvidersListPage = () => {
  const list = [
    { name: "梅 · 张", city: "Sydney", cat: "保洁 · 做饭", rating: 4.9, jobs: 84, state: "active", joined: "2024-09" },
    { name: "Anna · Wang", city: "Sydney", cat: "个人护理", rating: 5.0, jobs: 142, state: "active", joined: "2024-01" },
    { name: "Tom · Lin", city: "Melbourne", cat: "花园打理", rating: 4.8, jobs: 56, state: "active", joined: "2025-02" },
    { name: "王 · 小红", city: "Brisbane", cat: "保洁", rating: null, jobs: 0, state: "pending", joined: "2026-05" },
    { name: "Bob · Zhou", city: "Sydney", cat: "维修", rating: 3.2, jobs: 22, state: "flagged", joined: "2024-11" },
    { name: "Lily · Chen", city: "Perth", cat: "做饭", rating: 4.7, jobs: 38, state: "suspended", joined: "2025-04" },
  ];
  const stateCfg3 = {
    active: { lbl: "正常", cls: "chip--success" },
    pending: { lbl: "待审", cls: "chip--warn" },
    flagged: { lbl: "标记", cls: "chip--danger" },
    suspended: { lbl: "已停权", cls: "" },
  };
  return (
    <AdminShell activeNav="providers">
      <div className="flex between center" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="h1" style={{ fontSize: 28, margin: 0 }}>服务者</h1>
          <div className="t-sec fs-14" style={{ marginTop: 4 }}>487 位 · 23 位待审 · 2 位标记</div>
        </div>
        <button className="btn btn--secondary btn--sm"><Icon d={I.download} size={14} />导出</button>
      </div>

      <div className="card" style={{ padding: "12px 16px", display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <Icon d={I.search} size={16} />
        <input style={{ flex: 1, border: "none", outline: "none", font: "inherit", background: "transparent", fontSize: 14 }} placeholder="搜索姓名 / 邮箱 / 城市" />
        <select className="input" style={{ height: 36, width: 130, fontSize: 13, padding: "0 10px" }}>
          <option>全部状态</option>
        </select>
        <select className="input" style={{ height: 36, width: 130, fontSize: 13, padding: "0 10px" }}>
          <option>全部城市</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr><th>姓名</th><th>城市</th><th>服务</th><th>评分</th><th>派单</th><th>状态</th><th>加入</th><th></th></tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.name}>
                <td><div className="flex center gap-3"><span className="avatar-circle" style={{ width: 32, height: 32, fontSize: 13, background: "#3D9970" }}>{p.name.charAt(0)}</span><span className="bold">{p.name}</span></div></td>
                <td>{p.city}</td>
                <td className="t-sec">{p.cat}</td>
                <td className="tabular">{p.rating ? `★ ${p.rating}` : "—"}</td>
                <td className="tabular">{p.jobs}</td>
                <td><span className={"sbadge " + stateCfg3[p.state].cls}>{stateCfg3[p.state].lbl}</span></td>
                <td className="t-sec fs-13 tabular">{p.joined}</td>
                <td><button className="icon-btn" style={{ width: 32, height: 32 }}><Icon d={I.more} size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
};

/* ============================================================
   7) PROVIDER COMPLIANCE WORKBENCH
   ============================================================ */
const ProviderComplianceWB = () => (
  <AdminShell activeNav="providers" breadcrumb="服务者 / 王·小红 / 审核">
    <div className="flex between" style={{ marginBottom: 20 }}>
      <div className="flex center gap-3">
        <span className="avatar-circle" style={{ width: 56, height: 56, fontSize: 22, background: "#A36BD8" }}>王</span>
        <div>
          <h1 className="h1" style={{ fontSize: 26, margin: 0 }}>王 · 小红</h1>
          <div className="t-sec fs-14" style={{ marginTop: 4 }}>Brisbane · 家居保洁 · 提交于 2026-05-12 14:08</div>
        </div>
      </div>
      <div className="flex gap-2">
        <button className="btn btn--secondary btn--sm">退回补充</button>
        <button className="btn btn--danger btn--sm">拒绝</button>
        <button className="btn btn--primary btn--sm">批准 · 上线</button>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
      <div className="card" style={{ padding: 22 }}>
        <div className="bold fs-15" style={{ marginBottom: 14 }}>基本资料</div>
        {[
          ["姓名", "王 · 小红"],
          ["手机", "+61 421 ··· ···"],
          ["邮箱", "xiaohong.w@gmail.com"],
          ["出生", "1985"],
          ["语言", "中文 · English"],
          ["自述", "5 年家庭清洁经验 …"],
        ].map(([k, v]) => (
          <div key={k} className="flex" style={{ padding: "8px 0", fontSize: 14 }}>
            <span className="t-sec" style={{ width: 80 }}>{k}</span>
            <span className="bold" style={{ flex: 1 }}>{v}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div className="bold fs-15" style={{ marginBottom: 14 }}>背景核查 · 自动</div>
        {[
          ["身份证 OCR 匹配", "ok"],
          ["护照号 · 政府数据库", "ok"],
          ["Police Check · ACIC", "ok"],
          ["WWVP 注册号 · NSW", "review"],
          ["税号 · ATO", "ok"],
          ["Stripe 实名", "pending"],
        ].map(([k, s]) => {
          const cfg = { ok: ["通过", "var(--success)", I.verified], review: ["待复核", "var(--warning)", I.alert], pending: ["未完成", "var(--text-tertiary)", I.clock] }[s];
          return (
            <div key={k} className="flex between center" style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <span className="fs-14">{k}</span>
              <span className="flex center gap-2 fs-13 semibold" style={{ color: cfg[1] }}>
                <Icon d={cfg[2]} size={15} />{cfg[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>

    <div className="card" style={{ padding: 22 }}>
      <div className="bold fs-15" style={{ marginBottom: 14 }}>已上传证件 · 4 份</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {["护照", "Police Check", "WWVP", "保险"].map((n, i) => (
          <div key={n} className="card card--inset" style={{ padding: 12 }}>
            <div style={{ aspectRatio: "3/4", borderRadius: 8, background: "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", marginBottom: 8 }}>
              <Icon d={I.shield} size={32} />
            </div>
            <div className="bold fs-13">{n}</div>
            <div className="t-ter fs-11" style={{ marginTop: 2 }}>{["passport.pdf", "police_2026.pdf", "wwvp.png", "insurance.pdf"][i]}</div>
            <button className="t-brand fs-12 semibold" style={{ background: "none", border: "none", padding: 0, marginTop: 6 }}>查看 →</button>
          </div>
        ))}
      </div>
    </div>
  </AdminShell>
);

/* ============================================================
   8) CUSTOMERS LIST + DETAIL
   ============================================================ */
const CustomersListPage = () => (
  <AdminShell activeNav="customers">
    <div className="flex between center" style={{ marginBottom: 20 }}>
      <div>
        <h1 className="h1" style={{ fontSize: 28, margin: 0 }}>顾客</h1>
        <div className="t-sec fs-14" style={{ marginTop: 4 }}>3,142 位活跃 · 14% 周环比</div>
      </div>
      <button className="btn btn--secondary btn--sm"><Icon d={I.download} size={14} />导出</button>
    </div>

    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <table className="table">
        <thead>
          <tr><th>姓名</th><th>城市</th><th>年龄</th><th>下单</th><th>消费</th><th>SOS</th><th>状态</th><th></th></tr>
        </thead>
        <tbody>
          {[
            ["玛格丽特 · 陈", "Sydney", 75, 32, 2480, 0, "active"],
            ["约翰 · 史密斯", "Sydney", 81, 18, 1320, 1, "active"],
            ["丽萍 · 黄", "Melbourne", 68, 47, 4960, 0, "active"],
            ["Elaine · Wong", "Sydney", 79, 22, 1840, 2, "flag"],
            ["David · Liu", "Brisbane", 72, 11, 820, 0, "active"],
            ["Sarah · Chen", "Perth", 65, 8, 620, 0, "new"],
          ].map(([n, c, a, o, s, sos, st]) => (
            <tr key={n}>
              <td><div className="flex center gap-3"><span className="avatar-circle" style={{ width: 32, height: 32, fontSize: 13, background: "#5B8DEF" }}>{n.charAt(0)}</span><span className="bold">{n}</span></div></td>
              <td>{c}</td>
              <td className="tabular">{a}</td>
              <td className="tabular">{o}</td>
              <td className="tabular">${s.toLocaleString()}</td>
              <td className="tabular">{sos > 0 ? <span className="chip chip--danger fs-12">{sos}</span> : <span className="t-ter">—</span>}</td>
              <td><span className={"sbadge " + (st === "flag" ? "chip--warn" : st === "new" ? "chip--brand" : "chip--success")}>{st === "flag" ? "关注" : st === "new" ? "新用户" : "正常"}</span></td>
              <td><button className="icon-btn" style={{ width: 32, height: 32 }}><Icon d={I.more} size={14} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </AdminShell>
);

const CustomerDetailPage = () => (
  <AdminShell activeNav="customers" breadcrumb="顾客 / 玛格丽特 · 陈">
    <div className="flex between" style={{ marginBottom: 20 }}>
      <div className="flex center gap-3">
        <span className="avatar-circle" style={{ width: 60, height: 60, fontSize: 22, background: "#5B8DEF" }}>玛</span>
        <div>
          <h1 className="h1" style={{ fontSize: 26, margin: 0 }}>玛格丽特 · 陈</h1>
          <div className="t-sec fs-14" style={{ marginTop: 4 }}>75 岁 · Sydney · 注册 14 个月</div>
        </div>
      </div>
      <div className="flex gap-2">
        <button className="btn btn--secondary btn--sm">联系</button>
        <button className="btn btn--secondary btn--sm">导出数据</button>
        <button className="btn btn--danger btn--sm">封禁账户</button>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
      <Kpi label="累计下单" value="32" sub="本月 5" trend="+25%" />
      <Kpi label="累计消费" value="$2,480" sub="客单价 $77.50" />
      <Kpi label="完成率" value="100%" sub="无取消" />
      <Kpi label="SOS 触发" value="0" sub="" />
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
      <div className="card" style={{ padding: 22 }}>
        <div className="bold fs-15" style={{ marginBottom: 14 }}>最近预订</div>
        <table className="table">
          <thead><tr><th>编号</th><th>服务</th><th>服务者</th><th>金额</th><th>状态</th></tr></thead>
          <tbody>
            <tr><td className="tabular t-brand">B-94c1f0a8</td><td>家居保洁</td><td>梅 · 张</td><td className="tabular">$240</td><td><span className="sbadge chip--danger">纠纷中</span></td></tr>
            <tr><td className="tabular t-brand">B-83de019f</td><td>上门做饭</td><td>Lily · Chen</td><td className="tabular">$88</td><td><span className="sbadge chip--success">完成</span></td></tr>
            <tr><td className="tabular t-brand">B-72c9f3a1</td><td>家居保洁</td><td>梅 · 张</td><td className="tabular">$135</td><td><span className="sbadge chip--success">完成</span></td></tr>
          </tbody>
        </table>
      </div>
      <div className="card" style={{ padding: 22 }}>
        <div className="bold fs-15" style={{ marginBottom: 14 }}>个人 & 紧急联系人</div>
        {[
          ["邮箱", "margaret@example.com"],
          ["手机", "+61 433 ··· ···"],
          ["地址", "12 Liverpool St, Burwood NSW"],
          ["女儿 Sarah", "+61 422 ··· ···"],
          ["儿子 Michael", "+61 411 ··· ···"],
          ["家庭医生", "Dr. Patel · BWMC"],
        ].map(([k, v]) => (
          <div key={k} className="flex" style={{ padding: "7px 0", fontSize: 13 }}>
            <span className="t-sec" style={{ width: 90 }}>{k}</span>
            <span className="bold" style={{ flex: 1 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  </AdminShell>
);

/* ============================================================
   9) REFUNDS
   ============================================================ */
const RefundsPage = () => (
  <AdminShell activeNav="refunds">
    <div className="flex between center" style={{ marginBottom: 20 }}>
      <div>
        <h1 className="h1" style={{ fontSize: 28, margin: 0 }}>退款</h1>
        <div className="t-sec fs-14" style={{ marginTop: 4 }}>3 待执行 · 本月总额 $3,420</div>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 22 }}>
      <Kpi label="本月退款额" value="$3,420" sub="占 GMV 1.8%" />
      <Kpi label="平均处理时长" value="6.2h" sub="SLA 24h" trend="-2.1h" />
      <Kpi label="待执行" value="3" sub="$724.00" />
    </div>

    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <table className="table">
        <thead>
          <tr><th>编号</th><th>关联</th><th>顾客</th><th>金额</th><th>原因</th><th>状态</th><th>创建</th></tr>
        </thead>
        <tbody>
          {[
            ["R-3492", "D-8a4f29c1", "玛格丽特", 120, "纠纷部分退款", "pending", "5月13日"],
            ["R-3491", "B-72a91d8e", "Elaine", 240, "服务者取消", "executing", "5月13日"],
            ["R-3490", "D-3b9e07d2", "约翰", 156, "纠纷全额退款", "executing", "5月12日"],
            ["R-3489", "B-58a01c2a", "David", 88, "顾客取消 · 24h 前", "done", "5月12日"],
            ["R-3488", "B-49e2f0b1", "Sarah", 320, "服务质量问题", "done", "5月11日"],
            ["R-3487", "D-1c8a23ef", "Lily", 208, "纠纷裁决", "rejected", "5月10日"],
          ].map(([id, ref, c, a, r, s, t]) => {
            const cfg = { pending: ["待执行", "chip--warn"], executing: ["执行中", "chip--brand"], done: ["完成", "chip--success"], rejected: ["驳回", ""] }[s];
            return (
              <tr key={id}>
                <td><span className="bold tabular t-brand">{id}</span></td>
                <td><span className="tabular t-sec fs-13">{ref}</span></td>
                <td>{c}</td>
                <td className="tabular bold">${a}.00</td>
                <td className="t-sec">{r}</td>
                <td><span className={"sbadge " + cfg[1]}>{cfg[0]}</span></td>
                <td className="t-sec fs-13">{t}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </AdminShell>
);

/* ============================================================
   10) FINANCE
   ============================================================ */
const FinancePage = () => (
  <AdminShell activeNav="payments">
    <div className="flex between center" style={{ marginBottom: 20 }}>
      <div>
        <h1 className="h1" style={{ fontSize: 28, margin: 0 }}>财务</h1>
        <div className="t-sec fs-14" style={{ marginTop: 4 }}>本月 · 2026年5月</div>
      </div>
      <div className="flex gap-2">
        <select className="input" style={{ height: 36, width: 140, fontSize: 13, padding: "0 10px" }}><option>本月</option></select>
        <button className="btn btn--secondary btn--sm"><Icon d={I.download} size={14} />对账单</button>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
      <Kpi label="GMV" value="$192,840" sub="" trend="+12.1%" accent />
      <Kpi label="平台抽成 12%" value="$23,141" sub="" trend="+11.8%" />
      <Kpi label="服务者结算" value="$169,699" sub="待结算 $42k" />
      <Kpi label="退款" value="$3,420" sub="1.8% of GMV" />
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, marginBottom: 16 }}>
      <div className="card" style={{ padding: 22 }}>
        <div className="bold fs-15" style={{ marginBottom: 14 }}>资金流</div>
        <table className="table">
          <thead><tr><th>日期</th><th>类型</th><th>对方</th><th style={{ textAlign: "right" }}>金额</th><th>状态</th></tr></thead>
          <tbody>
            <tr><td className="tabular">5月13日</td><td>Stripe 结算</td><td className="t-sec">服务者批量 · 32 笔</td><td className="tabular bold" style={{ textAlign: "right", color: "var(--danger)" }}>-$8,420.00</td><td><span className="sbadge chip--brand">处理中</span></td></tr>
            <tr><td className="tabular">5月13日</td><td>顾客支付</td><td className="t-sec">日汇总 · 87 笔</td><td className="tabular bold" style={{ textAlign: "right", color: "var(--success)" }}>+$6,320.00</td><td><span className="sbadge chip--success">入账</span></td></tr>
            <tr><td className="tabular">5月13日</td><td>退款</td><td className="t-sec">R-3490</td><td className="tabular bold" style={{ textAlign: "right", color: "var(--danger)" }}>-$156.00</td><td><span className="sbadge chip--success">完成</span></td></tr>
            <tr><td className="tabular">5月12日</td><td>捐款</td><td className="t-sec">日汇总 · 14 笔</td><td className="tabular bold" style={{ textAlign: "right", color: "var(--success)" }}>+$680.00</td><td><span className="sbadge chip--success">入账</span></td></tr>
          </tbody>
        </table>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div className="bold fs-15" style={{ marginBottom: 14 }}>对账</div>
        <div className="card card--inset" style={{ padding: 14, marginBottom: 10 }}>
          <div className="t-sec fs-12 semibold">银行余额（CBA 商户）</div>
          <div className="h1 tabular" style={{ fontSize: 26 }}>$48,720.30</div>
          <div className="chip chip--success fs-12" style={{ marginTop: 6 }}>已对平 · 7 秒前</div>
        </div>
        <div className="card card--inset" style={{ padding: 14, marginBottom: 10 }}>
          <div className="t-sec fs-12 semibold">应付服务者</div>
          <div className="h1 tabular" style={{ fontSize: 22 }}>$42,180.00</div>
          <div className="t-sec fs-12" style={{ marginTop: 4 }}>下周一结算</div>
        </div>
        <div className="card card--inset" style={{ padding: 14 }}>
          <div className="t-sec fs-12 semibold">托管中</div>
          <div className="h1 tabular" style={{ fontSize: 22 }}>$2,840.00</div>
          <div className="t-sec fs-12" style={{ marginTop: 4 }}>未完结订单</div>
        </div>
      </div>
    </div>
  </AdminShell>
);

/* ============================================================
   11) REVIEWS MODERATION
   ============================================================ */
const ReviewsModerationPage = () => (
  <AdminShell activeNav="reports">
    <div className="flex between center" style={{ marginBottom: 20 }}>
      <div>
        <h1 className="h1" style={{ fontSize: 28, margin: 0 }}>评价审核</h1>
        <div className="t-sec fs-14" style={{ marginTop: 4 }}>5 条被举报 · SLA 48h</div>
      </div>
    </div>

    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[
        { author: "约翰 · 史密斯", target: "梅 · 张", stars: 1, body: "她偷了我的金链子！", reporter: "服务者举报：失实", flags: 3 },
        { author: "Sarah · Chen", target: "Tom · Lin", stars: 5, body: "Best gardener in Sydney. Call him +61 433 xxx", reporter: "AI 标记：含联系方式", flags: 1 },
        { author: "Bob · Zhou", target: "Anna · Wang", stars: 2, body: "护士态度有点冷淡，下次不会再约了。", reporter: "服务者举报：恶意差评", flags: 1 },
      ].map((r, i) => (
        <div key={i} className="card" style={{ padding: 22 }}>
          <div className="flex between" style={{ marginBottom: 12 }}>
            <div className="flex center gap-3">
              <span className="avatar-circle" style={{ width: 40, height: 40, fontSize: 16, background: "#5B8DEF" }}>{r.author.charAt(0)}</span>
              <div>
                <div className="bold fs-15">{r.author} → {r.target}</div>
                <div className="t-ter fs-12">{r.flags} 次举报 · 2 天前</div>
              </div>
            </div>
            <div className="flex center gap-2">
              <span className="chip chip--warn fs-12">{r.reporter}</span>
              <span className="flex" style={{ color: "#E0A800" }}>
                {Array.from({ length: r.stars }).map((_, i) => <Icon key={i} d={I.star_fill.d} size={14} fill="currentColor" stroke={0} />)}
                {Array.from({ length: 5 - r.stars }).map((_, i) => <Icon key={i} d={I.star_fill.d} size={14} stroke={0} fill="var(--bg-surface-2)" />)}
              </span>
            </div>
          </div>
          <div className="card card--inset" style={{ padding: 14, marginBottom: 14, fontSize: 14, lineHeight: 1.55 }}>
            "{r.body}"
          </div>
          <div className="flex gap-2">
            <button className="btn btn--secondary btn--sm">查看完整对话</button>
            <span style={{ flex: 1 }} />
            <button className="btn btn--secondary btn--sm">保留</button>
            <button className="btn btn--secondary btn--sm">编辑（如个人信息）</button>
            <button className="btn btn--danger btn--sm">删除评价</button>
          </div>
        </div>
      ))}
    </div>
  </AdminShell>
);

/* ============================================================
   12) BOOKINGS MONITOR
   ============================================================ */
const BookingsMonitorPage = () => (
  <AdminShell activeNav="bookings">
    <div className="flex between center" style={{ marginBottom: 20 }}>
      <div>
        <h1 className="h1" style={{ fontSize: 28, margin: 0 }}>预订监控</h1>
        <div className="t-sec fs-14" style={{ marginTop: 4 }}>实时 · 87 个进行中</div>
      </div>
      <div className="flex gap-2">
        <span className="chip chip--success fs-13">● 实时</span>
        <button className="btn btn--secondary btn--sm">筛选</button>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 22 }}>
      <Kpi label="今日新增" value="124" sub="周环比 +8%" trend="+8%" />
      <Kpi label="进行中" value="87" sub="" />
      <Kpi label="今日完成" value="68" sub="" />
      <Kpi label="今日取消" value="12" sub="占比 8.6%" />
      <Kpi label="待支付" value="3" sub="超 30 分钟" />
    </div>

    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <table className="table">
        <thead>
          <tr><th>编号</th><th>顾客</th><th>服务者</th><th>服务</th><th>时间</th><th>金额</th><th>状态</th></tr>
        </thead>
        <tbody>
          {[
            ["B-94c1f0a8", "玛格丽特", "梅·张", "保洁 2h", "今天 10:00", 240, "completed"],
            ["B-83de019f", "约翰", "Anna·Wang", "护理 1h", "今天 13:30", 70, "in_progress"],
            ["B-72c9f3a1", "丽萍", "梅·张", "保洁 3h", "今天 16:00", 135, "confirmed"],
            ["B-61a9f2c8", "Elaine", "Tom·Lin", "花园 4h", "今天 09:00", 168, "in_progress"],
            ["B-58a01c2a", "David", "Lily·Chen", "做饭 2h", "今天 11:30", 88, "completed"],
            ["B-49e2f0b1", "Sarah", "Bob·Zhou", "维修 1h", "今天 15:00", 60, "pending_payment"],
          ].map(([id, c, p, s, t, a, st]) => {
            const cfg = { confirmed: ["已确认", "chip--brand"], in_progress: ["进行中", "chip--success"], completed: ["完成", "chip--success"], pending_payment: ["待支付", "chip--warn"] }[st];
            return (
              <tr key={id}>
                <td><span className="bold tabular t-brand">{id}</span></td>
                <td>{c}</td>
                <td>{p}</td>
                <td className="t-sec">{s}</td>
                <td className="tabular t-sec fs-13">{t}</td>
                <td className="tabular bold">${a}</td>
                <td><span className={"sbadge " + cfg[1]}>{cfg[0]}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </AdminShell>
);

/* ============================================================
   13) AI AUDIT
   ============================================================ */
const AIAuditPage = () => (
  <AdminShell activeNav="ai">
    <div className="flex between center" style={{ marginBottom: 20 }}>
      <div>
        <h1 className="h1" style={{ fontSize: 28, margin: 0 }}>AI 对话审计</h1>
        <div className="t-sec fs-14" style={{ marginTop: 4 }}>过去 24h · 487 次对话 · 12 次升级人工</div>
      </div>
      <div className="flex gap-2">
        <button className="btn btn--secondary btn--sm">导出</button>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
      <Kpi label="今日对话" value="487" sub="" trend="+12%" />
      <Kpi label="自助解决率" value="76%" sub="" trend="+4%" />
      <Kpi label="升级人工" value="12" sub="2.5% 比例" />
      <Kpi label="平均满意度" value="4.4" sub="★ · 392 条" />
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16 }}>
      <div className="card" style={{ padding: 22 }}>
        <div className="bold fs-15" style={{ marginBottom: 12 }}>最近对话</div>
        {[
          { u: "玛格丽特", msg: "怎么取消明天的预订？", flag: false, time: "刚刚" },
          { u: "约翰", msg: "AI 推荐了不在服务区的服务者", flag: true, time: "12m" },
          { u: "Sarah", msg: "想看保洁服务的报价", flag: false, time: "23m" },
          { u: "Elaine", msg: "SOS · 已升级为安全事件", flag: true, time: "1h" },
          { u: "David", msg: "如何修改紧急联系人？", flag: false, time: "2h" },
        ].map((c, i) => (
          <div key={i} className={"flex center gap-3 " + (c.flag ? "" : "")} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
            <span className="avatar-circle" style={{ width: 32, height: 32, fontSize: 13, background: "#5B8DEF" }}>{c.u.charAt(0)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex between center" style={{ marginBottom: 2 }}>
                <span className="bold fs-13">{c.u}</span>
                <span className="t-ter fs-11">{c.time}</span>
              </div>
              <div className="t-sec fs-12" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.msg}</div>
            </div>
            {c.flag && <span className="badge-dot" style={{ color: "var(--danger)" }} />}
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div className="flex between center" style={{ marginBottom: 14 }}>
          <div className="bold fs-15">约翰 · 史密斯 → AI · 12 分钟前</div>
          <span className="chip chip--warn fs-12">已升级</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 360, overflowY: "auto" }}>
          {[
            { role: "user", text: "我想预订下周二早上的保洁。" },
            { role: "ai", text: "好的，您当前位置 Brisbane CBD，下周二早上推荐 3 位服务者，最近的是 Bob · Zhou。" },
            { role: "user", text: "Bob 评分多少？" },
            { role: "ai", text: "Bob 评分 3.2，距您 28 公里。" },
            { role: "admin", text: "⚠ Flag: 推荐了 25km 外、评分低于 3.5 的服务者", flag: true },
          ].map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === "user" ? "flex-end" : m.role === "ai" ? "flex-start" : "stretch",
              maxWidth: m.role === "admin" ? "100%" : "75%",
              background: m.role === "user" ? "var(--brand)" : m.role === "ai" ? "var(--bg-surface-2)" : "var(--warning-soft)",
              color: m.role === "user" ? "#fff" : m.role === "admin" ? "var(--warning)" : "var(--text-primary)",
              padding: "10px 14px",
              borderRadius: 14,
              fontSize: 13,
              lineHeight: 1.5,
              border: m.flag ? "1px dashed var(--warning)" : "none",
            }}>{m.text}</div>
          ))}
        </div>
        <div className="flex gap-2" style={{ marginTop: 14 }}>
          <button className="btn btn--secondary btn--sm" style={{ flex: 1 }}>标记错误回复</button>
          <button className="btn btn--primary btn--sm" style={{ flex: 1 }}>已分配人工</button>
        </div>
      </div>
    </div>
  </AdminShell>
);

/* ============================================================
   14) AI KNOWLEDGE BASE
   ============================================================ */
const AIKnowledgePage = () => (
  <AdminShell activeNav="ai" breadcrumb="AI / 知识库">
    <div className="flex between center" style={{ marginBottom: 20 }}>
      <div>
        <h1 className="h1" style={{ fontSize: 28, margin: 0 }}>知识库</h1>
        <div className="t-sec fs-14" style={{ marginTop: 4 }}>148 条规则 · AI 推荐基于此</div>
      </div>
      <div className="flex gap-2">
        <button className="btn btn--secondary btn--sm">导入 CSV</button>
        <button className="btn btn--primary btn--sm"><Icon d={I.plus} size={14} />新增规则</button>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16 }}>
      <div className="card" style={{ padding: 12 }}>
        {[
          ["全部", 148, true],
          ["服务推荐", 42, false],
          ["定价规则", 18, false],
          ["禁言词", 26, false],
          ["紧急关键词", 14, false],
          ["FAQ 自动答复", 48, false],
        ].map(([n, c, on]) => (
          <div key={n} className={"sidenav-item " + (on ? "active" : "")}>
            <span style={{ flex: 1 }}>{n}</span>
            <span className="t-ter fs-12 tabular">{c}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="table">
          <thead><tr><th>名称</th><th>类型</th><th>触发条件</th><th>动作</th><th>更新</th><th></th></tr></thead>
          <tbody>
            {[
              ["距离 ≤ 10km 优先", "排序规则", "search.distance ≤ 10", "boost 1.5×", "2 天前"],
              ["SOS 关键词", "升级", '"救命"|"危险"|"伤害"', "立即升级人工 + 警报", "1 周前"],
              ["最低评分门槛", "排序规则", "rating < 3.5", "不推荐", "1 周前"],
              ["分享联系方式", "禁言", "phone | wechat | email", "拦截并提示", "3 天前"],
              ["如何取消订单", "FAQ", "match: cancel | 取消", "返回 KB-018", "5 天前"],
              ["WWVP 必填", "规则", "service ∈ care_categories", "要求服务者出示 WWVP", "1 个月前"],
            ].map(([n, t, c, a, u]) => (
              <tr key={n}>
                <td><span className="bold">{n}</span></td>
                <td><span className="chip fs-12">{t}</span></td>
                <td className="t-sec fs-13" style={{ fontFamily: "var(--font-mono)" }}>{c}</td>
                <td className="t-sec fs-13">{a}</td>
                <td className="t-ter fs-13">{u}</td>
                <td><button className="icon-btn" style={{ width: 32, height: 32 }}><Icon d={I.more} size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </AdminShell>
);

/* ============================================================
   15) SETTINGS
   ============================================================ */
const AdminSettingsPage = () => (
  <AdminShell activeNav="settings">
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24 }}>
      <div className="card" style={{ padding: 12, alignSelf: "start" }}>
        {[["平台基本", true], ["计费规则", false], ["服务者门槛", false], ["管理员权限", false], ["集成", false], ["审计日志", false]].map(([n, on]) => (
          <div key={n} className={"sidenav-item " + (on ? "active" : "")}>{n}</div>
        ))}
      </div>

      <div>
        <h1 className="h1" style={{ fontSize: 28, margin: 0, marginBottom: 6 }}>平台基本</h1>
        <div className="t-sec fs-14" style={{ marginBottom: 20 }}>整站通用配置</div>

        <div className="card" style={{ padding: 22, marginBottom: 14 }}>
          <div className="bold fs-15" style={{ marginBottom: 14 }}>品牌与文案</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div><label className="label">平台名称</label><input className="input" defaultValue="SilverConnect" /></div>
            <div><label className="label">客服邮箱</label><input className="input" defaultValue="hello@silverconnect.com.au" /></div>
            <div><label className="label">支持电话</label><input className="input" defaultValue="1800 SILVER" /></div>
            <div><label className="label">默认国家</label><input className="input" defaultValue="AU" /></div>
          </div>
        </div>

        <div className="card" style={{ padding: 22, marginBottom: 14 }}>
          <div className="bold fs-15" style={{ marginBottom: 14 }}>服务区域</div>
          <div className="flex gap-2" style={{ flexWrap: "wrap", marginBottom: 12 }}>
            {["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Canberra"].map((c) => (
              <span key={c} className="chip chip--brand fs-13" style={{ padding: "6px 12px" }}>{c} <span style={{ marginLeft: 4, opacity: 0.6 }}>×</span></span>
            ))}
          </div>
          <button className="dotted-cta"><Icon d={I.plus} size={14} />新增城市</button>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div className="bold fs-15" style={{ marginBottom: 14 }}>开关</div>
          {[
            ["开放新顾客注册", true],
            ["开放新服务者注册", true],
            ["允许境外信用卡", false],
            ["接受捐款", true],
            ["显示在 Google 搜索", true],
            ["维护模式（首页 503）", false],
          ].map(([k, on]) => (
            <div key={k} className="flex between center" style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
              <span className="fs-14">{k}</span>
              <label style={{ position: "relative", display: "inline-block", width: 44, height: 26 }}>
                <input type="checkbox" defaultChecked={on} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: "absolute", inset: 0, background: on ? "var(--brand)" : "var(--bg-surface-2)", borderRadius: 999 }} />
                <span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 20, height: 20, background: "#fff", borderRadius: 999, transition: "left 0.15s" }} />
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  </AdminShell>
);

/* ============================================================
   16) ADMIN LOGIN
   ============================================================ */
const AdminLoginPage = () => (
  <div className="frame" style={{ background: "var(--bg-base)" }}>
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
      <div style={{ width: 420, display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <span className="brand-dot" style={{ width: 56, height: 56, borderRadius: 18, fontSize: 28 }}>S</span>
          <h1 className="h1" style={{ fontSize: 26, margin: 0, textAlign: "center" }}>SilverConnect Admin</h1>
          <p style={{ color: "var(--text-secondary)", margin: 0, textAlign: "center", fontSize: 14 }}>仅授权员工 · 启用 2FA</p>
        </div>

        <div className="card" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
          <div><label className="label">公司邮箱</label><input className="input" defaultValue="admin@silverconnect.com.au" /></div>
          <div><label className="label">密码</label><input className="input" type="password" defaultValue="••••••••••" /></div>
          <div><label className="label">2FA 6 位验证码</label>
            <div className="flex gap-2">
              {["3", "8", "2", "9", "·", "·"].map((d, i) => (
                <input key={i} className="input" defaultValue={d === "·" ? "" : d} style={{ width: 48, height: 56, textAlign: "center", fontSize: 22, fontWeight: 700 }} />
              ))}
            </div>
          </div>
          <button className="btn btn--primary btn--block">登录</button>
        </div>

        <div className="banner banner--info">
          <Icon d={I.shield} size={16} />
          <div className="fs-12">所有登录会被记录。IP 与设备会通过 Slack 通知到 #admin-audit。</div>
        </div>
      </div>
    </div>
  </div>
);

Object.assign(window, {
  AdminOverview, AnalyticsPage, DisputeDetailPage,
  SafetyListPage, SafetyDetailPage,
  ProvidersListPage, ProviderComplianceWB,
  CustomersListPage, CustomerDetailPage,
  RefundsPage, FinancePage, ReviewsModerationPage, BookingsMonitorPage,
  AIAuditPage, AIKnowledgePage,
  AdminSettingsPage, AdminLoginPage,
});
