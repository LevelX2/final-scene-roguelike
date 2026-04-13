const GRAMMATICAL_GENDER = {
  MASCULINE: 'masculine',
  FEMININE: 'feminine',
  NEUTER: 'neuter',
  PLURAL: 'plural',
};

const ARTICLE_MODE = {
  NONE: 'none',
  INDEFINITE: 'indefinite',
};

const GRAMMATICAL_CASE = {
  NOMINATIVE: 'nominative',
  ACCUSATIVE: 'accusative',
  DATIVE: 'dative',
};

const DEFINITE_ARTICLES = {
  [GRAMMATICAL_CASE.NOMINATIVE]: {
    [GRAMMATICAL_GENDER.MASCULINE]: 'der',
    [GRAMMATICAL_GENDER.FEMININE]: 'die',
    [GRAMMATICAL_GENDER.NEUTER]: 'das',
    [GRAMMATICAL_GENDER.PLURAL]: 'die',
  },
  [GRAMMATICAL_CASE.ACCUSATIVE]: {
    [GRAMMATICAL_GENDER.MASCULINE]: 'den',
    [GRAMMATICAL_GENDER.FEMININE]: 'die',
    [GRAMMATICAL_GENDER.NEUTER]: 'das',
    [GRAMMATICAL_GENDER.PLURAL]: 'die',
  },
  [GRAMMATICAL_CASE.DATIVE]: {
    [GRAMMATICAL_GENDER.MASCULINE]: 'dem',
    [GRAMMATICAL_GENDER.FEMININE]: 'der',
    [GRAMMATICAL_GENDER.NEUTER]: 'dem',
    [GRAMMATICAL_GENDER.PLURAL]: 'den',
  },
};

const DEFINITE_ADJECTIVE_ENDINGS = {
  [GRAMMATICAL_CASE.NOMINATIVE]: {
    [GRAMMATICAL_GENDER.MASCULINE]: 'e',
    [GRAMMATICAL_GENDER.FEMININE]: 'e',
    [GRAMMATICAL_GENDER.NEUTER]: 'e',
    [GRAMMATICAL_GENDER.PLURAL]: 'en',
  },
  [GRAMMATICAL_CASE.ACCUSATIVE]: {
    [GRAMMATICAL_GENDER.MASCULINE]: 'en',
    [GRAMMATICAL_GENDER.FEMININE]: 'e',
    [GRAMMATICAL_GENDER.NEUTER]: 'e',
    [GRAMMATICAL_GENDER.PLURAL]: 'en',
  },
  [GRAMMATICAL_CASE.DATIVE]: {
    [GRAMMATICAL_GENDER.MASCULINE]: 'en',
    [GRAMMATICAL_GENDER.FEMININE]: 'en',
    [GRAMMATICAL_GENDER.NEUTER]: 'en',
    [GRAMMATICAL_GENDER.PLURAL]: 'en',
  },
};

const WEAPON_GENDER_OVERRIDES = {
  'bare-hands': GRAMMATICAL_GENDER.PLURAL,
  'nail-gun': GRAMMATICAL_GENDER.FEMININE,
  'plasma-blade': GRAMMATICAL_GENDER.FEMININE,
  'energy-lance': GRAMMATICAL_GENDER.FEMININE,
  'bone-saw': GRAMMATICAL_GENDER.FEMININE,
  'fire-axe': GRAMMATICAL_GENDER.FEMININE,
  'service-pistol': GRAMMATICAL_GENDER.FEMININE,
  'ranch-shotgun': GRAMMATICAL_GENDER.FEMININE,
  machete: GRAMMATICAL_GENDER.FEMININE,
  'fear-spike': GRAMMATICAL_GENDER.FEMININE,
  'sawed-off-shotgun': GRAMMATICAL_GENDER.FEMININE,
  'electro-scalpel': GRAMMATICAL_GENDER.NEUTER,
  lightsaber: GRAMMATICAL_GENDER.NEUTER,
  'combat-knife': GRAMMATICAL_GENDER.NEUTER,
  'bowie-knife': GRAMMATICAL_GENDER.NEUTER,
  'chef-knife': GRAMMATICAL_GENDER.NEUTER,
  'voodoo-knife': GRAMMATICAL_GENDER.NEUTER,
  'barbed-wire-lasso': GRAMMATICAL_GENDER.NEUTER,
  'pepper-spray': GRAMMATICAL_GENDER.NEUTER,
  'wrist-blades': GRAMMATICAL_GENDER.PLURAL,
};

const FEMININE_NAME_HINTS = ['puppe', 'drohne', 'klinge', 'pistole', 'flinte', 'säge', 'lanze', 'machete', 'klaue', 'axt'];
const NEUTER_NAME_HINTS = ['messer', 'schwert', 'lasso', 'spray', 'skalpell'];
const PLURAL_NAME_HINTS = ['klingen', 'fäuste', 'faeuste'];

function pickLabel(entity, fallback = '') {
  return entity?.baseName ?? entity?.name ?? fallback;
}

