# Traçado de imagem

**Situação:** plano aprovado em 20/11/2026 (JavaScript, "Traçado de imagem", a imagem como entrada na linha de
comando, no editor sobre uma `ref`). **Etapa 1 feita na 1.70.0** e **etapa 2 feita na 1.71.0** (20/11/2026; os
números estão no fim de cada etapa). O plano está completo; fica de fora o que diz "O que fica de fora". Depois
dele, na **1.72.0**, o "sem fundo" da skill entrou no Weasel (a seção "Depois do plano").

## A ideia

- Uma imagem em vector art (PNG, JPG, WebP) vira um desenho do Weasel: `shape` com a curva lisa do próprio Weasel,
  cores na `palette`, degradês em `gradient`, buracos em `cut=`, partes semitransparentes com `#rrggbbaa`.
- O objetivo é a **fidelidade**: o desenho renderizado tem de ficar o mais perto possível da imagem, pixel a pixel.
- Começou no `vetoriza.py` do ForestPatrol (`tools/floresta/vetoriza.py`), que foi o ponto de partida e a régua.
- **Weasel:** uma função nova; a linguagem não muda (o resultado só usa o que já existe). **Jogo:** nada muda.

## O protótipo (já feito, fora do repositório)

Em `.claude/vetorizar/` (pasta ignorada pelo git), em Python com numpy:

| arquivo | o que é |
|---|---|
| `vetorizar.py` | o vetorizador (o que este plano leva para JavaScript) |
| `rodar.py` | roda um método nas imagens, renderiza pelo Weasel e mede a fidelidade |
| `varrer.py` | testa vários parâmetros de uma vez, em paralelo |
| `painel.py`, `detalhe.py`, `zoom.py`, `difpior.py`, `borrar.py` | folhas de comparação e testes pontuais |
| `PLANO.md` | os erros do `vetoriza.py` (E1 a E10), o plano das melhorias (M1 a M9) e o diário das iterações |
| `imagens/` | as 12 imagens de teste: 7 geradas no ComfyUI (Qwen), o soldado e as 4 que você mandou |

**As métricas** (as duas imagens compostas sobre cinza 50%): ΔE médio (Lab, CIE76; abaixo de 2,3 não se vê), a
porcentagem de pixels com ΔE > 10 (erro visível), a sobreposição das silhuetas, o F1 das bordas (tolerância de
1 px), o SSIM, e o tamanho do `.weasel` (formas, pontos, KB).

**O resultado** (média das 12 imagens):

| | ΔE | erro visível | bordas | SSIM | formas | KB |
|---|---|---|---|---|---|---|
| `vetoriza.py` do ForestPatrol | 9,66 | 22,6% | 0,797 | 0,783 | 282 | 69 |
| `vetorizar.py` | **1,67** | **2,5%** | **0,972** | **0,969** | 1193 | 295 |

O `vetoriza.py` quebra em 6 das 12 imagens (quando a arte encosta na borda, o recorte sai do quadro); os números
acima são com 4 px de borda transparente acrescentada. Por imagem, o novo vai de 0,82 (paisagem) a 3,12 (tigre, um
JPEG pequeno ampliado). As folhas de comparação estão em `.claude/vetorizar/painel_1.png`, `painel_2.png` e
`detalhes.png`.

## Como funciona (o que vai para o JavaScript)

1. **Regiões.** k-means (48 cores) sobre os pixels chapados, em Lab mais o alfa; cada pixel vai para a cor mais
   perto; os pixels ligados da mesma cor formam uma região.
2. **Limpeza.** Vizinhas parecidas se juntam (ΔE < 3). Regiões finas que são só o serrilhado entre duas vizinhas
   (a cor média é uma mistura das duas) se desfazem nelas. Regiões pequenas e fracas (pixels × ΔE < 300) se juntam
   à vizinha mais parecida. Uma região com sombreado dentro (erro > 4 ΔE) se divide em duas.
3. **Degradês.** Vizinhas separadas por uma borda suave (sem salto de cor entre pixels) se juntam enquanto uma
   rampa explica as duas. Uma região que muda de cor de verdade sai com `gradient linear`: as paradas são as médias
   dos pixels em faixas ao longo da direção da mudança, e o degradê só fica se errar menos que a cor chapada.
4. **Transparência.** O alfa é a 4ª coordenada da cor; as regiões semitransparentes (sombras, brilhos) saem
   `#rrggbbaa` e são desenhadas primeiro.
