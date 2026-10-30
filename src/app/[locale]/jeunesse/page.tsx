import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { QuizCard } from "@/components/story/QuizCard";
import { Calebasse, StoryTypeIcon } from "@/components/ui/Pictogram";
import { Link } from "@/i18n/navigation";
import { contentVisible, recits } from "@/lib/data";
import { typeColor } from "@/lib/map/style";
import { bcp47 } from "@/lib/media/vtt";
import { quizFromScenes } from "@/lib/quiz";

export async function generateMetadata({ params }: PageProps<"/[locale]/jeunesse">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("youth") };
}

export default async function YouthPage({ params }: PageProps<"/[locale]/jeunesse">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("youth");
  const tp = await getTranslations("pages");
  const types = await getTranslations("storyTypes");

  const stories = recits.filter((r) => r.publicCible === "enfant" && !r.restreint);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold">{tp("youth")}</h1>
      <p className="prose-conte mb-10 text-lg text-muted">{t("intro")}</p>

      {stories.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <Calebasse aria-hidden width={56} height={56} className="text-accent" />
          <p className="text-lg">{t("empty")}</p>
        </div>
      ) : (
        <ul className="space-y-10">
          {stories.map((r) => {
            const version = r.versions.find((v) => v.scenes.length > 0);
            // Questions only when the story's content may be shown.
            const quizzes = version && contentVisible(r) ? quizFromScenes(version.scenes) : [];
            return (
              <li key={r.id} className="card overflow-hidden">
                <Link
                  href={`/contes/${r.slug}`}
                  className="flex min-h-28 items-center gap-5 p-6 hover:bg-surface-hover"
                >
                  <span
                    aria-hidden
                    className="flex size-20 shrink-0 items-center justify-center rounded-full bg-bg"
                    style={{ color: typeColor(r.type) }}
                  >
                    <StoryTypeIcon type={r.type} width={48} height={48} />
                  </span>
                  <span>
                    <span className="block text-sm text-muted">{types(r.type)}</span>
                    <span className="block font-display text-2xl font-bold">{r.titre}</span>
                    <span className="mt-1 inline-block text-accent underline underline-offset-4">{t("open")}</span>
                  </span>
                </Link>
                <div className="border-t border-border p-6">
                  {quizzes.length > 0 ? (
                    quizzes.map((q) => <QuizCard key={q.context} quiz={q} lang={bcp47(version!.codeIso)} big />)
                  ) : (
                    <p className="text-muted">{t("noQuiz")}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
