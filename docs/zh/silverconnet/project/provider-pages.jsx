/* global React */
const { useState: useStateP } = React;

/* helpers reused from chrome */
const PAv = ({ name, size = 44, color }) => {
  const colors = ["#5B8DEF", "#3D9970", "#A36BD8", "#D2A036", "#C25A78"];
  const bg = color || colors[name.charCodeAt(0) % 5];
  return <span className="avatar-circle" style={{ width: size, height: size, fontSize: size * 0.4, background: bg, flexShrink: 0 }}>{name.charAt(0)}</span>;
};

const PageHead = ({ title, sub, back = true, right = null }) => (
  <div className="appheader">
    <div className="flex center gap-3">
      {back && <button className="icon-btn" aria-label="back"><Icon d={I.arrowLeft} /></button>}
      <div>
        <div className="bold fs-18" style={{ lineHeight: 1.2 }}>{title}</div>
        {sub && <div className="t-ter fs-12">{sub}</div>}
      </div>
    </div>
    <div className="header-right">{right || <button className="icon-btn"><Icon d={I.more} /></button>}</div>
  </div>
);

/* ============================================================
   1) ONBOARDING WIZARD — 5 steps
   ============================================================ */
const ONBOARD_STEPS = [
  { k: "basic", label: "基本资料", icon: I.user },
  { k: "skills", label: "技能服务", icon: I.briefcase },
  { k: "docs", label: "证件资料", icon: I.shield },
  { k: "payout", label: "收款账号", icon: I.wallet },
  { k: "review", label: "提交审核", icon: I.verified },
];

const StepHeader = ({ step }) => (
  <div style={{ padding: "20px 20px 8px" }}>
    <div className="flex between" style={{ marginBottom: 18 }}>
      {ONBOARD_STEPS.map((s, i) => (
        <div key={s.k} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 999,
            background: i < step ? "var(--brand)" : i === step ? "var(--brand)" : "var(--bg-surface-2)",
            color: i <= step ? "#fff" : "var(--text-tertiary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800,
            border: i === step ? "3px solid var(--brand-soft)" : "none",
          }}>
            {i < step ? "✓" : i + 1}
          </div>
          <div className="fs-12 semibold" style={{ color: i <= step ? "var(--text-primary)" : "var(--text-tertiary)", textAlign: "center" }}>{s.label}</div>
        </div>
      ))}
    </div>
    <div style={{ height: 3, background: "var(--bg-surface-2)", borderRadius: 999, position: "relative", overflow: "hidden" }}>
      <div style={{ width: `${((step + 1) / 5) * 100}%`, height: "100%", background: "var(--brand)", borderRadius: 999, transition: "width 0.3s" }} />
    </div>
  </div>
);

const WizardShell = ({ step, title, sub, body, primary = "下一步" }) => (
  <div className="frame">
    <StatusBar />
    <PageHead title="服务者入驻" sub={`第 ${step + 1} 步 / 共 5 步`} right={<button className="btn btn--ghost btn--sm">退出</button>} />
    <StepHeader step={step} />
    <div className="page-main" style={{ paddingTop: 8 }}>
      <h2 className="h1" style={{ fontSize: 24, margin: "8px 0 6px" }}>{title}</h2>
      {sub && <div className="t-sec fs-14" style={{ marginBottom: 20, lineHeight: 1.5 }}>{sub}</div>}
      {body}
    </div>
    <div style={{ padding: "12px 20px 24px", borderTop: "1px solid var(--border)", background: "var(--bg-surface)", display: "flex", gap: 10 }}>
      {step > 0 && <button className="btn btn--secondary" style={{ flex: 1 }}>上一步</button>}
      <button className="btn btn--primary" style={{ flex: 2 }}>{primary} <Icon d={I.arrowRight} size={16} /></button>
    </div>
  </div>
);

const OnboardStep1 = () => (
  <WizardShell step={0} title="先认识一下你" sub="这些信息会出现在你的公开档案里。" body={
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <PAv name="梅" size={72} color="#3D9970" />
        <div style={{ flex: 1 }}>
          <div className="bold fs-14" style={{ marginBottom: 4 }}>头像</div>
          <button className="btn btn--secondary btn--sm">上传照片</button>
        </div>
      </div>
      <div><label className="label">姓名</label><input className="input" defaultValue="梅 · 张" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div><label className="label">手机号</label><input className="input" defaultValue="+61 4·· ··· ···" /></div>
        <div><label className="label">出生年份</label><input className="input" defaultValue="1972" /></div>
      </div>
      <div><label className="label">服务城市</label><input className="input" defaultValue="Sydney, NSW" /></div>
      <div><label className="label">自我介绍</label>
        <textarea className="input" style={{ height: 96, padding: "12px 16px", resize: "none" }} defaultValue="拥有 8 年家庭保洁经验，注重细节，能与长者沟通好。普通话/粤语/英语。" />
      </div>
    </div>
  } />
);

const SkillTile = ({ emoji, name, checked }) => (
  <label className="card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderColor: checked ? "var(--brand)" : "var(--border)", background: checked ? "var(--brand-soft)" : "var(--bg-surface)" }}>
    <span className="cat-tile-emoji" style={{ background: "#fff", width: 38, height: 38, fontSize: 20 }}>{emoji}</span>
    <span className="bold fs-15" style={{ flex: 1 }}>{name}</span>
    <input type="checkbox" defaultChecked={checked} style={{ width: 22, height: 22, accentColor: "var(--brand)" }} />
  </label>
);

