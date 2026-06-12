/**
 * QUESTÃO 3: Remover produtos inválidos
 *
 * Problema:
 *   Após Q1 (deduplicação) e Q2 (normalização de preços), o array
 *   ainda contém itens com dados incompletos ou inválidos. Pelo
 *   enunciado, um item é VÁLIDO somente se as três condições abaixo
 *   forem todas verdadeiras:
 *     - item_id existir e não estiver vazio
 *     - price for número válido e maior que zero
 *     - quantity existir e for maior que zero
 *
 * Estratégia:
 *   Array.filter com um predicado booleano que combina as três
 *   condições do enunciado. Para manter as regras legíveis e
 *   auditáveis, cada critério é avaliado em sua própria variável
 *   booleana (itemIdValido, precoValido, quantidadeValida) antes
 *   da composição final com AND lógico.
 */

const { compra } = require("./data/compra.js");
const { removerDuplicados } = require("./01-deduplicate.js");
const { normalizarPrecos } = require("./02-normalize-prices.js");

/**
 * Avalia se um único item atende aos três critérios de validade.
 *
 * @param {Object} item
 * @returns {boolean}
 */
function ehItemValido(item) {
  // Critério 1: item_id existe e não é string vazia (mesmo após trim,
  // para descartar valores como " " que existem mas não identificam nada).
  // typeof === 'string' já garante que não é null nem undefined.
  const itemIdValido =
    typeof item.item_id === "string" && item.item_id.trim() !== "";

  // Critério 2: price é número finito (descarta NaN, Infinity, null,
  // undefined e strings) e estritamente maior que zero (descarta 0,
  // negativos e o null que sobreviveu da Q2).
  const precoValido =
    typeof item.price === "number" &&
    Number.isFinite(item.price) &&
    item.price > 0;

  // Critério 3: quantity existe e é número finito > 0. Cobre os casos
  // de quantity ausente (typeof undefined !== 'number') e quantity
  // zero ou negativa.
  const quantidadeValida =
    typeof item.quantity === "number" &&
    Number.isFinite(item.quantity) &&
    item.quantity > 0;

  return itemIdValido && precoValido && quantidadeValida;
}

/**
 * Devolve um NOVO array contendo apenas os itens que passam em todas
 * as regras de ehItemValido. Os objetos sobreviventes são clonados
 * (raso) por consistência com o padrão das fases anteriores; assim
 * a Q4 trabalha sobre estruturas totalmente novas, mesmo se for
 * chamada isoladamente.
 *
 * @param {Array<Object>} items
 * @returns {Array<Object>}
 */
function filtrarInvalidos(items) {
  return items.filter(ehItemValido).map((item) => ({ ...item }));
}

/**
 * Helper SÓ para demonstração: descreve por que um item foi rejeitado.
 * Não faz parte da solução exigida; serve para a auditoria visual no
 * console quando rodamos `node questao3.js`.
 *
 * @param {Object} item
 * @returns {string[]} Lista de motivos de rejeição.
 */
function motivosDeRejeicao(item) {
  const motivos = [];
  if (!(typeof item.item_id === "string" && item.item_id.trim() !== "")) {
    motivos.push("item_id ausente ou vazio");
  }
  if (
    !(
      typeof item.price === "number" &&
      Number.isFinite(item.price) &&
      item.price > 0
    )
  ) {
    motivos.push(`price inválido (valor: ${JSON.stringify(item.price)})`);
  }
  if (
    !(
      typeof item.quantity === "number" &&
      Number.isFinite(item.quantity) &&
      item.quantity > 0
    )
  ) {
    motivos.push(`quantity inválida (valor: ${JSON.stringify(item.quantity)})`);
  }
  return motivos;
}

if (require.main === module) {
  // Pipeline encadeado completo: original → Q1 → Q2 → Q3.
  const itemsOriginais = compra.ecommerce.purchase.items;
  const itemsSemDuplicatas = removerDuplicados(itemsOriginais);
  const itemsNormalizados = normalizarPrecos(itemsSemDuplicatas);
  const itemsValidos = filtrarInvalidos(itemsNormalizados);

  console.log("=== Questão 3: Remover produtos inválidos ===\n");
  console.log(`Itens entrando na Q3 (saída da Q2): ${itemsNormalizados.length}`);
  console.log(`Itens válidos após filtro:          ${itemsValidos.length}`);
  console.log(
    `Itens rejeitados:                   ${itemsNormalizados.length - itemsValidos.length}\n`
  );

  // Auditoria: lista exatamente o que foi rejeitado e por quê.
  console.log("Itens rejeitados, com motivo:");
  itemsNormalizados.forEach((item) => {
    if (!ehItemValido(item)) {
      console.log(
        `  - ${item.item_name} (item_id="${item.item_id}"): ${motivosDeRejeicao(item).join("; ")}`
      );
    }
  });

  console.log("\nArray final, apenas itens válidos:");
  console.log(itemsValidos);

  console.log(
    `\nSanidade: items originais ainda têm 13 elementos? ${itemsOriginais.length === 13}`
  );
}

module.exports = { filtrarInvalidos, ehItemValido };
