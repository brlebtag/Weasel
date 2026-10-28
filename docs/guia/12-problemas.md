# 12. Problemas comuns

[← Referência rápida](11-referencia.md) · [Índice](README.md)

O que costuma dar errado, por que acontece e como resolver.

## Desenho

**A forma não aparece.**
- A camada dela é `guide` (só aparece com **Guias** ligado) ou `hidden`, ou tem `only=` com outras animações.
- A forma tem a opção `hidden`, `opacity=0`, ou `c=none` sem `ink=`.
- Outra forma, escrita depois, está por cima dela. O que vem depois no arquivo é pintado por cima.
- Ela está fora do canvas (lembre: y cresce para baixo).

**A forma ficou atrás (ou na frente) da outra.** O que vem depois no arquivo é pintado por cima, camada por camada. Mude a linha de lugar, ou a forma de camada. Um componente é pintado na linha do `use`, não na do `def`. Veja a [ordem de pintura](04-camadas.md#a-ordem-de-pintura).

**Quero que uma forma passe para a frente no meio da animação.** Use `key quadro forma.above=outra` (na frente) ou `below=` (atrás) ([capítulo 4](04-camadas.md#trocar-quem-fica-na-frente-durante-uma-animação-above-e-below)).

**"não está na mesma camada" no `above=` ou `below=`.** Formas só trocam de lugar com outras da mesma camada. Ponha as duas na mesma camada, ou troque as camadas inteiras: `key 8 bracoD.above=corpo` (com os nomes das camadas).

**O contorno não aparece.** Formas não têm contorno se você não pedir: ponha `ink=` (por exemplo `ink=line`). Se mesmo assim não aparece, veja se há `finish flat`, que tira todos os contornos.

**O contorno ficou fino de um lado.** Uma camada com `clip=` foi pintada por cima da metade de dentro dele. Mande o contorno para uma camada por cima com `inkon=` ([capítulo 4](04-camadas.md#o-contorno-por-cima-inkon)).

**"esperado … no formato x,y" ou "ponto inválido".** Há um espaço dentro de um ponto (`200, 120`). Escreva `200,120`, sem espaço.

**"cor desconhecida".** O nome não está na `palette` e não é uma cor do CSS (que são em inglês). Use `#hex` ou declare o nome: `palette amarelo=#ffd34d`.

**A curva fez uma volta estranha.** Faltam pontos, ou um ponto liso está perto demais de outro. Acrescente um ponto no meio da volta, ponha `!` onde deve haver canto, ou use uma alça `x,y~dx,dy` ([capítulo 2](02-formas.md#alça-da-curva-xydxdy)).

**O recorte (`clip=`) não recorta.** O nome precisa ser de uma forma **fechada** (`shape`, `ellipse`, `rect`) ou de uma camada. Um `stroke` ou uma `line` não servem de molde.

**A variante não muda a cor.** A forma usa o código da cor direto (`c=#c4512b`). Dê um nome na `palette` (`palette telhado=#c4512b`), use `c=telhado` e troque `telhado` na variante.

**O texto sai diferente em outro computador.** O texto usa as fontes instaladas na máquina. Use fontes comuns (`sans-serif`, `serif`) ou instale a mesma fonte nas duas.

## Ossos e animação

**Animei o osso e nada se mexe.**
- As formas não estão presas ao osso: falta `bone=nome` nelas. É o erro mais comum.
- O player está na pose parada ou em outra animação. Escolha a animação no player.
- A `key` está antes de qualquer `anim` (dá erro) ou dentro de outra animação.

**A parte gira em volta do lugar errado.** O `pivot=` do osso está no lugar errado. O pivô é a articulação: o ombro para o braço, o pescoço para a cabeça, o chão entre os pés para o corpo inteiro.

**O filho não acompanha o pai.** Falta `parent=` no osso filho.

**O loop dá um tranco quando recomeça.** A última `key` não é igual à primeira. Ponha no quadro `frames` (por exemplo `key 24` numa animação de 24 quadros) a mesma pose do quadro 0.

**A animação começa numa pose estranha.** Numa animação com loop, antes da primeira `key` o valor vem da última, passando pela emenda. Ponha uma `key` no quadro 0 com a pose inicial de tudo o que é animado.

**Uma transição (`once`) começa ou termina torta.** Numa animação `once`, antes da primeira `key` vale a primeira, e depois da última, a última. Escreva a pose **completa** (todos os ossos que mudam) na primeira e na última `key`.

**Balanço, tremor ou partículas não se mexem.** Eles só andam com uma animação tocando. Crie uma (`anim parado frames=24 fps=12`), mesmo sem nenhuma `key`.

**A mola enlouquece numa transição rápida.** Mudanças bruscas sacodem a mola demais. Deixe-a mais dura (`spring=` mais perto de 1) ou tire a mola daquele osso e anime-o com `key`.

**O `draw` desenha do lado errado.** O traço vai do primeiro ponto para o último. Escreva os pontos na ordem contrária.

**O morph não funciona** ("não combina"). A forma de destino precisa ser do mesmo tipo e ter o mesmo número de pontos. Conte os pontos das duas linhas.

**A `key` de opacidade não faz a forma aparecer.** A `opacity` da `key` multiplica a `opacity=` escrita na forma. Se a forma tem `opacity=0` no código, ela fica invisível sempre. Tire o `opacity=0` e use `key 0 forma.opacity=0`.

**A perna com IK estica ou dobra demais.** O comprimento da perna é a distância do `hip=` ao pé no desenho parado. Se o corpo desce mais que isso, a dobra fica exagerada; se sobe, a perna pendura. Ajuste o quanto o corpo desce, ou o `hip=`.

**O braço com `target=` não alcança a mão.** A mão foi mais longe que o comprimento do braço (a distância do `hip=` ao pivô da mão no desenho parado). Mantenha a mão ao alcance.

**Usei um parâmetro do `def` numa conta e deu "variável desconhecida".** Era um erro do Weasel até a versão 1.6.1; atualize. O parâmetro precisa ter um valor padrão **numérico** no `def` (`def arvore alto=60`).

## Arquivos

**`include` não acha o arquivo.**
- No **editor web**, o arquivo precisa estar na lista de arquivos: abra-o com **Abrir…**.
- Na **linha de comando**, o caminho é relativo ao arquivo que faz o `include`.

**Um erro aparece na linha do `include`.** O erro é dentro do arquivo incluído: a mensagem começa com o nome dele e a linha de lá.

## Filme

**A transição (`in=`) mostra o plano anterior parado.** É assim mesmo: durante a transição, o plano anterior fica no último quadro dele enquanto o novo já anda. Para os dois andarem juntos, faça a passagem dentro de um plano só, com `at`.

**O ator voltou para o lugar no plano seguinte.** Cada `shot` começa com tudo como foi declarado. Repita a posição no começo do plano: `at 0s heroi.pos=…`.

**O ator ficou parado e depois "pulou" para o lugar.** O `at` muda aos poucos entre um `at` e o seguinte, e o valor declarado vale como `at 0s`. Para ele ficar parado e só depois andar, repita a posição num `at` anterior ao começo do movimento.

**A câmera mostra o lugar errado.** `camera x,y` é o ponto do mundo que fica **no centro** do quadro, e não o canto.

**O ator está deslocado.** O ponto do arquivo dele que vai para `x,y` é o `root=` do `unity` (ou o canto `0,0`). Use `origin=` para escolher outro ponto.

**O vídeo não sai.** Vídeo pela linha de comando precisa do ffmpeg instalado (no Windows: `winget install ffmpeg`). Sem ele, dá para exportar PNGs (`--frames`) ou GIF.

## Exportação

**O GIF ficou grande demais.** Granulado (`grain=`), degradês e muitos quadros pesam. Diminua com `-s 0.5`, use menos quadros, tire o `grain`. Para filmes, prefira MP4.

**As bordas do GIF transparente ficam serrilhadas.** O GIF só tem transparência de 1 bit (cada pixel é transparente ou não). Para transparência suave, use PNG ou a sprite sheet.

**O `.tres` do Godot não acha a imagem.** O `.tres` aponta para o `.png` pelo nome: os dois precisam ficar na mesma pasta.

[← Referência rápida](11-referencia.md) · [Índice](README.md)
