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
# bocas do lip sync (num filme: audio … lips=coruja): o bico abre por morph, pouco ou muito
mouth bico A=bico B=bicoAberto@0.3 C=bicoAberto@0.6 D=bicoAberto E=bicoAberto@0.45 F=bicoAberto@0.2

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

  const film = `# Filme — planos, atores, câmera com profundidade, luz da cena, fala e legendas
# Os personagens são os mesmos arquivos do jogo (cavaleiro.weasel, fantasma.weasel, coruja.weasel):
# o filme só diz onde eles ficam, o que fazem, para onde a câmera olha e quem fala.
# Exporte em vídeo pela linha de comando:  weasel filme.weasel -o filme.mp4
# (sai com o som de referência misturado e as legendas em filme.srt)

film fps=24
canvas 1920 1080 bg=ceu
gradient ceu linear 0,0 0,1080 : #060916@0 #131a3a@0.62 #26284a@1
finish game bloom=0.3 vignette=0.45

# a luz do lampião (o desenho do poste está no cenário) ilumina o cenário e os atores
ambient c=#5866a0 power=0.5
light lampiao point 2000,566 c=#ffb860 power=1.6 radius=720 glow=130 flicker=0.1

# som de fundo em loop, o filme inteiro (som e legendas de referência; a mixagem final é no editor de vídeo)
audio grilos "som/grilos.wav" loop vol=0.35

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

# 3. a coruja no lampião avisa o Cavaleiro: o bico segue a fala (lip sync) e as legendas vão para o .srt
shot conversa dur=5s
actor coruja "coruja.weasel" 2059,512 origin=240,404 scale=0.5 hide=ceu,galho,fala
camera 1930,660 zoom=1.3
at 0s fantasma.pos=2200,880
audio fala "som/coruja_fala.wav" at=0.4s lips=coruja
sub 0.65s "Uh-uuh! Boa noite, Cavaleiro." dur=2s
sub +0.2s "Cuidado com o fantasma…" dur=1.6s

# 4. de perto: o pulo, o tranco no pouso e a saída de cena
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

  const topdown = `# Furão — personagem de jogo top-down, para o Godot
# Três vistas (frente, costas e lado direito), cada uma em camadas com only=. As animações
# terminam em _down, _up e _right; na cena do Godot, o lado esquerdo sai espelhado do direito
# e o ajudante tocar("walk", velocity) escolhe a animação pela direção.
# box: colisão do corpo (body), área que leva dano (hurt) e o golpe (hit), que só liga
# nos quadros do ataque. Exporte com:  weasel furao.weasel -o godot/furao.tscn

canvas 160 160 bg=#eef0e6 light=-0.6,-0.8
palette ink=#2a1d16 line=4 thin=2
palette pelo=#c98f5a pelod=#a8703f barriga=#f6e7cf mascara=#5b3a28 rosa=#e9a0a8
palette olho=#1a1414 metal=#d9dee6 cabo=#7a5232

# a raiz fica entre os pés: é a origem do nó no Godot
godot body=character root=80,128

# Construção: o chão e o centro (só aparecem no editor)
layer guia guide
line chao c=#b9bba8 w=1 : 20,128 140,128
line meio c=#b9bba8 w=1 dash=4,4 : 80,20 80,140

# a espada é desenhada em volta da mão (0,0), com a lâmina para cima
def espada
rect lamina -3,-36 6,32 r=2 c=metal ink=thin
rect guarda -8,-6 16,4 c=cabo ink=thin
rect punho -2,-2 4,9 c=cabo ink=thin
end

# ---------- ossos (os mesmos para as três vistas) ----------
bone corpo pivot=80,128
bone cabeca parent=corpo pivot=80,92
bone peE pivot=68,126
bone peD pivot=92,126
bone bracoE parent=corpo pivot=58,100
bone bracoD parent=corpo pivot=102,100
bone caudaC parent=corpo pivot=82,118 spring=0.4
bone caudaL parent=corpo pivot=58,112 spring=0.4
bone espadaF parent=corpo pivot=104,108
bone espadaC parent=corpo pivot=104,108
bone espadaL parent=corpo pivot=94,108

# ---------- frente (virado para baixo) ----------
layer frente only=pose,idle_down,walk_down,attack_down
ellipse peE 68,126 9,6 c=pelod ink=line bone=peE
ellipse peD 92,126 9,6 c=pelod ink=line bone=peD
ellipse corpo 80,106 24,22 c=pelo ink=line bone=corpo
ellipse barriga 80,111 14,13 c=barriga bone=corpo
ellipse bracoE 57,106 7,9 c=pelod ink=line bone=bracoE
ellipse orelhaE 58,48 10 c=pelo ink=line bone=cabeca
ellipse orelhaD 102,48 10 c=pelo ink=line bone=cabeca
ellipse orelhaEi 58,49 5 c=rosa bone=cabeca
ellipse orelhaDi 102,49 5 c=rosa bone=cabeca
ellipse cabeca 80,72 30,26 c=pelo ink=line bone=cabeca
shape mascara c=mascara bone=cabeca : 54,70 64,62 80,67 96,62 106,70 96,77 80,73 64,77
ellipse focinho 80,84 13,9 c=barriga bone=cabeca
ellipse olhoE 68,69 4,5 c=olho bone=cabeca
ellipse olhoD 92,69 4,5 c=olho bone=cabeca
ellipse brilhoE 69,67 1.5 c=#ffffff bone=cabeca
ellipse brilhoD 93,67 1.5 c=#ffffff bone=cabeca
ellipse nariz 80,80 4,3 c=rosa ink=thin bone=cabeca
stroke boca w=thin c=ink bone=cabeca : 75,86 80,89 85,86
layer frente_arma only=pose,idle_down,walk_down,attack_down
use espada 104,108 rot=25 bone=espadaF
ellipse bracoD 103,106 7,9 c=pelod ink=line bone=bracoD

# ---------- costas (virado para cima) ----------
layer costas only=idle_up,walk_up,attack_up
ellipse peEc 68,126 9,6 c=pelod ink=line bone=peE
ellipse peDc 92,126 9,6 c=pelod ink=line bone=peD
ellipse corpoC 80,106 24,22 c=pelo ink=line bone=corpo
ellipse bracoEc 57,104 7,9 c=pelod ink=line bone=bracoE
ellipse bracoDc 103,104 7,9 c=pelod ink=line bone=bracoD
shape caudaC c=pelod ink=line bone=caudaC : 80,116 92,124 110,120 124,104 126,92 120,92 114,106 98,114 84,110
ellipse orelhaEc 58,48 10 c=pelod ink=line bone=cabeca
ellipse orelhaDc 102,48 10 c=pelod ink=line bone=cabeca
ellipse cabecaC 80,72 30,26 c=pelo ink=line bone=cabeca
shape nuca c=pelod bone=cabeca : 70,52 80,49 90,52 86,76 80,80 74,76
layer costas_arma only=idle_up,walk_up,attack_up
use espada 104,108 rot=25 bone=espadaC

# ---------- lado (virado para a direita; o esquerdo é espelhado) ----------
layer lado_tras only=idle_right,walk_right,attack_right
shape caudaL c=pelod ink=line bone=caudaL : 60,112 42,116 24,110 14,96 18,90 26,98 40,104 58,104
ellipse peDl 72,126 9,6 c=pelod ink=line bone=peD
layer lado only=idle_right,walk_right,attack_right
ellipse corpoL 78,106 26,20 c=pelo ink=line bone=corpo
ellipse barrigaL 88,112 12,9 c=barriga bone=corpo
ellipse peEl 90,126 10,6 c=pelod ink=line bone=peE
ellipse orelhaL 72,48 10 c=pelo ink=line bone=cabeca
ellipse orelhaLi 72,49 5 c=rosa bone=cabeca
ellipse focinhoL 106,78 14,10 c=barriga ink=line bone=cabeca
ellipse cabecaL 84,70 26,24 c=pelo ink=line bone=cabeca
shape mascaraL c=mascara bone=cabeca : 86,64 98,61 106,68 99,76 88,74
ellipse olhoL 97,67 4,5 c=olho bone=cabeca
ellipse brilhoL 98,65 1.5 c=#ffffff bone=cabeca
ellipse narizL 119,76 4,3 c=rosa ink=thin bone=cabeca
layer lado_arma only=idle_right,walk_right,attack_right
use espada 94,108 rot=-35 bone=espadaL
ellipse bracoL 94,106 7,9 c=pelod ink=line bone=bracoD

# ---------- caixas para o jogo ----------
box corpo_pes body rect 66,116 28,14
box dano hurt rect 54,42 52,90
box golpe_down hit rect 52,128 56,28 only=attack_down off
box golpe_up hit rect 52,8 56,30 only=attack_up off
box golpe_right hit rect 106,78 40,46 only=attack_right off

# ---------- animações ----------
anim idle_down frames=8 fps=8
key 0 corpo=0,0,0,1,1 cabeca=0,0
key 4 corpo=0,1.5,0,1.03,0.97 cabeca=0,1
key 8 corpo=0,0,0,1,1 cabeca=0,0

anim idle_up frames=8 fps=8
key 0 corpo=0,0,0,1,1
key 4 corpo=0,1.5,0,1.03,0.97
key 8 corpo=0,0,0,1,1

anim idle_right frames=8 fps=8
key 0 corpo=0,0,0,1,1 cabeca=0,0
key 4 corpo=0,1.5,0,1.03,0.97 cabeca=0,1
key 8 corpo=0,0,0,1,1 cabeca=0,0

anim walk_down frames=8 fps=12
key 0 corpo=0,0 peE=0,-5 peD=0,0 bracoE=0,2 bracoD=0,-2
key 2 corpo=0,-2 peE=0,0 peD=0,0 bracoE=0,0 bracoD=0,0
key 4 corpo=0,0 peE=0,0 peD=0,-5 bracoE=0,-2 bracoD=0,2
key 6 corpo=0,-2 peE=0,0 peD=0,0 bracoE=0,0 bracoD=0,0
key 8 corpo=0,0 peE=0,-5 peD=0,0 bracoE=0,2 bracoD=0,-2
event 0 passo
event 4 passo

anim walk_up frames=8 fps=12
key 0 corpo=0,0 peE=0,-5 peD=0,0 bracoE=0,-2 bracoD=0,2
key 2 corpo=0,-2 peE=0,0 peD=0,0 bracoE=0,0 bracoD=0,0
key 4 corpo=0,0 peE=0,0 peD=0,-5 bracoE=0,2 bracoD=0,-2
key 6 corpo=0,-2 peE=0,0 peD=0,0 bracoE=0,0 bracoD=0,0
key 8 corpo=0,0 peE=0,-5 peD=0,0 bracoE=0,-2 bracoD=0,2
event 0 passo
event 4 passo

