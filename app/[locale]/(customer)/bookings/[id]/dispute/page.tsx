import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect, notFound } from "next/navigation";
import { eq, and, sql } from "drizzle-orm";
import { CheckCircle2, AlertTriangle, Camera } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Link } from "@/i18n/navigation";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { getCountry } from "@/components/domain/countryCookie";
import { db } from "@/lib/db";
import { bookings, bookingChanges } from "@/lib/db/schema/bookings";
import { disputes, disputeEvidence } from "@/lib/db/schema/disputes";
import { getCurrentUser } from "@/lib/auth/server";
import { saveUpload } from "@/lib/upload/local";

const TYPE_KEYS = [
  "typeNotShow",
  "typeIncomplete",
  "typeDamage",
  "typeOther",
] as const;

const OUTCOME_KEYS = [
  "outcomeRedo",
  "outcomePartial",
  "outcomeFull",
] as const;

async function disputeAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const type = String(formData.get("type") ?? "").trim();
  const describe = String(formData.get("describe") ?? "").trim();
  const outcome = String(formData.get("outcome") ?? "").trim();
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  if (!id) nextRedirect(`/${locale}/bookings`);
  if (describe.length < 20) {
    nextRedirect(`/${locale}/bookings/${id}/dispute?error=tooShort`);
  }

  const [b] = await db
    .select({ id: bookings.id, status: bookings.status })
    .from(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.customerId, me.id)))
    .limit(1);
  if (!b) nextRedirect(`/${locale}/bookings`);

  const reason =
    type === "notshow"
      ? "Provider did not show up"
      : type === "incomplete"
        ? "Service was incomplete"
        : type === "damage"
          ? "Damage or breakage"
          : type === "other"
            ? "Other"
            : "Other";
  const fullReason = `${reason}\n\n${describe}\n\nRequested outcome: ${outcome || "—"}`;

  // Persist any uploaded evidence files first so we can fail fast on bad
  // mime / size before mutating the dispute row.
  const files = formData
    .getAll("evidence")
    .filter((v): v is File => v instanceof File && v.size > 0);
  const savedUrls: string[] = [];
  for (const f of files) {
    const r = await saveUpload(f, `dispute/${b.id}`);
    if ("error" in r) {
      nextRedirect(
        `/${locale}/bookings/${id}/dispute?error=${r.error}`,
      );
    }
    savedUrls.push(r.url);
  }

  const newDisputeId = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(disputes)
      .values({
        bookingId: b.id,
        raisedBy: me.id,
        reason: fullReason,
      })
      .returning({ id: disputes.id });
    if (savedUrls.length) {
      await tx.insert(disputeEvidence).values(
        savedUrls.map((url) => ({
          disputeId: inserted.id,
          uploadedBy: me.id,
          kind: "image" as const,
          fileUrl: url,
        })),
      );
    }
    if (b.status !== "disputed") {
      await tx
        .update(bookings)
        .set({ status: "disputed", updatedAt: new Date() })
        .where(eq(bookings.id, b.id));
      await tx.insert(bookingChanges).values({
        bookingId: b.id,
        type: "status_change",
        fromStatus: b.status as never,
        toStatus: "disputed",
        actorId: me.id,
        note: `Customer dispute: ${reason}`,
      });
    }
    return inserted.id;
  });

  void newDisputeId;
  nextRedirect(`/${locale}/bookings/${id}/dispute?sent=1`);
}

