import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  User, Activity, MapPin, Users, ClipboardList, ArrowLeft, ArrowRight, Check, Plus, Trash2, AlertCircle, ChevronLeft
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import studentService from '../../services/studentService';
import programService from '../../services/programService';
import { Card, CardContent } from '../../components/ui/card';
import {
  initialForm, buildStudentPayload, mapStudentToForm,
  COLOR_OPTIONS, SCHOOL_SHIFT_OPTIONS, CRAS_STATUS_OPTIONS, WEEK_DAYS, SCFV_SHIFTS,
} from './studentForm';

const STEPS = [
  { label: 'Identificação e saúde', icon: User },
  { label: 'Escola e endereço', icon: MapPin },
  { label: 'Responsável e família', icon: Users },
  { label: 'CRAS e SCFV', icon: ClipboardList },
];

function StudentFormPage() {
  const { user, selectedProgramId } = useAuth();
  const canChooseProgram = user?.role === 'admin';
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);

  const [form, setForm] = useState(() => ({ ...initialForm(), program_id: selectedProgramId || '' }));
  const [step, setStep] = useState(0);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    programService
      .getAll()
      .then((res) => { if (!cancelled) setPrograms(res.data || []); })
      .catch(() => { if (!cancelled) setPrograms([]); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!editing) return;
    let cancelled = false;
    setLoading(true);
    studentService
      .getById(id)
      .then((res) => {
        if (cancelled) return;
        const item = res.data || res;
        setForm(mapStudentToForm(item, selectedProgramId));
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar o cadastro para edição.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [editing, id, selectedProgramId]);

  const selectedProgramName = useMemo(() => {
    const program = programs.find((item) => String(item.id) === String(selectedProgramId));
    if (!program) return selectedProgramId || 'Unidade selecionada';
    return program.location ? `${program.name} · ${program.location}` : program.name;
  }, [programs, selectedProgramId]);

  const onChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const toggleArrayValue = (field, value) => {
    setForm((prev) => {
      const current = Array.isArray(prev[field]) ? prev[field] : [];
      const exists = current.includes(value);
      return { ...prev, [field]: exists ? current.filter((item) => item !== value) : [...current, value] };
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

  const validateBeforeSave = () => {
    if (!form.full_name.trim()) {
      setError('Informe o nome completo do usuário.');
      setStep(0);
      return false;
    }
    if (canChooseProgram && !form.program_id) {
      setError('Selecione a unidade do usuário.');
      setStep(1);
      return false;
    }
    return true;
  };

  const goNext = () => {
    setError('');
    if (step === 0 && !form.full_name.trim()) {
      setError('Informe o nome completo do usuário.');
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!validateBeforeSave()) return;

    setSubmitting(true);
    try {
      const payload = buildStudentPayload(form, canChooseProgram);
      if (editing) {
        await studentService.update(id, payload);
      } else {
        await studentService.create(payload);
      }
      navigate('/usuarios', {
        state: { flash: editing ? 'Dados do usuário atualizados com sucesso.' : 'Usuário cadastrado com sucesso.' },
      });
    } catch (err) {
      setError(err?.response?.data?.message || 'Não foi possível salvar.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLastStep = step === STEPS.length - 1;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600" />
        <p className="text-sm font-bold text-slate-500">Carregando cadastro...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/usuarios')}
          className="inline-flex items-center gap-1 h-9 px-3 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar à lista
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {editing ? 'Editar usuário' : 'Novo cadastro de usuário'}
          </h1>
          <p className="text-xs text-slate-400 font-semibold">Preencha uma etapa por vez. Você pode voltar quando quiser.</p>
        </div>
      </div>

      {/* Stepper */}
      <Card className="border-slate-100 shadow-lg shadow-slate-100/40 bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start gap-1">
            {STEPS.map((meta, index) => {
              const Icon = meta.icon;
              const done = index < step;
              const active = index === step;
              return (
                <div key={meta.label} className="flex-1 text-center">
                  <button
                    type="button"
                    onClick={() => { setError(''); setStep(index); }}
                    className="w-full flex flex-col items-center gap-1.5 cursor-pointer group"
                  >
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                      active
                        ? 'bg-indigo-600 text-white'
                        : done
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : 'bg-slate-50 text-slate-400 border border-slate-200 group-hover:border-indigo-300'
                    }`}>
                      {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span className={`text-[11px] font-bold leading-tight ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {meta.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="border-slate-100 shadow-xl shadow-slate-100/40 bg-white rounded-2xl overflow-hidden border-t-4 border-t-indigo-600">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Passo 1: Identificação e saúde */}
            {step === 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-slate-100 pb-2">Dados do Usuário</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label htmlFor="full_name" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Nome Completo</label>
                    <input id="full_name" type="text" name="full_name" placeholder="Nome completo" value={form.full_name} onChange={onChange} required className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="birth_date" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Data de Nascimento</label>
                    <input id="birth_date" type="date" name="birth_date" value={form.birth_date} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="nis_user" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">NIS do Usuário</label>
                    <input id="nis_user" type="text" name="nis_user" placeholder="Número NIS" value={form.nis_user} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="color" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Cor / Etnia</label>
                    <select id="color" name="color" value={form.color} onChange={onChange} className="w-full h-10 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer">
                      <option value="">Selecione…</option>
                      {COLOR_OPTIONS.map((option) => (<option key={option} value={option}>{option}</option>))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="cpf_cns" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">CPF / Cartão SUS</label>
                    <input id="cpf_cns" type="text" name="cpf_cns" placeholder="Identificação fiscal ou SUS" value={form.cpf_cns} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="shoe_size" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">N° Calçado</label>
                    <input id="shoe_size" type="text" name="shoe_size" placeholder="Ex: 36" value={form.shoe_size} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="clothing_size" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Tamanho Roupa</label>
                    <input id="clothing_size" type="text" name="clothing_size" placeholder="Ex: M, 14" value={form.clothing_size} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                  </div>
                  <div className="col-span-full space-y-2">
                    <div className="flex items-center gap-2 select-none py-1">
                      <input id="is_allergic" type="checkbox" name="is_allergic" checked={form.is_allergic} onChange={onChange} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer" />
                      <label htmlFor="is_allergic" className="text-xs font-bold text-slate-700 cursor-pointer">É alérgico?</label>
                    </div>
                    {form.is_allergic && (
                      <div className="space-y-1.5">
                        <label htmlFor="allergy_details" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Se sim, a quê?</label>
                        <input id="allergy_details" type="text" name="allergy_details" placeholder="Ex: Lactose, Dipirona, Corantes" value={form.allergy_details} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                      </div>
                    )}
                  </div>
                  <div className="col-span-full space-y-2">
                    <div className="flex items-center gap-2 select-none py-1">
                      <input id="has_health_issues" type="checkbox" name="has_health_issues" checked={form.has_health_issues} onChange={onChange} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer" />
                      <label htmlFor="has_health_issues" className="text-xs font-bold text-slate-700 cursor-pointer">Possui problemas de saúde?</label>
                    </div>
                    {form.has_health_issues && (
                      <div className="space-y-1.5">
                        <label htmlFor="health_issues_details" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Se sim, quais?</label>
                        <input id="health_issues_details" type="text" name="health_issues_details" placeholder="Descreva a condição de saúde" value={form.health_issues_details} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                      </div>
                    )}
                  </div>
                  <div className="col-span-full space-y-2">
                    <div className="flex items-center gap-2 select-none py-1">
                      <input id="has_disability" type="checkbox" name="has_disability" checked={form.has_disability} onChange={onChange} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer" />
                      <label htmlFor="has_disability" className="text-xs font-bold text-slate-700 cursor-pointer">Possui deficiência (PCD)?</label>
                    </div>
                    {form.has_disability && (
                      <div className="space-y-1.5">
                        <label htmlFor="disability_details" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Se sim, qual?</label>
                        <input id="disability_details" type="text" name="disability_details" placeholder="Descreva a deficiência" value={form.disability_details} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Passo 2: Escola e endereço */}
            {step === 1 && (
              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-slate-100 pb-2">Escolarização e Unidade Física</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label htmlFor="school_name" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Nome da Escola</label>
                      <input id="school_name" type="text" name="school_name" placeholder="Escola que frequenta" value={form.school_name} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="school_grade" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Série / Ano Escolar</label>
                      <input id="school_grade" type="text" name="school_grade" placeholder="Ex: 7º ano" value={form.school_grade} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="school_shift" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Turno Escolar</label>
                      <select id="school_shift" name="school_shift" value={form.school_shift} onChange={onChange} className="w-full h-10 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer">
                        <option value="">Selecione…</option>
                        {SCHOOL_SHIFT_OPTIONS.map((option) => (<option key={option} value={option}>{option}</option>))}
                      </select>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label htmlFor="program_id" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Unidade do Usuário</label>
                      {canChooseProgram ? (
                        <select id="program_id" name="program_id" value={form.program_id} onChange={onChange} required className="w-full h-10 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer">
                          <option value="">Selecione a unidade…</option>
                          {programs.map((program) => (<option key={program.id} value={program.id}>{program.name} {program.location ? ` · ${program.location}` : ''}</option>))}
                        </select>
                      ) : (
                        <div className="h-10 px-3 flex items-center bg-slate-100 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg">{selectedProgramName}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-slate-100 pb-2">Endereço Residencial</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label htmlFor="address_street" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Rua, Número</label>
                      <input id="address_street" type="text" name="address_street" placeholder="Ex: Rua das Flores, 123" value={form.address_street} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="address_neighborhood" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Bairro</label>
                      <input id="address_neighborhood" type="text" name="address_neighborhood" placeholder="Bairro" value={form.address_neighborhood} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label htmlFor="address_reference" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Ponto de Referência</label>
                      <input id="address_reference" type="text" name="address_reference" placeholder="Ex: Próximo à padaria central" value={form.address_reference} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5 col-span-full">
                      <label htmlFor="address_extra" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Dados Adicionais</label>
                      <textarea id="address_extra" name="address_extra" placeholder="Complementos de endereço, bloco, apartamento..." value={form.address_extra} onChange={onChange} rows={3} className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all resize-y min-h-[5.5rem]" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Passo 3: Responsável e família */}
            {step === 2 && (
              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-slate-100 pb-2">Informações do Responsável Legal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label htmlFor="guardian_name" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Nome do Responsável</label>
                      <input id="guardian_name" type="text" name="guardian_name" placeholder="Nome completo do responsável" value={form.guardian_name} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="guardian_cpf" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">CPF do Responsável</label>
                      <input id="guardian_cpf" type="text" name="guardian_cpf" placeholder="CPF" value={form.guardian_cpf} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="guardian_nis" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">NIS do Responsável</label>
                      <input id="guardian_nis" type="text" name="guardian_nis" placeholder="Número NIS" value={form.guardian_nis} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="guardian_phone" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Celular / Contato</label>
                      <input id="guardian_phone" type="tel" name="guardian_phone" placeholder="(00) 00000-0000" value={form.guardian_phone} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="guardian_relationship" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Parentesco</label>
                      <input id="guardian_relationship" type="text" name="guardian_relationship" placeholder="Ex: Mãe, Pai, Avó" value={form.guardian_relationship} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label htmlFor="guardian_workplace" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Local de Trabalho</label>
                      <input id="guardian_workplace" type="text" name="guardian_workplace" placeholder="Local ou empresa onde trabalha" value={form.guardian_workplace} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-slate-100 pb-2">Situação Socioeconômica Familiar</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 select-none py-1">
                      <input id="family_benefit" type="checkbox" name="family_benefit" checked={form.family_benefit} onChange={onChange} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer" />
                      <label htmlFor="family_benefit" className="text-xs font-bold text-slate-700 cursor-pointer">A família recebe benefício social?</label>
                    </div>
                    {form.family_benefit && (
                      <div className="space-y-1.5 max-w-md">
                        <label htmlFor="family_benefit_details" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Se sim, qual?</label>
                        <input id="family_benefit_details" type="text" name="family_benefit_details" placeholder="Ex: Bolsa Família, BPC" value={form.family_benefit_details} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                      </div>
                    )}
                    <div className="space-y-3 pt-2 border-t border-slate-100/70">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">Composição Familiar</label>
                      <div className="space-y-2.5">
                        {(form.family_members || []).length === 0 && (
                          <p className="text-xs font-semibold text-slate-400 italic">Nenhum familiar adicionado até o momento.</p>
                        )}
                        {(form.family_members || []).map((member, index) => (
                          <div key={`${index}-member`} className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end border border-slate-200/60 bg-slate-50/20 p-4 rounded-xl relative">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nome</span>
                              <input className="w-full h-9 px-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" type="text" placeholder="Nome completo" value={member?.name || ''} onChange={(e) => updateFamilyMember(index, 'name', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Vínculo</span>
                              <input className="w-full h-9 px-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" type="text" placeholder="Ex: Pai, Mãe" value={member?.relationship || ''} onChange={(e) => updateFamilyMember(index, 'relationship', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Idade</span>
                              <input className="w-full h-9 px-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" type="text" placeholder="Idade" value={member?.age || ''} onChange={(e) => updateFamilyMember(index, 'age', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Escolaridade</span>
                              <input className="w-full h-9 px-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" type="text" placeholder="Grau" value={member?.education || ''} onChange={(e) => updateFamilyMember(index, 'education', e.target.value)} />
                            </div>
                            <div className="space-y-1 flex gap-2 items-center sm:col-span-1">
                              <div className="flex-1 space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Etnia</span>
                                <input className="w-full h-9 px-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" type="text" placeholder="Etnia" value={member?.ethnicity || ''} onChange={(e) => updateFamilyMember(index, 'ethnicity', e.target.value)} />
                              </div>
                              <button type="button" className="h-9 px-3 hover:bg-red-50 hover:text-red-600 rounded-lg border border-slate-200 hover:border-red-100 text-slate-400 transition-all flex items-center justify-center cursor-pointer mt-5" onClick={() => removeFamilyMember(index)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        <button type="button" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-950 transition-colors shadow-sm cursor-pointer" onClick={addFamilyMember}>
                          <Plus className="h-3.5 w-3.5" />
                          Adicionar Familiar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Passo 4: CRAS e SCFV */}
            {step === 3 && (
              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-slate-100 pb-2">Encaminhamento Técnico CRAS / CREAS</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5 col-span-full">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Situação de Prioridade</label>
                      <div className="flex gap-4">
                        {CRAS_STATUS_OPTIONS.map((option) => (
                          <label key={option} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                            <input type="radio" name="cras_status" value={option} checked={form.cras_status === option} onChange={onChange} className="border-slate-300 text-indigo-600 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer" />
                            <span>{option === 'prioritario' ? 'Prioritário' : 'Não Prioritário'}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label htmlFor="cras_link_reason" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Motivo do Vínculo</label>
                      <input id="cras_link_reason" type="text" name="cras_link_reason" placeholder="Motivo da vinculação ao CRAS/CREAS" value={form.cras_link_reason} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="cras_referral_agency" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Órgão Encaminhador</label>
                      <input id="cras_referral_agency" type="text" name="cras_referral_agency" placeholder="Ex: CRAS I" value={form.cras_referral_agency} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label htmlFor="cras_technician" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Técnico Responsável</label>
                      <input id="cras_technician" type="text" name="cras_technician" placeholder="Nome do assistente social ou técnico" value={form.cras_technician} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-slate-100 pb-2">Informações do SCFV</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="scfv_insertion_date" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Data de Inserção</label>
                      <input id="scfv_insertion_date" type="date" name="scfv_insertion_date" value={form.scfv_insertion_date} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="scfv_update_date" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Data de Atualização</label>
                      <input id="scfv_update_date" type="date" name="scfv_update_date" value={form.scfv_update_date} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer" />
                    </div>
                    <div className="space-y-1.5 md:col-span-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Dias de frequência no SCFV</label>
                      <div className="flex flex-wrap gap-4 bg-slate-50/55 border border-slate-200/60 p-3 rounded-xl">
                        {WEEK_DAYS.map((day) => (
                          <label key={day.value} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                            <input type="checkbox" checked={form.scfv_frequency_days.includes(day.value)} onChange={() => toggleArrayValue('scfv_frequency_days', day.value)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer" />
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
                            <input type="checkbox" checked={form.scfv_shift.includes(shift.value)} onChange={() => toggleArrayValue('scfv_shift', shift.value)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer" />
                            <span>{shift.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="scfv_group" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Grupo SCFV</label>
                      <input id="scfv_group" type="text" name="scfv_group" placeholder="Grupo" value={form.scfv_group} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="scfv_instructor" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Orientador(a) Técnico(a)</label>
                      <input id="scfv_instructor" type="text" name="scfv_instructor" placeholder="Nome do orientador" value={form.scfv_instructor} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="scfv_boarding" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Embarque (Transporte)</label>
                      <input id="scfv_boarding" type="text" name="scfv_boarding" placeholder="Local de embarque" value={form.scfv_boarding} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="scfv_disembarkation" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Desembarque</label>
                      <input id="scfv_disembarkation" type="text" name="scfv_disembarkation" placeholder="Local de desembarque" value={form.scfv_disembarkation} onChange={onChange} className="w-full h-10 px-3.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5 col-span-full">
                      <label htmlFor="advisor_notes" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Observações do Orientador</label>
                      <textarea id="advisor_notes" name="advisor_notes" placeholder="Evolução, comportamento, anotações de acompanhamento..." value={form.advisor_notes} onChange={onChange} rows={4} className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all resize-y min-h-[5.5rem]" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navegação do wizard */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-400">Etapa {step + 1} de {STEPS.length} · {STEPS[step].label}</span>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={step === 0 ? () => navigate('/usuarios') : goBack}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" /> {step === 0 ? 'Cancelar' : 'Voltar'}
                </button>
                {isLastStep ? (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 h-10 px-6 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    {submitting ? 'Salvando…' : editing ? 'Salvar alterações' : 'Concluir cadastro'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex items-center gap-1.5 h-10 px-6 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
                  >
                    Próximo <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default StudentFormPage;
