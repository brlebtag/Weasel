# 25. Glossário

[← Atalhos do teclado](23-atalhos.md) · [Índice](README.md)

As palavras que o guia usa, em ordem alfabética. Cada uma tem **um sentido só** em todo o guia. Quando a palavra é também um comando do Weasel, o comando aparece entre parênteses, com o link para a ficha dele na [referência](19-referencia.md).

## A

**Alça:** a seta invisível que diz para onde a curva sai de um ponto. Escreve-se depois do ponto: `x,y~dx,dy`. A curva sai do ponto na direção `dx,dy`, e quanto maior a alça, mais longe a curva vai nessa direção antes de virar. "Alça" é só isso no guia: no editor, os quadradinhos que você arrasta são **pontos de arrastar**.

**Alça quebrada:** um ponto com duas alças diferentes, uma para a curva que chega e outra para a que sai: `x,y~ax,ay~bx,by`. Faz uma ponta na curva.

**Animação** (`anim`): uma sequência de quadros com um nome, como `andar` ou `pular`. Ela dura `frames=` quadros e toca a `fps=` quadros por segundo. Ver [`anim`](19-referencia.md#anim).

**Anima?:** a última coluna das tabelas da referência. Diz se uma `key` (numa animação) ou um `at` (num filme) consegue mudar aquela opção com o tempo.

**Ator** (`actor`): um desenho de outro arquivo `.weasel` posto dentro de um filme. O ator anda, troca de animação e faz caras. Ver [`actor`](19-referencia.md#actor).

## B

**Bocas** (`mouth`): as nove formas de boca (`A` a `X`) que o lip sync usa para fazer o personagem falar. Ver [`mouth`](19-referencia.md#mouth).

## C

**Camada** (`layer`): um grupo de formas que são pintadas juntas. Tudo o que vem depois de uma linha `layer` entra nela, até a próxima `layer`. A camada pode ter recorte, efeitos e transparência para o grupo inteiro. Ver [`layer`](19-referencia.md#layer).

**Câmera** (`camera`): o que o filme mostra da cena. Ela anda, aproxima, treme e segue um ator. Ver [`camera`](19-referencia.md#camera).

**Canto:** um ponto onde a forma faz uma ponta, em vez de uma curva. Escreve-se com `!` depois do ponto: `x,y!`.

**Comando:** a primeira palavra de uma linha. Diz o que a linha faz: `ellipse` desenha uma elipse, `bone` cria um osso, `anim` começa uma animação.

**Comentário:** tudo o que vem depois de um `#` (no começo da linha ou depois de um espaço). O Weasel não lê os comentários: eles são notas para quem lê o código.

**Componente** (`def` e `use`): um desenho com nome, escrito uma vez e usado em vários lugares. O `def` define; o `use` põe uma cópia. Ver [`def` e `end`](19-referencia.md#def-e-end).

**Conta:** um número calculado, escrito entre chaves: `{cx+20}`, `{sin(30)*r}`. Ver o [capítulo 20](20-funcoes.md).

**Contorno:** a linha em volta de uma forma. Nas formas, `ink=` é a grossura do contorno e `inkc=` a cor dele. Sem `ink=`, a forma não tem contorno.

**Cor:** qualquer jeito de dizer uma cor: `#hex`, um nome da `palette`, um `gradient`, um `pattern`, um nome do CSS (`red`, `gold`…) ou `none` (sem cor).

**Cor `#hex`:** uma cor escrita com `#` e números hexadecimais (`#f80`, `#ff8800`, `#ff880080`), ou um nome da `palette` que guarde uma. Alguns lugares (as luzes, os efeitos de camada, o papel dos estilos de arte…) só aceitam esse tipo de cor; a referência avisa onde.

**Curva** (`ease=`): o jeito de calcular os quadros entre duas `key`. Com `linear`, o movimento tem a mesma velocidade o tempo todo; com `smooth` (o padrão), ele começa e termina devagar. Ver [as curvas](19-referencia.md#curvas) na referência.

## D

**Desenho:** o resultado de um arquivo `.weasel`: o que aparece no editor e o que a linha de comando exporta.

## E

**Efeito:** algo que muda a aparência de uma camada inteira: desfoque (`blur=`), brilho (`glow=`), sombra (`shadow=`), tinta por cima (`tint=`)… Ver [`layer`](19-referencia.md#layer).

**Escala:** o tamanho em relação ao original. `scale=2` é o dobro; `scale=0.5`, a metade.

**Espessura:** um número 0 ou mais (em pixels), um nome numérico da `palette` (como `line`) ou `none` (que vale 0). É o que `w=` e `ink=` recebem.

**Esqueleto:** todos os ossos de um desenho, ligados de pai para filho.

**Estilo de arte** (`art`): a imagem pronta pintada de outro jeito: pixel art, aquarela, gravura, HQ… O desenho não muda; só a pintura. Ver [`art`](19-referencia.md#art).

**Evento** (`event`): um aviso preso a um quadro de uma animação, como "o pé tocou o chão". O jogo recebe o aviso e toca um som, por exemplo. Ver [`event`](19-referencia.md#event).

**Exportar:** salvar o desenho num arquivo de imagem, animação, sprite sheet, cena do Godot ou vídeo. Ver o [capítulo 21](21-linha-de-comando.md).

**Expressão** (`expr`): uma cara com nome (feliz, bravo…), feita de poses dos ossos e das formas do rosto. O filme troca de expressão com o `at`. Ver [`expr`](19-referencia.md#expr).

## F

**Filme** (`film`): um arquivo que junta atores, planos, câmera, sons e legendas e vira um vídeo. Ver [`film`](19-referencia.md#film).

**Folha:** a área do desenho, com o tamanho que o `canvas` define. Fora dela, nada aparece. Ver [`canvas`](19-referencia.md#canvas).

**Forma:** cada coisa que o Weasel pinta: `shape`, `ellipse`, `rect`, `stroke`, `line`, `text` e `emitter`. Ver as [opções de todas as formas](19-referencia.md#opções-de-todas-as-formas).

**Forma fechada:** uma forma que tem um dentro, que pode ser pintado: `shape`, `ellipse` e `rect`. O `stroke` e a `line` são **traços abertos**: só têm a linha.

**fps:** quadros por segundo. Uma animação com `fps=12` mostra 12 desenhos a cada segundo.

## G

**Gradiente** (`gradient`): uma cor que muda aos poucos para outra. Ver [`gradient`](19-referencia.md#gradient).

## I

**IK:** um jeito de mexer um braço ou uma perna dizendo **onde a ponta deve ficar** (a mão, o pé). O Weasel dobra o cotovelo ou o joelho sozinho para chegar lá. Ver [`ik`](19-referencia.md#ik).

**Imagem guia** (`ref`): uma imagem posta por baixo (ou por cima) do desenho, para copiar. Ela não sai na exportação, a não ser com `--refs`. Ver [`ref`](19-referencia.md#ref).

**`ink`:** tem dois usos, e o guia sempre diz qual. Na `palette`, `ink` é a **cor da tinta**, a cor que as formas usam quando você não diz outra. Nas formas, `ink=` é a **grossura do contorno**.

## K

**`key`:** uma pose num quadro da animação. Você escreve as poses de alguns quadros, e o Weasel calcula os quadros do meio. Ver [`key`](19-referencia.md#key).

## L

**Lip sync:** fazer a boca do personagem acompanhar a fala de um som, trocando entre as bocas do `mouth`. Ver [`audio`](19-referencia.md#audio).

**Loop:** uma animação que, ao chegar no fim, volta para o começo e continua. É o normal no Weasel; com `once`, a animação toca uma vez e para.

**Luz** (`light` e `ambient`): lâmpadas, holofotes e o sol, que clareiam o desenho e fazem sombra. O `ambient` é a luz geral, que vem de todo lado. Ver [`light`](19-referencia.md#light).

## M

**Marca** (`mark`): um nome para um momento do filme, como `explosao 12s`. Depois, um `at explosao` acontece nesse momento. Ver [`mark`](19-referencia.md#mark).

**Mola** (`spring=`): um osso que balança atrasado, como um rabo ou uma orelha, quando o osso pai se mexe. Ver [`bone`](19-referencia.md#bone).

## N

**Nome:** o que identifica uma forma, um osso, uma camada ou uma cor. Começa com uma letra (ou `_`) e continua com letras, números, `_` e `-`, **sem acento**: `cabeca`, e não `cabeça`.

## O

**Opção:** um `nome=valor` numa linha (`c=#ff6b4a`, `rot=30`) ou uma **palavra solta** (`hidden`, `once`). A referência lista todas as opções de cada comando.

**Origem:** o ponto `0,0` de um componente (`def`). Quando você usa o componente com `use nome x,y`, a origem vai para `x,y`.

**Osso** (`bone`): um ponto de giro que carrega formas. Mexa o osso, e as formas presas a ele vão junto. Ver [`bone`](19-referencia.md#bone).

## P

**Padrão:** o valor que uma opção tem quando você não a escreve. Na referência, é a coluna "Padrão". (O comando `pattern`, que faz listras e bolinhas, é chamado de **textura** no guia, para não confundir.)

**Palavra solta:** uma opção sem `=`, que liga alguma coisa só por estar na linha: `hidden`, `once`, `bold`.

**Paleta** (`palette`): os nomes das cores e das espessuras do desenho, como `pele=#f2c6a0` ou `line=8`. Trocar a cor na `palette` troca em todas as formas que usam aquele nome. Ver [`palette`](19-referencia.md#palette).

**Partículas** (`emitter`): pontinhos que nascem, voam e somem: fumaça, faíscas, chuva. Ver [`emitter`](19-referencia.md#emitter).

**Pivô:** o ponto em volta do qual um osso gira, escrito com `pivot=`. O ombro é o pivô do braço.

**Plano** (`shot`): um pedaço do filme, com começo, duração e o que acontece nele. Ver [`shot`](19-referencia.md#shot).

**Ponto:** um lugar na folha, escrito `x,y`: `x` para a direita e `y` **para baixo**, em pixels, a partir do canto de cima à esquerda. Um ponto sem nada depois é **liso**: a forma passa por ele numa curva.

**Ponto de arrastar:** no editor, o quadradinho ou a bolinha que você arrasta com o mouse para mudar um ponto, um tamanho ou um giro.

**Ponto de encaixe** (`point`): um ponto com nome que segue um osso, como a mão onde a espada vai ficar no jogo. Ver [`point`](19-referencia.md#point).

**Ponto preso:** um ponto de uma forma que segue um osso, escrito com `@osso` no fim: `120,80@braco`.

## Q

**Quadro:** um desenho da animação. Uma animação de 24 quadros a 12 por segundo dura 2 segundos. A contagem começa no quadro 0.

## R

**Recorte:** mostrar uma forma só por dentro de outra (`clip=`) ou só por fora (`cut=`), como um olho que não sai da cabeça. Ver [`layer`](19-referencia.md#layer).

**Referência:** o [capítulo 19](19-referencia.md), com a ficha de todos os comandos, todas as opções, as faixas e os padrões.

## S

**Sprite sheet:** uma imagem só com todos os quadros de uma animação lado a lado, que o jogo recorta e mostra um de cada vez.

## T

**Tecido** (`cloth`): faz uma forma balançar como um pano preso num ponto (`pivot=`), com o vento e com o movimento: uma capa, uma bandeira. Ver [`cloth`](19-referencia.md#cloth).

**Tempo:** num filme, um momento ou uma duração: `2s`, `500ms`, `48f` (48 quadros), `1m30s`. Com `+`, conta a partir do anterior: `+1s`.

**Textura** (`pattern`): listras, hachuras ou bolinhas usadas como cor de uma forma. Ver [`pattern`](19-referencia.md#pattern).

**Tileset** (`tileset` e `tile`): os pedaços de chão e parede de uma fase do jogo, cada um com a sua colisão. Ver [`tileset`](19-referencia.md#tileset).

**Traço aberto:** uma linha que não fecha: o `stroke` (com curvas e grossura que pode mudar) e a `line` (reta, com tracejado). Ver [`stroke`](19-referencia.md#stroke).

**Transição** (`in=`): o jeito de um plano entrar no lugar do anterior: escurecendo, varrendo, deslizando… Ver [`shot`](19-referencia.md#shot).

## V

**Variante** (`variant`): uma versão do mesmo desenho com outras cores ou outras peças, como a armadura azul e a vermelha. Ver [`variant`](19-referencia.md#variant).

## Números

**2.5D:** dar profundidade a um desenho 2D: girar formas como cartões no espaço (`yaw=`, `pitch=`), pôr umas mais perto e outras mais longe (`z=`, `depth=`), um chão em perspectiva. Ver o [capítulo de profundidade](11-profundidade.md).

[← Atalhos do teclado](23-atalhos.md) · [Índice](README.md)
