# Desempenho: imagens, vídeos e sons mais rápidos

**Situação:** análise de 15/11/2026. Os itens 1 a 4 saíram na 1.48.1 (15/11/2026), o item 6 na 1.48.2, o item 5b na 1.48.3, o item 7a na 1.48.4, o item 8 na 1.48.5, o item 5a na 1.48.6, os itens 7d e 7e na 1.48.7 e o item 7b na 1.48.8 (16/11/2026). O item 8b foi testado e não ajuda, e o 2b e o 7c ficaram de lado. Em 17/11/2026, uma segunda análise olhou as versões 1.49 a 1.65 (a interface nova): a linha de comando e o jogo ficaram iguais à 1.48.8, e o editor ganhou o item 9 (9a a 9e), que saiu na 1.65.1. Não sobra nenhum item aberto.

Legenda: ✅ feito · 🔶 feito em parte ou falta fechar · ⬜ falta fazer · ➖ não precisa

## Resumo

| # | Otimização | Onde | Ganho medido | Situação |
|---|---|---|---|---|
| 1 | Recorte (`--trim`) e Godot: o tamanho da imagem fora do laço dos pixels | `export.js` `contentRect`, `rig.js` `alphaBox` | `.tscn` do Cavaleiro: 8,3 → 4,5 s | ✅ 1.48.1 |
| 2 | Filme: um mapa de luz por quadro, dividido entre atores e camadas | `scene.js` `lightMaps` | quadro: 165 → 140 ms | ✅ 1.48.1 |
| 2b | Filme: mapas de luz em resolução menor | `scene.js` `paintMaps` | no máximo ~5 ms por quadro (medido na 1.48.5) | ➖ deixado de lado |
| 3 | Filme: bloom desfocado numa cópia com 1/4 do tamanho | `scene.js` `baseFx` | quadro: 165 → 130 ms | ✅ 1.48.1 |
| 4 | Filme: telas de rascunho do tamanho do desenho | `geom.js` `drawVar`, `scene.js` `drawFxLayer` e `drawCast`, `film.js` `alphaLayer` | 2 + 3 + 4 juntos: 154 → 81 ms por quadro | ✅ 1.48.1 |
| 4b | Filme: a tela da transição (`transLayer`) | `film.js` | — | ➖ o desenho dela é o quadro inteiro |
| 5a | Estilos de arte: ganhar com os itens 2 a 4 | `scene.js` `paintBox` (passes do estilo) | filme com efeitos e atores transparentes: `toon`, `comic`, `manga` −15 a −18% | ✅ 1.48.6 |
| 5b | Estilos de arte: laços por pixel | `art.js` `field`, `noiseP`, `knitLeg`, `mix` do riso | riso −31%, gravura −22%, tricô −18%, retícula −16% | ✅ 1.48.3 |
| 6 | Lip sync automático: mais rápido, menos memória, uma vez só | `audio.js` `lipCues`, `cli/media.js`, `cli/video.js`, `cli/film-worker.js` | 20 min a 48 kHz: 27,4 s e 2,5 GB → 2,2 s e 286 MB por thread | ✅ 1.48.2 |
| 7a | GIF de filme: não guardar todos os quadros na memória; e a memória do canvas com 1 thread | `gif.js`, `cli/gifframe.js`, `cli/video.js`, `cli/film-worker.js` | 20 s em 1080p: 5,3 → 1,5 GB; 5 s com 1 thread: 3,1 → 0,33 GB | ✅ 1.48.4 |
| 7b | GIF: gravar só a área que mudou (opaco) ou só a que aparece (transparente) | `gif.js` `writer` | pintura (`-f build`) −79%, filmes com partes paradas −36 a −70%, sprites −5 a −27%; filmes com câmera ou granulado ~−1% | ✅ 1.48.8 |
| 7c | GIF: cor mais próxima pela cor do pixel, não pelo centro da caixa | `gif.js` | só no degradê escuro sem `--dither`; no GIF de filme, 4× a memória das cores e 8–25 ms a mais por quadro | ➖ deixado de lado |
| 7d | PNG: comprimir nas threads do libuv (`encode`), com os mesmos bytes, em vez de um modo rápido; e o JPG dos quadros de filme com a qualidade certa | `cli/weasel.js`, `cli/video.js` | `.tscn` do Cavaleiro 5,4 → 3,0 s (com o 7e); quadros de filme com 1 thread −68% | ✅ 1.48.7 |
| 7e | Normal map do Godot: desfoque e Sobel lendo a memória em sequência | `normal.js` `boxBlur`, `frame` | folha do Cavaleiro: 3,4 → 2,0 s (−40%) | ✅ 1.48.7 |
| 8 | Filme com várias threads: o limite é a memória; os mapas de luz pintados só onde são lidos | `scene.js` `lightMaps` e `lightPiece`, `film.js` | MP4 de 10 s: `-j 1` 16,7 → 14,0 s, `-j 8` 5,3 → 4,7 s | ✅ 1.48.5 |
| 8b | Filme: telas de rascunho recriadas em vez de limpas, na linha de comando | `scene.js` `cleanCanvas`, `geom.js` `drawVar`, `film.js` `alphaLayer` e `transLayer`, `art.js` `work` | nenhum (dentro do ruído) | ➖ não ajuda |
| 9a | Editor: a coluna da direita isolada (`contain: size`), para o resto da página não a refazer inteira | `css/style.css` `.dock` | recálculo da página (painel escondido): 17–27 → 2–4 ms | ✅ 1.65.1 |
| 9b | Editor: o player só pinta quando o quadro avança | `app.js` `tick` | 2 s tocando o `dash` do cavaleiro: 120 → 31 pinturas | ✅ 1.65.1 |
| 9c | Editor: as linhas do tempo sem ler a largura a cada pintura | `ui-anim.js`, `timeline.js` | sem o recálculo forçado no meio de cada quadro | ✅ 1.65.1 |
| 9d | Editor: os painéis só escrevem o que mudou | `ui-props.js`, `ui-layers.js`, `ui-symbols.js`, `ui-style.js` | a troca de quadro parada não refaz mais o layout à toa | ✅ 1.65.1 |
| 9e | Editor: uma pintura por tecla | `app.js` `onChange` e `reparse` | 2,25 → 1,1 pinturas por tecla | ✅ 1.65.1 |

