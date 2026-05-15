/**
 * Server-only SMTP send helper. Uses Gmail SMTP by default.
 *
 * Credentials are read from env (set in `/opt/silverconnect/.env.local` on
 * the VPS — never committed). The Gmail account must have an "App
 * password" generated under https://myaccount.google.com/apppasswords;
 * regular passwords no longer work for SMTP since 2022.
 *
 * Reads either the `EMAIL_*` (existing .env.example convention) or
 * `SMTP_*` (alternate) keys, prefering the former. Required env keys:
 *   EMAIL_HOST   (or SMTP_HOST)   = smtp.gmail.com
 *   EMAIL_PORT   (or SMTP_PORT)   = 587
 *   EMAIL_USER   (or SMTP_USER)   = xinxinsoft.cn@gmail.com
 *   EMAIL_PASSWORD (or SMTP_PASS) = <google app password, no spaces>
 *   EMAIL_FROM   (or SMTP_FROM)   = "SilverConnect <xinxinsoft.cn@gmail.com>"
 *
 * If any required field is missing, sendEmail() resolves to
 * { ok:false, reason:"smtp-not-configured" } so the caller can show a
 * graceful error instead of crashing.
 */
import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

const env = (...names: string[]) => {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim().length > 0) return v;
  }
  return undefined;
};

let cachedTransport: Transporter | null = null;

function getTransport(): Transporter | null {
  if (cachedTransport) return cachedTransport;
  const host = env("EMAIL_HOST", "SMTP_HOST");
  const user = env("EMAIL_USER", "SMTP_USER");
  const pass = env("EMAIL_PASSWORD", "SMTP_PASS");
  if (!host || !user || !pass) return null;
  const port = Number(env("EMAIL_PORT", "SMTP_PORT") || 587);
  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return cachedTransport;
}

