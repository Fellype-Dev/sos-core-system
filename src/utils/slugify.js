/**
 * Gera slug estável para turma (usado em students.class_group e na chamada).
 * @param {string} name
 * @returns {string}
 */
function slugify(name) {
  const raw = String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return raw.length > 0 ? raw.slice(0, 32) : 'turma';
}

module.exports = { slugify };
