import { formatStudioLabel, getStudioArchetypeLabel } from '../studio-theme.mjs';
import { getFoodSatietyEstimate } from '../nutrition.mjs';
import { deriveStudioGenerationSeed } from '../utils/seeded-random.mjs';
import { formatSignedPercent, getActorSpeedState } from './actor-speed.mjs';
import { getActorDerivedStat } from './derived-actor-stats.mjs';
import { buildStudioGenerationReport, formatStudioGenerationReportText } from './studio-generation-report.mjs';

export function createModalController(context) {
  const {
    CHOICE_ACTIONS,
    STAIR_ACTIONS,
    getState,
    createSheetRow,
    updateSavegameControls,
    getCurrentFloorState,
    ensureFloorExists,
    returnToStartScreen,
    renderSelf,
    addMessage,
    moveToFloor,
    endTurn,
    resolvePotionChoice,
    renderEquipmentCompareHtml,
    choiceModalElement,
    choiceTitleElement,
    choiceTextElement,
    choiceDrinkButton,
    choiceStoreButton,
    choiceLeaveButton,
    containerLootModalElement,
    containerLootImageElement,
    containerLootTitleElement,
    containerLootSummaryElement,
    containerLootListElement,
    containerLootTakeSelectedButton,
    containerLootTakeAllButton,
    stairsModalElement,
    stairsTitleElement,
    stairsTextElement,
    stairsConfirmButton,
    stairsStayButton,
    deathModalElement,
    deathSummaryElement,
    debugInfoModalElement,
    debugAdvanceInputElement,
    debugInfoTextElement,
    debugInfoStatusElement,
    debugAdvanceTimeline,
    formatWeaponDisplayName,
    formatWeaponStats,
    formatOffHandStats,
  } = context;

  let debugAdvanceBudget = 100;

  function formatPosition(position) {
    if (!position || typeof position.x !== "number" || typeof position.y !== "number") {
      return "-";
    }

    return `${position.x}, ${position.y}`;
  }

  function formatTopologyPosition(position) {
    if (
      !position ||
      typeof position.x !== "number" ||
      typeof position.y !== "number" ||
      typeof position.z !== "number"
    ) {
      return "-";
    }

    return `${position.x}, ${position.y}, ${position.z}`;
  }

  function formatAnchorDetails(anchor) {
    if (!anchor) {
      return "-";
    }

    return [
      anchor.label ?? "Anker",
      `Implementierung: ${anchor.implementation ?? "-"}`,
      `Raumpunkt: ${formatPosition(anchor.position)}`,
      `Übergang: ${formatPosition(anchor.transitionPosition)}`,
      `Korridor: ${formatPosition(anchor.corridorPosition)}`,
      `Richtung: ${anchor.direction ?? "-"}`,
      `Stil: ${anchor.transitionStyle ?? "-"}`,
    ].join(" | ");
  }

  function normalizeTimelineValue(value, fallback = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return Math.max(0, Math.round(fallback) || 0);
    }

    return Math.max(0, Math.round(numeric));
  }

  function getAllFloorEntries(state) {
    return Object.entries(state.floors ?? {})
      .map(([floorNumber, floorState]) => ({
        floorNumber: Number(floorNumber),
        floorState,
      }))
      .filter((entry) => Number.isInteger(entry.floorNumber) && entry.floorState)
      .sort((left, right) => left.floorNumber - right.floorNumber);
  }

  function getActorFloorNumber(actor, state) {
    if (actor === state.player) {
      return state.floor;
    }

    for (const entry of getAllFloorEntries(state)) {
      if ((entry.floorState.enemies ?? []).includes(actor)) {
        return entry.floorNumber;
      }
    }

    return state.floor;
  }

  function getStableActorOrder(actor, state) {
    if (actor === state.player) {
      return -1;
    }

    const actorFloorNumber = getActorFloorNumber(actor, state);
    const floorState = state.floors?.[actorFloorNumber] ?? null;
    const enemyIndex = (floorState?.enemies ?? []).indexOf(actor);
    return actorFloorNumber * 10000 + (enemyIndex >= 0 ? enemyIndex : Number.MAX_SAFE_INTEGER);
  }

  function compareActorsForDebugOrder(left, right, state) {
    const timelineTime = normalizeTimelineValue(state.timelineTime, 0);
    const leftTime = normalizeTimelineValue(left?.nextActionTime, timelineTime);
    const rightTime = normalizeTimelineValue(right?.nextActionTime, timelineTime);
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    const leftReaction = getActorDerivedStat(left, 'reaction');
    const rightReaction = getActorDerivedStat(right, 'reaction');
    if (leftReaction !== rightReaction) {
      return rightReaction - leftReaction;
    }

    const leftIsPlayer = left === state.player;
    const rightIsPlayer = right === state.player;
    if (leftIsPlayer !== rightIsPlayer) {
      return leftIsPlayer ? -1 : 1;
    }

    return getStableActorOrder(left, state) - getStableActorOrder(right, state);
  }

  function getDebugTimelineActors(state) {
    return [
      state.player,
      ...getAllFloorEntries(state).flatMap((entry) => entry.floorState.enemies ?? []),
    ].filter((actor) => actor && actor.hp > 0);
  }

  function formatActorDebugLabel(actor, state) {
    if (actor === state.player) {
      return `Spieler | Floor ${state.floor}`;
    }

    const floorNumber = getActorFloorNumber(actor, state);
    const actorName = actor.name ?? actor.baseName ?? actor.id ?? 'Unbekannt';
    return `${actorName} | Floor ${floorNumber}`;
  }

  function buildTimelinePreviewLines(state, limit = 6) {
    const actors = getDebugTimelineActors(state)
      .sort((left, right) => compareActorsForDebugOrder(left, right, state))
      .slice(0, limit);

    if (!actors.length) {
      return ['Nächste Akteure: -'];
    }

    return [
      'Nächste Akteure:',
      ...actors.map((actor, index) => {
        const speedState = getActorSpeedState(actor);
        const nextActionTime = normalizeTimelineValue(actor?.nextActionTime, state.timelineTime);
        const reaction = getActorDerivedStat(actor, 'reaction');
        return `${index + 1}. ${formatActorDebugLabel(actor, state)} | Zeit ${nextActionTime} | Reaktion ${reaction} | Tempo ${speedState.category} (${formatSignedPercent(speedState.displayPercent)})`;
      }),
    ];
  }

  function normalizeDebugAdvanceBudget(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 100;
    }

    return Math.max(1, Math.round(numeric));
  }

  function syncDebugAdvanceInput() {
    if (debugAdvanceInputElement) {
      debugAdvanceInputElement.value = String(debugAdvanceBudget);
    }
  }

  function setDebugAdvanceBudget(value = 100) {
    debugAdvanceBudget = normalizeDebugAdvanceBudget(value);
    syncDebugAdvanceInput();
    return debugAdvanceBudget;
  }

  function readDebugAdvanceBudget() {
    if (!debugAdvanceInputElement) {
      return debugAdvanceBudget;
    }

    return setDebugAdvanceBudget(debugAdvanceInputElement.value);
  }

  function formatDebugAdvanceStatus(result, budget) {
    if (!result?.ok) {
      return 'Debug-Vorschub nicht verfügbar.';
    }

    const summary = `Debug-Vorschub: Weltzeit +${budget}, ${result.simulatedTurns} Akteurzüge simuliert.`;
    if (result.exhaustedGuard) {
      return `${summary} Guard-Limit erreicht.`;
    }

    return result.lastActorLabel
      ? `${summary} Letzter Akteur: ${result.lastActorLabel}.`
      : summary;
  }

  function buildDebugInfoText() {
    const state = getState();
    const floorState = getCurrentFloorState?.() ?? null;
    const topologyNode = state.runStudioTopology?.nodes?.[state.floor] ?? null;
    const generationSeed = floorState?.generationSeed ?? deriveStudioGenerationSeed(state.runSeed, state.floor);
    const studioReport = buildStudioGenerationReport(state, {
      studioCount: 10,
      ensureFloorExists,
    });
    const nextActor = getDebugTimelineActors(state)
      .sort((left, right) => compareActorsForDebugOrder(left, right, state))[0] ?? null;

    return [
      `Studio: ${state.floor}`,
      `Run-Seed: ${state.runSeed ?? "-"}`,
      `Studio-Seed: ${generationSeed ?? "-"}`,
      `Archetyp: ${getStudioArchetypeLabel(floorState?.studioArchetypeId) ?? floorState?.studioArchetypeId ?? "-"}`,
      `Layout: ${floorState?.layoutId ?? "-"}`,
      `Variante: ${floorState?.layoutVariant ?? "-"}`,
      `Layout-Fehlerpfad: ${floorState?.layoutFailureReason ?? "-"}`,
      `Gangbreite: ${floorState?.corridorWidth ?? "-"}`,
      `Spielerposition: ${formatPosition(getState().player)}`,
      `Eingangsanker: ${formatAnchorDetails(floorState?.entryAnchor)}`,
      `Ausgangsanker: ${formatAnchorDetails(floorState?.exitAnchor)}`,
      `Topologieposition: ${formatTopologyPosition(topologyNode?.position)}`,
      `Topologie Eingang: ${topologyNode?.entryDirection ?? "-"} | ${topologyNode?.entryTransitionStyle ?? "-"}`,
      `Topologie Ausgang: ${topologyNode?.exitDirection ?? "-"} | ${topologyNode?.exitTransitionStyle ?? "-"}`,
      `Topologie Eingangshinweis: ${formatPosition(topologyNode?.entryTransitionHint)}`,
      `Topologie Ausgangshinweis: ${formatPosition(topologyNode?.exitTransitionHint)}`,
      `Züge: ${state.turn ?? 0}`,
      `Weltzeit: ${normalizeTimelineValue(state.timelineTime, 0)}`,
      `Spieler-Zeitpunkt: ${normalizeTimelineValue(state.player?.nextActionTime, state.timelineTime)}`,
      `Nächster Akteur: ${nextActor ? formatActorDebugLabel(nextActor, state) : "-"}`,
      ...buildTimelinePreviewLines(state),
      '',
      formatStudioGenerationReportText(studioReport, {
        formatArchetypeLabel: getStudioArchetypeLabel,
      }),
    ].join("\n");
  }

  function syncDebugInfoContent(statusText = "Bereit zum Kopieren.") {
    syncDebugAdvanceInput();
    if (debugInfoTextElement) {
      debugInfoTextElement.value = buildDebugInfoText();
    }
    if (debugInfoStatusElement) {
      debugInfoStatusElement.textContent = statusText;
    }
  }

  function setDeathModalVisibility(visible) {
    deathModalElement.classList.toggle("hidden", !visible);
    deathModalElement.setAttribute("aria-hidden", String(!visible));
  }

  function closeTransientModals() {
    getState().pendingContainerLoot = null;
    setContainerLootModalVisibility(false);
    toggleInventory(false);
    toggleStudioTopology(false);
    toggleRunStats(false);
    toggleOptions(false);
    toggleSavegames(false);
    toggleHelp(false);
    toggleHighscores(false);
    toggleDebugInfo(false);
  }

  function showDeathModal(rank) {
    const state = getState();
    const currentFloor = state.floors?.[state.floor];
    const deathCopyElement = deathModalElement.querySelector(".modal-copy");
    const deathLead = `${state.player.name} ${state.deathCause ?? "verschwand im letzten Akt aus dem Bild."}`;
    deathSummaryElement.innerHTML = [
      `<div class="death-highlight"><strong>${deathLead}</strong></div>`,
      createSheetRow("Name", state.player.name),
      createSheetRow("Klasse", `Der ${state.player.classLabel ?? "Unbekannt"}`),
      createSheetRow("Level", state.player.level),
      createSheetRow("Gestorben in", formatStudioLabel(state.floor)),
      createSheetRow("Archetyp", getStudioArchetypeLabel(currentFloor?.studioArchetypeId) ?? "Unbekannt"),
      createSheetRow("Erreichtes Studio", formatStudioLabel(state.deepestFloor)),
      createSheetRow("Gegner besiegt", state.kills),
      createSheetRow("Schritte", state.turn),
      createSheetRow("Platz in den Final Scenes", rank ? `#${rank}` : "Außer Wertung"),
    ].join("");
    if (deathCopyElement) {
      deathCopyElement.textContent = "Den vollständigen Spielverlauf kannst du separat ansehen. Dieses Ende-Fenster bleibt bewusst kompakt.";
    }
    setDeathModalVisibility(true);
    updateSavegameControls("Kein Spielstand gefunden.");
  }

  function hideDeathModal() {
    setDeathModalVisibility(false);
  }

  function toggleInventory(forceOpen, section = null) {
    const state = getState();
    if (section === "items" || section === "hero") {
      state.preferences.inventoryView = section;
    }
    state.modals.inventoryOpen = forceOpen ?? !state.modals.inventoryOpen;
    if (state.modals.inventoryOpen) {
      state.pendingContainerLoot = null;
      setContainerLootModalVisibility(false);
      state.modals.studioTopologyOpen = false;
      state.modals.debugInfoOpen = false;
    }
    renderSelf();
  }

  function toggleStudioTopology(forceOpen) {
    const state = getState();
    state.modals.studioTopologyOpen = forceOpen ?? !state.modals.studioTopologyOpen;
    if (state.modals.studioTopologyOpen) {
      state.pendingContainerLoot = null;
      setContainerLootModalVisibility(false);
      state.modals.inventoryOpen = false;
      state.modals.runStatsOpen = false;
      state.modals.optionsOpen = false;
      state.modals.savegamesOpen = false;
      state.modals.helpOpen = false;
      state.modals.highscoresOpen = false;
      state.modals.debugInfoOpen = false;
    }
    renderSelf();
  }

  function toggleRunStats(forceOpen) {
    const state = getState();
    state.modals.runStatsOpen = forceOpen ?? !state.modals.runStatsOpen;
    if (state.modals.runStatsOpen) {
      state.pendingContainerLoot = null;
      setContainerLootModalVisibility(false);
      state.modals.savegamesOpen = false;
      state.modals.studioTopologyOpen = false;
      state.modals.debugInfoOpen = false;
    }
    if (!state.modals.runStatsOpen && state.gameOver && deathModalElement.classList.contains("hidden")) {
      setDeathModalVisibility(true);
    }
    renderSelf();
  }

  function toggleOptions(forceOpen) {
    const state = getState();
    state.modals.optionsOpen = forceOpen ?? !state.modals.optionsOpen;
    if (state.modals.optionsOpen) {
      state.pendingContainerLoot = null;
      setContainerLootModalVisibility(false);
      state.modals.savegamesOpen = false;
      state.modals.studioTopologyOpen = false;
      state.modals.debugInfoOpen = false;
    }
    renderSelf();
  }

  function toggleSavegames(forceOpen) {
    const state = getState();
    state.modals.savegamesOpen = forceOpen ?? !state.modals.savegamesOpen;
    if (state.modals.savegamesOpen) {
      state.pendingContainerLoot = null;
      setContainerLootModalVisibility(false);
      state.modals.inventoryOpen = false;
      state.modals.runStatsOpen = false;
      state.modals.optionsOpen = false;
      state.modals.helpOpen = false;
      state.modals.highscoresOpen = false;
      state.modals.studioTopologyOpen = false;
      state.modals.debugInfoOpen = false;
    }
    renderSelf();
  }

  function toggleHelp(forceOpen) {
    const state = getState();
    state.modals.helpOpen = forceOpen ?? !state.modals.helpOpen;
    if (state.modals.helpOpen) {
      state.pendingContainerLoot = null;
      setContainerLootModalVisibility(false);
      state.modals.savegamesOpen = false;
      state.modals.studioTopologyOpen = false;
      state.modals.debugInfoOpen = false;
    }
    renderSelf();
  }

  function toggleHighscores(forceOpen) {
    const state = getState();
    state.modals.highscoresOpen = forceOpen ?? !state.modals.highscoresOpen;
    if (state.modals.highscoresOpen) {
      state.pendingContainerLoot = null;
      setContainerLootModalVisibility(false);
      state.modals.savegamesOpen = false;
      state.modals.studioTopologyOpen = false;
      state.modals.debugInfoOpen = false;
    }
    renderSelf();
  }

  function toggleDebugInfo(forceOpen) {
    const state = getState();
    const floorState = getCurrentFloorState?.() ?? null;
    const shouldOpen = forceOpen ?? !state.modals.debugInfoOpen;

    if (shouldOpen && !floorState?.debugReveal) {
      return;
    }

    state.modals.debugInfoOpen = shouldOpen;
    if (state.modals.debugInfoOpen) {
      state.pendingContainerLoot = null;
      setContainerLootModalVisibility(false);
      state.modals.inventoryOpen = false;
      state.modals.studioTopologyOpen = false;
      state.modals.runStatsOpen = false;
      state.modals.optionsOpen = false;
      state.modals.savegamesOpen = false;
      state.modals.helpOpen = false;
      state.modals.highscoresOpen = false;
      syncDebugAdvanceInput();
      syncDebugInfoContent();
    }
    renderSelf();
  }

  function triggerDebugAdvance(overrideBudget = null) {
    const floorState = getCurrentFloorState?.() ?? null;
    if (!floorState?.debugReveal) {
      return {
        ok: false,
        reason: 'debug-reveal-required',
      };
    }

    const budget = overrideBudget == null
      ? readDebugAdvanceBudget()
      : setDebugAdvanceBudget(overrideBudget);
    const result = debugAdvanceTimeline?.(budget) ?? { ok: false };
    const statusText = result.ok
      ? formatDebugAdvanceStatus(result, budget)
      : 'Debug-Vorschub konnte nicht ausgeführt werden.';

    if (getState().modals.debugInfoOpen) {
      syncDebugInfoContent(statusText);
    } else if (result.ok) {
      addMessage(statusText, 'important');
    } else {
      addMessage(statusText, 'danger');
    }

    return {
      ...result,
      budget,
    };
  }

  async function copyDebugInfo() {
    const text = buildDebugInfoText();
    let copied = false;

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch {
        copied = false;
      }
    }

    if (!copied && debugInfoTextElement) {
      debugInfoTextElement.focus({ preventScroll: true });
      debugInfoTextElement.select();
      debugInfoTextElement.setSelectionRange(0, text.length);
      try {
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      }
    }

    syncDebugInfoContent(copied ? "Debugdaten in die Zwischenablage kopiert." : "Kopieren fehlgeschlagen. Der Text bleibt markierbar.");
    if (debugInfoTextElement) {
      debugInfoTextElement.focus({ preventScroll: true });
      debugInfoTextElement.select();
    }
  }

  function refreshDebugInfoModal() {
    const state = getState();
    if (!state.modals.debugInfoOpen || !debugInfoModalElement) {
      return;
    }

    syncDebugInfoContent(debugInfoStatusElement?.textContent || "Bereit zum Kopieren.");
  }

  function showChoiceModal(config) {
    const state = getState();
    const allowedActions = CHOICE_ACTIONS[config.kind] ?? [];
    const selectedAction = allowedActions.includes(config.selectedAction)
      ? config.selectedAction
      : allowedActions[0];
    state.pendingChoice = {
      ...config,
      selectedAction,
    };
    choiceTitleElement.textContent = config.title;
    if (config.comparison) {
      choiceTextElement.innerHTML = renderEquipmentCompareHtml(config.comparison);
    } else if (config.htmlText) {
      choiceTextElement.innerHTML = config.htmlText;
    } else {
      choiceTextElement.textContent = config.text;
    }
    choiceDrinkButton.textContent = config.labels[0];
    choiceStoreButton.textContent = config.labels[1];
    choiceLeaveButton.textContent = config.labels[2];
    choiceModalElement.classList.remove("hidden");
    choiceModalElement.setAttribute("aria-hidden", "false");
    updatePotionChoiceSelection();
  }

  function hideChoiceModal() {
    const state = getState();
    state.pendingChoice = null;
    choiceModalElement.classList.add("hidden");
    choiceModalElement.setAttribute("aria-hidden", "true");
  }

  function getChestContents(chest) {
    if (!chest) {
      return [];
    }

    if (Array.isArray(chest.contents)) {
      return chest.contents.filter(Boolean);
    }

    return chest.content ? [chest.content] : [];
  }

  function getContainerImageUrl(chest) {
    return chest?.containerAssetId
      ? `./assets/containers/${chest.containerAssetId}.svg`
      : "./assets/fallbacks/chest.svg";
  }

  function getContainerEntryTitle(entry) {
    if (!entry?.item) {
      return "Unbekannter Gegenstand";
    }

    return entry.type === "weapon"
      ? formatWeaponDisplayName(entry.item)
      : entry.item.name ?? "Unbekannter Gegenstand";
  }

  function getContainerEntryTypeLabel(entry) {
    if (entry?.type === "weapon") {
      return "Waffe";
    }
    if (entry?.type === "offhand") {
      return "Schild";
    }
    if (entry?.type === "food") {
      return "Essen";
    }
    if (entry?.type === "consumable") {
      return entry.item?.effectFamily ? "Verbrauchbar" : "Heilung";
    }
    return "Beute";
  }

  function getContainerEntryDetail(entry) {
    if (!entry?.item) {
      return "";
    }

    if (entry.type === "weapon") {
      return [formatWeaponStats(entry.item), entry.item.description].filter(Boolean).join(" | ");
    }

    if (entry.type === "offhand") {
      return [formatOffHandStats(entry.item), entry.item.description].filter(Boolean).join(" | ");
    }

    if (entry.type === "food") {
      return [getFoodSatietyEstimate(entry.item.nutritionRestore), entry.item.description].filter(Boolean).join(" | ");
    }

    return entry.item.effectDescriptionDe ?? entry.item.description ?? "";
  }

  function setContainerLootModalVisibility(visible) {
    if (!containerLootModalElement) {
      return;
    }

    containerLootModalElement.classList.toggle("hidden", !visible);
    containerLootModalElement.setAttribute("aria-hidden", String(!visible));
  }

  function refreshContainerLootModal() {
    const state = getState();
    const pending = state.pendingContainerLoot;
    if (!pending || !containerLootListElement) {
      setContainerLootModalVisibility(false);
      return;
    }

    const chest = getCurrentFloorState()?.chests?.[pending.chestIndex] ?? null;
    if (!chest) {
      state.pendingContainerLoot = null;
      setContainerLootModalVisibility(false);
      return;
    }

    const contents = getChestContents(chest);
    const selectedIndices = new Set(pending.selectedItemIndices ?? []);

    if (containerLootImageElement) {
      containerLootImageElement.src = getContainerImageUrl(chest);
      containerLootImageElement.alt = chest.containerName ?? "Container";
    }
    if (containerLootTitleElement) {
      containerLootTitleElement.textContent = chest.containerName ?? "Requisitenkiste";
    }
    if (containerLootSummaryElement) {
      containerLootSummaryElement.textContent = contents.length > 0
        ? `${contents.length} Gegenstand${contents.length === 1 ? "" : "e"} verfügbar. Wähle aus, was du mitnehmen willst.`
        : "Diese Kiste ist leer.";
    }

    containerLootListElement.innerHTML = "";

    if (!contents.length) {
      containerLootListElement.innerHTML = '<div class="inventory-empty">Diese Kiste ist leer.</div>';
    } else {
      contents.forEach((entry, index) => {
        const rowElement = document.createElement("article");
        rowElement.className = "inventory-item container-loot-item";
        if (selectedIndices.has(index)) {
          rowElement.classList.add("is-selected");
        }
        rowElement.innerHTML = `
          <div class="inventory-meta">
            <strong>${getContainerEntryTitle(entry)}</strong>
            <span>${getContainerEntryTypeLabel(entry)}</span>
            <span>${getContainerEntryDetail(entry)}</span>
          </div>
        `;

        const toggleButton = document.createElement("button");
        toggleButton.className = "item-btn";
        toggleButton.type = "button";
        toggleButton.textContent = selectedIndices.has(index) ? "Abwählen" : "Wählen";
        toggleButton.addEventListener("click", () => {
          state.pendingContainerLoot = {
            ...pending,
            selectedItemIndices: selectedIndices.has(index)
              ? [...selectedIndices].filter((value) => value !== index)
              : [...selectedIndices, index].sort((left, right) => left - right),
          };
          renderSelf();
        });

        rowElement.appendChild(toggleButton);
        containerLootListElement.appendChild(rowElement);
      });
    }

    if (containerLootTakeSelectedButton) {
      containerLootTakeSelectedButton.disabled = selectedIndices.size === 0;
    }
    if (containerLootTakeAllButton) {
      containerLootTakeAllButton.disabled = contents.length === 0;
    }

    setContainerLootModalVisibility(true);
  }

  function showStairChoice(config) {
    const state = getState();
    state.pendingStairChoice = {
      ...config,
      selectedAction: config.selectedAction ?? "stay",
    };
    stairsTitleElement.textContent = config.title;
    stairsTextElement.textContent = config.text;
    stairsConfirmButton.textContent = config.confirmLabel ?? "Studio wechseln";
    stairsStayButton.textContent = config.stayLabel ?? "Hier bleiben";
    stairsModalElement.classList.remove("hidden");
    stairsModalElement.setAttribute("aria-hidden", "false");
    updateStairChoiceSelection();
  }

  function hideStairChoice() {
    const state = getState();
    state.pendingStairChoice = null;
    stairsModalElement.classList.add("hidden");
    stairsModalElement.setAttribute("aria-hidden", "true");
  }

  function updatePotionChoiceSelection() {
    const state = getState();
    const selected = state?.pendingChoice?.selectedAction;
    choiceDrinkButton.classList.toggle("selected", selected === "drink" || selected === "use" || selected === "equip" || selected === "eat");
    choiceStoreButton.classList.toggle("selected", selected === "store");
    choiceLeaveButton.classList.toggle("selected", selected === "leave");
  }

  function updateStairChoiceSelection() {
    const state = getState();
    const selected = state?.pendingStairChoice?.selectedAction;
    stairsConfirmButton.classList.toggle("selected", selected === "change-floor");
    stairsStayButton.classList.toggle("selected", selected === "stay");
  }

  function cyclePotionChoice(direction) {
    const state = getState();
    if (!state.pendingChoice) {
      return;
    }

    const actions = CHOICE_ACTIONS[state.pendingChoice.kind];
    const currentIndex = actions.indexOf(state.pendingChoice.selectedAction);
    const nextIndex = (currentIndex + direction + actions.length) % actions.length;
    state.pendingChoice.selectedAction = actions[nextIndex];
    updatePotionChoiceSelection();
  }

  function cycleStairChoice(direction) {
    const state = getState();
    if (!state.pendingStairChoice) {
      return;
    }

    const currentIndex = STAIR_ACTIONS.indexOf(state.pendingStairChoice.selectedAction);
    const nextIndex = (currentIndex + direction + STAIR_ACTIONS.length) % STAIR_ACTIONS.length;
    state.pendingStairChoice.selectedAction = STAIR_ACTIONS[nextIndex];
    updateStairChoiceSelection();
  }

  function resolveChoiceBySlot(slotIndex) {
    const state = getState();
    if (!state.pendingChoice) {
      return;
    }

    const actions = CHOICE_ACTIONS[state.pendingChoice.kind];
    const action = actions?.[slotIndex];
    if (!action) {
      return;
    }

    resolvePotionChoice(action);
  }

  function resolveStairChoice(action) {
    const state = getState();
    if (!state.pendingStairChoice) {
      return;
    }

    const pending = state.pendingStairChoice;
    hideStairChoice();

    if (action === "change-floor") {
      const changedFloor = moveToFloor(pending.direction);
      if (changedFloor) {
        endTurn({ actionType: "move", actionCost: 150 });
        return;
      }

      addMessage("Die Treppe führt hier gerade nirgendwohin.");
      renderSelf();
      return;
    }

    addMessage(
      pending.direction > 0
        ? "Du bleibst auf der Treppe stehen, ohne hinabzusteigen."
        : "Du bleibst auf der Treppe stehen, ohne hinaufzusteigen.",
    );
    renderSelf();
  }

  function restartRun() {
    hideChoiceModal();
    hideStairChoice();
    closeTransientModals();
    hideDeathModal();
    returnToStartScreen({ openStartModal: true, clearSavedGame: false });
  }

  function confirmRestartRun() {
    restartRun();
  }

  function leaveToStartScreen() {
    hideChoiceModal();
    hideStairChoice();
    closeTransientModals();
    hideDeathModal();
    returnToStartScreen({ openStartModal: false, clearSavedGame: false });
  }

  function openRunStatsFromDeath() {
    hideDeathModal();
    toggleRunStats(true);
  }

  return {
    showDeathModal,
    hideDeathModal,
    restartRun,
    confirmRestartRun,
    leaveToStartScreen,
    openRunStatsFromDeath,
    showChoiceModal,
    hideChoiceModal,
    refreshContainerLootModal,
    showStairChoice,
    hideStairChoice,
    updatePotionChoiceSelection,
    cyclePotionChoice,
    cycleStairChoice,
    resolveChoiceBySlot,
    resolveStairChoice,
    setDebugAdvanceBudget,
    triggerDebugAdvance,
    toggleInventory,
    toggleRunStats,
    toggleOptions,
    toggleSavegames,
    toggleHelp,
    toggleHighscores,
    toggleStudioTopology,
    toggleDebugInfo,
    copyDebugInfo,
    refreshDebugInfoModal,
  };
}
