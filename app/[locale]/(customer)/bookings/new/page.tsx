import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { after } from "next/server";
import { eq, and, asc } from "drizzle-orm";
import { Header } from "@/components/layout/Header";
import { Link } from "@/i18n/navigation";
import { BookingProgress } from "@/components/domain/BookingProgress";
import { CURRENCY_SYMBOL, TAX_ABBR } from "@/components/domain/country";
import { getCountry } from "@/components/domain/countryCookie";
import { db } from "@/lib/db";
import { services, servicePrices } from "@/lib/db/schema/services";
import { providerProfiles, providerCategories } from "@/lib/db/schema/providers";
import { users } from "@/lib/db/schema/users";
import { addresses } from "@/lib/db/schema/customer-data";
import { bookings, bookingChanges } from "@/lib/db/schema/bookings";
import { getCurrentUser } from "@/lib/auth/server";
import { getAuthSession, type BookingDraft } from "@/lib/auth/session";
import { notify } from "@/lib/notifications/server";

type Step = 1 | 2 | 3 | 4;

function clampStep(raw: string | undefined): Step {
  const n = Number.parseInt(raw ?? "1", 10);
  return (Math.min(Math.max(Number.isNaN(n) ? 1 : n, 1), 4) as Step) || 1;
}

async function readDraft(): Promise<BookingDraft> {
  const s = await getAuthSession();
  return s.bookingDraft ?? {};
}

async function writeDraft(patch: Partial<BookingDraft>): Promise<void> {
  const s = await getAuthSession();
  s.bookingDraft = { ...(s.bookingDraft ?? {}), ...patch };
  await s.save();
}

async function clearDraft(): Promise<void> {
  const s = await getAuthSession();
  s.bookingDraft = undefined;
  await s.save();
}

async function saveStep1(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  const serviceId = String(formData.get("serviceId") ?? "");
  if (!serviceId) {
    nextRedirect(`/${locale}/bookings/new?step=1&error=pickService`);
  }
  const [svc] = await db
    .select({ id: services.id })
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.enabled, true)))
    .limit(1);
  if (!svc) nextRedirect(`/${locale}/bookings/new?step=1&error=invalid`);
  await writeDraft({ serviceId });
  nextRedirect(`/${locale}/bookings/new?step=2`);
}

async function saveStep2(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  const draft = await readDraft();
  if (!draft.serviceId) {
    nextRedirect(`/${locale}/bookings/new?step=1&error=missingService`);
  }
  const providerId = String(formData.get("providerId") ?? "");
  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "");
  const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;
  if (
    !providerId ||
    !scheduledAt ||
    Number.isNaN(scheduledAt.getTime()) ||
    scheduledAt.getTime() < Date.now()
  ) {
    nextRedirect(`/${locale}/bookings/new?step=2&error=pick`);
  }
  // Verify provider exists + is approved.
  const [p] = await db
    .select({ id: providerProfiles.id })
    .from(providerProfiles)
    .where(
      and(
        eq(providerProfiles.id, providerId),
        eq(providerProfiles.onboardingStatus, "approved"),
      ),
    )
    .limit(1);
  if (!p) nextRedirect(`/${locale}/bookings/new?step=2&error=invalid`);
  await writeDraft({ providerId, scheduledAt: scheduledAt.toISOString() });
  nextRedirect(`/${locale}/bookings/new?step=3`);
}

async function saveStep3(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  const addressId = String(formData.get("addressId") ?? "");
  if (!addressId) {
    nextRedirect(`/${locale}/bookings/new?step=3&error=pickAddress`);
  }
  const [a] = await db
    .select({ id: addresses.id })
    .from(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.userId, me.id)))
    .limit(1);
  if (!a) nextRedirect(`/${locale}/bookings/new?step=3&error=invalid`);
  await writeDraft({ addressId });
  nextRedirect(`/${locale}/bookings/new?step=4`);
}

