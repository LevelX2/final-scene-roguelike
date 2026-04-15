import { formatMonsterReference } from './combat-phrasing.mjs';

const MONSTER_PHRASE_ARTICLES = new Set([
  'der',
  'die',
  'das',
  'den',
  'dem',
  'des',
  'ein',
  'eine',
  'einen',
  'einem',
  'einer',
]);

const MONSTER_PREFIX_STOPWORDS = new Set([
  'am',
  'an',
  'auf',
  'aus',
  'bei',
  'durch',
  'fuer',
  'gegen',
  'hinter',
  'im',
  'in',
  'mit',
  'nach',
  'neben',
  'ohne',
  'ueber',
  'um',
  'unter',
  'von',
  'vor',
  'wider',
  'zwischen',
  'zum',
  'zur',
]);

const DAMAGE_FOR_PATTERN = /\b(?:fuer|für|fÃ¼r) (\d+) Schaden\b/gu;
const DAMAGE_SUFFERS_PATTERN = /\berleidet (\d+) Schaden\b/gu;
const HEAL_LIFE_PATTERN = /\b(\d+)\s+Lebenspunkt(?:e)?\b/gu;

export function buildCombatEnemyReference(enemy) {
  return {
    subject: formatMonsterReference(enemy, { article: 'definite', grammaticalCase: 'nominative' }),
    subjectCapitalized: formatMonsterReference(enemy, {
      article: 'definite',
      grammaticalCase: 'nominative',
      capitalize: true,
    }),
    object: formatMonsterReference(enemy, { article: 'definite', grammaticalCase: 'accusative' }),
    dative: formatMonsterReference(enemy, { article: 'definite', grammaticalCase: 'dative' }),
  };
}

export function formatPlayerAttackLog({ enemyReference, weaponPhrase, damage, critical }) {
  return critical
    ? `Kritischer Treffer gegen ${enemyReference.object} mit ${weaponPhrase} fuer ${damage} Schaden!`
    : `Du triffst ${enemyReference.object} mit ${weaponPhrase} fuer ${damage} Schaden.`;
}

export function formatEnemyAttackLog({ enemyReference, weaponLabel, damage, critical, ranged = false }) {
  if (ranged) {
    return critical
      ? `${enemyReference.subjectCapitalized} trifft dich aus der Distanz mit ${weaponLabel} kritisch fuer ${damage} Schaden!`
      : `${enemyReference.subjectCapitalized} trifft dich aus der Distanz mit ${weaponLabel} fuer ${damage} Schaden.`;
  }

  return critical
    ? `${enemyReference.subjectCapitalized} landet mit ${weaponLabel} einen kritischen Treffer fuer ${damage} Schaden!`
    : `${enemyReference.subjectCapitalized} trifft dich mit ${weaponLabel} fuer ${damage} Schaden.`;
}

function buildMonsterHighlightTexts(monster) {
  const texts = new Set();
  const grammaticalCases = ['nominative', 'accusative', 'dative'];

  if (monster?.name) {
    texts.add(monster.name);
  }
  if (monster?.baseName) {
    texts.add(monster.baseName);
  }

  grammaticalCases.forEach((grammaticalCase) => {
    texts.add(formatMonsterReference(monster, { article: 'none', grammaticalCase, capitalize: true }));
    texts.add(formatMonsterReference(monster, { article: 'none', grammaticalCase, capitalize: false }));
    texts.add(formatMonsterReference(monster, { article: 'definite', grammaticalCase, capitalize: true }));
    texts.add(formatMonsterReference(monster, { article: 'definite', grammaticalCase, capitalize: false }));
    texts.add(formatMonsterReference(monster, { article: 'indefinite', grammaticalCase, capitalize: true }));
    texts.add(formatMonsterReference(monster, { article: 'indefinite', grammaticalCase, capitalize: false }));
  });

  return [...texts].filter(Boolean);
}

export function createLogHighlightTerms({ monsters = [], monsterNames = [], itemNames = [] } = {}) {
  return [
    ...monsters.flatMap((monster) => buildMonsterHighlightTexts(monster)).map((text) => ({ text, kind: 'monster' })),
    ...monsterNames.map((name) => ({ text: name, kind: 'monster' })),
    ...itemNames.map((name) => ({ text: name, kind: 'item' })),
  ]
    .filter((entry) => entry.text)
    .filter((entry, index, entries) => entries.findIndex((candidate) => candidate.kind === entry.kind && candidate.text === entry.text) === index)
    .sort((left, right) => right.text.length - left.text.length);
}