5. **Empilhar.** Da maior para a menor (pela caixa em volta). Cada região continua 3 px por baixo das que vêm
   depois, então cada borda entre duas cores é traçada uma vez só, pela de cima, sem fresta. Buracos que só têm
   regiões de depois são tapados; os que mostram o fundo ou uma região de antes viram `cut=`.
6. **Bordas.** Num pixel de borda, a parte da cor da região vem de desmisturar as duas cores (ou do alfa, contra o
   fundo); o contorno passa onde essa parte é 0,5 (marching squares com interpolação). Centro dos pixels em +0,5.
7. **Pontos.** Os menos pontos possíveis cuja curva lisa do Weasel (a conta do `geom.smoothSegs`) fica a até 0,5 px
   da borda; onde a borda fica escondida embaixo de outra região, a folga é 1,5 px.

Testado e deixado de fora (o diário tem os números): suavizar a imagem antes, a cor pura nas regiões finas (os
bigodes do tigre melhoram, mas as dobras da atadura do soldado e as bordas do gato pioram), e o desfoque de 0,5 px
na camada (melhora o número, amolece o desenho: fica como opção).

## O que dá para reaproveitar no Weasel

- **O ajuste das curvas:** `js/simplify.js` (o Simplificar, 1.57.0) já encaixa a curva lisa do Weasel num contorno
  denso, dentro de uma tolerância, com `!` nos cantos (`freehand`, sobre o `fit`). Falta aceitar uma tolerância
  por ponto (a folga maior onde a borda fica escondida).
- **O contorno:** `js/pathops.js` segue contornos (marching squares) numa grade de sim/não. O traçado precisa da
  versão com nível num campo contínuo; ela fica no módulo novo ou generaliza a do `pathops`.
- **A leitura da imagem:** a linha de comando já lê PNG, JPG e WebP pelo `loadImage` do `cli/runtime.js` (é o que
  o `--refs` usa); no navegador, a `ref` já está carregada.
- **Fora da tela:** o `js/worker.js` já faz a exportação e as miniaturas dos estilos (`js/ui-style.js`) fora da
  página, com progresso e "um pedido novo abandona o anterior". O traçado vira mais um pedido dele.
- **Nomes livres:** o editor já escolhe `color1…`, `gradient1…` e `_hole` sem repetir (`js/ui-props.js`,
  `js/ui-draw.js`, `js/ui-paths.js`).

## As escolhas (20/11/2026)

1. **JavaScript**, num módulo novo `js/trace.js`, carregado como os outros (`cli/runtime.js` e a página). O Python
   continua em `.claude/vetorizar/` como laboratório: o `rodar.py` passa a medir também a versão JS.
2. **O nome:** "Traçado de imagem", como no Illustrator (Objeto › Traçado de imagem).
3. **Linha de comando:** a imagem é a entrada, sem opção nova para ligar o traçado.
4. **Editor:** o traçado é feito sobre uma `ref` (imagem guia) do desenho.

## Etapa 1: o módulo e a linha de comando

```
node cli/weasel.js imagem.png -o desenho.weasel
```

- **Entrada imagem** (`.png`, `.jpg`, `.jpeg`, `.webp`): traça e grava código. Sem `-o`, grava `imagem.weasel` ao
  lado da imagem; não grava em cima de um arquivo que já existe sem `--force` (como o `--simplify`).
- **Opções** (só as que mudam o resultado de um jeito que se entende):
  - `--colors <n>` (padrão 48): quantas cores o k-means procura. Menos cores, menos formas.
  - `--tol <px>` (padrão 0,5): quanto a curva pode se afastar da borda. Maior, menos pontos.
  - `--blur <px>` (padrão 0, desligado): `layer … blur=` no desenho todo, para imitar o serrilhado.
  - As outras (juntar, dividir, a massa das pequenas, a folga escondida) ficam por dentro, com os padrões medidos.
- **O arquivo que sai:**
  - Um comentário no topo com a imagem de origem, o tamanho e as opções usadas, para dar para refazer.
  - `canvas L A bg=none`, 1 unidade = 1 px da imagem.
  - A `palette` com `color1…` (cores a menos de 1 ΔE, com o mesmo alfa, dividem o nome), `gradient1…` e os
    buracos `_hole1…`, como os nomes automáticos do editor.
  - Uma camada só (a ordem de pintura é o que faz o desenho dar certo). Para trocar uma cor, troca-se a `palette`.
- **`--info`** (ou a última linha da saída): regiões, degradês, partes semitransparentes, formas, pontos, cores e
  o tempo.
