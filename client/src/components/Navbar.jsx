import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import authService from '../services/authService';
import '../styles/Navbar.css';

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
    <header className="site-header">
      <nav className="navbar" aria-label="Principal">
        <div className="navbar-brand">
          <NavLink to="/" className="navbar-brand__link">
            <span className="navbar-brand__sigla">SIGU</span>
            <span className="navbar-brand__full">SOS · Gerenciamento de unidades</span>
          </NavLink>
        </div>

        <div className="navbar-center">
          <div className="nav-links">
            <NavLink to="/">Início</NavLink>
            <NavLink to="/alunos">Alunos</NavLink>
            <NavLink to="/chamada">Chamada</NavLink>
            <NavLink to="/relatorios">Relatórios</NavLink>
          </div>
        </div>

        <div className="navbar-end">
          {availablePrograms?.length > 1 && (
            <label className="nav-program">
              <span className="nav-program__label">Unidade ativa</span>
              <select
                className="nav-program__select"
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
            </label>
          )}

          {singleProgram && (
            <span className="nav-unit-pill" title="Sua unidade de acesso">
              {singleProgram.name}
            </span>
          )}

          <div className="nav-user">
            <div className="nav-user__meta">
              <span className="nav-user__name">{user?.full_name || '—'}</span>
              <span className="nav-user__role">{roleLabel}</span>
            </div>
            <button type="button" className="nav-logout" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </div>
      </nav>
      {switchError && <p className="navbar-error">{switchError}</p>}
    </header>
  );
}

export default Navbar;
