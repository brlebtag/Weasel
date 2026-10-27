/* Weasel — exemplos que aparecem no menu. */
(function (W) {
  'use strict';

  const knight = `# Cavaleiro — reconstrução do desenho do vídeo (8:37–8:42)
# Mesmo canvas, mesmas linhas-guia e a mesma estrutura de camadas.

canvas 800 640 bg=#e4ded3 light=-0.6,-0.8
finish game inner=0.6

# Unity: 250 unidades do canvas por unidade da Unity; a raiz fica entre os pés
# o colisor é a caixa 0.5 x 1.28 com a base no chão
unity unit=250 root=400,560 collider=0.5,1.28125,0,0.640625

palette ink=#14141c line=11 inner=7 edge=4
palette mask=#f3f3f7 maskd=#d5d5df eye=#14141c body=#1b1b24
palette cloak=#545d7c stripe=#7d87a8 nail=#c9c1d2 smoke=#14141c

# Construção (só aparece no editor): chifres, topo da máscara, queixo, barra
layer construct guide
line ground c=#8a7f6e w=2 : 150,560 650,560
line centre c=#8a7f6e w=1 dash=6,6 : 400,110 400,580
line hornline c=#b0a48f w=1 dash=4,8 : 300,134 500,134
line masktop c=#b0a48f w=1 dash=4,8 : 300,254 500,254
line chin c=#b0a48f w=1 dash=4,8 : 300,415 500,415
line hem c=#b0a48f w=1 dash=4,8 : 300,540 500,540

# Esqueleto: tudo pendura na raiz (entre os pés), para agachar e pular
bone root pivot=400,560
bone body parent=root pivot=405,410
bone head parent=body pivot=405,400
# a capa, as faixas, as dobras e a aba balançam como um só tecido
cloth cape pivot=430,408 tension=0.5
# a espada vai junto com o corpo, mas balança sozinha (mola)
bone nail parent=body pivot=368,445 spring=0.35
# fumaça do dash
bone puff parent=root pivot=330,470

# (vazia parado) a fumaça escura do dash
layer smoke only=dash
shape puff1 c=smoke opacity=0.9 bone=puff : 340,420 384,440 392,494 350,522 296,510 284,458
shape puff2 c=smoke opacity=0.7 bone=puff : 252,436 290,446 298,490 262,512 218,498 212,456
shape puff3 c=smoke opacity=0.45 bone=puff : 178,458 204,466 208,494 182,508 152,496 150,470

layer nail
# O cabo da espada aparece por trás da capa: empunhadura estreita,
# pomo rombudo e uma guarda pequena
shape hilt c=nail ink=line weight=0 bone=nail : 292,404! 302,398! 362,426! 354,448! 336,444! 334,470! 321,468! 320,440! 287,423!

layer legs
# Duas pernas curtas e grossas saindo do corpo preto (IK: o pé fica no chão)
stroke legB limb=21,24 hip=386,510 on=body foot=ground,385 c=body
stroke legA limb=21,24 hip=421,510 on=body foot=ground,422 c=body

layer torso
# O corpo sob a capa é preto: aparece na frente e embaixo
shape torso c=body ink=line weight=0 bone=body : 370,404 458,404! 470,450 466,520 448,540 385,532 366,470

layer cloak
# A capa pende de uma prega na frente do pescoço e sobe para a frente
shape cloak c=cloak ink=line weight=0.15 inkon=cloakink bone=body cloth=cape : 350,418! 428,416! 432,462 426,508! 390,526 336,546! 340,487

layer cloakshade clip=cloak
# Faixas claras e dobras saem em leque da frente do pescoço
shape band1 c=stripe bone=body cloth=cape : 455,410! 380,426 300,436! 300,464! 384,440
shape band2 c=stripe bone=body cloth=cape : 455,422! 384,458 300,490! 300,516! 390,474
shape band3 c=stripe bone=body cloth=cape : 455,436! 390,500 312,546! 344,562! 400,512
stroke fold1 w=inner c=ink taper=0,0 bone=body cloth=cape : 440,414 396,430 346,450
stroke fold2 w=inner c=ink taper=0,0 bone=body cloth=cape : 440,422 394,462 348,500
stroke fold3 w=inner c=ink taper=0,0 bone=body cloth=cape : 438,432 402,490 370,530

layer cloakink

layer flap
# A aba estreita da frente: o outro lado da capa dando a volta
shape flap c=stripe ink=line weight=0 bone=body cloth=cape : 426,416! 442,418 447,465 442,515! 428,506 431,460

layer mask
# A máscara: uma casca larga e quadrada, não um círculo, com dois chifres
# e um entalhe pequeno perto de cada ponta
shape mask c=mask ink=line weight=0.15 inkon=maskink bone=head : 397,120! 393,137 386,148! 392,155! 383,178 380,213 392,239 415,246 436,237 443,209 444,167 448,152! 442,144! 443,122! 463,139 477,172 483,217 484,251 495,268 500,322 497,387 486,411 399,417 317,411 301,384 298,313 305,271 325,254 337,222 351,172 375,137

layer maskshade clip=mask
# Uma sombra cinza fina na borda de baixo, longe da luz
shape maskshadow c=maskd bone=head : 525,300! 525,440! 300,440! 300,402 360,405 430,399 474,382 490,340

layer face clip=mask
# Os olhos: um par inclinado em espelho
ellipse eyeA 429,350 17,28 rot=-3 c=eye bone=head
ellipse eyeB 495,347 17,28 rot=9 c=eye bone=head
# olhos fechados: não aparecem, servem de molde para piscar (morph)
ellipse eyeAshut 429,352 17,3 rot=-3 c=eye bone=head hidden
ellipse eyeBshut 495,349 17,3 rot=9 c=eye bone=head hidden

layer maskink
# o contorno da máscara sobe para cá (inkon=), por cima dos olhos
# A borda de fora do chifre continua um pouco para dentro da máscara
stroke hornroot w=inner c=ink taper=0,0.8 bone=head : 332,238 342,262 366,283

# ---------- animações ----------
# key quadro osso=dx,dy,rotação,escalaX,escalaY   ou   forma.propriedade=valor

anim stand frames=24 fps=12
key 0 body=0,0 head=0,0,0
key 12 body=0,3,0,1.01,0.985 head=0,1,-1.5
key 24 body=0,0 head=0,0,0
# piscar: os olhos viram os moldes fechados e voltam
key 16 eyeA.shape=eyeA eyeB.shape=eyeB
key 18 eyeA.shape=eyeAshut eyeB.shape=eyeBshut
key 20 eyeA.shape=eyeA eyeB.shape=eyeB

anim jump frames=24 fps=15
key 0 root=0,0 head=0,0,0
key 3 root=0,0,0,1.1,0.86 ease=out
key 6 root=0,-70,0,0.92,1.1 head=0,0,-5 ease=out
key 11 root=0,-120 ease=in
key 14 head=0,0,4
key 16 root=0,-50,0,0.96,1.05 ease=in
key 18 root=0,0,0,1.12,0.86 ease=out
key 20 head=0,0,0
key 21 root=0,0,0,0.98,1.02
key 24 root=0,0
event 3 pulo
event 18 pouso

anim dash frames=12 fps=15
event 0 dash
key 0 body=0,0,0 head=0,0,0 puff=50,0,0,0.3
key 2 body=16,6,14 head=4,0,-6 puff=12,0,0,1.25 ease=out
key 7 puff=-50,-10,0,0.9
key 8 body=18,6,15 head=4,0,-6
key 11 puff=-90,-16,0,0.05
key 12 body=0,0,0 head=0,0,0
`;

  const ghost = `# Primeiros passos
# Cada linha é uma instrução:
#   comando nome atributo=valor ... : x,y x,y x,y!
# - Pontos sem "!" viram curva suave; "x,y!" é um canto vivo.
# - As camadas (layer) são pintadas na ordem em que aparecem.
# - Ponha o cursor numa linha: os pontos dela aparecem no desenho.
#   Arraste um ponto para mover; Ctrl+clique adiciona um ponto no cursor;
#   duplo clique liga/desliga o canto vivo.

canvas 480 400 bg=#26304d light=-0.6,-0.8
palette ink=#141320 line=8 inner=4
palette ghost=#f6f4ff ghostd=#d4cdf2 cheek=#ffb3c7 moon=#ffe7a3 star=#fff6d8 hill=#1b2238

layer ceu
ellipse lua 392,78 30 c=moon
ellipse estrela1 70,60 3 c=star
ellipse estrela2 140,112 2 c=star
ellipse estrela3 300,40 2.5 c=star
shape morro c=hill : 0,330! 120,300 260,322 400,296 480,312! 480,400! 0,400!

# ossos: "corpo" flutua; o tecido "barra" balança atrasado
bone corpo pivot=240,200
bone sombra pivot=240,350
cloth barra pivot=240,120 tension=0.3 drag=2

layer chao
ellipse sombra 240,350 60,10 c=#10162a opacity=0.6 bone=sombra

layer fantasma
shape fantasma c=ghost ink=line weight=0.25 bone=corpo cloth=barra : 240,104 296,128 312,200 318,286! 292,270 268,292! 242,270 216,292! 190,270 164,286! 170,200 186,128

# clip= recorta esta camada pelo formato do fantasma
layer sombreado clip=fantasma
shape lado c=ghostd bone=corpo cloth=barra : 296,110! 340,300! 284,312! 296,240 300,170

layer rosto
ellipse olhoA 220,186 10,15 c=ink bone=corpo
ellipse olhoB 262,186 10,15 c=ink bone=corpo
ellipse bochechaA 206,214 9,5 c=cheek opacity=0.8 bone=corpo
ellipse bochechaB 276,214 9,5 c=cheek opacity=0.8 bone=corpo
stroke boca w=inner taper=0.2,0.2 bone=corpo : 232,222 241,229 250,222

# key quadro osso=dx,dy,rotação,escalaX,escalaY
anim flutua frames=32 fps=16
key 0 corpo=0,0,-3 sombra=0,0,0,1
key 16 corpo=0,-20,3 sombra=0,0,0,0.75
key 32 corpo=0,0,-3 sombra=0,0,0,1
`;

  const ball = `# Bola quicando — squash & stretch com um osso só
# O pivô do osso fica na base da bola, então ela amassa contra o chão.

canvas 480 360 bg=#f4efe6 light=-0.5,-0.85
palette ink=#1d1b26 line=6 ball=#ff6b4a hi=#ffc2ad shadow=#d9cfc0 floor=#c9bca8

layer chao
line piso c=floor w=4 : 40,300 440,300

bone sombra pivot=240,302
bone bola pivot=240,300

layer sombra
ellipse s 240,302 46,9 c=shadow bone=sombra

# trail= desenha os quadros anteriores, cada vez mais fracos (rastro de movimento)
layer bola trail=3,0.45
ellipse b 240,256 44 c=ball ink=line weight=0.3 bone=bola

layer brilho clip=b
ellipse reflexo 222,236 18,12 rot=-30 c=hi bone=bola

anim quica frames=24 fps=24
key 0 bola=0,0,0,1.25,0.78 sombra=0,0,0,1.1 ease=out
key 3 bola=0,-40,0,0.9,1.12 ease=out
key 12 bola=0,-170,0,1,1 sombra=0,0,0,0.55 ease=in
key 21 bola=0,-40,0,0.9,1.12 ease=in
key 24 bola=0,0,0,1.25,0.78 sombra=0,0,0,1.1
`;

  const owl = `# Coruja — componentes, espelho, gradientes, morph, eventos e variantes
# Experimente: escolha uma variante na vista (neve, fogo) e toque a animação "pia".

canvas 480 480 bg=noite light=-0.5,-0.85
finish game inner=0.8

# variáveis: o eixo do espelho e o centro do corpo
let cx=240 chao=404

palette ink=#1b1625 line=7 inner=4
palette pena=#8a6248 penad=#5e4030 barriga=#ead6b4 disco=#d9b48f bico=#f2a33a olho=#ffcf3f galho=#4a3426 lua=#fff3c4

# variantes trocam cores da palette
variant neve pena=#e9edf2 penad=#aeb8c6 barriga=#ffffff disco=#f3f6fa olho=#ffd84a galho=#3b3f52
variant fogo pena=#c4512b penad=#7a2a17 barriga=#ffd6a8 disco=#f0a070 olho=#9df2ff

gradient noite linear 0,0 0,480 : #141a33@0 #2c2a55@0.65 #4b3557@1
gradient luz radial 400,84 74 : #fff3c470@0.4 #fff3c400@1
# "box": de 0 a 1 dentro de cada forma que usar o gradiente
gradient corpoG linear 0,0 0,1 box : pena@0.15 penad@1
gradient barrigaG radial 0.5,0.3 0.75 box : #fffaf0@0 barriga@1

# ---------- componentes (desenhados em volta de 0,0) ----------
def estrela cor=#fff6d8
shape s c=cor : 0,-9! 2,-2 9,0! 2,2 0,9! -2,2 -9,0! -2,-2
end

# olho: íris, pupila, brilho e a pálpebra que fecha por morph
def olho
ellipse iris 0,0 30 c=olho ink=line
ellipse pupila 0,4 14 c=ink
ellipse brilho -7,-8 5 c=#ffffff
ellipse palpebra 0,-29 31,3 c=pena ink=line
ellipse fechada 0,0 31 c=pena hidden
end

# uma pena em "v" da barriga
def pena
stroke v w=inner c=penad taper=0.25,0.25 : -9,-4 0,4 9,-4
end

# ---------- esqueleto ----------
bone corpo pivot={cx},{chao}
bone cabeca parent=corpo pivot={cx},250 sway=2,3
bone asaE parent=corpo pivot=152,236
bone asaD parent=corpo pivot=328,236
# os tufos das orelhas têm mola: balançam atrasados quando a coruja pula
bone tufoE parent=cabeca pivot=182,168 spring=0.45
bone tufoD parent=cabeca pivot=298,168 spring=0.45

layer ceu
ellipse halo 400,84 74 c=luz
ellipse lua 400,84 32 c=lua
use estrela 60,58
use estrela 128,118 scale=0.6
use estrela 300,40 scale=0.8 rot=15
use estrela 42,214 scale=0.5
use estrela 452,206 scale=0.7 cor=#ffe7a3

layer galho
stroke galho w=22 c=galho : 10,{chao+6} 130,{chao-2} 250,{chao} 370,{chao-8} 470,{chao}
stroke graveto w=10 c=galho taper=0,0.9 : 380,{chao-6} 420,{chao-34} 446,{chao-52}

layer orelhas
shape tufoE c=penad ink=line bone=tufoE : 180,178 148,112! 214,160
shape tufoD mirror=tufoE@{cx} bone=tufoD

layer pes
shape peE c=bico ink=line bone=corpo : 206,386 212,414! 221,394 229,416! 236,390
shape peD mirror=peE@{cx}

layer tronco
shape corpo c=corpoG ink=line weight=0.2 bone=corpo : {cx},140 300,152 340,200 352,270 340,340 300,384 {cx},396 180,384 140,340 128,270 140,200 180,152

layer barriga clip=corpo
ellipse barriga {cx},318 76,86 c=barrigaG bone=corpo
use pena 222,290 bone=corpo
use pena 258,290 bone=corpo
use pena {cx},312 bone=corpo
use pena 222,334 bone=corpo
use pena 258,334 bone=corpo
use pena {cx},356 bone=corpo

layer asas
shape asaE c=penad ink=line bone=asaE : 150,224 118,262 112,322 134,368! 158,330 162,270
shape asaD mirror=asaE@{cx} bone=asaD

layer rosto
ellipse discoE 198,232 52,48 c=disco ink=inner bone=cabeca
ellipse discoD mirror=discoE@{cx}
use olho 198,232 bone=cabeca
use olho 282,232 flip=x bone=cabeca
shape bico c=bico ink=line bone=cabeca : {cx},256 252,270 {cx},292! 228,270
shape bicoAberto c=bico ink=line bone=cabeca hidden : {cx},254 255,270 {cx},304! 225,270

# só aparece durante a animação "pia"
layer fala only=pia
text balao {cx},458 "uh-uuh!" size=28 align=center c=#fff6d8 ink=3 inkc=ink bold

# ---------- animação ----------
anim pia frames=48 fps=16
key 0 corpo=0,0 asaE=0,0,0 asaD=0,0,0 bico.shape=bico balao.opacity=0
key 8 corpo=0,5,0,1.05,0.95
key 12 corpo=0,-10,0,0.97,1.05 asaE=0,0,28 asaD=0,0,-28 bico.shape=bicoAberto balao.opacity=1 ease=out
key 16 bico.shape=bico
key 20 corpo=0,0 asaE=0,0,0 asaD=0,0,0
key 30 balao.opacity=0
key 34 palpebra.shape=palpebra
key 36 palpebra.shape=fechada
key 38 palpebra.shape=palpebra
key 0 s.opacity=1
key 24 s.opacity=0.35
event 12 pio
event 36 pisca
`;

  const night = `# Noite — luz, sombra projetada, partículas e efeitos
# O Cavaleiro vem do arquivo cavaleiro.weasel (include). Toque "stand": a lanterna
# balança, a luz dela passeia pelo Cavaleiro e a sombra no chão acompanha.

# ---------- atrás do Cavaleiro (camadas antes do include) ----------
layer cidade
shape predios c=#151a2c smooth=0 : 0,560! 0,330! 70,330! 70,280! 150,280! 150,360! 210,360! 210,250! 280,250! 280,400! 330,400! 330,560!
rect janela1 92,300 12,16 c=#ffd27a emit=#ffb860,0.7
rect janela2 120,330 12,16 c=#ffd27a emit=#ffb860,0.7
rect janela3 232,280 12,16 c=#ffe9b0 emit=#ffb860,0.5
ellipse lua 130,110 34 c=#e9eefc emit=#bcd2ff,1

layer calcada
rect pedras 0,560 800,80 c=pedra
line meiofio c=#2b2a36 w=4 : 0,561 800,561

# a sombra do Cavaleiro: silhueta das camadas dele, deitada no chão
layer sombra cast=ground,0.6,8 from=nail,legs,torso,cloak,cloakshade,flap,mask

# o poste e a lanterna, que balança num osso (e a luz vai junto)
bone lanterna pivot=644,154 sway=7,2.4
layer poste
rect haste 692,150 16,412 c=ferro ink=4
rect braco 640,146 60,8 c=ferro ink=3
stroke gancho w=3 c=ferro bone=lanterna : 644,154 644,168
shape tampa c=ferro ink=3 bone=lanterna smooth=0 : 630,168 658,168 652,177 636,177
rect vidro 634,177 20,34 r=3 c=vidro ink=3 emit=#ffb860,1.4 bone=lanterna
shape base c=ferro ink=3 bone=lanterna smooth=0 : 632,211 656,211 650,219 638,219

include "cavaleiro.weasel"

# ---------- a cena (depois do include, para valer por cima do cavaleiro.weasel) ----------
canvas 800 640 bg=ceuNoite
finish game inner=0.6 bloom=0.35 vignette=0.5 grain=0.035
gradient ceuNoite linear 0,0 0,640 : #0b1022@0 #1b2142@0.65 #2a2940@1
palette ferro=#24242e vidro=#ffe2a8
pattern pedra hatch angle=-25 gap=18 w=1.4 c=#6a6578 bg=#a39daf cross

ambient c=#5866a0 power=0.5
light lampiao point 644,194 c=#ffb860 power=1.7 radius=560 glow=110 flicker=0.12 bone=lanterna rim=5
light lua dir -0.45,-0.85 c=#9fb4ff power=0.22

layer neblina unlit blur=14 opacity=0.22
ellipse nevoa1 300,566 260,24 c=#8fa0d8
ellipse nevoa2 650,580 220,20 c=#8fa0d8

layer chuva unlit
emitter gotas 400,-30 rate=70 life=1.1 speed=640 angle=100 spread=4 area=1000,0 c=#a8b8ff60 size=4 shape=streak seed=3

layer mariposas unlit
emitter mariposa 644,194 rate=5 life=2.2 speed=40 spread=360 drag=1.2 c=#fff1c4,#fff1c400 size=5,2 shape=soft emit=#ffd27a,0.6 bone=lanterna seed=7
`;

  const engraving = `# Gravura — hachura, hachura cruzada e pontos (estilo nanquim)
canvas 480 360 bg=#f4efe4 light=-0.6,-0.8
palette ink=#1a1712 line=3 papel=#f4efe4

pattern leve hatch angle=45 gap=6 w=0.9 c=ink
pattern media hatch angle=45 gap=4.5 w=1 c=ink cross
pattern escura hatch angle=-30 gap=3 w=1.1 c=ink cross
pattern pontos dots gap=6 r=0.9 c=ink

layer mesa
rect tampo 0,250 480,110 c=leve
line borda w=2 : 0,250 480,250

layer sombra
ellipse sombraMaca 262,262 96,15 c=escura

layer maca
ellipse maca 240,186 82,78 c=papel ink=line weight=0.4
layer volume clip=maca
shape lado c=media : 262,96! 370,120 370,300! 190,300! 282,240 312,170
ellipse reflexo 206,148 16,11 rot=-30 c=papel
layer detalhes
stroke cabo w=4 taper=0,0.5 : 240,116 246,96 258,80
shape folha c=pontos ink=2 : 258,94 300,72 324,90 290,108!
text legenda 240,342 "Maçã — hachura e pontos" size=15 align=center c=ink italic
`;

  const set = `# Cenário — morros à noite, para o filme.weasel
# É um desenho comum; o filme coloca ele em cena com: actor cenario "cenario.weasel" 0,0
# depth= só vale dentro de um filme: quanto maior, mais longe. Quando a câmera anda,
# o que está longe anda menos (paralaxe). Na câmera parada tudo fica como foi desenhado.
# O mundo é mais largo que o quadro: vai de x=-600 até x=4200.

canvas 1920 1080 bg=none
palette ink=#0d0f1c line=6
palette serra=#1e2750 morro=#273260 terra=#2b2c42 grama=#0f1526 folha=#17213c
palette ferro=#24242e vidro=#ffe2a8 estrela=#fff6d8

# bem longe: a lua e as estrelas quase não saem do lugar
layer ceu depth=12 unlit
ellipse lua 1460,230 70 c=#eef2ff emit=#bcd2ff,1.2
ellipse e1 180,120 3 c=estrela
ellipse e2 420,260 2 c=estrela
ellipse e3 760,90 2.5 c=estrela
ellipse e4 980,300 2 c=estrela
ellipse e5 1210,150 3 c=estrela
ellipse e6 1720,90 2 c=estrela
ellipse e7 1900,280 2.5 c=estrela
ellipse e8 2200,160 2 c=estrela
ellipse e9 2480,70 3 c=estrela
ellipse e10 2760,240 2 c=estrela
ellipse e11 3100,130 2.5 c=estrela
ellipse e12 3400,280 2 c=estrela

layer serra depth=5
shape serra c=serra : -900,720! -500,540 -150,620 220,480 600,610 980,440 1380,600 1760,460 2160,610 2560,490 2960,630 3360,510 3800,640 4300,530 4900,700! 4900,1100! -900,1100!

layer morros depth=2.5
shape morros c=morro : -900,830! -380,700 260,770 880,670 1560,790 2260,690 2960,780 3660,690 4500,810! 4500,1100! -900,1100!

# plano da ação (depth 1): o chão onde os personagens pisam fica em y=900
layer chao
shape terra c=terra : -1300,912! -200,898 900,906 2000,896 3100,904 4400,898! 4400,1120! -1300,1120!
stroke borda c=#3a3b56 w=4 : -1300,912 -200,898 900,906 2000,896 3100,904 4400,898

# o poste com o lampião (a luz dele está no filme.weasel, para iluminar os atores também)
bone lanterna pivot=2000,520 sway=5,2.6
layer poste
rect haste 2050,510 18,392 c=ferro ink=4
rect braco 1994,506 70,9 c=ferro ink=3
stroke gancho w=3 c=ferro bone=lanterna : 2000,520 2000,536
shape tampa c=ferro ink=3 bone=lanterna smooth=0 : 1984,536 2016,536 2009,546 1991,546
rect vidro 1988,546 24,40 r=3 c=vidro ink=3 emit=#ffb860,1.4 bone=lanterna
shape base c=ferro ink=3 bone=lanterna smooth=0 : 1986,586 2014,586 2007,595 1993,595

# vaga-lumes: o sorteio é fixo e anda com o relógio do filme
layer vagalumes depth=1.4 unlit
emitter vagalumes 1700,640 rate=7 life=5 speed=14 spread=360 area=2600,320 size=6,2 c=#fff3a0,#ffd23f00 shape=soft emit=#ffd23f,0.6 seed=4

# perto da câmera: moitas na frente de tudo (passam rápido quando a câmera anda)
layer frente depth=0.6 front
shape moita1 c=grama : -400,1100! -300,960 -120,930 60,980 180,1100!
shape moita2 c=folha : 900,1100! 1000,990 1180,960 1330,1010 1420,1100!
shape moita3 c=grama : 2500,1100! 2620,950 2820,930 2960,990 3060,1100!
shape moita4 c=folha : 3600,1100! 3700,980 3880,960 4020,1100!
`;

  const film = `# Filme — planos, atores, câmera com profundidade e luz da cena
# Os personagens são os mesmos arquivos do jogo (cavaleiro.weasel, fantasma.weasel):
# o filme só diz onde eles ficam, o que fazem e para onde a câmera olha.
# Exporte em vídeo pela linha de comando:  weasel filme.weasel -o filme.mp4

film fps=24
canvas 1920 1080 bg=ceu
gradient ceu linear 0,0 0,1080 : #060916@0 #131a3a@0.62 #26284a@1
finish game bloom=0.3 vignette=0.45

# a luz do lampião (o desenho do poste está no cenário) ilumina o cenário e os atores
ambient c=#5866a0 power=0.5
light lampiao point 2000,566 c=#ffb860 power=1.6 radius=720 glow=130 flicker=0.1

# atores declarados antes do primeiro shot valem para todos os planos
actor cenario "cenario.weasel" 0,0
actor heroi "cavaleiro.weasel" 1720,900 scale=0.9 anim=stand
actor fantasma "fantasma.weasel" 3400,880 origin=240,350 scale=1.1 anim=flutua hide=ceu

# letreiro preso na tela, só no primeiro plano
layer titulo screen unlit only=abertura
text nome 960,360 "Weasel" size=130 c=#f4efe6 align=center font=serif bold
text sub 960,440 "um filme feito com código" size=40 c=#c9c3d8 align=center

# 1. a câmera desce da lua até o Cavaleiro (as camadas longe andam menos)
shot abertura dur=6s
camera 900,380 zoom=0.9 fade=1
at 0s titulo.opacity=0
at 1.5s camera.fade=0 titulo.opacity=1 ease=linear
at 3.5s titulo.opacity=1
at 4.5s titulo.opacity=0
at 6s camera.pos=1760,640 camera.zoom=1.1

# 2. o fantasma chega; a câmera vai atrás dele, um pouco atrasada
shot encontro dur=5s
camera follow=fantasma offset=-260,-300 lag=0.5 zoom=1.15
at 4.2s fantasma.pos=2200,880 ease=out
at 4.6s heroi.flip=x
at 5s heroi.flip=none

# 3. de perto: o pulo, o tranco no pouso e a saída de cena
shot pulo dur=4.5s
camera 1800,690 zoom=1.6
at 0s fantasma.pos=2200,880
at 0.4s heroi.anim=jump
at 1.55s camera.shake=0
at 1.65s camera.shake=16 ease=linear
at 2s heroi.anim=stand
at 2.2s camera.shake=0
at 2.6s heroi.anim=dash heroi.flip=x heroi.pos=1720,900 camera.pos=1800,690
at 3.2s heroi.pos=1050,900 camera.pos=1500,690 ease=out
at 3.4s camera.fade=0
at 4.5s camera.fade=1 ease=linear
`;

  const blank = `canvas 600 400 bg=#f2ede4 light=-0.6,-0.8
palette ink=#1c1b22 line=6

layer desenho
shape forma c=#7cb7ff ink=line : 220,140 380,130 420,250 300,300! 190,250
`;

  W.examples = [
    { id: 'knight', title: 'Cavaleiro (do vídeo)', file: 'cavaleiro', src: knight },
    { id: 'owl', title: 'Coruja (componentes, gradientes, morph)', file: 'coruja', src: owl },
    { id: 'night', title: 'Noite (luz, sombra, partículas)', file: 'noite', src: night, deps: ['knight'] },
    { id: 'engraving', title: 'Gravura (hachura)', file: 'gravura', src: engraving },
    { id: 'ghost', title: 'Primeiros passos (fantasma)', file: 'fantasma', src: ghost },
    { id: 'ball', title: 'Bola quicando', file: 'bola', src: ball },
    { id: 'set', title: 'Cenário (camadas de profundidade)', file: 'cenario', src: set },
    { id: 'film', title: 'Filme (planos, atores, câmera)', file: 'filme', src: film, deps: ['set', 'knight', 'ghost'] },
  ];
  W.blankProgram = blank;
})(window.Weasel = window.Weasel || {});
