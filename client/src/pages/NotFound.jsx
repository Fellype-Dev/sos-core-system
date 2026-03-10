import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="page">
      <h1>404 - Página não encontrada</h1>
      <p>A página que você está procurando não existe.</p>
      <Link to="/" className="btn">Voltar para Home</Link>
    </div>
  );
}

export default NotFound;
