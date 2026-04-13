import { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';
import studentService from '../services/studentService';
import programService from '../services/programService';

const initialForm = {
  full_name: '',
  birth_date: '',
  enrollment_code: '',
  contact_phone: '',
  guardian_name: '',
  guardian_phone: '',
  allergies: '',
  medical_notes: '',
  program_id: '',
};

function Users() {
  const { user, selectedProgramId } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [students, setStudents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersResponse, programsResponse] = await Promise.all([
        studentService.getAll(),
        programService.getAll(),
      ]);
      setStudents(usersResponse.data || []);
      setPrograms(programsResponse.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao carregar usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      program_id: prev.program_id || selectedProgramId || '',
    }));
    loadData();
  }, [selectedProgramId]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleProgram = (programId) => {
    setForm((prev) => ({
      ...prev,
      program_id: programId,
    }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const payload = {
        full_name: form.full_name,
        birth_date: form.birth_date || null,
        enrollment_code: form.enrollment_code || null,
        contact_phone: form.contact_phone || null,
        guardian_name: form.guardian_name || null,
        guardian_phone: form.guardian_phone || null,
        allergies: form.allergies || null,
        medical_notes: form.medical_notes || null,
      };

      if (isAdmin) {
        payload.program_id = form.program_id || null;
      }

      if (editingId) {
        await studentService.update(editingId, payload);
        setSuccess('Aluno atualizado com sucesso.');
      } else {
        await studentService.create(payload);
        setSuccess('Aluno criado com sucesso.');
      }

      resetForm();
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao salvar aluno.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      full_name: item.full_name || '',
      birth_date: item.birth_date || '',
      enrollment_code: item.enrollment_code || '',
      contact_phone: item.contact_phone || '',
      guardian_name: item.guardian_name || '',
      guardian_phone: item.guardian_phone || '',
      allergies: item.allergies || '',
      medical_notes: item.medical_notes || '',
      program_id: item.program_id || selectedProgramId || '',
    });
  };

  const onDelete = async (id) => {
    setError('');
    setSuccess('');
    try {
      await studentService.delete(id);
      if (editingId === id) {
        resetForm();
      }
      setSuccess('Aluno removido com sucesso.');
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao remover aluno.');
    }
  };

  return (
    <section className="panel">
      <h1>Cadastro de Alunos</h1>

      {error && <p style={{ color: '#b42318' }}>{error}</p>}
      {success && <p style={{ color: '#027a48' }}>{success}</p>}

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          name="full_name"
          placeholder="Nome completo"
          value={form.full_name}
          onChange={onChange}
          required
        />

        <input
          type="date"
          name="birth_date"
          value={form.birth_date}
          onChange={onChange}
        />

        <input
          type="text"
          name="enrollment_code"
          placeholder="Matricula"
          value={form.enrollment_code}
          onChange={onChange}
        />

        <input
          type="text"
          name="contact_phone"
          placeholder="Telefone de contato"
          value={form.contact_phone}
          onChange={onChange}
        />

        <input
          type="text"
          name="guardian_name"
          placeholder="Nome do responsavel"
          value={form.guardian_name}
          onChange={onChange}
        />

        <input
          type="text"
          name="guardian_phone"
          placeholder="Telefone do responsavel"
          value={form.guardian_phone}
          onChange={onChange}
        />

        <input
          type="text"
          name="allergies"
          placeholder="Alergias"
          value={form.allergies}
          onChange={onChange}
        />

        <textarea
          name="medical_notes"
          placeholder="Observacoes medicas"
          value={form.medical_notes}
          onChange={onChange}
          rows={3}
        />

        {isAdmin && (
          <div>
            <strong>Programa</strong>
          <div style={{ display: 'grid', gap: '0.35rem', marginTop: '0.5rem' }}>
            {programs.map((program) => (
              <label key={program.id}>
                <input
                  type="radio"
                  name="program_id"
                  checked={form.program_id === program.id}
                  onChange={() => toggleProgram(program.id)}
                />{' '}
                {program.name}
              </label>
            ))}
          </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Salvando...' : editingId ? 'Atualizar aluno' : 'Cadastrar aluno'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm}>
              Cancelar edicao
            </button>
          )}
        </div>
      </form>

      <h2>Alunos cadastrados</h2>

      {loading ? (
        <p>Carregando...</p>
      ) : students.length === 0 ? (
        <p>Nenhum aluno encontrado.</p>
      ) : (
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Matricula</th>
              <th>Programa</th>
              <th>Contato</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {students.map((item) => (
              <tr key={item.id}>
                <td>{item.full_name}</td>
                <td>{item.enrollment_code || '-'}</td>
                <td>{item.programs?.name || '-'}</td>
                <td>{item.contact_phone || '-'}</td>
                <td>
                  <button type="button" onClick={() => startEdit(item)}>
                    Editar
                  </button>{' '}
                  <button type="button" onClick={() => onDelete(item.id)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default Users;
