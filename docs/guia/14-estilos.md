# 14. Estilos de arte

[← Problemas comuns](13-problemas.md) · [Índice](README.md)

O Weasel guarda o desenho como formas, e não como uma imagem pronta. Por isso ele pode pintar o mesmo desenho de outro jeito: em pixel art, em letras (ASCII) e, nas próximas versões, em outros estilos. Para isso serve a linha `art`.

| O desenho normal | `art pixel` | `art ascii color` |
|---|---|---|
| ![Uma vila à noite: céu em degradê do azul-escuro ao laranja, lua, morro verde e uma casinha vermelha com a janela acesa](img/14_vila.png) | ![A mesma vila em blocos de 8 por 8 pixels, com as cores do próprio desenho](img/14_vila_pixel.png) | ![A mesma vila feita de letras coloridas sobre o fundo escuro](img/14_vila_ascii.png) |

<details>
<summary>Código dos três</summary>

<!-- gerar: img/14_vila.png -->
```weasel
canvas 240 160 bg=ceu
gradient ceu linear 0,0 0,160 : #0b1030@0 #3a4f9a@0.6 #f0b070@1
palette ink=#141320 line=3
ellipse lua 190,38 16 c=#fff3c4
shape morro c=#2b4a3a ink=line : 0,128! 70,104 140,120 200,100 240,112! 240,160! 0,160!
shape telhado c=#5a2a2a ink=line : 34,98! 62,74! 90,98!
rect casa 40,96 44,34 c=#c44536 ink=line
rect janela 54,106 12,12 c=#ffd34d
```

<!-- gerar: img/14_vila_pixel.png -->
```weasel
canvas 240 160 bg=ceu
art pixel
gradient ceu linear 0,0 0,160 : #0b1030@0 #3a4f9a@0.6 #f0b070@1
palette ink=#141320 line=3
ellipse lua 190,38 16 c=#fff3c4
shape morro c=#2b4a3a ink=line : 0,128! 70,104 140,120 200,100 240,112! 240,160! 0,160!
shape telhado c=#5a2a2a ink=line : 34,98! 62,74! 90,98!
rect casa 40,96 44,34 c=#c44536 ink=line
rect janela 54,106 12,12 c=#ffd34d
```

<!-- gerar: img/14_vila_ascii.png -->
```weasel
canvas 240 160 bg=ceu
art ascii color
gradient ceu linear 0,0 0,160 : #0b1030@0 #3a4f9a@0.6 #f0b070@1
palette ink=#141320 line=3
ellipse lua 190,38 16 c=#fff3c4
shape morro c=#2b4a3a ink=line : 0,128! 70,104 140,120 200,100 240,112! 240,160! 0,160!
shape telhado c=#5a2a2a ink=line : 34,98! 62,74! 90,98!
rect casa 40,96 44,34 c=#c44536 ink=line
rect janela 54,106 12,12 c=#ffd34d
```

</details>

Os três códigos são iguais, menos a linha `art`. Repare:

- O desenho continua o mesmo: as formas, os ossos e as animações não mudam. Só a pintura final muda.
- A primeira palavra depois de `art` é o **estilo**; depois vêm as opções dele. Os nomes são em inglês.
- Um `art` por arquivo. Sem `art`, nada muda. `art none` desliga o estilo (serve no filme, mais abaixo).
- A linha pode ficar em qualquer lugar do arquivo; o costume é logo depois do `canvas`, como o `finish`.

Nesta versão existem dois estilos: `pixel` e `ascii`. Os outros do plano (`sketch`, `comic`, `toon`, `cutout`…) entram nas próximas versões; por enquanto, um desses nomes dá erro dizendo que ainda não foi feito.

**No editor:** o desenho aparece no estilo, e as alças continuam nos pontos das formas, então você edita do mesmo jeito. Quando o arquivo tem `art`, aparece a chave **Estilo** (o ícone de quadradinhos, ao lado do papel vegetal) na barra de cima do desenho: desligada, ela mostra o desenho normal, que é mais fácil de ajustar.

