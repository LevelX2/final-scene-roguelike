import { getItemRarityClass, getOffHandIconAssetUrl, getWeaponIconAssetUrl } from './item-asset-helpers.mjs';

function getItemIconUrl(item) {
  if (!item) {
    return null;
  }

  return item.type === "weapon"
    ? getWeaponIconAssetUrl(item)
    : item.type === "offhand"
      ? getOffHandIconAssetUrl(item)
      : null;
}

function buildCompareIconHtml(item) {
  const rarityClass = item ? getItemRarityClass(item) : "rarity-common";
  const iconUrl = getItemIconUrl(item);
  if (!iconUrl) {
    return `<div class="choice-compare-icon ${rarityClass} is-empty" aria-hidden="true"></div>`;
  }

  return `<div class="choice-compare-icon ${rarityClass}" style="background-image: url('${iconUrl}')"></div>`;
}

function buildCompareCardHtml(card) {
  const rarityClass = card.item ? getItemRarityClass(card.item) : "rarity-common";

  return `
    <div class="choice-compare-card ${rarityClass}">
      <p class="choice-compare-label">${card.title}</p>
      ${buildCompareIconHtml(card.item)}
      <p class="choice-compare-name">${card.label}</p>
      <p class="choice-rarity ${rarityClass}">${card.rarityLabel}</p>
      <p class="choice-compare-stats">${card.statsText}</p>
      <p class="choice-compare-detail">${card.detailText}</p>
    </div>
  `;
}

export function renderEquipmentCompareHtml(comparison) {
  if (!comparison) {
    return "";
  }

  return `
    <div class="choice-compare">
      ${buildCompareCardHtml(comparison.found)}
      ${buildCompareCardHtml(comparison.equipped)}
    </div>
    <p class="choice-compare-note">${comparison.note}</p>
  `;
}
