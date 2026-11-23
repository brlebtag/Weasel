# IK e pinos: o que ficou de fora

**Situação:** feito na 1.47.0 (15/11/2026). Revisto em 15/11/2026: das sobras da 1.28.0 (pinos `@osso` e `ik`) e das ideias da pata da capivara (11/11/2026), ficaram só duas ideias pequenas, ambas no editor.

**Depois (23/11/2026):** o "Testar giro" (item 1) saiu do Prender na 1.73.0. No lugar dele ficou a ferramenta Testar ossos (tecla O), que move, gira e estica os ossos só na tela: ver [Testar ossos](testar-ossos.md).

## O que ainda vale

1. **"Testar giro" no Prender**
   - Hoje, para ver um osso girar, é preciso escolher uma animação, e arrastar o osso escreve uma `key` no código.
   - A ideia: no Prender, na pose parada, arrastar a alça de giro de um osso gira só na tela, sem escrever nada, e volta ao soltar.
   - Serve para achar vão e sobra enquanto se prendem os pontos.
   - **Weasel:** só o editor; a linguagem não muda. **Jogo:** nada muda.
2. **Uma alça no editor para arrastar o pé do `ik`** e escrever as `key` do alvo.
   - **Weasel:** só o editor; mais trabalho que o item 1. **Jogo:** nada muda.

## As escolhas (15/11/2026)

- **O giro de teste fica até o Esc** (não volta ao soltar): dá para girar dois ou três ossos e olhar a pose com calma. Escolher uma animação ou desligar o Prender também volta.
- **Só no Prender:** a chave Ossos, sem animação, continua sem alças. É no Prender que se olham os pontos.
- **Arrastar a ponta de um `ik` move o alvo:** com `target=`, a bolinha da ponta escreve a `key` do osso do alvo (antes, escrevia a `key` de mover da própria ponta, que esticava o osso). Com `foot=`, só avisa: o pé fica no chão.

## Como ficou (1.47.0)

- `scene.spinPose(model, giros)`: a pose parada com alguns ossos girados (graus), com o `ik` resolvido. O editor usa no lugar da pose do quadro enquanto há giro de teste.
- No Prender com a pose parada, as alças de girar aparecem e só elas pegam (a bolinha do osso fica para escolher pontos). Arrastar muda o giro na tela; nada vai para o código. A raiz e o meio de um `ik` avisam: gire o osso de cima.
- Uma nota no canto mostra os ossos girados (`Testar giro: corpo 30° · pe -40°`). O primeiro **Esc** volta os giros; o seguinte solta os pontos escolhidos.
- Numa animação (chave Ossos ou Prender), a bolinha da ponta de um `ik` com `target=` move o alvo, com um aviso curto; com `foot=`, o aviso diz para usar `target=`.
- **Jogo:** nada muda. **Linguagem:** nada muda.

## O que saiu, e por quê

- **`parent=` para um pé fixo:** o `ik … foot=chão,x` já prende o pé no chão, e no jogo o personagem anda no lugar, com a passada medida pelo `feet=`.
- **Pinos por região (`pins=osso@raio`):** a ferramenta Prender (1.29.0) já prende com uma caixa e põe cada ponto no osso mais perto.
- **Soldar um ponto a outro (`x,y@=pata.3`):** dois pontos no mesmo lugar, presos ao mesmo osso com o mesmo peso, já andam juntos.
- **`only=anims` e `mix=` que se anima no `ik`:** o caso era o pulo, e ele já funciona: fora do alcance, a perna estica e a pata sai do chão. Para mais controle, `target=` com um osso de alvo animado. Volta só se um personagem de verdade precisar.
- **Cadeias com mais de 2 ossos:** nenhum personagem pediu. Pode voltar com as patas da aranha, se a [metamorfose](metamorfose.md) andar.
- **Animar o pé direto numa `key`:** `target=` com um osso de alvo faz o mesmo, com uma linha a mais.
- **A emenda da anca da capivara:** era de um desenho só, e prender os pontos já resolve.

A solução da pata da capivara (prender os pontos de baixo da perna no osso da pata, peso 0.5 na junta, pivô no tornozelo) já funciona hoje com a ferramenta Prender (tecla P).
