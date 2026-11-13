# Ajudante do Godot: quadros, fps e troca na mesma fase

**Situação:** item 1 da fila combinada em 10/11/2026. Você aprovou a análise e a ordem; falta o "pode fazer".

**Origem:** sugestões das sessões do ForestPatrol (a capivara e o Chefe/pardal).

## O ajudante hoje

A exportação para o Godot escreve o `weasel_anim.gd`, o script do AnimationPlayer ([capítulo 9](../guia/09-jogo-godot.md#exportando-para-o-godot)). Ele já tem:
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
  - nenhuma saída existente muda.
- **Jogo:** os jogos já exportados continuam funcionando. Para usar as funções novas, basta exportar de novo.
