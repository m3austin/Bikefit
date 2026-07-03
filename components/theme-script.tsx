import { THEME_STORAGE_KEY } from "@/lib/theme";

/*
 * Blocking script that resolves the theme and toggles the `.dark` class on
 * <html> before first paint, so there is no theme flash (Zero jank,
 * UX-UI-Design §1). localStorage is the source of truth; the SSR cookie is
 * only a hint. Kept inline and dependency-free by design.
 */
const script = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k)||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.toggle("dark",d);}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
