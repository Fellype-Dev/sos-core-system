import { useState, useEffect, useMemo } from 'react';
import {
  PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { Users, Calendar, TrendingUp, Sparkles, Building, BarChart3, PieChart as PieIcon, Clock } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import studentService from '../services/studentService';
import attendanceService from '../services/attendanceService';
import classGroupService from '../services/classGroupService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';

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
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [classGroups, setClassGroups] = useState([]);
  const [programData, setProgramData] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentProgram = availablePrograms.find((program) => program.id === selectedProgramId);

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
          setStudents([]);
          setSessions([]);
          setClassGroups([]);
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

        const selectedRow = results.find((row) => String(row.program.id) === String(selectedProgramId));

        setProgramData(results);
        setStudents(selectedRow?.students || []);
        setSessions(selectedRow?.sessions || []);
        setClassGroups(selectedRow?.classGroups || []);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        setStudents([]);
        setSessions([]);
        setClassGroups([]);
        setProgramData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [availablePrograms, selectedProgramId]);

  // Cálculos de métricas
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
      studentsByPeriod[period] = 0;
    });
    listStudents.forEach((student) => {
      const group = listClassGroups.find((g) => g.slug === student.class_group);
      const period = group?.period || 'Não definido';
      studentsByPeriod[period] = (studentsByPeriod[period] || 0) + 1;
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
      percentage:
        stats.present + stats.absent > 0
          ? Math.round((stats.present / (stats.present + stats.absent)) * 100)
          : 0,
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

  const analytics = useMemo(() => buildAnalytics(students, sessions, classGroups), [students, sessions, classGroups]);

  const programAnalytics = useMemo(
    () => programData.map((row) => ({
      program: row.program,
      analytics: buildAnalytics(row.students, row.sessions, row.classGroups),
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600" />
        <p className="text-sm font-bold text-slate-500">Carregando métricas da unidade...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Welcome Card banner */}
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
            <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">Unidade ativa: {currentProgram?.name || '—'}</span>
          </div>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Total Users */}
        <Card className="border-slate-100 shadow-lg shadow-slate-100/40 relative overflow-hidden bg-white group hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 left-0 h-full w-1.5 bg-indigo-500" />
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Usuários</p>
              <p className="text-3xl font-extrabold text-slate-900">{totalStudentsAll}</p>
              <p className="text-[10px] text-slate-400 font-semibold">Todas as unidades ativas</p>
            </div>
            <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Attendance percentage */}
        <Card className="border-slate-100 shadow-lg shadow-slate-100/40 relative overflow-hidden bg-white group hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 left-0 h-full w-1.5 bg-emerald-500" />
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Frequência Geral</p>
              <p className="text-3xl font-extrabold text-slate-900">{attendanceAll}%</p>
              <p className="text-[10px] text-slate-400 font-semibold">Média de todas as unidades</p>
            </div>
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Attendance records */}
        <Card className="border-slate-100 shadow-lg shadow-slate-100/40 relative overflow-hidden bg-white group hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 left-0 h-full w-1.5 bg-violet-500" />
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registros de Frequência</p>
              <p className="text-3xl font-extrabold text-slate-900">{totalRecordsAll}</p>
              <p className="text-[10px] text-slate-400 font-semibold">Presenças e faltas lançadas</p>
            </div>
            <div className="p-3.5 bg-violet-50 text-violet-600 rounded-2xl group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
              <Calendar className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphs Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: Users by unit */}
        {studentsByProgramChart.length > 0 && (
          <Card className="border-slate-100 shadow-lg shadow-slate-100/30 bg-white rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100/50 pb-4">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-base font-bold text-slate-900">Usuários por Unidade</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-400">Total de participantes cadastrados em cada polo</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-8">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={studentsByProgramChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                  <Bar dataKey="value" name="Usuários" fill={COLORS.primary} radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Graph 2: Attendance Status */}
        {analytics.totalRecords > 0 && (
          <Card className="border-slate-100 shadow-lg shadow-slate-100/30 bg-white rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100/50 pb-4">
              <div className="flex items-center gap-2">
                <PieIcon className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-base font-bold text-slate-900">Status de Frequência</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-400">Proporção geral de presenças e faltas da unidade ativa</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Presente', value: analytics.presentCount },
                      { name: 'Ausente', value: analytics.absentCount },
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

        {/* Graph 3: Users by Class Group */}
        {analytics.turmaData.length > 0 && (
          <Card className="border-slate-100 shadow-lg shadow-slate-100/30 bg-white rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100/50 pb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-base font-bold text-slate-900">Usuários por Turma</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-400">Distribuição quantitativa de participantes cadastrados por turma</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={analytics.turmaData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={85}
                    dataKey="value"
                  >
                    {analytics.turmaData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Graph 4: Distribution by Period */}
        {analytics.periodData.length > 0 && (
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
                    data={analytics.periodData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={85}
                    dataKey="value"
                  >
                    <Cell fill={COLORS.info} />
                    <Cell fill={COLORS.warning} />
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Program Analytics Cards (Sede view only) */}
      {programAnalytics.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-extrabold text-slate-900">Métricas Detalhadas por Unidade</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programAnalytics.map((row) => (
              <Card key={row.program?.id || row.program?.name} className="border-slate-100 shadow-lg shadow-slate-100/30 bg-white hover:border-indigo-200 transition-colors duration-300">
                <CardHeader className="pb-3 border-b border-slate-100/50">
                  <CardTitle className="text-base font-bold text-slate-900">{row.program?.name || '—'}</CardTitle>
                  {row.program?.location && (
                    <CardDescription className="text-[11px] text-slate-400 leading-tight">{row.program.location}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 bg-indigo-50/40 border border-indigo-100/40 rounded-xl text-center">
                      <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider block">Cadastros</span>
                      <span className="text-lg font-extrabold text-slate-900 block mt-0.5">{row.analytics.totalStudents}</span>
                    </div>
                    <div className="p-3 bg-emerald-50/40 border border-emerald-100/40 rounded-xl text-center">
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">Frequência</span>
                      <span className="text-lg font-extrabold text-slate-900 block mt-0.5">{row.analytics.attendancePercentage}%</span>
                    </div>
                    <div className="p-3 bg-violet-50/40 border border-violet-100/40 rounded-xl text-center">
                      <span className="text-[9px] font-bold text-violet-600 uppercase tracking-wider block">Registros</span>
                      <span className="text-lg font-extrabold text-slate-900 block mt-0.5">{row.analytics.totalRecords}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Informações adicionais rodapé */}
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
