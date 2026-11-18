# Ajudante do Godot: quadros, fps e troca na mesma fase

**Situação:** feito na 1.42.0 (15/11/2026). Item 1 da fila combinada em 10/11/2026. O que ficou está no [capítulo 15 do guia](../guia/15-jogo-personagem.md#no-jogo-a-velocidade-dos-pés), no [capítulo 10](../guia/18-filme-atuacao.md#trocar-sem-perder-o-passo-phase) e em [Como ficou](#como-ficou-1420), no fim deste arquivo.

**Origem:** sugestões das sessões do ForestPatrol (a capivara e o Chefe/pardal).

## O ajudante hoje

A exportação para o Godot escreve o `weasel_anim.gd`, o script do AnimationPlayer ([capítulo 15](../guia/15-jogo-personagem.md#do-weasel-para-o-godot)). Ele já tem:
- `tocar(acao, dir)`: escolhe `_right`, `_left` (e as outras direções) e só recomeça quando a animação muda;
- `velocidade(nome)`: quantos px/s o personagem anda sem os pés escorregarem (com `feet=`);
- o sinal `evento`, para os `event` das animações.

## O que entra, tudo de uma vez

### 1. Saber os quadros e mostrar um quadro parado
- `quadros(acao)`: quantos quadros a animação tem.
- `fps(acao)`: a velocidade dela, em quadros por segundo.
- `mostrar_quadro(acao, quadro, dir)`: para a animação naquele quadro. Por dentro, pausa e vai para `(quadro + 0.5) / fps`, o meio do quadro, para não cair na borda do anterior.

**Por quê:** o jogo da capivara copiou `GAIT_FRAMES` e `GAIT_FPS` à mão. Se a animação mudar no Weasel, o jogo fica errado sem avisar.

### 2. Trocar de animação na mesma fase da passada (capivara #3)
Quando a capivara passa de andar para trotar, a nova animação começa do quadro 0, e as patas pulam.
- **No filme:** `at 3s capivara.anim=trote phase`.
  - Só vale entre animações em loop.
  - Se as duas têm `feet=`, alinha pelos pés: o pé que está no chão continua no chão.
  - Se não têm, alinha pela fração do ciclo: a 40% da passada de `anda`, o `trote` começa nos 40% dele.
- **No Godot:** `tocar("trote", velocity, true)`. O terceiro parâmetro é opcional; sem ele, nada muda.

### 3. Nota no guia: virar com `flip_h` faz o desenho pular
- Virar o sprite à mão (`flip_h = true`) espelha a imagem, mas não espelha o deslocamento (offset). Por isso o desenho pula para o lado.
- O certo é deixar o `tocar()` escolher as animações `_left`. O Weasel já as gera com o deslocamento, as caixas e os pontos espelhados.
- Onde escrever: um item no capítulo 13 (problemas) e uma linha no capítulo 9.

## O que não entra
- **`virar()`:** não precisa. As animações `_right` já ganham uma `_left` com tudo espelhado.

## No Weasel e no jogo
- **Weasel:**
  - a exportação ganha funções novas no `weasel_anim.gd`;
  - o filme passa a aceitar `phase` no `at … anim=`;
  - nenhuma saída existente muda, a não ser o `weasel_anim.gd`: ele ganha as funções novas em toda exportação. Você aprovou isso em 15/11/2026, porque são funções a mais, que os jogos antigos não chamam, e o `tocar()` de hoje continua igual (sem o terceiro parâmetro, faz o mesmo de antes);
  - e a `.tscn` dos personagens com `feet=`, que ganha uma linha de dados (`fases = {…}`, ao lado do `velocidades = {…}`) para o Godot alinhar pelos pés como o filme. Você escolheu isso em 15/11/2026; sem `feet=`, a `.tscn` não muda.
- **Jogo:** os jogos já exportados continuam funcionando. Para usar as funções novas, basta exportar de novo.

## Como ficou (1.42.0)

As escolhas de 15/11/2026:
- **No Godot, alinhar pelos pés:** a `.tscn` dos personagens com `feet=` ganha `fases = {…}`, com o meio do apoio de cada animação em loop, em fração do ciclo (as espelhadas valem o mesmo). Sem `feet=`, nada muda na cena e vale a fração do ciclo.
- **Qual ponto da passada coincide:** o meio do apoio do **primeiro** pé do `feet=` (o trecho mais longo em que ele fica no chão, dando a volta no fim do loop). Pé sempre no chão (parado) ou nunca no chão conta como 0.

Detalhes que saíram da construção:
- **`fps()`:** a cena guarda o tempo de um quadro com 4 casas (1/24 vira 0.0417, que daria 23,98 fps). O ajudante devolve o fps redondo (inteiro, meio, quarto ou décimo) que dá esse mesmo tempo: 24, 7,5. `quadros()` usa esse fps, para não errar nas animações longas.
- **`mostrar_quadro()`:** toca sem tempo de mistura (`play(nome, 0.0)`), vai para o meio do quadro e pausa. Indo para o meio do quadro, nenhum evento cai exatamente ali, então nenhum é avisado. O próximo `tocar()` da mesma animação continua dali (o Godot retoma uma animação pausada).
- **`tocar(acao, dir, true)`:** a troca vai para o tempo certo com `seek(tempo, true)`, que mostra o quadro na hora; os eventos que ficaram para trás no salto não são avisados. Virar (de `_right` para `_left`) com `true` também mantém o passo.
- **No filme:** `phase` é uma palavra solta no `at`, como as flags das formas; antes era "valor solto". Avisa quando a linha não troca `anim=`, quando a de antes ou a nova toca uma vez, com `anim=none` e quando o ator não tinha animação. Junto com `blend=`, a mistura começa com as duas na mesma fase.
- **Conferido no Godot 4.7.2**, sem janela, nas duas cenas (por quadros e com esqueleto): `quadros()`, `fps()`, a troca pelos pés e pela fração, a troca para `once` (do 0), `mostrar_quadro()` (o quadro do sprite certo, sem eventos, o limite no último quadro) e o `tocar()` depois dele.
