import { getWeaponTemplate, ICONIC_MONSTER_WEAPON_IDS } from './weapon-templates.mjs';

function createLegacyWeaponView(templateId) {
  const template = getWeaponTemplate(templateId);
  if (!template) {
    return null;
  }

  return {
    id: template.id,
    name: template.name,
    source: template.source,
    handedness: template.handedness,
    damage: template.baseDamage,
    hitBonus: template.baseHit,
    critBonus: template.baseCrit,
    description: template.description ?? `${template.name} aus ${template.source}.`,
    archetypeId: template.archetypeId,
    weaponRole: template.weaponRole,
    profileId: template.profileId,
    attackMode: template.attackMode,
    range: template.range ?? 1,
    meleePenaltyHit: template.meleePenaltyHit ?? 0,
    signatureEffect: template.signatureEffect ?? null,
  };
}

export const WEAPON_CATALOG = Object.fromEntries(
  Object.entries(ICONIC_MONSTER_WEAPON_IDS)
    .map(([monsterId, templateId]) => [monsterId, createLegacyWeaponView(templateId)])
    .filter(([, template]) => Boolean(template)),
);

export const DUNGEON_WEAPON_TIERS = [];
