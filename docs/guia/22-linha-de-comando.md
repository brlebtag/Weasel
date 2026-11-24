# 22. Linha de comando

[← Funções das contas](21-funcoes.md) · [Índice](README.md) · [Próximo: O editor →](23-editor.md)

A linha de comando desenha e exporta sem abrir o editor. Você escreve um comando, e o Weasel lê o arquivo `.weasel` e salva a imagem, a animação, a sprite sheet, a cena do Godot ou o vídeo. Ela usa o mesmo código do editor, então o desenho sai igual. O editor exporta quase tudo isso pela janela **Exportar**; o vídeo com som e o ProRes só saem daqui.

Este capítulo começa pelo terminal, para quem nunca usou um. Depois vem uma seção para cada coisa que você quer fazer, com o comando típico e uma tabela das opções. Todas as opções do Weasel estão aqui. A lista curta sai com `node cli/weasel.js --help`.

## O terminal

### O que é

O terminal é uma janela onde você escreve comandos em vez de clicar. Cada comando é uma linha: você digita e aperta **Enter**. A resposta aparece embaixo, e o terminal fica esperando o próximo comando.

No Windows, o terminal é o **Prompt de Comando** ou o **PowerShell** (os dois servem). No macOS e no Linux, é o **Terminal**.

### Antes da primeira vez

