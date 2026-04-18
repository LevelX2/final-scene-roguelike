import { getItemBalanceGroups } from '../../item-balance-groups.mjs';

const FAMILY_PHASE = Object.freeze({
  vision_boost: 1,
  precision_boost: 1,
  reaction_boost: 1,
  nerves_boost: 1,
  trap_focus: 1,
  trap_resist: 1,
  safe_rest_boost: 1,
  blink_teleport: 2,
  stealth_window: 2,
  retreat_floorwarp: 3,
  advance_floorwarp: 3,
});

const EFFECT_FAMILY_SPECS = Object.freeze({
  vision_boost: {
    durationByTier: { 1: 12, 2: 16, 3: 20 },
    magnitudeByTier: { 1: { lightBonus: 1 }, 2: { lightBonus: 2 }, 3: { lightBonus: 3 } },
    summaryByTier: { 1: '+1 Sichtweite', 2: '+2 Sichtweite', 3: '+3 Sichtweite' },
    buffCategory: 'vision',
  },
  precision_boost: {
    durationByTier: { 1: 14, 2: 18, 3: 22 },
    magnitudeByTier: { 1: { precision: 1 }, 2: { precision: 2 }, 3: { precision: 3 } },
    summaryByTier: { 1: '+1 Präzision', 2: '+2 Präzision', 3: '+3 Präzision' },
    buffCategory: 'precision',
  },
  reaction_boost: {
    durationByTier: { 1: 14, 2: 18, 3: 22 },
    magnitudeByTier: { 1: { reaction: 1 }, 2: { reaction: 2 }, 3: { reaction: 3 } },
    summaryByTier: { 1: '+1 Reaktion', 2: '+2 Reaktion', 3: '+3 Reaktion' },
    buffCategory: 'reaction',
  },
  nerves_boost: {
    durationByTier: { 1: 16, 2: 20, 3: 24 },
    magnitudeByTier: { 1: { nerves: 1 }, 2: { nerves: 2 }, 3: { nerves: 3 } },
    summaryByTier: { 1: '+1 Nerven', 2: '+2 Nerven', 3: '+3 Nerven' },
    buffCategory: 'nerves',
  },
  trap_focus: {
    durationByTier: { 1: 18, 2: 22, 3: 26 },
    magnitudeByTier: {
      1: { trapDetectionBonus: 10, trapAvoidBonus: 10 },
      2: { trapDetectionBonus: 15, trapAvoidBonus: 15 },
      3: { trapDetectionBonus: 20, trapAvoidBonus: 20 },
    },
    summaryByTier: {
      1: '+10 Fallenentdeckung, +10 Fallenvermeidung',
      2: '+15 Fallenentdeckung, +15 Fallenvermeidung',
      3: '+20 Fallenentdeckung, +20 Fallenvermeidung',
    },
    buffCategory: 'trap-focus',
  },
  trap_resist: {
    durationByTier: { 1: 20, 2: 24, 3: 28 },
    magnitudeByTier: { 1: { trapDamageReduction: 1 }, 2: { trapDamageReduction: 2 }, 3: { trapDamageReduction: 3 } },
    summaryByTier: {
      1: '+1 Fallenschadensreduktion',
      2: '+2 Fallenschadensreduktion',
      3: '+3 Fallenschadensreduktion',
    },
    buffCategory: 'trap-resist',
  },
  safe_rest_boost: {
    durationByTier: { 1: 12, 2: 14, 3: 16 },
    magnitudeByTier: {
      1: { safeRestProgressBonus: 0.5 },
      2: { safeRestProgressBonus: 1 },
      3: { safeRestProgressBonus: 1 },
    },
    summaryByTier: {
      1: '+0,5 sichere Regeneration pro passender Aktion',
      2: '+1,0 sichere Regeneration pro passender Aktion',
      3: '+1,0 sichere Regeneration pro passender Aktion',
    },
    buffCategory: 'safe-rest',
  },
  stealth_window: {
    durationByTier: { 1: 12, 2: 16, 3: 20 },
    magnitudeByTier: { 1: { enemyAggroRadiusMod: -1 }, 2: { enemyAggroRadiusMod: -2 }, 3: { enemyAggroRadiusMod: -3 } },
    summaryByTier: {
      1: 'Aggro-Radius gegen dich -1',
      2: 'Aggro-Radius gegen dich -2',
      3: 'Aggro-Radius gegen dich -3',
    },
    buffCategory: 'stealth',
  },
  blink_teleport: {
    durationByTier: { 1: 0, 2: 0, 3: 0 },
    magnitudeByTier: {
      1: { quality: 'random' },
      2: { quality: 'enemy_buffered' },
      3: { quality: 'safe' },
    },
    summaryByTier: {
      1: 'Teleportiert dich auf ein zufälliges freies Feld derselben Ebene',
      2: 'Teleportiert dich auf ein freies Feld mit etwas Abstand zu Gegnern',
      3: 'Teleportiert dich bevorzugt auf ein sicheres freies Feld derselben Ebene',
    },
    buffCategory: 'teleport',
  },
  retreat_floorwarp: {
    durationByTier: { 1: 0, 2: 0, 3: 0 },
    magnitudeByTier: {
      1: { floors: -1, quality: 'default' },
      2: { floors: -1, quality: 'safe-entry' },
      3: { floors: -2, quality: 'safe-entry' },
    },
    summaryByTier: {
      1: 'Bringt dich 1 Ebene zurück',
      2: 'Bringt dich 1 Ebene zurück und sucht einen ruhigeren Einstieg',
      3: 'Bringt dich 2 Ebenen zurück',
    },
    buffCategory: 'floorwarp-retreat',
  },
  advance_floorwarp: {
    durationByTier: { 1: 0, 2: 0, 3: 0 },
    magnitudeByTier: {
      1: { floors: 1, quality: 'default' },
      2: { floors: 1, quality: 'safe-entry' },
      3: { floors: 2, quality: 'safe-entry' },
    },
    summaryByTier: {
      1: 'Bringt dich 1 Ebene tiefer',
      2: 'Bringt dich 1 Ebene tiefer und bevorzugt einen ruhigeren Einstieg',
      3: 'Bringt dich 2 Ebenen tiefer',
    },
    buffCategory: 'floorwarp-advance',
  },
});

