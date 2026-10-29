import { useTranslations } from "next-intl";
import { PatternDivider } from "@/components/ui/Pattern";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="mt-16 text-xs text-muted">
      <PatternDivider />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <section>
          <h2 className="mb-2 text-sm text-text">{t("partners")}</h2>
          <p>{t("partnersText")}</p>
        </section>
        <section>
          <h2 className="mb-2 text-sm text-text">{t("license")}</h2>
          <p>{t("licenseText")}</p>
        </section>
        <section>
          <h2 className="sr-only">Liens</h2>
          <ul className="space-y-2">
            <li>
              <Link className="underline-offset-4 hover:underline" href="/a-propos#conteurs">
                {t("storytellers")}
              </Link>
            </li>
            <li>
              <Link className="underline-offset-4 hover:underline" href="/a-propos/donnees">
                {t("dataReport")}
              </Link>
            </li>
            <li>
              <Link className="underline-offset-4 hover:underline" href="/a-propos/ethique">
                {t("ethics")}
              </Link>
            </li>
            <li>
              <Link className="underline-offset-4 hover:underline" href="/contribuer">
                {t("contribute")}
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </footer>
  );
}
