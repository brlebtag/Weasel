# Traçado de imagem

**Situação:** plano aprovado em 20/11/2026 (JavaScript, "Traçado de imagem", a imagem como entrada na linha de
comando, no editor sobre uma `ref`). Nada feito ainda. Antes de cada etapa, ela é explicada de novo e só começa com
o seu "pode fazer".

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

## O que fica de fora (por enquanto)

- **Abrir uma imagem como desenho novo pelo editor.** A linha de comando já faz o arquivo novo; no editor, o
  caminho é pôr a imagem como `ref` e traçar.
- **Cortar em peças para animar.** O traçado faz uma figura parada, numa camada, sem ossos. Para um personagem se
  mexer, ele precisa ser dividido em peças, com as partes escondidas completadas (o que o `traca_soldado.py` do
  Zombie Escape Room faz à mão, com um polígono por peça). É um tema grande; fica para uma conversa própria.
- **Trocar o `vetoriza.py` dos jogos.** O ForestPatrol e o Zombie Escape Room continuam com o deles. O
  `traca_soldado.py` depende da estrutura do `vetoriza.py` (a camada de contorno preto), então não troca sozinho.
  Usar o traçado do Weasel nos jogos é uma decisão sua, depois.

## O que falta decidir

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
- **O editor com milhares de formas** (a medição do começo da etapa 2).
