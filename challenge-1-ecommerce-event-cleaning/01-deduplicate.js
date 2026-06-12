/**
 * QUESTÃO 1: Remover produtos duplicados por item_id
 *
 * Problema:
 *   O array `items` contém produtos repetidos com o mesmo `item_id`
 *   (ex.: PRD_VEST_123 aparece 2x). É preciso garantir que cada
 *   `item_id` apareça apenas uma vez, mantendo a PRIMEIRA ocorrência
 *   e devolvendo um NOVO array (sem mutar o original).
 *
 * Estratégia:
 *   Usar um Set como "memória" dos item_id já vistos enquanto
 *   percorremos o array com Array.prototype.filter. Set tem busca
 *   O(1), então o filtro inteiro roda em O(n), escalável caso o
 *   array cresça em produção.
 */

const { compra } = require("./data/compra.js");

/**
 * Remove itens duplicados pelo campo item_id, mantendo a primeira ocorrência.
 *
 * @param {Array<Object>} items - Array original de produtos.
 * @returns {Array<Object>} Novo array, sem duplicatas, com itens clonados (raso)
 *                          para impedir mutação acidental do objeto original
 *                          nas etapas seguintes do pipeline.
 */
function removerDuplicados(items) {
  // "idsVistos" funciona como o índice de uma tabela: guarda os item_id
  // que já encontramos. Set foi escolhido em vez de Array porque .has()
  // é O(1) no Set e O(n) no Array; com 13 itens hoje a diferença não dói,
  // mas mantém a função escalável caso a avaliador rode com um array maior.
  const idsVistos = new Set();

  // .filter() já devolve um novo array, não mexe no original. Para cada
  // item: se o item_id ainda não foi visto, registra e mantém; se já foi
  // visto, descarta. O return false/true é o "WHERE" do filter.
  return items
    .filter((item) => {
      if (idsVistos.has(item.item_id)) {
        return false;
      }
      idsVistos.add(item.item_id);
      return true;
    })
    // Clone raso de cada item ({...item}) para garantir que as funções
    // das próximas questões (que vão alterar campos como `price`) não
    // toquem nos objetos originais armazenados em dados/compra.js.
    .map((item) => ({ ...item }));
}

// Bloco de demonstração: só executa quando o arquivo é rodado direto
// (`node questao1.js`). Não roda quando outro arquivo faz `require`.
// Isso evita que a Q2 receba esses console.log sujando o output.
if (require.main === module) {
  const itemsOriginais = compra.ecommerce.purchase.items;
  const itemsSemDuplicatas = removerDuplicados(itemsOriginais);

  console.log("=== Questão 1: Remover duplicados por item_id ===\n");
  console.log(`Itens originais: ${itemsOriginais.length}`);
  console.log(`Itens após remoção: ${itemsSemDuplicatas.length}`);
  console.log(`Duplicatas removidas: ${itemsOriginais.length - itemsSemDuplicatas.length}\n`);
  console.log("Array resultante:");
  console.log(itemsSemDuplicatas);

  // Sanidade: confirma que o objeto original NÃO foi alterado.
  console.log(`\nSanidade: items originais ainda têm ${itemsOriginais.length} elementos? ${itemsOriginais.length === 13}`);
}

module.exports = { removerDuplicados };
