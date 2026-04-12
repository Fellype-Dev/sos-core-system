import useAuth from '../hooks/useAuth';

function Home() {
  const { user, availablePrograms, selectedProgramId } = useAuth();
  const currentProgram = availablePrograms.find((program) => program.id === selectedProgramId);

  return (
    <section className="panel">
      <h1>Painel Inicial</h1>
      <p>
        Bem-vindo(a), <strong>{user?.full_name || 'Coordenador(a)'}</strong>.
      </p>
      <p>
        Unidade ativa: <strong>{currentProgram?.name || 'Sede'}</strong>
      </p>
      <p>
        O sistema SIGU centraliza cadastro, prontuario digital, chamada diaria e relatorios de frequencia
        para os programas sociais do SOS.
      </p>
    </section>
  );
}

export default Home;
