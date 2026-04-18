import { formatStudioOrigin } from '../studio-theme.mjs';
import { getFoodSatietyEstimate } from '../nutrition.mjs';
import { getActorDerivedMaxHp } from '../application/derived-actor-stats.mjs';
import {
  getConsumableEffectLabel,
  getHealingTypeLabel,
  isFoodConsumable,
  isHealingConsumable,
} from '../content/catalogs/consumables.mjs';
import { getEffectStateLabel, getWeaponEffectDefinition } from '../content/catalogs/weapon-effects.mjs';
import { getWeaponRuntimeEffects } from '../weapon-runtime-effects.mjs';

export function createInventoryView(context) {
  const {
    inventoryListElement,
    heroSheetElement,
    inventoryFilterButtons = [],
    getState,
    getMainHand,
    getOffHand,
    formatWeaponDisplayName,
    formatWeaponStats,
    formatOffHandStats,
    getHungerStateLabel,
    formatRarityLabel,
    getItemModifierSummary,
    useInventoryItem,
    getItemRarityClass,
    getInventoryIconAssetUrl,
  } = context;

  function getInventoryItemKind(item) {
    if (isHealingConsumable(item)) {
      return 'potion';
    }
    if (isFoodConsumable(item)) {
      return 'food';
    }
    return item?.type ?? 'unknown';
  }

  function getInventoryItemIcon(item) {
    const kind = getInventoryItemKind(item);
    if (kind === 'weapon') {
      return item.handedness === 'two-handed' ? '2H' : '1H';
    }
    if (kind === 'offhand') {
      return '[]';
    }
    if (kind === 'potion') {
      return '!';
    }
    if (kind === 'key') {
      return 'K';
    }
    if (kind === 'food') {
      return 'Fd';
    }
    if (kind === 'consumable') {
      return 'C';
    }
    return '?';
  }

  function getInventoryItemTypeOrder(item) {
    const order = {
      weapon: 0,
      offhand: 1,
      potion: 2,
      consumable: 3,
      food: 4,
      key: 5,
    };
    return order[getInventoryItemKind(item)] ?? 99;
  }

  function getInventorySectionLabel(type) {
    const labels = {
      weapon: 'Waffen',
      offhand: 'Schilde',
      potion: 'Heilung',
      consumable: 'Verbrauchbar',
      food: 'Essen',
      key: 'Schlüssel',
    };
    return labels[type] ?? 'Sonstiges';
  }

  function applyInventoryIcon(iconElement, item) {
    if (!iconElement) {
      return;
    }

    const iconUrl = getInventoryIconAssetUrl(item);
    if (!iconUrl) {
      return;
    }

    iconElement.textContent = '';
    iconElement.style.backgroundImage = `url("${iconUrl}")`;
    iconElement.style.backgroundRepeat = 'no-repeat';
    iconElement.style.backgroundPosition = 'center';
    iconElement.style.backgroundSize = '28px 28px';
    iconElement.style.color = 'transparent';
  }

  function serializeWeaponEffects(item) {
    return getWeaponRuntimeEffects(item)
      .map((effect) => [
        effect.type ?? '',
        effect.trigger ?? '',
        effect.tier ?? '',
        effect.source ?? '',
        effect.value ?? '',
        effect.procChance ?? '',
        effect.duration ?? '',
        effect.dotDamage ?? '',
        effect.penalty ?? '',
      ].join(':'))
      .join('|');
  }

  function serializeWeaponNumericMods(item) {
    return (item.numericMods ?? [])
      .map((modifier) => [
        modifier.id ?? '',
        modifier.stat ?? '',
        modifier.amount ?? '',
        modifier.label ?? '',
        modifier.namePrefix ?? '',
        modifier.nameSuffix ?? '',
      ].join(':'))
      .join('|');
  }

  function serializeShieldModifiers(item) {
    return (item.modifiers ?? [])
      .map((modifier) => [
        modifier.id ?? '',
        modifier.affix ?? '',
        modifier.summary ?? '',
      ].join(':'))
      .join('|');
  }

  function buildInventoryGroupKey(item) {
    const kind = getInventoryItemKind(item);
    if (kind === 'weapon') {
      return [
        item.type,
        item.id ?? '',
        item.name ?? '',
        item.rarity ?? 'common',
        (item.modifierIds ?? []).join(','),
        item.damage ?? '',
        item.hitBonus ?? '',
        item.critBonus ?? '',
        item.range ?? '',
        item.meleePenaltyHit ?? '',
        item.lightBonus ?? '',
        item.attackMode ?? '',
        item.handedness ?? '',
        serializeWeaponNumericMods(item),
        serializeWeaponEffects(item),
      ].join(':');
    }

    if (kind === 'offhand') {
      return [
        item.type,
        item.id ?? '',
        item.name ?? '',
        item.rarity ?? 'common',
        (item.modifierIds ?? []).join(','),
        item.blockChance ?? '',
        item.blockValue ?? '',
        serializeShieldModifiers(item),
      ].join(':');
    }

    if (kind === 'food') {
      return `${kind}:${item.id}:${item.nutritionRestore}`;
    }

    if (kind === 'potion') {
      return `${kind}:${item.familyId ?? item.family_id ?? item.effectFamily ?? item.id ?? item.name}`;
    }

    return `${kind}:${item.id ?? item.name}`;
  }

  function getItemOriginLabel(item) {
    if (!Number.isFinite(item?.floorNumber)) {
      return null;
    }
    return formatStudioOrigin(item.floorNumber);
  }

  function formatStatusSummary(actor) {
    const effects = [
      ...(actor?.statusEffects ?? []),
      ...(actor?.activeConsumableBuffs ?? []).map((buff) => ({
        type: buff.effectFamily,
        duration: buff.remainingTurns,
        label: buff.label ?? getConsumableEffectLabel(buff.effectFamily),
      })),
    ];
    if (!effects.length) {
      return 'Keine';
    }

    return effects.map((effect) => {
      const label = effect.label
        ?? getEffectStateLabel(effect.type)
        ?? getWeaponEffectDefinition(effect.type)?.label
        ?? getConsumableEffectLabel(effect.type)
        ?? effect.type
        ?? 'Effekt';
      return `${label} ${effect.duration ?? 0}`;
    }).join(' | ');
  }

  function createHeroStatCard(label, value, extraClass = '') {
    const className = ['inventory-hero-stat', extraClass].filter(Boolean).join(' ');
    return `
      <div class="${className}">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `;
  }

  function createHeroSlotCard(label, title, detail, slotState = '') {
    return `
      <article class="inventory-hero-slot ${slotState}">
        <span>${label}</span>
        <strong>${title}</strong>
        <p>${detail}</p>
      </article>
    `;
  }

  function renderHeroSheet(state) {
    if (!heroSheetElement) {
      return;
    }

    const mainHand = getMainHand(state.player);
    const offHand = getOffHand(state.player);
    const statusSummary = formatStatusSummary(state.player);
    const hungerLabel = getHungerStateLabel(state.player.hungerState);
    const playerMaxHp = getActorDerivedMaxHp(state.player);
    const xpLabel = state.player.xpToNext > 0
      ? `${state.player.xp} / ${state.player.xpToNext}`
      : `${state.player.xp}`;

    heroSheetElement.innerHTML = [
      '<div class="inventory-hero-summary">',
      createHeroStatCard('Name', state.player.name),
      createHeroStatCard('Klasse', state.player.classLabel ?? 'Unbekannt'),
      createHeroStatCard('Level', state.player.level ?? 1),
      createHeroStatCard('Leben', `${state.player.hp}/${playerMaxHp}`),
      createHeroStatCard('Hunger', hungerLabel),
      createHeroStatCard('Status', statusSummary, statusSummary === 'Keine' ? 'is-muted' : ''),
      createHeroStatCard('Erfahrung', xpLabel),
      '</div>',
      '<div class="inventory-hero-loadout">',
      createHeroSlotCard('Haupthand', formatWeaponDisplayName(mainHand), formatWeaponStats(mainHand)),
      createHeroSlotCard(
        'Nebenhand',
        offHand ? offHand.name : 'Leer',
        offHand ? formatOffHandStats(offHand) : 'Zurzeit nichts ausgerüstet.',
        offHand ? '' : 'is-empty',
      ),
      createHeroSlotCard(
        'Weitere Slots',
        'Reserviert für Ausbau',
        'Hier können später Kleidung, Ringe oder andere feste Ausrüstungsplätze landen.',
        'is-muted',
      ),
      '</div>',
    ].join('');
  }

  function getDetailLine(item) {
    const originLine = getItemOriginLabel(item);
    const kind = getInventoryItemKind(item);
    if (kind === 'weapon') {
      return [
        formatRarityLabel(item.rarity ?? 'common'),
        item.source,
        originLine,
        `Mods: ${getItemModifierSummary(item)}`,
        `${item.attackMode === 'ranged' && (item.range ?? 1) > 1 ? `Fernkampf ${item.range}` : 'Nahkampf'}${(item.meleePenaltyHit ?? 0) < 0 ? ` | Nahkampf ${item.meleePenaltyHit}` : ''}${(item.lightBonus ?? 0) > 0 ? ` | Licht +${item.lightBonus}` : ''}`,
        item.description,
      ].filter(Boolean).join(' | ');
    }

    if (kind === 'offhand') {
      return [
        formatRarityLabel(item.rarity ?? 'common'),
        item.source,
        originLine,
        item.modifiers?.length ? `Mods: ${getItemModifierSummary(item)}` : null,
        item.description,
      ].filter(Boolean).join(' | ');
    }

    if (kind === 'key') {
      return item.description;
    }

    if (kind === 'food') {
      return `${getFoodSatietyEstimate(item.nutritionRestore)} | ${item.description}`;
    }

    if (kind === 'potion') {
      return [
        getHealingTypeLabel(item.healType),
        item.effectDescriptionDe ?? item.description,
      ].filter(Boolean).join(' | ');
    }

    if (kind === 'consumable') {
      return [
        `Tier ${item.tier ?? 1}`,
        item.theme ? `Thema: ${item.theme}` : null,
        item.description,
      ].filter(Boolean).join(' | ');
    }

    return item.description;
  }

  function renderInventory() {
    const state = getState();
    renderHeroSheet(state);
    inventoryListElement.innerHTML = '';
    inventoryFilterButtons.forEach((button) => {
      button.classList.toggle('active', (button.dataset.filter ?? 'all') === (state.preferences.inventoryFilter ?? 'all'));
    });

    if (state.inventory.length === 0) {
      inventoryListElement.innerHTML = '<div class="inventory-empty">Kein Gegenstand im Inventar.</div>';
      return;
    }

    const groupedItems = [];
    const groupMap = new Map();

    state.inventory.forEach((item, index) => {
      const key = buildInventoryGroupKey(item);
      if (!groupMap.has(key)) {
        const group = { item, firstIndex: index, count: 1 };
        groupMap.set(key, group);
        groupedItems.push(group);
        return;
      }
      groupMap.get(key).count += 1;
    });

    const inventoryFilter = state.preferences.inventoryFilter ?? 'all';
    const visibleGroups = groupedItems
      .filter(({ item }) => inventoryFilter === 'all' || getInventoryItemKind(item) === inventoryFilter)
      .sort((left, right) =>
        getInventoryItemTypeOrder(left.item) - getInventoryItemTypeOrder(right.item) ||
        (getInventoryItemKind(left.item) === 'weapon' ? formatWeaponDisplayName(left.item) : left.item.name).localeCompare(
          getInventoryItemKind(right.item) === 'weapon' ? formatWeaponDisplayName(right.item) : right.item.name,
          'de',
        ));

    if (!visibleGroups.length) {
      inventoryListElement.innerHTML = '<div class="inventory-empty">Keine Gegenstände in diesem Filter.</div>';
      return;
    }

    let currentSectionType = null;
    visibleGroups.forEach(({ item, firstIndex, count }) => {
      const itemKind = getInventoryItemKind(item);
      if (itemKind !== currentSectionType) {
        currentSectionType = itemKind;
        const sectionHeading = document.createElement('div');
        sectionHeading.className = 'inventory-section-title';
        sectionHeading.textContent = getInventorySectionLabel(itemKind);
        inventoryListElement.appendChild(sectionHeading);
      }

      const statsLine = itemKind === 'weapon'
        ? formatWeaponStats(item)
        : itemKind === 'offhand'
          ? formatOffHandStats(item)
          : null;
      const detailLine = getDetailLine(item);

      const wrapper = document.createElement('div');
      wrapper.className = 'inventory-item';
      wrapper.innerHTML = `
        <div class="inventory-icon inventory-icon-${itemKind} ${getItemRarityClass(item)}" aria-hidden="true">${getInventoryItemIcon(item)}</div>
        <div class="inventory-meta">
          <strong>${itemKind === 'weapon' ? formatWeaponDisplayName(item) : item.name}${count > 1 ? ` x${count}` : ''}</strong>
          ${statsLine ? `<span>${statsLine}</span>` : ''}
          <span>${detailLine}</span>
        </div>
      `;

      const iconElement = wrapper.querySelector('.inventory-icon');
      applyInventoryIcon(iconElement, item);

      const button = document.createElement('button');
      button.className = 'item-btn';
      button.type = 'button';
      button.textContent = 'Benutzen';
      button.addEventListener('click', () => useInventoryItem(firstIndex));
      wrapper.appendChild(button);
      inventoryListElement.appendChild(wrapper);
    });
  }

  return {
    renderInventory,
  };
}
