import { useEffect, useMemo, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import studentService from '../../services/studentService';
import classGroupService from '../../services/classGroupService';
import MaskedValue from '../../components/MaskedValue';
import Avatar from '../../components/Avatar';
import { cn } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Search, UserPlus, Users, Plus, Trash2, X, Info, CheckCircle, AlertCircle, GraduationCap } from 'lucide-react';

function isUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

function turmaLabel(groups, slug) {
  if (!slug) return 'Sem Turma';
  const row = groups.find((g) => g.slug === slug);
  return row ? row.name : slug;
}

function TurmasPage() {
  const { user, selectedProgramId } = useAuth();
  const canChooseProgram = user?.role === 'admin';

  const [classGroupsList, setClassGroupsList] = useState([]);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newTurmaName, setNewTurmaName] = useState('');
  const [newTurmaPeriod, setNewTurmaPeriod] = useState('manha');
  const [turmaBusy, setTurmaBusy] = useState(false);
  const [selectedClassGroup, setSelectedClassGroup] = useState(null);
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState('');

  const canManageTurmas = Boolean(selectedProgramId && isUuid(selectedProgramId));

  const loadStudents = async () => {
    const params = {};
    if (canChooseProgram && selectedProgramId) {
      params.program_id = selectedProgramId;
    }
    const res = await studentService.getAll(params);
    setStudents(res.data || []);
  };

  const loadGroups = async () => {
    if (!canManageTurmas) {
      setClassGroupsList([]);
      return;
    }
    const res = await classGroupService.list(selectedProgramId);
    setClassGroupsList(res.data || []);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        await Promise.all([
          (async () => { if (!cancelled) await loadGroups(); })(),
          (async () => { if (!cancelled) await loadStudents(); })(),
        ]);
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || 'Falha ao carregar turmas.');
      }
    };
    setSelectedClassGroup(null);
    setAssignmentSearchQuery('');
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProgramId, canChooseProgram]);

  const currentTurmaStudents = useMemo(() => {
    if (!selectedClassGroup) return [];
    return students.filter((s) => s.class_group === selectedClassGroup.slug);
  }, [students, selectedClassGroup]);

  const searchQueryResults = useMemo(() => {
    if (!selectedClassGroup) return [];
    const query = String(assignmentSearchQuery || '').trim().toLowerCase();
    return students.filter((s) => {
      if (s.class_group === selectedClassGroup.slug) return false;
      if (query) {
        const name = String(s.full_name || '').toLowerCase();
        const nis = String(s.nis_user || s.enrollment_code || '').toLowerCase();
        return name.includes(query) || nis.includes(query);
      }
      return !s.class_group;
    });
  }, [students, assignmentSearchQuery, selectedClassGroup]);

  const countByTurma = useMemo(() => {
    const map = {};
    students.forEach((s) => {
      if (!s.class_group) return;
      map[s.class_group] = (map[s.class_group] || 0) + 1;
    });
    return map;
  }, [students]);

  const handleAddTurma = async () => {
    const name = newTurmaName.trim();
    if (!name) {
      setError('Informe o nome da turma.');
      return;
    }
    if (!canManageTurmas) {
      setError('Selecione a unidade ativa no topo para cadastrar turmas.');
      return;
    }

    setTurmaBusy(true);
    setError('');
    setSuccess('');
    try {
      await classGroupService.create({ program_id: selectedProgramId, name, period: newTurmaPeriod });
      setNewTurmaName('');
      setNewTurmaPeriod('manha');
      setSuccess('Turma cadastrada com sucesso.');
      await loadGroups();
      await loadStudents();
    } catch (err) {
      setError(err?.response?.data?.message || 'Não foi possível criar a turma.');
    } finally {
      setTurmaBusy(false);
    }
  };

  const handleRemoveTurma = async (row) => {
    if (
      !window.confirm(
        `Excluir a turma "${row.name}"? Só é permitido se não houver usuários nem chamadas usando essa turma.`
      )
    ) {
      return;
    }
    setTurmaBusy(true);
    setError('');
    setSuccess('');
    try {
      await classGroupService.remove(row.id);
      setSuccess('Turma removida com sucesso.');
      if (selectedClassGroup?.id === row.id) {
        setSelectedClassGroup(null);
      }
      await loadGroups();
      await loadStudents();
    } catch (err) {
      setError(err?.response?.data?.message || 'Não foi possível excluir a turma.');
    } finally {
      setTurmaBusy(false);
    }
  };

  const assignStudentToTurma = async (studentId, turmaSlug) => {
    setError('');
    setSuccess('');
    try {
      await studentService.update(studentId, { class_group: turmaSlug || null });
      setSuccess('Atribuição de turma atualizada.');
      await loadStudents();
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao atribuir usuário.');
    }
  };

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Intro Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-8 shadow-xl shadow-slate-100/40">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Gestão de Turmas</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              As turmas valem para a unidade física selecionada no cabeçalho. Selecione uma turma para gerenciar seus integrantes.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-700 font-semibold flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <Card className="border-slate-100 shadow-xl shadow-slate-100/40 bg-white rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100/50">
          <CardTitle className="text-base font-bold text-slate-900">Gerenciar Turmas da Unidade</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Crie turmas e vincule os usuários da unidade ativa.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {!canManageTurmas ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-xs font-bold text-amber-700 flex items-center gap-2">
              <Info className="h-4 w-4 shrink-0" />
              <span>Selecione uma unidade no cabeçalho superior para gerenciar turmas.</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Add new turma form */}
              <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-6 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Criar Nova Turma</h4>
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px] space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Nome da Turma</label>
                    <input
                      type="text"
                      value={newTurmaName}
                      onChange={(e) => setNewTurmaName(e.target.value)}
                      placeholder="Nome da nova turma (ex.: Turma C)"
                      maxLength={80}
                      disabled={turmaBusy}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>
                  <div className="w-full sm:w-auto min-w-[120px] space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Período</label>
                    <select
                      value={newTurmaPeriod}
                      onChange={(e) => setNewTurmaPeriod(e.target.value)}
                      disabled={turmaBusy}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="manha">Manhã</option>
                      <option value="tarde">Tarde</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTurma}
                    disabled={turmaBusy}
                    className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Turma
                  </button>
                </div>
              </div>

              {/* Turmas List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5">Selecione uma Turma para Gerenciar os Alunos</h4>
                {classGroupsList.length === 0 ? (
                  <p className="text-xs text-slate-400 font-semibold italic">Nenhuma turma cadastrada para esta unidade. Adicione uma no painel acima.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classGroupsList.map((t) => {
                      const isSelected = selectedClassGroup?.id === t.id;
                      const count = countByTurma[t.slug] || 0;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedClassGroup(isSelected ? null : t)}
                          className={cn(
                            "flex items-center gap-3 bg-white border p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer select-none",
                            isSelected
                              ? "border-indigo-600 ring-2 ring-indigo-600/15"
                              : "border-slate-200/60 hover:border-slate-300"
                          )}
                        >
                          <span className={cn(
                            "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                            isSelected ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600"
                          )}>
                            <GraduationCap className="h-5 w-5" />
                          </span>

                          <div className="min-w-0 flex-1">
                            <strong className={cn("text-sm font-bold block truncate", isSelected ? "text-indigo-600" : "text-slate-800")}>{t.name}</strong>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border",
                                t.period === 'manha'
                                  ? "bg-amber-50 text-amber-700 border-amber-100"
                                  : t.period === 'tarde'
                                    ? "bg-sky-50 text-sky-700 border-sky-100"
                                    : "bg-slate-100 text-slate-500 border-slate-200"
                              )}>
                                {t.period === 'manha' ? 'Manhã' : t.period === 'tarde' ? 'Tarde' : t.period || '—'}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                <Users className="h-3 w-3" />
                                {count} {count === 1 ? 'aluno' : 'alunos'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleRemoveTurma(t); }}
                            disabled={turmaBusy}
                            className="inline-flex items-center justify-center p-2 rounded-lg text-red-500 hover:bg-red-50 border border-slate-100 hover:border-red-100 transition-colors disabled:opacity-30 cursor-pointer shrink-0"
                            title="Excluir turma"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Assignment UI */}
              {selectedClassGroup ? (
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                        Gerenciar Alunos da Turma: <span className="text-indigo-600">{selectedClassGroup.name}</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">Adicione ou remova integrantes desta turma usando os painéis abaixo.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedClassGroup(null); setAssignmentSearchQuery(''); }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <X className="h-3.5 w-3.5" /> Fechar painel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column: Current Members */}
                    <div className="border border-slate-200/80 rounded-2xl p-5 bg-slate-50/20 space-y-3">
                      <div className="flex justify-between items-center">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          <span>Alunos Vinculados ({currentTurmaStudents.length})</span>
                        </h5>
                      </div>

                      {currentTurmaStudents.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 font-medium text-xs bg-white border border-dashed border-slate-200 rounded-xl">
                          Nenhum aluno cadastrado nesta turma ainda.
                        </div>
                      ) : (
                        <div className="max-h-80 overflow-y-auto border border-slate-150 rounded-xl bg-white divide-y divide-slate-100 shadow-sm no-scrollbar">
                          {currentTurmaStudents.map((s) => (
                            <div key={s.id} className="flex justify-between items-center gap-2 p-3 hover:bg-slate-50/50 transition-colors">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Avatar name={s.full_name} size="sm" />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 truncate">{s.full_name}</p>
                                  <p className="text-[10px] text-slate-450 font-bold mt-0.5">
                                    NIS: <MaskedValue value={s.nis_user || s.enrollment_code} />
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => assignStudentToTurma(s.id, null)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 hover:bg-red-50 border border-slate-200 hover:border-red-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                <X className="h-3 w-3" /> Remover
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right Column: Search and Add New Members */}
                    <div className="border border-slate-200/80 rounded-2xl p-5 bg-slate-50/20 space-y-3">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Adicionar Alunos à Turma</span>
                      </h5>

                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="search"
                          placeholder="Buscar por nome ou NIS..."
                          value={assignmentSearchQuery}
                          onChange={(e) => setAssignmentSearchQuery(e.target.value)}
                          className="w-full h-10 pl-9 pr-4 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all shadow-sm"
                        />
                      </div>

                      {searchQueryResults.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 font-medium text-xs bg-white border border-dashed border-slate-200 rounded-xl">
                          {assignmentSearchQuery
                            ? 'Nenhum aluno encontrado para os termos digitados.'
                            : 'Todos os alunos estão vinculados a alguma turma.'}
                        </div>
                      ) : (
                        <div className="max-h-80 overflow-y-auto border border-slate-150 rounded-xl bg-white divide-y divide-slate-100 shadow-sm no-scrollbar">
                          {searchQueryResults.map((s) => (
                            <div key={s.id} className="flex justify-between items-center gap-2 p-3 hover:bg-slate-50/50 transition-colors">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Avatar name={s.full_name} size="sm" />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 truncate">{s.full_name}</p>
                                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                    {s.class_group ? `Turma atual: ${turmaLabel(classGroupsList, s.class_group)}` : 'Sem turma vinculada'}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => assignStudentToTurma(s.id, selectedClassGroup.slug)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-105 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                <Plus className="h-3 w-3" /> Adicionar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 font-medium text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50/20">
                  Selecione uma turma ativa acima para carregar o painel de atribuição de alunos.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TurmasPage;
