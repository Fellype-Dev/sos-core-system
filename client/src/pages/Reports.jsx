import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FileSpreadsheet, FileText, Sparkles, Filter, Calendar, CheckCircle, ShieldAlert, Clock, Building, BarChart3, PieChart as PieIcon, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import useAuth from '../hooks/useAuth';
import attendanceService from '../services/attendanceService';
import classGroupService from '../services/classGroupService';
import studentService from '../services/studentService';
import { cn } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const COLORS = {
  primary: '#3e4095',
  success: '#72b736',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  secondary: '#8b5cf6',
  accent: '#ec4899',
};

const PALETTE = ['#3e4095', '#72b736', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

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
    
    // Auto-fit column widths
    if (rows.length > 0) {
      const colWidths = rows[0].map((_, colIndex) => {
        let maxLen = 10; // largura mínima padrão
        rows.forEach(row => {
          const val = row[colIndex];
          if (val !== undefined && val !== null) {
            const strVal = String(val);
            if (strVal.length > maxLen) {
              maxLen = strVal.length;
            }
          }
        });
        return { wch: maxLen + 3 }; // adiciona margem de espaçamento
      });
      worksheet['!cols'] = colWidths;
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  });

  XLSX.writeFile(workbook, filename);
}

function getPeriodLabel(period) {
  if (period === 'manha') return 'Manhã';
  if (period === 'tarde') return 'Tarde';
  return period;
}

