/**
 * generate_report.js
 * ====================================================================
 * E-commerce sales dataset.
 * Fase 3: gera o relatorio final em formato DOCX, pronto para
 * conversao em PDF.
 *
 * Decisao: o conteudo analitico (numeros das 5 perguntas) e calculado
 * em tempo de geracao a partir dos JSONs corrigidos pela Fase 1.
 * Isso garante que o relatorio nunca fica dessincronizado dos dados
 * e elimina copia cola manual de resultados.
 *
 * Localizacao: tools/ (script auxiliar, nao faz parte da entrega).
 *
 * Entrada: ../database/fixed_database_1.json e ../database/fixed_database_2.json
 * Saida:   ../docs/relatorio_vendas.docx
 *
 * Uso (a partir da raiz do projeto):
 *   node tools/generate_report.js
 *
 * Dependencia:
 *   npm install -g docx
 * ====================================================================
 */

const fs = require('fs');
const path = require('path');

// Resolvemos o caminho do pacote 'docx' instalado globalmente.
// Em macOS+Homebrew, npm root -g costuma ser /opt/homebrew/lib/node_modules.
const NODE_MODULES_GLOBAL = '/opt/homebrew/lib/node_modules';
const docx = require(path.join(NODE_MODULES_GLOBAL, 'docx'));

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, LevelFormat, BorderStyle,
  WidthType, ShadingType, PageBreak, Footer, PageNumber,
} = docx;

// Caminhos: este script vive em tools/, mas le e grava na raiz do projeto.
const dirRaiz  = path.resolve(__dirname, '..');
const dirDados = path.join(dirRaiz, 'database');
const dirDocs  = path.join(dirRaiz, 'docs');


// ====================================================================
// 1. CALCULO DAS METRICAS A PARTIR DOS JSONS CORRIGIDOS
// ====================================================================

const fato = JSON.parse(fs.readFileSync(path.join(dirDados, 'fixed_database_1.json'), 'utf8'));
const dim  = JSON.parse(fs.readFileSync(path.join(dirDados, 'fixed_database_2.json'), 'utf8'));

const mapaMarca = Object.fromEntries(dim.map(m => [m.id_marca, m.marca]));

// Enriquecimento: replicamos a logica da TABELA UNICA SQL aqui em JS
// para que o relatorio use exatamente os mesmos valores que sairao do
// SQLite Online apos rodar 03_create_relatorio.sql.
const registros = fato.map(r => {
  const valor = r.valor_do_veiculo;
  const faixaInicio = Math.floor(valor / 10000) * 10000;
  return {
    data: r.data,
    marca: mapaMarca[r.id_marca_],
    veiculo: r.nome,
    vendas: r.vendas,
    valor_do_veiculo: valor,
    receita: r.vendas * valor,
    faixa_preco_inicio: faixaInicio,
    faixa_preco_fim: faixaInicio + 9999,
  };
});

// Helpers de agregacao
const formatarBRL = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
const formatarNum = (v) => Number(v).toLocaleString('pt-BR');

function agruparSomar(arr, chaveFn, valorFn) {
  const out = new Map();
  for (const item of arr) {
    const k = chaveFn(item);
    out.set(k, (out.get(k) || 0) + valorFn(item));
  }
  return out;
}

// P1: volume de vendas por marca
const vendasPorMarca = [...agruparSomar(registros, r => r.marca, r => r.vendas)]
  .map(([marca, total]) => ({ marca, total }))
  .sort((a, b) => b.total - a.total);

// P2: receita por (marca, veiculo)
const receitaPorVeiculo = (() => {
  const map = new Map();
  for (const r of registros) {
    const k = `${r.marca}||${r.veiculo}`;
    const cur = map.get(k) || { marca: r.marca, veiculo: r.veiculo, receita: 0, unidades: 0 };
    cur.receita += r.receita;
    cur.unidades += r.vendas;
    map.set(k, cur);
  }
  return [...map.values()].sort((a, b) => b.receita - a.receita);
})();
const veiculoMaiorReceita = receitaPorVeiculo[0];
const veiculoMenorReceita = receitaPorVeiculo[receitaPorVeiculo.length - 1];

