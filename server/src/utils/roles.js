/**
 * Perfis de acesso do sistema.
 *
 * Coordenador, tecnico e assistente tem exatamente o mesmo nivel de acesso:
 * atuam no escopo das unidades vinculadas ao usuario. A distincao existe
 * apenas para identificar o cargo de quem opera o sistema.
 */
const UNIT_ROLES = ['coordenador', 'tecnico', 'assistente'];

/** Todos os perfis validos (usado nas rotas e na validacao de cadastro). */
const ALL_ROLES = ['admin', 'sede', ...UNIT_ROLES];

/** True quando o perfil atua no escopo de unidade (precisa de unidade vinculada). */
const isUnitRole = (role) => UNIT_ROLES.includes(role);

module.exports = { UNIT_ROLES, ALL_ROLES, isUnitRole };
