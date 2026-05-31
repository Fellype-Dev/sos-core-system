import { useEffect, useMemo, useState } from 'react';
import useAuth from '../hooks/useAuth';
import studentService from '../services/studentService';
import programService from '../services/programService';
import classGroupService from '../services/classGroupService';
import referralService from '../services/referralService';
import { TURMA_FILTER_ALL } from '../constants/turmas';
import MaskedValue from '../components/MaskedValue';
import { cn } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import {
  Search,
  UserPlus,
  Users,
  Plus,
  Trash2,
  Edit3,
  Eye,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  Info,
  ShieldAlert,
  Calendar,
  Settings,
  PlusCircle
} from 'lucide-react';

function isUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

const initialForm = () => ({
  full_name: '',
  birth_date: '',
  nis_user: '',
  color: '',
  cpf_cns: '',
  is_allergic: false,
  allergy_details: '',
  shoe_size: '',
  clothing_size: '',
  has_health_issues: false,
  health_issues_details: '',
  has_disability: false,
  disability_details: '',
  school_name: '',
  school_grade: '',
  school_shift: '',
  address_street: '',
  address_neighborhood: '',
  address_reference: '',
  address_extra: '',
  guardian_name: '',
  guardian_cpf: '',
  guardian_nis: '',
  guardian_phone: '',
  guardian_relationship: '',
  guardian_workplace: '',
  family_benefit: false,
  family_benefit_details: '',
  family_members: [],
  cras_status: '',
  cras_link_reason: '',
  cras_referral_agency: '',
  cras_technician: '',
  scfv_insertion_date: '',
  scfv_update_date: '',
  scfv_frequency_days: [],
  scfv_shift: [],
  scfv_group: '',
  scfv_instructor: '',
  scfv_boarding: '',
  scfv_disembarkation: '',
  advisor_notes: '',
  program_id: '',
});

