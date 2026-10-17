// Helpers compartilhados de análise temporal para os painéis (Home e Relatórios).
// As datas das listas de presença (attendance_date) chegam como 'YYYY-MM-DD', o que permite
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

/**
 * Cor de cada unidade no painel de turmas. Dentro de um painel a identidade da
 * barra está no rótulo, então a cor identifica a unidade, não a turma.
 * Paleta verificada para daltonismo e contraste (validate_palette, modo claro).
 */
export const CORES_UNIDADE = ['#4f46e5', '#0d9488', '#d97706'];

/**
 * Distribuição de assistidos por turma, agrupada por unidade.
 *
 * Traz TODAS as turmas cadastradas, inclusive as que estão sem ninguém — turma
 * vazia é informação, não ausência de dado. As turmas ficam separadas por
 * unidade porque um mesmo nome ("Esperança") existe em mais de uma; agrupá-las
 * pelo código do sistema somaria turmas diferentes.
 *
 * Quem está sem grupo sai do ranking: não é um grupo e, por costumar ser o
 * maior conjunto, achatava a comparação. Volta como número à parte, que é onde
 * ele age — indica vínculos a fazer.
 *
 * @param {Array} units linhas { program, students, classGroups }
 */
export function buildTurmaDashboard(units) {
  const unidades = units.map((row) => {
    const contagem = new Map();
    let semTurma = 0;

    (row.students || []).forEach((student) => {
      const slug = student.class_group || null;
      if (!slug) {
        semTurma += 1;
        return;
      }
      contagem.set(slug, (contagem.get(slug) || 0) + 1);
    });

    // Parte das turmas cadastradas, para que as vazias também apareçam.
    const cadastradas = (row.classGroups || []).map((g) => ({
      slug: g.slug,
      name: g.name,
      period: g.period || null,
      value: contagem.get(g.slug) || 0,
    }));

    // Turmas que só existem no vínculo dos assistidos (ex.: renomeadas depois).
    const conhecidas = new Set(cadastradas.map((t) => t.slug));
    const orfas = [...contagem.entries()]
      .filter(([slug]) => !conhecidas.has(slug))
      .map(([slug, value]) => ({ slug, name: slug, period: null, value, orfa: true }));

    const turmas = [...cadastradas, ...orfas].sort(
      (a, b) => b.value - a.value || a.name.localeCompare(b.name, 'pt-BR')
    );

    return {
      id: row.program?.id,
      code: row.program?.code || '',
      name: row.program?.name || row.program?.code || 'Unidade',
      total: (row.students || []).length,
      semTurma,
      turmas,
    };
  });

  const maxValor = unidades.reduce(
    (max, u) => u.turmas.reduce((m, t) => Math.max(m, t.value), max),
    0
  );

  return {
    unidades,
    maxValor,
    totalTurmas: unidades.reduce((soma, u) => soma + u.turmas.length, 0),
    totalSemTurma: unidades.reduce((soma, u) => soma + u.semTurma, 0),
  };
}

const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * Entradas e desligamentos mês a mês, para o gráfico de movimentação.
 *
 * A entrada é contada pela data de inserção no SCFV; sem ela, pela data do
 * cadastro no sistema. A saída usa a data registrada no desligamento — quem
 * está inativo sem data não entra na contagem, porque foi desativado antes de
 * a ficha de desligamento existir.
 */
export function buildMovimentacao(units, range) {
  const dentro = (iso) => {
    if (!iso) return false;
    const dia = String(iso).slice(0, 10);
    if (range?.start && dia < range.start) return false;
    if (range?.end && dia > range.end) return false;
    return true;
  };

  const meses = new Map();
  const registrar = (iso, campo) => {
    const chave = String(iso || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(chave)) return;
    const atual = meses.get(chave) || { inseridos: 0, desligados: 0 };
    atual[campo] += 1;
    meses.set(chave, atual);
  };

  const motivos = new Map();
  let totalDesligados = 0;

  units.forEach((row) => {
    (row.students || []).forEach((student) => {
      const entrada = String(student.scfv_insertion_date || student.created_at || '').slice(0, 10);
      if (dentro(entrada)) registrar(entrada, 'inseridos');

      if (dentro(student.deactivated_at)) {
        registrar(student.deactivated_at, 'desligados');
        totalDesligados += 1;
        const motivo = String(student.deactivation_reason || '').trim() || 'Não informado';
        motivos.set(motivo, (motivos.get(motivo) || 0) + 1);
      }
    });
  });

  const porMes = [...meses.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([chave, valores]) => {
      const [ano, mes] = chave.split('-');
      return {
        name: `${MESES_CURTO[Number(mes) - 1]}/${ano.slice(2)}`,
        inseridos: valores.inseridos,
        desligados: valores.desligados,
        saldo: valores.inseridos - valores.desligados,
      };
    });

  const porMotivo = [...motivos.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  return { porMes, porMotivo, totalDesligados };
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