## Como medir

- O canvas da linha de comando (@napi-rs/canvas) **não desenha na hora**. Ele guarda os comandos e só executa quando alguém lê a tela (pôr a tela em outra, `getImageData`, salvar). Por isso o `node --cpu-prof` culpa `drawImage` e `getImageData` por trabalho feito em outro lugar.
- Para achar a origem real, cronometre cada chamada do canvas e anote quem a fez, ou compare duas versões do motor (A/B) com os mesmos quadros.
- **Regras que apareceram:**
  - Pintar de novo uma tela que já foi **origem** de `drawImage` custa uma cópia inteira dela (1920×1080: 1,3–1,7 ms), mesmo pintando um pedaço pequeno e mesmo com `clearRect` antes. Recriar a tela (`canvas.width = w`, 0,02 ms) evita a cópia. Já pôr em outra tela um pedaço de uma tela que não mudou custa só o pedaço (0,05 ms).
  - Antes se achava que `drawImage` custava pelo tamanho da tela de origem (1920×1080: 1,5–3 ms); era essa cópia, nas telas de rascunho reaproveitadas.
  - Ler `canvas.width` é uma chamada ao código nativo (~100 ns). Nunca dentro de um laço de pixels.
  - O serrilhado do canvas muda com 1/10000 de pixel de deslocamento: bordas soltas com até ~27 níveis de diferença são ruído, não erro.
  - O canvas só devolve a memória das telas e dos pixels lidos (`getImageData`) quando o laço de eventos do Node dá uma volta (`setImmediate`). Num laço que só faz `await` de promessas prontas, nada volta, nem com o GC forçado: ~24 MB por quadro 1080p.
- **Para medir a memória:** um gancho com `node -r` também roda dentro de cada thread. Meça só na thread principal (`isMainThread`), por uma thread à parte, porque a principal pode ficar presa no GIF.
- A máquina varia de carga durante uma sessão: compare só números do mesmo teste.
- **Confira muitos quadros:** uma amostra de 3 quadros pode sair idêntica e outros quadros mudarem (aconteceu no 5a). Use pelo menos 1 a cada 4 quadros de um filme com o que a mudança toca.
- **No navegador, os estilos de arte não se repetem:** o mesmo motor, rodado duas vezes seguidas no Chrome, dá quadros um pouco diferentes com estilo. Não dá para conferir uma mudança nos estilos por lá; só sem estilo.
- **Para ver as threads:** cronometre dentro de cada thread (receber o quadro, render, pixels, cópia) e na principal (espera, ffmpeg). Para separar a máquina do código, rode as mesmas contas com N threads e com N processos.
- **No editor (navegador):**
  - Meça com a página **à vista**. Com o painel do navegador escondido, a página roda em segundo plano: o `requestAnimationFrame` não roda, e os tempos saem de 3 a 10 vezes maiores e mudam muito de uma vez para outra.
  - Compare o código antigo e o novo na mesma sessão, um depois do outro (`git stash`, recarregar), com o mesmo roteiro: a carga da máquina e o tamanho da janela mudam os números.
  - **Recálculo forçado:** ler uma medida (`clientWidth`, `offsetWidth`, `getBoundingClientRect`) logo depois de mudar a página obriga o navegador a refazer o layout ali mesmo, e ele refaz de novo antes de mostrar. No caminho da pintura, guarde as medidas num `ResizeObserver`.
  - **Quem suja o layout:** um `MutationObserver` durante uma pintura mostra cada escrita na página. Trocar um texto pelo mesmo texto também conta.
  - **Quem pesa no layout:** esconda uma parte (`display: none`) e meça o recálculo de novo.
  - O canvas do Chrome desenha na placa de vídeo depois do script: o tempo da pintura no script não conta tudo, mas serve para comparar.

## Os itens

### ✅ 1. Recorte e Godot (1.48.1)

- **Problema:** o laço que procura o desenho lia `img.width` a cada pixel.
- **Feito:** a largura e a altura numa variável, em `contentRect` (`export.js`) e `alphaBox` (`rig.js`).
- **Resultado:** o `.tscn` do Cavaleiro caiu de 8,3 s para 4,5 s; o laço ficou 35× mais rápido.
- **Jogo:** os arquivos saem idênticos byte a byte.

### ✅ 2. Mapas de luz do filme (1.48.1)

- **Problema:** cada ator e cada profundidade refazia os dois mapas de luz do quadro inteiro (~12 ms cada vez, ~7 vezes por quadro).
- **Feito:** no filme, os mapas ficam guardados durante o quadro, pela posição das luzes em pixels do quadro. Uma tela menor lê só o pedaço dela.
- **Diferença:** no máximo 2 níveis de cor. **Jogo:** nada muda (só liga no filme).

