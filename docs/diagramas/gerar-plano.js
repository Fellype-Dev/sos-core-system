const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  PageBreak, TableOfContents, Header, Footer, PageNumber, LevelFormat,
} = require('docx');

const MARGEM = 1134;
const LARGURA_UTIL = 11906 - MARGEM * 2;

const NAVY = '1A3A4A';
const BRAND = '3E4095';
const CINZA = '64748B';
const CINZA_CLARO = 'F1F5F9';

const BORDA = { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };

const p = (texto, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 120, line: 276 },
  children: [new TextRun({ text: texto, size: o.size ?? 21, color: o.color, bold: o.bold, italics: o.italics })],
});

const h1 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_1, spacing: { before: 340, after: 170 },
  children: [new TextRun({ text: t, bold: true, size: 30, color: NAVY })],
});
const h2 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 130 },
  children: [new TextRun({ text: t, bold: true, size: 25, color: BRAND })],
});

const bullet = (t) => new Paragraph({
  numbering: { reference: 'marcadores', level: 0 },
  spacing: { after: 60, line: 276 },
  children: [new TextRun({ text: t, size: 21 })],
});

let inst = 0;
const passo = (t, i) => new Paragraph({
  numbering: { reference: 'passos', level: 0, instance: i },
  spacing: { after: 70, line: 276 },
  children: [new TextRun({ text: t, size: 21 })],
});
function passos(lista) {
  inst += 1;
  return lista.map((t) => passo(t, inst));
}

function celula(filhos, { largura, fundo, cabecalho = false }) {
  return new TableCell({
    width: { size: largura, type: WidthType.DXA },
    shading: fundo ? { type: ShadingType.CLEAR, fill: fundo, color: 'auto' } : undefined,
    margins: { top: 80, bottom: 80, left: 110, right: 110 },
    children: filhos.map((t) => typeof t === 'string'
      ? new Paragraph({
          spacing: { after: 0, line: 258 },
          children: [new TextRun({ text: t, size: 19, bold: cabecalho, color: cabecalho ? NAVY : undefined })],
        })
      : t),
  });
}

function tabela(cabecalhos, linhas, larguras) {
  return new Table({
    width: { size: LARGURA_UTIL, type: WidthType.DXA },
    columnWidths: larguras,
    borders: { top: BORDA, bottom: BORDA, left: BORDA, right: BORDA, insideHorizontal: BORDA, insideVertical: BORDA },
    rows: [
      new TableRow({
        tableHeader: true,
        children: cabecalhos.map((c, i) => celula([c], { largura: larguras[i], fundo: CINZA_CLARO, cabecalho: true })),
      }),
      ...linhas.map((l) => new TableRow({ children: l.map((v, i) => celula([v], { largura: larguras[i] })) })),
    ],
  });
}

const quebra = () => new Paragraph({ children: [new PageBreak()] });
const espaco = (n = 140) => new Paragraph({ spacing: { after: n }, children: [] });

const A_PREENCHER = '[preencher]';

// ---- Documento --------------------------------------------------------------
const filhos = [];

filhos.push(
  new Paragraph({ spacing: { before: 2200, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'SERVIÇO DE OBRAS SOCIAIS', bold: true, size: 24, color: CINZA })] }),
  new Paragraph({ spacing: { before: 480, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'SIGU', bold: true, size: 72, color: NAVY })] }),
  new Paragraph({ spacing: { before: 120, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Sistema Integrado de Gerenciamento de Usuários', size: 28, color: BRAND })] }),
  new Paragraph({ spacing: { before: 900, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'PLANO DE IMPLANTAÇÃO', bold: true, size: 26, color: NAVY })] }),
  new Paragraph({ spacing: { before: 1800, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Versão 1.0', size: 22, color: CINZA })] }),
  new Paragraph({ spacing: { before: 80 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }), size: 22, color: CINZA })] }),
  quebra(),
);

filhos.push(h1('Sumário'), new TableOfContents('Sumário', { hyperlink: true, headingStyleRange: '1-2' }), quebra());

