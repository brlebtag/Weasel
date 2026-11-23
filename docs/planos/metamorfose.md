# Virada e metamorfose: um desenho virando outro

**Situação:** feito. A etapa 1, a virada (`anim … turn`), saiu na 1.45.0 ([como ficou](#como-ficou-a-virada-1450)). A etapa 2, a metamorfose no filme (`at … morph=`), saiu na 1.46.0 ([como ficou](#como-ficou-a-metamorfose-1460)).

**Origem:** duas perguntas suas:
- num filme, um personagem que muda de forma (uma aranha virando jacaré);
- num jogo de plataforma, um personagem de lado (com ossos) que em algum momento fica de frente (também com ossos).

## O que foi decidido (15/11/2026)

1. **Duas etapas:** primeiro a virada (editor, GIF, sprite sheet e Godot); depois a metamorfose no filme.
2. **A palavra `turn`** no fim da linha da transição: `anim vira from=idle_right to=idle_down frames=6 turn`. Sem `turn`, a transição continua igual.
3. **Os nomes `pairs=` e `born=`,** com `->` entre as duas partes nos dois: `pairs=olhoL->olhoE` e `born=olhoD->cabecaL`. Os dois-pontos do protótipo não servem: dentro de uma linha, `:` começa a lista de pontos.
4. **Com `rig=bones`, a virada sai quadro a quadro:** o personagem inteiro vira uma imagem por quadro durante a virada, e as peças presas aos ossos se escondem.

## Como ficou a virada (1.45.0)

- **A linha:** `anim vira from=idle_right to=idle_down frames=4 turn pairs=olhoL->olhoE born=olhoD->cabecaL`. As peças são as da transição (`vira_0_right`…), com `frames=`, `every=`, `fps=`, o lado espelhado e o `trocar()`.
- **Os pares sozinhos:** pelo nome (`corpoL` e `corpo`), pelo osso, pela cor e pela distância. A mesma forma nas duas vistas (uma camada sem `only=`) casa com ela mesma.
- **As partes sem par** nascem da parte casada mais perto (ou somem nela), atrás dela, a não ser que caibam dentro dela (o olho na cabeça). `born=` escolhe a parte; ele também desfaz um par automático.
- **O desenho:** o contorno de cada par vai de uma vista à outra (72 pontos, alinhados uma vez na pose parada); a cor, o contorno e a opacidade se misturam; as partes que nascem crescem com o contorno afinado. A ordem de pintura é a de uma vista na primeira metade e a da outra na segunda. Os efeitos, o clip e o `cut` de cada camada valem.
- **Em todo lugar:** editor, PNG, SVG, GIF, sprite sheet, normal map, estilos de arte (`art`).
- **`--info`:** as linhas `vira:`, `nascem:` e `somem:`, na escrita do `pairs=` e do `born=`.
- **Godot com `rig=bones`:** a peça `virada` (um `Sprite2D` quadro a quadro) aparece só nas peças da virada; as outras peças se escondem nelas. A exportação avisa.
- **Uma correção que veio junto:** uma peça tocada de trás para a frente (a volta do `trocar()`) não aplicava no começo as pistas que trocam de uma vez. Na cena por quadros, o sprite ficava na peça errada (desde a 1.43.0); com esqueleto, a virada não aparecia. Cada pista dessas ganhou uma key logo antes do fim da peça.
- **O que ficou como defeito conhecido** (no [capítulo 25](../guia/25-problemas.md)):
  - o meio da virada "derrete" quando as formas são muito diferentes; poucos quadros e bons pares ajudam;
  - a virada pela esquerda é a da direita espelhada: termina na frente espelhada. Com uma frente assimétrica (a espada do furão), há um pulo no último quadro. Desenhar a virada da esquerda à parte fica para depois, se fizer falta.

## Como ficou a metamorfose (1.46.0)

As escolhas de 15/11/2026, todas as recomendadas:

1. **`dur=`** diz quanto tempo a troca dura, como no `shot`, no `audio` e no `sub`. Sem ele, 1 s.
2. **No fim, sozinho:** o ator que sai some e o que chega aparece, sem outras linhas. Se o que chega não tiver `hidden`, sai um aviso.
3. **A troca viaja:** cada parte vai de onde está num ator até onde está no outro; com os dois no mesmo `pos=`, fica no lugar.
4. **Os pares como na virada:** pelo nome, pelo osso de mesmo nome, pela cor e pelo lugar dentro do desenho de cada um (a caixa do segundo esticada sobre a do primeiro, já com o `flip=` e o giro de cada um).

O que saiu:

- **A linha:** `at 5s aranha.morph=jacare dur=1.5s pairs=abdomen->corpo born=focinho->cabeca`. O `pairs=` vai da parte do ator que sai para a do que chega. No `born=x->y`, `x` nasce de `y` (`x` do ator que chega) ou some em `y` (`x` do ator que sai); um nome que existe nos dois conta como o que nasce. Os nomes errados dão erro com o arquivo de cada ator.
- **Durante a troca,** os dois atores viram um só. Cada um continua com a animação, o lugar, o tamanho, a luz e o lip sync dele; cada parte é desenhada pelo arquivo do seu ator, com a matriz dele, e o contorno vai de um ao outro na tela. A profundidade, a névoa e a transparência vão aos poucos; a ordem, o `front` e o estilo de arte trocam na metade. Os halos das lâmpadas dos atores se apagam num e se acendem no outro.
- **O casamento** é feito uma vez, com os dois atores no começo da troca. As partes que só aparecem depois ficam de fora.
- **Avisos:** `dur=`, `pairs=` ou `born=` sem `morph=` na linha; o ator que chega aparecendo antes; o que sai escondido no começo; uma troca que começa antes de outra do mesmo ator acabar (fica de fora).
- **Um filme sem `dur=`** vai até o fim da última metamorfose.
- **`--info`:** embaixo de cada plano, `metamorfose aranha -> jacare em 5s (1.5s)` e as linhas `vira:`, `nascem:` e `somem:`.
- **Em todo lugar do filme:** editor, PNG, GIF, vídeo e estilos de arte. No jogo, nada mudou.
- **O que fica como está:** o fundo (`bg`) e as sombras no chão (`cast`) dos atores não entram na troca; com `art pixel`, as cores do meio caem na cor mais perto da paleta.

## Três coisas parecidas, mas diferentes

| | Mesmo personagem? | Mesmos ossos? | Exemplo | Plano |
|---|---|---|---|---|
| Transição | sim | sim | galope → parado | [transicoes.md](transicoes.md) |
| **Virada** | sim, no mesmo arquivo | não precisa | lado → frente | este |
| **Metamorfose** | não, dois atores | não | aranha → jacaré | este |

A virada e a metamorfose usariam o mesmo código:
1. casar as partes de um desenho com as do outro;
2. transformar o contorno de cada par.

A virada é mais útil para o jogo, e a metamorfose, para o filme.

## O que o Weasel já tem

- **O morph aceita formas com qualquer número de pontos:** `key 12 bolha.shape=estrela` transforma um círculo numa estrela de 10 pontas ([capítulo 9](../guia/09-animacao.md#morph-uma-forma-vira-outra)). O Weasel espalha 72 pontos pelos dois contornos e casa cada um com o mais perto. Só o contorno muda: a cor fica a da forma.
- **Várias vistas no mesmo arquivo:** cada vista numa camada com `only=`, como o [furao.weasel](../../exemplos/furao.weasel) (frente, costas e lado, com os mesmos ossos).
- **Giro 2.5D:** `round=` no osso faz o rosto correr por uma bola, e `yaw=` gira ossos e camadas ([capítulo 14](../guia/14-profundidade.md#uma-cabeça-que-olha-para-os-lados-round)).
- **No filme:** `opacity`, `scale` e `show` dos atores no `at`.

## A virada (lado → frente)

**Jeitos que já funcionam hoje:**
1. **Corte seco.** Num jogo de plataforma, na velocidade do jogo, muitas vezes basta.
2. **Uma animação de virada desenhada:** `anim vira_frente frames=4 once`, com uma vista de 3/4 numa camada `only=vira_frente`. É o jeito clássico (lado → 3/4 → frente); custa desenhar uma vista a mais.
3. **Montar o personagem em 2.5D** (`round=`, `yaw=`, `z=`, `zsort`). Aí virar é só uma `key` de `yaw`. Mas é outro jeito de montar o personagem desde o começo, e as partes chatas (braços, pernas) achatam no meio do giro.

**Jeito novo: virada por morph.**

```
anim vira_frente from=idle_right to=idle_down frames=6
```

- O Weasel casa as partes da vista de lado com as da vista de frente.
- Ele gera os quadros do meio: cada par transforma o contorno, a cor e o contorno (`ink`).
- As partes que só existem numa das vistas nascem de um ponto ou somem nele.
- Quem fica na frente troca no meio.

### O protótipo com o furão

![O furão de lado vira de frente em 6 quadros e volta, respirando o tempo todo](img/virada_furao.gif)

![Os 7 passos da virada: lado, 17%, 33%, 50%, 67%, 83% e frente](img/virada_passos.png)

- **Como foi feito:**
  - 16 pares casados à mão (corpo → corpo, cabeça → cabeça, máscara → máscara, olho de lado → olho esquerdo, braço → braço, a espada → a espada…);
  - o olho direito nasce perto do focinho, a orelha de trás atrás da cabeça, o braço esquerdo atrás do corpo, a boca no nariz;
  - a cauda some atrás do corpo;
  - o furão continua respirando (`idle`) durante a virada, porque cada vista usa a pose dela naquele quadro;
  - o alinhamento dos contornos é calculado uma vez, na pose parada; senão o contorno "escorrega" de um quadro para o outro.
- **O que ficou bom:**
  - o olho de lado escorrega pelo rosto até virar o olho esquerdo, enquanto o direito aparece do outro lado, como numa virada de verdade;
  - o focinho comprido encolhe para dentro da cabeça;
  - a cauda some e o braço de trás aparece.
- **Defeitos:**
  - no meio (50%), o desenho fica "derretido": o focinho aparece por cima da máscara, e o braço que nasce ainda é uma bolinha. Na velocidade do jogo isso passa em 1 ou 2 quadros; devagar, fica feio;
  - as partes que nascem pequenas precisam ter o contorno afinado enquanto crescem, senão viram bolinhas pretas;
  - os pontos de onde cada parte nasce foram escolhidos à mão.

### Para virar recurso (o plano de antes; o que saiu está em [como ficou](#como-ficou-a-virada-1450))
- **Casar as partes sozinho:** pelo osso e pela posição (os nomes mudam entre as vistas: `corpoL` e `corpo`). Você corrige só o que sair errado, com `pairs=corpoL->corpo,…`.
- **De onde nasce cada parte nova:** da parte casada mais perto, atrás de quem a esconde. Você corrige com algo como `born=olhoD->focinhoL`.
- **No jogo:**
  - a virada sai como uma animação `once` comum, com poucos quadros na sprite sheet, tocada com `tocar()`;
  - se ela sempre começa da pose parada, é uma peça só; se pode começar de qualquer quadro do andar, entra a regra das peças do [plano das transições](transicoes.md);
  - com `rig=bones`, as partes que mudam de forma já saem como imagens trocadas quadro a quadro, presas ao osso (é assim que o morph sai hoje), então nada muda no Godot.

## A metamorfose (aranha → jacaré, no filme)

**Jeitos que já funcionam hoje:**
1. **Troca com fade:** dois atores no mesmo lugar; um some com `opacity` enquanto o outro aparece. Parece uma imagem se dissolvendo, e não um corpo mudando.
2. **O truque do desenho animado:** a aranha encolhe (`scale`), um clarão ou uma fumaça cobre a troca, e o jacaré cresce no lugar.
3. **Morph à mão:** os dois desenhos no mesmo arquivo, com uma `key … parte.shape=outra` para cada parte. Dá trabalho: casar uma por uma, mudar a cor com outra `key`, encolher as patas que sobram, e o desenho fica preso aos ossos da aranha.

**Jeito novo:**

```
actor aranha "aranha.weasel" 400,500 anim=anda
actor jacare "jacare.weasel" 400,500 anim=anda hidden
at 5s aranha.morph=jacare dur=1.5s
```

- As partes são casadas como na virada (sozinho, ou com `pairs=`).
- Uma pata que sobra encolhe até sumir; o rabo, que não existia, cresce da parte mais perto.
- Os dois continuam se mexendo: uma aranha andando vira um jacaré andando.
- No fim, a aranha some e o jacaré fica, sem pulo.
- Com silhuetas parecidas, a troca fica bonita. Com partes muito diferentes (patas finas virando um rabo), o desenho parece "derreter" de um no outro, que é o visual clássico de morph. Um clarão ou partículas por cima ajudam.
- **No jogo:** nada muda, a menos que um dia você queira exportar a metamorfose como animação.

## No Weasel e no jogo
- **Weasel:**
  - `from=` e `to=` no `anim`, já previstos nas transições, passam a aceitar vistas diferentes (virada);
  - `morph=` no `at` do filme (metamorfose);
  - nenhuma sintaxe existente muda.
- **Jogo:** só ganha quadros quem declarar uma virada.

## Ordem
1. A virada: feita na 1.45.0.
2. A metamorfose no filme (`at 5s aranha.morph=jacare dur=1.5s`), reaproveitando o mesmo código: feita na 1.46.0.
