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
# a espada vai junto com o corpo, mas pode girar sozinha
bone nail parent=body pivot=368,445
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

layer maskink
# o contorno da máscara sobe para cá (inkon=), por cima dos olhos
# A borda de fora do chifre continua um pouco para dentro da máscara
stroke hornroot w=inner c=ink taper=0,0.8 bone=head : 332,238 342,262 366,283

# ---------- animações ----------
# key quadro osso=dx,dy,rotação,escalaX,escalaY

anim stand frames=24 fps=12
key 0 body=0,0 head=0,0,0 nail=0,0,0
key 12 body=0,3,0,1.01,0.985 head=0,1,-1.5 nail=0,0,3
key 24 body=0,0 head=0,0,0 nail=0,0,0

anim jump frames=24 fps=15
key 0 root=0,0 head=0,0,0 nail=0,0,0
key 3 root=0,0,0,1.1,0.86 ease=out
key 6 root=0,-70,0,0.92,1.1 head=0,0,-5 ease=out
key 7 nail=0,0,-14
key 11 root=0,-120 ease=in
key 14 head=0,0,4
key 15 nail=0,0,10
key 16 root=0,-50,0,0.96,1.05 ease=in
key 18 root=0,0,0,1.12,0.86 ease=out
key 20 head=0,0,0
key 21 root=0,0,0,0.98,1.02 nail=0,0,0
key 24 root=0,0

anim dash frames=12 fps=15
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

layer bola
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

  const blank = `canvas 600 400 bg=#f2ede4 light=-0.6,-0.8
palette ink=#1c1b22 line=6

layer desenho
shape forma c=#7cb7ff ink=line : 220,140 380,130 420,250 300,300! 190,250
`;

  W.examples = [
    { id: 'knight', title: 'Cavaleiro (do vídeo)', file: 'cavaleiro', src: knight },
    { id: 'ghost', title: 'Primeiros passos (fantasma)', file: 'fantasma', src: ghost },
    { id: 'ball', title: 'Bola quicando', file: 'bola', src: ball },
  ];
  W.blankProgram = blank;
})(window.Weasel = window.Weasel || {});