// 1. Objetivo
filhos.push(h1('1. Objetivo da implantação'));
filhos.push(p('Colocar o SIGU em operação nas três unidades do SOS — Semear, Viver e Sonhar —, substituindo o controle atual em planilhas e fichas de papel pelo registro no sistema.'));
filhos.push(p('Ao final da implantação espera-se que:'));
filhos.push(bullet('todos os assistidos em atendimento estejam cadastrados e vinculados às suas turmas;'));
filhos.push(bullet('a lista de presença seja lançada diariamente no sistema, por cada unidade;'));
filhos.push(bullet('as equipes emitam fichas, planilhas e relatórios diretamente do sistema, sem recorrer a controles paralelos;'));
filhos.push(bullet('a sede acompanhe as três unidades por um painel único, com dados atualizados;'));
filhos.push(bullet('cada profissional tenha acesso próprio, com perfil e unidade corretos.'));

filhos.push(h2('1.1. Critérios de aceite'));
filhos.push(p('A implantação é considerada concluída quando, por duas semanas seguidas, as três unidades lançarem a frequência no sistema sem uso de controle paralelo, e a sede emitir o relatório consolidado a partir desses dados.'));

// 2. Escopo
filhos.push(h1('2. Escopo da implantação'));
filhos.push(p('Serão implantados todos os módulos já desenvolvidos:'));
filhos.push(tabela(['Módulo', 'O que entra em operação'], [
  ['Acesso e perfis', 'Login por e-mail corporativo, perfis de acesso e seleção de unidade ativa.'],
  ['Assistidos', 'Cadastro completo em quatro etapas, incluindo composição familiar e pessoas autorizadas a retirar; consulta, edição, desativação e exportação da ficha.'],
  ['Turmas', 'As 38 turmas do cronograma do SCFV, já cadastradas, e o vínculo dos assistidos a elas.'],
  ['Lista de presença', 'Lançamento diário por turma e período, histórico e correção de listas anteriores.'],
  ['Relatórios', 'Exportações em Excel, ficha individual em PDF e relatório consolidado por unidade ou geral.'],
  ['Funcionários', 'Cadastro de profissionais, perfis e unidades autorizadas, restrito à sede.'],
], [2200, LARGURA_UTIL - 2200]));

filhos.push(h2('2.1. Fora do escopo'));
filhos.push(bullet('Integração automática com o SISC ou qualquer sistema do governo — o registro continua sendo digitado manualmente.'));
filhos.push(bullet('Módulos de gestão financeira, de doações, de estoque ou de recursos humanos.'));
filhos.push(bullet('Operação sem internet.'));
filhos.push(bullet('Digitalização de fichas antigas de assistidos já desligados: será migrado apenas quem está em atendimento.'));

filhos.push(quebra());

// 3. Equipe
filhos.push(h1('3. Equipe de implantação'));
filhos.push(p('A implantação envolve três frentes: técnica, institucional e operacional. Os nomes devem ser preenchidos pela coordenação do SOS antes do início.'));
filhos.push(tabela(['Papel', 'Responsabilidades', 'Responsável'], [
  ['Responsável técnico', 'Publicar a aplicação, aplicar scripts de banco, criar os acessos iniciais, apoiar a migração de dados e resolver falhas técnicas.', 'Fellype Kekis'],
  ['Ponto focal da sede', 'Decidir sobre prazos e prioridades, validar os dados migrados, aprovar a entrada em operação e centralizar a comunicação com as unidades.', A_PREENCHER],
  ['Multiplicador por unidade (Semear)', 'Treinar a equipe local, acompanhar os primeiros lançamentos e reunir as dúvidas da unidade.', A_PREENCHER],
  ['Multiplicador por unidade (Viver)', 'Mesmas atribuições, na sua unidade.', A_PREENCHER],
  ['Multiplicador por unidade (Sonhar)', 'Mesmas atribuições, na sua unidade.', A_PREENCHER],
  ['Secretaria administrativa', 'Cadastrar funcionários, distribuir senhas e manter as permissões atualizadas.', A_PREENCHER],
], [2300, 4400, LARGURA_UTIL - 2300 - 4400]));