anim walk_right frames=8 fps=12
key 0 corpo=0,0,4 peE=8,-3 peD=-8,0 bracoD=4,0,20
key 2 corpo=0,-2,4 peE=0,0 peD=0,-4 bracoD=0,0,0
key 4 corpo=0,0,4 peE=-8,0 peD=8,-3 bracoD=-4,0,-20
key 6 corpo=0,-2,4 peE=0,-4 peD=0,0 bracoD=0,0,0
key 8 corpo=0,0,4 peE=8,-3 peD=-8,0 bracoD=4,0,20
event 0 passo
event 4 passo

# ataque: prepara, golpeia (o hitbox liga nos quadros 2 e 3) e volta
anim attack_down frames=6 fps=12 once
key 0 espadaF=0,0,0 corpo=0,0
key 1 espadaF=0,-3,-45 corpo=0,-1 ease=out
key 2 espadaF=0,6,125 corpo=0,2 ease=out
key 4 espadaF=0,6,135 corpo=0,1
key 6 espadaF=0,0,0 corpo=0,0
key 2 golpe_down.show=1
key 4 golpe_down.show=0
event 2 golpe

anim attack_up frames=6 fps=12 once
key 0 espadaC=0,0,0 corpo=0,0
key 1 espadaC=0,4,25 corpo=0,1 ease=out
key 2 espadaC=-6,-16,-60 corpo=0,-2 ease=out
key 4 espadaC=-6,-16,-66 corpo=0,-1
key 6 espadaC=0,0,0 corpo=0,0
key 2 golpe_up.show=1
key 4 golpe_up.show=0
event 2 golpe

anim attack_right frames=6 fps=12 once
key 0 espadaL=0,0,0 corpo=0,0,4
key 1 espadaL=-3,0,-20 corpo=-2,0,0 ease=out
key 2 espadaL=6,0,145 corpo=3,0,8 ease=out
key 4 espadaL=6,0,152 corpo=2,0,6
key 6 espadaL=0,0,0 corpo=0,0,4
key 2 golpe_right.show=1
key 4 golpe_right.show=0
event 2 golpe
`;

  const topdown3 = `# Furão em três vistas — personagem de jogo top-down, para o Godot
# O furão é desenhado de frente (view=down), de costas (view=up) e de lado (view=right), cada vista na
# sua camada. Cada animação é escrita uma vez só, sem direção no nome: o Weasel gera uma por vista
# (idle_down, idle_right, idle_up…). Na cena do Godot, o lado esquerdo sai espelhado do direito, e o
# ajudante tocar("walk", velocity) escolhe a vista pela direção.
# Os ossos são desenhados na frente; a profundidade de cada um vem da vista de lado (a cabeça fica
# 4 px para a frente, o pé esquerdo 10). osso.z= anda para a frente (positivo) ou para trás, e de
# frente o que vai para a frente desce um pouco na tela (views tilt=30). osso.pitch= gira o osso para a
# frente ou para trás, e osso.yaw= de um lado para o outro: em cada vista a peça gira, encurta e inclina.
# Veja as vistas, as profundidades e o pé no chão com:  weasel furao3d.weasel --info
# Exporte com:  weasel furao3d.weasel -o godot/furao3d.tscn

canvas 160 160 bg=#eef0e6 light=-0.6,-0.8
palette ink=#2a1d16 line=4 thin=2
palette pelo=#c98f5a pelod=#a8703f barriga=#f6e7cf mascara=#5b3a28 rosa=#e9a0a8
palette olho=#1a1414 metal=#d9dee6 cabo=#7a5232

# a raiz fica entre os pés: é a origem do nó no Godot e o meio das vistas
godot body=character root=80,128

# a câmera do jogo: 30 graus (o pé que vai 8 px para a frente desce 4 px na tela de frente)
views tilt=30

# Construção: o chão e o centro (só aparecem no editor)
layer guia guide
line chao c=#b9bba8 w=1 : 20,128 140,128
line meio c=#b9bba8 w=1 dash=4,4 : 80,20 80,140

# ---------- ossos (um esqueleto só para as três vistas) ----------
bone corpo pivot=80,128
bone cabeca parent=corpo pivot=80,92
bone peE pivot=68,126
bone peD pivot=92,126
# o braço esquerdo não aparece de lado: a profundidade vem do direito (o par espelhado)
bone bracoE parent=corpo pivot=58,100
bone bracoD parent=corpo pivot=102,100
# side= diz o x do osso na vista de lado, quando o centro das peças dele engana; tip= diz para onde ele aponta
# (o x,y na frente e quantos px para a frente ou para trás): a cauda vai para trás, a espada para cima
bone cauda parent=corpo pivot=80,118 side=58 tip=80,118,-30
bone espada parent=bracoD pivot=104,108 side=94 tip=119,75,-21

# ---------- frente (virado para baixo) ----------
layer frente view=down
ellipse peE 68,126 9,6 c=pelod ink=line bone=peE
ellipse peD 92,126 9,6 c=pelod ink=line bone=peD
ellipse corpo 80,106 24,22 c=pelo ink=line bone=corpo
ellipse barriga 80,111 14,13 c=barriga bone=corpo
ellipse bracoE 57,106 7,9 c=pelod ink=line bone=bracoE
ellipse orelhaE 58,48 10 c=pelo ink=line bone=cabeca
ellipse orelhaD 102,48 10 c=pelo ink=line bone=cabeca
ellipse orelhaEi 58,49 5 c=rosa bone=cabeca
ellipse orelhaDi 102,49 5 c=rosa bone=cabeca
ellipse cabeca 80,72 30,26 c=pelo ink=line bone=cabeca
shape mascara c=mascara bone=cabeca : 54,70 64,62 80,67 96,62 106,70 96,77 80,73 64,77
ellipse focinho 80,84 13,9 c=barriga bone=cabeca
ellipse olhoE 68,69 4,5 c=olho bone=cabeca
ellipse olhoD 92,69 4,5 c=olho bone=cabeca
ellipse brilhoE 69,67 1.5 c=#ffffff bone=cabeca
ellipse brilhoD 93,67 1.5 c=#ffffff bone=cabeca
ellipse nariz 80,80 4,3 c=rosa ink=thin bone=cabeca
stroke boca w=thin c=ink bone=cabeca : 75,86 80,89 85,86
shape laminaF c=metal ink=thin bone=espada : 116.5,74.1! 121.9,76.6! 108.4,105.6! 103.0,103.1!
shape guardaF c=cabo ink=thin bone=espada : 99.3,99.2! 113.8,105.9! 112.1,109.6! 97.6,102.8!
shape punhoF c=cabo ink=thin bone=espada : 103.0,105.3! 106.7,107.0! 102.9,115.2! 99.2,113.5!
ellipse bracoD 103,106 7,9 c=pelod ink=line bone=bracoD

# ---------- costas (virado para cima) ----------
# de costas, a esquerda e a direita trocam de lado: o pé esquerdo (peE) fica em x=92
layer costas view=up
ellipse peEc 92,126 9,6 c=pelod ink=line bone=peE
ellipse peDc 68,126 9,6 c=pelod ink=line bone=peD
ellipse corpoC 80,106 24,22 c=pelo ink=line bone=corpo
ellipse bracoEc 103,104 7,9 c=pelod ink=line bone=bracoE
ellipse bracoDc 57,104 7,9 c=pelod ink=line bone=bracoD
shape caudaC c=pelod ink=line bone=cauda : 80,116 92,124 110,120 124,104 126,92 120,92 114,106 98,114 84,110
ellipse orelhaEc 58,48 10 c=pelod ink=line bone=cabeca
ellipse orelhaDc 102,48 10 c=pelod ink=line bone=cabeca
ellipse cabecaC 80,72 30,26 c=pelo ink=line bone=cabeca
shape nuca c=pelod bone=cabeca : 70,52 80,49 90,52 86,76 80,80 74,76
shape laminaC c=metal ink=thin bone=espada : 38.1,76.6! 43.5,74.1! 57.0,103.1! 51.6,105.6!
shape guardaC c=cabo ink=thin bone=espada : 46.2,105.9! 60.7,99.2! 62.4,102.8! 47.9,109.6!
shape punhoC c=cabo ink=thin bone=espada : 53.3,107.0! 57.0,105.3! 60.8,113.5! 57.1,115.2!

# ---------- lado (virado para a direita; o esquerdo é espelhado) ----------
# o x de cada peça aqui é a profundidade do osso: a cabeça em x=84 está 4 px na frente da raiz
layer lado view=right
shape caudaL c=pelod ink=line bone=cauda : 60,112 42,116 24,110 14,96 18,90 26,98 40,104 58,104
ellipse peDl 72,126 9,6 c=pelod ink=line bone=peD
ellipse corpoL 78,106 26,20 c=pelo ink=line bone=corpo
ellipse barrigaL 88,112 12,9 c=barriga bone=corpo
ellipse peEl 90,126 10,6 c=pelod ink=line bone=peE
ellipse orelhaL 72,48 10 c=pelo ink=line bone=cabeca
ellipse orelhaLi 72,49 5 c=rosa bone=cabeca
ellipse focinhoL 106,78 14,10 c=barriga ink=line bone=cabeca
ellipse cabecaL 84,70 26,24 c=pelo ink=line bone=cabeca
shape mascaraL c=mascara bone=cabeca : 86,64 98,61 106,68 99,76 88,74
ellipse olhoL 97,67 4,5 c=olho bone=cabeca
ellipse brilhoL 98,65 1.5 c=#ffffff bone=cabeca
ellipse narizL 119,76 4,3 c=rosa ink=thin bone=cabeca
shape laminaL c=metal ink=thin bone=espada : 70.9,80.2! 75.8,76.8! 94.2,103.0! 89.2,106.4!
shape guardaL c=cabo ink=thin bone=espada : 84.0,107.7! 97.1,98.5! 99.4,101.8! 86.3,111.0!
shape punhoL c=cabo ink=thin bone=espada : 91.2,107.5! 94.5,105.2! 99.7,112.6! 96.4,114.9!
ellipse bracoL 94,106 7,9 c=pelod ink=line bone=bracoD

# ---------- o jogo: colisão, dano e um ponto em cima da cabeça ----------
box corpo_pes body rect 66,116 28,14
box dano hurt rect 54,42 52,90
# o ponto segue a cabeça em cada vista (ali aparece o "!" de susto)
point susto 80,36 bone=cabeca

# ---------- animações: cada uma escrita uma vez ----------
# respira: o corpo desce e achata um pouco (a cabeça e os braços vão junto)
anim idle frames=8 fps=8
key 0 corpo=0,0,0,1,1 cabeca=0,0
key 4 corpo=0,1.5,0,1.03,0.97 cabeca=0,1
key 8 corpo=0,0,0,1,1 cabeca=0,0

# anda: o pé que vai para a frente (z positivo) sobe, e os braços vão ao contrário dos pés.
# De frente, o pé da frente desce na tela; de lado, ele vai para a direita; de costas, sobe.
anim walk frames=8 fps=12
key 0 corpo=0,0 peE=0,-3 peE.z=8 peD=0,0 peD.z=-8 bracoD.z=5 bracoE.z=-5
key 2 corpo=0,-2 peE=0,0 peE.z=0 peD=0,-4 peD.z=0 bracoD.z=0 bracoE.z=0
key 4 corpo=0,0 peE=0,0 peE.z=-8 peD=0,-3 peD.z=8 bracoD.z=-5 bracoE.z=5
key 6 corpo=0,-2 peE=0,-4 peE.z=0 peD=0,0 peD.z=0 bracoD.z=0 bracoE.z=0
key 8 corpo=0,0 peE=0,-3 peE.z=8 peD=0,0 peD.z=-8 bracoD.z=5 bracoE.z=-5
event 0 passo
event 4 passo

