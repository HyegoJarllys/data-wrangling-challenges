# Relatório Técnico: Questão 4

**Tema:** Calcular o valor total da compra (`value`) a partir dos itens válidos, somando `tax` e `shipping`.

---

## 1. Descrição do problema

O campo `value` do objeto compra está vindo como `undefined`, o site não conseguiu calcular o total no momento da captura. Sem esse valor, os relatórios de receita não recebem o dado e quebram (GA4 mostra purchase com receita zero, BigQuery armazena `null`, etc.).

A solução é calcular o `value` no pipeline, antes do envio do evento, a partir dos itens já tratados pelas Q1, Q2 e Q3. A fórmula é:

```
value = Σ (price_i × quantity_i)  +  tax  +  shipping
```

No dataset, após Q1+Q2+Q3 sobraram **7 itens válidos**, mais `tax = 3.60` e `shipping = 5.99` (ambos em BRL).

## 2. Estratégia utilizada

A operação é uma **agregação simples**: somar `price × quantity` de cada item válido, depois acrescentar `tax` e `shipping`, e arredondar o resultado para 2 casas decimais. A solução em JavaScript foi dividida em três peças pequenas:

- **`calcularValorTotal(items, tax, shipping)`**: função principal exposta. Faz o `reduce` sobre os itens, soma `tax` e `shipping`, e retorna o total arredondado.
- **`numeroOuZero(valor)`**: helper defensivo que devolve o número se ele for finito, ou `0` caso contrário. Protege contra `tax`/`shipping` chegando como `null`/`undefined`/`NaN`, que contaminariam toda a soma.
- **`arredondarMonetario(n)`**: helper que aplica `Math.round(n * 100) / 100`, padrão idiomático para arredondar a 2 casas mantendo o tipo `number`.

A soma agregada é feita com `Array.prototype.reduce`. O acumulador inicia em `0` e cada iteração acrescenta `item.price * item.quantity`.

### Por que arredondar, e por que arredondar só uma vez

Aritmética de ponto flutuante (IEEE 754) produz pequenos erros de representação. O exemplo canônico é `0.1 + 0.2 === 0.30000000000000004`. Para um campo `value` monetário, esse "ruído" é tanto cosmeticamente ruim (relatório imprime `7632.989999...`) quanto operacionalmente perigoso (sistemas downstream que comparam totais com igualdade falham).

O arredondamento é aplicado **uma única vez, no final**, após todas as somas. Arredondar parcela por parcela acumula erros de arredondamento; arredondar só ao final mantém a precisão máxima durante a soma e descarta o ruído apenas na hora de devolver o resultado.

A escolha de `Math.round(n * 100) / 100` em vez de `Number(n.toFixed(2))` é estética: ambos chegam ao mesmo número, mas o primeiro evita uma volta `number → string → number` desnecessária.

## 3. Métodos e recursos do JavaScript aplicados

| Recurso                       | Papel na solução                                                       |
|-------------------------------|------------------------------------------------------------------------|
| `Array.prototype.reduce`      | Soma agregada de `price × quantity` ao longo do array.                 |
| Desestruturação (`const { tax, shipping } = ...`) | Extrai os campos da `actionField` em uma linha legível.   |
| `Number.isFinite`             | Detecta valores numéricos válidos (descarta `NaN`, `Infinity`, `null`, `undefined`) dentro do helper `numeroOuZero`. |
| `Math.round`                  | Núcleo do arredondamento monetário a 2 casas.                          |
| `Number.prototype.toFixed`    | Usado **apenas para impressão** no console, não para o cálculo. Garante exibição com 2 casas (ex.: `5.99` em vez de `5.99` puro, ou `399.80` em vez de `399.8`). |
| CommonJS (`require`/`module.exports`) | Importa as funções das três questões anteriores para encadear o pipeline e expõe `calcularValorTotal` como API pública do arquivo. |

Complexidade: **O(n)** em tempo (uma única passada no reduce), **O(1)** em espaço auxiliar (apenas o acumulador escalar; nenhuma estrutura intermediária é alocada).

## 4. Como a solução garante a corretude do resultado

- **Verificação aritmética manual.** Cada item válido foi auditado individualmente, e o subtotal foi conferido na execução:

| Item             | `price`  | `quantity` | Subtotal  |
|------------------|----------|------------|-----------|
| Tênis            | 199.90   | 2          | 399.80    |
| Celular          | 2015.90  | 1          | 2015.90   |
| Tablet           | 1725.50  | 1          | 1725.50   |
| Notebook         | 1673.50  | 1          | 1673.50   |
| Câmera digital   | 1250.90  | 1          | 1250.90   |
| Calça Jeans      | 341.90   | 1          | 341.90    |
| Vinho Português  | 215.90   | 1          | 215.90    |
| **Subtotal**     |          |            | **7623.40** |
| + `tax`          |          |            | 3.60      |
| + `shipping`     |          |            | 5.99      |
| **`value`**      |          |            | **7632.99** |

  A função `calcularValorTotal` retornou exatamente **`7632.99`** (`typeof === 'number'`), batendo com a soma manual.

- **Tipo correto.** O retorno é `number`, conforme o enunciado pede. Não é string, não é `NaN`, não é `Infinity`.
- **Sem ruído de ponto flutuante.** O arredondamento final via `Math.round(total * 100) / 100` garantiu saída limpa (`7632.99` em vez de algo como `7632.989999...`).
- **Defesa contra entradas patológicas.** `numeroOuZero` cuida de `tax` ou `shipping` que cheguem como `null`/`undefined`. No dataset eles vêm corretos, mas a função fica robusta contra mudanças futuras na captura.
- **Não mutação do original.** A função apenas lê os campos de cada item e dos parâmetros, nunca atribui. O bloco de demonstração imprime ao final:
  - `items originais ainda têm 13 elementos? true`
  - `value original ainda é undefined? true`
- **Premissa explícita.** A função assume que o array de entrada já passou por Q1+Q2+Q3 (sem duplicatas, com `price` numérico positivo, com `quantity` numérica positiva). Essa premissa está documentada no JSDoc da função.