// 4. Cronograma
filhos.push(h1('4. Cronograma de implantação'));
filhos.push(p('O cronograma está organizado em semanas relativas ao início dos trabalhos. As datas devem ser preenchidas na abertura da implantação.'));
filhos.push(tabela(['Etapa', 'Duração', 'Data prevista', 'Responsável'], [
  ['1. Preparação do ambiente e publicação', '2 dias', A_PREENCHER, 'Responsável técnico'],
  ['2. Configuração inicial e criação dos acessos', '1 dia', A_PREENCHER, 'Responsável técnico e secretaria'],
  ['3. Conferência das turmas por unidade', '2 dias', A_PREENCHER, 'Multiplicadores'],
  ['4. Migração dos cadastros de assistidos', '1 semana', A_PREENCHER, 'Multiplicadores e responsável técnico'],
  ['5. Conferência dos dados migrados', '3 dias', A_PREENCHER, 'Multiplicadores e ponto focal'],
  ['6. Treinamento das equipes', '1 dia por unidade', A_PREENCHER, 'Multiplicadores'],
  ['7. Operação assistida (uso real com apoio)', '2 semanas', A_PREENCHER, 'Toda a equipe'],
  ['8. Encerramento e entrada em regime', '1 dia', A_PREENCHER, 'Ponto focal'],
], [3200, 1500, 1800, LARGURA_UTIL - 3200 - 1500 - 1800]));
filhos.push(espaco());
filhos.push(p('Durante a operação assistida (etapa 7), as unidades mantêm o controle em papel como segurança. O papel só é abandonado após o encerramento formal da etapa 8.'));

filhos.push(quebra());

// 5. Passos
filhos.push(h1('5. Passos da implantação'));

filhos.push(h2('5.1. Preparação do ambiente'));
filhos.push(...passos([
  'Criar as contas nos três provedores: Supabase (banco), Render (API) e Vercel (interface), com acesso institucional do SOS — e não pessoal.',
  'Criar a instância do banco na Supabase e guardar a URL e a credencial de serviço.',
  'Executar o script schema.sql no editor SQL da Supabase, que cria as tabelas, os índices e já cadastra as três unidades e as 38 turmas do cronograma do SCFV.',
  'Executar o script seed.sql, que cria o usuário administrador inicial.',
  'Conferir a lista de dependências e requisitos descritos na seção 7 deste documento.',
]));

filhos.push(h2('5.2. Instalação do software'));
filhos.push(...passos([
  'Publicar a API no Render, com diretório-raiz apontado para server, comando de instalação npm install e de execução npm start.',
  'Definir no Render as variáveis de ambiente: JWT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CORS_ORIGIN, TRUST_PROXY e NODE_ENV.',
  'Aguardar a subida do serviço e confirmar que o endereço /health responde com status OK.',
  'Publicar a interface na Vercel, com diretório-raiz client, comando npm run build e diretório de saída dist.',
  'Definir na Vercel a variável VITE_API_URL com o endereço público da API.',
  'Acrescentar o domínio da interface à variável CORS_ORIGIN da API e reiniciar o serviço.',
]));
filhos.push(espaco());
filhos.push(p('O detalhamento técnico de cada passo, com os comandos e as configurações completas, está no Manual Técnico e Guia de Implantação.'));

filhos.push(h2('5.3. Configuração pós-instalação'));
filhos.push(...passos([
  'Entrar no sistema com o administrador inicial e trocar imediatamente a senha padrão.',
  'Cadastrar os funcionários em Funcionários, atribuindo a cada um o perfil e as unidades corretas.',
  'Distribuir as senhas individualmente, orientando que não sejam compartilhadas.',
  'Conferir, em cada unidade, se as turmas correspondem ao cronograma vigente: nome, período, dias da semana e faixa etária. Ajustar o que estiver diferente.',
  'Confirmar que o endereço de acesso está registrado nos computadores das unidades, nos favoritos do navegador.',
]));

