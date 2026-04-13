import { useEffect, useMemo, useState } from 'react';
import useAuth from '../hooks/useAuth';
import studentService from '../services/studentService';
import attendanceService from '../services/attendanceService';

function Attendance() {
  const { selectedProgramId } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [classGroup, setClassGroup] = useState('A');
  const [period, setPeriod] = useState('manha');

  const attendanceDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const dateLabel = useMemo(
    () => new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    []
  );

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
      if (!selectedProgramId) {
        setRecords([]);
        return;
      }

      setLoading(true);
      setError('');
      setSuccess('');
      try {
        const [studentsResponse, attendanceResponse] = await Promise.all([
          studentService.getAll({ program_id: selectedProgramId }),
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
        setError(err?.response?.data?.message || 'Falha ao carregar alunos.');
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [selectedProgramId, attendanceDate, classGroup, period]);

  const saveAttendance = async () => {
    if (!selectedProgramId) {
      setError('Selecione uma unidade para salvar a chamada.');
      return;
    }

    const filledRecords = records.filter((record) => record.status === 'present' || record.status === 'absent');
    if (filledRecords.length === 0) {
      setError('Marque pelo menos um aluno como presente ou ausente.');
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

      {error && <p style={{ color: '#b42318' }}>{error}</p>}
      {success && <p style={{ color: '#027a48' }}>{success}</p>}
      {!selectedProgramId && <p>Selecione uma unidade no login para carregar os alunos da chamada.</p>}

      <div className="attendance-toolbar">
        <label>
          Turma
          <select value={classGroup} onChange={(event) => setClassGroup(event.target.value)}>
            <option value="A">Turma A</option>
            <option value="B">Turma B</option>
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

      <table className="attendance-table">
        <thead>
          <tr>
            <th>Foto</th>
            <th>Nome do aluno</th>
            <th>Presenca</th>
            <th>Falta</th>
          </tr>
        </thead>
        <tbody>
          {!loading && records.length === 0 && (
            <tr>
              <td colSpan="4">Nenhum aluno carregado para esta turma.</td>
            </tr>
          )}
          {loading && (
            <tr>
              <td colSpan="4">Carregando alunos...</td>
            </tr>
          )}
          {records.map((record) => (
            <tr key={record.id}>
              <td>
                <span className="avatar-placeholder">{record.id}</span>
              </td>
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
    </section>
  );
}

export default Attendance;
