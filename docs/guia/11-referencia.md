# 11. Referência rápida

[← Filme](10-filme.md) · [Índice](README.md) · [Próximo: Problemas comuns →](12-problemas.md)

Todas as instruções, com os atributos e os **valores padrão** (o que vale quando você não escreve o atributo). Entre colchetes, `[opção]` é uma palavra solta opcional. "Cor de tinta" é o `ink` da `palette` (padrão `#14141c`).

## Escrita

| Item | Forma |
|---|---|
| Linha | `comando nome valores atributo=valor [opções] : pontos` |
| Comentário | `#` no começo da linha ou depois de um espaço (uma cor `#hex` não é comentário) |
| Ponto | `x,y` liso · `x,y!` canto vivo · `x,y~dx,dy` com alça |
| Cor | `#rgb` `#rrggbb` `#rrggbbaa` · nome da `palette` · `gradient` · `pattern` · nome do CSS · `none` |
| Espessura | número · nome numérico da `palette` (`line`, `inner`…) · `none` (0) |
| Conta | `{expressão}` em qualquer número: `+ - * / % ^ ( )`, variáveis do `let` e de `def`, `pi`, `sin cos tan atan2` (graus), `sqrt abs min max round floor ceil pow lerp clamp` |
| Ângulo | graus; 0 = direita, positivo = horário, 90 = para baixo |
| Texto | entre aspas: `"Olá"` |
| Tempo (filme) | `2s` `1.5` `500ms` `48f` `1m30s`; `+1s` = depois do anterior |

## Configuração

| Instrução | Atributos (padrão) |
|---|---|
| `canvas L A` | `bg=` cor, gradiente ou `none` (`#ffffff`) · `light=x,y` direção da luz do contorno (`-0.6,-0.8`). Tamanho de 1 a 4096 (padrão 800×600; num filme, 1920×1080). |
| `finish [game\|flat]` | `inner=` opacidade dos traços em camadas com `clip`, 0–1 (1) · `pixel=` 1–32 (1) · `posterize=` 2–64 ou `palette` · `bloom=` `vignette=` `grain=` 0–3 (0) |
| `palette nome=valor …` | cores e números. Já existem: `ink=#14141c` `line=8` `inner=5` `edge=3` |
| `let nome=valor …` | variáveis para as contas; lidas antes de tudo |
| `gradient nome linear x1,y1 x2,y2 [box] : cores` | cores com posição opcional `cor@0.5` |
| `gradient nome radial cx,cy raio [fx,fy] [box] : cores` | `fx,fy` = foco |
| `pattern nome [hatch\|dots] [cross]` | `c=` (cor de tinta) · `bg=` (nenhum) · `gap=` (6) · `w=` (1.2) · `r=` (1.4) · `angle=` (45) |
| `variant nome chave=valor …` | troca valores da `palette` nessa versão |
| `include "arquivo.weasel"` | o outro arquivo entra nesta linha |
| `unity` | `unit=` pixels por unidade (100) · `root=x,y` (meio da base do canvas) · `collider=l,a[,dx,dy]` |

## Camadas

`layer nome [guide] [hidden] [lit] [unlit] [screen] [front]`

| Atributo | Padrão | O que faz |
|---|---|---|
| `clip=forma\|camada` | — | só aparece dentro |
| `cut=forma\|camada` | — | só aparece fora |
| `only=anim,…` | todas | só nessas animações (`pose` = pose parada; no filme, também nomes de plano) |
| `opacity=` | 1 | transparência |
| `blend=` | `normal` | `multiply` `screen` `overlay` `darken` `lighten` `color-dodge` `color-burn` `hard-light` `soft-light` `difference` `exclusion` `hue` `saturation` `color` `luminosity` |
| `blur=` | 0 | desfoque (px) |
| `glow=cor,raio,força` | raio 12, força 1 | brilho em volta |
| `shadow=cor,dx,dy,desfoque` | 4, 6, 8 | sombra deslocada |
| `tint=cor,quanto` | quanto 0.5 | tingir |
| `brightness=` `saturate=` `contrast=` | 1 | ajustes de cor (0–10) |
| `hue=` | 0 | girar o matiz (graus) |
| `trail=quadros,queda,cor` | queda 0.5 | rastro (1–30 quadros) |
| `cast=chão,opacidade,desfoque` | 0.45, 6 | sombra projetada numa `line` |
| `from=camada,…` | a própria | de quem é a silhueta do `cast` |
| `rim=cor,largura` | largura 4 | fio de luz na borda |
| `shade=` | 0.5 | claro e escuro da luz (0–2) |
| `depth=` | 1 | profundidade no filme (0.05–1000) |

