# IK e pinos: o que ficou de fora

**Situação:** sem data, nada combinado. São as sobras da 1.28.0 (pinos `@osso` e `ik`) e as ideias da conversa sobre a pata da capivara (11/11/2026).

## Sobras da 1.28.0
- **Animar o pé direto numa `key`:** `key 6 perna.foot=…`. Hoje se anima um osso de alvo (`target=`).
- **`parent=` para um pé fixo:** o alvo do IK fica preso a outro osso, ou ao chão.
- **`only=anims`:** o IK só vale em algumas animações. Num pulo, por exemplo, a perna fica solta.
- **Peso `mix=` que se anima:** liga e desliga o IK aos poucos.
- **Uma alça no editor para arrastar o pé** e escrever as `key`.
- **Cadeias com mais de 2 ossos.** Hoje o IK move 2 ossos.
- **Pinos por região:** `pins=osso@raio` prende todos os pontos perto de um osso.
  - A seleção com caixa que escreve `@osso` já saiu na 1.29.0: é a ferramenta Prender.
- **A emenda da anca da capivara** deslizando pelo contorno.

## Da pata da capivara (11/11/2026)

O vão e a sobra entre a perna e a pata já têm solução hoje: prender os pontos de baixo da perna no osso da pata, com a ferramenta Prender (tecla P).
- **Pontos abaixo da junta:** peso 1 no osso da pata. Eles giram junto com a pata, e o contorno acompanha.
- **Os dois pontos na altura da junta:** peso 0.5, para a perna dobrar numa curva e não num bico.
- **O pivô do osso da pata:** no centro do tornozelo, onde a perna dobraria de verdade.
- **Outra saída, a junta redonda:** o alto da pata vira um arco com centro no pivô, e a ponta da perna cobre esse arco. Nunca abre vão, mas é preciso mudar o desenho.

**Ideias para o Weasel:**
- **"Testar giro" no Prender:**
  - Hoje, para ver um osso girar, é preciso escolher uma animação, e arrastar o osso escreve uma `key` no código.
  - A ideia: no Prender, na pose parada, arrastar a alça de giro de um osso gira só na tela, sem escrever nada, e volta ao soltar.
  - Serve para achar vão e sobra enquanto se prendem os pontos.
  - É uma mudança pequena, só no editor.
- **Soldar um ponto a outro ponto** (algo como `x,y@=pata.3`): **não recomendo.**
  - Dois pontos no mesmo lugar, presos ao mesmo osso com o mesmo peso, já andam juntos.
  - Seria sintaxe nova antes da [limpeza da linguagem](limpeza-da-linguagem.md).
