# Relatório Técnico: Questão 2

**Tema:** Normalizar todos os preços do array `items` para o tipo `number` decimal.

---

## 1. Descrição do problema

Após a Questão 1 ter eliminado as duplicatas, restaram 10 itens, e o campo `price` aparece em **seis formatos diferentes**:

| Formato                              | Exemplo no dataset    | `typeof` antes |
|--------------------------------------|-----------------------|----------------|
| Número decimal direto                | `199.90`              | `number`       |
| String formato BR com separador de milhar | `"2.015,90"`     | `string`       |
| String formato BR sem milhar         | `"1725,50"`           | `string`       |
| String formato US                    | `"1250.90"`           | `string`       |
| String com símbolo `R$`              | `"R$ 341,90"`         | `string`       |
| String com símbolo `€`               | `"€ 215,90"`          | `string`       |
| Ausência de valor                    | `null` (Vinho Italiano) | `object`     |

O destino dos dados (relatórios, BigQuery, GA4) espera `number` em todos os casos. Sem essa padronização, qualquer soma ou agregação posterior quebra com `NaN` ou string concatenation.

## 2. Estratégia utilizada

Dividi o problema em duas funções com responsabilidades separadas:

- **`normalizarPreco(valor)`**: recebe **um único valor** e devolve `number` ou `null`. Concentra toda a lógica de detecção de formato.
- **`normalizarPrecos(items)`**: recebe o array, percorre com `Array.map`, aplica `normalizarPreco` no campo `price` de cada item e devolve um novo array com novos objetos.

A função interna trata cada caso na ordem mais econômica:

1. **Se já é `number`**, devolve imediatamente (evita trabalho desnecessário). Confere `Number.isFinite` para descartar `NaN` e `Infinity`.
2. **Se não é `number` nem `string`** (cobre `null`, `undefined`, booleanos, objetos), devolve `null`. A Q3 decide o que fazer com itens nulos.
3. **Se é `string`**, executa três passos:
   - Remove tudo que não for dígito, ponto, vírgula ou sinal (`replace(/[^\d.,-]/g, "")`). Isso descarta `R$`, `€`, espaços e qualquer ruído.
   - **Detecta o formato** comparando as posições do último ponto e da última vírgula:
     - Se aparecem ambos e a vírgula vem **depois** do ponto → formato BR (`2.015,90`): pontos viram nada, vírgula vira ponto.
     - Se aparecem ambos e o ponto vem **depois** da vírgula → formato US com milhar (`2,015.90`): vírgulas viram nada.
     - Se aparece **só vírgula** → vírgula é decimal (formato BR `1725,50`).
     - Se aparece **só ponto** ou nenhum → `parseFloat` lida direto.
   - Aplica `parseFloat`. Se sair `NaN`, devolve `null`.

A heurística "o último separador é o decimal" cobre os dois formatos comuns sem precisar adivinhar a intenção do remetente. Funciona para todos os casos do dataset.

**Decisão de escopo:** itens com `price` inconversível ficam com `price: null` mas **permanecem no array**. A remoção é responsabilidade da Q3. Esse é o princípio de uma função, uma responsabilidade, que facilita testar e raciocinar sobre cada etapa do pipeline.

## 3. Métodos e recursos do JavaScript aplicados

| Recurso                       | Papel na solução                                                       |
|-------------------------------|------------------------------------------------------------------------|
| `typeof`                      | Discrimina entre `number`, `string` e demais tipos no início da função.|
| `Number.isFinite`             | Garante que valores `NaN`/`Infinity` (tipo `number`, mas inválidos) caiam em `null`. |
| `String.prototype.replace` com regex | Limpa caracteres não numéricos e troca separadores conforme o formato detectado. |
| `String.prototype.lastIndexOf`| Identifica posições de `.` e `,` para detectar BR vs. US.              |
| `parseFloat`                  | Conversão final da string sanitizada para `number`.                    |
| `Array.prototype.map`         | Itera o array de entrada produzindo um novo array.                     |
| Spread em objeto (`{ ...item }`) | Cria novo objeto por item, sobrescrevendo apenas `price`.           |
| CommonJS (`require`/`module.exports`) | Importa `removerDuplicados` da Q1 (pipeline encadeado) e exporta a função para a Q3. |

Complexidade: **O(n)** em tempo (cada item é processado uma vez; o regex e o parse são O(k) no tamanho da string, considerado constante para preços de e-commerce) e **O(n)** em espaço (novo array de saída).

## 4. Como a solução garante a corretude do resultado

- **Cobertura completa dos formatos do dataset.** Os seis padrões observados foram validados na execução:

| Entrada           | Saída    | Tipo final |
|-------------------|----------|------------|
| `199.90` (number) | `199.9`  | `number`   |
| `"2.015,90"`      | `2015.9` | `number`   |
| `"1725,50"`       | `1725.5` | `number`   |
| `"1250.90"`       | `1250.9` | `number`   |
| `"R$ 341,90"`     | `341.9`  | `number`   |
| `"€ 215,90"`      | `215.9`  | `number`   |
| `null`            | `null`   | `object`   |

> **Nota cosmética:** o `console.log` imprime `199.9` em vez de `199.90` porque, em JS, `199.9 === 199.90` (são o mesmo `number`; o zero à direita é representação visual, não dado). A formatação com casas fixas é decisão de exibição, não de valor, e será aplicada apenas no resultado final da Q4 com `toFixed(2)`.

- **Não mutação do original.** `Array.map` cria um novo array; `{ ...item }` cria um novo objeto por item. O bloco de demonstração imprime ao final:
  - `items originais ainda têm 13 elementos? true`
  - `primeiro item original (Tênis) ainda com price=199.9? true`
- **Determinismo.** A função não depende de variáveis externas, data/hora ou aleatoriedade. Mesma entrada → mesma saída sempre.
- **Saída pronta para a Questão 3.** Todos os preços que puderam ser convertidos viraram `number`; o único `null` (Vinho Italiano) é o sinal explícito de "este item não tem preço válido", que a Q3 vai capturar.
