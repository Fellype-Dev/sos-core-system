// Configuração e helpers do formulário de assistido, compartilhados pelo wizard.

export const initialForm = () => ({
  full_name: '',
  social_name: '',
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
  authorized_pickups: [],
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
  sisc_link_date: '',
  sisc_group: '',
  advisor_notes: '',
  technician_notes: '',
  program_id: '',
  // Somente leitura no wizard: a turma é atribuída na tela de Turmas.
  // Fica aqui apenas para comparar com o grupo do SISC.
  class_group: '',
});

/**
 * Data que representa a entrada do assistido no programa.
 *
 * Prioriza a inserção no SCFV: o created_at só diz quando o cadastro foi digitado
 * no sistema, o que subestima quem já frequentava antes da implantação.
 */
export function getEnrollmentDate(student) {
  const scfv = student?.scfv_insertion_date;
  if (scfv) return { date: String(scfv).slice(0, 10), source: 'scfv' };
  if (student?.created_at) return { date: String(student.created_at).slice(0, 10), source: 'sistema' };
  return null;
}

/**
 * Tempo decorrido em anos/meses a partir de uma data ISO (YYYY-MM-DD).
 * Devolve null para data ausente, inválida ou no futuro.
 */
export function getTenure(isoDate) {
  if (!isoDate) return null;
  const [year, month, day] = String(isoDate).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;

  const start = new Date(year, month - 1, day);
  if (Number.isNaN(start.getTime())) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (start > today) return null;

  let months = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
  if (today.getDate() < start.getDate()) months -= 1;

  const totalDays = Math.floor((today - start) / 86400000);
  const years = Math.floor(months / 12);
  const restMonths = months % 12;

  let label;
  if (months < 1) {
    if (totalDays === 0) label = 'hoje';
    else if (totalDays === 1) label = 'há 1 dia';
    else label = `há ${totalDays} dias`;
  } else if (years < 1) {
    label = months === 1 ? 'há 1 mês' : `há ${months} meses`;
  } else {
    const yearPart = years === 1 ? '1 ano' : `${years} anos`;
    if (restMonths === 0) label = `há ${yearPart}`;
    else label = `há ${yearPart} e ${restMonths === 1 ? '1 mês' : `${restMonths} meses`}`;
  }

  return { years, months, totalDays, label };
}

/**
 * Divergência entre o grupo informado no SISC e a turma vinculada no SOS.
 * Só acusa quando os dois estão preenchidos — faltar um não é divergência, é cadastro incompleto.
 */
export function hasSiscMismatch(student) {
  const sisc = String(student?.sisc_group || '').trim();
  const sos = String(student?.class_group || '').trim();
  if (!sisc || !sos) return false;
  return sisc !== sos;
}

/** Idade em anos completos na data de hoje. Devolve null sem data de nascimento. */
export function calcularIdade(birthDate) {
  const iso = String(birthDate || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [ano, mes, dia] = iso.split('-').map(Number);
  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  const aniversarioPassou =
    hoje.getMonth() + 1 > mes || (hoje.getMonth() + 1 === mes && hoje.getDate() >= dia);
  if (!aniversarioPassou) idade -= 1;
  return idade >= 0 && idade < 130 ? idade : null;
}

/** Faixas etárias do SCFV, usadas no filtro da listagem. */
export const FAIXAS_ETARIAS = [
  { value: '0-6', label: '0 a 6 anos', min: 0, max: 6 },
  { value: '7-14', label: '7 a 14 anos', min: 7, max: 14 },
  { value: '15-17', label: '15 a 17 anos', min: 15, max: 17 },
  { value: '18-29', label: '18 a 29 anos', min: 18, max: 29 },
  { value: '30-59', label: '30 a 59 anos', min: 30, max: 59 },
  { value: '60+', label: '60 anos ou mais', min: 60, max: 200 },
];

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Mês de aniversário (1 a 12) ou null quando não há data de nascimento. */
export function mesDeAniversario(birthDate) {
  const iso = String(birthDate || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  return Number(iso.slice(5, 7));
}

/**
 * Motivos de desligamento do SCFV.
 * Lista provisória, a confirmar com a coordenação do SOS — "Outro" cobre o que
 * não estiver aqui, com a explicação no campo de observação.
 */
export const MOTIVOS_DESLIGAMENTO = [
  'Mudança de endereço ou de cidade',
  'Transferência para outra unidade',
  'Incompatibilidade de horário',
  'Conclusão da faixa etária',
  'Faltas consecutivas / abandono',
  'Desinteresse da família',
  'Ingresso em escola, curso ou trabalho',
  'Problema de saúde',
  'Óbito',
  'Outro',
];

export const COLOR_OPTIONS = ['Branca', 'Preta', 'Parda', 'Amarela', 'Indigena', 'Outro'];
export const SCHOOL_SHIFT_OPTIONS = ['Manha', 'Tarde', 'Noite', 'Integral', 'Outro'];
export const CRAS_STATUS_OPTIONS = ['prioritario', 'nao_prioritario'];
export const WEEK_DAYS = [
  { value: 'seg', label: 'Seg' },
  { value: 'ter', label: 'Ter' },
  { value: 'qua', label: 'Qua' },
  { value: 'qui', label: 'Qui' },
  { value: 'sex', label: 'Sex' },
  { value: 'sab', label: 'Sab' },
  { value: 'dom', label: 'Dom' },
];
export const SCFV_SHIFTS = [
  { value: 'manha', label: 'Manhã' },
  { value: 'tarde', label: 'Tarde' },
];

// Monta o payload de criação/atualização a partir do estado do formulário.
export function buildStudentPayload(form, canChooseProgram) {
  const familyMembers = (Array.isArray(form.family_members) ? form.family_members : []).filter((member) =>
    Object.values(member || {}).some((value) => String(value || '').trim())
  );

  // Só vale como autorizado quem tem nome; sem nome não há como conferir na retirada.
  const authorizedPickups = (Array.isArray(form.authorized_pickups) ? form.authorized_pickups : []).filter(
    (person) => String(person?.name || '').trim()
  );

  const payload = {
    full_name: form.full_name.trim(),
    social_name: form.social_name.trim() || null,
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
    authorized_pickups: authorizedPickups,
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
    sisc_link_date: form.sisc_link_date || null,
    sisc_group: form.sisc_group || null,
    advisor_notes: form.advisor_notes.trim() || null,
    technician_notes: form.technician_notes.trim() || null,
  };

  if (canChooseProgram) {
    payload.program_id = form.program_id || null;
  }

  return payload;
}

// Converte um registro de assistido no formato do formulário (edição).
export function mapStudentToForm(item, fallbackProgramId = '') {
  return {
    full_name: item.full_name || '',
    social_name: item.social_name || '',
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
    authorized_pickups: Array.isArray(item.authorized_pickups) ? item.authorized_pickups : [],
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
    sisc_link_date: item.sisc_link_date ? String(item.sisc_link_date).slice(0, 10) : '',
    sisc_group: item.sisc_group || '',
    advisor_notes: item.advisor_notes || '',
    technician_notes: item.technician_notes || '',
    program_id: item.program_id || item.programs?.id || fallbackProgramId || '',
    class_group: item.class_group || '',
  };
}