// P3: faixas de preco a cada 10k
const faixas = [...agruparSomar(registros, r => r.faixa_preco_inicio, r => r.vendas)]
  .map(([inicio, total]) => ({ inicio, fim: inicio + 9999, total }))
  .sort((a, b) => b.total - a.total);
const faixaCampea = faixas[0];

// P4: 3 marcas com menor ticket medio
const metricasMarca = (() => {
  const mapU = agruparSomar(registros, r => r.marca, r => r.vendas);
  const mapR = agruparSomar(registros, r => r.marca, r => r.receita);
  return [...mapU.entries()].map(([marca, unidades]) => ({
    marca,
    unidades,
    receita: mapR.get(marca),
    ticketMedio: mapR.get(marca) / unidades,
  })).sort((a, b) => a.ticketMedio - b.ticketMedio);
})();
const top3MenorTicket = metricasMarca.slice(0, 3);

// P5: top 10 veiculos mais vendidos
const topVeiculos = (() => {
  const map = new Map();
  for (const r of registros) {
    const k = `${r.marca}||${r.veiculo}`;
    const cur = map.get(k) || {
      marca: r.marca, veiculo: r.veiculo,
      unidades: 0, receita: 0, mesesAtivos: new Set(),
    };
    cur.unidades += r.vendas;
    cur.receita += r.receita;
    cur.mesesAtivos.add(r.data);
    map.set(k, cur);
  }
  return [...map.values()]
    .map(x => ({
      ...x,
      precoMedio: x.receita / x.unidades,
      mesesAtivos: x.mesesAtivos.size,
    }))
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, 10);
})();


// ====================================================================
// 2. HELPERS DE CONSTRUCAO DOCX
// ====================================================================

const COR_HEADER = '2E75B6';   // azul institucional do cabecalho
const COR_DESTAQUE = 'D5E8F0'; // azul claro p/ celulas em destaque
const COR_BARRA = '4A90D9';    // barra visual nas tabelas
const COR_BARRA_BG = 'F0F4F8'; // fundo das celulas com barra
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

// Largura util A4 com margens de 1 polegada: 11906 . 2880 = 9026 DXA.
const LARGURA_TABELA = 9026;

const p = (texto, opts = {}) => new Paragraph({
  ...opts,
  children: [new TextRun({ text: texto, ...(opts.run || {}) })],
});

const h1 = (texto) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [new TextRun({ text: texto })],
});

const h2 = (texto) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  children: [new TextRun({ text: texto })],
});

/**
 * Celula de tabela com configuracao consistente (bordas, padding).
 * @param {string|TextRun[]} conteudo
 * @param {number} larguraDxa
 * @param {object} opts { header, alinhamento, fundo }
 */
function cell(conteudo, larguraDxa, opts = {}) {
  const runs = typeof conteudo === 'string'
    ? [new TextRun({ text: conteudo, bold: !!opts.header, color: opts.header ? 'FFFFFF' : undefined })]
    : conteudo;
  const config = {
    borders: BORDERS,
    width: { size: larguraDxa, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: opts.alinhamento || AlignmentType.LEFT,
      children: runs,
    })],
  };
  if (opts.header) {
    config.shading = { fill: COR_HEADER, type: ShadingType.CLEAR };
  } else if (opts.fundo) {
    config.shading = { fill: opts.fundo, type: ShadingType.CLEAR };
  }
  return new TableCell(config);
}

/**
 * Constroi uma tabela a partir de array de dados.
 * Primeira linha = cabecalho. Linhas seguintes = registros.
 * @param {string[]} cabecalho
 * @param {Array<Array<string>>} linhas
 * @param {number[]} colunasPesos pesos relativos das colunas (somam X)
 */
function tabela(cabecalho, linhas, colunasPesos) {
  const totalPeso = colunasPesos.reduce((a, b) => a + b, 0);
  const larguras = colunasPesos.map(p => Math.floor((p / totalPeso) * LARGURA_TABELA));
  // Ajuste fino p/ garantir soma == LARGURA_TABELA (compensa arredondamento).
  larguras[0] += LARGURA_TABELA - larguras.reduce((a, b) => a + b, 0);

  const header = new TableRow({
    tableHeader: true,
    children: cabecalho.map((txt, i) => cell(txt, larguras[i], { header: true })),
  });

  const corpo = linhas.map((linha, idx) =>
    new TableRow({
      children: linha.map((celula, i) => {
        const isNum = i > 0; // primeira coluna = label, demais = numericas
        return cell(String(celula), larguras[i], {
          alinhamento: isNum ? AlignmentType.RIGHT : AlignmentType.LEFT,
          fundo: idx % 2 === 1 ? 'F8F8F8' : undefined, // zebra striping
        });
      }),
    })
  );

  return new Table({
    width: { size: LARGURA_TABELA, type: WidthType.DXA },
    columnWidths: larguras,
    rows: [header, ...corpo],
  });
}

