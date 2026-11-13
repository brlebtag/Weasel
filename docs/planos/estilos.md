# Outros estilos: pixel art, ASCII, esboço, marcador, HQ e mais

**Situação:** análise e protótipos feitos em 12 e 13/11/2026, fora do Weasel. Nada implementado. Falta você dizer quais estilos interessam e dar o "pode fazer".

**Origem:** quatro perguntas suas:
- dá para gerar pixel art, ASCII ou outro estilo a partir do Weasel, sem modelar pixel por pixel, mesmo que não fique 100% perfeito?
- dá para um estilo que pareça desenhado à mão, com marcador ou lápis de cor? (A imagem de referência era de marcador, com caneta preta fina no contorno e caneta gel branca nos brilhos.)
- dá para um estilo de HQ, colorido e preto e branco, antigo e moderno?
- que outros estilos dá para gerar? (Da resposta saíram os protótipos de recorte de papel, vitral e massinha.)

**Resposta curta:** sim. O Weasel guarda o desenho como formas, e não como uma imagem pronta, então ele pode pintar a mesma cena de outros jeitos.

## O que já existe

Tudo no `finish` ([capítulo 4](../guia/04-camadas.md#acabamento-finish)):
- `pixel=8`: desenha 8 vezes menor e aumenta sem suavizar.
- `posterize=4`: poucas cores; `posterize=palette`: só as cores da `palette`.
- `flat`: tira todos os contornos.
- `bloom=`, `vignette=` e `grain=`: brilho, bordas escuras e granulado.
- Fora do `finish`, `pattern hatch` e `pattern dots` fazem hachura e pontilhado (exemplo `gravura.weasel`), mas você escolhe à mão onde vai cada padrão.

## O teste com o Cavaleiro

![À esquerda, o Cavaleiro com pixel=8 posterize=palette, com pontos azuis em volta da máscara e o fundo trocado; à direita, o protótipo, com contorno contínuo e só cores da palette](img/estilos_pixel.png)

- **Hoje (esquerda):** o desenho pequeno é feito com suavização, então as bordas viram cores misturadas.
  - O `posterize=palette` troca essas misturas pela cor mais parecida da palette. Por isso aparecem pontos azuis da capa em volta da máscara.
  - O fundo mudou de cor, porque a cor dele não está na palette.
- **Protótipo (direita), feito fora do Weasel:**
  1. desenha no tamanho normal (800×640);
  2. troca cada ponto pela cor mais parecida da palette (a cor do fundo entra na lista);
  3. em cada bloco de 8×8, fica a cor que **mais aparece**;
  4. o contorno ganha quando cobre um quarto do bloco, para não sumir.
- **Resultado:** nenhuma cor inventada, contorno contínuo, fundo certo.

## Protótipos

Feitos fora do Weasel, num script que carrega o motor dele (como a linha de comando faz) e usa as formas, os ossos e a luz da cena. Mostram o resultado esperado; a versão de verdade corrigiria os defeitos anotados.

### Esboço com a linha fervendo

![O Cavaleiro na animação stand, desenhado a lápis: linhas tremidas que mudam a cada 2 quadros, cor de marcador fora do lugar e hachura nas partes escuras](img/estilos_esboco.gif)

- **Como foi feito:**
  1. a cor vem do desenho sem contorno (`finish flat`), mais clara e deslocada uns pixels, como marcador;
  2. cada forma é passada duas vezes a lápis, com um tremido suave (ondas ao longo da linha), começando num ponto qualquer e passando um pouco do fim;
  3. as partes escuras ganham hachura a lápis;
  4. o tremido, o deslocamento da cor e a hachura mudam a cada 2 quadros: é a fervura.
- **Defeito:** o lápis é desenhado por cima de todas as cores, então aparecem linhas que no desenho normal ficam escondidas atrás de outra forma (os laços na capa). Na versão de verdade, cada forma pintaria a cor e o lápis na ordem certa.
- **Peso:** com o granulado do papel, o GIF passa de 1,7 MB; sem ele (este aqui), 0,5 MB.

### Cel shading

![A cena da noite com a luz normal do Weasel e com a luz em degraus: a máscara em dois tons com divisa nítida, o halo do lampião em anéis e a sombra no chão com borda definida](img/estilos_cel.png)

- **Como foi feito:**
  1. desenha a cena duas vezes: com a luz e sem a luz;
  2. a divisão das duas dá quanto de luz cada ponto recebeu, e de que cor;
  3. essa quantidade vai para o degrau mais perto (0.32, 0.62, 1, 1.35, 2.1 e 3.3 vezes);
  4. o contorno e o que é quase preto ficam como estão.
- **Resultado:** a máscara ficou em dois tons, o halo do lampião virou anéis e a sombra no chão ganhou borda definida.
- **Limite:** depende de `light` e `ambient`. Um desenho sem luz, como o Cavaleiro sozinho, não muda.

### Gravura automática

![A cena da noite em gravura: hachura cruzada no céu, prédios em nanquim sólido, a máscara em papel com hachura no lado longe do lampião e a chuva em branco](img/estilos_gravura_noite.png)

![O Cavaleiro em gravura: máscara em papel, capa com hachura cruzada, corpo e olhos em nanquim sólido](img/estilos_gravura_cavaleiro.png)

- **Como foi feito:**
  1. o quanto cada ponto é escuro escolhe a hachura: claro fica papel; depois entram linhas a 45°, a −45°, horizontais e mais linhas a 45°; quase preto vira nanquim sólido;
  2. os tons são esticados (3% mais claros e 3% mais escuros), porque a cena da noite é toda escura;
  3. o contorno vem da diferença entre o desenho com e sem contorno, e vira traço de nanquim.
- **Defeitos:**
  - as linhas vão todas na mesma direção na tela; numa gravura de verdade, elas acompanham a forma;
  - uma cena muito escura fica pesada no topo; precisaria de um controle de contraste.

### Marcador e lápis de cor

![A coruja normal, de marcador (cor em passadas, sombra numa segunda passada, contorno de nanquim, brilhos de caneta gel e uma mancha rosa atrás) e de lápis de cor (hachuras finas, grão do papel e contorno de lápis escuro)](img/estilos_marcador_lapis.png)

Os dois pintam **forma por forma**, na ordem do desenho e com os recortes das camadas. Usam a direção da luz do `canvas` (`light=`, a mesma do `weight=`). O céu da coruja foi tirado, e o fundo virou papel.

- **Marcador, como foi feito:**
  1. antes de cada cor, o papel fica em branco onde ela vai. É o que o artista faz, porque um marcador claro não cobre um escuro (a barriga creme sobre o corpo marrom);
  2. uma camada lisa de cor e, por cima, passadas largas na direção do comprimento da forma, com espaço e força irregulares. Onde duas se cruzam, fica mais escuro;
  3. a cor fica deslocada 1 ou 2 pixels: num lado sobra um fio de papel, no outro ela passa da linha;
  4. a sombra é uma segunda passada mais escura, do lado longe da luz: a forma menos ela mesma deslocada para a luz. Nos degradês, a cor mais escura do degradê;
  5. o contorno do próprio Weasel, em nanquim, por cima;
  6. os brilhos de caneta gel: um risquinho e um ponto branco no lado da luz das formas grandes;
  7. uma mancha rosa atrás, em passadas.
- **Lápis de cor, como foi feito:**
  1. o grão do papel é um mapa de "morrinhos"; o lápis só pinta onde a pressão vence o grão;
  2. a cor vem em hachuras finas e inclinadas, mais uma camada leve cruzada;
  3. a sombra: mais pressão e a cor mais escura, do lado longe da luz;
  4. o contorno do Weasel vira um lápis escuro, também falhado pelo grão.
- **Resultado:**
  - o lápis de cor é o mais convincente: o grão e as hachuras enganam bem de longe;
  - o marcador já parece desenho de marcador. A primeira versão tinha passadas regulares demais (parecia veludo cotelê); irregulares e mais suaves, ficou melhor.
- **Defeitos:**
  - a direção das passadas é uma regra (o comprimento da forma), e não segue o volume como faria o artista: as penas, a curva da barriga;
  - os brilhos de caneta gel caem sempre no mesmo lugar de cada forma;
  - é uma imagem parada. Animado, o desenho precisa redesenhar as passadas e o grão a cada 2 quadros (ver [No Weasel e no jogo](#no-weasel-e-no-jogo)).

### HQ antiga e moderna

![A cena da noite em quatro quadros de HQ, cada um com o balão "QUE NOITE..." e um recordatório: antiga colorida (céu roxo em pontos sobre papel-jornal, prédios em preto), antiga preto e branco (preto chapado, linhas deitadas no céu, hachura), moderna colorida (sombra em degraus) e mangá (preto chapado e retícula de pontos)](img/estilos_hq.png)

![Um pedaço de cada quadro em tamanho real, na cabeça do Cavaleiro: os pontos coloridos com a cor saindo do contorno, as linhas deitadas, os degraus de cor e os pontos do mangá](img/estilos_hq_detalhe.png)

As quatro partem da cena da noite (`noite.weasel`) desenhada três vezes: com luz, sem luz e sem contorno. O contorno é a diferença entre o desenho com e sem contorno, como na gravura. O balão e o recordatório foram desenhados à parte no protótipo, porque o Weasel não tem balão.

- **Antiga colorida (gibi dos anos 40 a 70), como foi feito:**
  1. o colorista antigo não pintava degradê. Para cada área, ele escolhia uma cor de uma tabela de 64, em que o ciano, o magenta e o amarelo entram com 0, 25, 50 ou 100%. O protótipo escolhe, ponto a ponto, a cor mais parecida dessa tabela, depois de clarear um pouco a cena (a tinta no jornal não chega ao escuro da tela);
  2. cada tinta é impressa em pontos (retícula), cada uma num ângulo, sobre papel-jornal amarelado;
  3. o preto vem só do contorno e das sombras mais fundas (os prédios), como o desenhista fazia;
  4. a cor sai 2 pixels fora do contorno: é o registro torto da impressão barata.
- **Antiga preto e branco (tira de jornal), como foi feito:**
  1. o mais escuro vira preto chapado (os prédios e o alto do céu);
  2. o céu um pouco mais claro vira linhas deitadas que vão afinando, um truque clássico para noite;
  3. os tons médios viram hachura em diagonal, e o personagem iluminado fica no papel.
- **Moderna colorida:** é o [cel shading](#cel-shading), com a cor um pouco mais forte e uma retícula leve no degrau mais escuro.
- **Mangá:** preto chapado no mais escuro e retícula de pontos a 45° nos tons médios. O tamanho do ponto segue o tom, e o papel é branco.
- **Resultado:**
  - o mangá foi o melhor de primeira;
  - a antiga colorida ficou com cara de gibi antigo: céu roxo-azulado chapado, prédios em preto e o halo do lampião em anéis.
- **Defeitos e cuidados:**
  - a primeira versão das antigas usou os tons esticados da gravura e saiu quase toda preta. Os limites agora usam o brilho real da cena; uma cena de dia precisaria de outros limites, ou de um controle de contraste;
  - na antiga colorida, o corpo do Cavaleiro ficou rosado, porque a luz da cena o deixa assim. Um colorista o pintaria de branco;
  - na página reduzida, as linhas do céu e os pontos formam um leve efeito de tela (*moiré*). Em tamanho real, isso some;
  - a retícula da moderna colorida quase não aparece, porque esta cena tem pouca sombra funda;
  - as imagens foram salvas sem o granulado do papel-jornal: ele quase não se vê e deixava o arquivo 50% mais pesado.

### Recorte de papel, vitral e massinha

![A coruja normal, de recorte de papel (peças com textura de papel, sombra embaixo e o céu em três folhas), de vitral (pedaços de vidro com chumbo, a lua brilhando) e de massinha (peças com volume e marcas de dedo, o céu desfocado atrás)](img/estilos_recorte_vitral_massinha.jpg)

Os três pintam **forma por forma**, como o marcador e o lápis, e usam a luz do `canvas` (`light=`). A imagem está em JPEG, porque as texturas deixavam o PNG com 1 MB.

- **Recorte de papel, como foi feito:**
  1. o contorno vira corte de tesoura: pequenas retas a cada poucos pixels, um pouco tortas, mantendo as pontas (estrelas, orelhas);
  2. cada peça tem a sua textura de papel (grão e fibras) e uma sombra macia embaixo, para o lado contrário da luz;
  3. a beirada do lado da luz fica um pouco mais clara, como a quina do papel;
  4. os traços viram tiras de papel (o galho e as penas da barriga);
  5. o degradê do céu vira três folhas, o céu e duas colinas onduladas, e o halo da lua vira dois círculos.
- **Vitral, como foi feito:**
  1. cada forma vira vidro, e as grandes são cortadas em pedaços (Voronoi), como o vidreiro faz. O céu virou dezenas de vidros;
  2. a cor de cada pedaço é a média do desenho dentro dele, mais forte e um pouco diferente da do vizinho;
  3. o vidro ganha manchas, estrias e a luz de trás, mais forte em cima. As partes claras brilham;
  4. o chumbo é grosso entre formas diferentes e fino entre pedaços da mesma forma, com um brilho no meio;
  5. os traços finos (as penas, o graveto) viram pintura escura no vidro, a grisalha dos vitrais de verdade;
  6. as formas pequenas demais (estrelas, o brilho dos olhos) viram contas de vidro sem chumbo em volta.
- **Massinha, como foi feito:**
  1. cada forma vira uma placa de massinha de borda redonda: a altura vem da distância até a borda, e a luz faz o resto, com um brilho leve;
  2. caroços suaves e duas ou três marcas de dedo nas peças grandes;
  3. cada peça faz uma sombra de contato na de baixo;
  4. o fundo e o céu ficam desfocados, como numa foto de *stop motion*, com vinheta e granulado de câmera.
- **Defeitos e cuidados:**
  - **papel:** papel não tem contorno, então o que era quase só contorno quase some. As pálpebras ficaram fininhas, e a coruja perdeu um pouco da cara de sono. Os anéis do halo saíram meio cinza; uma cor mais quente ficaria melhor;
  - **vitral:** na primeira versão, o chumbo engolia as estrelas e o graveto; daí vieram as contas e a grisalha. O corte em pedaços precisa ser calculado uma vez, com a figura parada: recalculado a cada quadro, o chumbo pularia de lugar;
  - **massinha:** a primeira versão tinha vincos retos no corpo, do jeito de medir a distância até a borda; um desfoque leve na altura resolveu. É a mais lenta das três: 0,8 s por quadro na coruja;
  - são imagens paradas. Animado, o papel precisa da textura seguindo o osso de cada peça (ver [No Weasel e no jogo](#no-weasel-e-no-jogo)).

## Os estilos, em três famílias

### 1. Grade: a imagem pronta é lida em células, e cada célula vira alguma coisa

Um único mecanismo serve para todos estes estilos. É a família mais fácil.

- **Pixel art** (recomendo começar por ele):
  - o voto por bloco do protótipo;
  - só as cores da palette;
  - pontilhado de pixel (*dither*, por exemplo o de Bayer) nos degradês e na luz, em vez de faixas;
  - um contorno de 1 pixel em volta da silhueta, feito depois de pixelar, para a espessura ser sempre igual.
- **ASCII art:** cada célula vira um caractere, conforme o quanto ela é escura (`' .:-=+*#%@'`).
  - Dá para melhorar com `/ \ | _` onde o contorno inclina, porque o Weasel sabe para onde cada linha vai.
  - Saída: um `.txt`, uma imagem ou um GIF.
  - O protótipo, com células de 6×12 pixels:

```
                  .+%@.     ##-
                :##%@%      @#*@+
               *%=*@@:     .%%--%%.
             :%*:.=@@-      =@-.=@#
            :@+..:%@+       %#...*@=
            %#...+@%        %#...-@%
           =@:...%@+        %#....%@:
           %*....%@-        %*....#@=
          =@-....*@+       .@+....*@+
          %*.....:%@-      +%:....*@*
         *@-......:+%%*++*%*-.....*@+
       :*%+%:........:---::.......-%%:
     =%*=:.-*=.....................:#@=
    =@-......-=:....................-@%
    %#..............................:@@.
    @*...............................%@-
   .@+...............................#@=
   :@=..................-##*:......-#@@=
   :@=.................:@@@@%:....:%@@@=
   :@=.................=@@@@@=....=@@@@=
   .@+.................:%@@@@:....:@@@@=
    %#..................:*##-.....:-*@@:
    *@:.........................::::=@@
   =#@#-:::............::::::::::::-#@#
  +@*=%@%##**++++++*******+++***##%@@%.
  %@*=-=++**%@%%%%%%%%%%%@@%@@@@@*=:.
   :+#@#*---%%++***##***#%@*#@@@@#
       *@+%@@%###*****##*#@##@@@@@.
       =@*@@@#*******#**#%@%#@@@@@-
       :#%%@%**++**#***###@##@@@@@=
           @#++*##***###+#@*#@@@@@=
          :@####****##*+*%@*%@@@@@:
          =@##*****#*+*#%@@#@@@@@@
          +@#***+*###%@@@@@@@@@@@*
          *@**##%@@@@@@@@@@@@@@@%.
          %@@@%*+#@@@#%@@@@%%#*=
          :-:    #@@@. *@@@:
```

- **Retícula (*halftone*) de quadrinho ou jornal:** bolinhas maiores onde é escuro. É a base das [HQs](#hq-antiga-e-moderna).
- **Ponto-cruz e mosaico:** variações divertidas do pixel art.

### 2. Traço: usa as formas, não só a imagem pronta

- **Esboço a lápis:**
  - as linhas ficam tremidas e passadas duas ou três vezes;
  - o tremido muda a cada 2 quadros, a "fervura" de linha dos desenhos animados.
  - Combina com o storyboard do seu irmão (ver [bocas por texto](bocas-por-texto.md)).
- **Marcador e lápis de cor:** pintam cada forma com passadas ou hachuras, como no [protótipo](#marcador-e-lápis-de-cor). Usam a mesma base do esboço.
- **Recorte de papel, vitral e massinha:** cada forma vira uma peça de papel, um vidro ou uma placa de massinha, como no [protótipo](#recorte-de-papel-vitral-e-massinha). O recorte de papel é o que mais combina com o Weasel, porque animação de recorte é o que ele já faz: peças presas em ossos.
- **Só contorno:** como um livro de colorir.
- **Neon:** só o contorno, colorido, com o `bloom` que já existe, num fundo escuro.

### 3. Tom: usa a luz que o Weasel já calcula

- **Cel shading (*toon*):** a luz em 2 ou 3 degraus de cor, sem degradê.
- **Gravura automática:** a sombra vira hachura sozinha. Hoje isso é feito à mão com `pattern`.
- **HQ:** a luz em degraus ou em faixas de tom, e cada faixa vira cor da tabela antiga, retícula, hachura ou preto chapado, como no [protótipo](#hq-antiga-e-moderna). Mistura esta família com a da grade.
- **Silhueta:** tudo numa cor só.

### Não recomendo

Aquarela, *low-poly* e pintura realista. São difíceis, e o resultado fica com cara de filtro.

## No Weasel e no jogo

- **Nada muda sozinho.** Cada estilo seria uma opção nova no `finish`, por exemplo `pixel=8 crisp` para o voto por bloco. Sem a opção, o `pixel=8` continua igual a hoje, e os arquivos existentes e os testes não mudam. O nome das opções ainda está aberto.
- **Pixel art no Godot:**
  - **O tamanho da folha:** hoje ela sai grande (800×640, em blocos de 8×8). Funciona, mas pesa 64 vezes mais e borra se o Godot aumentar a imagem com suavização. O certo é exportar no tamanho pequeno de verdade (100×80) e configurar a cena para não suavizar (`texture_filter` em *nearest*).
  - **O tremido:** quando um osso gira, os pixels tremem de um quadro para o outro. É o problema clássico de girar pixel art. O voto por bloco diminui o tremido, mas não acaba com ele.
  - **O `normal=`:** o mapa de relevo também teria de sair pixelado.
- **Cel shading e gravura no Godot:** a sprite sheet já sai no estilo. Só a luz do próprio Godot (`normal=`) continua suave, porque os degraus vêm da luz do Weasel.
- **ASCII, esboço e retícula:** servem mais para filme e storyboard. No jogo só fazem sentido se o jogo inteiro for nesse estilo, e aí a sprite sheet sai no estilo, como já acontece hoje.
- **HQ:** seria uma opção do `finish`, por exemplo `comic=antiga|antiga-pb|moderna|manga`, feita com as mesmas peças do cel shading e da gravura. No jogo, há dois caminhos:
  - **a retícula gravada na sprite sheet:** a folha precisa sair no tamanho final, porque pontos redimensionados formam *moiré*, e os pontos andam junto com o personagem;
  - **um shader no Godot** que aplica os pontos na hora, presos à tela: a sprite sheet sai só em cel shading, e nada muda no Weasel.
- **Recorte de papel, vitral e massinha no jogo:**
  - **recorte de papel:** sai direto na sprite sheet. A sombra de cada peça já vem desenhada, então ela não depende da luz do Godot;
  - **massinha:** também sai na sprite sheet, mas é a mais lenta de gerar (0,8 s por quadro na coruja), e o `normal=` teria de seguir o volume da massinha;
  - **vitral:** só se o jogo inteiro for de vitral. O corte em pedaços é feito uma vez, na pose parada, e acompanha os ossos depois.
- **Texturas na animação (esboço, marcador, lápis, gravura, retícula):** a textura pode se comportar de três jeitos.
  - **Parada no papel:** o personagem anda e a textura fica no lugar; parece que ele passa por trás de um vidro canelado. Não recomendo, com uma exceção: a retícula das HQs. Na página impressa, os pontos são da impressão e não do desenho, então ficar parada na tela é o certo.
  - **Presa à forma:** anda junto com ela; fica limpo, mas parece um adesivo. No recorte de papel, é o certo: papel de verdade anda junto com a peça.
  - **Redesenhada a cada 2 quadros,** como a fervura do esboço: parece animação desenhada à mão de verdade. Recomendo para o filme e o storyboard.
- **Peso:** o grão e as passadas comprimem mal; a sprite sheet e o GIF ficam bem mais pesados.

## Ordem sugerida

1. **Pixel art de verdade:** o voto por bloco, o pontilhado, o contorno de 1 pixel e a folha pequena para o Godot.
2. **ASCII:** é pequeno, porque aproveita a grade do pixel art.
3. **Esboço, marcador, lápis de cor, recorte de papel e massinha:** a mesma base (pintar forma por forma).
   - Os três primeiros e a massinha, com fervura, para o storyboard e o filme.
   - O recorte de papel, com a textura presa a cada peça, serve também para o jogo.
4. **Cel shading, gravura automática e HQ:** depois. As HQs aproveitam o cel shading (a moderna colorida) e as faixas de tom da gravura (as outras três).
5. **Vitral:** por último. Serve mais para filme (uma abertura, uma cena de igreja ou castelo) do que para personagem andando.

## Para decidir

1. Quais estilos interessam, e em que ordem?
2. Os nomes das opções no `finish` (por exemplo `crisp`, `dither=`, `outline=`, `ascii`, `sketch`, `marker`, `pencil`, `comic=`, `paper`, `glass`, `clay`).
3. No pixel art para o jogo: a folha sai sempre no tamanho pequeno, ou só com uma opção?
4. Nas texturas animadas: redesenhar a cada 2 quadros (fervura) ou deixar presa à forma?