filhos.push(h2('5.4. Testes pós-implantação'));
filhos.push(p('Teste rápido para confirmar que as três camadas do sistema estão funcionando. Execute em cada unidade, com um usuário real daquela unidade.'));
filhos.push(tabela(['Teste', 'Como fazer', 'Resultado esperado'], [
  ['Disponibilidade da API', 'Abrir o endereço /health no navegador.', 'Resposta com status OK e horário.'],
  ['Acesso', 'Entrar com o e-mail e a senha de um funcionário da unidade.', 'Painel de Monitoramento abre com a unidade correta no topo.'],
  ['Isolamento por unidade', 'Conferir a listagem de Usuários.', 'Aparecem apenas assistidos da unidade do funcionário.'],
  ['Cadastro', 'Cadastrar um assistido de teste com nome fictício.', 'Cadastro salvo e visível na listagem.'],
  ['Turmas', 'Vincular o assistido de teste a uma turma.', 'Nome passa para o painel de alunos da turma.'],
  ['Lista de presença', 'Lançar a presença da turma e salvar.', 'Mensagem de confirmação e lista visível no histórico.'],
  ['Correção', 'Abrir o histórico, editar a lista e salvar.', 'Alteração gravada, sem duplicar a lista.'],
  ['Exportação', 'Emitir a ficha em PDF e a planilha da listagem.', 'Arquivos baixados e legíveis.'],
  ['Relatório consolidado', 'Gerar o relatório em PDF pela sede.', 'PDF com gráficos e indicadores das unidades.'],
  ['Limpeza', 'Excluir o assistido de teste, com o perfil Administrador.', 'Registro removido, sem afetar os demais.'],
], [2200, 3400, LARGURA_UTIL - 2200 - 3400]));

filhos.push(quebra());

// 6. Requisitos
filhos.push(h1('6. Requisitos de hardware e software'));
filhos.push(p('Não há servidor a ser instalado na entidade: toda a infraestrutura é contratada em provedores de nuvem. Nas unidades, basta um equipamento com navegador e internet.'));
filhos.push(tabela(['Onde', 'Requisito'], [
  ['Unidades', 'Computador, notebook, tablet ou celular com navegador atualizado (Chrome, Edge, Firefox ou Safari). Nenhuma instalação é necessária.'],
  ['Unidades', 'Conexão com a internet durante todo o horário de atendimento. Sem conexão o sistema não opera.'],
  ['Unidades', 'Recomendável ao menos um computador por unidade para o preenchimento de cadastros longos.'],
  ['Rede', 'Saída HTTPS na porta 443. Nenhuma porta de entrada precisa ser aberta.'],
  ['Nuvem — banco', 'Instância PostgreSQL na Supabase, com backup do provedor habilitado.'],
  ['Nuvem — API', 'Serviço Node.js 18 ou superior no Render, processo único.'],
  ['Nuvem — interface', 'Projeto de hospedagem estática na Vercel.'],
  ['Contas', 'Acessos institucionais aos três provedores e ao repositório no GitHub, em nome do SOS.'],
], [1800, LARGURA_UTIL - 1800]));
filhos.push(espaco());
filhos.push(p('Custos de hospedagem, quando aplicáveis, devem ser confirmados junto aos provedores antes do início da operação, considerando o volume de assistidos das três unidades.'));

// 7. Migração de dados
filhos.push(h1('7. Estratégia de migração de dados'));
filhos.push(p('Os dados atuais estão em planilhas e fichas de papel nas unidades. A migração é feita uma única vez, por unidade, e alcança apenas os assistidos em atendimento.'));

filhos.push(h2('7.1. Procedimento'));
filhos.push(...passos([
  'Cada unidade levanta a relação dos assistidos ativos e reúne as fichas correspondentes.',
  'Os dados são consolidados em uma planilha única por unidade, com uma coluna por campo do cadastro, seguindo o modelo fornecido pelo responsável técnico.',
  'A planilha é revisada pelo multiplicador da unidade: nomes completos, datas de nascimento, NIS e responsável legal são os campos que mais geram erro.',
  'O responsável técnico importa a planilha para o banco, em lote, com a unidade e a turma já preenchidas.',
  'A unidade confere por amostragem — ao menos 10% dos registros e todos os casos com informação incompleta — comparando a tela do sistema com a ficha de origem.',
  'Os cadastros que não puderem ser importados por falta de dados são criados manualmente pela equipe, com o nome completo, e completados depois.',
]));