const EFFECT_FAMILY_LABELS = Object.freeze({
  vision_boost: 'Sichtbonus',
  precision_boost: 'Präzisionsbonus',
  reaction_boost: 'Reaktionsbonus',
  nerves_boost: 'Nervenbonus',
  trap_focus: 'Fallenfokus',
  trap_resist: 'Gefahrenschutz',
  safe_rest_boost: 'Ruhefenster',
  stealth_window: 'Tarnfenster',
  blink_teleport: 'Blinksprung',
  retreat_floorwarp: 'Rückzugssprung',
  advance_floorwarp: 'Vorwärtssprung',
});

const ARCHETYPE_TO_THEME = Object.freeze({
  fantasy: 'fantasy',
  space_opera: 'scifi',
  noir: 'noir',
  western: 'western',
  romcom: 'romance',
  slasher: 'horror',
  creature_feature: 'horror',
  social_drama: 'drama',
  action: 'action',
  adventure: 'adventure',
});

const CONSUMABLE_VARIANTS = Object.freeze([
  {
    id: 'cons_vision_scan_cart',
    effectFamily: 'vision_boost',
    theme: 'scifi',
    displayName: 'Scan-Kartusche',
    visualBaseName: 'Scan-Kartusche',
    svgAsset: './assets/items/consumables/cons_vision_scan_cart.svg',
    logProfile: 'scifi_scan',
    rarityWeights: { floor: 14, chest: 18, special: 8 },
    useLogTexts: [
      'Die Scan-Kartusche fährt hoch. Feinste Konturen glimmen durch das Dunkel.',
      'Ein kaltes Raster legt sich über das Set. Plötzlich erkennst du mehr.',
      'Die Optik kalibriert nach. Die Ferne wirkt auf einmal greifbar.',
      'Die Kartusche summt an. Schatten verlieren einen Teil ihres Vorteils.',
    ],
    expireLogTexts: [
      'Das Raster flackert aus. Die Welt wird wieder stumpfer.',
      'Die Kartusche entlädt sich. Das Dunkel holt sich die Distanz zurück.',
      'Die Kalibrierung fällt ab. Die Bühne zieht sich wieder enger zusammen.',
    ],
  },
  {
    id: 'cons_vision_starseer_phial',
    effectFamily: 'vision_boost',
    theme: 'fantasy',
    displayName: 'Sternenseher-Phiole',
    visualBaseName: 'Sternenseher-Phiole',
    svgAsset: './assets/items/consumables/cons_vision_starseer_phial.svg',
    logProfile: 'fantasy_vision',
    rarityWeights: { floor: 14, chest: 18, special: 8 },
    useLogTexts: [
      'Die Sternenseher-Phiole glimmt auf. Das Dunkel gibt mehr von sich preis.',
      'Silbriges Licht läuft dir durchs Blickfeld. Ferne Kanten werden lesbar.',
      'Für einen Moment sieht das Set aus, als hätte jemand die Sterne näher gerückt.',
      'Ein kühler Schimmer hebt verborgene Linien aus der Kulisse.',
    ],
    expireLogTexts: [
      'Der Sternenglanz versiegt. Die Ferne verwischt wieder.',
      'Die Phiole wird matt. Das Studio wirkt wieder enger.',
      'Der Zauber sinkt ab. Schatten dürfen ihre Distanz zurückhaben.',
    ],
  },
  {
    id: 'cons_precision_deadeye_vial',
    effectFamily: 'precision_boost',
    theme: 'western',
    displayName: 'Deadeye-Fläschchen',
    visualBaseName: 'Deadeye-Fläschchen',
    svgAsset: './assets/items/consumables/cons_precision_deadeye_vial.svg',
    logProfile: 'western_precision',
    rarityWeights: { floor: 12, chest: 16, special: 7 },
    useLogTexts: [
      'Das Deadeye-Fläschchen brennt kurz im Hals. Deine Hand wird verdächtig ruhig.',
      'Staub, Licht, Entfernung: Alles sortiert sich auf einen klaren Punkt.',
      'Der Blick verengt sich aufs Wesentliche. Jeder Schuss fühlt sich ehrlicher an.',
      'Für ein paar Takte ist dein Timing sauberer als der Rest dieses Studios.',
    ],
    expireLogTexts: [
      'Die ruhige Hand lässt nach. Das Zittern kehrt in die Szene zurück.',
      'Der Deadeye-Moment verfliegt. Ziele sehen wieder widerspenstiger aus.',
      'Der Fokus reißt ab. Präzision wird wieder Arbeit.',
    ],
  },
  {
    id: 'cons_reaction_stunt_syringe',
    effectFamily: 'reaction_boost',
    theme: 'action',
    displayName: 'Stunt-Spritze',
    visualBaseName: 'Stunt-Spritze',
    svgAsset: './assets/items/consumables/cons_reaction_stunt_syringe.svg',
    logProfile: 'action_reaction',
    rarityWeights: { floor: 12, chest: 16, special: 7 },
    useLogTexts: [
      'Die Stunt-Spritze jagt dir Adrenalin durch die Szene. Alles wirkt einen Tick früher.',
      'Dein Körper ist schon unterwegs, bevor der Rest der Welt fertig droht.',
      'Die Nadel sitzt. Aus Gefahr wird Timing.',
      'Für einen Moment spielst du nicht mit der Szene mit. Du kommst ihr zuvor.',
    ],
    expireLogTexts: [
      'Das Adrenalin sackt ab. Die Welt holt ihren Vorsprung zurück.',
      'Die Stunt-Spritze verliert ihren Nachhall. Reaktionen werden wieder teuer.',
      'Das Timing wird träger. Du bist wieder nur menschlich schnell.',
    ],
  },
  {
    id: 'cons_nerves_last_applause_pastille',
    effectFamily: 'nerves_boost',
    theme: 'romance',
    displayName: 'Pastille des letzten Applauses',
    visualBaseName: 'Pastille des letzten Applauses',
    svgAsset: './assets/items/consumables/cons_nerves_last_applause_pastille.svg',
    logProfile: 'stage_nerves',
    rarityWeights: { floor: 10, chest: 14, special: 6 },
    useLogTexts: [
      'Die Pastille schmilzt langsam. Deine Nerven stehen plötzlich auf Bühnenformat.',
      'Ein warmer Nachhall legt sich über den Puls. Druck verliert etwas von seinem Gewicht.',
      'Für ein paar Szenen trägst du dich, als würdest du schon den Schlussapplaus hören.',
      'Die Panik tritt einen Schritt zurück. Du bleibst in der Rolle.',
    ],
    expireLogTexts: [
      'Der Bühnenmut dünnt aus. Druck klingt wieder lauter.',
      'Die Pastille ist nur noch Zucker. Der Applaus verstummt.',
      'Die Ruhe trägt nicht mehr. Nervosität kommt zurück ins Bild.',
    ],
  },
  {
    id: 'cons_traps_threat_scanner_chip',
    effectFamily: 'trap_focus',
    theme: 'scifi',
    displayName: 'Gefahrenscanner-Chip',
    visualBaseName: 'Gefahrenscanner-Chip',
    svgAsset: './assets/items/consumables/cons_traps_threat_scanner_chip.svg',
    logProfile: 'scifi_trap',
    rarityWeights: { floor: 10, chest: 18, special: 9 },
    useLogTexts: [
      'Der Gefahrenscanner-Chip klickt ein. Risikokanten leuchten vor dir auf.',
      'Ein nüchternes Warnmuster legt sich über den Boden. Fallen verlieren ihre Höflichkeit.',
      'Der Chip analysiert die Bühne. Verdächtige Stellen sehen plötzlich nach Arbeit aus.',
      'Feinste Störungen springen dir ins Auge. Das Set wirkt weniger harmlos.',
    ],
    expireLogTexts: [
      'Der Scannerchip fällt still. Die Bühne trägt ihre Gefahren wieder diskreter.',
      'Das Warnmuster bricht ab. Du musst dem Set wieder selbst misstrauen.',
      'Der Analysefilm reißt. Fallen verschwinden zurück im Hintergrund.',
    ],
  },
  {
    id: 'cons_escape_smoke_capsule',
    effectFamily: 'stealth_window',
    theme: 'action',
    displayName: 'Flucht-Rauchkapsel',
    visualBaseName: 'Flucht-Rauchkapsel',
    svgAsset: './assets/items/consumables/cons_escape_smoke_capsule.svg',
    logProfile: 'action_stealth',
    rarityWeights: { floor: 8, chest: 14, special: 8 },
    useLogTexts: [
      'Die Flucht-Rauchkapsel zischt auf. Deine Präsenz verliert an Kontur.',
      'Ein grauer Schleier frisst Kanten und Aufmerksamkeit.',
      'Die Szene wird unübersichtlich genug, dass du darin kleiner wirkst.',
      'Rauch und Timing kaufen dir ein paar kostbare Momente.',
    ],
    expireLogTexts: [
      'Der Rauch hängt nicht mehr. Augen finden wieder leichter zu dir.',
      'Die Kapsel ist ausgeatmet. Deine Spur wird wieder klarer.',
      'Der Schleier fällt. Das Set erinnert sich wieder an dich.',
    ],
  },
  {
    id: 'cons_rest_dressing_room_drops',
    effectFamily: 'safe_rest_boost',
    theme: 'drama',
    displayName: 'Garderobentropfen',
    visualBaseName: 'Garderobentropfen',
    svgAsset: './assets/items/consumables/cons_rest_dressing_room_drops.svg',
    logProfile: 'rest',
    rarityWeights: { floor: 9, chest: 16, special: 7 },
    useLogTexts: [
      'Die Garderobentropfen legen einen stillen Rhythmus unter deinen Atem.',
      'Etwas an den Tropfen bringt Ruhe in die Schultern und Ordnung in den Puls.',
      'Für eine Weile erholt sich dein Körper schneller, sobald die Szene dich lässt.',
      'Die Tropfen machen aus kurzen Pausen wieder brauchbare Pausen.',
    ],
    expireLogTexts: [
      'Die stille Erholung ebbt ab. Ruhe heilt wieder langsamer.',
      'Die Garderobentropfen verlieren ihre Wirkung. Pausen werden wieder knapper.',
      'Der ruhigere Takt verschwindet. Regeneration kehrt zur Normalgeschwindigkeit zurück.',
    ],
  },
  {
    id: 'cons_resist_crash_gel',
    effectFamily: 'trap_resist',
    theme: 'action',
    displayName: 'Crash-Gel',
    visualBaseName: 'Crash-Gel',
    svgAsset: './assets/items/consumables/cons_resist_crash_gel.svg',
    logProfile: 'action_resist',
    rarityWeights: { floor: 9, chest: 16, special: 7 },
    useLogTexts: [
      'Das Crash-Gel spannt sich kühl über Haut und Kleidung. Kanten wirken weniger endgültig.',
      'Eine zähe Schutzschicht nimmt dem Set einen Teil seines Bisses.',
      'Das Gel sitzt. Falls etwas schiefgeht, knallt es nicht ganz so hart.',
      'Du riechst Chemie und schlechte Entscheidungen. Beides hilft gerade erstaunlich gut.',
    ],
    expireLogTexts: [
      'Die Schutzschicht bricht auf. Das Set trifft wieder direkter.',
      'Das Crash-Gel trocknet ab. Gefahren fühlen sich wieder unverhandelter an.',
      'Der chemische Puffer verschwindet. Jetzt zählt wieder nur noch der Treffer.',
    ],
  },
  {
    id: 'cons_teleport_blink_rune',
    effectFamily: 'blink_teleport',
    theme: 'fantasy',
    displayName: 'Blink-Rune',
    visualBaseName: 'Blink-Rune',
    svgAsset: './assets/items/consumables/cons_teleport_blink_rune.svg',
    logProfile: 'fantasy_blink',
    rarityWeights: { floor: 3, chest: 7, special: 6 },
    useLogTexts: [
      'Die Blink-Rune bricht in kaltes Licht. Der Raum knickt kurz zur Seite.',
      'Runenlinien reißen auf, und die Bühne verliert für einen Atemzug ihre Geografie.',
      'Ein harter Schnitt aus Licht und du bist nicht mehr ganz dort, wo eben noch.',
      'Die Rune zischt auf. Das Studio erlaubt dir einen unmöglichen Schritt.',
    ],
    resultLogTexts: [
      'Der Schnitt sitzt. Du landest an anderer Stelle derselben Bühne.',
      'Ein unnatürlicher Wimpernschlag später stehst du woanders.',
      'Die Rune verzieht den Raum. Dein Abgang wird zum Ortswechsel.',
      'Ein Sprung durch die Kulisse verschafft dir neue Position.',
    ],
  },
  {
    id: 'cons_floorwarp_jump_cassette',
    effectFamily: 'advance_floorwarp',
    theme: 'scifi',
    displayName: 'Jump-Kassette',
    visualBaseName: 'Jump-Kassette',
    svgAsset: './assets/items/consumables/cons_floorwarp_jump_cassette.svg',
    logProfile: 'jump',
    rarityWeights: { floor: 0.8, chest: 1.8, special: 2.8 },
    useLogTexts: [
      'Die Jump-Kassette spult vor. Der nächste Akt drückt sich in die Gegenwart.',
      'Ein metallisches Klicken, dann springt die Produktion ein Set weiter.',
      'Die Kassette frisst Übergang und Geduld. Tiefere Studioluft schlägt dir entgegen.',
      'Du ziehst an der Lasche. Das Studio schneidet hart nach vorn.',
    ],
    resultLogTexts: [
      'Die Szene wird vorgespult. Du landest tiefer im Studio.',
      'Kein sauberer Übergang, nur ein entschlossener Sprung nach vorn.',
      'Der Schnitt sitzt brutal früh. Der nächste Studioakt beginnt sofort.',
      'Die Kassette gönnt dir keinen Zwischenton. Tiefer geht es weiter.',
    ],
  },
  {
    id: 'cons_retreat_cold_feet_ticket',
    effectFamily: 'retreat_floorwarp',
    theme: 'romance',
    displayName: 'Kalte-Füße-Ticket',
    visualBaseName: 'Kalte-Füße-Ticket',
    svgAsset: './assets/items/consumables/cons_retreat_cold_feet_ticket.svg',
    logProfile: 'retreat',
    rarityWeights: { floor: 2, chest: 4, special: 4 },
    useLogTexts: [
      'Das Kalte-Füße-Ticket knickt ein. Die Szene bekommt plötzlich einen Ausgang.',
      'Ein hastiger, erstaunlich sauberer Rückzieher wird zur Requisite.',
      'Das Ticket tut, wofür es gemacht wurde: Du bist weg, bevor die Szene kippt.',
      'Der Abgang kommt früher als geplant. Das Studio schneidet zurück.',
    ],
    resultLogTexts: [
      'Ein überstürzter Abgang, fast schon elegant.',
      'Die Bühne wechselt rückwärts. Progression bleibt zurück, du aber auch.',
      'Der Schnitt zieht dich in ein früheres Studio zurück.',
      'Flucht auf Papier, wirksam wie ein Notausgang.',
    ],
  },
]);

