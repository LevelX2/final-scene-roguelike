const METRIC_DEFS = [
  { id: 'rooms', label: 'Raeume', read: (entry) => entry?.rooms ?? 0 },
  { id: 'enemies.total', label: 'Gegner', read: (entry) => entry?.enemies?.total ?? 0 },
  { id: 'enemies.standard', label: 'Gegner Standard', read: (entry) => entry?.enemies?.standard ?? 0 },
  { id: 'enemies.special', label: 'Gegner Special', read: (entry) => entry?.enemies?.special ?? 0 },
  { id: 'enemies.elite', label: 'Gegner Elite', read: (entry) => entry?.enemies?.elite ?? 0 },
  { id: 'enemies.dire', label: 'Gegner Dire', read: (entry) => entry?.enemies?.dire ?? 0 },
  { id: 'enemies.boss', label: 'Gegner Boss', read: (entry) => entry?.enemies?.boss ?? 0 },
  { id: 'keys', label: 'Keys', read: (entry) => entry?.keys ?? 0 },
  { id: 'lockedDoors', label: 'Locked Doors', read: (entry) => entry?.lockedDoors ?? 0 },
  { id: 'foods', label: 'Nahrung', read: (entry) => entry?.foods ?? 0 },
  { id: 'foodNutrition.totalNutrition', label: 'Nahrung Nährwert', read: (entry) => entry?.foodNutrition?.totalNutrition ?? 0 },
  { id: 'foodNutrition.averageNutrition', label: 'Nahrung Schnitt', read: (entry) => entry?.foodNutrition?.averageNutrition ?? 0 },
  { id: 'consumables.total', label: 'Verbrauchbar', read: (entry) => entry?.consumables?.total ?? 0 },
  { id: 'consumables.healing', label: 'Verbrauchbar Heilung', read: (entry) => entry?.consumables?.healing ?? 0 },
  { id: 'consumables.healingValue.totalHeal', label: 'Verbrauchbar Heilwert', read: (entry) => entry?.consumables?.healingValue?.totalHeal ?? 0 },
  { id: 'consumables.healingValue.averageHeal', label: 'Verbrauchbar Heilschnitt', read: (entry) => entry?.consumables?.healingValue?.averageHeal ?? 0 },
  { id: 'consumables.utility', label: 'Verbrauchbar Utility', read: (entry) => entry?.consumables?.utility ?? 0 },
  { id: 'floorWeapons', label: 'Bodenwaffen', read: (entry) => entry?.floorWeapons ?? 0 },
  { id: 'floorOffHands', label: 'Bodenschilde', read: (entry) => entry?.floorOffHands ?? 0 },
  { id: 'chests', label: 'Truhen', read: (entry) => entry?.chests ?? 0 },
  { id: 'chestContents.total', label: 'Truheninhalte', read: (entry) => entry?.chestContents?.total ?? 0 },
  { id: 'chestContents.offHands', label: 'Truhenschilde', read: (entry) => entry?.chestContents?.offHands ?? 0 },
  { id: 'traps', label: 'Fallen', read: (entry) => entry?.traps ?? 0 },
  { id: 'showcases', label: 'Vitrinen', read: (entry) => entry?.showcases ?? 0 },
  { id: 'loot.world', label: 'Weltloot', read: (entry) => entry?.loot?.world ?? 0 },
  { id: 'loot.total', label: 'Loot gesamt', read: (entry) => entry?.loot?.total ?? 0 },
];

function roundMetric(value) {
  return Math.round(value * 100) / 100;
}

function buildMetricSummary(values) {
  if (!values.length) {
    return {
      samples: 0,
      mean: 0,
      min: 0,
      max: 0,
    };
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    samples: values.length,
    mean: roundMetric(total / values.length),
    min: roundMetric(Math.min(...values)),
    max: roundMetric(Math.max(...values)),
  };
}

function summarizeMetrics(entries) {
  return Object.fromEntries(METRIC_DEFS.map((metric) => {
    const values = entries.map((entry) => Number(metric.read(entry) ?? 0)).filter(Number.isFinite);
    return [metric.id, buildMetricSummary(values)];
  }));
}