### ➖ 2b. Mapas de luz em resolução menor

- Ainda sobram ~2,6 mapas diferentes por quadro (~47 ms).
- Pintar os mapas em meia resolução e ampliar daria uns 35 ms a menos por quadro, mas a luz muda um pouco.
- Depois do item 8, na linha de comando os mapas já são pintados só onde são lidos, então ali o ganho fica menor.
- **Medido de novo na 1.48.5** (`filme.weasel` 1080p, o menor de 3): pular toda a pintura dos mapas, com a luz errada, deixa o quadro só 7,4 ms mais rápido com 1 thread (51,6 → 44,2 ms) e 8% com 8 threads (93,3 → 100,9 quadros/s). Esse é o teto; meia resolução daria uns 5 ms, mudando a luz.
- **Decisão (16/11/2026):** deixado de lado. O ganho é pequeno para mudar a luz.

### ✅ 3. Bloom do filme (1.48.1)

- **Problema:** o bloom desfocava 48 px na resolução cheia (~40 ms por quadro em 1080p).
- **Feito:** no filme, o desfoque é feito numa cópia com 1/4 do tamanho.
- **Diferença:** no máximo 2 níveis. **Jogo:** nada muda.

### ✅ 4. Telas de rascunho do tamanho do desenho (1.48.1)

- **Problema:** o traço com espessura variável transparente, as camadas com efeito, a sombra projetada e a transparência de cada ator usavam uma tela do tamanho do quadro.
- **Feito:** no filme, cada uma tem só o tamanho do que é pintado nela.
- **Ficou de fora:** a tela da transição (`transLayer`), porque o desenho dela é o quadro inteiro.
- **Resultado dos itens 2 + 3 + 4:** quadro do `filme.weasel` de 154 → 81 ms; 10 s de filme de 40,5 → 21,3 s (`-j 1`) e de 11,3 → 7,1 s (`-j 8`).

### ✅ 5a. Estilos de arte ganhando com os itens 2 a 4 (1.48.6)

- Os estilos pesados levavam 400–670 ms por quadro 1080p, contra 135 ms sem estilo. Cada estilo desenha a cena de 2 a 5 vezes (os passes).
- **Já ganhavam:** o cache dos mapas de luz e o bloom rápido.
- **Feito (16/11/2026), só na linha de comando:** `scene.js` `paintBox`: nos passes que pintam a mesma forma (sem luz, sem contorno, textura, faixas de tom), a tela do efeito de cada camada e a da sombra projetada ficam do tamanho do desenho, como no filme sem estilo (item 4). Os passes com traço próprio (`pass.stroke`), que podem pintar além da forma, continuam com o quadro inteiro.
- **Só ajuda em filmes com camadas com efeito, sombra projetada ou atores transparentes.** No `filme.weasel` nada muda: ele não tem nada disso nos passes.
- **Resultado** (filme de teste de luzes 1080p, com fantasma transparente, névoa com profundidade e efeitos; o menor de 5, alternando os motores): `toon` 333 → 277 ms (−17%), `comic` 478 → 406 (−15%), `manga` 550 → 449 (−18%), `silhouette` 80 → 69 (−14%), `woodcut` 508 → 451 (−11%), `engraving` 534 → 481 (−10%). Os outros estilos ficam como estavam.
- **Diferença:** o mesmo ruído de serrilhado do item 4, menor. Em 11 quadros do filme de luzes, os estilos `toon`, `comic`, `manga`, `engraving` e `woodcut` mudam de 9 a 28 pixels no total, no máximo 4 níveis. Os outros 22 estilos, o `filme.weasel` com os 27 estilos e todos os filmes de `test/casos` saem idênticos. Imagens de comparação mostradas em 16/11/2026, junto com as do item 4.
- **No navegador**, os passes continuam com o quadro inteiro, como antes: lá os estilos variam um pouco de uma vez para outra (ver "Como medir"), e não dá para conferir a mudança.
- **Conferido:** o `npm test` e o `--strict` passaram (1007 conferidos, tudo igual); no navegador, o `filme.weasel` e o filme de luzes sem estilo saem iguais à 1.48.5, e os estilos rodam sem erro.
- **Testado e deixado de fora:**
  - A tela da transparência de cada ator do tamanho dele nos passes: mais ~1,7% no total, mas no `manga` e no `woodcut` alguns pixels viram de preto para branco no limiar (até 148 níveis).
  - Os mapas de luz pintados só onde são lidos, nos passes (como no item 8): a imagem sai idêntica, mas não ganha nada (−0,2%).

### ✅ 5b. Estilos de arte: laços por pixel (1.48.3)

- **Feito, com a imagem idêntica:**
  - `field()`: o ângulo de cada par cosseno e seno da textura (bytes de 0 a 255) sai de uma tabela de 256×256, feita uma vez, no lugar de dois `Math.atan2` por ponto.
  - `noiseP()`: com `per` e as células inteiros (o caso de sempre), o resto da divisão é feito em inteiros, sem os oito `%` de ponto flutuante por chamada. Fica 2× mais rápido. Os outros casos seguem a conta antiga.
  - Riso: a mistura das tintas é procurada uma vez por ponto (antes, uma vez por tinta). Os níveis dos canais vêm de uma tabela por alfa, e pontos seguidos da mesma cor não consultam o memo. O `grainLevel` entrou no laço.
  - `knitLeg()`: longe da perna (mais que a meia largura e meio ponto, com folga), sai antes da raiz e do seno. O `% 1` virou `Math.trunc`, com o mesmo resultado.
  - `knitPost()`: a casa de cada coluna é calculada uma vez, e as pontas do V de baixo só são calculadas nas linhas que elas alcançam.
