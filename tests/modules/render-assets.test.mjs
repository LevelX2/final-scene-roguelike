import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MONSTER_ASSET_OVERRIDES } from '../../src/content/catalogs/enemy-asset-manifest.mjs';
import { createRenderAssetHelpers } from '../../src/ui/render-assets.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function expectLocalAsset(relativeAssetPath) {
  const normalizedPath = relativeAssetPath.startsWith('./')
    ? relativeAssetPath.slice(2)
    : relativeAssetPath;
  assert.ok(
    fs.existsSync(path.join(PROJECT_ROOT, normalizedPath)),
    `${relativeAssetPath} should exist on disk`,
  );
}

test('render asset helpers map slasher enemies to curated enemy art', () => {
  const { getMonsterIconAssetUrl } = createRenderAssetHelpers({
    getHeroClassAssets: () => ({ iconUrl: null, spriteUrl: null }),
  });

  assert.equal(
    getMonsterIconAssetUrl({ id: 'slasher-maskierter-killer' }),
    './assets/enemies/slasher-masked-killer.svg',
  );
  expectLocalAsset('./assets/enemies/slasher-masked-killer.svg');
  assert.equal(
    getMonsterIconAssetUrl({ id: 'slasher-kellerkreatur' }),
    './assets/enemies/slasher-basement-creature.svg',
  );
  expectLocalAsset('./assets/enemies/slasher-basement-creature.svg');
  assert.equal(
    getMonsterIconAssetUrl({ id: 'slasher-hausmeister-von-korridor-9' }),
    './assets/enemies/slasher-corridor-9-caretaker-boss.svg',
  );
  expectLocalAsset('./assets/enemies/slasher-corridor-9-caretaker-boss.svg');
});

test('render asset helpers map noir enemies to curated enemy art', () => {
  const { getMonsterIconAssetUrl } = createRenderAssetHelpers({
    getHeroClassAssets: () => ({ iconUrl: null, spriteUrl: null }),
  });

  assert.equal(
    getMonsterIconAssetUrl({ id: 'noir-geldeintreiber' }),
    './assets/enemies/noir-debt-collector.svg',
  );
  expectLocalAsset('./assets/enemies/noir-debt-collector.svg');
  assert.equal(
    getMonsterIconAssetUrl({ id: 'noir-auftragsmoerder' }),
    './assets/enemies/noir-contract-killer.svg',
  );
  expectLocalAsset('./assets/enemies/noir-contract-killer.svg');
  assert.equal(
    getMonsterIconAssetUrl({ id: 'noir-syndikatsrichter' }),
    './assets/enemies/noir-syndicate-judge-boss.svg',
  );
  expectLocalAsset('./assets/enemies/noir-syndicate-judge-boss.svg');
});

test('render asset helpers map fantasy enemies to curated enemy art', () => {
  const { getMonsterIconAssetUrl } = createRenderAssetHelpers({
    getHeroClassAssets: () => ({ iconUrl: null, spriteUrl: null }),
  });

  assert.equal(
    getMonsterIconAssetUrl({ id: 'fantasy-goblin-pluenderer' }),
    './assets/enemies/fantasy-goblin-plunderer.svg',
  );
  expectLocalAsset('./assets/enemies/fantasy-goblin-plunderer.svg');
  assert.equal(
    getMonsterIconAssetUrl({ id: 'fantasy-dunkelritter' }),
    './assets/enemies/fantasy-dark-knight.svg',
  );
  expectLocalAsset('./assets/enemies/fantasy-dark-knight.svg');
  assert.equal(
    getMonsterIconAssetUrl({ id: 'fantasy-schwarze-ritter' }),
    './assets/enemies/fantasy-black-knight-boss.svg',
  );
  expectLocalAsset('./assets/enemies/fantasy-black-knight-boss.svg');
});