function cloneMagnitude(magnitude) {
  return magnitude && typeof magnitude === 'object'
    ? { ...magnitude }
    : magnitude ?? null;
}

function buildConsumableDescription(effectFamily, tier) {
  const spec = EFFECT_FAMILY_SPECS[effectFamily];
  const duration = spec?.durationByTier?.[tier] ?? 0;
  const summary = spec?.summaryByTier?.[tier] ?? 'Löst einen Spezialeffekt aus';
  return duration > 0
    ? `Consumable. Gewährt für ${duration} Züge ${summary}.`
    : `Consumable. ${summary}.`;
}

function buildConsumableDefinition(variant, tier) {
  const spec = EFFECT_FAMILY_SPECS[variant.effectFamily];
  const duration = spec?.durationByTier?.[tier] ?? 0;
  const magnitude = cloneMagnitude(spec?.magnitudeByTier?.[tier] ?? null);
  const id = `${variant.id}_t${tier}`;
  const definition = {
    id,
    contentId: variant.id,
    type: 'consumable',
    itemType: 'consumable',
    effectFamily: variant.effectFamily,
    tier,
    theme: variant.theme,
    displayName: variant.displayName,
    name: variant.displayName,
    description: buildConsumableDescription(variant.effectFamily, tier),
    duration,
    magnitude,
    rarityWeight: variant.rarityWeights ?? {},
    svgAsset: variant.svgAsset,
    logProfile: variant.logProfile,
    useLogTexts: [...(variant.useLogTexts ?? [])],
    expireLogTexts: [...(variant.expireLogTexts ?? [])],
    resultLogTexts: [...(variant.resultLogTexts ?? [])],
    specialRules: variant.specialRules ? { ...variant.specialRules } : {},
    stackRule: 'refresh_or_stronger',
    phase: FAMILY_PHASE[variant.effectFamily] ?? 1,
    balanceGroups: [],
  };
  definition.balanceGroups = getItemBalanceGroups(definition);
  return definition;
}