function isMonsterPhraseBoundaryCharacter(character) {
  return !character || /[\s([{"']/u.test(character);
}

function isWordCharacter(character) {
  return /[\p{L}-]/u.test(character);
}

function readWordLeft(messageText, cursor) {
  let end = cursor;
  while (end > 0 && messageText[end - 1] === ' ') {
    end -= 1;
  }

  let start = end;
  while (start > 0 && isWordCharacter(messageText[start - 1])) {
    start -= 1;
  }

  if (start === end) {
    return null;
  }

  return {
    start,
    end,
    word: messageText.slice(start, end),
  };
}

function startsWithLowercase(word) {
  const firstCharacter = String(word ?? '').charAt(0);
  return Boolean(
    firstCharacter &&
    firstCharacter === firstCharacter.toLocaleLowerCase('de-DE') &&
    firstCharacter !== firstCharacter.toLocaleUpperCase('de-DE')
  );
}

function isAdjectiveLikeMonsterPrefix(word) {
  const normalized = String(word ?? '').trim().toLocaleLowerCase('de-DE');
  if (!normalized || MONSTER_PREFIX_STOPWORDS.has(normalized) || !startsWithLowercase(word)) {
    return false;
  }

  return /(?:e|en|em|er|es)$/u.test(normalized);
}

function expandMonsterMatch(messageText, start, end) {
  let expandedStart = start;
  let cursor = start;

  for (let index = 0; index < 2; index += 1) {
    const adjectiveToken = readWordLeft(messageText, cursor);
    if (!adjectiveToken || !isAdjectiveLikeMonsterPrefix(adjectiveToken.word)) {
      break;
    }

    expandedStart = adjectiveToken.start;
    cursor = adjectiveToken.start;
  }

  const articleToken = readWordLeft(messageText, expandedStart);
  if (
    articleToken &&
    MONSTER_PHRASE_ARTICLES.has(articleToken.word.toLocaleLowerCase('de-DE')) &&
    isMonsterPhraseBoundaryCharacter(messageText[articleToken.start - 1])
  ) {
    expandedStart = articleToken.start;
  }

  return { start: expandedStart, end };
}

function pushMatch(matches, nextMatch) {
  const overlaps = matches.some((match) => !(nextMatch.end <= match.start || nextMatch.start >= match.end));
  if (!overlaps) {
    matches.push(nextMatch);
  }
}

function getValueHighlightKind(messageText, patternKind) {
  const normalized = messageText.toLocaleLowerCase('de-DE');

  if (patternKind === 'damage-for') {
    if (/^(du triffst|kritischer treffer gegen)\b/u.test(normalized)) {
      return 'damage-to-enemy';
    }
    if (/\btrifft dich\b/u.test(normalized) || /\beinen kritischen treffer\b/u.test(normalized)) {
      return 'damage-to-player';
    }
    return null;
  }

  if (patternKind === 'damage-suffers') {
    return /\bdu erleidest\b/u.test(normalized) ? 'damage-to-player' : 'damage-to-enemy';
  }

  if (patternKind === 'heal-life') {
    return normalized.startsWith('du ') ? 'heal-player' : 'heal-other';
  }

  return null;
}

function findValueHighlights(messageText) {
  const matches = [];
  const patterns = [
    { regex: DAMAGE_FOR_PATTERN, kind: 'damage-for' },
    { regex: DAMAGE_SUFFERS_PATTERN, kind: 'damage-suffers' },
    { regex: HEAL_LIFE_PATTERN, kind: 'heal-life' },
  ];

  patterns.forEach(({ regex, kind }) => {
    regex.lastIndex = 0;
    let match = regex.exec(messageText);
    while (match) {
      const valueText = match[1];
      const valueStart = match.index + match[0].indexOf(valueText);
      const valueKind = getValueHighlightKind(messageText, kind);
      if (valueKind) {
        matches.push({
          start: valueStart,
          end: valueStart + valueText.length,
          className: `log-mark log-mark-value log-mark-${valueKind}`,
        });
      }
      match = regex.exec(messageText);
    }
  });

  return matches;
}

export function collectLogHighlights(messageText, messageHighlightTerms = []) {
  const lowerText = messageText.toLocaleLowerCase('de-DE');
  const matches = [];

  messageHighlightTerms.forEach((term) => {
    const needle = term.text.toLocaleLowerCase('de-DE');
    let searchIndex = 0;

    while (searchIndex < lowerText.length) {
      const start = lowerText.indexOf(needle, searchIndex);
      if (start === -1) {
        break;
      }

      const expandedMatch = term.kind === 'monster'
        ? expandMonsterMatch(messageText, start, start + needle.length)
        : { start, end: start + needle.length };
      pushMatch(matches, {
        start: expandedMatch.start,
        end: expandedMatch.end,
        className: `log-mark log-mark-${term.kind}`,
      });
      searchIndex = start + needle.length;
    }
  });

  findValueHighlights(messageText).forEach((match) => pushMatch(matches, match));
  return matches.sort((left, right) => left.start - right.start);
}