test('render asset helpers map adventure enemies to curated enemy art', () => {
  const { getMonsterIconAssetUrl } = createRenderAssetHelpers({
    getHeroClassAssets: () => ({ iconUrl: null, spriteUrl: null }),
  });

  assert.equal(
    getMonsterIconAssetUrl({ id: 'adventure-grabraeuber' }),
    './assets/enemies/adventure-grave-raider.svg',
  );
  expectLocalAsset('./assets/enemies/adventure-grave-raider.svg');
  assert.equal(
    getMonsterIconAssetUrl({ id: 'adventure-verfluchter-hueter' }),
    './assets/enemies/adventure-cursed-warden.svg',
  );
  expectLocalAsset('./assets/enemies/adventure-cursed-warden.svg');
  assert.equal(
    getMonsterIconAssetUrl({ id: 'adventure-fluchwaechter' }),
    './assets/enemies/adventure-curse-warden-boss.svg',
  );
  expectLocalAsset('./assets/enemies/adventure-curse-warden-boss.svg');
});

test('render asset helpers map romcom enemies to curated enemy art', () => {
  const { getMonsterIconAssetUrl } = createRenderAssetHelpers({
    getHeroClassAssets: () => ({ iconUrl: null, spriteUrl: null }),
  });

  assert.equal(
    getMonsterIconAssetUrl({ id: 'romcom-paparazzo' }),
    './assets/enemies/romcom-paparazzo.svg',
  );
  expectLocalAsset('./assets/enemies/romcom-paparazzo.svg');
  assert.equal(
    getMonsterIconAssetUrl({ id: 'romcom-uebereifriger-tuersteher' }),
    './assets/enemies/romcom-overzealous-bouncer.svg',
  );
  expectLocalAsset('./assets/enemies/romcom-overzealous-bouncer.svg');
  assert.equal(
    getMonsterIconAssetUrl({ id: 'romcom-unaufhaltsame-brautmutter' }),
    './assets/enemies/romcom-unstoppable-mother-in-law-boss.svg',
  );
  expectLocalAsset('./assets/enemies/romcom-unstoppable-mother-in-law-boss.svg');
});

test('render asset helpers map social-drama enemies to curated enemy art', () => {
  const { getMonsterIconAssetUrl } = createRenderAssetHelpers({
    getHeroClassAssets: () => ({ iconUrl: null, spriteUrl: null }),
  });

  assert.equal(
    getMonsterIconAssetUrl({ id: 'social-drama-schuldeneintreiber' }),
    './assets/enemies/social-drama-debt-collector.svg',
  );
  expectLocalAsset('./assets/enemies/social-drama-debt-collector.svg');
  assert.equal(
    getMonsterIconAssetUrl({ id: 'social-drama-zermuerbter-veteran' }),
    './assets/enemies/social-drama-worn-veteran.svg',
  );
  expectLocalAsset('./assets/enemies/social-drama-worn-veteran.svg');
  assert.equal(
    getMonsterIconAssetUrl({ id: 'social-drama-patriarch' }),
    './assets/enemies/social-drama-patriarch-boss.svg',
  );
  expectLocalAsset('./assets/enemies/social-drama-patriarch-boss.svg');
});

test('render asset helpers map action enemies to curated enemy art', () => {
  const { getMonsterIconAssetUrl } = createRenderAssetHelpers({
    getHeroClassAssets: () => ({ iconUrl: null, spriteUrl: null }),
  });

  assert.equal(
    getMonsterIconAssetUrl({ id: 'action-soeldner' }),
    './assets/enemies/action-mercenary.svg',
  );
  expectLocalAsset('./assets/enemies/action-mercenary.svg');
  assert.equal(
    getMonsterIconAssetUrl({ id: 'action-auftragskiller' }),
    './assets/enemies/action-hitman.svg',
  );
  expectLocalAsset('./assets/enemies/action-hitman.svg');
  assert.equal(
    getMonsterIconAssetUrl({ id: 'action-vollstrecker' }),
    './assets/enemies/action-enforcer-boss.svg',
  );
  expectLocalAsset('./assets/enemies/action-enforcer-boss.svg');
});

