# Testar ossos

**Situação:** proposta e escolhas de 23/11/2026. Etapa 1 (o Prender só prende e a ferramenta Testar ossos) feita na 1.73.0. Etapa 2 (as ajudas e virar `key`) feita na 1.74.0: **plano feito**.

## O pedido

1. **O Prender só prende.** Ele escreve os `@osso` dos pontos, e só isso: sem o "Testar giro" (girar um osso na tela) e sem posar.
2. **Um modo só para testar os ossos.**
   - Mover, girar e esticar os ossos, tudo o que uma `key` de osso faz.
   - Ao sair do modo, tudo volta como estava.
   - O objetivo é ver se tudo está conectado e funcionando: o que vai junto com cada osso, onde a forma abre ou sobra.
   - Extra: virar o teste numa `key`.

**Weasel:** só o editor. A linguagem, a linha de comando, o export e o Godot não mudam. **Jogo:** nada muda.

## As escolhas (23/11/2026)

- **A. O Prender perde também o posar.** Hoje, com uma animação escolhida, arrastar um osso no Prender escreve a `key`. Isso sai: posar com `key` continua em Exibir › Ossos, com a animação pausada.
- **B. O teste começa no quadro mostrado.** Com uma animação pausada no player, os ossos começam na pose daquele quadro. Sem animação, na pose parada. Mudar de quadro ou de animação recomeça o teste.
- **C. As ajudas:** destacar o que segue o osso e clicar numa forma para ver a que osso ela segue. Chacoalhar (o osso balança sozinho) fica de fora; pode voltar depois.
- **D. Duas etapas:** a 1.73.0 com o Prender e a ferramenta; a 1.74.0 com as ajudas e virar `key`.

## Etapa 1 (1.73.0)

### O Prender só prende

- Saem as hastes de girar e a nota "Testar giro".
- Um clique na bolinha de um osso escolhe os pontos presos a ele.
- Com uma animação escolhida, os ossos não arrastam mais.
- O **Esc** tira a escolha dos pontos.
- `scene.spinPose` continua (é usado pelos testes), agora feito com `testPose`.

### A ferramenta Testar ossos (tecla **O**)

- Um botão novo na barra de ferramentas, logo depois do Prender.
- **Entrar:** o botão ou a tecla **O**. **Sair:** escolher outra ferramenta; tudo volta como estava.
- **Nada vai para o código.** O Ctrl+Z não guarda o teste. O **Esc** zera tudo, sem sair da ferramenta.
- **Cada osso no desenho:**
  - **bolinha:** arrastar move (o `dx,dy`, na direção do pai, como numa `key`);
  - **ponta da haste:** girar (com Shift, de 15 em 15 graus);
  - **quadradinho no meio da haste:** esticar (`sx,sy`); com Shift, mantém a proporção; puxar para o outro lado espelha;
  - **duplo clique** numa alça zera o osso.
- **O `ik` continua valendo:**
  - girar o corpo dobra a perna, e o pé fica no chão;
  - a raiz e o meio de um `ik` avisam: gire o osso de cima;
  - a bolinha da ponta de um `ik` com `target=` move o alvo; com `foot=`, avisa.
- **Alças uma em cima da outra.** Dois ossos com o mesmo pivô (o braço de perto e o de longe) têm as alças no mesmo lugar. Clicar de novo no mesmo lugar troca para o osso de baixo, e a nota diz qual está na mão.
- **Propriedades.** Com um osso escolhido, o painel mostra x, y, giro, escala x e escala y para digitar. Quando o osso usa, mostra também `along` (com `path=`), `yaw` e `pitch` (com `turn` ou 3D). Botões **Zerar este osso** e **Zerar tudo**.
- **A nota no canto** mostra o que está mexido: `Testar ossos: canelaP 30° · corpo 4,-2 · só na tela · Esc zera`.
- **O que não anda no teste:** `sway`, `bob`, `jitter`, `spring` e `cloth` dependem do tempo; no teste eles ficam como no quadro de partida.

### Por baixo

- `scene.testPose(model, base, vals)`: a pose `base` (a parada ou a do quadro) com os valores de alguns ossos trocados (`dx, dy, rot, sx, sy`, mais `along`, `yaw` e `pitch`), com o `ik` resolvido de novo.
- O editor usa essa pose no lugar da pose do quadro enquanto a ferramenta está ligada.

## Etapa 2 (1.74.0)

- **Destacar o que segue o osso:** com o mouse num osso, ou com ele escolhido, as formas e os pontos que vão com ele ficam acesos, e o resto fica apagado.
- **Clicar numa forma diz a que osso ela segue:** `bota_perto_1: bone=peP · 8 pontos em canelaP`.
- **Escrever como `key`:**
  - grava os ossos mexidos numa `key`;
  - com uma animação escolhida, no quadro do player; sem animação, numa anim nova `teste`, na `key 0`;
  - um Ctrl+Z desfaz.