- **Resultado** (quadro 1080p do `filme.weasel`; o menor tempo de 3, alternando o motor antigo e o novo):
  - riso: 815 → 559 ms (−31%);
  - gravura: 654 → 509 ms (−22%);
  - tricô: 931 → 763 ms (−18%);
  - retícula: 307 → 259 ms (−16%);
  - os outros estilos que usam o `noiseP` (xilogravura, giz de cera) ganham pouco, uns 3%.
- **Conferido:**
  - os 27 estilos saem com os mesmos pixels nos 3 quadros do filme;
  - no navegador (Chrome), riso, tricô e gravura saem iguais ao `art.js` antigo;
  - o `npm test` e o `--strict` passaram (1007 conferidos, tudo igual).
- **Ficou de fora:**
  - A ideia de tabelar o "V" do tricô: a posição de cada ponto dentro da casa muda um pouquinho de casa para casa, então a tabela mudaria a imagem.
  - Trocar o `Math.hypot` do tricô por uma conta em JS seria 2,6× mais rápido e igual no Node e no Chrome, mas outros navegadores calculam o hypot de outro jeito.
  - O seno e a raiz do tricô são o que sobra do custo dele.

### ✅ 6. Lip sync automático (1.48.2)

- **Problema:**
  - `lipCues` somava a janela inteira para cada passo, com `Map` dentro do laço: 27 ms por segundo de som a 48 kHz.
  - Guardava 10 cópias filtradas do som inteiro: 20 minutos a 48 kHz dão 2,3 GB **por thread**.
  - Cada thread lia todos os `.wav` do filme e calculava as bocas de novo.
- **Feito:**
  - Arrays no lugar dos `Map`, e as faixas filtradas de duas em duas.
  - A energia de cada janela somada enquanto filtra, sem guardar as faixas, na mesma ordem de antes.
  - As bocas são calculadas uma vez antes de abrir as threads, que recebem tudo pronto e leem só o cabeçalho dos `.wav`.
- **Resultado:**
  - 20 minutos de som a 48 kHz: 27,4 s e 2,5 GB → 2,2 s e 286 MB (o som sozinho ocupa 258 MB). As threads não guardam mais as amostras.
  - Ponta a ponta: 3 s de um filme com 5 minutos de narração (48 kHz, lip sync), com 8 threads: 13,4 s → 1,75 s.
- **Conferido:**
  - as bocas saem iguais às de antes em 15 sons, incluindo vazio, curto e taxas baixas;
  - o `.wav` é lido igual em 47 casos, incluindo arquivos cortados e estragados;
  - a fala da coruja sai igual com 1 e com 4 threads;
  - sem as bocas recebidas, 13 de 20 quadros mudam: as threads usam mesmo as bocas prontas;
  - o `npm test` e o `--strict` passaram (1007 conferidos, tudo igual).

### ✅ 7a. GIF de filme sem os quadros na memória (1.48.4)

- **Problema:**
  - Todos os quadros RGBA ficavam na memória até o fim: ~1 GB a cada 5 s de filme 1080p.
  - Achado junto: com 1 thread, o laço dos quadros não dava volta no laço de eventos, então o canvas não devolvia a memória. Isso valia também para a sequência de PNG.
- **Feito, com o GIF byte a byte igual:**
  - `gif.js`: o `encode` foi dividido em partes, que ele mesmo usa:
    - `histogram` e `sample`: as cores de um quadro de cada vez, para a paleta. As somas são de inteiros, então a ordem não muda nada.
    - `keysOf`: a cor de 15 bits de cada ponto, depois do pontilhado.
    - `writer`: o cabeçalho, um quadro de cada vez, e o fim.
  - `cli/gifframe.js` (novo): cada thread de render devolve o quadro pronto para o GIF: as cores que apareceram (`takeColors`) e as chaves comprimidas (deflate nível 1, ~1/60 do RGBA). Os pixels não viajam entre as threads.
  - `cli/video.js`: com a paleta pronta, cada quadro é descomprimido e gravado direto no arquivo. Com 1 thread, uma volta no laço de eventos a cada quadro.
- **Resultado** (`filme.weasel` em 1080p; o menor tempo de 3, alternando o motor antigo e o novo):
  - 20 s com 8 threads: 5,3 → 1,5 GB, no mesmo tempo (19,6 → 19,9 s). Quase tudo o que sobra é das 8 threads, como no MP4. O GIF guardado ocupa uns 60 MB.
  - 5 s com 8 threads: 2,3 → 1,5 GB, no mesmo tempo (4,9 s).
  - 3 s com pontilhado e 8 threads: 4,1 → 3,3 s.
  - 5 s com 1 thread: 3,1 → 0,33 GB, mas 10,8 → 12,1 s (comprimir e descomprimir, e o canvas agora devolve a memória durante o render).
  - Sequência de PNG, 4 s com 1 thread: 1,7 → 0,26 GB, no mesmo tempo.
- **Conferido:**
  - o GIF sai byte a byte igual com 1, 2, 4 e 8 threads, com pontilhado, transparente, os dois juntos, escala menor, um quadro só e `--shots`;
  - no navegador (Chrome), o `encode` novo dá os mesmos bytes do antigo;
  - os PNGs da sequência saem idênticos;
  - o `npm test` e o `--strict` passaram (1007 conferidos, tudo igual).
