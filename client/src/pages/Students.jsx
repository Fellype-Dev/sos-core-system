import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import studentService from '../services/studentService';
import programService from '../services/programService';
import classGroupService from '../services/classGroupService';
import { buildTurmaLabels } from '../lib/turmaLabels';
import { TURMA_FILTER_ALL } from '../constants/turmas';
import {
  hasSiscMismatch, getEnrollmentDate, getTenure,
  calcularIdade, mesDeAniversario, FAIXAS_ETARIAS, MESES, MOTIVOS_DESLIGAMENTO,
} from './students/studentForm';
import { exportStudentPdf, exportStudentsWorkbook, studentFileSlug } from '../lib/studentExport';
import { loadImageDataURL, SOS_LOGO_SRC } from '../lib/pdfBranding';
import MaskedValue from '../components/MaskedValue';
import Avatar from '../components/Avatar';
import { cn } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import {
  Search,
  UserPlus,
  Users,
  Trash2,
  Edit3,
  Eye,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  Info,
  Calendar,
  ShieldCheck,
  UserCheck,
  UserX,
  AlertTriangle,
  ClipboardList,
  Clock,
  FileSpreadsheet,
} from 'lucide-react';

function isUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}


function formatDateBR(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  if (!y || !m || !d) return '—';
  return `${d}/${m}/${y}`;
}

function turmaLabel(groups, slug) {
  if (!slug) return 'Sem Grupo';
  return buildTurmaLabels(groups).get(slug) || slug;
}

