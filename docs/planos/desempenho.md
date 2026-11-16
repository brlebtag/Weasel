# Desempenho: imagens, vídeos e sons mais rápidos

**Situação:** análise de 15/11/2026. Os itens 1 a 4 saíram na 1.48.1 (15/11/2026) e o item 6 na 1.48.2 (16/11/2026). O resto está aberto.

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
| 5b | Estilos de arte: laços por pixel | `art.js` `field`, `noiseP`, `knitLeg`, `mix` do riso | — | ⬜ |
| 6 | Lip sync automático: mais rápido, menos memória, uma vez só | `audio.js` `lipCues`, `cli/media.js`, `cli/video.js`, `cli/film-worker.js` | 20 min a 48 kHz: 27,4 s e 2,5 GB → 2,2 s e 286 MB por thread | ✅ 1.48.2 |
| 7a | GIF de filme: não guardar todos os quadros na memória | `cli/video.js` | 20 s em 1080p: ~4 GB hoje | ⬜ |
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

### ⬜ 5b. Estilos de arte: laços por pixel

Dá para acelerar com resultado idêntico:

- `field()`: `Math.atan2` duas vezes por pixel pode virar uma tabela de 256×256.
- `noiseP()`: refaz o hash e o módulo a cada chamada; a grade periódica pode ser calculada antes.
- `knitLeg()`: é 40% do tricô e recalcula o mesmo "V" em cada casa; dá para tabelar.
- `mix` do riso: o memo usa um `Map` com chaves de 24 bits; um array tipado é mais rápido.

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

### ⬜ 7. Menores

- **7a. GIF de filme:** todos os quadros RGBA ficam na memória até o fim (20 s em 1080p dão ~4 GB). Dá para codificar a paleta e os quadros aos poucos.
- **7b. GIF só com a área que mudou:** os GIFs ficam bem menores, mas os bytes mudam, e as referências `_gif` dos testes precisam ser refeitas.
- **7c. Cor mais próxima no GIF:** hoje usa o centro da caixa de 5 bits, não a cor real do pixel, o que cria faixas. Também muda os bytes.
- **7d. PNG rápido:** o encoder do canvas equivale ao zlib nível 6 (93 ms por quadro 1080p; 0,7–1 s por folha grande). Um modo rápido seria 3× mais rápido, com arquivos 25–40% maiores. Só como opção.
- **7e. Normal map do Godot:** 2,3 s em 60 quadros; dá para ganhar uns 20–30%.

### ⬜ 8. Escala das threads no filme

- Na 1.48.1, 8 threads fazem o filme só 3× mais rápido que 1 (antes, 3,6×). O ffmpeg sozinho faz 170 quadros/s, então não é ele.
- **A investigar:** a fila de quadros prontos (`eachFrame`), a cópia dos pixels entre as threads e o tempo de cada thread abrindo o filme.

## Conferências pendentes

- A prévia do filme no editor do navegador não foi conferida depois da 1.48.1 (o painel do navegador recusou abrir a página de teste). O código é o mesmo da linha de comando e usa só a API normal do canvas.

## O que já está bom

- A geometria e o JS do motor por quadro.
- A paleta e o LZW do GIF.
- Os caches da câmera com `lag` e do `speed=auto`.

## Ordem sugerida para o que falta

1. 5b, os laços dos estilos (resultado idêntico).
2. 7a, a memória do GIF de filme.
3. 8, a escala das threads.
4. 2b e 5a, que mudam um pouco a imagem e pedem decisão.
5. 7d e 7e.
6. 7b e 7c, que mudam os bytes dos GIFs e as referências dos testes.
