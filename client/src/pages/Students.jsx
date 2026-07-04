import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import studentService from '../services/studentService';
import programService from '../services/programService';
import classGroupService from '../services/classGroupService';
import referralService from '../services/referralService';
import { TURMA_FILTER_ALL } from '../constants/turmas';
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
} from 'lucide-react';

function isUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

const REFERRAL_AGE_RANGES = [
  '0 a 3 anos',
  '3 a 6 anos',
  '6 a 9 anos',
  '10 a 12 anos',
  '12 a 14 anos',
  '15 a 17 anos',
  '30 a 59 anos',
  'Acima de 60 anos',
];
const REFERRAL_SCFV_PROGRAMS = [
  { value: 'semear', label: 'Semear' },
  { value: 'proam_sonhar', label: 'PROAM - Sonhar' },
  { value: 'cpc_viver', label: 'Centro Público de Convivência - Viver' },
];
const PRIORITY_CONDITIONS = [
  { value: 'isolamento', label: 'Em situação de isolamento' },
  { value: 'trabalho_infantil', label: 'Trabalho infantil' },
  { value: 'violencia_negligencia', label: 'Vivência de violência e/ou negligência' },
  { value: 'defasagem_escolar', label: 'Fora da escola ou com defasagem escolar superior a 2 anos' },
  { value: 'acolhimento', label: 'Em situação de acolhimento' },
  { value: 'medida_socioeducativa', label: 'Em cumprimento de medida socioeducativa em meio aberto' },
  { value: 'egresso_socioeducativa', label: 'Egressos de medidas socioeducativas' },
  { value: 'abuso_exploracao', label: 'Situação de abuso ou exploração sexual' },
  { value: 'medida_protecao_eca', label: 'Com medidas de proteção do ECA' },
  { value: 'situacao_rua', label: 'Crianças e adolescentes em situação de rua' },
  { value: 'vulnerabilidade_pcd', label: 'Vulnerabilidade relacionada a pessoas com deficiência' },
  { value: 'nao_prioritario', label: 'Não está entre as situações prioritárias (CNAS 01/2013)' },
];
const PRIORITY_AXES = [
  { value: 'eu_comigo', label: 'I. Eixo "Eu Comigo"' },
  { value: 'eu_com_os_outros', label: 'II. Eixo "Eu com os Outros"' },
  { value: 'eu_com_a_cidade', label: 'III. Eixo "Eu com a cidade"' },
  { value: 'eu_com_quem_cuida', label: 'IV. Eixo "Eu com quem cuida de mim" (até 6 anos)' },
];

function formatDateBR(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  if (!y || !m || !d) return '—';
  return `${d}/${m}/${y}`;
}

function turmaLabel(groups, slug) {
  if (!slug) return 'Sem Turma';
  const row = groups.find((g) => g.slug === slug);
  return row ? row.name : slug;
}

