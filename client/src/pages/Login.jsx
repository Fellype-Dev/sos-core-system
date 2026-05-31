import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import authService from '../services/authService';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../components/ui/card';

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
    <div className="flex min-h-screen w-screen flex-col lg:flex-row bg-slate-50 font-sans">
      {/* Hero Section (Esquerda - apenas Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-tr from-slate-950 via-indigo-950 to-violet-950 text-white flex-col justify-between p-16 relative overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none" />
        <div className="absolute top-[30%] right-[-20%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        {/* Top Header Pill */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="h-6 w-1 bg-gradient-to-b from-indigo-400 to-violet-500 rounded-full" />
          <p className="text-xs font-bold tracking-widest uppercase text-indigo-300">Serviço de Obras Sociais</p>
        </div>

        {/* Center Presentation Title & Floating Mockups */}
        <div className="relative z-10 space-y-12 max-w-lg my-auto">
          <div className="space-y-4">
            <h2 className="text-6xl font-extrabold tracking-tight text-white leading-none">
              SIGU<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">.</span>
            </h2>
            <p className="text-xl text-slate-300 leading-relaxed font-semibold">
              Sistema Integrado de Gerenciamento de Usuários
            </p>
            <p className="text-sm text-slate-400/90 leading-relaxed">
              Painel integrado de cadastro, controle de presença e relatórios estratégicos das unidades Semear, Viver e Sonhar.
            </p>
          </div>

          {/* Program list cards */}
          <div className="grid grid-cols-1 gap-4 max-w-sm pt-4">
            <div className="animate-float flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md shadow-lg">
              <div className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">Programa Semear</p>
                <p className="text-xs text-slate-400 mt-0.5">Desenvolvimento infanto-juvenil e cidadania.</p>
              </div>
            </div>
            
            <div className="animate-float-delayed flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md shadow-lg">
              <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">Programa Viver</p>
                <p className="text-xs text-slate-400 mt-0.5">Apoio social e fortalecimento de vínculos.</p>
              </div>
            </div>
            
            <div className="animate-float-slow flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md shadow-lg">
              <div className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8] shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">Programa Sonhar</p>
                <p className="text-xs text-slate-400 mt-0.5">Convivência, bem-estar e fortalecimento de vínculos para idosos.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10">
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} Serviço de Obras Sociais. Todos os direitos reservados.</p>
        </div>
      </div>

      {/* Form Section (Direita) */}
      <section className="flex flex-col justify-center items-center w-full lg:w-1/2 p-6 md:p-16 bg-slate-50 min-h-screen relative overflow-hidden">
        {/* Soft shadow background blur */}
        <div className="absolute top-1/2 left-1/2 w-[380px] h-[380px] rounded-full bg-indigo-500/5 blur-[80px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />

        <Card className="w-full max-w-md border border-slate-100/80 shadow-2xl rounded-2xl bg-white/90 backdrop-blur-md overflow-hidden relative border-t-4 border-t-indigo-600">
          <CardHeader className="flex flex-col items-center text-center p-8 pb-4">
            <div className="relative mb-3 group">
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 opacity-20 blur group-hover:opacity-45 transition duration-300" />
              <div className="h-20 w-20 flex items-center justify-center bg-white rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden p-2">
                <img 
                  src="/images/SOS_COLORIDO_PRETO.png" 
                  alt="SOS Logo" 
                  className="max-h-full max-w-full object-contain" 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            </div>
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 mb-2">
              Acesso restrito
            </span>
            <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900">Entrar no sistema</CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-2 max-w-sm">
              Use seu e-mail corporativo. A sede permite alternar a unidade no seletor do topo após efetuar o login.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8 pt-2">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-700 ml-0.5">E-mail corporativo</label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="username"
                  placeholder="nome@instituicao.org"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-700 ml-0.5">Senha</label>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="w-full h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                />
              </div>

              {error && (
                <div className="p-3 rounded-md bg-red-50 border border-red-100 text-sm text-red-600 font-medium flex gap-2 items-center">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <Button 
                className="w-full h-11 mt-4 font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/35 transition-all duration-300 hover:-translate-y-0.5" 
                type="submit" 
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Entrando…
                  </span>
                ) : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-xs text-slate-400 mt-8 text-center max-w-xs leading-relaxed">
          Coordenadores e assistentes devem usar a senha padrão fornecida pela secretaria administrativa da sede.
        </p>
      </section>
    </div>
  );
}

export default Login;
