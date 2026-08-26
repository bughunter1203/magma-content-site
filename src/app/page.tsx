import Hero from "@/components/Hero";
import SectionHeading from "@/components/SectionHeading";
import PostCard from "@/components/PostCard";
import ReportCard from "@/components/ReportCard";
import ImageSlot from "@/components/ImageSlot";
import NewsletterSignup from "@/components/NewsletterSignup";
import { siteConfig } from "@config";
import { getAll } from "@/lib/content";

export default function Home() {
  const posts = getAll("posts").slice(0, 3);
  const reports = getAll("reports").slice(0, 2);
  return (
    <>
      <Hero />

      {/* 브랜드 소개 스트립 (About 흡수) */}
      <section className="container-page py-24">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <p className="eyebrow mb-3">브랜드</p>
            <h2 className="font-display text-3xl font-bold leading-snug text-primary">
              {siteConfig.company.name}는 오래&nbsp;입을&nbsp;기본을 만듭니다
            </h2>
            <p className="mt-5 leading-relaxed text-ink-sub">
              유행을 좇는 대신 과장 없는 단정함을 택합니다.
              계절이 바뀌어도 다시 손이 가는 옷을, 3040 남성을 위해 만듭니다.
            </p>
          </div>
          <ImageSlot ratio="4/5" label="브랜드 비주얼" />
        </div>
      </section>

      {/* 뉴스레터 구독 */}
      <section className="container-page py-16">
        <div className="grid gap-8 rounded-card border border-line bg-card p-8 md:grid-cols-[1fr_1.2fr] md:p-10">
          <div>
            <p className="eyebrow mb-3">뉴스레터</p>
            <h2 className="font-display text-2xl font-bold text-primary sm:text-3xl">
              오래 입을 기본을 고르는 기준
            </h2>
            <p className="mt-4 leading-relaxed text-ink-sub">
              MAGMA의 신상품, 저널, 실적 리포트 업데이트를 이메일로 받아보세요.
            </p>
          </div>
          <NewsletterSignup />
        </div>
      </section>

      {/* 최신 블로그 */}
      <section className="container-page py-16">
        <SectionHeading eyebrow="저널" title="최신 글" href="/blog" cta="블로그 전체" />
        {posts.length === 0 ? (
          <p className="text-sm text-ink-muted">아직 발행된 글이 없습니다.</p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-3">
            {posts.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </div>
        )}
      </section>

      {/* 최신 실적 */}
      <section className="container-page py-16">
        <SectionHeading eyebrow="데이터" title="실적 보고" href="/reports" cta="실적 전체" />
        {reports.length === 0 ? (
          <p className="text-sm text-ink-muted">아직 공개된 실적 보고가 없습니다.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {reports.map((r) => (
              <ReportCard key={r.slug} report={r} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
