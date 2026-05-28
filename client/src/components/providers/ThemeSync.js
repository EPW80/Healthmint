import { useEffect } from "react";
import { useSelector } from "react-redux";
import {
  selectTheme,
  selectEffectiveTheme,
  THEME_STORAGE_KEY,
} from "../../redux/slices/uiSlice.js";

const applyDataTheme = (effective) => {
  const root = document.documentElement;
  if (effective === "dark") {
    root.setAttribute("data-theme", "dark");
  } else {
    root.removeAttribute("data-theme");
  }
};

// Mounts inside the Redux Provider. Renders nothing.
// Owns the bridge from Redux theme state to (a) the documentElement attribute
// driving CSS variables, and (b) localStorage persistence. When the user
// preference is "system", it also tracks the OS-level prefers-color-scheme.
const ThemeSync = () => {
  const themePref = useSelector(selectTheme);
  const effective = useSelector(selectEffectiveTheme);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themePref);
    } catch (_e) {
      // localStorage unavailable — silently skip persistence
    }
  }, [themePref]);

  useEffect(() => {
    applyDataTheme(effective);
  }, [effective]);

  useEffect(() => {
    if (themePref !== "system") return undefined;
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (event) => {
      applyDataTheme(event.matches ? "dark" : "light");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [themePref]);

  return null;
};

export default ThemeSync;
