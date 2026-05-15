import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardTitle, CardBody } from "@/components/ui/Card";
import { Badge, type BadgeStatus } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Chip } from "@/components/ui/Chip";
import { Banner } from "@/components/ui/Banner";
import { StatBadge } from "@/components/ui/StatBadge";
import { SearchBar } from "@/components/ui/SearchBar";
import { CategoryTile } from "@/components/ui/CategoryTile";
import { ProviderCard } from "@/components/ui/ProviderCard";
import { DottedCTA } from "@/components/ui/DottedCTA";
import { Plus, Sparkles } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { AIFloatButton } from "@/components/layout/AIFloatButton";
import {
  C1GrandmaWang,
  C3HelperMei,
  C9AICompanion,
  S1TeaTime,
  S5PaymentSuccess,
  S7NetworkError,
} from "@/components/illustrations";

const STATUSES: BadgeStatus[] = [
  "pending",
  "confirmed",
  "inprogress",
  "completed",
  "cancelled",
  "refunded",
];

export default async function DevComponentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }
  const { locale } = await params;
  setRequestLocale(locale);
  const tDev = await getTranslations("dev");
  const tStatus = await getTranslations("status");

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-content px-4 pb-24 pt-6">
        <h1 className="text-h1">{tDev("title")}</h1>
        <p className="mt-2 text-body text-text-secondary">{tDev("subtitle")}</p>

        <Section title="Buttons">
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </Section>

        <Section title="Inputs">
          <div className="grid gap-3">
            <Input placeholder="Default input" />
            <Input placeholder="Invalid input" invalid />
          </div>
        </Section>

        <Section title="Status badges">
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <Badge key={s} status={s}>
                {tStatus(camel(s))}
              </Badge>
            ))}
          </div>
        </Section>

        <Section title="Card">
          <Card>
            <CardTitle>Sample card</CardTitle>
            <CardBody>
              Cards use --bg-surface, --border, --shadow-card per UI_DESIGN §1.3.
            </CardBody>
          </Card>
        </Section>

        <Section title="Chips">
          <div className="flex flex-wrap gap-2">
            <Chip>Neutral</Chip>
            <Chip tone="brand">Brand</Chip>
            <Chip tone="success">Success</Chip>
            <Chip tone="warn">Warn</Chip>
            <Chip tone="danger">Danger</Chip>
          </div>
        </Section>

        <Section title="StatBadges">
          <div className="flex flex-wrap gap-2">
            <StatBadge tone="brand" dot>
              Active
            </StatBadge>
            <StatBadge tone="success" dot>
              Confirmed
            </StatBadge>
            <StatBadge tone="warn" dot>
              Pending
            </StatBadge>
            <StatBadge tone="danger" dot>
              Cancelled
            </StatBadge>
          </div>
        </Section>

        <Section title="Banners">
          <div className="grid gap-3">
            <Banner tone="info">Information banner — uses brand soft.</Banner>
            <Banner tone="warn">Warning banner — used by provider review state.</Banner>
            <Banner tone="success">Success banner — payment completed.</Banner>
            <Banner tone="danger">Danger banner — booking dispute opened.</Banner>
          </div>
        </Section>

        <Section title="Search bar">
          <SearchBar placeholder="搜索服务、服务者…" />
        </Section>

        <Section title="Category tiles">
          <div className="grid grid-cols-2 gap-3">
            <CategoryTile icon={<span>🧹</span>} label="保洁" description="家居清洁" />
            <CategoryTile icon={<span>🍲</span>} label="陪餐" description="买菜煮饭" />
            <CategoryTile icon={<span>💊</span>} label="送药" description="按时取药" />
            <CategoryTile icon={<span>🚶</span>} label="陪诊" description="陪同就医" />
          </div>
        </Section>

        <Section title="Provider card">
          <div className="grid gap-3">
            <ProviderCard
              avatar={
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand-ink font-bold">
                  梅
                </span>
              }
              name="梅阿姨"
              service="保洁 · 朝阳区"
              rating={4.9}
              reviewCount={128}
              price="¥80/小时"
            />
          </div>
        </Section>

        <Section title="Dotted CTA">
          <DottedCTA>
            <Plus size={16} aria-hidden />
            添加新地址
          </DottedCTA>
        </Section>

        <Section title="Brand-ink showcase">
          <div className="rounded-lg bg-brand-soft p-6 text-brand-ink">
            <Sparkles size={20} aria-hidden className="mb-2" />
            <p className="text-h3">brand-soft / brand-ink 组合</p>
            <p className="text-small">用于推荐、捐款 pill 等强调区。</p>
          </div>
        </Section>

        <Section title="Skeleton">
          <div className="grid gap-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        </Section>

        <Section title="Illustrations (placeholders)">
          <div className="flex flex-wrap items-end gap-6">
            <C1GrandmaWang />
            <C3HelperMei />
            <C9AICompanion size={64} />
            <S1TeaTime />
            <S5PaymentSuccess />
            <S7NetworkError />
          </div>
        </Section>

        <p className="mt-12 text-small text-text-secondary">
          Locale: <code>{locale}</code>
        </p>
      </main>
      <AIFloatButton />
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-h2 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function camel(s: BadgeStatus): "pending" | "confirmed" | "inProgress" | "completed" | "cancelled" | "refunded" {
  return s === "inprogress" ? "inProgress" : (s as Exclude<BadgeStatus, "inprogress">);
}
