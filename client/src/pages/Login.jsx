import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import authService from '../services/authService';

function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [form, setForm] = useState({
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

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login({
        email: form.email.trim(),
        password: form.password,
      });
      login(response.data);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao efetuar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero" aria-hidden="true">
        <div className="login-hero__inner">
          <p className="login-hero__org">Serviço de Obras Sociais</p>
          <h2 className="login-hero__title">SIGU</h2>
          <p className="login-hero__subtitle">
            Sistema Integrado de Gerenciamento de Unidades SOS
          </p>
          <p className="login-hero__note">
            Cadastro, frequência e relatórios das unidades Semear, Viver e Sonhar em um só lugar.
          </p>
        </div>
      </div>

      <section className="login-aside">
        <div className="login-card">
          <header className="login-card__header">
            <span className="login-card__badge">Acesso restrito</span>
            <h1 className="login-card__title">Entrar</h1>
            <p className="login-card__lead">
              Use o e-mail institucional. A unidade é definida automaticamente pelo seu perfil; na sede,
              você pode alternar a unidade após o login.
            </p>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="username"
                placeholder="nome@instituicao.org"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            {error && <p className="form-error">{error}</p>}

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
        <p className="login-footer-note">Em caso de dúvidas, contate a coordenação da sede.</p>
      </section>
    </div>
  );
}

export default Login;