A linha de comando precisa do [Node.js](https://nodejs.org), versão 18 ou mais nova. Instale uma vez. Depois, com o terminal aberto na pasta do Weasel (veja abaixo como), rode:

```bash
npm install
```

Isso baixa a biblioteca que desenha as imagens. Também é uma vez só. Sem ela, o Weasel responde `weasel: falta a biblioteca de desenho. Rode "npm install" na pasta do projeto.`

### Abrir o terminal na pasta do Weasel

Os comandos deste capítulo rodam **na pasta do Weasel**: a que tem o `index.html` e as pastas `cli` e `exemplos`.

- **Windows:** abra a pasta do Weasel no Explorador de Arquivos. Clique na barra de endereço, escreva `cmd` no lugar do caminho e aperte **Enter**. O terminal abre já na pasta. No Windows 11, também dá para clicar com o botão direito num espaço vazio da pasta e escolher **Abrir no Terminal**.
- **macOS:** abra o **Terminal** (em Aplicativos › Utilitários), digite `cd ` (com o espaço) e arraste a pasta do Weasel para dentro da janela: o caminho aparece sozinho. Aperte Enter.
- **Linux:** clique com o botão direito dentro da pasta e escolha **Abrir no terminal** (o nome muda um pouco de um sistema para outro).
- **Em qualquer sistema:** abra o terminal e vá até a pasta com `cd`, com o caminho entre aspas: `cd "C:\Users\voce\Documents\Weasel"`.

Para conferir, rode `node cli/weasel.js --version`: a resposta é o número da versão do Weasel. Se aparecer `Cannot find module`, o terminal não está na pasta do Weasel. Se o terminal disser que não conhece `node`, falta instalar o Node.js.

### O primeiro comando

```bash
node cli/weasel.js exemplos/bola.weasel
```

Palavra por palavra:

- `node` roda um programa escrito em JavaScript;
- `cli/weasel.js` é o programa do Weasel, dentro da pasta `cli`;
- `exemplos/bola.weasel` é o desenho: um dos exemplos que vêm com o Weasel.

A resposta:

```
salvo bola.png  480×360 · 7 KB
```

O Weasel salvou `bola.png`, com 480 × 360 pixels e 7 KB. A imagem fica **na pasta onde o terminal está** (aqui, a do Weasel), e não na pasta do desenho. Para escolher o nome e a pasta, use `-o`:

```bash
node cli/weasel.js exemplos/bola.weasel -o imagens/bola.png
```

- As pastas do caminho são criadas se ainda não existirem.
- Se já existir um arquivo com esse nome, ele é trocado pelo novo, sem perguntar.
- Os números usam ponto, não vírgula: `-s 0.5`. Com `-s 0,5`, a resposta é `weasel: --scale precisa de um número`.

Também funciona `npm run weasel -- exemplos/bola.weasel -o bola.png` (tudo o que vem depois do `--` vai para o Weasel). E um `npm link` na pasta do Weasel instala o comando `weasel`, que roda de qualquer pasta: `weasel desenho.weasel`.

### Ler uma mensagem de erro

Salve este arquivo como `ceu.weasel`, na pasta do Weasel. Ele tem um erro e um aviso de propósito:

```
canvas 300 200 bg=#f4efe6
ellipse sol 150,100 50 c=amarelo
ellipse lua 250,50 20 c=#dddddd opacity=3
```

```bash
node cli/weasel.js ceu.weasel
```

A resposta:

```
ceu.weasel:2:24: erro: cor desconhecida "amarelo"
  2 | ellipse sol 150,100 50 c=amarelo
    |                        ^^^^^^^^^
ceu.weasel:3:33: aviso: opacity= deve ficar entre 0 e 1
  3 | ellipse lua 250,50 20 c=#dddddd opacity=3
    |                                 ^^^^^^^^^
weasel: 1 erro(s); nada foi exportado (use --force para exportar ignorando as linhas com erro).
```

Como ler:

- `ceu.weasel:2:24` é o arquivo, a **linha** 2 e a **coluna** 24 (a 24ª letra da linha, contando os espaços).
- Depois vem o tipo (`erro` ou `aviso`) e o que aconteceu.
- Embaixo aparece a própria linha, e os `^^^` apontam o pedaço com o problema.
- A última linha conta os erros e diz que **nada foi salvo**.

Um **erro** impede a exportação: com qualquer erro, nenhum arquivo sai. Um **aviso** não impede: o arquivo sai, mas quase sempre diferente do que você queria. Aqui, o `opacity=3` vira 1, o máximo.

Com `--force`, o Weasel salva mesmo com erros e pula o que não entendeu, como o editor faz:

```bash
node cli/weasel.js ceu.weasel --force
```

As mesmas mensagens aparecem, e no fim vem `salvo ceu.png  300×200 · 1 KB`. O sol não aparece: sem a cor, ele ficou sem preenchimento. A lua sai com opacidade 1.

O [capítulo 25](25-problemas.md) explica as mensagens mais comuns e como resolver cada uma.

### Erros no comando

Quando o problema está no comando, e não no desenho, a mensagem começa com `weasel:`, e a linha de baixo lembra da ajuda:

```
weasel: --scale deve ficar entre 0.05 e 16
Use "weasel --help" para ver as opções.
```

| Mensagem | O que quer dizer |
|---|---|
| `opção desconhecida "--escala"` | essa opção não existe; confira como se escreve |
| `falta o valor de -s` | a opção precisa de um valor logo depois dela (`-s 2`) |
| `--scale precisa de um número` | o valor não é um número (ou usa vírgula no lugar do ponto) |
| `--scale deve ficar entre 0.05 e 16` | o número está fora da faixa; a mensagem usa o nome longo, mesmo que você tenha escrito `-s` |
| `não consegui ler "desenho.weasel" (ENOENT)` | não existe arquivo com esse nome nesse caminho |
| `só um arquivo de entrada por vez ("a.weasel" e "b.weasel")` | sobrou uma palavra solta no comando: um valor sem a opção dele, ou um nome com espaço sem aspas |

Ao terminar, o Weasel devolve um número ao sistema (o código de saída), útil em scripts: `0` deu certo; `1` o desenho tem erros; `2` o comando tem um problema (uma opção, um arquivo que não existe, o ffmpeg que falta); `3` o ffmpeg falhou, ou outro problema inesperado.

## Os formatos de saída

O formato sai da **extensão** do `-o`. O `-f` escolhe o formato pelo nome: quando a extensão não basta (`-f sheet`, `-f build`) ou quando não há `-o`. Com os dois, eles precisam combinar: `-f sheet` com `.png`, `.json` ou `.zip`; `-f godot` com `.tres`, `.png` ou `.zip`; `-f build` com `.gif`, `.webp` ou um vídeo; os outros, com a extensão da tabela.

| Extensão do `-o` | Valor do `-f` | O que sai |
|---|---|---|
| `.png` | `png` | uma imagem PNG; com `--frames`, uma por quadro |
| `.jpg` ou `.jpeg` | `jpg` ou `jpeg` | uma imagem JPG (sem transparência) |
| `.svg` | `svg` | o desenho em vetor, que aumenta sem perder a nitidez; sai sem o estilo do `art` |
| `.txt` | `txt` | as letras de um desenho com `art ascii` |
| `.gif` | `gif` | um GIF animado |
| `.webp` | `webp` | um WebP animado (só de desenhos, não de filmes) |
| — | `build` | a pintura passo a passo: um GIF, ou o formato do `-o` (`.webp` ou um vídeo) |
| `.zip` ou `.json` | `sheet` | a sprite sheet: um PNG com os quadros e um JSON; com `.zip`, os dois dentro de um zip |
| `.tres` | `godot` | a sprite sheet e o SpriteFrames do Godot; num arquivo com `tileset`, o TileSet |
| `.tscn` | `tscn` | a cena pronta do Godot: a folha, o normal map, o `.tres`, o `.tscn` e o `weasel_anim.gd` |
| `.mp4` | `mp4` | vídeo H.264, que toca em qualquer lugar |
| `.mkv` | `mkv` | o mesmo vídeo H.264, em MKV |
| `.mov` | `mov` | vídeo ProRes, feito para editar; com `-t`, guarda a transparência |
| `.webm` | `webm` | vídeo VP9; com `-t`, guarda a transparência |
| `.wav` | `wav` | só filmes: o som misturado |
| `.edl` | `edl` | só filmes: a linha do tempo para o editor de vídeo |
| `.fcpxml` | `fcpxml` | só filmes: a linha do tempo em outro formato |

- Sem `-o` e sem `-f`, sai PNG. Num filme (um arquivo com a linha `film`), sai MP4; com `--frame`, `--time` ou `--contact`, PNG.
- Uma extensão que o Weasel não conhece dá erro, e nada é salvo: `extensão desconhecida ".bmp" no -o`. O `-o` sem extensão também: `falta a extensão no -o`. E um `-f` desconhecido: `formato desconhecido "bmp"`.
- Um `-f` e um `-o` que não combinam dão erro, com a extensão certa: `-f gif e -o x.png não combinam; use -o x.gif`.
- Um filme não sai em `.tscn`, `.tres`, `.zip` nem `.json`: a sprite sheet e o Godot são para desenhos de jogo.
- Até a versão 1.67.10, a extensão desconhecida (ou nenhuma) dava um PNG com esse nome, sem aviso, e com os dois, valia o `-f`, com o nome do `-o`.
- Os vídeos precisam do [ffmpeg](https://ffmpeg.org) (veja [Vídeo de um desenho](#vídeo-de-um-desenho)).

### O nome do arquivo, sem `-o`

Sem `-o`, o nome vem do arquivo de entrada, e o arquivo fica na pasta onde o terminal está:

| O que sai | Nome |
|---|---|
| uma imagem | `bola.png` |
| um quadro de uma animação | `bola_quica_3.png` (a animação e o quadro) |
| um arquivo por quadro | `bola_quica_000.png`, `bola_quica_001.png`… |
| GIF, WebP ou vídeo de uma animação | `bola_quica.gif`; de uma sequência, `furao_idle_down-walk_down.gif`; da pintura, `cavaleiro_pintura.gif` |
| sprite sheet e `-f godot` | `cavaleiro_todas.png` e `cavaleiro_todas.json` (ou `.tres`); com `-a jump`, `cavaleiro_jump.png` |
| cena do Godot | `furao.tscn`, com os outros arquivos ao lado |
| folha de conferência | `chefe_todas_conferencia.png`; num filme, `filme_conferencia.png` |
| filme | `filme.mp4`; um quadro, `filme_00096.png` (o número do quadro); um plano, `filme_pulo.mp4` |
| `--simplify` | `chefe_simple.weasel`, **na pasta do arquivo de entrada** |
| o traçado de uma imagem | `raposa.weasel`, **na pasta da imagem** |

Com `--variant all`, cada variante ganha o nome dela no fim: `coruja_neve.png`.

## Rodar e conferir

Antes de exportar, dá para só conferir o código:

```bash
node cli/weasel.js exemplos/bola.weasel --check
```

A resposta é `sem erros.` Com avisos, `sem erros (só avisos).`; com erros, a lista deles e `1 erro(s).` (o número de erros).

E `--info` mostra o que o arquivo tem, sem desenhar nada:

```bash
node cli/weasel.js exemplos/bola.weasel --info
```

```
canvas   480 × 360, fundo #f4efe6
camadas  4
  chao             1 item(ns)
  sombra           1 item(ns)
  bola             1 item(ns)  trail
  brilho           1 item(ns)  clip=b
formas   4
ossos    sombra, bola
animações 1
  quica          24 quadros, 24 fps
```

Para desenhar um código curto sem criar arquivo, escreva o código entre aspas, depois de `-e`. O `;` separa as linhas:

```bash
node cli/weasel.js -e "canvas 200 100;ellipse sol 100,50 40 c=#ffb000" -o sol.png
```

O código também pode chegar de outro programa, pela entrada padrão, com `-`. No Prompt de Comando do Windows, use `type` no lugar de `cat`:

```bash
cat exemplos/bola.weasel | node cli/weasel.js - -o bola.png
```

| Opção | O que faz | Valores | Padrão |
|---|---|---|---|
| `-e`, `--eval` | desenha o código escrito no próprio comando | o código entre aspas; `;` ou `\n` separam as linhas | — |
| `-` | lê o código da entrada padrão (de outro programa, com `\|`) | — | — |
| `--check` | só confere o código e mostra os erros e avisos; não salva nada | — | desligada |
| `--info` | mostra o canvas, as camadas, os componentes, os ossos, as animações, os eventos, as caixas e os pontos; num filme, os planos, os atores, os sons e as legendas. Sozinha, não salva nada; com `-o` ou `-f`, salva também | — | desligada |
| `--force` | salva mesmo com erros, pulando as linhas que não entendeu | — | desligada |
| `--quiet` | só escreve os erros e os avisos do código, sem as linhas `salvo …` | — | desligada |
| `-h`, `--help` | mostra a lista curta de todas as opções | — | — |
| `-v`, `--version` | escreve a versão do Weasel | — | — |

- Com `-e` ou `-`, o nome do arquivo de saída é `desenho.png`, e o `include` procura os arquivos a partir da pasta onde o terminal está.
- Um arquivo de entrada e `-e` juntos dão erro: `use um arquivo OU -e, não os dois`.
- Sem arquivo e sem `-e`, o Weasel mostra a ajuda.

## Uma imagem

```bash
node cli/weasel.js exemplos/cavaleiro.weasel -a jump --frame 11 -s 2 --trim -o pulo.jpg
```

O quadro 11 da animação `jump`, no dobro do tamanho (`-s 2`), recortado em volta do desenho (`--trim`), em JPG.

```bash
node cli/weasel.js exemplos/cavaleiro.weasel -a jump --frames -s 0.5 -t -o quadros/pulo.png
```

Um PNG por quadro, na metade do tamanho e com fundo transparente: `quadros/pulo_000.png` até `quadros/pulo_023.png`.

```bash
node cli/weasel.js exemplos/coruja.weasel -o coruja.svg --variant all
```

Um SVG da coruja e um de cada variante de cor: `coruja.svg`, `coruja_neve.svg` e `coruja_fogo.svg`.

| Opção | O que faz | Valores | Padrão |
|---|---|---|---|
| `-o`, `--out` | o arquivo de saída; a extensão escolhe o formato | um caminho | [o nome do arquivo de entrada](#o-nome-do-arquivo-sem--o) |
| `-f`, `--format` | o formato, pelo nome | `png`, `jpg`, `svg` ou `txt` (os outros nas próximas seções) | o da extensão do `-o`; sem ela, `png` |
| `-a`, `--anim` | a animação de onde sai o quadro | o nome de uma animação | nenhuma: o desenho sem animação (com `--frames`, a primeira animação) |
| `--frame` | qual quadro da animação | de 0 ao último quadro (o mesmo número das `key`) | 0 |
| `--frames` | salva todos os quadros, um arquivo por quadro, com `_000`, `_001`… no nome | — | desligada |
| `-s`, `--scale` | a escala: `2` = o dobro do tamanho, `0.5` = a metade | de 0.05 a 16 | 1 |
| `-t`, `--transparent` | fundo transparente, no lugar do `bg=` do `canvas` | — | desligada |
| `--trim` | recorta a imagem em volta do desenho, deixando uma margem | `--trim`; ou com a margem: `--trim=20` ou `--trim 20`, de 0 a 1000 pixels do desenho | desligada; a margem, 8 |
| `-q`, `--quality` | a qualidade do JPG: mais alta, melhor e maior | de 1 a 100 | 92 |
| `--variant` | as cores de uma variante | o nome de uma `variant`; ou `all`: o desenho normal e um arquivo para cada variante | o desenho normal |
| `--guides` | inclui as camadas `guide` | — | desligada: as camadas `guide` não saem |
| `--joints` | as juntas dos ossos, para conferir os pivôs: uma bolinha em cada uma e um traço até a do pai. Nas [três vistas](17-jogo-tres-vistas.md#quando-as-vistas-não-batem-sidexy-e-backxy), a junta de cada vista (em azul, a desenhada: `side=x,y` ou `back=x,y`) | — | desligada |
| `--refs` | desenha as imagens guia (`ref`) por baixo, para conferir o traço | — | desligada |

- `--trim` mede o desenho em **todos** os quadros da animação, então o recorte é o mesmo em todos. Ele nunca passa da borda do `canvas`.
- `--frame` sem `-a` dá erro: `--frame precisa de --anim`. Um quadro que não existe também: `--frame 30 não existe em "jump" (quadros 0 a 23)`.
- O JPG não tem transparência: com `-t`, ele sai com o fundo do `canvas`.
- O SVG sai sem o estilo do `art` (a resposta avisa). O `.txt` só sai de um desenho com `art ascii` ([capítulo 13](13-estilos.md#letras-art-ascii)); em outro, a resposta é `o .txt sai do estilo ascii (ponha "art ascii" no arquivo)`.
- As variantes estão no [capítulo 6](06-componentes.md#variantes-variant); as camadas `guide`, no [capítulo 4](04-camadas.md#camada-de-construção-guide); as imagens guia, no [capítulo 9](09-animacao.md#uma-imagem-guia-para-cada-movimento).

## Uma animação

Um GIF ou um WebP animado. O GIF abre em qualquer lugar, mas tem só 256 cores e uma transparência de tudo ou nada. O WebP guarda as cores de verdade e a transparência suave.

```bash
node cli/weasel.js exemplos/cavaleiro.weasel -a jump --trim -t -s 0.5 -o pulo.gif
```

O pulo do cavaleiro, recortado, com fundo transparente, na metade do tamanho.

```bash
node cli/weasel.js exemplos/furao.weasel -a "idle_down walk_down*3" -o furao.webp
```

Uma **sequência**: `idle_down` uma vez e `walk_down` três vezes, em seguida. As aspas juntam os nomes num valor só.

```bash
node cli/weasel.js exemplos/furao.weasel -a idle_down --sticker -o figurinha.webp
```

Uma figurinha do WhatsApp.

| Opção | O que faz | Valores | Padrão |
|---|---|---|---|
| `-a`, `--anim` | a animação, ou uma sequência delas | um nome; ou vários, entre aspas, na ordem: `"idle walk*3 jump"` (`*3` repete 3 vezes; de 1 a 99) | a primeira animação do arquivo |
| `--dither` | GIF com pontilhado: menos faixas nos brilhos e degradês | — | desligada |
| `-q`, `--quality` | a qualidade do WebP | de 1 a 100; 100 = sem perda nenhuma | 92 |
| `--sticker` | o WebP do jeito que o WhatsApp pede: 512 × 512, fundo transparente e até 500 KB | — | desligada |

- `-s`, `-t`, `--trim`, `--variant`, `--guides`, `--joints` e `--refs` valem como numa imagem ([acima](#uma-imagem)).
- Cada quadro fica na tela o tempo que o `fps=` da animação manda. O GIF e o WebP repetem sem parar.
- Com `--sticker`, a escala, o fundo e o recorte são escolhidos sozinhos (`-s`, `-t` e `--trim` não contam). Se o arquivo passar de 500 KB, a qualidade baixa até caber. Se nem assim couber, a resposta avisa: `aviso: a figurinha passou de 500 KB mesmo na qualidade mais baixa; o WhatsApp pode recusar (use uma animação mais curta)`.
- Num desenho sem animação, a resposta é `o desenho não tem animações (anim/key); para o GIF da pintura use -f build`.

### A pintura passo a passo: `-f build`

```bash
node cli/weasel.js exemplos/cavaleiro.weasel -f build -o pintura.gif
```

O desenho sendo pintado, forma por forma, como se alguém desenhasse na hora. No fim, o desenho pronto fica parado 2 segundos. Não precisa de animação no arquivo.

| Opção | O que faz | Valores | Padrão |
|---|---|---|---|
| `-f build` | a pintura passo a passo | — | — |
| `--speed` | a velocidade da pintura: `2` pinta no dobro da velocidade | de 0.05 a 20 | 1 |

- Sai em GIF, a 20 quadros por segundo. Com `-o pintura.webp`, sai em WebP; com `-o pintura.mp4` (ou outro vídeo), em vídeo.
- O `-o` termina em `.gif`, `.webp` ou num vídeo; com outra extensão (`-o pintura.png`), dá erro e nada é salvo.

## Sprite sheet

A sprite sheet é a folha com todos os quadros de uma vez, numa grade, que quase todo motor de jogo lê. O JSON que vem junto diz onde está cada quadro e traz as animações, os eventos, as caixas e os pontos.

```bash
node cli/weasel.js exemplos/cavaleiro.weasel -f sheet -a all -s 0.5 --trim -t -o sprites.png
```

```
salvo sprites.png  1826×2402, 60 quadros de 226×298 · 753 KB
salvo sprites.json  JSON (TexturePacker/Phaser) · 27 KB
```

```bash
node cli/weasel.js exemplos/furao.weasel -f sheet --layout rows -o furao.png
```

Uma linha por animação.

| Opção | O que faz | Valores | Padrão |
|---|---|---|---|
| `-f sheet` | a sprite sheet: um PNG e um JSON (no formato do TexturePacker e do Phaser) | — | também sai com `-o` terminado em `.zip` (os dois num zip) ou `.json` |
| `-a`, `--anim` | quais animações entram | `all` (todas) ou o nome de uma | todas |
| `--layout` | como os quadros se arrumam | `grid` (uma grade) ou `rows` (uma linha por animação) | `grid` |
| `--cols` | quantas colunas a grade tem | de 0 a 1000; 0 = automático, uma grade quase quadrada | 0 |
| `--padding` | o espaço entre os quadros e em volta deles | de 0 a 1000 pixels | 2 |
| `--trim` | recorta todos os quadros com o mesmo retângulo: o menor que cabe o desenho em todas as animações | a margem, de 0 a 1000 pixels do desenho | desligada; a margem, 8 |
| `-t`, `--transparent` | fundo transparente | — | desligada |
| `-s`, `--scale` | a escala | de 0.05 a 16 | 1 |
| `--normal` | salva também o normal map, na mesma arrumação (`sprites_normal.png`) | — | desligada |
| `--variant` | uma variante; `all` = uma folha para cada | o nome de uma `variant`, ou `all` | o desenho normal |

- `--cols` só vale com `--layout grid`.
- Uma sequência (`-a "idle walk"`) não vale aqui: escolha `all` ou uma animação.
- Uma folha com mais de 16384 pixels de lado dá erro: `a folha ficaria grande demais: diminua a escala`.
- O que vem no JSON, quadro por quadro, está no [capítulo 16](16-jogo-avancado.md#para-outros-motores-sprite-sheet-e-unity).

## Godot (e Unity)

```bash
node cli/weasel.js exemplos/furao.weasel -o godot/furao.tscn
```

Sai uma pasta pronta para copiar para dentro do projeto do Godot:

| Arquivo | O que é |
|---|---|
| `furao.png` | a folha com todos os quadros |
| `furao_normal.png` | o normal map, para a luz 2D do Godot iluminar o personagem com relevo |
| `furao.tres` | o SpriteFrames, com as animações |
| `furao.tscn` | a cena pronta: o personagem com o sprite, as caixas de colisão e o AnimationPlayer |
| `weasel_anim.gd` | o ajudante do AnimationPlayer (`tocar()` e os outros) |

```bash
node cli/weasel.js exemplos/coruja.weasel -f godot -a all --trim -t -o godot/coruja.tres
```

Só a folha e o SpriteFrames, sem a cena.

```bash
node cli/weasel.js exemplos/blocos.weasel -f godot --normal -o godot/blocos.tres
```

Num arquivo com `tileset`, o `-f godot` faz o TileSet: a imagem dos blocos e o `.tres`.

| Opção | O que faz | Valores | Padrão |
|---|---|---|---|
| `-o arquivo.tscn` (ou `-f tscn`) | a cena pronta, com todos os arquivos acima | — | — |
| `-f godot` (ou `-o arquivo.tres`) | só a folha e o SpriteFrames (`.tres`); num arquivo com `tileset`, o TileSet | — | — |
| `--normal` | o normal map também no `-f godot` (e na sprite sheet) | — | desligada; na cena, ligada |
| `--no-normal` | a cena sem o normal map | — | a cena vem com o normal map |
| `--no-mirror` | a cena sem o lado espelhado | — | a cena cria o lado que falta: de `walk_right`, o `walk_left` |
| `--rig` | a cena com esqueleto de verdade (ossos e peças, no lugar dos quadros); experimental | — | desligada, a não ser com `godot rig=bones` no arquivo |
| `--no-rig` | a cena por quadros, mesmo com `godot rig=bones` no arquivo | — | — |
| `-s`, `--scale` | a escala | de 0.05 a 16 | 1 |

- A cena (`.tscn`) leva **sempre todas** as animações, com fundo transparente e recortadas: o `-a`, o `-t` e o `--trim` não mudam isso. O `--trim=20` só muda a margem (padrão 8).
- `--layout`, `--cols` e `--padding` arrumam a folha da cena e a do `-f godot`, como na [sprite sheet](#sprite-sheet).
- Num `tileset`, a escala precisa deixar os blocos com um tamanho inteiro. Senão, a resposta é, por exemplo, `com escala 0.3 o bloco de 32×32 não fica com tamanho inteiro`. Com `-o blocos.tscn`, sai o mesmo TileSet, já com o normal map.
- O passo a passo do Godot, com o script do jogo, está no [capítulo 15](15-jogo-personagem.md#do-weasel-para-o-godot); o esqueleto de verdade, em [`rig=bones`](16-jogo-avancado.md#esqueleto-de-verdade-rigbones-experimental).

**Unity:** não tem opção na linha de comando. A linha `unity` no arquivo acrescenta ao JSON da sprite sheet (`-f sheet`) os pixels por unidade, o pivô e o colisor ([capítulo 16](16-jogo-avancado.md#para-outros-motores-sprite-sheet-e-unity)).

## Conferir o movimento

Duas imagens para achar defeitos numa animação: o caminho dos pés e a folha de conferência.

### A trajetória: `--trajectory`

O caminho dos pés em todos os quadros da animação, numerado, por cima do personagem clarinho. A trajetória precisa de pontos (`point`). O `andador.weasel` é o boneco do [capítulo 15](15-jogo-personagem.md#andar-sem-escorregar-feet):

```bash
node cli/weasel.js andador.weasel -a anda_right --trajectory -o pes.png
```

```
salvo pes.png  736×568, trajetória de pe_e, pe_d · 25 KB
anda_right: anda 120 px/s para a direita (10 px por quadro a 12 fps)
  pe_e: no chão nos quadros 0–4
  pe_d: no chão nos quadros 0, 4–7
```

| Opção | O que faz | Valores | Padrão |
|---|---|---|---|
| `--trajectory` | PNG ou JPG com o caminho dos pontos em todos os quadros | `--trajectory=pe,mao`: só esses pontos, separados por vírgula | os pontos do `feet=` da animação; sem `feet=`, todos os pontos |
| `-a`, `--anim` | a animação | o nome de uma animação | a primeira |
| `--frame` | o quadro do personagem clarinho, marcado no caminho | de 0 ao último quadro | 0 |
| `-s`, `--scale` | só muda as medidas escritas; a imagem se ajusta sozinha | de 0.05 a 16 | 1 |

- Os pontos vão depois de um `=`, sem espaço: `--trajectory=pe_e`.
- Num desenho sem pontos, a resposta é `--trajectory segue os pontos (point): o desenho não tem nenhum`.
- Como ler a imagem: [capítulo 15](15-jogo-personagem.md#a-trajetória-dos-pés---trajectory).

### A folha de conferência: `--contact`

Todos os quadros numerados, numa imagem só, para dizer "o problema está no quadro 7". Uma linha por animação, com os eventos embaixo dos quadros e, com `feet=`, os pés no chão e o escorregão em vermelho.

```bash
node cli/weasel.js exemplos/chefe.weasel --contact -o folha.png
```

```
salvo folha.png  2086×1522, folha de conferência: 76 quadros de 6 animações · 768 KB
```

| Opção | O que faz | Valores | Padrão |
|---|---|---|---|
| `--contact` | a folha de conferência, em PNG ou JPG | — | desligada |
| `-a`, `--anim` | quais animações, nessa ordem | um nome, ou vários entre aspas: `-a "idle run"` | todas |
| `--cols` | quantos quadros cabem numa linha antes de quebrar | de 0 a 1000; 0 = 12 | 12 |
| `-s`, `--scale` | o tamanho dos quadros | de 0.05 a 16 | automático: uns 160 pixels no lado maior |

- A folha serve para conferir e não vai para o jogo: a sprite sheet continua sem os números.
- Quando um pé escorrega, a resposta também diz em que quadros: `aviso: anda_right: pe_d escorrega nos quadros 5, 6`.
- Num filme, a folha tem uma linha por plano ([abaixo](#a-folha-de-conferência-do-filme)).
- O que cada marca quer dizer: [capítulo 15](15-jogo-personagem.md#a-folha-de-conferência---contact).

## Vídeo de um desenho

Uma animação em vídeo, para mandar por mensagem ou pôr num editor de vídeo. O vídeo precisa do **ffmpeg**, um programa à parte. No Windows, instale com `winget install ffmpeg` no terminal; nos outros sistemas, veja em [ffmpeg.org](https://ffmpeg.org). Sem ele, a resposta é `weasel: não achei o ffmpeg. Instale (https://ffmpeg.org; no Windows: winget install ffmpeg), passe --ffmpeg <caminho> ou exporte um gif ou webp`.

```bash
node cli/weasel.js exemplos/furao.weasel -a "idle_down walk_down*3" -o furao.mp4 --small
```

```
salvo furao.mp4  160×160, 72 quadros a 24 fps, 3.0 s · 11 KB · 0.1s
```

```bash
node cli/weasel.js exemplos/bola.weasel -a quica -o quica.mp4 --min-length 10s
```

```
salvo quica.mp4  480×360, 240 quadros a 24 fps, 10.0 s (10 voltas) · 234 KB · 0.3s
```

A bola quica 10 vezes: a animação tem 1 segundo e repete até dar 10.

```bash
node cli/weasel.js exemplos/cavaleiro.weasel -a jump -t --trim -o pulo.mov
```

Um vídeo com fundo transparente, para pôr por cima de outro no editor de vídeo.

| Formato | O que é |
|---|---|
| `.mp4` | H.264: toca em qualquer lugar (celular, WhatsApp, YouTube, editores de vídeo) |
| `.mkv` | o mesmo H.264, em MKV |
| `.mov` | ProRes 422 HQ, o que os editores de vídeo abrem com mais facilidade; com `-t`, ProRes 4444, com transparência |
| `.webm` | VP9; com `-t`, com transparência |

| Opção | O que faz | Valores | Padrão |
|---|---|---|---|
| `-a`, `--anim` | a animação, ou uma sequência (como no [GIF](#uma-animação)) | um nome, ou vários entre aspas | a primeira animação |
| `--min-length` | a duração mínima: a animação (ou a sequência) repete inteira até passar disso | um tempo: `3s`, `5` (segundos), `1500ms`, `24f` (quadros); `0` = uma volta só | `3s` |
| `--crf` | a qualidade do `.mp4`, do `.mkv` e do `.webm`: menor = melhor e maior | de 0 a 63 | 18 no mp4 e no mkv, 30 no webm; com `--small`, 23 e 36 |
| `--small` | um vídeo menor, para mandar: o ffmpeg demora mais e comprime melhor as cores lisas do desenho | — | desligada |
| `--ffmpeg` | onde está o ffmpeg, se o terminal não o acha sozinho | o caminho do programa | a variável `WEASEL_FFMPEG`; depois, o `ffmpeg` instalado |
| `-t`, `--transparent` | fundo transparente: só o `.mov` e o `.webm` guardam | — | desligada |

- `-s`, `--trim`, `--variant`, `--guides`, `--joints` e `--refs` valem como numa [imagem](#uma-imagem). A pintura (`-f build -o pintura.mp4`) também sai em vídeo, sem repetir.
- O vídeo segue o `fps=` da animação. Numa sequência com `fps=` diferentes, o Weasel escolhe um que sirva para todas (8 e 12 viram 24).
- O vídeo de um desenho não tem som. O som é coisa do [filme](#filme).
- `--small` não vale com `.mov`: `--small vale para mp4, mkv e webm; o .mov é ProRes, feito para editar`. O `--crf` não muda o `.mov`.
- Com `-t` num `.mp4` ou `.mkv`, o vídeo sai com o fundo, e a resposta avisa: `aviso: mp4 não guarda transparência; use .mov (ProRes 4444), .webm ou .webp`.
- No `--min-length`, os quadros (`24f`) são contados no ritmo da primeira animação do arquivo.

## Filme

Um arquivo com a linha `film` ([capítulo 18](18-filme.md)) sai em vídeo MP4, se você não pedir outra coisa. O vídeo leva os sons do filme misturados, e as legendas saem ao lado, num `.srt`.

```bash
node cli/weasel.js exemplos/filme.weasel -o previa.mp4 -s 0.5
```

Enquanto desenha, o Weasel mostra quantos quadros faltam (`previa.mp4: quadro 443/492 (90%) · 165.6 q/s · falta 0:00`). No fim:

```
salvo previa.mp4  960×540, 24 fps, 00:20:12, com 2 sons · 1.8 MB · 492 quadros em 3.1s (156.6 q/s, 8 threads)
salvo previa.srt  2 legendas · 1 KB
```

Mais alguns:

| Quero… | Comando |
|---|---|
| o vídeo inteiro | `node cli/weasel.js exemplos/filme.weasel -o filme.mp4` |
| um quadro (capa, miniatura) | `node cli/weasel.js exemplos/filme.weasel -o capa.png --time 4s` |
| só um plano | `node cli/weasel.js exemplos/filme.weasel -o pulo.mp4 --shot pulo` |
| um vídeo por plano, para editar | `node cli/weasel.js exemplos/filme.weasel -o render/filme.mov --shots` |
| um PNG por quadro, de um trecho | `node cli/weasel.js exemplos/filme.weasel --frames -o quadros/q.png --from 10s --to 12s` |
| um vídeo menor, com as legendas desenhadas | `node cli/weasel.js exemplos/filme.weasel -o para_mandar.mp4 --small --burn-subs` |
| só o som misturado | `node cli/weasel.js exemplos/filme.weasel -o som.wav` |
| um GIF (filmes curtos) | `node cli/weasel.js exemplos/filme.weasel -o filme.gif -s 0.25 --from 0 --to 3s` |
| ver os planos, os atores, os sons e as legendas | `node cli/weasel.js exemplos/filme.weasel --info` |

**Os tempos** (`--from`, `--to`, `--time`, `--contact=`) se escrevem assim: `2s` ou só `2` (segundos), `1.5s`, `500ms`, `48f` (quadros do filme), `1m30s` (minutos e segundos), ou `00:01:12`, como no editor de vídeo (minutos:segundos:quadro; com horas, `1:00:01:12`).

### Que pedaço do filme

| Opção | O que faz | Valores | Padrão |
|---|---|---|---|
| `--shot` | só um plano | o nome do plano (`pulo`), ou o número dele, contando de 1 | o filme todo |
| `--shots` | um arquivo por plano, com o nome do plano no fim (`filme_abertura.mov`) | — | desligada: um arquivo só |
| `--from` | começa nesse tempo | um tempo | o começo |
| `--to` | para antes desse tempo | um tempo | o fim |
| `--time` | um quadro só, em PNG ou JPG: o desse tempo | um tempo | o quadro 0; com `--shot`, o primeiro quadro do plano |
| `--frame` | um quadro só, em PNG ou JPG: o desse número | de 0 ao último quadro do filme | 0 |
| `--frames` | uma imagem por quadro, com o número do quadro do filme no nome (`q_00240.png`) | — | desligada |

- Com `--frames`, ponha um `-o` terminado em `.png` ou `.jpg`. Sem ele, sai o vídeo. Como o nome leva o número do quadro do filme, um trecho exportado depois se encaixa no lugar certo.
- Com `--shot` e `-o`, o arquivo fica com o nome do `-o`. Sem `-o`, o nome do plano vai no fim: `filme_pulo.mp4`.
- Um tempo que passa do fim dá erro, com o tamanho do filme: `o filme vai do quadro 0 ao 491 (00:20:11)`. Um trecho vazio também: `nenhum quadro no trecho pedido`.

### O vídeo do filme

| Opção | O que faz | Valores | Padrão |
|---|---|---|---|
| `-s`, `--scale` | a escala; `0.5` faz uma prévia rápida, em meia resolução | de 0.05 a 16 | 1 |
| `-j`, `--jobs` | quantos quadros são desenhados ao mesmo tempo, cada um numa thread (uma parte do processador) | de 1 a 64 | com 48 quadros ou mais, o número de núcleos do computador menos 1, até 8; com menos, 1 |
| `--crf` | a qualidade do `.mp4`, do `.mkv` e do `.webm`: menor = melhor e maior | de 0 a 63 | 18 no mp4 e no mkv, 30 no webm; com `--small`, 23 e 36 |
| `--small` | um vídeo menor, para mandar por WhatsApp ou e-mail | — | desligada |
| `--ffmpeg` | onde está o ffmpeg | o caminho do programa | a variável `WEASEL_FFMPEG`; depois, o `ffmpeg` instalado |
| `-t`, `--transparent` | fundo transparente: no `.mov` (ProRes 4444), no `.webm`, no GIF e nas imagens PNG | — | desligada |
| `-q`, `--quality` | a qualidade dos quadros em JPG | de 1 a 100 | 92 |
| `--dither` | o GIF do filme com pontilhado | — | desligada |

- O vídeo sai igual com uma thread ou com oito: o `-j` só muda o tempo que leva.
- O padrão é pensado para o YouTube e para o editor de vídeo, que comprimem de novo. Para mandar o vídeo direto para alguém, use `--small`.
- Um GIF com mais de 900 quadros dá um aviso: `GIF com … quadros fica enorme; para filme use .mp4` (com o número de quadros do trecho).

### Som e legendas

| Opção | O que faz | Valores | Padrão |
|---|---|---|---|
| `--no-audio` | o vídeo sem o som | — | os `audio` do filme vão misturados no vídeo |
| `--subs` | o formato das legendas que saem ao lado do vídeo | `srt`, `vtt` ou `none` (nenhuma) | `srt` |
| `--burn-subs` | desenha as legendas na imagem | — | desligada (ou `film subs=burn` no arquivo) |
| `--lang` | a língua das legendas desenhadas | o código de uma língua do filme: `pt`, `en`… | a do `film lang=` |

- As legendas saem com o nome do vídeo: `filme.srt`, e as de outras línguas como `filme.en.srt`. Elas contam o tempo a partir do começo do trecho exportado. O GIF não tem legendas ao lado.
- `-o som.wav` salva só o som misturado (48 kHz, estéreo), com as legendas ao lado.
- O som, as legendas e o lip sync estão no [capítulo 19](19-filme-atuacao.md#som-legendas-e-lip-sync).

### Para o editor de vídeo

```bash
node cli/weasel.js exemplos/filme.weasel -o render/filme.mov --shots --fcpxml --edl
```

Sai um vídeo por plano, as legendas e a **linha do tempo**: um arquivo que o DaVinci Resolve, o Final Cut ou o Premiere abrem com os vídeos e os sons já no lugar, cada som na sua trilha.

| Opção | O que faz | Valores | Padrão |
|---|---|---|---|
| `--edl` | junto com o vídeo, a linha do tempo em EDL (Premiere, Resolve e quase todos os editores) | — | desligada |
| `--fcpxml` | junto com o vídeo, a linha do tempo em FCPXML (DaVinci Resolve e Final Cut) | — | desligada |
| `--ext` | com `-o filme.fcpxml` ou `-o filme.edl` (só a linha do tempo, sem desenhar os vídeos): a extensão dos vídeos que ela procura | `mp4`, `mov`, `webm` ou `mkv`, com ou sem o ponto | `mp4` |

- Com `--edl` ou `--fcpxml`, o vídeo sai **sem o som misturado**, porque cada som vai numa trilha. A resposta avisa: `com --edl/--fcpxml o vídeo sai sem o som misturado: cada som vai numa trilha da linha do tempo`.
- Já salvou os vídeos? `-o render/filme.fcpxml --shots --ext mov` grava só a linha do tempo, apontando para os vídeos com os nomes que a linha de comando dá.
- Como importar em cada editor: [README do Weasel](../../README.md#do-weasel-para-o-editor-de-vídeo).

### A folha de conferência do filme

```bash
node cli/weasel.js exemplos/filme.weasel --contact -o folha.png
```

```
salvo folha.png  1593×692, folha de conferência: 21 quadros, um a cada 1s, 4 planos · 378 KB
```

Uma linha por plano e um quadro a cada tantos segundos, com o tempo embaixo, escrito do jeito que o `--time` aceita.

| Opção | O que faz | Valores | Padrão |
|---|---|---|---|
| `--contact` | a folha de conferência do filme, em PNG ou JPG | `--contact=5` (ou `=2s`, `=500ms`, `=12f`): o intervalo entre os quadros, maior que 0 | automático: 1 segundo, ou o menor entre 2, 5, 10, 15, 30 s… que dê até uns 120 quadros |
| `--cols` | quantos quadros cabem numa linha | de 0 a 1000; 0 = 8 | 8 |
| `-s`, `--scale` | o tamanho dos quadros | de 0.05 a 16 | automático: uns 240 pixels no lado maior |

- O intervalo vai depois de um `=`, sem espaço: `--contact=5`. Com `--contact 5`, o 5 vira outro arquivo de entrada, e a resposta é um erro.
- `--shot`, `--from` e `--to` recortam a folha, como no vídeo. `--burn-subs` desenha as legendas nos quadros.

## Simplificar pontos

Desenhos que vêm de outro programa (um vetorizador, um SVG convertido) costumam ter pontos demais. O `--simplify` tira pontos de todos os `shape`, `stroke` e `line` do arquivo e grava um `.weasel` novo, com o mesmo desenho.

```bash
node cli/weasel.js exemplos/chefe.weasel --simplify 2 -o chefe_menos.weasel
```

A resposta lista cada forma que mudou e termina assim:

```
linha 124 shape bracoP: 7 → 5 pontos
linha 125 shape maoP: 9 → 8 pontos (2 cantos com !)
13 formas: 111 → 86 pontos (tolerância 2 px)
salvo chefe_menos.weasel  código simplificado · 11 KB
```

| Opção | O que faz | Valores | Padrão |
|---|---|---|---|
| `--simplify` | tira pontos e grava um `.weasel` novo | a tolerância: quanto cada forma pode se afastar da original, de 0.01 a 1000 pixels | — (o número é obrigatório) |
| `-o`, `--out` | o arquivo novo | um nome terminado em `.weasel` | `chefe_simple.weasel`, na pasta do arquivo de entrada; com `-e` ou `-`, o código sai no próprio terminal |
| `--force` | simplifica também as formas usadas na troca de forma (`shape=`, `mouth`), grava mesmo com erros no código e pode gravar por cima do arquivo de entrada | — | desligada |
| `--quiet` | sem a lista das formas | — | desligada |

- Os cantos vivos (onde a direção muda de repente) ganham `!`.
- Os arquivos do `include` não mudam. Os pontos com `{contas}` e os membros (`limb=`) ficam como estão.
- Sem `--force`, as formas usadas na troca de forma ficam como estão: com outro número de pontos, a troca deixaria de ir ponto a ponto.
- Com erros no código, nada é gravado: `weasel: 1 erro(s); nada foi simplificado (corrija antes, ou use --force).`
- O `-o` precisa terminar em `.weasel` (`--simplify grava código: use -o arquivo.weasel`) e, sem `--force`, ser outro arquivo (`--simplify não grava em cima do arquivo de entrada: use outro nome no -o (ou --force)`).
- O mesmo Simplificar existe no editor: [capítulo 23](23-editor.md#simplificar).

## Traçar uma imagem

Com uma imagem (`.png`, `.jpg`, `.jpeg` ou `.webp`) no lugar do `.weasel`, o Weasel **traça** a imagem e grava um `.weasel` novo, com as formas, as cores e os degradês dela. O [capítulo 2](02-formas.md#traçar-uma-imagem) mostra o que sai no arquivo.

```bash
node cli/weasel.js raposa.png --colors 32
```

```
200 regiões (1 degradê, 42 semitransparentes), 213 formas, 6103 pontos, 145 cores · 1,8 s
salvo raposa.weasel  traçado de imagem · 81 KB
```

| Opção | O que faz | Valores | Padrão |
|---|---|---|---|
| `-o`, `--out` | o arquivo novo | um nome terminado em `.weasel` | `raposa.weasel`, na pasta da imagem |
| `--colors` | quantas cores procurar na imagem; menos cores, menos formas | de 2 a 256 | 48 |
| `--tol` | quanto a curva pode se afastar da borda da imagem; maior, menos pontos | de 0.05 a 20 pixels | 0.5 |
| `--blur` | desfoca o desenho todo (`layer arte blur=`), como o serrilhado da imagem: fica mais perto dela, e menos nítido | de 0 a 50 pixels | 0 (desligado) |
| `--no-bg` | tira o fundo chapado: a cor que ocupa a maior parte da borda da imagem não vira forma ([capítulo 2](02-formas.md#traçar-uma-imagem)) | — | desligado |
| `-s`, `--scale` | muda o tamanho da imagem antes de traçar | de 0.05 a 16 | 1 |
| `--out-scale` | traça no tamanho da imagem e grava o desenho nessa escala: os pontos, as pontas dos degradês, o `canvas`, o `scale=` da `ref` e o `--blur` | de 0.01 a 16 | 1 |
| `--prefix` | o prefixo dos nomes: `manga_e_color1`, `manga_e_gradient1`, `_manga_e_hole1` | um nome (letras sem acento, números, `_` e `-`) | sem prefixo |
| `--bone` | `bone=` em todas as formas | o nome do osso | sem osso |
| `--bones` | `bones=` em todas as formas | dois ossos ou mais, separados por vírgula | sem osso |
| `--force` | grava por cima de um arquivo que já existe | — | desligada |
| `--quiet` | sem a linha do que saiu | — | desligada |
| `-w`, `--watch` | traça de novo quando a imagem muda | — | desligada |

- Sem `--force`, um arquivo que já existe fica como está (ele pode ser um desenho feito à mão): `raposa.weasel já existe: use outro nome no -o (ou --force para gravar por cima)`.
- O `-o` precisa terminar em `.weasel`: `o traçado de uma imagem grava código: use -o raposa.weasel`.
- As cores da `palette` são as da imagem; o `--colors` só diz quantas o traçado procura antes de juntar as parecidas e separar as regiões. Por isso o número de cores no fim é outro.
- Uma imagem de 1 milhão de pixels (como a raposa, 1024×1024) traça em 1 a 3 segundos; uma de 3 milhões, em uns 10. Acima de 4 milhões, vem um aviso: `imagem grande (2400×2400, 5.8 Mpx): o traçado pode levar minutos e o arquivo passar de 1 MB; -s 0.5 reduz a imagem antes de traçar`.
- Com `-s`, a `ref` do arquivo ganha o `scale=` que põe a imagem em cima do traçado.
- Com `--no-bg`, a resposta diz a cor que saiu (`…, 183 cores, fundo #ffffff tirado · 2,1 s`), e o comentário do arquivo ganha a linha `# sem fundo: #ffffff`. Sem um fundo chapado na imagem, o traçado fica com tudo e vem um aviso: `--no-bg: não achei um fundo chapado (uma cor só, opaca, em pelo menos metade da borda da imagem): o traçado ficou com tudo`.
- A mesma imagem com as mesmas opções dá sempre o mesmo arquivo.
- As opções de exportar (`-a`, `-f`, `-t`, `--trim`…) não valem aqui e são ignoradas.

### Uma peça para um personagem

Para trocar a `ref` de uma peça de personagem pelo traçado, o arquivo traçado precisa encaixar no personagem: na escala dele, com nomes que não colidem com os que ele já tem e com o osso em cada forma. As três opções fazem isso:

```bash
node cli/weasel.js manga_e.png --out-scale 0.5 --prefix manga_e --bone bracoE
```

```
# manga_e.png: traçado de imagem do Weasel 1.80.0.
# 19 regiões, da maior para a menor; 1 px da imagem (896×1184) = 0,5 unidade, com --out-scale 0.5.
# opções: --out-scale 0.5 --prefix manga_e --bone bracoE
# a imagem original está na linha ref: tire o hidden para comparar.

canvas 448 592 bg=none
ref original "manga_e.png" scale=0.5 hidden
palette manga_e_color1=#10120ef5 manga_e_color2=#0a0d09f4 …

# osso de mentira, só para este arquivo abrir sozinho: no personagem, copie as formas e não este bone
bone bracoE pivot=224,296

shape c=manga_e_color1 bone=bracoE : 278.52,221.75 280.25,221.53 282.75,223.16 …
```

- **`-s` ou `--out-scale`?** O `-s 0.5` reduz a **imagem** antes de traçar: o traçado vê a metade dos pixels e perde os detalhes pequenos. O `--out-scale 0.5` traça a imagem **inteira** e só grava os números pela metade: o desenho tem todos os detalhes, no tamanho do personagem. Os dois juntos multiplicam.
- O `--prefix` vale para a `palette`, os degradês e os buracos. O `_` na frente do buraco continua, como no `_hole1` sem prefixo.
- Um `bone=` de um osso que não existe é erro. Por isso o arquivo leva o `bone` com um comentário em cima: ele só deixa o traçado abrir sozinho. No personagem os ossos já existem: copie a `palette`, os `gradient` e os `shape`, sem esse `bone`. Com `--bones a,b`, os ossos de mentira saem encadeados (`parent=`), como numa perna.
- Com `--blur`, o número que vai para o `layer arte blur=` também muda de escala: `--blur 1 --out-scale 0.5` grava `blur=0.5`, o mesmo desfoque de um pixel da imagem.
- Os pontos saem com duas casas depois do ponto. Uma peça traçada com `--out-scale 0.5` fica igual à mesma peça desenhada com `-s 0.5` na hora de exportar, a menos de uns pixels quase transparentes.

## Ver enquanto edita

```bash
node cli/weasel.js exemplos/coruja.weasel -a pia -o coruja.gif --watch
```

O Weasel salva o GIF e fica esperando. Cada vez que você salva o `.weasel` no seu editor de texto, ele salva o GIF de novo:

```
salvo coruja.gif  480×480, 48 quadros · 843 KB
[12:16:59] esperando mudanças em coruja.weasel (Ctrl+C para sair)
[12:17:04] coruja.weasel mudou
salvo coruja.gif  480×480, 48 quadros · 843 KB
[12:17:05] esperando mudanças em coruja.weasel (Ctrl+C para sair)
```

| Opção | O que faz | Valores | Padrão |
|---|---|---|---|
| `-w`, `--watch` | salva de novo sempre que o arquivo, ou um arquivo que ele usa (`include`, atores, sons), muda | — | desligada |

- **Ctrl+C** encerra.
- Um erro no código não encerra: as mensagens aparecem, nada é salvo naquela vez, e o Weasel espera a próxima mudança.
- Precisa de um arquivo: com `-e` ou `-`, a resposta é `--watch precisa de um arquivo de entrada`.
- Vale com qualquer formato: `-o coruja.png`, uma sprite sheet, a cena do Godot, um vídeo.

## Opções que só valem juntas

Algumas opções só fazem sentido com um formato ou com um tipo de arquivo. Fora dele, umas dão erro (e nada é salvo) e outras são ignoradas sem aviso. Esta tabela diz qual é qual.

| Opção | Vale com | Fora disso |
|---|---|---|
| `--frame` | uma animação (`-a`) num desenho; num filme, sozinha | sem `-a`: erro `--frame precisa de --anim` |
| `--frames` | PNG, JPG, SVG e `.txt` de um desenho; PNG e JPG de um filme | ignorada; num filme, sai o vídeo |
| `-a "idle walk*3"` (uma sequência) | GIF, WebP e vídeo | erro: `uma sequência de animações (-a "idle walk*3") vale para gif, webp e vídeo` |
| `-a all` | sprite sheet, `-f godot` e `--contact` | erro: `animação "all" não existe (tem: …)` |
| `--trajectory` | PNG e JPG de um desenho com pontos | erro: `--trajectory sai em png ou jpg` |
| `--joints` | PNG, JPG, WebP, GIF e vídeo de um desenho, e o `--contact` | erro: `--joints sai em png, jpg, webp, gif ou vídeo`; num filme: `--joints vale para desenhos (num filme, confira o ator no arquivo dele)` |
| `--contact` | PNG e JPG de um desenho com animações, ou de um filme | erro: `--contact sai em png ou jpg`; junto com `--trajectory`: `use --contact ou --trajectory, não os dois`; com `--frames`: `use --contact ou --frames, não os dois` |
| `--contact=N` | filmes | num desenho, erro: `--contact=N (o intervalo) vale para filmes; num desenho, a folha tem todos os quadros` |
| `--sticker` | WebP de um desenho | erro: `--sticker vale para webp` |
| `--min-length` | vídeo de um desenho | erro: `--min-length vale para o vídeo (mp4, mov, webm, mkv)`; num filme: `--min-length vale para o vídeo de um desenho; no filme, use --from e --to` |
| `--small` | `.mp4`, `.mkv` e `.webm` | com `.mov`, erro; nos outros formatos, ignorada |
| `--crf` | `.mp4`, `.mkv` e `.webm` | ignorada (também no `.mov`) |
| `-q`, `--quality` | JPG e WebP | ignorada |
| `-t`, `--transparent` | PNG, GIF, WebP, SVG, sprite sheet, Godot, `.mov` e `.webm` | no JPG, ignorada; no `.mp4` e no `.mkv`, aviso |
| `--layout`, `--cols`, `--padding` | sprite sheet e Godot (`--cols` também na folha de conferência) | ignoradas |
| `--speed` | `-f build` | ignorada |
| `--dither` | GIF | ignorada |
| `--normal` | `-f godot` e sprite sheet (a cena já vem com ele) | ignorada |
| `--no-normal`, `--no-mirror`, `--rig`, `--no-rig` | a cena do Godot (`.tscn`) | ignoradas |
| `--shot`, `--from`, `--to`, `--time` | filmes | num desenho, erro: `--shot só vale para filmes` (com o nome da opção) |
| `--shots`, `-j`, `--no-audio`, `--subs`, `--burn-subs`, `--lang`, `--edl`, `--fcpxml`, `--ext` | filmes | ignoradas |
| `.wav`, `.edl`, `.fcpxml` | filmes | num desenho, erro: `wav é para filmes (arquivo com a linha film); para animação de jogo use gif ou sheet` |
| WebP, SVG, sprite sheet, `-f godot` e `-f build` | desenhos | num filme, erro: `webp sai de desenhos; para o filme use gif ou mp4`; `SVG não vale para filme (use mp4, mov, webm, gif ou png)`; `sprite sheet, Godot e pintura são para desenhos de jogo; um filme sai em vídeo (mp4, mov, webm), gif ou png` |
| `--variant` | desenhos (num filme, a variante vai no `actor`, com `variant=`) | num filme, erro: `--variant vale para desenhos; num filme, escolha a variante no actor (variant=)`; com o nome de uma variante que o filme não tem, `variante "neve" não existe` |
| `--watch` | um arquivo | com `-e` ou `-`, erro |
| `--simplify` | um `-o` terminado em `.weasel` | erro: `--simplify grava código: use -o arquivo.weasel` |
| `--colors`, `--tol`, `--blur` | uma imagem como entrada (`.png`, `.jpg`, `.jpeg`, `.webp`) | num `.weasel`, erro: `--colors vale para o traçado de uma imagem (a entrada .png, .jpg ou .webp)` |

## Resumo

- Abra o terminal na pasta do Weasel e rode `node cli/weasel.js desenho.weasel`: sai `desenho.png`, na pasta do terminal.
- `-o` escolhe o nome, e a extensão escolhe o formato; `-f` escolhe pelo nome (`sheet`, `godot`, `build`).
- Com um erro no código, nada é salvo: leia a linha e a coluna da mensagem, ou use `--force`.
- `-a` escolhe a animação, `-s` a escala, `-t` o fundo transparente e `--trim` o recorte.
- Vídeo precisa do ffmpeg; num filme, `--shot`, `--from` e `--to` escolhem o pedaço.
- `--check` e `--info` conferem sem salvar, e `--watch` salva de novo a cada mudança.
- Uma imagem no lugar do `.weasel` (`node cli/weasel.js raposa.png`) vira um `.weasel` traçado.

[← Funções das contas](21-funcoes.md) · [Índice](README.md) · [Próximo: O editor →](23-editor.md)
