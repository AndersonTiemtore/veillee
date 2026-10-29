/**
 * Applies the saved theme before first paint to avoid a flash. The script body
 * is static so its CSP hash stays stable (see next.config.ts).
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("veillee-theme");if(t==="jour"||t==="nuit")document.documentElement.dataset.theme=t}catch(e){}`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