- **Ficou de fora:**
  - No editor, o GIF de filme ainda guarda todos os quadros. Dá para guardar só as chaves com as mesmas partes do `gif.js`, com metade da memória.
  - Outros laços da linha de comando que desenham muitos quadros seguidos (as folhas e sequências dos desenhos de jogo) também só devolvem a memória no fim. São curtos, então ficaram como estão.

### ✅ 7b. GIF só com a área que mudou (1.48.8)

- **Problema:** cada quadro do GIF gravava a imagem inteira, mesmo com quase tudo igual ao quadro anterior.
- **Feito, com os mesmos quadros na tela** (`writer` em `gif.js`; vale para o editor e para a linha de comando):
  - Sem transparência: cada quadro grava só o retângulo que mudou desde o anterior, e o resto continua na tela (descarte 1, como antes). O primeiro quadro é inteiro.
  - Com transparência: cada quadro grava só o retângulo onde há desenho. O quadro já some depois de mostrado (descarte 2, como antes).
  - Se nada mudou, o quadro grava um ponto só, igual ao que já está lá.
- **Resultado** (o motor da 1.48.7 e o novo):
  - pintura (`-f build`): a da bola 82 → 17 KB (−79%), a do `contas.weasel` 150 → 30 KB (−80%);
  - filmes de teste com vitral e com transições: −70% e −36%;
  - fantasma −27%; sprites do cavaleiro, do furão e do chefe: −5 a −15%;
  - filmes com câmera andando, granulado ou desenho grande se mexendo: 0 a −1%, porque a tela inteira muda;
  - o tempo fica igual.
- **Tentado e deixado de lado:** dentro da área, gravar como transparente o ponto igual ao do quadro anterior, quando a paleta tem um índice sobrando. O resultado foi misto: o furão com pontilhado foi de −15% para −30%, mas o cavaleiro de −10% para −4%.
- **Conferido:**
  - 17 GIFs (desenhos opacos e transparentes, com pontilhado, sequência, pintura, filmes com e sem threads, transparentes e com pontilhado): um decodificador próprio monta os mesmos quadros, com os mesmos tempos, do motor da 1.48.7;
  - o decodificador do Chrome (`ImageDecoder`) dá os mesmos quadros em 9 GIFs da linha de comando e em 9 do editor (o `gif.js` antigo e o novo na mesma página);
  - as referências `_gif` (o GIF sintético: 5280 → 1990 bytes) e `_janela` (a pintura: 95 → 74 KB) foram regravadas depois de conferir que os quadros são os mesmos;
  - o `npm test` e o `--strict` passaram (1007 conferidos, tudo igual).
- **Ficou de fora:** GIFs transparentes com desenho grande que se mexe (coruja, filmes com `-t`) quase não ganham. Gravar só o que mudou neles pediria saber o quadro seguinte antes de gravar o atual, para escolher o descarte.

### ➖ 7c. Cor mais próxima no GIF

- **Ideia:** escolher a cor da paleta pela cor real do ponto, e não pelo centro da caixa de 5 bits, para ter menos faixas.
- **Medido (16/11/2026)**, pela qualidade (PSNR) em 5 casos (filme, noite, cavaleiro, cenário, estilo tom):
  - pela cor real, com as caixas de 5 bits: +1,3 a +3 dB;
  - com caixas de 6 bits e a cor real (a melhor): +1,6 a +7 dB; no filme, 43,9 → 46,4 dB.
- **Na imagem:** só aparece no degradê escuro sem `--dither`: os degraus em volta da lua do `filme.weasel` diminuem. Com `--dither`, o de hoje já fica tão bom quanto.
- **Custo no GIF de filme:**
  - as cores guardadas de cada quadro 1080p passam de 138 para 529 KB (20 s: ~66 → ~254 MB);
  - escolher as cores fica 8 a 25 ms mais lento por quadro, na thread principal.
  - Fazer só no GIF de desenho deixaria o GIF de filme da linha de comando diferente do editor.
- **Decisão (16/11/2026):** deixado de lado. Para menos faixas, use `--dither`.

### ✅ 7d. PNG comprimido nas threads do libuv (1.48.7)

- **Ideia antiga:** um modo rápido (zlib nível 1), como opção, com arquivos maiores.
- **Medido (16/11/2026):** um PNG próprio (filtro Up e zlib nível 1) sai 2 a 3× mais rápido que o encoder do canvas, mas com arquivos 27–60% maiores; a imagem do cenário dobra (45 → 91 KB). Escolher o filtro de cada linha, como o canvas faz, fica mais lento em JS que o próprio canvas.
- **Achado:** o @napi-rs/canvas tem `canvas.encode('png')`, que comprime numa thread do libuv e dá **os mesmos bytes** do `toBuffer`. Várias imagens comprimem juntas, e o próximo quadro é desenhado enquanto o anterior comprime. Com isso, a opção não faz falta.
- **Feito, com os mesmos bytes (só na linha de comando):**
  - `cli/weasel.js`:
    - os pacotes do Godot (`.tscn` e `.tres`, com esqueleto ou não) comprimem as imagens juntas (`encodeAll`);
    - a folha com `--normal` comprime as duas imagens juntas, depois do normal map, que lê a folha;
    - `--frames` de desenho desenha os próximos quadros enquanto os anteriores comprimem.
  - `cli/video.js`: os quadros de filme em PNG e JPG com 1 thread (`--jobs 1`, ou filme com menos de 48 quadros) fazem o mesmo.
  - Nos dois, até `ENCODES` (4, o tamanho do grupo de threads do libuv) por vez, salvos na ordem.
  - Com várias threads, nada muda: cada thread já comprime o seu quadro. Passar a compressão para o grupo do libuv, que tem 4 threads para o processo todo, disputaria com o render.
