import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import useAuth from '../hooks/useAuth';
import attendanceService from '../services/attendanceService';
import classGroupService from '../services/classGroupService';
import studentService from '../services/studentService';
import '../styles/Students.css';

const COLORS = {
  primary: '#06b6d4',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  secondary: '#8b5cf6',
  accent: '#ec4899',
};

const PALETTE = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

const REPORT_TYPES = {
  class_groups: {
    label: 'Turmas da unidade',
    description: 'Exporta a lista de turmas cadastradas na unidade selecionada.',
  },
  attendance_history: {
    label: 'Histórico de chamadas',
    description: 'Exporta um resumo das sessões de chamada filtrando por data, turma e período.',
  },
  attendance_detail: {
    label: 'Chamada detalhada do dia',
    description: 'Exporta a lista de usuarios presentes e faltosos de uma chamada específica.',
  },
};

function isUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

function formatDateBR(iso) {
  if (!iso) return '—';
  const [year, month, day] = String(iso).slice(0, 10).split('-');
  if (!year || !month || !day) return '—';
  return `${day}/${month}/${year}`;
}

function formatDateTimeBR(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function downloadWorkbook(filename, sheets) {
  const workbook = XLSX.utils.book_new();

  sheets.forEach(({ name, rows }) => {
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  });

  XLSX.writeFile(workbook, filename);
}

function getPeriodLabel(period) {
  if (period === 'manha') return 'Manhã';
  if (period === 'tarde') return 'Tarde';
  return period || '—';
}

function Reports() {
  const { selectedProgramId, availablePrograms } = useAuth();
  const currentProgram = useMemo(
    () => availablePrograms.find((program) => String(program.id) === String(selectedProgramId)),
    [availablePrograms, selectedProgramId]
  );

  const [reportType, setReportType] = useState('attendance_detail');
  const [classGroups, setClassGroups] = useState([]);
  const [classGroupFilter, setClassGroupFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [programData, setProgramData] = useState([]);
  const [chartsLoading, setChartsLoading] = useState(false);
  const previewRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const loadClassGroups = async () => {
      if (!selectedProgramId || !isUuid(selectedProgramId)) {
        setClassGroups([]);
        return;
      }

      try {
        const response = await classGroupService.list(selectedProgramId);
        if (!cancelled) {
          setClassGroups(response.data || []);
        }
      } catch {
        if (!cancelled) {
          setClassGroups([]);
        }
      }
    };

    loadClassGroups();
    return () => {
      cancelled = true;
    };
  }, [selectedProgramId]);

  useEffect(() => {
    let cancelled = false;

    const extractData = (response) => response?.data?.data || response?.data || response || [];

    const loadDashboardData = async () => {
      const programsToFetch = Array.isArray(availablePrograms) && availablePrograms.length > 0
        ? availablePrograms
        : selectedProgramId
          ? [{ id: selectedProgramId, name: 'Unidade ativa' }]
          : [];

      if (programsToFetch.length === 0) {
        setProgramData([]);
        return;
      }

      setChartsLoading(true);
      try {
        const results = await Promise.all(
          programsToFetch.map(async (program) => {
            const [studentsRes, sessionsRes, classGroupsRes] = await Promise.all([
              studentService.getAll({ program_id: program.id }),
              attendanceService.getSessions({ program_id: program.id }),
              classGroupService.list(program.id),
            ]);

            return {
              program,
              students: extractData(studentsRes),
              sessions: extractData(sessionsRes),
              classGroups: extractData(classGroupsRes),
            };
          })
        );

        if (!cancelled) {
          setProgramData(results);
        }
      } catch {
        if (!cancelled) {
          setProgramData([]);
        }
      } finally {
        if (!cancelled) {
          setChartsLoading(false);
        }
      }
    };

    loadDashboardData();
    return () => {
      cancelled = true;
    };
  }, [availablePrograms, selectedProgramId]);

  const reportInfo = REPORT_TYPES[reportType];
  const needsDate = reportType !== 'class_groups';

  const classGroupLabel = (slug) => {
    if (!slug) return 'Todas';
    if (slug === '__none__') return 'Sem turma';
    const row = classGroups.find((item) => item.slug === slug);
    return row ? row.name : slug;
  };

  const buildFileName = (suffix) => {
    const base = currentProgram?.name ? currentProgram.name.replaceAll(' ', '_') : 'unidade';
    return `${base}_${suffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  };

  const buildPdfName = (suffix) => {
    const base = currentProgram?.name ? currentProgram.name.replaceAll(' ', '_') : 'unidade';
    return `${base}_${suffix}_${new Date().toISOString().slice(0, 10)}.pdf`;
  };

  const buildAnalytics = (listStudents, listSessions, listClassGroups) => {
    const totalStudents = listStudents.length;

    let presentCount = 0;
    let absentCount = 0;

    listSessions.forEach((session) => {
      if (session.present_count !== undefined) presentCount += session.present_count;
      if (session.absent_count !== undefined) absentCount += session.absent_count;
    });

    const totalRecords = presentCount + absentCount;
    const attendancePercentage = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

    const studentsByTurma = {};
    listStudents.forEach((student) => {
      const turma = student.class_group || 'Sem turma';
      studentsByTurma[turma] = (studentsByTurma[turma] || 0) + 1;
    });

    const turmaData = Object.entries(studentsByTurma).map(([name, value]) => ({ name, value }));

    const studentsByPeriod = {};
    listClassGroups.forEach((group) => {
      const period = group.period || 'Não definido';
      studentsByPeriod[period] = (studentsByPeriod[period] || 0) + (group.students_count || 0);
    });

    const periodData = Object.entries(studentsByPeriod).map(([name, value]) => ({
      name: name === 'manha' ? 'Manhã' : name === 'tarde' ? 'Tarde' : name,
      value,
    }));

    const turmaStats = {};
    listSessions.forEach((session) => {
      const turma = session.class_group || 'Sem turma';
      if (!turmaStats[turma]) turmaStats[turma] = { present: 0, absent: 0 };
      turmaStats[turma].present += session.present_count || 0;
      turmaStats[turma].absent += session.absent_count || 0;
    });

    const turmaAttendanceData = Object.entries(turmaStats).map(([turma, stats]) => ({
      name: turma,
      present: stats.present,
      absent: stats.absent,
    }));

    return {
      totalStudents,
      attendancePercentage,
      presentCount,
      absentCount,
      totalRecords,
      turmaData,
      periodData,
      turmaAttendanceData,
    };
  };

  const programAnalytics = useMemo(
    () => programData.map((row) => ({
      program: row.program,
      analytics: buildAnalytics(
        Array.isArray(row.students) ? row.students : [],
        Array.isArray(row.sessions) ? row.sessions : [],
        Array.isArray(row.classGroups) ? row.classGroups : []
      ),
    })),
    [programData]
  );

  const totalStudentsAll = programAnalytics.reduce((sum, row) => sum + row.analytics.totalStudents, 0);
  const totalPresentAll = programAnalytics.reduce((sum, row) => sum + row.analytics.presentCount, 0);
  const totalAbsentAll = programAnalytics.reduce((sum, row) => sum + row.analytics.absentCount, 0);
  const totalRecordsAll = totalPresentAll + totalAbsentAll;
  const attendanceAll = totalRecordsAll > 0 ? Math.round((totalPresentAll / totalRecordsAll) * 100) : 0;

  const studentsByProgramChart = programAnalytics.map((row) => ({
    name: row.program?.name || 'Unidade',
    value: row.analytics.totalStudents,
  }));

  const selectedAnalytics = useMemo(() => {
    const selectedRow = programAnalytics.find((row) => String(row.program?.id) === String(selectedProgramId));
    return selectedRow || programAnalytics[0] || null;
  }, [programAnalytics, selectedProgramId]);

  const exportDashboardPdf = async () => {
    if (!previewRef.current) {
      setError('A prévia ainda não está pronta para exportar.');
      return;
    }

    setPdfLoading(true);
    setError('');
    setSuccess('');

    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
      pdf.save(buildPdfName('resumo_dashboard'));
      setSuccess('PDF exportado com sucesso.');
    } catch (err) {
      setError(err?.message || 'Falha ao exportar o PDF.');
    } finally {
      setPdfLoading(false);
    }
  };

  const exportClassGroups = async () => {
    const rows = [
      ['Nome', 'Slug', 'Período', 'Ordem', 'Criada em'],
      ...classGroups.map((group) => [
        group.name || '—',
        group.slug || '—',
        getPeriodLabel(group.period),
        group.sort_order ?? '—',
        formatDateTimeBR(group.created_at),
      ]),
    ];

    downloadWorkbook(buildFileName('turmas'), [{ name: 'Turmas', rows }]);
  };

  const exportAttendanceHistory = async () => {
    if (!dateFilter) {
      setError('Selecione uma data para exportar o histórico de chamadas.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const params = { attendance_date: dateFilter };
      if (classGroupFilter) {
        params.class_group = classGroupFilter === '__none__' ? '' : classGroupFilter;
      }
      if (periodFilter) {
        params.period = periodFilter;
      }
      if (selectedProgramId) {
        params.program_id = selectedProgramId;
      }

      const response = await attendanceService.getSessions(params);
      const sessions = response.data?.data || response.data || [];

      if (sessions.length === 0) {
        setSuccess('Nenhuma chamada encontrada para os filtros aplicados.');
        return;
      }

      const detailResponses = await Promise.all(
        sessions.map(async (session) => {
          const detailResponse = await attendanceService.getSessionDetail(session.id);
          return detailResponse.data || detailResponse;
        })
      );

      const rows = [
        ['Data', 'Turma', 'Período', 'Presenças', 'Faltas', 'Criado em', 'Criado por'],
      ];

      detailResponses.forEach((detail) => {
        const records = detail.records || [];
        const presentCount = records.filter((record) => record.status === 'present').length;
        const absentCount = records.filter((record) => record.status === 'absent').length;
        rows.push([
          formatDateBR(detail.session?.attendance_date),
          classGroupLabel(detail.session?.class_group),
          getPeriodLabel(detail.session?.period),
          presentCount,
          absentCount,
          formatDateTimeBR(detail.session?.created_at),
          detail.session?.created_by || '—',
        ]);
      });

      downloadWorkbook(buildFileName('historico_chamadas'), [{ name: 'Historico', rows }]);
      setSuccess('Histórico exportado com sucesso.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao exportar o histórico de chamadas.');
    } finally {
      setLoading(false);
    }
  };

  const exportAttendanceDetail = async () => {
    if (!dateFilter) {
      setError('Selecione uma data para exportar a chamada detalhada.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const params = { attendance_date: dateFilter };
      if (classGroupFilter) {
        params.class_group = classGroupFilter === '__none__' ? '' : classGroupFilter;
      }
      if (periodFilter) {
        params.period = periodFilter;
      }
      if (selectedProgramId) {
        params.program_id = selectedProgramId;
      }

      const response = await attendanceService.getSessions(params);
      const sessions = response.data?.data || response.data || [];

      if (sessions.length === 0) {
        setSuccess('Nenhuma chamada encontrada para os filtros aplicados.');
        return;
      }

      const detailRows = [['Data', 'Turma', 'Período', 'Usuario', 'NIS', 'Status', 'Justificativa']];
      const summaryRows = [['Data', 'Turma', 'Período', 'Presenças', 'Faltas', 'Criado em', 'Criado por']];

      for (const session of sessions) {
        const detailResponse = await attendanceService.getSessionDetail(session.id);
        const detail = detailResponse.data?.data || detailResponse.data || detailResponse;
        const sessionRecords = detail.records || [];
        const presentCount = sessionRecords.filter((record) => record.status === 'present').length;
        const absentCount = sessionRecords.filter((record) => record.status === 'absent').length;

        summaryRows.push([
          formatDateBR(detail.session?.attendance_date),
          classGroupLabel(detail.session?.class_group),
          getPeriodLabel(detail.session?.period),
          presentCount,
          absentCount,
          formatDateTimeBR(detail.session?.created_at),
          detail.session?.created_by || '—',
        ]);

        const sessionRows = (detail.records || []).map((record) => [
          formatDateBR(detail.session?.attendance_date),
          classGroupLabel(detail.session?.class_group),
          getPeriodLabel(detail.session?.period),
          record.student?.full_name || '—',
          record.student?.nis_user || record.student?.enrollment_code || '—',
          record.status === 'present' ? 'Presente' : 'Falta',
          record.note || '—',
        ]);
        detailRows.push(...sessionRows);
      }

      downloadWorkbook(buildFileName('chamada_detalhada'), [
        { name: 'Resumo', rows: summaryRows },
        { name: 'Detalhe', rows: detailRows },
      ]);
      setSuccess('Chamada detalhada exportada com sucesso.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao exportar a chamada detalhada.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedProgramId) {
      setError('Selecione uma unidade ativa antes de exportar relatórios.');
      return;
    }

    if (reportType === 'class_groups') {
      await exportClassGroups();
      return;
    }

    if (reportType === 'attendance_history') {
      await exportAttendanceHistory();
      return;
    }

    if (reportType === 'attendance_detail') {
      await exportAttendanceDetail();
    }
  };

  return (
    <section className="panel">
      <h1>Relatórios e Exportação</h1>
      <p style={{ color: 'var(--text-muted)', maxWidth: '48rem', lineHeight: 1.5 }}>
        Exporte dados da unidade para abrir no Excel. Escolha o tipo de relatório e aplique os filtros
        desejados antes de gerar o arquivo.
      </p>

      {error && <p className="students-alert students-alert--error">{error}</p>}
      {success && <p className="students-alert students-alert--success">{success}</p>}
      {!selectedProgramId && (
        <p className="form-error">Nenhuma unidade ativa. Use o seletor no topo para escolher a unidade antes de exportar.</p>
      )}

      <div className="students-card" style={{ marginTop: '1rem' }}>
        <h2 className="students-card__title">Configurar exportação</h2>
        <div className="students-grid2" style={{ gap: '1rem' }}>
          <div className="students-field students-field--span2">
            <label htmlFor="reportType">Tipo de relatório</label>
            <select id="reportType" value={reportType} onChange={(event) => setReportType(event.target.value)}>
              {Object.entries(REPORT_TYPES).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
            <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {reportInfo.description}
            </p>
          </div>

          <div className="students-field">
            <label htmlFor="reportDate">Data {needsDate ? <span className="optional">(obrigatório)</span> : <span className="optional">(opcional)</span>}</label>
            <input
              id="reportDate"
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              required={needsDate}
            />
          </div>

          <div className="students-field">
            <label htmlFor="reportClassGroup">Turma</label>
            <select id="reportClassGroup" value={classGroupFilter} onChange={(event) => setClassGroupFilter(event.target.value)}>
              <option value="">Todas</option>
              <option value="__none__">Sem turma</option>
              {classGroups.map((group) => (
                <option key={group.id} value={group.slug}>
                  {group.name}
                  {group.period ? ` · ${group.period === 'manha' ? 'Manhã' : group.period === 'tarde' ? 'Tarde' : group.period}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="students-field">
            <label htmlFor="reportPeriod">Período</label>
            <select id="reportPeriod" value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)}>
              <option value="">Todos</option>
              <option value="manha">Manhã</option>
              <option value="tarde">Tarde</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <button
            className="students-btn students-btn--primary"
            type="button"
            onClick={handleExport}
            disabled={loading || !selectedProgramId || (needsDate && !dateFilter)}
            title={needsDate && !dateFilter ? 'Selecione uma data para exportar este relatório.' : ''}
          >
            {loading ? 'Exportando...' : 'Exportar XLSX'}
          </button>
          <button
            className="students-btn"
            type="button"
            onClick={exportDashboardPdf}
            disabled={pdfLoading || chartsLoading || programAnalytics.length === 0}
            title={chartsLoading ? 'Carregando dados para o PDF.' : 'Exportar resumo em PDF.'}
          >
            {pdfLoading ? 'Gerando PDF...' : 'Exportar PDF'}
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {reportType === 'class_groups'
              ? 'Este relatório não precisa de data. Ele exporta as turmas cadastradas na unidade.'
              : 'Dica: para exportar uma chamada específica, preencha a data e a turma. O período é opcional.'}
          </span>
        </div>
      </div>

      <div className="students-card" style={{ marginTop: '1rem' }}>
        <h2 className="students-card__title">Prévia do Painel Inicial (PDF)</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 0 }}>
          Esta prévia mostra os gráficos mais importantes do painel inicial. Use o botão de PDF para salvar.
        </p>

        {chartsLoading && <p>Carregando dados dos gráficos...</p>}
        {!chartsLoading && programAnalytics.length === 0 && (
          <p className="form-error">Nenhum dado disponível para montar a prévia dos gráficos.</p>
        )}

        {!chartsLoading && programAnalytics.length > 0 && (
          <div ref={previewRef} style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '1rem', borderRadius: '10px', background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)', color: '#fff' }}>
                <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.85rem', opacity: 0.9 }}>Total de usuarios</p>
                <strong style={{ fontSize: '1.8rem' }}>{totalStudentsAll}</strong>
              </div>
              <div style={{ padding: '1rem', borderRadius: '10px', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#fff' }}>
                <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.85rem', opacity: 0.9 }}>Frequencia geral</p>
                <strong style={{ fontSize: '1.8rem' }}>{attendanceAll}%</strong>
              </div>
              <div style={{ padding: '1rem', borderRadius: '10px', background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)', color: '#fff' }}>
                <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.85rem', opacity: 0.9 }}>Registros de presenca</p>
                <strong style={{ fontSize: '1.8rem' }}>{totalRecordsAll}</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
              {studentsByProgramChart.length > 0 && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem' }}>
                  <h3 style={{ marginTop: 0 }}>Usuarios por unidade</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={studentsByProgramChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Usuarios" fill={COLORS.primary} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {selectedAnalytics?.analytics?.turmaData?.length > 0 && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem' }}>
                  <h3 style={{ marginTop: 0 }}>Usuarios por turma</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={selectedAnalytics.analytics.turmaData} dataKey="value" nameKey="name" outerRadius={90} label>
                        {selectedAnalytics.analytics.turmaData.map((entry, index) => (
                          <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {selectedAnalytics?.analytics?.periodData?.length > 0 && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem' }}>
                  <h3 style={{ marginTop: 0 }}>Usuarios por periodo</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={selectedAnalytics.analytics.periodData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Usuarios" fill={COLORS.info} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {selectedAnalytics?.analytics?.turmaAttendanceData?.length > 0 && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem' }}>
                  <h3 style={{ marginTop: 0 }}>Presencas e faltas por turma</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={selectedAnalytics.analytics.turmaAttendanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="present" name="Presencas" fill={COLORS.success} radius={[6, 6, 0, 0]} />
                      <Bar dataKey="absent" name="Faltas" fill={COLORS.danger} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="students-card" style={{ marginTop: '1rem' }}>
        <h2 className="students-card__title">Prévia do que será exportado</h2>
        <ul className="students-turmas-list">
          <li>
            <span>Unidade ativa</span>
            <strong>{currentProgram?.name || '—'}</strong>
          </li>
          <li>
            <span>Relatório</span>
            <strong>{reportInfo.label}</strong>
          </li>
          <li>
            <span>Data</span>
            <strong>{dateFilter ? formatDateBR(dateFilter) : '—'}</strong>
          </li>
          <li>
            <span>Turma</span>
            <strong>{classGroupLabel(classGroupFilter)}</strong>
          </li>
          <li>
            <span>Período</span>
            <strong>{periodFilter ? getPeriodLabel(periodFilter) : 'Todos'}</strong>
          </li>
        </ul>
      </div>
    </section>
  );
}

export default Reports;
