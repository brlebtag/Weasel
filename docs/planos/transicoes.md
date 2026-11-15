# Transições entre duas animações

**Situação:** item 4 da fila combinada em 10/11/2026. Você aprovou a análise e a ordem. Em 13/11/2026 o plano passou a valer para quaisquer duas animações, e não só para galope → pisca. Em 15/11/2026 você fechou as decisões (veja [Decidido](#decidido-15112026)). A etapa 1 (`blend=` no filme) foi feita na 1.40.0 e a etapa 2 (as peças na sprite sheet) na 1.41.0; a etapa 3 espera o "pode fazer".

**Origem:** capivara #4: passar do galope para a pose parada sem pular.

## O problema

Hoje, trocar de animação é sempre um corte seco: num quadro a capivara está esticada no galope; no seguinte, está parada. Isso vale no filme, no Godot por quadros e no Godot com esqueleto. Desenhar a transição à mão dá trabalho e quebra quando o galope muda.

## Regra: nada do que existe muda

Tudo aqui é **a mais** e só liga quando você pede:
- **Sem as palavras novas, tudo sai igual, byte a byte:** PNG, GIF, WebP, vídeo, sprite sheet, `.tres`, `.tscn` e `.gd`. Os testes de regressão conferem isso: os arquivos de referência não podem mudar.
- **Nenhum arquivo de hoje usa as palavras novas** (conferido em 15/11/2026 nos exemplos, no guia e nos testes):
  - um `blend=` solto no `at` hoje é erro;
  - `from=`, `to=` e `every=` no `anim` hoje são "atributo desconhecido".
- **O `tocar()` do Godot não muda.** Ele continua chamando `play(nome)` sem tempo de mistura, então os tempos de mistura que você já acertou no AnimationPlayer do Godot continuam valendo. (O terceiro parâmetro da 1.42.0, `tocar(acao, dir, true)`, só escolhe em que ponto a nova animação começa.) A mistura entra numa função nova, `trocar()`.
- **O `.gd` ganha o `trocar()` sempre**, como as funções do [ajudante do Godot](ajudante-godot.md), feito na 1.42.0 (decidido em 15/11/2026). Função a mais não quebra nada: os jogos antigos não a chamam. Não precisa de opção na linha `godot` nem de declarar nada a mais.
- **Peças geradas nunca apagam nada:** se o nome de uma peça (`para_galope_0_right`) já for de uma animação sua, é erro com o nome em conflito; o Weasel não sobrescreve.
- **Tudo é configurável:**
  - o `blend=` vale por linha do `at`;
  - o `frames=` e o `every=` valem por transição;
  - o tempo de mistura é um parâmetro do `trocar()`.

## Qualquer animação para qualquer animação

`from=` e `to=` aceitam quaisquer duas animações. O que muda de um par para outro é o custo, e ele depende de onde a transição roda:

| Onde | Hoje | Proposta | Custo |
|---|---|---|---|
| **Filme** | corte seco | misturar na hora: `at 5s capivara.anim=pisca blend=0.4s` | nenhum quadro novo; qualquer par, sem declarar nada |
| **Godot com esqueleto** (`rig=bones`) | `tocar()` troca seco | o Godot já sabe misturar duas animações (`play(nome, tempo_de_mistura)`); a função nova `trocar()` passa esse tempo, e o `tocar()` fica como está | nenhum quadro novo; qualquer par |
| **Godot por quadros** (sprite sheet) | corte seco | a transição gerada: `anim para_galope from=galope to=pisca` | quadros a mais na folha, só para os pares declarados |

- Gerar quadros só é necessário na sprite sheet.
- Lá, **não** gerar todos os pares sozinho: com 10 animações seriam 90 pares, cada um com várias peças. Você declara só as transições que o jogo usa.
- No filme, o `blend=` resolve qualquer troca. Um `via=para_galope` só faria sentido para usar no filme exatamente os mesmos quadros do jogo.

## A transição gerada (sprite sheet)

```
anim para_galope from=galope to=pisca frames=4
```

- O Weasel gera os quadros do meio: parte de um quadro do galope e chega no `pisca` em 4 quadros (`frames=4` é o padrão; pode omitir).
- Uma **peça** é uma dessas sequências. Os nomes: `para_galope_0_right`, `para_galope_2_right`… (o número é o quadro de onde ela parte).
- **Sair da pose parada e voltar a galopar:** é a mesma peça tocada de trás para a frente. Não precisa de quadros novos.

### Quantas peças cada par gera

Depende de como a animação de saída termina:

| De | Para | Exemplo | Peças |
|---|---|---|---|
| loop | pose ou começo de outra | galope → pisca | **várias**: o jogo pode parar em qualquer quadro, então há uma peça a cada `every=` quadros (`every=2` por padrão) |
| `once` | qualquer uma | ataque → parado | **uma só**: a animação `once` sempre acaba no mesmo quadro |
| loop | outro loop | anda → trote | **muitas vezes nenhuma**: a troca na mesma fase (`phase` no filme e `tocar(acao, dir, true)` no Godot, da 1.42.0) já resolve. Só quando as passadas são muito diferentes (trote → galope) valem peças que vão mirando o loop novo enquanto ele anda |
| `once` interrompida no meio | qualquer uma | levar um golpe durante o ataque | como o loop: várias peças |

### O que é misturado em cada quadro

O Weasel já faz quase tudo isso no `mix=` (js/lang.js, `mixAnim`): lê qualquer animação em qualquer tempo e mistura ossos, números e cores. A transição usaria o mesmo caminho. O `blend=` do filme mistura do mesmo jeito, só que na hora.
- **Ossos e números** (posição, ângulo, escala, opacidade): vão aos poucos. O giro vai pelo lado mais curto, para não dar uma volta inteira.
- **Cores:** vão aos poucos.
- **Liga e desliga** (`show`, `above`, a ordem): trocam no meio.
- **Morph de uma forma em outra:**
  - se as duas animações usam as mesmas formas (a mesma troca, ou uma delas parada numa das formas), a forma vai aos poucos;
  - se não, troca no meio, como a troca de boca das [bocas por texto](bocas-por-texto.md). (Assim ficou no `blend=` da 1.40.0.)
- **Eventos:** não entram.
- **Cuidados:**
  - o que é simulado (balanço, tecido, partículas) pode dar um tranco na transição; testar na capivara;
  - os pés com `feet=` podem escorregar durante a mistura, porque não há como garantir os dois ritmos ao mesmo tempo.

## No Godot (o ajudante)

- `trocar(de, para)` no lugar do `parar("galope", "pisca")` do plano antigo:
  - **por quadros:** escolhe a peça certa pelo quadro atual de `de` e, no fim dela, toca `para`;
  - **com esqueleto:** só mistura as duas animações.
- Usa o [ajudante do Godot](ajudante-godot.md), feito na 1.42.0.

## O custo na folha

- Cada peça são `frames=` quadros a mais na sprite sheet. Um galope de 12 quadros com `every=2` dá 6 peças × 4 quadros = 24 quadros.
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
  - o `tocar()` não muda; a mistura só existe no `trocar()`, que entra no `.gd` em toda exportação, como uma função a mais (veja a [regra](#regra-nada-do-que-existe-muda));
  - os jogos que não usarem `trocar()` não mudam.

## Decidido (15/11/2026)

1. **O nome no filme:** `blend=0.4s` solto na linha do `at`, como o `ease=`. Ele vale só para as trocas de `anim=` daquela linha: `at 5s capivara.anim=pisca blend=0.4s`. O nome é o mesmo do `blend=multiply` da `layer`, mas os comandos são diferentes.
2. **Os padrões:** `every=2` e `frames=4` (uns 0,3 s a 12 fps).
3. **A capivara:** decidir depois da primeira versão, olhando quantos quadros a folha ganhou (a exportação mostra o tamanho).

## Ordem

1. O `blend=` do filme. O jogo não muda nada. **Feito na 1.40.0.**
2. As peças na sprite sheet (`anim … from= to=`), com `every=` e `frames=`. **Feito na 1.41.0**, com as escolhas de 15/11/2026: direções automáticas (`from=walk` acha `walk_right`…; o nome exato também serve), a peça chega no primeiro quadro do `to` (o jogo toca o `to` do começo), um `once` gera uma peça só, do último quadro (com `every=` escrito, também ao longo dele), e a peça toca no fps do `from` (`fps=` muda).
3. O `trocar()` no Godot. O [ajudante do Godot](ajudante-godot.md), que vinha antes, saiu na 1.42.0.

Cada etapa começa com o seu "pode fazer".
