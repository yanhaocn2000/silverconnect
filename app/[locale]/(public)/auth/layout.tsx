import { setRequestLocale } from "next-intl/server";

/**
 * Auth-only layout: the theme toggle is rendered inside AuthCard's
 * top-right corner (Phase 1 design), so this layout just plumbs the
 * locale through to its server children.
 */
export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <>{children}</>;
}
