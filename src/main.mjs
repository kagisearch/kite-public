import Alpine from "alpinejs";
import Sortable from "sortablejs";

window.Alpine = Alpine;
window.Sortable = Sortable;

let mediaData = null;
// Load media data immediately
fetch(`${import.meta.env.VITE_STATIC_PATH}/media_data.json`)
  .then((response) => response.json())
  .then((data) => {
    // Transform array into lookup object
    const lookup = {};
    data.forEach((item) => {
      if (item.domains) {
        item.domains.forEach((domain) => {
          lookup[domain.toLowerCase()] = item;
        });
      }
    });

    mediaData = {
      raw: data,
      lookup: lookup,
    };
  })
  .catch(() => {
    // Error handling for media data loading
  });
document.addEventListener("alpine:init", () => {
  Alpine.store("language", {
    current: localStorage.getItem("language") || "default",
    set(lang) {
      this.current = lang;
      localStorage.setItem("language", lang);
      this.apply();
    },
    apply() {
      // Force reload categories and stories
      window.dispatchEvent(
        new CustomEvent("language-changed", { detail: this.current }),
      );
    },
    init() {
      if (!localStorage.getItem("language")) {
        this.set("default");
      }
    },
  });

  // Add translations store for UI localization
  Alpine.store("translations", {
    data: {},

    // Load translations from JSON file
    async loadTranslations(lang) {
      // If language is 'default', use English
      const langCode = lang === "default" ? "en" : lang;

      try {
        const response = await fetch(
          `${import.meta.env.VITE_STATIC_PATH}/locales/${langCode}.json`,
        );
        if (response.ok) {
          const translations = await response.json();
          // Transform the object structure into a flat key-value mapping
          this.data = Object.entries(translations).reduce(
            (acc, [key, value]) => {
              acc[key] = value.text;
              return acc;
            },
            {},
          );
          console.log(
            `Loaded ${Object.keys(this.data).length} translations for ${langCode}`,
          );
        } else {
          console.error(
            `Failed to load translations for ${langCode}, falling back to English`,
          );
          // Fall back to English if the requested language file doesn't exist
          if (langCode !== "en") {
            await this.loadTranslations("en");
          }
        }
      } catch (error) {
        console.error(`Error loading translations:`, error);
        // Fall back to English on error
        if (langCode !== "en") {
          await this.loadTranslations("en");
        }
      }
    },

    // Get a translated string
    get(key) {
      // If the translation exists, return it
      if (this.data[key]) {
        return this.data[key];
      }

      // Return the key itself as a last resort
      return key;
    },

    // Initialize translations
    async init() {
      const lang = Alpine.store("language").current;
      await this.loadTranslations(lang);

      // Listen for language changes
      window.addEventListener("language-changed", async (event) => {
        await this.loadTranslations(event.detail);
      });
    },
  });

  // Add a global helper function for translations
  Alpine.magic("t", () => {
    return (key) => Alpine.store("translations").get(key);
  });

  Alpine.data("sourceOverlay", () => ({
    showSourceOverlay: false,
    currentSource: { name: "", favicon: "" },
    sourceArticles: [],
    currentStory: null,
    mediaInfo: null,
    showSourceInfo: false,

    async processSource($event) {
      if (!mediaData?.lookup) {
        console.log("Media data not yet loaded, fetching...");
        const response = await fetch(`${import.meta.env.VITE_STATIC_PATH}/media_data.json`);
        const data = await response.json();
        const lookup = {};
        data.forEach((item) => {
          if (item.domains) {
            item.domains.forEach((domain) => {
              lookup[domain.toLowerCase()] = item;
            });
          }
        });
        mediaData = {
          raw: data,
          lookup: lookup,
        };
      }

      this.showSourceOverlay = true;
      this.currentSource = $event.detail.domain || { name: "", favicon: "" };
      this.currentStory = $event.detail.story || null;
      this.sourceArticles =
        this.currentStory && this.currentSource?.name
          ? this.currentStory.articles.filter(
              (a) => a.domain === this.currentSource.name,
            )
          : [];

      this.mediaInfo = null;
      if (this.currentSource?.name) {
        const lookupKey = this.currentSource.name.toLowerCase();
        this.mediaInfo = mediaData?.lookup?.[lookupKey];
      }

      this.showSourceInfo = false;
    },
  }));
  // Ensure media data is loaded
  if (!mediaData) {
    fetch(`${import.meta.env.VITE_STATIC_PATH}/media_data.json`)
      .then((response) => response.json())
      .then((data) => {
        mediaData = data;
      })
      .catch((error) => {
        console.error("Error loading media data:", error);
      });
  }

  Alpine.store("intro", {
    shown: localStorage.getItem("introShown") === "true",
    set(value) {
      this.shown = value;
      localStorage.setItem("introShown", value);
    },
  });

  Alpine.store("theme", {
    current: localStorage.getItem("theme") || "system",
    set(theme) {
      this.current = theme;
      localStorage.setItem("theme", theme);
      this.apply();
    },
    apply() {
      const isDark =
        this.current === "dark" ||
        (this.current === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", isDark);
      document
        .getElementById("theme-color")
        .setAttribute("content", isDark ? "#1a202c" : "#ffffff");
    },
    init() {
      this.apply();
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", () => {
          if (this.current === "system") {
            this.apply();
          }
        });
    },
  });

  Alpine.store("fontSize", {
    current: localStorage.getItem("fontSize") || "normal",
    set(size) {
      this.current = size;
      localStorage.setItem("fontSize", size);
      this.apply();
    },
    apply() {
      document.body.classList.remove("text-sm", "text-base", "text-lg");
      switch (this.current) {
        case "small":
          document.body.classList.add("text-sm");
          break;
        case "large":
          document.body.classList.add("text-lg");
          break;
        default:
          document.body.classList.add("text-base");
      }
    },
    init() {
      if (!localStorage.getItem("fontSize")) {
        this.set("normal");
      }
      this.apply();
    },
  });

  Alpine.store("sections", {
    defaultOrder: [
      "summary",
      "primaryImage",
      "highlights",
      "quotes",
      "secondaryImage",
      "perspectives",
      "historicalBackground",
      "humanitarianImpact",
      "technicalDetails",
      "businessAngle",
      "internationalReactions",
      "otherDetails",
      "timeline",
      "sources",
      "didYouKnow",
      "actionItems",
    ],
    settings: {
      summary: localStorage.getItem("showSummary") !== "false",
      primaryImage: localStorage.getItem("showPrimaryImage") !== "false",
      highlights: localStorage.getItem("showHighlights") !== "false",
      quotes: localStorage.getItem("showQuotes") !== "false",
      secondaryImage: localStorage.getItem("showSecondaryImage") !== "false",
      perspectives: localStorage.getItem("showPerspectives") !== "false",
      historicalBackground:
        localStorage.getItem("showHistoricalBackground") !== "false",
      humanitarianImpact:
        localStorage.getItem("showHumanitarianImpact") !== "false",
      technicalDetails:
        localStorage.getItem("showTechnicalDetails") !== "false",
      businessAngle: localStorage.getItem("showBusinessAngle") !== "false",
      internationalReactions:
        localStorage.getItem("showInternationalReactions") !== "false",
      otherDetails: localStorage.getItem("showOtherDetails") !== "false",
      timeline: localStorage.getItem("showTimeline") !== "false",
      sources: localStorage.getItem("showSources") !== "false",
      didYouKnow: localStorage.getItem("showDidYouKnow") !== "false",
      actionItems: localStorage.getItem("showActionItems") !== "false",
    },
    order: JSON.parse(localStorage.getItem("sectionOrder")),
    toggle(section) {
      this.settings[section] = !this.settings[section];
      localStorage.setItem(
        "show" + section.charAt(0).toUpperCase() + section.slice(1),
        this.settings[section],
      );
    },
    init() {
      if (!this.order) {
        this.order = this.defaultOrder;
      }
      // Reset if there are new items, or the keys are different
      if (
        this.order.length !== this.defaultOrder.length ||
        Object.keys(this.order).some(
          (key) => this.order[key] !== this.defaultOrder[key],
        )
      ) {
        this.order = this.defaultOrder;
        localStorage.setItem("sectionOrder", JSON.stringify(this.order));
      }
    },
    render() {
      const container = document.querySelector('[x-ref="sectionsList"]');

      // Clear existing content
      container.innerHTML = "";

      // Create the initial items
      Alpine.store("sections").order.forEach((sectionName) => {
        const div = document.createElement("div");
        div.className = "flex items-center justify-between";
        div.dataset.section = sectionName;
        div.innerHTML = `
                    <div class='flex items-center'>
                        <svg class='w-6 h-6 text-gray-400 mr-3 cursor-move drag-handle' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 6h16M4 12h16M4 18h16'></path>
                        </svg>
                        <label class='text-sm font-medium text-gray-700 dark:text-gray-300'>
                            ${sectionName.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                        </label>
                    </div>
                    <button x-data 
                            @click="$store.sections.toggle('${sectionName}')" 
                            class="relative inline-flex h-6 w-11 items-center rounded-full"
                            :class="$store.sections.settings['${sectionName}'] ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'">
                        <span class='sr-only'>Toggle ${sectionName}</span>
                        <span class='inline-block h-4 w-4 transform rounded-full bg-white transition'
                            :class="$store.sections.settings['${sectionName}'] ? 'translate-x-6' : 'translate-x-1'"></span>
                    </button>
                `;
        container.appendChild(div);
      });

      // Initialize Sortable
      new Sortable(container, {
        animation: 150,
        handle: ".drag-handle",
        onEnd: function (evt) {
          const newOrder = Array.from(evt.to.children)
            .map((el) => el.dataset.section)
            .filter(Boolean);

          Alpine.store("sections").order = newOrder;
          localStorage.setItem("sectionOrder", JSON.stringify(newOrder));
        },
      });
    },
    reset() {
      this.order = this.defaultOrder;
      localStorage.setItem("sectionOrder", JSON.stringify(this.defaultOrder));

      this.render();
    },
  });

  Alpine.store("chaosIndex", {
    score: 0,
    summary: "",
    getBucketDescription() {
      const score = this.score;
      if (score >= 0 && score <= 20) {
        return "0-20: Peaceful and calm world. Yay!";
      } else if (score >= 21 && score <= 40) {
        return "21-40: Emerging challenges, manageable tensions.";
      } else if (score >= 41 && score <= 60) {
        return "41-60: Growing global issues, but hope persists.";
      } else if (score >= 61 && score <= 80) {
        return "61-80: Multiple crises, increasing instability.";
      } else if (score >= 81 && score <= 100) {
        return "81-100: Severe global turmoil, widespread impact.";
      } else {
        return "Undefined score range";
      }
    },
  });

  Alpine.store("storyCount", {
    current: parseInt(localStorage.getItem("storyCount")) || 10,
    set(count) {
      this.current = count;
      localStorage.setItem("storyCount", count);
    },
    init() {
      if (this.current < 3) this.current = 3;
      if (this.current > 12) this.current = 12;
    },
  });

  Alpine.store("categories", {
    order: [],
    enabled: [],
    isValidCategory(category) {
      return category != null && category !== undefined && category !== "";
    },
    init() {
      window.addEventListener("language-changed", () => {
        console.log("[init] Language changed, reloading");

        // TODO: Remove this once we make it work without refreshing
        window.location.reload();
      });

      const savedOrder = JSON.parse(localStorage.getItem("categoryOrder"));
      const savedEnabled = JSON.parse(
        localStorage.getItem("enabledCategories"),
      );
      if (savedOrder) {
        this.order = savedOrder.filter((cat) => this.isValidCategory(cat));
      }
      if (savedEnabled) {
        // Reorder enabled categories to match the order in categoryOrder and filter out null values
        this.enabled = this.order.filter(
          (cat) => this.isValidCategory(cat) && savedEnabled.includes(cat),
        );
      }
      // Save the cleaned up enabled categories
      localStorage.setItem("enabledCategories", JSON.stringify(this.enabled));

      // Dispatch event when categories are loaded
      window.dispatchEvent(new CustomEvent("categories-loaded"));
    },
    saveNewOrder(newOrder) {
      this.order = newOrder.filter((cat) => this.isValidCategory(cat));
      // Don't modify enabled categories here - let the Sortable handler manage that
      localStorage.setItem("categoryOrder", JSON.stringify(this.order));
      localStorage.setItem("enabledCategories", JSON.stringify(this.enabled));
    },
    enableCategory(category) {
      // const index = this.enabled.indexOf(category);
      // if (index > -1) {
      //     console.log("[enableCategory] Category already enabled, removing");
      //     if (this.enabled.length > 1) {
      //         this.enabled.splice(index, 1);
      //     }
      // } else {
      // When enabling a category, insert it in the correct position according to order
      const orderIndex = this.order.indexOf(category);
      const insertIndex = this.enabled.findIndex(
        (cat) => this.order.indexOf(cat) > orderIndex,
      );
      if (insertIndex === -1) {
        this.enabled.push(category);
      } else {
        this.enabled.splice(insertIndex, 0, category);
      }
      // }

      localStorage.setItem("enabledCategories", JSON.stringify(this.enabled));
      console.log("[enableCategory] Saving enabled categories:", this.enabled);
    },
    isEnabled(category) {
      return this.enabled.includes(category);
    },
  });

  Alpine.store("imageGallery", {
    swiper: null,
    isOpen: false,
    images: [],
    open(images) {
      this.images = images;
      this.isOpen = true;
      document.body.classList.add("overflow-hidden");
      setTimeout(() => {
        this.swiper = initializeSwiper(".swiper-container");
      }, 0);
    },
    close() {
      this.isOpen = false;
      document.body.classList.remove("overflow-hidden");
      if (this.swiper) {
        this.swiper.destroy();
        this.swiper = null;
      }
    },
  });

  Alpine.store("settings", {
    isOpen: false,
    open() {
      this.isOpen = true;
      document.body.classList.add("overflow-hidden");
    },
    close() {
      this.isOpen = false;
      document.body.classList.remove("overflow-hidden");
    },
  });

  Alpine.store("mobileUI", {
    categoryHeaderPosition:
      localStorage.getItem("categoryHeaderPosition") || "bottom",
    setCategoryHeaderPosition(position) {
      this.categoryHeaderPosition = position;
      localStorage.setItem("categoryHeaderPosition", position);
    },
  });

  // Store for experimental features
  Alpine.store("experimental", {
    showArticleIcons:
      localStorage.getItem("showArticleIcons") === "true" || false,
    showCategoryIcons:
      localStorage.getItem("showCategoryIcons") === "true" || false,
    disableCategorySwipe:
      localStorage.getItem("disableCategorySwipe") === "true" || false,
    toggleArticleIcons(value) {
      this.showArticleIcons = value;
      localStorage.setItem("showArticleIcons", value);
    },
    toggleCategoryIcons(value) {
      this.showCategoryIcons = value;
      localStorage.setItem("showCategoryIcons", value);
    },
    toggleCategorySwipe(value) {
      this.disableCategorySwipe = value;
      localStorage.setItem("disableCategorySwipe", value);
    },
  });
});
function lockScroll() {
  document.body.style.overflow = "hidden";
}
// Make lockScroll function available globally
window.lockScroll = lockScroll;