test('render asset helpers map creature-feature enemies to curated enemy art', () => {
  const { getMonsterIconAssetUrl } = createRenderAssetHelpers({
    getHeroClassAssets: () => ({ iconUrl: null, spriteUrl: null }),
  });

  assert.equal(
    getMonsterIconAssetUrl({ id: 'creature-feature-bio-experiment' }),
    './assets/enemies/creature-feature-bio-experiment.svg',
  );
  expectLocalAsset('./assets/enemies/creature-feature-bio-experiment.svg');
  assert.equal(
    getMonsterIconAssetUrl({ id: 'creature-feature-schachtjaeger' }),
    './assets/enemies/creature-feature-shaft-hunter.svg',
  );
  expectLocalAsset('./assets/enemies/creature-feature-shaft-hunter.svg');
  assert.equal(
    getMonsterIconAssetUrl({ id: 'creature-feature-brutmutter' }),
    './assets/enemies/creature-feature-broodmother-boss.svg',
  );
  expectLocalAsset('./assets/enemies/creature-feature-broodmother-boss.svg');
});

test('render asset helpers map western enemies to curated enemy art', () => {
  const { getMonsterIconAssetUrl } = createRenderAssetHelpers({
    getHeroClassAssets: () => ({ iconUrl: null, spriteUrl: null }),
  });

  assert.equal(
    getMonsterIconAssetUrl({ id: 'western-revolverheld' }),
    './assets/enemies/western-gunslinger.svg',
  );
  expectLocalAsset('./assets/enemies/western-gunslinger.svg');
  assert.equal(
    getMonsterIconAssetUrl({ id: 'western-kopfgeldjaeger' }),
    './assets/enemies/western-bounty-hunter.svg',
  );
  expectLocalAsset('./assets/enemies/western-bounty-hunter.svg');
  assert.equal(
    getMonsterIconAssetUrl({ id: 'western-richter-von-dust-creek' }),
    './assets/enemies/western-judge-of-dust-creek-boss.svg',
  );
  expectLocalAsset('./assets/enemies/western-judge-of-dust-creek-boss.svg');
});

test('render asset helpers map space-opera enemies to curated enemy art', () => {
  const { getMonsterIconAssetUrl } = createRenderAssetHelpers({
    getHeroClassAssets: () => ({ iconUrl: null, spriteUrl: null }),
  });

  assert.equal(
    getMonsterIconAssetUrl({ id: 'space-opera-sicherheitsdrohne' }),
    './assets/enemies/space-opera-security-drone.svg',
  );
  expectLocalAsset('./assets/enemies/space-opera-security-drone.svg');
  assert.equal(
    getMonsterIconAssetUrl({ id: 'space-opera-android-waechter' }),
    './assets/enemies/space-opera-android-warden.svg',
  );
  expectLocalAsset('./assets/enemies/space-opera-android-warden.svg');
  assert.equal(
    getMonsterIconAssetUrl({ id: 'space-opera-nexus-prime' }),
    './assets/enemies/space-opera-nexus-prime-boss.svg',
  );
  expectLocalAsset('./assets/enemies/space-opera-nexus-prime-boss.svg');
});

test('render asset helper overrides always point to files that exist', () => {
  const assetPaths = Object.values(MONSTER_ASSET_OVERRIDES)
    .filter((assetPath) => assetPath.startsWith('./assets/enemies/'))
    .map((assetPath) => assetPath.replace('./assets/enemies/', ''));

  assert.ok(assetPaths.length > 0, 'expected curated enemy asset mappings');
  for (const assetPath of assetPaths) {
    expectLocalAsset(`./assets/enemies/${assetPath}`);
  }
});

test('render asset helpers keep fallback monster icon paths for legacy art', () => {
  const { getMonsterIconAssetUrl } = createRenderAssetHelpers({
    getHeroClassAssets: () => ({ iconUrl: null, spriteUrl: null }),
  });

  assert.equal(
    getMonsterIconAssetUrl({ id: 'bates' }),
    './assets/enemies/legacy-bates.svg',
  );
  expectLocalAsset('./assets/enemies/legacy-bates.svg');
});

test('render asset helpers route legacy monsters into the enemies directory', () => {
  const { getMonsterIconAssetUrl } = createRenderAssetHelpers({
    getHeroClassAssets: () => ({ iconUrl: null, spriteUrl: null }),
  });

  assert.equal(
    getMonsterIconAssetUrl({ id: 'kellerkriecher' }),
    './assets/enemies/legacy-kellerkriecher.svg',
  );
});