function Reports() {
  const { selectedProgramId } = useAuth();
  const [reportType, setReportType] = useState('class_groups');
  const [classGroups, setClassGroups] = useState([]);
  const [dateFilter, setDateFilter] = useState('');
  const [useDateRange, setUseDateRange] = useState(false);
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [classGroupFilter, setClassGroupFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const previewRef = useRef(null);

  // States para a prévia de gráficos no PDF (dados consolidados da unidade)
  const [programAnalytics, setProgramAnalytics] = useState([]);
  const [chartsLoading, setChartsLoading] = useState(false);

  const currentProgram = useMemo(() => {
    return selectedProgramId ? { id: selectedProgramId } : null;
  }, [selectedProgramId]);

  const reportInfo = useMemo(() => REPORT_TYPES[reportType] || { label: '', description: '' }, [reportType]);

  const needsDate = useMemo(() => {
    return reportType === 'attendance_detail';
  }, [reportType]);

  const hasValidDate = useMemo(() => {
    if (useDateRange) {
      return !!(startDateFilter && endDateFilter);
    }
    return !!dateFilter;
  }, [useDateRange, dateFilter, startDateFilter, endDateFilter]);

  // Carrega turmas da unidade
  useEffect(() => {
    let active = true;
    const loadTurmas = async () => {
      if (!selectedProgramId || !isUuid(selectedProgramId)) {
        setClassGroups([]);
        return;
      }
      try {
        const res = await classGroupService.list(selectedProgramId);
        if (active) {
          setClassGroups(res.data || []);
        }
      } catch {
        if (active) setClassGroups([]);
      }
    };
    loadTurmas();
    return () => {
      active = false;
    };
  }, [selectedProgramId]);

  // Carrega dados agregados para os gráficos de prévia em PDF
  useEffect(() => {
    let active = true;
    const loadAggregates = async () => {
      if (!selectedProgramId || !isUuid(selectedProgramId)) {
        setProgramAnalytics([]);
        return;
      }
      setChartsLoading(true);
      try {
        const [studentsRes, sessionsRes, classGroupsRes] = await Promise.all([
          studentService.getAll({ program_id: selectedProgramId }),
          attendanceService.getSessions({ program_id: selectedProgramId }),
          classGroupService.list(selectedProgramId),
        ]);

        if (!active) return;

        const listStudents = studentsRes.data || [];
        const listSessions = sessionsRes.data?.data || sessionsRes.data || [];
        const listClassGroups = classGroupsRes.data || [];

        // Métricas de frequência
        const totalStudents = listStudents.length;
        let presentCount = 0;
        let absentCount = 0;
        listSessions.forEach((s) => {
          if (s.present_count !== undefined) presentCount += s.present_count;
          if (s.absent_count !== undefined) absentCount += s.absent_count;
        });

        const totalRecords = presentCount + absentCount;
        const attendancePercentage = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

        // Alunos por Turma
        const studentsByTurma = {};
        listStudents.forEach((student) => {
          const t = student.class_group || 'Sem turma';
          studentsByTurma[t] = (studentsByTurma[t] || 0) + 1;
        });
        const turmaData = Object.entries(studentsByTurma).map(([name, value]) => ({ name, value }));

        // Alunos por Período
        const studentsByPeriod = {};
        listClassGroups.forEach((g) => {
          const p = g.period || 'Não definido';
          studentsByPeriod[p] = (studentsByPeriod[p] || 0) + (g.students_count || 0);
        });
        const periodData = Object.entries(studentsByPeriod).map(([name, value]) => ({
          name: name === 'manha' ? 'Manhã' : name === 'tarde' ? 'Tarde' : name,
          value,
        }));

        // Frequência/Faltas por Turma
        const turmaStats = {};
        listSessions.forEach((session) => {
          const t = session.class_group || 'Sem turma';
          if (!turmaStats[t]) turmaStats[t] = { present: 0, absent: 0 };
          turmaStats[t].present += session.present_count || 0;
          turmaStats[t].absent += session.absent_count || 0;
        });
        const turmaAttendanceData = Object.entries(turmaStats).map(([tName, stats]) => ({
          name: tName,
          present: stats.present,
          absent: stats.absent,
          percentage:
            stats.present + stats.absent > 0
              ? Math.round((stats.present / (stats.present + stats.absent)) * 100)
              : 0,
        }));

        setProgramAnalytics([
          {
            analytics: {
              totalStudents,
              attendancePercentage,
              presentCount,
              absentCount,
              totalRecords,
              turmaData,
              periodData,
              turmaAttendanceData,
            },
          },
        ]);
      } catch (err) {
        console.error('Erro ao montar gráficos de prévia:', err);
        setProgramAnalytics([]);
      } finally {
        if (active) setChartsLoading(false);
      }
    };

    loadAggregates();
    return () => {
      active = false;
    };
  }, [selectedProgramId]);

  const selectedAnalytics = useMemo(() => programAnalytics[0] || null, [programAnalytics]);

  const totalStudentsAll = selectedAnalytics?.analytics?.totalStudents || 0;
  const totalPresentAll = selectedAnalytics?.analytics?.presentCount || 0;
  const totalAbsentAll = selectedAnalytics?.analytics?.absentCount || 0;
  const totalRecordsAll = totalPresentAll + totalAbsentAll;
  const attendanceAll = selectedAnalytics?.analytics?.attendancePercentage || 0;

  const studentsByProgramChart = useMemo(() => {
    if (!selectedProgramId) return [];
    return [{ name: 'Esta Unidade', value: totalStudentsAll }];
  }, [selectedProgramId, totalStudentsAll]);

  const buildFileName = (prefix) => {
    const timestamp = new Date().toISOString().slice(0, 10);
    return `${prefix}_${selectedProgramId.slice(0, 8)}_${timestamp}.xlsx`;
  };

  const classGroupLabel = (slug) => {
    if (!slug) return 'Todas';
    if (slug === '__none__') return 'Sem turma';
    const found = classGroups.find((g) => g.slug === slug);
    return found ? found.name : slug;
  };

  // 1. Exporta Turmas
  const exportClassGroups = async () => {
    setLoading(true);
    setLoadingStep('Buscando turmas no banco...');
    setError('');
    setSuccess('');
    try {
      const response = await classGroupService.list(selectedProgramId);
      const list = response.data || [];

      if (list.length === 0) {
        setSuccess('Nenhuma turma cadastrada para exportação.');
        return;
      }

      setLoadingStep('Montando planilhas...');
      const rows = [['Identificador', 'Nome da Turma', 'Período', 'Código Slug', 'Criado em']];
      list.forEach((t) => {
        rows.push([
          t.id,
          t.name,
          t.period === 'manha' ? 'Manhã' : t.period === 'tarde' ? 'Tarde' : t.period || '—',
          t.slug,
          formatDateTimeBR(t.created_at),
        ]);
      });

      downloadWorkbook(buildFileName('turmas_unidade'), [{ name: 'Turmas', rows }]);
      setSuccess('Relatório de turmas exportado com sucesso.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao exportar turmas da unidade.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // 2. Exporta Histórico de chamadas
  const exportAttendanceHistory = async () => {
    setLoading(true);
    setLoadingStep('Filtrando histórico de chamadas...');
    setError('');
    setSuccess('');
    try {
      const params = {};
      if (useDateRange) {
        params.start_date = startDateFilter;
        params.end_date = endDateFilter;
      } else {
        params.attendance_date = dateFilter;
      }

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
      const list = response.data?.data || response.data || [];

      if (list.length === 0) {
        setSuccess('Nenhuma chamada registrada encontrada com estes filtros.');
        return;
      }

      setLoadingStep('Formatando dados...');
      const rows = [['Identificador', 'Data', 'Turma', 'Período', 'Presenças', 'Faltas', 'Total', 'Criado em', 'Lançado por']];
      list.forEach((s) => {
        const pres = s.present_count || 0;
        const abs = s.absent_count || 0;
        rows.push([
          s.id,
          formatDateBR(s.attendance_date),
          classGroupLabel(s.class_group),
          getPeriodLabel(s.period),
          pres,
          abs,
          pres + abs,
          formatDateTimeBR(s.created_at),
          s.creator?.full_name || s.created_by || '—',
        ]);
      });

      downloadWorkbook(buildFileName('historico_chamadas'), [{ name: 'Histórico', rows }]);
      setSuccess('Histórico de chamadas exportado com sucesso.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao exportar o histórico de chamadas.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // 3. Exporta Chamada detalhada
  const exportAttendanceDetail = async () => {
    setLoading(true);
    setLoadingStep('Iniciando exportação detalhada...');
    setError('');
    setSuccess('');
    try {
      const params = {};
      if (useDateRange) {
        params.start_date = startDateFilter;
        params.end_date = endDateFilter;
      } else {
        params.attendance_date = dateFilter;
      }

      if (classGroupFilter) {
        params.class_group = classGroupFilter === '__none__' ? '' : classGroupFilter;
      }
      if (periodFilter) {
        params.period = periodFilter;
      }
      if (selectedProgramId) {
        params.program_id = selectedProgramId;
      }

      setLoadingStep('Buscando registros e estudantes no servidor...');
      const response = await attendanceService.getBulkSessionDetails(params);
      const details = response.data || response || [];

      if (details.length === 0) {
        setSuccess('Nenhuma chamada encontrada para os filtros aplicados.');
        return;
      }

      setLoadingStep('Processando dados e montando tabelas...');
      const detailRows = [['Data', 'Turma', 'Período', 'Usuario', 'NIS/Matrícula', 'Status', 'Justificativa']];
      const summaryRows = [['Data', 'Turma', 'Período', 'Presenças', 'Faltas', 'Criado em', 'Criado por']];

      details.forEach((detail) => {
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
          detail.session?.creator?.full_name || detail.session?.created_by || '—',
        ]);

        const sessionRows = sessionRecords.map((record) => [
          formatDateBR(detail.session?.attendance_date),
          classGroupLabel(detail.session?.class_group),
          getPeriodLabel(detail.session?.period),
          record.student?.full_name || '—',
          record.student?.nis_user || record.student?.enrollment_code || '—',
          record.status === 'present' ? 'Presente' : 'Falta',
          record.note || '—',
        ]);
        detailRows.push(...sessionRows);
      });

      setLoadingStep('Gerando planilha Excel de duas abas...');
      downloadWorkbook(buildFileName('chamada_detalhada'), [
        { name: 'Resumo', rows: summaryRows },
        { name: 'Detalhe', rows: detailRows },
      ]);
      setSuccess('Chamada detalhada exportada com sucesso.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao exportar a chamada detalhada.');
    } finally {
      setLoading(false);
      setLoadingStep('');
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

  // Exportação em formato de PDF (Dashboard consolidado da unidade em A4)
  const exportDashboardPdf = async () => {
    if (!previewRef.current) return;
    setPdfLoading(true);
    setError('');
    try {
      const element = previewRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 10;
      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      pdf.setFillColor(15, 23, 42); // slate-900 background dark
      pdf.rect(0, 0, pdfWidth, 20, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text(`RELATORIO DE MONITORAMENTO DE FREQUENCIA - ${currentProgram?.name || '—'}`, margin, 13);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      const exportTime = new Date().toLocaleString('pt-BR');
      pdf.text(`Exportado em: ${exportTime}`, pdfWidth - margin - 50, 13);

      pdf.addImage(imgData, 'PNG', margin, 25, contentWidth, Math.min(contentHeight, pdfHeight - 35));
      pdf.save(`relatorio_frequencia_${selectedProgramId.slice(0, 8)}.pdf`);
      setSuccess('Relatório PDF exportado com sucesso.');
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      setError('Falha ao exportar o relatório consolidado em PDF.');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Header section banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-8 shadow-xl shadow-slate-100/40">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Relatórios e Exportações</h1>
            <p className="text-slate-500 text-sm mt-0.5">Gere planilhas eletrônicas detalhadas e relatórios consolidados em PDF das turmas e frequências.</p>
          </div>
        </div>
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
          Nenhuma unidade ativa. Use o seletor no topo para escolher uma unidade antes de exportar dados.
        </div>
      )}

      {selectedProgramId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Configurator Card */}
          <Card className="border-slate-100 shadow-xl shadow-slate-100/40 bg-white rounded-2xl overflow-hidden lg:col-span-2">
            <CardHeader className="pb-3 border-b border-slate-100/50">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-indigo-600" />
                <CardTitle className="text-base font-bold text-slate-900">Configurar Exportação</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-400">Escolha os filtros apropriados para o relatório.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Select Report Type */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="reportType" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5">Tipo de Relatório</label>
                  <select
                    id="reportType"
                    className="h-10 px-3 w-full rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:border-indigo-500 focus:ring-indigo-500/20 focus:outline-none transition-all cursor-pointer"
                    value={reportType}
                    onChange={(event) => setReportType(event.target.value)}
                  >
                    {Object.entries(REPORT_TYPES).map(([value, meta]) => (
                      <option key={value} value={value}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 font-medium ml-0.5 mt-1 leading-relaxed">
                    {reportInfo.description}
                  </p>
                </div>

                {/* Filter Date Type Switcher */}
                <div className="space-y-2 sm:col-span-2 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2 py-1 select-none">
                    <input
                      id="useDateRange"
                      type="checkbox"
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer h-4 w-4"
                      checked={useDateRange}
                      onChange={(e) => setUseDateRange(e.target.checked)}
                    />
                    <label htmlFor="useDateRange" className="text-xs font-bold text-slate-700 cursor-pointer">Filtrar por intervalo de datas</label>
                  </div>

                  {useDateRange ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="reportStartDate" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 flex items-center gap-1">
                          <span>Data Inicial</span>
                          {needsDate && <span className="font-normal text-[9px] text-red-500 tracking-normal">(obrigatório)</span>}
                        </label>
                        <Input
                          id="reportStartDate"
                          type="date"
                          value={startDateFilter}
                          onChange={(event) => setStartDateFilter(event.target.value)}
                          required={needsDate}
                          className="h-10 border-slate-200 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="reportEndDate" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 flex items-center gap-1">
                          <span>Data Final</span>
                          {needsDate && <span className="font-normal text-[9px] text-red-500 tracking-normal">(obrigatório)</span>}
                        </label>
                        <Input
                          id="reportEndDate"
                          type="date"
                          value={endDateFilter}
                          onChange={(event) => setEndDateFilter(event.target.value)}
                          required={needsDate}
                          className="h-10 border-slate-200 text-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-w-[200px]">
                      <label htmlFor="reportDate" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 flex items-center gap-1">
                        <span>Data da Chamada</span>
                        {needsDate && <span className="font-normal text-[9px] text-red-500 tracking-normal">(obrigatório)</span>}
                      </label>
                      <Input
                        id="reportDate"
                        type="date"
                        value={dateFilter}
                        onChange={(event) => setDateFilter(event.target.value)}
                        required={needsDate}
                        className="h-10 border-slate-200 text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Select Class Group */}
                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <label htmlFor="reportClassGroup" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5">Turma</label>
                  <select
                    id="reportClassGroup"
                    className="h-10 px-3 w-full rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:border-indigo-500 focus:ring-indigo-500/20 focus:outline-none transition-all cursor-pointer"
                    value={classGroupFilter}
                    onChange={(event) => setClassGroupFilter(event.target.value)}
                  >
                    <option value="">Todas as turmas</option>
                    <option value="__none__">Sem turma</option>
                    {classGroups.map((group) => (
                      <option key={group.id} value={group.slug}>
                        {group.name}
                        {group.period ? ` · ${group.period === 'manha' ? 'Manhã' : 'Tarde'}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Period */}
                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <label htmlFor="reportPeriod" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5">Período</label>
                  <select
                    id="reportPeriod"
                    className="h-10 px-3 w-full rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:border-indigo-500 focus:ring-indigo-500/20 focus:outline-none transition-all cursor-pointer"
                    value={periodFilter}
                    onChange={(event) => setPeriodFilter(event.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="manha">Manhã</option>
                    <option value="tarde">Tarde</option>
                  </select>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  className="h-10 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10"
                  onClick={handleExport}
                  disabled={loading || (needsDate && !hasValidDate)}
                  title={needsDate && !hasValidDate ? 'Selecione a(s) data(s) para exportar este relatório.' : ''}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {loading ? 'Processando...' : 'Exportar Excel (XLSX)'}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  onClick={exportDashboardPdf}
                  disabled={pdfLoading || chartsLoading || programAnalytics.length === 0}
                  title={chartsLoading ? 'Carregando dados para o PDF.' : 'Exportar resumo em PDF.'}
                >
                  <FileText className="h-4 w-4" />
                  {pdfLoading ? 'Gerando...' : 'Exportar PDF'}
                </Button>
                
                <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 ml-2.5 sm:ml-auto">
                  <Info className="h-3.5 w-3.5 text-indigo-400" />
                  {reportType === 'class_groups'
                    ? 'Este relatório exporta a listagem completa das turmas.'
                    : 'A exportação é restrita à unidade ativa selecionada no cabeçalho.'}
                </span>
              </div>

              {loadingStep && (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-indigo-600 animate-pulse mt-2 flex gap-1.5 items-center">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>⏳ {loadingStep}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export metadata details preview card */}
          <Card className="border-slate-100 shadow-xl shadow-slate-100/40 bg-white rounded-2xl overflow-hidden lg:col-span-1 border-l-4 border-l-emerald-500">
            <CardHeader className="pb-3 border-b border-slate-100/50">
              <CardTitle className="text-base font-bold text-slate-900">Configuração de Saída</CardTitle>
              <CardDescription className="text-xs text-slate-400">Verifique os dados da exportação ativa.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="divide-y divide-slate-100/70 text-xs font-bold">
                <li className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-400 uppercase text-[9px] tracking-wider mt-0.5">Unidade ativa</span>
                  <span className="text-slate-800 text-right">{currentProgram?.name || '—'}</span>
                </li>
                <li className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-400 uppercase text-[9px] tracking-wider mt-0.5">Relatório</span>
                  <span className="text-slate-800 text-right">{reportInfo.label}</span>
                </li>
                <li className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-400 uppercase text-[9px] tracking-wider mt-0.5">Data / Período</span>
                  <span className="text-indigo-600 text-right">
                    {useDateRange
                      ? (startDateFilter && endDateFilter ? `${formatDateBR(startDateFilter)} até ${formatDateBR(endDateFilter)}` : '—')
                      : (dateFilter ? formatDateBR(dateFilter) : '—')}
                  </span>
                </li>
                <li className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-400 uppercase text-[9px] tracking-wider mt-0.5">Turma</span>
                  <span className="text-slate-800 text-right">{classGroupLabel(classGroupFilter)}</span>
                </li>
                <li className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-400 uppercase text-[9px] tracking-wider mt-0.5">Turno</span>
                  <span className="text-slate-800 text-right">{periodFilter ? getPeriodLabel(periodFilter) : 'Todos'}</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Visual charts preview for PDF download (Hidden from screen view, only visible as preview layout ref) */}
      {selectedProgramId && (
        <Card className="border-slate-100 shadow-xl shadow-slate-100/40 bg-white rounded-2xl overflow-hidden mt-6">
          <CardHeader className="pb-3 border-b border-slate-100/50">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <CardTitle className="text-base font-bold text-slate-900">Prévia do Relatório PDF</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-400">Esta prévia mostra os gráficos consolidados que serão impressos no PDF.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {chartsLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-indigo-600" />
                <span className="text-xs text-slate-400 font-bold">Carregando dados dos gráficos...</span>
              </div>
            ) : programAnalytics.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs italic">
                Nenhum dado consolidado disponível nesta unidade para renderizar gráficos.
              </div>
            ) : (
              <div ref={previewRef} className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-8">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100/80">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Total de usuários</span>
                    <strong className="text-2xl font-extrabold text-slate-900 block mt-1">{totalStudentsAll}</strong>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100/80">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Frequência geral</span>
                    <strong className="text-2xl font-extrabold text-slate-900 block mt-1">{attendanceAll}%</strong>
                  </div>
                  <div className="p-4 rounded-xl bg-violet-50 border border-violet-100/80">
                    <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider block">Registros de presença</span>
                    <strong className="text-2xl font-extrabold text-slate-900 block mt-1">{totalRecordsAll}</strong>
                  </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100/60">
                  {studentsByProgramChart.length > 0 && (
                    <div className="border border-slate-100 rounded-xl p-4 bg-white shadow-sm">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <Building className="h-4 w-4 text-indigo-500" />
                        Usuários por Unidade
                      </h4>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={studentsByProgramChart}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Bar dataKey="value" name="Usuários" fill={COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {selectedAnalytics?.analytics?.turmaData?.length > 0 && (
                    <div className="border border-slate-100 rounded-xl p-4 bg-white shadow-sm">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <BarChart3 className="h-4 w-4 text-indigo-500" />
                        Usuários por Turma
                      </h4>
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie data={selectedAnalytics.analytics.turmaData} dataKey="value" nameKey="name" outerRadius={80} label={{ fontSize: 10 }}>
                            {selectedAnalytics.analytics.turmaData.map((entry, index) => (
                              <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {selectedAnalytics?.analytics?.periodData?.length > 0 && (
                    <div className="border border-slate-100 rounded-xl p-4 bg-white shadow-sm">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-indigo-500" />
                        Usuários por Período
                      </h4>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={selectedAnalytics.analytics.periodData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Bar dataKey="value" name="Usuários" fill={COLORS.info} radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {selectedAnalytics?.analytics?.turmaAttendanceData?.length > 0 && (
                    <div className="border border-slate-100 rounded-xl p-4 bg-white shadow-sm">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <PieIcon className="h-4 w-4 text-indigo-500" />
                        Presenças e Faltas por Turma
                      </h4>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={selectedAnalytics.analytics.turmaAttendanceData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey="present" name="Presenças" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="absent" name="Faltas" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
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

export default Reports;
