import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { getCountry } from "@/components/domain/countryCookie";
import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema/customer-data";
import { getCurrentUser } from "@/lib/auth/server";

type CountryCode = "AU" | "US" | "CA";

async function addAddressAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  const country = String(formData.get("country") ?? "AU") as CountryCode;
  const label = String(formData.get("label") ?? "").trim() || null;
  const line1 = String(formData.get("street") ?? "").trim();
  const city = String(formData.get("suburb") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim() || null;
  const postcode = String(formData.get("postcode") ?? "").trim() || null;
  if (!line1 || !city) {
    nextRedirect(`/${locale}/profile/addresses/new?error=required`);
  }
  const existingCount = await db
    .select({ id: addresses.id })
    .from(addresses)
    .where(eq(addresses.userId, me.id));
  await db.insert(addresses).values({
    userId: me.id,
    label,
    line1,
    city,
    state,
    postcode,
    country,
    isDefault: existingCount.length === 0,
  });
  nextRedirect(`/${locale}/profile/addresses`);
}

export default async function NewAddressPage({
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
  const t = await getTranslations("addresses");
  const tCommon = await getTranslations("common");
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <>
      <Header country={country} back signedIn={true} initials={me.initials} />
      <main
        id="main-content"
        className="mx-auto w-full max-w-content px-5 pb-[120px] pt-6 sm:pb-12"
      >
        <Link
          href="/profile/addresses"
          className="inline-flex h-10 items-center gap-1 text-[13px] font-semibold text-brand"
        >
          <ChevronLeft size={16} aria-hidden /> {t("title")}
        </Link>

        <h1 className="mt-2 text-h2">{t("addNew")}</h1>

        <form
          action={addAddressAction}
          className="mt-5 flex flex-col gap-4 rounded-lg border border-border bg-bg-surface p-5"
        >
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="country" value={country} />
          {error === "required" && (
            <div
              role="alert"
              className="rounded-md border-[1.5px] border-danger bg-danger-soft px-3.5 py-2 text-[14px] font-semibold text-danger"
            >
              {t("emptyHint")}
            </div>
          )}
          <div>
            <Label htmlFor="label">{t("label")}</Label>
            <Input id="label" name="label" defaultValue={t("labelHome")} />
          </div>
          <div>
            <Label htmlFor="street">{t("addressLine")}</Label>
            <Input
              id="street"
              name="street"
              autoComplete="street-address"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="suburb">{t("suburb")}</Label>
              <Input
                id="suburb"
                name="suburb"
                autoComplete="address-level2"
                required
              />
            </div>
            <div>
              <Label htmlFor="state">{t("state")}</Label>
              <Input
                id="state"
                name="state"
                autoComplete="address-level1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="postcode">{t("postcode")}</Label>
            <Input
              id="postcode"
              name="postcode"
              autoComplete="postal-code"
              inputMode="numeric"
            />
          </div>
          <Button type="submit" variant="primary" block size="md">
            {tCommon("save")}
          </Button>
        </form>
      </main>
    </>
  );
}
