const { test } = require("playwright/test");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("dungeon-rogue-enable-test-api", "1");
    if (!window.localStorage.getItem("dungeon-rogue-options")) {
      window.localStorage.setItem("dungeon-rogue-options", JSON.stringify({
        stepSound: true,
        deathSound: true,
        voiceAnnouncements: false,
        showcaseAnnouncementMode: "floating-text",
        uiScale: 1,
        studioZoom: 1,
        tooltipScale: 1,
        enemyPanelMode: "detailed",
      }));
    }
    window.__speechCalls = [];

    class TestSpeechSynthesisUtterance {
      constructor(text = "") {
        this.text = text;
        this.lang = "";
        this.pitch = 1;
        this.rate = 1;
        this.volume = 1;
        this.voice = null;
      }
    }

    const voices = [
      { name: "Test Deutsch", lang: "de-DE", default: true, voiceURI: "test-de" },
      { name: "Test English", lang: "en-US", default: false, voiceURI: "test-en" },
    ];

    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      writable: true,
      value: TestSpeechSynthesisUtterance,
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        speaking: false,
        pending: false,
        paused: false,
        cancel() {},
        speak(utterance) {
          window.__speechCalls.push({
            text: utterance?.text ?? "",
            lang: utterance?.lang ?? "",
            pitch: utterance?.pitch ?? 1,
            rate: utterance?.rate ?? 1,
            volume: utterance?.volume ?? 1,
            voiceName: utterance?.voice?.name ?? null,
          });
        },
        getVoices() {
          return voices;
        },
        addEventListener() {},
        removeEventListener() {},
      },
    });

    const nativeFetch = window.fetch?.bind(window);
    if (nativeFetch) {
      Object.defineProperty(window, "fetch", {
        configurable: true,
        writable: true,
        value: async (...args) => {
          const [input] = args;
          const url = typeof input === "string"
            ? input
            : input?.url ?? "";
          if (url.includes("/api/tts")) {
            return new Response("", { status: 404 });
          }
          return nativeFetch(...args);
        },
      });
    }
  });
});