- **Sem a mesma saída do Python, não termina:** nas 12 imagens, o ΔE da versão JS fica a ±0,05 do protótipo, e o
  tempo não passa do dele (hoje 8 a 24 s numa imagem de 1 Mpx, até 72 s numa de 3 Mpx). Se precisar, o k-means
  aprende numa amostra (uns 200 mil pixels) e só a atribuição passa por todos.
- **Teste** (`test/regress.js`): uma imagem pequena feita para o teste (formas chapadas, um degradê, um buraco, uma
  parte semitransparente, uma linha fina), traçada, renderizada e comparada com a imagem: ΔE abaixo de um limite e
  o mesmo `.weasel` sempre (o k-means tem semente fixa).
- **Guia:** a opção nova no capítulo 21 (linha de comando), uma seção "Traçar uma imagem" no capítulo 2 (depois de
  "Desenhar por cima de uma imagem") e a linha no README.
- Versão **1.70.0**.

### Como ficou (1.70.0)

- `js/trace.js` é o porte do `vetorizar.py`, conta por conta, em arrays tipados; o k-means tem semente fixa (a
  mesma imagem dá sempre o mesmo arquivo). Entra no `cli/runtime.js` e na página (para a etapa 2).
- **Fidelidade:** ΔE médio 1,67 nas 12 imagens, igual ao protótipo; cada imagem a ±0,05 dele (o soldado sai 0,06
  melhor). Formas e pontos na mesma faixa (a raposa: 197 formas, contra 182).
- **Tempo:** 1,1 a 2,5 s nas imagens de 1 Mpx (o Python levava 8 a 24 s); o gato (2 Mpx) 6,3 s, contra 38 s; o
  retrato (3,3 Mpx) 8,8 s, contra 72 s. Não precisou da amostra de 200 mil pixels para o k-means.
- **Um tropeço achado na medição:** desenhar a imagem no canvas com tamanho e `imageSmoothingQuality = 'high'`
  filtra os pixels mesmo em 1:1 (o ΔE do tigre subia 0,14 e as formas, 40%). Em 1:1 a imagem entra sem
  reamostrar; o `-s` usa a suavização.
- **As 3 decisões** ficaram como a recomendação: a `ref original "imagem.png" hidden` no arquivo (com `scale=` quando
  há `-s`); acima de 4 Mpx, um aviso que sugere `-s 0.5`; o `--blur` só na linha de comando, desligado.
- **Fora da etapa:** o `--sem-fundo` da skill (tirar o fundo chapado) não entrou na linha de comando; continua só no
  script da skill. (Entrou depois, na 1.72.0: ver "Depois do plano".)
- **Um limite novo, igual no Python:** uma linha fina que cruza uma sombra semitransparente sai quebrada (a linha é
  "semitransparente" pela média do alfa nas bordas, é pintada antes da sombra, e a sombra se divide em duas). Está
  no guia; o teste passa a linha longe da sombra.
- **Teste:** `_tracado` no `test/regress.js` (uma imagem feita pixel a pixel, o texto do traçado como referência, ΔE
  2,3 sobre cinza, e o CLI dando o mesmo traçado que o módulo). O `exemplos/logo_tracado.weasel` (o logo traçado)
  ilustra o capítulo 2 e entra nos testes dos exemplos.

## Etapa 2: o editor (Objeto › Traçado de imagem)

- **Antes de tudo, medir:** abrir no editor o maior resultado (o gato: 5.402 formas, 1,3 MB) e ver digitar, rolar,
  selecionar, o painel de camadas e a vista 3D (com o painel do navegador visível, como manda o plano de desempenho).
  Se o editor não aguentar, isso vira a primeira parte da etapa (ou o controle de detalhe ganha um teto).
- **Com uma `ref` selecionada** (ou a linha do cursor numa `ref`), o menu abre o painel:
  - prévia do traçado ao lado da imagem;
  - dois controles: **Cores** (o `--colors`) e **Detalhe** (o `--tol`, ao contrário: mais detalhe, menos folga);
  - uma barra de progresso; o trabalho é feito no `js/worker.js`, e mexer num controle abandona o pedido anterior;
  - **Enter** aplica, **Esc** desiste (como o painel Simplificar).
- **O resultado** entra como uma camada nova, com um nome livre tirado da `ref` (`rascunho_trace`), logo antes da
  primeira camada do desenho:
  - os pontos já saem na posição, na escala e no giro da `ref` (`x,y`, `scale=`, `rot=`), então o traçado cai em
    cima da imagem;
  - as cores reaproveitam uma cor da `palette` que já existe quando o hex é o mesmo; as outras ganham nomes livres;
  - a `ref` continua no arquivo, como estava (dá para esconder com `hidden` para ver o traçado sozinho);
  - um Ctrl+Z desfaz tudo.
