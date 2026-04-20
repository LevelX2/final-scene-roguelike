import { getActorBlockChance, getActorCombatSnapshot, getActorDerivedMaxHp, getActorDerivedStats } from '../application/derived-actor-stats.mjs';
import { collectLogHighlights, createLogHighlightTerms } from '../text/combat-log.mjs';

export function createTooltipView(context) {
  const {
    MIN_CRIT_CHANCE,
    MAX_CRIT_CHANCE,
    hoverTooltipElement,
    monsters = [],
    monsterNames = [],
    itemNames = [],
    getState,
    getOffHand,
    getCombatWeapon,
    getActorStatusDisplay = () => [],
    clamp,
  } = context;
  const TOOLTIP_SHOW_DELAY_MS = 380;
  const boundTooltipFactories = new WeakMap();
  let pendingShowTimer = null;
  let pendingTooltipElement = null;
  let currentTooltipElement = null;
  let lastPointerPosition = null;

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  const messageHighlightTerms = createLogHighlightTerms({
    monsters,
    monsterNames,
    itemNames,
  });

  function formatLogMessage(messageText) {
    const matches = collectLogHighlights(messageText, messageHighlightTerms);
    if (!matches.length) {
      return escapeHtml(messageText);
    }

    let html = "";
    let cursor = 0;

    matches.forEach((match) => {
      if (cursor < match.start) {
        html += escapeHtml(messageText.slice(cursor, match.start));
      }
      html += `<span class="${match.className}">${escapeHtml(messageText.slice(match.start, match.end))}</span>`;
      cursor = match.end;
    });

    if (cursor < messageText.length) {
      html += escapeHtml(messageText.slice(cursor));
    }

    return html;
  }

  function buildPlayerCombatState() {
    const state = getState();
    const weapon = getCombatWeapon(state.player);
    const offHand = getOffHand(state.player);

    return {
      state,
      weapon,
      offHand,
      derived: getActorDerivedStats(state.player),
      combat: getActorCombatSnapshot(state.player, {
        weapon,
        clamp,
        minCritChance: MIN_CRIT_CHANCE,
        maxCritChance: MAX_CRIT_CHANCE,
        distance: 1,
        floorNumber: state.floor ?? 1,
      }),
      blockChance: getActorBlockChance(state.player, offHand, clamp),
    };
  }

  function getPlayerCombatSummary() {
    const { state, combat, blockChance } = buildPlayerCombatState();
    const playerMaxHp = getActorDerivedMaxHp(state.player);

    return {
      hp: `${state.player.hp}/${playerMaxHp}`,
      level: String(state.player.level),
      damage: String(combat.baseDamage),
      totalDamage: String(combat.baseDamage),
      hit: String(combat.hitValue),
      totalHit: String(combat.hitValue),
      crit: `${combat.critChance}%`,
      totalCrit: `${combat.critChance}%`,
      block: `${blockChance}%`,
      totalBlock: `${blockChance}%`,
    };
  }

  function getTopbarTooltipContent() {
    const {
      state,
      weapon,
      offHand,
      derived,
      combat,
      blockChance,
    } = buildPlayerCombatState();
    const activeStatusEffects = getActorStatusDisplay(state.player)
      .map((effect) => `${effect.label} ${effect.duration}`)
      .join(", ");
    const playerMaxHp = getActorDerivedMaxHp(state.player);
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
          `Aktuell ${state.player.hp}/${playerMaxHp}`,
          "Wenn das auf 0 faellt, endet das Spiel.",
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
          `Staerke ${derived.final.strength} + Waffenschaden ${weapon.damage}`,
          weaponStyleDetail,
          `Ergibt aktuell ${combat.baseDamage} Schaden pro Treffer vor Krits.`,
        ].filter(Boolean),
      },
      hit: {
        title: "Trefferwert",
        lines: [
          `Praezision ${derived.final.precision} x 2 + Waffenbonus ${weapon.hitBonus >= 0 ? "+" : ""}${weapon.hitBonus}`,
          (weapon.meleePenaltyHit ?? 0) < 0 ? `Im Nahkampf faellt zusaetzlich ${Math.abs(weapon.meleePenaltyHit)} Treffer an.` : null,
          activeStatusEffects ? `Aktive Effekte: ${activeStatusEffects}` : null,
          `Ergibt aktuell Trefferwert ${combat.hitValue}.`,
        ].filter(Boolean),
      },
      crit: {
        title: "Krit-Chance",
        lines: [
          `Praezision ${derived.final.precision} + Waffenkrit ${weapon.critBonus >= 0 ? "+" : ""}${weapon.critBonus}`,
          (weapon.lightBonus ?? 0) > 0 ? `Diese Waffe erhoeht zugleich deine Sichtweite um ${weapon.lightBonus}.` : null,
          `Ergibt aktuell ${combat.critChance}% Krit-Chance.`,
        ].filter(Boolean),
      },
      block: {
        title: "Blockchance",
        lines: offHand?.subtype === "shield"
          ? [
              `Schild ${offHand.blockChance}% + Nerven ${derived.final.nerves}${(state.player.shieldBlockBonus ?? 0) ? ` + Klassenbonus ${state.player.shieldBlockBonus}` : ""}`,
              `Ergibt aktuell ${blockChance}% Blockchance mit ${offHand.blockValue} Blockwert.`,
            ]
          : [
              "Kein Schild in der Nebenhand.",
              "Mit Schild wuerdest du hier deine Blockchance sehen.",
            ],
      },
    };
  }

  function rememberPointerPosition(event) {
    if (!event || typeof event.clientX !== "number" || typeof event.clientY !== "number") {
      return;
    }

    lastPointerPosition = {
      clientX: event.clientX,
      clientY: event.clientY,
    };
  }

  function getLastPointerEvent() {
    if (!lastPointerPosition) {
      return null;
    }

    return {
      clientX: lastPointerPosition.clientX,
      clientY: lastPointerPosition.clientY,
    };
  }

  function clearPendingTooltip() {
    if (pendingShowTimer !== null) {
      window.clearTimeout(pendingShowTimer);
      pendingShowTimer = null;
    }

    pendingTooltipElement = null;
  }

  function getTooltipBoundElementAtPointer() {
    if (!lastPointerPosition) {
      return null;
    }

    const hoveredElement = document.elementFromPoint(
      lastPointerPosition.clientX,
      lastPointerPosition.clientY,
    );

    return hoveredElement?.closest?.("[data-tooltip-bound='true']") ?? null;
  }

  function showTooltip(tooltip, event, options = {}) {
    rememberPointerPosition(event);
    clearPendingTooltip();
    currentTooltipElement = options.anchorElement ?? null;
    document.body.classList.add("tooltip-open");
    hoverTooltipElement.innerHTML = `
      ${(tooltip.imageUrl || tooltip.secondaryImageUrl) ? `
        <div class="tooltip-art-row">
          ${tooltip.imageUrl ? `<div class="tooltip-art ${tooltip.imageClass ?? ""}" style="background-image: url('${tooltip.imageUrl}')"></div>` : ""}
          ${tooltip.secondaryImageUrl ? `<div class="${tooltip.secondaryImageClass ?? "tooltip-art tooltip-art-secondary"}" style="background-image: url('${tooltip.secondaryImageUrl}')" aria-label="${escapeHtml(tooltip.secondaryImageLabel ?? "")}"></div>` : ""}
        </div>
      ` : ""}
      <p class="tooltip-title">${tooltip.title}</p>
      <p class="tooltip-copy">${tooltip.lines.join("<br>")}</p>
    `;
    hoverTooltipElement.classList.remove("hidden");
    hoverTooltipElement.setAttribute("aria-hidden", "false");
    moveTooltip(event);
  }

  function moveTooltip(event) {
    rememberPointerPosition(event);

    if (!event || hoverTooltipElement.classList.contains("hidden")) {
      return;
    }

    const offsetX = 30;
    const offsetY = 28;
    const viewportPadding = 16;
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
    clearPendingTooltip();
    currentTooltipElement = null;
    document.body.classList.remove("tooltip-open");
    hoverTooltipElement.classList.add("hidden");
    hoverTooltipElement.setAttribute("aria-hidden", "true");
    hoverTooltipElement.innerHTML = "";
  }

  function scheduleTooltip(element, tooltipFactory, event) {
    rememberPointerPosition(event);
    clearPendingTooltip();
    pendingTooltipElement = element;
    pendingShowTimer = window.setTimeout(() => {
      pendingShowTimer = null;

      if (pendingTooltipElement !== element) {
        return;
      }

      const hoveredElement = getTooltipBoundElementAtPointer();
      pendingTooltipElement = null;
      if (hoveredElement !== element) {
        if (currentTooltipElement === element) {
          hideTooltip();
        }
        return;
      }

      const tooltip = tooltipFactory?.();
      if (!tooltip) {
        hideTooltip();
        return;
      }

      showTooltip(tooltip, getLastPointerEvent() ?? event, { anchorElement: element });
    }, TOOLTIP_SHOW_DELAY_MS);
  }

  function bindTooltip(element, tooltipFactory) {
    if (!element) {
      return;
    }

    boundTooltipFactories.set(element, tooltipFactory);
    element.dataset.tooltipBound = "true";

    element.addEventListener("mouseenter", (event) => {
      rememberPointerPosition(event);
      scheduleTooltip(element, tooltipFactory, event);
    });
    element.addEventListener("mousemove", (event) => {
      rememberPointerPosition(event);
      if (currentTooltipElement === element) {
        moveTooltip(event);
        return;
      }

      scheduleTooltip(element, tooltipFactory, event);
    });
    element.addEventListener("mouseleave", () => {
      if (pendingTooltipElement === element || currentTooltipElement === element) {
        hideTooltip();
      }
    });
  }

  function syncTooltipTarget() {
    const hoveredElement = getTooltipBoundElementAtPointer();
    const tooltipFactory = hoveredElement ? boundTooltipFactories.get(hoveredElement) : null;

    if (!hoveredElement || !tooltipFactory) {
      hideTooltip();
      return;
    }

    if (currentTooltipElement === hoveredElement) {
      moveTooltip(getLastPointerEvent());
      return;
    }

    hideTooltip();
  }

  return {
    formatLogMessage,
    getPlayerCombatSummary,
    getTopbarTooltipContent,
    showTooltip,
    moveTooltip,
    hideTooltip,
    bindTooltip,
    syncTooltipTarget,
  };
}
