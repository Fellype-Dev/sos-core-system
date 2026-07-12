const MAX_LEN = 32;

/** Valor salvo no aluno; null significa sem turma. */
function normalizeClassGroup(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.length > MAX_LEN ? s.slice(0, MAX_LEN) : s;
}

/** Filtro em listagem: null = todas as turmas. */
function parseClassGroupFilter(value) {
  if (value === undefined || value === null || value === '') return null;
  const s = String(value).trim();
  if (!s || s === '__all__') return null;
  return s.length > MAX_LEN ? s.slice(0, MAX_LEN) : s;
}

/** Dias válidos para turma, na ordem canônica (mesma convenção de students.scfv_frequency_days). */
const WEEKDAY_VALUES = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

/** Normaliza lista de dias da turma: filtra valores inválidos, remove duplicados e ordena. */
function normalizeWeekdays(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];
  const provided = value.map((d) => String(d).trim().toLowerCase());
  return WEEKDAY_VALUES.filter((d) => provided.includes(d));
}

module.exports = {
  normalizeClassGroup,
  parseClassGroupFilter,
  normalizeWeekdays,
  WEEKDAY_VALUES,
};
