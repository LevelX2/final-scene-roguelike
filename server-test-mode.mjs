export function injectTestModeBootstrap(html) {
  const bootstrapScript = `<script>
(() => {
  try {
    const DISABLE_VOICE_ANNOUNCEMENTS_KEY = "dungeon-rogue-disable-voice-announcements";
    window.localStorage.setItem("dungeon-rogue-enable-test-api", "1");
    window.localStorage.setItem(DISABLE_VOICE_ANNOUNCEMENTS_KEY, "1");
    window.__DUNGEON_ROGUE_DISABLE_VOICE_ANNOUNCEMENTS__ = true;
    let existingOptions = {};
    try {
      existingOptions = JSON.parse(window.localStorage.getItem("dungeon-rogue-options") ?? "{}") ?? {};
    } catch {
      existingOptions = {};
    }
    window.localStorage.setItem("dungeon-rogue-options", JSON.stringify({
      stepSound: true,
      deathSound: true,
      voiceAnnouncements: false,
      showcaseAnnouncementMode: "floating-text",
      uiScale: 1,
      studioZoom: 1,
      tooltipScale: 1,
      enemyPanelMode: "detailed",
      ...existingOptions,
      voiceAnnouncements: false,
    }));
  } catch {}
})();
</script>`;

  return html.includes("</head>")
    ? html.replace("</head>", `${bootstrapScript}\n</head>`)
    : `${bootstrapScript}\n${html}`;
}