- **Guia:** a seção no capítulo 22 (editor) e, se houver atalho, a folha de atalhos.
- Versão **1.71.0**.

### Como ficou (1.71.0)

**A medida do começo** (Chrome, painel do navegador à vista, o gato da etapa 1: 5.420 formas, 1,3 MB):

| | 1.70.0 | 1.71.0 |
|---|---|---|
| abrir o arquivo | 13 s | 0,4 s |
| uma tecla (num comentário) | 8,6 s | 0,25 s |
| uma tecla dentro de uma forma | (não medida) | 0,25–0,5 s |
| desfazer | 8,8 s | 0,36 s |
| o cursor para outra linha | 1,3 s | 0,16 s |
| escolher uma forma | 2,4 s | 0,14 s |
| o painel Camadas inteiro de novo | 2,0 s | 0,5 s |
| a vista 3D: abrir | 5,7 s | 0,65 s |
| a vista 3D: girar (quadros em 1,5 s, de 180) | 2 | 138 |

- **O editor não aguentava, e isso virou a primeira parte da etapa.** A causa: ler o `value` da caixa de texto
  copia o texto inteiro (0,14 ms com 1,3 MB), e o `lineStart` andava pelo texto do começo até a linha. O painel
  Camadas pede três linhas por forma a cada pintura (o olho, o cadeado e o que dá para arrastar), então o custo
  crescia com o quadrado do arquivo. Agora o editor (`js/editor.js`) guarda o texto e uma tabela com o começo de
  cada linha, refeitas quando o texto muda (toda mudança passa pelo `_take`: a digitação, `setValue`, desfazer,
  `replaceRange`, Tab, comentar, duplicar); o `caret()` acha a linha por busca binária. Não mexe em nada que se vê.
- **A vista 3D** fazia uma tela por linha do painel Camadas, e o navegador trava com milhares de telas em 3D
  (medido: 1.100 e 1.500 giram lisas, 2.200 ainda dá, 3.666 trava em 1 quadro). Acima de **1.500 peças**, as
  camadas com mais linhas viram uma peça só, a camada inteira, até a conta caber; o clique nela acha a forma de
  cima no ponto (pelo contorno, como o clique no desenho), e passar o mouse numa linha do painel acende a peça. Os
  traçados comuns (60 a 1.100 formas) continuam com uma peça por linha.
- **O que ficou como está:** rolar o código do gato custa uns 40–100 ms quando entram linhas novas na faixa pintada
  (as linhas têm, em média, 234 caracteres, e a maior, 5.493); com o painel Camadas, uma tecla numa forma refaz as
  5.420 linhas dele (~0,25 s a mais). Num traçado comum, 5 a 10 vezes menor, isso some.

**O painel** (`js/ui-trace.js`, Objeto › Traçado de imagem…; no botão direito, só quando há um ref para traçar):

- **O ref:** o da linha do cursor, um escolhido, ou o único com a imagem aberta. Sem nenhum, a dica diz como abrir
  uma imagem; com a imagem não guardada no navegador, diz qual abrir. Na prévia de um `def`, o Traçar pede para
  sair dela (como as outras edições de camada).
- **O worker é outro**, `js/trace-worker.js`, só com o `js/trace.js` (o plano dizia `js/worker.js`, que carrega 16
  módulos): mexer num controle encerra o worker e abre outro, então abrir rápido importa. Arrastando um controle, a
  conta espera 250 ms parado. Sem worker (a página aberta como arquivo), a conta roda na página.
- **O tamanho traçado** é o tamanho em que a imagem aparece no desenho: o `scale=` do ref, até 1:1 e até 4 Mpx (o
  mesmo teto do aviso da linha de comando). Com `scale=0.5`, a raposa de 1024² é traçada em 512².
- **Os controles:** Cores de 2 a 256 e Detalhe com a tolerância de 3 px a 0,1 px, os dois numa escala que anda
  devagar no começo; o painel lembra os últimos valores enquanto a página está aberta.
- **A miniatura do traçado** é o desenho de verdade, pelo motor do Weasel (o mesmo `file()` da linha de comando).
  Embaixo, as formas, os pontos, as cores da `palette` (são mais que as Cores: cada região tem a cor média dela) e os
  degradês. Acima de 2.000 formas, um aviso de que o editor fica mais lento.
