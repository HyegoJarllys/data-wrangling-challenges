/**
 * QUESTÃO 4: Calcular o valor total do pedido
 *
 * Problema:
 *   O campo `value` do objeto compra está vindo como `undefined`,
 *   o site não conseguiu calcular o total da compra. Sem esse valor,
 *   os relatórios de receita não recebem o dado e quebram.
 *
 *   É preciso calcular o total a partir dos itens VÁLIDOS (saída da
 *   Q3), somando preço × quantidade de cada um, e adicionando tax
 *   e shipping ao final. O resultado deve ser um `number`.
 *
 *   Fórmula:
 *       value = (Σ price_i × quantity_i)  +  tax  +  shipping
 *
 * Estratégia:
 *   Array.prototype.reduce faz a soma agregada de price × quantity
 *   ao longo do array. Em seguida, somam-se tax e shipping. O
 *   arredondamento monetário a 2 casas é aplicado uma única vez no
 *   final; aplicar a cada parcela acumularia erros de arredondamento,
 *   aplicar só ao final preserva a precisão durante a soma.
 *
 * Por que arredondar?
 *   Aritmética de ponto flutuante (IEEE 754) produz ruído: 0.1 + 0.2
 *   dá 0.30000000000000004, não 0.3. Para um campo `value` de
 *   relatório monetário, isso vira lixo visual e pode disparar
 *   mismatches em sistemas downstream que comparam totais com
 *   igualdade. Arredondar a 2 casas no final resolve.
 */

const { compra } = require("./data/compra.js");
const { removerDuplicados } = require("./01-deduplicate.js");
const { normalizarPrecos } = require("./02-normalize-prices.js");
const { filtrarInvalidos } = require("./03-filter-invalid.js");

/**
 * Arredonda um número para 2 casas decimais, mantendo o tipo number.
 * Multiplicar por 100, arredondar para inteiro mais próximo, dividir
 * por 100: padrão idiomático em JS para arredondamento monetário.
 *
 * @param {number} n
 * @returns {number}
 */
function arredondarMonetario(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Garante que um valor numérico opcional (tax, shipping) seja tratado
 * como 0 quando vier null, undefined ou inválido. Evita NaN propagando
 * para o resultado final.
 *
 * @param {*} valor
 * @returns {number}
 */
function numeroOuZero(valor) {
  return Number.isFinite(valor) ? valor : 0;
}

/**
 * Calcula o valor total da compra.
 *
 * Premissa: o array `items` já passou por Q1, Q2 e Q3; todos os
 * elementos têm price (number > 0) e quantity (number > 0).
 *
 * @param {Array<Object>} items - Itens válidos do pedido.
 * @param {number} tax - Valor de imposto (BRL).
 * @param {number} shipping - Valor do frete (BRL).
 * @returns {number} Valor total arredondado a 2 casas decimais.
 */
function calcularValorTotal(items, tax, shipping) {
  // Soma price × quantity de cada item. O acumulador começa em 0.
  // Passar o 0 explicitamente é importante: sem isso, o reduce usaria
  // o primeiro elemento do array como acumulador inicial, o que daria
  // erro sutil se o array vier vazio ou começar com estrutura diferente.
  const subtotalItens = items.reduce((soma, item) => {
    return soma + item.price * item.quantity;
  }, 0);

  // Soma tax e shipping ao subtotal. numeroOuZero protege contra
  // entradas null/undefined/NaN que bagunçariam o total.
  const total = subtotalItens + numeroOuZero(tax) + numeroOuZero(shipping);

  // Arredondamento monetário aplicado UMA VEZ, no final. Aplicar a
  // cada parcela introduziria erros acumulados; aplicar só no fim
  // mantém precisão máxima durante a soma.
  return arredondarMonetario(total);
}

if (require.main === module) {
  // Pipeline encadeado completo: original → Q1 → Q2 → Q3 → Q4.
  const itemsOriginais = compra.ecommerce.purchase.items;
  const itemsSemDuplicatas = removerDuplicados(itemsOriginais);
  const itemsNormalizados = normalizarPrecos(itemsSemDuplicatas);
  const itemsValidos = filtrarInvalidos(itemsNormalizados);

  const { tax, shipping } = compra.ecommerce.purchase.actionField;

  const valueCalculado = calcularValorTotal(itemsValidos, tax, shipping);

  console.log("=== Questão 4: Calcular valor total do pedido ===\n");
  console.log(`Itens considerados (saída da Q3): ${itemsValidos.length}\n`);

  console.log("Detalhamento item por item:");
  let subtotalAuditoria = 0;
  itemsValidos.forEach((item) => {
    const subtotal = item.price * item.quantity;
    subtotalAuditoria += subtotal;
    console.log(
      `  ${item.item_name.padEnd(20)} ${String(item.price).padStart(8)} x ${item.quantity} = ${subtotal.toFixed(2).padStart(10)}`
    );
  });

  console.log(`\n  Subtotal dos itens:        ${arredondarMonetario(subtotalAuditoria).toFixed(2).padStart(10)}`);
  console.log(`  + tax:                     ${tax.toFixed(2).padStart(10)}`);
  console.log(`  + shipping:                ${shipping.toFixed(2).padStart(10)}`);
  console.log(`  ───────────────────────────────────────`);
  console.log(`  VALUE total (calculado):   ${valueCalculado.toFixed(2).padStart(10)}`);

  console.log(`\nvalue retornado pela função (number): ${valueCalculado}`);
  console.log(`typeof: ${typeof valueCalculado}`);

  console.log(
    `\nSanidade: items originais ainda têm 13 elementos? ${itemsOriginais.length === 13}`
  );
  console.log(
    `Sanidade: value original ainda é undefined? ${compra.ecommerce.purchase.actionField.value === undefined}`
  );
}

module.exports = { calcularValorTotal };