export default async function DisputePage({
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
  const t = await getTranslations("dispute");
  const tCommon = await getTranslations("common");
  const sent = sp.sent === "1";
  const error = typeof sp.error === "string" ? sp.error : undefined;

  // Confirm booking ownership.
  const [b] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.customerId, me.id)))
    .limit(1);
  if (!b) notFound();

  // Pull the latest dispute on this booking (if any).
  const [latest] = await db
    .select({ id: disputes.id, status: disputes.status })
    .from(disputes)
    .where(eq(disputes.bookingId, id))
    .orderBy(sql`${disputes.createdAt} desc`)
    .limit(1);

  const caseId = latest ? `D-${latest.id.slice(0, 8)}` : `D-${id.slice(0, 8)}`;

  if (sent || latest) {
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
          <p className="max-w-[340px] text-[16px] text-text-secondary">
            {t("successHint", { id: caseId })}
          </p>
          {latest && (
            <p className="text-[14px] text-text-tertiary">
              {locale.startsWith("zh") ? "状态" : "Status"}: {latest.status}
            </p>
          )}
          <Link
            href={`/bookings/${id}`}
            className="mt-2 inline-flex h-14 items-center rounded-md bg-brand px-7 text-[17px] font-bold text-white"
          >
            {tCommon("backToBooking")}
          </Link>
        </main>
      </>
    );
  }

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
        <p className="mt-1 text-[15px] text-text-secondary">{t("sub")}</p>

        <div className="mt-4 flex items-start gap-2.5 rounded-md border-[1.5px] border-warning bg-warning-soft p-3.5">
          <AlertTriangle
            size={20}
            className="mt-0.5 shrink-0 text-[#92590A] dark:text-[var(--brand-accent)]"
            aria-hidden
          />
          <div className="text-[#92590A] dark:text-[var(--brand-accent)]">
            <p className="text-[15px] font-bold">{t("noticeTitle")}</p>
            <p className="mt-0.5 text-[14px]">{t("noticeHint")}</p>
          </div>
        </div>

        {error === "tooShort" && (
          <div
            role="alert"
            className="mt-3 rounded-md border-[1.5px] border-danger bg-danger-soft px-3.5 py-3 text-[14px] font-semibold text-danger"
          >
            {t("describeHint")}
          </div>
        )}
        {(error === "tooLarge" || error === "badType") && (
          <div
            role="alert"
            className="mt-3 rounded-md border-[1.5px] border-danger bg-danger-soft px-3.5 py-3 text-[14px] font-semibold text-danger"
          >
            {error === "tooLarge"
              ? "One of the evidence files is too large (max 10 MB)"
              : "One of the evidence files has an unsupported format"}
          </div>
        )}

        <form
          className="mt-6 flex flex-col gap-6"
          action={disputeAction}
          encType="multipart/form-data"
        >
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={id} />
          <fieldset>
            <legend className="text-[16px] font-bold text-text-primary">
              {t("type")}
            </legend>
            <ul className="mt-3 flex flex-col gap-2.5">
              {TYPE_KEYS.map((k) => (
                <li key={k}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border-[1.5px] border-border bg-bg-surface p-4 has-[:checked]:border-2 has-[:checked]:border-brand">
                    <input
                      type="radio"
                      name="type"
                      value={k.replace(/^type/, "").toLowerCase()}
                      required
                      className="peer sr-only"
                    />
                    <span
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border-strong after:hidden after:h-3 after:w-3 after:rounded-full after:bg-brand after:content-[''] peer-checked:border-brand peer-checked:after:block"
                      aria-hidden
                    />
                    <span className="text-[16px] font-semibold">{t(k)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <div>
            <Label htmlFor="describe">{t("describe")}</Label>
            <textarea
              id="describe"
              name="describe"
              required
              minLength={20}
              maxLength={2000}
              rows={5}
              aria-describedby="describe-hint"
              className="block w-full rounded-md border-[1.5px] border-border-strong bg-bg-surface p-3.5 text-[16px] text-text-primary placeholder:text-text-placeholder focus:border-brand focus:outline-none"
            />
            <p
              id="describe-hint"
              className="mt-1.5 text-[13px] text-text-tertiary"
            >
              {t("describeHint")}
            </p>
          </div>

          <div>
            <Label htmlFor="evidence">{t("evidence")}</Label>
            <input
              id="evidence"
              name="evidence"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
              multiple
              className="block w-full text-[14px] text-text-secondary file:mr-3 file:inline-flex file:h-12 file:items-center file:rounded-md file:border-[1.5px] file:border-border-strong file:bg-bg-surface file:px-4 file:text-[14px] file:font-semibold file:text-text-primary"
            />
            <p className="mt-1.5 flex items-center gap-1 text-[13px] text-text-tertiary">
              <Camera size={14} aria-hidden /> {t("evidenceHint")} · JPG / PNG /
              WebP / HEIC / PDF · max 10MB each
            </p>
          </div>

          <fieldset>
            <legend className="text-[16px] font-bold text-text-primary">
              {t("outcome")}
            </legend>
            <ul className="mt-3 flex flex-col gap-2.5">
              {OUTCOME_KEYS.map((k) => (
                <li key={k}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border-[1.5px] border-border bg-bg-surface p-4 has-[:checked]:border-2 has-[:checked]:border-brand">
                    <input
                      type="radio"
                      name="outcome"
                      value={k.replace(/^outcome/, "").toLowerCase()}
                      className="peer sr-only"
                    />
                    <span
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border-strong after:hidden after:h-3 after:w-3 after:rounded-full after:bg-brand after:content-[''] peer-checked:border-brand peer-checked:after:block"
                      aria-hidden
                    />
                    <span className="text-[16px] font-semibold">{t(k)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <Button type="submit" variant="primary" block size="md">
            {t("submit")}
          </Button>
        </form>
      </main>
    </>
  );
}
