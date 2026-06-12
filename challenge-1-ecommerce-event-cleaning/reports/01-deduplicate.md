# Relatório Técnico: Questão 1

**Tema:** Remover produtos duplicados do array `items` com base no `item_id`.

---

## 1. Descrição do problema

O objeto de compra capturado pelo site contém um array `items` com **13 produtos**, e três deles aparecem repetidos com o mesmo `item_id`:

| `item_id`         | Nome             | Aparições |
|-------------------|------------------|-----------|
| `PRD_VEST_123`    | Tênis            | 2x        |
| `PRD_ELETRO_123`  | Celular          | 2x        |
| `PRD_ALIM_456`    | Vinho Espanhol   | 2x        |

Se o evento for enviado nesse estado para os relatórios (GA4, BigQuery, etc.), as métricas de quantidade vendida e receita ficarão infladas. A função precisa devolver um **novo** array contendo apenas a **primeira ocorrência** de cada `item_id`, sem alterar o objeto original.

## 2. Estratégia utilizada

A operação é uma deduplicação clássica com regra "manter a primeira ocorrência", operação canônica de qualquer pipeline de tratamento de dados.

A solução em JavaScript combina duas estruturas:

1. Um **`Set`** para registrar os `item_id` já encontrados durante a varredura.
2. **`Array.prototype.filter`** para percorrer o array uma única vez e produzir um novo array contendo apenas os itens cujo `item_id` ainda não está no `Set`.

A varredura é feita da esquerda para a direita, então a primeira ocorrência de cada `item_id` é sempre a que sobrevive, exatamente o comportamento pedido.

Após o filtro, cada item sobrevivente é clonado de forma rasa (`{ ...item }`) antes de entrar no array de saída. Isso garante que as funções das próximas questões (que vão modificar campos como `price`) não toquem nas referências originais armazenadas em `dados/compra.js`.

## 3. Métodos e recursos do JavaScript aplicados

| Recurso                      | Papel na solução                                                                 |
|------------------------------|----------------------------------------------------------------------------------|
| `Set`                        | Memória de IDs já processados. Operações `.has()` e `.add()` são O(1).           |
| `Array.prototype.filter`     | Percorre o array original e devolve um novo array contendo apenas os elementos aprovados pelo predicado, sem mutar a entrada. |
| `Array.prototype.map`        | Aplica o clone raso `{ ...item }` em cada sobrevivente, criando objetos novos.    |
| Spread em objeto (`{ ...x }`)| Cria uma cópia rasa do item, isolando os objetos do array de saída dos originais.|
| CommonJS (`require`/`module.exports`) | Importa o objeto `compra` do arquivo `dados/compra.js` e exporta a função para a Questão 2 reutilizar. |
| `require.main === module`    | Idioma padrão do Node.js para executar o bloco de demonstração apenas quando o arquivo é rodado direto, evitando poluir o output das questões seguintes. |

Complexidade total: **O(n)** em tempo e **O(n)** em espaço (no pior caso, todos os IDs são únicos e entram no `Set`).

## 4. Como a solução garante a corretude do resultado

- **Não mutação do original:** `Array.prototype.filter` e `Array.prototype.map` retornam **novos arrays**; o spread `{ ...item }` cria **novos objetos**. Em momento algum o array `compra.ecommerce.purchase.items` é tocado. O bloco de demonstração imprime, ao final, `items originais ainda têm 13 elementos? true`, evidenciando isso.
- **Primeira ocorrência preservada:** o `filter` percorre o array em ordem; o `Set` só recebe um `item_id` na primeira vez que ele aparece, então qualquer ocorrência subsequente é descartada. A ordem original dos itens únicos é mantida (não há reordenação).
- **Resultado verificável:** rodando `node 01-deduplicate.js`, o output é determinístico:
  - Itens originais: **13**
  - Itens após remoção: **10**
  - Duplicatas removidas: **3** (uma de cada `item_id` repetido: Tênis, Celular e Vinho Espanhol)
- **Saída pronta para a Questão 2:** o array devolvido contém objetos novos, completamente desacoplados dos originais. A Q2 pode reescrever `price` sem causar efeitos colaterais.
