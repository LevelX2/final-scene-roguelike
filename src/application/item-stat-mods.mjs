export function applyItemStatMods(entity, item, direction = 1) {
  if (!entity || !item?.statMods) {
    return;
  }

  Object.entries(item.statMods).forEach(([stat, value]) => {
    if (!value) {
      return;
    }

    const currentValue = typeof entity[stat] === 'number' ? entity[stat] : 0;
    entity[stat] = currentValue + value * direction;
  });
}