# ataca: a espada vai um pouco para trás e desce para a frente (pitch negativo vem para a frente). De lado
# ela faz o arco inteiro; de frente e de costas ela encurta e vira, como em 3D.
anim attack frames=6 fps=12 once
key 0 espada.pitch=0 corpo=0,0
key 1 espada.pitch=35 corpo=0,-1 ease=out
key 2 espada.pitch=-140 corpo=0,2 ease=out
key 4 espada.pitch=-145 corpo=0,1
key 6 espada.pitch=0 corpo=0,0
event 2 golpe
`;

  const hero3 = `# Herói em três vistas — com as diagonais e os dois lados desenhados, para o Godot
# O herói é desenhado de frente (view=down), de 3/4 para os dois lados (view=down_right e
# view=down_left), de lado (view=right e view=left) e de costas (view=up). O ângulo de cada diagonal
# é medido no desenho, pelo lugar das peças. Com os dois lados desenhados, nada sai espelhado: a
# espada fica sempre na mão direita, e o escudo na esquerda.
# Cada animação é escrita uma vez, sem direção no nome, e o Weasel gera uma por vista (walk_down,
# walk_down_right, walk_right…). osso.pitch= balança as pernas e os braços para a frente e para trás.
# Veja os ângulos medidos e as profundidades com:  weasel heroi3d.weasel --info
# Exporte com:  weasel heroi3d.weasel -o godot/heroi3d.tscn

canvas 160 160 bg=#eef0e6
palette ink=#2a1d16 line=3 thin=1.5
palette pele=#f2c9a0 tunica=#2f7f8f tunicad=#24626e cabelo=#6b4a2e cabelod=#553a22 couro=#8a5a32 faixa=#c8433a
palette bota=#5b3a22 calca=#efe6d0 calcad=#cfc4aa metal=#d9dee6 cabo=#7a5232 ouro=#e0b84a madeira=#a8763f madeirad=#86592c olho=#1a1414

godot body=character root=80,146
views tilt=30

layer guia guide
line chao c=#b9bba8 w=1 : 20,146 140,146

# ---------- ossos (na frente: x de quem olha, y para baixo) ----------
bone corpo pivot=80,116
bone cabeca parent=corpo pivot=80,86
bone pernaD pivot=73,116 tip=73,146
bone pernaE pivot=87,116 tip=87,146
bone bracoD parent=corpo pivot=66,92
bone bracoE parent=corpo pivot=94,92
bone espada parent=bracoD pivot=64,112 tip=57,140,8 side=80
bone escudo parent=bracoE pivot=96,111 tip=96,124 side=80

# ---------- de frente ----------
layer frente view=down
rect calcaD 68,114 10,24 c=calca ink=thin bone=pernaD
rect botaD 66,134 13,12 r=3 c=bota ink=thin bone=pernaD
rect calcaE 82,114 10,24 c=calca ink=thin bone=pernaE
rect botaE 81,134 13,12 r=3 c=bota ink=thin bone=pernaE
shape tunica c=tunica ink=line bone=corpo : 68,88! 92,88! 97,106 102,124! 58,124! 63,106
rect cinto 63,105 34,5 c=couro bone=corpo
rect fivela 77,104 6,7 r=1 c=ouro bone=corpo
shape lamina c=metal ink=thin bone=espada : 62,116! 66,117! 58,141! 55,139!
rect guarda 58,112 12,3 r=1 c=cabo ink=thin bone=espada
ellipse mangaD 64,101 6,10 c=tunicad ink=line bone=bracoD
ellipse maoD 64,112 4.5 c=pele ink=thin bone=bracoD
ellipse mangaE 96,101 6,10 c=tunicad ink=line bone=bracoE
ellipse maoE 96,111 4.5 c=pele ink=thin bone=bracoE
ellipse escudo 102,113 10,12 c=madeira ink=line bone=escudo
ellipse bossa 102,113 3.5 c=metal ink=thin bone=escudo
shape pontas c=faixa ink=thin bone=cabeca : 96,52 113,60 111,66 97,58
ellipse orelhaD 60,67 4,6 c=pele ink=thin bone=cabeca
ellipse orelhaE 100,67 4,6 c=pele ink=thin bone=cabeca
ellipse rosto 80,65 20,20 c=pele ink=line bone=cabeca
shape cabelo c=cabelo ink=line bone=cabeca : 60,63 61,50 70,43 80,41 90,43 99,50 100,63 94,55 86,58 80,53 74,58 66,55
stroke faixa w=5 c=faixa bone=cabeca : 61,56 80,51 99,56
ellipse olhoD 72,68 2.8,4 c=olho bone=cabeca
ellipse olhoE 88,68 2.8,4 c=olho bone=cabeca
stroke boca w=thin c=ink bone=cabeca : 77,77 80,79 83,77

# ---------- de lado (virado para a direita: o braço da espada fica perto) ----------
layer lado view=right
ellipse mangaEl 80,101 6,10 c=tunicad ink=line bone=bracoE
ellipse escudoL 93,113 3.5,12 c=madeira ink=line bone=escudo
rect calcaEl 75,114 10,24 c=calcad ink=thin bone=pernaE
rect botaEl 74,134 15,12 r=3 c=bota ink=thin bone=pernaE
rect calcaDl 75,114 10,24 c=calca ink=thin bone=pernaD
rect botaDl 74,134 15,12 r=3 c=bota ink=thin bone=pernaD
shape tunicaL c=tunica ink=line bone=corpo : 72,88! 88,88! 91,106 96,124! 64,124! 68,106
rect cintoL 67,105 26,5 c=couro bone=corpo
shape pontasL c=faixa ink=thin bone=cabeca : 64,52 46,60 48,66 64,58
ellipse rostoL 82,65 20,20 c=pele ink=line bone=cabeca
ellipse narizL 101,69 3 c=pele ink=thin bone=cabeca
shape cabeloL c=cabelo ink=line bone=cabeca : 62,66 63,50 72,43 84,42 96,47 100,55 90,52 80,53 74,58 70,72
stroke faixaL w=5 c=faixa bone=cabeca : 63,55 82,50 99,55
ellipse orelhaL 75,66 4,6 c=pele ink=thin bone=cabeca
ellipse olhoL 93,67 2.5,4 c=olho bone=cabeca
shape laminaL c=metal ink=thin bone=espada : 79,116! 82,115! 89,139! 86,141!
rect guardaL 75,112 11,3 r=1 c=cabo ink=thin bone=espada
ellipse mangaDl 80,101 6,10 c=tunicad ink=line bone=bracoD
ellipse maoDl 81,112 4.5 c=pele ink=thin bone=bracoD

# ---------- de costas (o braço da espada fica à direita de quem olha) ----------
layer costas view=up
ellipse escudoC 57,113 6,12 c=madeirad ink=line bone=escudo
ellipse mangaEc 64,101 6,10 c=tunicad ink=line bone=bracoE
ellipse maoEc 64,111 4.5 c=pele ink=thin bone=bracoE
rect calcaEc 68,114 10,24 c=calca ink=thin bone=pernaE
rect botaEc 66,134 13,12 r=3 c=bota ink=thin bone=pernaE
rect calcaDc 82,114 10,24 c=calca ink=thin bone=pernaD
rect botaDc 81,134 13,12 r=3 c=bota ink=thin bone=pernaD
shape tunicaC c=tunica ink=line bone=corpo : 68,88! 92,88! 97,106 102,124! 58,124! 63,106
rect cintoC 63,105 34,5 c=couro bone=corpo
shape laminaC c=metal ink=thin bone=espada : 94,117! 98,116! 105,139! 102,141!
rect guardaC 90,112 12,3 r=1 c=cabo ink=thin bone=espada
ellipse mangaDc 96,101 6,10 c=tunicad ink=line bone=bracoD
ellipse maoDc 96,112 4.5 c=pele ink=thin bone=bracoD
ellipse orelhaDc 100,67 4,6 c=pele ink=thin bone=cabeca
ellipse orelhaEc 60,67 4,6 c=pele ink=thin bone=cabeca
ellipse nuca 80,65 20,20 c=cabelo ink=line bone=cabeca
shape cabeloC c=cabelod bone=cabeca : 68,72 73,64 80,68 87,64 92,72 80,82
stroke faixaC w=5 c=faixa bone=cabeca : 61,56 80,59 99,56
shape pontasC c=faixa ink=thin bone=cabeca : 77,57 83,57 87,78 80,82 73,78
ellipse no 80,58 4,3 c=faixa ink=thin bone=cabeca

# ---------- do outro lado (virado para a esquerda: o escudo fica perto) ----------
layer esquerda view=left
shape laminaLe c=metal ink=thin bone=espada : 81,116! 78,115! 71,139! 74,141!
ellipse mangaDle 80,101 6,10 c=tunicad ink=line bone=bracoD
rect calcaDle 75,114 10,24 c=calcad ink=thin bone=pernaD
rect botaDle 71,134 15,12 r=3 c=bota ink=thin bone=pernaD
rect calcaEle 75,114 10,24 c=calca ink=thin bone=pernaE
rect botaEle 71,134 15,12 r=3 c=bota ink=thin bone=pernaE
shape tunicaLe c=tunica ink=line bone=corpo : 72,88! 88,88! 92,106 96,124! 64,124! 69,106
rect cintoLe 67,105 26,5 c=couro bone=corpo
shape pontasLe c=faixa ink=thin bone=cabeca : 96,52 114,60 112,66 96,58
ellipse rostoLe 78,65 20,20 c=pele ink=line bone=cabeca
ellipse narizLe 59,69 3 c=pele ink=thin bone=cabeca
shape cabeloLe c=cabelo ink=line bone=cabeca : 98,66 97,50 88,43 76,42 64,47 60,55 70,52 80,53 86,58 90,72
stroke faixaLe w=5 c=faixa bone=cabeca : 97,55 78,50 61,55
ellipse orelhaLe 85,66 4,6 c=pele ink=thin bone=cabeca
ellipse olhoLe 67,67 2.5,4 c=olho bone=cabeca
ellipse mangaEle 80,101 6,10 c=tunicad ink=line bone=bracoE
ellipse maoEle 80,111 4.5 c=pele ink=thin bone=bracoE
ellipse escudoLe 69,113 6,12 c=madeira ink=line bone=escudo
ellipse bossaLe 68,113 2.2,3.5 c=metal ink=thin bone=escudo