- **O bloco que entra:** um comentário com o ref e os valores dos controles, as linhas `palette` (8 cores por linha),
  a `layer` e as formas. Vai antes da primeira `layer` do arquivo (com os comentários de cima dela) ou, sem camadas,
  no fim: nos dois casos, logo na frente da camada automática, o lugar mais de trás que uma camada pode ter. O
  cursor vai para a linha da camada (ela passa a ser onde se desenha).
- **Os nomes:** os que o código já usa são todas as palavras dele; os novos são os primeiros livres (`color…`,
  `gradient…`, `_hole…`, e `raposa_trace`, depois `raposa_trace2`). Uma cor da `palette` com o mesmo `#hex` (em
  qualquer grafia: `#abc`, `#aabbcc`, `#aabbccff`) dá o nome dela.
- **No desenho,** o contorno tracejado da imagem que está sendo traçada.
- **`js/trace.js`:** o `trace()` passou a guardar o traçado como lista (degradês, buracos, formas com os pontos) e
  avisa o progresso (as frações medidas em 3 imagens); as linhas saem do `lines()`, que aceita a conta das
  coordenadas e os nomes. Sem eles, as linhas são as de antes: o CLI deu o mesmo arquivo na raposa e no mago, e o
  `_tracado` ficou igual.

**Conferido no editor** (Chrome, porta de teste):

- A raposa num ref com `100,80 scale=0.5 rot=10`: o traçado cai em cima da imagem (silhuetas 99,8% iguais,
  diferença média de 2 níveis de cor). Um Ctrl+Z volta ao texto de antes, igual.
- Com `palette color1=#123456 pelo=#320f04`: a cor `#320f04` do traçado usou `pelo`, e os nomes novos começaram em
  `color2`.
- O gato pelo painel: 5,9 s de conta (o CLI leva 6,3 s), 1,1 s para entrar no código; durante a conta, a página
  pintou 711 quadros, todos até 16 ms (só a miniatura, no fim, levou 112 ms).
- Mexer depressa nas Cores (5 valores em 300 ms) abriu só 2 workers: o primeiro foi encerrado.

## Depois do plano: sem fundo (1.72.0)

Pedido em 20/11/2026, depois da 1.71.0: a versão em JavaScript dá o mesmo resultado que a do Python e é 5 a 10 vezes
mais rápida, mas a skill `imagem-para-weasel` ainda usava o Python para tirar um fundo chapado (o `--sem-fundo`), o
caso comum das imagens geradas sem transparência. Escolha sua: "Texto + sem fundo" (o fundo no Weasel e o texto da
skill atualizado).

- **`js/trace.js`**, opção `noBg`: a conta do `vetorizar.py`, igual. A região com mais pixels na borda da imagem sai
  do desenho se for chapada (sem degradê), opaca e tiver pelo menos metade da borda; saem também as da mesma cor (a
  menos de 3 ΔE) com 10% da borda ou mais (um fundo que a figura divide em dois), mas não um pedaço de pelo branco
  cortado pela beirada. As regiões de cima continuam desfazendo o serrilhado contra a cor dela, e os bolsões de fundo
  fechados dentro da figura ficam. O resultado traz `bg` (a cor, ou `null`), e as regiões contadas são as que ficam.
- **Linha de comando:** `--no-bg` (como os outros `--no-…`). O comentário do topo ganha `# sem fundo: #rrggbb`, a
  mesma linha do script, então o `conferir.py` da skill põe o desenho sobre essa cor antes de comparar. A resposta diz
  `fundo #rrggbb tirado`; sem um fundo chapado, um aviso diz que o traçado ficou com tudo.
- **Editor:** a linha **Fundo** do painel, com a caixa *tirar o fundo chapado*; ao lado, a cor que saiu ou *nenhum*
  (com o aviso embaixo). O comentário do bloco termina com `sem o fundo #rrggbb`. O painel lembra a caixa, como os
  controles.
- **Teste `_tracado`:** a imagem sintética sobre um fundo chapado: o fundo sai com a cor certa, o desenho sobre ela
  fica a ΔE 1,1 da imagem, fora da figura nada é pintado, e o furo do anel (um bolsão) fica. Na imagem transparente,
  `noBg` não muda nada. O CLI com `--no-bg` dá o mesmo traçado, com a linha do topo.

