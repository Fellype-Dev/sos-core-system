import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <section className="panel">
      <h1>404</h1>
      <p>Pagina nao encontrada.</p>
      <Link to="/">Voltar para o inicio</Link>
    </section>
  );
}

export default NotFound;
