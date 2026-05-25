import { useState, useEffect, useMemo } from 'react';
import {
  PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import useAuth from '../hooks/useAuth';
import studentService from '../services/studentService';
import attendanceService from '../services/attendanceService';
import classGroupService from '../services/classGroupService';

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
      <section className="panel">
        <h1>Painel inicial</h1>
        <p>Carregando dados...</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h1>Painel inicial</h1>
      <p>
        Bem-vindo(a), <strong>{user?.full_name || 'Usuário(a)'}</strong>.
      </p>
      <p>
        Unidade ativa: <strong>{currentProgram?.name || '—'}</strong>
        {user?.role === 'admin' && availablePrograms?.length > 1 && (
          <span> — use o seletor no topo para alternar entre unidades.</span>
        )}
      </p>

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem', marginTop: '1.5rem' }}>
        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
          backgroundImage: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
          borderRadius: '12px', 
          boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)',
          color: '#fff'
        }}>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', opacity: 0.9 }}>Total de Usuarios (todas as unidades)</p>
          <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold' }}>{totalStudentsAll}</h2>
        </div>
        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          backgroundImage: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          borderRadius: '12px', 
          boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
          color: '#fff'
        }}>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', opacity: 0.9 }}>Frequência Geral (todas)</p>
          <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold' }}>{attendanceAll}%</h2>
        </div>
        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
          backgroundImage: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
          borderRadius: '12px', 
          boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
          color: '#fff'
        }}>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', opacity: 0.9 }}>Registros de Presença (todas)</p>
          <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold' }}>{totalRecordsAll}</h2>
        </div>
      </div>

      {/* Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
        {studentsByProgramChart.length > 0 && (
          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: '#fff', 
            borderRadius: '12px', 
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            border: '1px solid #f3f4f6'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#1f2937', fontWeight: '600' }}>🏢 Usuarios por Unidade</h3>
            <ResponsiveContainer width="100%" height={300}>
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

        {/* Gráfico de Pizza - Presença */}
        {analytics.totalRecords > 0 && (
          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: '#fff', 
            borderRadius: '12px', 
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            border: '1px solid #f3f4f6'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#1f2937', fontWeight: '600' }}>📊 Status de Frequência</h3>
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
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill={COLORS.success} />
                  <Cell fill={COLORS.danger} />
                </Pie>
                <Tooltip 
                  formatter={(value) => value}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Gráfico de Pizza - Distribuição por Turma */}
        {analytics.turmaData.length > 0 && (
          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: '#fff', 
            borderRadius: '12px', 
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            border: '1px solid #f3f4f6'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#1f2937', fontWeight: '600' }}>👥 Usuarios por Turma</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={analytics.turmaData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.turmaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => value}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Gráfico de Pizza - Distribuição por Período */}
        {analytics.periodData.length > 0 && (
          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: '#fff', 
            borderRadius: '12px', 
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            border: '1px solid #f3f4f6'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#1f2937', fontWeight: '600' }}>🕐 Distribuição por Período</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={analytics.periodData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill={COLORS.info} />
                  <Cell fill={COLORS.warning} />
                </Pie>
                <Tooltip 
                  formatter={(value) => value}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Gráfico de Pizza - Frequência por Turma */}
        {analytics.turmaAttendanceData.length > 0 && (
          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: '#fff', 
            borderRadius: '12px', 
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            border: '1px solid #f3f4f6'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#1f2937', fontWeight: '600' }}>📈 Taxa de Frequência</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={analytics.turmaAttendanceData.map(item => ({
                    name: `${item.name} (${item.percentage}%)`,
                    value: item.percentage
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, value }) => `${name}`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.turmaAttendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `${value}%`}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {programAnalytics.length > 0 && (
        <div style={{ marginTop: '2.5rem', display: 'grid', gap: '2rem' }}>
          {programAnalytics.map((row) => (
            <section key={row.program?.id || row.program?.name} style={{ padding: '1.5rem', background: '#fff', borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)' }}>
              <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Unidade: {row.program?.name || '—'}</h2>
              {row.program?.location && (
                <p style={{ marginTop: 0, color: '#6b7280' }}>{row.program.location}</p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ padding: '1rem', borderRadius: '10px', background: '#f0fdfa', border: '1px solid #ccfbf1' }}>
                  <p style={{ margin: 0, color: '#0f766e', fontSize: '0.85rem' }}>Usuarios cadastrados</p>
                  <h3 style={{ margin: 0, fontSize: '1.8rem' }}>{row.analytics.totalStudents}</h3>
                </div>
                <div style={{ padding: '1rem', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #dcfce7' }}>
                  <p style={{ margin: 0, color: '#15803d', fontSize: '0.85rem' }}>Frequência</p>
                  <h3 style={{ margin: 0, fontSize: '1.8rem' }}>{row.analytics.attendancePercentage}%</h3>
                </div>
                <div style={{ padding: '1rem', borderRadius: '10px', background: '#eef2ff', border: '1px solid #e0e7ff' }}>
                  <p style={{ margin: 0, color: '#3730a3', fontSize: '0.85rem' }}>Registros</p>
                  <h3 style={{ margin: 0, fontSize: '1.8rem' }}>{row.analytics.totalRecords}</h3>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      <p style={{ marginTop: '2rem', fontSize: '0.95rem', color: '#6b7280', lineHeight: '1.6' }}>
        📱 O SIGU (Sistema Integrado para Gerenciamento de Usuários) reúne cadastro de participantes,
        chamada e relatórios de frequência das unidades do Serviço de Obras Sociais.
      </p>
    </section>
  );
}

export default Home;