async function finalizeBooking(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const country = String(formData.get("country") ?? "AU") as "AU" | "US" | "CA";
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  const draft = await readDraft();
  if (!draft.serviceId || !draft.providerId || !draft.addressId || !draft.scheduledAt) {
    nextRedirect(`/${locale}/bookings/new?step=1&error=incomplete`);
  }

  // Snapshot price + duration at booking time.
  const [svc] = await db
    .select({ id: services.id, durationMin: services.durationMin })
    .from(services)
    .where(eq(services.id, draft.serviceId!))
    .limit(1);
  const [price] = await db
    .select({
      basePrice: servicePrices.basePrice,
      taxRate: servicePrices.taxRate,
      currency: servicePrices.currency,
    })
    .from(servicePrices)
    .where(
      and(
        eq(servicePrices.serviceId, draft.serviceId!),
        eq(servicePrices.country, country),
      ),
    )
    .limit(1);
  if (!svc || !price) {
    nextRedirect(`/${locale}/bookings/new?step=1&error=priceMissing`);
  }
  const base = Number(price.basePrice);
  const tax = +(base * Number(price.taxRate)).toFixed(2);
  const total = +(base + tax).toFixed(2);

  let createdId = "";
  await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(bookings)
      .values({
        customerId: me.id,
        providerId: draft.providerId!,
        serviceId: draft.serviceId!,
        addressId: draft.addressId!,
        scheduledAt: new Date(draft.scheduledAt!),
        durationMin: svc.durationMin,
        status: "pending",
        notes,
        basePrice: base.toFixed(2),
        taxAmount: tax.toFixed(2),
        totalPrice: total.toFixed(2),
        currency: price.currency,
      })
      .returning({ id: bookings.id });
    createdId = created!.id;
    await tx.insert(bookingChanges).values({
      bookingId: createdId,
      type: "created",
      toStatus: "pending",
      actorId: me.id,
      note: "Customer booking submitted, awaiting payment",
    });
  });
  await clearDraft();
  // Provider notification — fetch their user_id so we can write a
  // notifications row pointing at the new booking. Deferred via after()
  // so the redirect isn't blocked.
  after(async () => {
    const [p] = await db
      .select({ userId: providerProfiles.userId })
      .from(providerProfiles)
      .where(eq(providerProfiles.id, draft.providerId!))
      .limit(1);
    if (p?.userId) {
      await notify({
        userId: p.userId,
        kind: "booking_update",
        title: "New booking request",
        body: `Customer booking · awaiting payment · ${price.currency} ${total.toFixed(2)}`,
        link: `/${locale}/provider/jobs/${createdId}`,
        relatedBookingId: createdId,
      });
    }
  });
  // Stripe wiring lands separately; for now route to the existing
  // /pay/[id] placeholder so the flow is end-to-end visible.
  nextRedirect(`/${locale}/pay/${createdId}`);
}

