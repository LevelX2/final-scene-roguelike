export function createTooltipView(context) {
  const {
    MIN_CRIT_CHANCE,
    MAX_CRIT_CHANCE,
    hoverTooltipElement,
    monsterNames = [],
    itemNames = [],
    getState,
    getMainHand,
    getOffHand,
    getCombatWeapon,
    getActorStatusDisplay = () => [],
    clamp,
  } = context;

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function isMonsterPhraseBoundaryCharacter(character) {
    return !character || /[\s([{"'“„]/u.test(character);
  }

  function expandMonsterMatch(messageText, start, end) {
    const prefix = messageText.slice(0, start);
    const articlePhraseMatch = prefix.match(/((?:der|die|das|den|dem|des|ein|eine|einen|einem|einer)\s+(?:[a-zäöüß][\p{L}-]*\s+){0,2})$/iu);
    if (articlePhraseMatch) {
      const expandedStart = start - articlePhraseMatch[1].length;
      if (isMonsterPhraseBoundaryCharacter(messageText[expandedStart - 1])) {
        return { start: expandedStart, end };
      }
    }

    const capitalizedPhraseMatch = prefix.match(/((?:[A-ZÄÖÜ][\p{L}-]*\s+){1,2})$/u);
    if (capitalizedPhraseMatch) {
      const expandedStart = start - capitalizedPhraseMatch[1].length;
      if (isMonsterPhraseBoundaryCharacter(messageText[expandedStart - 1])) {
        return { start: expandedStart, end };
      }
    }

    return { start, end };
  }

  const messageHighlightTerms = [
    ...monsterNames.map((name) => ({ text: name, kind: "monster" })),
    ...itemNames.map((name) => ({ text: name, kind: "item" })),
  ]
    .filter((entry) => entry.text)
    .sort((left, right) => right.text.length - left.text.length);

  function formatLogMessage(messageText) {
    if (!messageHighlightTerms.length) {
      return escapeHtml(messageText);
    }

    const lowerText = messageText.toLowerCase();
    const matches = [];

    messageHighlightTerms.forEach((term) => {
      const needle = term.text.toLowerCase();
      let searchIndex = 0;

      while (searchIndex < lowerText.length) {
        const start = lowerText.indexOf(needle, searchIndex);
        if (start === -1) {
          break;
        }

        const expandedMatch = term.kind === "monster"
          ? expandMonsterMatch(messageText, start, start + needle.length)
          : { start, end: start + needle.length };
        const end = expandedMatch.end;
        const expandedStart = expandedMatch.start;
        const overlaps = matches.some((match) => !(end <= match.start || expandedStart >= match.end));
        if (!overlaps) {
          matches.push({
            start: expandedStart,
            end,
            kind: term.kind,
          });
        }
        searchIndex = start + needle.length;
      }
    });

    if (!matches.length) {
      return escapeHtml(messageText);
    }

    matches.sort((left, right) => left.start - right.start);
    let html = "";
    let cursor = 0;

    matches.forEach((match) => {
      if (cursor < match.start) {
        html += escapeHtml(messageText.slice(cursor, match.start));
      }
      html += `<span class="log-mark log-mark-${match.kind}">${escapeHtml(messageText.slice(match.start, match.end))}</span>`;
      cursor = match.end;
    });

    if (cursor < messageText.length) {
      html += escapeHtml(messageText.slice(cursor));
    }

    return html;
  }

  function getPlayerCombatSummary() {
    const state = getState();
    const weapon = getMainHand(state.player);
    const offHand = getOffHand(state.player);
    const precisionPenalty = (state.player.statusEffects ?? [])
      .filter((effect) => effect.type === "precision_malus")
      .reduce((sum, effect) => sum + (effect.penalty ?? 0), 0);
    const reactionPenalty = (state.player.statusEffects ?? [])
      .filter((effect) => effect.type === "reaction_malus")
      .reduce((sum, effect) => sum + (effect.penalty ?? 0), 0);
    const baseDamage = Math.max(1, state.player.strength + weapon.damage);
    const hitValue = (state.player.precision - precisionPenalty) * 2 + weapon.hitBonus;
    const critChance = clamp(state.player.precision - precisionPenalty + weapon.critBonus, MIN_CRIT_CHANCE, MAX_CRIT_CHANCE);
    const blockBase = offHand?.subtype === "shield" ? offHand.blockChance : 0;
    const blockChance = offHand?.subtype === "shield"
      ? clamp(blockBase + state.player.nerves + (state.player.shieldBlockBonus ?? 0) - reactionPenalty, 5, 75)
      : 0;

    return {
      hp: `${state.player.hp}/${state.player.maxHp}`,
      level: String(state.player.level),
      damage: String(baseDamage),
      totalDamage: String(baseDamage),
      hit: String(hitValue),
      totalHit: String(hitValue),
      crit: `${critChance}%`,
      totalCrit: `${critChance}%`,
      block: `${blockChance}%`,
      totalBlock: `${blockChance}%`,
    };
  }

  function getTopbarTooltipContent() {
    const state = getState();
    const weapon = getCombatWeapon(state.player);
    const offHand = getOffHand(state.player);
    const precisionPenalty = (state.player.statusEffects ?? [])
      .filter((effect) => effect.type === "precision_malus")
      .reduce((sum, effect) => sum + (effect.penalty ?? 0), 0);
    const reactionPenalty = (state.player.statusEffects ?? [])
      .filter((effect) => effect.type === "reaction_malus")
      .reduce((sum, effect) => sum + (effect.penalty ?? 0), 0);
    const activeStatusEffects = getActorStatusDisplay(state.player)
      .map((effect) => `${effect.label} ${effect.duration}`)
      .join(", ");
    const baseDamage = Math.max(1, state.player.strength + weapon.damage);
    const hitValue = (state.player.precision - precisionPenalty) * 2 + weapon.hitBonus;
    const critChance = clamp(state.player.precision - precisionPenalty + weapon.critBonus, MIN_CRIT_CHANCE, MAX_CRIT_CHANCE);
    const blockBase = offHand?.subtype === "shield" ? offHand.blockChance : 0;
    const blockChance = offHand?.subtype === "shield"
      ? clamp(blockBase + state.player.nerves + (state.player.shieldBlockBonus ?? 0) - reactionPenalty, 5, 75)
      : 0;
    const weaponStyle = weapon.attackMode === "ranged" && (weapon.range ?? 1) > 1
      ? `Fernkampf ${weapon.range}`
      : "Nahkampf";
    const weaponStyleDetail = [
      `Waffenprofil ${weaponStyle}`,
      (weapon.meleePenaltyHit ?? 0) < 0 ? `Nahkampfmalus ${weapon.meleePenaltyHit}` : null,
      (weapon.lightBonus ?? 0) > 0 ? `Lichtbonus +${weapon.lightBonus}` : null,
    ].filter(Boolean).join(" | ");

    return {
      hp: {
        title: "Lebenspunkte",
        lines: [
          `Aktuell ${state.player.hp}/${state.player.maxHp}`,
          "Wenn das auf 0 fällt, endet das Spiel.",
        ],
      },
      level: {
        title: "Heldlevel",
        lines: [
          `Stufe ${state.player.level}`,
          `XP ${state.player.xp}/${state.player.xpToNext}`,
        ],
      },
      damage: {
        title: "Basisschaden",
        lines: [
          `Stärke ${state.player.strength} + Waffenschaden ${weapon.damage}`,
          weaponStyleDetail,
          `Ergibt aktuell ${baseDamage} Schaden pro Treffer vor Krits.`,
        ].filter(Boolean),
      },
      hit: {
        title: "Trefferwert",
        lines: [
          `Präzision ${state.player.precision}${precisionPenalty > 0 ? ` - Statusmalus ${precisionPenalty}` : ""} x 2 + Waffenbonus ${weapon.hitBonus >= 0 ? "+" : ""}${weapon.hitBonus}`,
          (weapon.meleePenaltyHit ?? 0) < 0 ? `Im Nahkampf fällt zusätzlich ${Math.abs(weapon.meleePenaltyHit)} Treffer an.` : null,
          activeStatusEffects ? `Aktive Effekte: ${activeStatusEffects}` : null,
          `Ergibt aktuell Trefferwert ${hitValue}.`,
        ].filter(Boolean),
      },
      crit: {
        title: "Krit-Chance",
        lines: [
          `Präzision ${state.player.precision}${precisionPenalty > 0 ? ` - Statusmalus ${precisionPenalty}` : ""} + Waffenkrit ${weapon.critBonus >= 0 ? "+" : ""}${weapon.critBonus}`,
          (weapon.lightBonus ?? 0) > 0 ? `Diese Waffe erhöht zugleich deine Sichtweite um ${weapon.lightBonus}.` : null,
          `Ergibt aktuell ${critChance}% Krit-Chance.`,
        ].filter(Boolean),
      },
      block: {
        title: "Blockchance",
        lines: offHand?.subtype === "shield"
          ? [
              `Schild ${offHand.blockChance}% + Nerven ${state.player.nerves}${(state.player.shieldBlockBonus ?? 0) ? ` + Klassenbonus ${state.player.shieldBlockBonus}` : ""}${reactionPenalty > 0 ? ` - Reaktionsmalus ${reactionPenalty}` : ""}`,
              `Ergibt aktuell ${blockChance}% Blockchance mit ${offHand.blockValue} Blockwert.`,
            ]
          : [
              "Kein Schild in der Nebenhand.",
              reactionPenalty > 0
                ? `Aktiver Reaktionsmalus ${reactionPenalty} wirkt derzeit auf Ausweichen und Blocken.`
                : "Mit Schild würdest du hier deine Blockchance sehen.",
            ],
      },
    };
  }

  function showTooltip(tooltip, event) {
    hoverTooltipElement.innerHTML = `
      ${tooltip.imageUrl ? `<div class="tooltip-art ${tooltip.imageClass ?? ""}" style="background-image: url('${tooltip.imageUrl}')"></div>` : ""}
      <p class="tooltip-title">${tooltip.title}</p>
      <p class="tooltip-copy">${tooltip.lines.join("<br>")}</p>
    `;
    hoverTooltipElement.classList.remove("hidden");
    hoverTooltipElement.setAttribute("aria-hidden", "false");
    moveTooltip(event);
  }

  function moveTooltip(event) {
    if (!event || hoverTooltipElement.classList.contains("hidden")) {
      return;
    }

    const offsetX = 16;
    const offsetY = 16;
    const viewportPadding = 12;
    let left = event.clientX + offsetX;
    let top = event.clientY + offsetY;

    hoverTooltipElement.style.left = `${left}px`;
    hoverTooltipElement.style.top = `${top}px`;

    const rect = hoverTooltipElement.getBoundingClientRect();
    if (top + rect.height > window.innerHeight - viewportPadding) {
      top = event.clientY - rect.height - offsetY;
    }
    if (left + rect.width > window.innerWidth - viewportPadding) {
      left = window.innerWidth - rect.width - viewportPadding;
    }

    left = Math.max(viewportPadding, left);
    top = Math.max(viewportPadding, top);
    hoverTooltipElement.style.left = `${left}px`;
    hoverTooltipElement.style.top = `${top}px`;
  }

  function hideTooltip() {
    hoverTooltipElement.classList.add("hidden");
    hoverTooltipElement.setAttribute("aria-hidden", "true");
  }

  function bindTooltip(element, tooltipFactory) {
    if (!element) {
      return;
    }

    element.addEventListener("mouseenter", (event) => showTooltip(tooltipFactory(), event));
    element.addEventListener("mousemove", (event) => moveTooltip(event));
    element.addEventListener("mouseleave", () => hideTooltip());
  }

  return {
    formatLogMessage,
    getPlayerCombatSummary,
    getTopbarTooltipContent,
    showTooltip,
    moveTooltip,
    hideTooltip,
    bindTooltip,
  };
}