# ---------- de 3/4 (de frente, virado 35° para a direita) ----------
layer diagonal view=down_right
ellipse mangaEd 93,101 5,10 c=tunicad ink=line bone=bracoE
ellipse maoEd 94,111 4.5 c=pele ink=thin bone=bracoE
rect calcaEd 81,114 10,24 c=calcad ink=thin bone=pernaE
rect botaEd 80,134 14,12 r=3 c=bota ink=thin bone=pernaE
rect calcaDd 69,114 10,24 c=calca ink=thin bone=pernaD
rect botaDd 68,134 14,12 r=3 c=bota ink=thin bone=pernaD
shape tunicaD c=tunica ink=line bone=corpo : 69,88! 91,88! 96,106 101,124! 60,124! 64,106
rect cintoD 64,105 32,5 c=couro bone=corpo
rect fivelaD 81,104 6,7 r=1 c=ouro bone=corpo
ellipse escudoD 104,113 7,12 c=madeira ink=line bone=escudo
ellipse bossaD 105,113 3,3.5 c=metal ink=thin bone=escudo
shape pontasD c=faixa ink=thin bone=cabeca : 70,52 56,60 58,66 72,58
ellipse rostoD 81,65 20,20 c=pele ink=line bone=cabeca
ellipse orelhaDd 65,67 3.5,6 c=pele ink=thin bone=cabeca
shape cabeloD c=cabelo ink=line bone=cabeca : 61,66 62,50 72,43 83,41 93,44 100,51 101,62 96,55 88,58 82,53 76,58 68,56 66,70
stroke faixaD w=5 c=faixa bone=cabeca : 62,56 84,51 101,57
ellipse olhoDd 80,68 2.5,4 c=olho bone=cabeca
ellipse olhoEd 94,68 2.5,4 c=olho bone=cabeca
stroke bocaD w=thin c=ink bone=cabeca : 85,77 88,79 91,77
shape laminaD c=metal ink=thin bone=espada : 65,116! 69,116! 67,141! 63,141!
rect guardaD 61,112 11,3 r=1 c=cabo ink=thin bone=espada
ellipse mangaDd 67,101 6,10 c=tunicad ink=line bone=bracoD
ellipse maoDd 67,112 4.5 c=pele ink=thin bone=bracoD

# ---------- de 3/4 para o outro lado (o escudo vem para perto, a espada vai para longe) ----------
layer diagonalE view=down_left
ellipse mangaDde 67,101 5,10 c=tunicad ink=line bone=bracoD
ellipse maoDde 66,111 4.5 c=pele ink=thin bone=bracoD
shape laminaDe c=metal ink=thin bone=espada : 63,116! 67,116! 62,140! 58,139!
rect guardaDe 60,112 11,3 r=1 c=cabo ink=thin bone=espada
rect calcaDde 69,114 10,24 c=calcad ink=thin bone=pernaD
rect botaDde 66,134 14,12 r=3 c=bota ink=thin bone=pernaD
rect calcaEde 81,114 10,24 c=calca ink=thin bone=pernaE
rect botaEde 78,134 14,12 r=3 c=bota ink=thin bone=pernaE
shape tunicaDe c=tunica ink=line bone=corpo : 91,88! 69,88! 64,106 59,124! 100,124! 96,106
rect cintoDe 64,105 32,5 c=couro bone=corpo
rect fivelaDe 73,104 6,7 r=1 c=ouro bone=corpo
shape pontasDe c=faixa ink=thin bone=cabeca : 90,52 104,60 102,66 88,58
ellipse rostoDe 79,65 20,20 c=pele ink=line bone=cabeca
ellipse orelhaEde 95,67 3.5,6 c=pele ink=thin bone=cabeca
shape cabeloDe c=cabelo ink=line bone=cabeca : 99,66 98,50 88,43 77,41 67,44 60,51 59,62 64,55 72,58 78,53 84,58 92,56 94,70
stroke faixaDe w=5 c=faixa bone=cabeca : 98,56 76,51 59,57
ellipse olhoEde 80,68 2.5,4 c=olho bone=cabeca
ellipse olhoDde 66,68 2.5,4 c=olho bone=cabeca
stroke bocaDe w=thin c=ink bone=cabeca : 75,77 72,79 69,77
ellipse mangaEde 93,101 6,10 c=tunicad ink=line bone=bracoE
ellipse maoEde 93,112 4.5 c=pele ink=thin bone=bracoE
ellipse escudoDe 91,113 8,12 c=madeira ink=line bone=escudo
ellipse bossaDe 90,113 3,3.5 c=metal ink=thin bone=escudo

# ---------- animações: cada uma escrita uma vez ----------
anim idle frames=8 fps=8
key 0 corpo=0,0,0,1,1
key 4 corpo=0,1.5,0,1.03,0.97 bracoD.pitch=4 bracoE.pitch=-4
key 8 corpo=0,0,0,1,1 bracoD.pitch=0 bracoE.pitch=0

# andar: as pernas e os braços balançam para a frente e para trás (pitch)
anim walk frames=8 fps=12
key 0 corpo=0,2 pernaD=0,3.5 pernaE=0,3.5 pernaD.pitch=28 pernaE.pitch=-28 bracoD.pitch=-24 bracoE.pitch=24
key 2 corpo=0,-1 pernaD=0,0 pernaE=0,-4 pernaD.pitch=0 pernaE.pitch=0 bracoD.pitch=0 bracoE.pitch=0
key 4 corpo=0,2 pernaD=0,3.5 pernaE=0,3.5 pernaD.pitch=-28 pernaE.pitch=28 bracoD.pitch=24 bracoE.pitch=-24
key 6 corpo=0,-1 pernaD=0,-4 pernaE=0,0 pernaD.pitch=0 pernaE.pitch=0 bracoD.pitch=0 bracoE.pitch=0
key 8 corpo=0,2 pernaD=0,3.5 pernaE=0,3.5 pernaD.pitch=28 pernaE.pitch=-28 bracoD.pitch=-24 bracoE.pitch=24
event 0 passo
event 4 passo

# ataque: a espada vem da direita do herói, passa pela frente e vai para a esquerda
anim attack frames=6 fps=12 once
key 0 corpo.yaw=0 bracoD.pitch=0 bracoD.yaw=0
key 1 corpo.yaw=-15 bracoD.pitch=75 bracoD.yaw=-75 ease=out
key 2 corpo.yaw=5 bracoD.pitch=85 bracoD.yaw=0 ease=out
key 3 corpo.yaw=20 bracoD.pitch=80 bracoD.yaw=70
key 4 corpo.yaw=20 bracoD.pitch=78 bracoD.yaw=75
key 6 corpo.yaw=0 bracoD.pitch=0 bracoD.yaw=0
event 2 golpe
`;

  const guard3 = `# Guarda em três vistas — lança, capa e cabeça que vira, para o Godot
# Desenhado de frente (view=down), de lado (view=right) e de costas (view=up); o lado esquerdo sai
# espelhado no Godot. Mostra os giros em 3D:
# - lanca.pitch= deita a lança para a frente na estocada (de frente, ela vem para quem olha e encurta);
# - capa.pitch= leva a capa para trás quando ele anda (de costas, ela fica por cima do corpo);
# - cabeca.yaw= vira a cabeça, e o turns no bone cabeca troca o desenho: virada 80°, a cabeça de
#   frente mostra o perfil.
# tip=x,y no bone diz para onde o osso aponta; side=x, o x dele na vista de lado.
# Veja as profundidades e as trocas de ordem com:  weasel guarda3d.weasel --info

canvas 160 240 bg=#eef0e6
palette ink=#2a1d16 line=2.5 thin=1.2
palette pele=#e8b48c metal=#b9c1cc metald=#8d96a3 capa=#7d1f2a capad=#5e1620 tunica=#c9a23a tunicad=#a8852a
palette calca=#4a4038 bota=#2b2420 haste=#8a5a32 crina=#c8433a olho=#1a1414 bigode=#5a3a22

godot body=character root=80,205
views tilt=30

layer guia guide
line chao c=#b9bba8 w=1 : 20,205 140,205

# ---------- ossos ----------
bone corpo pivot=80,128
bone cabeca parent=corpo pivot=80,72 turns
bone capa parent=corpo pivot=80,80 tip=80,172 side=72
bone pernaD pivot=73,128 tip=73,205
bone pernaE pivot=87,128 tip=87,205
bone bracoD parent=corpo pivot=63,84
bone lanca parent=bracoD pivot=61,119 tip=61,8 side=80
bone bracoE parent=corpo pivot=97,84

# ---------- de frente ----------
layer frente view=down
shape capaF c=capad ink=line bone=capa : 64,80 96,80 108,172! 52,172!
rect pernaDf 67,128 12,62 c=calca ink=thin bone=pernaD
rect botaDf 65,186 15,19 r=3 c=bota ink=thin bone=pernaD
rect pernaEf 81,128 12,62 c=calca ink=thin bone=pernaE
rect botaEf 80,186 15,19 r=3 c=bota ink=thin bone=pernaE
shape tunicaF c=tunica ink=line bone=corpo : 65,84! 95,84! 102,142! 58,142!
shape peitoF c=metal ink=line bone=corpo : 66,84 94,84 93,110 80,116 67,110
rect cintoF 61,112 38,6 c=haste bone=corpo
ellipse bracoEf 99,101 6,18 c=tunicad ink=line bone=bracoE
ellipse maoEf 99,120 5 c=pele ink=thin bone=bracoE
ellipse bracoDf 61,101 6,18 c=tunicad ink=line bone=bracoD
rect hasteF 59.5,8 3,192 c=haste ink=thin bone=lanca
shape pontaF c=metal ink=thin bone=lanca : 61,-6! 65,8! 61,12! 57,8!
ellipse maoDf 61,120 5 c=pele ink=thin bone=bracoD
ellipse rostoF 80,54 15,17 c=pele ink=line bone=cabeca
shape elmoF c=metal ink=line bone=cabeca : 64,54! 65,41 72,34 80,32 88,34 95,41 96,54! 90,46 80,44 70,46
rect protecaoF 78,44 4,14 c=metald ink=thin bone=cabeca
shape crinaF c=crina ink=thin bone=cabeca : 77,34 79,16 81,16 83,34
ellipse olhoDf 74,55 1.8,2.2 c=olho bone=cabeca
ellipse olhoEf 86,55 1.8,2.2 c=olho bone=cabeca
shape bigodeF c=bigode bone=cabeca : 72,62 80,60 88,62 86,65 80,63 74,65