/**
 * Tabela "barra visual": mostra valores com uma celula colorida
 * proporcional ao maximo. Util p/ Pergunta 1 e Pergunta 3.
 */
function tabelaBarra(cabecalho, linhas, valorMaximo) {
  // [label, valor_num, valor_formatado]
  const colLabel = 3000;
  const colValor = 1800;
  const colBarra = LARGURA_TABELA - colLabel - colValor;

  const header = new TableRow({
    tableHeader: true,
    children: [
      cell(cabecalho[0], colLabel, { header: true }),
      cell(cabecalho[1], colValor, { header: true, alinhamento: AlignmentType.RIGHT }),
      cell(cabecalho[2], colBarra, { header: true }),
    ],
  });

  const corpo = linhas.map((linha, idx) => {
    const [label, valorNum, valorFmt] = linha;
    const proporcao = valorNum / valorMaximo;
    const blocos = Math.round(proporcao * 30); // ate 30 blocos
    const barra = '█'.repeat(blocos);

    return new TableRow({
      children: [
        cell(label, colLabel, { fundo: idx % 2 === 1 ? 'F8F8F8' : undefined }),
        cell(valorFmt, colValor, {
          alinhamento: AlignmentType.RIGHT,
          fundo: idx % 2 === 1 ? 'F8F8F8' : undefined,
        }),
        new TableCell({
          borders: BORDERS,
          width: { size: colBarra, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          shading: { fill: idx % 2 === 1 ? 'F8F8F8' : 'FFFFFF', type: ShadingType.CLEAR },
          children: [new Paragraph({
            children: [new TextRun({ text: barra, color: COR_BARRA, font: 'Consolas' })],
          })],
        }),
      ],
    });
  });

  return new Table({
    width: { size: LARGURA_TABELA, type: WidthType.DXA },
    columnWidths: [colLabel, colValor, colBarra],
    rows: [header, ...corpo],
  });
}


// ====================================================================
// 3. CONTEUDO DO RELATORIO
// ====================================================================

const conteudo = [];

// Capa
conteudo.push(
  new Paragraph({ children: [new TextRun({ text: '' })] }),
  new Paragraph({ children: [new TextRun({ text: '' })] }),
  new Paragraph({ children: [new TextRun({ text: '' })] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Relatorio de Desempenho de Vendas', bold: true, size: 48 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120 },
    children: [new TextRun({ text: 'Concessionaria Multimarcas. 2022', size: 28, color: '666666' })],
  }),
  new Paragraph({ children: [new TextRun({ text: '' })] }),
  new Paragraph({ children: [new TextRun({ text: '' })] }),
  new Paragraph({ children: [new TextRun({ text: '' })] }),
  new Paragraph({ children: [new TextRun({ text: '' })] }),
  new Paragraph({ children: [new TextRun({ text: '' })] }),
  new Paragraph({ children: [new TextRun({ text: '' })] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'e-commerce dataset', size: 24 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120 },
    children: [new TextRun({ text: 'Processo Seletivo Tech 2025', size: 22, color: '666666' })],
  }),
  new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: '' })] }),
);

// 1. Contexto
conteudo.push(
  h1('1. Contexto e objetivo'),
  p('A concessionaria multimarcas solicitou um relatorio consolidado de desempenho ' +
    'de vendas referente ao ultimo ano fiscal (2022), apos identificar uma corrupcao ' +
    'no banco de dados de origem que comprometia a leitura direta dos arquivos.'),
  p('Duas anomalias foram detectadas nos JSONs originais e precisaram ser tratadas ' +
    'antes da analise:'),
  new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    children: [new TextRun('Substituicao sistematica de caracteres em valores texto: ' +
      '"a" para "ae" e "o" para "o-barrado".')],
  }),
  new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    children: [new TextRun('Quebra de tipagem em campos numericos: parte dos valores ' +
      'de "vendas" foi armazenada como string em vez de number.')],
  }),
  p('Este relatorio responde as cinco perguntas de negocio formuladas pela gestao, ' +
    'com base na tabela unica gerada apos a etapa de saneamento.', { spacing: { before: 200 } }),
);

