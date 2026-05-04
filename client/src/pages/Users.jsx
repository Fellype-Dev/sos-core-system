import { useEffect, useMemo, useState } from 'react';
import useAuth from '../hooks/useAuth';
import studentService from '../services/studentService';
import programService from '../services/programService';
import classGroupService from '../services/classGroupService';
import { TURMA_FILTER_ALL } from '../constants/turmas';
import '../styles/Users.css';

function isUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

const initialForm = () => ({
  full_name: '',
  birth_date: '',
  enrollment_code: '',
  contact_phone: '',
  guardian_name: '',
  guardian_phone: '',
  allergies: '',
  medical_notes: '',
  program_id: '',
  // class_group removed: assignment happens in 'Gerenciar turmas'
});

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

function Users() {
  const { user, selectedProgramId } = useAuth();
  const canChooseProgram = user?.role === 'admin';

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
      setError(err?.response?.data?.message || 'Falha ao carregar alunos.');
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
      const mat = String(s.enrollment_code || '').toLowerCase();
      const matchesText = !q || name.includes(q) || mat.includes(q);
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
      const mat = String(s.enrollment_code || '').toLowerCase();
      const matchesText = !q || name.includes(q) || mat.includes(q);
      const matchesTurma =
        assignmentClassFilter === TURMA_FILTER_ALL
          ? true
          : assignmentClassFilter === '__none__'
            ? !s.class_group
            : s.class_group === assignmentClassFilter;
      return matchesText && matchesTurma;
    });
  }, [students, assignmentSearchQuery, assignmentClassFilter]);

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
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
        `Excluir a turma "${row.name}"? Só é permitido se não houver alunos nem chamadas usando essa turma.`
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
      setError('Selecione a unidade do aluno.');
      return;
    }

    // turma será atribuída em 'Gerenciar turmas'

    setSubmitting(true);

    try {
      const payload = {
        full_name: form.full_name.trim(),
        birth_date: form.birth_date || null,
        enrollment_code: form.enrollment_code.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        guardian_name: form.guardian_name.trim() || null,
        guardian_phone: form.guardian_phone.trim() || null,
        allergies: form.allergies.trim() || null,
        medical_notes: form.medical_notes.trim() || null,
        // class_group intentionally omitted: assignment happens in 'Gerenciar turmas'
      };

      if (canChooseProgram) {
        payload.program_id = form.program_id || null;
      }

      if (editingId) {
        await studentService.update(editingId, payload);
        setSuccess('Dados do aluno atualizados.');
      } else {
        await studentService.create(payload);
        setSuccess('Aluno cadastrado com sucesso.');
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
      enrollment_code: item.enrollment_code || '',
      contact_phone: item.contact_phone || '',
      guardian_name: item.guardian_name || '',
      guardian_phone: item.guardian_phone || '',
      allergies: item.allergies || '',
      medical_notes: item.medical_notes || '',
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
      setError(err?.response?.data?.message || 'Falha ao atribuir aluno.');
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Remover este aluno do cadastro? Esta ação não pode ser desfeita.')) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      await studentService.delete(id);
      if (editingId === id) {
        resetForm();
      }
      setSuccess('Aluno removido.');
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao remover aluno.');
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
        <h1>Alunos</h1>
        <p>
          Cadastre turmas por unidade e vincule cada aluno à turma correta. Na chamada, só aparecem os alunos da turma
          escolhida naquele dia.
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
          {editingId ? 'Editar aluno' : 'Cadastrar aluno'}
        </button>
        <button
          className={`students-tab ${activeTab === 'manage' ? 'students-tab--active' : ''}`}
          onClick={() => setActiveTab('manage')}
          type="button"
        >
          Gerenciar alunos
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
                <h3>Detalhes do aluno</h3>
                <div style={{ marginBottom: '0.5rem' }} className="detail-row">
                  <div className="label">Nome</div>
                  <div>{selectedStudentForDetails.full_name}</div>
                </div>
                <div className="detail-row">
                  <div className="label">Nascimento</div>
                  <div>{formatDateBR(selectedStudentForDetails.birth_date)}</div>
                </div>
                <div className="detail-row">
                  <div className="label">Matrícula</div>
                  <div>{selectedStudentForDetails.enrollment_code || '—'}</div>
                </div>
                <div className="detail-row">
                  <div className="label">Contato</div>
                  <div>{selectedStudentForDetails.contact_phone || '—'}</div>
                </div>
                <div className="detail-row">
                  <div className="label">Responsável</div>
                  <div>{selectedStudentForDetails.guardian_name || '—'}</div>
                </div>
                <div className="detail-row">
                  <div className="label">Tel. responsável</div>
                  <div>{selectedStudentForDetails.guardian_phone || '—'}</div>
                </div>
                <div className="detail-row">
                  <div className="label">Alergias</div>
                  <div>{selectedStudentForDetails.allergies || '—'}</div>
                </div>
                <div className="detail-row">
                  <div className="label">Observações médicas</div>
                  <div>{selectedStudentForDetails.medical_notes || '—'}</div>
                </div>
                <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
                  <button className="students-btn students-btn--ghost" type="button" onClick={closeDetails}>
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'register' && (
            <section className="students-card" aria-labelledby="cadastro-aluno-titulo">
              <h2 id="cadastro-aluno-titulo" className="students-card__title">
                {editingId ? 'Editar aluno' : 'Cadastrar aluno'}
              </h2>

              <form className="students-form" onSubmit={onSubmit}>
                <div className="students-section">
                  <span className="students-section__label">Dados pessoais</span>
                  <div className="students-grid2">
                    <div className="students-field students-field--span2">
                      <label htmlFor="full_name">Nome do aluno</label>
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
                      <label htmlFor="birth_date">Data de nascimento</label>
                      <input
                        id="birth_date"
                        type="date"
                        name="birth_date"
                        value={form.birth_date}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field">
                      <label htmlFor="enrollment_code">
                        Matrícula <span className="optional">(opcional)</span>
                      </label>
                      <input
                        id="enrollment_code"
                        type="text"
                        name="enrollment_code"
                        placeholder="Código interno"
                        value={form.enrollment_code}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field students-field--span2">
                      <label htmlFor="program_id">Unidade do aluno</label>
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
                  <span className="students-section__label">Contato</span>
                  <div className="students-grid2">
                    <div className="students-field students-field--span2">
                      <label htmlFor="contact_phone">
                        Telefone / WhatsApp <span className="optional">(opcional)</span>
                      </label>
                      <input
                        id="contact_phone"
                        type="tel"
                        name="contact_phone"
                        placeholder="(00) 00000-0000"
                        value={form.contact_phone}
                        onChange={onChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="students-section">
                  <span className="students-section__label">Responsável</span>
                  <div className="students-grid2">
                    <div className="students-field">
                      <label htmlFor="guardian_name">
                        Nome <span className="optional">(opcional)</span>
                      </label>
                      <input
                        id="guardian_name"
                        type="text"
                        name="guardian_name"
                        placeholder="Responsável legal"
                        value={form.guardian_name}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field">
                      <label htmlFor="guardian_phone">
                        Telefone <span className="optional">(opcional)</span>
                      </label>
                      <input
                        id="guardian_phone"
                        type="tel"
                        name="guardian_phone"
                        placeholder="(00) 00000-0000"
                        value={form.guardian_phone}
                        onChange={onChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="students-section">
                  <span className="students-section__label">Saúde e observações</span>
                  <div className="students-grid2">
                    <div className="students-field students-field--span2">
                      <label htmlFor="allergies">
                        Alergias <span className="optional">(opcional)</span>
                      </label>
                      <input
                        id="allergies"
                        type="text"
                        name="allergies"
                        placeholder="Ex.: amendoim, lactose…"
                        value={form.allergies}
                        onChange={onChange}
                      />
                    </div>
                    <div className="students-field students-field--span2">
                      <label htmlFor="medical_notes">
                        Observações médicas / cuidados <span className="optional">(opcional)</span>
                      </label>
                      <textarea
                        id="medical_notes"
                        name="medical_notes"
                        placeholder="Medicamentos de uso contínuo, limitações, contatos de emergência…"
                        value={form.medical_notes}
                        onChange={onChange}
                        rows={4}
                      />
                    </div>
                  </div>
                </div>

                <div className="students-form__actions">
                  <button className="students-btn students-btn--primary" type="submit" disabled={submitting}>
                    {submitting ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Cadastrar aluno'}
                  </button>
                  {editingId && (
                    <button className="students-btn students-btn--ghost" type="button" onClick={resetForm}>
                      Cancelar edição
                    </button>
                  )}
                </div>
              </form>
            </section>
          )}

        {activeTab === 'manage' && (
          <section className="students-card" aria-labelledby="lista-alunos-titulo">
          <div className="students-list-head">
            <h2 id="lista-alunos-titulo">Lista na unidade</h2>
            {!loading && (
              <span className="students-count">
                {students.length} {students.length === 1 ? 'aluno' : 'alunos'}
              </span>
            )}
            </div>

            <div className="students-toolbar">
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                Buscar
                <input
                  type="search"
                  placeholder="Nome ou matrícula"
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
                  ? 'Nenhum aluno encontrado com os filtros atuais.'
                  : 'Nenhum aluno nesta unidade ainda. Preencha o formulário de cadastro para adicionar.'}
              </div>
            ) : (
              <div className="students-table-wrap">
                <table className="students-data-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Nasc.</th>
                      <th>Matrícula</th>
                      <th>Turma</th>
                      {canChooseProgram && <th>Unidade</th>}
                      <th>Contato</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((item) => (
                    <tr key={item.id}>
                      <td>{item.full_name}</td>
                      <td className="cell-muted">{formatDateBR(item.birth_date)}</td>
                      <td className="cell-muted">{item.enrollment_code || '—'}</td>
                      <td className="cell-muted">{turmaLabel(classGroupsList, item.class_group)}</td>
                      {canChooseProgram && <td className="cell-muted">{item.programs?.name || '—'}</td>}
                      <td className="cell-muted">{item.contact_phone || '—'}</td>
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
                  <h4 style={{ margin: '0 0 1rem' }}>Atribuir alunos às turmas</h4>

                  <div className="students-toolbar" style={{ marginBottom: '1rem' }}>
                    <label>
                      Buscar aluno
                      <input
                        type="search"
                        placeholder="Nome ou matrícula"
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
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhum aluno disponível.</p>
                  ) : assignmentStudents.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhum aluno corresponde aos filtros aplicados.</p>
                  ) : (
                    <table className="students-assignment-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Matrícula</th>
                          <th>Turma</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignmentStudents.map((s) => (
                          <tr key={s.id}>
                            <td className="students-assignment-table__name">{s.full_name}</td>
                            <td className="students-assignment-table__enrollment">{s.enrollment_code || '—'}</td>
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

export default Users;
