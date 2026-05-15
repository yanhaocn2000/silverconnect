import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { eq, asc } from "drizzle-orm";
import { redirect } from "@/i18n/navigation";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { getAdmin } from "@/components/domain/adminCookie";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { aiKb } from "@/lib/db/schema/ai";

const CATEGORY_VALUES = ["policy", "pricing", "how-to", "safety"] as const;
type Category = (typeof CATEGORY_VALUES)[number];

async function saveKb(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const category = String(formData.get("category") ?? "") as Category;
  const langRaw = String(formData.get("lang") ?? "en");
  type KbLocale = "en" | "zh-CN" | "zh-TW" | "ja" | "ko";
  const ALLOWED: KbLocale[] = ["en", "zh-CN", "zh-TW", "ja", "ko"];
  const lang: KbLocale = (ALLOWED as string[]).includes(langRaw) ? (langRaw as KbLocale) : "en";
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") nextRedirect(`/${locale}/admin/login`);
  if (!question || !answer || !CATEGORY_VALUES.includes(category)) {
    nextRedirect(`/${locale}/admin/ai/kb?error=invalid`);
  }
  await db.insert(aiKb).values({
    category,
    question,
    answer,
    locale: lang,
  });
  nextRedirect(`/${locale}/admin/ai/kb?saved=1`);
}

async function deleteKb(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") nextRedirect(`/${locale}/admin/login`);
  if (id) await db.delete(aiKb).where(eq(aiKb.id, id));
  nextRedirect(`/${locale}/admin/ai/kb?deleted=1`);
}

export default async function AdminKbPage({
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
  const tA = await getTranslations("aAi");
  const adding = sp.add === "1";

  const fieldClass =
    "block h-touch-btn w-full rounded-md border-[1.5px] border-border bg-bg-surface px-4 text-body";

  const entries = await db
    .select({
      id: aiKb.id,
      category: aiKb.category,
      question: aiKb.question,
      answer: aiKb.answer,
      locale: aiKb.locale,
      enabled: aiKb.enabled,
    })
    .from(aiKb)
    .orderBy(asc(aiKb.category), asc(aiKb.sortOrder));

  const catLabel = (c: string) => {
    const k =
      c === "pricing"
        ? "kbCategoryPricing"
        : c === "policy"
          ? "kbCategoryPolicy"
          : c === "how-to"
            ? "kbCategoryHowTo"
            : c === "safety"
              ? "kbCategorySafety"
              : null;
    return k ? tA(k as Parameters<typeof tA>[0]) : c;
  };

  return (
    <AdminShell email={admin.email ?? ""}>
      <div className="flex items-center justify-between">
        <h1 className="text-h2">{tA("kbTitle")}</h1>
        <a
          href="?add=1"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-3 text-[13px] font-bold text-white"
        >
          <Plus size={14} aria-hidden />
          {tA("kbAdd")}
        </a>
      </div>

      {sp.saved === "1" && (
        <div
          role="status"
          className="mt-3 rounded-md bg-success-soft px-3.5 py-2.5 text-[13px] font-semibold text-success"
        >
          {tA("kbSaved")}
        </div>
      )}
      {sp.deleted === "1" && (
        <div
          role="status"
          className="mt-3 rounded-md bg-success-soft px-3.5 py-2.5 text-[13px] font-semibold text-success"
        >
          {tA("kbDeleted")}
        </div>
      )}

      {entries.length === 0 ? (
        <p className="mt-6 rounded-lg border border-border bg-bg-surface px-5 py-8 text-center text-[14px] text-text-tertiary">
          —
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {entries.map((e) => (
            <li
              key={e.id}
              className="rounded-lg border border-border bg-bg-surface p-4"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold">{e.question}</p>
                  <p className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded-sm bg-brand-soft px-2 py-0.5 font-bold uppercase text-brand">
                      {catLabel(e.category)}
                    </span>
                    <span className="rounded-sm bg-bg-surface-2 px-2 py-0.5 font-semibold uppercase text-text-secondary">
                      {e.locale.toUpperCase()}
                    </span>
                    {!e.enabled && (
                      <span className="rounded-sm bg-warning-soft px-2 py-0.5 font-semibold uppercase text-warning">
                        OFF
                      </span>
                    )}
                  </p>
                  <p className="mt-2 text-[14px] text-text-secondary">
                    {e.answer}
                  </p>
                </div>
                <form action={deleteKb}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={e.id} />
                  <button
                    type="submit"
                    aria-label={tA("kbDelete")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-sm border-[1.5px] border-danger bg-bg-surface text-danger"
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <form
          action={saveKb}
          className="mt-6 flex flex-col gap-4 rounded-lg border-2 border-brand bg-bg-surface p-5"
        >
          <input type="hidden" name="locale" value={locale} />
          <h2 className="text-h3">{tA("kbAdd")}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="kb-category">{tA("kbCategory")}</Label>
              <select id="kb-category" name="category" className={fieldClass}>
                {CATEGORY_VALUES.map((c) => (
                  <option key={c} value={c}>
                    {catLabel(c)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="kb-lang">{tA("kbLang")}</Label>
              <select id="kb-lang" name="lang" className={fieldClass}>
                <option value="en">EN</option>
                <option value="zh-CN">ZH-CN</option>
                <option value="zh-TW">ZH-TW</option>
                <option value="ja">JA</option>
                <option value="ko">KO</option>
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="kb-question">{tA("kbQuestion")}</Label>
            <Input id="kb-question" name="question" required />
          </div>
          <div>
            <Label htmlFor="kb-answer">{tA("kbAnswer")}</Label>
            <textarea
              id="kb-answer"
              name="answer"
              rows={5}
              required
              aria-describedby="kb-var-hint"
              className="block w-full rounded-md border-[1.5px] border-border-strong bg-bg-surface p-3 text-[14px] focus:border-brand focus:outline-none"
            />
            <p id="kb-var-hint" className="mt-1.5 text-[12px] text-text-tertiary">
              {tA("kbVarHint")}
            </p>
          </div>
          <Button type="submit" variant="primary" block size="md">
            {tA("kbSave")}
          </Button>
        </form>
      )}
    </AdminShell>
  );
}
