import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import authService from '../services/authService';
import { cn } from '../lib/utils';

function Navbar() {
  const navigate = useNavigate();
  const { logout, user, login, selectedProgramId, availablePrograms } = useAuth();
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleProgramChange = async (event) => {
    const programId = event.target.value;
    if (!programId || programId === selectedProgramId) return;

    setSwitchError('');
    setSwitching(true);
    try {
      const body = await authService.switchProgram(programId);
      if (body?.data) {
        login(body.data);
      }
    } catch (err) {
      setSwitchError(err?.response?.data?.message || 'Não foi possível trocar de unidade.');
    } finally {
      setSwitching(false);
    }
  };

  const roleLabel = {
    admin: 'Sede',
    coordenador: 'Unidade',
  }[user?.role] || user?.role || 'Usuário';

  const singleProgram = availablePrograms?.length === 1 ? availablePrograms[0] : null;

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/60">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center md:justify-between py-3 md:h-16 gap-4" aria-label="Principal">
        {/* Left Side: Brand Logo */}
        <div className="flex items-center justify-between shrink-0">
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 opacity-0 group-hover:opacity-20 blur transition duration-300" />
              <div className="h-10 w-10 flex items-center justify-center bg-white rounded-lg border border-slate-200/80 shadow-sm relative overflow-hidden p-1">
                <img 
                  src="/images/SOS_COLORIDO_PRETO.png" 
                  className="max-h-full max-w-full object-contain" 
                  alt="SOS Logo" 
                />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 leading-none">SIGU</span>
              <span className="text-[9px] font-bold text-indigo-600/80 uppercase tracking-wider mt-0.5">Serviço de Obras Sociais</span>
            </div>
          </NavLink>
        </div>

        {/* Center: Navigation Links */}
        <div className="flex items-center overflow-x-auto no-scrollbar py-0.5 md:py-0">
          <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-full border border-slate-200/30">
            <NavLink 
              to="/" 
              className={({ isActive }) => cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap",
                isActive 
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200/10" 
                  : "text-slate-600 hover:text-slate-950 hover:bg-slate-50/50"
              )}
            >
              Início
            </NavLink>
            <NavLink 
              to="/usuarios" 
              className={({ isActive }) => cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap",
                isActive 
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200/10" 
                  : "text-slate-600 hover:text-slate-950 hover:bg-slate-50/50"
              )}
            >
              Usuários
            </NavLink>
            <NavLink 
              to="/chamada" 
              className={({ isActive }) => cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap",
                isActive 
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200/10" 
                  : "text-slate-600 hover:text-slate-950 hover:bg-slate-50/50"
              )}
            >
              Chamada
            </NavLink>
            <NavLink 
              to="/relatorios" 
              className={({ isActive }) => cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap",
                isActive 
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200/10" 
                  : "text-slate-600 hover:text-slate-950 hover:bg-slate-50/50"
              )}
            >
              Relatórios
            </NavLink>
            {(user?.role === 'admin' || user?.role === 'sede') && (
              <NavLink 
                to="/admin/funcionarios" 
                className={({ isActive }) => cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap",
                  isActive 
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200/10" 
                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-50/50"
                )}
              >
                Funcionários
              </NavLink>
            )}
          </div>
        </div>

        {/* Right Side: Program Selector and User Settings */}
        <div className="flex items-center gap-4 justify-between md:justify-end shrink-0">
          {availablePrograms?.length > 1 && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider ml-0.5">Unidade ativa</span>
              <select
                className="h-8 pl-2 pr-8 text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-indigo-500/20 cursor-pointer transition-colors duration-150"
                value={selectedProgramId || ''}
                onChange={handleProgramChange}
                disabled={switching}
                aria-busy={switching}
              >
                {availablePrograms.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {singleProgram && (
            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">
              {singleProgram.name}
            </span>
          )}

          <div className="flex items-center gap-3.5">
            <div className="flex flex-col items-end text-right">
              <span className="text-xs font-extrabold text-slate-900 leading-tight">{user?.full_name || '—'}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{roleLabel}</span>
            </div>
            
            <button 
              type="button" 
              className="h-9 px-3.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-950 hover:border-slate-300 shadow-sm active:bg-slate-100 transition-all duration-150 cursor-pointer"
              onClick={handleLogout}
            >
              Sair
            </button>
          </div>
        </div>
      </nav>
      {switchError && <p className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3 text-xs font-semibold text-red-600">{switchError}</p>}
    </header>
  );
}

export default Navbar;