## Como ficou

### Etapa 1 (1.73.0, 23/11/2026)

Feita como o plano diz, com estas diferenças e escolhas:

- **O painel é uma parte própria da coluna**, "Testar ossos" (`js/ui-bones.js`), e não o Propriedades. Ela aparece em cima de tudo só com a ferramenta ligada e some ao sair. Assim, o Propriedades continua mostrando o documento e as formas.
  - A lista **osso** escolhe o osso na mão sem clicar no desenho; os mexidos têm um •.
  - Os campos aceitam **Enter**; o **Esc** dentro de um campo só sai dele (não zera o teste). Arrastar o nome de um campo muda o valor, como no Propriedades.
  - `along` aparece num osso com `path=`; `yaw` e `pitch`, num desenho com 3D (`has3d`) ou num osso com `yaw=`, `pitch=` ou `round`.
- **Esticar:** o quadradinho estica o eixo do osso mais perto da direção da haste (`sx` ou `sy`); com Shift, os dois.
- **Alças uma em cima da outra:** a troca de osso acontece ao **soltar** o segundo clique no mesmo lugar, não ao apertar. Assim, clicar até o osso certo e depois apertar e arrastar leva o osso que a nota mostra na mão. O duplo clique volta o osso que estava na mão no primeiro clique.
- **A ponta de um `ik` com `target=`:** o alvo vai para a mão (a nota e o painel mostram o alvo).
- **No Prender**, a bolinha de um osso aceita Shift (soma) e Alt (tira) também.
- **Conferido no editor:** o cavaleiro (girar, esticar com Shift, mover, painel, Esc, duplo clique, sair da ferramenta); `test/casos/pinos.weasel` (girar o corpo dobra a perna e o pé fica parado; o meio do `ik` avisa; a bolinha da mão move o `alvo`); dois ossos com o mesmo pivô (troca e arraste). O código não mudou em nenhum teste.

### Etapa 2 (1.74.0, 23/11/2026)

- **O que vai junto acende.** O osso aceso é o arrastado; sem arraste, o que está sob o mouse (numa alça); sem mouse numa alça, o da mão. O resto do desenho fica sob o mesmo véu claro do grupo aberto (o isolamento), e o que vai junto é pintado de novo por cima. Vai junto:
  - as formas com `bone=` no osso ou num descendente dele;
  - as formas com algum ponto `@` num deles (a forma inteira acende, e os pontos presos ganham bolinhas na cor do osso);
  - as formas com `bones=` que passam por um deles, e as pernas (`stroke … hip=`) com `on=` ou `target=` num deles;
  - num `ik` com `target=` num deles, os ossos do `ik` (e os filhos).
- **A caixa "Acender o que segue o osso"** no painel, ligada de começo, desliga o destaque. Não fica guardada.
- **Clicar numa forma** (fora das alças) põe na nota, no painel e na barra de aviso o `bone=` dela e quantos pontos estão em cada osso, com o contorno tracejado em laranja. O osso dela vai para a mão (o `bone=`; sem ele, o primeiro de `bones=`, o `on=` ou `target=` da perna, ou o osso do primeiro ponto preso). O código vai até a linha dela, sem tirar o foco do desenho. Clicar de novo no mesmo lugar pega a forma de baixo; no vazio, solta o osso e a forma.
- **Escrever como key** é um botão do painel, que diz onde vai escrever (`Escrever como key 6 em agacha`, ou `(anim nova teste)`):
  - escreve só as partes mexidas de cada osso: `osso=dx,dy,giro` (mais `sx,sy` quando não é 1), e `osso.along=`, `osso.yaw=` e `osso.pitch=`, com o mesmo jeito do posar em Exibir › Ossos (troca o valor na linha do quadro, ou cria a linha na ordem dos quadros);
  - sem animação, `anim teste` (ou `teste2`…) vai para o fim do arquivo, com uma linha em branco antes, e o player passa a mostrá-la;
  - numa animação feita pelo Weasel (`from=`/`to=`), avisa e não escreve;
  - tudo num Ctrl+Z só; depois, o teste recomeça do quadro, que já tem os valores.
- **Conferido no editor** (`test/casos/pinos.weasel`): o mouse na coxa acende só o `bicho` (pelos pontos da canela e do pé) e apaga o braço e a corda; o clique no `bicho` diz `bicho: bone=corpo · 2 pontos em canela · 2 pontos em pe · 1 ponto em ombro`, e na corda, `corda: 1 ponto em alvo`; escrever sem animação cria `anim teste` com `key 0 corpo=0,0,20`; no quadro 6 de `agacha` troca `corpo` e `alvo` na `key 6`; no quadro 3 cria `key 3 corpo=0,12,-10` entre a 0 e a 6; um osso com `path=` escreve `key 0 carro.along=0.5`. Cada escrita saiu com um Ctrl+Z.