filhos.push(h2('7.2. Alternativa sem planilha'));
filhos.push(p('Se a unidade tiver poucos assistidos ou os dados estiverem apenas em papel, o cadastro manual pela própria equipe costuma ser mais rápido do que montar a planilha, e ainda serve como treinamento prático. Nesse caso, a etapa 4 do cronograma é substituída pelo mutirão de digitação.'));

filhos.push(h2('7.3. Cuidados com os dados pessoais'));
filhos.push(bullet('As planilhas de migração contêm dados pessoais sensíveis de crianças, adolescentes e idosos: devem trafegar apenas entre a unidade e o responsável técnico, por canal institucional, e ser apagadas de computadores e mensageiros após a importação.'));
filhos.push(bullet('Não use serviços pessoais de nuvem nem aplicativos de mensagem pessoais para enviar as planilhas.'));
filhos.push(bullet('Ao final da migração, guarde uma cópia da planilha original em local controlado pela sede, apenas enquanto durar a conferência.'));

filhos.push(quebra());

// 8. Backup
filhos.push(h1('8. Plano de backup e recuperação'));

filhos.push(h2('8.1. Backup'));
filhos.push(tabela(['Camada', 'Como é feito', 'Frequência'], [
  ['Banco de dados', 'Backup automático da Supabase, conforme o plano contratado. Confirmar no painel que está habilitado.', 'Diária'],
  ['Banco de dados', 'Exportação manual das tabelas pelo painel da Supabase, guardada em local controlado pela sede.', 'Mensal, e antes de qualquer migração'],
  ['Cadastros e frequência', 'Exportações em Excel pela tela Relatórios, arquivadas pela sede.', 'Mensal'],
  ['Código-fonte', 'Repositório no GitHub, com histórico completo de versões.', 'A cada alteração'],
  ['Configurações', 'Relação das variáveis de ambiente de cada provedor, guardada fora do repositório, em local restrito.', 'A cada alteração'],
], [1900, 4400, LARGURA_UTIL - 1900 - 4400]));

filhos.push(h2('8.2. Recuperação'));
filhos.push(tabela(['Situação', 'Procedimento'], [
  ['Registro apagado por engano', 'Solicitar ao responsável técnico a restauração pontual a partir do backup mais recente da Supabase. Quanto antes for comunicado, menor a perda.'],
  ['Banco corrompido ou perdido', 'Restaurar o backup da Supabase. Se necessário recriar do zero: executar schema.sql, restaurar os dados exportados e recriar os acessos com seed.sql.'],
  ['API fora do ar', 'Verificar o log no painel do Render e reiniciar o serviço. Persistindo, republicar a última versão que funcionava.'],
  ['Interface fora do ar', 'Republicar na Vercel a última versão estável. A interface não guarda dados; nada se perde.'],
  ['Falha após uma atualização', 'Republicar o commit anterior nos dois provedores. Alterações de banco não voltam sozinhas: avaliar caso a caso com o responsável técnico.'],
], [2600, LARGURA_UTIL - 2600]));
filhos.push(espaco());
filhos.push(p('Teste a recuperação ao menos uma vez, ainda durante a implantação: restaurar um backup em ambiente de teste é a única forma de saber que o backup funciona.'));

// 9. Contingência
filhos.push(h1('9. Plano de contingência'));
filhos.push(p('Ações previstas para os problemas críticos que podem ocorrer durante a implantação.'));
filhos.push(tabela(['Problema', 'Ação imediata', 'Responsável'], [
  ['Sistema indisponível em dia de atendimento', 'As unidades registram a frequência em papel e lançam no sistema assim que o acesso voltar. O responsável técnico verifica os provedores e comunica a previsão.', 'Responsável técnico'],
  ['Dados migrados com erros generalizados', 'Suspender a migração das demais unidades, corrigir a planilha de origem e reimportar. Não corrigir registro a registro antes de identificar a causa.', 'Ponto focal e responsável técnico'],
  ['Equipe com dificuldade de uso após o treinamento', 'Estender a operação assistida por mais uma semana, com acompanhamento presencial do multiplicador e manutenção do controle em papel.', 'Multiplicadores'],
  ['Falha crítica encontrada em produção', 'Republicar a versão anterior, registrar a ocorrência e só retomar após a correção ser testada.', 'Responsável técnico'],
  ['Suspeita de acesso indevido ou vazamento', 'Trocar imediatamente as senhas envolvidas e o segredo de assinatura das sessões, o que desconecta todos os usuários; apurar o ocorrido e comunicar a coordenação.', 'Responsável técnico e ponto focal'],
  ['Atraso relevante no cronograma', 'Priorizar a entrada de uma unidade por vez, começando pela de menor volume, em vez de atrasar as três.', 'Ponto focal'],
], [2200, 4600, LARGURA_UTIL - 2200 - 4600]));