export interface SendResult {
  ok: boolean;
  messageId?: string;
  reason?: string;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<SendResult> {
  const t = getTransport();
  if (!t) {
    // Dev convenience: SMTP often isn't configured locally. Print the
    // would-be email body to the console so verification / reset codes
    // are usable without standing up Gmail. Never runs in production.
    if (process.env.NODE_ENV !== "production") {
      const banner = "═".repeat(60);

      console.log(
        `\n${banner}\n[DEV MAIL]  → ${opts.to}\n  ${opts.subject}\n  ${opts.text}\n${banner}\n`,
      );
    }
    return { ok: false, reason: "smtp-not-configured" };
  }
  const from =
    env("EMAIL_FROM", "SMTP_FROM") ||
    `SilverConnect <${env("EMAIL_USER", "SMTP_USER")}>`;
  try {
    const info = await t.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    const reason =
      err instanceof Error ? err.message : String(err);
    return { ok: false, reason };
  }
}

export function buildVerifyEmail(
  code: string,
  locale: string,
): { subject: string; text: string; html: string } {
  const isZh = locale.startsWith("zh");
  const subject = isZh
    ? `SilverConnect 验证码：${code}`
    : `SilverConnect verification code: ${code}`;
  const text = isZh
    ? `您的 SilverConnect 验证码是 ${code}。10 分钟内有效。如果不是您本人操作请忽略此邮件。`
    : `Your SilverConnect verification code is ${code}. It expires in 10 minutes. Ignore this email if you didn't request it.`;
  const html = isZh
    ? `<div style="font-family:system-ui,Helvetica,Arial,sans-serif;line-height:1.6">
<h2 style="margin:0 0 12px">SilverConnect 验证码</h2>
<p>您的验证码是：</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px;background:#E8F0FE;color:#1858C4;padding:12px 16px;border-radius:6px;display:inline-block;font-family:ui-monospace,monospace">${code}</p>
<p>10 分钟内有效。如果不是您本人操作，请忽略此邮件。</p>
</div>`
    : `<div style="font-family:system-ui,Helvetica,Arial,sans-serif;line-height:1.6">
<h2 style="margin:0 0 12px">Your verification code</h2>
<p>Use this code to finish signing in to SilverConnect:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px;background:#E8F0FE;color:#1858C4;padding:12px 16px;border-radius:6px;display:inline-block;font-family:ui-monospace,monospace">${code}</p>
<p>The code expires in 10 minutes. Ignore this email if you didn't request it.</p>
</div>`;
  return { subject, text, html };
}

type Built = { subject: string; text: string; html: string };

function frame(title: string, body: string, ctaLabel?: string, ctaUrl?: string): string {
  const button = ctaLabel && ctaUrl
    ? `<p style="margin:24px 0"><a href="${ctaUrl}" style="display:inline-block;background:#2D6A5E;color:#fff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:6px">${ctaLabel}</a></p>`
    : "";
  return `<div style="font-family:system-ui,Helvetica,Arial,sans-serif;line-height:1.6;max-width:560px;margin:0 auto;padding:24px;color:#1A2D2A">
<h2 style="margin:0 0 12px;font-size:20px">${title}</h2>
${body}
${button}
<hr style="margin:32px 0;border:none;border-top:1px solid #E5E5E5">
<p style="font-size:12px;color:#737373">SilverConnect — trusted home services for older adults.</p>
</div>`;
}

type BookingStatus = "confirmed" | "in_progress" | "completed" | "cancelled" | "released";

export function buildBookingStatusEmail(
  status: BookingStatus,
  appUrl: string,
  bookingId: string,
  locale: string,
): Built {
  const isZh = locale.startsWith("zh");
  const link = `${appUrl}/${locale}/bookings/${bookingId}`;
  const map: Record<BookingStatus, { en: [string, string]; zh: [string, string] }> = {
    confirmed: {
      en: ["Provider accepted your booking", "Your provider has accepted the booking. We'll send another update closer to the start time."],
      zh: ["服务者已接单", "您预约的服务者已接单，临近上门时间会再次通知您。"],
    },
    in_progress: {
      en: ["Your provider is on the way", "The service has started. We'll let you know when it's complete."],
      zh: ["服务者已出发", "服务已开始，结束后会再通知您。"],
    },
    completed: {
      en: ["Service complete — please confirm", "Your provider marked the service as complete. Tap below to confirm and release payment."],
      zh: ["服务已完成 — 请确认", "服务者已标记完成。点击下方按钮确认并释放托管付款。"],
    },
    cancelled: {
      en: ["Booking cancelled", "Your booking has been cancelled. If this wasn't expected please open the booking to see the reason."],
      zh: ["预约已取消", "您的预约已取消。如果这不是您本人操作，请打开预约详情查看原因。"],
    },
    released: {
      en: ["Payment released to your provider", "Thanks for confirming the service. Payment has been released to the provider."],
      zh: ["付款已释放给服务者", "感谢您的确认，付款已释放给服务者。"],
    },
  };
  const [title, body] = map[status][isZh ? "zh" : "en"];
  const cta = isZh ? "查看预约" : "View booking";
  const subject = isZh ? `SilverConnect：${title}` : `SilverConnect: ${title}`;
  return {
    subject,
    text: `${title}\n\n${body}\n\n${cta}: ${link}`,
    html: frame(title, `<p>${body}</p>`, cta, link),
  };
}

export function buildDisputeUpdateEmail(
  appUrl: string,
  disputeId: string,
  locale: string,
  state: "opened" | "decided",
): Built {
  const isZh = locale.startsWith("zh");
  const link = `${appUrl}/${locale}/help/disputes/${disputeId}`;
  const title = state === "opened"
    ? (isZh ? "争议已提交" : "Your dispute has been submitted")
    : (isZh ? "争议已裁决" : "Your dispute has been decided");
  const body = state === "opened"
    ? (isZh ? "我们已收到您的争议，48 小时内会有客服联系您。" : "We've received your dispute. An admin will contact you within 48 hours.")
    : (isZh ? "争议已裁决。请打开链接查看裁决结果与说明。" : "The dispute has been decided. Open the link below for the resolution and notes.");
  const cta = isZh ? "查看争议详情" : "View dispute";
  const subject = isZh ? `SilverConnect：${title}` : `SilverConnect: ${title}`;
  return {
    subject,
    text: `${title}\n\n${body}\n\n${cta}: ${link}`,
    html: frame(title, `<p>${body}</p>`, cta, link),
  };
}

export function buildProviderApprovalEmail(
  appUrl: string,
  locale: string,
  approved: boolean,
  reason?: string,
): Built {
  const isZh = locale.startsWith("zh");
  const link = `${appUrl}/${locale}/provider`;
  const title = approved
    ? (isZh ? "入驻审核通过" : "You're approved")
    : (isZh ? "入驻审核未通过" : "Application was not approved");
  const bodyHtml = approved
    ? (isZh ? "<p>恭喜！您的服务者入驻已通过审核，可以开始接单了。</p>" : "<p>Congratulations — your provider application has been approved. You can start accepting bookings.</p>")
    : (isZh
        ? `<p>很抱歉，您的入驻申请未能通过审核。${reason ? `<br>原因：${reason}` : ""}<br>您可以根据反馈完善资料后重新提交。</p>`
        : `<p>We weren't able to approve your application at this time.${reason ? `<br>Reason: ${reason}` : ""}<br>You can update your details and reapply.</p>`);
  const cta = isZh ? "进入服务者中心" : "Open provider home";
  const subject = isZh ? `SilverConnect：${title}` : `SilverConnect: ${title}`;
  return {
    subject,
    text: `${title}\n\n${(bodyHtml.replace(/<br>/g, "\n").replace(/<[^>]+>/g, ""))}\n\n${cta}: ${link}`,
    html: frame(title, bodyHtml, cta, link),
  };
}

export function buildResetEmail(
  code: string,
  locale: string,
): { subject: string; text: string; html: string } {
  const isZh = locale.startsWith("zh");
  const subject = isZh
    ? `SilverConnect 重置密码：${code}`
    : `SilverConnect password reset code: ${code}`;
  const text = isZh
    ? `您的 SilverConnect 密码重置码是 ${code}。10 分钟内有效。如果不是您本人请求，请忽略此邮件。`
    : `Your SilverConnect password reset code is ${code}. It expires in 10 minutes. Ignore this email if you didn't request it.`;
  const html = isZh
    ? `<div style="font-family:system-ui,Helvetica,Arial,sans-serif;line-height:1.6">
<h2 style="margin:0 0 12px">SilverConnect 密码重置</h2>
<p>您的密码重置码是：</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px;background:#FEEBC8;color:#9C4221;padding:12px 16px;border-radius:6px;display:inline-block;font-family:ui-monospace,monospace">${code}</p>
<p>10 分钟内有效。如果不是您本人请求，请忽略此邮件。</p>
</div>`
    : `<div style="font-family:system-ui,Helvetica,Arial,sans-serif;line-height:1.6">
<h2 style="margin:0 0 12px">Password reset code</h2>
<p>Use this code to reset your SilverConnect password:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px;background:#FEEBC8;color:#9C4221;padding:12px 16px;border-radius:6px;display:inline-block;font-family:ui-monospace,monospace">${code}</p>
<p>The code expires in 10 minutes. Ignore this email if you didn't request it.</p>
</div>`;
  return { subject, text, html };
}
