import { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';
import userService from '../services/userService';
import programService from '../services/programService';
import '../styles/UserManagement.css';

function UserManagement() {
  const { user: currentUser } = useAuth();
  const isWriter = currentUser?.role === 'admin';

  const [users, setUsers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const initialFormState = {
    full_name: '',
    email: '',
    password: '',
    role: 'coordenador',
    program_ids: [],
    is_active: true,
  };
  const [form, setForm] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, programsRes] = await Promise.all([
        userService.getAll(),
        programService.getAll(),
      ]);
      setUsers(usersRes.data || []);
      setPrograms(programsRes.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao carregar dados dos funcionários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleProgramToggle = (programId) => {
    setForm((prev) => {
      const alreadyChecked = prev.program_ids.includes(programId);
      const nextProgramIds = alreadyChecked
        ? prev.program_ids.filter((id) => id !== programId)
        : [...prev.program_ids, programId];
      return {
        ...prev,
        program_ids: nextProgramIds,
      };
    });
  };

  const resetForm = () => {
    setForm(initialFormState);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isWriter) return;

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        role: form.role,
        program_ids: form.program_ids,
        is_active: form.is_active,
      };

      // Only include password if editing and it is not empty, or if creating
      if (editingId) {
        if (form.password) {
          payload.password = form.password;
        }
        await userService.update(editingId, payload);
        setSuccess('Funcionário atualizado com sucesso.');
      } else {
        if (!form.password) {
          setError('A senha é obrigatória para a criação de um novo funcionário.');
          setSubmitting(false);
          return;
        }
        payload.password = form.password;
        await userService.create(payload);
        setSuccess('Novo funcionário cadastrado com sucesso.');
      }

      resetForm();
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao salvar funcionário.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (user) => {
    if (!isWriter) return;
    setEditingId(user.id);
    
    // Extract program IDs from nested user_programs relation
    const userProgramIds = Array.isArray(user.user_programs)
      ? user.user_programs.map((up) => up.program_id)
      : [];

    setForm({
      full_name: user.full_name || '',
      email: user.email || '',
      password: '', // Keep empty unless updating password
      role: user.role || 'coordenador',
      program_ids: userProgramIds,
      is_active: user.is_active !== false,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id, name) => {
    if (!isWriter) return;
    if (!window.confirm(`Tem certeza que deseja excluir o funcionário "${name}"?`)) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      await userService.delete(id);
      setSuccess('Funcionário excluído com sucesso.');
      if (editingId === id) {
        resetForm();
      }
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao excluir funcionário.');
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'sede':
        return 'Sede';
      case 'coordenador':
        return 'Coordenador';
      default:
        return role;
    }
  };

  return (
    <div className="user-management-page">
      <header className="user-management-header">
        <h1>Gestão de Funcionários</h1>
        <p>Cadastre e gerencie os usuários do sistema, definindo suas atribuições e unidades (programas) de acesso.</p>
      </header>

      {error && <p className="students-alert students-alert--error">{error}</p>}
      {success && <p className="students-alert students-alert--success">{success}</p>}

      <div className={`user-grid ${isWriter ? 'grid-split' : ''}`}>
        {/* List of Users Card */}
        <div className="user-card">
          <h2 className="user-card__title">Lista de Funcionários</h2>
          {loading ? (
            <p>Carregando funcionários...</p>
          ) : users.length === 0 ? (
            <p className="empty-state">Nenhum funcionário cadastrado.</p>
          ) : (
            <div className="user-table-wrapper">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Tipo</th>
                    <th>Acesso</th>
                    <th>Status</th>
                    {isWriter && <th>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const assocPrograms = Array.isArray(user.user_programs)
                      ? user.user_programs
                          .map((up) => up.programs?.name || up.program_id)
                          .filter(Boolean)
                      : [];
                    return (
                      <tr key={user.id}>
                        <td>
                          <strong>{user.full_name}</strong>
                        </td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`badge badge-${user.role}`}>
                            {getRoleLabel(user.role)}
                          </span>
                        </td>
                        <td>
                          {assocPrograms.length === 0 ? (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>Sem unidades</span>
                          ) : (
                            assocPrograms.map((name, i) => (
                              <span key={i} className="program-tag">
                                {name}
                              </span>
                            ))
                          )}
                        </td>
                        <td>
                          <span className={`badge ${user.is_active ? 'badge-active' : 'badge-inactive'}`}>
                            {user.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        {isWriter && (
                          <td>
                            <div className="btn-action-group">
                              <button
                                type="button"
                                className="btn-icon"
                                title="Editar"
                                onClick={() => handleEdit(user)}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="btn-icon btn-icon-danger"
                                title="Excluir"
                                onClick={() => handleDelete(user.id, user.full_name)}
                                disabled={user.id === currentUser.id}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit User Form Card (Only visible to admin role) */}
        {isWriter && (
          <div className="user-card">
            <h2 className="user-card__title">
              {editingId ? 'Editar Funcionário' : 'Novo Funcionário'}
            </h2>
            <form className="user-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="full_name">Nome Completo</label>
                <input
                  id="full_name"
                  type="text"
                  name="full_name"
                  className="form-input"
                  placeholder="Ex: João da Silva"
                  value={form.full_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">E-mail</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="institucional@sos.org"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  Senha {editingId && <span style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>(deixe em branco para não alterar)</span>}
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  className="form-input"
                  placeholder={editingId ? 'Sua nova senha' : 'Senha de acesso'}
                  value={form.password}
                  onChange={handleChange}
                  required={!editingId}
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Tipo de Perfil</label>
                <select
                  id="role"
                  name="role"
                  className="form-input"
                  value={form.role}
                  onChange={handleChange}
                >
                  <option value="coordenador">Coordenador</option>
                  <option value="sede">Equipe da Sede</option>
                  <option value="admin">Administrador Geral</option>
                </select>
              </div>

              <div className="form-group">
                <label>Unidades Autoritativas</label>
                {programs.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nenhuma unidade disponível no banco.</p>
                ) : (
                  <div className="checkbox-group">
                    {programs.map((program) => (
                      <label key={program.id} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={form.program_ids.includes(program.id)}
                          onChange={() => handleProgramToggle(program.id)}
                        />
                        <span>{program.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Selecione as unidades que este funcionário poderá gerenciar.
                </p>
              </div>

              <div className="form-group checkbox-item" style={{ flexDirection: 'row', marginTop: '0.5rem' }}>
                <input
                  id="is_active"
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                />
                <label htmlFor="is_active" style={{ cursor: 'pointer' }}>Funcionário Ativo</label>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserManagement;