const OnboardStep2 = () => (
  <WizardShell step={1} title="你能提供哪些服务？" sub="可选多项。之后还能再调整价格与时长。" body={
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="bold fs-14" style={{ color: "var(--text-secondary)" }}>已选 2 项 · 至少 1 项</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <SkillTile emoji="🧹" name="家居保洁" checked={true} />
        <SkillTile emoji="🍳" name="上门做饭" checked={true} />
        <SkillTile emoji="🌿" name="花园打理" />
        <SkillTile emoji="🤝" name="个人护理" />
        <SkillTile emoji="🔧" name="家居维修" />
        <SkillTile emoji="🚗" name="代步陪同" />
      </div>
      <div className="card card--inset" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="bold fs-14">"家居保洁" 定价</div>
        <div className="flex between center">
          <span className="t-sec fs-14">每小时收费</span>
          <span className="bold tabular fs-20">$45<span className="t-ter fs-13" style={{ fontWeight: 600 }}>/h</span></span>
        </div>
        <div style={{ height: 4, background: "var(--bg-surface)", borderRadius: 999, position: "relative" }}>
          <div style={{ position: "absolute", left: "20%", width: "30%", height: "100%", background: "var(--brand)", borderRadius: 999 }} />
          <div style={{ position: "absolute", left: "50%", top: "-4px", width: 12, height: 12, borderRadius: 999, background: "var(--brand)", transform: "translateX(-50%)" }} />
        </div>
        <div className="t-ter fs-12 tabular flex between"><span>$25</span><span>市场中位数 $48</span><span>$75</span></div>
      </div>
    </div>
  } />
);

const DocRow = ({ name, sub, state }) => {
  const stateCfg = {
    pending: { label: "未上传", cls: "chip--warn", icon: "+" },
    uploaded: { label: "已上传", cls: "chip--success", icon: "✓" },
    required: { label: "必填", cls: "chip--danger", icon: "!" },
  }[state];
  return (
    <div className="card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bg-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}><Icon d={I.shield} size={20} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="bold fs-15">{name}</div>
        <div className="t-ter fs-12">{sub}</div>
      </div>
      <span className={"sbadge " + stateCfg.cls}>{stateCfg.label}</span>
    </div>
  );
};

const OnboardStep3 = () => (
  <WizardShell step={2} title="上传证件资料" sub="所有证件由专人 24 小时内审核。审核通过前不会显示在公开档案。" body={
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <DocRow name="政府发行身份证" sub="护照 / 驾照 / Medicare 卡" state="uploaded" />
      <DocRow name="无犯罪证明" sub="NSW Police Check · 12 个月内" state="uploaded" />
      <DocRow name="Working with Vulnerable People" sub="WWVP 编号 · 必填" state="required" />
      <DocRow name="急救证书" sub="可选 · 通过可获得徽章" state="pending" />
      <DocRow name="职业责任保险" sub="$2M 公众责任 · 可选" state="pending" />
      <button className="dotted-cta"><Icon d={I.plus} size={16} />添加其他证件</button>
    </div>
  } />
);

const OnboardStep4 = () => (
  <WizardShell step={3} title="收款账号 (Stripe Connect)" sub="收益结算到此账户，需 7 个工作日内完成 Stripe 实名。" body={
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="banner banner--info"><Icon d={I.shield} size={18} /><div>SilverConnect 不存储你的银行信息。所有支付由 Stripe 处理。</div></div>
      <div><label className="label">账户类型</label>
        <div className="flex gap-2">
          <button className="btn btn--primary btn--sm" style={{ flex: 1 }}>个人</button>
          <button className="btn btn--secondary btn--sm" style={{ flex: 1 }}>公司</button>
        </div>
      </div>
      <div><label className="label">BSB</label><input className="input" defaultValue="062 000" /></div>
      <div><label className="label">账户号</label><input className="input" defaultValue="•••• 4521" /></div>
      <div><label className="label">税号 (ABN)</label><input className="input" defaultValue="11 222 333 444" /></div>
      <div className="card card--inset" style={{ padding: 12 }}>
        <div className="flex between center">
          <div>
            <div className="bold fs-14">Stripe 实名验证</div>
            <div className="t-ter fs-12">最后一步 · 由 Stripe 跳转完成</div>
          </div>
          <span className="chip chip--warn">未完成</span>
        </div>
      </div>
    </div>
  } />
);

const OnboardStep5 = () => (
  <WizardShell step={4} title="提交后会发生什么" sub="审核通常在 24 小时内完成，结果会通过短信和邮件通知。" primary="提交申请" body={
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="card" style={{ padding: 16 }}>
        <div className="bold fs-15" style={{ marginBottom: 12 }}>申请概要</div>
        {[
          ["姓名", "梅 · 张"],
          ["服务城市", "Sydney, NSW"],
          ["服务类别", "家居保洁 · 上门做饭"],
          ["已上传证件", "3 / 5"],
          ["Stripe 实名", "未完成 · 提交后处理"],
        ].map(([k, v]) => (
          <div key={k} className="flex between" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            <span className="t-sec fs-14">{k}</span>
            <span className="bold fs-14">{v}</span>
          </div>
        ))}
      </div>
      <label className="flex" style={{ alignItems: "flex-start", gap: 10, padding: 12, background: "var(--bg-surface-2)", borderRadius: 12 }}>
        <input type="checkbox" defaultChecked style={{ width: 22, height: 22, marginTop: 2, accentColor: "var(--brand)" }} />
        <span className="fs-13 t-sec" style={{ lineHeight: 1.5 }}>我已阅读并同意 <u>服务者条款</u>、<u>行为准则</u> 以及 <u>收费规则</u>（平台抽成 12%）。</span>
      </label>
    </div>
  } />
);

/* ============================================================
   2) APPLICATION STATUS — timeline
   ============================================================ */
