// Helpers compartilhados de análise temporal para os painéis (Home e Relatórios).
// As datas de chamada (attendance_date) chegam como 'YYYY-MM-DD', o que permite
// comparação lexicográfica direta entre strings.

export const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const PERIOD_PRESETS = [
  { id: 'month', label: 'Este mês' },
  { id: '3months', label: 'Últimos 3 meses' },
  { id: 'year', label: 'Este ano' },
  { id: 'all', label: 'Tudo' },
  { id: 'custom', label: 'Personalizado' },
];

export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISO(str) {
  return new Date(`${String(str).slice(0, 10)}T00:00:00`);
}

export function getPresetRange(preset, customStart, customEnd) {
  const today = new Date();
  const end = toISODate(today);

  if (preset === 'month') {
    return { start: toISODate(new Date(today.getFullYear(), today.getMonth(), 1)), end };
  }
  if (preset === '3months') {
    return { start: toISODate(new Date(today.getFullYear(), today.getMonth() - 2, 1)), end };
  }
  if (preset === 'year') {
    return { start: toISODate(new Date(today.getFullYear(), 0, 1)), end };
  }
  if (preset === 'custom') {
    return { start: customStart || null, end: customEnd || null };
  }
  return { start: null, end: null }; // 'all'
}

// Período anterior de mesmo tamanho, usado para calcular variações (%).
export function getPreviousRange(range) {
  if (!range.start || !range.end) return null;
  const start = parseISO(range.start);
  const end = parseISO(range.end);
  const spanMs = end - start;
  const prevEnd = new Date(start.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - spanMs);
  return { start: toISODate(prevStart), end: toISODate(prevEnd) };
}

export function sessionInRange(session, range) {
  if (!range) return true;
  const d = String(session.attendance_date || '').slice(0, 10);
  if (!d) return false;
  if (range.start && d < range.start) return false;
  if (range.end && d > range.end) return false;
  return true;
}

export function chooseGranularity(range, sessions) {
  let { start, end } = range;
  if (!start || !end) {
    const dates = sessions
      .map((s) => String(s.attendance_date || '').slice(0, 10))
      .filter(Boolean)
      .sort();
    if (dates.length) {
      start = start || dates[0];
      end = end || dates[dates.length - 1];
    }
  }
  if (!start || !end) return 'month';
  const days = (parseISO(end) - parseISO(start)) / 86400000;
  if (days <= 45) return 'day';
  if (days <= 760) return 'month';
  return 'year';
}

export function bucketKey(dateStr, gran) {
  const s = String(dateStr).slice(0, 10);
  if (gran === 'day') return s;
  if (gran === 'month') return s.slice(0, 7);
  return s.slice(0, 4);
}

export function bucketLabel(key, gran) {
  if (gran === 'day') {
    const [, m, d] = key.split('-');
    return `${d}/${m}`;
  }
  if (gran === 'month') {
    const [y, m] = key.split('-');
    return `${MONTHS_SHORT[Number(m) - 1]}/${y.slice(2)}`;
  }
  return key;
}

// Agrega métricas de frequência das unidades informadas dentro de um intervalo.
// units: [{ students: [], sessions: [] }]
export function aggregateMetrics(units, dateRange) {
  let totalStudents = 0;
  let presentCount = 0;
  let absentCount = 0;

  units.forEach((row) => {
    totalStudents += (row.students || []).length;
    (row.sessions || []).forEach((session) => {
      if (!sessionInRange(session, dateRange)) return;
      presentCount += session.present_count || 0;
      absentCount += session.absent_count || 0;
    });
  });

  const totalRecords = presentCount + absentCount;
  const attendancePercentage = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

  return { totalStudents, presentCount, absentCount, totalRecords, attendancePercentage };
}

// Monta a série temporal de frequência com granularidade adaptativa (dia/mês/ano).
export function buildTrend(sessions, range) {
  const gran = chooseGranularity(range, sessions);
  const buckets = new Map();

  sessions.forEach((session) => {
    const key = bucketKey(session.attendance_date, gran);
    if (!key) return;
    const entry = buckets.get(key) || { key, present: 0, absent: 0 };
    entry.present += session.present_count || 0;
    entry.absent += session.absent_count || 0;
    buckets.set(key, entry);
  });

  return [...buckets.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((entry) => {
      const total = entry.present + entry.absent;
      return {
        name: bucketLabel(entry.key, gran),
        Presenças: entry.present,
        Faltas: entry.absent,
        Frequência: total > 0 ? Math.round((entry.present / total) * 100) : 0,
      };
    });
}

// Novos cadastros dentro do intervalo (usa created_at dos estudantes).
export function countNewStudents(units, range) {
  if (!range.start && !range.end) return null;
  let count = 0;
  units.forEach((row) => {
    (row.students || []).forEach((student) => {
      const created = String(student.created_at || '').slice(0, 10);
      if (!created) return;
      if (range.start && created < range.start) return;
      if (range.end && created > range.end) return;
      count += 1;
    });
  });
  return count;
}
