# Transições entre duas animações

**Situação:** item 4 da fila combinada em 10/11/2026. Você aprovou a análise e a ordem; falta o "pode fazer". Em 13/11/2026 o plano passou a valer para quaisquer duas animações, e não só para galope → pisca. Você também decide se os quadros extras na sprite sheet valem a pena.

**Origem:** capivara #4: passar do galope para a pose parada sem pular.

## O problema

Hoje, trocar de animação é sempre um corte seco: num quadro a capivara está esticada no galope; no seguinte, está parada. Isso vale no filme, no Godot por quadros e no Godot com esqueleto. Desenhar a transição à mão dá trabalho e quebra quando o galope muda.

## Qualquer animação para qualquer animação

`from=` e `to=` aceitam quaisquer duas animações. O que muda de um par para outro é o custo, e ele depende de onde a transição roda:

| Onde | Hoje | Proposta | Custo |
|---|---|---|---|
| **Filme** | corte seco | misturar na hora: `at 5s capivara.anim=pisca blend=0.4s` | nenhum quadro novo; qualquer par, sem declarar nada |
| **Godot com esqueleto** (`rig=bones`) | `tocar()` troca seco | o Godot já sabe misturar duas animações (`play(nome, tempo_de_mistura)`); o `tocar()` ganharia esse tempo | nenhum quadro novo; qualquer par |
| **Godot por quadros** (sprite sheet) | corte seco | a transição gerada: `anim para_galope from=galope to=pisca` | quadros a mais na folha, só para os pares declarados |

- Gerar quadros só é necessário na sprite sheet.
- Lá, **não** gerar todos os pares sozinho: com 10 animações seriam 90 pares, cada um com várias peças. Você declara só as transições que o jogo usa.
- No filme, o `blend=` resolve qualquer troca. Um `via=para_galope` só faria sentido para usar no filme exatamente os mesmos quadros do jogo.

## A transição gerada (sprite sheet)

```
anim para_galope from=galope to=pisca frames=5
```

- O Weasel gera os quadros do meio: parte de um quadro do galope e chega no `pisca` em 5 quadros.
- Uma **peça** é uma dessas sequências. Os nomes: `para_galope_0_right`, `para_galope_2_right`… (o número é o quadro de onde ela parte).
- **Sair da pose parada e voltar a galopar:** é a mesma peça tocada de trás para a frente. Não precisa de quadros novos.

### Quantas peças cada par gera

Depende de como a animação de saída termina:

| De | Para | Exemplo | Peças |
|---|---|---|---|
| loop | pose ou começo de outra | galope → pisca | **várias**: o jogo pode parar em qualquer quadro, então há uma peça a cada `every=` quadros (`every=2` por padrão) |
| `once` | qualquer uma | ataque → parado | **uma só**: a animação `once` sempre acaba no mesmo quadro |
| loop | outro loop | anda → trote | **muitas vezes nenhuma**: a troca na mesma fase (`phase`, do [ajudante do Godot](ajudante-godot.md)) já resolve. Só quando as passadas são muito diferentes (trote → galope) valem peças que vão mirando o loop novo enquanto ele anda |
| `once` interrompida no meio | qualquer uma | levar um golpe durante o ataque | como o loop: várias peças |

### O que é misturado em cada quadro

O Weasel já faz quase tudo isso no `mix=` (js/lang.js, `mixAnim`): lê qualquer animação em qualquer tempo e mistura ossos, números e cores. A transição usaria o mesmo caminho. O `blend=` do filme mistura do mesmo jeito, só que na hora.
- **Ossos e números** (posição, ângulo, escala, opacidade): vão aos poucos. O giro vai pelo lado mais curto, para não dar uma volta inteira.
- **Cores:** vão aos poucos.
- **Liga e desliga** (`show`, `above`, a ordem): trocam no meio.
- **Morph de uma forma em outra:**
  - se as duas combinam (mesmo tipo e número de pontos), a forma vai aos poucos;
  - se não combinam, troca no meio, como a troca de boca das [bocas por texto](bocas-por-texto.md).
- **Eventos:** não entram.
- **Cuidados:**
  - o que é simulado (balanço, tecido, partículas) pode dar um tranco na transição; testar na capivara;
  - os pés com `feet=` podem escorregar durante a mistura, porque não há como garantir os dois ritmos ao mesmo tempo.

## No Godot (o ajudante)

- `trocar(de, para)` no lugar do `parar("galope", "pisca")` do plano antigo:
  - **por quadros:** escolhe a peça certa pelo quadro atual de `de` e, no fim dela, toca `para`;
  - **com esqueleto:** só mistura as duas animações.
- Depende do [ajudante do Godot](ajudante-godot.md) (item 1 da fila).

## O custo na folha

- Cada peça são `frames=` quadros a mais na sprite sheet. Um galope de 12 quadros com `every=2` dá 6 peças × 5 quadros = 30 quadros.
- Uma saída de `once` custa só uma peça.
- Só você pode julgar, olhando o jogo, se compensa. Um `every=` maior gera menos peças, com uma transição menos exata.

## No Weasel e no jogo

- **Weasel:**
  - um jeito novo de `anim` (com `from=` e `to=`);
  - `blend=` no `at … anim=` do filme;
  - as animações existentes não mudam, e quem não usar nada disso continua com o corte seco de hoje.
- **Jogo:**
  - só quem declarar transições ganha quadros novos na folha;
  - com esqueleto, a mistura não aumenta nada;
  - os jogos que não usarem `trocar()` não mudam.

## Para decidir

1. O nome no filme: `blend=0.4s` ou outro?
2. O `every=` padrão (2?) e o número de quadros de cada peça.
3. Se compensa gerar peças para a capivara, olhando o tamanho da folha.