# ---------- de lado (virado para a direita: a lança fica perto) ----------
layer lado view=right
shape capaL c=capad ink=line bone=capa : 66,80 76,82 74,172! 50,174! 58,120
ellipse bracoEl 81,101 6,18 c=tunicad ink=line bone=bracoE
ellipse maoEl 82,120 5 c=pele ink=thin bone=bracoE
rect pernaEl 74,128 12,62 c=calca ink=thin bone=pernaE
rect botaEl 73,186 18,19 r=3 c=bota ink=thin bone=pernaE
rect pernaDl 74,128 12,62 c=calca ink=thin bone=pernaD
rect botaDl 73,186 18,19 r=3 c=bota ink=thin bone=pernaD
shape tunicaL c=tunica ink=line bone=corpo : 69,84! 91,84! 96,142! 64,142!
shape peitoL c=metal ink=line bone=corpo : 70,84 90,84 94,104 88,114 72,114
rect cintoL 66,112 28,6 c=haste bone=corpo
ellipse rostoL 81,54 15,17 c=pele ink=line bone=cabeca
shape narizL c=pele ink=thin bone=cabeca : 94,50! 98,57! 93,58!
shape elmoL c=metal ink=line bone=cabeca : 64,58! 64,42 72,34 84,32 93,38 97,47! 86,46 78,48 76,58
rect protecaoL 93,44 4,10 c=metald ink=thin bone=cabeca
shape crinaL c=crina ink=thin bone=cabeca : 66,40 70,28 80,22 92,24 90,30 80,30 72,36
ellipse olhoL 90,54 1.6,2.2 c=olho bone=cabeca
shape bigodeL c=bigode bone=cabeca : 88,61 95,60 95,63 89,64
ellipse bracoDl 80,101 6,18 c=tunicad ink=line bone=bracoD
rect hasteL 78.5,8 3,192 c=haste ink=thin bone=lanca
shape pontaL c=metal ink=thin bone=lanca : 80,-6! 84,8! 80,12! 76,8!
ellipse maoDl 80,120 5 c=pele ink=thin bone=bracoD

# ---------- de costas (a capa cobre as costas) ----------
layer costas view=up
rect pernaDc 81,128 12,62 c=calca ink=thin bone=pernaD
rect botaDc 80,186 15,19 r=3 c=bota ink=thin bone=pernaD
rect pernaEc 67,128 12,62 c=calca ink=thin bone=pernaE
rect botaEc 65,186 15,19 r=3 c=bota ink=thin bone=pernaE
shape tunicaC c=tunica ink=line bone=corpo : 65,84! 95,84! 102,142! 58,142!
shape capaC c=capa ink=line bone=capa : 66,80 94,80 106,174! 54,174!
stroke dobraC1 w=thin c=capad bone=capa : 74,90 70,170
stroke dobraC2 w=thin c=capad bone=capa : 86,90 90,170
ellipse bracoEc 61,101 6,18 c=tunicad ink=line bone=bracoE
ellipse maoEc 61,120 5 c=pele ink=thin bone=bracoE
ellipse bracoDc 99,101 6,18 c=tunicad ink=line bone=bracoD
rect hasteC 97.5,8 3,192 c=haste ink=thin bone=lanca
shape pontaC c=metal ink=thin bone=lanca : 99,-6! 103,8! 99,12! 95,8!
ellipse maoDc 99,120 5 c=pele ink=thin bone=bracoD
ellipse nucaC 80,54 15,17 c=pele ink=line bone=cabeca
shape elmoC c=metal ink=line bone=cabeca : 64,60! 65,41 72,34 80,32 88,34 95,41 96,60! 80,64
shape crinaC c=crina ink=thin bone=cabeca : 77,34 79,16 81,16 83,34 82,52 78,52

# ---------- animações: cada uma escrita uma vez ----------
anim idle frames=8 fps=8
key 0 corpo=0,0,0,1,1 capa.pitch=0
key 4 corpo=0,1.5,0,1.02,0.98 capa.pitch=-3
key 8 corpo=0,0,0,1,1 capa.pitch=0

# andar: a lança fica de pé (o braço quase não balança), a capa vai para trás. Nos quadros
# ímpares, a perna que está no chão desce 1,6 px: inclinada, ela fica mais curta na altura
anim walk frames=8 fps=10
key 0 corpo=0,2 pernaD.pitch=24 pernaE.pitch=-24 pernaD=0,6.5 pernaE=0,6.5 bracoE.pitch=20 bracoD.pitch=-4 capa.pitch=-14
key 1 pernaD=0,1.6
key 2 corpo=0,-1 pernaD.pitch=0 pernaE.pitch=0 pernaD=0,0 pernaE=0,-4 bracoE.pitch=0 bracoD.pitch=0 capa.pitch=-20
key 3 pernaD=0,1.6
key 4 corpo=0,2 pernaD.pitch=-24 pernaE.pitch=24 pernaD=0,6.5 pernaE=0,6.5 bracoE.pitch=-20 bracoD.pitch=4 capa.pitch=-14
key 5 pernaE=0,1.6
key 6 corpo=0,-1 pernaD.pitch=0 pernaE.pitch=0 pernaD=0,-4 pernaE=0,0 bracoE.pitch=0 bracoD.pitch=0 capa.pitch=-20
key 7 pernaE=0,1.6
key 8 corpo=0,2 pernaD.pitch=24 pernaE.pitch=-24 pernaD=0,6.5 pernaE=0,6.5 bracoE.pitch=20 bracoD.pitch=-4 capa.pitch=-14

# andar olhando para o lado: o mesmo andar, duas vezes, e a cabeça vira 80° para a esquerda dele e volta
anim look frames=16 fps=10
key 0 corpo=0,2 pernaD.pitch=24 pernaE.pitch=-24 pernaD=0,6.5 pernaE=0,6.5 bracoE.pitch=20 bracoD.pitch=-4 capa.pitch=-14 cabeca.yaw=0
key 1 pernaD=0,1.6
key 2 corpo=0,-1 pernaD.pitch=0 pernaE.pitch=0 pernaD=0,0 pernaE=0,-4 bracoE.pitch=0 bracoD.pitch=0 capa.pitch=-20
key 3 pernaD=0,1.6
key 4 corpo=0,2 pernaD.pitch=-24 pernaE.pitch=24 pernaD=0,6.5 pernaE=0,6.5 bracoE.pitch=-20 bracoD.pitch=4 capa.pitch=-14 cabeca.yaw=80
key 5 pernaE=0,1.6
key 6 corpo=0,-1 pernaD.pitch=0 pernaE.pitch=0 pernaD=0,-4 pernaE=0,0 bracoE.pitch=0 bracoD.pitch=0 capa.pitch=-20
key 7 pernaE=0,1.6
key 8 corpo=0,2 pernaD.pitch=24 pernaE.pitch=-24 pernaD=0,6.5 pernaE=0,6.5 bracoE.pitch=20 bracoD.pitch=-4 capa.pitch=-14
key 9 pernaD=0,1.6
key 10 corpo=0,-1 pernaD.pitch=0 pernaE.pitch=0 pernaD=0,0 pernaE=0,-4 bracoE.pitch=0 bracoD.pitch=0 capa.pitch=-20 cabeca.yaw=80
key 11 pernaD=0,1.6
key 12 corpo=0,2 pernaD.pitch=-24 pernaE.pitch=24 pernaD=0,6.5 pernaE=0,6.5 bracoE.pitch=-20 bracoD.pitch=4 capa.pitch=-14
key 13 pernaE=0,1.6
key 14 corpo=0,-1 pernaD.pitch=0 pernaE.pitch=0 pernaD=0,-4 pernaE=0,0 bracoE.pitch=0 bracoD.pitch=0 capa.pitch=-20
key 15 pernaE=0,1.6
key 16 corpo=0,2 pernaD.pitch=24 pernaE.pitch=-24 pernaD=0,6.5 pernaE=0,6.5 bracoE.pitch=20 bracoD.pitch=-4 capa.pitch=-14 cabeca.yaw=0

# estocada: a lança deita para a frente, recua e vai
anim attack frames=8 fps=12 once
key 0 corpo.z=0 bracoD.pitch=0 lanca.pitch=0 pernaD.pitch=0 pernaD=0,0 capa.pitch=0
key 1 corpo.z=-2 bracoD.pitch=20 lanca.pitch=-85 capa.pitch=-4 ease=out
key 2 corpo.z=-4 bracoD.pitch=5 lanca.pitch=-95 pernaD.pitch=-6 pernaD=0,0.4 capa.pitch=-2
key 3 corpo.z=8 bracoD.pitch=80 lanca.pitch=-170 pernaD.pitch=22 pernaD=0,3 capa.pitch=-22 ease=out
key 5 corpo.z=8 bracoD.pitch=78 lanca.pitch=-168 pernaD.pitch=22 pernaD=0,3 capa.pitch=-18
key 8 corpo.z=0 bracoD.pitch=0 lanca.pitch=0 pernaD.pitch=0 pernaD=0,0 capa.pitch=0
event 3 golpe
`;

  const man3 = `# Homem em três vistas — proporção realista, com joelho, cotovelo e pé, para o Godot
# Desenhado de frente (view=down), de lado (view=right) e de costas (view=up); o lado esquerdo sai
# espelhado no Godot. Cada perna tem três ossos (coxa, canela e pé) e cada braço três (braço,
# antebraço e mão): o pitch de cada um dobra o joelho, o tornozelo e o cotovelo, e o yaw do quadril e
# do tronco faz o corpo torcer a cada passo. tip=x,y,z no pé diz que ele aponta 16 px para a frente.
# As animações foram calculadas por um programa (um quadro por key, ease=linear): andar e correr.
# Veja as profundidades e as trocas de ordem com:  weasel homem3d.weasel --info

canvas 160 285 bg=#eef0e6
palette ink=#2a1d16 line=2.5 thin=1.2
palette pele=#e8b48c peled=#cf9a72 camisa=#e9e4d8 camisad=#c9c2b2 calca=#34466b calcad=#26344f sapato=#2b2420 cabelo=#3b2a1e olho=#1a1414

godot body=character root=80,250
views tilt=30

layer guia guide
line chao c=#b9bba8 w=1 : 20,250 140,250

# ---------- ossos ----------
bone quadril pivot=80,135 tip=80,146
bone tronco parent=quadril pivot=80,135
bone cabeca parent=tronco pivot=80,64
bone coxaD parent=quadril pivot=69,135
bone canelaD parent=coxaD pivot=69,193
bone peD parent=canelaD pivot=69,244 tip=69,250,16 side=80
bone coxaE parent=quadril pivot=91,135
bone canelaE parent=coxaE pivot=91,193
bone peE parent=canelaE pivot=91,244 tip=91,250,16 side=80
bone bracoD parent=tronco pivot=52,74
bone antebracoD parent=bracoD pivot=50,120
bone maoD parent=antebracoD pivot=49,152
bone bracoE parent=tronco pivot=108,74
bone antebracoE parent=bracoE pivot=110,120
bone maoE parent=antebracoE pivot=111,152

