import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import useAuth from '../hooks/useAuth';
import attendanceService from '../services/attendanceService';
import classGroupService from '../services/classGroupService';
import '../styles/Users.css';

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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {reportType === 'class_groups'
              ? 'Este relatório não precisa de data. Ele exporta as turmas cadastradas na unidade.'
              : 'Dica: para exportar uma chamada específica, preencha a data e a turma. O período é opcional.'}
          </span>
        </div>
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
