/**
 * QUESTÃO 2: Normalizar todos os preços para number
 *
 * Problema:
 *   O campo `price` chega em formatos heterogêneos. Após a Q1 ter
 *   removido duplicatas, o array contém preços nos seguintes formatos:
 *
 *     - number direto:                 199.90, 1673.50, 350.90, 39.90
 *     - string formato BR com milhar:  "2.015,90"
 *     - string formato BR sem milhar:  "1725,50"
 *     - string formato US:             "1250.90"
 *     - string com símbolo R$:         "R$ 341,90"
 *     - string com símbolo €:          "€ 215,90"
 *     - null:                          (Vinho Italiano)
 *
 *   O objetivo é devolver um NOVO array com todos os `price` em
 *   number decimal (ex.: 2015.90), preservando os demais campos.
 *
 * Estratégia:
 *   Uma função pura `normalizarPreco(valor)` cobre todos os casos
 *   (number, string em qualquer formato, null) e devolve sempre um
 *   number ou null. A função `normalizarPrecos(items)` aplica essa
 *   conversão em cada item via Array.map, clonando o objeto para
 *   não mutar o original.
 *
 *   A detecção de formato BR vs. US para strings é feita por
 *   heurística: o último separador (ponto ou vírgula) que aparece
 *   na string é o decimal; o outro é tratado como separador de
 *   milhar e descartado.
 */

const { compra } = require("./data/compra.js");
const { removerDuplicados } = require("./01-deduplicate.js");

/**
 * Converte um valor de preço (number | string | null | undefined) em number.
 *
 * Regras:
 *   - number → devolve como está (já está no formato esperado).
 *   - string → remove tudo que não for dígito, ponto, vírgula ou sinal,
 *              detecta o formato (BR vs. US) e converte.
 *   - null/undefined/string inconversível → devolve null (a Q3 filtra).
 *
 * @param {number|string|null|undefined} valor
 * @returns {number|null}
 */
function normalizarPreco(valor) {
  // Caso 1: já é number. Não há nada a fazer, só repassar.
  // Importante checar Number.isFinite para descartar NaN e Infinity,
  // que tecnicamente são do tipo "number" mas não são preços válidos.
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : null;
  }

  // Caso 2: não é number nem string (null, undefined, boolean, objeto).
  // Não dá pra converter, devolve null e a Q3 limpa.
  if (typeof valor !== "string") {
    return null;
  }

  // Caso 3: string. Aqui mora a lógica de normalização.
  // Passo 3.1: remover qualquer caractere que não seja dígito, ponto,
  // vírgula ou sinal de menos. Isso elimina "R$", "€", "USD", espaços,
  // letras inadvertidas, etc. Mantém só os caracteres relevantes.
  let limpo = valor.replace(/[^\d.,-]/g, "");

  // Se sobrou string vazia (ex.: entrada era "R$ " sem número), cai fora.
  if (limpo === "") {
    return null;
  }

  // Passo 3.2: decidir o que ponto e vírgula significam.
  // Em formato BR ("2.015,90"): ponto = milhar, vírgula = decimal.
  // Em formato US ("1,234.56"): vírgula = milhar, ponto = decimal.
  // Em formato BR simples ("1725,50"): só vírgula, é decimal.
  // Em formato US simples ("1250.90"): só ponto, é decimal.
  //
  // Heurística: se aparecem AMBOS, o último a aparecer é o decimal e
  // o outro é o separador de milhar. Esta regra cobre os dois formatos
  // sem precisar adivinhar a "intenção" do remetente.
  const ultimoPonto = limpo.lastIndexOf(".");
  const ultimaVirgula = limpo.lastIndexOf(",");

  if (ultimoPonto !== -1 && ultimaVirgula !== -1) {
    if (ultimaVirgula > ultimoPonto) {
      // Formato BR ("2.015,90"): pontos viram nada, vírgula vira ponto.
      limpo = limpo.replace(/\./g, "").replace(",", ".");
    } else {
      // Formato US com milhar ("2,015.90"): vírgulas viram nada.
      limpo = limpo.replace(/,/g, "");
    }
  } else if (ultimaVirgula !== -1) {
    // Só vírgula → trata como decimal BR.
    limpo = limpo.replace(",", ".");
  }
  // Se só tem ponto, ou nem ponto nem vírgula, parseFloat já lida direto.

  // Passo 3.3: parseFloat faz a conversão final. Se a string não for
  // numérica (improvável após a limpeza, mas garante), devolve null.
  const numero = parseFloat(limpo);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Aplica normalizarPreco em cada item do array, devolvendo NOVO array
 * com NOVOS objetos (clone raso). Não mexe na entrada.
 *
 * Decisão de escopo: itens com preço inconversível ficam com price: null
 * e CONTINUAM no array. A remoção desses itens é responsabilidade
 * exclusiva da Questão 3, princípio de uma responsabilidade por função.
 *
 * @param {Array<Object>} items
 * @returns {Array<Object>}
 */
function normalizarPrecos(items) {
  // Array.map devolve um novo array. Para cada item, criamos um novo
  // objeto com spread e sobrescrevemos o campo price com o valor
  // normalizado. Os demais campos (item_id, item_name, quantity)
  // viajam intactos por força do spread.
  return items.map((item) => ({
    ...item,
    price: normalizarPreco(item.price),
  }));
}

if (require.main === module) {
  // Pipeline encadeado: pega o array original, passa pela Q1 (deduplicação)
  // e em seguida pela Q2 (normalização). É a "esteira" funcionando.
  const itemsOriginais = compra.ecommerce.purchase.items;
  const itemsSemDuplicatas = removerDuplicados(itemsOriginais);
  const itemsNormalizados = normalizarPrecos(itemsSemDuplicatas);

  console.log("=== Questão 2: Normalizar preços ===\n");
  console.log("Antes da normalização (price + tipo):");
  itemsSemDuplicatas.forEach((it, i) => {
    console.log(`  [${i}] ${it.item_name.padEnd(20)} price=${JSON.stringify(it.price).padEnd(15)} typeof=${typeof it.price}`);
  });

  console.log("\nDepois da normalização (price + tipo):");
  itemsNormalizados.forEach((it, i) => {
    console.log(`  [${i}] ${it.item_name.padEnd(20)} price=${JSON.stringify(it.price).padEnd(15)} typeof=${typeof it.price}`);
  });

  console.log("\nArray completo após normalização:");
  console.log(itemsNormalizados);

  console.log(`\nSanidade: items originais ainda têm 13 elementos? ${itemsOriginais.length === 13}`);
  console.log(`Sanidade: primeiro item original (Tênis) ainda com price=199.9? ${itemsOriginais[0].price === 199.9}`);
}

module.exports = { normalizarPrecos, normalizarPreco };