function unlockScroll() {
  document.body.style.overflow = "";
}
// Make unlockScroll function available globally
window.unlockScroll = unlockScroll;

function findScrollableParent(element) {
  if (!element) return null;

  // Check if the element itself is scrollable
  if (isElementScrollable(element)) {
    return element;
  }

  // Check parent elements
  let parent = element.parentElement;
  while (parent) {
    if (isElementScrollable(parent)) {
      return parent;
    }
    parent = parent.parentElement;
  }

  return null;
}
// Make findScrollableParent function available globally
window.findScrollableParent = findScrollableParent;

function isElementScrollable(element) {
  const style = window.getComputedStyle(element);
  const overflowX = style.getPropertyValue("overflow-x");

  // Check if element has horizontal scroll
  return (
    (overflowX === "auto" || overflowX === "scroll") &&
    element.scrollWidth > element.clientWidth
  );
}

function fetchChaosIndex() {
  // Disabled chaos index loading
  return;
}

function generateArticleId(category, clusterNumber) {
  return `${category.toLowerCase()}-${clusterNumber}`;
}

function updateUrlWithArticleId(articleId) {
  const url = new URL(window.location);
  if (articleId) {
    url.searchParams.set("article", articleId);
  } else {
    url.searchParams.delete("article");
    // If there are no more parameters, remove the '?' entirely
    if (Array.from(url.searchParams).length === 0) {
      window.history.pushState({}, "", window.location.pathname);
      return;
    }
  }
  window.history.pushState({}, "", url);
}
// Make updateUrlWithArticleId available globally
window.updateUrlWithArticleId = updateUrlWithArticleId;

function getArticleIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("article");
}
// Make getArticleIdFromUrl available globally
window.getArticleIdFromUrl = getArticleIdFromUrl;

function formatTimeSince(timestamp) {
  const diff = Math.floor(Date.now() / 1000 - timestamp);
  if (diff < 60) {
    return `Updated ${diff} sec ago`;
  } else if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return `Updated ${mins} ${mins === 1 ? "min" : "mins"} ago`;
  } else {
    const hours = Math.floor(diff / 3600);
    return `Updated ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
}

function handleWikiLink(event) {
  const link = event.target.closest(
    'a[href^="https://en.wikipedia.org/wiki/"]',
  );
  if (link) {
    event.preventDefault();
    const title = decodeURIComponent(
      link.getAttribute("href").split("/").pop(),
    );
    const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;

    fetch(apiUrl)
      .then((response) => response.json())
      .then((data) => {
        const isMobile = window.innerWidth <= 768;
        console.log("isMobile", isMobile);
        if (isMobile) {
          // For mobile, show a full-screen modal
          const popup = document.createElement("div");
          popup.className =
            "fixed inset-0 z-50 bg-white dark:bg-gray-800 overflow-y-auto";
          popup.innerHTML = `
                        <div class="p-4">
                            <div class="flex justify-between items-center mb-4">
                                <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">${data.title}</h3>
                                <button class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" onclick="this.parentElement.parentElement.parentElement.remove()">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>
                            ${
                              data.thumbnail
                                ? `
                                <div class="relative h-48 w-full mb-4">
                                    <img src="${data.thumbnail.source}" alt="${data.title}" class="w-full h-full object-cover rounded-lg"/>
                                </div>
                            `
                                : ""
                            }
                            <div class="prose prose-sm dark:prose-invert max-w-none">
                                <p>${data.extract}</p>
                            </div>
                            <div class="mt-4">
                                <a href="${link.href}" target="_blank" class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline">
                                    <span>Read more on Wikipedia</span>
                                    <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                    </svg>
                                </a>
                            </div>
                        </div>
                    `;
          document.body.appendChild(popup);
        } else {
          // For desktop, keep the hover popup
          showPopup(data, link);
        }
      })
      .catch((error) => {
        console.error("Error fetching Wikipedia summary:", error);
      });
  }
}

function showPopup(data, link) {
  const popup = document.getElementById("wikipedia-popup");
  const popupContent = document.getElementById("wikipedia-popup-content");
  const popupImage = document.getElementById("wikipedia-popup-image");
  const popupLayout = document.getElementById("wikipedia-popup-layout");
  const closeButton = document.getElementById("wikipedia-popup-close");

  popupContent.textContent = data.extract;

  if (data.thumbnail) {
    popupImage.src = data.thumbnail.source;
    popupImage.style.display = "block";
  } else {
    popupImage.style.display = "none";
  }

  popupLayout.classList.remove("flex-row");
  popupLayout.classList.add("flex-col");
  popupImage.classList.add("mb-4");
  popupImage.classList.remove("mr-4");
  popupImage.style.width = "100%";
  popupImage.style.height = "auto";
  popupImage.style.objectFit = "scale-down";

  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    popup.style.position = "fixed";
    popup.style.left = "0";
    popup.style.right = "0";
    popup.style.top = "0";
    popup.style.width = "100%";
    popup.style.maxWidth = "100%";
    popup.style.height = "80vh";
    popup.style.maxHeight = "80vh";
    popup.style.margin = "0";
    popup.style.borderRadius = "0";
    popup.style.overflowY = "auto";
    closeButton.style.display = "block";
  } else {
    const rect = link.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupWidth = 400;
    const popupHeight = 400;

    let leftPosition = rect.left + window.scrollX;
    let topPosition = rect.bottom + window.scrollY;

    if (leftPosition + popupWidth > viewportWidth) {
      leftPosition = Math.max(viewportWidth - popupWidth - 10, 0);
    }

    if (topPosition + popupHeight > viewportHeight + window.scrollY) {
      topPosition = Math.max(
        rect.top + window.scrollY - popupHeight,
        window.scrollY,
      );
    }

    popup.style.position = "absolute";
    popup.style.left = `${leftPosition}px`;
    popup.style.top = `${topPosition}px`;
    popup.style.width = `${popupWidth}px`;
    popup.style.height = `${popupHeight}px`;
    popup.style.borderRadius = "0.5rem";
    closeButton.style.display = "none";
  }

  popup.style.display = "block";
}

function openImageGallery(images) {
  Alpine.store("imageGallery").open(images);
}
document.addEventListener("alpine:init", () => {
  Alpine.data("kiteApp", () => ({
    stories: [],
    expandedStory: null,
    initialLoading: true,
    mediaData: [],
    isScrolling: false,
    readStories: JSON.parse(localStorage.getItem("readStories") || "{}"),
    totalStoriesRead: parseInt(localStorage.getItem("totalStoriesRead") || "0"),
    availableCategories: [],
    currentCategory: "",
    timestamp: 0,
    readCount: 0,
    dateClickCount: 0,
    allStories: {},
    onThisDayEvents: [],
    showIntro: !Alpine.store("intro").shown && !getArticleIdFromUrl(),
    chaosScore: 0,
    chaosSummary: "",
    viewMode: "list",
    sortableInstance: null,
    loadingProgress: 0,
    getLastUpdated() {
      return formatTimeSince(this.timestamp);
    },
    openMaps(location) {
      const encodedLocation = encodeURIComponent(location);
      const appleUrl = `maps://maps.apple.com/?q=${encodedLocation}`;
      const googleUrl = `maps:?q=${encodedLocation}`;
      const googleWebUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;

      // TODO: navigator.platform is deprecated
      const isMacOSOrIOS = /Mac|iPhone|iPad|iPod/.test(navigator.platform);

      if (isMacOSOrIOS) {
        window.location.href = appleUrl;

        setTimeout(() => {
          if (document.hidden) return;
          window.location.href = googleUrl;
        }, 500);
      } else {
        window.location.href = googleUrl;

        setTimeout(() => {
          if (document.hidden) return;
          window.location.href = googleWebUrl;
        }, 500);
      }
    },
    allStoriesRead: false,
    markAllAsRead() {
      // Mark all stories in current category as read
      this.stories.forEach((story) => {
        if (!this.readStories[story.title]) {
          this.readStories[story.title] = true;
          this.totalStoriesRead++;
        }
      });
      // Update localStorage
      localStorage.setItem("readStories", JSON.stringify(this.readStories));
      localStorage.setItem("totalStoriesRead", this.totalStoriesRead);
      // Hide the button
      this.allStoriesRead = true;
    },
    touchStartX: 0,
    touchEndX: 0,
    touchStartY: 0,
    touchEndY: 0,
    touchStartedOnScrollable: false,
    async init() {
      // Add language change event listener
      window.addEventListener("language-changed", () => {
        this.initialLoading = true;
        this.fetchCategories()
          .then(() => this.fetchAllStories())
          .finally(() => {
            this.initialLoading = false;
          });
      });

      Alpine.store("language").init();
      // Initialize translations
      await Alpine.store("translations").init();

      // Check if all stories are read
      this.allStoriesRead = this.stories.every(
        (story) => this.readStories[story.title],
      );

      // Load media data
      try {
        const response = await fetch(
          `${import.meta.env.VITE_STATIC_PATH}/media_data.json`,
        );
        if (response.ok) {
          this.mediaData = await response.json();
        }
      } catch (error) {
        console.error("Error loading media data:", error);
        this.mediaData = [];
      }

      this.fetchCategories()
        .then(() => {
          return this.fetchAllStories();
        })
        .then(() => {
          const storedOrder = Alpine.store("categories").order || [];
          const storedEnabled = Alpine.store("categories").enabled || [];
          const allCategoryNames = this.availableCategories.map(
            (cat) => cat.name,
          );

          // For new users (no stored order or enabled categories), set defaults
          if (
            !storedOrder ||
            storedOrder.length === 0 ||
            !storedEnabled ||
            storedEnabled.length === 0
          ) {
            const defaultCategories = [
              "World",
              "OnThisDay",
              "Business",
              "Technology",
              "Science",
              "Sports",
            ];
            Alpine.store("categories").order = allCategoryNames;
            Alpine.store("categories").enabled = defaultCategories.filter(
              (name) => allCategoryNames.includes(name),
            );
            this.currentCategory = "World";
          } else {
            this.currentCategory = storedOrder[0];
            // For existing users, update order and enabled categories
            const newCategories = allCategoryNames.filter(
              (name) => !storedOrder.includes(name),
            );
            Alpine.store("categories").order =
              storedOrder.concat(newCategories);

            // Remove categories from order that no longer exist
            Alpine.store("categories").order = Alpine.store(
              "categories",
            ).order.filter((name) => allCategoryNames.includes(name));

            // Keep their enabled categories that still exist
            Alpine.store("categories").enabled = storedEnabled.filter((name) =>
              allCategoryNames.includes(name),
            );
          }

          // Rebuild availableCategories according to the updated order
          this.availableCategories = Alpine.store("categories")
            .order.map((name) =>
              this.availableCategories.find((cat) => cat.name === name),
            )
            .filter((cat) => cat);

          // Save the updated order and enabled categories back to localStorage
          localStorage.setItem(
            "categoryOrder",
            JSON.stringify(Alpine.store("categories").order),
          );
          localStorage.setItem(
            "enabledCategories",
            JSON.stringify(Alpine.store("categories").enabled),
          );

          // Set current category to the first enabled category
          const firstEnabledCategory = Alpine.store("categories").enabled[0];
          if (firstEnabledCategory) {
            this.currentCategory = firstEnabledCategory;
          }

          this.changeCategory();
          this.updateCategoryDropdown();
          this.renderCategories();
          Alpine.store("categories").init();

          window.dispatchEvent(new CustomEvent("categories-loaded"));

          this.initCategorySortable();
          const articleId = getArticleIdFromUrl();
          if (articleId) {
            this.openSharedArticle(articleId);
          }
        });

      Alpine.store("theme").init();
      Alpine.store("fontSize").init();
      Alpine.store("storyCount").init();
      Alpine.store("sections").init();

      fetchChaosIndex();
    },
    fetchCategories() {
      const lang = Alpine.store("language").current;
      const filename = lang === "default" ? "kite.json" : `kite_${lang}.json`;

      // Reset categories before fetching
      this.availableCategories = [];
      this.currentCategory = "";

      return fetch(
        `${import.meta.env.VITE_BASE_PATH}/${filename}?${Date.now()}`,
      )
        .then((response) => response.json())
        .then((data) => {
          this.availableCategories = data.categories;
          this.timestamp = data.timestamp;
        });
    },
    fetchAllStories() {
      this.initialLoading = true;
      this.allStories = {};
      this.currentCategory = "";
      this.totalReadCount = 0;
      const totalCategories = this.availableCategories.length;
      let loadedCategories = 0;

      const fetchPromises = this.availableCategories.map((category) =>
        fetch(
          `${import.meta.env.VITE_BASE_PATH}/${encodeURIComponent(category.file)}?${Date.now()}`,
        )
          .then((response) => response.json())
          .then((data) => {
            if (category.name === "OnThisDay") {
              this.onThisDayEvents = data.events;
            } else {
              this.allStories[category.name] = {
                clusters: data.clusters,
                readCount: data.read,
              };
              this.totalReadCount += data.read;
            }
            loadedCategories++;
            this.loadingProgress = Math.round(
              (loadedCategories / totalCategories) * 100,
            );
          }),
      );

      return Promise.all(fetchPromises)
        .then(() => {
          this.initialLoading = false;
        })
        .catch((error) => {
          console.error("Error fetching stories:", error);
          this.initialLoading = false;
        });
    },
    initCategorySortable() {
      const enabledContainer = document.querySelector(
        '[x-ref="enabledCategories"]',
      );
      new Sortable(enabledContainer, {
        animation: 150,
        ghostClass: "bg-blue-600",
        swapThreshold: 0.5,
        onStart: () => {
          enabledContainer.classList.add("is-dragging");
        },
        onEnd: (evt) => {
          enabledContainer.classList.remove("is-dragging");

          const newEnabledOrder = Array.from(evt.to.children)
            .map((el) => el.dataset.category)
            .filter(Boolean);

          this.updateCategoryOrders(newEnabledOrder);
        },
      });
    },
    renderCategories() {
      const enabledContainer = document.querySelector(
        '[x-ref="enabledCategories"]',
      );
      const disabledContainer = document.querySelector(
        '[x-ref="disabledCategories"]',
      );

      // Clear existing content more aggressively
      if (enabledContainer) enabledContainer.innerHTML = "";
      if (disabledContainer) disabledContainer.innerHTML = "";

      const categoriesStore = Alpine.store("categories");
      const self = this;

      // Clear existing content
      enabledContainer.innerHTML = "";
      disabledContainer.innerHTML = "";

      function createCategoryElement(categoryName, isEnabled) {
        const div = document.createElement("div");
        div.className = `px-6 py-3 rounded-lg text-sm cursor-pointer font-medium inline-flex items-center whitespace-nowrap ${
          isEnabled
            ? "bg-blue-500 text-white shadow-sm [.is-dragging_&]:bg-blue-500 [&.sortable-chosen]:!bg-blue-600 hover:bg-blue-600"
            : "bg-gray-100 dark:bg-gray-200 text-gray-700 dark:text-gray-800 hover:bg-gray-200 dark:hover:bg-gray-300"
        }`;
        div.dataset.category = categoryName;

        // Create inner span for text
        const span = document.createElement("span");
        span.textContent =
          categoryName === "OnThisDay" ? "Today in History" : categoryName;
        div.appendChild(span);

        // Use pointer workaround instead of click to avoid mobile browser issues
        let startTime = 0;
        div.addEventListener("pointerdown", () => {
          startTime = Date.now();
        });

        div.addEventListener("pointerup", () => {
          // Only trigger click if the pointer was down for less than 200ms (distinguishes from drag)
          if (Date.now() - startTime < 200) {
            self.handleCategoryClick(categoryName);
          }
        });

        return div;
      }

      // Render enabled categories
      categoriesStore.enabled.forEach((categoryName) => {
        enabledContainer.appendChild(createCategoryElement(categoryName, true));
      });

      // Render disabled categories
      this.availableCategories
        .map((cat) => cat.name)
        .filter((cat) => !categoriesStore.enabled.includes(cat))
        .forEach((categoryName) => {
          disabledContainer.appendChild(
            createCategoryElement(categoryName, false),
          );
        });
    },
    updateCategoryOrders(newEnabledOrder) {
      const categoriesStore = Alpine.store("categories");
      const currentOrder = categoriesStore.order;

      // Update enabled categories
      categoriesStore.enabled = [...newEnabledOrder];

      // Create new full order maintaining positions
      const newFullOrder = [
        ...newEnabledOrder,
        ...currentOrder.filter((cat) => !newEnabledOrder.includes(cat)),
      ];
      categoriesStore.order = newFullOrder;

      // Update localStorage
      categoriesStore.saveNewOrder(newFullOrder);

      // Update available categories
      this.availableCategories = newFullOrder
        .map((catName) =>
          this.availableCategories.find((cat) => cat.name === catName),
        )
        .filter(Boolean);
    },
    handleCategoryClick(category) {
      const categoriesStore = Alpine.store("categories");
      if (!categoriesStore.enabled.includes(category)) {
        categoriesStore.enableCategory(category);
      } else if (
        categoriesStore.enabled.length > 1 &&
        categoriesStore.enabled.includes(category)
      ) {
        categoriesStore.enabled = categoriesStore.enabled.filter(
          (cat) => cat !== category,
        );
        if (category === this.currentCategory) {
          // If user disables current category, set to first enabled category
          this.currentCategory = categoriesStore.enabled[0];
          this.changeCategory();
        }
      }

      localStorage.setItem(
        "enabledCategories",
        JSON.stringify(categoriesStore.enabled),
      );

      this.updateCategoryDropdown();
      this.renderCategories();
    },
    updateCategoryDropdown() {
      const select = document.getElementById("category-select");
      if (!select) {
        return;
      }

      const enabledCategories = Alpine.store("categories").enabled;

      while (select.firstChild) {
        select.removeChild(select.firstChild);
      }

      // Use the stored order for enabled categories
      enabledCategories.forEach((catName) => {
        if (catName) {
          const option = document.createElement("option");
          option.value = catName;
          option.textContent =
            catName === "OnThisDay" ? "Today in History" : catName;
          select.appendChild(option);
        }
      });
    },
    closeIntro() {
      this.showIntro = false;
      Alpine.store("intro").set(true);
    },
    toggleStory(story, index) {
      if (this.expandedStory === story) {
        console.log("Collapsing story", story);
        // Collapse the story
        story.expanded = false;
        this.expandedStory = null;
        updateUrlWithArticleId("");
        story.showSources = false;
        // Do not call scrollToStory when collapsing
      } else {
        console.log("Expanding story", story);
        if (this.expandedStory && this.expandedStory !== story) {
          this.expandedStory.expanded = false;
          this.expandedStory.showSources = false;
        }
        // Expand the story
        if (!this.readStories[story.title]) {
          this.readStories[story.title] = true;
          localStorage.setItem("readStories", JSON.stringify(this.readStories));
          this.totalStoriesRead++;
          localStorage.setItem("totalStoriesRead", this.totalStoriesRead);
        }
        story.expanded = true;
        this.expandedStory = story;
        const articleId = generateArticleId(
          this.currentCategory,
          story.cluster_number,
        );
        updateUrlWithArticleId(articleId);
        story.showSources = false;
        // Call scrollToStory after expanding
        this.$nextTick(() => {
          this.scrollToStory(index);
        });
      }
    },
    closeStory(story, index) {
      // Collapse the story
      story.expanded = false;
      this.expandedStory = null;
      updateUrlWithArticleId("");
      story.showSources = false;
      // Scroll to the collapsed story
      this.$nextTick(() => {
        this.scrollToStory(index);
      });
    },
    scrollToStory(index) {
      setTimeout(() => {
        const storyElement = document.getElementById("story-" + index);
        if (storyElement) {
          const stickyElement = document.querySelector(".sticky");
          const navHeight = stickyElement ? stickyElement.offsetHeight : 0;
          const yOffset = -navHeight;
          // TODO: pageYOffset is deprecated
          const y =
            storyElement.getBoundingClientRect().top +
            window.pageYOffset +
            yOffset;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }, 100);
    },
    openSharedArticle(articleId) {
      const [category, clusterNumber] = articleId.split("-");
      // Handle multi-word categories by capitalizing each word
      const targetCategory = category
        .split("+")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join(" ");

      // Wait for stories to be loaded
      const checkAndOpenStory = () => {
        if (this.allStories[targetCategory]) {
          // Set current category first
          this.currentCategory = targetCategory;

          // Make sure the category is enabled
          if (!Alpine.store("categories").enabled.includes(targetCategory)) {
            Alpine.store("categories").enableCategory(targetCategory);
          }

          // Update category dropdown and UI
          this.updateCategoryDropdown();
          this.changeCategory();

          // Find and open the story
          const story = this.allStories[targetCategory].clusters.find(
            (s) => s.cluster_number === parseInt(clusterNumber),
          );

          if (story) {
            // Ensure the story is in the visible stories array
            this.stories = this.allStories[targetCategory].clusters.slice(
              0,
              this.$store.storyCount.current,
            );

            // Expand the story
            story.expanded = true;
            this.expandedStory = story;

            // Scroll to the story after a short delay to ensure DOM is updated
            this.$nextTick(() => {
              const storyIndex = this.stories.findIndex(
                (s) => s.cluster_number === story.cluster_number,
              );
              if (storyIndex !== -1) {
                setTimeout(() => {
                  this.scrollToStory(storyIndex);
                }, 200);
              }
            });
          } else {
            console.warn(
              `Story with cluster number ${clusterNumber} not found in ${targetCategory}`,
            );
          }
        } else {
          // If stories aren't loaded yet, try again in 100ms
          setTimeout(checkAndOpenStory, 100);
        }
      };

      // Start checking for stories
      checkAndOpenStory();
    },
    shareArticle(story) {
      const articleId = generateArticleId(
        this.currentCategory,
        story.cluster_number,
      );
      const url = new URL(window.location);
      url.searchParams.set("article", articleId);

      if (navigator.share) {
        navigator
          .share({
            title: story.title,
            text: "Check out this story:",
            url: url.toString(),
          })
          .catch(() => {
            navigator.clipboard.writeText(url.toString());
          });
      } else {
        navigator.clipboard.writeText(url.toString());
      }
    },
    changeCategory() {
      // Close any expanded story
      if (this.expandedStory) {
        this.expandedStory.expanded = false;
        this.expandedStory = null;
        updateUrlWithArticleId("");
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
      if (this.availableCategories.length > 0) {
        let enabledCategories = Alpine.store("categories").enabled;
        if (
          enabledCategories.length === 0 ||
          !enabledCategories.includes(this.currentCategory)
        ) {
          this.availableCategories.forEach((cat) =>
            Alpine.store("categories").enableCategory(cat.name),
          );
          enabledCategories = Alpine.store("categories").enabled;
        }

        // Ensure current category is valid and load its stories
        if (!enabledCategories.includes(this.currentCategory)) {
          this.currentCategory = enabledCategories[0];
        }

        if (this.currentCategory === "OnThisDay") {
          this.stories = this.onThisDayEvents;
        } else if (this.allStories[this.currentCategory]) {
          const allClusters = this.allStories[this.currentCategory].clusters;
          const unreadClusters = allClusters.filter(
            (story) => !this.readStories[story.title],
          );
          const readClusters = allClusters.filter(
            (story) => this.readStories[story.title],
          );

          // Take unread stories up to the limit
          const unreadToShow = unreadClusters.slice(
            0,
            this.$store.storyCount.current,
          );

          // Combine unread and read stories
          this.stories = [...unreadToShow, ...readClusters];
          this.readCount = this.allStories[this.currentCategory].readCount;
        }
      }
    },
  }));
});

