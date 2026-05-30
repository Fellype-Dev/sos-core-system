import { useEffect, useMemo, useState } from 'react';
import useAuth from '../hooks/useAuth';
import studentService from '../services/studentService';
import programService from '../services/programService';
import classGroupService from '../services/classGroupService';
import referralService from '../services/referralService';
import { TURMA_FILTER_ALL } from '../constants/turmas';
import '../styles/Students.css';

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
  // class_group removed: assignment happens in 'Gerenciar turmas'
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
  { value: 'manha', label: 'Manha' },
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
  { value: 'cpc_viver', label: 'Centro Publico de Convivencia - Viver' },
];
const PRIORITY_CONDITIONS = [
  { value: 'isolamento', label: 'Em situacao de isolamento' },
  { value: 'trabalho_infantil', label: 'Trabalho infantil' },
  { value: 'violencia_negligencia', label: 'Vivencia de violencia e/ou negligencia' },
  { value: 'defasagem_escolar', label: 'Fora da escola ou com defasagem escolar superior a 2 anos' },
  { value: 'acolhimento', label: 'Em situacao de acolhimento' },
  { value: 'medida_socioeducativa', label: 'Em cumprimento de medida socioeducativa em meio aberto' },
  { value: 'egresso_socioeducativa', label: 'Egressos de medidas socioeducativas' },
  { value: 'abuso_exploracao', label: 'Situacao de abuso ou exploracao sexual' },
  { value: 'medida_protecao_eca', label: 'Com medidas de protecao do ECA' },
  { value: 'situacao_rua', label: 'Criancas e adolescentes em situacao de rua' },
  { value: 'vulnerabilidade_pcd', label: 'Vulnerabilidade relacionada a pessoas com deficiencia' },
  { value: 'nao_prioritario', label: 'Nao esta entre as situacoes prioritarias (CNAS 01/2013)' },
];
const PRIORITY_AXES = [
  { value: 'eu_comigo', label: 'I. Eixo "Eu Comigo"' },
  { value: 'eu_com_os_outros', label: 'II. Eixo "Eu com os Outros"' },
  { value: 'eu_com_a_cidade', label: 'III. Eixo "Eu com a cidade"' },
  { value: 'eu_com_quem_cuida', label: 'IV. Eixo "Eu com quem cuida de mim" (ate 6 anos)' },
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
    // keep form as-is; we don't assign turma at registration time
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
      setError(err?.response?.data?.message || 'Falha ao carregar usuarios.');
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
      // no class_group by default
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
      setError('Selecione um usuario para criar o encaminhamento.');
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
      setSuccess('Encaminhamento criado.');
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
      setSuccess('Turma cadastrada.');
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
        `Excluir a turma "${row.name}"? Só é permitido se não houver usuarios nem chamadas usando essa turma.`
      )
    ) {
      return;
    }
    setTurmaBusy(true);
    setError('');
    setSuccess('');
    try {
      await classGroupService.remove(row.id);
      setSuccess('Turma removida.');
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
      setError('Selecione a unidade do usuario.');
      return;
    }

    // turma será atribuída em 'Gerenciar turmas'

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
        // class_group intentionally omitted: assignment happens in 'Gerenciar turmas'
      };

      if (canChooseProgram) {
        payload.program_id = form.program_id || null;
      }

      if (editingId) {
        await studentService.update(editingId, payload);
        setSuccess('Dados do usuario atualizados.');
      } else {
        await studentService.create(payload);
        setSuccess('Usuario cadastrado com sucesso.');
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
      // class_group left out of the edit form
    });
    setActiveTab('register');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const assignStudentToTurma = async (studentId, turmaSlug) => {
    setError('');
    setSuccess('');
    try {
      await studentService.update(studentId, { class_group: turmaSlug || null });
      setSuccess('Atribuição atualizada.');
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao atribuir usuario.');
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Remover este usuario do cadastro? Esta ação não pode ser desfeita.')) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      await studentService.delete(id);
      if (editingId === id) {
        resetForm();
      }
      setSuccess('Usuario removido.');
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao remover usuario.');
    }
  };

  const showDetails = (student) => {
    setSelectedStudentForDetails(student);
  };

  const closeDetails = () => setSelectedStudentForDetails(null);

  const canManageTurmas = Boolean(selectedProgramId && isUuid(selectedProgramId));

  return (
    <div className="students-page">
      <header className="students-page__intro">
        <h1>Usuarios</h1>
        <p>
          Cadastre turmas por unidade e vincule cada usuario à turma correta. Na chamada, só aparecem os usuarios da
          turma escolhida naquele dia.
        </p>
      </header>

      {error && <p className="students-alert students-alert--error">{error}</p>}
      {success && <p className="students-alert students-alert--success">{success}</p>}

      <div className="students-tabs">
        <button
          className={`students-tab ${activeTab === 'register' ? 'students-tab--active' : ''}`}
          onClick={() => setActiveTab('register')}
          type="button"
        >
          {editingId ? 'Editar usuario' : 'Cadastrar usuario'}
        </button>
        <button
          className={`students-tab ${activeTab === 'manage' ? 'students-tab--active' : ''}`}
          onClick={() => setActiveTab('manage')}
          type="button"
        >
          Gerenciar usuarios
        </button>
        <button
          className={`students-tab ${activeTab === 'turmas' ? 'students-tab--active' : ''}`}
          onClick={() => setActiveTab('turmas')}
          type="button"
        >
          Gerenciar turmas
        </button>
      </div>
      {selectedStudentForDetails && (
        <div className="students-modal-backdrop" onClick={closeDetails}>
          <div className="students-modal" onClick={(e) => e.stopPropagation()}>
            <div className="students-modal__header">
              <div>
                <h3>Detalhes do usuario</h3>
                <p className="students-modal__subtitle">
                  NIS: {selectedStudentForDetails.nis_user || '—'} | CPF/CNS: {selectedStudentForDetails.cpf_cns || '—'}
                </p>
              </div>
              <span className="students-modal__pill">
                {selectedStudentForDetails.is_active ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <div className="students-modal__grid">
              <section className="students-modal__section">
                <h4 className="students-modal__section-title">Dados do usuario</h4>
                <div className="students-modal__fields">
                  <div className="students-modal__field">
                    <span>Nome</span>
                    <strong>{selectedStudentForDetails.full_name || '—'}</strong>
                  </div>
                  <div className="students-modal__field">
                    <span>Nascimento</span>
                    <strong>{formatDateBR(selectedStudentForDetails.birth_date)}</strong>
                  </div>
                  <div className="students-modal__field">
                    <span>Cor</span>
                    <strong>{selectedStudentForDetails.color || '—'}</strong>
                  </div>
                  <div className="students-modal__field">
                    <span>Calcado</span>
                    <strong>{selectedStudentForDetails.shoe_size || '—'}</strong>
                  </div>
                  <div className="students-modal__field">
                    <span>Roupa</span>
                    <strong>{selectedStudentForDetails.clothing_size || '—'}</strong>
                  </div>
                  <div className="students-modal__field">
                    <span>Alergico</span>
                    <strong>{selectedStudentForDetails.is_allergic ? 'Sim' : 'Nao'}</strong>
                  </div>
                  {selectedStudentForDetails.is_allergic && (
                    <div className="students-modal__field students-modal__field--span2">
                      <span>Alergia a</span>
                      <strong>{selectedStudentForDetails.allergy_details || '—'}</strong>
                    </div>
                  )}
                  <div className="students-modal__field">
                    <span>Saude</span>
                    <strong>{selectedStudentForDetails.has_health_issues ? 'Sim' : 'Nao'}</strong>
                  </div>
                  {selectedStudentForDetails.has_health_issues && (
                    <div className="students-modal__field students-modal__field--span2">
                      <span>Problema de saude</span>
                      <strong>{selectedStudentForDetails.health_issues_details || '—'}</strong>
                    </div>
                  )}
                  <div className="students-modal__field">
                    <span>Deficiencia</span>
                    <strong>{selectedStudentForDetails.has_disability ? 'Sim' : 'Nao'}</strong>
                  </div>
                  {selectedStudentForDetails.has_disability && (
                    <div className="students-modal__field students-modal__field--span2">
                      <span>Qual</span>
                      <strong>{selectedStudentForDetails.disability_details || '—'}</strong>
                    </div>
                  )}
                </div>
              </section>

              <section className="students-modal__section">
                <h4 className="students-modal__section-title">Escola</h4>
                <div className="students-modal__fields">
                  <div className="students-modal__field">
                    <span>Escola</span>
                    <strong>{selectedStudentForDetails.school_name || '—'}</strong>
                  </div>
                  <div className="students-modal__field">
                    <span>Serie</span>
                    <strong>{selectedStudentForDetails.school_grade || '—'}</strong>
                  </div>
                  <div className="students-modal__field">
                    <span>Turno</span>
                    <strong>{selectedStudentForDetails.school_shift || '—'}</strong>
                  </div>
                </div>
              </section>

              <section className="students-modal__section">
                <h4 className="students-modal__section-title">Endereco</h4>
                <div className="students-modal__fields">
                  <div className="students-modal__field students-modal__field--span2">
                    <span>Endereco</span>
                    <strong>{selectedStudentForDetails.address_street || '—'}</strong>
                  </div>
                  <div className="students-modal__field">
                    <span>Bairro</span>
                    <strong>{selectedStudentForDetails.address_neighborhood || '—'}</strong>
                  </div>
                  <div className="students-modal__field">
                    <span>Ponto de referencia</span>
                    <strong>{selectedStudentForDetails.address_reference || '—'}</strong>
                  </div>
                  <div className="students-modal__field students-modal__field--span2">
                    <span>Dados adicionais</span>
                    <strong>{selectedStudentForDetails.address_extra || '—'}</strong>
                  </div>
                </div>
              </section>

              <section className="students-modal__section">
                <h4 className="students-modal__section-title">Responsavel</h4>
                <div className="students-modal__fields">
                  <div className="students-modal__field">
                    <span>Nome</span>
                    <strong>{selectedStudentForDetails.guardian_name || '—'}</strong>
                  </div>
                  <div className="students-modal__field">
                    <span>CPF</span>
                    <strong>{selectedStudentForDetails.guardian_cpf || '—'}</strong>
                  </div>
                  <div className="students-modal__field">
                    <span>NIS</span>
                    <strong>{selectedStudentForDetails.guardian_nis || '—'}</strong>
                  </div>
                  <div className="students-modal__field">
                    <span>Celular</span>
                    <strong>{selectedStudentForDetails.guardian_phone || '—'}</strong>
                  </div>
                  <div className="students-modal__field">
                    <span>Parentesco</span>
                    <strong>{selectedStudentForDetails.guardian_relationship || '—'}</strong>
                  </div>
                  <div className="students-modal__field">
                    <span>Trabalho</span>
                    <strong>{selectedStudentForDetails.guardian_workplace || '—'}</strong>
                  </div>
                </div>
              </section>

              <section className="students-modal__section">
                <h4 className="students-modal__section-title">Situacao socioeconomica</h4>
                <div className="students-modal__fields">
                  <div className="students-modal__field">
                    <span>Beneficio</span>
                    <strong>{selectedStudentForDetails.family_benefit ? 'Sim' : 'Nao'}</strong>
                  </div>
                  {selectedStudentForDetails.family_benefit && (
                    <div className="students-modal__field students-modal__field--span2">
                      <span>Qual</span>
                      <strong>{selectedStudentForDetails.family_benefit_details || '—'}</strong>
                    </div>
                  )}
                  <div className="students-modal__field students-modal__field--span2">
                    <span>Composicao familiar</span>
                    {Array.isArray(selectedStudentForDetails.family_members) &&
                    selectedStudentForDetails.family_members.length > 0 ? (
                      <div className="students-modal__family-grid" role="table" aria-label="Composicao familiar">
                        <div className="students-modal__family-row students-modal__family-row--header" role="row">
                          <span role="columnheader">Nome</span>
                          <span role="columnheader">Vinculo</span>
                          <span role="columnheader">Idade</span>
                          <span role="columnheader">Escolaridade</span>
                          <span role="columnheader">Etnia</span>
                        </div>
                        {selectedStudentForDetails.family_members.map((member, index) => (
                          <div key={`fam-${index}`} className="students-modal__family-row" role="row">
                            <span role="cell">{member?.name || '—'}</span>
                            <span role="cell">{member?.relationship || '—'}</span>
                            <span role="cell">{member?.age || '—'}</span>
                            <span role="cell">{member?.education || '—'}</span>
                            <span role="cell">{member?.ethnicity || '—'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <strong>—</strong>
                    )}
                  </div>
                </div>
              </section>

              <section className="students-modal__section">
                <h4 className="students-modal__section-title">CRAS/CREAS</h4>
                <div className="students-modal__fields">
                  <div className="students-modal__field">
                    <span>Situacao</span>
                    <strong>{selectedStudentForDetails.cras_status || '—'}</strong>
                  </div>
                  <div className="students-modal__field students-modal__field--span2">
                    <span>Motivo</span>
                    <strong>{selectedStudentForDetails.cras_link_reason || '—'}</strong>
                  </div>
                  <div className="students-modal__field">
                    <span>Orgao</span>
                    <strong>{selectedStudentForDetails.cras_referral_agency || '—'}</strong>
                  </div>
                  <div className="students-modal__field">
                    <span>Tecnico</span>
                    <strong>{selectedStudentForDetails.cras_technician || '—'}</strong>
                  </div>
                </div>
              </section>

              <section className="students-modal__section">
                <h4 className="students-modal__section-title">SCFV</h4>
                <div className="students-modal__fields">
                  <div className="students-modal__field">
                    <span>Grupo</span>
                    <strong>{selectedStudentForDetails.scfv_group || '—'}</strong>
                  </div>
                  <div className="students-modal__field">
                    <span>Insercao</span>
                    <strong>{formatDateBR(selectedStudentForDetails.scfv_insertion_date)}</strong>
                  </div>
                  <div className="students-modal__field">
                    <span>Atualizacao</span>
                    <strong>{formatDateBR(selectedStudentForDetails.scfv_update_date)}</strong>
                  </div>
                  <div className="students-modal__field students-modal__field--span2">
                    <span>Dias</span>
                    <strong>
                      {Array.isArray(selectedStudentForDetails.scfv_frequency_days)
                        ? selectedStudentForDetails.scfv_frequency_days.join(', ') || '—'
                        : '—'}
                    </strong>
                  </div>
                  <div className="students-modal__field">
                    <span>Turno</span>
                    <strong>
                      {Array.isArray(selectedStudentForDetails.scfv_shift)
                        ? selectedStudentForDetails.scfv_shift.join(', ') || '—'
                        : '—'}
                    </strong>
                  </div>
                  <div className="students-modal__field">
                    <span>Orientador(a)</span>
                    <strong>{selectedStudentForDetails.scfv_instructor || '—'}</strong>
                  </div>
                  <div className="students-modal__field">
                    <span>Embarque</span>
                    <strong>{selectedStudentForDetails.scfv_boarding || '—'}</strong>
                  </div>
                  <div className="students-modal__field">
                    <span>Desembarque</span>
                    <strong>{selectedStudentForDetails.scfv_disembarkation || '—'}</strong>
                  </div>
                </div>
              </section>

              <section className="students-modal__section">
                <h4 className="students-modal__section-title">Observacoes</h4>
                <div className="students-modal__fields">
                  <div className="students-modal__field students-modal__field--span2">
                    <span>Anotacoes dos orientadores</span>
                    <strong>{selectedStudentForDetails.advisor_notes || '—'}</strong>
                  </div>
                </div>
              </section>
            </div>

            <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
              <button
                className="students-btn students-btn--secondary"
                type="button"
                onClick={() => openReferralForStudent(selectedStudentForDetails)}
              >
                Ficha de encaminhamento
              </button>
              <button className="students-btn students-btn--ghost" type="button" onClick={closeDetails}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedReferralForModal && (
        <div className="students-modal-backdrop" onClick={closeReferralModal}>
          <div className="students-modal" onClick={(e) => e.stopPropagation()}>
            <div className="students-modal__header">
              <div>
                <h3>Ficha de encaminhamento — {selectedReferralForModal.full_name}</h3>
                <p className="students-modal__subtitle">Preencha os dados do encaminhamento e salve.</p>
              </div>
            </div>

            <form onSubmit={submitReferral}>
              <div className="students-section">
                <div className="students-grid2">
                  <div className="students-field">
                    <label>Faixa etaria</label>
                    <select name="referral_age_range" value={referralForm.referral_age_range} onChange={onReferralChange}>
                      <option value="">Selecione…</option>
                      {REFERRAL_AGE_RANGES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div className="students-field students-field--span2">
                    <label>Programas SCFV</label>
                    <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                      {REFERRAL_SCFV_PROGRAMS.map((p) => (
                        <label key={p.value} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={referralForm.referral_scfv_programs.includes(p.value)}
                            onChange={() => toggleReferralArrayValue('referral_scfv_programs', p.value)}
                          />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="students-field">
                    <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input type="checkbox" name="referral_spontaneous_demand" checked={referralForm.referral_spontaneous_demand} onChange={onReferralChange} />
                      Demanda espontanea
                    </label>
                  </div>

                  <div className="students-field">
                    <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input type="checkbox" name="referral_family_member_in_scfv" checked={referralForm.referral_family_member_in_scfv} onChange={onReferralChange} />
                      Familiar ja frequenta SCFV
                    </label>
                  </div>

                  <div className="students-field">
                    <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input type="checkbox" name="referral_family_followup" checked={referralForm.referral_family_followup} onChange={onReferralChange} />
                      Familia em acompanhamento
                    </label>
                  </div>

                  <div className="students-field">
                    <label>Responsavel PCD (nome)</label>
                    <input name="referral_pcd_responsible_name" value={referralForm.referral_pcd_responsible_name} onChange={onReferralChange} />
                  </div>

                  <div className="students-field">
                    <label>Responsavel PCD (telefone)</label>
                    <input name="referral_pcd_responsible_phone" value={referralForm.referral_pcd_responsible_phone} onChange={onReferralChange} />
                  </div>

                  <div className="students-field students-field--span2">
                    <label>Condicoes prioritarias</label>
                    <div style={{ display: 'grid', gap: '0.4rem' }}>
                      {PRIORITY_CONDITIONS.map((c) => (
                        <label key={c.value} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <input type="checkbox" checked={referralForm.referral_priority_conditions.includes(c.value)} onChange={() => toggleReferralArrayValue('referral_priority_conditions', c.value)} />
                          {c.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="students-field students-field--span2">
                    <label>Eixos prioritarios</label>
                    <div style={{ display: 'grid', gap: '0.4rem' }}>
                      {PRIORITY_AXES.map((a) => (
                        <label key={a.value} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <input type="checkbox" checked={referralForm.referral_priority_axes.includes(a.value)} onChange={() => toggleReferralArrayValue('referral_priority_axes', a.value)} />
                          {a.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="students-field students-field--span2">
                    <label>Observacoes</label>
                    <textarea name="notes" value={referralForm.notes || ''} onChange={onReferralChange} rows={4} />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
                <button type="button" className="students-btn students-btn--ghost" onClick={closeReferralModal}>Cancelar</button>
                <button type="submit" className="students-btn students-btn--primary" disabled={referralSaving} style={{ marginLeft: '0.5rem' }}>
                  {referralSaving ? 'Salvando…' : 'Salvar encaminhamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

          {activeTab === 'register' && (
            <section className="students-card" aria-labelledby="cadastro-usuario-titulo">
              <h2 id="cadastro-usuario-titulo" className="students-card__title">
                {editingId ? 'Editar usuario' : 'Cadastrar usuario'}
              </h2>

              <form className="students-form" onSubmit={onSubmit}>
                <div className="students-section">
                  <span className="students-section__label">Dados do usuario</span>
                  <div className="students-grid2">
                    <div className="students-field students-field--span2">
                      <label htmlFor="full_name">Nome</label>
                      <input
                        id="full_name"
                        type="text"
                        name="full_name"
                        placeholder="Nome completo"
                        value={form.full_name}
                        onChange={onChange}
                        required
                      />
                    </div>
                    <div className="students-field">
                      <label htmlFor="birth_date">D/N</label>
                      <input
                        id="birth_date"
                        type="date"
                        name="birth_date"
                        value={form.birth_date}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field">
                      <label htmlFor="nis_user">NIS do usuario</label>
                      <input
                        id="nis_user"
                        type="text"
                        name="nis_user"
                        placeholder="Informe o NIS"
                        value={form.nis_user}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field">
                      <label htmlFor="color">Cor</label>
                      <select id="color" name="color" value={form.color} onChange={onChange}>
                        <option value="">Selecione…</option>
                        {COLOR_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="students-field">
                      <label htmlFor="cpf_cns">CPF / Carteira Nacional</label>
                      <input
                        id="cpf_cns"
                        type="text"
                        name="cpf_cns"
                        placeholder="CPF ou CNS"
                        value={form.cpf_cns}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field">
                      <label htmlFor="shoe_size">N° calcado</label>
                      <input
                        id="shoe_size"
                        type="text"
                        name="shoe_size"
                        placeholder="Ex.: 34"
                        value={form.shoe_size}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field">
                      <label htmlFor="clothing_size">Tamanho da roupa</label>
                      <input
                        id="clothing_size"
                        type="text"
                        name="clothing_size"
                        placeholder="Ex.: P, M, G"
                        value={form.clothing_size}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field students-field--span2">
                      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          name="is_allergic"
                          checked={form.is_allergic}
                          onChange={onChange}
                        />
                        E alergico?
                      </label>
                    </div>
                    {form.is_allergic && (
                      <div className="students-field students-field--span2">
                        <label htmlFor="allergy_details">Se sim, a que?</label>
                        <input
                          id="allergy_details"
                          type="text"
                          name="allergy_details"
                          placeholder="Ex.: amendoim, lactose"
                          value={form.allergy_details}
                          onChange={onChange}
                        />
                      </div>
                    )}
                    <div className="students-field students-field--span2">
                      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          name="has_health_issues"
                          checked={form.has_health_issues}
                          onChange={onChange}
                        />
                        Possui problemas de saude?
                      </label>
                    </div>
                    {form.has_health_issues && (
                      <div className="students-field students-field--span2">
                        <label htmlFor="health_issues_details">Se sim, qual?</label>
                        <input
                          id="health_issues_details"
                          type="text"
                          name="health_issues_details"
                          placeholder="Descreva"
                          value={form.health_issues_details}
                          onChange={onChange}
                        />
                      </div>
                    )}
                    <div className="students-field students-field--span2">
                      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          name="has_disability"
                          checked={form.has_disability}
                          onChange={onChange}
                        />
                        Possui deficiencia?
                      </label>
                    </div>
                    {form.has_disability && (
                      <div className="students-field students-field--span2">
                        <label htmlFor="disability_details">Se sim, qual?</label>
                        <input
                          id="disability_details"
                          type="text"
                          name="disability_details"
                          placeholder="Descreva"
                          value={form.disability_details}
                          onChange={onChange}
                        />
                      </div>
                    )}
                    <div className="students-field students-field--span2">
                      <label htmlFor="school_name">Escola</label>
                      <input
                        id="school_name"
                        type="text"
                        name="school_name"
                        placeholder="Nome da escola"
                        value={form.school_name}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field">
                      <label htmlFor="school_grade">Serie</label>
                      <input
                        id="school_grade"
                        type="text"
                        name="school_grade"
                        placeholder="Ex.: 5º ano"
                        value={form.school_grade}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field">
                      <label htmlFor="school_shift">Turno</label>
                      <select id="school_shift" name="school_shift" value={form.school_shift} onChange={onChange}>
                        <option value="">Selecione…</option>
                        {SCHOOL_SHIFT_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="students-field students-field--span2">
                      <label htmlFor="program_id">Unidade do usuario</label>
                      {canChooseProgram ? (
                        <select
                          id="program_id"
                          name="program_id"
                          value={form.program_id}
                          onChange={onChange}
                          required
                        >
                          <option value="">Selecione a unidade…</option>
                          {programs.map((program) => (
                            <option key={program.id} value={program.id}>
                              {program.name}
                              {program.location ? ` · ${program.location}` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                          {selectedProgramName}
                        </div>
                      )}
                      {!canChooseProgram && <input type="hidden" name="program_id" value={form.program_id} />}
                    </div>
                  </div>
                </div>

                <div className="students-section">
                  <span className="students-section__label">Dados de endereco</span>
                  <div className="students-grid2">
                    <div className="students-field students-field--span2">
                      <label htmlFor="address_street">Endereco</label>
                      <input
                        id="address_street"
                        type="text"
                        name="address_street"
                        placeholder="Rua, numero"
                        value={form.address_street}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field">
                      <label htmlFor="address_neighborhood">Bairro</label>
                      <input
                        id="address_neighborhood"
                        type="text"
                        name="address_neighborhood"
                        placeholder="Bairro"
                        value={form.address_neighborhood}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field">
                      <label htmlFor="address_reference">Ponto de referencia</label>
                      <input
                        id="address_reference"
                        type="text"
                        name="address_reference"
                        placeholder="Referencia"
                        value={form.address_reference}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field students-field--span2">
                      <label htmlFor="address_extra">Dados adicionais</label>
                      <textarea
                        id="address_extra"
                        name="address_extra"
                        placeholder="Complementos e observacoes"
                        value={form.address_extra}
                        onChange={onChange}
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <div className="students-section">
                  <span className="students-section__label">Dados do responsavel</span>
                  <div className="students-grid2">
                    <div className="students-field">
                      <label htmlFor="guardian_name">Nome do responsavel</label>
                      <input
                        id="guardian_name"
                        type="text"
                        name="guardian_name"
                        placeholder="Nome completo"
                        value={form.guardian_name}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field">
                      <label htmlFor="guardian_cpf">CPF</label>
                      <input
                        id="guardian_cpf"
                        type="text"
                        name="guardian_cpf"
                        placeholder="CPF"
                        value={form.guardian_cpf}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field">
                      <label htmlFor="guardian_nis">NIS</label>
                      <input
                        id="guardian_nis"
                        type="text"
                        name="guardian_nis"
                        placeholder="NIS"
                        value={form.guardian_nis}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field">
                      <label htmlFor="guardian_phone">Celular</label>
                      <input
                        id="guardian_phone"
                        type="tel"
                        name="guardian_phone"
                        placeholder="(00) 00000-0000"
                        value={form.guardian_phone}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field">
                      <label htmlFor="guardian_relationship">Parentesco</label>
                      <input
                        id="guardian_relationship"
                        type="text"
                        name="guardian_relationship"
                        placeholder="Ex.: Mae, Pai"
                        value={form.guardian_relationship}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field">
                      <label htmlFor="guardian_workplace">Local de trabalho</label>
                      <input
                        id="guardian_workplace"
                        type="text"
                        name="guardian_workplace"
                        placeholder="Empresa"
                        value={form.guardian_workplace}
                        onChange={onChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="students-section">
                  <span className="students-section__label">Situacao socioeconomica familiar</span>
                  <div className="students-grid2">
                    <div className="students-field students-field--span2">
                      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          name="family_benefit"
                          checked={form.family_benefit}
                          onChange={onChange}
                        />
                        A familia recebe beneficio?
                      </label>
                    </div>
                    {form.family_benefit && (
                      <div className="students-field students-field--span2">
                        <label htmlFor="family_benefit_details">Se sim, qual?</label>
                        <input
                          id="family_benefit_details"
                          type="text"
                          name="family_benefit_details"
                          placeholder="Informe o beneficio"
                          value={form.family_benefit_details}
                          onChange={onChange}
                        />
                      </div>
                    )}
                    <div className="students-field students-field--span2">
                      <label>Composicao familiar</label>
                      <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {(form.family_members || []).length === 0 && (
                          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Nenhum familiar adicionado.
                          </p>
                        )}
                        {(form.family_members || []).map((member, index) => (
                          <div
                            key={`${index}-member`}
                            style={{
                              display: 'grid',
                              gap: '0.5rem',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                              alignItems: 'end',
                              border: '1px solid var(--border-subtle)',
                              padding: '0.6rem',
                              borderRadius: '8px',
                            }}
                          >
                            <input
                              className="students-family-input"
                              type="text"
                              placeholder="Nome"
                              value={member?.name || ''}
                              onChange={(e) => updateFamilyMember(index, 'name', e.target.value)}
                            />
                            <input
                              className="students-family-input"
                              type="text"
                              placeholder="Vinculo"
                              value={member?.relationship || ''}
                              onChange={(e) => updateFamilyMember(index, 'relationship', e.target.value)}
                            />
                            <input
                              className="students-family-input"
                              type="text"
                              placeholder="Idade"
                              value={member?.age || ''}
                              onChange={(e) => updateFamilyMember(index, 'age', e.target.value)}
                            />
                            <input
                              className="students-family-input"
                              type="text"
                              placeholder="Escolaridade"
                              value={member?.education || ''}
                              onChange={(e) => updateFamilyMember(index, 'education', e.target.value)}
                            />
                            <input
                              className="students-family-input"
                              type="text"
                              placeholder="Etnia"
                              value={member?.ethnicity || ''}
                              onChange={(e) => updateFamilyMember(index, 'ethnicity', e.target.value)}
                            />
                            <button
                              type="button"
                              className="students-btn students-btn--ghost"
                              onClick={() => removeFamilyMember(index)}
                            >
                              Remover
                            </button>
                          </div>
                        ))}
                        <button type="button" className="students-btn students-btn--ghost" onClick={addFamilyMember}>
                          Adicionar familiar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="students-section">
                  <span className="students-section__label">Dados tecnicos CRAS/CREAS</span>
                  <div className="students-grid2">
                    <div className="students-field students-field--span2">
                      <label>Situacao</label>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {CRAS_STATUS_OPTIONS.map((option) => (
                          <label key={option} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <input
                              type="radio"
                              name="cras_status"
                              value={option}
                              checked={form.cras_status === option}
                              onChange={onChange}
                            />
                            {option === 'prioritario' ? 'Prioritario' : 'Nao Prioritario'}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="students-field students-field--span2">
                      <label htmlFor="cras_link_reason">Motivo da vinculacao</label>
                      <input
                        id="cras_link_reason"
                        type="text"
                        name="cras_link_reason"
                        placeholder="Descreva o motivo"
                        value={form.cras_link_reason}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field">
                      <label htmlFor="cras_referral_agency">Orgao encaminhador</label>
                      <input
                        id="cras_referral_agency"
                        type="text"
                        name="cras_referral_agency"
                        placeholder="Ex.: CRAS"
                        value={form.cras_referral_agency}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field">
                      <label htmlFor="cras_technician">Tecnico responsavel</label>
                      <input
                        id="cras_technician"
                        type="text"
                        name="cras_technician"
                        placeholder="Nome do tecnico"
                        value={form.cras_technician}
                        onChange={onChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="students-section">
                  <span className="students-section__label">Dados do SCFV</span>
                  <div className="students-grid2">
                    <div className="students-field">
                      <label htmlFor="scfv_insertion_date">Data da insercao</label>
                      <input
                        id="scfv_insertion_date"
                        type="date"
                        name="scfv_insertion_date"
                        value={form.scfv_insertion_date}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field">
                      <label htmlFor="scfv_update_date">Data da atualizacao</label>
                      <input
                        id="scfv_update_date"
                        type="date"
                        name="scfv_update_date"
                        value={form.scfv_update_date}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field students-field--span2">
                      <label>Dias de frequencia no SCFV</label>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {WEEK_DAYS.map((day) => (
                          <label key={day.value} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                            <input
                              type="checkbox"
                              checked={form.scfv_frequency_days.includes(day.value)}
                              onChange={() => toggleArrayValue('scfv_frequency_days', day.value)}
                            />
                            {day.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="students-field students-field--span2">
                      <label>Turno</label>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {SCFV_SHIFTS.map((shift) => (
                          <label key={shift.value} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                            <input
                              type="checkbox"
                              checked={form.scfv_shift.includes(shift.value)}
                              onChange={() => toggleArrayValue('scfv_shift', shift.value)}
                            />
                            {shift.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="students-field">
                      <label htmlFor="scfv_group">Grupo no SCFV</label>
                      <input
                        id="scfv_group"
                        type="text"
                        name="scfv_group"
                        placeholder="Grupo"
                        value={form.scfv_group}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field">
                      <label htmlFor="scfv_instructor">Orientador(a)</label>
                      <input
                        id="scfv_instructor"
                        type="text"
                        name="scfv_instructor"
                        placeholder="Nome"
                        value={form.scfv_instructor}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field">
                      <label htmlFor="scfv_boarding">Embarque</label>
                      <input
                        id="scfv_boarding"
                        type="text"
                        name="scfv_boarding"
                        placeholder="Local de embarque"
                        value={form.scfv_boarding}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field">
                      <label htmlFor="scfv_disembarkation">Desembarque</label>
                      <input
                        id="scfv_disembarkation"
                        type="text"
                        name="scfv_disembarkation"
                        placeholder="Local de desembarque"
                        value={form.scfv_disembarkation}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field students-field--span2">
                      <label htmlFor="advisor_notes">Observacoes do orientador</label>
                      <textarea
                        id="advisor_notes"
                        name="advisor_notes"
                        placeholder="Anotacoes sobre acontecimentos, comportamento, evolucao..."
                        value={form.advisor_notes}
                        onChange={onChange}
                        rows={4}
                      />
                    </div>
                  </div>
                </div>

                <div className="students-form__actions">
                  <button className="students-btn students-btn--primary" type="submit" disabled={submitting}>
                    {submitting ? 'Salvando…' : editingId ? 'Salvar alteracoes' : 'Cadastrar usuario'}
                  </button>
                  {editingId && (
                    <button className="students-btn students-btn--ghost" type="button" onClick={resetForm}>
                      Cancelar edicao
                    </button>
                  )}
                </div>
              </form>
            </section>
          )}

        {activeTab === 'manage' && (
          <section className="students-card" aria-labelledby="lista-usuarios-titulo">
          <div className="students-list-head">
            <h2 id="lista-usuarios-titulo">Lista na unidade</h2>
            {!loading && (
              <span className="students-count">
                {students.length} {students.length === 1 ? 'usuario' : 'usuarios'}
              </span>
            )}
            </div>

            <div className="students-toolbar">
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                Buscar
                <input
                  type="search"
                  placeholder="Nome ou NIS"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
              </label>

              <label htmlFor="filter-turma">
                Filtrar por turma
                <select
                  id="filter-turma"
                  value={filterClassGroup}
                  onChange={(e) => setFilterClassGroup(e.target.value)}
                >
                  <option value={TURMA_FILTER_ALL}>Todas as turmas</option>
                  <option value="__none__">Sem turma</option>
                  {classGroupsList.map((t) => (
                    <option key={t.id} value={t.slug}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {loading ? (
              <p className="students-loading">Carregando lista…</p>
            ) : filteredStudents.length === 0 ? (
              <div className="students-empty">
                {searchQuery || filterClassGroup !== TURMA_FILTER_ALL
                  ? 'Nenhum usuario encontrado com os filtros atuais.'
                  : 'Nenhum usuario nesta unidade ainda. Preencha o formulario de cadastro para adicionar.'}
              </div>
            ) : (
              <div className="students-table-wrap">
                <table className="students-data-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Nasc.</th>
                      <th>NIS</th>
                      <th>Turma</th>
                      {canChooseProgram && <th>Unidade</th>}
                      <th>Celular</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((item) => (
                    <tr key={item.id}>
                      <td>{item.full_name}</td>
                      <td className="cell-muted">{formatDateBR(item.birth_date)}</td>
                      <td className="cell-muted">{item.nis_user || item.enrollment_code || '—'}</td>
                      <td className="cell-muted">{turmaLabel(classGroupsList, item.class_group)}</td>
                      {canChooseProgram && <td className="cell-muted">{item.programs?.name || '—'}</td>}
                      <td className="cell-muted">{item.guardian_phone || '—'}</td>
                      <td>
                        <div className="students-table-actions">
                            <button type="button" onClick={() => startEdit(item)}>
                              Editar
                            </button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); showDetails(item); }}>
                              Detalhes
                            </button>
                            <button type="button" className="btn-danger" onClick={() => onDelete(item.id)}>
                              Excluir
                            </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        )}

        {activeTab === 'turmas' && (
          <section className="students-card" aria-labelledby="gerenciar-turmas-titulo">
            <h2 id="gerenciar-turmas-titulo" className="students-card__title">
              Gerenciar turmas
            </h2>
              <p className="students-card__hint">
              As turmas valem para a unidade selecionada no menu superior. O sistema cria Turma A e B ao subir o banco;
              adicione outras conforme a realidade da unidade.
            </p>

            {!canManageTurmas ? (
              <p className="students-turmas-block__warn">Selecione uma unidade no topo para gerenciar turmas.</p>
            ) : (
              <>
                <div className="students-turmas-add">
                  <input
                    type="text"
                    value={newTurmaName}
                    onChange={(e) => setNewTurmaName(e.target.value)}
                    placeholder="Nome da nova turma (ex.: Integral)"
                    maxLength={80}
                    disabled={turmaBusy}
                  />
                  <select
                    value={newTurmaPeriod}
                    onChange={(e) => setNewTurmaPeriod(e.target.value)}
                    disabled={turmaBusy}
                  >
                    <option value="manha">Manhã</option>
                    <option value="tarde">Tarde</option>
                  </select>
                  <button
                    type="button"
                    className="students-btn students-btn--primary"
                    onClick={handleAddTurma}
                    disabled={turmaBusy}
                  >
                    {turmaBusy ? 'Salvando…' : 'Adicionar turma'}
                  </button>
                </div>

                {classGroupsList.length === 0 ? (
                  <p className="students-turmas-empty">Nenhuma turma cadastrada. Adicione uma acima.</p>
                ) : (
                  <ul className="students-turmas-list">
                    {classGroupsList.map((t) => (
                      <li key={t.id}>
                        <span>
                          <strong>{t.name}</strong>
                          <span className="students-turmas-list__slug"> ({t.slug})</span>
                          <span style={{ color: 'var(--text-muted)', marginLeft: '0.4rem', fontSize: '0.86rem' }}>
                            {t.period ? (t.period === 'manha' ? ' · Manhã' : t.period === 'tarde' ? ' · Tarde' : ` · ${t.period}`) : ''}
                          </span>
                        </span>
                        <button
                          type="button"
                          className="students-turmas-list__remove"
                          onClick={() => handleRemoveTurma(t)}
                          disabled={turmaBusy}
                        >
                          Excluir
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="students-turmas-assign" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem' }}>Atribuir usuarios às turmas</h4>

                  <div className="students-toolbar" style={{ marginBottom: '1rem' }}>
                    <label>
                      Buscar usuario
                      <input
                        type="search"
                        placeholder="Nome ou NIS"
                        value={assignmentSearchQuery}
                        onChange={(e) => setAssignmentSearchQuery(e.target.value)}
                      />
                    </label>

                    <label htmlFor="assignment-filter-turma">
                      Turma
                      <select
                        id="assignment-filter-turma"
                        value={assignmentClassFilter}
                        onChange={(e) => setAssignmentClassFilter(e.target.value)}
                      >
                        <option value={TURMA_FILTER_ALL}>Todas</option>
                        <option value="__none__">Sem turma</option>
                        {classGroupsList.map((turma) => (
                          <option key={turma.id} value={turma.slug}>
                            {turma.name}
                            {turma.period ? ` · ${turma.period === 'manha' ? 'Manhã' : turma.period === 'tarde' ? 'Tarde' : turma.period}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {classGroupsList.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhuma turma disponível para atribuição.</p>
                  ) : students.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhum usuario disponível.</p>
                  ) : assignmentStudents.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhum usuario corresponde aos filtros aplicados.</p>
                  ) : (
                    <table className="students-assignment-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>NIS</th>
                          <th>Turma</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignmentStudents.map((s) => (
                          <tr key={s.id}>
                            <td className="students-assignment-table__name">{s.full_name}</td>
                            <td className="students-assignment-table__enrollment">{s.nis_user || s.enrollment_code || '—'}</td>
                            <td className="students-assignment-table__turma">
                              <select
                                value={s.class_group || ''}
                                onChange={(e) => assignStudentToTurma(s.id, e.target.value || null)}
                                className="students-assignment-table__select"
                              >
                                <option value="">Sem turma</option>
                                {classGroupsList.map((turma) => (
                                  <option key={turma.id} value={turma.slug}>
                                    {turma.name}
                                    {turma.period ? ` (${turma.period === 'manha' ? '🌅 Manhã' : turma.period === 'tarde' ? '🌤️ Tarde' : turma.period})` : ''}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </section>
        )}

    </div>
  );
}

export default Students;
