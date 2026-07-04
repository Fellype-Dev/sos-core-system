// Configuração e helpers do formulário de assistido, compartilhados pelo wizard.

export const initialForm = () => ({
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

  return payload;
}

// Converte um registro de assistido no formato do formulário (edição).
export function mapStudentToForm(item, fallbackProgramId = '') {
  return {
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
    program_id: item.program_id || item.programs?.id || fallbackProgramId || '',
  };
}