// Example story: Proxy(Object) {year: '1849', content: '<b><a href="https://en.wikipedia.org/wiki/Joseph_F…Favre">Joseph Favre</a></b> was born on this day.', sort_year: 1849.1}
function fetchWikiImage(story) {
  // Extract the Wikipedia URL from the link - try href first, then data-wiki-id
  const linkMatch = story.content.match(/<a href="([^"]+)"[^>]*>.*?<\/a>/);
  const dataWikiIdMatch = story.content.match(
    /<a [^>]*data-wiki-id="([^"]+)"[^>]*>.*?<\/a>/,
  );

  let wikipediaUrl;
  let wikiId;

  if (linkMatch) {
    wikipediaUrl = linkMatch[1];
  } else if (dataWikiIdMatch) {
    // Get the wiki ID
    wikiId = dataWikiIdMatch[1];

    // Extract language code if present in the content
    const langMatch = story.content.match(
      /https?:\/\/([a-z]{2})\.wikipedia\.org/,
    );
    const langCode = langMatch ? langMatch[1] : "en";

    // Check if this is a Wikidata ID (starts with Q) or an article title
    const isWikidataId =
      wikiId.startsWith("Q") && /^\d+$/.test(wikiId.substring(1));

    if (isWikidataId) {
      // For Wikidata IDs, we need to use the Wikidata API
      fetchImageFromWikidata(wikiId, story);
      return;
    } else {
      // For article titles, construct the URL
      wikipediaUrl = `https://${langCode}.wikipedia.org/wiki/${wikiId}`;
    }
  } else {
    console.log("No Wikipedia link found for", story.content);
    return;
  }

  // Extract the language code and title from the URL
  const langMatch = wikipediaUrl.match(
    /https?:\/\/([a-z]{2})\.wikipedia\.org\/wiki\/(.*)/,
  );
  const langCode = langMatch ? langMatch[1] : "en";
  const title = langMatch
    ? decodeURIComponent(langMatch[2])
    : decodeURIComponent(wikipediaUrl.split("/wiki/")[1]);
  console.log("Fetching image for", title, "in language", langCode);

  // Fetch Wikipedia summary for the image
  const apiUrl = `https://${langCode}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;

  fetch(apiUrl)
    .then((response) => response.json())
    .then((data) => {
      if (data && data.thumbnail) {
        story.image = data.thumbnail.source;
        console.log("Image found for", title, data.thumbnail.source);
      } else {
        console.log("No image found for", title, "Data:", data);
      }
    })
    .catch((error) => {
      console.error("Error fetching Wikipedia image:", error);
    });
}

// Function to fetch image from Wikidata
function fetchImageFromWikidata(wikidataId, story) {
  // Get user's language preference
  const userLang = Alpine.store("language").current;
  // Use language code for Wikipedia API, default to 'en' if 'default' is selected
  const langCode = userLang === "default" ? "en" : userLang;

  console.log(
    "Fetching image for Wikidata ID",
    wikidataId,
    "in language",
    langCode,
  );

  // First, get the article title in the user's language
  fetch(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikidataId}&props=sitelinks&format=json&origin=*`,
  )
    .then((response) => response.json())
    .then((data) => {
      // Check if there's a version in the user's language
      const userLangSite = `${langCode}wiki`;
      if (
        data.entities &&
        data.entities[wikidataId] &&
        data.entities[wikidataId].sitelinks &&
        data.entities[wikidataId].sitelinks[userLangSite]
      ) {
        // Get the title in the user's language
        const userLangTitle =
          data.entities[wikidataId].sitelinks[userLangSite].title;

        // Fetch the article in the user's language to get the image
        return fetch(
          `https://${langCode}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(userLangTitle)}`,
        );
      } else {
        // If no version in the user's language, try English
        if (
          data.entities &&
          data.entities[wikidataId] &&
          data.entities[wikidataId].sitelinks &&
          data.entities[wikidataId].sitelinks.enwiki
        ) {
          const enTitle = data.entities[wikidataId].sitelinks.enwiki.title;
          return fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(enTitle)}`,
          );
        }

        throw new Error("Article not found in any language");
      }
    })
    .then((response) => response.json())
    .then((data) => {
      if (data && data.thumbnail) {
        story.image = data.thumbnail.source;
        console.log("Image found for", wikidataId, data.thumbnail.source);
      } else {
        console.log("No image found for", wikidataId, "Data:", data);
      }
    })
    .catch((error) => {
      console.error("Error fetching image from Wikidata:", error);
    });
}

function peopleCarousel(allStories) {
  return {
    peopleStories: [], // all filtered stories (for mobile)
    chunkedStories: [], // grouped into slides of 3 (for desktop)
    currentSlide: 0, // which slide is active?
    lastScrollTime: 0, // last time the user scrolled

    init() {
      // 1) Filter only stories with "was born" or "died"
      const filtered = allStories.filter((e) => e.type === "people");

      // Fetch Wikipedia image for each story
      filtered.forEach((story) => {
        fetchWikiImage(story);
      });

      this.peopleStories = filtered;

      // 2) Chunk them in groups of 3 for the desktop carousel
      for (let i = 0; i < filtered.length; i += 3) {
        this.chunkedStories.push(filtered.slice(i, i + 3));
      }
    },

    // Move to the next slide
    nextSlide() {
      if (this.currentSlide < this.chunkedStories.length - 1) {
        this.currentSlide++;
      }
    },

    // Move to the previous slide
    prevSlide() {
      if (this.currentSlide > 0) {
        this.currentSlide--;
      }
    },

    // Jump to a particular slide
    goToSlide(index) {
      this.currentSlide = index;
    },

    // Handle scroll on desktop
    onWheel(e) {
      // Prevent default so the page doesn't scroll vertically
      e.preventDefault();
      if (Date.now() - this.lastScrollTime < 150) {
        return;
      }

      // If user scrolls "down" (deltaY > 0), go next. If "up" (deltaY < 0), go prev.
      if (e.deltaY > 0 || e.deltaX > 0) {
        this.nextSlide();
        this.lastScrollTime = Date.now();
      } else if (e.deltaY < 0 || e.deltaX < 0) {
        this.prevSlide();
        this.lastScrollTime = Date.now();
      }
    },
  };
}
// Make peopleCarousel available globally
window.peopleCarousel = peopleCarousel;

document.addEventListener("pointerover", (event) => {
  // Match any Wikipedia link (in any language)
  const link = event.target.closest('a[href*="wikipedia.org/wiki/"]');
  if (link && window.innerWidth > 768) {
    // Only show hover popup on desktop
    event.preventDefault();

    // Extract the language code and title from the URL
    const langMatch = link
      .getAttribute("href")
      .match(/https?:\/\/([a-z]{2})\.wikipedia\.org\/wiki\/(.*)/);
    const langCode = langMatch ? langMatch[1] : "en";
    const title = langMatch
      ? decodeURIComponent(langMatch[2])
      : decodeURIComponent(link.getAttribute("href").split("/wiki/")[1]);

    const apiUrl = `https://${langCode}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;

    fetch(apiUrl)
      .then((response) => response.json())
      .then((data) => {
        showPopup(data, link);
      })
      .catch((error) => {
        console.error("Error fetching Wikipedia summary:", error);
      });
  }
});