const StatusTimeline = () => {
  const items = [
    { state: "done", title: "申请已提交", sub: "5月10日 · 14:32", body: "我们已收到你的资料。" },
    { state: "done", title: "证件审核中", sub: "5月10日 · 16:08", body: "身份证 · 无犯罪证明已通过。WWVP 待补充。" },
    { state: "current", title: "等待补充材料", sub: "需在 5月17日前", body: "请上传 Working with Vulnerable People 注册号。" },
    { state: "todo", title: "Stripe 实名", sub: "待材料补齐后", body: null },
    { state: "todo", title: "正式上线", sub: "预计 5月18日前", body: null },
  ];
  return (
    <div className="frame">
      <StatusBar />
      <PageHead title="申请进度" sub="梅 · 张" />
      <div className="page-main">
        {/* status hero */}
        <div className="card" style={{ background: "var(--warning-soft)", border: "1px solid color-mix(in oklab, var(--warning) 30%, transparent)", padding: 18, marginBottom: 18 }}>
          <div className="flex center gap-3" style={{ marginBottom: 8 }}>
            <Icon d={I.alert} size={20} style={{ color: "var(--warning)" }} />
            <span className="bold fs-16" style={{ color: "var(--warning)" }}>等待你补充 1 项材料</span>
          </div>
          <div className="t-sec fs-14" style={{ lineHeight: 1.5 }}>WWVP 注册号必填。补齐后预计 24 小时内完成最终审核。</div>
          <button className="btn btn--primary btn--block" style={{ marginTop: 14 }}>立即补充 →</button>
        </div>

        {/* timeline */}
        <div style={{ position: "relative", paddingLeft: 8 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", gap: 14, paddingBottom: 24, position: "relative" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 999,
                  background: it.state === "done" ? "var(--success)" : it.state === "current" ? "var(--brand)" : "var(--bg-surface-2)",
                  border: it.state === "current" ? "3px solid var(--brand-soft)" : "none",
                  color: it.state === "todo" ? "var(--text-tertiary)" : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 13,
                }}>{it.state === "done" ? "✓" : i + 1}</div>
                {i < items.length - 1 && <div style={{ position: "absolute", left: 13, top: 28, width: 2, height: 24, background: "var(--border)" }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div className="bold fs-15">{it.title}</div>
                <div className="t-ter fs-12" style={{ marginBottom: it.body ? 6 : 0 }}>{it.sub}</div>
                {it.body && <div className="t-sec fs-13" style={{ lineHeight: 1.55 }}>{it.body}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   3) COMPLIANCE DOCS LIBRARY
   ============================================================ */
const CompliancePage = () => {
  const docs = [
    { name: "政府发行身份证", state: "valid", expiry: "护照 · 永久" },
    { name: "无犯罪证明 (Police Check)", state: "valid", expiry: "有效期至 2026年8月" },
    { name: "WWVP 注册号", state: "review", expiry: "审核中 · 预计 24h" },
    { name: "急救证书 (First Aid)", state: "expiring", expiry: "30 天后到期 · 请续期" },
    { name: "职业责任保险", state: "missing", expiry: "未上传 · 可选" },
  ];
  const stateCfg = {
    valid: { label: "有效", cls: "chip--success" },
    review: { label: "审核中", cls: "chip--warn" },
    expiring: { label: "即将到期", cls: "chip--warn" },
    missing: { label: "未上传", cls: "" },
  };
  return (
    <div className="frame">
      <StatusBar />
      <PageHead title="证件资料库" sub="所有材料的实时状态" />
      <div className="page-main">
        {/* completion bar */}
        <div className="card" style={{ padding: 18, marginBottom: 18 }}>
          <div className="flex between center" style={{ marginBottom: 10 }}>
            <span className="bold fs-15">完整度</span>
            <span className="tabular bold fs-15">3 / 5</span>
          </div>
          <div style={{ height: 8, background: "var(--bg-surface-2)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: "60%", height: "100%", background: "var(--brand)" }} />
          </div>
          <div className="t-sec fs-13" style={{ marginTop: 10 }}>完成全部 5 项可获得 <b style={{ color: "var(--brand)" }}>"已认证"</b> 徽章，平均收单率高 32%。</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {docs.map((d) => (
            <div key={d.name} className="card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--bg-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: d.state === "expiring" ? "var(--warning)" : "var(--text-secondary)" }}>
                <Icon d={d.state === "expiring" ? I.alert : I.shield} size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="bold fs-15">{d.name}</div>
                <div className="t-ter fs-12">{d.expiry}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <span className={"sbadge " + stateCfg[d.state].cls}>{stateCfg[d.state].label}</span>
                <button className="t-brand fs-12 semibold" style={{ background: "none", border: "none", padding: 0 }}>{d.state === "missing" ? "上传" : "查看"} →</button>
              </div>
            </div>
          ))}
          <button className="dotted-cta"><Icon d={I.plus} size={16} />添加证件</button>
        </div>
      </div>
      <ProviderTabBar active="profile" />
    </div>
  );
};

/* ============================================================
   4) JOBS LIST
   ============================================================ */
const JobsListPage = () => {
  const [tab, setTab] = useStateP("incoming");
  const tabs = [["incoming", "新派单", 2], ["upcoming", "即将进行", 5], ["done", "已完成", 28]];
  const incoming = [
    { customer: "玛格丽特 · 陈", time: "明天 · 10:00 - 12:00", cat: "家居保洁 · 2小时", price: 90, dist: "2.3 km", urgent: true },
    { customer: "约翰 · 史密斯", time: "周四 · 14:00 - 15:00", cat: "个人护理 · 1小时", price: 70, dist: "4.1 km" },
  ];
  return (
    <div className="frame">
      <StatusBar />
      <AppHeader initial="梅" initialColor="#3D9970" />
      <div style={{ padding: "16px 20px 0", display: "flex", gap: 8, background: "var(--bg-base)" }}>
        {tabs.map(([k, lbl, n]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            flex: 1, padding: "10px 12px", borderRadius: 999, border: "none",
            background: tab === k ? "var(--text-primary)" : "var(--bg-surface)",
            color: tab === k ? "var(--bg-surface)" : "var(--text-primary)",
            fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            {lbl} <span style={{ opacity: 0.7, fontWeight: 600 }}>{n}</span>
          </button>
        ))}
      </div>
      <div className="page-main">
        <div className="bold fs-13 t-ter" style={{ textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>需要回应 · 24 小时倒计时</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {incoming.map((j, i) => (
            <div key={i} className="card" style={{ padding: 16, borderColor: j.urgent ? "var(--brand)" : "var(--border)", borderWidth: j.urgent ? 2 : 1 }}>
              {j.urgent && <div className="chip chip--brand" style={{ marginBottom: 10 }}><Icon d={I.clock} size={12} />剩 23h 12m</div>}
              <div className="flex between" style={{ marginBottom: 8 }}>
                <div className="flex center gap-3">
                  <PAv name={j.customer} size={40} />
                  <div>
                    <div className="bold fs-16">{j.customer}</div>
                    <div className="t-ter fs-12">合作 3 次 · ★ 5.0</div>
                  </div>
                </div>
                <div className="bold tabular fs-20">${j.price}</div>
              </div>
              <div className="t-sec fs-14" style={{ marginBottom: 4 }}><Icon d={I.cal} size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />{j.time}</div>
              <div className="t-sec fs-14" style={{ marginBottom: 4 }}><Icon d={I.briefcase} size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />{j.cat}</div>
              <div className="t-sec fs-14" style={{ marginBottom: 14 }}><Icon d={I.pin} size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />{j.dist} · Burwood NSW</div>
              <div className="flex gap-2">
                <button className="btn btn--secondary btn--sm" style={{ flex: 1 }}>拒绝</button>
                <button className="btn btn--primary btn--sm" style={{ flex: 2 }}>接受 ${j.price}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ProviderTabBar active="jobs" />
    </div>
  );
};

/* ============================================================
   5) JOB DETAIL — 3 states
   ============================================================ */
const JobDetailPage = ({ state = "confirmed" }) => {
  const cfg = {
    confirmed: { title: "已确认 · 等待出发", color: "var(--brand)", chipCls: "chip--brand", chipLbl: "已确认" },
    enroute: { title: "出发中", color: "var(--brand)", chipCls: "chip--brand", chipLbl: "进行中" },
    completed: { title: "已完成 · 等待评价", color: "var(--success)", chipCls: "chip--success", chipLbl: "已完成" },
  }[state];

  const stepBar = state === "confirmed" ? 1 : state === "enroute" ? 2 : 4;
  const steps = ["已接受", "已确认", "出发", "服务中", "完成"];

  return (
    <div className="frame">
      <StatusBar />
      <PageHead title="派单详情" sub="B-94c1f0a8" />
      <div className="page-main">
        {/* status banner */}
        <div style={{ padding: 16, borderRadius: 16, background: state === "completed" ? "var(--success-soft)" : "var(--brand-soft)", marginBottom: 18 }}>
          <div className="flex center gap-3" style={{ marginBottom: 12 }}>
            <span className={"sbadge " + cfg.chipCls}>{cfg.chipLbl}</span>
            <span className="bold fs-16" style={{ color: cfg.color }}>{cfg.title}</span>
          </div>
          <div className="flex between" style={{ alignItems: "center", marginBottom: 6 }}>
            {steps.map((s, i) => (
              <React.Fragment key={s}>
                <div style={{
                  width: 22, height: 22, borderRadius: 999,
                  background: i <= stepBar ? cfg.color : "var(--bg-surface)",
                  color: i <= stepBar ? "#fff" : "var(--text-tertiary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800,
                  border: i <= stepBar ? "none" : "1px solid var(--border)",
                  flexShrink: 0,
                }}>{i <= stepBar ? "✓" : i + 1}</div>
                {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: i < stepBar ? cfg.color : "var(--bg-surface)", margin: "0 4px" }} />}
              </React.Fragment>
            ))}
          </div>
          <div className="flex between t-ter fs-11" style={{ marginTop: 4 }}>
            {steps.map((s) => <span key={s}>{s}</span>)}
          </div>
        </div>

        {/* customer */}
        <div className="card" style={{ padding: 16, marginBottom: 14 }}>
          <div className="flex center gap-3">
            <PAv name="玛格丽特 · 陈" size={52} />
            <div style={{ flex: 1 }}>
              <div className="bold fs-16">玛格丽特 · 陈</div>
              <div className="t-sec fs-13">75 岁 · 合作 8 次</div>
            </div>
            <button className="icon-btn"><Icon d={I.chat} size={18} /></button>
            <button className="icon-btn" style={{ background: "var(--success-soft)", color: "var(--success)", borderColor: "transparent" }}><Icon d={I.send} size={16} /></button>
          </div>
        </div>

        {/* details */}
        <div className="card" style={{ padding: 0, marginBottom: 14 }}>
          {[
            ["时间", "今天 · 10:00 - 12:00"],
            ["服务", "家居保洁 · 2 小时"],
            ["地址", "12 Liverpool St, Burwood NSW"],
            ["金额", "$90.00 · 平台抽成 12%"],
            ["实收", "$79.20"],
          ].map(([k, v], i) => (
            <div key={k} className="flex between" style={{ padding: "14px 16px", borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}>
              <span className="t-sec fs-14">{k}</span>
              <span className="bold fs-14 tabular" style={{ textAlign: "right" }}>{v}</span>
            </div>
          ))}
        </div>

        {/* note */}
        <div className="card card--inset" style={{ padding: 14, marginBottom: 14 }}>
          <div className="bold fs-13" style={{ marginBottom: 6 }}>顾客备注</div>
          <div className="t-sec fs-13" style={{ lineHeight: 1.55 }}>请重点清洁厨房和两个卫生间。家里有一只小狗（友善），客厅墙上挂的瓷器请勿触碰。</div>
        </div>
      </div>

      <div style={{ padding: "12px 20px 24px", borderTop: "1px solid var(--border)", background: "var(--bg-surface)", display: "flex", gap: 10 }}>
        {state === "confirmed" && <>
          <button className="btn btn--secondary" style={{ flex: 1 }}>取消</button>
          <button className="btn btn--primary" style={{ flex: 2 }}>开始前往 →</button>
        </>}
        {state === "enroute" && <>
          <button className="btn btn--secondary" style={{ flex: 1 }}><Icon d={I.pin} size={16} />地图</button>
          <button className="btn btn--primary" style={{ flex: 2 }}>已到达 · 开始服务</button>
        </>}
        {state === "completed" && <>
          <button className="btn btn--primary btn--block">查看收益（已托管 $79.20）</button>
        </>}
      </div>
    </div>
  );
};

/* ============================================================
   6) CALENDAR (month)
   ============================================================ */
const CalendarPage = () => {
  const days = Array.from({ length: 35 }, (_, i) => i - 2); // 5 weeks starting wed of prev month
  const today = 12;
  const busy = { 5: 1, 8: 2, 12: 3, 14: 1, 19: 2, 22: 1, 27: 4, 28: 2 };
  return (
    <div className="frame">
      <StatusBar />
      <AppHeader initial="梅" initialColor="#3D9970" />
      <div className="page-main">
        <div className="flex between center" style={{ marginBottom: 16 }}>
          <button className="icon-btn"><Icon d={I.arrowLeft} size={18} /></button>
          <div className="h1" style={{ fontSize: 22 }}>2026年 5月</div>
          <button className="icon-btn"><Icon d={I.arrowRight} size={18} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 14 }}>
          {["日", "一", "二", "三", "四", "五", "六"].map((d) => <div key={d} className="t-ter fs-12 semibold" style={{ textAlign: "center", padding: 4 }}>{d}</div>)}
          {days.map((d) => {
            const isToday = d === today;
            const inMonth = d > 0 && d <= 31;
            const cnt = busy[d];
            return (
              <div key={d} style={{
                aspectRatio: "1",
                borderRadius: 10,
                background: isToday ? "var(--brand)" : cnt ? "var(--brand-soft)" : "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: !inMonth ? "var(--text-tertiary)" : isToday ? "#fff" : "var(--text-primary)",
                opacity: !inMonth ? 0.4 : 1,
                padding: 6,
                display: "flex", flexDirection: "column", justifyContent: "space-between",
                fontSize: 14, fontWeight: 600,
              }}>
                <span>{inMonth ? d : d <= 0 ? 30 + d : d - 31}</span>
                {cnt && <span style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                  {Array.from({ length: Math.min(cnt, 3) }).map((_, i) => <span key={i} style={{ width: 4, height: 4, borderRadius: 999, background: isToday ? "#fff" : "var(--brand)" }} />)}
                </span>}
              </div>
            );
          })}
        </div>

        <div className="bold fs-15" style={{ margin: "12px 0 10px" }}>今天 · 3 个派单</div>
        {[
          { time: "10:00", customer: "玛格丽特 · 陈", cat: "家居保洁 · 2h" },
          { time: "13:30", customer: "约翰 · 史密斯", cat: "个人护理 · 1h" },
          { time: "16:00", customer: "丽萍 · 黄", cat: "家居保洁 · 3h" },
        ].map((j, i) => (
          <div key={i} className="card" style={{ padding: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
            <div className="bold tabular fs-15" style={{ width: 50 }}>{j.time}</div>
            <div style={{ width: 3, alignSelf: "stretch", background: "var(--brand)", borderRadius: 2 }} />
            <div style={{ flex: 1 }}>
              <div className="bold fs-14">{j.customer}</div>
              <div className="t-sec fs-12">{j.cat}</div>
            </div>
          </div>
        ))}
      </div>
      <ProviderTabBar active="calendar" />
    </div>
  );
};

/* ============================================================
   7) AVAILABILITY (weekly schedule)
   ============================================================ */
const AvailabilityPage = () => {
  const days = [["周一", true], ["周二", true], ["周三", true], ["周四", false], ["周五", true], ["周六", true], ["周日", false]];
  return (
    <div className="frame">
      <StatusBar />
      <PageHead title="可用时间" sub="顾客只能在你设的时段下单" />
      <div className="page-main">
        <div className="card card--inset" style={{ padding: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 999, background: "var(--success-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d={I.power} size={20} style={{ color: "var(--success)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="bold fs-15">立即接单</div>
            <div className="t-ter fs-12">关闭后，今晚 24 小时不会派新单</div>
          </div>
          <label style={{ position: "relative", display: "inline-block", width: 50, height: 28 }}>
            <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
            <span style={{ position: "absolute", inset: 0, background: "var(--brand)", borderRadius: 999 }} />
            <span style={{ position: "absolute", top: 3, right: 3, width: 22, height: 22, background: "#fff", borderRadius: 999 }} />
          </label>
        </div>

        <div className="bold fs-15" style={{ marginBottom: 10 }}>每周固定时间</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {days.map(([d, on]) => (
            <div key={d} className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, opacity: on ? 1 : 0.5 }}>
              <span className="bold fs-14" style={{ width: 40 }}>{d}</span>
              {on ? (
                <>
                  <div className="flex gap-2" style={{ flex: 1 }}>
                    <span className="chip chip--brand" style={{ fontSize: 12 }}>09:00 - 12:00</span>
                    <span className="chip chip--brand" style={{ fontSize: 12 }}>14:00 - 18:00</span>
                  </div>
                  <button className="icon-btn" style={{ width: 32, height: 32 }}><Icon d={I.plus} size={14} /></button>
                </>
              ) : (
                <span className="t-ter fs-13" style={{ flex: 1 }}>休息日</span>
              )}
              <label style={{ position: "relative", display: "inline-block", width: 38, height: 22 }}>
                <input type="checkbox" defaultChecked={on} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: "absolute", inset: 0, background: on ? "var(--brand)" : "var(--bg-surface-2)", borderRadius: 999 }} />
                <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 18, height: 18, background: "#fff", borderRadius: 999, transition: "left 0.15s" }} />
              </label>
            </div>
          ))}
        </div>

        <button className="btn btn--secondary btn--block" style={{ marginTop: 16 }}>设置休息时间</button>
      </div>
      <ProviderTabBar active="calendar" />
    </div>
  );
};

/* ============================================================
   8) TIME OFF
   ============================================================ */
const TimeOffPage = () => (
  <div className="frame">
    <StatusBar />
    <PageHead title="休息时间" />
    <div className="page-main">
      <div className="bold fs-15" style={{ marginBottom: 10 }}>已安排 · 2 次</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="flex between center" style={{ marginBottom: 6 }}>
            <span className="bold fs-15">回乡探亲</span>
            <button className="icon-btn" style={{ width: 32, height: 32 }}><Icon d={I.more} size={14} /></button>
          </div>
          <div className="t-sec fs-13"><Icon d={I.cal} size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />6月15日 - 6月25日 · 10 天</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="flex between center" style={{ marginBottom: 6 }}>
            <span className="bold fs-15">个人事务</span>
            <button className="icon-btn" style={{ width: 32, height: 32 }}><Icon d={I.more} size={14} /></button>
          </div>
          <div className="t-sec fs-13"><Icon d={I.cal} size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />5月20日 · 全天</div>
        </div>
      </div>

      <div className="bold fs-15" style={{ marginBottom: 10 }}>新增休息</div>
      <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div><label className="label">标题</label><input className="input" placeholder="例如：体检" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><label className="label">开始</label><input className="input" defaultValue="2026-05-25" /></div>
          <div><label className="label">结束</label><input className="input" defaultValue="2026-05-25" /></div>
        </div>
        <label className="flex center gap-2" style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          <input type="checkbox" defaultChecked style={{ width: 18, height: 18, accentColor: "var(--brand)" }} />
          全天休息
        </label>
        <button className="btn btn--primary btn--block">保存</button>
      </div>
    </div>
  </div>
);

/* ============================================================
   9) EARNINGS DETAIL
   ============================================================ */
const EarningsPage = () => {
  const heights = [55, 70, 45, 90, 60, 100, 65];
  return (
    <div className="frame">
      <StatusBar />
      <AppHeader initial="梅" initialColor="#3D9970" />
      <div className="page-main">
        {/* this month */}
        <div className="card" style={{ background: "linear-gradient(135deg, var(--brand) 0%, color-mix(in oklab, var(--brand) 70%, #ff9d6e) 100%)", color: "#fff", border: "none", padding: 22, marginBottom: 16 }}>
          <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>本月总收益</div>
          <div className="h1 tabular" style={{ fontSize: 40, marginTop: 6, color: "#fff" }}>$4,782<span style={{ fontSize: 18, opacity: 0.7 }}>.50</span></div>
          <div className="flex gap-4 tabular" style={{ marginTop: 12, fontSize: 13 }}>
            <span><span style={{ opacity: 0.7 }}>已到账</span> <b>$3,640.00</b></span>
            <span style={{ opacity: 0.3 }}>·</span>
            <span><span style={{ opacity: 0.7 }}>托管中</span> <b>$1,142.50</b></span>
          </div>
        </div>

        {/* tabs */}
        <div className="flex gap-2" style={{ marginBottom: 14 }}>
          {["本周", "本月", "本年", "全部"].map((t, i) => (
            <button key={t} className={"chip " + (i === 1 ? "chip--brand" : "")} style={{ fontSize: 13, padding: "6px 14px" }}>{t}</button>
          ))}
        </div>

        {/* bar chart */}
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div className="bold fs-14" style={{ marginBottom: 12 }}>近 7 天</div>
          <div className="bars">
            {heights.map((h, i) => <div key={i} className={"bar" + (i === 5 ? " active" : "")} style={{ height: h + "%" }} />)}
          </div>
          <div className="flex between t-ter fs-11" style={{ marginTop: 6 }}>
            {["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map((d) => <span key={d}>{d}</span>)}
          </div>
        </div>

        {/* breakdown */}
        <div className="bold fs-15" style={{ marginBottom: 10 }}>近期收益</div>
        <div className="card" style={{ padding: 0 }}>
          {[
            { d: "5月12日", c: "玛格丽特 · 陈", cat: "家居保洁", amt: 79.20, state: "已到账" },
            { d: "5月11日", c: "约翰 · 史密斯", cat: "个人护理", amt: 61.60, state: "托管中" },
            { d: "5月10日", c: "丽萍 · 黄", cat: "家居保洁", amt: 118.80, state: "已到账" },
            { d: "5月8日", c: "David · Liu", cat: "上门做饭", amt: 88.00, state: "已到账" },
          ].map((r, i, arr) => (
            <div key={i} className="flex between center" style={{ padding: "14px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div>
                <div className="bold fs-14">{r.c}</div>
                <div className="t-ter fs-12">{r.d} · {r.cat}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="bold tabular fs-15">+${r.amt.toFixed(2)}</div>
                <div className={"fs-11 semibold"} style={{ color: r.state === "已到账" ? "var(--success)" : "var(--warning)" }}>{r.state}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ProviderTabBar active="earnings" />
    </div>
  );
};

/* ============================================================
   10) PAYOUTS
   ============================================================ */
const PayoutsPage = () => (
  <div className="frame">
    <StatusBar />
    <PageHead title="收款记录" />
    <div className="page-main">
      <div className="card card--inset" style={{ padding: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon d={I.wallet} size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="bold fs-14">Commonwealth Bank</div>
          <div className="t-ter fs-12">BSB 062 ··· · 账号 ···· 4521</div>
        </div>
        <button className="btn btn--secondary btn--sm">更换</button>
      </div>

      <div className="bold fs-15" style={{ marginBottom: 10 }}>结算周期</div>
      <div className="card" style={{ padding: 16, marginBottom: 18 }}>
        <div className="flex between center" style={{ marginBottom: 6 }}>
          <span className="t-sec fs-14">每周自动转账 · 周一</span>
          <button className="t-brand fs-13 semibold" style={{ background: "none", border: "none" }}>修改</button>
        </div>
        <div className="t-ter fs-12">下次结算：5月19日 · 预计 $1,142.50</div>
      </div>

      <div className="bold fs-15" style={{ marginBottom: 10 }}>结算历史</div>
      <div className="card" style={{ padding: 0 }}>
        {[
          { d: "5月12日", amt: 1247.50, state: "已到账", n: 8 },
          { d: "5月5日", amt: 982.00, state: "已到账", n: 6 },
          { d: "4月28日", amt: 1340.50, state: "已到账", n: 9 },
          { d: "4月21日", amt: 720.00, state: "已到账", n: 5 },
        ].map((r, i, arr) => (
          <div key={i} className="flex between center" style={{ padding: "14px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
            <div>
              <div className="bold fs-14">{r.d}</div>
              <div className="t-ter fs-12">{r.n} 个派单</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="bold tabular fs-15">${r.amt.toFixed(2)}</div>
              <div className="chip chip--success" style={{ fontSize: 11, padding: "2px 8px" }}>{r.state}</div>
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn--secondary btn--block" style={{ marginTop: 16 }}>
        <Icon d={I.download} size={16} />
        下载月度对账单
      </button>
    </div>
  </div>
);

/* ============================================================
   11) PUBLIC PROFILE (provider view)
   ============================================================ */
const PublicProfilePage = () => (
  <div className="frame">
    <StatusBar />
    <PageHead title="公开档案" right={<button className="btn btn--ghost btn--sm t-brand"><Icon d={I.external} size={14} />预览</button>} />
    <div className="page-main">
      {/* hero */}
      <div className="card" style={{ padding: 20, textAlign: "center", marginBottom: 14 }}>
        <div style={{ position: "relative", display: "inline-block", marginBottom: 12 }}>
          <PAv name="梅" size={88} color="#3D9970" />
          <button className="icon-btn" style={{ position: "absolute", bottom: 0, right: -4, width: 32, height: 32 }}><Icon d={I.plus} size={14} /></button>
        </div>
        <div className="h1" style={{ fontSize: 22, margin: 0 }}>梅 · 张</div>
        <div className="t-sec fs-14" style={{ marginTop: 4 }}>家居保洁 · 上门做饭</div>
        <div className="flex center gap-3" style={{ justifyContent: "center", marginTop: 10 }}>
          <span className="flex center gap-2 bold fs-14 tabular"><Icon d={I.star_fill.d} size={14} fill="currentColor" stroke={0} style={{ color: "#E0A800" }} />4.9</span>
          <span className="t-ter">·</span>
          <span className="t-sec fs-14">47 条评价</span>
          <span className="t-ter">·</span>
          <span className="t-sec fs-14 tabular">28 单/月</span>
        </div>
        <div className="flex gap-2" style={{ justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
          <span className="chip chip--success" style={{ fontSize: 12 }}><Icon d={I.verified} size={12} />已认证</span>
          <span className="chip chip--success" style={{ fontSize: 12 }}><Icon d={I.shield} size={12} />急救证</span>
          <span className="chip chip--brand" style={{ fontSize: 12 }}>★ 超级服务者</span>
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div className="bold fs-14" style={{ marginBottom: 8 }}>关于我</div>
        <div className="t-sec fs-14" style={{ lineHeight: 1.55 }}>拥有 8 年家庭保洁经验，注重细节，能与长者沟通好。普通话/粤语/英语。</div>
        <button className="t-brand fs-13 semibold" style={{ background: "none", border: "none", padding: 0, marginTop: 8 }}>编辑 →</button>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div className="bold fs-14" style={{ marginBottom: 10 }}>服务区域</div>
        <div style={{ height: 120, borderRadius: 12, background: "var(--bg-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
          <Icon d={I.pin} size={20} />
          <span style={{ marginLeft: 6 }}>Burwood, Strathfield 周边 10 km</span>
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div className="bold fs-14" style={{ marginBottom: 10 }}>语言</div>
        <div className="flex gap-2">
          <span className="chip" style={{ fontSize: 13 }}>中文（普通话）</span>
          <span className="chip" style={{ fontSize: 13 }}>粤语</span>
          <span className="chip" style={{ fontSize: 13 }}>English</span>
        </div>
      </div>
    </div>
    <ProviderTabBar active="profile" />
  </div>
);

/* ============================================================
   12) SERVICES & PRICES
   ============================================================ */
const ServicesPricesPage = () => (
  <div className="frame">
    <StatusBar />
    <PageHead title="服务与价格" />
    <div className="page-main">
      <div className="banner banner--info" style={{ marginBottom: 16 }}>
        <Icon d={I.alert} size={18} />
        <div className="fs-13">市场中位数仅供参考。价格高于中位数 20% 以上可能影响接单率。</div>
      </div>

      {[
        { emoji: "🧹", name: "家居保洁", price: 45, median: 48, on: true },
        { emoji: "🍳", name: "上门做饭", price: 50, median: 52, on: true },
        { emoji: "🌿", name: "花园打理", price: null, median: 42, on: false },
      ].map((s, i) => (
        <div key={i} className="card" style={{ padding: 16, marginBottom: 10 }}>
          <div className="flex center gap-3" style={{ marginBottom: s.on ? 14 : 0 }}>
            <span className="cat-tile-emoji" style={{ width: 44, height: 44, background: "var(--bg-surface-2)" }}>{s.emoji}</span>
            <div style={{ flex: 1 }}>
              <div className="bold fs-15">{s.name}</div>
              <div className="t-ter fs-12">{s.on ? `当前 $${s.price}/h · 中位数 $${s.median}` : "未开启"}</div>
            </div>
            <label style={{ position: "relative", display: "inline-block", width: 44, height: 26 }}>
              <input type="checkbox" defaultChecked={s.on} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: "absolute", inset: 0, background: s.on ? "var(--brand)" : "var(--bg-surface-2)", borderRadius: 999 }} />
              <span style={{ position: "absolute", top: 3, left: s.on ? 21 : 3, width: 20, height: 20, background: "#fff", borderRadius: 999, transition: "left 0.15s" }} />
            </label>
          </div>
          {s.on && (
            <div className="card card--inset" style={{ padding: 12 }}>
              <div className="flex between" style={{ marginBottom: 8 }}>
                <span className="t-sec fs-13">每小时</span>
                <span className="bold tabular fs-18">$<input defaultValue={s.price} style={{ width: 50, border: "none", background: "transparent", font: "inherit", color: "inherit", textAlign: "right" }} /></span>
              </div>
              <div style={{ position: "relative", height: 4, background: "var(--bg-surface)", borderRadius: 999 }}>
                <div style={{ position: "absolute", left: `${(s.median / 100) * 100}%`, top: -4, width: 2, height: 12, background: "var(--text-tertiary)" }} />
                <div style={{ position: "absolute", left: `${(s.price / 100) * 100}%`, top: -4, width: 12, height: 12, borderRadius: 999, background: "var(--brand)", transform: "translateX(-50%)" }} />
              </div>
              <div className="flex between t-ter fs-11 tabular" style={{ marginTop: 6 }}>
                <span>$25</span><span>中位数</span><span>$100</span>
              </div>
            </div>
          )}
        </div>
      ))}

      <button className="dotted-cta" style={{ marginTop: 6 }}><Icon d={I.plus} size={16} />开通新服务</button>
    </div>
  </div>
);

/* ============================================================
   13) REVIEW REPLY
   ============================================================ */
const ReviewReplyPage = () => (
  <div className="frame">
    <StatusBar />
    <PageHead title="评价" />
    <div className="page-main">
      {/* summary */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div className="flex center gap-4">
          <div style={{ textAlign: "center" }}>
            <div className="h1 tabular" style={{ fontSize: 40 }}>4.9</div>
            <div className="flex" style={{ color: "#E0A800" }}>
              {[1, 2, 3, 4, 5].map((i) => <Icon key={i} d={I.star_fill.d} size={14} fill="currentColor" stroke={0} />)}
            </div>
            <div className="t-ter fs-12" style={{ marginTop: 4 }}>47 条</div>
          </div>
          <div style={{ flex: 1 }}>
            {[5, 4, 3, 2, 1].map((s) => (
              <div key={s} className="flex center gap-2" style={{ marginBottom: 4 }}>
                <span className="t-sec fs-12 tabular" style={{ width: 12 }}>{s}</span>
                <div style={{ flex: 1, height: 5, background: "var(--bg-surface-2)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: s === 5 ? "85%" : s === 4 ? "12%" : "3%", background: "#E0A800" }} />
                </div>
                <span className="t-ter fs-11 tabular" style={{ width: 24, textAlign: "right" }}>{s === 5 ? 40 : s === 4 ? 6 : 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* reviews */}
      <div className="bold fs-15" style={{ marginBottom: 10 }}>最近评价</div>
      <div className="card" style={{ padding: 16, marginBottom: 10 }}>
        <div className="flex center gap-3" style={{ marginBottom: 8 }}>
          <PAv name="玛格丽特" size={40} />
          <div style={{ flex: 1 }}>
            <div className="bold fs-14">玛格丽特 · 陈</div>
            <div className="t-ter fs-12">2 天前 · 家居保洁</div>
          </div>
          <div className="flex" style={{ color: "#E0A800" }}>
            {[1, 2, 3, 4, 5].map((i) => <Icon key={i} d={I.star_fill.d} size={13} fill="currentColor" stroke={0} />)}
          </div>
        </div>
        <div className="t-sec fs-14" style={{ lineHeight: 1.55, marginBottom: 10 }}>
          梅非常细心，连厨房油烟机的背面都擦干净了。和我家小狗也相处得很好。下周还要再约。
        </div>
        <div className="card card--inset" style={{ padding: 12 }}>
          <div className="bold fs-13" style={{ marginBottom: 6, color: "var(--brand)" }}>你的回复</div>
          <textarea className="input" style={{ height: 70, padding: "10px 12px", resize: "none", border: "none", background: "transparent", fontSize: 14 }} placeholder="谢谢您的好评！下周见。" defaultValue="谢谢您的好评，玛格丽特！下周老时间见。也欢迎随时联系我。" />
          <div className="flex between center" style={{ marginTop: 8 }}>
            <span className="t-ter fs-12">公开 · 顾客可见</span>
            <button className="btn btn--primary btn--sm">发布回复</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div className="flex center gap-3" style={{ marginBottom: 8 }}>
          <PAv name="约翰" size={40} />
          <div style={{ flex: 1 }}>
            <div className="bold fs-14">约翰 · 史密斯</div>
            <div className="t-ter fs-12">5 天前 · 上门做饭</div>
          </div>
          <div className="flex" style={{ color: "#E0A800" }}>
            {[1, 2, 3, 4].map((i) => <Icon key={i} d={I.star_fill.d} size={13} fill="currentColor" stroke={0} />)}
            <Icon d={I.star_fill.d} size={13} stroke={0} style={{ color: "var(--bg-surface-2)" }} />
          </div>
        </div>
        <div className="t-sec fs-14" style={{ lineHeight: 1.55 }}>
          饭菜很好吃，份量足。希望下次能稍微提早一点到，我们好提前安排时间。
        </div>
      </div>
    </div>
    <ProviderTabBar active="profile" />
  </div>
);

Object.assign(window, {
  OnboardStep1, OnboardStep2, OnboardStep3, OnboardStep4, OnboardStep5,
  StatusTimeline, CompliancePage,
  JobsListPage, JobDetailPage,
  CalendarPage, AvailabilityPage, TimeOffPage,
  EarningsPage, PayoutsPage,
  PublicProfilePage, ServicesPricesPage, ReviewReplyPage,
});
