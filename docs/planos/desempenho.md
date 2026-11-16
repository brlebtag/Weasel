# Desempenho: imagens, vídeos e sons mais rápidos

**Situação:** análise de 15/11/2026. Os itens 1 a 4 saíram na 1.48.1 (15/11/2026), o item 6 na 1.48.2, o item 5b na 1.48.3 e o item 7a na 1.48.4 (16/11/2026). O resto está aberto.

Legenda: ✅ feito · 🔶 feito em parte ou falta fechar · ⬜ falta fazer · ➖ não precisa

## Resumo

| # | Otimização | Onde | Ganho medido | Situação |
|---|---|---|---|---|
| 1 | Recorte (`--trim`) e Godot: o tamanho da imagem fora do laço dos pixels | `export.js` `contentRect`, `rig.js` `alphaBox` | `.tscn` do Cavaleiro: 8,3 → 4,5 s | ✅ 1.48.1 |
| 2 | Filme: um mapa de luz por quadro, dividido entre atores e camadas | `scene.js` `lightMaps` | quadro: 165 → 140 ms | ✅ 1.48.1 |
| 2b | Filme: mapas de luz em resolução menor | `scene.js` `paintMaps` | uns 35 ms a menos por quadro (estimado) | ⬜ |
| 3 | Filme: bloom desfocado numa cópia com 1/4 do tamanho | `scene.js` `baseFx` | quadro: 165 → 130 ms | ✅ 1.48.1 |
| 4 | Filme: telas de rascunho do tamanho do desenho | `geom.js` `drawVar`, `scene.js` `drawFxLayer` e `drawCast`, `film.js` `alphaLayer` | 2 + 3 + 4 juntos: 154 → 81 ms por quadro | ✅ 1.48.1 |
| 4b | Filme: a tela da transição (`transLayer`) | `film.js` | — | ➖ o desenho dela é o quadro inteiro |
| 5a | Estilos de arte: ganhar com os itens 2 a 4 | `art.js` (passes do estilo) | gravura: 886 → 403 ms no protótipo | 🔶 ganham o cache de luz e o bloom; as telas do tamanho do desenho ficam desligadas nos passes |
| 5b | Estilos de arte: laços por pixel | `art.js` `field`, `noiseP`, `knitLeg`, `mix` do riso | riso −31%, gravura −22%, tricô −18%, retícula −16% | ✅ 1.48.3 |
| 6 | Lip sync automático: mais rápido, menos memória, uma vez só | `audio.js` `lipCues`, `cli/media.js`, `cli/video.js`, `cli/film-worker.js` | 20 min a 48 kHz: 27,4 s e 2,5 GB → 2,2 s e 286 MB por thread | ✅ 1.48.2 |
| 7a | GIF de filme: não guardar todos os quadros na memória; e a memória do canvas com 1 thread | `gif.js`, `cli/gifframe.js`, `cli/video.js`, `cli/film-worker.js` | 20 s em 1080p: 5,3 → 1,5 GB; 5 s com 1 thread: 3,1 → 0,33 GB | ✅ 1.48.4 |
| 7b | GIF: gravar só a área que mudou | `gif.js` | arquivos bem menores | ⬜ muda os bytes |
| 7c | GIF: cor mais próxima pela cor do pixel, não pelo centro da caixa | `gif.js` | menos faixas | ⬜ muda os bytes |
| 7d | PNG: modo rápido, como opção | encoder do canvas | 3× mais rápido, arquivo 25–40% maior | ⬜ |
| 7e | Normal map do Godot | `normal.js` | 2,3 s em 60 quadros; 20–30% a menos | ⬜ |
| 8 | Filme com várias threads: por que 8 threads rendem só 3× | `cli/video.js` (a fila e o envio dos quadros) | 1.48.1: `-j 1` 21,3 s, `-j 8` 7,1 s | ⬜ investigar |

## Como medir

- O canvas da linha de comando (@napi-rs/canvas) **não desenha na hora**. Ele guarda os comandos e só executa quando alguém lê a tela (pôr a tela em outra, `getImageData`, salvar). Por isso o `node --cpu-prof` culpa `drawImage` e `getImageData` por trabalho feito em outro lugar.
- Para achar a origem real, cronometre cada chamada do canvas e anote quem a fez, ou compare duas versões do motor (A/B) com os mesmos quadros.
- **Regras que apareceram:**
  - `drawImage` de uma tela custa pelo tamanho da tela de **origem**, mesmo copiando um pedaço pequeno (1920×1080: 1,5–3 ms; uma tela do tamanho do desenho: 0,02 ms).
  - Ler `canvas.width` é uma chamada ao código nativo (~100 ns). Nunca dentro de um laço de pixels.
  - O serrilhado do canvas muda com 1/10000 de pixel de deslocamento: bordas soltas com até ~27 níveis de diferença são ruído, não erro.
  - O canvas só devolve a memória das telas e dos pixels lidos (`getImageData`) quando o laço de eventos do Node dá uma volta (`setImmediate`). Num laço que só faz `await` de promessas prontas, nada volta, nem com o GC forçado: ~24 MB por quadro 1080p.
