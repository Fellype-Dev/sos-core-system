import { Users, AlertTriangle } from 'lucide-react';
import { CORES_UNIDADE } from '../lib/analytics';

/**
 * Painel de turmas: um bloco por unidade, com todas as turmas dela.
 *
 * As barras são desenhadas em HTML, e não em SVG: o rótulo pode ser longo sem
 * brigar com o eixo, e a captura do relatório em PDF fica mais fiel. A escala é
 * comum a todas as unidades — a mesma largura significa o mesmo número de
 * pessoas em qualquer bloco.
 */
function TurmaDashboard({ dados, compacto = false }) {
  const { unidades, maxValor, totalSemTurma } = dados;
  if (!unidades || unidades.length === 0) return null;

  const escala = Math.max(maxValor, 1);

  return (
    <div className="space-y-4">
      {totalSemTurma > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs text-amber-900">
            <span className="font-bold">{totalSemTurma}</span>
            {totalSemTurma === 1 ? ' usuário sem turma' : ' usuários sem turma'} vinculada.
            <span className="text-amber-700"> O vínculo é feito na tela Turmas.</span>
          </p>
        </div>
      )}

      {/* Três colunas só em telas bem largas: abaixo disso o nome da turma não cabe. */}
      <div className={`grid gap-4 ${unidades.length > 1 ? 'md:grid-cols-2 2xl:grid-cols-3' : ''}`}>
        {unidades.map((unidade, indice) => {
          const cor = CORES_UNIDADE[indice % CORES_UNIDADE.length];
          const comTurma = unidade.total - unidade.semTurma;

          return (
            <section
              key={unidade.id || unidade.code}
              className="rounded-xl border border-slate-200/70 bg-white overflow-hidden"
            >
              <header
                className="flex items-baseline justify-between gap-3 border-b border-slate-100 px-4 py-3"
                style={{ borderTop: `3px solid ${cor}` }}
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{unidade.name}</h4>
                  <p className="text-[11px] text-slate-400">
                    {unidade.turmas.length} turmas · {comTurma} em turma
                    {unidade.semTurma > 0 && ` · ${unidade.semTurma} sem turma`}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-sm font-extrabold text-slate-900 tabular-nums">
                  <Users className="h-3.5 w-3.5 text-slate-300" />
                  {unidade.total}
                </span>
              </header>

              <ul className={compacto ? 'divide-y divide-slate-50' : 'divide-y divide-slate-50'}>
                {unidade.turmas.map((turma) => {
                  const largura = turma.value === 0 ? 0 : Math.max(2, (turma.value / escala) * 100);
                  const vazia = turma.value === 0;

                  return (
                    <li key={turma.slug} className={compacto ? 'px-4 py-1.5' : 'px-4 py-2'}>
                      {/* O nome quebra em duas linhas em vez de ser cortado: turma sem
                          nome legível não serve para nada, e várias só se distinguem
                          pelo final ("Unidos pelo Futuro I" e "II"). */}
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`min-w-0 text-xs font-semibold leading-snug ${vazia ? 'text-slate-400' : 'text-slate-700'}`}
                        >
                          {turma.name}
                          {turma.period && (
                            <span className="ml-1.5 whitespace-nowrap text-[10px] font-bold uppercase text-slate-300">
                              {turma.period === 'manha' ? 'manhã' : turma.period}
                            </span>
                          )}
                        </span>
                        <span
                          className={`shrink-0 text-xs font-bold tabular-nums ${vazia ? 'text-slate-300' : 'text-slate-900'}`}
                        >
                          {turma.value}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${largura}%`, backgroundColor: cor }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default TurmaDashboard;
