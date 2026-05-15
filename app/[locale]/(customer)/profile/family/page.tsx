import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { CheckCircle2, UserPlus, Trash2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ProviderAvatar } from "@/components/domain/ProviderAvatar";
import { getCountry } from "@/components/domain/countryCookie";
import { db } from "@/lib/db";
import { familyMembers } from "@/lib/db/schema/customer-data";
import { getCurrentUser } from "@/lib/auth/server";

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name.slice(0, 2) || "?").toUpperCase();
}

async function inviteAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const canBook = formData.get("canBook") === "1";
  if (!name || !email.includes("@")) {
    nextRedirect(`/${locale}/profile/family?error=invalid`);
  }
  await db.insert(familyMembers).values({
    userId: me.id,
    name,
    email,
    canBookForUser: canBook,
  });
  // Real invite flow (email + accept token) is deferred to Wave 2.
  nextRedirect(`/${locale}/profile/family?invited=1`);
}

async function removeAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  if (!id) nextRedirect(`/${locale}/profile/family`);
  await db
    .delete(familyMembers)
    .where(and(eq(familyMembers.id, id), eq(familyMembers.userId, me.id)));
  nextRedirect(`/${locale}/profile/family`);
}

export default async function FamilyPage({
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
  const country = await getCountry();
  const t = await getTranslations("family");
  const invited = sp.invited === "1";
  const error = typeof sp.error === "string" ? sp.error : undefined;

  const members = await db
    .select()
    .from(familyMembers)
    .where(eq(familyMembers.userId, me.id))
    .orderBy(familyMembers.createdAt);

  return (
    <>
      <Header country={country} back signedIn={true} initials={me.initials} />
      <main
        id="main-content"
        className="mx-auto w-full max-w-content px-5 pb-[120px] pt-6 sm:pb-12"
      >
        <h1 className="text-h2">{t("title")}</h1>
        <p className="mt-1 text-[15px] text-text-secondary">{t("sub")}</p>

        {invited && (
          <div
            role="status"
            className="mt-4 flex items-center gap-2 rounded-md bg-success-soft px-3.5 py-3 text-[15px] font-semibold text-success"
          >
            <CheckCircle2 size={18} aria-hidden /> {t("inviteSend")}
          </div>
        )}
        {error === "invalid" && (
          <div
            role="alert"
            className="mt-4 rounded-md border-[1.5px] border-danger bg-danger-soft px-3.5 py-3 text-[14px] font-semibold text-danger"
          >
            {t("inviteName")} + {t("inviteEmail")}
          </div>
        )}

        <h2 className="mt-6 text-[18px] font-bold">{t("members")}</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {/* Self entry — the current user */}
          <li className="flex items-center gap-3 rounded-lg border border-border bg-bg-surface p-3">
            <ProviderAvatar size={44} hue={1} initials={me.initials} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold">
                {me.name || me.email}
                <span className="ml-2 text-[12px] font-semibold text-text-tertiary">
                  · {t("self")}
                </span>
              </p>
              <p className="text-[12px] text-text-tertiary tabular-nums">
                {me.email}
              </p>
              <div className="mt-1 flex flex-wrap gap-2 text-[12px]">
                <span className="rounded-sm bg-bg-surface-2 px-2 py-0.5 font-semibold text-text-secondary">
                  {t("roleAdmin")}
                </span>
              </div>
            </div>
          </li>

          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-bg-surface p-3"
            >
              <ProviderAvatar
                size={44}
                hue={2}
                initials={deriveInitials(m.name)}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold">{m.name}</p>
                <p className="text-[12px] text-text-tertiary tabular-nums">
                  {m.email}
                </p>
                <div className="mt-1 flex flex-wrap gap-2 text-[12px]">
                  <span className="rounded-sm bg-bg-surface-2 px-2 py-0.5 font-semibold text-text-secondary">
                    {t(m.canBookForUser ? "rolePayer" : "roleViewer")}
                  </span>
                  <span className="rounded-sm bg-warning-soft px-2 py-0.5 font-semibold text-warning">
                    {t("pending")}
                  </span>
                </div>
              </div>
              <form action={removeAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={m.id} />
                <button
                  type="submit"
                  aria-label={t("revoke")}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-sm border-[1.5px] border-danger text-danger"
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </form>
            </li>
          ))}
        </ul>

        <form
          action={inviteAction}
          className="mt-6 flex flex-col gap-4 rounded-lg border-2 border-dashed border-border-strong bg-bg-surface p-5"
        >
          <input type="hidden" name="locale" value={locale} />
          <h3 className="flex items-center gap-2 text-[16px] font-bold">
            <UserPlus size={18} className="text-brand" aria-hidden />
            {t("inviteCta")}
          </h3>
          <div>
            <Label htmlFor="iname">{t("inviteName")}</Label>
            <Input id="iname" name="name" autoComplete="name" required />
          </div>
          <div>
            <Label htmlFor="iemail">{t("inviteEmail")}</Label>
            <Input
              id="iemail"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
            />
          </div>
          <label className="inline-flex items-center gap-2 text-[14px] text-text-secondary">
            <input type="checkbox" name="canBook" value="1" />
            {t("rolePayer")}
          </label>
          <Button type="submit" variant="primary" block size="md">
            {t("inviteSend")}
          </Button>
        </form>
      </main>
    </>
  );
}
