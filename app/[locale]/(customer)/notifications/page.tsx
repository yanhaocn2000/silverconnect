import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { eq, and, inArray, isNull, desc } from "drizzle-orm";
import { Calendar, MessageCircle, Settings } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Link } from "@/i18n/navigation";
import { cn } from "@/components/ui/cn";
import { getCountry } from "@/components/domain/countryCookie";
import type { CountryCode } from "@/components/layout";
import { EmptyState } from "@/components/domain/PageStates";
import { S4EmptyChat } from "@/components/illustrations";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema/notifications";
import { getCurrentUser } from "@/lib/auth/server";

const TABS = ["all", "bookings", "ai", "system"] as const;
type Tab = (typeof TABS)[number];

type NotificationKind =
  | "booking_update"
  | "payment"
  | "dispute"
  | "safety"
  | "review"
  | "system"
  | "marketing";

const KINDS_BY_TAB: Record<Tab, NotificationKind[] | null> = {
  all: null,
  bookings: ["booking_update", "payment", "dispute"],
  ai: [],
  system: ["system", "marketing", "safety", "review"],
};

function iconForKind(kind: NotificationKind) {
  switch (kind) {
    case "booking_update":
    case "payment":
    case "dispute":
      return { Icon: Calendar, bg: "bg-brand-soft text-brand" };
    case "review":
    case "safety":
      return {
        Icon: MessageCircle,
        bg: "bg-brand-accent-soft text-[#92590A] dark:text-[var(--brand-accent)]",
      };
    case "system":
    case "marketing":
    default:
      return { Icon: Settings, bg: "bg-bg-surface-2 text-text-secondary" };
  }
}

function timeAgo(date: Date, locale: string): string {
  const ms = Date.now() - date.getTime();
  const min = Math.round(ms / 60_000);
  const hr = Math.round(ms / 3_600_000);
  const day = Math.round(ms / 86_400_000);
  if (locale.startsWith("zh")) {
    if (min < 1) return "刚刚";
    if (min < 60) return `${min} 分钟前`;
    if (hr < 24) return `${hr} 小时前`;
    if (day === 1) return "昨天";
    return `${day} 天前`;
  }
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  if (hr < 24) return `${hr} hr ago`;
  if (day === 1) return "Yesterday";
  return `${day} d ago`;
}

async function markAllReadAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const tab = String(formData.get("tab") ?? "all");
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.userId, me.id), isNull(notifications.readAt)),
    );
  nextRedirect(`/${locale}/notifications?tab=${tab}`);
}

export default async function NotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  const t = await getTranslations("notifications");
  const tNav = await getTranslations("nav");
  const country = await getCountry();

  const rawTab = typeof sp.tab === "string" ? sp.tab : "all";
  const tab: Tab = (TABS as readonly string[]).includes(rawTab)
    ? (rawTab as Tab)
    : "all";

  const kinds = KINDS_BY_TAB[tab];
  const conditions = [eq(notifications.userId, me.id)];
  if (kinds && kinds.length > 0) {
    conditions.push(inArray(notifications.kind, kinds));
  } else if (kinds && kinds.length === 0) {
    // 'ai' tab — no notification kinds yet; render empty without
    // running a query that would always be empty.
    return (
      <NotificationsShell
        tab={tab}
        country={country}
        meInitials={me.initials}
        locale={locale}
        tNav={tNav}
        t={t}
      >
        <EmptyState illustration={S4EmptyChat} title={t("empty")} />
      </NotificationsShell>
    );
  }
  const items = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const lang: "zh" | "en" = locale.startsWith("zh") ? "zh" : "en";

  return (
    <NotificationsShell
      tab={tab}
      country={country}
      meInitials={me.initials}
      locale={locale}
      tNav={tNav}
      t={t}
    >
      {items.length === 0 ? (
        <EmptyState illustration={S4EmptyChat} title={t("empty")} />
      ) : (
        <ul className="px-5 py-4">
          {items.map((n, i) => {
            const { Icon, bg } = iconForKind(n.kind as NotificationKind);
            const unread = n.readAt === null;
            const inner = (
              <>
                <span
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-md",
                    bg,
                  )}
                >
                  <Icon size={22} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-text-primary">
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="mt-0.5 text-[14px] text-text-secondary">
                      {n.body}
                    </p>
                  )}
                  <p className="mt-1 text-[12px] text-text-tertiary">
                    {timeAgo(n.createdAt, lang)}
                  </p>
                </div>
                {unread && (
                  <span
                    aria-hidden
                    className="mt-2 h-2 w-2 shrink-0 rounded-full bg-danger"
                  />
                )}
              </>
            );
            const className = cn(
              "flex items-start gap-3 rounded-md p-3.5",
              i > 0 && "border-t border-border",
              unread ? "bg-brand-soft/40" : "",
            );
            return n.link ? (
              <li key={n.id} className={className}>
                <Link
                  href={n.link}
                  className="flex flex-1 items-start gap-3 no-underline"
                >
                  {inner}
                </Link>
              </li>
            ) : (
              <li key={n.id} className={className}>
                {inner}
              </li>
            );
          })}
        </ul>
      )}
    </NotificationsShell>
  );

  function NotificationsShell({
    tab,
    country,
    meInitials,
    locale,
    t,
    tNav,
    children,
  }: {
    tab: Tab;
    country: CountryCode;
    meInitials: string;
    locale: string;
    t: Awaited<ReturnType<typeof getTranslations<"notifications">>>;
    tNav: Awaited<ReturnType<typeof getTranslations<"nav">>>;
    children: React.ReactNode;
  }) {
    return (
      <>
        <Header country={country} signedIn={true} initials={meInitials} />
        <main
          id="main-content"
          className="mx-auto w-full max-w-content pb-[120px] sm:pb-12"
        >
          <nav
            aria-label={tNav("messages")}
            className="flex h-14 items-center justify-between border-b border-border bg-bg-surface px-4"
          >
            <div className="flex gap-3">
              {TABS.map((k) => {
                const on = k === tab;
                const labelKey =
                  `tabs${k.charAt(0).toUpperCase() + k.slice(1)}` as Parameters<
                    typeof t
                  >[0];
                return (
                  <Link
                    key={k}
                    href={`/notifications?tab=${k}`}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "text-[14px]",
                      on
                        ? "font-bold text-brand"
                        : "font-medium text-text-secondary",
                    )}
                  >
                    {t(labelKey)}
                  </Link>
                );
              })}
            </div>
            <form action={markAllReadAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="tab" value={tab} />
              <button
                type="submit"
                className="text-[13px] font-semibold text-brand"
              >
                {t("markAllRead")}
              </button>
            </form>
          </nav>
          {children}
        </main>
      </>
    );
  }
}
