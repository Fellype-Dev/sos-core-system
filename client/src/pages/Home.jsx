import { useState, useEffect, useMemo } from 'react';
import {
  PieChart, Pie, BarChart, Bar, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import {
  Users, Calendar, TrendingUp, Building, BarChart3, PieChart as PieIcon, Clock, Activity, LayoutGrid
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import studentService from '../services/studentService';
import attendanceService from '../services/attendanceService';
import classGroupService from '../services/classGroupService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import DashboardFilters from '../components/DashboardFilters';
import DeltaBadge from '../components/DeltaBadge';
import {
  PERIOD_PRESETS, getPresetRange, getPreviousRange, sessionInRange,
  aggregateMetrics, buildTrend, countNewStudents, bucketLabel,
} from '../lib/analytics';

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

function Home() {
  const { user, availablePrograms, selectedProgramId } = useAuth();
  const [programData, setProgramData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros do painel
  const [periodPreset, setPeriodPreset] = useState('year');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [unitFilter, setUnitFilter] = useState('all');

  useEffect(() => {
    const extractData = (response) => response?.data?.data || response?.data || response || [];

    const fetchData = async () => {
      try {
        setLoading(true);

        const programsToFetch = Array.isArray(availablePrograms) && availablePrograms.length > 0
          ? availablePrograms
          : selectedProgramId
            ? [{ id: selectedProgramId, name: 'Unidade ativa' }]
            : [];

        if (programsToFetch.length === 0) {
          setProgramData([]);
          return;
        }

        const results = await Promise.all(
          programsToFetch.map(async (program) => {
            const [studentsRes, sessionsRes, classGroupsRes] = await Promise.all([
              studentService.getAll({ program_id: program.id }),
              attendanceService.getSessions({ program_id: program.id }),
              classGroupService.list(program.id),
            ]);

            const studentsData = extractData(studentsRes);
            const sessionsData = extractData(sessionsRes);
            const classGroupsData = extractData(classGroupsRes);

            return {
              program,
              students: Array.isArray(studentsData) ? studentsData : [],
              sessions: Array.isArray(sessionsData) ? sessionsData : [],
              classGroups: Array.isArray(classGroupsData) ? classGroupsData : [],
            };
          })
        );

        setProgramData(results);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        setProgramData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [availablePrograms, selectedProgramId]);

  // Intervalo de datas ativo derivado dos filtros
  const range = useMemo(
    () => getPresetRange(periodPreset, customStart, customEnd),
    [periodPreset, customStart, customEnd]
  );
  const previousRange = useMemo(() => getPreviousRange(range), [range]);

  // Unidades em foco (todas ou uma específica)
  const selectedUnits = useMemo(() => {
    if (unitFilter === 'all') return programData;
    return programData.filter((row) => String(row.program.id) === String(unitFilter));
  }, [programData, unitFilter]);

  const rangeLabel = useMemo(() => {
    const preset = PERIOD_PRESETS.find((p) => p.id === periodPreset);
    if (periodPreset === 'custom') {
      if (range.start && range.end) {
        return `${bucketLabel(range.start, 'day')}/${range.start.slice(0, 4)} até ${bucketLabel(range.end, 'day')}/${range.end.slice(0, 4)}`;
      }
      return 'Selecione as datas';
    }
    return preset?.label || '';
  }, [periodPreset, range]);

  const unitLabel = useMemo(() => {
    if (unitFilter === 'all') return 'Todas as unidades';
    const found = availablePrograms.find((p) => String(p.id) === String(unitFilter));
    return found?.name || 'Unidade';
  }, [unitFilter, availablePrograms]);

  // ---------- Agregações (respeitam unidade + período) ----------

  const current = useMemo(() => aggregateMetrics(selectedUnits, range), [selectedUnits, range]);
  const previous = useMemo(
    () => (previousRange ? aggregateMetrics(selectedUnits, previousRange) : null),
    [selectedUnits, previousRange]
  );

  const attendanceDelta = previous ? current.attendancePercentage - previous.attendancePercentage : null;
  const recordsDelta = previous && previous.totalRecords > 0
    ? Math.round(((current.totalRecords - previous.totalRecords) / previous.totalRecords) * 100)
    : null;

  const newStudents = useMemo(() => countNewStudents(selectedUnits, range), [selectedUnits, range]);

  // Sessões combinadas no período (para a tendência)
  const filteredSessions = useMemo(() => {
    const all = [];
    selectedUnits.forEach((row) => {
      row.sessions.forEach((session) => {
        if (sessionInRange(session, range)) all.push(session);
      });
    });
    return all;
  }, [selectedUnits, range]);

  const trendData = useMemo(() => buildTrend(filteredSessions, range), [filteredSessions, range]);

  // Distribuição por turma (cadastros atuais das unidades em foco)
  const turmaData = useMemo(() => {
    const byTurma = {};
    selectedUnits.forEach((row) => {
      row.students.forEach((student) => {
        const t = student.class_group || 'Sem turma';
        byTurma[t] = (byTurma[t] || 0) + 1;
      });
    });
    return Object.entries(byTurma).map(([name, value]) => ({ name, value }));
  }, [selectedUnits]);

  // Distribuição por período (manhã/tarde)
  const periodData = useMemo(() => {
    const byPeriod = {};
    selectedUnits.forEach((row) => {
      row.classGroups.forEach((g) => {
        const p = g.period || 'Não definido';
        if (!(p in byPeriod)) byPeriod[p] = 0;
      });
      row.students.forEach((student) => {
        const g = row.classGroups.find((cg) => cg.slug === student.class_group);
        const p = g?.period || 'Não definido';
        byPeriod[p] = (byPeriod[p] || 0) + 1;
      });
    });
    return Object.entries(byPeriod).map(([name, value]) => ({
      name: name === 'manha' ? 'Manhã' : name === 'tarde' ? 'Tarde' : name,
      value,
    }));
  }, [selectedUnits]);

  // Comparativo entre unidades (frequência e cadastros no período)
  const unitComparison = useMemo(() => {
    return programData.map((row) => {
      const metrics = aggregateMetrics([row], range);
      return {
        name: row.program?.name || 'Unidade',
        Frequência: metrics.attendancePercentage,
        Cadastros: metrics.totalStudents,
      };
    });
  }, [programData, range]);

  const showComparison = programData.length > 1 && unitFilter === 'all';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600" />
        <p className="text-sm font-bold text-slate-500">Carregando métricas da unidade...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 p-8 text-white shadow-xl shadow-indigo-950/20">
        <div className="absolute top-[-20%] right-[-10%] w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-60 h-60 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight">Painel de Monitoramento</h1>
            <p className="text-indigo-200/95 font-semibold text-sm">
              Bem-vindo(a), <span className="text-white font-extrabold">{user?.full_name || 'Usuário(a)'}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 shrink-0">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">{unitLabel} · {rangeLabel}</span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <DashboardFilters
        periodPreset={periodPreset}
        setPeriodPreset={setPeriodPreset}
        customStart={customStart}
        setCustomStart={setCustomStart}
        customEnd={customEnd}
        setCustomEnd={setCustomEnd}
        unitFilter={unitFilter}
        setUnitFilter={setUnitFilter}
        availablePrograms={availablePrograms}
      />

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total de usuários */}
        <Card className="border-slate-100 shadow-lg shadow-slate-100/40 relative overflow-hidden bg-white group hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 left-0 h-full w-1.5 bg-indigo-500" />
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Usuários</p>
              <p className="text-3xl font-extrabold text-slate-900">{current.totalStudents}</p>
              <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5">
                Cadastros ativos
                {newStudents !== null && newStudents > 0 && (
                  <span className="text-emerald-600 font-bold">+{newStudents} no período</span>
                )}
              </p>
            </div>
            <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Frequência no período */}
        <Card className="border-slate-100 shadow-lg shadow-slate-100/40 relative overflow-hidden bg-white group hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 left-0 h-full w-1.5 bg-emerald-500" />
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Frequência no Período</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-extrabold text-slate-900">{current.attendancePercentage}%</p>
                <DeltaBadge value={attendanceDelta} suffix="pp" label="Frequência" />
              </div>
              <p className="text-[10px] text-slate-400 font-semibold">{unitLabel}</p>
            </div>
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Registros */}
        <Card className="border-slate-100 shadow-lg shadow-slate-100/40 relative overflow-hidden bg-white group hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 left-0 h-full w-1.5 bg-violet-500" />
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registros de Frequência</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-extrabold text-slate-900">{current.totalRecords}</p>
                <DeltaBadge value={recordsDelta} suffix="%" label="Registros" />
              </div>
              <p className="text-[10px] text-slate-400 font-semibold">Presenças e faltas lançadas</p>
            </div>
            <div className="p-3.5 bg-violet-50 text-violet-600 rounded-2xl group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
              <Calendar className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evolução no tempo */}
      <Card className="border-slate-100 shadow-lg shadow-slate-100/30 bg-white rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100/50 pb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            <CardTitle className="text-base font-bold text-slate-900">Evolução da Frequência</CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-400">
            Acompanhamento de presenças, faltas e taxa de frequência ao longo do período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-8">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={trendData}>
                <defs>
                  <linearGradient id="freqFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fontWeight: 600, fill: '#3e4095' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                <Bar yAxisId="left" dataKey="Presenças" fill={COLORS.success} radius={[4, 4, 0, 0]} maxBarSize={40} stackId="a" />
                <Bar yAxisId="left" dataKey="Faltas" fill={COLORS.danger} radius={[4, 4, 0, 0]} maxBarSize={40} stackId="a" />
                <Area yAxisId="right" type="monotone" dataKey="Frequência" stroke="none" fill="url(#freqFill)" />
                <Line yAxisId="right" type="monotone" dataKey="Frequência" stroke={COLORS.primary} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.primary }} activeDot={{ r: 5 }} unit="%" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Activity className="h-10 w-10 text-slate-200 mb-3" />
              <p className="text-sm font-bold text-slate-400">Nenhum registro de chamada neste período</p>
              <p className="text-xs text-slate-400 mt-1">Ajuste o período ou a unidade para visualizar a evolução</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparativo entre unidades */}
      {showComparison && (
        <Card className="border-slate-100 shadow-lg shadow-slate-100/30 bg-white rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100/50 pb-4">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-base font-bold text-slate-900">Comparativo entre Unidades</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Frequência (%) e total de cadastros por unidade no período selecionado
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-8">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={unitComparison}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fontWeight: 600, fill: '#72b736' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                <Bar yAxisId="left" dataKey="Cadastros" fill={COLORS.primary} radius={[6, 6, 0, 0]} maxBarSize={45} />
                <Bar yAxisId="right" dataKey="Frequência" fill={COLORS.success} radius={[6, 6, 0, 0]} maxBarSize={45} unit="%" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Distribution charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status de frequência */}
        {current.totalRecords > 0 && (
          <Card className="border-slate-100 shadow-lg shadow-slate-100/30 bg-white rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100/50 pb-4">
              <div className="flex items-center gap-2">
                <PieIcon className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-base font-bold text-slate-900">Status de Frequência</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-400">Proporção de presenças e faltas no período</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Presente', value: current.presentCount },
                      { name: 'Ausente', value: current.absentCount },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={85}
                    dataKey="value"
                  >
                    <Cell fill={COLORS.success} />
                    <Cell fill={COLORS.danger} />
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Usuários por turma */}
        {turmaData.length > 0 && (
          <Card className="border-slate-100 shadow-lg shadow-slate-100/30 bg-white rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100/50 pb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-base font-bold text-slate-900">Usuários por Turma</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-400">Distribuição de participantes cadastrados por turma</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={turmaData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={85}
                    dataKey="value"
                  >
                    {turmaData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Distribuição por período */}
        {periodData.length > 0 && (
          <Card className="border-slate-100 shadow-lg shadow-slate-100/30 bg-white rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100/50 pb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-base font-bold text-slate-900">Distribuição por Período</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-400">Proporção de usuários atendidos nos turnos da manhã e tarde</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={periodData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={85}
                    dataKey="value"
                  >
                    {periodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer info */}
      <Card className="border-slate-100/70 shadow-sm bg-slate-50/50 p-6 rounded-2xl">
        <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
          📱 O <strong>SIGU</strong> (Sistema Integrado para Gerenciamento de Usuários) centraliza o controle
          operacional do Serviço de Obras Sociais. Ele integra cadastros de participantes, chamadas diárias,
          análises de turmas e relatórios de frequência de todas as unidades ativas para auditorias e planejamentos.
        </p>
      </Card>
    </div>
  );
}

export default Home;
