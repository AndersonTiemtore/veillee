import { useTranslations } from "next-intl";
import { Flamme } from "@/components/ui/Pictogram";
import { Link } from "@/i18n/navigation";
import { MainNav } from "./MainNav";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const t = useTranslations();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:rounded-card focus:bg-surface focus:px-4 focus:py-2"
      >
        {t("nav.skipToContent")}
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-xl font-bold text-text"
        >
          <Flamme className="flicker text-flamme" width={28} height={28} />
          {t("meta.siteName")}
        </Link>
        <MainNav />
        <ThemeToggle />
      </div>
    </header>
  );
}