# ---------- de frente ----------
layer frente view=down
shape coxaDf c=calca ink=line bone=coxaD : 60,134 79,134 76,196 63,196
shape canelaDf c=calca ink=line bone=canelaD : 63,190 76,190 74,244 65,244
shape peDf c=sapato ink=thin bone=peD : 62,241! 76,241! 78,250! 60,250!
shape coxaEf c=calca ink=line bone=coxaE : 81,134 100,134 97,196 84,196
shape canelaEf c=calca ink=line bone=canelaE : 84,190 97,190 95,244 86,244
shape peEf c=sapato ink=thin bone=peE : 84,241! 98,241! 100,250! 82,250!
shape bacia c=calca ink=line bone=quadril : 62,126! 98,126! 101,146! 80,150 59,146!
shape camisaF c=camisa ink=line bone=tronco : 56,69! 104,69! 110,77 105,112 99,136! 61,136! 55,112 50,77
stroke golaF w=thin c=camisad bone=tronco : 72,70 80,78 88,70
rect pescocoF 74,57 12,14 c=peled ink=thin bone=cabeca
ellipse cabecaF 80,46 13,16 c=pele ink=line bone=cabeca
shape cabeloF c=cabelo bone=cabeca : 67,44 67,34 74,29 86,29 93,34 93,44 89,36 80,35 71,37
ellipse olhoDf 75,46 1.6,2 c=olho bone=cabeca
ellipse olhoEf 85,46 1.6,2 c=olho bone=cabeca
stroke narizF w=thin c=peled bone=cabeca : 80,47 79,53 81,54
stroke bocaF w=thin c=ink bone=cabeca : 76,57 80,58 84,57
shape bracoDf c=camisa ink=line bone=bracoD : 46,74 58,72 57,122 46,122
shape antebracoDf c=pele ink=line bone=antebracoD : 45,118 56,118 53,154 46,154
ellipse maoDf 49,159 5,8 c=pele ink=thin bone=maoD
shape bracoEf c=camisa ink=line bone=bracoE : 102,72 114,74 114,122 103,122
shape antebracoEf c=pele ink=line bone=antebracoE : 104,118 115,118 114,154 107,154
ellipse maoEf 111,159 5,8 c=pele ink=thin bone=maoE

# ---------- de lado (virado para a direita: o lado direito do homem fica perto) ----------
layer lado view=right
shape bracoEl c=camisad ink=line bone=bracoE : 75,72 86,72 85,122 76,122
shape antebracoEl c=peled ink=line bone=antebracoE : 76,118 85,118 84,154 77,154
ellipse maoEl 80,159 5,8 c=peled ink=thin bone=maoE
shape coxaEl c=calcad ink=line bone=coxaE : 71,134 90,134 86,196 74,196
shape canelaEl c=calcad ink=line bone=canelaE : 74,190 86,190 84,244 76,244
shape peEl c=sapato ink=thin bone=peE : 74,240! 84,240 97,245 98,250! 72,250!
shape coxaDl c=calca ink=line bone=coxaD : 71,134 90,134 86,196 74,196
shape canelaDl c=calca ink=line bone=canelaD : 74,190 86,190 84,244 76,244
shape peDl c=sapato ink=thin bone=peD : 74,240! 84,240 97,245 98,250! 72,250!
shape baciaL c=calca ink=line bone=quadril : 67,126! 92,126! 94,146! 66,146!
shape camisaL c=camisa ink=line bone=tronco : 70,69! 90,69! 95,88 93,112 91,136! 68,136! 66,112 67,88
rect pescocoL 75,57 10,14 c=peled ink=thin bone=cabeca
ellipse cabecaL 81,46 13,16 c=pele ink=line bone=cabeca
shape narizL c=pele ink=thin bone=cabeca : 93,41! 97,50! 92,51!
shape cabeloL c=cabelo bone=cabeca : 68,52 67,36 74,29 86,29 93,34 88,37 78,36 76,46 71,56
ellipse orelhaL 78,47 2.5,4 c=peled ink=thin bone=cabeca
ellipse olhoL 89,45 1.4,2 c=olho bone=cabeca
stroke bocaL w=thin c=ink bone=cabeca : 89,57 92,57
shape bracoDl c=camisa ink=line bone=bracoD : 75,72 86,72 85,122 76,122
shape antebracoDl c=pele ink=line bone=antebracoD : 76,118 85,118 84,154 77,154
ellipse maoDl 80,159 5,8 c=pele ink=thin bone=maoD

# ---------- de costas ----------
layer costas view=up
shape coxaDc c=calca ink=line bone=coxaD : 81,134 100,134 97,196 84,196
shape canelaDc c=calca ink=line bone=canelaD : 84,190 97,190 95,244 86,244
shape peDc c=sapato ink=thin bone=peD : 84,240! 98,240! 98,250! 84,250!
shape coxaEc c=calca ink=line bone=coxaE : 60,134 79,134 76,196 63,196
shape canelaEc c=calca ink=line bone=canelaE : 63,190 76,190 74,244 65,244
shape peEc c=sapato ink=thin bone=peE : 62,240! 76,240! 76,250! 62,250!
shape baciaC c=calca ink=line bone=quadril : 62,126! 98,126! 101,146! 80,150 59,146!
shape camisaC c=camisa ink=line bone=tronco : 56,69! 104,69! 110,77 105,112 99,136! 61,136! 55,112 50,77
stroke costuraC w=thin c=camisad bone=tronco : 80,72 80,132
rect pescocoC 74,57 12,14 c=peled ink=thin bone=cabeca
ellipse cabecaC 80,46 13,16 c=cabelo ink=line bone=cabeca
ellipse orelhaDc 93,47 2.5,4 c=peled ink=thin bone=cabeca
ellipse orelhaEc 67,47 2.5,4 c=peled ink=thin bone=cabeca
shape bracoDc c=camisa ink=line bone=bracoD : 102,74 114,72 114,122 103,122
shape antebracoDc c=pele ink=line bone=antebracoD : 104,118 115,118 114,154 107,154
ellipse maoDc 111,159 5,8 c=pele ink=thin bone=maoD
shape bracoEc c=camisa ink=line bone=bracoE : 46,72 58,74 57,122 46,122
shape antebracoEc c=pele ink=line bone=antebracoE : 45,118 56,118 53,154 46,154
ellipse maoEc 49,159 5,8 c=pele ink=thin bone=maoE

# ---------- animações: cada uma escrita uma vez (uma key por quadro) ----------
anim walk frames=8 fps=10
key 0 quadril=0,7.77 quadril.yaw=5.0 tronco.yaw=-9.0 tronco.pitch=0 coxaD.pitch=22 canelaD.pitch=-4 peD.pitch=18 coxaE.pitch=-18 canelaE.pitch=-12 peE.pitch=-15 bracoD.pitch=-19.8 antebracoD.pitch=8.0 bracoE.pitch=16.2 antebracoE.pitch=17.7 ease=linear
key 1 quadril=0,1.24 quadril.yaw=3.0 tronco.yaw=-5.4 tronco.pitch=0 coxaD.pitch=12 canelaD.pitch=-14 peD.pitch=0 coxaE.pitch=-12 canelaE.pitch=-40 peE.pitch=-20 bracoD.pitch=-10.8 antebracoD.pitch=8.0 bracoE.pitch=10.8 antebracoE.pitch=14.5 ease=linear
key 2 quadril=0,0.12 quadril.yaw=-2.5 tronco.yaw=4.5 tronco.pitch=0 coxaD.pitch=0 canelaD.pitch=-4 peD.pitch=0 coxaE.pitch=20 canelaE.pitch=-55 peE.pitch=5 bracoD.pitch=0.0 antebracoD.pitch=8.0 bracoE.pitch=-18.0 antebracoE.pitch=8.0 ease=linear
key 3 quadril=0,2.27 quadril.yaw=-4.8 tronco.yaw=8.6 tronco.pitch=0 coxaD.pitch=-10 canelaD.pitch=-2 peD.pitch=-5 coxaE.pitch=28 canelaE.pitch=-25 peE.pitch=12 bracoD.pitch=9.0 antebracoD.pitch=13.4 bracoE.pitch=-25.2 antebracoE.pitch=8.0 ease=linear
key 4 quadril=0,7.77 quadril.yaw=-5.0 tronco.yaw=9.0 tronco.pitch=0 coxaD.pitch=-18 canelaD.pitch=-12 peD.pitch=-15 coxaE.pitch=22 canelaE.pitch=-4 peE.pitch=18 bracoD.pitch=16.2 antebracoD.pitch=17.7 bracoE.pitch=-19.8 antebracoE.pitch=8.0 ease=linear
key 5 quadril=0,1.24 quadril.yaw=-3.0 tronco.yaw=5.4 tronco.pitch=0 coxaD.pitch=-12 canelaD.pitch=-40 peD.pitch=-20 coxaE.pitch=12 canelaE.pitch=-14 peE.pitch=0 bracoD.pitch=10.8 antebracoD.pitch=14.5 bracoE.pitch=-10.8 antebracoE.pitch=8.0 ease=linear
key 6 quadril=0,0.12 quadril.yaw=2.5 tronco.yaw=-4.5 tronco.pitch=0 coxaD.pitch=20 canelaD.pitch=-55 peD.pitch=5 coxaE.pitch=0 canelaE.pitch=-4 peE.pitch=0 bracoD.pitch=-18.0 antebracoD.pitch=8.0 bracoE.pitch=0.0 antebracoE.pitch=8.0 ease=linear
key 7 quadril=0,2.27 quadril.yaw=4.8 tronco.yaw=-8.6 tronco.pitch=0 coxaD.pitch=28 canelaD.pitch=-25 peD.pitch=12 coxaE.pitch=-10 canelaE.pitch=-2 peE.pitch=-5 bracoD.pitch=-25.2 antebracoD.pitch=8.0 bracoE.pitch=9.0 antebracoE.pitch=13.4 ease=linear
key 8 quadril=0,7.77 quadril.yaw=5.0 tronco.yaw=-9.0 tronco.pitch=0 coxaD.pitch=22 canelaD.pitch=-4 peD.pitch=18 coxaE.pitch=-18 canelaE.pitch=-12 peE.pitch=-15 bracoD.pitch=-19.8 antebracoD.pitch=8.0 bracoE.pitch=16.2 antebracoE.pitch=17.7 ease=linear
event 0 passo
event 4 passo