export const CONSUMABLE_DEFINITIONS = Object.freeze(
  CONSUMABLE_VARIANTS.flatMap((variant) => [1, 2, 3].map((tier) => buildConsumableDefinition(variant, tier)))
);

export const CONSUMABLE_DEFINITION_MAP = Object.freeze(
  Object.fromEntries(CONSUMABLE_DEFINITIONS.map((entry) => [entry.id, entry]))
);

export const CONSUMABLE_VARIANT_MAP = Object.freeze(
  Object.fromEntries(CONSUMABLE_VARIANTS.map((entry) => [entry.id, entry]))
);

export function getConsumableDefinition(consumableId) {
  return consumableId ? CONSUMABLE_DEFINITION_MAP[consumableId] ?? null : null;
}

export function cloneConsumableDefinition(consumableId) {
  const definition = getConsumableDefinition(consumableId);
  if (!definition) {
    return null;
  }

  return {
    ...definition,
    magnitude: cloneMagnitude(definition.magnitude),
    rarityWeight: { ...(definition.rarityWeight ?? {}) },
    useLogTexts: [...(definition.useLogTexts ?? [])],
    expireLogTexts: [...(definition.expireLogTexts ?? [])],
    resultLogTexts: [...(definition.resultLogTexts ?? [])],
    specialRules: definition.specialRules ? { ...definition.specialRules } : {},
    balanceGroups: [...(definition.balanceGroups ?? [])],
  };
}

