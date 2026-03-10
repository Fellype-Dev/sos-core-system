function Home() {
  return (
    <div className="page">
      <h1>Bem-vindo ao SOS Core System</h1>
      <p>Sistema de gerenciamento desenvolvido com Node.js, Express, React e PostgreSQL</p>
      <div className="features">
        <div className="feature-card">
          <h3>Backend Robusto</h3>
          <p>API RESTful com Node.js e Express</p>
        </div>
        <div className="feature-card">
          <h3>Frontend Moderno</h3>
          <p>Interface dinâmica com React</p>
        </div>
        <div className="feature-card">
          <h3>Banco de Dados</h3>
          <p>PostgreSQL para dados consistentes</p>
        </div>
      </div>
    </div>
  );
}

export default Home;
