export const LORE_TOOLTIPS = Object.freeze({
  beruf: Object.freeze({
    title: 'Beruf',
    lines: Object.freeze([
      'Deine Rolle im Business. Nur Produktionspersonal erhält Zutritt.',
    ]),
  }),
  business: Object.freeze({
    title: 'Business',
    lines: Object.freeze([
      'Filmberufe, die vom Komplex als Teil einer Produktion erkannt werden.',
    ]),
  }),
  studiokomplex: Object.freeze({
    title: 'Studiokomplex',
    lines: Object.freeze([
      'Die Gesamtheit aller Studios. Ein Run führt dich tiefer in diesen Komplex.',
    ]),
  }),
  studio: Object.freeze({
    title: 'Studio',
    lines: Object.freeze([
      'Eine einzelne Ebene innerhalb des Studiokomplexes.',
    ]),
  }),
  'final-scene': Object.freeze({
    title: 'Final Scene',
    lines: Object.freeze([
      'Das ferne Endziel im innersten Bereich des Komplexes.',
    ]),
  }),
});

export function getLoreTooltip(term) {
  const tooltip = LORE_TOOLTIPS[term];
  if (!tooltip) {
    return null;
  }

  return {
    title: tooltip.title,
    lines: [...tooltip.lines],
  };
}