- **Resultado** (o menor de 5, alternando o motor da 1.48.6 e o novo):
  - `.tscn` do Cavaleiro: 5,4 → 3,0 s (−44%, junto com o 7e);
  - folha da coruja com `--normal`: 3,4 → 2,4 s (−27%, junto com o 7e);
  - 4 s do `filme.weasel` em PNG 1080p com `--jobs 1`: 27,0 → 8,7 s (−68%). Com 8 threads, continua 2,4 s;
  - `--frames` do furão (`walk_down`, `-s 4`): 290 → 214 ms (−26%).
- **Conferido:**
  - 348 arquivos exportados com o motor da 1.48.6 e com o novo, todos iguais byte a byte:
    - pacotes do Godot com e sem esqueleto, tileset;
    - folhas com normal map, zip;
    - quadros de desenho em PNG e JPG;
    - quadros de filme com 1 e com várias threads, com estilos.
  - No zip, só a hora gravada muda; os arquivos de dentro são iguais.
  - Quadros de 7 filmes comprimidos enquanto o próximo era desenhado: 0 diferenças.
  - O `npm test` e o `--strict` passaram (1007 conferidos, tudo igual).
- **Achado no caminho e corrigido (bug, não desempenho):**
  - Os quadros de filme em JPG (`--frames` com `.jpg`) saíam com qualidade 0,92 numa escala de 1 a 100, ou seja, ~1. O `cli/video.js` dividia o `--quality` por 100 (desde a 1.3), e o canvas espera de 1 a 100.
  - Um quadro 1080p saía com 13 KB e blocos grandes, em vez de 55 KB. O quadro único de filme e os desenhos já usavam 92.
  - Agora a sequência usa o `--quality` como ele é. O quadro 150 da sequência sai igual, byte a byte, ao mesmo quadro exportado sozinho (`--frame 150`), com e sem threads, e com `-q 50` também.
  - Os bytes desses JPGs mudam; nenhum teste guarda JPG de filme.

### ✅ 7e. Normal map do Godot (1.48.7)

- **Problema:** 2,3 s para os 60 quadros do Cavaleiro.
- **Medido, por partes (folha do Cavaleiro):**
  - O desfoque (`boxBlur`) andava a coluna inteira para cada ponto na passada vertical, lendo a memória aos saltos.
  - O Sobel pegava os vizinhos com uma função e `Math.min`/`Math.max` a cada ponto.
- **Feito, com os mesmos bytes:**
  - `boxBlur`: a passada vertical anda linha a linha, com uma soma por coluna, lendo a memória em sequência. A ordem das contas é a de antes, por isso o resultado não muda.
  - `frame` (Sobel):
    - as linhas e colunas vizinhas (presas à borda) são calculadas uma vez por linha e por ponto;
    - onde o quadro colorido é transparente, o ponto fica 0,0,0,0 sem fazer a conta. A tela guarda a cor multiplicada pela transparência, então essa cor sumiria de qualquer jeito.
- **Resultado** (`W.normal.sheet`, o menor de 5, alternando o motor antigo e o novo):
  - Cavaleiro (60 quadros, 6418×5138): 3353 → 2003 ms (−40%);
  - coruja (48 quadros, 3376×3376): 1690 → 1369 ms (−19%);
  - fantasma (32 quadros, 2894×2414): 668 → 475 ms (−29%).
- **Conferido:**
  - 37 arquivos de 11 pacotes do Godot, iguais byte a byte com o motor da 1.48.5. São 11 normal maps:
    - folhas do `.tscn` e do `-f godot --normal`;
    - tilesets e pixel art;
    - esqueletos com dobra, passada, pinos e virada;
    - escala 0,5.
  - No navegador (Chrome), o normal map do cavaleiro, da coruja, do fantasma e do chefe sai com os mesmos pixels do antigo.
  - O `npm test` e o `--strict` passaram.
- **Ficou de fora:** o resto do tempo é a altura de cada parte do Cavaleiro:
  - pintar a máscara (~310 ms);
  - a distância (~210 ms);
  - o desfoque (~220 ms);
  - preencher os buracos (~130 ms).

### ✅ 8. Escala das threads no filme (1.48.5)

- **Problema:** com 8 threads, o filme saía só 3× mais rápido que com 1.
- **Achado:**
  - As threads ficam ocupadas 97% do tempo. A fila, a abertura do filme em cada thread (~0,1 s), a cópia dos pixels (2,6 ms de ~137 ms por quadro) e a thread principal (4 ms por quadro para o ffmpeg) quase não pesam. Mandar 2 quadros por thread não ajuda no MP4.
  - O limite é a memória da máquina. O mesmo render em N threads ou em N processos escala igual (4,25× com 8). Contas puras escalam ~14× com 16 threads; cópias de memória, só ~1,7×. Um quadro demora mais quanto mais threads rodam: 63 ms com 1, 87 ms com 4, 116 ms com 8.
  - A luz é metade do quadro. O `filme.weasel` pintava 4 pares de mapas de luz por quadro (8 telas 1080p inteiras), mas só lia ~1,22 tela deles.
  - O ffmpeg divide a máquina com as threads: sem ele, 66 quadros/s; com ele, 54.