export function listConsumablesForTheme(theme) {
  return CONSUMABLE_DEFINITIONS.filter((entry) => entry.theme === theme);
}

export function getConsumableEffectSpec(effectFamily) {
  return EFFECT_FAMILY_SPECS[effectFamily] ?? null;
}

export function getConsumableEffectLabel(effectFamily) {
  return EFFECT_FAMILY_LABELS[effectFamily] ?? effectFamily;
}

export function getConsumableThemeForArchetype(archetypeId) {
  return ARCHETYPE_TO_THEME[archetypeId] ?? 'action';
}

const HEALING_EFFECT_FAMILIES = Object.freeze([
  {
    id: 'heal_bandage_small',
    baseNameDe: 'Verbandspäckchen',
    healType: 'instant',
    healAmount: 4,
    descriptionDe: 'Kleine Sofortheilung. Stellt 4 HP wieder her.',
    effectDescriptionDe: 'Stellt 4 HP wieder her.',
    useLogLines: [
      'Du legst rasch ein Verbandspäckchen an und fängst dich wieder.',
      'Eine schnelle Erstversorgung bringt dich zurück ins Spiel.',
      'Du flickst dich notdürftig zusammen und gehst weiter.',
      'Ein routinierter Griff zum Verband verhindert Schlimmeres.',
    ],
  },
  {
    id: 'heal_set_medkit_standard',
    baseNameDe: 'Set-Sanitätskit',
    healType: 'instant',
    healAmount: 8,
    descriptionDe: 'Sofortheilung. Stellt 8 HP wieder her.',
    effectDescriptionDe: 'Stellt 8 HP wieder her.',
    useLogLines: [
      'Du greifst zum Set-Sanitätskit und kommst wieder in Form.',
      'Ein schneller Eingriff aus dem Sanitätskit bringt dich zurück in die Szene.',
      'Die Set-Erstversorgung zeigt Wirkung.',
      'Kurz verarztet, tief durchgeatmet, weiter geht die Vorstellung.',
    ],
  },
  {
    id: 'heal_stunt_emergency_kit',
    baseNameDe: 'Stunt-Notfallkit',
    healType: 'instant',
    healAmount: 14,
    descriptionDe: 'Starke Sofortheilung. Stellt 14 HP wieder her.',
    effectDescriptionDe: 'Stellt 14 HP wieder her.',
    useLogLines: [
      'Du reißt das Stunt-Notfallkit auf und stabilisierst dich.',
      'Die Behandlung ist grob, aber effektiv.',
      'Ein Griff ins Notfallkit hält dich für die nächste Einstellung auf den Beinen.',
      'Kein Cut, keine Pause: Du bringst dich mit dem Notfallkit wieder hoch.',
    ],
  },
  {
    id: 'heal_cool_gel_pack',
    baseNameDe: 'Kühlgel-Pack',
    healType: 'regen',
    healAmount: 6,
    healPerTurn: 2,
    durationTurns: 3,
    descriptionDe: 'Regeneration. Heilt 2 HP pro Zug für 3 Züge. Gesamt: 6 HP.',
    effectDescriptionDe: 'Heilt 2 HP pro Zug für 3 Züge. Gesamt: 6 HP.',
    useLogLines: [
      'Das Kühlgel lindert den Schmerz nach und nach.',
      'Die Kälte setzt ein und bringt spürbare Erleichterung.',
      'Du legst das Gel-Pack an und spürst, wie die Erholung einsetzt.',
      'Die Wirkung kommt nicht sofort, aber sie kommt.',
    ],
  },
  {
    id: 'heal_recovery_inhaler',
    baseNameDe: 'Recovery-Inhalator',
    healType: 'regen',
    healAmount: 10,
    healPerTurn: 2,
    durationTurns: 5,
    descriptionDe: 'Regeneration. Heilt 2 HP pro Zug für 5 Züge. Gesamt: 10 HP.',
    effectDescriptionDe: 'Heilt 2 HP pro Zug für 5 Züge. Gesamt: 10 HP.',
    useLogLines: [
      'Ein Zug aus dem Recovery-Inhalator stabilisiert dich langsam.',
      'Du atmest tief ein und findest Schritt für Schritt zurück zu dir.',
      'Der Inhalator bringt Ruhe in deine Atmung und Kraft in deinen Körper.',
      'Mit kontrollierten Atemzügen fängst du dich wieder.',
    ],
  },
]);