## Formas

Todas aceitam: `c=` `opacity=` `bone=` `cloth=` `cut=forma,…` `mirror=forma@x` (ou `@y300`) `emit=cor,força` e a opção `[hidden]`.

| Instrução | Valores e atributos (padrão) |
|---|---|
| `shape nome … : pontos` | 3 ou mais pontos · `ink=` (0, sem contorno) · `inkc=` (cor de tinta) · `weight=` 0–3 (0) · `inkon=camada` · `smooth=` 0–2 (1). Sem `c=` e sem `ink=`: pintada na cor de tinta. |
| `ellipse nome cx,cy r` ou `rx,ry` | `rot=` (0) · `ink=` `inkc=` `weight=` `inkon=` como no `shape` |
| `rect nome x,y l,a` | `r=` cantos (0) · `rot=` em volta do centro (0) · `ink=` `inkc=` `weight=` `inkon=` |
| `stroke nome … : pontos` | 2 ou mais pontos · `w=` (4) · `c=` (cor de tinta) · `taper=início,fim` 0–1 (0,0) · `cap=round\|butt\|square` (round) · `smooth=` (1) |
| `stroke nome limb=w1,w2 hip=x,y on=osso foot=chão,x` | perna com IK. `foot=x,y` também vale · `bend=` −3 a 3 (1) |
| `stroke nome limb=w1,w2 hip=x,y on=osso target=osso` | braço com IK |
| `line nome … : pontos` | 2 ou mais pontos · `w=` (1) · `c=` (cor de tinta) · `dash=traço,vão,…` |
| `text nome x,y "texto"` | `size=` (24) · `font=` (`sans-serif`) · `align=left\|center\|right` (left) · `rot=` · `c=` (cor de tinta) · `ink=` (0) · `inkc=` · `[bold]` `[italic]` |
| `emitter nome x,y` | `rate=` (20) · `burst=` (0) · `life=` (1) · `speed=` (80) · `angle=` (−90) · `spread=` (40) · `gravity=` (0) · `wind=` (0) · `drag=` (0) · `size=início,fim` (4) · `c=início,fim` (cor de tinta) · `shape=dot\|soft\|square\|streak\|star` (dot) · `area=l,a` (0) · `seed=` (1) |

## Componentes

| Instrução | Atributos |
|---|---|
| `def nome param=padrão …` … `end` | só formas e `use` dentro; desenho em volta de `0,0`; parâmetro numérico vira variável e espessura, os outros viram cor |
| `use nome x,y` | `scale=s` ou `sx,sy` · `rot=` · `flip=x\|y\|xy` · `bone=` · `cloth=` · `opacity=` · `param=valor` |

## Esqueleto e animação

| Instrução | Atributos (padrão) |
|---|---|
| `bone nome pivot=x,y` | `pivot=` obrigatório · `parent=` · `sway=graus,segundos[,fase]` · `bob=px,segundos[,fase]` · `jitter=px` 0–200 · `spring=` 0–1 (dura perto de 1) |
| `cloth nome pivot=x,y` | `tension=` 0–1 (0.5) · `drag=` 0–10 (1) · `swing=` 0–10 (1) · `bone=` |
| `anim nome` | `frames=` 1–600 (24) · `fps=` 1–60 (12) · `[once]` (padrão: loop) |
| `key quadro …` | `osso=dx,dy,rot,sx,sy` (padrão `0,0,0,1,1`; 1 número = dx, 4 números = escala igual) · `alvo.prop=valor` · `ease=` (smooth) |
| `event quadro nome …` | um ou mais nomes |

**`ease=`**: `smooth` (padrão), `linear`, `in`, `out`, `back`, `step`. Na `key`, diz como o movimento **sai** daquela key; no `at` do filme, como ele **chega** naquele `at`.

**O que a `key` anima** (`nome.propriedade=valor`):

