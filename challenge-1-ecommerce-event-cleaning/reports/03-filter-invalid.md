# Relatório Técnico: Questão 3

**Tema:** Remover do array `items` os produtos que não atendem aos critérios de validade do enunciado.

---

## 1. Descrição do problema

Após Q1 (deduplicação) e Q2 (normalização de preços), o array contém 10 itens. Pelo enunciado, um item só é **válido** se as três condições abaixo forem **todas** verdadeiras:

1. `item_id` existe e **não está vazio**;
2. `price` é número válido e **maior que zero**;
3. `quantity` existe e é **maior que zero**.

Itens inválidos contaminam métricas de receita e contagem de pedidos no destino (GA4, BigQuery), além de poderem disparar alertas falsos. Precisam ser eliminados antes do envio.

Os candidatos a remoção identificados na inspeção visual:

| Item             | `item_id`        | `price` | `quantity` | Motivo de rejeição esperado    |
|------------------|------------------|---------|------------|-------------------------------|
| Vinho Espanhol   | `PRD_ALIM_456`   | `350.9` | (ausente)  | `quantity` ausente            |
| Vinho Italiano   | `PRD_ALIM_789`   | `null`  | `2`        | `price` inválido              |
| Capa de chuva    | `""` (vazio)     | `39.9`  | `1`        | `item_id` vazio               |

## 2. Estratégia utilizada

A operação é um **filtro com predicado composto**: cada item passa por três checagens (uma por critério do enunciado), e só sobrevive se atender a todas. A solução em JavaScript foi dividida em duas peças:

- **`ehItemValido(item)`**: predicado que retorna `true`/`false`. Cada um dos três critérios é avaliado em uma variável booleana separada (`itemIdValido`, `precoValido`, `quantidadeValida`) para que cada regra seja independentemente legível e auditável. O retorno final é o `AND` lógico das três.
- **`filtrarInvalidos(items)`**: aplica `Array.prototype.filter` com esse predicado e devolve um novo array. Em seguida, `Array.prototype.map` clona cada sobrevivente via `{ ...item }` para manter o padrão "função sempre retorna estruturas novas", consistente com Q1 e Q2.

Cada checagem foi escrita defensivamente:

- **`item_id`**: `typeof === 'string' && item_id.trim() !== ''` cobre simultaneamente os casos de `undefined`, `null`, string vazia e string só com espaços.
- **`price`**: `typeof === 'number' && Number.isFinite() && > 0`. O `Number.isFinite` rejeita `NaN` e `Infinity` (que tecnicamente são `number`); o `> 0` rejeita zero e negativos.
- **`quantity`**: mesma estrutura defensiva do `price`.

Foi adicionado também um helper auxiliar `motivosDeRejeicao(item)`, usado **apenas no bloco de demonstração**, que descreve por que cada item foi descartado, útil para auditoria visual no console. Não faz parte da função exigida pelo enunciado.

## 3. Métodos e recursos do JavaScript aplicados

| Recurso                       | Papel na solução                                                       |
|-------------------------------|------------------------------------------------------------------------|
| `Array.prototype.filter`      | Aplica o predicado `ehItemValido` e devolve novo array com os itens aprovados. |
| `Array.prototype.map`         | Clona cada item sobrevivente via spread.                               |
| Spread em objeto (`{ ...item }`) | Cria novos objetos para o array de saída, isolando-os dos originais. |
| `typeof`                      | Discrimina tipos antes de comparar valores (evita `null > 0` ser falsamente `false` por motivo errado, ou `'5' > 0` ser truthy). |
| `String.prototype.trim`       | Garante que `"   "` seja tratado como vazio.                           |
| `Number.isFinite`             | Rejeita `NaN`/`Infinity`/`null`/`undefined` num único método.          |
| Composição booleana (`&&`)    | Junta os três critérios em um único `return`.                          |
| CommonJS (`require`/`module.exports`) | Importa `removerDuplicados` (Q1) e `normalizarPrecos` (Q2) para encadear o pipeline; exporta `filtrarInvalidos` para a Q4. |

Complexidade: **O(n)** em tempo (uma passada com filter, uma passada com map sobre um subconjunto), **O(n)** em espaço.

## 4. Como a solução garante a corretude do resultado

- **Cobertura completa dos critérios.** Cada um dos três critérios do enunciado mapeia 1-para-1 com uma variável booleana no predicado, e o `AND` final é o que o enunciado pede ("um item só é válido se..."). Não há regra implícita ou condição suprimida.
- **Resultado verificável.** Ao executar `node 03-filter-invalid.js`:
  - Itens entrando: **10**
  - Itens válidos: **7**
  - Itens rejeitados: **3**: Vinho Espanhol (`quantity` ausente), Vinho Italiano (`price: null`), Capa de chuva (`item_id` vazio).
  - Cada rejeição é impressa com o motivo, batendo exatamente com a inspeção visual da Tabela acima.
- **Não mutação do original.** `Array.filter` e `Array.map` retornam novos arrays; o spread cria novos objetos. O bloco de demonstração imprime ao final: `items originais ainda têm 13 elementos? true`.
- **Saída pronta para a Questão 4.** Os 7 sobreviventes têm `price` (number > 0) e `quantity` (number > 0), exatamente os campos que a Q4 multiplica para calcular o valor total. Não há possibilidade de `NaN` ou `undefined` propagando para a soma.
