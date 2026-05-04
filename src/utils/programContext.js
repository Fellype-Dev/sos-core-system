/**
 * Normaliza id de programa vindo de query, body ou JWT.
 * @param {unknown} value
 * @returns {string|null}
 */
function normalizeProgramId(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

/**
 * Unidade efetiva: admin/sede podem priorizar query/body (ex.: troca na UI); demais papéis usam o JWT.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function resolveScopedProgramId(req) {
  const fromQuery = normalizeProgramId(req.query?.program_id);
  const fromBody = normalizeProgramId(req.body?.program_id);
  const fromJwt = normalizeProgramId(req.selectedProgramId);

  if (req.userRole === 'admin' || req.userRole === 'sede') {
    return fromQuery || fromBody || fromJwt || null;
  }

  return fromJwt || null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

module.exports = {
  normalizeProgramId,
  resolveScopedProgramId,
  isUuid,
};
