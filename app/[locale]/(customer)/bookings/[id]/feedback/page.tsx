import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect, notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { Star, CheckCircle2, Camera } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Link } from "@/i18n/navigation";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { ProviderAvatar } from "@/components/domain/ProviderAvatar";
import { getCountry } from "@/components/domain/countryCookie";
import { db } from "@/lib/db";
import { bookings, bookingChanges } from "@/lib/db/schema/bookings";
import { providerProfiles } from "@/lib/db/schema/providers";
import { users } from "@/lib/db/schema/users";
import { services } from "@/lib/db/schema/services";
import { reviews } from "@/lib/db/schema/reviews";
import { getCurrentUser } from "@/lib/auth/server";

const TAG_KEYS = [
  "tagPunctual",
  "tagProfessional",
  "tagClean",
  "tagFriendly",
  "tagFair",
] as const;

function initialsOf(name: string | null, fallback: string): string {
  const src = (name || fallback).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (src.slice(0, 2) || "?").toUpperCase();
}

async function feedbackAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const ratingRaw = Number(formData.get("rating") ?? 0);
  const comment = String(formData.get("comment") ?? "").trim();
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  if (!id) nextRedirect(`/${locale}/bookings`);
  if (!Number.isFinite(ratingRaw) || ratingRaw < 1 || ratingRaw > 5) {
    nextRedirect(`/${locale}/bookings/${id}/feedback?error=rating`);
  }

  // Confirm booking belongs to this customer + has reached a state that
  // allows review (completed/released).
  const [b] = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      providerId: bookings.providerId,
    })
    .from(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.customerId, me.id)))
    .limit(1);
  if (!b) nextRedirect(`/${locale}/bookings`);
  if (b.status !== "completed" && b.status !== "released") {
    nextRedirect(`/${locale}/bookings/${id}/feedback?error=not_completed`);
  }
  if (!b.providerId) {
    nextRedirect(`/${locale}/bookings/${id}/feedback?error=no_provider`);
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(reviews).values({
        bookingId: b.id,
        customerId: me.id,
        providerId: b.providerId!,
        rating: Math.round(ratingRaw),
        comment: comment || null,
      });
      // Submitting feedback releases held funds: completed → released.
      // The button copy ("Submit & release payment") commits to this.
      // Idempotent: if a prior run already released, the second update is a no-op.
      if (b.status === "completed") {
        await tx
          .update(bookings)
          .set({ status: "released", updatedAt: new Date() })
          .where(eq(bookings.id, b.id));
        await tx.insert(bookingChanges).values({
          bookingId: b.id,
          type: "status_change",
          fromStatus: "completed",
          toStatus: "released",
          actorId: me.id,
          note: "Customer released payment via feedback",
        });
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Unique on booking_id — duplicate submit lands here.
    if (msg.includes("reviews_booking_uq")) {
      nextRedirect(`/${locale}/bookings/${id}/feedback?error=duplicate`);
    }
     
    console.error("[feedback] insert failed:", msg);
    nextRedirect(`/${locale}/bookings/${id}/feedback?error=server`);
  }

  nextRedirect(`/${locale}/bookings/${id}/feedback?sent=1`);
}