function Students() {
  const { user, selectedProgramId } = useAuth();
  const canChooseProgram = user?.role === 'admin';
  const navigate = useNavigate();
  const location = useLocation();

  const initialReferralForm = () => ({
    referral_age_range: '',
    referral_scfv_programs: [],
    referral_spontaneous_demand: false,
    referral_family_member_in_scfv: false,
    referral_family_followup: false,
    referral_pcd_responsible_name: '',
    referral_pcd_responsible_phone: '',
    referral_priority_conditions: [],
    referral_priority_axes: [],
    notes: '',
  });

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterClassGroup, setFilterClassGroup] = useState(TURMA_FILTER_ALL);

  const [classGroupsList, setClassGroupsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState(null);
  const [selectedReferralId, setSelectedReferralId] = useState('');
  const [referralForm, setReferralForm] = useState(initialReferralForm);
  const [referralSaving, setReferralSaving] = useState(false);
  const [selectedReferralForModal, setSelectedReferralForModal] = useState(null);

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
      const nis = String(s.nis_user || s.enrollment_code || '').toLowerCase();
      const matchesText = !q || name.includes(q) || nis.includes(q);
      const matchesTurma =
        filterClassGroup === TURMA_FILTER_ALL
          ? true
          : filterClassGroup === '__none__'
            ? !s.class_group
            : s.class_group === filterClassGroup;
      return matchesText && matchesTurma;
    });
  }, [students, searchQuery, filterClassGroup]);

  const onReferralChange = (event) => {
    const { name, value, type, checked } = event.target;
    setReferralForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const openReferralForStudent = (student) => {
    setSelectedReferralForModal(student || null);
    setSelectedReferralId(student ? student.id : '');
    setReferralForm((prev) => ({
      ...initialReferralForm(),
      referral_pcd_responsible_name: student?.guardian_name || '',
      referral_pcd_responsible_phone: student?.guardian_phone || '',
      referral_age_range: '',
      referral_scfv_programs: [],
    }));
  };

  const closeReferralModal = () => {
    setSelectedReferralForModal(null);
    setSelectedReferralId('');
    setReferralForm(initialReferralForm());
  };

  const submitReferral = async (e) => {
    e && e.preventDefault();
    if (!selectedReferralId) {
      setError('Selecione um usuário para criar o encaminhamento.');
      return;
    }
    setReferralSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        student_id: selectedReferralId,
        referral_age_range: referralForm.referral_age_range || null,
        referral_scfv_programs: Array.isArray(referralForm.referral_scfv_programs) ? referralForm.referral_scfv_programs : [],
        referral_spontaneous_demand: Boolean(referralForm.referral_spontaneous_demand),
        referral_family_member_in_scfv: Boolean(referralForm.referral_family_member_in_scfv),
        referral_family_followup: Boolean(referralForm.referral_family_followup),
        referral_pcd_responsible_name: referralForm.referral_pcd_responsible_name || null,
        referral_pcd_responsible_phone: referralForm.referral_pcd_responsible_phone || null,
        referral_priority_conditions: Array.isArray(referralForm.referral_priority_conditions) ? referralForm.referral_priority_conditions : [],
        referral_priority_axes: Array.isArray(referralForm.referral_priority_axes) ? referralForm.referral_priority_axes : [],
        notes: referralForm.notes || null,
      };

      await referralService.create(payload);
      setSuccess('Encaminhamento criado com sucesso.');
      closeReferralModal();
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao criar encaminhamento.');
    } finally {
      setReferralSaving(false);
    }
  };

  const toggleReferralArrayValue = (field, value) => {
    setReferralForm((prev) => {
      const current = Array.isArray(prev[field]) ? prev[field] : [];
      const exists = current.includes(value);
      return {
        ...prev,
        [field]: exists ? current.filter((item) => item !== value) : [...current, value],
      };
    });
  };

  const onDelete = async (id) => {
    if (!window.confirm('Remover este usuário do cadastro? Esta ação não pode ser desfeita.')) {
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
                  NIS: <MaskedValue value={selectedStudentForDetails.nis_user} /> | CPF/CNS: {selectedStudentForDetails.cpf_cns || '—'}
                </p>
              </div>
              <div className="flex items-center gap-2">
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
                </section>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors cursor-pointer"
                type="button"
                onClick={() => openReferralForStudent(selectedStudentForDetails)}
              >
                <FileText className="h-3.5 w-3.5" />
                Ficha de Encaminhamento
              </button>
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

      {/* Referral Modal */}
      {selectedReferralForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={closeReferralModal}>
          <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Ficha de Encaminhamento — {selectedReferralForModal.full_name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Preencha os dados do encaminhamento do beneficiário.</p>
              </div>
              <button type="button" onClick={closeReferralModal} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitReferral} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Faixa Etária</label>
                    <select
                      name="referral_age_range"
                      value={referralForm.referral_age_range}
                      onChange={onReferralChange}
                      className="w-full h-10 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="">Selecione…</option>
                      {REFERRAL_AGE_RANGES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Programas SCFV</label>
                    <div className="flex flex-wrap gap-4 bg-slate-50/55 border border-slate-200/60 p-3 rounded-xl">
                      {REFERRAL_SCFV_PROGRAMS.map((p) => (
                        <label key={p.value} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={referralForm.referral_scfv_programs.includes(p.value)}
                            onChange={() => toggleReferralArrayValue('referral_scfv_programs', p.value)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer"
                          />
                          <span>{p.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 select-none py-1">
                    <input
                      id="referral_spontaneous_demand"
                      type="checkbox"
                      name="referral_spontaneous_demand"
                      checked={referralForm.referral_spontaneous_demand}
                      onChange={onReferralChange}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer"
                    />
                    <label htmlFor="referral_spontaneous_demand" className="text-xs font-bold text-slate-700 cursor-pointer">Demanda Espontânea</label>
                  </div>

                  <div className="flex items-center gap-2 select-none py-1">
                    <input
                      id="referral_family_member_in_scfv"
                      type="checkbox"
                      name="referral_family_member_in_scfv"
                      checked={referralForm.referral_family_member_in_scfv}
                      onChange={onReferralChange}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer"
                    />
                    <label htmlFor="referral_family_member_in_scfv" className="text-xs font-bold text-slate-700 cursor-pointer">Familiar já frequenta SCFV</label>
                  </div>

                  <div className="flex items-center gap-2 select-none py-1">
                    <input
                      id="referral_family_followup"
                      type="checkbox"
                      name="referral_family_followup"
                      checked={referralForm.referral_family_followup}
                      onChange={onReferralChange}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer"
                    />
                    <label htmlFor="referral_family_followup" className="text-xs font-bold text-slate-700 cursor-pointer">Família em acompanhamento</label>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Responsável PCD (Nome)</label>
                    <input
                      name="referral_pcd_responsible_name"
                      value={referralForm.referral_pcd_responsible_name}
                      onChange={onReferralChange}
                      className="w-full h-10 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Responsável PCD (Telefone)</label>
                    <input
                      name="referral_pcd_responsible_phone"
                      value={referralForm.referral_pcd_responsible_phone}
                      onChange={onReferralChange}
                      className="w-full h-10 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Condições Prioritárias</label>
                    <div className="space-y-2.5 bg-slate-50/50 border border-slate-200/60 p-3.5 rounded-xl max-h-48 overflow-y-auto no-scrollbar">
                      {PRIORITY_CONDITIONS.map((c) => (
                        <label key={c.value} className="flex items-start gap-2.5 text-xs text-slate-700 font-semibold cursor-pointer select-none leading-tight">
                          <input
                            type="checkbox"
                            checked={referralForm.referral_priority_conditions.includes(c.value)}
                            onChange={() => toggleReferralArrayValue('referral_priority_conditions', c.value)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 h-4 w-4 shrink-0 mt-0.5 cursor-pointer"
                          />
                          <span>{c.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Eixos Prioritários</label>
                    <div className="space-y-2.5 bg-slate-50/50 border border-slate-200/60 p-3.5 rounded-xl">
                      {PRIORITY_AXES.map((a) => (
                        <label key={a.value} className="flex items-start gap-2.5 text-xs text-slate-700 font-semibold cursor-pointer select-none leading-tight">
                          <input
                            type="checkbox"
                            checked={referralForm.referral_priority_axes.includes(a.value)}
                            onChange={() => toggleReferralArrayValue('referral_priority_axes', a.value)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 h-4 w-4 shrink-0 mt-0.5 cursor-pointer"
                          />
                          <span>{a.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Observações Gerais</label>
                    <textarea
                      name="notes"
                      value={referralForm.notes || ''}
                      onChange={onReferralChange}
                      rows={3}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all resize-y min-h-[5rem]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <button
                  type="button"
                  className="h-10 px-4 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={closeReferralModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 px-4 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
                  disabled={referralSaving}
                >
                  {referralSaving ? 'Salvando…' : 'Salvar Encaminhamento'}
                </button>
              </div>
            </form>
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
              {students.length} {students.length === 1 ? 'usuário' : 'usuários'}
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
                <option value={TURMA_FILTER_ALL}>Todas as turmas</option>
                <option value="__none__">Sem turma</option>
                {classGroupsList.map((t) => (
                  <option key={t.id} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-indigo-600" />
              <span className="text-xs text-slate-400 font-bold">Carregando usuários...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-medium text-sm border border-dashed border-slate-200 rounded-xl">
              {searchQuery || filterClassGroup !== TURMA_FILTER_ALL
                ? 'Nenhum usuário encontrado com os filtros atuais.'
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
                  <Avatar name={item.full_name} />

                  {/* Identificação */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{item.full_name}</p>
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
                      onClick={() => onDelete(item.id)}
                      className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg border border-slate-200/80 text-slate-400 transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Students;
