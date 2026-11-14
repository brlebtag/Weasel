# Outros estilos: pixel art, ASCII, esboço, marcador, HQ e mais

**Situação:** análise e protótipos feitos em 12 e 13/11/2026, fora do Weasel. Em 14/11/2026 você respondeu as perguntas (ver [Decisões](#decisões-de-14112026)) e deu o "pode fazer" da fase 1. A fase 1 foi feita na 1.30.0 (ver [Como a fase 1 ficou](#como-a-fase-1-ficou-1300)). A fase 2 virou duas versões (ver [Decisões da fase 2](#decisões-da-fase-2-14112026)): as bases saíram na 1.31.0 (ver [Como as bases de tom ficaram](#como-as-bases-de-tom-ficaram-1310)); faltam as combinações (1.32.0) e as fases 4 a 6.

**Origem:** quatro perguntas suas:
- dá para gerar pixel art, ASCII ou outro estilo a partir do Weasel, sem modelar pixel por pixel, mesmo que não fique 100% perfeito?
- dá para um estilo que pareça desenhado à mão, com marcador ou lápis de cor? (A imagem de referência era de marcador, com caneta preta fina no contorno e caneta gel branca nos brilhos.)
- dá para um estilo de HQ, colorido e preto e branco, antigo e moderno?
- que outros estilos dá para gerar? (Da resposta saíram os protótipos de recorte de papel, vitral e massinha.)

**Resposta curta:** sim. O Weasel guarda o desenho como formas, e não como uma imagem pronta, então ele pode pintar a mesma cena de outros jeitos.

## Decisões de 14/11/2026

**Quais estilos:** todos, menos os três de [Não recomendo](#não-recomendo).

**A instrução:** uma linha própria, `art`, na parte de cima do arquivo, como o `finish`. A primeira palavra é o estilo, e depois vêm as opções dele. Só nomes em inglês:

```
art pixel size=8 palette=gameboy dither=bayer outline small
art comic old bw
art cutout boil=0
```

- Um `art` por arquivo de personagem. Sem `art`, nada muda.
- O `finish` continua como está e funciona junto. O `finish pixel=` continua sendo o pixelado de hoje; o pixel art nítido é o `art pixel`.
- `art none` desliga o estilo (útil no filme).

**Os nomes:**

| Estilo | Nome | Opções próprias |
|---|---|---|
| Pixel art | `pixel` | `size=`, `palette=own\|gameboy\|nes\|pico8\|mono`, `dither=bayer`, `outline`, `small` |
| ASCII | `ascii` | `size=6,12`, `chars=`, `color`; sai também em `.txt` |
| Retícula | `halftone` | `size=`, `angle=`, `color` |
| Ponto-cruz, mosaico, tricô | `stitch`, `mosaic`, `knit` | `size=`; o mosaico tem `grout=` |
| Esboço, marcador, lápis de cor | `sketch`, `marker`, `pencil` | `paper=` |
| Giz de cera, giz no quadro, aquarela | `crayon`, `chalk`, `watercolor` | `paper=` |
| Só contorno, neon | `lines`, `neon` | `w=`, `c=` |
| Recorte de papel | `cutout` | |
| Massinha, vitral, bordado | `clay`, `glass`, `embroidery` | o vitral tem `size=` e `lead=` |
| Cel shading | `toon` | `steps=` |
| Gravura, xilogravura | `engraving`, `woodcut` | `gap=` |
| HQ | `comic` (moderna colorida), `comic old`, `comic old bw` (`bw` = *black and white*), `manga` | `size=` |
| Risografia, estêncil, silhueta | `riso`, `stencil`, `silhouette` | `inks=`, `tones=`, `c=` |

**Opções de todos os estilos:**
- `boil=2` redesenha a textura a cada 2 quadros (a fervura); `boil=0` deixa a textura presa à forma. Cada estilo tem o seu padrão.
- `seed=` sorteia outra versão do mesmo desenho.

**Pixel art no jogo:** `small` faz só a sprite sheet e o Godot saírem no tamanho pequeno de verdade. O vídeo e o GIF saem sempre no tamanho do `canvas`, com o pixel nítido.

**Efeitos de tela:** no `finish`, como o `bloom=`: `oldfilm=`, `vhs=`, `crt=` e `glitch=`, de 0 a 1. Seguem a regra de hoje do `finish` (o arquivo principal; sem ele, a cena).

**No filme, quatro níveis.** O mais específico ganha: ator, depois plano, depois cena, depois filme.

| Onde vale | Como escrever |
|---|---|
| O filme todo | `art` no começo do arquivo do filme |
| Uma cena | `art` no começo do arquivo da cena |
| Um plano | `art` dentro do bloco do `shot` |
| Um personagem | `art … actor=coruja` (no começo do filme ou dentro de um `shot`) |

- O `art` do arquivo do próprio personagem vale para o jogo e as exportações dele; no filme, quem decide é o filme.
- Quando o quadro todo tem o mesmo estilo, ele é aplicado de uma vez (uma grade só no pixel art e no ASCII). Um personagem com outro estilo é desenhado sozinho e encaixado na ordem de profundidade de sempre.

**No editor:** o estilo aparece, como já aparecem o `pixel=` e o `bloom=`, e as alças continuam nos pontos do desenho. Uma chave "Estilo" liga e desliga. Os estilos pesados mostram o desenho normal enquanto você arrasta.

**Fases** (cada uma é uma versão):
1. **1.30.0:** a linha `art`, os quatro níveis do filme, a chave Estilo, as exportações, `boil=` e `seed=`, e os estilos `pixel` e `ascii`.
2. **1.31.0, tom (as bases):** `toon`, `halftone`, `engraving`, `stencil` e `silhouette`.
3. **1.32.0, tom (as combinações):** `woodcut`, `comic`, `comic old`, `comic old bw`, `manga` e `riso`.
4. **1.33.0, traço:** `sketch`, `marker`, `pencil`, `crayon`, `chalk`, `watercolor`, `lines` e `neon`.
5. **1.34.0, peças:** `cutout`, `clay`, `glass` e `embroidery`.
6. **1.35.0, o resto:** `stitch`, `mosaic`, `knit` e os efeitos de tela.

### Decisões da fase 2 (14/11/2026)

- **Duas versões:** a fase de tom foi dividida em duas (acima). As bases saem antes, para você ver e ajustar antes das HQs serem montadas em cima delas.
- **`toon` sem luz:** cada forma ganha uma faixa de sombra com borda nítida no lado longe do `light=` do `canvas` (a mesma direção do contorno). Com `light` ou `ambient`, a luz também vira degraus, como no [protótipo](#cel-shading).
- **Hachura presa à forma:** na gravura e na xilogravura, a hachura de cada forma gira e anda junto com o osso dela. `boil=2` sorteia de novo a cada 2 quadros. A retícula de pontos (`comic`, `manga`, `halftone`) fica presa na tela por padrão, como na impressão: `boil=screen`.
- **Contraste:** a opção `levels=0.05,0.7` diz a claridade que vira preto e a que vira branco (padrão `0,1`), como os Níveis de um editor de imagem. Vale nos estilos que escolhem papel, hachura ou preto pela claridade. Não há ajuste automático, para nada piscar no filme.

## Como a fase 1 ficou (1.30.0)

O que está no [capítulo 14 do guia](../guia/14-estilos.md), mais as escolhas feitas no caminho:

- **O acabamento vem depois do estilo:** `bloom=`, `vignette=`, `grain=` e `posterize=` entram por cima da imagem pronta. Com um `art`, o `finish pixel=` não entra (o Weasel avisa).
- **`boil=` e `seed=`** já são lidos em todos os estilos, mas o `pixel` e o `ascii` não têm textura: neles, os dois só dão aviso. Servem para as fases seguintes.
- **As cores são comparadas em Lab** (o jeito que o olho vê), e não em RGB: no RGB, um azul-escuro ficava "perto" de um verde-escuro, e o céu virava morro.
- **`palette=own`:** todas as cores do desenho (palette, formas, gradientes, padrões e fundo). Num desenho sem fundo exportado opaco, o branco do fundo entra também.
- **O voto do pixel art:** cada ponto vira a cor mais parecida da paleta, e o bloco fica com a mais votada. A tinta ganha com 1/4 do bloco; "tinta" é o ponto cuja cor mais parecida, entre as cores do desenho, é a `ink` (no filme, a `ink` de cada arquivo). O bloco fica vazio quando o transparente ganha da cor mais votada.
- **O pontilhado** (`dither=bayer`, Bayer 4×4) mistura a cor do bloco com a segunda mais parecida, só onde a cor muda aos poucos (degradês e luz). Com 2 cores (`mono`), em tudo.
- **O `outline`** é 1 bloco por fora da silhueta, na cor da tinta.
- **ASCII:** a letra mede o quanto a célula se afasta do papel (Lab). O papel é o fundo do canvas (o primeiro tom, se for gradiente; branco sem fundo). Num papel escuro, as letras saem claras. Um ator em ASCII desenhado à parte usa o papel do filme como referência, mas não pinta o papel.
- **Na borda do canvas,** o bloco (ou a célula) só conta a parte de dentro.
- **`small`:** a escala vira pixels por bloco (`-s 3` = 3×3 pixels por bloco), e o recorte da folha cai na grade.
- **Godot:** `texture_filter = 1` (nearest) com qualquer `art pixel`; o normal map sai pixelado, um tom por bloco. No esqueleto de verdade, cada peça sai no estilo na pose parada, e o `--info` lembra que o pixel art perde a grade quando a peça gira.

## Como as bases de tom ficaram (1.31.0)

O que está no [capítulo 14 do guia](../guia/14-estilos.md#estilos-de-tom-toon-engraving-halftone-stencil-e-silhouette), mais as escolhas feitas no caminho. Elas servem de base para a 1.32.0 (`woodcut`, `comic`, `manga` e `riso`).

- **Passes:** o estilo pede o mesmo desenho de outro jeito, e o Weasel desenha de novo: sem luz (`unlit`), sem o contorno (`noInk`), com a faixa de sombra do toon (`toon`) ou com a textura presa à forma (`tex`). Sem estilo, nada disso roda: os desenhos de antes saem iguais.
- **Resolução:** os estilos de tom pintam na resolução da imagem final, de 1 a 4 pontos por unidade do desenho. Numa escala menor que 1, eles pintam a 1 ponto por unidade e reduzem com suavização (a hachura não vira borrão).
- **`toon`:** a faixa é a forma menos ela mesma empurrada na direção do `light=` do canvas, com largura `shadow=` vezes o tamanho da forma nessa direção, multiplicada por um cinza-azulado (`#a9aec6`). Formas com 90% ou mais da largura ou da altura do canvas, camadas `unlit` e guias ficam sem faixa. Com luz, a razão entre o desenho com luz e sem luz é arredondada em degraus de log2 de tamanho `2/(steps-1)`; onde o desenho sem luz é muito escuro (claridade abaixo de 0,06), fica o desenho com luz.
- **`engraving`:** a hachura vem do tom do desenho sem contorno; as quatro famílias de linhas (45°, −45°, horizontal e 45° no meio) entram com o escuro, e acima de 0,85 o preto chapado entra. O contorno é medido pela diferença entre o desenho com e sem `ink`, e sai preto. Papel `#f6f2ea`, tinta `#1c1a17`.
- **`halftone`:** a grade de cada retícula é feita com números inteiros, para se repetir sem emenda: o ângulo e o tamanho ficam bem perto dos pedidos. O quase branco (até 4%) fica papel e o quase preto (de 88% em diante) fica chapado, como a impressão faz. A separação de cores é a simples: o preto tira o que as três cores têm em comum.
- **`stencil`:** o ruído é suave (um valor por unidade, misturado entre vizinhos) em dois tamanhos; ele empurra o tom para um lado ou para o outro só perto da troca de tom.
- **`silhouette`:** o desenho é feito sem luz (o halo e a sombra projetada não viram silhueta) e pintado de uma cor só; o fundo fica.
- **A textura presa à forma:** o passe `tex` pinta cada forma com uma textura que guarda o cosseno e o seno de uma volta a cada 128 unidades (um passe para u, outro para v), girada e movida com a forma (pelo osso, no centro da caixa dela) e na escala da tela. A primeira tentativa guardava direto o cosseno da hachura, mas a suavização do canvas tirava contraste (erro médio de 12 em 255); a volta lenta não sofre com isso, e as contas da hachura, dos pontos e do ruído são feitas depois, exatas. Na pose parada, a textura presa é igual à da tela (só pontos soltos na borda das formas mudam).
- **Tempo** (Cavaleiro, 800×640, escala 1): toon sem luz quase nada; engraving uns 60 ms; halftone uns 40 ms (color, uns 110); stencil uns 50 ms. Um quadro Full HD do filme de exemplo leva de 0,3 s (toon) a 1 s (engraving).

## O que já existe

Tudo no `finish` ([capítulo 4](../guia/04-camadas.md#acabamento-finish)):
- `pixel=8`: desenha 8 vezes menor e aumenta sem suavizar.
- `posterize=4`: poucas cores; `posterize=palette`: só as cores da `palette`.
- `flat`: tira todos os contornos.
- `bloom=`, `vignette=` e `grain=`: brilho, bordas escuras e granulado.
- Fora do `finish`, `pattern hatch` e `pattern dots` fazem hachura e pontilhado (exemplo `gravura.weasel`), mas você escolhe à mão onde vai cada padrão.

## O teste com o Cavaleiro

![À esquerda, o Cavaleiro com pixel=8 posterize=palette, com pontos azuis em volta da máscara e o fundo trocado; à direita, o protótipo, com contorno contínuo e só cores da palette](img/estilos_pixel.png)

- **Hoje (esquerda):** o desenho pequeno é feito com suavização, então as bordas viram cores misturadas.
  - O `posterize=palette` troca essas misturas pela cor mais parecida da palette. Por isso aparecem pontos azuis da capa em volta da máscara.
  - O fundo mudou de cor, porque a cor dele não está na palette.
- **Protótipo (direita), feito fora do Weasel:**
  1. desenha no tamanho normal (800×640);
  2. troca cada ponto pela cor mais parecida da palette (a cor do fundo entra na lista);
  3. em cada bloco de 8×8, fica a cor que **mais aparece**;
  4. o contorno ganha quando cobre um quarto do bloco, para não sumir.
- **Resultado:** nenhuma cor inventada, contorno contínuo, fundo certo.

## Protótipos

Feitos fora do Weasel, num script que carrega o motor dele (como a linha de comando faz) e usa as formas, os ossos e a luz da cena. Mostram o resultado esperado; a versão de verdade corrigiria os defeitos anotados.

### Esboço com a linha fervendo

![O Cavaleiro na animação stand, desenhado a lápis: linhas tremidas que mudam a cada 2 quadros, cor de marcador fora do lugar e hachura nas partes escuras](img/estilos_esboco.gif)

- **Como foi feito:**
  1. a cor vem do desenho sem contorno (`finish flat`), mais clara e deslocada uns pixels, como marcador;
  2. cada forma é passada duas vezes a lápis, com um tremido suave (ondas ao longo da linha), começando num ponto qualquer e passando um pouco do fim;
  3. as partes escuras ganham hachura a lápis;
  4. o tremido, o deslocamento da cor e a hachura mudam a cada 2 quadros: é a fervura.
- **Defeito:** o lápis é desenhado por cima de todas as cores, então aparecem linhas que no desenho normal ficam escondidas atrás de outra forma (os laços na capa). Na versão de verdade, cada forma pintaria a cor e o lápis na ordem certa.
- **Peso:** com o granulado do papel, o GIF passa de 1,7 MB; sem ele (este aqui), 0,5 MB.

### Cel shading

![A cena da noite com a luz normal do Weasel e com a luz em degraus: a máscara em dois tons com divisa nítida, o halo do lampião em anéis e a sombra no chão com borda definida](img/estilos_cel.png)

- **Como foi feito:**
  1. desenha a cena duas vezes: com a luz e sem a luz;
  2. a divisão das duas dá quanto de luz cada ponto recebeu, e de que cor;
  3. essa quantidade vai para o degrau mais perto (0.32, 0.62, 1, 1.35, 2.1 e 3.3 vezes);
  4. o contorno e o que é quase preto ficam como estão.
- **Resultado:** a máscara ficou em dois tons, o halo do lampião virou anéis e a sombra no chão ganhou borda definida.
- **Limite:** depende de `light` e `ambient`. Um desenho sem luz, como o Cavaleiro sozinho, não muda.

### Gravura automática

![A cena da noite em gravura: hachura cruzada no céu, prédios em nanquim sólido, a máscara em papel com hachura no lado longe do lampião e a chuva em branco](img/estilos_gravura_noite.png)

![O Cavaleiro em gravura: máscara em papel, capa com hachura cruzada, corpo e olhos em nanquim sólido](img/estilos_gravura_cavaleiro.png)

- **Como foi feito:**
  1. o quanto cada ponto é escuro escolhe a hachura: claro fica papel; depois entram linhas a 45°, a −45°, horizontais e mais linhas a 45°; quase preto vira nanquim sólido;
  2. os tons são esticados (3% mais claros e 3% mais escuros), porque a cena da noite é toda escura;
  3. o contorno vem da diferença entre o desenho com e sem contorno, e vira traço de nanquim.
- **Defeitos:**
  - as linhas vão todas na mesma direção na tela; numa gravura de verdade, elas acompanham a forma;
  - uma cena muito escura fica pesada no topo; precisaria de um controle de contraste.

### Marcador e lápis de cor

![A coruja normal, de marcador (cor em passadas, sombra numa segunda passada, contorno de nanquim, brilhos de caneta gel e uma mancha rosa atrás) e de lápis de cor (hachuras finas, grão do papel e contorno de lápis escuro)](img/estilos_marcador_lapis.png)

Os dois pintam **forma por forma**, na ordem do desenho e com os recortes das camadas. Usam a direção da luz do `canvas` (`light=`, a mesma do `weight=`). O céu da coruja foi tirado, e o fundo virou papel.

- **Marcador, como foi feito:**
  1. antes de cada cor, o papel fica em branco onde ela vai. É o que o artista faz, porque um marcador claro não cobre um escuro (a barriga creme sobre o corpo marrom);
  2. uma camada lisa de cor e, por cima, passadas largas na direção do comprimento da forma, com espaço e força irregulares. Onde duas se cruzam, fica mais escuro;
  3. a cor fica deslocada 1 ou 2 pixels: num lado sobra um fio de papel, no outro ela passa da linha;
  4. a sombra é uma segunda passada mais escura, do lado longe da luz: a forma menos ela mesma deslocada para a luz. Nos degradês, a cor mais escura do degradê;
  5. o contorno do próprio Weasel, em nanquim, por cima;
  6. os brilhos de caneta gel: um risquinho e um ponto branco no lado da luz das formas grandes;
  7. uma mancha rosa atrás, em passadas.
- **Lápis de cor, como foi feito:**
  1. o grão do papel é um mapa de "morrinhos"; o lápis só pinta onde a pressão vence o grão;
  2. a cor vem em hachuras finas e inclinadas, mais uma camada leve cruzada;
  3. a sombra: mais pressão e a cor mais escura, do lado longe da luz;
  4. o contorno do Weasel vira um lápis escuro, também falhado pelo grão.
- **Resultado:**
  - o lápis de cor é o mais convincente: o grão e as hachuras enganam bem de longe;
  - o marcador já parece desenho de marcador. A primeira versão tinha passadas regulares demais (parecia veludo cotelê); irregulares e mais suaves, ficou melhor.
- **Defeitos:**
  - a direção das passadas é uma regra (o comprimento da forma), e não segue o volume como faria o artista: as penas, a curva da barriga;
  - os brilhos de caneta gel caem sempre no mesmo lugar de cada forma;
  - é uma imagem parada. Animado, o desenho precisa redesenhar as passadas e o grão a cada 2 quadros (ver [No Weasel e no jogo](#no-weasel-e-no-jogo)).

### HQ antiga e moderna

![A cena da noite em quatro quadros de HQ, cada um com o balão "QUE NOITE..." e um recordatório: antiga colorida (céu roxo em pontos sobre papel-jornal, prédios em preto), antiga preto e branco (preto chapado, linhas deitadas no céu, hachura), moderna colorida (sombra em degraus) e mangá (preto chapado e retícula de pontos)](img/estilos_hq.png)

![Um pedaço de cada quadro em tamanho real, na cabeça do Cavaleiro: os pontos coloridos com a cor saindo do contorno, as linhas deitadas, os degraus de cor e os pontos do mangá](img/estilos_hq_detalhe.png)

As quatro partem da cena da noite (`noite.weasel`) desenhada três vezes: com luz, sem luz e sem contorno. O contorno é a diferença entre o desenho com e sem contorno, como na gravura. O balão e o recordatório foram desenhados à parte no protótipo, porque o Weasel não tem balão.

- **Antiga colorida (gibi dos anos 40 a 70), como foi feito:**
  1. o colorista antigo não pintava degradê. Para cada área, ele escolhia uma cor de uma tabela de 64, em que o ciano, o magenta e o amarelo entram com 0, 25, 50 ou 100%. O protótipo escolhe, ponto a ponto, a cor mais parecida dessa tabela, depois de clarear um pouco a cena (a tinta no jornal não chega ao escuro da tela);
  2. cada tinta é impressa em pontos (retícula), cada uma num ângulo, sobre papel-jornal amarelado;
  3. o preto vem só do contorno e das sombras mais fundas (os prédios), como o desenhista fazia;
  4. a cor sai 2 pixels fora do contorno: é o registro torto da impressão barata.
- **Antiga preto e branco (tira de jornal), como foi feito:**
  1. o mais escuro vira preto chapado (os prédios e o alto do céu);
  2. o céu um pouco mais claro vira linhas deitadas que vão afinando, um truque clássico para noite;
  3. os tons médios viram hachura em diagonal, e o personagem iluminado fica no papel.
- **Moderna colorida:** é o [cel shading](#cel-shading), com a cor um pouco mais forte e uma retícula leve no degrau mais escuro.
- **Mangá:** preto chapado no mais escuro e retícula de pontos a 45° nos tons médios. O tamanho do ponto segue o tom, e o papel é branco.
- **Resultado:**
  - o mangá foi o melhor de primeira;
  - a antiga colorida ficou com cara de gibi antigo: céu roxo-azulado chapado, prédios em preto e o halo do lampião em anéis.
- **Defeitos e cuidados:**
  - a primeira versão das antigas usou os tons esticados da gravura e saiu quase toda preta. Os limites agora usam o brilho real da cena; uma cena de dia precisaria de outros limites, ou de um controle de contraste;
  - na antiga colorida, o corpo do Cavaleiro ficou rosado, porque a luz da cena o deixa assim. Um colorista o pintaria de branco;
  - na página reduzida, as linhas do céu e os pontos formam um leve efeito de tela (*moiré*). Em tamanho real, isso some;
  - a retícula da moderna colorida quase não aparece, porque esta cena tem pouca sombra funda;
  - as imagens foram salvas sem o granulado do papel-jornal: ele quase não se vê e deixava o arquivo 50% mais pesado.

### Recorte de papel, vitral e massinha

![A coruja normal, de recorte de papel (peças com textura de papel, sombra embaixo e o céu em três folhas), de vitral (pedaços de vidro com chumbo, a lua brilhando) e de massinha (peças com volume e marcas de dedo, o céu desfocado atrás)](img/estilos_recorte_vitral_massinha.jpg)

Os três pintam **forma por forma**, como o marcador e o lápis, e usam a luz do `canvas` (`light=`). A imagem está em JPEG, porque as texturas deixavam o PNG com 1 MB.

- **Recorte de papel, como foi feito:**
  1. o contorno vira corte de tesoura: pequenas retas a cada poucos pixels, um pouco tortas, mantendo as pontas (estrelas, orelhas);
  2. cada peça tem a sua textura de papel (grão e fibras) e uma sombra macia embaixo, para o lado contrário da luz;
  3. a beirada do lado da luz fica um pouco mais clara, como a quina do papel;
  4. os traços viram tiras de papel (o galho e as penas da barriga);
  5. o degradê do céu vira três folhas, o céu e duas colinas onduladas, e o halo da lua vira dois círculos.
- **Vitral, como foi feito:**
  1. cada forma vira vidro, e as grandes são cortadas em pedaços (Voronoi), como o vidreiro faz. O céu virou dezenas de vidros;
  2. a cor de cada pedaço é a média do desenho dentro dele, mais forte e um pouco diferente da do vizinho;
  3. o vidro ganha manchas, estrias e a luz de trás, mais forte em cima. As partes claras brilham;
  4. o chumbo é grosso entre formas diferentes e fino entre pedaços da mesma forma, com um brilho no meio;
  5. os traços finos (as penas, o graveto) viram pintura escura no vidro, a grisalha dos vitrais de verdade;
  6. as formas pequenas demais (estrelas, o brilho dos olhos) viram contas de vidro sem chumbo em volta.
- **Massinha, como foi feito:**
  1. cada forma vira uma placa de massinha de borda redonda: a altura vem da distância até a borda, e a luz faz o resto, com um brilho leve;
  2. caroços suaves e duas ou três marcas de dedo nas peças grandes;
  3. cada peça faz uma sombra de contato na de baixo;
  4. o fundo e o céu ficam desfocados, como numa foto de *stop motion*, com vinheta e granulado de câmera.
- **Defeitos e cuidados:**
  - **papel:** papel não tem contorno, então o que era quase só contorno quase some. As pálpebras ficaram fininhas, e a coruja perdeu um pouco da cara de sono. Os anéis do halo saíram meio cinza; uma cor mais quente ficaria melhor;
  - **vitral:** na primeira versão, o chumbo engolia as estrelas e o graveto; daí vieram as contas e a grisalha. O corte em pedaços precisa ser calculado uma vez, com a figura parada: recalculado a cada quadro, o chumbo pularia de lugar;
  - **massinha:** a primeira versão tinha vincos retos no corpo, do jeito de medir a distância até a borda; um desfoque leve na altura resolveu. É a mais lenta das três: 0,8 s por quadro na coruja;
  - são imagens paradas. Animado, o papel precisa da textura seguindo o osso de cada peça (ver [No Weasel e no jogo](#no-weasel-e-no-jogo)).

## Os estilos, em três famílias

### 1. Grade: a imagem pronta é lida em células, e cada célula vira alguma coisa

Um único mecanismo serve para todos estes estilos. É a família mais fácil.

- **Pixel art** (recomendo começar por ele):
  - o voto por bloco do protótipo;
  - só as cores da palette;
  - pontilhado de pixel (*dither*, por exemplo o de Bayer) nos degradês e na luz, em vez de faixas;
  - um contorno de 1 pixel em volta da silhueta, feito depois de pixelar, para a espessura ser sempre igual.
- **ASCII art:** cada célula vira um caractere, conforme o quanto ela é escura (`' .:-=+*#%@'`).
  - Dá para melhorar com `/ \ | _` onde o contorno inclina, porque o Weasel sabe para onde cada linha vai.
  - Saída: um `.txt`, uma imagem ou um GIF.
  - O protótipo, com células de 6×12 pixels:

```
                  .+%@.     ##-
                :##%@%      @#*@+
               *%=*@@:     .%%--%%.
             :%*:.=@@-      =@-.=@#
            :@+..:%@+       %#...*@=
            %#...+@%        %#...-@%
           =@:...%@+        %#....%@:
           %*....%@-        %*....#@=
          =@-....*@+       .@+....*@+
          %*.....:%@-      +%:....*@*
         *@-......:+%%*++*%*-.....*@+
       :*%+%:........:---::.......-%%:
     =%*=:.-*=.....................:#@=
    =@-......-=:....................-@%
    %#..............................:@@.
    @*...............................%@-
   .@+...............................#@=
   :@=..................-##*:......-#@@=
   :@=.................:@@@@%:....:%@@@=
   :@=.................=@@@@@=....=@@@@=
   .@+.................:%@@@@:....:@@@@=
    %#..................:*##-.....:-*@@:
    *@:.........................::::=@@
   =#@#-:::............::::::::::::-#@#
  +@*=%@%##**++++++*******+++***##%@@%.
  %@*=-=++**%@%%%%%%%%%%%@@%@@@@@*=:.
   :+#@#*---%%++***##***#%@*#@@@@#
       *@+%@@%###*****##*#@##@@@@@.
       =@*@@@#*******#**#%@%#@@@@@-
       :#%%@%**++**#***###@##@@@@@=
           @#++*##***###+#@*#@@@@@=
          :@####****##*+*%@*%@@@@@:
          =@##*****#*+*#%@@#@@@@@@
          +@#***+*###%@@@@@@@@@@@*
          *@**##%@@@@@@@@@@@@@@@%.
          %@@@%*+#@@@#%@@@@%%#*=
          :-:    #@@@. *@@@:
```

- **Retícula (*halftone*) de quadrinho ou jornal:** bolinhas maiores onde é escuro. É a base das [HQs](#hq-antiga-e-moderna).
- **Ponto-cruz e mosaico:** variações divertidas do pixel art.

### 2. Traço: usa as formas, não só a imagem pronta

- **Esboço a lápis:**
  - as linhas ficam tremidas e passadas duas ou três vezes;
  - o tremido muda a cada 2 quadros, a "fervura" de linha dos desenhos animados.
  - Combina com o storyboard do seu irmão (ver [bocas por texto](bocas-por-texto.md)).
- **Marcador e lápis de cor:** pintam cada forma com passadas ou hachuras, como no [protótipo](#marcador-e-lápis-de-cor). Usam a mesma base do esboço.
- **Recorte de papel, vitral e massinha:** cada forma vira uma peça de papel, um vidro ou uma placa de massinha, como no [protótipo](#recorte-de-papel-vitral-e-massinha). O recorte de papel é o que mais combina com o Weasel, porque animação de recorte é o que ele já faz: peças presas em ossos.
- **Só contorno:** como um livro de colorir.
- **Neon:** só o contorno, colorido, com o `bloom` que já existe, num fundo escuro.

### 3. Tom: usa a luz que o Weasel já calcula

- **Cel shading (*toon*):** a luz em 2 ou 3 degraus de cor, sem degradê.
- **Gravura automática:** a sombra vira hachura sozinha. Hoje isso é feito à mão com `pattern`.
- **HQ:** a luz em degraus ou em faixas de tom, e cada faixa vira cor da tabela antiga, retícula, hachura ou preto chapado, como no [protótipo](#hq-antiga-e-moderna). Mistura esta família com a da grade.
- **Silhueta:** tudo numa cor só.

### Não recomendo

Aquarela realista, *low-poly* e pintura realista. São difíceis, e o resultado fica com cara de filtro.

A **aquarela simples**, de livro infantil, saiu desta lista em 13/11/2026: depois dos protótipos do marcador e do lápis, ela ficou possível (ver [abaixo](#outros-estilos-possíveis-ainda-sem-protótipo)).

## Outros estilos possíveis, ainda sem protótipo

Da resposta à pergunta "que outros estilos dá para gerar?" (13/11/2026). Os três que mais combinavam com o Weasel viraram [protótipo](#recorte-de-papel-vitral-e-massinha); estes ficaram só como ideia.

### Recomendados

- **Paletas retrô em cima do pixel art:** o pixel art do plano, com as cores trocadas por uma paleta pronta:
  - Game Boy (4 tons de verde);
  - NES;
  - PICO-8;
  - 1 bit: só preto e branco com pontilhado, como no Playdate ou no Mac antigo.

  É o que mais serve para jogo, e é pequeno depois que o pixel art existir.
- **Risografia ou serigrafia (pôster):** 2 ou 3 tintas de cor forte (rosa, azul-petróleo, amarelo) que se sobrepõem, com o registro torto e o grão. Aproveita quase tudo da [HQ antiga colorida](#hq-antiga-e-moderna), trocando a tabela de 64 cores por 2 ou 3 tintas.
- **Aquarela simples (de livro infantil):** pintada forma por forma, como o marcador:
  - a borda da mancha mais escura, onde a água secou;
  - a cor vazando um pouco da linha;
  - o pigmento granulado e o papel de aquarela.

### Variações do que já existe no plano

| Estilo | Vem de | Como sairia |
|---|---|---|
| Giz de cera | lápis de cor | traço mais grosso e mais falhado, com a cera acumulando nas beiradas |
| Giz no quadro-negro | lápis de cor | traço claro sobre verde-escuro; bom para cena de escola ou explicação em vídeo |
| Xilogravura ou linogravura | gravura | preto e branco forte, com sulcos brancos largos e cortes mais toscos |
| Bordado | marcador | pontos de linha na direção da forma, com o brilho do fio |
| Tricô ou crochê | a grade do pixel art | cada célula vira um "V" de ponto |
| Estêncil ou grafite | retícula e posterização | 2 ou 3 tons chapados, com respingo de spray nas bordas |

### Efeitos de tela, para filme

Não são estilos de desenho: vão por cima de qualquer estilo.
- **Filme antigo / cinema mudo:** sépia ou preto e branco, riscos, poeira, a luz piscando e a imagem tremendo um pouco. É muito fácil e combina com os filmes do YouTube.
- **VHS, CRT e *glitch*:** linhas de TV, cores separadas e falhas.
- **No jogo:** ficam melhor como um shader no Godot, por cima da tela inteira, e não na sprite sheet.

## No Weasel e no jogo

(Escrito antes das [Decisões](#decisões-de-14112026): o nome ficou `art`, e não opções do `finish`.)

- **Nada muda sozinho.** Cada estilo seria uma opção nova no `finish`, por exemplo `pixel=8 crisp` para o voto por bloco. Sem a opção, o `pixel=8` continua igual a hoje, e os arquivos existentes e os testes não mudam. O nome das opções ainda está aberto.
- **Pixel art no Godot:**
  - **O tamanho da folha:** hoje ela sai grande (800×640, em blocos de 8×8). Funciona, mas pesa 64 vezes mais e borra se o Godot aumentar a imagem com suavização. O certo é exportar no tamanho pequeno de verdade (100×80) e configurar a cena para não suavizar (`texture_filter` em *nearest*).
  - **O tremido:** quando um osso gira, os pixels tremem de um quadro para o outro. É o problema clássico de girar pixel art. O voto por bloco diminui o tremido, mas não acaba com ele.
  - **O `normal=`:** o mapa de relevo também teria de sair pixelado.
- **Cel shading e gravura no Godot:** a sprite sheet já sai no estilo. Só a luz do próprio Godot (`normal=`) continua suave, porque os degraus vêm da luz do Weasel.
- **ASCII, esboço e retícula:** servem mais para filme e storyboard. No jogo só fazem sentido se o jogo inteiro for nesse estilo, e aí a sprite sheet sai no estilo, como já acontece hoje.
- **HQ:** seria uma opção do `finish`, por exemplo `comic=antiga|antiga-pb|moderna|manga`, feita com as mesmas peças do cel shading e da gravura. No jogo, há dois caminhos:
  - **a retícula gravada na sprite sheet:** a folha precisa sair no tamanho final, porque pontos redimensionados formam *moiré*, e os pontos andam junto com o personagem;
  - **um shader no Godot** que aplica os pontos na hora, presos à tela: a sprite sheet sai só em cel shading, e nada muda no Weasel.
- **Recorte de papel, vitral e massinha no jogo:**
  - **recorte de papel:** sai direto na sprite sheet. A sombra de cada peça já vem desenhada, então ela não depende da luz do Godot;
  - **massinha:** também sai na sprite sheet, mas é a mais lenta de gerar (0,8 s por quadro na coruja), e o `normal=` teria de seguir o volume da massinha;
  - **vitral:** só se o jogo inteiro for de vitral. O corte em pedaços é feito uma vez, na pose parada, e acompanha os ossos depois.
- **Texturas na animação (esboço, marcador, lápis, gravura, retícula):** a textura pode se comportar de três jeitos.
  - **Parada no papel:** o personagem anda e a textura fica no lugar; parece que ele passa por trás de um vidro canelado. Não recomendo, com uma exceção: a retícula das HQs. Na página impressa, os pontos são da impressão e não do desenho, então ficar parada na tela é o certo.
  - **Presa à forma:** anda junto com ela; fica limpo, mas parece um adesivo. No recorte de papel, é o certo: papel de verdade anda junto com a peça.
  - **Redesenhada a cada 2 quadros,** como a fervura do esboço: parece animação desenhada à mão de verdade. Recomendo para o filme e o storyboard.
- **Peso:** o grão e as passadas comprimem mal; a sprite sheet e o GIF ficam bem mais pesados.

## Ordem sugerida

1. **Pixel art de verdade:** o voto por bloco, o pontilhado, o contorno de 1 pixel e a folha pequena para o Godot. As paletas retrô (Game Boy, NES, PICO-8, 1 bit) saem logo depois, quase de graça.
2. **ASCII:** é pequeno, porque aproveita a grade do pixel art.
3. **Esboço, marcador, lápis de cor, recorte de papel e massinha:** a mesma base (pintar forma por forma).
   - Os três primeiros e a massinha, com fervura, para o storyboard e o filme.
   - O recorte de papel, com a textura presa a cada peça, serve também para o jogo.
4. **Cel shading, gravura automática e HQ:** depois. As HQs aproveitam o cel shading (a moderna colorida) e as faixas de tom da gravura (as outras três).
5. **Vitral:** por último. Serve mais para filme (uma abertura, uma cena de igreja ou castelo) do que para personagem andando.

Os [outros estilos possíveis](#outros-estilos-possíveis-ainda-sem-protótipo) entram junto da base que eles aproveitam: a aquarela, o giz e o bordado no item 3; a risografia, a xilogravura e o estêncil no item 4. Os efeitos de tela (filme antigo, VHS) são pequenos e podem entrar a qualquer momento.

## Para decidir

As quatro perguntas daqui foram respondidas em 14/11/2026: ver [Decisões](#decisões-de-14112026).