export const HEALING_FAMILY_ORDER = Object.freeze(HEALING_EFFECT_FAMILIES.map((entry) => entry.id));
export const HEALING_FAMILY_DEFS = Object.freeze(
  Object.fromEntries(HEALING_EFFECT_FAMILIES.map((entry) => [entry.id, entry]))
);

const HEALING_SPAWN_WEIGHT_TIERS = Object.freeze([
  {
    maxFloor: 2,
    weights: {
      heal_bandage_small: 40,
      heal_set_medkit_standard: 50,
      heal_cool_gel_pack: 10,
    },
  },
  {
    maxFloor: 5,
    weights: {
      heal_bandage_small: 20,
      heal_set_medkit_standard: 45,
      heal_stunt_emergency_kit: 15,
      heal_cool_gel_pack: 12,
      heal_recovery_inhaler: 8,
    },
  },
  {
    maxFloor: Number.POSITIVE_INFINITY,
    weights: {
      heal_bandage_small: 12,
      heal_set_medkit_standard: 38,
      heal_stunt_emergency_kit: 24,
      heal_cool_gel_pack: 14,
      heal_recovery_inhaler: 12,
    },
  },
]);

const STUDIO_TO_HEALING_ASSET_ARCHETYPE = Object.freeze({
  action: 'action',
  space_opera: 'scifi',
  fantasy: 'fantasy',
  slasher: 'horror',
  western: 'western',
  noir: 'noir',
  romcom: 'romcom',
  adventure: 'adventure',
  social_drama: 'historical',
  creature_feature: 'mystery',
});