function normalizeReports(reports) {
  return Array.isArray(reports) ? reports.filter(Boolean) : [];
}

function findStudioSummary(report, floorNumber) {
  return report?.studios?.find((studio) => studio?.floorNumber === floorNumber) ?? null;
}

function formatMetricLine(label, summary) {
  return `${label} ${summary.mean} (min ${summary.min}, max ${summary.max})`;
}

export function buildStudioGenerationBatchReport(reports, options = {}) {
  const normalizedReports = normalizeReports(reports);
  const studioCount = Math.max(
    Number(options.studioCount) || 0,
    ...normalizedReports.map((report) => report?.studioCount ?? report?.generatedStudioCount ?? 0),
  );

  const perStudio = [];
  for (let floorNumber = 1; floorNumber <= studioCount; floorNumber += 1) {
    const studioEntries = normalizedReports
      .map((report) => findStudioSummary(report, floorNumber))
      .filter(Boolean);
    perStudio.push({
      floorNumber,
      archetypeIds: Array.from(new Set(
        studioEntries.map((entry) => entry.studioArchetypeId).filter(Boolean),
      )).sort((left, right) => left.localeCompare(right, 'de')),
      metrics: summarizeMetrics(studioEntries),
    });
  }

  return {
    runCount: normalizedReports.length,
    studioCount,
    totals: summarizeMetrics(normalizedReports.map((report) => report?.totals ?? {})),
    perStudio,
  };
}

export function formatStudioGenerationBatchReport(report) {
  const lines = [
    'Studio-Batch-Statistik',
    `Laeufe ${report?.runCount ?? 0} | Studios pro Lauf ${report?.studioCount ?? 0}`,
    'Mittel pro Run:',
  ];

  METRIC_DEFS.forEach((metric) => {
    lines.push(`- ${formatMetricLine(metric.label, report?.totals?.[metric.id] ?? buildMetricSummary([]))}`);
  });

  lines.push('Mittel pro Studio:');
  (report?.perStudio ?? []).forEach((studio) => {
    const archetypeSuffix = studio.archetypeIds.length === 1
      ? ` | Archetyp ${studio.archetypeIds[0]}`
      : studio.archetypeIds.length > 1
        ? ` | Archetypen ${studio.archetypeIds.join(', ')}`
        : '';
    lines.push(`- Studio ${studio.floorNumber}${archetypeSuffix}`);
    lines.push(`  ${formatMetricLine('Raeume', studio.metrics.rooms)}`);
    lines.push(`  ${formatMetricLine('Gegner', studio.metrics['enemies.total'])}`);
    lines.push(`  ${formatMetricLine('Keys', studio.metrics.keys)}`);
    lines.push(`  ${formatMetricLine('Locked Doors', studio.metrics.lockedDoors)}`);
    lines.push(`  ${formatMetricLine('Nahrung', studio.metrics.foods)}`);
    lines.push(`  ${formatMetricLine('Nahrung Nährwert', studio.metrics['foodNutrition.totalNutrition'])}`);
    lines.push(`  ${formatMetricLine('Nahrung Schnitt', studio.metrics['foodNutrition.averageNutrition'])}`);
    lines.push(`  ${formatMetricLine('Verbrauchbar', studio.metrics['consumables.total'])}`);
    lines.push(`  ${formatMetricLine('Verbrauchbar Heilwert', studio.metrics['consumables.healingValue.totalHeal'])}`);
    lines.push(`  ${formatMetricLine('Verbrauchbar Heilschnitt', studio.metrics['consumables.healingValue.averageHeal'])}`);
    lines.push(`  ${formatMetricLine('Truhen', studio.metrics.chests)}`);
    lines.push(`  ${formatMetricLine('Truheninhalte', studio.metrics['chestContents.total'])}`);
    lines.push(`  ${formatMetricLine('Truhenschilde', studio.metrics['chestContents.offHands'])}`);
    lines.push(`  ${formatMetricLine('Fallen', studio.metrics.traps)}`);
    lines.push(`  ${formatMetricLine('Loot gesamt', studio.metrics['loot.total'])}`);
  });

  return lines.join('\n');
}
