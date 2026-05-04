const MAX_LEN = 32;

/** Valor salvo no aluno; padrão A. */
function normalizeClassGroup(value) {
  if (value === undefined || value === null) return 'A';
  const s = String(value).trim();
  if (!s) return 'A';
  return s.length > MAX_LEN ? s.slice(0, MAX_LEN) : s;
}

/** Filtro em listagem: null = todas as turmas. */
function parseClassGroupFilter(value) {
  if (value === undefined || value === null || value === '') return null;
  const s = String(value).trim();
  if (!s || s === '__all__') return null;
  return s.length > MAX_LEN ? s.slice(0, MAX_LEN) : s;
}

module.exports = {
  normalizeClassGroup,
  parseClassGroupFilter,
};
