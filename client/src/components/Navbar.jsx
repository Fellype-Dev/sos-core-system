import { NavLink, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import '../styles/Navbar.css';

function Navbar() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="navbar">
      <div className="brand">SOS</div>
      <div className="nav-links">
        <NavLink to="/">Inicio</NavLink>
        <NavLink to="/alunos">Alunos</NavLink>
        <NavLink to="/chamada">Chamada</NavLink>
        <NavLink to="/relatorios">Relatorios</NavLink>
      </div>
      <div className="nav-user">
        <span>{user?.role || 'usuario'}</span>
        <button type="button" onClick={handleLogout}>
          Sair
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
