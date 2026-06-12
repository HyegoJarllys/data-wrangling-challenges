/**
 * fix_database.js
 * ====================================================================
 * Fase 1: Recuperacao e normalizacao dos dados originais.
 *
 * O banco foi corrompido em uma atualizacao. Este script aplica um
 * pipeline de saneamento que cobre:
 *
 *   A) Correcoes obrigatorias do enunciado:
 *      1. Substituicao de caracteres em valores string:
 *           "ae" (U+00E6)        para "a"
 *           "o-barrado" (U+00F8) para "o"
 *      2. Campos numericos salvos como string ("11") para number (11).
 *
 *   B) Normalizacao adicional (nao destrutiva) por boa pratica de ETL:
 *      3. TRIM: remove espacos no inicio/fim de strings.
 *      4. Colapsa sequencias de espacos internos em um unico espaco.
 *
 *   IMPORTANTE: optamos por NAO forcar lowercase/uppercase nem
 *   canonizar marcas via lookup. Casing carrega informacao semantica
 *   (siglas, nomes proprios) e qualquer matching case insensitive
 *   deve ser feito na query (LOWER() em SQL), nao no dado armazenado.
 *
 * Arquitetura em 3 funcoes principais (separacao de responsabilidades):
 *   lerArquivo(caminho)       , le e parseia JSON do disco
 *   corrigirDados(dado)       , aplica correcoes recursivamente
 *   salvarArquivo(caminho, x) , serializa e grava JSON no disco
 *
 * Uso:
 *   node fix_database.js
 *
 * Saida: gera fixed_database_1.json e fixed_database_2.json no mesmo diretorio.
 * ====================================================================
 */

const fs = require('fs');
const path = require('path');

// ====================================================================
// Configuracao das substituicoes de caracteres corrompidos.
// Estrutura como objeto para ficar facil adicionar novos casos no futuro
// (ex.: se aparecer outra corrupcao, basta adicionar aqui sem mexer na
// logica das funcoes).
// ====================================================================
const SUBSTITUICOES_CORROMPIDAS = {
  'æ': 'a', // "ae" vira "a"
  'ø': 'o', // "o-barrado" vira "o"
};

// Regex para detectar se uma string representa um numero puro
// (inteiro ou decimal, com sinal opcional). Strings como "2022-01-01"
// nao casam, entao datas sao preservadas como string.
// IMPORTANTE: o teste roda APOS o trim, para tolerar entradas como " 11 ".
const REGEX_NUMERO_PURO = /^-?\d+(\.\d+)?$/;

// Regex para colapsar 2+ espacos consecutivos em um unico espaco.
// Usa \s para tambem pegar tabs e nao quebrados (defensivo).
const REGEX_ESPACOS_MULTIPLOS = /\s+/g;


/**
 * Le e parseia um arquivo JSON de forma segura.
 * @param {string} caminho Caminho absoluto ou relativo do arquivo.
 * @returns {*} Estrutura JS (array, objeto, etc.) ja parseada.
 * @throws {Error} Se o arquivo nao existir ou o JSON estiver invalido.
 */
function lerArquivo(caminho) {
  if (!fs.existsSync(caminho)) {
    throw new Error(`Arquivo nao encontrado: ${caminho}`);
  }

  const conteudo = fs.readFileSync(caminho, 'utf8');

  try {
    return JSON.parse(conteudo);
  } catch (e) {
    // Re-lancamos com contexto mais util do que o erro padrao do JSON.parse.
    throw new Error(`JSON invalido em "${caminho}": ${e.message}`);
  }
}


/**
 * Corrige e normaliza um valor string aplicando o pipeline completo:
 *
 *   1) Reverter caracteres corrompidos (ae para a, o-barrado para o).
 *   2) TRIM (remover espacos no inicio/fim).
 *   3) Colapsar espacos internos multiplos em um unico espaco.
 *   4) Se o resultado for um numero puro ("11", "3.5"), converter para number.
 *
 * Ordem importa: a verificacao numerica vem POR ULTIMO porque o numero
 * pode estar com espacos extras (" 11 ") e precisamos limpar antes de testar.
 *
 * @param {string} valor String original.
 * @returns {string|number} Valor corrigido (string limpa ou number).
 */
function corrigirString(valor) {
  let corrigido = valor;

  // 1) Substitui cada caractere corrompido pelo original.
  //    replaceAll garante TODAS as ocorrencias (replace simples trocaria so a primeira).
  for (const [corrompido, original] of Object.entries(SUBSTITUICOES_CORROMPIDAS)) {
    corrigido = corrigido.replaceAll(corrompido, original);
  }

  // 2) e 3) Normalizacao de espacos (nao destrutiva):
  //    trim:    remove espacos nas pontas
  //    replace: colapsa sequencias internas
  //    Isso resolve casos como "Peugeot " e blindam contra
  //    espacos duplicados que apareceriam no futuro.
  corrigido = corrigido.trim().replace(REGEX_ESPACOS_MULTIPLOS, ' ');

  // 4) Conversao de tipo: se sobrou um numero puro, vira number.
  //    Ex.: "11" vira 11, "3.5" vira 3.5. Datas "2022-01-01" nao casam.
  if (REGEX_NUMERO_PURO.test(corrigido)) {
    return Number(corrigido);
  }

  return corrigido;
}


