export function injectTestModeBootstrap(html) {
  const bootstrapScript = `<script>
(() => {
  try {
    window.localStorage.setItem("dungeon-rogue-enable-test-api", "1");
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
