import { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';
import userService from '../services/userService';
import programService from '../services/programService';

const initialForm = {
  full_name: '',
  email: '',
  password: '',
  role: 'coordenador',
  program_ids: [],
};

function Users() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [users, setUsers] = useState([]);
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
        userService.getAll(),
        programService.getAll(),
      ]);
      setUsers(usersResponse.data || []);
      setPrograms(programsResponse.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao carregar usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      program_ids: prev.program_ids.includes(programId)
        ? prev.program_ids.filter((id) => id !== programId)
        : [...prev.program_ids, programId],
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
        email: form.email,
        role: form.role,
        program_ids: form.program_ids,
      };

      if (form.password) {
        payload.password = form.password;
      }

      if (editingId) {
        await userService.update(editingId, payload);
        setSuccess('Usuario atualizado com sucesso.');
      } else {
        await userService.create(payload);
        setSuccess('Usuario criado com sucesso.');
      }

      resetForm();
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao salvar usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      full_name: item.full_name || '',
      email: item.email || '',
      password: '',
      role: item.role || 'coordenador',
      program_ids: (item.user_programs || []).map((relation) => relation.program_id),
    });
  };

  const onDelete = async (id) => {
    setError('');
    setSuccess('');
    try {
      await userService.delete(id);
      if (editingId === id) {
        resetForm();
      }
      setSuccess('Usuario removido com sucesso.');
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao remover usuario.');
    }
  };

  if (!isAdmin) {
    return (
      <section className="panel">
        <h1>Usuarios</h1>
        <p>Apenas admin pode gerenciar usuarios.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h1>Gestao de Usuarios</h1>

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
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={onChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder={editingId ? 'Nova senha (opcional)' : 'Senha'}
          value={form.password}
          onChange={onChange}
          required={!editingId}
        />

        <select name="role" value={form.role} onChange={onChange}>
          <option value="admin">Admin</option>
          <option value="sede">Sede</option>
          <option value="coordenador">Coordenador</option>
        </select>

        <div>
          <strong>Programas</strong>
          <div style={{ display: 'grid', gap: '0.35rem', marginTop: '0.5rem' }}>
            {programs.map((program) => (
              <label key={program.id}>
                <input
                  type="checkbox"
                  checked={form.program_ids.includes(program.id)}
                  onChange={() => toggleProgram(program.id)}
                />{' '}
                {program.name}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm}>
              Cancelar edicao
            </button>
          )}
        </div>
      </form>

      <h2>Usuarios cadastrados</h2>

      {loading ? (
        <p>Carregando...</p>
      ) : users.length === 0 ? (
        <p>Nenhum usuario encontrado.</p>
      ) : (
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Papel</th>
              <th>Programas</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item.id}>
                <td>{item.full_name}</td>
                <td>{item.email}</td>
                <td>{item.role}</td>
                <td>
                  {(item.user_programs || []).map((relation) => relation.programs?.name).filter(Boolean).join(', ') ||
                    '-'}
                </td>
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
