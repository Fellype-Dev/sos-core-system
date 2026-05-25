import { useEffect, useMemo, useState } from 'react';
import useAuth from '../hooks/useAuth';
import studentService from '../services/studentService';
import attendanceService from '../services/attendanceService';
import classGroupService from '../services/classGroupService';

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
  if (!slug) return 'Sem turma';
  const row = groups.find((g) => g.slug === slug);
  return row ? row.name : slug;
}

function getRecordDisplayName(record) {
  const student = record?.student;
  if (!student) return record?.student_id || '—';
  const nis = student.nis_user || student.enrollment_code;
  return nis ? `${student.full_name} (${nis})` : student.full_name;
}

function cloneAttendanceRecords(detail) {
  return (detail?.records || []).map((record) => ({
    student_id: record.student_id,
    student: record.student || null,
    status: record.status || 'absent',
    note: record.note || '',
  }));
}

function Attendance() {
  const { selectedProgramId } = useAuth();
  const [records, setRecords] = useState([]);
  const [turmaOptions, setTurmaOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [classGroup, setClassGroup] = useState('A');
  const [period, setPeriod] = useState('manha');
  const [activeTab, setActiveTab] = useState('marking');
  const [historySessions, setHistorySessions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDate, setHistoryDate] = useState('');
  const [historyClassGroup, setHistoryClassGroup] = useState('');
  const [selectedHistorySession, setSelectedHistorySession] = useState(null);
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState(null);
  const [historyDetailLoading, setHistoryDetailLoading] = useState(false);
  const [historyEditMode, setHistoryEditMode] = useState(false);
  const [historyDraftRecords, setHistoryDraftRecords] = useState([]);
  const [historySaving, setHistorySaving] = useState(false);

  const attendanceDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const dateLabel = useMemo(
    () => new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    []
  );

  useEffect(() => {
    let cancelled = false;

    const loadTurmas = async () => {
      if (!selectedProgramId || !isUuid(selectedProgramId)) {
        setTurmaOptions([]);
        return;
      }
      try {
        const res = await classGroupService.list(selectedProgramId);
        if (cancelled) return;
        const opts = res.data || [];
        setTurmaOptions(opts);
        setClassGroup((prev) => {
          if (opts.some((o) => o.slug === prev)) return prev;
          return opts[0]?.slug || 'A';
        });
      } catch {
        if (!cancelled) setTurmaOptions([]);
      }
    };

    loadTurmas();
    return () => {
      cancelled = true;
    };
  }, [selectedProgramId]);

  const markStatus = (studentId, status) => {
    setRecords((prev) =>
      prev.map((record) =>
        record.id === studentId
          ? {
              ...record,
              status,
            }
          : record
      )
    );
  };

  useEffect(() => {
    const loadStudents = async () => {
      if (activeTab !== 'marking') {
        return;
      }
      if (!selectedProgramId) {
        setRecords([]);
        return;
      }

      setLoading(true);
      setError('');
      setSuccess('');
      try {
        const [studentsResponse, attendanceResponse] = await Promise.all([
          studentService.getAll({ program_id: selectedProgramId, class_group: classGroup }),
          attendanceService.getByDate({
            attendance_date: attendanceDate,
            class_group: classGroup,
            period,
            program_id: selectedProgramId,
          }),
        ]);

        const students = studentsResponse.data || [];
        const recordsByStudent = new Map(
          (attendanceResponse.data?.records || []).map((record) => [record.student_id, record.status])
        );

        setRecords(
          students.map((student) => ({
            id: student.id,
            name: student.full_name,
            status: recordsByStudent.get(student.id) || null,
          }))
        );
      } catch (err) {
        setError(err?.response?.data?.message || 'Falha ao carregar usuarios.');
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [selectedProgramId, attendanceDate, classGroup, period, activeTab]);

  const loadHistory = async () => {
    if (!selectedProgramId) {
      setHistorySessions([]);
      return;
    }

    setHistoryLoading(true);
    setError('');
    setSuccess('');
    try {
      const params = { program_id: selectedProgramId };
      if (historyDate) {
        params.attendance_date = historyDate;
      }
      if (historyClassGroup) {
        params.class_group = historyClassGroup === '__none__' ? '' : historyClassGroup;
      }
      const response = await attendanceService.getSessions(params);
      setHistorySessions(response.data?.data || response.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao carregar histórico de chamadas.');
      setHistorySessions([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistoryDetail = async (session) => {
    setSelectedHistorySession(session);
    setSelectedHistoryDetail(null);
    setHistoryDraftRecords([]);
    setHistoryEditMode(false);
    setHistoryDetailLoading(true);
    setError('');
    try {
      const response = await attendanceService.getSessionDetail(session.id);
      const detail = response.data?.data || response.data || response;
      setSelectedHistoryDetail(detail);
      setHistoryDraftRecords(cloneAttendanceRecords(detail));
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao carregar detalhes da chamada.');
    } finally {
      setHistoryDetailLoading(false);
    }
  };

  const closeHistoryDetail = () => {
    setSelectedHistorySession(null);
    setSelectedHistoryDetail(null);
    setHistoryDraftRecords([]);
    setHistoryEditMode(false);
    setHistoryDetailLoading(false);
  };

  const updateHistoryDraftRecord = (studentId, patch) => {
    setHistoryDraftRecords((prev) =>
      prev.map((record) =>
        record.student_id === studentId
          ? {
              ...record,
              ...patch,
            }
          : record
      )
    );
  };

  const saveHistoryDetail = async () => {
    if (!selectedHistorySession || !selectedHistoryDetail) {
      return;
    }

    const payloadRecords = historyDraftRecords
      .filter((record) => record.status === 'present' || record.status === 'absent')
      .map((record) => ({
        student_id: record.student_id,
        status: record.status,
        note: record.status === 'absent' ? String(record.note || '').trim() : null,
      }));

    if (payloadRecords.length === 0) {
      setError('Marque pelo menos um usuario como presente ou ausente.');
      return;
    }

    setHistorySaving(true);
    setError('');
    setSuccess('');
    try {
      await attendanceService.save({
        attendance_date: selectedHistoryDetail.session.attendance_date,
        class_group: selectedHistoryDetail.session.class_group || '',
        period: selectedHistoryDetail.session.period || '',
        program_id: selectedHistoryDetail.session.program_id,
        records: payloadRecords,
      });

      const response = await attendanceService.getSessionDetail(selectedHistorySession.id);
      const detail = response.data?.data || response.data || response;
      setSelectedHistoryDetail(detail);
      setHistoryDraftRecords(cloneAttendanceRecords(detail));
      setHistoryEditMode(false);
      setSuccess('Histórico atualizado com sucesso.');
      await loadHistory();
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao atualizar o histórico.');
    } finally {
      setHistorySaving(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, selectedProgramId, historyDate, historyClassGroup]);

  const saveAttendance = async () => {
    if (!selectedProgramId) {
      setError('Selecione uma unidade para salvar a chamada.');
      return;
    }

    const filledRecords = records.filter((record) => record.status === 'present' || record.status === 'absent');
    if (filledRecords.length === 0) {
      setError('Marque pelo menos um usuario como presente ou ausente.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await attendanceService.save({
        attendance_date: attendanceDate,
        class_group: classGroup,
        period,
        program_id: selectedProgramId,
        records: filledRecords.map((record) => ({
          student_id: record.id,
          status: record.status,
        })),
      });

      setSuccess('Frequencia salva com sucesso.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao salvar frequencia.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel">
      <h1>CHAMADA DIARIA - {dateLabel}</h1>

      <div className="students-tabs" style={{ marginBottom: '1rem' }}>
        <button
          className={`students-tab ${activeTab === 'marking' ? 'students-tab--active' : ''}`}
          type="button"
          onClick={() => setActiveTab('marking')}
        >
          Lançar chamada
        </button>
        <button
          className={`students-tab ${activeTab === 'history' ? 'students-tab--active' : ''}`}
          type="button"
          onClick={() => setActiveTab('history')}
        >
          Histórico de chamadas
        </button>
      </div>

      {error && <p style={{ color: '#b42318' }}>{error}</p>}
      {success && <p style={{ color: '#027a48' }}>{success}</p>}
      {!selectedProgramId && (
        <p className="form-error">Nenhuma unidade ativa. Escolha uma unidade no menu superior ou entre em contato com a sede.</p>
      )}

      {activeTab === 'history' ? (
        <>
          <div className="attendance-toolbar">
            <label>
              Data
              <input type="date" value={historyDate} onChange={(event) => setHistoryDate(event.target.value)} />
            </label>

            <label>
              Turma
              <select value={historyClassGroup} onChange={(event) => setHistoryClassGroup(event.target.value)}>
                <option value="">Todas</option>
                <option value="__none__">Sem turma</option>
                {turmaOptions.map((t) => (
                  <option key={t.id} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>

            <button type="button" onClick={loadHistory} disabled={historyLoading || !selectedProgramId}>
              {historyLoading ? 'Carregando...' : 'Atualizar'}
            </button>
          </div>

          {historyLoading ? (
            <p className="students-loading">Carregando histórico…</p>
          ) : historySessions.length === 0 ? (
            <div className="students-empty">Nenhuma chamada registrada com os filtros aplicados.</div>
          ) : (
            <div className="students-table-wrap">
              <table className="students-data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Turma</th>
                    <th>Período</th>
                    <th>Criado em</th>
                    <th>Criado por</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {historySessions.map((session) => (
                    <tr key={session.id}>
                      <td>{formatDateBR(session.attendance_date)}</td>
                      <td>{turmaLabel(turmaOptions, session.class_group)}</td>
                      <td>{session.period === 'manha' ? 'Manhã' : session.period === 'tarde' ? 'Tarde' : session.period || '—'}</td>
                      <td className="cell-muted">{formatDateBR(session.created_at)}</td>
                      <td className="cell-muted">{session.created_by || '—'}</td>
                      <td>
                        <button type="button" className="students-btn students-btn--ghost" onClick={() => openHistoryDetail(session)}>
                          Detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedHistorySession && (
            <div className="students-modal-backdrop" onClick={closeHistoryDetail}>
              <div className="students-modal" onClick={(event) => event.stopPropagation()}>
                <h3>Detalhes da chamada</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  {formatDateBR(selectedHistorySession.attendance_date)} · {turmaLabel(turmaOptions, selectedHistorySession.class_group)} ·{' '}
                  {selectedHistorySession.period === 'manha' ? 'Manhã' : selectedHistorySession.period === 'tarde' ? 'Tarde' : selectedHistorySession.period || '—'}
                </p>

                {historyDetailLoading ? (
                  <p className="students-loading">Carregando detalhes…</p>
                ) : selectedHistoryDetail ? (
                  (() => {
                    const records = historyEditMode ? historyDraftRecords : selectedHistoryDetail.records || [];
                    const present = records.filter((record) => record.status === 'present');
                    const absent = records.filter((record) => record.status === 'absent');

                    return (
                      <>
                        <div className="students-toolbar" style={{ marginBottom: '1rem' }}>
                          <span>Presentes: {present.length}</span>
                          <span>Faltas: {absent.length}</span>
                          <span>Total: {records.length}</span>
                        </div>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                          <div>
                            <h4 style={{ marginBottom: '0.5rem' }}>Presentes</h4>
                            {present.length === 0 ? (
                              <p className="students-empty" style={{ margin: 0 }}>Nenhum usuario presente.</p>
                            ) : (
                              <ul className="students-turmas-list">
                                {present.map((record) => (
                                  <li key={record.student_id}>
                                    <span>{getRecordDisplayName(record)}</span>
                                    {historyEditMode && (
                                      <button
                                        type="button"
                                        className="students-btn students-btn--ghost"
                                        style={{ padding: '0.25rem 0.5rem' }}
                                        onClick={() => updateHistoryDraftRecord(record.student_id, { status: 'absent' })}
                                      >
                                        Marcar falta
                                      </button>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div>
                            <h4 style={{ marginBottom: '0.5rem' }}>Faltas</h4>
                            {absent.length === 0 ? (
                              <p className="students-empty" style={{ margin: 0 }}>Nenhuma falta registrada.</p>
                            ) : (
                              <div style={{ display: 'grid', gap: '0.75rem' }}>
                                {absent.map((record) => (
                                  <div key={record.student_id} className="students-card" style={{ padding: '0.75rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
                                      <strong>{getRecordDisplayName(record)}</strong>
                                      {historyEditMode && (
                                        <button
                                          type="button"
                                          className="students-btn students-btn--ghost"
                                          style={{ padding: '0.25rem 0.5rem' }}
                                          onClick={() => updateHistoryDraftRecord(record.student_id, { status: 'present', note: '' })}
                                        >
                                          Marcar presença
                                        </button>
                                      )}
                                    </div>
                                    {historyEditMode ? (
                                      <div style={{ marginTop: '0.75rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                          Justificativa da falta
                                        </label>
                                        <textarea
                                          rows={3}
                                          value={record.note || ''}
                                          onChange={(event) => updateHistoryDraftRecord(record.student_id, { note: event.target.value })}
                                          placeholder="Ex.: consulta médica, viagem, compromisso familiar..."
                                          style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                                        />
                                      </div>
                                    ) : record.note ? (
                                      <p style={{ margin: '0.75rem 0 0', color: 'var(--text-muted)' }}>
                                        Justificativa: {record.note}
                                      </p>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          {historyEditMode ? (
                            <>
                              <button type="button" className="students-btn students-btn--ghost" onClick={() => setHistoryEditMode(false)}>
                                Cancelar edição
                              </button>
                              <button type="button" className="students-btn students-btn--primary" onClick={saveHistoryDetail} disabled={historySaving}>
                                {historySaving ? 'Salvando...' : 'Salvar alterações'}
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" className="students-btn students-btn--ghost" onClick={() => setHistoryEditMode(true)}>
                                Editar chamada
                              </button>
                              <button type="button" className="students-btn students-btn--ghost" onClick={closeHistoryDetail}>
                                Fechar
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    );
                  })()
                ) : (
                  <p className="students-empty">Sem dados para exibir.</p>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <>

      <div className="attendance-toolbar">
        <label>
          Turma
          <select value={classGroup} onChange={(event) => setClassGroup(event.target.value)}>
            {turmaOptions.length === 0 ? (
              <option value={classGroup}>Carregando turmas…</option>
            ) : (
              turmaOptions.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.name}
                </option>
              ))
            )}
          </select>
        </label>

        <label>
          Periodo
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="manha">Manha</option>
            <option value="tarde">Tarde</option>
          </select>
        </label>

        <button type="button" onClick={saveAttendance} disabled={saving || loading || !selectedProgramId}>
          {saving ? 'Salvando...' : 'Salvar frequencia'}
        </button>
      </div>

      <table className="attendance-table attendance-marking">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Presente</th>
            <th>Falta</th>
          </tr>
        </thead>
        <tbody>
          {!loading && records.length === 0 && (
            <tr>
              <td colSpan="3">Nenhum usuario carregado para esta turma.</td>
            </tr>
          )}
          {loading && (
            <tr>
              <td colSpan="3">Carregando usuarios…</td>
            </tr>
          )}
          {records.map((record) => (
            <tr key={record.id}>
              <td>{record.name}</td>
              <td>
                <input
                  type="checkbox"
                  checked={record.status === 'present'}
                  onChange={() => markStatus(record.id, 'present')}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={record.status === 'absent'}
                  onChange={() => markStatus(record.id, 'absent')}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
        </>
      )}
    </section>
  );
}

export default Attendance;