anim run frames=8 fps=12
key 0 quadril=0,2.80 quadril.yaw=7.2 tronco.yaw=-13.0 tronco.pitch=-10 coxaD.pitch=18 canelaD.pitch=-20 peD.pitch=10 coxaE.pitch=-30 canelaE.pitch=-40 peE.pitch=-25 bracoD.pitch=-21.6 antebracoD.pitch=82.0 bracoE.pitch=36.0 antebracoE.pitch=82.0 ease=linear
key 1 quadril=0,1.48 quadril.yaw=2.2 tronco.yaw=-4.0 tronco.pitch=-10 coxaD.pitch=15 canelaD.pitch=-45 peD.pitch=0 coxaE.pitch=0 canelaE.pitch=-100 peE.pitch=-10 bracoD.pitch=-18.0 antebracoD.pitch=82.0 bracoE.pitch=0.0 antebracoE.pitch=82.0 ease=linear
key 2 quadril=0,-2.76 quadril.yaw=-9.0 tronco.yaw=16.2 tronco.pitch=-10 coxaD.pitch=-15 canelaD.pitch=-20 peD.pitch=-35 coxaE.pitch=45 canelaE.pitch=-80 peE.pitch=0 bracoD.pitch=18.0 antebracoD.pitch=82.0 bracoE.pitch=-40.0 antebracoE.pitch=82.0 ease=linear
key 3 quadril=0,4.64 quadril.yaw=-7.8 tronco.yaw=14.0 tronco.pitch=-10 coxaD.pitch=-22 canelaD.pitch=-60 peD.pitch=-15 coxaE.pitch=30 canelaE.pitch=-20 peE.pitch=5 bracoD.pitch=26.4 antebracoD.pitch=82.0 bracoE.pitch=-36.0 antebracoE.pitch=82.0 ease=linear
key 4 quadril=0,2.80 quadril.yaw=-7.2 tronco.yaw=13.0 tronco.pitch=-10 coxaD.pitch=-30 canelaD.pitch=-40 peD.pitch=-25 coxaE.pitch=18 canelaE.pitch=-20 peE.pitch=10 bracoD.pitch=36.0 antebracoD.pitch=82.0 bracoE.pitch=-21.6 antebracoE.pitch=82.0 ease=linear
key 5 quadril=0,1.48 quadril.yaw=-2.2 tronco.yaw=4.0 tronco.pitch=-10 coxaD.pitch=0 canelaD.pitch=-100 peD.pitch=-10 coxaE.pitch=15 canelaE.pitch=-45 peE.pitch=0 bracoD.pitch=0.0 antebracoD.pitch=82.0 bracoE.pitch=-18.0 antebracoE.pitch=82.0 ease=linear
key 6 quadril=0,-2.76 quadril.yaw=9.0 tronco.yaw=-16.2 tronco.pitch=-10 coxaD.pitch=45 canelaD.pitch=-80 peD.pitch=0 coxaE.pitch=-15 canelaE.pitch=-20 peE.pitch=-35 bracoD.pitch=-40.0 antebracoD.pitch=82.0 bracoE.pitch=18.0 antebracoE.pitch=82.0 ease=linear
key 7 quadril=0,4.64 quadril.yaw=7.8 tronco.yaw=-14.0 tronco.pitch=-10 coxaD.pitch=30 canelaD.pitch=-20 peD.pitch=5 coxaE.pitch=-22 canelaE.pitch=-60 peE.pitch=-15 bracoD.pitch=-36.0 antebracoD.pitch=82.0 bracoE.pitch=26.4 antebracoE.pitch=82.0 ease=linear
key 8 quadril=0,2.80 quadril.yaw=7.2 tronco.yaw=-13.0 tronco.pitch=-10 coxaD.pitch=18 canelaD.pitch=-20 peD.pitch=10 coxaE.pitch=-30 canelaE.pitch=-40 peE.pitch=-25 bracoD.pitch=-21.6 antebracoD.pitch=82.0 bracoE.pitch=36.0 antebracoE.pitch=82.0 ease=linear
event 0 passo
event 4 passo
`;

  const platform3 = `# Herói de plataforma — os dois lados desenhados, sem a frente, para o Godot
# Num jogo de plataforma, o personagem só anda para os lados. Sem a vista de frente, a principal é o
# lado direito (view=right): os pivot= e a pose são os dele. O lado esquerdo (view=left) também é
# desenhado, então nada sai espelhado: o escudo fica perto da câmera de um lado, a espada do outro.
# lat=x no bone diz o x que o osso teria de frente (de que lado do corpo ele fica). A câmera fica de
# lado: views tilt=0. As animações são escritas no lado direito (o giro, o terceiro número da key,
# é no plano da tela) e saem walk_right e walk_left.
# Veja as vistas com:  weasel plataforma3d.weasel --info

canvas 160 160 bg=#eef0e6
palette ink=#2a1d16 line=3 thin=1.5
palette pele=#f2c9a0 tunica=#2f7f8f tunicad=#24626e cabelo=#6b4a2e cabelod=#553a22 couro=#8a5a32 faixa=#c8433a
palette bota=#5b3a22 calca=#efe6d0 calcad=#cfc4aa metal=#d9dee6 cabo=#7a5232 ouro=#e0b84a madeira=#a8763f madeirad=#86592c olho=#1a1414

godot body=character root=80,146
views tilt=0

layer guia guide
line chao c=#b9bba8 w=1 : 20,146 140,146

# ---------- ossos (no lado direito: x para a frente; lat= diz quem fica perto no lado direito) ----------
bone corpo pivot=80,116
bone cabeca parent=corpo pivot=80,86 lat=80
bone pernaD pivot=80,116 tip=80,146 lat=73
bone pernaE pivot=80,116 tip=80,146 lat=87
bone bracoD parent=corpo pivot=80,92 lat=66
bone espada parent=bracoD pivot=81,112 tip=88,140 lat=66
bone bracoE parent=corpo pivot=80,92 lat=94
bone escudo parent=bracoE pivot=80,111 tip=80,124 lat=94

# ---------- de lado (virado para a direita: o braço da espada fica perto) ----------
layer lado view=right
ellipse mangaEl 80,101 6,10 c=tunicad ink=line bone=bracoE
ellipse escudoL 93,113 3.5,12 c=madeira ink=line bone=escudo
rect calcaEl 75,114 10,24 c=calcad ink=thin bone=pernaE
rect botaEl 74,134 15,12 r=3 c=bota ink=thin bone=pernaE
rect calcaDl 75,114 10,24 c=calca ink=thin bone=pernaD
rect botaDl 74,134 15,12 r=3 c=bota ink=thin bone=pernaD
shape tunicaL c=tunica ink=line bone=corpo : 72,88! 88,88! 91,106 96,124! 64,124! 68,106
rect cintoL 67,105 26,5 c=couro bone=corpo
shape pontasL c=faixa ink=thin bone=cabeca : 64,52 46,60 48,66 64,58
ellipse rostoL 82,65 20,20 c=pele ink=line bone=cabeca
ellipse narizL 101,69 3 c=pele ink=thin bone=cabeca
shape cabeloL c=cabelo ink=line bone=cabeca : 62,66 63,50 72,43 84,42 96,47 100,55 90,52 80,53 74,58 70,72
stroke faixaL w=5 c=faixa bone=cabeca : 63,55 82,50 99,55
ellipse orelhaL 75,66 4,6 c=pele ink=thin bone=cabeca
ellipse olhoL 93,67 2.5,4 c=olho bone=cabeca
shape laminaL c=metal ink=thin bone=espada : 79,116! 82,115! 89,139! 86,141!
rect guardaL 75,112 11,3 r=1 c=cabo ink=thin bone=espada
ellipse mangaDl 80,101 6,10 c=tunicad ink=line bone=bracoD
ellipse maoDl 81,112 4.5 c=pele ink=thin bone=bracoD

# ---------- do outro lado (virado para a esquerda: o escudo fica perto) ----------
layer esquerda view=left
shape laminaLe c=metal ink=thin bone=espada : 81,116! 78,115! 71,139! 74,141!
ellipse mangaDle 80,101 6,10 c=tunicad ink=line bone=bracoD
rect calcaDle 75,114 10,24 c=calcad ink=thin bone=pernaD
rect botaDle 71,134 15,12 r=3 c=bota ink=thin bone=pernaD
rect calcaEle 75,114 10,24 c=calca ink=thin bone=pernaE
rect botaEle 71,134 15,12 r=3 c=bota ink=thin bone=pernaE
shape tunicaLe c=tunica ink=line bone=corpo : 72,88! 88,88! 92,106 96,124! 64,124! 69,106
rect cintoLe 67,105 26,5 c=couro bone=corpo
shape pontasLe c=faixa ink=thin bone=cabeca : 96,52 114,60 112,66 96,58
ellipse rostoLe 78,65 20,20 c=pele ink=line bone=cabeca
ellipse narizLe 59,69 3 c=pele ink=thin bone=cabeca
shape cabeloLe c=cabelo ink=line bone=cabeca : 98,66 97,50 88,43 76,42 64,47 60,55 70,52 80,53 86,58 90,72
stroke faixaLe w=5 c=faixa bone=cabeca : 97,55 78,50 61,55
ellipse orelhaLe 85,66 4,6 c=pele ink=thin bone=cabeca
ellipse olhoLe 67,67 2.5,4 c=olho bone=cabeca
ellipse mangaEle 80,101 6,10 c=tunicad ink=line bone=bracoE
ellipse maoEle 80,111 4.5 c=pele ink=thin bone=bracoE
ellipse escudoLe 69,113 6,12 c=madeira ink=line bone=escudo
ellipse bossaLe 68,113 2.2,3.5 c=metal ink=thin bone=escudo

# ---------- animações (escritas no lado direito) ----------
anim idle frames=8 fps=8
key 0 corpo=0,0,0,1,1
key 4 corpo=0,1.5,0,1.03,0.97
key 8 corpo=0,0,0,1,1

anim walk frames=8 fps=12
key 0 corpo=0,2 pernaD=0,0,-26 pernaE=0,0,26 bracoD=0,0,22 bracoE=0,0,-22
key 2 corpo=0,-1 pernaD=0,0,0 pernaE=0,-4,0 bracoD=0,0,0 bracoE=0,0,0
key 4 corpo=0,2 pernaD=0,0,26 pernaE=0,0,-26 bracoD=0,0,-22 bracoE=0,0,22
key 6 corpo=0,-1 pernaD=0,-4,0 pernaE=0,0,0 bracoD=0,0,0 bracoE=0,0,0
key 8 corpo=0,2 pernaD=0,0,-26 pernaE=0,0,26 bracoD=0,0,22 bracoE=0,0,-22
event 0 passo
event 4 passo

# pulo: agacha, sobe, no ar com as pernas dobradas, cai
anim jump frames=8 fps=12 once
key 0 corpo=0,0 pernaD=0,0,0 pernaE=0,0,0
key 1 corpo=0,6,0,1.04,0.94 pernaD=0,0,-12 pernaE=0,0,12 bracoD=0,0,30 bracoE=0,0,30
key 2 corpo=0,-18 pernaD=0,-20,-30 pernaE=0,-20,10 bracoD=0,-18,-60 bracoE=0,-18,-40 ease=out
key 4 corpo=0,-30 pernaD=0,-32,-45 pernaE=0,-30,-20 bracoD=0,-30,-80 bracoE=0,-30,-60
key 6 corpo=0,-10 pernaD=0,-12,-10 pernaE=0,-10,10 bracoD=0,-10,-20 bracoE=0,-10,-20 ease=in
key 7 corpo=0,5,0,1.04,0.95 pernaD=0,0,-10 pernaE=0,0,10 bracoD=0,0,10 bracoE=0,0,10
key 8 corpo=0,0 pernaD=0,0,0 pernaE=0,0,0 bracoD=0,0,0 bracoE=0,0,0

# ataque: a espada sobe por trás e desce na frente
anim attack frames=6 fps=12 once
key 0 bracoD=0,0,0 corpo=0,0,0
key 1 bracoD=0,0,150 corpo=0,0,-6 ease=out
key 2 bracoD=0,0,-80 corpo=0,0,8 ease=out
key 4 bracoD=0,0,-70 corpo=0,0,6
key 6 bracoD=0,0,0 corpo=0,0,0
event 2 golpe
`;

  const tiles = `# Blocos — tileset de plataforma para o Godot