- **Para medir a memória:** um gancho com `node -r` também roda dentro de cada thread. Meça só na thread principal (`isMainThread`), por uma thread à parte, porque a principal pode ficar presa no GIF.
- A máquina varia de carga durante uma sessão: compare só números do mesmo teste.

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

### ⬜ 2b. Mapas de luz em resolução menor

- Ainda sobram ~2,6 mapas diferentes por quadro (~47 ms).
- Pintar os mapas em meia resolução e ampliar daria uns 35 ms a menos por quadro, mas a luz muda um pouco.
- **A decidir:** se vale só no filme, e se a diferença aparece.

### ✅ 3. Bloom do filme (1.48.1)

- **Problema:** o bloom desfocava 48 px na resolução cheia (~40 ms por quadro em 1080p).
- **Feito:** no filme, o desfoque é feito numa cópia com 1/4 do tamanho.
- **Diferença:** no máximo 2 níveis. **Jogo:** nada muda.

### ✅ 4. Telas de rascunho do tamanho do desenho (1.48.1)

- **Problema:** o traço com espessura variável transparente, as camadas com efeito, a sombra projetada e a transparência de cada ator usavam uma tela do tamanho do quadro.
- **Feito:** no filme, cada uma tem só o tamanho do que é pintado nela.
- **Ficou de fora:** a tela da transição (`transLayer`), porque o desenho dela é o quadro inteiro.
- **Resultado dos itens 2 + 3 + 4:** quadro do `filme.weasel` de 154 → 81 ms; 10 s de filme de 40,5 → 21,3 s (`-j 1`) e de 11,3 → 7,1 s (`-j 8`).

### 🔶 5a. Estilos de arte ganhando com os itens 2 a 4

- Os estilos pesados levavam 400–670 ms por quadro 1080p, contra 135 ms sem estilo. Cada estilo desenha a cena de 2 a 5 vezes.
- **Já ganham:** o cache dos mapas de luz e o bloom rápido.
- **Não ganham:** as telas do tamanho do desenho ficam desligadas nos passes dos estilos, porque um estilo pode pintar além da forma (traço tremido, hachura).
- **Falta:** medir os estilos de novo na 1.48.1 e ver se dá para ligar as telas pequenas em alguns passes.

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

### ⬜ 7. Menores

- **7b. GIF só com a área que mudou:** os GIFs ficam bem menores, mas os bytes mudam, e as referências `_gif` dos testes precisam ser refeitas.
- **7c. Cor mais próxima no GIF:** hoje usa o centro da caixa de 5 bits, não a cor real do pixel, o que cria faixas. Também muda os bytes.
- **7d. PNG rápido:** o encoder do canvas equivale ao zlib nível 6 (93 ms por quadro 1080p; 0,7–1 s por folha grande). Um modo rápido seria 3× mais rápido, com arquivos 25–40% maiores. Só como opção.
- **7e. Normal map do Godot:** 2,3 s em 60 quadros; dá para ganhar uns 20–30%.

### ⬜ 8. Escala das threads no filme

- Na 1.48.1, 8 threads fazem o filme só 3× mais rápido que 1 (antes, 3,6×). O ffmpeg sozinho faz 170 quadros/s, então não é ele.
- **A investigar:** a fila de quadros prontos (`eachFrame`), a cópia dos pixels entre as threads e o tempo de cada thread abrindo o filme.
- **Achado no 7a:** a thread principal só manda o próximo quadro para uma thread quando lê a resposta dela. Enquanto a principal trabalha, as threads que terminaram ficam paradas. Mandar 2 quadros por thread deve ajudar.

## Conferências pendentes

- A prévia do filme no editor do navegador não foi conferida depois da 1.48.1 (o painel do navegador recusou abrir a página de teste). O código é o mesmo da linha de comando e usa só a API normal do canvas.

## O que já está bom

- A geometria e o JS do motor por quadro.
- A paleta e o LZW do GIF.
- Os caches da câmera com `lag` e do `speed=auto`.

## Ordem sugerida para o que falta

1. 8, a escala das threads.
2. 2b e 5a, que mudam um pouco a imagem e pedem decisão.
3. 7d e 7e.
4. 7b e 7c, que mudam os bytes dos GIFs e as referências dos testes.
