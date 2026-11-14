# Contas novas dentro de `{}`

**Situação:** feito na 1.38.0 (14/11/2026). Item 2 da fila combinada em 10/11/2026. O que ficou está no [capítulo 5 do guia](../guia/05-componentes.md#o-que-vale-dentro-das-chaves) e em [Como ficou](#como-ficou-1380), no fim deste arquivo.

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

## Como ficou (1.38.0)

- **A ordem das contas**, da que vale menos para a que vale mais: `c ? a : b`; `==` e `!=`; `<` `<=` `>` `>=`; `+` e `-`; `*` `/` e `%`; o sinal; `^`. É a mesma ordem das linguagens de programação: `{i+1<5}` é `(i+1)<5`, e `{i<6 ? 0 : 30}` não precisa de parênteses.
- **As escolhas que não foram perguntadas** (dá para mudar qualquer uma):
  - `==` compara exato (`{0.1+0.2==0.3}` dá 0, como em qualquer linguagem).
  - No `? :`, as duas contas são feitas, e vale a que o `c` escolhe. Assim, um erro de digitação na conta que não foi escolhida também aparece.
  - Um `? :` dentro do outro vale da direita para a esquerda: `{i<4 ? 10 : i<8 ? 20 : 30}`.
  - Não entraram `!`, `&&` e `||`. O guia mostra o "e" (multiplicar), o "ou" (`max`) e o "não" (`1-`).
  - `smoothstep` com `a` maior que `b` vai de 1 a 0; com `a` igual a `b`, vira um degrau (0 antes, 1 a partir dele).
  - `mod` com `n` negativo segue o sinal do `n` (`mod(5,-3)` dá −1), e `mod(x,0)` é erro, como o `x%0`.
- **Os erros novos:** `{i=12}` diz "para comparar, use == (dois iguais)"; `{1 ? 2}` diz que falta o ":"; `smoothstep` e `mod` com números de menos dizem quantos precisam (como o `dist` já fazia).
- **O leitor da linha:** a linha já respeitava as chaves no espaço, no `=`, no `:` e no `#`. Faltavam o colorido do editor, a troca de nomes ao colar e o completar, que achavam o `=` de `{i>=12}` e tratavam a palavra como atributo. Agora eles também procuram o `=` fora das chaves.
- **Onde as contas valem:** todas passam pelo mesmo leitor (os números, os pontos, o `let`, os limites do `repeat`, os parâmetros do `use` e as `key`), então as novas valem em todos.
- **Testes:** o caso `contas` (um desenho com todas elas, inclusive nas `key`) e a conferência `_contas`, que confere que as contas de antes dão o mesmo resultado e grava as novas e os erros delas.