# O canvas é a folha: blocos de 32×32, em colunas e linhas. Cada tile diz qual célula
# vira bloco e como ele colide: solid (o quadrado todo), oneway (só por cima) ou
# collision=forma (o formato de uma forma, como a rampa). O nome vai junto (dado "nome").
# auto cria também um bloco sem colisão para cada célula desenhada que não tem tile.
# Exporte com:  weasel blocos.weasel -f godot -o godot/blocos.tres

canvas 192 64 bg=none
palette ink=#2a1d16 line=2
palette grama=#6cbf4a gramad=#4f9a35 terra=#9a6b43 terrad=#7c5434 pedra=#8d93a0
palette madeira=#c58a4c madeirad=#9a6533 ouro=#ffd04a metal=#cfd6e0 nuvem=#ffffff
pattern pedras hatch cross angle=30 gap=7 w=1.2 c=#6f7480 bg=#9aa0ad

tileset size=32 auto
godot normal=0.8

# linha 0
layer chao
rect terraA 0,6 32,26 c=terra
shape gramaA c=grama ink=line smooth=0.6 : 0,0! 32,0! 32,10! 27,13 22,9 16,13 11,9 5,13 0,10!
ellipse seixoA 9,24 3,2 c=terrad
ellipse seixoB 23,20 2,1.5 c=terrad
rect terraB 32,0 32,32 c=terra
ellipse seixoC 40,8 3,2 c=terrad
ellipse seixoD 54,22 3.5,2.5 c=terrad
ellipse seixoE 44,26 2,1.5 c=terrad
rect pedraA 64,0 32,32 c=pedras ink=line
rect tabua 96,0 32,10 r=2 c=madeira ink=line
stroke veio w=1 c=madeirad : 100,5 112,4 124,6
rect apoioE 100,10 4,8 c=madeirad
rect apoioD 120,10 4,8 c=madeirad
shape rampa c=terra : 128,32! 160,0! 160,32!
stroke gramaR w=4 c=grama cap=round : 129,31 159,1
shape espinhos c=metal ink=line smooth=0 : 160,32! 164,16! 168,32! 172,16! 176,32! 180,16! 184,32! 188,16! 192,32!

# linha 1
rect caixa 34,34 28,28 r=2 c=madeira ink=line
stroke tabuaX1 w=2 c=madeirad : 38,38 58,58
stroke tabuaX2 w=2 c=madeirad : 58,38 38,58
ellipse moeda 16,48 9,11 c=ouro ink=line emit=#ffd04a,0.5
rect brilho 14,41 3,10 r=1.5 c=#fff3b0
stroke caule w=2 c=gramad : 80,62 80,48
ellipse petala1 80,44 4 c=#ff7aa8 ink=1
ellipse petala2 75,48 4 c=#ff7aa8 ink=1
ellipse petala3 85,48 4 c=#ff7aa8 ink=1
ellipse miolo 80,47 2.5 c=ouro

# nuvem decorativa em duas células (vira dois blocos pelo auto)
layer ceu unlit
ellipse nuvemA 112,50 14,9 c=nuvem
ellipse nuvemB 128,44 16,12 c=nuvem
ellipse nuvemC 144,50 14,9 c=nuvem

tile grama 0,0 solid
tile terra 1,0 solid
tile pedra 2,0 solid
tile plataforma 3,0 oneway
tile rampa 4,0 collision=rampa
tile espinhos 5,0
tile moeda 0,1
tile caixa 1,1 solid
tile flor 2,1
`;

  const blank = `canvas 600 400 bg=#f2ede4 light=-0.6,-0.8
palette ink=#1c1b22 line=6

layer desenho
shape forma c=#7cb7ff ink=line : 220,140 380,130 420,250 300,300! 190,250
`;

  // ---------- sons dos exemplos ----------
  // Gerados por código (sem arquivo de áudio no repositório do editor): a fala é de brincadeira, sílabas
  // sem sentido com as vogais certas e entonação (como a fala dos Sims); os grilos fazem um loop de 3 s.
  const RATE = 16000;
  function noise(seed) {
    let s = seed >>> 0;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return (s / 4294967296) * 2 - 1; };
  }
  const FORMANTS = { a: [800, 1250], e: [480, 1900], i: [320, 2300], o: [520, 900], u: [360, 720] };
  const PLOSIVE = 'bpdtgkcq', FRICATIVE = 'sfvzxjç', NASAL = 'mn';
  // frases: [{ at: segundos, text: 'u-uu bo-a noi-te', f0, end: '.'|'?'|'!' }]
  function voice(phrases, total) {
    const n = Math.round(total * RATE), out = new Float32Array(n), rnd = noise(7);
    const segs = [];
    for (const ph of phrases) {
      const words = ph.text.split(' ');
      const sylls = words.flatMap((w, wi) => w.split('-').map((s, si, arr) => ({ s, last: si === arr.length - 1, lastWord: wi === words.length - 1 })));
      let t = ph.at;
      sylls.forEach((sy, k) => {
        const lead = /^[^aeiou]*/.exec(sy.s)[0], vow = sy.s.slice(lead.length).replace(/[^aeiou]/g, '') || 'a';
        const dur = 0.13 + (sy.s.length % 3) * 0.02 + (sy.last ? 0.05 : 0) + (sy.lastWord && sy.last ? 0.1 : 0);
        const u = k / Math.max(1, sylls.length - 1);
        const shape = ph.end === '?' ? 1 - 0.1 * u + 0.35 * u * u : ph.end === '!' ? 1.12 - 0.25 * u : 1.04 - 0.2 * u;
        segs.push({ t, lead, vow, dur, f0: ph.f0 * shape });
        t += dur + (sy.last ? 0.07 : 0.01);
      });
    }
    let phase = 0, f1 = 500, f2 = 1500;
    for (let i = 0; i < n; i++) {
      const t = i / RATE;
      const sg = segs.find((g) => t >= g.t && t < g.t + g.dur);
      if (!sg) { phase = 0; continue; }
      const local = t - sg.t;
      const cons = sg.lead ? 0.045 : 0;
      let v = 0;
      // consoante: estalo, chiado ou zumbido no começo da sílaba
      if (local < cons) {
        const c = sg.lead[0];
        if (FRICATIVE.includes(c)) v = rnd() * 0.04;
        else if (PLOSIVE.includes(c)) v = local > cons * 0.6 ? rnd() * 0.05 : 0;
        else if (NASAL.includes(c)) v = Math.sin(2 * Math.PI * 180 * t) * 0.05;
        else v = rnd() * 0.02;
      }
      // vogal: harmônicos da voz pesados pelos formantes da vogal (que deslizam de uma sílaba para a outra)
      const vk = sg.vow.length > 1 && local > sg.dur * 0.55 ? sg.vow[1] : sg.vow[0];
      f1 += (FORMANTS[vk][0] - f1) * 0.004;
      f2 += (FORMANTS[vk][1] - f2) * 0.004;
      const f0 = sg.f0 * (1 + 0.012 * Math.sin(2 * Math.PI * 5.5 * t));
      phase += (2 * Math.PI * f0) / RATE;
      const env = Math.min(1, (local - cons * 0.5) / 0.03) * Math.min(1, (sg.dur - local) / 0.05);
      if (env > 0) {
        let s = 0, norm = 0;
        const K = Math.min(36, Math.floor(RATE / 2 / f0));
        for (let k = 1; k <= K; k++) {
          const f = k * f0;
          const a = (1 / (1 + ((f - f1) / 90) ** 2) + 0.7 / (1 + ((f - f2) / 130) ** 2) + 0.2 / (1 + ((f - 2700) / 220) ** 2)) / Math.pow(k, 0.7);
          s += a * Math.sin(k * phase);
          norm += a * a;
        }
        v += (s / Math.sqrt(norm)) * 0.3 * env; // todas as vogais com a mesma força
      }
      out[i] = v;
    }
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
    for (let i = 0; i < n; i++) out[i] *= 0.8 / (peak || 1);
    return out;
  }
  // dois grilos (cri-cri-cri) e um chiado baixinho; os períodos cabem nos 3 s, então o loop não emenda
  function crickets() {
    const n = 3 * RATE, out = new Float32Array(n), rnd = noise(11);
    const bugs = [{ f: 4300, per: 1, at: 0.1, a: 0.16 }, { f: 4800, per: 0.75, at: 0.42, a: 0.1 }];
    for (let i = 0; i < n; i++) {
      const t = i / RATE;
      let v = rnd() * 0.006;
      for (const b of bugs) {
        const local = (((t - b.at) % b.per) + b.per) % b.per;
        const k = Math.floor(local / 0.07), u = (local - k * 0.07) / 0.04;
        if (k < 3 && u < 1) v += b.a * Math.sin(Math.PI * u) ** 2 * Math.sin(2 * Math.PI * b.f * t);
      }
      out[i] = v;
    }
    return out;
  }
  W.exampleMedia = {
    'som/coruja_fala.wav': () => W.audio.encodeWav(voice([
      { at: 0.25, text: 'u-uu bo-a noi-te ca-va-lei-ro', f0: 340, end: '!' },
      { at: 2.45, text: 'cui-da-do com o fan-tas-ma', f0: 320, end: '.' },
    ], 4.2), RATE),
    'som/grilos.wav': () => W.audio.encodeWav(crickets(), RATE),
  };

  W.examples = [
    { id: 'knight', title: 'Cavaleiro (do vídeo)', file: 'cavaleiro', src: knight },
    { id: 'owl', title: 'Coruja (componentes, gradientes, morph)', file: 'coruja', src: owl },
    { id: 'night', title: 'Noite (luz, sombra, partículas)', file: 'noite', src: night, deps: ['knight'] },
    { id: 'engraving', title: 'Gravura (hachura)', file: 'gravura', src: engraving },
    { id: 'ghost', title: 'Primeiros passos (fantasma)', file: 'fantasma', src: ghost },
    { id: 'ball', title: 'Bola quicando', file: 'bola', src: ball },
    { id: 'set', title: 'Cenário (camadas de profundidade)', file: 'cenario', src: set },
    { id: 'film', title: 'Filme (planos, atores, câmera, fala)', file: 'filme', src: film, deps: ['set', 'knight', 'ghost', 'owl'] },
    { id: 'topdown', title: 'Furão (top-down, caixas, direções)', file: 'furao', src: topdown },
    { id: 'topdown3', title: 'Furão em três vistas (anima uma vez, sai em cada direção)', file: 'furao3d', src: topdown3 },
    { id: 'hero3', title: 'Herói em três vistas (diagonais e os dois lados)', file: 'heroi3d', src: hero3 },
    { id: 'guard3', title: 'Guarda em três vistas (lança, capa e cabeça que vira)', file: 'guarda3d', src: guard3 },
    { id: 'man3', title: 'Homem em três vistas (joelho e cotovelo; andar e correr)', file: 'homem3d', src: man3 },
    { id: 'platform3', title: 'Herói de plataforma (os dois lados, lat=)', file: 'plataforma3d', src: platform3 },
    { id: 'tiles', title: 'Blocos (tileset para o Godot)', file: 'blocos', src: tiles },
  ];
  W.blankProgram = blank;
})(window.Weasel = window.Weasel || {});
