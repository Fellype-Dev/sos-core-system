import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import authService from '../services/authService';
import programService from '../services/programService';

function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [programs, setPrograms] = useState([]);
  const [form, setForm] = useState({
    selected_program_id: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const loadPrograms = async () => {
      try {
        const response = await programService.getAll();
        setPrograms(response.data || []);
      } catch (_err) {
        setError('Nao foi possivel carregar as unidades.');
      }
    };

    loadPrograms();
  }, []);

  const selectedProgramLabel = useMemo(() => {
    const current = programs.find((program) => program.id === form.selected_program_id);
    return current ? current.name : 'Escolha a unidade';
  }, [programs, form.selected_program_id]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(form);
      login(response.data);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao efetuar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="login-shell">
      <div className="login-card">
        <header className="login-header">
          <h1>SOS</h1>
          <p>SERVICO DE OBRAS SOCIAIS</p>
        </header>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="selected_program_id">{selectedProgramLabel}</label>
          <select
            id="selected_program_id"
            name="selected_program_id"
            value={form.selected_program_id}
            onChange={handleChange}
          >
            <option value="">Selecione... (opcional para admin)</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Senha"
            value={form.password}
            onChange={handleChange}
            required
          />

          {error && <p className="form-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </section>
  );
}

export default Login;
