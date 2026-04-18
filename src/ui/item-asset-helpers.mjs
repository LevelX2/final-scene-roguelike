export function getWeaponIconAssetUrl(item) {
  const assetId = item?.iconAssetId ?? item?.id ?? null;
  const looksLikeWeapon = item?.type === "weapon" || item?.attackMode || item?.weaponRole || item?.profileId;
  if (!item || !looksLikeWeapon || !assetId) {
    return null;
  }

  return `./assets/weapons/${assetId}.svg`;
}

export function getOffHandIconAssetUrl(item) {
  const assetId = item?.iconAssetId ?? item?.id ?? item?.icon ?? null;
  if (!item || item.type !== "offhand" || !assetId) {
    return null;
  }

  return `./assets/shields/${assetId}.svg`;
}

export function getItemRarityClass(item) {
  return `rarity-${item?.rarity ?? "common"}`;
}