// 2. Metodologia
conteudo.push(
  h1('2. Metodologia'),
  p('A solucao foi estruturada em duas fases tecnicas, em conformidade com o ' +
    'enunciado do case:'),
  h2('Fase 1. Recuperacao dos dados (JavaScript / Node.js)'),
  p('Script "fix_database.js" aplica um pipeline de saneamento em quatro etapas, ' +
    'centralizado na fonte (principio "single source of truth"):'),
  new Paragraph({ numbering: { reference: 'numbers-fase', level: 0 },
    children: [new TextRun('Reversao dos caracteres corrompidos (ae para a, o-barrado para o).')] }),
  new Paragraph({ numbering: { reference: 'numbers-fase', level: 0 },
    children: [new TextRun('TRIM em todas as strings (remove espacos extras nas pontas).')] }),
  new Paragraph({ numbering: { reference: 'numbers-fase', level: 0 },
    children: [new TextRun('Colapso de espacos internos multiplos em um unico espaco.')] }),
  new Paragraph({ numbering: { reference: 'numbers-fase', level: 0 },
    children: [new TextRun('Conversao de strings numericas em number (ex.: "11" para 11).')] }),
  p('A logica e recursiva: percorre qualquer estrutura JSON sem acoplamento ao ' +
    'schema atual, garantindo robustez a mudancas futuras.', { spacing: { before: 120 } }),

  h2('Fase 2. Modelagem analitica (SQL / SQLite)'),
  p('Os JSONs corrigidos foram normalizados em duas tabelas relacionais ' +
    '(marcas e vendas) e consolidados em uma tabela unica materializada, ' +
    'relatorio_vendas, criada via CTAS (CREATE TABLE AS SELECT). A tabela ' +
    'unica resolve o JOIN, expoe a peculiaridade id_marca_/id_marca e ja ' +
    'pre calcula colunas derivadas relevantes:'),
  new Paragraph({ numbering: { reference: 'bullets', level: 0 },
    children: [new TextRun('receita = vendas x valor_do_veiculo')] }),
  new Paragraph({ numbering: { reference: 'bullets', level: 0 },
    children: [new TextRun('ano e mes extraidos da data')] }),
  new Paragraph({ numbering: { reference: 'bullets', level: 0 },
    children: [new TextRun('faixa_preco_inicio / fim em buckets de R$ 10.000')] }),
  p('Total processado: 11 marcas e 132 registros mensais de vendas.',
    { spacing: { before: 120 } }),
);

// 3. Analises
conteudo.push(new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: '' })] }));
conteudo.push(h1('3. Analises'));

// Pergunta 1
conteudo.push(
  h2('3.1 Qual marca teve o maior volume de vendas?'),
  p('Considerando o somatorio de unidades vendidas (campo "vendas") por marca ' +
    'ao longo de 2022:'),
);
conteudo.push(
  tabelaBarra(
    ['Marca', 'Unidades', 'Distribuicao'],
    vendasPorMarca.map(v => [v.marca, v.total, formatarNum(v.total)]),
    vendasPorMarca[0].total,
  ),
);
const top3VendasNomes = vendasPorMarca.slice(0, 3).map(v => v.marca).join(', ');
conteudo.push(
  p('', { spacing: { before: 120 } }),
  p(`A marca ${vendasPorMarca[0].marca} lidera o ranking com ` +
    `${formatarNum(vendasPorMarca[0].total)} unidades, seguida de perto por ` +
    `${vendasPorMarca[1].marca} (${formatarNum(vendasPorMarca[1].total)}) e ` +
    `${vendasPorMarca[2].marca} (${formatarNum(vendasPorMarca[2].total)}). ` +
    'O dado mais relevante nao e o vencedor isolado, mas o ' +
    `agrupamento: as tres marcas (${top3VendasNomes}) somam mais de 75% do ` +
    'volume total, evidenciando concentracao em fabricantes de carros populares ' +
    'e um segundo grupo (Peugeot, Toyota, Renault) com participacao significativamente menor.'),
);

