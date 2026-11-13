# Contas novas dentro de `{}`

**Situação:** item 2 da fila combinada em 10/11/2026. Você aprovou a análise e a ordem; falta o "pode fazer".

## Hoje

O que vale dentro das chaves está no [capítulo 5](../guia/05-componentes.md#o-que-vale-dentro-das-chaves): as quatro operações, `%`, `^`, e as funções `sin`, `cos`, `tan`, `atan2`, `sqrt`, `abs`, `min`, `max`, `floor`, `ceil`, `round`, `pow`, `lerp`, `clamp`, `dist` e `rand`.

## O que entra

| Conta | O que faz | Exemplo |
|---|---|---|
| `smoothstep(a,b,x)` | vai de 0 a 1, suave, enquanto `x` anda de `a` até `b`. Antes de `a` dá 0; depois de `b` dá 1 | `{smoothstep(10,20,i)}` sobe devagar entre 10 e 20 |
| `<` `<=` `>` `>=` `==` `!=` | comparam e dão 1 (verdade) ou 0 (falso) | `{i>=12}` dá 0 até 11 e 1 a partir de 12 |
| `c ? a : b` | se `c` não é 0, dá `a`; se é 0, dá `b` | `{i<6 ? 0 : 30}` |
| `mod(x,n)` | o resto que nunca sai negativo | `{mod(-3,12)}` dá 9 |

## Por quê
- **O `%` de hoje** dá resto negativo quando o número é negativo (o guia já avisa: `{-7%3}` dá −1). Por exemplo, `(f-3)%12` dá −3 quando `f` é 0. O `mod()` resolve isso sem mudar o `%`.
- **Comparações e `? :`:** hoje, para "ligar a partir do 12", é preciso inventar contas com `clamp` e `floor`.
- **`smoothstep`:** começo e fim suaves sem escrever a fórmula.

## Cuidados
- Nenhuma conta que já existe muda de resultado. O `%` continua igual.
- Conferir que `<` e `>` dentro de `{}` não confundem o leitor da linha.
- Conferir em que outros lugares as contas são lidas, para as novas valerem lá também.

## No Weasel e no jogo
- **Weasel:** só o leitor de contas (js/lang.js, a tabela `FN` e os operadores).
- **Jogo:** nada muda. As contas viram números antes da exportação.
