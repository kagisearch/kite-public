import { browser } from "$app/environment";
import { asset } from "$app/paths";

export type ThemeOption = "light" | "dark" | "system";

interface ThemeState {
  current: ThemeOption;
}

// Initialize theme state
const themeState = $state<ThemeState>({
  current: "system",
});

// Helper functions
function applyTheme(theme: ThemeOption) {
  if (!browser) return;

  const root = document.documentElement;
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  root.classList.toggle("dark", isDark);

  // Update theme-color meta tag
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", isDark ? "#1f2937" : "#ffffff");
  }

  // Update favicon based on browser's theme preference (not app theme)
  const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
  if (favicon) {
    const browserPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    favicon.href = browserPrefersDark
      ? asset('/svg/kagi_news_icon_dark.svg')
      : asset('/svg/kagi_news_icon.svg');
  }
}

function saveTheme(theme: ThemeOption) {
  if (!browser) return;
  localStorage.setItem("theme", theme);
}

function loadTheme(): ThemeOption {
  if (!browser) return "system";

  const stored = localStorage.getItem("theme") as ThemeOption;
  return stored || "system";
}

// Theme store API
export const theme = {
  get current() {
    return themeState.current;
  },

  get isDark() {
    if (!browser) return false;
    return (
      themeState.current === "dark" ||
      (themeState.current === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  },

  set(theme: ThemeOption) {
    themeState.current = theme;
    applyTheme(theme);
    saveTheme(theme);
  },

  init() {
    if (!browser) return;

    const storedTheme = loadTheme();
    themeState.current = storedTheme;
    applyTheme(storedTheme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", () => {
      // Update app theme if set to system
      if (themeState.current === "system") {
        applyTheme("system");
      }

      // Always update favicon based on browser preference
      const favicon = document.querySelector(
        'link[rel="icon"]',
      ) as HTMLLinkElement;
      if (favicon) {
        favicon.href = mediaQuery.matches
          ? asset('/svg/kagi_news_icon_dark.svg')
          : asset('/svg/kagi_news_icon.svg');
      }
    });
  },
};
