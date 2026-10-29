import { Andika } from "next/font/google";

/*
 * Andika (SIL) for body text: Google's latin-ext subset covers
 * ɛ ɩ ʋ ɓ ɗ ŋ ɲ ƴ, and ẽ comes from the vietnamese subset.
 *
 * Headings use Gentium Book, self-hosted from the SIL release (see
 * scripts/subset-fonts.ts and src/styles/fonts.css): the Google Fonts build
 * of Gentium Book Plus lacks ɛ ɩ ʋ ɓ ɗ ɲ.
 */
export const andika = Andika({
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
  variable: "--font-andika",
});

/** Basic-Latin heading face, preloaded because it is needed on every page. */
export const GENTIUM_PRELOAD = "/fonts/gentium-book-700-latin.woff2";
