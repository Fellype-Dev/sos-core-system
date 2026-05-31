import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Calendar, History, Search, RefreshCw, CheckCircle, AlertCircle, Edit3, X, Eye, ShieldAlert, ArrowRight, UserCheck, UserX } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import studentService from '../services/studentService';
import attendanceService from '../services/attendanceService';
import classGroupService from '../services/classGroupService';
import { cn } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

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
               status: record.status === status ? null : status,
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

      setSuccess('Frequência salva com sucesso.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao salvar frequencia.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Header section banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-8 shadow-xl shadow-slate-100/40">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Registro de Frequência</h1>
              <p className="text-slate-500 text-sm mt-0.5">Lançamento diário e histórico de chamadas das turmas ativas.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3.5 py-1.5 rounded-full border border-indigo-100 text-xs font-bold w-fit self-start sm:self-auto shrink-0">
            <Calendar className="h-4 w-4" />
            <span>Data de Hoje: {dateLabel}</span>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex gap-1.5 bg-slate-100/80 p-0.5 rounded-full border border-slate-200/40 w-fit">
        <button
          className={cn(
            "px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer",
            activeTab === 'marking'
              ? "bg-white text-indigo-600 shadow-sm border border-slate-200/10"
              : "text-slate-600 hover:text-slate-950 hover:bg-slate-50/50"
          )}
          type="button"
          onClick={() => setActiveTab('marking')}
        >
          Lançar Chamada
        </button>
        <button
          className={cn(
            "px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer",
            activeTab === 'history'
              ? "bg-white text-indigo-600 shadow-sm border border-slate-200/10"
              : "text-slate-600 hover:text-slate-950 hover:bg-slate-50/50"
          )}
          type="button"
          onClick={() => setActiveTab('history')}
        >
          Histórico de Chamadas
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-semibold flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-700 font-semibold flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {!selectedProgramId && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-800 font-semibold">
          Nenhuma unidade ativa. Escolha uma unidade no seletor do topo para lançar ou ver chamadas.
        </div>
      )}

      {selectedProgramId && (
        activeTab === 'history' ? (
          <div className="space-y-6">
            {/* History Toolbar Filters */}
            <div className="flex flex-wrap items-end gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200/60 shadow-sm">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-0.5">Filtrar por Data</label>
                <Input 
                  type="date" 
                  value={historyDate} 
                  onChange={(event) => setHistoryDate(event.target.value)} 
                  className="h-10 border-slate-200 text-xs font-bold text-slate-700 bg-white focus:ring-indigo-500/20 max-w-[150px]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-0.5">Filtrar por Turma</label>
                <select 
                  className="h-10 px-3 w-40 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:border-indigo-500 focus:ring-indigo-500/20 focus:outline-none transition-all cursor-pointer"
                  value={historyClassGroup} 
                  onChange={(event) => setHistoryClassGroup(event.target.value)}
                >
                  <option value="">Todas as turmas</option>
                  <option value="__none__">Sem turma</option>
                  {turmaOptions.map((t) => (
                    <option key={t.id} value={t.slug}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button 
                type="button" 
                onClick={loadHistory} 
                disabled={historyLoading} 
                className="h-10 text-xs font-bold cursor-pointer"
              >
                {historyLoading ? 'Buscando...' : 'Filtrar'}
              </Button>
            </div>

            {/* History Sessions Table Card */}
            <Card className="border-slate-100 shadow-xl shadow-slate-100/40 bg-white rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100/50">
                <CardTitle className="text-base font-bold text-slate-900">Lista de Chamadas Salvas</CardTitle>
                <CardDescription className="text-xs text-slate-400">Histórico de frequência gravado para a unidade ativa.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {historyLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-3">
                    <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-indigo-600" />
                    <span className="text-xs text-slate-400 font-bold">Carregando histórico...</span>
                  </div>
                ) : historySessions.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-semibold text-xs">
                    Nenhuma chamada registrada encontrada para os filtros aplicados.
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="bg-slate-50/50 border-b border-slate-100">
                        <tr>
                          <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400">Data</th>
                          <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400">Turma</th>
                          <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400">Período</th>
                          <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400">Criado em</th>
                          <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400">Lançado Por</th>
                          <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/70">
                        {historySessions.map((session) => (
                          <tr key={session.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-5 py-4 font-bold text-slate-800">{formatDateBR(session.attendance_date)}</td>
                            <td className="px-5 py-4 font-bold text-slate-600">{turmaLabel(turmaOptions, session.class_group)}</td>
                            <td className="px-5 py-4">
                              <span className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold border",
                                session.period === 'manha' 
                                  ? "bg-sky-50 text-sky-700 border-sky-100" 
                                  : "bg-amber-50 text-amber-700 border-amber-100"
                              )}>
                                {session.period === 'manha' ? 'Manhã' : session.period === 'tarde' ? 'Tarde' : session.period || '—'}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-slate-500 font-medium">{formatDateBR(session.created_at)}</td>
                            <td className="px-5 py-4 text-slate-500 font-medium">{session.creator?.full_name || session.created_by || '—'}</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center justify-center">
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 text-[11px] font-bold cursor-pointer"
                                  onClick={() => openHistoryDetail(session)}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Visualizar
                                </Button>
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

            {/* Modal Detail View */}
            {selectedHistorySession && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6" onClick={closeHistoryDetail}>
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(event) => event.stopPropagation()}>
                  
                  {/* Modal Header */}
                  <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">Histórico de Chamada</h3>
                      <p className="text-xs text-slate-400 font-semibold mt-1">
                        {formatDateBR(selectedHistorySession.attendance_date)} · {turmaLabel(turmaOptions, selectedHistorySession.class_group)} ·{' '}
                        {selectedHistorySession.period === 'manha' ? 'Manhã' : selectedHistorySession.period === 'tarde' ? 'Tarde' : selectedHistorySession.period || '—'}
                      </p>
                    </div>
                    <button 
                      type="button" 
                      className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                      onClick={closeHistoryDetail}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 overflow-y-auto space-y-6 no-scrollbar">
                    {historyDetailLoading ? (
                      <div className="flex flex-col items-center justify-center py-12 space-y-3">
                        <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-indigo-600" />
                        <span className="text-xs text-slate-400 font-bold">Carregando detalhes...</span>
                      </div>
                    ) : selectedHistoryDetail ? (
                      (() => {
                        const listRecords = historyEditMode ? historyDraftRecords : selectedHistoryDetail.records || [];
                        const present = listRecords.filter((record) => record.status === 'present');
                        const absent = listRecords.filter((record) => record.status === 'absent');

                        return (
                          <div className="space-y-6">
                            {/* Summary count bar */}
                            <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-center">
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Presentes</span>
                                <span className="text-base font-extrabold text-emerald-600 block mt-0.5">{present.length}</span>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Faltas</span>
                                <span className="text-base font-extrabold text-red-600 block mt-0.5">{absent.length}</span>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Atendidos</span>
                                <span className="text-base font-extrabold text-slate-900 block mt-0.5">{listRecords.length}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Present list */}
                              <div className="space-y-3">
                                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                  <UserCheck className="h-4 w-4 text-emerald-600" />
                                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Presentes ({present.length})</h4>
                                </div>
                                {present.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic py-4 text-center">Nenhum usuario presente.</p>
                                ) : (
                                  <ul className="space-y-1.5 max-h-60 overflow-y-auto no-scrollbar pr-1">
                                    {present.map((record) => (
                                      <li key={record.student_id} className="flex justify-between items-center gap-2 p-2 bg-slate-50/50 rounded-lg border border-slate-100 text-xs">
                                        <span className="font-bold text-slate-700">{getRecordDisplayName(record)}</span>
                                        {historyEditMode && (
                                          <button
                                            type="button"
                                            className="px-2 py-1 bg-red-50 text-red-700 font-bold hover:bg-red-100 border border-red-100/60 rounded transition-colors duration-150 cursor-pointer"
                                            onClick={() => updateHistoryDraftRecord(record.student_id, { status: 'absent' })}
                                          >
                                            Falta
                                          </button>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              {/* Absent list */}
                              <div className="space-y-3">
                                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                  <UserX className="h-4 w-4 text-red-600" />
                                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Faltas ({absent.length})</h4>
                                </div>
                                {absent.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic py-4 text-center">Nenhuma falta registrada.</p>
                                ) : (
                                  <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar pr-1">
                                    {absent.map((record) => (
                                      <div key={record.student_id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                                        <div className="flex justify-between items-center gap-2 text-xs">
                                          <strong className="text-slate-800">{getRecordDisplayName(record)}</strong>
                                          {historyEditMode && (
                                            <button
                                              type="button"
                                              className="px-2 py-1 bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 border border-emerald-100/60 rounded transition-colors duration-150 cursor-pointer"
                                              onClick={() => updateHistoryDraftRecord(record.student_id, { status: 'present', note: '' })}
                                            >
                                              Presença
                                            </button>
                                          )}
                                        </div>
                                        {historyEditMode ? (
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                              Justificativa
                                            </label>
                                            <Input
                                              type="text"
                                              value={record.note || ''}
                                              onChange={(event) => updateHistoryDraftRecord(record.student_id, { note: event.target.value })}
                                              placeholder="Motivo da falta..."
                                              className="h-8 text-xs border-slate-200"
                                            />
                                          </div>
                                        ) : record.note ? (
                                          <p className="text-[11px] text-slate-500 font-medium bg-white/60 p-2 rounded-lg border border-slate-200/50 mt-1">
                                            <span className="font-bold text-slate-700">Justificativa:</span> {record.note}
                                          </p>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <p className="text-center py-8 text-slate-400 text-xs italic">Sem dados de registros.</p>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
                    {historyEditMode ? (
                      <>
                        <Button type="button" variant="outline" className="h-9 text-xs font-bold cursor-pointer" onClick={() => setHistoryEditMode(false)}>
                          Cancelar
                        </Button>
                        <Button type="button" className="h-9 text-xs font-bold cursor-pointer bg-indigo-600 hover:bg-indigo-700" onClick={saveHistoryDetail} disabled={historySaving}>
                          {historySaving ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button type="button" className="h-9 text-xs font-bold cursor-pointer bg-indigo-600 hover:bg-indigo-700" onClick={() => setHistoryEditMode(true)}>
                          <Edit3 className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button type="button" variant="outline" className="h-9 text-xs font-bold cursor-pointer" onClick={closeHistoryDetail}>
                          Fechar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Lançar Chamada Toolbar Filters */}
            <div className="flex flex-wrap items-end gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200/60 shadow-sm">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-0.5">Turma</label>
                <select 
                  className="h-10 px-3 w-40 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:border-indigo-500 focus:ring-indigo-500/20 focus:outline-none transition-all cursor-pointer"
                  value={classGroup} 
                  onChange={(event) => setClassGroup(event.target.value)}
                >
                  {turmaOptions.length === 0 ? (
                    <option value={classGroup}>Carregando...</option>
                  ) : (
                    turmaOptions.map((t) => (
                      <option key={t.id} value={t.slug}>
                        {t.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-0.5">Período</label>
                <select 
                  className="h-10 px-3 w-40 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:border-indigo-500 focus:ring-indigo-500/20 focus:outline-none transition-all cursor-pointer"
                  value={period} 
                  onChange={(event) => setPeriod(event.target.value)}
                >
                  <option value="manha">Manhã</option>
                  <option value="tarde">Tarde</option>
                </select>
              </div>

              <Button 
                type="button" 
                onClick={saveAttendance} 
                disabled={saving || loading} 
                className="h-10 text-xs font-bold cursor-pointer bg-indigo-600 hover:bg-indigo-700"
              >
                {saving ? 'Gravando...' : 'Salvar Chamada'}
              </Button>
            </div>

            {/* Attendance Marking Table */}
            <Card className="border-slate-100 shadow-xl shadow-slate-100/40 bg-white rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100/50">
                <CardTitle className="text-base font-bold text-slate-900">Listagem de Chamada</CardTitle>
                <CardDescription className="text-xs text-slate-400">Marque a presença ou falta dos participantes correspondentes.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-3">
                    <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-indigo-600" />
                    <span className="text-xs text-slate-400 font-bold">Carregando usuários...</span>
                  </div>
                ) : records.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-semibold text-xs">
                    Nenhum usuario carregado para os filtros aplicados nesta turma.
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="bg-slate-50/50 border-b border-slate-100">
                        <tr>
                          <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400">Nome do Participante</th>
                          <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400 text-center w-28">Presente</th>
                          <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400 text-center w-28">Falta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/70">
                        {records.map((record) => (
                          <tr key={record.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-5 py-4 font-bold text-slate-800">{record.name}</td>
                            <td className="px-5 py-4 text-center">
                              <div className="flex justify-center">
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer h-5 w-5"
                                  checked={record.status === 'present'}
                                  onChange={() => markStatus(record.id, 'present')}
                                />
                              </div>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <div className="flex justify-center">
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-300 text-red-600 focus:ring-red-500/20 cursor-pointer h-5 w-5"
                                  checked={record.status === 'absent'}
                                  onChange={() => markStatus(record.id, 'absent')}
                                />
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
          </div>
        )
      )}
    </div>
  );
}

export default Attendance;
