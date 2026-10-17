/**
 * Rótulos de grupo que não se repetem na tela.
 *
 * Várias unidades mantêm grupos de mesmo nome em períodos ou dias diferentes —
 * "Criança Feliz" da manhã e da tarde, por exemplo. Numa lista suspensa isso
 * aparece como opções idênticas e não há como saber qual é qual.
 *
 * A regra aqui é acrescentar só o necessário para desempatar: primeiro o
 * período, depois os dias da semana, depois a faixa etária. Grupos de nome
 * único continuam aparecendo apenas com o nome.
 */

const DIAS_CURTOS = {
  seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb', dom: 'Dom',
};

const periodoLabel = (period) =>
  period === 'manha' ? 'Manhã' : period === 'tarde' ? 'Tarde' : null;

const diasLabel = (weekdays) => {
  const dias = (Array.isArray(weekdays) ? weekdays : [])
    .map((d) => DIAS_CURTOS[d])
    .filter(Boolean);
  return dias.length > 0 ? dias.join('·') : null;
};

const normalizar = (texto) =>
  String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Quais rótulos aparecem mais de uma vez na lista. */
function repetidos(rotulos) {
  const contagem = new Map();
  rotulos.forEach((r) => contagem.set(normalizar(r), (contagem.get(normalizar(r)) || 0) + 1));
  return contagem;
}

/**
 * Monta um rótulo distinto para cada grupo.
 * @param {Array} turmas lista vinda da API, com name, period, weekdays e age_range
 * @returns {Map<string, string>} slug → rótulo
 */
export function buildTurmaLabels(turmas = []) {
  const lista = (turmas || []).map((t) => ({
    slug: t.slug,
    name: t.name || t.slug,
    period: t.period,
    weekdays: t.weekdays,
    age_range: t.age_range,
    rotulo: t.name || t.slug,
  }));

  const complementos = [
    (t) => periodoLabel(t.period),
    (t) => diasLabel(t.weekdays),
    (t) => t.age_range,
  ];

  // Agrupa por nome: o complemento é aplicado ao conjunto inteiro, não só a um
  // item, para que as opções de mesmo nome fiquem comparáveis entre si.
  const porNome = new Map();
  lista.forEach((t) => {
    const chave = normalizar(t.name);
    if (!porNome.has(chave)) porNome.set(chave, []);
    porNome.get(chave).push(t);
  });

  porNome.forEach((grupo) => {
    if (grupo.length === 1) return;

    for (const complemento of complementos) {
      grupo.forEach((t) => {
        const extra = complemento(t);
        if (extra) t.rotulo = `${t.rotulo} · ${extra}`;
      });

      const contagem = repetidos(grupo.map((t) => t.rotulo));
      const resolvido = grupo.every((t) => contagem.get(normalizar(t.rotulo)) === 1);
      if (resolvido) return;
    }

    // Empate que sobreviveu a tudo: cai para o código do grupo, que é único.
    const contagemFinal = repetidos(grupo.map((t) => t.rotulo));
    grupo.forEach((t) => {
      if (contagemFinal.get(normalizar(t.rotulo)) > 1) {
        t.rotulo = `${t.rotulo} (${t.slug})`;
      }
    });
  });

  return new Map(lista.map((t) => [t.slug, t.rotulo]));
}

/** Rótulo de um grupo pelo código, já desempatado dentro da lista informada. */
export function turmaLabelUnico(turmas, slug, vazio = 'Sem grupo') {
  if (!slug) return vazio;
  return buildTurmaLabels(turmas).get(slug) || slug;
}
