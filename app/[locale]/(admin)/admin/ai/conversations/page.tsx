import { setRequestLocale, getTranslations } from "next-intl/server";
import { X, ShieldAlert, Check } from "lucide-react";
import { eq, desc, sql, asc } from "drizzle-orm";
import { Link, redirect } from "@/i18n/navigation";
import { AdminShell } from "@/components/layout/AdminShell";
import { getAdmin } from "@/components/domain/adminCookie";
import { db } from "@/lib/db";
import { aiConversations, aiMessages } from "@/lib/db/schema/ai";
import { users } from "@/lib/db/schema/users";

export default async function AdminAiConversationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const admin = await getAdmin();
  if (!admin.signedIn) redirect({ href: "/admin/login", locale });
  const t = await getTranslations("admin");
  const tA = await getTranslations("aAi");

  const drawerId = typeof sp.id === "string" ? sp.id : null;

  const rows = await db
    .select({
      id: aiConversations.id,
      userId: aiConversations.userId,
      userName: users.name,
      userEmail: users.email,
      locale: aiConversations.locale,
      closedAt: aiConversations.closedAt,
      emergencyTriggeredAt: aiConversations.emergencyTriggeredAt,
      createdAt: aiConversations.createdAt,
      msgCount: sql<number>`(SELECT COUNT(*)::int FROM ${aiMessages} WHERE ${aiMessages.conversationId} = ${aiConversations.id})`,
    })
    .from(aiConversations)
    .leftJoin(users, eq(users.id, aiConversations.userId))
    .orderBy(desc(aiConversations.createdAt))
    .limit(100);

  let drawer:
    | {
        id: string;
        userLabel: string;
        locale: string;
        emergency: boolean;
        closed: boolean;
        messages: { role: string; content: string; createdAt: Date }[];
      }
    | null = null;

  if (drawerId) {
    const target = rows.find((r) => r.id === drawerId);
    if (target) {
      const msgs = await db
        .select({
          role: aiMessages.role,
          content: aiMessages.content,
          createdAt: aiMessages.createdAt,
        })
        .from(aiMessages)
        .where(eq(aiMessages.conversationId, target.id))
        .orderBy(asc(aiMessages.createdAt));
      drawer = {
        id: target.id,
        userLabel:
          target.userName ||
          target.userEmail?.split("@")[0] ||
          "(anonymous)",
        locale: target.locale,
        emergency: !!target.emergencyTriggeredAt,
        closed: !!target.closedAt,
        messages: msgs.map((m) => ({
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })),
      };
    }
  }

  return (
    <AdminShell email={admin.email ?? ""}>
      <h1 className="text-h2">{tA("convTitle")}</h1>
      <p className="mt-1 text-[15px] text-text-secondary">{tA("convSub")}</p>

      <div className="mt-5 overflow-hidden rounded-lg border border-border bg-bg-surface">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-border bg-bg-surface-2 text-text-secondary">
            <tr>
              <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide">
                {t("colId")}
              </th>
              <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide">
                {t("colCustomer")}
              </th>
              <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide">
                Locale
              </th>
              <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide">
                Msgs
              </th>
              <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide">
                {t("colStatus")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-[13px] text-text-tertiary"
                >
                  —
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr
                  key={c.id}
                  className={
                    "border-b border-border last:border-b-0 " +
                    (c.id === drawerId ? "bg-brand-soft" : "")
                  }
                >
                  <td className="px-4 py-3 font-bold tabular-nums">
                    <Link href={`?id=${c.id}`} className="text-brand">
                      {c.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {c.userName ||
                      c.userEmail?.split("@")[0] ||
                      "(anonymous)"}
                  </td>
                  <td className="px-4 py-3 uppercase">{c.locale}</td>
                  <td className="px-4 py-3 tabular-nums">{c.msgCount}</td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap gap-1">
                      {c.emergencyTriggeredAt && (
                        <span className="inline-flex h-6 items-center gap-1 rounded-sm bg-danger-soft px-2 text-[11px] font-bold uppercase text-danger">
                          <ShieldAlert size={11} aria-hidden />{" "}
                          {tA("emergency")}
                        </span>
                      )}
                      {c.closedAt && (
                        <span className="inline-flex h-6 items-center gap-1 rounded-sm bg-success-soft px-2 text-[11px] font-bold uppercase text-success">
                          <Check size={11} aria-hidden /> {tA("resolved")}
                        </span>
                      )}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {drawer && (
        <>
          <Link
            href="/admin/ai/conversations"
            aria-label={t("drawerClose")}
            className="fixed inset-0 z-40 bg-black/30"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={tA("drawer")}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col overflow-y-auto border-l border-border bg-bg-surface shadow-xl"
          >
            <header className="sticky top-0 flex items-center justify-between border-b border-border bg-bg-surface px-5 py-3">
              <p className="text-[16px] font-bold tabular-nums">
                {drawer.id.slice(0, 8)}
              </p>
              <Link
                href="/admin/ai/conversations"
                aria-label={t("drawerClose")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-bg-surface-2"
              >
                <X size={18} aria-hidden />
              </Link>
            </header>
            <div className="flex-1 px-5 py-5">
              <p className="text-[13px] text-text-tertiary">
                {drawer.userLabel} · {drawer.locale.toUpperCase()}
              </p>
              <ol className="mt-4 flex flex-col gap-3">
                {drawer.messages.map((m, i) => (
                  <li
                    key={i}
                    className={
                      "flex " +
                      (m.role === "user" ? "justify-end" : "justify-start")
                    }
                  >
                    <p
                      className={
                        "max-w-[80%] rounded-md px-3 py-2 text-[14px] whitespace-pre-wrap " +
                        (m.role === "user"
                          ? "bg-brand text-white"
                          : "bg-bg-surface-2 text-text-primary")
                      }
                    >
                      {m.content}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </>
      )}
    </AdminShell>
  );
}
