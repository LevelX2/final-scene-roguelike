import { spawnSync } from "node:child_process";

const files = [
  "./server.mjs",
  "./src/main.mjs",
  "./src/app/bootstrap.mjs",
  "./src/app/core-assembly.mjs",
  "./src/app/gameplay-assembly.mjs",
  "./src/app/interface-assembly.mjs",
  "./src/app/render-cycle.mjs",
  "./src/app/runtime-actions.mjs",
  "./src/app/runtime-context.mjs",
  "./src/app/runtime-random.mjs",
  "./src/app/runtime-support.mjs",
  "./src/ambience/narration/showcase-ambience.mjs",
  "./src/app/start-flow.mjs",
  "./src/app/ui-preferences.mjs",
  "./src/application/audio-service.mjs",
  "./src/application/browser-storage.mjs",
  "./src/application/door-service.mjs",
  "./src/application/floor-transition-service.mjs",
  "./src/application/food-loot-pipeline.mjs",
  "./src/application/input-controller.mjs",
  "./src/application/inventory-stats.mjs",
  "./src/application/item-chest-service.mjs",
  "./src/application/item-choice-configs.mjs",
  "./src/application/item-equipment.mjs",
  "./src/application/item-floor-state.mjs",
  "./src/application/item-loot.mjs",
  "./src/application/item-ui-helpers.mjs",
  "./src/application/modal-controller.mjs",
  "./src/application/player-turn-controller.mjs",
  "./src/application/savegame-service.mjs",
  "./src/application/shield-generation-service.mjs",
  "./src/application/state-blueprint.mjs",
  "./src/application/state-persistence.mjs",
  "./src/application/targeting-service.mjs",
  "./src/application/test-api-mutators.mjs",
  "./src/application/test-api-snapshots.mjs",
  "./src/application/ui-bindings.mjs",
  "./src/application/visibility-service.mjs",
  "./src/content/core-data.mjs",
  "./src/content/food-balance.mjs",
  "./src/content/item-modifiers.mjs",
  "./src/content/catalogs/monsters.mjs",
  "./src/content/catalogs/weapons.mjs",
  "./src/content/catalogs/shields.mjs",
  "./src/content/catalogs/props.mjs",
  "./src/content/catalogs/display-case-ambience.mjs",
  "./src/data.mjs",
  "./src/dom.mjs",
  "./src/dungeon.mjs",
  "./src/dungeon/enemy-factory.mjs",
  "./src/dungeon/equipment-rolls.mjs",
  "./src/dungeon/pickup-factory.mjs",
  "./src/dungeon/showcase-placement.mjs",
  "./src/dungeon/spatial-helpers.mjs",
  "./src/equipment-helpers.mjs",
  "./src/state.mjs",
  "./src/render.mjs",
  "./src/text/combat-log.mjs",
  "./src/ui/board-view.mjs",
  "./src/ui/hud-view.mjs",
  "./src/ui/inventory-view.mjs",
  "./src/ui/item-asset-helpers.mjs",
  "./src/ui/log-view.mjs",
  "./src/ui/render-assets.mjs",
  "./src/ui/studio-topology-view.mjs",
  "./src/ui/tooltip-view.mjs",
  "./src/ui/dom/core-elements.mjs",
  "./src/ui/dom/panel-elements.mjs",
  "./src/ui/dom/modal-elements.mjs",
  "./src/ui/dom/control-elements.mjs",
  "./src/combat.mjs",
  "./src/combat/combat-progression.mjs",
  "./src/combat/combat-resolution.mjs",
  "./src/combat/player-attack.mjs",
  "./src/ai.mjs",
  "./src/ai/awareness.mjs",
  "./src/ai/enemy-turns.mjs",
  "./src/itemization.mjs",
  "./src/items.mjs",
  "./src/loot.mjs",
  "./src/test-api.mjs",
  "./src/utils.mjs",
];

console.log(`Syntax check: ${files.length} files`);

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    stdio: "pipe",
    encoding: "utf8",
  });

  if (result.status !== 0) {
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    console.error(`Syntax check failed: ${file}`);
    process.exit(result.status ?? 1);
  }
}

console.log("Syntax check passed.");
