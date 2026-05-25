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
  const [loading, setLoading] = useState(true);

  const currentProgram = availablePrograms.find((program) => program.id === selectedProgramId);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [studentsRes, sessionsRes, classGroupsRes] = await Promise.all([
          studentService.getAll({ program_id: selectedProgramId }),
          attendanceService.getSessions({ program_id: selectedProgramId }),
          classGroupService.list(selectedProgramId),
        ]);

        // Extrai dados corretamente das respostas aninhadas
        const studentsData = studentsRes?.data?.data || studentsRes?.data || studentsRes || [];
        const sessionsData = sessionsRes?.data?.data || sessionsRes?.data || sessionsRes || [];
        const classGroupsData = classGroupsRes?.data?.data || classGroupsRes?.data || classGroupsRes || [];

        console.log('Usuarios:', studentsData);
        console.log('Sessões:', sessionsData);
        console.log('Turmas:', classGroupsData);

        setStudents(Array.isArray(studentsData) ? studentsData : []);
        setSessions(Array.isArray(sessionsData) ? sessionsData : []);
        setClassGroups(Array.isArray(classGroupsData) ? classGroupsData : []);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        setStudents([]);
        setSessions([]);
        setClassGroups([]);
      } finally {
        setLoading(false);
      }
    };

    if (selectedProgramId) {
      fetchData();
    }
  }, [selectedProgramId]);

  // Cálculos de métricas
  const analytics = useMemo(() => {
    const totalStudents = students.length;

    // Presença x Ausência - considerando todas as sessões
    let totalRecords = 0;
    let presentCount = 0;
    let absentCount = 0;

    sessions.forEach((session) => {
      if (session.present_count !== undefined) {
        presentCount += session.present_count;
      }
      if (session.absent_count !== undefined) {
        absentCount += session.absent_count;
      }
    });

    totalRecords = presentCount + absentCount;
    const attendancePercentage = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

    // Distribuição por turma
    const studentsByTurma = {};
    students.forEach((student) => {
      const turma = student.class_group || 'Sem turma';
      studentsByTurma[turma] = (studentsByTurma[turma] || 0) + 1;
    });

    const turmaData = Object.entries(studentsByTurma).map(([name, value]) => ({
      name,
      value,
    }));

    // Distribuição por período
    const studentsByPeriod = {};
    classGroups.forEach((group) => {
      const period = group.period || 'Não definido';
      studentsByPeriod[period] = (studentsByPeriod[period] || 0) + (group.students_count || 0);
    });

    const periodData = Object.entries(studentsByPeriod).map(([name, value]) => ({
      name: name === 'manha' ? 'Manhã' : name === 'tarde' ? 'Tarde' : name,
      value,
    }));

    // Presença por turma (últimas sessões)
    const attendanceByTurma = {};
    const turmaStats = {};

    sessions.forEach((session) => {
      const turma = session.class_group || 'Sem turma';
      if (!turmaStats[turma]) {
        turmaStats[turma] = { present: 0, absent: 0 };
      }
      turmaStats[turma].present += session.present_count || 0;
      turmaStats[turma].absent += session.absent_count || 0;
    });

    const turmaAttendanceData = Object.entries(turmaStats).map(([turma, stats]) => ({
      name: turma,
      present: stats.present,
      absent: stats.absent,
      percentage: stats.present + stats.absent > 0
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
  }, [students, sessions, classGroups]);

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
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', opacity: 0.9 }}>Total de Usuarios</p>
          <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold' }}>{analytics.totalStudents}</h2>
        </div>
        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          backgroundImage: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          borderRadius: '12px', 
          boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
          color: '#fff'
        }}>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', opacity: 0.9 }}>Frequência Geral</p>
          <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold' }}>{analytics.attendancePercentage}%</h2>
        </div>
        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
          backgroundImage: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
          borderRadius: '12px', 
          boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
          color: '#fff'
        }}>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', opacity: 0.9 }}>Total de Registros</p>
          <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold' }}>{analytics.totalRecords}</h2>
        </div>
      </div>

      {/* Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
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

      <p style={{ marginTop: '2rem', fontSize: '0.95rem', color: '#6b7280', lineHeight: '1.6' }}>
        📱 O SIGU (Sistema Integrado de Gerenciamento de Unidades SOS) reúne cadastro de participantes,
        chamada e relatórios de frequência das unidades do Serviço de Obras Sociais.
      </p>
    </section>
  );
}

export default Home;
