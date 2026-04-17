import { formatStudioLabel, formatStudioWithArchetype, getStudioArchetypeLabel } from '../studio-theme.mjs';
import { getWeaponEffectDefinition, getEffectStateLabel } from '../content/catalogs/weapon-effects.mjs';
import { formatKillStatLabel, getKillStatEntries } from '../kill-stats.mjs';
import { getWeaponRuntimeEffects } from '../weapon-runtime-effects.mjs';

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
    formatWeaponDisplayName,
    formatWeaponStats,
    formatOffHandStats,
    loadHighscores,
    loadLastHighscoreMarker,
    getHungerStateLabel,
    getHeroClassIconUrl,
    knowsMonster,
  } = context;

  function formatStatusSummary(actor) {
    const effects = actor?.statusEffects ?? [];
    if (!effects.length) {
      return 'Keine';
    }

    return effects
      .map((effect) => {
        const label = getEffectStateLabel(effect.type) ?? getWeaponEffectDefinition(effect.type)?.label ?? effect.type;
        return `${label} ${effect.duration ?? 0}`;
      })
      .join(' | ');
  }

  function formatWeaponRoleSummary(weapon) {
    if (!weapon) {
      return 'Unbewaffnet';
    }

    const runtimeEffects = getWeaponRuntimeEffects(weapon);
    const parts = [
      weapon.attackMode === 'ranged' && (weapon.range ?? 1) > 1
        ? `Fernkampf ${weapon.range}`
        : 'Nahkampf',
    ];

    if ((weapon.meleePenaltyHit ?? 0) < 0) {
      parts.push(`Nahkampfmalus ${weapon.meleePenaltyHit}`);
    }

    if ((weapon.lightBonus ?? 0) > 0) {
      parts.push(`Licht +${weapon.lightBonus}`);
    }

    if (runtimeEffects.length > 0) {
      parts.push(
        runtimeEffects
          .map((effect) => getWeaponEffectDefinition(effect.type)?.label ?? effect.type)
          .join(', '),
      );
    }

    return parts.join(' | ');
  }

  function nearestEnemy() {
    const state = getState();
    const floorState = getCurrentFloorState();
    const targetedEnemy = state.targeting?.active
      ? floorState.enemies.find((enemy) => enemy.x === state.targeting.cursorX && enemy.y === state.targeting.cursorY)
      : null;

    if (targetedEnemy && floorState.visible?.[targetedEnemy.y]?.[targetedEnemy.x]) {
      return {
        enemy: targetedEnemy,
        distance: Math.abs(targetedEnemy.x - state.player.x) + Math.abs(targetedEnemy.y - state.player.y),
        targeted: true,
      };
    }

    const visibleEnemies = floorState.enemies.filter((enemy) => floorState.visible?.[enemy.y]?.[enemy.x]);
    if (visibleEnemies.length === 0) {
      return null;
    }

    return [...visibleEnemies]
      .map((enemy) => ({
        enemy,
        distance: Math.abs(enemy.x - state.player.x) + Math.abs(enemy.y - state.player.y),
        targeted: false,
      }))
      .sort((left, right) => left.distance - right.distance)[0];
  }

  function renderPlayerSheet() {
    const state = getState();
    const summaryRows = [
      createSheetRow('Haupthand', `${formatWeaponDisplayName(getMainHand(state.player))} (${formatWeaponStats(getMainHand(state.player))})`),
      createSheetRow('Nebenhand', getOffHand(state.player) ? `${getOffHand(state.player).name} (${formatOffHandStats(getOffHand(state.player))})` : 'Leer'),
    ];

    playerSheetElement.innerHTML = summaryRows.join('');
  }

  function renderEnemySheet() {
    const state = getState();
    const target = nearestEnemy();

    if (!target) {
      enemySheetElement.innerHTML = `<div class="inventory-empty">Kein Gegner in Sicht.</div>`;
      return;
    }

    const revealed = knowsMonster(target.enemy);
    const compactMode = (state.options?.enemyPanelMode ?? 'detailed') === 'compact';
    const variantSummary = target.enemy.variantModifiers?.length
      ? target.enemy.variantModifiers.map((modifier) => modifier.label).join(', ')
      : 'Keine';
    const attackSummary = target.enemy.mainHand
      ? formatWeaponRoleSummary(target.enemy.mainHand)
      : 'Unbewaffnet';
    const enemyWeaponLabel = target.enemy.mainHand
      ? `${formatWeaponDisplayName(target.enemy.mainHand)} (${formatWeaponStats(target.enemy.mainHand)})`
      : 'Keine';

    if (compactMode) {
      enemySheetElement.innerHTML = [
        createSheetRow('Name', target.enemy.name),
        createSheetRow('Ziel', target.targeted ? 'Aktiv markiert' : 'Nächster Gegner'),
        createSheetRow('Leben', `${target.enemy.hp}/${target.enemy.maxHp}`),
        createSheetRow('Distanz', `${target.distance} Felder`),
        createSheetRow('Bedrohung', target.enemy.variantLabel ?? 'Gewöhnlich'),
        createSheetRow('Waffe', revealed ? enemyWeaponLabel : attackSummary),
        createSheetRow('Status', revealed ? formatStatusSummary(target.enemy) : 'Unbekannt'),
      ].join('');
      return;
    }

    enemySheetElement.innerHTML = [
      createSheetRow('Name', target.enemy.name),
      createSheetRow('Ziel', target.targeted ? 'Aktiv markiert' : 'Nächster Gegner'),
      createSheetRow('Hinweis', target.enemy.description),
      createSheetRow('Auftreten', target.enemy.temperamentHint ?? 'Schwer zu lesen.'),
      ...(revealed
        ? [
            createSheetRow('Variante', target.enemy.variantLabel ?? 'Gewöhnlich'),
            createSheetRow('Merkmale', variantSummary),
            createSheetRow('Verhalten', target.enemy.behaviorLabel),
            createSheetRow('Mobilität', target.enemy.mobilityLabel ?? 'Mobil'),
            createSheetRow('Rückzug', target.enemy.retreatLabel ?? 'Standhaft'),
            createSheetRow('Regeneration', target.enemy.healingLabel ?? 'Langsam'),
            createSheetRow('Entfernung', `${target.distance} Felder`),
            createSheetRow('Waffe', enemyWeaponLabel),
            createSheetRow('Kampfprofil', attackSummary),
            createSheetRow('Status', formatStatusSummary(target.enemy)),
            createSheetRow('Leben', `${target.enemy.hp}/${target.enemy.maxHp}`),
            createSheetRow('Tueren', target.enemy.canOpenDoors ? 'Kann oeffnen' : 'Bleibt haengen'),
            createSheetRow('Besonderheit', target.enemy.special),
          ]
        : [
            createSheetRow('Waffe', attackSummary),
            createSheetRow('Status', 'Mehr Details nach dem ersten Kampf.'),
          ]),
    ].join('');
  }

  function renderHighscores() {
    const scores = loadHighscores();
    const lastMarker = loadLastHighscoreMarker();
    highscoreListElement.innerHTML = '';

    if (scores.length === 0) {
      highscoreListElement.innerHTML = `<div class="inventory-empty">Noch keine Einträge. Das erste Abenteuer wartet.</div>`;
      return;
    }

    scores.forEach((score, index) => {
      const item = document.createElement('div');
      const isLatest = Boolean(lastMarker) && score.marker === lastMarker;
      const deathFloor = score.deathFloor ?? score.deepestFloor;
      const deathStudio = formatStudioWithArchetype(deathFloor, score.deathStudioArchetypeId);
      const deepestStudio = formatStudioWithArchetype(score.deepestFloor, score.deepestStudioArchetypeId);
      const classIconUrl = getHeroClassIconUrl(score.heroClassId ?? score.heroClass);
      item.className = `score-item${isLatest ? ' score-item-latest' : ''}`;
      item.innerHTML = `
        <div class="score-item-head">
          <div class="class-badge score-class-badge" aria-hidden="true"${classIconUrl ? ` style="--class-icon: url('${classIconUrl}')"` : ''}></div>
          <div class="score-item-copy">
            <strong>#${index + 1} ${score.heroName ?? 'Unbenannt'} | ${deepestStudio}${isLatest ? ' <span class="score-badge">Letzter Versuch</span>' : ''}</strong>
            <span>${score.heroClass ?? 'Unbekannt'} | Level ${score.level} | Kills ${score.kills ?? 0} | Leben ${score.hp}/${score.maxHp} | Gestorben in ${deathStudio}</span>
            <span>${score.deathCause ?? 'Ohne dokumentierte Schluss-Szene.'}</span>
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
      createSheetRow('Held', state.player.name),
      createSheetRow('Klasse', state.player.classLabel ?? '-'),
      createSheetRow('Aktuelles Studio', formatStudioLabel(state.floor)),
      createSheetRow('Aktueller Archetyp', getStudioArchetypeLabel(currentFloorState?.studioArchetypeId) ?? 'Unbekannt'),
      createSheetRow('Erreichtes Studio', formatStudioLabel(state.deepestFloor)),
      createSheetRow('Gegner besiegt', state.kills),
      createSheetRow('Erhaltene XP', state.xpGained ?? 0),
      createSheetRow('Schaden ausgeteilt', state.damageDealt ?? 0),
      createSheetRow('Schaden erhalten', state.damageTaken ?? 0),
      createSheetRow('Requisitenkisten geöffnet', state.openedChests ?? 0),
      createSheetRow('Essen gegessen', state.consumedFoods ?? 0),
      createSheetRow('Heiltränke getrunken', state.consumedPotions ?? 0),
      createSheetRow('Schritte', state.turn),
    ].join('');

    const killEntries = getKillStatEntries(state.killStats);
    runStatsKillsElement.innerHTML = killEntries.length > 0
      ? killEntries.map((entry) => createSheetRow(formatKillStatLabel(entry), entry.count)).join('')
      : `<div class="inventory-empty">Noch keine Gegnertypen besiegt.</div>`;
  }

  return {
    renderPlayerSheet,
    renderEnemySheet,
    renderHighscores,
    renderRunStats,
  };
}
