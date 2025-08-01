import { browser } from "$app/environment";

export type FontSize = "small" | "normal" | "large";
export type CategoryHeaderPosition = "top" | "bottom";
export type StoryExpandMode = "always" | "doubleClick" | "never";

interface SettingsState {
  isOpen: boolean;
  fontSize: FontSize;
  storyCount: number;
  categoryHeaderPosition: CategoryHeaderPosition;
  showIntro: boolean;
  activeTab?: string;
  storyExpandMode: StoryExpandMode;
}

// Initialize settings state
const settingsState = $state<SettingsState>({
  isOpen: false,
  fontSize: "normal",
  storyCount: 10,
  categoryHeaderPosition: "bottom",
  showIntro: false,
  storyExpandMode: "doubleClick",
});

// Helper functions
function applyFontSize(size: FontSize) {
  if (!browser) return;

  const body = document.body;
  body.classList.remove("text-sm", "text-base", "text-lg");

  switch (size) {
    case "small":
      body.classList.add("text-sm");
      break;
    case "large":
      body.classList.add("text-lg");
      break;
    default:
      body.classList.add("text-base");
  }
}

function saveToStorage(key: string, value: string) {
  if (!browser) return;
  localStorage.setItem(key, value);
}

function loadFromStorage(key: string, defaultValue: string): string {
  if (!browser) return defaultValue;
  return localStorage.getItem(key) || defaultValue;
}

// Settings store API
export const settings = {
  get isOpen() {
    return settingsState.isOpen;
  },

  get fontSize() {
    return settingsState.fontSize;
  },

  get storyCount() {
    return settingsState.storyCount;
  },

  get categoryHeaderPosition() {
    return settingsState.categoryHeaderPosition;
  },

  get showIntro() {
    return settingsState.showIntro;
  },

  get activeTab() {
    return settingsState.activeTab;
  },

  get storyExpandMode() {
    return settingsState.storyExpandMode;
  },

  setStoryExpandMode(mode: StoryExpandMode) {
    settingsState.storyExpandMode = mode;
    saveToStorage("storyExpandMode", mode);
  },

  open(tab?: string) {
    settingsState.isOpen = true;
    if (tab) {
      settingsState.activeTab = tab;
    }
    if (browser) {
      document.body.classList.add("overflow-hidden");
    }
  },

  close() {
    settingsState.isOpen = false;
    settingsState.activeTab = undefined;
    if (browser) {
      document.body.classList.remove("overflow-hidden");
    }
  },

  setFontSize(size: FontSize) {
    settingsState.fontSize = size;
    applyFontSize(size);
    saveToStorage("fontSize", size);
  },

  setStoryCount(count: number) {
    const clampedCount = Math.max(3, Math.min(12, count));
    settingsState.storyCount = clampedCount;
    saveToStorage("storyCount", clampedCount.toString());
  },

  setCategoryHeaderPosition(position: CategoryHeaderPosition) {
    settingsState.categoryHeaderPosition = position;
    saveToStorage("categoryHeaderPosition", position);
  },

  setShowIntro(show: boolean) {
    settingsState.showIntro = show;
    saveToStorage("introShown", (!show).toString());
  },

  init() {
    if (!browser) return;

    const fontSize = loadFromStorage("fontSize", "normal") as FontSize;
    const storyCount = parseInt(loadFromStorage("storyCount", "10"));
    const categoryHeaderPosition = loadFromStorage(
      "categoryHeaderPosition",
      "bottom",
    ) as CategoryHeaderPosition;
    const introShown = loadFromStorage("introShown", "false") === "true";

    settingsState.fontSize = fontSize;
    settingsState.storyCount = Math.max(3, Math.min(12, storyCount));
    settingsState.categoryHeaderPosition = categoryHeaderPosition;
    settingsState.showIntro = !introShown;
    settingsState.storyExpandMode = loadFromStorage("storyExpandMode", "doubleClick") as StoryExpandMode;

    applyFontSize(fontSize);
  },
};