- **Feito, com os quadros idênticos (só na linha de comando):**
  - `film.js`: cada grupo de camadas calcula a caixa do que as camadas com luz pintam (`S.plateBox`) e a passa para `drawScene` como `lightBox`.
  - `scene.js` `lightMaps`: no filme, não pinta mais na hora. Só guarda a luz e a matriz de quem pediu o mapa primeiro. Quem divide o mapa (a mesma `lightKey`) recebe a pintura com essa mesma matriz; com a matriz de quem pediu depois, a luz mudava 1 nível.
  - `scene.js` `lightPiece`: pinta os dois mapas só na caixa pedida, com 2 pixels de folga e um recorte retangular, e guarda o pedaço. Um pedido fora dos pedaços já pintados ganha um pedaço novo. Se a caixa é quase o quadro inteiro, pinta inteiro.
  - As telas dos pedaços são recriadas (`canvas.width = w`) em vez de limpas, para não pagar a cópia do canvas (ver "Como medir").
  - A luz `spot` é pintada inteira: o recorte em arco dela, junto com o retangular, muda os pixels da borda.
  - No navegador, os mapas continuam inteiros, como antes: lá o recorte retangular muda o degradê em até 2 níveis.
- **Resultado:**
  - Só o render, 240 quadros 1080p: 8 threads 65 → 78 quadros/s (+19%), 4 threads 42 → 51 (+22%); 1 thread ~76 → 54 ms por quadro.
  - MP4 de 10 s do `filme.weasel` (o menor tempo de 3, alternando o motor antigo e o novo): `-j 1` 16,7 → 14,0 s, `-j 4` 6,3 → 5,5 s, `-j 8` 5,3 → 4,7 s.
  - O filme fica mais rápido com qualquer número de threads, mas a razão entre 1 e 8 threads continua perto de 3×: com 1 thread também ganhou, e o resto do quadro e o ffmpeg ainda disputam a memória.
- **Conferido:**
  - todos os quadros do `filme.weasel` (492), de um filme de teste com luzes `point`, `spot` e `dir`, atores transparentes, névoa e profundidade (e uma versão com cada luz sozinha), e de todos os filmes de `test/casos`, com o motor antigo e o novo: 0 diferenças;
  - no navegador (Chrome), o `filme.weasel` e o filme de luzes saem iguais com o motor antigo e o novo;
  - o `npm test` e o `--strict` passaram (1007 conferidos, tudo igual).
- **Tentado e deixado de lado:** juntar o recorte de todas as luzes numa passada só (muda 491 quadros, sem ganho).
- **Ficou de fora:**
  - Pôr a luz por cima de cada camada (`lightRaster`) ainda custa ~14 ms por quadro com 1 thread e ~38 ms com 8.
  - O item 8b, abaixo.

### ➖ 8b. Telas de rascunho recriadas na linha de comando

- **Ideia:** as telas de rascunho reaproveitadas podiam pagar a mesma cópia do canvas do item 8, e recriá-las (`width =`) evitaria a cópia.
- **Testado (16/11/2026):** um protótipo recriou, só na linha de comando, todas as telas reaproveitadas no caminho do filme: `scratch`/`cleanCanvas` (`scene.js`), as duas do `drawVar` (`geom.js`), `alphaLayer` e `transLayer` (`film.js`) e `work` (`art.js`). Os quadros saíram idênticos.
- **Resultado:** nenhum ganho (o menor de 3, alternando o motor da 1.48.5 e o protótipo):
  - `filme.weasel` 1080p: 53,5 → 54,0 ms por quadro com 1 thread; 85,9 → 85,1 quadros/s com 8.
  - Os 27 estilos de arte no `filme.weasel` 1080p: 6933 → 6900 ms somados (−0,5%). Cada um ficou entre −10% e +10%, dentro do ruído.
  - Os filmes de `test/casos` e o filme de teste de luzes: todos dentro de ±6%.
- **Por quê, provavelmente:** a cópia só acontece quando a tela é pintada de novo enquanto o quadro ainda guarda um desenho dela por fazer. As telas reaproveitadas dentro do mesmo quadro já têm o tamanho do desenho (item 4), então a cópia é pequena. De um quadro para o outro, o quadro já foi lido, e não há o que copiar.
- **Decisão:** o código fica como está.

### ✅ 9. O editor depois da interface nova (1.65.1)

A segunda análise (17/11/2026) comparou a 1.48.8 com a 1.65.0. Na linha de comando, tudo ficou dentro do ruído (±10%): filme em WebM com 1 thread e com várias, GIF de um plano, folha e `.tscn` do cavaleiro, GIF da coruja. O motor quase não mudou nessas versões. O que pesava era o editor: a coluna da direita (Propriedades, Camadas, Amostras, Símbolos, Acabamento e estilo) e as linhas do tempo, que entraram com o plano da interface.

- **9a. A coluna da direita isolada:**
  - **Problema:** a cada recálculo da página, o navegador refazia a coluna inteira, mesmo quando o que mudou foi só o rótulo do quadro no player. Com o painel escondido, isso custava de 14 a 27 ms a cada vez; sem a coluna, ~2 ms.
  - **Feito:** `contain: size` no `.dock`. A largura dela já é fixa (250 px) e a altura vem da grade, então o tamanho não depende do que tem dentro, e mexer fora dela não a refaz. O `contain: layout` sozinho não adianta; o `strict` também prenderia os menus de posição fixa dentro da coluna.
  - **Resultado:** o recálculo cai para 2–4 ms com o painel escondido e de 2,1 para 0,4 ms com a página à vista.