export const HEALING_ASSET_PACK_ID = 'healing_consumables_archetype_icons_v1';
export const HEALING_DEFAULT_ARCHETYPE_ID = 'action';

export function getConsumableCategory(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  return item.category
    ?? (item.type === 'food' ? 'consumable' : null)
    ?? (item.type === 'consumable' ? 'consumable' : null);
}

export function isConsumableItem(item) {
  return getConsumableCategory(item) === 'consumable';
}

export function isFoodConsumable(item) {
  return isConsumableItem(item) && item?.consumableType === 'food';
}

export function isHealingConsumable(item) {
  return isConsumableItem(item) && item?.consumableType === 'healing';
}

export function getHealingFamily(familyId) {
  return HEALING_FAMILY_DEFS[familyId] ?? null;
}

export function getHealingTypeLabel(healType) {
  return healType === 'regen' ? 'Regeneration' : 'Sofortheilung';
}

export function getHealingOverlayLabel(item) {
  const family = getHealingFamily(item?.familyId);
  return item?.displayName ?? item?.name ?? family?.baseNameDe ?? 'Heil-Consumable';
}

export function buildHealingAssetId(archetypeId, familyId) {
  return `${archetypeId}__${familyId}`;
}

export function mapStudioArchetypeToHealingAssetArchetype(studioArchetypeId) {
  return STUDIO_TO_HEALING_ASSET_ARCHETYPE[studioArchetypeId] ?? HEALING_DEFAULT_ARCHETYPE_ID;
}

export function buildHealingAssetFile(archetypeId, familyId) {
  const resolvedArchetypeId = archetypeId ?? HEALING_DEFAULT_ARCHETYPE_ID;
  return `${resolvedArchetypeId}/${buildHealingAssetId(resolvedArchetypeId, familyId)}.svg`;
}