**Conferido contra o Python** (`vetorizar.py --sem-fundo` e `--no-bg` nas mesmas imagens; 6 das 12 de teste postas
sobre um fundo chapado, mais o tigre e o retrato, que já têm fundo branco, e a cachoeira e a paisagem, cenas sem
fundo):

| imagem | fundo (os dois) | ΔE Python | ΔE JS | Python | JS |
|---|---|---|---|---|---|
| raposa sobre branco | `#fffeff` | 0,76 | 0,73 | 13,1 s | 2,4 s |
| mago sobre roxo | `#7a5292` | 0,74 | 0,78 | 12,3 s | 2,5 s |
| baú sobre cinza | `#ecebec` | 0,73 | 0,74 | 14,8 s | 2,5 s |
| soldado sobre branco | `#faf9fa` | 1,02 | 1,01 | 16,4 s | 2,8 s |
| foguete sobre azul-escuro | `#1f223d` | 0,55 | 0,55 | 8,6 s | 1,9 s |
| tigre | `#fefefe` | 3,13 | 3,14 | 4,8 s | 1,0 s |
| retrato | `#ffffff` | 0,96 | 0,96 | 42,4 s | 9,0 s |
| hambúrguer sobre creme | nenhum | 0,89 | 0,88 | 12,1 s | 2,8 s |
| cachoeira | nenhum | 1,16 | 1,21 | 7,1 s | 1,7 s |
| paisagem | nenhum | 0,82 | 0,82 | 8,5 s | 2,0 s |

- O mesmo fundo nas 10 (a mesma cor nas 7 com fundo; nenhum nas 3 sem), o ΔE a ±0,05, e de 4,5 a 6 vezes mais
  rápido (os tempos contam abrir o Python e o Node).
- **O hambúrguer não perde o fundo, nas duas versões:** uma mancha branca atrás dele encosta na borda de cima e corta
  o fundo creme em dois pedaços, e nenhum chega à metade da borda. É a regra do script; mudar a regra seria outra
  conversa. O guia conta esse limite e o de "branco com branco".
- No editor (Chrome, porta de teste): a raposa sobre branco, com a caixa marcada, deu `#fffeff` ao lado da caixa, a
  miniatura com os cantos transparentes, e o bloco sem o branco na `palette`.

## O que fica de fora (por enquanto)

- **Abrir uma imagem como desenho novo pelo editor.** A linha de comando já faz o arquivo novo; no editor, o
  caminho é pôr a imagem como `ref` e traçar.
- **Cortar em peças para animar.** O traçado faz uma figura parada, numa camada, sem ossos. Para um personagem se
  mexer, ele precisa ser dividido em peças, com as partes escondidas completadas (o que o `traca_soldado.py` do
  Zombie Escape Room faz à mão, com um polígono por peça). É um tema grande; fica para uma conversa própria.
- **Trocar o `vetoriza.py` dos jogos.** O ForestPatrol e o Zombie Escape Room continuam com o deles. O
  `traca_soldado.py` depende da estrutura do `vetoriza.py` (a camada de contorno preto), então não troca sozinho.
  Usar o traçado do Weasel nos jogos é uma decisão sua, depois.

## O que faltava decidir (decidido na etapa 1: as três recomendações)

1. **Uma `ref` escondida no arquivo da linha de comando?** O `.weasel` sairia com
   `ref original "imagem.png" hidden` (o caminho a partir do `.weasel`). No editor, basta tirar o `hidden` para
   comparar o traçado com a imagem. O custo: se a imagem mudar de lugar, aparece o aviso `não achei a imagem`.
   Recomendo que sim.
2. **Um teto de tamanho.** Imagens acima de uns 4 Mpx ficam lentas (minutos) e geram arquivos de vários MB.
   Recomendo um aviso acima disso, e o `-s`/`--scale` (que já existe) reduzindo a imagem antes de traçar.
3. **O `--blur` na linha de comando.** Ele melhora o número, mas deixa o desenho menos nítido. Recomendo deixar,
   desligado, só na linha de comando (fora do painel do editor).

## Riscos

- **Velocidade em JavaScript.** Laços em arrays tipados no V8 costumam empatar com o numpy nessas contas. O ponto
  mais pesado é o k-means; a amostra resolve.
- **Memória no navegador.** Uma imagem de 3 Mpx com várias camadas de dados (Lab, rótulos, campos por região) passa
  de 100 MB. No worker, isso não trava a página, mas pode faltar memória em máquinas fracas (de novo, o teto).
- **O editor com milhares de formas** (a medição do começo da etapa 2): resolvido na 1.71.0, ver "Como ficou".