export default async function FeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }
  const sp = await searchParams;
  setRequestLocale(locale);
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  const country = await getCountry();
  const t = await getTranslations("feedback");
  const tCommon = await getTranslations("common");
  const sent = sp.sent === "1";
  const error = typeof sp.error === "string" ? sp.error : undefined;

  const [row] = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      providerName: users.name,
      providerEmail: users.email,
      serviceCategory: services.categoryCode,
    })
    .from(bookings)
    .leftJoin(providerProfiles, eq(providerProfiles.id, bookings.providerId))
    .leftJoin(users, eq(users.id, providerProfiles.userId))
    .leftJoin(services, eq(services.id, bookings.serviceId))
    .where(and(eq(bookings.id, id), eq(bookings.customerId, me.id)))
    .limit(1);

  if (!row) notFound();

  const providerName =
    row.providerName || (row.providerEmail?.split("@")[0] ?? "—");
  const initials = initialsOf(row.providerName, row.providerEmail ?? "?");
  const tCategories = await getTranslations("categories");
  const serviceLabel = row.serviceCategory
    ? tCategories(row.serviceCategory as Parameters<typeof tCategories>[0])
    : t("mockService");

  // If a review already exists for this booking, show success without
  // letting the user submit a duplicate.
  const [existing] = await db
    .select({ id: reviews.id, rating: reviews.rating })
    .from(reviews)
    .where(eq(reviews.bookingId, id))
    .limit(1);

  if (sent || existing) {
    return (
      <>
        <Header
          country={country}
          back
          signedIn={true}
          initials={me.initials}
        />
        <main
          id="main-content"
          className="mx-auto flex w-full max-w-content flex-col items-center gap-3 px-5 pb-[120px] pt-12 text-center sm:pb-12"
        >
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle2 size={56} aria-hidden />
          </span>
          <h1 className="text-h1">{t("successTitle")}</h1>
          <p className="max-w-[320px] text-[16px] text-text-secondary">
            {t("successHint", { provider: providerName })}
          </p>
          {existing && (
            <p className="text-[14px] text-text-tertiary">
              {existing.rating}★ ·{" "}
              {locale.startsWith("zh") ? "已提交" : "submitted"}
            </p>
          )}
          <Link
            href={`/bookings/${id}`}
            className="mt-2 inline-flex h-14 items-center rounded-md bg-brand px-7 text-[17px] font-bold text-white"
          >
            {tCommon("viewBooking")}
          </Link>
        </main>
      </>
    );
  }

  const errorMsg =
    error === "rating"
      ? "Pick a rating (1-5)."
      : error === "not_completed"
        ? "You can only review a completed booking."
        : error === "duplicate"
          ? "You've already reviewed this booking."
          : error === "server"
            ? "Something went wrong. Please retry."
            : null;

  return (
    <>
      <Header
        country={country}
        back
        signedIn={true}
        initials={me.initials}
      />
      <main
        id="main-content"
        className="mx-auto w-full max-w-content px-5 pb-[120px] pt-6 sm:pb-12"
      >
        <h1 className="text-h2">{t("title")}</h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          {t("sub", { provider: providerName })}
        </p>

        {errorMsg && (
          <div
            role="alert"
            className="mt-3 rounded-md border-[1.5px] border-danger bg-danger-soft px-3.5 py-3 text-[14px] font-semibold text-danger"
          >
            {errorMsg}
          </div>
        )}

        <section className="mt-5 flex items-center gap-3 rounded-md border border-border bg-bg-surface p-4">
          <ProviderAvatar size={56} hue={0} initials={initials} />
          <div>
            <p className="text-[16px] font-bold">{providerName}</p>
            <p className="text-[13px] text-text-tertiary">{serviceLabel}</p>
          </div>
        </section>

        <form className="mt-6 flex flex-col gap-6" action={feedbackAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={id} />
          <fieldset>
            <legend className="text-[16px] font-bold text-text-primary">
              {t("rating")}
            </legend>
            <div
              className="mt-3 flex gap-2"
              role="radiogroup"
              aria-required="true"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <label
                  key={n}
                  className="flex aspect-square flex-1 cursor-pointer items-center justify-center rounded-md border-[1.5px] border-border-strong bg-bg-surface hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
                >
                  <input
                    type="radio"
                    name="rating"
                    value={n}
                    required
                    className="peer sr-only"
                    defaultChecked={n === 5}
                  />
                  <Star
                    size={32}
                    className="text-text-tertiary peer-checked:fill-[var(--brand-accent)] peer-checked:text-[var(--brand-accent)]"
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  />
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-[16px] font-bold text-text-primary">
              {t("tags")}
            </legend>
            <p className="mt-1 text-[12px] text-text-tertiary">
              {/* Tag pills render but submission is currently dropped — schema
                  has no tags column yet. Shipped with reviews as visual hint. */}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {TAG_KEYS.map((k) => (
                <label
                  key={k}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-pill border-[1.5px] border-border-strong bg-bg-surface px-4 py-2 text-[14px] font-semibold text-text-primary hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand"
                >
                  <input
                    type="checkbox"
                    name="tags"
                    value={k.replace(/^tag/, "").toLowerCase()}
                    className="sr-only"
                  />
                  {t(k)}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <Label htmlFor="comment">{t("comment")}</Label>
            <textarea
              id="comment"
              name="comment"
              placeholder={t("commentPh")}
              rows={4}
              maxLength={2000}
              className="block w-full rounded-md border-[1.5px] border-border-strong bg-bg-surface p-3.5 text-[16px] text-text-primary placeholder:text-text-placeholder focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <Label htmlFor="photos">{t("photos")}</Label>
            <input
              id="photos"
              name="photos"
              type="file"
              accept="image/jpeg,image/png"
              multiple
              disabled
              title="Photo upload ships with file storage"
              className="block w-full text-[14px] text-text-secondary opacity-50 file:mr-3 file:inline-flex file:h-12 file:items-center file:rounded-md file:border-[1.5px] file:border-border-strong file:bg-bg-surface file:px-4 file:text-[14px] file:font-semibold file:text-text-primary"
            />
            <p className="mt-1.5 flex items-center gap-1 text-[13px] text-text-tertiary">
              <Camera size={14} aria-hidden /> {t("photosHint")}
            </p>
          </div>

          <Button type="submit" variant="primary" block size="md">
            {t("submit")}
          </Button>
        </form>
      </main>
    </>
  );
}
