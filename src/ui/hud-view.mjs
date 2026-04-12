import { formatStudioLabel, formatStudioWithArchetype, getStudioArchetypeLabel } from '../studio-theme.mjs';

export function createHudView(context) {
  const {
    playerSheetElement,
    enemySheetElement,
    highscoreListElement,
    runStatsSummaryElement,
    runStatsKillsElement,
    createSheetRow,
    getState,
    getCurrentFloorState,
    getMainHand,
    getOffHand,
    formatWeaponStats,
    formatOffHandStats,
    loadHighscores,
    loadLastHighscoreMarker,
    getHeroClassIconUrl,
    knowsMonster,
  } = context;

  function nearestEnemy() {
    const state = getState();
    const floorState = getCurrentFloorState();
    const visibleEnemies = floorState.enemies.filter((enemy) => floorState.visible?.[enemy.y]?.[enemy.x]);
    if (visibleEnemies.length === 0) {
      return null;
    }

    return [...visibleEnemies]
      .map((enemy) => ({
        enemy,
        distance: Math.abs(enemy.x - state.player.x) + Math.abs(enemy.y - state.player.y),
      }))
      .sort((left, right) => left.distance - right.distance)[0];
  }

  function renderPlayerSheet() {
    const state = getState();
    const playerCardMode = state.collapsedCards?.player ?? "summary";
    const summaryRows = [
      createSheetRow("Klasse", state.player.classLabel ?? "-"),
      createSheetRow("Passive", state.player.classPassiveName ?? "-"),
      createSheetRow("Haupthand", `${getMainHand(state.player).name} (${formatWeaponStats(getMainHand(state.player))})`),
      createSheetRow("Nebenhand", getOffHand(state.player) ? `${getOffHand(state.player).name} (${formatOffHandStats(getOffHand(state.player))})` : "Leer"),
      createSheetRow("Schritte", state.turn),
    ];
    const fullRows = [
      ...summaryRows,
      createSheetRow("Erfahrung", `${state.player.xp} / ${state.player.xpToNext}`),
      createSheetRow("Stärke", state.player.strength),
      createSheetRow("Präzision", state.player.precision),
      createSheetRow("Reaktion", state.player.reaction),
      createSheetRow("Nerven", state.player.nerves),
      createSheetRow("Intelligenz", state.player.intelligence),
      createSheetRow("Ausdauer", state.player.endurance ?? 0),
      createSheetRow("Passiveffekt", state.player.classPassiveDescription ?? "-"),
      createSheetRow("Nahrung", `${state.player.nutrition}/${state.player.nutritionMax}`),
    ];

    playerSheetElement.innerHTML = (playerCardMode === "full" ? fullRows : summaryRows).join("");
  }

  function renderEnemySheet() {
    const target = nearestEnemy();

    if (!target) {
      enemySheetElement.innerHTML = `<div class="inventory-empty">Kein Gegner in Sicht.</div>`;
      return;
    }

    const revealed = knowsMonster(target.enemy);
    const variantSummary = target.enemy.variantModifiers?.length
      ? target.enemy.variantModifiers.map((modifier) => modifier.label).join(", ")
      : "Keine";
    enemySheetElement.innerHTML = [
      createSheetRow("Name", target.enemy.name),
      createSheetRow("Hinweis", target.enemy.description),
      ...(revealed
        ? [
            createSheetRow("Variante", target.enemy.variantLabel ?? "Normal"),
            createSheetRow("Merkmale", variantSummary),
            createSheetRow("Verhalten", target.enemy.behaviorLabel),
            createSheetRow("Mobilität", target.enemy.mobilityLabel ?? "Mobil"),
            createSheetRow("Rückzug", target.enemy.retreatLabel ?? "Standhaft"),
            createSheetRow("Regeneration", target.enemy.healingLabel ?? "Langsam"),
            createSheetRow("Entfernung", `${target.distance} Felder`),
            createSheetRow("Leben", `${target.enemy.hp}/${target.enemy.maxHp}`),
            createSheetRow("Türen", target.enemy.canOpenDoors ? "Kann öffnen" : "Bleibt hängen"),
            createSheetRow("Besonderheit", target.enemy.special),
          ]
        : [
            createSheetRow("Status", "Mehr Details nach dem ersten Kampf."),
          ]),
    ].join("");
  }

  function renderHighscores() {
    const scores = loadHighscores();
    const lastMarker = loadLastHighscoreMarker();
    highscoreListElement.innerHTML = "";

    if (scores.length === 0) {
      highscoreListElement.innerHTML = `<div class="inventory-empty">Noch keine Einträge. Das erste Abenteuer wartet.</div>`;
      return;
    }

    scores.forEach((score, index) => {
      const item = document.createElement("div");
      const isLatest = Boolean(lastMarker) && score.marker === lastMarker;
      const deathFloor = score.deathFloor ?? score.deepestFloor;
      const deathStudio = formatStudioWithArchetype(deathFloor, score.deathStudioArchetypeId);
      const deepestStudio = formatStudioWithArchetype(score.deepestFloor, score.deepestStudioArchetypeId);
      const classIconUrl = getHeroClassIconUrl(score.heroClassId ?? score.heroClass);
      item.className = `score-item${isLatest ? " score-item-latest" : ""}`;
      item.innerHTML = `
        <div class="score-item-head">
          <div class="class-badge score-class-badge" aria-hidden="true"${classIconUrl ? ` style="--class-icon: url('${classIconUrl}')"` : ""}></div>
          <div class="score-item-copy">
            <strong>#${index + 1} ${score.heroName ?? "Unbenannt"} | ${deepestStudio}${isLatest ? ' <span class="score-badge">Letzter Versuch</span>' : ""}</strong>
            <span>${score.heroClass ?? "Unbekannt"} | Level ${score.level} | Kills ${score.kills ?? 0} | Leben ${score.hp}/${score.maxHp} | Gestorben in ${deathStudio}</span>
            <span>${score.deathCause ?? "Ohne dokumentierte Schluss-Szene."}</span>
            <span>${score.turns} Schritte | ${score.date}</span>
          </div>
        </div>
      `;
      highscoreListElement.appendChild(item);
    });
  }

  function renderRunStats() {
    const state = getState();
    const currentFloorState = getCurrentFloorState();
    runStatsSummaryElement.innerHTML = [
      createSheetRow("Held", state.player.name),
      createSheetRow("Klasse", state.player.classLabel ?? "-"),
      createSheetRow("Aktuelles Studio", formatStudioLabel(state.floor)),
      createSheetRow("Aktueller Archetyp", getStudioArchetypeLabel(currentFloorState?.studioArchetypeId) ?? "Unbekannt"),
      createSheetRow("Erreichtes Studio", formatStudioLabel(state.deepestFloor)),
      createSheetRow("Gegner besiegt", state.kills),
      createSheetRow("Erhaltene XP", state.xpGained ?? 0),
      createSheetRow("Schaden ausgeteilt", state.damageDealt ?? 0),
      createSheetRow("Schaden erhalten", state.damageTaken ?? 0),
      createSheetRow("Requisitenkisten geöffnet", state.openedChests ?? 0),
      createSheetRow("Essen gegessen", state.consumedFoods ?? 0),
      createSheetRow("Heiltränke getrunken", state.consumedPotions ?? 0),
      createSheetRow("Schritte", state.turn),
    ].join("");

    const killEntries = Object.entries(state.killStats ?? {})
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "de"));
    runStatsKillsElement.innerHTML = killEntries.length > 0
      ? killEntries.map(([name, count]) => createSheetRow(name, count)).join("")
      : `<div class="inventory-empty">Noch keine Gegnertypen besiegt.</div>`;
  }

  return {
    renderPlayerSheet,
    renderEnemySheet,
    renderHighscores,
    renderRunStats,
  };
}
