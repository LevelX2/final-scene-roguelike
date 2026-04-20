import { isHealingConsumable, normalizeLegacyConsumableItem } from '../content/catalogs/consumables.mjs';

function createFoodPickupFallback(item, x, y) {
  return {
    x,
    y,
    item: normalizeLegacyConsumableItem({
      ...(item ?? {}),
      type: item?.type ?? 'food',
    }),
  };
}

function createHealingPickup(item, x, y) {
  return {
    x,
    y,
    item: normalizeLegacyConsumableItem({
      type: item?.type ?? 'consumable',
      id: item?.id ?? null,
      name: item?.name ?? 'Set-Sanitaetskit',
      description: item?.description ?? 'Stellt 8 Lebenspunkte wieder her.',
      heal: item?.heal ?? 8,
      ...(item ?? {}),
    }),
  };
}

function createConsumablePickup(item, x, y) {
  return {
    x,
    y,
    item: normalizeLegacyConsumableItem({
      ...(item ?? {}),
      type: item?.type ?? 'consumable',
      itemType: item?.itemType ?? 'consumable',
      magnitude: item?.magnitude && typeof item.magnitude === 'object' ? { ...item.magnitude } : item?.magnitude,
    }),
  };
}

export function dropEnemyLoot(context = {}) {
  const {
    enemy,
    floorState,
    enemyReference,
    randomChance = Math.random,
    createWeaponPickup,
    createOffHandPickup,
    createFoodPickup,
    formatWeaponReference,
    addMessage,
  } = context;

  if (!enemy || !floorState || !enemyReference) {
    return;
  }

  if (enemy.lootWeapon && randomChance() < (enemy.weaponDropChance ?? 0.55)) {
    floorState.weapons.push(createWeaponPickup(enemy.lootWeapon, enemy.x, enemy.y));
    addMessage(
      `${enemyReference.subjectCapitalized} laesst ${formatWeaponReference(enemy.lootWeapon, { article: 'definite', grammaticalCase: 'accusative' })} fallen.`,
      'important',
    );
  }

  if (enemy.lootOffHand && randomChance() < (enemy.offHandDropChance ?? 0.45)) {
    floorState.offHands.push(createOffHandPickup(enemy.lootOffHand, enemy.x, enemy.y));
    addMessage(`${enemyReference.subjectCapitalized} verliert ${enemy.lootOffHand.name}.`, 'important');
  }

  const dropItem = enemy.lootDrop?.item;
  if (!dropItem) {
    return;
  }

  if (dropItem.type === 'food' || dropItem.consumableType === 'food') {
    floorState.foods.push(
      typeof createFoodPickup === 'function'
        ? createFoodPickup(dropItem, enemy.x, enemy.y)
        : createFoodPickupFallback(dropItem, enemy.x, enemy.y),
    );
    addMessage(`${enemyReference.subjectCapitalized} laesst ${dropItem.name} fallen.`, 'important');
    return;
  }

  floorState.consumables = Array.isArray(floorState.consumables) ? floorState.consumables : [];
  floorState.potions = floorState.consumables;

  const pickup = isHealingConsumable(dropItem)
    ? createHealingPickup(dropItem, enemy.x, enemy.y)
    : createConsumablePickup(dropItem, enemy.x, enemy.y);
  floorState.consumables.push(pickup);
  addMessage(`${enemyReference.subjectCapitalized} laesst ${dropItem.displayName ?? dropItem.name} fallen.`, 'important');
}
