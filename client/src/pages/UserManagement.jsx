import { useEffect, useState } from 'react';
import { UserPlus, UserCog, Edit, Trash2, ShieldAlert, CheckCircle, Check, X } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import userService from '../services/userService';
import programService from '../services/programService';
import { cn } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

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

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-50 text-red-700 border-red-100/80';
      case 'sede':
        return 'bg-blue-50 text-blue-700 border-blue-100/80';
      case 'coordenador':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100/80';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'sede':
        return 'Equipe Sede';
      case 'coordenador':
        return 'Coordenador';
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Header section banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-8 shadow-xl shadow-slate-100/40">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
            <UserCog className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Gestão de Funcionários</h1>
            <p className="text-slate-500 text-sm mt-0.5">Cadastre e gerencie a equipe do SOS Core System, definindo níveis de acesso e unidades autorizadas.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* List of Users Card */}
        <Card className={cn(
          "border-slate-100 shadow-xl shadow-slate-100/40 bg-white rounded-2xl overflow-hidden",
          isWriter ? "lg:col-span-2" : "lg:col-span-3"
        )}>
          <CardHeader className="pb-3 border-b border-slate-100/50">
            <CardTitle className="text-base font-bold text-slate-900">Membros da Equipe</CardTitle>
            <CardDescription className="text-xs text-slate-400">Lista completa de funcionários cadastrados no SIGU.</CardDescription>
          </CardHeader>
          
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-indigo-600" />
                <span className="text-xs text-slate-400 font-bold">Carregando funcionários...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-medium text-sm">
                Nenhum funcionário cadastrado no momento.
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400">Nome</th>
                      <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400">E-mail</th>
                      <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400">Tipo de Perfil</th>
                      <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400">Acesso Unidades</th>
                      <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400">Status</th>
                      {isWriter && <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-400 text-center">Ações</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/70">
                    {users.map((item) => {
                      const assocPrograms = Array.isArray(item.user_programs)
                        ? item.user_programs
                            .map((up) => up.programs?.name || up.program_id)
                            .filter(Boolean)
                        : [];
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-5 py-4 font-bold text-slate-800">{item.full_name}</td>
                          <td className="px-5 py-4 text-slate-500 font-medium">{item.email}</td>
                          <td className="px-5 py-4">
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                              getRoleBadgeClass(item.role)
                            )}>
                              {getRoleLabel(item.role)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {assocPrograms.length === 0 ? (
                              <span className="text-[10px] text-slate-400 font-semibold italic">Sem unidades vinculadas</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {assocPrograms.map((name, i) => (
                                  <span key={i} className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/50">
                                    {name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                              item.is_active 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            )}>
                              {item.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          {isWriter && (
                            <td className="px-5 py-4">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg border border-slate-200/80 text-slate-400 transition-all duration-150 cursor-pointer"
                                  title="Editar"
                                  onClick={() => handleEdit(item)}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg border border-slate-200/80 text-slate-400 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                  title="Excluir"
                                  onClick={() => handleDelete(item.id, item.full_name)}
                                  disabled={item.id === currentUser.id}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
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
          </CardContent>
        </Card>

        {/* Add/Edit User Form Card (Only visible to admin role) */}
        {isWriter && (
          <Card className="border-slate-100 shadow-xl shadow-slate-100/40 bg-white rounded-2xl overflow-hidden border-t-4 border-t-indigo-600 lg:col-span-1">
            <CardHeader className="pb-3 border-b border-slate-100/50">
              <CardTitle className="text-base font-bold text-slate-900">
                {editingId ? 'Editar Funcionário' : 'Novo Funcionário'}
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                {editingId ? 'Atualize as credenciais e permissões deste funcionário.' : 'Cadastre um novo funcionário para acesso.'}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-6">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <label htmlFor="full_name" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5">Nome Completo</label>
                  <Input
                    id="full_name"
                    type="text"
                    name="full_name"
                    placeholder="Ex: João da Silva"
                    value={form.full_name}
                    onChange={handleChange}
                    required
                    className="h-10 border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5">E-mail corporativo</label>
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="institucional@sos.org"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="h-10 border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 flex flex-wrap gap-1">
                    <span>Senha</span>
                    {editingId && <span className="font-normal text-[10px] text-slate-400 uppercase tracking-normal">(em branco para manter original)</span>}
                  </label>
                  <Input
                    id="password"
                    type="password"
                    name="password"
                    placeholder={editingId ? 'Manter senha original' : 'Senha de acesso'}
                    value={form.password}
                    onChange={handleChange}
                    required={!editingId}
                    className="h-10 border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="role" className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5">Tipo de Perfil</label>
                  <select
                    id="role"
                    name="role"
                    className="h-10 px-3 w-full rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:border-indigo-500 focus:ring-indigo-500/20 focus:outline-none transition-all cursor-pointer"
                    value={form.role}
                    onChange={handleChange}
                  >
                    <option value="coordenador">Coordenador (Acesso Unidade)</option>
                    <option value="sede">Equipe da Sede (Todas as unidades)</option>
                    <option value="admin">Administrador Geral (Sede + Escrita)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-0.5 block">Unidades Autorizadas</label>
                  {programs.length === 0 ? (
                    <p className="text-[10px] text-slate-400 font-semibold italic">Nenhuma unidade disponível cadastrada.</p>
                  ) : (
                    <div className="max-h-36 overflow-y-auto border border-slate-200/80 rounded-xl p-3 space-y-2.5 bg-slate-50/20 no-scrollbar">
                      {programs.map((program) => (
                        <label key={program.id} className="flex items-center gap-2.5 text-xs text-slate-700 font-bold cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer h-4 w-4"
                            checked={form.program_ids.includes(program.id)}
                            onChange={() => handleProgramToggle(program.id)}
                          />
                          <span>{program.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <p className="text-[9px] text-slate-400 font-semibold leading-relaxed mt-1 block">
                    Associe as unidades físicas que este funcionário poderá acessar e realizar chamadas.
                  </p>
                </div>

                <div className="flex items-center gap-2 py-1 select-none">
                  <input
                    id="is_active"
                    type="checkbox"
                    name="is_active"
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer h-4 w-4"
                    checked={form.is_active}
                    onChange={handleChange}
                  />
                  <label htmlFor="is_active" className="text-xs font-bold text-slate-700 cursor-pointer">Funcionário Ativo</label>
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 text-xs font-bold cursor-pointer"
                    onClick={resetForm}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="h-10 text-xs font-bold cursor-pointer bg-indigo-600 hover:bg-indigo-700"
                    disabled={submitting}
                  >
                    {submitting ? 'Salvando...' : editingId ? 'Salvar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default UserManagement;
