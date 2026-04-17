import test from "node:test";
import assert from "node:assert/strict";

import { injectTestModeBootstrap } from "../../server-test-mode.mjs";

test("injectTestModeBootstrap injects the audio-safe test bootstrap before head close", () => {
  const html = "<html><head><title>Test</title></head><body><main></main></body></html>";

  const result = injectTestModeBootstrap(html);

  assert.match(result, /dungeon-rogue-enable-test-api/);
  assert.match(result, /dungeon-rogue-disable-voice-announcements/);
  assert.match(result, /__DUNGEON_ROGUE_DISABLE_VOICE_ANNOUNCEMENTS__ = true/);
  assert.match(result, /voiceAnnouncements: false/);
  assert.ok(result.indexOf("voiceAnnouncements: false") < result.indexOf("</head>"));
});

test("injectTestModeBootstrap prepends the bootstrap when no head tag exists", () => {
  const html = "<body><main></main></body>";

  const result = injectTestModeBootstrap(html);

  assert.match(result, /^<script>/);
  assert.match(result, /showcaseAnnouncementMode: "floating-text"/);
  assert.ok(result.endsWith(html));
});
