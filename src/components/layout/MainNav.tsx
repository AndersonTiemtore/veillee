"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";

export const NAV_ITEMS = [
  { href: "/carte", key: "map" },
  { href: "/contes", key: "stories" },
  { href: "/frise", key: "timeline" },
  { href: "/jeunesse", key: "youth" },
  { href: "/a-propos", key: "about" },
] as const;

export function MainNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  // The mobile menu remembers the page it was opened on, so it closes by
  // itself once navigation changes the pathname.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  const links = NAV_ITEMS.map(({ href, key }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={`block rounded-full px-3 py-2 transition-colors hover:bg-surface hover:text-text ${
            active ? "text-accent" : "text-muted"
          }`}
        >
          {t(key)}
        </Link>
      </li>
    );
  });

  return (
    <nav aria-label={t("label")} className="ml-auto">
      <ul className="hidden items-center gap-1 md:flex">{links}</ul>
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-surface md:hidden"
        aria-expanded={open}
        aria-controls="menu-mobile"
        aria-label={open ? t("closeMenu") : t("openMenu")}
        onClick={() => setOpenOn(open ? null : pathname)}
      >
        {open ? <X aria-hidden size={22} /> : <Menu aria-hidden size={22} />}
      </button>
      {open ? (
        <ul
          id="menu-mobile"
          className="absolute inset-x-0 top-16 flex flex-col gap-1 border-b border-border bg-bg p-4 text-lg md:hidden"
        >
          {links}
        </ul>
      ) : null}
    </nav>
  );
}