// Pergunta 2
conteudo.push(
  h2('3.2 Qual veiculo gerou a maior e a menor receita?'),
  p('Receita = unidades vendidas x valor unitario, agregada por (marca, modelo) ' +
    'ao longo do ano.'),
  tabela(
    ['Posicao', 'Marca', 'Modelo', 'Receita', 'Unidades'],
    [
      ['Maior receita', veiculoMaiorReceita.marca, veiculoMaiorReceita.veiculo,
        formatarBRL(veiculoMaiorReceita.receita), formatarNum(veiculoMaiorReceita.unidades)],
      ['Menor receita', veiculoMenorReceita.marca, veiculoMenorReceita.veiculo,
        formatarBRL(veiculoMenorReceita.receita), formatarNum(veiculoMenorReceita.unidades)],
    ],
    [2, 2, 2, 2, 1.5],
  ),
  p('', { spacing: { before: 120 } }),
  p(`O ${veiculoMaiorReceita.marca} ${veiculoMaiorReceita.veiculo} liderou em receita ` +
    `com ${formatarBRL(veiculoMaiorReceita.receita)}, sustentado por um volume de ` +
    `${formatarNum(veiculoMaiorReceita.unidades)} unidades vendidas. Ou seja, a ` +
    'receita expressiva veio do volume, nao do ticket alto. Em contrapartida, o ' +
    `${veiculoMenorReceita.marca} ${veiculoMenorReceita.veiculo} apareceu uma unica vez ` +
    `no banco (${formatarNum(veiculoMenorReceita.unidades)} unidade), gerando ` +
    `${formatarBRL(veiculoMenorReceita.receita)}, valor compativel com transacao ` +
    'isolada/residual.'),
);

// Pergunta 3
conteudo.push(new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: '' })] }));
conteudo.push(
  h2('3.3 Qual faixa de preco mais vendeu carros?'),
  p('Faixas definidas em bandas de R$ 10.000 sobre o valor unitario do veiculo. ' +
    'Cada registro de venda foi alocado a sua faixa, e somou se as unidades por banda.'),
  tabelaBarra(
    ['Faixa de preco', 'Unidades', 'Distribuicao'],
    faixas.slice(0, 8).map(f => [
      `${formatarBRL(f.inicio)} a ${formatarBRL(f.fim)}`,
      f.total,
      formatarNum(f.total),
    ]),
    faixaCampea.total,
  ),
  p('', { spacing: { before: 120 } }),
  p(`A faixa ${formatarBRL(faixaCampea.inicio)} a ${formatarBRL(faixaCampea.fim)} ` +
    `concentrou ${formatarNum(faixaCampea.total)} unidades vendidas, sendo a ` +
    'mais relevante. Esse resultado e coerente com a observacao da Pergunta 1: ' +
    'o ticket medio das marcas lider (Fiat, Volkswagen, Kia) reside justamente ' +
    'nesse intervalo, reforcando que o nicho de R$ 30k a R$ 40k representa o ' +
    'centro de gravidade do mercado da concessionaria. As faixas seguintes ' +
    `(R$ 20k a R$ 30k e R$ 40k a R$ 50k) confirmam o padrao: ${formatarNum(
      (faixas[0].total + faixas[1].total + faixas[2].total)
    )} das vendas (${(((faixas[0].total + faixas[1].total + faixas[2].total) /
      registros.reduce((s, r) => s + r.vendas, 0)) * 100).toFixed(1)}%) ocorrem entre ` +
    'R$ 20k e R$ 50k.'),
);

