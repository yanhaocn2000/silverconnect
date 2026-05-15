import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  MapPin,
  CreditCard,
  PhoneCall,
  Heart,
  Bell,
  HelpCircle,
  ChevronRight,
  LogOut,
  Pencil,
  ShieldCheck,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Link, redirect } from "@/i18n/navigation";
import { getCountry } from "@/components/domain/countryCookie";
import { getSession } from "@/components/domain/sessionCookie";
import { ProviderAvatar } from "@/components/domain/ProviderAvatar";

const ITEMS = [
  { key: "edit",          href: "/profile/edit",          Icon: Pencil },
  { key: "security",      href: "/profile/security",      Icon: ShieldCheck },
  { key: "addresses",     href: "/profile/addresses",     Icon: MapPin },
  { key: "payment",       href: "/profile/payment",       Icon: CreditCard },
  { key: "emergency",     href: "/profile/emergency",     Icon: PhoneCall },
  { key: "favourites",    href: "/profile/favourites",    Icon: Heart },
  { key: "notifications", href: "/profile/notifications", Icon: Bell },
  { key: "help",          href: "/help",                  Icon: HelpCircle },
] as const;

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSession();
  if (!session.signedIn) {
    redirect({ href: "/auth/login", locale });
  }
  const country = await getCountry();
  const t = await getTranslations("profile");
  const tItems = await getTranslations("profile.items");

  const initials =
    session.initials ?? session.name?.slice(0, 1).toUpperCase() ?? "?";
  const name = session.name ?? "—";

  return (
    <>
      <Header
        country={country}
        signedIn={session.signedIn}
        initials={session.initials}
      />
      <main
        id="main-content"
        className="mx-auto w-full max-w-content px-5 pb-[120px] pt-6 sm:pb-12"
      >
        {/* Avatar header */}
        <section className="flex items-center gap-4">
          <ProviderAvatar size={96} hue={3} initials={initials} />
          <div className="min-w-0 flex-1">
            <h1 className="text-h2">{name}</h1>
            <p className="mt-1 text-[14px] text-text-tertiary">
              {t("memberSince", { date: locale.startsWith("zh") ? "2024 年 3 月" : "Mar 2024" })}
            </p>
          </div>
        </section>

        {/* List items */}
        <ul className="mt-6 overflow-hidden rounded-lg border border-border bg-bg-surface">
          {ITEMS.map((it, i) => (
            <li
              key={it.key}
              className={i > 0 ? "border-t border-border" : undefined}
            >
              <Link
                href={it.href}
                className="flex min-h-[72px] items-center gap-4 px-4 py-3"
              >
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand"
                >
                  <it.Icon size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-bold text-text-primary">
                    {tItems(it.key)}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-text-secondary">
                    {tItems(`${it.key}Desc` as Parameters<typeof tItems>[0])}
                  </span>
                </span>
                <ChevronRight
                  size={20}
                  className="shrink-0 text-text-tertiary"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>

        <form action="/auth/logout" method="POST">
          <button
            type="submit"
            className="mt-4 flex min-h-[72px] w-full items-center gap-4 overflow-hidden rounded-lg border border-border bg-bg-surface px-4 py-3 text-left"
          >
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-danger-soft text-danger"
            >
              <LogOut size={22} />
            </span>
            <span className="flex-1 text-[16px] font-bold text-danger">
              {tItems("signOut")}
            </span>
          </button>
        </form>
      </main>
    </>
  );
}
