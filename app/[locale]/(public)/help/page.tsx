import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  Sparkles,
  Calendar,
  CreditCard,
  Shield,
  UserCircle,
  ChevronRight,
  Phone,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Link } from "@/i18n/navigation";
import { HELP_ARTICLES } from "@/components/domain/helpArticles";
import { getCountry } from "@/components/domain/countryCookie";
import { getSession } from "@/components/domain/sessionCookie";

const CATEGORY_META = [
  { key: "gettingStarted", labelKey: "categoryGettingStarted", Icon: Sparkles },
  { key: "bookings",       labelKey: "categoryBookings",       Icon: Calendar },
  { key: "payments",       labelKey: "categoryPayments",       Icon: CreditCard },
  { key: "safety",         labelKey: "categorySafety",         Icon: Shield },
  { key: "account",        labelKey: "categoryAccount",        Icon: UserCircle },
] as const;

export default async function HelpHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const country = await getCountry();
  const session = await getSession();
  const t = await getTranslations("help");
  const lang = locale as "en" | "zh-CN" | "zh-TW" | "ja" | "ko";
  const q = sp.q;

  return (
    <>
      <Header
        country={country}
        signedIn={session.signedIn}
        initials={session.initials}
      />
      <main
        id="main-content"
        className="mx-auto w-full max-w-content px-5 pb-12 pt-6"
      >
        <h1 className="text-h1">{t("title")}</h1>
        <p className="mt-1 text-[15px] text-text-secondary">{t("sub")}</p>

        {/* Search — submits to the locale-prefixed /help with ?q= so
             pressing Enter actually does something. The future search
             route reads sp.q. */}
        <form
          action={`/${locale}/help`}
          method="get"
          className="mt-5"
          role="search"
        >
          <input
            type="search"
            name="q"
            placeholder={t("searchPh")}
            aria-label={t("searchAria")}
            defaultValue={typeof q === "string" ? q : ""}
            className="block h-14 w-full rounded-md border-[1.5px] border-border-strong bg-bg-surface px-4 text-[17px] text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none"
          />
        </form>

        {/* Category grid */}
        <h2 className="mt-7 text-h3">{t("categories")}</h2>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CATEGORY_META.map((c) => (
            <li key={c.key}>
              <Link
                href={`/help#${c.key}`}
                className="flex h-[100px] flex-col justify-between rounded-lg border border-border bg-bg-surface p-4 shadow-card hover:shadow-card-hover"
              >
                <span
                  aria-hidden
                  className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-soft text-brand"
                >
                  <c.Icon size={22} />
                </span>
                <span className="text-[15px] font-bold text-text-primary">
                  {t(c.labelKey as Parameters<typeof t>[0])}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Popular articles */}
        <h2 className="mt-7 text-h3">{t("popular")}</h2>
        <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-bg-surface">
          {HELP_ARTICLES.map((a, i) => (
            <li
              key={a.slug}
              className={i > 0 ? "border-t border-border" : undefined}
              id={a.category}
            >
              <Link
                href={`/help/${a.slug}`}
                className="flex min-h-[72px] items-center gap-4 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-bold text-text-primary">
                    {a.title[lang]}
                  </p>
                  <p className="mt-0.5 text-[13px] text-text-secondary">
                    {a.summary[lang]}
                  </p>
                </div>
                <ChevronRight
                  size={20}
                  className="shrink-0 text-text-tertiary"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>

        {/* Contact card */}
        <section className="mt-7 flex items-start gap-4 rounded-lg border-[1.5px] border-brand bg-brand-soft p-5">
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-white"
          >
            <Phone size={22} />
          </span>
          <div className="flex-1">
            <h2 className="text-[17px] font-bold text-text-primary">
              {t("contactCardTitle")}
            </h2>
            <p className="mt-0.5 text-[14px] text-text-secondary">
              {t("contactCardSub")}
            </p>
            <Link
              href="/chat"
              className="mt-3 inline-flex h-12 items-center rounded-md bg-brand px-5 text-[15px] font-bold text-white"
            >
              {t("contactCardCta")}
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