function inferGenderFromName(name, fallback = GRAMMATICAL_GENDER.MASCULINE) {
  const normalized = String(name ?? '').trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (PLURAL_NAME_HINTS.some((hint) => normalized.endsWith(hint))) {
    return GRAMMATICAL_GENDER.PLURAL;
  }
  if (FEMININE_NAME_HINTS.some((hint) => normalized.endsWith(hint))) {
    return GRAMMATICAL_GENDER.FEMININE;
  }
  if (NEUTER_NAME_HINTS.some((hint) => normalized.endsWith(hint))) {
    return GRAMMATICAL_GENDER.NEUTER;
  }
  return fallback;
}

function normalizeArticleMode(name, articleMode) {
  if (/^(ein|eine|einen|einem|einer|der|die|das)\b/i.test(String(name ?? '').trim())) {
    return ARTICLE_MODE.NONE;
  }
  return articleMode ?? ARTICLE_MODE.INDEFINITE;
}

function getIndefiniteArticle(gender) {
  return gender === GRAMMATICAL_GENDER.FEMININE ? 'eine' : 'ein';
}

function inflectDefiniteAdjective(adjective, gender, grammaticalCase) {
  const normalized = String(adjective ?? '').trim();
  if (!normalized) {
    return '';
  }

  const lowered = normalized.charAt(0).toLowerCase() + normalized.slice(1);
  const ending = DEFINITE_ADJECTIVE_ENDINGS[grammaticalCase]?.[gender] ?? 'e';

  if (ending === 'e') {
    return lowered.endsWith('e') ? lowered : `${lowered}e`;
  }

  return lowered.endsWith('e') ? `${lowered}n` : `${lowered}${ending}`;
}

function formatWeaponParts(nameParts, options = {}) {
  if (!nameParts) {
    return '';
  }

  const prefix = options.inflectPrefixForDefiniteArticle
    ? inflectDefiniteAdjective(nameParts.prefix, options.gender, options.grammaticalCase)
    : nameParts.prefix;
  return [
    prefix,
    nameParts.baseName,
    nameParts.suffix,
    nameParts.decadeSuffix,
  ].filter(Boolean).join(' ').trim();
}

function getFallbackWeaponNameParts(weapon) {
  return {
    prefix: null,
    baseName: weapon?.name ?? 'unbekannte Waffe',
    suffix: null,
    decadeSuffix: null,
  };
}

function getWeaponGender(weapon) {
  const templateId = weapon?.templateId ?? weapon?.baseItemId ?? weapon?.id ?? null;
  return weapon?.grammar?.gender
    ?? WEAPON_GENDER_OVERRIDES[templateId]
    ?? inferGenderFromName(weapon?.name, GRAMMATICAL_GENDER.MASCULINE);
}

function buildDefiniteWeaponForms(weapon) {
  const gender = getWeaponGender(weapon);
  const nameParts = weapon?.nameParts ?? getFallbackWeaponNameParts(weapon);

  return Object.fromEntries(
    Object.values(GRAMMATICAL_CASE).map((grammaticalCase) => [
      grammaticalCase,
      `${DEFINITE_ARTICLES[grammaticalCase][gender]} ${formatWeaponParts(nameParts, {
        inflectPrefixForDefiniteArticle: true,
        gender,
        grammaticalCase,
      })}`.trim(),
    ]),
  );
}

export function formatWeaponDisplayName(weapon) {
  if (!weapon || weapon.id === 'bare-hands') {
    return weapon?.name ?? 'Bloße Fäuste';
  }

  return weapon?.grammar?.displayName
    ?? formatWeaponParts(weapon?.nameParts ?? getFallbackWeaponNameParts(weapon))
    ?? weapon?.name
    ?? 'unbekannte Waffe';
}

export function buildWeaponGrammar(weapon) {
  return {
    gender: getWeaponGender(weapon),
    displayName: formatWeaponDisplayName(weapon),
    definiteForms: buildDefiniteWeaponForms(weapon),
  };
}

export function formatWeaponReference(weapon, options = {}) {
  if (!weapon || weapon.id === 'bare-hands') {
    return options.article === 'definite' && options.grammaticalCase === GRAMMATICAL_CASE.DATIVE
      ? 'den bloßen Fäusten'
      : weapon?.name ?? 'Bloße Fäuste';
  }

  if (options.article !== 'definite') {
    return formatWeaponDisplayName(weapon);
  }

  const grammaticalCase = options.grammaticalCase ?? GRAMMATICAL_CASE.NOMINATIVE;
  return weapon?.grammar?.definiteForms?.[grammaticalCase]
    ?? buildWeaponGrammar(weapon).definiteForms[grammaticalCase]
    ?? formatWeaponDisplayName(weapon);
}

export function formatMonsterKillerLabel(enemy) {
  const name = pickLabel(enemy, 'etwas Unbekanntes');
  const profile = enemy?.grammar ?? {};
  const gender = profile.gender ?? inferGenderFromName(name);
  const articleMode = normalizeArticleMode(name, profile.articleMode);

  if (articleMode === ARTICLE_MODE.NONE) {
    return name;
  }

  return `${getIndefiniteArticle(gender)} ${name}`;
}

export function formatWeaponDativePhrase(weapon) {
  return formatWeaponReference(weapon, {
    article: 'definite',
    grammaticalCase: GRAMMATICAL_CASE.DATIVE,
  });
}
