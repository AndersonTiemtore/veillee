import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { quality } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/[locale]/a-propos/donnees">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("data") };
}

export default async function DataReportPage({ params }: PageProps<"/[locale]/a-propos/donnees">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dataReport");
  const tp = await getTranslations("pages");
  const format = await getFormatter();
  const q = quality;
  const n = (value: number) => format.number(value);
  const passes = Object.values(q.inference.iterations).reduce((a, b) => a + b, 0);

  const rows: [string, string][] = [
    [t("triples"), t("triplesValue", { source: n(q.triples.source), after: n(q.triples.afterInference) })],
    [
      t("inference"),
      t("inferenceValue", { added: n(q.inference.added), rules: q.inference.rules, passes }),
    ],
    [t("aliases"), t("aliasesValue", { count: q.aliases.merged })],
    [
      t("spatial"),
      t("spatialValue", {
        total: q.localitesSansParent.total,
        joined: q.localitesSansParent.rattacheesParJointureSpatiale.length,
      }),
    ],
    [
      t("ethnies"),
      t("ethniesValue", { count: q.ethnies.sansNomEthnie, generic: q.ethnies.generiquesIgnorees.length }),
    ],
    [t("media"), t("mediaValue", { count: q.mediasExternesMasques })],
    [
      t("stories"),
      t("storiesValue", { total: q.recits.total, publiables: q.recits.publiables, restreints: q.recits.restreints }),
    ],
    [t("toRecord"), t("toRecordValue", { count: q.recits.languesAEnregistrer })],
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-4 text-2xl font-bold sm:text-3xl">{tp("data")}</h1>
      <p className="prose-conte mb-2 text-muted">{t("intro")}</p>
      <p className="mb-10 text-xs text-muted">
        {t("generatedAt", { date: format.dateTime(new Date(q.generatedAt), { dateStyle: "long" }) })}
      </p>

      <dl className="divide-y divide-border">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 py-4 sm:grid-cols-[14rem_1fr] sm:gap-6">
            <dt className="font-bold">{label}</dt>
            <dd className="text-muted">{value}</dd>
          </div>
        ))}
        <div className="grid gap-1 py-4 sm:grid-cols-[14rem_1fr] sm:gap-6">
          <dt className="font-bold">{t("status")}</dt>
          <dd>
            <ul className="flex flex-wrap gap-2">
              {Object.entries(q.recits.parStatut).map(([statut, count]) => (
                <li key={statut} className="pill border border-border px-3 py-0.5 text-muted">
                  {t.has(`statuses.${statut}`) ? t(`statuses.${statut}`) : statut} : {count}
                </li>
              ))}
            </ul>
          </dd>
        </div>
        {q.localitesSansParent.nonResolues.length > 0 ? (
          <div className="grid gap-1 py-4 sm:grid-cols-[14rem_1fr] sm:gap-6">
            <dt className="font-bold">{t("unresolved")}</dt>
            <dd className="text-muted">{q.localitesSansParent.nonResolues.join(", ")}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