| Alvo | Propriedades |
|---|---|
| forma | `opacity` · `c` · `inkc` · `w` · `ink` · `show` (1/0) · `shape` (morph) |
| camada | `opacity` · `show` · `blur` · `glow` · `tint` · `brightness` · `saturate` · `contrast` · `hue` |
| luz | `power` · `radius` · `c` · `glow` · `aim` · `cone` |
| caixa | `show` |

## Luz

| Instrução | Atributos (padrão) |
|---|---|
| `ambient` | `c=` (#ffffff) · `power=` 0–5 (0.6) |
| `light nome point x,y` | `c=` (#ffffff) · `power=` 0–20 (1) · `radius=` (300) · `glow=` (0) · `flicker=` 0–1 (0) · `rim=` (0) · `bone=` |
| `light nome spot x,y` | os mesmos, mais `aim=` (90) · `cone=` 1–180 (30) |
| `light nome dir dx,dy` | `c=` · `power=` |

## Jogo

| Instrução | Atributos (padrão) |
|---|---|
| `box nome body\|hit\|hurt rect x,y l,a` | também `circle cx,cy r` e `capsule cx,cy l,a` · `bone=` · `only=` · `[off]` (padrão: `body`, `rect`, ligada) |
| `godot` | `body=character\|static\|area\|rigid\|node` (character) · `root=x,y` · `name=` · `normal=` 0–10 (1) |
| `tileset` | `size=l` ou `l,a` (32) · `[auto]` |
| `tile nome coluna,linha` | `[solid]` · `[oneway]` · `collision=forma` |
| `mouth forma A=forma B=forma@0.3 …` | bocas A, B, C, D, E, F, G, H e X, por morph |

## Filme

| Instrução | Atributos (padrão) |
|---|---|
| `film` | `fps=` 1–120 (24) · `dur=` (só sem `shot`) · `lang=` (pt) · `subs=burn\|file` · `subsize=` · `subc=` (#ffffff) |
| `actor nome "arquivo" x,y` | `scale=` · `rot=` · `flip=x\|y\|xy\|none` · `depth=` (1) · `anim=` · `speed=` (1) · `opacity=` (1) · `origin=x,y` (o `root=` do `unity` do arquivo, ou 0,0) · `variant=` · `hide=camada,…` · `[screen]` `[bg]` `[hidden]` `[unlit]` `[front]` |
| `shot nome` | `dur=` (obrigatório) |
| `camera x,y` | `zoom=` (1) · `rot=` (0) · `shake=` (0) · `follow=ator` · `offset=dx,dy` · `lag=` segundos (0) · `fade=` 0–1 (0) · `fadec=` (#000000). Padrão: o centro do canvas. |
| `at tempo alvo.prop=valor …` | `ease=` (smooth) |
| `scene "arquivo"` | os planos de outro filme |
| `audio nome "arquivo"` | `at=` · `from=` · `dur=` · `vol=` 0–4 (1) · `lips=ator` · `cues="arquivo"` · `text="…"` · `lang=` · `[loop]` |
| `sub tempo "texto"` | `dur=` (o tempo de ler) · `lang=` |

**O que o `at` muda:** ator `pos x y scale rot opacity depth flip show anim speed variant` · câmera `pos x y zoom rot shake follow offset lag fade fadec` · luz `power radius c glow aim cone` · camada `opacity show` e os efeitos.

## Linha de comando

| Opção | O que faz |
|---|---|
| `-o arquivo` | saída; a extensão escolhe o formato (`.png .jpg .gif .svg .tres .tscn .zip`; filme: `.mp4 .mov .webm .mkv .wav .fcpxml .edl`) |
| `-f formato` | `png jpg gif svg sheet godot tscn build` (GIF da pintura passo a passo) |
| `-a anim` | animação (`all` = todas, na sprite sheet) |
| `--frame n` · `--frames` | um quadro · um arquivo por quadro |
| `--variant nome` | variante (`all` = todas) |
| `-s n` · `-t` · `--trim` | escala · fundo transparente · recortar ao desenho |
| `--guides` | inclui as camadas `guide` |
| `--check` · `--info` | só procurar erros · mostrar camadas, ossos, animações e eventos |
| `--watch` | exportar de novo a cada mudança |
| `-e "código"` · `-` | código direto (`;` separa linhas) · ler da entrada padrão |
| `--help` | a lista completa |

[← Filme](10-filme.md) · [Índice](README.md) · [Próximo: Problemas comuns →](12-problemas.md)