- **9b. O player só pinta quando o quadro avança:**
  - **Problema:** o `tick` pintava em toda volta da tela. Numa animação de 12 fps numa tela de 60 Hz, 4 de cada 5 pinturas repetiam o quadro, e cada uma passava pelos 7 painéis. Vinha da 1.0; com os painéis, ficou caro.
  - **Feito:** tocando, a tela pinta quando o quadro, a animação ou o tocar/parar mudam. A pintura passo a passo, que anda pelo tempo, continua pintando em toda volta. Quem muda outra coisa com o player andando (o código, a variante, a escolha) já pintava por conta própria.
- **9c. As linhas do tempo sem ler a largura:**
  - **Problema:** a da animação (`ui-anim.js`) e a do filme (`timeline.js`) liam a largura da caixa a cada pintura, logo depois de o player trocar o rótulo do quadro. Isso obrigava um recálculo no meio do quadro, e o navegador fazia outro antes de mostrar. A pintura da linha do tempo em si custa ~1,8 ms.
  - **Feito:** a largura vem do `ResizeObserver` de cada uma. Antes da primeira medida (a caixa acabou de aparecer), ela lê como antes.
- **9d. Os painéis só escrevem o que mudou:**
  - **Problema:** a cada pintura, os painéis escreviam de novo os mesmos valores: 13 dicas nas Camadas, 4 botões dos Símbolos, os textos de exemplo de Propriedades e a lista de cores dos campos (refeita inteira). Na troca de quadro parada, o painel Acabamento e estilo trocava dois textos pelos mesmos, e isso refazia o layout da página.
  - **Feito:** cada um compara antes de escrever.
  - Achado junto: o código antigo criava `placeholder=""` vazio em 5 campos de Propriedades, ao escrever o texto de exemplo nele mesmo. Agora eles ficam sem o atributo; na tela, nada muda.
- **9e. Uma pintura por tecla:**
  - **Problema:** a cada tecla, o editor chama o `onChange` (que refazia o modelo e pintava) e logo depois o `onCaret` (que pintava de novo, com o cursor novo).
  - **Feito:** o `onChange` refaz o modelo e os painéis sem pintar (`reparse(false)`), e a pintura fica com o `onCaret`, que o editor sempre chama em seguida (`Editor._emit`). As outras chamadas do `reparse` continuam pintando.
- **Resultado** (Chrome, página à vista, tela de 120 Hz; o código da 1.65.0 e o novo na mesma sessão, com o mesmo roteiro):

  | Medida | Cavaleiro (`dash`, cursor numa forma) | Filme (quadros 390 a 411, cursor num ator) |
  |---|---|---|
  | quadro que avança (rótulo e pintura) | 4,8 → 1,3 ms | 5,2 → 2,7 ms |
  | tecla | 15,0 → 9,5 ms (2,25 → 1,1 pinturas) | 15,6 → 8,8 ms |
  | 2 s tocando: voltas da tela | 120 → 233 | 105 → 215 |
  | 2 s tocando: pinturas | 120 → 31 | 105 → 45 |
  | 2 s tocando: tempo ocupado no laço | 468 → 73 ms | 431 → 125 ms |

  Com o código antigo, o player caía para ~60 voltas por segundo numa tela de 120 Hz; agora acompanha a tela.
- **Conferido:**
  - o palco e as linhas do tempo saem com os mesmos pixels do código antigo: 12 quadros do `dash` e um com o cursor numa forma no cavaleiro (o palco e a linha do tempo da animação), e 5 quadros do `filme.weasel` (o palco e a linha do tempo do filme);
  - a coluna fica do mesmo tamanho, com a mesma rolagem;
  - depois de uma tecla, a tela é igual à de uma pintura nova, e o Ctrl+Z volta à imagem de antes;
  - tocando, a primeira volta pinta o quadro sem as alças, e a volta que para pinta de novo com elas;
  - a pintura passo a passo pinta em toda volta (61 de 61) e anda;
  - as duas linhas do tempo acompanham a largura da janela e a troca entre desenho e filme;
  - o `npm test` e o `--strict` passaram (1048 conferidos, tudo igual).
- **Medido e deixado como está:**
  - O texto colorido do código: são ~630 trechos coloridos nas linhas à vista, e refazer o layout deles custa 17–35 ms por tecla com o painel escondido. Com a página à vista, a tecla inteira custa ~9 ms, então não vale mexer.
  - A vista 3D e o Palco já esperam o tempo que a última pintura levou antes de pintar de novo. Refazer as placas do cavaleiro custa ~5 ms.
  - As miniaturas dos estilos já saem no worker, só com a galeria à vista e meio segundo depois de o código parar.
  - O filme parado parecia mais caro que tocando numa medida da análise; isso não se repetiu (4–5 ms por quadro nos dois casos).

## Conferências pendentes

Nenhuma. A prévia do filme no editor do navegador, que tinha ficado sem conferir depois da 1.48.1, foi usada e conferida nas etapas 7a, 7b e 7c do plano da interface (1.62.0 a 1.64.0, em 16/11/2026) e de novo na 1.65.0, com o `filme.weasel`.

## O que já está bom

- A geometria e o JS do motor por quadro.
- A paleta e o LZW do GIF.
- Os caches da câmera com `lag` e do `speed=auto`.
- No editor: a vista 3D (que espera o tempo da última pintura) e as miniaturas dos estilos (no worker).

## Ordem sugerida para o que falta

Nenhum item aberto. O que ficou de fora de cada item está na seção dele.
