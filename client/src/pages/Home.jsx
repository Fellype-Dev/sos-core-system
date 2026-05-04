import useAuth from '../hooks/useAuth';

function Home() {
  const { user, availablePrograms, selectedProgramId } = useAuth();
  const currentProgram = availablePrograms.find((program) => program.id === selectedProgramId);

  return (
    <section className="panel">
      <h1>Painel inicial</h1>
      <p>
        Bem-vindo(a), <strong>{user?.full_name || 'Usuário(a)'}</strong>.
      </p>
      <p>
        Unidade ativa: <strong>{currentProgram?.name || '—'}</strong>
        {user?.role === 'admin' && availablePrograms?.length > 1 && (
          <span> — use o seletor no topo para alternar entre unidades.</span>
        )}
      </p>
      <p>
        O SIGU (Sistema Integrado de Gerenciamento de Unidades SOS) reúne cadastro de participantes,
        chamada e relatórios de frequência das unidades do Serviço de Obras Sociais.
      </p>
    </section>
  );
}

export default Home;