export default async function BookingNewPage({
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
  const t = await getTranslations("booking");
  const tCommon = await getTranslations("common");
  const tCategories = await getTranslations("categories");
  const sym = CURRENCY_SYMBOL[country];
  const taxAbbr = TAX_ABBR[country];
  const isZh = locale.startsWith("zh");

  const step = clampStep(typeof sp.step === "string" ? sp.step : undefined);
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const draft = await readDraft();

  // ---- STEP 1: pick a service variant ----
  if (step === 1) {
    const rows = await db
      .select({
        id: services.id,
        code: services.code,
        category: services.categoryCode,
        durationMin: services.durationMin,
        basePrice: servicePrices.basePrice,
      })
      .from(services)
      .leftJoin(
        servicePrices,
        and(
          eq(servicePrices.serviceId, services.id),
          eq(servicePrices.country, country),
        ),
      )
      .where(eq(services.enabled, true))
      .orderBy(asc(services.categoryCode), asc(services.sortOrder));

    return (
      <Wizard step={step} country={country} initials={me.initials}>
        <h1 className="text-[22px] font-bold">{t("step1Title")}</h1>
        {error === "pickService" && (
          <Alert>{isZh ? "请选择一个服务" : "Pick a service"}</Alert>
        )}
        <form action={saveStep1} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="locale" value={locale} />
          <ul className="flex flex-col gap-3">
            {rows.map((s) => {
              const checked = draft.serviceId === s.id;
              return (
                <li key={s.id}>
                  <label
                    className={
                      "flex cursor-pointer items-center gap-3 rounded-md border-[1.5px] bg-bg-surface p-4 has-[:checked]:border-2 has-[:checked]:border-brand " +
                      (checked ? "border-brand" : "border-border")
                    }
                  >
                    <input
                      type="radio"
                      name="serviceId"
                      value={s.id}
                      defaultChecked={checked}
                      required
                      className="peer sr-only"
                    />
                    <span
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border-strong after:hidden after:h-3 after:w-3 after:rounded-full after:bg-brand after:content-[''] peer-checked:border-brand peer-checked:after:block"
                      aria-hidden
                    />
                    <span className="flex-1">
                      <span className="block text-[17px] font-bold">
                        {tCategories(
                          s.category as Parameters<typeof tCategories>[0],
                        )}{" "}
                        · {(s.durationMin / 60).toFixed(1)}h
                      </span>
                      <span className="mt-0.5 block text-[14px] text-text-secondary tabular-nums">
                        {s.code}
                      </span>
                    </span>
                    <span className="text-[18px] font-bold text-brand tabular-nums">
                      {sym}
                      {s.basePrice ? Number(s.basePrice).toFixed(0) : "—"}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <Footer step={step} t={tCommon} backHref="/home" />
        </form>
      </Wizard>
    );
  }

  // ---- STEP 2: pick provider + datetime ----
  if (step === 2) {
    if (!draft.serviceId) {
      nextRedirect(`/${locale}/bookings/new?step=1`);
    }
    const [svc] = await db
      .select({ category: services.categoryCode })
      .from(services)
      .where(eq(services.id, draft.serviceId!))
      .limit(1);
    const cat = svc?.category as Parameters<typeof tCategories>[0] | undefined;

    // Approved providers offering this category.
    const providers = cat
      ? await db
          .select({
            id: providerProfiles.id,
            userId: providerProfiles.userId,
            radius: providerProfiles.serviceRadiusKm,
            providerName: users.name,
            providerEmail: users.email,
          })
          .from(providerProfiles)
          .innerJoin(
            providerCategories,
            eq(providerCategories.providerId, providerProfiles.id),
          )
          .leftJoin(users, eq(users.id, providerProfiles.userId))
          .where(
            and(
              eq(providerProfiles.onboardingStatus, "approved"),
              eq(providerCategories.category, cat as never),
            ),
          )
          .limit(50)
      : [];

    // Default the picker to whatever's in the draft. The "must be at
    // least 1h from now" rule is enforced in saveStep2, not in the input
    // attributes — computing min={Date.now()} at render time trips the
    // react-compiler purity rule and there's no working suppression for
    // that rule in our ESLint config.
    const defaultDateTime = draft.scheduledAt?.slice(0, 16) ?? "";

    return (
      <Wizard step={step} country={country} initials={me.initials}>
        <h1 className="text-[22px] font-bold">{t("step2Title")}</h1>
        {error === "pick" && (
          <Alert>
            {isZh ? "请选择服务者并设置时间（必须晚于现在）" : "Pick a provider and a future time"}
          </Alert>
        )}
        {providers.length === 0 ? (
          <p className="mt-6 rounded-md border border-border bg-bg-surface p-4 text-[14px] text-text-secondary">
            {isZh
              ? "目前没有可服务的提供者，请稍后再试。"
              : "No approved providers for this service yet — please try later."}
          </p>
        ) : (
          <form action={saveStep2} className="mt-4 flex flex-col gap-4">
            <input type="hidden" name="locale" value={locale} />
            <fieldset>
              <legend className="text-[15px] font-bold">
                {isZh ? "服务者" : "Provider"}
              </legend>
              <ul className="mt-2 flex flex-col gap-2">
                {providers.map((p) => {
                  const checked = draft.providerId === p.id;
                  const dispName =
                    p.providerName ||
                    (p.providerEmail?.split("@")[0] ?? "Provider");
                  return (
                    <li key={p.id}>
                      <label
                        className={
                          "flex cursor-pointer items-center gap-3 rounded-md border-[1.5px] bg-bg-surface p-3.5 has-[:checked]:border-2 has-[:checked]:border-brand " +
                          (checked ? "border-brand" : "border-border")
                        }
                      >
                        <input
                          type="radio"
                          name="providerId"
                          value={p.id}
                          defaultChecked={checked}
                          required
                          className="peer sr-only"
                        />
                        <span
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border-strong after:hidden after:h-3 after:w-3 after:rounded-full after:bg-brand after:content-[''] peer-checked:border-brand peer-checked:after:block"
                          aria-hidden
                        />
                        <span className="flex-1 text-[16px] font-semibold">
                          {dispName}
                        </span>
                        <span className="text-[12px] text-text-tertiary tabular-nums">
                          {p.radius} km
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
            <div>
              <label
                htmlFor="scheduledAt"
                className="block text-[15px] font-bold"
              >
                {isZh ? "时间" : "When"}
              </label>
              <input
                id="scheduledAt"
                name="scheduledAt"
                type="datetime-local"
                defaultValue={defaultDateTime}
                required
                className="mt-1.5 block h-touch-btn w-full rounded-md border-[1.5px] border-border bg-bg-surface px-4 text-body text-text-primary focus:border-brand focus:outline-none"
              />
              <p className="mt-1.5 text-[13px] text-text-tertiary">
                {isZh
                  ? "需在 1 小时之后预订。"
                  : "Must be at least 1 hour from now."}
              </p>
            </div>
            <Footer
              step={step}
              t={tCommon}
              backHref="/bookings/new?step=1"
            />
          </form>
        )}
      </Wizard>
    );
  }

  // ---- STEP 3: pick address ----
  if (step === 3) {
    if (!draft.serviceId || !draft.providerId || !draft.scheduledAt) {
      nextRedirect(`/${locale}/bookings/new?step=1`);
    }
    const myAddresses = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, me.id))
      .orderBy(asc(addresses.createdAt));
    return (
      <Wizard step={step} country={country} initials={me.initials}>
        <h1 className="text-[22px] font-bold">{t("step3Title")}</h1>
        {error === "pickAddress" && (
          <Alert>{isZh ? "请选择一个地址" : "Pick an address"}</Alert>
        )}
        {myAddresses.length === 0 ? (
          <div className="mt-6 rounded-md border border-border bg-bg-surface p-4">
            <p className="text-[14px] text-text-secondary">
              {isZh
                ? "还没有保存地址。请先到资料里新增一个地址。"
                : "No saved addresses yet. Add one in your profile first."}
            </p>
            <Link
              href="/profile/addresses?add=1"
              className="mt-3 inline-flex h-12 items-center rounded-md bg-brand px-5 text-[15px] font-bold text-white"
            >
              {isZh ? "新增地址" : "Add address"}
            </Link>
          </div>
        ) : (
          <form action={saveStep3} className="mt-4 flex flex-col gap-3">
            <input type="hidden" name="locale" value={locale} />
            <ul className="flex flex-col gap-3">
              {myAddresses.map((a) => {
                const checked =
                  draft.addressId === a.id ||
                  (!draft.addressId && a.isDefault);
                return (
                  <li key={a.id}>
                    <label
                      className={
                        "flex h-20 cursor-pointer items-center gap-3 rounded-md border-[1.5px] bg-bg-surface p-4 has-[:checked]:border-2 has-[:checked]:border-brand " +
                        (checked ? "border-brand" : "border-border")
                      }
                    >
                      <input
                        type="radio"
                        name="addressId"
                        value={a.id}
                        defaultChecked={checked}
                        required
                        className="sr-only"
                      />
                      <span className="flex-1">
                        <span className="block text-[16px] font-bold">
                          {a.label || (isZh ? "地址" : "Address")}
                        </span>
                        <span className="block text-[14px] text-text-secondary">
                          {[a.line1, a.city, a.state, a.postcode]
                            .filter(Boolean)
                            .join(" ")}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <Footer
              step={step}
              t={tCommon}
              backHref="/bookings/new?step=2"
            />
          </form>
        )}
      </Wizard>
    );
  }

  // ---- STEP 4: confirm + finalize ----
  if (
    !draft.serviceId ||
    !draft.providerId ||
    !draft.addressId ||
    !draft.scheduledAt
  ) {
    nextRedirect(`/${locale}/bookings/new?step=1`);
  }

  const [svcRow] = await db
    .select({
      code: services.code,
      durationMin: services.durationMin,
      category: services.categoryCode,
    })
    .from(services)
    .where(eq(services.id, draft.serviceId!))
    .limit(1);
  const [priceRow] = await db
    .select({
      basePrice: servicePrices.basePrice,
      taxRate: servicePrices.taxRate,
      currency: servicePrices.currency,
    })
    .from(servicePrices)
    .where(
      and(
        eq(servicePrices.serviceId, draft.serviceId!),
        eq(servicePrices.country, country),
      ),
    )
    .limit(1);
  const [providerRow] = await db
    .select({
      id: providerProfiles.id,
      name: users.name,
      email: users.email,
    })
    .from(providerProfiles)
    .leftJoin(users, eq(users.id, providerProfiles.userId))
    .where(eq(providerProfiles.id, draft.providerId!))
    .limit(1);
  const [addressRow] = await db
    .select()
    .from(addresses)
    .where(eq(addresses.id, draft.addressId!))
    .limit(1);

  const base = priceRow ? Number(priceRow.basePrice) : 0;
  const taxRate = priceRow ? Number(priceRow.taxRate) : 0;
  const tax = +(base * taxRate).toFixed(2);
  const total = +(base + tax).toFixed(2);
  const sched = new Date(draft.scheduledAt!);

  return (
    <Wizard step={step} country={country} initials={me.initials}>
      <h1 className="text-[22px] font-bold">{t("step4Title")}</h1>
      <section className="mt-4 rounded-lg border border-border bg-bg-surface p-4 text-[14px]">
        <Row
          label={isZh ? "服务" : "Service"}
          value={
            svcRow?.category
              ? `${tCategories(svcRow.category as Parameters<typeof tCategories>[0])} · ${(svcRow.durationMin / 60).toFixed(1)}h`
              : "—"
          }
        />
        <Row
          label={isZh ? "服务者" : "Provider"}
          value={providerRow?.name || providerRow?.email?.split("@")[0] || "—"}
        />
        <Row
          label={isZh ? "时间" : "When"}
          value={sched.toLocaleString(isZh ? "zh-CN" : "en-AU", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        />
        <Row
          label={isZh ? "地址" : "Address"}
          value={
            addressRow
              ? [
                  addressRow.line1,
                  addressRow.city,
                  addressRow.state,
                  addressRow.postcode,
                ]
                  .filter(Boolean)
                  .join(" ")
              : "—"
          }
        />
      </section>
      <section className="mt-3 rounded-lg border border-border bg-bg-surface p-4">
        <div className="flex justify-between text-[14px] text-text-secondary">
          <span>{isZh ? "服务费" : "Service"}</span>
          <span className="tabular-nums">
            {sym}
            {base.toFixed(2)}
          </span>
        </div>
        <div className="mt-1.5 flex justify-between text-[14px] text-text-secondary">
          <span>
            {taxAbbr} {(taxRate * 100).toFixed(0)}%
          </span>
          <span className="tabular-nums">
            {sym}
            {tax.toFixed(2)}
          </span>
        </div>
        <div className="mt-2.5 flex justify-between border-t border-border pt-2.5 text-[18px] font-extrabold">
          <span>{isZh ? "合计" : "Total"}</span>
          <span className="text-brand tabular-nums">
            {sym}
            {total.toFixed(2)} {priceRow?.currency}
          </span>
        </div>
      </section>
      <p className="mt-3 rounded-md bg-brand-soft px-3.5 py-3 text-[14px] text-brand">
        {isZh
          ? "ℹ️ 距开始 > 24 小时取消可全额退款"
          : "ℹ️ Free cancel until 24h before start"}
      </p>
      <form action={finalizeBooking} className="mt-4 flex flex-col gap-3">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="country" value={country} />
        <div>
          <label
            htmlFor="notes"
            className="block text-[14px] font-bold text-text-primary"
          >
            {isZh ? "备注（可选）" : "Notes (optional)"}
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={500}
            className="mt-1.5 block w-full rounded-md border-[1.5px] border-border-strong bg-bg-surface p-3 text-[15px] text-text-primary focus:border-brand focus:outline-none"
          />
        </div>
        <Footer
          step={step}
          t={tCommon}
          backHref="/bookings/new?step=3"
          finalCta={
            isZh
              ? `确认并支付 ${sym}${total.toFixed(2)}`
              : `Confirm & pay ${sym}${total.toFixed(2)}`
          }
        />
      </form>
    </Wizard>
  );
}

function Wizard({
  step,
  country,
  initials,
  children,
}: {
  step: Step;
  country: "AU" | "US" | "CA";
  initials: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Header country={country} back signedIn={true} initials={initials} />
      <BookingProgress step={step} />
      <main
        id="main-content"
        className="mx-auto w-full max-w-content overflow-auto bg-bg-surface px-5 pb-[120px] pt-5 sm:pb-12"
      >
        {children}
      </main>
    </>
  );
}

function Footer({
  step,
  t,
  backHref,
  finalCta,
}: {
  step: Step;
  t: Awaited<ReturnType<typeof getTranslations<"common">>>;
  backHref: string;
  finalCta?: string;
}) {
  return (
    <div className="sticky bottom-[84px] z-10 -mx-5 mt-4 flex gap-2 border-t border-border bg-bg-surface p-3 sm:bottom-0">
      <Link
        href={backHref}
        className="inline-flex h-14 flex-1 items-center justify-center rounded-md border-2 border-brand bg-bg-surface text-[16px] font-semibold text-brand"
      >
        {t("back")}
      </Link>
      <button
        type="submit"
        className="inline-flex h-14 flex-1 items-center justify-center rounded-md bg-brand text-[17px] font-bold text-white hover:bg-brand-hover"
      >
        {step === 4 ? finalCta || t("next") : t("next")}
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-[14px]">
      <span className="text-text-secondary">{label}</span>
      <span className="text-right font-semibold text-text-primary">
        {value}
      </span>
    </div>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="mt-3 rounded-md border-[1.5px] border-danger bg-danger-soft px-3.5 py-3 text-[14px] font-semibold text-danger"
    >
      {children}
    </div>
  );
}
