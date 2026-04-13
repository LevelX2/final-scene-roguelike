import test from 'node:test';
import assert from 'node:assert/strict';
import { formatKillStatLabel, getKillStatEntries, normalizeKillStats, recordKillStat } from '../../src/kill-stats.mjs';

test('recordKillStat tracks monster variants consistently across kill sources', () => {
  let killStats = {};

  killStats = recordKillStat(killStats, {
    id: 'ghostface',
    baseName: 'Ghostface',
    name: 'Ghostface',
    variantTier: 'normal',
    variantLabel: 'Normal',
  });
  killStats = recordKillStat(killStats, {
    id: 'ghostface',
    baseName: 'Ghostface',
    name: 'Ghostface, brutal',
    variantTier: 'elite',
    variantLabel: 'Elite',
  });
  killStats = recordKillStat(killStats, {
    id: 'ghostface',
    baseName: 'Ghostface',
    name: 'Ghostface, jagend und listig',
    variantTier: 'dire',
    variantLabel: 'Dire',
  });
  killStats = recordKillStat(killStats, {
    id: 'ghostface',
    baseName: 'Ghostface',
    name: 'Ghostface',
    variantTier: 'normal',
    variantLabel: 'Normal',
  });

  assert.deepEqual(
    Object.fromEntries(
      Object.entries(killStats).map(([key, entry]) => [key, { label: formatKillStatLabel(entry), count: entry.count }]),
    ),
    {
      'ghostface::normal': { label: 'Ghostface', count: 2 },
      'ghostface::elite': { label: 'Ghostface (Elite)', count: 1 },
      'ghostface::dire': { label: 'Ghostface (Dire)', count: 1 },
    },
  );
});

test('normalizeKillStats keeps legacy saves readable and sortable', () => {
  const normalized = normalizeKillStats({
    Bates: 2,
    'ghostface::elite': {
      key: 'ghostface::elite',
      monsterId: 'ghostface',
      baseName: 'Ghostface',
      variantTier: 'elite',
      variantLabel: 'Elite',
      count: 1,
    },
  });

  const labels = getKillStatEntries(normalized).map((entry) => [formatKillStatLabel(entry), entry.count]);
  assert.deepEqual(labels, [
    ['Bates', 2],
    ['Ghostface (Elite)', 1],
  ]);
});
