/* global React */
const { useState: useStateM } = React;

/* ============================================================
   1) SIGNUP — desktop + mobile in same component
   ============================================================ */
const SignupPage = ({ desktop = false }) => {
  const [role, setRole] = useStateM("consumer");
  const [agree, setAgree] = useStateM(true);
  return (
    <div className="frame">
      {!desktop && <StatusBar />}
      <div style={{ position: "absolute", top: desktop ? 24 : 56, right: 20, zIndex: 5, display: "flex", gap: 8 }}>
        <button className="icon-btn"><Icon d={I.sun} size={18} /></button>
        <button className="icon-btn" style={{ fontSize: 11, fontWeight: 800 }}>中</button>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: desktop ? 48 : "32px 24px 60px", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <span className="brand-dot" style={{ width: 52, height: 52, borderRadius: 16, fontSize: 26 }}>S</span>
            <h1 className="h1" style={{ fontSize: desktop ? 28 : 24, margin: 0, textAlign: "center" }}>创建账号，几分钟就好</h1>
            <p className="t-sec" style={{ margin: 0, textAlign: "center", fontSize: 15, lineHeight: 1.5 }}>已有 3,000+ 澳洲家庭使用 SilverConnect</p>
          </div>

          <div role="tablist" style={{ display: "flex", background: "var(--bg-surface-2)", padding: 4, borderRadius: 14 }}>
            {[["consumer", "我是顾客 / 家属"], ["provider", "我想成为服务者"]].map(([k, lbl]) => (
              <button key={k} onClick={() => setRole(k)} style={{
                flex: 1, padding: "12px 14px", borderRadius: 10, fontWeight: 700, fontSize: 14, border: "none",
                background: role === k ? "var(--bg-surface)" : "transparent",
                color: role === k ? "var(--text-primary)" : "var(--text-secondary)",
                boxShadow: role === k ? "var(--shadow-sm)" : "none",
              }}>{lbl}</button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label className="label">姓</label><input className="input" defaultValue="陈" /></div>
              <div><label className="label">名</label><input className="input" defaultValue="玛格丽特" /></div>
            </div>
            <div><label className="label">邮箱</label><input className="input" defaultValue="margaret@example.com" /></div>
            <div><label className="label">手机</label>
              <div className="flex gap-2">
                <select className="input" style={{ width: 110, padding: "0 10px" }}><option>🇦🇺 +61</option></select>
                <input className="input" defaultValue="433 ··· ···" style={{ flex: 1 }} />
              </div>
            </div>
            <div><label className="label">密码</label><input className="input" type="password" defaultValue="••••••••" />
              <div className="t-ter fs-13" style={{ marginTop: 6 }}>至少 8 位 · 包含数字与字母</div>
            </div>

            <label className="flex gap-3" style={{ alignItems: "flex-start", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              <input type="checkbox" checked={agree} onChange={() => setAgree(!agree)} style={{ marginTop: 3, accentColor: "var(--brand)" }} />
              <span>我同意 <a className="t-brand semibold">服务条款</a> 与 <a className="t-brand semibold">隐私政策</a>，并允许 SilverConnect 通过邮件发送账户提醒</span>
            </label>

            <button className="btn btn--primary btn--block">创建账号</button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text-tertiary)", fontSize: 13 }}>
            <span style={{ flex: 1, height: 1, background: "var(--border)" }} />或<span style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="btn btn--secondary btn--block"><Icon d={I.google} size={18} stroke={0} />用 Google 注册</button>
            <button className="btn btn--secondary btn--block"><Icon d={I.apple} size={18} stroke={0} fill="currentColor" />用 Apple 注册</button>
          </div>

          <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 15 }}>
            已有账号？ <a className="t-brand semibold">登录</a>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   2) VERIFY EMAIL
   ============================================================ */
const VerifyEmailPage = () => (
  <div className="frame">
    <StatusBar />
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center" }}>
        <div style={{ width: 96, height: 96, borderRadius: 999, background: "var(--brand-soft)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon d={I.send} size={40} />
        </div>
        <h1 className="h1" style={{ fontSize: 26, margin: 0 }}>验证邮箱</h1>
        <p className="t-sec" style={{ margin: 0, fontSize: 16, lineHeight: 1.55, maxWidth: 320 }}>我们已向 <b style={{ color: "var(--text-primary)" }}>margaret@example.com</b> 发送验证邮件，请点击邮件里的链接完成验证。</p>

        <div className="card card--inset" style={{ padding: 16, width: "100%", textAlign: "left" }}>
          <div className="bold fs-14" style={{ marginBottom: 6 }}>没收到？</div>
          <div className="t-sec fs-13" style={{ lineHeight: 1.6 }}>
            • 检查垃圾邮件文件夹<br />
            • 等待 1–2 分钟<br />
            • 邮箱地址写错了？<a className="t-brand semibold">修改</a>
          </div>
        </div>

        <button className="btn btn--secondary btn--block">重新发送邮件</button>
        <a className="t-brand semibold fs-14">已验证，回到登录</a>
      </div>
    </div>
  </div>
);

/* ============================================================
   3) FORGOT PASSWORD
   ============================================================ */
const ForgotPasswordPage = () => (
  <div className="frame">
    <StatusBar />
    <div style={{ position: "absolute", top: 56, left: 20 }}><button className="icon-btn"><Icon d={I.arrowLeft} /></button></div>
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 32px 60px" }}>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 22 }}>
        <div>
          <h1 className="h1" style={{ fontSize: 28, margin: 0 }}>忘记密码</h1>
          <p className="t-sec" style={{ marginTop: 8, fontSize: 16, lineHeight: 1.55 }}>输入注册邮箱，我们会发送重置链接到你的邮箱。</p>
        </div>
        <div><label className="label">邮箱地址</label><input className="input" defaultValue="margaret@example.com" /></div>
        <button className="btn btn--primary btn--block">发送重置链接</button>
        <div style={{ textAlign: "center" }}><a className="t-brand semibold fs-14">用短信验证码登录</a></div>
      </div>
    </div>
  </div>
);

/* ============================================================
   4) RESET PASSWORD
   ============================================================ */
const ResetPasswordPage = () => (
  <div className="frame">
    <StatusBar />
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 18 }}>
        <h1 className="h1" style={{ fontSize: 26, margin: 0 }}>设置新密码</h1>
        <p className="t-sec" style={{ margin: 0, fontSize: 15 }}>新密码需至少 8 位，包含字母与数字。</p>

        <div><label className="label">新密码</label><input className="input" type="password" defaultValue="•••••••••••" /></div>
        <div><label className="label">确认新密码</label><input className="input" type="password" defaultValue="•••••••••••" /></div>

        <div className="card card--inset" style={{ padding: 14 }}>
          <div className="bold fs-13" style={{ marginBottom: 8 }}>强度</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {[1, 2, 3, 4].map((i) => <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i <= 3 ? "var(--success)" : "var(--bg-surface-2)" }} />)}
          </div>
          <div className="fs-12 t-sec">强 · 推荐</div>
          {[["至少 8 位", true], ["包含数字", true], ["包含大小写字母", true], ["包含特殊字符", false]].map(([k, ok]) => (
            <div key={k} className="flex center gap-2 fs-12 t-sec" style={{ marginTop: 6 }}>
              <Icon d={ok ? I.verified : I.x} size={13} stroke={2.5} />{k}
            </div>
          ))}
        </div>

        <button className="btn btn--primary btn--block">更新密码并登录</button>
      </div>
    </div>
  </div>
);

/* ============================================================
   5) DONATE LANDING — desktop
   ============================================================ */
const DonateLandingPage = ({ desktop = true }) => {
  const [amt, setAmt] = useStateM(50);
  const [freq, setFreq] = useStateM("once");
  const opts = [20, 50, 100, 200];
  return (
    <div className="frame">
      <AppHeader desktop={desktop} signedIn={false} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* hero */}
        <section style={{ background: "linear-gradient(135deg, var(--brand-soft) 0%, color-mix(in oklab, var(--brand-soft) 50%, var(--bg-base)) 100%)", padding: desktop ? "64px 48px" : "40px 24px" }}>
          <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gridTemplateColumns: desktop ? "1.2fr 1fr" : "1fr", gap: 40, alignItems: "center" }}>
            <div>
              <span className="chip chip--brand" style={{ marginBottom: 16, fontSize: 13 }}>非营利倡议 · 注册编号 12-345-678</span>
              <h1 className="h1" style={{ fontSize: desktop ? 48 : 32, margin: 0, lineHeight: 1.1 }}>让每位长者都能<br /><span style={{ color: "var(--brand)" }}>有尊严地生活</span></h1>
              <p className="t-sec" style={{ marginTop: 16, fontSize: desktop ? 18 : 16, lineHeight: 1.6, maxWidth: 480 }}>SilverConnect 为低收入长者提供免费或补贴的家居服务。你的捐款 100% 进入服务基金，运营成本由其他渠道承担。</p>
              <div className="flex gap-3" style={{ marginTop: 22 }}>
                <a href="#donate" className="btn btn--primary">立即捐款</a>
                <button className="btn btn--secondary">查看年度报告 →</button>
              </div>
            </div>
            <div className="illu" style={{ aspectRatio: "1", maxWidth: 360 }}>
              <svg viewBox="0 0 360 360" style={{ width: "100%", height: "100%" }}>
                <circle cx="180" cy="180" r="140" fill="var(--brand-soft)" />
                <circle cx="180" cy="180" r="110" fill="none" stroke="var(--brand)" strokeWidth="3" strokeDasharray="10,8" opacity="0.5" />
                <g transform="translate(180 180)">
                  <path d="M-50 30 q-15 -60 50 -60 q65 0 50 60 q-10 35 -50 50 q-40 -15 -50 -50z" fill="var(--brand)" />
                  <circle cx="-10" cy="-25" r="6" fill="#fff" />
                  <circle cx="20" cy="-25" r="6" fill="#fff" />
                  <path d="M-15 5 q10 8 25 0" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
                </g>
              </svg>
            </div>
          </div>
        </section>

        {/* impact stats */}
        <section style={{ padding: "48px", maxWidth: 1080, margin: "0 auto" }} id="donate">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 48 }}>
            {[["1,247", "已资助长者"], ["8,400+", "完成服务次数"], ["$320k", "累计补贴"], ["98%", "满意度"]].map(([v, l]) => (
              <div key={l} className="card" style={{ padding: 22, textAlign: "center" }}>
                <div className="h1 t-brand tabular" style={{ fontSize: 34 }}>{v}</div>
                <div className="t-sec fs-13 semibold" style={{ marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* donate form */}
          <div className="card" style={{ padding: 32, maxWidth: 640, margin: "0 auto" }}>
            <h2 className="h1" style={{ fontSize: 24, margin: 0, textAlign: "center" }}>支持一位长者</h2>
            <p className="t-sec" style={{ marginTop: 6, marginBottom: 22, textAlign: "center", fontSize: 14 }}>$50 可以为一位长者支付 1 小时家庭保洁</p>

            <div className="flex gap-2" style={{ marginBottom: 16, background: "var(--bg-surface-2)", padding: 4, borderRadius: 12 }}>
              {[["once", "单次"], ["monthly", "每月"]].map(([k, lbl]) => (
                <button key={k} onClick={() => setFreq(k)} style={{
                  flex: 1, padding: "10px 14px", borderRadius: 8, fontWeight: 700, fontSize: 14, border: "none",
                  background: freq === k ? "var(--bg-surface)" : "transparent",
                  color: freq === k ? "var(--text-primary)" : "var(--text-secondary)",
                }}>{lbl}</button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
              {opts.map((v) => (
                <button key={v} onClick={() => setAmt(v)} className="card" style={{
                  padding: "14px 8px", textAlign: "center",
                  background: amt === v ? "var(--brand-soft)" : "var(--bg-surface)",
                  borderColor: amt === v ? "var(--brand)" : "var(--border)",
                  color: amt === v ? "var(--brand-ink)" : "var(--text-primary)",
                  fontWeight: 700, fontSize: 18, cursor: "pointer",
                }}>${v}</button>
              ))}
            </div>

            <div className="input" style={{ display: "flex", alignItems: "center", padding: "0 16px" }}>
              <span className="t-sec" style={{ fontSize: 18, marginRight: 8 }}>$</span>
              <input value={amt} onChange={() => {}} style={{ flex: 1, height: "100%", border: "none", outline: "none", background: "transparent", fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontFamily: "inherit" }} />
              <span className="t-ter fs-13">AUD</span>
            </div>

            <div className="banner banner--info" style={{ marginTop: 14, fontSize: 13 }}>
              <Icon d={I.heart} size={14} fill="currentColor" stroke={0} />
              <span>{freq === "monthly" ? `每月 $${amt} 持续 12 个月，可为 1 位长者提供长期支持` : `单次 $${amt} 可立即帮助 ${Math.max(1, Math.floor(amt / 50))} 位长者`}</span>
            </div>

            <button className="btn btn--primary btn--block" style={{ marginTop: 18 }}>用 Stripe 支付</button>
            <div className="t-ter fs-12" style={{ textAlign: "center", marginTop: 10 }}>所有捐款可申请 ATO 减税收据 (DGR Status)</div>
          </div>
        </section>
      </div>
    </div>
  );
};

/* ============================================================
   6) DONATE THANK YOU
   ============================================================ */
const DonateThankYouPage = () => (
  <div className="frame">
    <AppHeader signedIn={false} />
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
      <div style={{ maxWidth: 520, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 22 }}>
        <div style={{ width: 120, height: 120, borderRadius: 999, background: "var(--brand-soft)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon d={I.heart} size={56} fill="currentColor" stroke={0} />
        </div>
        <h1 className="h1" style={{ fontSize: 32, margin: 0 }}>谢谢你，张先生！</h1>
        <p className="t-sec" style={{ margin: 0, fontSize: 17, lineHeight: 1.6 }}>
          你捐赠的 <b style={{ color: "var(--brand)" }}>$50 AUD</b> 将用于为 Sydney 西区的 Margaret 提供 1 小时的家庭保洁服务。
        </p>

        <div className="card" style={{ padding: 22, width: "100%", textAlign: "left" }}>
          <div className="flex between" style={{ marginBottom: 10 }}>
            <span className="t-sec fs-13">交易号</span>
            <span className="bold tabular fs-13">DN-3a8e0c19</span>
          </div>
          <div className="flex between" style={{ marginBottom: 10 }}>
            <span className="t-sec fs-13">金额</span>
            <span className="bold tabular fs-13">$50.00 AUD</span>
          </div>
          <div className="flex between">
            <span className="t-sec fs-13">DGR 收据</span>
            <a className="t-brand semibold fs-13">下载 PDF →</a>
          </div>
        </div>

        <button className="btn btn--secondary btn--block">回到首页</button>
        <a className="t-brand semibold fs-14">分享给朋友 →</a>
      </div>
    </div>
  </div>
);

/* ============================================================
   7) HELP CENTER
   ============================================================ */
const HelpCenterPage = ({ desktop = true }) => {
  const cats = [
    { icon: "🛒", title: "下单与预约", n: 14 },
    { icon: "💳", title: "支付与退款", n: 8 },
    { icon: "🛡️", title: "安全与隐私", n: 11 },
    { icon: "⭐", title: "评价与纠纷", n: 6 },
    { icon: "👤", title: "账户设置", n: 9 },
    { icon: "🤝", title: "成为服务者", n: 12 },
  ];
  return (
    <div className="frame">
      <AppHeader desktop={desktop} signedIn={false} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <section style={{ background: "var(--brand-soft)", padding: desktop ? "64px 48px" : "40px 24px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <h1 className="h1" style={{ fontSize: desktop ? 36 : 28, margin: 0 }}>有什么可以帮你？</h1>
            <p className="t-sec" style={{ marginTop: 8, fontSize: 16 }}>找到答案，或直接联系我们</p>
            <div className="search" style={{ marginTop: 22, background: "#fff" }}>
              <Icon d={I.search} size={20} />
              <input placeholder="搜索问题，例如 怎么取消订单" />
            </div>
          </div>
        </section>

        <section style={{ padding: 48, maxWidth: 1080, margin: "0 auto" }}>
          <h2 className="h1" style={{ fontSize: 22, marginBottom: 18 }}>常见类别</h2>
          <div style={{ display: "grid", gridTemplateColumns: desktop ? "repeat(3, 1fr)" : "1fr 1fr", gap: 14, marginBottom: 36 }}>
            {cats.map((c) => (
              <div key={c.title} className="card" style={{ padding: 22, cursor: "pointer" }}>
                <div style={{ fontSize: 32 }}>{c.icon}</div>
                <div className="bold fs-16" style={{ marginTop: 10 }}>{c.title}</div>
                <div className="t-ter fs-13" style={{ marginTop: 4 }}>{c.n} 篇文章</div>
              </div>
            ))}
          </div>

          <h2 className="h1" style={{ fontSize: 22, marginBottom: 14 }}>最热门</h2>
          <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 36 }}>
            {[
              "如何取消已确认的预订？",
              "怎样修改紧急联系人？",
              "支付失败怎么办？",
              "对服务不满意，如何发起纠纷？",
              "如何成为认证服务者？",
            ].map((q, i, a) => (
              <a key={q} className="flex between center" style={{ padding: "16px 22px", borderBottom: i < a.length - 1 ? "1px solid var(--border)" : "none", color: "var(--text-primary)", textDecoration: "none", cursor: "pointer" }}>
                <span className="fs-15">{q}</span>
                <Icon d={I.arrowRight} size={16} />
              </a>
            ))}
          </div>

          <div className="card" style={{ padding: 32, textAlign: "center", background: "var(--bg-surface-2)" }}>
            <h3 className="h1" style={{ fontSize: 22, margin: 0 }}>还是没找到？</h3>
            <p className="t-sec" style={{ marginTop: 6, marginBottom: 16, fontSize: 14 }}>联系客服 · 工作日 9:00–18:00 AEST</p>
            <div className="flex gap-2" style={{ justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn btn--secondary"><Icon d={I.chat} size={16} />在线客服</button>
              <button className="btn btn--secondary">📞 1800 SILVER</button>
              <button className="btn btn--secondary"><Icon d={I.send} size={16} />hello@silverconnect.com</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

/* ============================================================
   8) HELP ARTICLE
   ============================================================ */
const HelpArticlePage = ({ desktop = true }) => (
  <div className="frame">
    <AppHeader desktop={desktop} signedIn={false} />
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: desktop ? "48px" : "24px" }}>
        <div className="t-ter fs-13" style={{ marginBottom: 12 }}>帮助中心 / 下单与预约 / 如何取消预订</div>
        <h1 className="h1" style={{ fontSize: desktop ? 36 : 28, margin: 0 }}>如何取消已确认的预订？</h1>
        <div className="flex gap-4 t-sec fs-13" style={{ marginTop: 12, marginBottom: 28 }}>
          <span>更新于 2026-04-22</span><span>·</span><span>阅读 2 分钟</span><span>·</span><span>1,420 人觉得有用</span>
        </div>

        <div style={{ fontSize: 16, lineHeight: 1.7, color: "var(--text-primary)" }}>
          <p>SilverConnect 允许在服务开始前取消预订，是否产生取消费视取消时间而定。</p>

          <h2 className="h1" style={{ fontSize: 22, marginTop: 28, marginBottom: 10 }}>取消政策</h2>
          <div className="card card--inset" style={{ padding: 18, marginBottom: 18 }}>
            <table style={{ width: "100%", fontSize: 15 }}>
              <tbody>
                <tr><td style={{ padding: "8px 0", color: "var(--text-secondary)" }}>距服务 24h 以上</td><td style={{ textAlign: "right", fontWeight: 700, color: "var(--success)" }}>免费取消</td></tr>
                <tr><td style={{ padding: "8px 0", color: "var(--text-secondary)", borderTop: "1px solid var(--border)" }}>距服务 4–24h</td><td style={{ textAlign: "right", fontWeight: 700, color: "var(--warning)", borderTop: "1px solid var(--border)" }}>30% 取消费</td></tr>
                <tr><td style={{ padding: "8px 0", color: "var(--text-secondary)", borderTop: "1px solid var(--border)" }}>距服务 4h 以内</td><td style={{ textAlign: "right", fontWeight: 700, color: "var(--danger)", borderTop: "1px solid var(--border)" }}>50% 取消费</td></tr>
              </tbody>
            </table>
          </div>

          <h2 className="h1" style={{ fontSize: 22, marginTop: 28, marginBottom: 10 }}>取消步骤</h2>
          <ol style={{ paddingLeft: 24, lineHeight: 2 }}>
            <li>打开 <b>我的预约</b> 页面</li>
            <li>找到需要取消的预订，点击 <b>查看详情</b></li>
            <li>下滑到底部，点击 <b>取消预订</b></li>
            <li>选择取消原因，确认</li>
          </ol>

          <h2 className="h1" style={{ fontSize: 22, marginTop: 28, marginBottom: 10 }}>退款时间</h2>
          <p>退款会原路退回到支付时使用的银行卡，通常需要 3–5 个工作日。</p>
        </div>

        <div className="card card--inset" style={{ padding: 22, marginTop: 36 }}>
          <div className="bold fs-15" style={{ marginBottom: 10 }}>这篇文章有帮助吗？</div>
          <div className="flex gap-2">
            <button className="btn btn--secondary btn--sm">👍 有用</button>
            <button className="btn btn--secondary btn--sm">👎 没解决</button>
            <span style={{ flex: 1 }} />
            <button className="btn btn--primary btn--sm"><Icon d={I.chat} size={14} />联系客服</button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ============================================================
   9) 404 / ERROR
   ============================================================ */
const Error404Page = ({ desktop = true }) => (
  <div className="frame">
    <AppHeader desktop={desktop} signedIn={false} />
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
      <div style={{ maxWidth: 520, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 24 }}>
        <div style={{ position: "relative", width: 240, height: 180 }}>
          <svg viewBox="0 0 240 180" style={{ width: "100%", height: "100%" }}>
            <text x="120" y="130" textAnchor="middle" fontSize="120" fontWeight="800" fill="var(--brand-soft)" fontFamily="Plus Jakarta Sans">404</text>
            <circle cx="80" cy="70" r="22" fill="var(--brand)" opacity="0.85" />
            <circle cx="170" cy="50" r="14" fill="var(--brand)" opacity="0.5" />
            <circle cx="200" cy="120" r="10" fill="var(--brand)" opacity="0.7" />
          </svg>
        </div>
        <h1 className="h1" style={{ fontSize: 32, margin: 0 }}>这页走丢了</h1>
        <p className="t-sec" style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>
          你要找的页面可能已经移动或不存在了。<br />我们带你回家吧。
        </p>
        <div className="flex gap-2" style={{ flexWrap: "wrap", justifyContent: "center" }}>
          <button className="btn btn--primary">回到首页</button>
          <button className="btn btn--secondary">联系客服</button>
        </div>
        <div className="t-ter fs-12" style={{ marginTop: 8 }}>错误编号 PAGE_NOT_FOUND · 已自动记录</div>
      </div>
    </div>
  </div>
);

Object.assign(window, {
  SignupPage, VerifyEmailPage, ForgotPasswordPage, ResetPasswordPage,
  DonateLandingPage, DonateThankYouPage,
  HelpCenterPage, HelpArticlePage, Error404Page,
});