// Pergunta 4
conteudo.push(
  h2('3.4 Receita das 3 marcas com menor ticket medio'),
  p('Ticket medio definido como receita total dividida pelas unidades vendidas. ' +
    'Ou seja, media ponderada pelo volume, mais robusta que a media simples dos ' +
    'precos unitarios.'),
  tabela(
    ['Marca', 'Ticket medio', 'Unidades', 'Receita total'],
    top3MenorTicket.map(m => [
      m.marca,
      formatarBRL(m.ticketMedio),
      formatarNum(m.unidades),
      formatarBRL(m.receita),
    ]),
    [3, 2.5, 2, 2.5],
  ),
  p('', { spacing: { before: 120 } }),
  p('A leitura cruzada com volume e essencial: ticket baixo nao implica receita ' +
    `baixa. ${top3MenorTicket[1].marca} e ${top3MenorTicket[2].marca}, apesar ` +
    'do ticket medio modesto, geraram receitas totais expressivas ' +
    `(${formatarBRL(top3MenorTicket[1].receita)} e ${formatarBRL(top3MenorTicket[2].receita)} ` +
    'respectivamente) porque o volume compensa. Ja a ' +
    `${top3MenorTicket[0].marca} apresenta padrao distinto: ticket baixo combinado ` +
    `com volume reduzido (${formatarNum(top3MenorTicket[0].unidades)} unidades), ` +
    `gerando apenas ${formatarBRL(top3MenorTicket[0].receita)}, perfil de ` +
    'marca com pouca tracao no portfolio.'),
);

// Pergunta 5
conteudo.push(new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: '' })] }));
conteudo.push(
  h2('3.5 Existe relacao entre os veiculos mais vendidos?'),
  p('Para investigar padroes, listamos os 10 modelos com maior volume de vendas, ' +
    'enriquecidos com preco medio ponderado e meses de presenca no banco ' +
    '(consistencia ao longo do ano).'),
  tabela(
    ['Marca', 'Modelo', 'Unidades', 'Preco medio', 'Meses ativo'],
    topVeiculos.map(v => [
      v.marca, v.veiculo,
      formatarNum(v.unidades),
      formatarBRL(v.precoMedio),
      `${v.mesesAtivos} de 12`,
    ]),
    [2, 2, 1.5, 2, 1.5],
  ),
  p('', { spacing: { before: 120 } }),
  p('Observam se tres padroes relevantes:'),
  new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [
    new TextRun({ text: 'Faixa de preco convergente: ', bold: true }),
    new TextRun('os tres modelos mais vendidos (Mobi, Up, Picanto) tem preco medio ' +
      'entre R$ 35k e R$ 39k, exatamente a faixa modal identificada na Pergunta 3.'),
  ]}),
  new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [
    new TextRun({ text: 'Consistencia anual: ', bold: true }),
    new TextRun('os tres lideres aparecem nos 12 meses do banco, indicando demanda ' +
      'estavel e nao sazonal. Ja modelos como Peugeot 208 (5 meses) e Toyota Corolla ' +
      '(4 meses) tem volume relevante mas presenca intermitente.'),
  ]}),
  new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [
    new TextRun({ text: 'Segmento equivalente: ', bold: true }),
    new TextRun('todos os tres lideres pertencem ao segmento de hatch compacto ' +
      'de entrada (carros populares). A relacao mais forte entre os mais vendidos ' +
      'e o posicionamento de mercado, nao a marca isolada.'),
  ]}),
  p('Ponto fora da curva: o Subaru Forester aparece no top 10 com preco medio de ' +
    `${formatarBRL(topVeiculos.find(v => v.veiculo === 'Forester')?.precoMedio || 0)}, ` +
    'evidencia de uma base fiel/nicho premium dentro do portfolio, comportamento ' +
    'que vale acompanhamento separado.', { spacing: { before: 120 } }),
);

// 4. Conclusoes
conteudo.push(new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: '' })] }));
conteudo.push(
  h1('4. Conclusoes consolidadas'),
  new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [
    new TextRun({ text: 'Concentracao de mercado: ', bold: true }),
    new TextRun('o portfolio e fortemente puxado por tres marcas populares ' +
      '(Fiat, Volkswagen, Kia), que representam mais de 75% das unidades vendidas.'),
  ]}),
  new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [
    new TextRun({ text: 'Sweet spot R$ 30k a R$ 40k: ', bold: true }),
    new TextRun('a faixa de preco mais vendida coincide com o ticket medio das ' +
      'marcas lider, indicando alinhamento eficiente entre demanda e portfolio.'),
  ]}),
  new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [
    new TextRun({ text: 'Volume importa mais que ticket: ', bold: true }),
    new TextRun('marcas com ticket medio modesto, quando combinadas com volume alto, ' +
      'sao as principais geradoras de receita. Avaliar marcas apenas pelo ticket ' +
      'medio e enganoso.'),
  ]}),
  new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [
    new TextRun({ text: 'Estabilidade dos lideres: ', bold: true }),
    new TextRun('Mobi, Up e Picanto vendem todos os 12 meses; modelos premium ' +
      '(Forester, Corolla, 208) tem presenca intermitente, padrao de venda por ' +
      'oportunidade.'),
  ]}),
);