## Pixel art: `art pixel`

```
art pixel size= palette= dither= outline small
```

### O voto por bloco

O `finish pixel=` (do [capítulo 4](04-camadas.md#acabamento-finish)) já pixelava o desenho, mas ele faz a **média** das cores de cada bloco. O `art pixel` faz um **voto**: cada bloco fica com a cor que mais aparece nele.

| `finish game pixel=8` | `art pixel size=8` |
|---|---|
| ![A gosma verde pixelada pela média: as bordas ficam com tons misturados e o contorno some em cinza](img/14_gosma_finish.png) | ![A gosma em pixel art: cada bloco tem uma cor só do desenho, e o contorno escuro continua inteiro](img/14_gosma_art.png) |

<details>
<summary>Código dos dois</summary>

<!-- gerar: img/14_gosma_finish.png -->
```weasel
canvas 200 160 bg=#cfe8f5
finish game pixel=8
palette ink=#2b2a33 line=5
gradient verde linear 0,0 0,1 box : #9be38c #3f9a4a
shape corpo c=verde ink=line weight=0.3 : 100,24 160,96 152,138! 48,138! 40,96
ellipse olhoE 84,90 8,12 c=ink
ellipse olhoD 118,90 8,12 c=ink
ellipse brilho 76,60 11,6 rot=-35 c=#e6fadf
```

<!-- gerar: img/14_gosma_art.png -->
```weasel
canvas 200 160 bg=#cfe8f5
art pixel size=8
palette ink=#2b2a33 line=5
gradient verde linear 0,0 0,1 box : #9be38c #3f9a4a
shape corpo c=verde ink=line weight=0.3 : 100,24 160,96 152,138! 48,138! 40,96
ellipse olhoE 84,90 8,12 c=ink
ellipse olhoD 118,90 8,12 c=ink
ellipse brilho 76,60 11,6 rot=-35 c=#e6fadf
```

</details>

Repare:

- Com o `finish pixel=`, a borda de um bloco que pega o verde e o azul vira uma cor do meio, que não existe no desenho. No `art pixel`, cada bloco tem **uma cor do desenho**.
- O contorno é fino (5 pixels) perto de um bloco de 8, então ele perderia quase todos os votos. Por isso a cor da tinta (`ink`) ganha com 1/4 do bloco: o contorno não se desfaz. Os olhos, pintados com `c=ink`, também contam como tinta, e por isso não somem.
- A cor de cada ponto é comparada do jeito que o olho vê (um azul-escuro fica perto de outro azul, e não de um verde-escuro de mesma claridade).
- Num desenho sem fundo, o bloco fica transparente quando o vazio é maior que a cor mais votada.
- `size=8` é o tamanho do bloco, de 1 a 64 (padrão 8). A grade começa no `0,0` do canvas, então o mesmo ponto cai sempre no mesmo bloco.

### As paletas: `palette=`

Sem `palette=`, as cores são as **do próprio desenho** (`palette=own`): as da `palette`, as das formas, as dos gradientes e o fundo. As outras paletas imitam consoles antigos:

| `palette=gameboy dither=bayer` | `palette=pico8` | `palette=mono dither=bayer` |
|---|---|---|
| ![A vila em quatro tons de verde, com o céu em pontinhos alternados](img/14_vila_gameboy.png) | ![A vila nas 16 cores do PICO-8](img/14_vila_pico8.png) | ![A vila só em preto e branco, com o degradê do céu feito de pontinhos](img/14_vila_mono.png) |

<details>
<summary>Código dos três</summary>

<!-- gerar: img/14_vila_gameboy.png -->
```weasel
canvas 240 160 bg=ceu
art pixel size=5 palette=gameboy dither=bayer
gradient ceu linear 0,0 0,160 : #0b1030@0 #3a4f9a@0.6 #f0b070@1
palette ink=#141320 line=3
ellipse lua 190,38 16 c=#fff3c4
shape morro c=#2b4a3a ink=line : 0,128! 70,104 140,120 200,100 240,112! 240,160! 0,160!
shape telhado c=#5a2a2a ink=line : 34,98! 62,74! 90,98!
rect casa 40,96 44,34 c=#c44536 ink=line
rect janela 54,106 12,12 c=#ffd34d
```

<!-- gerar: img/14_vila_pico8.png -->
```weasel
canvas 240 160 bg=ceu
art pixel size=5 palette=pico8
gradient ceu linear 0,0 0,160 : #0b1030@0 #3a4f9a@0.6 #f0b070@1
palette ink=#141320 line=3
ellipse lua 190,38 16 c=#fff3c4
shape morro c=#2b4a3a ink=line : 0,128! 70,104 140,120 200,100 240,112! 240,160! 0,160!
shape telhado c=#5a2a2a ink=line : 34,98! 62,74! 90,98!
rect casa 40,96 44,34 c=#c44536 ink=line
rect janela 54,106 12,12 c=#ffd34d
```

<!-- gerar: img/14_vila_mono.png -->
```weasel
canvas 240 160 bg=ceu
art pixel size=5 palette=mono dither=bayer
gradient ceu linear 0,0 0,160 : #0b1030@0 #3a4f9a@0.6 #f0b070@1
palette ink=#141320 line=3
ellipse lua 190,38 16 c=#fff3c4
shape morro c=#2b4a3a ink=line : 0,128! 70,104 140,120 200,100 240,112! 240,160! 0,160!
shape telhado c=#5a2a2a ink=line : 34,98! 62,74! 90,98!
rect casa 40,96 44,34 c=#c44536 ink=line
rect janela 54,106 12,12 c=#ffd34d
```

</details>

| Opção | O que faz |
|---|---|
| `size=8` | O tamanho do bloco, de 1 a 64 (padrão 8). |
| `palette=` | `own` (padrão, as cores do desenho), `gameboy` (4 verdes), `nes` (as cores do Nintendinho), `pico8` (16 cores) ou `mono` (preto e branco). Cada bloco fica com a cor mais parecida da paleta. |
| `dither=bayer` | Pontilhado: nos degradês, mistura duas cores em pontinhos alternados, em vez de faixas. Só entra onde a cor muda devagar (no `mono`, entra em tudo). `dither=none` é o padrão. |
| `outline` | Um contorno de 1 bloco, na cor da tinta (`ink`), em volta do desenho. Ótimo para personagens de jogo, que precisam se destacar do cenário. |
| `small` | A sprite sheet e o Godot saem no tamanho pequeno de verdade (veja abaixo). |

**Experimente:** no código do `pico8`, troque para `palette=nes`, e depois para `size=10`.

### Contorno de 1 bloco: `outline`

<!-- gerar: img/14_outline.png -->
```weasel
canvas 200 160 bg=none
art pixel size=6 outline
palette ink=#2b2a33 line=5
gradient verde linear 0,0 0,1 box : #9be38c #3f9a4a
shape corpo c=verde weight=0.3 : 100,24 160,96 152,138! 48,138! 40,96
ellipse olhoE 84,90 8,12 c=ink
ellipse olhoD 118,90 8,12 c=ink
ellipse brilho 76,60 11,6 rot=-35 c=#e6fadf
```

![A gosma sem contorno no código, mas com um contorno escuro de um bloco em volta, em fundo transparente](img/14_outline.png)

Repare:

- O `corpo` não tem `ink=` (sem contorno no código). O `outline` desenha o contorno pela borda do desenho inteiro, de 1 bloco, sempre nítido.
- O contorno fica **por fora** do desenho, nos blocos vazios em volta dele: a figura cresce 1 bloco de cada lado. Na sprite sheet com `--trim`, o recorte já conta com ele.
- A cor é a da `ink` da `palette` (ou a mais parecida dela, se houver `palette=`).

### Pixel art no jogo: `small`

Sem `small`, a sprite sheet sai do tamanho do `canvas`, com cada bloco feito de vários pixels iguais. Funciona, mas pesa muito mais. Com `small`, **a sprite sheet e o pacote do Godot** saem com 1 pixel por bloco:

<!-- gerar: img/14_small.png -f sheet -a all -s 3 -->
```weasel
canvas 160 160 bg=none
art pixel size=4 outline small
palette ink=#1d1b26 line=5 sombra=#9c8f7c
gradient brilho radial 66,70 60 : #ffd9c9@0 #ff6b4a@0.7 #c43c25@1
bone sombra pivot=80,148
bone bola pivot=80,146
ellipse s 80,148 34,7 c=sombra bone=sombra
ellipse b 80,112 34 c=brilho ink=line weight=0.3 bone=bola
anim quica frames=4 fps=8
key 0 bola=0,0,0,1.2,0.8 sombra=0,0,0,1.1 ease=out
key 2 bola=0,-60,0,1,1 sombra=0,0,0,0.6 ease=in
key 4 bola=0,0,0,1.2,0.8 sombra=0,0,0,1.1
```

![A bola quicando numa sprite sheet de 4 quadros, em pixel art nítido](img/14_small.png)

Repare:

- A bola tem 160×160 de canvas e blocos de 4: com `small`, cada quadro teria 40×40 pixels. A imagem acima usou `-s 3`, e com `small` a escala conta **pixels por bloco**: cada bloco virou 3×3 pixels.
- O recorte da folha (o `--trim`) também anda de bloco em bloco, para a grade não escorregar entre um quadro e outro.
- O **vídeo, o GIF e o PNG** saem sempre do tamanho do `canvas` (vezes a escala), com o pixel nítido: o `small` vale só para o jogo.

**No Godot** ([capítulo 9](09-jogo-godot.md)), com qualquer `art pixel`:

- a cena sai com `texture_filter = 1` (*nearest*): o Godot não suaviza a imagem, e o pixel continua nítido quando a câmera aproxima;
- o mapa de relevo (`godot normal=`) sai pixelado também, um tom por bloco;
- com `small`, a folha e as caixas de colisão saem na escala pequena, juntas;
- o esqueleto de verdade (`godot rig=bones`) desenha cada peça no estilo na pose parada. Quando a peça gira no Godot, os pixels giram junto e saem da grade. Para pixel art que gira, prefira a folha de quadros (`--no-rig`).

## ASCII: `art ascii`

```
art ascii size=largura,altura chars= color
```

O desenho vira uma grade de letras: cada célula vira a letra que tem mais ou menos a mesma "quantidade de tinta" que aquele pedaço do desenho.

| `art ascii` | `art ascii size=4,8 color` |
|---|---|
| ![O Cavaleiro feito de letras escuras sobre o fundo bege](img/14_ascii.png) | ![O Cavaleiro com letras menores e coloridas, com a cor de cada pedaço do desenho](img/14_ascii_cor.png) |

<details>
<summary>Código dos dois</summary>

<!-- gerar: img/14_ascii.png -s 0.6 -->
<!-- gerar: img/14_ascii.txt -->
```weasel
include "cavaleiro.weasel"
art ascii
```

<!-- gerar: img/14_ascii_cor.png -s 0.6 -->
```weasel
include "cavaleiro.weasel"
art ascii size=4,8 color
```

</details>

Repare:

- O `include` traz o Cavaleiro dos exemplos inteiro; a linha `art` de baixo vale para ele.
- O ASCII também sai **em texto**: [este .txt](img/14_ascii.txt) é o mesmo desenho, uma linha de texto por linha de letras. Na linha de comando, é só dar um nome terminado em `.txt` (ou usar `-f txt`); no editor, é o botão **Texto (ASCII)** da janela de exportar.
- O fundo do `canvas` é o **papel**: as letras marcam o que é diferente dele. Num fundo escuro, as letras saem claras.

| Opção | O que faz |
|---|---|
| `size=6,12` | A largura e a altura de cada letra, de 2 a 64 (padrão `6,12`). Um número só, `size=5`, vale `5,10` (a letra tem o dobro da altura). |
| `chars=" .:-=+*#%@"` | As letras, da mais clara para a mais escura (esse é o padrão). Com espaço no meio, use aspas. |
| `color` | Cada letra pega a cor daquele pedaço do desenho, em vez da cor da tinta. |

**Experimente:** troque para `chars=" .oO@"`, ou use `size=8` para letras maiores.

## No filme: o filme, a cena, o plano e o ator

No filme ([capítulo 10](10-filme.md)), o `art` vale em quatro níveis. O mais específico ganha:

| Onde vale | Como escrever |
|---|---|
| O filme todo | `art` antes do primeiro `shot` |
| Uma cena | `art` no começo do arquivo da cena (o `scene "cena01.weasel"`) |
| Um plano | `art` dentro do bloco do `shot` |
| Um ator | `art … actor=nome` (antes do primeiro `shot`, para o filme todo, ou dentro de um `shot`) |

<!-- gerar: img/14_filme_pixel.png --frame 6 -->
<!-- gerar: img/14_filme_letras.png --frame 18 -->
<!-- gerar: img/14_filme_ator.png --frame 30 -->
```weasel
film fps=12
canvas 480 270 bg=#1d2b53
art pixel size=6 palette=pico8

layer chao
rect grama 0,220 480,50 c=#008751
ellipse lua 400,60 26 c=#fff1e8

actor heroi "cavaleiro.weasel" 150,250 scale=0.35
actor fantasma "fantasma.weasel" 340,240 origin=240,350 scale=0.4 hide=ceu

# 1. o filme todo em pixel art
shot pixel dur=1s

# 2. este plano em letras
shot letras dur=1s
art ascii size=5,10

# 3. só o fantasma em letras; o resto continua em pixel art
shot fantasma dur=1s
art ascii actor=fantasma
```

| `shot pixel` | `shot letras` | `shot fantasma` |
|---|---|---|
| ![O Cavaleiro e o fantasma em pixel art, com a lua e a grama](img/14_filme_pixel.png) | ![O mesmo quadro inteiro em letras claras sobre o fundo escuro](img/14_filme_letras.png) | ![O Cavaleiro em pixel art e o fantasma em letras, no mesmo quadro](img/14_filme_ator.png) |

Repare:

- O `art` do arquivo do personagem vale para o jogo e para as exportações dele. No filme, quem decide é o filme: um `cavaleiro.weasel` com `art pixel` aparece normal num filme sem `art`.
- Quando o quadro inteiro tem o mesmo estilo, ele é aplicado de uma vez, numa grade só. Um ator com outro estilo é desenhado sozinho e encaixado na ordem de profundidade de sempre (o fantasma do terceiro plano).
- `art none` num plano ou num ator desliga o estilo só ali.
- Num quadro todo em `ascii`, a linha de comando também tira o `.txt`: `node cli/weasel.js filme.weasel --frame 18 -o quadro.txt`.
- O `--info` mostra o `art` do filme, de cada plano e de cada ator.

## Junto com o resto

- **`finish`:** o `bloom=`, o `vignette=`, o `grain=` e o `posterize=` entram **depois** do estilo, por cima da imagem pronta. O `finish pixel=` não entra junto com um `art` (o Weasel avisa): use o `size=` do `art pixel`.
- **SVG:** o SVG é feito das formas, então sai **sem o estilo** (a linha de comando avisa, e a janela de exportar diz isso).
- **`boil=` e `seed=`:** valem em todos os estilos. O `boil=2` redesenha a textura a cada 2 quadros, como a linha que "ferve" num desenho à mão; o `seed=` sorteia outra versão do mesmo desenho. O `pixel` e o `ascii` não têm textura, então os dois ainda não mudam nada neles (o Weasel avisa); eles servem para os estilos das próximas versões.

[← Problemas comuns](13-problemas.md) · [Índice](README.md)