function Students() {
  const { user, selectedProgramId } = useAuth();
  const canChooseProgram = user?.role === 'admin';
  // Exclusao apaga o historico junto; demais perfis usam a desativacao.
  const canDeleteStudent = user?.role === 'admin';
  const navigate = useNavigate();
  const location = useLocation();


  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterClassGroup, setFilterClassGroup] = useState(TURMA_FILTER_ALL);
  // 'active' | 'inactive' | 'all' — inativos ficam fora da lista do dia a dia, mas seguem acessiveis.
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterFaixaEtaria, setFilterFaixaEtaria] = useState('all');
  const [filterMesAniversario, setFilterMesAniversario] = useState('all');
  const [desligamento, setDesligamento] = useState(null);
  const [salvandoDesligamento, setSalvandoDesligamento] = useState(false);
  // Isola os cadastros cuja turma no SOS diverge do grupo informado no SISC.
  const [onlySiscMismatch, setOnlySiscMismatch] = useState(false);
  // Logo do SOS embutida na ficha em PDF.
  const [logo, setLogo] = useState(null);

  const [classGroupsList, setClassGroupsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState(null);

  // Mensagem de sucesso vinda do wizard (após criar/editar)
  useEffect(() => {
    if (location.state?.flash) {
      setSuccess(location.state.flash);
      window.history.replaceState({}, '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadGroups = async () => {
      if (!selectedProgramId || !isUuid(selectedProgramId)) {
        if (!cancelled) setClassGroupsList([]);
        return;
      }
      try {
        const listRes = await classGroupService.list(selectedProgramId);
        if (!cancelled) setClassGroupsList(listRes.data || []);
      } catch {
        if (!cancelled) setClassGroupsList([]);
      }
    };
    loadGroups();
    return () => {
      cancelled = true;
    };
  }, [selectedProgramId]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const studentParams = {};
      if (canChooseProgram && selectedProgramId) {
        studentParams.program_id = selectedProgramId;
      }
      if (
        filterClassGroup &&
        filterClassGroup !== TURMA_FILTER_ALL &&
        filterClassGroup !== '__none__'
      ) {
        studentParams.class_group = filterClassGroup;
      }

      const usersResponse = await studentService.getAll(studentParams);
      setStudents(usersResponse.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProgramId, canChooseProgram, filterClassGroup]);

  const filteredStudents = useMemo(() => {
    const q = String(searchQuery || '').trim().toLowerCase();
    return students.filter((s) => {
      const name = String(s.full_name || '').toLowerCase();
      const social = String(s.social_name || '').toLowerCase();
      const nis = String(s.nis_user || s.enrollment_code || '').toLowerCase();
      const matchesText = !q || name.includes(q) || social.includes(q) || nis.includes(q);
      const matchesTurma =
        filterClassGroup === TURMA_FILTER_ALL
          ? true
          : filterClassGroup === '__none__'
            ? !s.class_group
            : s.class_group === filterClassGroup;
      const isActive = s.is_active !== false;
      const matchesStatus =
        filterStatus === 'all' ? true : filterStatus === 'inactive' ? !isActive : isActive;
      const matchesSisc = !onlySiscMismatch || hasSiscMismatch(s);

      const idade = calcularIdade(s.birth_date);
      const faixa = FAIXAS_ETARIAS.find((f) => f.value === filterFaixaEtaria);
      const matchesFaixa = !faixa || (idade !== null && idade >= faixa.min && idade <= faixa.max);

      const matchesMes =
        filterMesAniversario === 'all' || mesDeAniversario(s.birth_date) === Number(filterMesAniversario);

      return matchesText && matchesTurma && matchesStatus && matchesSisc && matchesFaixa && matchesMes;
    });
  }, [
    students, searchQuery, filterClassGroup, filterStatus,
    onlySiscMismatch, filterFaixaEtaria, filterMesAniversario,
  ]);

  const inactiveCount = useMemo(
    () => students.filter((s) => s.is_active === false).length,
    [students]
  );

  const siscMismatchCount = useMemo(() => students.filter(hasSiscMismatch).length, [students]);


  /**
   * Desligar pede motivo e data; reativar só confirma. O cadastro e o histórico
   * de frequência são preservados nos dois casos.
   */
  const onToggleActive = async (item) => {
    const isActive = item.is_active !== false;

    if (isActive) {
      setDesligamento({
        student: item,
        deactivated_at: new Date().toISOString().slice(0, 10),
        deactivation_reason: '',
        deactivation_notes: '',
      });
      return;
    }

    if (!window.confirm(
      `Reativar "${item.social_name || item.full_name}"?\n\nO usuário volta a aparecer nas listas ativas e na lista de presença, e os dados do desligamento anterior são apagados.`
    )) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      await studentService.update(item.id, {
        is_active: true,
        deactivated_at: null,
        deactivation_reason: null,
        deactivation_notes: null,
      });
      setSuccess('Usuário reativado com sucesso.');
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao alterar o status do usuário.');
    }
  };

  const confirmarDesligamento = async (event) => {
    event.preventDefault();
    if (!desligamento) return;

    if (!desligamento.deactivation_reason) {
      setError('Informe o motivo do desligamento.');
      return;
    }

    setError('');
    setSuccess('');
    setSalvandoDesligamento(true);
    try {
      await studentService.update(desligamento.student.id, {
        is_active: false,
        deactivated_at: desligamento.deactivated_at || null,
        deactivation_reason: desligamento.deactivation_reason,
        deactivation_notes: desligamento.deactivation_notes.trim() || null,
      });
      setDesligamento(null);
      setSuccess('Usuário desligado com sucesso. O cadastro e o histórico foram preservados.');
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao registrar o desligamento.');
    } finally {
      setSalvandoDesligamento(false);
    }
  };

  const onDelete = async (id) => {
    if (
      !window.confirm(
        'ATENÇÃO: excluir apaga o cadastro E todo o histórico de frequência do usuário, de forma permanente.\n\nSe a intenção é apenas registrar que ele não frequenta mais a unidade, use "Desativar" — assim o histórico é preservado.\n\nDeseja mesmo excluir definitivamente?'
      )
    ) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      await studentService.delete(id);
      setSuccess('Usuário removido com sucesso.');
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao remover usuário.');
    }
  };

  useEffect(() => {
    let cancelled = false;
    loadImageDataURL(SOS_LOGO_SRC)
      .then((result) => { if (!cancelled) setLogo(result); })
      .catch(() => { if (!cancelled) setLogo(null); });
    return () => { cancelled = true; };
  }, []);

  const handleExportFicha = (student) => {
    setError('');
    try {
      exportStudentPdf(student, classGroupsList, logo);
      setSuccess('Ficha em PDF gerada com sucesso.');
    } catch (err) {
      setError(`Falha ao gerar a ficha em PDF: ${err.message || err}`);
    }
  };

  const handleExportPlanilha = (student) => {
    setError('');
    try {
      exportStudentsWorkbook([student], classGroupsList, `dados_${studentFileSlug(student)}.xlsx`);
      setSuccess('Planilha gerada com sucesso.');
    } catch (err) {
      setError(`Falha ao gerar a planilha: ${err.message || err}`);
    }
  };

  const handleExportListaExcel = () => {
    setError('');
    if (filteredStudents.length === 0) {
      setError('Nenhum usuário na listagem atual para exportar.');
      return;
    }
    try {
      const data = new Date().toISOString().slice(0, 10);
      exportStudentsWorkbook(filteredStudents, classGroupsList, `assistidos_${data}.xlsx`);
      setSuccess(`Planilha exportada com ${filteredStudents.length} usuário(s).`);
    } catch (err) {
      setError(`Falha ao exportar a planilha: ${err.message || err}`);
    }
  };

  const showDetails = (student) => setSelectedStudentForDetails(student);
  const closeDetails = () => setSelectedStudentForDetails(null);

  const goToNew = () => navigate('/usuarios/novo');
  const goToEdit = (item) => navigate(`/usuarios/${item.id}/editar`);

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Intro Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-8 shadow-xl shadow-slate-100/40">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Gestão de Usuários</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Consulte, edite e cadastre os usuários da unidade ativa. Para vincular usuários a turmas, use a seção Turmas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={goToNew}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/10 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Novo usuário
          </button>
        </div>
      </div>

      {/* Alert Banners */}
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

      {/* Selected Student Details Modal */}
      {selectedStudentForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={closeDetails}>
          <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Detalhes do Usuário</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  NIS: <MaskedValue value={selectedStudentForDetails.nis_user} /> | CPF: {selectedStudentForDetails.cpf_cns || '—'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportFicha(selectedStudentForDetails)}
                  title="Baixar a ficha completa deste usuário em PDF"
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Ficha PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleExportPlanilha(selectedStudentForDetails)}
                  title="Baixar os dados deste usuário em planilha Excel"
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-bold text-emerald-700 bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Excel
                </button>
                <span className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                  selectedStudentForDetails.is_active
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                )}>
                  {selectedStudentForDetails.is_active ? 'Ativo' : 'Inativo'}
                </span>
                <button type="button" onClick={closeDetails} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {selectedStudentForDetails.is_active === false && (
                <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <UserX className="h-3.5 w-3.5" />
                    Desligamento
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mt-3">
                    <div>
                      <span className="text-amber-700/70 font-bold uppercase text-[9px] block">Data</span>
                      <strong className="text-amber-900 font-bold block mt-0.5">
                        {formatDateBR(selectedStudentForDetails.deactivated_at)}
                      </strong>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-amber-700/70 font-bold uppercase text-[9px] block">Motivo</span>
                      <strong className="text-amber-900 font-bold block mt-0.5">
                        {selectedStudentForDetails.deactivation_reason || '—'}
                      </strong>
                    </div>
                    <div className="sm:col-span-3">
                      <span className="text-amber-700/70 font-bold uppercase text-[9px] block">Observação</span>
                      <strong className="text-amber-900 font-semibold block mt-0.5 leading-relaxed whitespace-pre-line">
                        {selectedStudentForDetails.deactivation_notes || '—'}
                      </strong>
                    </div>
                  </div>
                </section>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Dados do Usuário
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="col-span-2">
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Nome</span>
                      <strong className="text-slate-800 font-extrabold text-sm block mt-0.5">{selectedStudentForDetails.full_name || '—'}</strong>
                    </div>
                    {selectedStudentForDetails.social_name && (
                      <div className="col-span-2">
                        <span className="text-slate-400 font-bold uppercase text-[9px] block">Nome Social</span>
                        <strong className="text-slate-800 font-extrabold text-sm block mt-0.5">{selectedStudentForDetails.social_name}</strong>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Nascimento</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{formatDateBR(selectedStudentForDetails.birth_date)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Cor</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.color || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Calçado</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.shoe_size || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Roupa</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.clothing_size || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Alérgico</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.is_allergic ? 'Sim' : 'Não'}</strong>
                    </div>
                    {selectedStudentForDetails.is_allergic && (
                      <div className="col-span-2">
                        <span className="text-slate-400 font-bold uppercase text-[9px] block">Alergia a</span>
                        <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.allergy_details || '—'}</strong>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Problema de Saúde</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.has_health_issues ? 'Sim' : 'Não'}</strong>
                    </div>
                    {selectedStudentForDetails.has_health_issues && (
                      <div className="col-span-2">
                        <span className="text-slate-400 font-bold uppercase text-[9px] block">Qual</span>
                        <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.health_issues_details || '—'}</strong>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Deficiência</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.has_disability ? 'Sim' : 'Não'}</strong>
                    </div>
                    {selectedStudentForDetails.has_disability && (
                      <div className="col-span-2">
                        <span className="text-slate-400 font-bold uppercase text-[9px] block">Qual</span>
                        <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.disability_details || '—'}</strong>
                      </div>
                    )}
                  </div>
                </section>

                <section className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Escola
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="col-span-2">
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Escola</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.school_name || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Série</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.school_grade || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Turno</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.school_shift || '—'}</strong>
                    </div>
                  </div>
                </section>

                <section className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 space-y-3 md:col-span-2">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" />
                    Endereço
                  </h4>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="col-span-2">
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Endereço</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.address_street || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Bairro</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.address_neighborhood || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Ponto de Referência</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.address_reference || '—'}</strong>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Dados Adicionais</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.address_extra || '—'}</strong>
                    </div>
                  </div>
                </section>

                <section className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 space-y-3 md:col-span-2">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                    <UserPlus className="h-3.5 w-3.5" />
                    Responsável
                  </h4>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Nome</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.guardian_name || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">CPF</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.guardian_name ? selectedStudentForDetails.guardian_cpf || '—' : '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">NIS</span>
                      <strong className="text-slate-800 font-bold block mt-0.5"><MaskedValue value={selectedStudentForDetails.guardian_nis} /></strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Celular</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.guardian_phone || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Parentesco</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.guardian_relationship || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Trabalho</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.guardian_workplace || '—'}</strong>
                    </div>
                  </div>
                </section>

                <section className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 space-y-3 md:col-span-2">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Situação Socioeconômica
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Benefício Familiar</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.family_benefit ? 'Sim' : 'Não'}</strong>
                    </div>
                    {selectedStudentForDetails.family_benefit && (
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[9px] block">Benefício</span>
                        <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.family_benefit_details || '—'}</strong>
                      </div>
                    )}
                    <div className="col-span-2 space-y-2">
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Composição Familiar</span>
                      {Array.isArray(selectedStudentForDetails.family_members) &&
                      selectedStudentForDetails.family_members.length > 0 ? (
                        <div className="border border-slate-200/80 rounded-xl overflow-hidden mt-1.5">
                          <table className="w-full border-collapse text-left text-[11px]">
                            <thead className="bg-slate-100 border-b border-slate-200">
                              <tr>
                                <th className="px-3 py-2 font-bold text-slate-500 uppercase">Nome</th>
                                <th className="px-3 py-2 font-bold text-slate-500 uppercase">Vínculo</th>
                                <th className="px-3 py-2 font-bold text-slate-500 uppercase">Idade</th>
                                <th className="px-3 py-2 font-bold text-slate-500 uppercase">Escolaridade</th>
                                <th className="px-3 py-2 font-bold text-slate-500 uppercase">Etnia</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {selectedStudentForDetails.family_members.map((member, index) => (
                                <tr key={`fam-${index}`} className="hover:bg-slate-50/30">
                                  <td className="px-3 py-2 text-slate-800 font-bold">{member?.name || '—'}</td>
                                  <td className="px-3 py-2 text-slate-600 font-semibold">{member?.relationship || '—'}</td>
                                  <td className="px-3 py-2 text-slate-600 font-semibold">{member?.age || '—'}</td>
                                  <td className="px-3 py-2 text-slate-600 font-semibold">{member?.education || '—'}</td>
                                  <td className="px-3 py-2 text-slate-600 font-semibold">{member?.ethnicity || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <strong className="text-slate-400 italic font-semibold">Nenhum familiar cadastrado.</strong>
                      )}
                    </div>
                  </div>
                </section>

                <section className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 space-y-3 md:col-span-2">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Pessoas Autorizadas a Retirar
                  </h4>
                  {Array.isArray(selectedStudentForDetails.authorized_pickups) &&
                  selectedStudentForDetails.authorized_pickups.length > 0 ? (
                    <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                      <table className="w-full border-collapse text-left text-[11px]">
                        <thead className="bg-slate-100 border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2 font-bold text-slate-500 uppercase">Nome</th>
                            <th className="px-3 py-2 font-bold text-slate-500 uppercase">Documento</th>
                            <th className="px-3 py-2 font-bold text-slate-500 uppercase">Telefone</th>
                            <th className="px-3 py-2 font-bold text-slate-500 uppercase">Vínculo</th>
                            <th className="px-3 py-2 font-bold text-slate-500 uppercase">Observação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {selectedStudentForDetails.authorized_pickups.map((person, index) => (
                            <tr key={`pickup-${index}`} className="hover:bg-slate-50/30">
                              <td className="px-3 py-2 text-slate-800 font-bold">{person?.name || '—'}</td>
                              <td className="px-3 py-2 text-slate-600 font-semibold">{person?.document || '—'}</td>
                              <td className="px-3 py-2 text-slate-600 font-semibold">{person?.phone || '—'}</td>
                              <td className="px-3 py-2 text-slate-600 font-semibold">{person?.relationship || '—'}</td>
                              <td className="px-3 py-2 text-slate-600 font-semibold">{person?.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <strong className="text-[11px] text-slate-400 italic font-semibold">
                      Nenhuma pessoa autorizada além do responsável principal.
                    </strong>
                  )}
                </section>

                <section className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" />
                    CRAS/CREAS
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Situação</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.cras_status || '—'}</strong>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Motivo</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.cras_link_reason || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Órgão</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.cras_referral_agency || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Técnico</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.cras_technician || '—'}</strong>
                    </div>
                  </div>
                </section>

                <section className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 space-y-3 md:col-span-2">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5" />
                    Registro no SISC
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Data de Vinculação</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{formatDateBR(selectedStudentForDetails.sisc_link_date)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Grupo no SISC</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">
                        {selectedStudentForDetails.sisc_group
                          ? turmaLabel(classGroupsList, selectedStudentForDetails.sisc_group)
                          : '—'}
                      </strong>
                    </div>
                  </div>
                  {hasSiscMismatch(selectedStudentForDetails) && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>
                        Divergência de turma: no SISC consta{' '}
                        <strong>{turmaLabel(classGroupsList, selectedStudentForDetails.sisc_group)}</strong>, no SOS{' '}
                        <strong>{turmaLabel(classGroupsList, selectedStudentForDetails.class_group)}</strong>.
                      </span>
                    </div>
                  )}
                </section>

                <section className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    SCFV
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Grupo</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.scfv_group || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Orientador(a)</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.scfv_instructor || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Inserção</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{formatDateBR(selectedStudentForDetails.scfv_insertion_date)}</strong>
                    </div>
                    {(() => {
                      const enrollment = getEnrollmentDate(selectedStudentForDetails);
                      const tenure = enrollment && getTenure(enrollment.date);
                      if (!tenure) return null;
                      return (
                        <div>
                          <span className="text-slate-400 font-bold uppercase text-[9px] block">Tempo no Programa</span>
                          <strong className="text-slate-800 font-bold block mt-0.5 capitalize">{tenure.label}</strong>
                          {enrollment.source === 'sistema' && (
                            <span className="text-[9px] font-semibold text-amber-600 block">
                              estimado pelo cadastro no sistema
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Atualização</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">{formatDateBR(selectedStudentForDetails.scfv_update_date)}</strong>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Dias de Frequência</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">
                        {Array.isArray(selectedStudentForDetails.scfv_frequency_days)
                          ? selectedStudentForDetails.scfv_frequency_days.join(', ') || '—'
                          : '—'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Turno</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">
                        {Array.isArray(selectedStudentForDetails.scfv_shift)
                          ? selectedStudentForDetails.scfv_shift.join(', ') || '—'
                          : '—'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Embarque / Desembarque</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">
                        {selectedStudentForDetails.scfv_boarding || '—'} / {selectedStudentForDetails.scfv_disembarkation || '—'}
                      </strong>
                    </div>
                  </div>
                </section>

                <section className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 space-y-2 md:col-span-2">
                  <span className="text-slate-400 font-bold uppercase text-[9px] block">Anotações dos Orientadores</span>
                  <strong className="text-slate-800 font-semibold text-xs block leading-relaxed whitespace-pre-line">{selectedStudentForDetails.advisor_notes || '—'}</strong>
                  <span className="text-slate-400 font-bold uppercase text-[9px] block mt-3">Observação do Técnico</span>
                  <strong className="text-slate-800 font-semibold text-xs block leading-relaxed whitespace-pre-line">{selectedStudentForDetails.technician_notes || '—'}</strong>
                </section>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                className="h-9 px-4 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                type="button"
                onClick={closeDetails}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Lista de usuários */}
      <Card className="border-slate-100 shadow-xl shadow-slate-100/40 bg-white rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">Membros Cadastrados na Unidade</CardTitle>
            <CardDescription className="text-xs text-slate-400">Gerencie a lista de usuários da sua unidade ativa.</CardDescription>
          </div>
          {!loading && (
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-100">
              {filteredStudents.length} {filteredStudents.length === 1 ? 'usuário' : 'usuários'}
            </span>
          )}
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-4 items-center bg-slate-50/50 p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="search"
                placeholder="Buscar usuário por nome ou NIS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
              />
            </div>

            <div className="w-full sm:w-auto min-w-[180px] space-y-1">
              <select
                id="filter-turma"
                value={filterClassGroup}
                onChange={(e) => setFilterClassGroup(e.target.value)}
                className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
              >
                <option value={TURMA_FILTER_ALL}>Todos os grupos</option>
                <option value="__none__">Sem grupo</option>
                {classGroupsList.map((t) => (
                  <option key={t.id} value={t.slug}>
                    {turmaLabel(classGroupsList, t.slug)}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-auto min-w-[160px] space-y-1">
              <select
                id="filter-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
              >
                <option value="active">Somente ativos</option>
                <option value="inactive">
                  Somente inativos{inactiveCount > 0 ? ` (${inactiveCount})` : ''}
                </option>
                <option value="all">Ativos e inativos</option>
              </select>
            </div>

            <div className="w-full sm:w-auto min-w-[160px] space-y-1">
              <select
                id="filter-faixa"
                value={filterFaixaEtaria}
                onChange={(e) => setFilterFaixaEtaria(e.target.value)}
                title="Faixa etária calculada pela data de nascimento."
                className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
              >
                <option value="all">Todas as idades</option>
                {FAIXAS_ETARIAS.map((faixa) => (
                  <option key={faixa.value} value={faixa.value}>{faixa.label}</option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-auto min-w-[160px] space-y-1">
              <select
                id="filter-aniversario"
                value={filterMesAniversario}
                onChange={(e) => setFilterMesAniversario(e.target.value)}
                title="Mês de aniversário do usuário."
                className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
              >
                <option value="all">Todos os aniversários</option>
                {MESES.map((mes, indice) => (
                  <option key={mes} value={indice + 1}>Aniversário em {mes}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setOnlySiscMismatch((prev) => !prev)}
              title="Mostra apenas usuários cujo grupo no SOS difere do grupo informado no SISC."
              className={cn(
                'h-10 px-3.5 inline-flex items-center gap-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer shrink-0',
                onlySiscMismatch
                  ? 'bg-amber-500 text-white border-amber-500'
                  : siscMismatchCount > 0
                    ? 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Divergência SISC
              {siscMismatchCount > 0 && (
                <span
                  className={cn(
                    'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] leading-none',
                    onlySiscMismatch ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700'
                  )}
                >
                  {siscMismatchCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleExportListaExcel}
              disabled={filteredStudents.length === 0}
              title="Exporta em planilha os usuários que estão na listagem atual, respeitando os filtros."
              className="h-10 px-3.5 inline-flex items-center gap-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer shrink-0 bg-white text-emerald-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Exportar Excel
            </button>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-indigo-600" />
              <span className="text-xs text-slate-400 font-bold">Carregando usuários...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-medium text-sm border border-dashed border-slate-200 rounded-xl">
              {searchQuery || filterClassGroup !== TURMA_FILTER_ALL || filterStatus !== 'active' || onlySiscMismatch
                ? 'Nenhum usuário encontrado com os filtros atuais.'
                : students.length > 0
                  ? 'Nenhum usuário ativo nesta unidade. Use o filtro de status para ver os inativos.'
                  : 'Nenhum usuário nesta unidade ainda. Use o botão "Novo usuário" para começar.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl bg-white shadow-sm overflow-hidden">
              {filteredStudents.map((item) => (
                <div
                  key={item.id}
                  onClick={() => showDetails(item)}
                  className="flex items-center gap-3.5 px-4 py-3 hover:bg-slate-50/60 transition-colors cursor-pointer group"
                >
                  <Avatar name={item.social_name || item.full_name} />

                  {/* Identificação: o nome social vem na frente; o civil fica logo abaixo. */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{item.social_name || item.full_name}</p>
                    {item.social_name && (
                      <p className="text-[11px] text-slate-400 font-semibold truncate">{item.full_name}</p>
                    )}
                    <p className="text-[11px] text-slate-400 font-semibold truncate">
                      NIS <MaskedValue value={item.nis_user || item.enrollment_code} />
                      <span className="mx-1 text-slate-300">·</span>
                      {formatDateBR(item.birth_date)}
                      {item.guardian_phone && (
                        <>
                          <span className="mx-1 text-slate-300">·</span>
                          {item.guardian_phone}
                        </>
                      )}
                      {canChooseProgram && item.programs?.name && (
                        <>
                          <span className="mx-1 text-slate-300">·</span>
                          {item.programs.name}
                        </>
                      )}
                    </p>
                    {(() => {
                      const enrollment = getEnrollmentDate(item);
                      const tenure = enrollment && getTenure(enrollment.date);
                      if (!tenure) return null;
                      return (
                        <p
                          className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5"
                          title={
                            enrollment.source === 'scfv'
                              ? `Inserção no SCFV em ${formatDateBR(enrollment.date)}`
                              : `Sem data de inserção no SCFV — contado a partir do cadastro no sistema (${formatDateBR(enrollment.date)})`
                          }
                        >
                          <Clock className="h-3 w-3 shrink-0" />
                          No programa {tenure.label}
                          {enrollment.source === 'sistema' && (
                            <span className="text-slate-300">(aprox.)</span>
                          )}
                        </p>
                      );
                    })()}
                  </div>

                  {/* Turma + status */}
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                      item.class_group
                        ? "bg-indigo-50 text-indigo-700 border-indigo-100/70"
                        : "bg-amber-50 text-amber-700 border-amber-100/70"
                    )}>
                      {turmaLabel(classGroupsList, item.class_group)}
                    </span>
                    {hasSiscMismatch(item) && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-200"
                        title={`Divergência: no SISC está em "${turmaLabel(classGroupsList, item.sisc_group)}".`}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        SISC divergente
                      </span>
                    )}
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border",
                      item.is_active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    )}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", item.is_active ? "bg-emerald-500" : "bg-slate-400")} />
                      {item.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => goToEdit(item)}
                      className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg border border-slate-200/80 text-slate-400 transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => showDetails(item)}
                      className="p-1.5 hover:bg-slate-100 hover:text-slate-700 rounded-lg border border-slate-200/80 text-slate-400 transition-colors cursor-pointer"
                      title="Detalhes"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleActive(item)}
                      className={cn(
                        "p-1.5 rounded-lg border border-slate-200/80 transition-colors cursor-pointer",
                        item.is_active !== false
                          ? "hover:bg-amber-50 hover:text-amber-600 text-slate-400"
                          : "hover:bg-emerald-50 hover:text-emerald-600 text-emerald-500"
                      )}
                      title={item.is_active !== false ? 'Desativar (mantém o histórico)' : 'Reativar'}
                    >
                      {item.is_active !== false ? (
                        <UserX className="h-3.5 w-3.5" />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5" />
                      )}
                    </button>
                    {canDeleteStudent && (
                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg border border-slate-200/80 text-slate-400 transition-colors cursor-pointer"
                        title="Excluir definitivamente (apaga o histórico)"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ficha de desligamento */}
      {desligamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <form
            onSubmit={confirmarDesligamento}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Desligar usuário</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {desligamento.student.social_name || desligamento.student.full_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDesligamento(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                <p className="text-xs text-sky-900 leading-relaxed">
                  O cadastro e todo o histórico de frequência são mantidos. O usuário sai das
                  listas ativas e da lista de presença, e pode ser reativado a qualquer momento.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="deactivated_at" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">
                    Data do desligamento
                  </label>
                  <input
                    id="deactivated_at"
                    type="date"
                    value={desligamento.deactivated_at}
                    onChange={(e) => setDesligamento((d) => ({ ...d, deactivated_at: e.target.value }))}
                    className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="deactivation_reason" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">
                    Motivo *
                  </label>
                  <select
                    id="deactivation_reason"
                    value={desligamento.deactivation_reason}
                    onChange={(e) => setDesligamento((d) => ({ ...d, deactivation_reason: e.target.value }))}
                    className="w-full h-10 px-3 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="">Selecione…</option>
                    {MOTIVOS_DESLIGAMENTO.map((motivo) => (
                      <option key={motivo} value={motivo}>{motivo}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="deactivation_notes" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">
                  Observação
                </label>
                <textarea
                  id="deactivation_notes"
                  rows={3}
                  placeholder="Detalhes do desligamento, encaminhamentos feitos, contato com a família..."
                  value={desligamento.deactivation_notes}
                  onChange={(e) => setDesligamento((d) => ({ ...d, deactivation_notes: e.target.value }))}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all resize-y min-h-[4.5rem]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setDesligamento(null)}
                className="h-10 px-4 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvandoDesligamento}
                className="h-10 px-6 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {salvandoDesligamento ? 'Registrando…' : 'Registrar desligamento'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Students;