document.addEventListener("pointerout", (event) => {
  if (
    !event.target.closest('a[href*="wikipedia.org/wiki/"]') &&
    !event.target.closest("#wikipedia-popup") &&
    window.innerWidth > 768
  ) {
    document.getElementById("wikipedia-popup").style.display = "none";
  }
});

// Handle Wikipedia links for mobile
document.addEventListener("click", (event) => {
  // Match any Wikipedia link (in any language)
  const link = event.target.closest('a[href*="wikipedia.org/wiki/"]');
  if (link && window.innerWidth <= 768) {
    event.preventDefault();

    // Extract the language code and title from the URL
    const langMatch = link
      .getAttribute("href")
      .match(/https?:\/\/([a-z]{2})\.wikipedia\.org\/wiki\/(.*)/);
    const langCode = langMatch ? langMatch[1] : "en";
    const title = langMatch
      ? decodeURIComponent(langMatch[2])
      : decodeURIComponent(link.getAttribute("href").split("/wiki/")[1]);

    const apiUrl = `https://${langCode}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;

    fetch(apiUrl)
      .then((response) => response.json())
      .then((data) => {
        const popup = document.createElement("div");
        popup.className =
          "fixed inset-0 z-[100] bg-white dark:bg-gray-800 overflow-y-auto";
        popup.innerHTML = `
                    <div class="p-4 relative z-[101]">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">${data.title}</h3>
                            <button class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" onclick="this.parentElement.parentElement.parentElement.remove()">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        ${
                          data.thumbnail
                            ? `
                            <div class="relative h-48 w-full mb-4">
                                <img src="${data.thumbnail.source}" alt="${data.title}" class="w-full h-full object-cover rounded-lg"/>
                            </div>
                        `
                            : ""
                        }
                        <div class="prose prose-sm dark:prose-invert max-w-none">
                            <p>${data.extract}</p>
                        </div>
                        <div class="mt-4">
                            <a href="${link.href}" target="_blank" class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline">
                                <span>Read more on Wikipedia</span>
                                <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                </svg>
                            </a>
                        </div>
                    </div>
                `;
        document.body.appendChild(popup);
      });
  }
});

Alpine.start();