filhos.push(quebra());

// 10. Comunicação
filhos.push(h1('10. Comunicação'));
filhos.push(p('A comunicação durante a implantação segue um caminho único, para evitar orientações divergentes: as unidades falam com o multiplicador, o multiplicador fala com o ponto focal da sede, e o ponto focal aciona o responsável técnico.'));
filhos.push(tabela(['Momento', 'Formato', 'Participantes'], [
  ['Abertura da implantação', 'Reunião de alinhamento: objetivos, cronograma e responsabilidades.', 'Toda a equipe'],
  ['Durante as etapas', 'Ponto de situação semanal, breve, com o que foi feito, o que travou e o que vem a seguir.', 'Ponto focal, multiplicadores e responsável técnico'],
  ['Operação assistida', 'Canal direto de dúvidas por mensagem, com registro das perguntas recorrentes.', 'Multiplicadores e responsável técnico'],
  ['Problema crítico', 'Comunicação imediata ao ponto focal, que aciona o responsável técnico.', 'Quem identificar o problema'],
  ['Encerramento', 'Reunião de fechamento: resultados, pendências e a rotina de suporte após a implantação.', 'Toda a equipe'],
], [2000, 4400, LARGURA_UTIL - 2000 - 4400]));

filhos.push(h2('10.1. Registro'));
filhos.push(bullet('Dúvidas recorrentes devem ser anotadas e incorporadas ao Manual do Usuário, na seção de perguntas frequentes.'));
filhos.push(bullet('Problemas técnicos devem ser relatados com data, horário, tela, mensagem exibida e captura de tela.'));
filhos.push(bullet('Decisões que alterem prazo ou escopo devem ser registradas por escrito pelo ponto focal.'));

filhos.push(h2('10.2. Após a implantação'));
filhos.push(p('Encerrada a operação assistida, o atendimento passa à rotina: dúvidas de uso com a coordenação da unidade, senhas e permissões com a secretaria da sede, e falhas técnicas com o responsável técnico. Os contatos estão na seção 7 do Manual do Usuário e devem ser preenchidos antes da distribuição.'));

const doc = new Document({
  creator: 'Serviço de Obras Sociais',
  title: 'SIGU — Plano de Implantação',
  description: 'Plano de implantação do SIGU nas unidades do SOS',
  numbering: {
    config: [
      {
        reference: 'marcadores',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 460, hanging: 240 } } },
        }],
      },
      {
        reference: 'passos',
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 520, hanging: 300 } }, run: { bold: true, color: BRAND } },
        }],
      },
    ],
  },
  styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
  sections: [{
    properties: { page: { margin: { top: MARGEM, right: MARGEM, bottom: MARGEM, left: MARGEM } } },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT, spacing: { after: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1', space: 6 } },
          children: [new TextRun({ text: 'SIGU — Plano de Implantação', size: 16, color: CINZA })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Serviço de Obras Sociais  ·  Página ', size: 16, color: CINZA }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: CINZA }),
            new TextRun({ text: ' de ', size: 16, color: CINZA }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: CINZA }),
          ],
        })],
      }),
    },
    children: filhos,
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  const destino = path.join(__dirname, 'Plano-Implantacao-SIGU.docx');
  fs.writeFileSync(destino, buffer);
  console.log('gerado:', destino, '|', (buffer.length / 1024).toFixed(0), 'KB');
});