const COLOR_OPTIONS = ['Branca', 'Preta', 'Parda', 'Amarela', 'Indigena', 'Outro'];
const SCHOOL_SHIFT_OPTIONS = ['Manha', 'Tarde', 'Noite', 'Integral', 'Outro'];
const CRAS_STATUS_OPTIONS = ['prioritario', 'nao_prioritario'];
const WEEK_DAYS = [
  { value: 'seg', label: 'Seg' },
  { value: 'ter', label: 'Ter' },
  { value: 'qua', label: 'Qua' },
  { value: 'qui', label: 'Qui' },
  { value: 'sex', label: 'Sex' },
  { value: 'sab', label: 'Sab' },
  { value: 'dom', label: 'Dom' },
];
const SCFV_SHIFTS = [
  { value: 'manha', label: 'Manhã' },
  { value: 'tarde', label: 'Tarde' },
];
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
  const [programs, setPrograms] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterClassGroup, setFilterClassGroup] = useState(TURMA_FILTER_ALL);
  const [activeTab, setActiveTab] = useState('manage');

  const [classGroupsList, setClassGroupsList] = useState([]);
  const [classGroupsForm, setClassGroupsForm] = useState([]);
  const [newTurmaName, setNewTurmaName] = useState('');
  const [newTurmaPeriod, setNewTurmaPeriod] = useState('manha');
  const [turmaBusy, setTurmaBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState('');
  const [assignmentClassFilter, setAssignmentClassFilter] = useState(TURMA_FILTER_ALL);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState(null);
  const [selectedReferralId, setSelectedReferralId] = useState('');
  const [referralForm, setReferralForm] = useState(initialReferralForm);
  const [referralSaving, setReferralSaving] = useState(false);
  const [selectedReferralForModal, setSelectedReferralForModal] = useState(null);

  const selectedProgramName = useMemo(() => {
    const program = programs.find((item) => String(item.id) === String(selectedProgramId));
    if (!program) return selectedProgramId || 'Unidade selecionada';
    return program.location ? `${program.name} · ${program.location}` : program.name;
  }, [programs, selectedProgramId]);

  const programIdForFormTurmas = useMemo(() => {
    if (canChooseProgram) return form.program_id || selectedProgramId || '';
    return selectedProgramId || '';
  }, [canChooseProgram, form.program_id, selectedProgramId]);

  useEffect(() => {
    let cancelled = false;

    const loadGroups = async () => {
      const listPid = selectedProgramId;
      const formPid = programIdForFormTurmas;

      try {
        const [listRes, formRes] = await Promise.all([
          listPid && isUuid(listPid) ? classGroupService.list(listPid) : Promise.resolve({ data: [] }),
          formPid && isUuid(formPid) ? classGroupService.list(formPid) : Promise.resolve({ data: [] }),
        ]);
        if (cancelled) return;
        setClassGroupsList(listRes.data || []);
        setClassGroupsForm(formRes.data || []);
      } catch {
        if (!cancelled) {
          setClassGroupsList([]);
          setClassGroupsForm([]);
        }
      }
    };

    loadGroups();
    return () => {
      cancelled = true;
    };
  }, [selectedProgramId, programIdForFormTurmas]);

  useEffect(() => {
    if (classGroupsForm.length === 0) return;
  }, [classGroupsForm]);

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

      const [usersResponse, programsResponse] = await Promise.all([
        studentService.getAll(studentParams),
        programService.getAll(),
      ]);
      setStudents(usersResponse.data || []);
      setPrograms(programsResponse.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      program_id: prev.program_id || selectedProgramId || '',
    }));
    loadData();
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

  const assignmentStudents = useMemo(() => {
    const q = String(assignmentSearchQuery || '').trim().toLowerCase();
    return students.filter((s) => {
      const name = String(s.full_name || '').toLowerCase();
      const nis = String(s.nis_user || s.enrollment_code || '').toLowerCase();
      const matchesText = !q || name.includes(q) || nis.includes(q);
      const matchesTurma =
        assignmentClassFilter === TURMA_FILTER_ALL
          ? true
          : assignmentClassFilter === '__none__'
            ? !s.class_group
            : s.class_group === assignmentClassFilter;
      return matchesText && matchesTurma;
    });
  }, [students, assignmentSearchQuery, assignmentClassFilter]);

  const selectedReferralStudent = useMemo(
    () => students.find((student) => String(student.id) === String(selectedReferralId)),
    [students, selectedReferralId]
  );

  const resetForm = () => {
    setForm({
      ...initialForm(),
      program_id: selectedProgramId || '',
    });
    setEditingId(null);
    setActiveTab('manage');
  };

  const onChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

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

  const toggleArrayValue = (field, value) => {
    setForm((prev) => {
      const current = Array.isArray(prev[field]) ? prev[field] : [];
      const exists = current.includes(value);
      return {
        ...prev,
        [field]: exists ? current.filter((item) => item !== value) : [...current, value],
      };
    });
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

  const addFamilyMember = () => {
    setForm((prev) => ({
      ...prev,
      family_members: [
        ...(Array.isArray(prev.family_members) ? prev.family_members : []),
        { name: '', relationship: '', age: '', education: '', ethnicity: '' },
      ],
    }));
  };

  const updateFamilyMember = (index, field, value) => {
    setForm((prev) => {
      const list = Array.isArray(prev.family_members) ? [...prev.family_members] : [];
      list[index] = { ...(list[index] || {}), [field]: value };
      return { ...prev, family_members: list };
    });
  };

  const removeFamilyMember = (index) => {
    setForm((prev) => {
      const list = Array.isArray(prev.family_members) ? [...prev.family_members] : [];
      list.splice(index, 1);
      return { ...prev, family_members: list };
    });
  };

  const handleAddTurma = async () => {
    const name = newTurmaName.trim();
    if (!name) {
      setError('Informe o nome da turma.');
      return;
    }
    const pid = selectedProgramId;
    if (!pid || !isUuid(pid)) {
      setError('Selecione a unidade ativa no topo para cadastrar turmas.');
      return;
    }

    setTurmaBusy(true);
    setError('');
    setSuccess('');
    try {
      await classGroupService.create({ program_id: pid, name, period: newTurmaPeriod });
      setNewTurmaName('');
      setNewTurmaPeriod('manha');
      setSuccess('Turma cadastrada com sucesso.');
      const listRes = await classGroupService.list(pid);
      setClassGroupsList(listRes.data || []);
      if (programIdForFormTurmas === pid) {
        setClassGroupsForm(listRes.data || []);
      }
      await loadData();
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
      if (selectedProgramId && isUuid(selectedProgramId)) {
        const listRes = await classGroupService.list(selectedProgramId);
        setClassGroupsList(listRes.data || []);
      }
      if (programIdForFormTurmas && isUuid(programIdForFormTurmas)) {
        const formRes = await classGroupService.list(programIdForFormTurmas);
        setClassGroupsForm(formRes.data || []);
      }
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Não foi possível excluir a turma.');
    } finally {
      setTurmaBusy(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (canChooseProgram && !form.program_id) {
      setError('Selecione a unidade do usuário.');
      return;
    }

    setSubmitting(true);

    try {
      const familyMembers = (Array.isArray(form.family_members) ? form.family_members : []).filter((member) =>
        Object.values(member || {}).some((value) => String(value || '').trim())
      );

      const payload = {
        full_name: form.full_name.trim(),
        birth_date: form.birth_date || null,
        nis_user: form.nis_user.trim() || null,
        color: form.color || null,
        cpf_cns: form.cpf_cns.trim() || null,
        is_allergic: Boolean(form.is_allergic),
        allergy_details: form.allergy_details.trim() || null,
        shoe_size: form.shoe_size.trim() || null,
        clothing_size: form.clothing_size.trim() || null,
        has_health_issues: Boolean(form.has_health_issues),
        health_issues_details: form.health_issues_details.trim() || null,
        has_disability: Boolean(form.has_disability),
        disability_details: form.disability_details.trim() || null,
        school_name: form.school_name.trim() || null,
        school_grade: form.school_grade.trim() || null,
        school_shift: form.school_shift || null,
        address_street: form.address_street.trim() || null,
        address_neighborhood: form.address_neighborhood.trim() || null,
        address_reference: form.address_reference.trim() || null,
        address_extra: form.address_extra.trim() || null,
        guardian_name: form.guardian_name.trim() || null,
        guardian_cpf: form.guardian_cpf.trim() || null,
        guardian_nis: form.guardian_nis.trim() || null,
        guardian_phone: form.guardian_phone.trim() || null,
        guardian_relationship: form.guardian_relationship.trim() || null,
        guardian_workplace: form.guardian_workplace.trim() || null,
        family_benefit: Boolean(form.family_benefit),
        family_benefit_details: form.family_benefit_details.trim() || null,
        family_members: familyMembers,
        cras_status: form.cras_status || null,
        cras_link_reason: form.cras_link_reason.trim() || null,
        cras_referral_agency: form.cras_referral_agency.trim() || null,
        cras_technician: form.cras_technician.trim() || null,
        scfv_insertion_date: form.scfv_insertion_date || null,
        scfv_update_date: form.scfv_update_date || null,
        scfv_frequency_days: Array.isArray(form.scfv_frequency_days) ? form.scfv_frequency_days : [],
        scfv_shift: Array.isArray(form.scfv_shift) ? form.scfv_shift : [],
        scfv_group: form.scfv_group.trim() || null,
        scfv_instructor: form.scfv_instructor.trim() || null,
        scfv_boarding: form.scfv_boarding.trim() || null,
        scfv_disembarkation: form.scfv_disembarkation.trim() || null,
        advisor_notes: form.advisor_notes.trim() || null,
      };

      if (canChooseProgram) {
        payload.program_id = form.program_id || null;
      }

      if (editingId) {
        await studentService.update(editingId, payload);
        setSuccess('Dados do usuário atualizados com sucesso.');
      } else {
        await studentService.create(payload);
        setSuccess('Usuário cadastrado com sucesso.');
      }

      resetForm();
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Não foi possível salvar.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    const programId = item.program_id || item.programs?.id || selectedProgramId || '';
    setForm({
      full_name: item.full_name || '',
      birth_date: item.birth_date ? String(item.birth_date).slice(0, 10) : '',
      nis_user: item.nis_user || '',
      color: item.color || '',
      cpf_cns: item.cpf_cns || '',
      is_allergic: Boolean(item.is_allergic),
      allergy_details: item.allergy_details || '',
      shoe_size: item.shoe_size || '',
      clothing_size: item.clothing_size || '',
      has_health_issues: Boolean(item.has_health_issues),
      health_issues_details: item.health_issues_details || '',
      has_disability: Boolean(item.has_disability),
      disability_details: item.disability_details || '',
      school_name: item.school_name || '',
      school_grade: item.school_grade || '',
      school_shift: item.school_shift || '',
      address_street: item.address_street || '',
      address_neighborhood: item.address_neighborhood || '',
      address_reference: item.address_reference || '',
      address_extra: item.address_extra || '',
      guardian_name: item.guardian_name || '',
      guardian_cpf: item.guardian_cpf || '',
      guardian_nis: item.guardian_nis || '',
      guardian_phone: item.guardian_phone || '',
      guardian_relationship: item.guardian_relationship || '',
      guardian_workplace: item.guardian_workplace || '',
      family_benefit: Boolean(item.family_benefit),
      family_benefit_details: item.family_benefit_details || '',
      family_members: Array.isArray(item.family_members) ? item.family_members : [],
      cras_status: item.cras_status || '',
      cras_link_reason: item.cras_link_reason || '',
      cras_referral_agency: item.cras_referral_agency || '',
      cras_technician: item.cras_technician || '',
      scfv_insertion_date: item.scfv_insertion_date ? String(item.scfv_insertion_date).slice(0, 10) : '',
      scfv_update_date: item.scfv_update_date ? String(item.scfv_update_date).slice(0, 10) : '',
      scfv_frequency_days: Array.isArray(item.scfv_frequency_days) ? item.scfv_frequency_days : [],
      scfv_shift: Array.isArray(item.scfv_shift) ? item.scfv_shift : [],
      scfv_group: item.scfv_group || '',
      scfv_instructor: item.scfv_instructor || '',
      scfv_boarding: item.scfv_boarding || '',
      scfv_disembarkation: item.scfv_disembarkation || '',
      advisor_notes: item.advisor_notes || '',
      program_id: programId,
    });
    setActiveTab('register');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const assignStudentToTurma = async (studentId, turmaSlug) => {
    setError('');
    setSuccess('');
    try {
      await studentService.update(studentId, { class_group: turmaSlug || null });
      setSuccess('Atribuição atualizada com sucesso.');
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao atribuir usuário.');
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Remover este usuário do cadastro? Esta ação não pode ser desfeita.')) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      await studentService.delete(id);
      if (editingId === id) {
        resetForm();
      }
      setSuccess('Usuário removido com sucesso.');
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao remover usuário.');
    }
  };

  const showDetails = (student) => {
    setSelectedStudentForDetails(student);
  };

  const closeDetails = () => setSelectedStudentForDetails(null);

  const canManageTurmas = Boolean(selectedProgramId && isUuid(selectedProgramId));

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Intro Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-8 shadow-xl shadow-slate-100/40">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Gestão de Usuários (Alunos)</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Cadastre turmas por unidade e vincule cada usuário à turma correta. Na chamada, só aparecem os usuários da turma escolhida.
            </p>
          </div>
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

      {/* Tabs */}
      <div className="flex border-b border-slate-200/80 pb-0.5 gap-2">
        <button
          className={cn(
            "px-4 py-2 text-sm font-bold border-b-2 transition-all duration-150 cursor-pointer",
            activeTab === 'register'
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          )}
          onClick={() => setActiveTab('register')}
          type="button"
        >
          {editingId ? 'Editar Usuário' : 'Cadastrar Usuário'}
        </button>
        <button
          className={cn(
            "px-4 py-2 text-sm font-bold border-b-2 transition-all duration-150 cursor-pointer",
            activeTab === 'manage'
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          )}
          onClick={() => setActiveTab('manage')}
          type="button"
        >
          Gerenciar Usuários
        </button>
        <button
          className={cn(
            "px-4 py-2 text-sm font-bold border-b-2 transition-all duration-150 cursor-pointer",
            activeTab === 'turmas'
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          )}
          onClick={() => setActiveTab('turmas')}
          type="button"
        >
          Gerenciar Turmas
        </button>
      </div>

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
                      <strong className="text-slate-800 font-bold block mt-0.5">{selectedStudentForDetails.guardian_cpf || '—'}</strong>
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
                    <div className="flex flex-wrap gap-4 bg-slate-50/50 border border-slate-200/60 p-3 rounded-xl">
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

      {/* Main Tab Panels */}
      {activeTab === 'register' && (
        <Card className="border-slate-100 shadow-xl shadow-slate-100/40 bg-white rounded-2xl overflow-hidden border-t-4 border-t-indigo-600">
          <CardHeader className="pb-3 border-b border-slate-100/50">
            <CardTitle className="text-base font-bold text-slate-900">
              {editingId ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Preencha os dados socioassistenciais, composição familiar e detalhes de SCFV e CRAS.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <form className="space-y-6" onSubmit={onSubmit}>
              {/* Seção 1: Dados do Usuário */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-slate-100 pb-2">Dados do Usuário</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label htmlFor="full_name" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Nome Completo</label>
                    <input
                      id="full_name"
                      type="text"
                      name="full_name"
                      placeholder="Nome completo"
                      value={form.full_name}
                      onChange={onChange}
                      required
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="birth_date" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Data de Nascimento</label>
                    <input
                      id="birth_date"
                      type="date"
                      name="birth_date"
                      value={form.birth_date}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="nis_user" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">NIS do Usuário</label>
                    <input
                      id="nis_user"
                      type="text"
                      name="nis_user"
                      placeholder="Número NIS"
                      value={form.nis_user}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="color" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Cor / Etnia</label>
                    <select
                      id="color"
                      name="color"
                      value={form.color}
                      onChange={onChange}
                      className="w-full h-10 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="">Selecione…</option>
                      {COLOR_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="cpf_cns" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">CPF / Cartão SUS</label>
                    <input
                      id="cpf_cns"
                      type="text"
                      name="cpf_cns"
                      placeholder="Identificação fiscal ou SUS"
                      value={form.cpf_cns}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="shoe_size" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">N° Calçado</label>
                    <input
                      id="shoe_size"
                      type="text"
                      name="shoe_size"
                      placeholder="Ex: 36"
                      value={form.shoe_size}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="clothing_size" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Tamanho Roupa</label>
                    <input
                      id="clothing_size"
                      type="text"
                      name="clothing_size"
                      placeholder="Ex: M, 14"
                      value={form.clothing_size}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="col-span-full space-y-2">
                    <div className="flex items-center gap-2 select-none py-1">
                      <input
                        id="is_allergic"
                        type="checkbox"
                        name="is_allergic"
                        checked={form.is_allergic}
                        onChange={onChange}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer"
                      />
                      <label htmlFor="is_allergic" className="text-xs font-bold text-slate-700 cursor-pointer">É alérgico?</label>
                    </div>

                    {form.is_allergic && (
                      <div className="space-y-1.5">
                        <label htmlFor="allergy_details" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Se sim, a quê?</label>
                        <input
                          id="allergy_details"
                          type="text"
                          name="allergy_details"
                          placeholder="Ex: Lactose, Dipirona, Corantes"
                          value={form.allergy_details}
                          onChange={onChange}
                          className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                        />
                      </div>
                    )}
                  </div>

                  <div className="col-span-full space-y-2">
                    <div className="flex items-center gap-2 select-none py-1">
                      <input
                        id="has_health_issues"
                        type="checkbox"
                        name="has_health_issues"
                        checked={form.has_health_issues}
                        onChange={onChange}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer"
                      />
                      <label htmlFor="has_health_issues" className="text-xs font-bold text-slate-700 cursor-pointer">Possui problemas de saúde?</label>
                    </div>

                    {form.has_health_issues && (
                      <div className="space-y-1.5">
                        <label htmlFor="health_issues_details" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Se sim, quais?</label>
                        <input
                          id="health_issues_details"
                          type="text"
                          name="health_issues_details"
                          placeholder="Descreva a condição de saúde"
                          value={form.health_issues_details}
                          onChange={onChange}
                          className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                        />
                      </div>
                    )}
                  </div>

                  <div className="col-span-full space-y-2">
                    <div className="flex items-center gap-2 select-none py-1">
                      <input
                        id="has_disability"
                        type="checkbox"
                        name="has_disability"
                        checked={form.has_disability}
                        onChange={onChange}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer"
                      />
                      <label htmlFor="has_disability" className="text-xs font-bold text-slate-700 cursor-pointer">Possui deficiência (PCD)?</label>
                    </div>

                    {form.has_disability && (
                      <div className="space-y-1.5">
                        <label htmlFor="disability_details" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Se sim, qual?</label>
                        <input
                          id="disability_details"
                          type="text"
                          name="disability_details"
                          placeholder="Descreva a deficiência"
                          value={form.disability_details}
                          onChange={onChange}
                          className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Seção 2: Escola e Unidade */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-slate-100 pb-2">Escolarização e Unidade Física</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label htmlFor="school_name" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Nome da Escola</label>
                    <input
                      id="school_name"
                      type="text"
                      name="school_name"
                      placeholder="Escola que frequenta"
                      value={form.school_name}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="school_grade" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Série / Ano Escolar</label>
                    <input
                      id="school_grade"
                      type="text"
                      name="school_grade"
                      placeholder="Ex: 7º ano"
                      value={form.school_grade}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="school_shift" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Turno Escolar</label>
                    <select
                      id="school_shift"
                      name="school_shift"
                      value={form.school_shift}
                      onChange={onChange}
                      className="w-full h-10 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="">Selecione…</option>
                      {SCHOOL_SHIFT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label htmlFor="program_id" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Unidade do Usuário</label>
                    {canChooseProgram ? (
                      <select
                        id="program_id"
                        name="program_id"
                        value={form.program_id}
                        onChange={onChange}
                        required
                        className="w-full h-10 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                      >
                        <option value="">Selecione a unidade…</option>
                        {programs.map((program) => (
                          <option key={program.id} value={program.id}>
                            {program.name} {program.location ? ` · ${program.location}` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="h-10 px-3 flex items-center bg-slate-100 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg">
                        {selectedProgramName}
                      </div>
                    )}
                    {!canChooseProgram && <input type="hidden" name="program_id" value={form.program_id} />}
                  </div>
                </div>
              </div>

              {/* Seção 3: Dados de Endereço */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-slate-100 pb-2">Endereço Residencial</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label htmlFor="address_street" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Rua, Número</label>
                    <input
                      id="address_street"
                      type="text"
                      name="address_street"
                      placeholder="Ex: Rua das Flores, 123"
                      value={form.address_street}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="address_neighborhood" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Bairro</label>
                    <input
                      id="address_neighborhood"
                      type="text"
                      name="address_neighborhood"
                      placeholder="Bairro"
                      value={form.address_neighborhood}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label htmlFor="address_reference" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Ponto de Referência</label>
                    <input
                      id="address_reference"
                      type="text"
                      name="address_reference"
                      placeholder="Ex: Próximo à padaria central"
                      value={form.address_reference}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-full">
                    <label htmlFor="address_extra" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Dados Adicionais</label>
                    <textarea
                      id="address_extra"
                      name="address_extra"
                      placeholder="Complementos de endereço, bloco, apartamento..."
                      value={form.address_extra}
                      onChange={onChange}
                      rows={3}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all resize-y min-h-[5.5rem]"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 4: Dados do Responsável */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-slate-100 pb-2">Informações do Responsável Legal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label htmlFor="guardian_name" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Nome do Responsável</label>
                    <input
                      id="guardian_name"
                      type="text"
                      name="guardian_name"
                      placeholder="Nome completo do responsável"
                      value={form.guardian_name}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="guardian_cpf" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">CPF do Responsável</label>
                    <input
                      id="guardian_cpf"
                      type="text"
                      name="guardian_cpf"
                      placeholder="CPF"
                      value={form.guardian_cpf}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="guardian_nis" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">NIS do Responsável</label>
                    <input
                      id="guardian_nis"
                      type="text"
                      name="guardian_nis"
                      placeholder="Número NIS"
                      value={form.guardian_nis}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="guardian_phone" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Celular / Contato</label>
                    <input
                      id="guardian_phone"
                      type="tel"
                      name="guardian_phone"
                      placeholder="(00) 00000-0000"
                      value={form.guardian_phone}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="guardian_relationship" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Parentesco</label>
                    <input
                      id="guardian_relationship"
                      type="text"
                      name="guardian_relationship"
                      placeholder="Ex: Mãe, Pai, Avó"
                      value={form.guardian_relationship}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label htmlFor="guardian_workplace" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Local de Trabalho</label>
                    <input
                      id="guardian_workplace"
                      type="text"
                      name="guardian_workplace"
                      placeholder="Local ou empresa onde trabalha"
                      value={form.guardian_workplace}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 5: Situação Socioeconômica */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-slate-100 pb-2">Situação Socioeconômica Familiar</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 select-none py-1">
                    <input
                      id="family_benefit"
                      type="checkbox"
                      name="family_benefit"
                      checked={form.family_benefit}
                      onChange={onChange}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer"
                    />
                    <label htmlFor="family_benefit" className="text-xs font-bold text-slate-700 cursor-pointer">A família recebe benefício social?</label>
                  </div>

                  {form.family_benefit && (
                    <div className="space-y-1.5 max-w-md">
                      <label htmlFor="family_benefit_details" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Se sim, qual?</label>
                      <input
                        id="family_benefit_details"
                        type="text"
                        name="family_benefit_details"
                        placeholder="Ex: Bolsa Família, BPC"
                        value={form.family_benefit_details}
                        onChange={onChange}
                        className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                      />
                    </div>
                  )}

                  <div className="space-y-3 pt-2 border-t border-slate-100/70">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">Composição Familiar</label>
                    <div className="space-y-2.5">
                      {(form.family_members || []).length === 0 && (
                        <p className="text-xs font-semibold text-slate-400 italic">Nenhum familiar adicionado até o momento.</p>
                      )}
                      {(form.family_members || []).map((member, index) => (
                        <div
                          key={`${index}-member`}
                          className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end border border-slate-200/60 bg-slate-50/20 p-4 rounded-xl relative"
                        >
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nome</span>
                            <input
                              className="w-full h-9 px-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                              type="text"
                              placeholder="Nome completo"
                              value={member?.name || ''}
                              onChange={(e) => updateFamilyMember(index, 'name', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Vínculo</span>
                            <input
                              className="w-full h-9 px-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                              type="text"
                              placeholder="Ex: Pai, Mãe"
                              value={member?.relationship || ''}
                              onChange={(e) => updateFamilyMember(index, 'relationship', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Idade</span>
                            <input
                              className="w-full h-9 px-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                              type="text"
                              placeholder="Idade"
                              value={member?.age || ''}
                              onChange={(e) => updateFamilyMember(index, 'age', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Escolaridade</span>
                            <input
                              className="w-full h-9 px-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                              type="text"
                              placeholder="Grau"
                              value={member?.education || ''}
                              onChange={(e) => updateFamilyMember(index, 'education', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1 flex gap-2 items-center sm:col-span-1">
                            <div className="flex-1 space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Etnia</span>
                              <input
                                className="w-full h-9 px-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                                type="text"
                                placeholder="Etnia"
                                value={member?.ethnicity || ''}
                                onChange={(e) => updateFamilyMember(index, 'ethnicity', e.target.value)}
                              />
                            </div>
                            <button
                              type="button"
                              className="h-9 px-3 hover:bg-red-50 hover:text-red-600 rounded-lg border border-slate-200 hover:border-red-100 text-slate-400 transition-all flex items-center justify-center cursor-pointer mt-5"
                              onClick={() => removeFamilyMember(index)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-950 transition-colors shadow-sm cursor-pointer"
                        onClick={addFamilyMember}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Adicionar Familiar
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 6: CRAS/CREAS */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-slate-100 pb-2">Encaminhamento Técnico CRAS / CREAS</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5 col-span-full">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Situação de Prioridade</label>
                    <div className="flex gap-4">
                      {CRAS_STATUS_OPTIONS.map((option) => (
                        <label key={option} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="cras_status"
                            value={option}
                            checked={form.cras_status === option}
                            onChange={onChange}
                            className="border-slate-300 text-indigo-600 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer"
                          />
                          <span>{option === 'prioritario' ? 'Prioritário' : 'Não Prioritário'}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label htmlFor="cras_link_reason" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Motivo do Vínculo</label>
                    <input
                      id="cras_link_reason"
                      type="text"
                      name="cras_link_reason"
                      placeholder="Motivo da vinculação ao CRAS/CREAS"
                      value={form.cras_link_reason}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="cras_referral_agency" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Órgão Encaminhador</label>
                    <input
                      id="cras_referral_agency"
                      type="text"
                      name="cras_referral_agency"
                      placeholder="Ex: CRAS I"
                      value={form.cras_referral_agency}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label htmlFor="cras_technician" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Técnico Responsável</label>
                    <input
                      id="cras_technician"
                      type="text"
                      name="cras_technician"
                      placeholder="Nome do assistente social ou técnico"
                      value={form.cras_technician}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 7: SCFV */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-slate-100 pb-2">Informações do SCFV</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="scfv_insertion_date" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Data de Inserção</label>
                    <input
                      id="scfv_insertion_date"
                      type="date"
                      name="scfv_insertion_date"
                      value={form.scfv_insertion_date}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="scfv_update_date" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Data de Atualização</label>
                    <input
                      id="scfv_update_date"
                      type="date"
                      name="scfv_update_date"
                      value={form.scfv_update_date}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Dias de frequência no SCFV</label>
                    <div className="flex flex-wrap gap-4 bg-slate-50/55 border border-slate-200/60 p-3 rounded-xl">
                      {WEEK_DAYS.map((day) => (
                        <label key={day.value} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={form.scfv_frequency_days.includes(day.value)}
                            onChange={() => toggleArrayValue('scfv_frequency_days', day.value)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer"
                          />
                          <span>{day.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 md:col-span-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Turno no SCFV</label>
                    <div className="flex flex-wrap gap-4 bg-slate-50/55 border border-slate-200/60 p-3 rounded-xl">
                      {SCFV_SHIFTS.map((shift) => (
                        <label key={shift.value} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={form.scfv_shift.includes(shift.value)}
                            onChange={() => toggleArrayValue('scfv_shift', shift.value)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer"
                          />
                          <span>{shift.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="scfv_group" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Grupo SCFV</label>
                    <input
                      id="scfv_group"
                      type="text"
                      name="scfv_group"
                      placeholder="Grupo"
                      value={form.scfv_group}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="scfv_instructor" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Orientador(a) Técnico(a)</label>
                    <input
                      id="scfv_instructor"
                      type="text"
                      name="scfv_instructor"
                      placeholder="Nome do orientador"
                      value={form.scfv_instructor}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="scfv_boarding" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Embarque (Transporte)</label>
                    <input
                      id="scfv_boarding"
                      type="text"
                      name="scfv_boarding"
                      placeholder="Local de embarque"
                      value={form.scfv_boarding}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="scfv_disembarkation" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Desembarque</label>
                    <input
                      id="scfv_disembarkation"
                      type="text"
                      name="scfv_disembarkation"
                      placeholder="Local de desembarque"
                      value={form.scfv_disembarkation}
                      onChange={onChange}
                      className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-full">
                    <label htmlFor="advisor_notes" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Observações do Orientador</label>
                    <textarea
                      id="advisor_notes"
                      name="advisor_notes"
                      placeholder="Evolução, comportamento, anotações de acompanhamento..."
                      value={form.advisor_notes}
                      onChange={onChange}
                      rows={4}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all resize-y min-h-[5.5rem]"
                    />
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={submitting}
                  className="h-10 px-4 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-10 px-6 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {submitting ? 'Salvando…' : editingId ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'manage' && (
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
                  : 'Nenhum usuário nesta unidade ainda. Use a aba "Cadastrar Usuário" para começar.'}
              </div>
            ) : (
              <div className="overflow-x-auto w-full border border-slate-100 rounded-xl shadow-sm bg-white">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400">Nome</th>
                      <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400">Nascimento</th>
                      <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400">NIS</th>
                      <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400">Turma</th>
                      {canChooseProgram && <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400">Unidade</th>}
                      <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400">Celular</th>
                      <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-5 py-4 font-bold text-slate-800">{item.full_name}</td>
                        <td className="px-5 py-4 text-slate-500 font-medium">{formatDateBR(item.birth_date)}</td>
                        <td className="px-5 py-4 text-slate-500 font-medium">
                          <MaskedValue value={item.nis_user || item.enrollment_code} />
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                            item.class_group
                              ? "bg-indigo-50 text-indigo-700 border-indigo-100/70"
                              : "bg-amber-50 text-amber-700 border-amber-100/70"
                          )}>
                            {turmaLabel(classGroupsList, item.class_group)}
                          </span>
                        </td>
                        {canChooseProgram && <td className="px-5 py-4 text-slate-500 font-medium">{item.programs?.name || '—'}</td>}
                        <td className="px-5 py-4 text-slate-500 font-medium">{item.guardian_phone || '—'}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg border border-slate-200/80 text-slate-400 transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); showDetails(item); }}
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'turmas' && (
        <Card className="border-slate-100 shadow-xl shadow-slate-100/40 bg-white rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100/50">
            <CardTitle className="text-base font-bold text-slate-900">Gerenciar Turmas da Unidade</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              As turmas valem para a unidade física selecionada no cabeçalho. Usuários vinculados a turmas aparecem no diário de chamadas.
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
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5">Turmas Ativas</h4>
                  {classGroupsList.length === 0 ? (
                    <p className="text-xs text-slate-400 font-semibold italic">Nenhuma turma cadastrada para esta unidade. Adicione uma no painel acima.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {classGroupsList.map((t) => (
                        <div key={t.id} className="flex justify-between items-center bg-white border border-slate-200/60 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                          <div>
                            <strong className="text-sm font-bold text-slate-800">{t.name}</strong>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider ml-1">({t.slug})</span>
                            <div className="text-[11px] text-slate-500 font-semibold mt-1">
                              {t.period ? (t.period === 'manha' ? '🌅 Manhã' : t.period === 'tarde' ? '🌤️ Tarde' : ` · ${t.period}`) : '—'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveTurma(t)}
                            disabled={turmaBusy}
                            className="inline-flex items-center justify-center p-2 rounded-lg text-red-500 hover:bg-red-50 border border-slate-100 hover:border-red-100 transition-colors disabled:opacity-30 cursor-pointer"
                            title="Excluir turma"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Assignment UI */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">Atribuição Rápida de Usuários</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Vincule rapidamente cada usuário a uma turma cadastrada na unidade.</p>
                  </div>

                  <div className="flex flex-wrap gap-4 items-center bg-slate-50/50 p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex-1 min-w-[200px] relative">
                      <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="search"
                        placeholder="Buscar usuário por nome ou NIS..."
                        value={assignmentSearchQuery}
                        onChange={(e) => setAssignmentSearchQuery(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                      />
                    </div>

                    <div className="w-full sm:w-auto min-w-[180px] space-y-1">
                      <select
                        id="assignment-filter-turma"
                        value={assignmentClassFilter}
                        onChange={(e) => setAssignmentClassFilter(e.target.value)}
                        className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                      >
                        <option value={TURMA_FILTER_ALL}>Todas as turmas</option>
                        <option value="__none__">Sem turma</option>
                        {classGroupsList.map((turma) => (
                          <option key={turma.id} value={turma.slug}>
                            {turma.name} {turma.period ? ` (${turma.period === 'manha' ? 'Manhã' : 'Tarde'})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {classGroupsList.length === 0 ? (
                    <p className="text-xs text-slate-400 font-semibold italic">Nenhuma turma disponível para realizar atribuições.</p>
                  ) : students.length === 0 ? (
                    <p className="text-xs text-slate-400 font-semibold italic">Nenhum usuário cadastrado nesta unidade.</p>
                  ) : assignmentStudents.length === 0 ? (
                    <p className="text-xs text-slate-400 font-semibold italic">Nenhum usuário corresponde aos filtros aplicados.</p>
                  ) : (
                    <div className="overflow-x-auto w-full border border-slate-100 rounded-xl shadow-sm bg-white">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400">Nome</th>
                            <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400">NIS</th>
                            <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400">Turma Atribuída</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {assignmentStudents.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-5 py-4 font-bold text-slate-800">{s.full_name}</td>
                              <td className="px-5 py-4 text-slate-500 font-medium">
                                <MaskedValue value={s.nis_user || s.enrollment_code} />
                              </td>
                              <td className="px-5 py-4">
                                <select
                                  value={s.class_group || ''}
                                  onChange={(e) => assignStudentToTurma(s.id, e.target.value || null)}
                                  className="w-full max-w-[240px] h-9 px-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                                >
                                  <option value="">Sem turma</option>
                                  {classGroupsList.map((turma) => (
                                    <option key={turma.id} value={turma.slug}>
                                      {turma.name} {turma.period ? ` (${turma.period === 'manha' ? '🌅 Manhã' : '🌤️ Tarde'})` : ''}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default Students;