/**
 * Percorre recursivamente uma estrutura JS (array / objeto / primitivo)
 * e aplica `corrigirString` a todo valor string encontrado.
 *
 * Por que recursivo?
 *   Nao acopla a logica ao schema atual (`data`, `vendas`, etc.).
 *   Se o JSON tiver objetos aninhados ou arrays de arrays, ainda funciona.
 *   Mais robusto a mudancas no formato.
 *
 * Importante: nao muta o dado original; retorna nova estrutura.
 *
 * @param {*} dado Qualquer valor JS.
 * @returns {*} Estrutura corrigida (mesma forma do input).
 */
function corrigirDados(dado) {
  // Caso 1: array. Aplica recursivamente em cada item.
  if (Array.isArray(dado)) {
    return dado.map(corrigirDados);
  }

  // Caso 2: objeto puro (nao nulo, nao array). Reconstroi preservando
  // as chaves e corrigindo recursivamente os valores.
  if (dado !== null && typeof dado === 'object') {
    const resultado = {};
    for (const [chave, valor] of Object.entries(dado)) {
      resultado[chave] = corrigirDados(valor);
    }
    return resultado;
  }

  // Caso 3: string. Aplica regras de correcao.
  if (typeof dado === 'string') {
    return corrigirString(dado);
  }

  // Caso 4: number, boolean, null, undefined. Retorna intocado.
  return dado;
}


/**
 * Serializa um valor JS em JSON e grava em disco com indentacao
 * de 2 espacos (padrao mais legivel para revisao manual).
 * @param {string} caminho Caminho de saida.
 * @param {*} dado Valor a ser salvo.
 */
function salvarArquivo(caminho, dado) {
  const json = JSON.stringify(dado, null, 2);
  fs.writeFileSync(caminho, json, 'utf8');
}


/**
 * Pipeline completo para um par entrada/saida: ler, corrigir, salvar.
 * @param {string} entrada Caminho do JSON corrompido.
 * @param {string} saida   Caminho do JSON corrigido a ser gerado.
 */
function processar(entrada, saida) {
  console.log(`Lendo:    ${path.basename(entrada)}`);
  const dadosOriginais = lerArquivo(entrada);

  console.log(`Corrigindo dados...`);
  const dadosCorrigidos = corrigirDados(dadosOriginais);

  console.log(`Salvando: ${path.basename(saida)}`);
  salvarArquivo(saida, dadosCorrigidos);

  // Estatistica simples para conferencia rapida apos rodar.
  const totalRegistros = Array.isArray(dadosCorrigidos) ? dadosCorrigidos.length : 1;
  console.log(`OK. ${totalRegistros} registros processados.\n`);
}


// ====================================================================
// Execucao principal
// ====================================================================
function main() {
  // Estrutura de pastas:
  //   teste-tecnico-2/
  //     fix_database.js     <- este script (raiz do projeto)
  //     database/           <- entrada e saida de dados
  //       broken_database_*.json
  //       fixed_database_*.json
  //
  // O script roda a partir da raiz e le/grava na subpasta database/.
  const dirBase = __dirname;
  const dirDados = path.join(dirBase, 'database');

  // Garante que a pasta de dados existe (cria se necessario).
  // Util se o projeto for clonado e a estrutura precisar ser refeita.
  if (!fs.existsSync(dirDados)) {
    fs.mkdirSync(dirDados, { recursive: true });
  }

  // Pares (entrada, saida) a serem processados.
  // Adicionar novos arquivos aqui caso a base cresca.
  const arquivos = [
    {
      entrada: path.join(dirDados, 'broken_database_1.json'),
      saida:   path.join(dirDados, 'fixed_database_1.json'),
    },
    {
      entrada: path.join(dirDados, 'broken_database_2.json'),
      saida:   path.join(dirDados, 'fixed_database_2.json'),
    },
  ];

  try {
    console.log('=== Fase 1. Recuperacao dos dados ===\n');
    for (const { entrada, saida } of arquivos) {
      processar(entrada, saida);
    }
    console.log('Todos os arquivos foram corrigidos com sucesso.');
  } catch (erro) {
    // Qualquer erro nao tratado para aqui: imprime mensagem amigavel
    // e sai com codigo 1 (sinal de falha p/ scripts/CI).
    console.error(`ERRO: ${erro.message}`);
    process.exit(1);
  }
}

main();
