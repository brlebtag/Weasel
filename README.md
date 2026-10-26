# Weasel — desenho por código

Weasel é um editor web onde você **escreve uma pequena linguagem de desenho e vê a imagem sendo pintada ao vivo**. A linguagem tem formas, curvas, camadas, recortes, esqueleto (ossos), tecido que balança e pernas com IK, e dá para animar e exportar em **PNG, JPG, GIF animado e sprite sheet**, tanto no navegador quanto pela **linha de comando**.

A ideia veio do vídeo [*Claude simplesmente clonou Hollow Knight em menos de uma hora*](https://www.youtube.com/watch?v=X2cFbpQCZec&t=517s) (trecho de 8:37 a 8:42), que mostra uma ferramenta assim desenhando o Cavaleiro. O vídeo não documenta a linguagem: ela foi reconstruída a partir dos quadros. As capturas e a transcrição do código que aparece na tela estão em [`referencia/`](referencia/).

![Quadro do vídeo usado como referência](referencia/08m37s_quadro_completo.jpg)

## Como rodar

Não precisa instalar nada nem compilar: é HTML, CSS e JavaScript puro, sem dependências.

**Opção 1 — abrir o arquivo direto.** Dê dois cliques em `index.html` (Chrome, Edge ou Firefox).

**Opção 2 — servidor local** (útil se o navegador bloquear algo em `file://`). Na pasta do projeto:

```bash
python -m http.server 5317
```

Depois abra <http://localhost:5317>.

O código que você escreve fica salvo automaticamente no navegador (localStorage). Para guardar em arquivo, use **Salvar** (gera um `.weasel`) e **Abrir…** para carregar de volta.

## Linha de comando

A mesma linguagem roda no terminal, com o mesmo leitor e o mesmo desenho do editor web (os arquivos de `js/` são compartilhados), então a imagem sai igual. Precisa de [Node.js](https://nodejs.org) 18 ou mais novo. Instale a dependência de desenho uma vez, na pasta do projeto:

```bash
npm install
```

Depois:

```bash
node cli/weasel.js exemplos/cavaleiro.weasel
```

Isso gera `cavaleiro.png`. Também funciona `npm run weasel -- <argumentos>`, e `npm link` instala o comando `weasel` no sistema.

A entrada pode ser um arquivo, um texto direto (`-e`, com `;` separando as linhas) ou a entrada padrão (`-`):

```bash
node cli/weasel.js -e "canvas 200 200; ellipse sol 100,100 60 c=#ffb000 ink=4" -o sol.png
```

```bash
cat desenho.weasel | node cli/weasel.js - -o desenho.png
```

O formato sai da extensão de `-o` (`.png`, `.jpg`, `.gif`, `.zip`) ou de `-f`:

| Quero… | Comando |
|---|---|
| PNG da pose parada | `node cli/weasel.js exemplos/cavaleiro.weasel -o cavaleiro.png` |
| JPG de um quadro, em 2× e recortado | `node cli/weasel.js exemplos/cavaleiro.weasel -a jump --frame 11 -s 2 --trim -o pulo.jpg` |
| Um PNG por quadro | `node cli/weasel.js exemplos/cavaleiro.weasel -a jump --frames -o quadros/pulo.png` |
| GIF de uma animação | `node cli/weasel.js exemplos/cavaleiro.weasel -a jump --trim -t -o pulo.gif` |
| GIF da pintura passo a passo | `node cli/weasel.js exemplos/cavaleiro.weasel -f build -o pintura.gif` |
| Sprite sheet (PNG + JSON) | `node cli/weasel.js exemplos/cavaleiro.weasel -f sheet -a all -s 0.5 --trim -t -o sprites.png` |
| Sprite sheet num .zip | `node cli/weasel.js exemplos/bola.weasel -o bola.zip` |
| Só verificar o código | `node cli/weasel.js meu.weasel --check` |
| Ver camadas, ossos e animações | `node cli/weasel.js meu.weasel --info` |

Outras opções: `-q` (qualidade do JPG), `--layout grid|rows`, `--cols`, `--padding`, `--speed` (velocidade da pintura), `--guides` (inclui camadas `guide`), `--quiet`. A lista completa sai com `--help`.

Erros aparecem como num compilador, com arquivo, linha e coluna:

```
ruim.weasel:3:22: erro: cor desconhecida "nada"
  3 | ellipse a 100,100 40 c=nada bone=x
    |                      ^^^^^^
weasel: 1 erro(s); nada foi exportado (use --force para exportar ignorando as linhas com erro).
```

Com erros, nada é exportado e o código de saída é 1 (`--force` exporta ignorando as linhas com erro, como o editor faz). Opções erradas saem com 2. Avisos não impedem a exportação.

## A interface

| Área | O que faz |
|---|---|
| **Editor** (esquerda) | Código com cores, números de linha e erros marcados na margem. A barra de baixo mostra quantos erros há (clique para ver a lista) e o que está sob o cursor. |
| **Desenho** (direita) | Redesenha a cada tecla. Roda do mouse aproxima, arrastar o fundo move a vista, **Ajustar** enquadra de novo. |
| **Guias / Pontos / Ossos / Papel vegetal** | Mostram as camadas `guide`, os pontos da linha atual, o esqueleto e os quadros vizinhos da animação. |
| **Player** (embaixo) | Escolhe a animação, toca/pausa, avança quadro a quadro e muda a velocidade. |
| **Pintar** | Repete a pintura traço a traço, com o pincel laranja, como no vídeo. |
| **Exportar** | PNG, JPG, GIF animado ou sprite sheet, com prévia. |
| **Referência** | A referência completa da linguagem, dentro do app (F1). |

Editando pelo desenho:

- Com o cursor numa linha, os pontos dela aparecem no desenho; o ponto sob o cursor fica **laranja**.
- **Arraste** um ponto para movê-lo (o código é atualizado). Funciona na "pose parada".
- **Duplo clique** num ponto liga/desliga o canto vivo (`!`).
- **Ctrl+clique** no desenho escreve a coordenada na posição do cursor.
- Com o cursor numa linha `key`, o player pula para aquele quadro.

Atalhos: `Ctrl+Z` / `Ctrl+Y` desfazer/refazer, `Ctrl+/` comentar, `Ctrl+D` duplicar linha, `Ctrl+S` salvar, `Ctrl+E` exportar, `Espaço` tocar/pausar e `←` `→` quadro anterior/próximo (com o foco fora do editor).

## A linguagem

Uma instrução por linha:

```
comando nome atributo=valor ... : x,y x,y x,y!
```

- `#` começa um comentário.
- Depois do `:` vêm os pontos. Pontos comuns formam **curvas suaves**; `x,y!` é um **canto vivo**.
- Cores: `#rgb`, `#rrggbb`, `#rrggbbaa`, um nome da `palette` ou `none`. Espessuras: número ou nome numérico da `palette`.

Exemplo mínimo:

```
canvas 480 360 bg=#f4efe6 light=-0.6,-0.8
palette ink=#1d1b26 line=6 ball=#ff6b4a

layer bola
ellipse b 240,180 60 c=ball ink=line weight=0.3
layer brilho clip=b
ellipse reflexo 218,156 22,14 rot=-30 c=#ffc2ad
```

### Instruções

| Instrução | Para quê |
|---|---|
| `canvas L A bg= light=x,y` | Tamanho, fundo (`none` = transparente) e direção da luz (engrossa o contorno do lado da sombra). |
| `finish game\|flat inner= pixel=` | `flat` tira os contornos; `inner` é a opacidade dos traços dentro de camadas com `clip`; `pixel=4` deixa pixelado. |
| `palette nome=valor ...` | Cores e espessuras com nome. `ink` é a cor padrão dos contornos. |
| `unity unit= root=x,y collider=l,a,dx,dy` | Pixels por unidade, ponto raiz e colisor para a Unity (vão no JSON da sprite sheet). |
| `layer nome [guide] [hidden] clip= only= opacity= blend=` | Camada. `guide` só aparece no editor; `clip=` recorta pelo formato de uma forma ou camada; `only=` limita a certas animações. |
| `shape nome c= ink= inkc= weight= inkon= smooth= : pontos` | Forma fechada. `inkon=camada` desenha o contorno em outra camada (por cima de outras coisas). |
| `stroke nome w= c= taper=a,b cap= : pontos` | Traço aberto, com pontas afinando (`taper`). |
| `stroke nome limb=w1,w2 hip=x,y on=osso foot=chão,x bend=` | Perna com IK: o quadril segue o osso, o pé fica na `line` chamada *chão*; dobra ao agachar e pendura no pulo. |
| `line nome c= w= dash=a,b : pontos` | Linha reta (boa para guias). |
| `ellipse nome cx,cy rx,ry rot=` | Elipse ou círculo. |
| `rect nome x,y l,a r= rot=` | Retângulo com cantos arredondados. |
| `bone nome parent= pivot=x,y` | Osso. Formas com `bone=nome` seguem o osso. |
| `cloth nome pivot=x,y tension= drag= swing=` | Tecido: os pontos longe do pivô balançam atrasados quando o osso se move. |
| `anim nome frames= fps= [once]` | Começa uma animação. |
| `key quadro osso=dx,dy,rot,sx,sy ... ease=` | Pose dos ossos naquele quadro; o resto é interpolado (`smooth`, `linear`, `in`, `out`, `back`, `step`). |

Todas as formas aceitam `bone=`, `cloth=` e `opacity=`.

### Animação

```
bone bola pivot=240,300            # pivô na base: a bola amassa contra o chão

anim quica frames=24 fps=24
key 0  bola=0,0,0,1.25,0.78 ease=out
key 12 bola=0,-170,0,1,1 ease=in
key 24 bola=0,0,0,1.25,0.78
```

Cada `key` diz onde cada osso está naquele quadro: deslocamento `dx,dy`, rotação em graus e escala `sx,sy`. O tecido (`cloth`) e as pernas (`limb`) reagem sozinhos ao movimento.

## Exportar

| Formato | O que sai |
|---|---|
| **PNG** | O quadro da tela, com fundo transparente opcional. |
| **JPG** | O quadro da tela, com qualidade ajustável. |
| **GIF animado** | Uma animação (no fps dela) ou a **pintura passo a passo**. Paleta de até 256 cores; a transparência do GIF é de 1 bit. |
| **Sprite sheet** | Um `.zip` com todos os quadros num PNG e um `.json` no formato do TexturePacker/Phaser (`frames`, `animations`, `meta.frameTags`), mais pivô e pixels por unidade para a Unity quando houver `unity`. Arranjo em grade ou uma linha por animação. |

Todos aceitam escala (25% a 400%) e **recortar ao desenho**: o recorte cobre todos os quadros da animação, então os quadros ficam alinhados.

## Exemplos incluídos

- **Cavaleiro (do vídeo)**: a reconstrução do desenho, com as mesmas linhas-guia e camadas, e as animações `stand`, `jump` e `dash`.
- **Primeiros passos (fantasma)**: comentado, bom para aprender a sintaxe.
- **Bola quicando**: squash & stretch com um osso só.

## Estrutura do projeto

```
index.html          página, painel de referência e janela de exportação
css/style.css       visual (tema escuro, como no vídeo)
js/geom.js          matrizes, curvas suaves, traço de espessura variável
js/lang.js          leitura da linguagem: linhas → modelo, com mensagens de erro
js/scene.js         ossos, tecido, pernas IK, desenho por camadas, pintura passo a passo
js/editor.js        editor com cores, números de linha e desfazer
js/gif.js           codificador de GIF animado (median cut + LZW)
js/zip.js           .zip simples para a sprite sheet
js/export.js        PNG, JPG, GIF, sprite sheet e a janela de exportação
js/examples.js      exemplos do menu
js/app.js           a interface: editor, desenho ao vivo, arrastar pontos, player
cli/weasel.js       linha de comando (usa os mesmos arquivos de js/)
exemplos/           os exemplos do menu como arquivos .weasel
referencia/         capturas do vídeo e transcrição do código mostrado
```

## Limitações

- O vídeo mostra a linguagem por poucos segundos e corta as linhas compridas. A sintaxe (`layer`, `shape`, `stroke`, `ellipse`, `line`, `bone`, `cloth`, `palette`, `clip=`, `inkon=`, `limb=`, `x,y!`...) segue o vídeo, mas o significado de alguns atributos foi deduzido (`weight`, `inner`, `limb`, `foot`), e `anim`/`key`, `rect`, `finish flat`/`pixel` foram criados aqui.
- A linha de comando precisa do `npm install` (a biblioteca `@napi-rs/canvas` desenha fora do navegador); o editor web não precisa de nada.
- Os arquivos de `exemplos/` são cópias dos exemplos embutidos em `js/examples.js` (que ficam no código para o editor funcionar abrindo o `index.html` direto).
- O GIF tem no máximo 256 cores e transparência de 1 bit (as bordas ficam serrilhadas em fundo transparente).