// 5. Ressalvas
conteudo.push(
  h1('5. Limitacoes e decisoes conscientes'),
  p('Em transparencia tecnica, registramos as seguintes decisoes tomadas durante ' +
    'a etapa de saneamento (Fase 1):'),
  new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [
    new TextRun({ text: 'Casing preservado: ', bold: true }),
    new TextRun('optou se por NAO forcar lowercase ou uppercase global, nem ' +
      'canonizar manualmente nomes de marcas/modelos. Casing carrega informacao ' +
      'semantica (siglas como JAC, nomes proprios). Como consequencia, "onix" e ' +
      '"argo" aparecem em minusculas porque o JSON fonte os tinha assim.'),
  ]}),
  new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [
    new TextRun({ text: 'Limpeza centralizada na fonte: ', bold: true }),
    new TextRun('todas as transformacoes de saneamento ocorrem na Fase 1 (JavaScript). ' +
      'A camada SQL recebe dados ja canonicos e foca exclusivamente em analise.'),
  ]}),
  new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [
    new TextRun({ text: 'Granularidade: ', bold: true }),
    new TextRun('o banco fonte agrega vendas mensais por (data, modelo). Nao ha ' +
      'dado transacional individual; portanto, todas as analises operam em nivel ' +
      'de soma mensal, nao de transacao unitaria.'),
  ]}),
);

// 6. Anexo
conteudo.push(
  h1('6. Anexos e codigos fonte'),
  p('Codigos completos disponiveis na pasta do projeto:'),
  new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [
    new TextRun({ text: 'fix_database.js: ', bold: true }),
    new TextRun('script JS de saneamento (Fase 1).'),
  ]}),
  new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [
    new TextRun({ text: 'generate_sql.js: ', bold: true }),
    new TextRun('gerador automatico do schema e inserts a partir dos JSONs corrigidos.'),
  ]}),
  new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [
    new TextRun({ text: '01_schema.sql, 02_inserts.sql, 03_create_relatorio.sql, 04_analises.sql: ', bold: true }),
    new TextRun('pipeline SQL completo (Fase 2).'),
  ]}),
  new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [
    new TextRun({ text: 'fixed_database_1.json e fixed_database_2.json: ', bold: true }),
    new TextRun('arquivos saneados de saida da Fase 1.'),
  ]}),
  new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [
    new TextRun({ text: 'relatorio_vendas.csv: ', bold: true }),
    new TextRun('export da tabela unica em CSV.'),
  ]}),
);


// ====================================================================
// 4. MONTAGEM DO DOCUMENTO
// ====================================================================

const doc = new Document({
  creator: 'E-commerce sales dataset.Fase 3',
  title: 'Relatorio de Desempenho de Vendas. 2022',
  styles: {
    default: { document: { run: { font: 'Calibri', size: 22 } } }, // 11pt
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Calibri', color: '1F3864' },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Calibri', color: '2E75B6' },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
      {
        reference: 'numbers-fase',
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 }, // A4
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Pagina ', color: '888888' }),
            new TextRun({ children: [PageNumber.CURRENT], color: '888888' }),
            new TextRun({ text: ' de ', color: '888888' }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], color: '888888' }),
          ],
        })],
      }),
    },
    children: conteudo,
  }],
});

// Garante que a pasta docs/ existe (cria se necessario).
if (!fs.existsSync(dirDocs)) {
  fs.mkdirSync(dirDocs, { recursive: true });
}

Packer.toBuffer(doc).then((buffer) => {
  const saida = path.join(dirDocs, 'relatorio_vendas.docx');
  fs.writeFileSync(saida, buffer);
  console.log(`Gerado: docs/${path.basename(saida)} (${(buffer.length / 1024).toFixed(1)} KB)`);
});