export function createHealingConsumableDefinition(familyId, options = {}) {
  const family = getHealingFamily(familyId);
  if (!family) {
    return null;
  }

  const sourceStudioArchetypeId = options.studioArchetypeId ?? options.archetypeId ?? null;
  const assetArchetypeId = options.assetArchetypeId ?? mapStudioArchetypeToHealingAssetArchetype(sourceStudioArchetypeId);
  const assetId = options.assetId ?? buildHealingAssetId(assetArchetypeId, family.id);
  const iconAssetFile = options.iconAssetFile ?? buildHealingAssetFile(assetArchetypeId, family.id);

  return {
    id: options.id ?? assetId,
    contentId: family.id,
    assetId,
    familyId: family.id,
    family_id: family.id,
    effectFamily: family.id,
    archetypeId: sourceStudioArchetypeId,
    archetype_id: sourceStudioArchetypeId,
    assetArchetypeId,
    asset_archetype_id: assetArchetypeId,
    name: options.name ?? family.baseNameDe,
    displayName: options.displayName ?? options.name ?? family.baseNameDe,
    baseNameDe: family.baseNameDe,
    description: options.description ?? family.descriptionDe,
    descriptionDe: options.descriptionDe ?? family.descriptionDe,
    category: 'consumable',
    type: 'consumable',
    itemType: 'consumable',
    consumableType: 'healing',
    stackable: options.stackable ?? true,
    maxStack: options.maxStack ?? 99,
    useTimeCost: options.useTimeCost ?? 1,
    effectPayload: {
      healType: family.healType,
      healAmount: family.healAmount,
      healPerTurn: family.healPerTurn ?? 0,
      durationTurns: family.durationTurns ?? 0,
    },
    allowedContexts: options.allowedContexts ?? ['inventory', 'ground', 'heal_overlay'],
    showInHealOverlay: options.showInHealOverlay ?? true,
    icon: options.icon ?? assetId,
    iconAssetId: options.iconAssetId ?? assetId,
    iconAssetFile,
    iconAssetPath: options.iconAssetPath ?? `./assets/consumables/${iconAssetFile}`,
    assetPackId: options.assetPackId ?? HEALING_ASSET_PACK_ID,
    healType: family.healType,
    heal: family.healAmount,
    healPerTurn: family.healPerTurn ?? 0,
    durationTurns: family.durationTurns ?? 0,
    effectDescriptionDe: family.effectDescriptionDe,
    useLogTexts: [...family.useLogLines],
    useLogLines: [...family.useLogLines],
    balanceGroups: [],
  };
}

export function normalizeFoodConsumable(item) {
  if (!item || typeof item !== 'object') {
    return item ?? null;
  }

  return {
    ...item,
    category: 'consumable',
    type: 'food',
    consumableType: 'food',
    stackable: item.stackable ?? true,
    maxStack: item.maxStack ?? 99,
    useTimeCost: item.useTimeCost ?? 1,
    allowedContexts: item.allowedContexts ?? ['inventory', 'ground'],
    showInHealOverlay: false,
  };
}

export function normalizeLegacyConsumableItem(item) {
  if (!item || typeof item !== 'object') {
    return item;
  }

  if (isHealingConsumable(item)) {
    return {
      ...createHealingConsumableDefinition(item.familyId ?? item.family_id ?? item.effectFamily ?? 'heal_set_medkit_standard', item),
      ...item,
    };
  }

  if (item.type === 'potion' || item.id === 'healing-potion') {
    return createHealingConsumableDefinition(item.familyId ?? item.family_id ?? 'heal_set_medkit_standard', item);
  }

  if (item.type === 'food' || item.consumableType === 'food') {
    return normalizeFoodConsumable(item);
  }

  if (item.type === 'consumable' || item.itemType === 'consumable' || item.effectFamily) {
    const definition = cloneConsumableDefinition(item.id);
    if (definition) {
      return {
        ...definition,
        ...item,
        magnitude: item.magnitude && typeof item.magnitude === 'object'
          ? { ...item.magnitude }
          : cloneMagnitude(definition.magnitude),
        rarityWeight: { ...(item.rarityWeight ?? definition.rarityWeight ?? {}) },
        useLogTexts: Array.isArray(item.useLogTexts) ? [...item.useLogTexts] : [...(definition.useLogTexts ?? [])],
        expireLogTexts: Array.isArray(item.expireLogTexts) ? [...item.expireLogTexts] : [...(definition.expireLogTexts ?? [])],
        resultLogTexts: Array.isArray(item.resultLogTexts) ? [...item.resultLogTexts] : [...(definition.resultLogTexts ?? [])],
        specialRules: item.specialRules ? { ...item.specialRules } : { ...(definition.specialRules ?? {}) },
        balanceGroups: Array.isArray(item.balanceGroups) ? [...item.balanceGroups] : [...(definition.balanceGroups ?? [])],
      };
    }
  }

  return item;
}

export function chooseHealingFamilyForFloor(floorNumber, weightedPickEntry) {
  const normalizedFloor = Math.max(1, Number(floorNumber) || 1);
  const tier = HEALING_SPAWN_WEIGHT_TIERS.find((entry) => normalizedFloor <= entry.maxFloor) ?? HEALING_SPAWN_WEIGHT_TIERS.at(-1);
  const weightedEntries = Object.entries(tier.weights).map(([id, weight]) => ({ id, weight }));
  return weightedPickEntry(weightedEntries)?.id ?? 'heal_set_medkit_standard';
}
