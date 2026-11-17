# 19. Referência completa

[← Índice](README.md) · [Próximo: Funções das contas →](20-funcoes.md)

Todos os comandos do Weasel, um por um, com **todas** as opções, os valores que cada uma aceita e o que vale quando você não a escreve. É para consultar: para aprender com calma, siga o link **Para aprender** de cada ficha, que leva ao capítulo que ensina.

## Como ler esta referência

Cada ficha tem, nesta ordem:

1. uma ou duas frases sobre o que o comando faz;
2. **como escrever** a linha, com palavras em português no lugar do que você troca;
3. um exemplo curto, que roda sem erros e sem avisos;
4. a tabela com todas as opções do comando;
5. **Cuidado:** as armadilhas, quando houver;
6. **Para aprender:** o capítulo que ensina o comando.

### As colunas da tabela

| Coluna | O que diz |
|---|---|
| **Opção** | O que você escreve. `nome=` é uma opção com valor (`opacity=0.5`). Uma palavra sem `=` é uma palavra solta (`hidden`): escrever liga, não escrever deixa desligado. As partes da linha que não têm nome aparecem em palavras ("o centro `cx,cy`"). |
| **O que faz** | O efeito da opção, numa frase. |
| **Valores** | O que a opção aceita: a faixa ("de 0 a 1"), a unidade (pixels, graus, segundos, quadros) ou a lista de palavras. Os tipos de valor (cor, espessura, tempo…) estão explicados em [A escrita](#a-escrita). |
| **Padrão** | O que vale quando você não escreve a opção. "obrigatório": a linha não funciona sem ela. "—": não se aplica. |
| **Anima?** | Se o valor pode mudar com o tempo. "`key`": numa animação ([`key`](#key)). "`at`": num filme ([`at`](#at)). "não": fica igual o tempo todo. "(troca de uma vez)": o valor pula de um para o outro, sem passar pelos valores do meio. |

### Os colchetes

No bloco **como escrever**, o que está entre colchetes é opcional: `ellipse [nome] cx,cy raio` quer dizer que o nome pode faltar. Dentro de um valor, os colchetes marcam a parte que pode faltar: em `glow=cor,raio[,força]`, a força é opcional. Não escreva os colchetes no seu código.

### Um número fora da faixa

- Quando um número sai da faixa, o Weasel avisa e usa o limite mais perto. `opacity=3` dá o aviso `opacity= deve ficar entre 0 e 1` e vale 1. `opacity=-2` vale 0.
- Algumas opções corrigem o número sem avisar. Na coluna **Valores**, elas dizem "(fora disso, corta sem avisar)".
- Uma palavra onde vai um número (`opacity=muito`) é erro: `número inválido em opacity=`. A opção fica com o padrão.
- Uma opção que o comando não conhece dá o aviso `atributo desconhecido`, e o Weasel não liga para ela.
- A mesma opção duas vezes na linha dá o aviso `atributo repetido`. Vale a última.

### Erros e avisos

- Com um **erro**, a linha não sai como você escreveu. Na linha de comando, um erro faz o Weasel não exportar nada.
- Com um **aviso**, o Weasel desenha do jeito que entendeu (por exemplo, com o limite da faixa) e conta o que fez.

### Todos os comandos

São 48 comandos, na ordem deste capítulo.

| Comando | Para que serve | Grupo |
|---|---|---|
| [`canvas`](#canvas) | o tamanho da folha, a cor do fundo e de onde vem a luz do contorno | Configuração |
| [`finish`](#finish) | o acabamento da imagem inteira: sem contornos, pixelada, com menos cores, com brilho ou efeitos de tela | Configuração |
| [`art`](#art) | pinta o desenho pronto em outro estilo (pixel art, gravura, HQ, aquarela…) | Configuração |
| [`palette`](#palette) | dá nome a cores e números | Configuração |
| [`let`](#let) | cria variáveis para as contas | Configuração |
| [`gradient`](#gradient) | um degradê com nome, para usar como cor | Configuração |
| [`pattern`](#pattern) | uma textura de linhas ou de pontos, com nome, para preencher formas | Configuração |
| [`variant`](#variant) | outra versão do desenho, com outras cores ou outras peças | Configuração |
| [`include`](#include) | junta outro arquivo `.weasel` no lugar da linha | Configuração |
| [`ref`](#ref) | uma imagem guia por baixo, para desenhar por cima | Configuração |
| [`layer`](#layer) | começa uma camada: as formas de baixo vão para ela | Camadas |
| [`shape`](#shape) | uma forma fechada feita de pontos | Formas |
| [`stroke`](#stroke) | um traço aberto feito de pontos, com curvas | Formas |
| [`line`](#line) | uma linha reta de ponto a ponto | Formas |
| [`ellipse`](#ellipse) | um círculo ou uma elipse | Formas |
| [`rect`](#rect) | um retângulo, com ou sem cantos redondos | Formas |
| [`text`](#text) | um texto | Formas |
| [`emitter`](#emitter) | solta partículas (fumaça, faíscas, chuva…) | Formas |
| [`def`](#def-e-end) | começa um componente: um desenho para usar várias vezes | Componentes e repetição |
| [`end`](#def-e-end) | fecha o `def`, o `repeat` ou o `group` | Componentes e repetição |
| [`use`](#use) | põe uma cópia de um componente no desenho | Componentes e repetição |
| [`repeat`](#repeat) | repete as linhas até o `end`, com um número que muda | Componentes e repetição |
| [`group`](#group) | junta linhas para o editor escolher e mover juntas | Componentes e repetição |
| [`bone`](#bone) | um osso: gira em volta do pivô e leva as formas presas a ele | Ossos e animação |
| [`cloth`](#cloth) | um tecido que balança sozinho (capa, cabelo) | Ossos e animação |
| [`ik`](#ik) | faz a ponta de uma perna ou de um braço alcançar um ponto | Ossos e animação |
| [`anim`](#anim) | começa uma animação | Ossos e animação |
| [`key`](#key) | o valor de um osso ou de uma forma num quadro da animação | Ossos e animação |
| [`event`](#event) | dá um nome a um quadro da animação (um passo, um golpe) | Ossos e animação |
| [`light`](#light) | uma luz: lâmpada, holofote ou sol | Luz |
| [`ambient`](#ambient) | a luz geral da cena | Luz |
| [`unity`](#unity) | as medidas para usar a folha de sprites na Unity | Jogo |
| [`box`](#box) | uma caixa de colisão, de golpe ou de dano para o jogo | Jogo |
| [`point`](#point) | um ponto com nome para o jogo (a ponta da arma, a mão) | Jogo |
| [`godot`](#godot) | como a cena sai para o Godot | Jogo |
| [`tileset`](#tileset) | divide o desenho em blocos para montar fases | Jogo |
| [`tile`](#tile) | um bloco do `tileset`, com nome e colisão | Jogo |
| [`expr`](#expr) | uma expressão do personagem (feliz, bravo…) para o filme | Expressões e bocas |
| [`mouth`](#mouth) | as bocas do lip sync, da A à H e a X | Expressões e bocas |
| [`film`](#film) | faz do arquivo um filme | Filme |
| [`scene`](#scene) | põe o filme de outro arquivo na sequência deste | Filme |
| [`shot`](#shot) | um plano do filme, com a duração dele | Filme |
| [`actor`](#actor) | põe um desenho de outro arquivo no filme | Filme |
| [`camera`](#camera) | para onde a câmera olha, o zoom e o movimento dela | Filme |
| [`at`](#at) | muda algo num momento do filme | Filme |
| [`audio`](#audio) | um som no filme | Filme |
| [`sub`](#sub) | uma legenda | Filme |
| [`mark`](#mark) | um momento do filme com nome | Filme |

## A escrita

As regras que valem para todas as linhas.

### Uma linha

```
comando nome valores opção=valor palavras : pontos
```

- **comando:** a primeira palavra, sempre em minúsculas. `Ellipse` dá o erro `instrução desconhecida`.
- **nome:** como você chama a coisa, para usá-la depois (veja [Nomes](#nomes)).
- **valores:** os números e textos sem `=`, como o centro e o raio de uma elipse. A ordem deles é a da ficha.
- **opção=valor:** sem espaço em volta do `=`.
- **palavras:** as palavras soltas, como `hidden`.
- **`: pontos`:** depois dos dois-pontos, a lista de pontos (no `shape`, no `stroke` e na `line`) ou a lista de cores (no `gradient`).

Cada comando usa só algumas dessas partes. A ficha dele mostra quais.

- Um espaço separa as partes. Por isso, nada de espaço dentro de um valor: escreva `10,20`, não `10, 20`. Dentro de `"aspas"` e de `{contas}`, o espaço pode.
- As opções `nome=valor` podem vir em qualquer lugar antes do `:`. Os valores e as palavras soltas vêm depois do nome; a ficha mostra a ordem.
- Um comando por linha. Linhas em branco e espaços no começo da linha não mudam nada.
- Uma palavra que o comando não espera dá o aviso `valor solto`.

### Nomes

- Um nome começa com uma letra ou com `_`. Depois, pode ter letras, números, `_` e `-`.
- Sem acento e sem `ç`: `cabeça` dá erro. Escreva `cabeca`.
- Maiúsculas e minúsculas contam: `Bola` e `bola` são nomes diferentes.
- Nas formas, o nome é opcional. Sem nome, não dá para animar, recortar nem espelhar a forma.
- Um nome no `let` não deve ter `-`: numa conta, `{a-b}` quer dizer "a menos b".

O mesmo nome duas vezes:

| Onde | O que acontece |
|---|---|
| formas (`shape`, `stroke`, `line`, `ellipse`, `rect`, `text`, `emitter`) | pode, sem aviso; uma `key`, um `clip=` ou um `cut=` com esse nome vale para todas |
| `palette` e `let` | vale o último valor, no arquivo todo |
| `variant` | as linhas com o mesmo nome se somam |
| `canvas`, `finish` | veja as fichas: vale a linha de baixo, ou as linhas se somam |
| os outros (camada, osso, animação, componente, gradiente, padrão, luz, imagem guia, plano…) | erro: `já existe` |

Coisas de tipos diferentes podem ter o mesmo nome (uma forma e uma camada `fundo`). Evite: o `show=` da `variant`, por exemplo, troca as duas.

### Comentários

- Um `#` no começo da linha faz da linha inteira um comentário: o Weasel não lê.
- Um `#` depois de um espaço faz do resto da linha um comentário.
- Um `#` grudado no que vem antes (`c=#fff`) nunca é comentário. Dentro de aspas também não.
- Cuidado com o `#` seguido de 3 a 8 sinais de 0 a 9 e de `a` a `f`, e depois de um espaço, do fim da linha, de `,` ou de `@`: ele é lido como cor, mesmo depois de um espaço. `ellipse a 50,50 20 #cafe` dá o aviso `valor solto "#cafe"`. Para um comentário, ponha um espaço depois do `#`: `# cafe`.

### Pontos

Os pontos vêm depois do `:`, separados por espaço, no `shape`, no `stroke` e na `line`. `x` conta para a direita e `y` para baixo, em pixels, a partir do canto de cima à esquerda (`0,0`).

| Escrita | O que é |
|---|---|
| `x,y` | ponto liso: a curva passa por ele sem fazer quina |
| `x,y!` | canto: a linha faz uma quina no ponto |
| `x,y~dx,dy` | ponto com alça: a curva passa pelo ponto na direção `dx,dy` (medida a partir do ponto) |
| `x,y~ax,ay~bx,by` | alça quebrada: a curva chega na direção `ax,ay` e sai na direção `bx,by` |
| `x,y@osso` | o ponto segue o osso; vale no fim de qualquer um dos anteriores (`x,y!@braco`, `x,y~10,0@braco`) |
| `x,y@osso:peso` | o ponto segue o osso só em parte: o peso vai de 0 (fica com a forma) a 1 (segue o osso inteiro) |

- Sem peso, o `@osso` vale 1. Um peso fora de 0 a 1 dá aviso, e o Weasel usa o limite.
- O `@osso` só vale nos pontos do `shape`, do `stroke` e da `line`. No centro de uma `ellipse` ele é erro: para a forma inteira seguir um osso, use `bone=`.
- O `@osso` não vale junto com `bones=` na mesma forma (aviso).
- Na `line`, o `!` e as alças `~` são aceitos, mas não mudam nada: a linha é sempre reta de ponto a ponto.
- Os números do ponto aceitam contas: `{cx+10},{cy}`.

### Cores

Uma **cor** pode ser escrita assim:

| Escrita | Exemplo | O que é |
|---|---|---|
| `#rgb` | `#f80` | cor curta: cada sinal vale dobrado (`#f80` é `#ff8800`) |
| `#rgba` | `#f808` | cor curta com transparência |
| `#rrggbb` | `#ff8800` | o vermelho, o verde e o azul, cada um de `00` a `ff` |
| `#rrggbbaa` | `#ff880080` | com transparência no fim: `00` é invisível, `ff` é inteira |
| um nome da `palette` | `pele` | a cor guardada com esse nome ([`palette`](#palette)) |
| um nome de `gradient` | `ceu` | um degradê ([`gradient`](#gradient)) |
| um nome de `pattern` | `tabuas` | hachura ou pontos ([`pattern`](#pattern)), só no `c=` das formas fechadas |
| um nome de cor do CSS | `tomato` | os nomes de cor do navegador, em inglês, só com letras |
| `none` ou `transparent` | | sem cor |

- Maiúsculas valem: `#F80`, `Tomato`.
- `rgb(…)` e `hsl(…)` não valem: dão o erro `cor desconhecida`.
- Um `pattern` só preenche formas fechadas (`shape`, `ellipse`, `rect`). No `stroke`, na `line`, no `text` e no `inkc=`, o Weasel avisa e pinta só a cor das linhas do padrão. No fundo do `canvas`, é erro.
- Numa animação, só as cores `#hex` (escritas direto ou guardadas num nome da `palette`) mudam aos poucos. As outras trocam de uma vez, quando chega a próxima `key` ou o próximo `at`.

**Cor `#hex`.** Alguns lugares só aceitam `#hex` ou um nome da `palette` que guarde um `#hex` (num componente, também um parâmetro com `#hex`). Um nome do CSS ali dá o aviso `use uma cor #hex aqui`, e o Weasel não usa a cor. Um `gradient` ou um `pattern` ali dá o erro `aqui só vale cor simples`. Esses lugares são:

- no `art`: `paper=`, `c=` e `inks=`;
- no `pattern`: `c=` e `bg=`;
- na `layer`: a cor de `glow=`, `shadow=`, `tint=`, `trail=` e `rim=`;
- no `light` e no `ambient`: `c=`;
- nas formas: a cor de `emit=` e `thickc=`;
- no `emitter`: `c=`;
- numa `key`: a cor de uma luz (`luz.c=`);
- na `camera`: `fadec=` e `fog=`;
- no `film`: `subc=`;
- no `at`: toda cor (`camera.fadec=`, `camera.fog=`, `luz.c=`).

### Espessuras

Uma **espessura** pode ser:

- um número 0 ou mais, em pixels (um número negativo vira 0, sem aviso);
- `none`, que vale 0;
- um nome da `palette` que guarde um número (já existem `line=8`, `inner=5` e `edge=3`);
- num componente, um parâmetro com número.

Ela vale no `ink=` (o contorno das formas e do texto), no `w=` (a grossura do `stroke` e da `line`) e nas `key` que mudam esses dois. Um nome da `palette` que guarda uma cor, no lugar de uma espessura, é erro.

### Números e contas

- Um número: `12`, `-3`, `0.5`, `.5`. Para a parte decimal, use ponto: a vírgula separa números (`10,20` é um par).
- No lugar de qualquer número, você pode escrever uma conta entre chaves: `{cx+20}`, `{r*2}`, `{sin(30)*50}`. Dentro das chaves, o espaço pode: `{ cx + 20 }`.
- As contas usam `+ - * / % ^` e parênteses. As variáveis são as do [`let`](#let), os parâmetros de um `def` (nas linhas dele) e a variável do `repeat`. `pi` vale 3,14159…
- As comparações (`<`, `<=`, `>`, `>=`, `==`, `!=`) dão 1 (verdade) ou 0 (falso). `{a > 0 ? 10 : 20}` vale 10 se `a` for maior que 0; senão, 20. Um `=` sozinho é erro: para comparar, use `==`.
- Os nomes da `palette` não entram nas contas: `{grosso*2}` é erro. Para contas, use `let`.
- Dentro de aspas não há contas: `"{x}"` é só um texto.
- Todas as funções (`sin`, `rand`, `lerp`…) estão em [Funções das contas](20-funcoes.md).

### Ângulos

Os ângulos são em graus. 0 aponta para a direita, 90 para baixo, 180 para a esquerda e 270 (ou -90) para cima. Um número positivo gira no sentido do relógio. Qualquer número vale: `rot=390` dá o mesmo que `rot=30`.

### Textos

- Um texto vai entre aspas: `"Olá, mundo"`. Dentro das aspas, o espaço e o `#` valem.
- Não há como pôr uma aspa `"` dentro do texto.
- Quebra de linha: no `text`, não há. No `sub` e no `text=` do `audio`, escreva `\n`.
- Nomes de arquivo também vão entre aspas: `include "pecas.weasel"`.

### Tempos

Os tempos são do filme (`film`).

| Escrita | Quanto é |
|---|---|
| `2s` | 2 segundos |
| `1.5` | 1,5 segundo (sem unidade, são segundos) |
| `500ms` | 500 milissegundos |
| `48f` | 48 quadros do filme (com `film fps=24`, 2 segundos) |
| `1m30s` | 1 minuto e 30 segundos (`1m30` e `1m` também valem) |
| `+1s` | 1 segundo depois: no `at`, do `at` de cima; no `sub`, do fim da legenda de cima |
| `marca` | o momento de um `mark` com esse nome (só no `at`) |
| `marca+0.3s` | 0,3 segundo depois do `mark` (só no `at`) |
| `marca-0.3s` | 0,3 segundo antes do `mark` (só no `at`) |

- As unidades vão em minúsculas: `2S` é erro. Tempo negativo também é erro.
- O `+` só conta a partir de algo no `at` e no `sub`. No `mark`, no `in=` do `shot` e no `blend=` e `dur=` do `at`, ele é erro. Nos outros lugares, o Weasel não liga para ele.

### Ligar e desligar

O `show=` (na `key` e no `at`) liga e desliga uma forma, uma camada ou uma caixa. Ele troca de uma vez.

- Para ligar: `1`, `on`, `true` ou `sim`.
- Para desligar: `0`, `off`, `false`, `nao` ou `não`.
- Maiúsculas valem. Outra palavra dá o erro `show= aceita 1 ou 0`.

### Curvas

O `ease=` diz como o valor anda entre dois momentos. Na `key`, é como o valor **sai** daquela `key` até a próxima. No `at`, é como o valor **chega** naquele `at`.

| `ease=` | O que faz |
|---|---|
| `smooth` | começa devagar, acelera e termina devagar (o padrão) |
| `linear` | anda sempre na mesma velocidade |
| `in` | começa devagar e vai acelerando |
| `out` | começa rápido e vai freando |
| `step` | fica parado e pula de uma vez para o valor seguinte |
| `back` | passa um pouco do ponto no fim e volta |

Outra palavra dá o erro `ease desconhecido`.

### Misturas

O `blend=` da [`layer`](#layer) diz como as cores da camada se juntam com as cores que já estão embaixo.

| `blend=` | O que faz |
|---|---|
| `normal` | pinta por cima, sem conta (o padrão) |
| `multiply` | multiplica as cores: sempre escurece; o branco não muda nada |
| `screen` | o contrário do `multiply`: sempre clareia; o preto não muda nada |
| `overlay` | escurece onde embaixo é escuro e clareia onde é claro: mais contraste |
| `darken` | fica a mais escura das duas cores |
| `lighten` | fica a mais clara das duas cores |
| `color-dodge` | clareia o que está embaixo, como uma luz forte |
| `color-burn` | escurece o que está embaixo, com mais contraste |
| `hard-light` | como o `overlay`, mas quem decide é a cor da camada |
| `soft-light` | um `overlay` mais suave |
| `difference` | a diferença entre as duas cores: o branco inverte o que está embaixo; o preto não muda nada |
| `exclusion` | como o `difference`, com menos contraste |
| `hue` | o tom da camada (vermelho, azul…), com a luz e a força da cor de baixo |
| `saturation` | a força da cor da camada, com o tom e a luz de baixo |
| `color` | o tom e a força da cor da camada, com a luz de baixo: bom para colorir |
| `luminosity` | a luz da camada, com o tom e a força da cor de baixo |

Outra palavra dá o erro `blend desconhecido`. No `at` do filme, `blend=` é outra coisa: o tempo da mistura entre duas animações ([`at`](#at)).

### A ordem das linhas

O Weasel lê o arquivo inteiro antes de desenhar. Por isso, quase sempre, você pode **usar** um nome antes da linha que o cria.

<!-- conferir -->
```weasel
# usar antes de criar: as cores, o componente e o osso só aparecem no fim
canvas 300 150 bg=fundo
use olho 120,70 bone=cabeca
use olho 180,70 bone=cabeca
anim pisca frames=12
key 6 cabeca=0,-8
bone cabeca pivot=150,140
def olho
ellipse e 0,0 10 c=ink
end
palette fundo=#f4efe6 ink=#2b2a33
```

**Pode vir depois de onde é usado:**

| O que | Onde é usado |
|---|---|
| um nome da `palette` | `c=`, `ink=`, `inkc=`, `w=`, `bg=` do `canvas`, as cores do `gradient`, do `pattern`, da `light`, dos efeitos da `layer`, `emit=`… (menos no `art`: veja a outra tabela) |
| um `gradient` ou um `pattern` | `c=`, `inkc=`, `bg=` do `canvas` |
| um `bone` | `bone=`, `bones=`, `@osso`, `parent=`, `path=`, `key`, `expr`, `ik`, o `bone=` da `light` e do `cloth` |
| um `cloth` | `cloth=` |
| um `def` | `use` |
| uma `layer` | `inkon=`, `clip=`, `cut=`, uma `key` na camada |
| uma forma | `clip=`, `cut=`, `back=`, `mirror=`, o `path=` do osso, `cast=`, `foot=`, uma `key` na forma, o `show=` e o `hide=` da `variant`, o `mouth` |
| um `anim` | `only=`, `mix=`, o `from=` e o `to=` de outro `anim` |
| uma variável do `let` | as contas `{…}`, até as de outro `let` |
| um `tileset` | `tile` |
| no filme, um `actor` ou um `mark` | `at`, o `follow=` da `camera`, o `lips=` do `audio` |

**Precisa vir antes, ou depende de onde está:**

| O que | A regra |
|---|---|
| copiar na `palette` (`sombra=pele`) | o original vem antes: numa linha `palette` de cima, ou mais à esquerda na mesma linha |
| as cores do `art` (`paper=`, `c=`, `inks=`) | um nome da `palette` usado nelas precisa estar numa linha de cima; e a `variant` não troca essas cores |
| o `unity` sem `root=` | usa o tamanho do `canvas` de cima (sem `canvas` acima, 800 por 600) |
| `key` e `event` | valem para o `anim` de cima; sem um `anim` antes, é erro |
| as formas e o `use` | vão para a `layer` de cima; antes da primeira `layer`, vão para a camada `base` |
| as linhas entre `def` e `end` | são o componente; o mesmo vale para `repeat` … `end` e `group` … `end` |
| no filme: `actor`, `camera`, `audio`, `sub`, `mark` e `art` | valem para o `shot` de cima; antes do primeiro `shot`, valem para o filme todo; depois de um `scene`, todos menos o `mark` precisam de um `shot` novo |
| no filme: `at` | fica dentro de um `shot` (num filme sem `shot`, em qualquer lugar) |
| `at +1s` e `sub +1s` | contam a partir do `at` de cima e do fim do `sub` de cima |
| `include` | as linhas do outro arquivo entram no lugar dele, e valem estas mesmas regras |
| o mesmo nome duas vezes na `palette` ou no `let` | vale o último, no arquivo todo (uma cópia na `palette` feita antes guarda o valor antigo) |

**A ordem de pintura:**

1. O fundo (o `bg=` do `canvas`) e as imagens guia ([`ref`](#ref)) sem `front`.
2. As camadas, na ordem do arquivo. A camada `base` (as formas antes da primeira `layer`) vem primeiro.
3. Dentro de cada camada, as formas na ordem do arquivo. O `use` pinta o componente na linha dele. O que vem mais abaixo no arquivo fica por cima no desenho.
4. As imagens guia com `front`.
5. Por fim, o estilo de arte ([`art`](#art)) repinta a imagem pronta, e o acabamento ([`finish`](#finish)) vem por cima de tudo.

As exceções: o `inkon=` pinta o contorno de uma forma em outra camada; o `above=` e o `below=` de uma `key` mudam a ordem durante uma animação; a `layer` com `zsort` ordena as formas pela distância (`z=`); no filme, os atores e as camadas também se ordenam pela distância (`depth=`) e pelo `front`. As linhas que não pintam (`palette`, `def`, `bone`, `anim`…) não mudam a ordem.

## Configuração

Os comandos que preparam o desenho: o tamanho, as cores com nome, as variáveis, os arquivos e o acabamento. Nenhum deles pinta uma forma.

### `canvas`

O tamanho da folha de desenho, a cor do fundo e de onde vem a luz que engrossa o contorno. Escreva uma linha só, no começo do arquivo.

```
canvas largura altura [bg=fundo] [light=x,y]
```

<!-- conferir -->
```weasel
canvas 300 150 bg=#f4efe6 light=1,-1
# a luz vem de cima, à direita: o contorno engrossa embaixo, à esquerda
ellipse bola 150,75 50 c=#ffb000 ink=4 weight=2
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| a largura e a altura | o tamanho da folha | de 1 a 4096 cada, em pixels (o Weasel arredonda); fora disso, é erro | obrigatório na linha; sem a linha `canvas`, 800 por 600 (num filme, 1920 por 1080) | não |
| `bg=` | a cor do fundo | uma cor ou um `gradient` (um `pattern` é erro); `none` = sem fundo | `#ffffff` (branco) | não |
| `light=x,y` | de onde vem a luz que engrossa o contorno do lado da sombra (com o `weight=` das formas); alguns estilos de `art` também usam essa luz | dois números; só a direção conta: `x` negativo é a esquerda, `y` negativo é em cima; `0,0` deixa o contorno igual em volta | `-0.6,-0.8` (de cima, à esquerda) | não |

**Cuidado:**
- Com a linha `canvas`, a largura e a altura são obrigatórias: `canvas bg=#fff` é erro. Fora de 1 a 4096, também é erro, e a folha fica com o tamanho padrão.
- Um número ou uma palavra a mais (`canvas 300 150 400`) não dá aviso: o Weasel não liga para eles.
- Com duas linhas `canvas`, vale a de baixo, sem aviso.
- `bg=none` não deixa a imagem exportada transparente: ela sai com fundo branco. Para o fundo sair transparente, use `-t` na linha de comando. Com `-t`, o fundo some, qualquer que seja o `bg=`.
- O `unity` sem `root=` usa o tamanho do `canvas` de cima: escreva o `canvas` antes dele.

**Para aprender:** [O primeiro desenho](01-primeiros-passos.md#o-primeiro-desenho) e [o contorno que engrossa](03-cores.md#contorno-que-engrossa-no-lado-da-sombra-weight).

### `finish`

O acabamento da imagem inteira: tirar os contornos, pixelar, reduzir as cores, dar brilho, escurecer as bordas, pôr granulado ou imitar um filme antigo, uma fita VHS, uma televisão de tubo ou uma falha digital.

```
finish [game ou flat] [opções]
```

<!-- conferir -->
```weasel
canvas 300 150 bg=#1d2340
# flat tira o contorno (ink=); o bloom faz a lua brilhar em volta
finish flat bloom=1 vignette=0.6 grain=0.1
ellipse lua 150,75 40 c=#fff6c0 ink=4
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `game` | desenha os contornos (`ink=`) | — | vale quando você não escreve nem `game` nem `flat` | não |
| `flat` | tira os contornos (`ink=`) das formas e dos textos; o `stroke` e a `line` ficam | — | — | não |
| `inner=` | o quanto aparecem os `stroke` que estão numa camada com `clip=` | de 0 (somem) a 1 (inteiros) | 1 | não |
| `pixel=` | pixela a imagem em blocos quadrados | de 1 a 32, em pixels da imagem exportada (o Weasel arredonda) | 1 (sem pixelar) | não |
| `posterize=` | reduz as cores. Um número deixa só esse tanto de tons em cada canal (vermelho, verde e azul). `palette` troca cada cor pela cor `#hex` mais parecida da `palette` | de 2 a 64 (o Weasel arredonda), ou `palette` | desligado | não |
| `bloom=` | as partes claras vazam num brilho em volta; cada 1 a mais junta mais um brilho | de 0 a 3 | 0 | não |
| `vignette=` | escurece as bordas | 0 ou mais; acima de 1, avisa e não escurece mais | 0 | não |
| `grain=` | granulado, como numa foto de filme | 0 ou mais; acima de 0.33, avisa e não aumenta mais | 0 | não |
| `oldfilm=` | filme antigo: sépia, riscos, poeira, a luz piscando e o quadro tremendo | de 0 a 1 | 0 | não |
| `vhs=` | fita VHS: as linhas tremendo de lado, a cor borrada e o chiado | de 0 a 1 | 0 | não |
| `crt=` | televisão de tubo: a imagem curva, os cantos escuros e as linhas da tela | de 0 a 1 | 0 | não |
| `glitch=` | falha digital: em alguns quadros, faixas da imagem pulam de lado e as cores se separam | de 0 a 1 | 0 | não |

**Cuidado:**
- Só a primeira palavra vale: em `finish game flat`, o `flat` fica de fora, sem aviso.
- Várias linhas `finish` se somam. Cada opção fica com o último valor escrito.
- Com `flat`, uma forma com `ink=` e sem `c=` some inteira: ela não tem cor de dentro, só o contorno.
- O `inner=` não vale para a `line`, o texto, o preenchimento, o contorno nem para os braços e as pernas (`stroke` com `limb=`, `hip=`, `foot=` ou `target=`).
- O `pixel=` fica de fora quando o arquivo tem `art` (aviso). Para pixel art de verdade, use `art pixel`.
- O bloco do `pixel=` é medido na imagem exportada: com `-s 2`, `pixel=4` dá blocos de 4 pixels da imagem, que são 2 do desenho.
- O `posterize=palette` só usa as cores `#hex` da `palette`: os nomes do CSS e os números ficam de fora. A transparência das cores da `palette` não conta, e o que é transparente continua transparente.
- Os efeitos de tela (`oldfilm=`, `vhs=`, `crt=`, `glitch=`) mudam a cada quadro. Eles saem no PNG, no JPG, no GIF, no WebP, no vídeo e no filme. Na folha de sprites, no Godot, no SVG e nas folhas de conferência (`--contact`, `--trajectory`), ficam de fora.
- No SVG, o `pixel=` e o `posterize=` também ficam de fora.

**Para aprender:** [Acabamento](12-acabamento.md#acabamento-finish).

### `art`

Pinta a imagem pronta de outro jeito: em pixel art, em letras, em gravura, em quadrinhos, em aquarela, em vitral e em mais 20 estilos. O desenho não muda: as formas, os ossos e as animações continuam os mesmos. Só a pintura final muda.

```
art estilo [opções]
art estilo [opções] actor=nome,nome
art none
```

A primeira palavra depois de `art` é o estilo. Depois vêm as opções dele, em qualquer ordem. Onde a linha pode ficar:

- **No desenho:** em qualquer lugar do arquivo, menos dentro de um `def`. O costume é logo depois do `canvas`. Vale um `art` por arquivo.
- **No filme:** antes do primeiro `shot`, vale para o filme todo. Dentro de um `shot`, vale só para esse plano. No arquivo de uma cena (`scene`), antes do primeiro `shot` dele, vale para a cena. Com `actor=`, vale só para esses atores (antes do primeiro `shot`, no filme todo; dentro de um `shot`, só nele).
- **Quem ganha no filme:** o mais específico. Primeiro o `art` do ator no plano; depois o do ator na cena ou no filme; depois o do plano; depois o da cena; por último, o do filme. O `art` do arquivo de um ator não vale no filme.
- **`art none`:** sem estilo. Num desenho, é o mesmo que não ter a linha. No filme, desliga o estilo num plano ou num ator. Ele não leva opções (só o `actor=`).

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# o desenho todo em pixel art, com blocos de 6
art pixel size=6
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

Numa animação, a textura de alguns estilos se move sozinha (o `boil=`, na tabela abaixo). Aqui, a hachura da gravura gira junto com a bola e é sorteada de novo a cada 2 quadros:

<!-- conferir -->
```weasel
canvas 120 120 bg=#e9e2d4
art engraving gap=4 boil=2
palette ink=#1d1b26
bone bola pivot=60,60
ellipse b 60,60 40 c=#c09060 ink=3 bone=bola
ellipse olho 76,52 6,9 c=ink bone=bola
anim gira frames=8 fps=8
key 0 bola=0,0,0
key 8 bola=0,0,90
```

No filme, o lugar da linha decide onde ela vale:

<!-- conferir -->
```weasel
film fps=12
canvas 320 180 bg=#1d2b53
# antes do primeiro shot: o filme todo em pixel art
art pixel size=4 palette=pico8
rect chao 0,150 320,30 c=#008751
actor bola "bola.weasel" 110,150 origin=240,302 scale=0.3
actor fantasma "fantasma.weasel" 230,150 origin=240,350 scale=0.3 hide=ceu

shot todos dur=1s

shot letras dur=1s
# dentro de um shot: só este plano em letras
art ascii

shot normal dur=1s
# só a bola, e só neste plano, sem estilo
art none actor=bola
```

As opções que valem em vários estilos:

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `actor=nome,…` | Só no filme: o estilo vale só para esses atores. Num desenho, o Weasel avisa e o estilo vale para o desenho todo. Um ator que não existe ali também dá aviso. | um ou mais nomes de atores, separados por vírgula | — (sem `actor=`, vale para todo o quadro) | não |
| `paper=` | A cor do papel. Onde ele aparece muda de estilo para estilo (veja cada um). Vale em todos os estilos, menos `pixel`, `ascii`, `toon` e `silhouette`; no `comic`, só com `old`. Na imagem transparente (`-t`) e no Godot, o papel não aparece fora das formas. | uma cor `#hex` | `#f6f2ea` (creme) na maioria; `#f0e6cc` no `comic old`; `#ffffff` no `manga` e no `lines`; `#29382f` no `chalk`; `#e6dccb` no `embroidery`; `#f1ece0` no `stitch`; `#0b0a14` no `neon` | não |
| `levels=escuro,claro` | Estica os tons antes de pintar: o tom `escuro` (e o que for mais escuro) vira o mais escuro do estilo, e o tom `claro` (e o que for mais claro) vira papel. Serve para clarear um desenho escuro. Vale em `engraving`, `woodcut`, `halftone`, `comic`, `manga`, `riso` e `stencil`. | dois números de 0 (preto) a 1 (branco), o primeiro menor que o segundo; fora disso, o Weasel avisa e fica `0,1` | `0,1` (não muda nada) | não |
| `boil=` | Como a textura se move numa animação. `0`: presa às formas (anda e gira com o osso). Um número `N`: presa às formas e sorteada de novo a cada `N` quadros, como o traço que "ferve" num desenho à mão. `screen`: parada na tela, e o desenho passa por baixo dela. A textura muda sozinha com os quadros, sem `key` nem `at`. Vale nos 18 estilos com textura: `engraving`, `woodcut`, `halftone`, `comic`, `manga`, `riso`, `stencil`, `sketch`, `marker`, `pencil`, `crayon`, `chalk`, `watercolor`, `cutout`, `clay`, `glass`, `embroidery` e `mosaic`. Nos outros, o Weasel avisa que não muda nada. | um número inteiro de 0 a 1000 quadros (um número quebrado é arredondado), ou `screen` | `screen` no `halftone`, no `comic`, no `comic old`, no `manga` e no `riso`; `2` no `sketch`, no `marker`, no `pencil`, no `crayon` e no `chalk`; `0` nos outros e na `comic old bw` | não |
| `seed=` | Sorteia outra versão da textura: outro lugar para as linhas, os pontos, os cortes. No `comic old` e no `riso`, sorteia também a direção do `shift=`. Vale nos mesmos 18 estilos do `boil=`. | um número inteiro de 0 a 1000000000 (um número quebrado é arredondado) | 0 | não |

O estilo nunca muda com `key` nem com `at`. No filme, para trocar de estilo, ponha outro `art` no plano seguinte.

**Cuidado:**
- Um `art` por arquivo. Um segundo dá aviso, e vale o primeiro. O `art` de um arquivo trazido com `include` também conta. No filme, vale um por nível: um para o filme, um por plano e um por ator em cada um deles.
- Uma opção ou uma palavra de outro estilo não faz nada: o Weasel avisa e diz em quais estilos ela vale.
- `paper=`, `c=` e `inks=` só aceitam cor `#hex` (ou um nome da `palette` que guarde um `#hex`). Um nome do CSS, como `red`, dá aviso, e fica o padrão.
- Com `art`, o `finish pixel=` não vale (o Weasel avisa). Para pixel art, use o `size=` do `art pixel`. O `bloom=`, o `vignette=`, o `grain=` e o `posterize=` do `finish` entram por cima do estilo.
- O SVG é feito das formas, então sai sem o estilo (a linha de comando avisa).
- No filme, depois de um `scene`, um `art` precisa de um `shot` antes dele; sem o `shot`, é erro.

No editor, **Janela › Acabamento e estilo** escreve a linha `art` por você, com uma miniatura de cada estilo.

#### `pixel`

Pixel art: o desenho vira blocos quadrados, e cada bloco fica com a cor que **mais aparece** nele (e não com a média). A cor da tinta (`ink`) ganha o bloco quando cobre 1/4 dele, para o contorno não sumir. A grade começa no `0,0` do canvas.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# blocos de 6, as 16 cores do PICO-8, pontilhado no degradê e contorno de 1 bloco
art pixel size=6 palette=pico8 dither=bayer outline
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `size=` | O lado de cada bloco. | de 1 a 64 pixels (um número quebrado é arredondado) | 8 | não |
| `palette=` | Troca cada cor pela mais parecida de uma paleta. Não é a linha `palette`. | `own` (as cores do próprio desenho, até 256), `gameboy` (4 verdes), `nes` (55 cores), `pico8` (16 cores) ou `mono` (preto e branco) | `own` | não |
| `dither=` | `bayer` é o pontilhado: nos degradês, duas cores se misturam em pontinhos alternados, em vez de faixas. Onde a cor é lisa, fica lisa. Com só 2 cores (o `mono`), pontilha tudo. | `bayer` ou `none` | `none` | não |
| `outline` | Um contorno de 1 bloco por fora das formas, na cor da `ink` da `palette` (ou a mais parecida da paleta). A figura cresce 1 bloco de cada lado. | — | desligado | não |
| `small` | A folha de sprites e o Godot saem com 1 pixel por bloco, e a escala (`-s`) passa a contar pixels por bloco (arredondada para um inteiro). O PNG, o GIF e o vídeo não mudam. | — | desligado | não |

No Godot, qualquer `art pixel` sai com o filtro que deixa o pixel nítido (sem borrar).

#### `ascii`

O desenho vira uma grade de letras. Cada pedaço vira uma letra pela diferença dele para a cor do fundo do `canvas`: igual ao fundo, um espaço; bem diferente, uma letra cheia. Com `-o desenho.txt` (ou `-f txt`), sai também em texto.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# letras de 5 por 10, só estas letras, cada uma com a cor do seu pedaço
art ascii size=5 chars=" .:oO@" color
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `size=largura,altura` | O tamanho de cada letra. | dois números de 2 a 64 pixels (um número quebrado é arredondado); um número só, `n`, vale `n,2n` (então vai até 32) | `6,12` | não |
| `chars=` | As letras, da mais clara para a mais escura. Com espaço, use aspas. | 2 letras ou mais | `" .:-=+*#%@"` | não |
| `color` | Cada letra fica com a cor daquele pedaço do desenho. Sem ela, todas ficam na cor da `ink` da `palette` (num fundo escuro, quase brancas). | — | desligado | não |

#### `toon`

Cel shading, como num desenho animado: cada forma ganha uma faixa de sombra dura, do lado longe da luz do `canvas` (o `light=`). Com `light` ou `ambient` na cena, a luz vira poucos tons, em degraus.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# 4 degraus de luz e uma faixa de sombra mais larga
art toon steps=4 shadow=0.4
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
ambient power=0.6
light sol point 40,10 c=#fff0c0 power=1.2 radius=220
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `steps=` | Quantos degraus a luz tem. Mais degraus, luz mais suave. Só muda algo com `light` ou `ambient` na cena. | de 2 a 8 (um número quebrado é arredondado) | 3 | não |
| `shadow=` | A largura da faixa de sombra, em fração do tamanho da forma. `0` tira a faixa. Formas com 90% da largura ou da altura do canvas (o chão, o céu) e as camadas `unlit` ficam sem faixa. | de 0 a 1 | 0.3 | não |

#### `engraving`

Gravura em metal: o tom de cada ponto vira hachura de linhas finas sobre papel creme. Primeiro linhas a 45°, depois cruzadas, depois deitadas; no mais escuro, preto. O contorno das formas sai preto, por cima.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# linhas mais juntas, e os tons esticados (mais preto e mais papel)
art engraving gap=4 levels=0.1,0.8
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `gap=` | A distância entre as linhas da hachura. | de 2 a 64 pixels | 5 | não |
| `levels=` | Como em todos ([veja acima](#art)). | dois números de 0 a 1 | `0,1` | não |
| `paper=` | O papel: os tons claros (e o fundo claro) viram ele. | uma cor `#hex` | `#f6f2ea` | não |
| `boil=` | Como em todos: a hachura fica presa às formas. | de 0 a 1000, ou `screen` | 0 | não |
| `seed=` | Como em todos: outro lugar para as linhas. | de 0 a 1000000000 | 0 | não |

#### `woodcut`

Xilogravura: o contrário da gravura. Tudo começa preto, e a luz é cavada em sulcos brancos largos e toscos, que ondulam e seguem a forma. O claro fica papel; o mais escuro, preto. O contorno sai preto.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# sulcos mais juntos, num papel mais amarelado
art woodcut gap=6 paper=#efe4cc
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `gap=` | A distância entre os sulcos. | de 2 a 64 pixels | 8 | não |
| `levels=` | Como em todos ([veja acima](#art)). | dois números de 0 a 1 | `0,1` | não |
| `paper=` | O papel: a cor dos sulcos e do claro. | uma cor `#hex` | `#f6f2ea` | não |
| `boil=` | Como em todos: os sulcos ficam presos às formas. | de 0 a 1000, ou `screen` | 0 | não |
| `seed=` | Como em todos: outro sorteio dos sulcos. | de 0 a 1000000000 | 0 | não |

#### `halftone`

Retícula de jornal: pontos pretos numa grade inclinada, maiores onde é mais escuro. O quase branco fica papel, e o quase preto fica preto liso. Com `color`, são quatro grades (ciano, magenta, amarelo e preto) que se misturam no papel, como na impressão colorida.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# pontos menores, numa grade quase deitada
art halftone size=5 angle=15
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `size=` | O tamanho da célula de cada ponto. | de 2 a 64 pixels | 6 | não |
| `angle=` | O giro da grade. Com `color`, não vale: cada cor tem o seu ângulo (15°, 75°, 0° e 45°), e o Weasel não avisa. | de −360 a 360 graus | 45 | não |
| `color` | Quatro grades de cor (ciano, magenta, amarelo e preto), em vez de só preto. | — | desligado | não |
| `levels=` | Como em todos ([veja acima](#art)). | dois números de 0 a 1 | `0,1` | não |
| `paper=` | O papel: onde não há ponto. | uma cor `#hex` | `#f6f2ea` | não |
| `boil=` | Como em todos: os pontos ficam parados na tela, como numa folha impressa. `boil=0` prende os pontos às formas. | de 0 a 1000, ou `screen` | `screen` | não |
| `seed=` | Como em todos: muda o lugar da grade. | de 0 a 1000000000 | 0 | não |

#### `comic`

Quadrinhos, de três jeitos. `comic` é a HQ moderna colorida: o `toon` (a faixa de sombra e a luz em 3 degraus), com a cor mais forte e pontinhos pretos na sombra. `comic old` é o gibi antigo: poucas cores, em pontos, no papel-jornal, com a cor um pouco fora do lugar. `comic old bw` é a tira de jornal, em preto e branco.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# gibi antigo, com a cor bem fora do lugar
art comic old shift=3
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `old` | O gibi antigo colorido: cada cor vira a mais parecida de 64 misturas de ciano, magenta e amarelo, em pontos; o preto só aparece no contorno e no mais escuro. | — | desligado (a HQ moderna) | não |
| `bw` | Junto com `old`: a tira de jornal. O mais escuro vira preto; o escuro, linhas deitadas; o meio, hachura diagonal; o claro fica papel. Sem `old`, o Weasel avisa e vale como `old bw`. | — | desligado | não |
| `size=` | A distância entre os pontos (e entre as linhas, na `old bw`). | de 2 a 64 pixels | 5 | não |
| `shadow=` | A largura da faixa de sombra, como no `toon`. `0` tira a faixa. A luz tem sempre 3 degraus. | de 0 a 1 | 0.3 | não |
| `shift=` | Só na `comic old` colorida: o quanto a cor sai do lugar (a direção vem do `seed=`). `0` deixa a cor no lugar. Na `comic` e na `old bw`, o Weasel avisa. | de 0 a 20 pixels | 1.5 | não |
| `levels=` | Como em todos ([veja acima](#art)). | dois números de 0 a 1 | `0,1` | não |
| `paper=` | Só nas `old`: o papel-jornal, onde as tintas são impressas. Na `comic`, o Weasel avisa. | uma cor `#hex` | `#f0e6cc` | não |
| `boil=` | Como em todos: os pontos ficam parados na tela; as linhas da `old bw` ficam presas às formas. | de 0 a 1000, ou `screen` | `screen`; na `old bw`, 0 | não |
| `seed=` | Como em todos; na `comic old`, sorteia também a direção do `shift=`. | de 0 a 1000000000 | 0 | não |

#### `manga`

Mangá: papel branco, preto liso no mais escuro e, no meio, retículas de pontos de um tamanho só, como as folhas de retícula que o desenhista cola. A faixa de sombra do `toon` vira retícula. O contorno sai preto.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# pontos mais juntos e só 2 retículas
art manga size=3 tones=2
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `size=` | A distância entre os pontos. | de 2 a 64 pixels | 4 | não |
| `shadow=` | A largura da faixa de sombra, como no `toon`. `0` tira a faixa. | de 0 a 1 | 0.3 | não |
| `tones=` | Quantas retículas, sem contar o papel e o preto. | de 1 a 5 (um número quebrado é arredondado) | 3 | não |
| `levels=` | Como em todos ([veja acima](#art)). | dois números de 0 a 1 | `0,1` | não |
| `paper=` | O papel: o claro. | uma cor `#hex` | `#ffffff` | não |
| `boil=` | Como em todos: a retícula fica parada na tela. | de 0 a 1000, ou `screen` | `screen` | não |
| `seed=` | Como em todos: muda o lugar da retícula. | de 0 a 1000000000 | 0 | não |

#### `riso`

Risografia: de 1 a 3 tintas fortes, em grão, que se sobrepõem no papel. Cada cor do desenho vira a mistura das tintas que chega mais perto dela. Cada tinta sai um pouco do lugar, cada uma para um lado.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# duas tintas, rosa e azul, com o grão maior
art riso inks=#ff48b0,#0078bf size=2 shift=2
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `inks=` | As tintas. Com uma só, o desenho sai de uma cor. Com 4 ou mais, o Weasel avisa e ficam as do padrão. | de 1 a 3 cores `#hex`, separadas por vírgula | `#ff48b0,#00838a,#ffe800` (rosa, azul-petróleo e amarelo) | não |
| `size=` | O tamanho do grão. | de 0.5 a 16 pixels | 1 | não |
| `shift=` | O quanto cada tinta sai do lugar (a direção vem do `seed=`). `0` deixa as tintas no lugar. | de 0 a 20 pixels | 1.5 | não |
| `levels=` | Como em todos ([veja acima](#art)). | dois números de 0 a 1 | `0,1` | não |
| `paper=` | O papel, onde as tintas são impressas. | uma cor `#hex` | `#f6f2ea` | não |
| `boil=` | Como em todos: o grão fica parado na tela. | de 0 a 1000, ou `screen` | `screen` | não |
| `seed=` | Como em todos; sorteia também a direção do `shift=`. | de 0 a 1000000000 | 0 | não |

#### `stencil`

Estêncil de spray: o desenho vira poucos tons lisos de uma cor só sobre o papel, como tinta spray num molde. Na troca de um tom para outro, o spray salpica um no outro.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# 4 tons de azul-escuro
art stencil tones=4 c=#1a3a6a
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `tones=` | Quantos tons, contando o papel. | de 2 a 6 (um número quebrado é arredondado) | 3 | não |
| `c=` | A cor da tinta. | uma cor `#hex` | a `ink` da `palette` | não |
| `levels=` | Como em todos ([veja acima](#art)). | dois números de 0 a 1 | `0,1` | não |
| `paper=` | O papel: o tom mais claro. | uma cor `#hex` | `#f6f2ea` | não |
| `boil=` | Como em todos: os salpicos ficam presos às formas. | de 0 a 1000, ou `screen` | 0 | não |
| `seed=` | Como em todos: outro sorteio dos salpicos. | de 0 a 1000000000 | 0 | não |

#### `silhouette`

Silhueta: tudo o que é desenho vira uma cor só, e o fundo do `canvas` fica como é. A luz da cena não entra, e o estilo não tem textura. Serve para pôr do sol, teatro de sombras e para conferir se uma pose se entende só pelo contorno.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# tudo o que é forma vira roxo-escuro; o céu continua
art silhouette c=#1a1226
gradient ceu linear 0,0 0,120 : #f0b070@0 #3a4f9a@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `c=` | A cor da silhueta. | uma cor `#hex` | a `ink` da `palette` | não |

#### `sketch`

Esboço: a cor fica mais clara e um pouco fora do lugar, como uma cor posta depressa. Cada forma é passada duas vezes a lápis, tremida, e o escuro e o lado longe da luz ganham hachura a lápis. A sombra aparece mesmo sem luz na cena; com `light`, a luz entra por cima.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# outro sorteio do tremido e da hachura
art sketch seed=7
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `paper=` | O papel. Sem fundo no `canvas`, ele aparece onde não há forma; com fundo, ele aparece um pouco através do fundo. | uma cor `#hex` | `#f6f2ea` | não |
| `boil=` | Como em todos ([veja acima](#art)): o traço ferve, sorteado de novo a cada 2 quadros. `boil=0` deixa parado. | de 0 a 1000, ou `screen` | 2 | não |
| `seed=` | Como em todos: outro sorteio do tremido e da hachura. | de 0 a 1000000000 | 0 | não |

#### `marker`

Marcador: a cor vai em passadas largas de caneta, no comprimento da forma, e escurece onde elas se cruzam. A sombra é uma segunda passada. O contorno sai liso, como nanquim, e as formas grandes ganham um brilho de caneta gel do lado da luz.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
art marker
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `paper=` | O papel. Sem fundo no `canvas`, ele aparece onde não há forma; com fundo, ele aparece um pouco através do fundo. | uma cor `#hex` | `#f6f2ea` | não |
| `boil=` | Como em todos ([veja acima](#art)): as passadas fervem a cada 2 quadros. `boil=0` deixa parado. | de 0 a 1000, ou `screen` | 2 | não |
| `seed=` | Como em todos: outro sorteio das passadas. | de 0 a 1000000000 | 0 | não |

#### `pencil`

Lápis de cor: a cor vira hachura fina e inclinada, mais fechada onde a cor é mais forte, com o papel aparecendo entre os traços e no grão. O contorno vira um lápis escuro; a forma sem contorno ganha uma linha leve da cor dela.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# um papel mais amarelado
art pencil paper=#f0e6d0
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `paper=` | O papel, que aparece entre os traços (também no fundo do `canvas`). | uma cor `#hex` | `#f6f2ea` | não |
| `boil=` | Como em todos ([veja acima](#art)): a hachura ferve a cada 2 quadros. `boil=0` deixa parado. | de 0 a 1000, ou `screen` | 2 | não |
| `seed=` | Como em todos: outro sorteio da hachura. | de 0 a 1000000000 | 0 | não |

**Cuidado:** hoje, num desenho sem fundo, um `paper=` com um canal `00` (como `#ff0000` ou `#f6f200`) sai preto. Troque o `00` por `01` (`#ff0101`): a olho, a cor fica igual.


#### `crayon`

Giz de cera: a cor vira passadas largas de vai e vem, cada forma numa direção, e a cera junta onde elas se cruzam e na borda. O papel aparece em pontinhos claros, onde a cera não pegou. O contorno sai grosso e tremido.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# outra direção para as passadas
art crayon seed=3
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `paper=` | O papel, que aparece onde a cera não pegou (também no fundo do `canvas`). | uma cor `#hex` | `#f6f2ea` | não |
| `boil=` | Como em todos ([veja acima](#art)): as passadas fervem a cada 2 quadros. `boil=0` deixa parado. | de 0 a 1000, ou `screen` | 2 | não |
| `seed=` | Como em todos: outra direção e outro sorteio das passadas. | de 0 a 1000000000 | 0 | não |

**Cuidado:** como no `pencil`, num desenho sem fundo um `paper=` com um canal `00` sai preto. Use `01` no lugar (`#ff0101`).


#### `chalk`

Giz num quadro-negro: cada forma vira giz da cor dela, mais clara, e mais cheio onde a cor é mais clara; as cores escuras ficam quase só o quadro. O contorno vira giz branco, e o fundo do `canvas` vira um pó de giz leve.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# um quadro preto, no lugar do verde
art chalk paper=#202224
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `paper=` | A cor do quadro. Ela aparece sempre, com ou sem fundo no `canvas`. | uma cor `#hex` | `#29382f` (verde-escuro) | não |
| `boil=` | Como em todos ([veja acima](#art)): o giz ferve a cada 2 quadros. `boil=0` deixa parado. | de 0 a 1000, ou `screen` | 2 | não |
| `seed=` | Como em todos: outro sorteio das passadas. | de 0 a 1000000000 | 0 | não |

#### `watercolor`

Aquarela: a cor vira uma mancha de tinta aguada e transparente, mais escura na borda, que vaza um pouco da linha. O contorno vira uma linha fina de caneta, por cima. A sombra é uma segunda aguada.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# a aguada sorteada de novo a cada 2 quadros (numa animação)
art watercolor boil=2
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `paper=` | O papel. Sem fundo no `canvas`, ele aparece onde não há forma; com fundo, ele aparece através da aguada do fundo. | uma cor `#hex` | `#f6f2ea` | não |
| `boil=` | Como em todos ([veja acima](#art)): a aguada fica parada. `boil=2` faz ela ferver. | de 0 a 1000, ou `screen` | 0 | não |
| `seed=` | Como em todos: outro sorteio das manchas. | de 0 a 1000000000 | 0 | não |

#### `lines`

Só o contorno, como um livro de colorir: as cores viram papel, e cada forma fica só com o contorno, de uma cor só. Cada forma esconde o que está atrás dela. Os traços largos viram o contorno deles; os finos ficam uma linha só. Sem luz e sem textura.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# linhas de 2 pixels, roxas
art lines w=2 c=#3a2a6a
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `w=` | A grossura das linhas, a mesma em todas as formas. | de 0.5 a 64 pixels | a grossura do contorno de cada forma (`ink=`); numa forma sem contorno e nos traços, 2 × (o lado maior do `canvas` ÷ 500), entre 0.8 e 8 | não |
| `c=` | A cor das linhas. | uma cor `#hex` | a `ink` da `palette` | não |
| `paper=` | O papel: o fundo do `canvas` e o miolo de cada forma viram ele. | uma cor `#hex` | `#ffffff` | não |

#### `neon`

Neon: o contorno de cada forma vira um tubo de luz da cor dela (mais clara e mais forte), com o miolo quase branco e um brilho em volta, num fundo escuro. Cada forma esconde o que está atrás dela. Sem luz da cena e sem textura.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# tubos mais grossos
art neon w=3
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `w=` | A grossura dos tubos. | de 0.5 a 64 pixels | 2.5 × (o lado maior do `canvas` ÷ 500), entre 1 e 10 | não |
| `c=` | Uma cor só para todos os tubos. | uma cor `#hex` | a cor de cada forma (a do preenchimento; sem ele, a do contorno) | não |
| `paper=` | O fundo escuro: o fundo do `canvas` e o miolo de cada forma viram ele. | uma cor `#hex` | `#0b0a14` | não |

#### `cutout`

Recorte de papel: cada forma vira um papel da cor dela, com a borda de tesoura e uma sombra embaixo. O contorno vira um papel da cor dele, por baixo da peça; um degradê vira folhas uma em cima da outra, e o fundo do `canvas` também vira folhas, com a borda rasgada.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# outro sorteio da borda de tesoura
art cutout seed=5
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `paper=` | O papel de baixo. Só aparece onde não há forma, num `canvas` sem fundo. | uma cor `#hex` | `#f6f2ea` | não |
| `boil=` | Como em todos ([veja acima](#art)): as peças ficam paradas. `boil=2` recorta de novo a cada 2 quadros, como num stop motion. | de 0 a 1000, ou `screen` | 0 | não |
| `seed=` | Como em todos: outro sorteio da borda de tesoura. | de 0 a 1000000000 | 0 | não |

#### `clay`

Massinha: cada forma vira uma placa de massinha de borda redonda, com volume, caroços leves e uma sombra de contato. O contorno vira uma tira de massinha da cor dele, por baixo; os traços viram rolinhos, e o fundo do `canvas` fica um pouco desfocado.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
art clay
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `paper=` | O papel de baixo. Só aparece onde não há forma, num `canvas` sem fundo. | uma cor `#hex` | `#f6f2ea` | não |
| `boil=` | Como em todos ([veja acima](#art)): as peças ficam paradas. `boil=2` mexe nas covinhas a cada 2 quadros. | de 0 a 1000, ou `screen` | 0 | não |
| `seed=` | Como em todos: outro sorteio dos caroços e das covinhas. | de 0 a 1000000000 | 0 | não |

#### `glass`

Vitral: cada forma e o fundo do `canvas` viram vidro, cortado em pedaços presos com chumbo, com a luz passando por trás. O contorno vira o chumbo grosso. Os traços finos viram tinta escura sobre o vidro; os largos viram vidro.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# pedaços maiores, chumbo mais fino e uma moldura
art glass size=24 lead=2 frame
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `size=` | O lado dos pedaços de vidro. As formas menores que um pedaço ficam inteiras. | de 4 a 400 pixels | 40 × (o lado maior do `canvas` ÷ 500), entre 16 e 160 (num canvas de 500, 40) | não |
| `lead=` | A largura do chumbo entre as formas; entre os pedaços da mesma forma, a metade. A cor e a grossura do contorno não contam. | de 0.5 a 32 pixels | 4 × (o lado maior do `canvas` ÷ 500), entre 1.6 e 16 (num canvas de 500, 4) | não |
| `frame` | Uma moldura de chumbo em volta do `canvas`, pouco mais que o dobro do chumbo das formas. | — | desligado | não |
| `paper=` | O papel de baixo. Só aparece onde não há forma, num `canvas` sem fundo. | uma cor `#hex` | `#f6f2ea` | não |
| `boil=` | Como em todos ([veja acima](#art)): os cortes ficam presos às formas. `boil=2` corta de novo a cada 2 quadros. | de 0 a 1000, ou `screen` | 0 | não |
| `seed=` | Como em todos: outro sorteio dos cortes. | de 0 a 1000000000 | 0 | não |

Com `--trim`, os padrões do `size=` e do `lead=` são medidos pelo pedaço recortado, e não pelo `canvas` inteiro.

#### `embroidery`

Bordado à mão num pano de linho: cada forma é bordada em ponto cheio, com a linha atravessada e um brilho que muda com a direção dos pontos. O contorno vira pesponto (pontos curtos, um atrás do outro) da cor dele, e o fundo do `canvas` vira linho tingido da cor do fundo.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
art embroidery
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `paper=` | A cor do linho num `canvas` sem fundo. Com fundo, o linho fica da cor do fundo. | uma cor `#hex` | `#e6dccb` (linho cru) | não |
| `boil=` | Como em todos ([veja acima](#art)): os pontos ficam presos às formas. `boil=2` borda de novo a cada 2 quadros. | de 0 a 1000, ou `screen` | 0 | não |
| `seed=` | Como em todos: outra direção para os pontos. | de 0 a 1000000000 | 0 | não |

#### `stitch`

Ponto-cruz: o desenho vira uma grade presa ao `canvas`, e cada casa coberta pela metade (ou mais) vira um X de linha, da cor que mais aparece nela. O contorno vira pesponto fino da cor dele, e o fundo do `canvas` vira o pano, tingido da cor do fundo. A grade não tem textura sorteada: o desenho anda por baixo dela.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# um X a cada 5 pixels
art stitch size=5
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `size=` | O lado de cada X. | de 2 a 64 pixels | 6 | não |
| `paper=` | A cor do pano num `canvas` sem fundo. Na imagem transparente, saem só as linhas. | uma cor `#hex` | `#f1ece0` (o pano cru) | não |

#### `mosaic`

Mosaico: cada forma e o fundo do `canvas` viram pastilhas de cerâmica, em fileiras levemente onduladas e cortadas na borda da forma, com rejunte claro entre elas. Cada pastilha tem uma cor só e uma beirada com brilho do lado da luz. O contorno vira uma fileira de pastilhas da cor dele.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# pastilhas de 8, com rejunte de 1
art mosaic size=8 grout=1
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `size=` | O lado das pastilhas. | de 2 a 200 pixels | 12 × (o lado maior do `canvas` ÷ 500), entre 4.8 e 48 (num canvas de 500, 12) | não |
| `grout=` | A largura do rejunte entre as pastilhas. `0` deixa as pastilhas encostadas. | de 0 a 32 pixels | 12% do `size=` | não |
| `paper=` | O papel de baixo. Só aparece onde não há forma, num `canvas` sem fundo. | uma cor `#hex` | `#f6f2ea` | não |
| `boil=` | Como em todos ([veja acima](#art)): as pastilhas ficam presas às formas. `boil=2` assenta de novo a cada 2 quadros. | de 0 a 1000, ou `screen` | 0 | não |
| `seed=` | Como em todos: outro sorteio das pastilhas. | de 0 a 1000000000 | 0 | não |

Com `--trim`, os padrões do `size=` e do `grout=` são medidos pelo pedaço recortado, e não pelo `canvas` inteiro.

#### `knit`

Tricô: o desenho vira uma grade presa ao `canvas`, e cada casa vira um V de lã, da cor que mais aparece nela. O fundo do `canvas` também é tricotado. Um contorno fino ganha a casa quando cobre 1/3 dela, para não sumir. A grade não tem textura sorteada: o desenho anda por baixo dela.

<!-- conferir -->
```weasel
canvas 200 120 bg=ceu
# pontos menores
art knit size=6
gradient ceu linear 0,0 0,120 : #5fb4ea@0 #fff2cc@1
palette ink=#22202a line=3
rect chao 0,95 200,25 c=#5bb04a ink=line
ellipse bola 90,62 30 c=#e8553a ink=line
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `size=` | A largura de cada V. A altura é um pouco menor (0.78 da largura). | de 2 a 64 pixels | 8 | não |
| `paper=` | O papel de baixo. Só aparece onde não há forma, num `canvas` sem fundo. | uma cor `#hex` | `#f6f2ea` | não |

**Para aprender:** [Estilos de arte](14-estilos.md); no filme, [o filme, a cena, o plano e o ator](14-estilos.md#no-filme-o-filme-a-cena-o-plano-e-o-ator).

### `palette`

Dá nome a cores e números. Depois, você usa o nome no lugar da cor (`c=pele`) ou da espessura (`ink=grosso`).

```
palette nome=valor [nome=valor …]
```

<!-- conferir -->
```weasel
canvas 300 150 bg=fundo
palette fundo=#f4efe6 pele=#f2c9a0 orelha=pele grosso=6
# orelha copia a cor de pele; ink=grosso usa o número 6 como espessura
ellipse orelha_e 105,60 18 c=orelha ink=grosso
ellipse rosto 150,80 50 c=pele ink=grosso
# a cor da tinta (ink) pode vir depois: ela pinta os contornos
palette ink=#2b2a33
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o nome | o nome novo | as regras de [Nomes](#nomes) | obrigatório | não |
| o valor | o que o nome guarda | uma cor `#hex`, um nome de cor do CSS, um número (ou uma `{conta}`), ou outro nome da `palette` (copia o valor dele) | obrigatório | não |
| `ink=` | a cor da tinta: a cor de tudo o que não diz a própria cor (os contornos, o `stroke`, a `line`, o `text`, o `emitter`, as formas sem `c=` e sem `ink=`, as linhas do `pattern`) | uma cor `#hex` ou um nome do CSS | `#14141c` (quase preto) | não |
| `line=` | um número pronto, para usar como espessura (`ink=line`) | um número | 8 | não |
| `inner=` | um número pronto, para usar como espessura | um número | 5 | não |
| `edge=` | um número pronto, para usar como espessura | um número | 3 | não |

**Cuidado:**
- Copiar (`orelha=pele`) só funciona com o original antes: numa linha `palette` de cima, ou mais à esquerda na mesma linha. Já usar o nome (`c=pele`) pode vir em qualquer lugar do arquivo.
- O mesmo nome duas vezes: vale o último, no arquivo todo. Uma cópia feita antes guarda o valor antigo. Na mesma linha, dá o aviso `atributo repetido`.
- Não valem como valor: `none`, um `gradient` e um `pattern` (erro `valor inválido`). Uma palavra sem `=` (`palette pele`) também é erro.
- Um nome que guarda número no lugar de uma cor, ou que guarda cor no lugar de uma espessura, é erro: `"grosso" na palette é número, não cor`.
- Os nomes da `palette` não entram nas contas: `{grosso*2}` é erro. Para contas, use `let`.
- Um nome do CSS (`pele=wheat`) não vale onde só cabe cor `#hex` (luzes, efeitos de camada, `pattern`, `art`…) e fica de fora do `posterize=palette`.
- As cores da `palette` usadas no `art` (`paper=`, `c=`, `inks=`) precisam estar numa linha `palette` acima do `art`.
- Um `gradient` com o nome de uma cor da `palette` dá aviso, e vale a cor. Um `pattern` com esse nome não avisa, e também vale a cor.
- Num componente, um parâmetro com o mesmo nome troca o valor só dentro dele: `use boneco 100,80 pele=#c08060` ([`use`](#use)).

**Para aprender:** [A palette](03-cores.md#cores-com-nome-palette) e [um nome que copia outro](03-cores.md#um-nome-que-copia-outro-sombracabelo).

### `let`

Cria variáveis: nomes que guardam números, para usar nas contas `{…}`.

```
let nome=valor [nome=valor …]
```

<!-- conferir -->
```weasel
canvas 300 150
let cx=150 r=40
# mudar o r muda as duas formas juntas
ellipse bola {cx},75 {r} c=#ffb000
ellipse brilho {cx - r/3},{75 - r/3} {r/4} c=#fff6c0
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o nome | o nome da variável | as regras de [Nomes](#nomes), sem `-` | obrigatório | não |
| o valor | o número que ela guarda | um número ou uma conta; as chaves são opcionais (`let d=r*2` e `let d={r*2}` dão o mesmo), mas espaço só dentro de chaves | obrigatório | não |

**Cuidado:**
- O `let` é lido antes de tudo: uma variável vale no arquivo inteiro, até nas linhas de cima. Um `let` pode usar outro, de cima ou de baixo.
- Dois `let` com o mesmo nome: vale o último, sem aviso. Evite: um `let` que usa esse nome pode ficar com o valor antigo.
- Um `let` que depende de outro que depende dele (`let a=b` e `let b=a`) é erro: `variável desconhecida`.
- `pi` não muda: `let pi=3` não dá aviso, e as contas continuam usando 3,14159…
- Um nome com `-` é aceito, mas não dá para usar: numa conta, `{a-b}` é "a menos b".
- O `let` só guarda números. As cores com nome vão na [`palette`](#palette).
- O `let` não pode ficar dentro de um `def` (erro). As variáveis do arquivo já valem dentro do componente.

**Para aprender:** [Nomes para números: `let`](05-contas.md#nomes-para-números-let).

### `gradient`

Um degradê com nome: as cores mudam aos poucos ao longo de uma linha (`linear`) ou do centro para fora (`radial`). Depois, use o nome no lugar de uma cor: `c=ceu`.

```
gradient nome linear x1,y1 x2,y2 [box] : cor cor …
gradient nome radial cx,cy raio [fx,fy] [box] : cor cor …
```

Cada cor pode levar a posição dela no fim: `#ffffff@0.3`.

<!-- conferir -->
```weasel
canvas 300 150 bg=ceu
gradient ceu linear 0,0 0,150 : #8fc9ee #f4efe6@0.8
# box: as medidas vão de 0 a 1 dentro da forma que usa o gradiente
gradient sol radial 0.4,0.4 0.6 box : #fff6c0 #ffb300
ellipse astro 150,75 40 c=sol
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o nome | o nome do degradê | as regras de [Nomes](#nomes) | obrigatório | não |
| `linear` | as cores mudam ao longo da linha de `x1,y1` até `x2,y2`; antes do primeiro ponto fica a primeira cor, e depois do segundo, a última | dois pontos `x,y` | ou `linear` ou `radial`: um dos dois é obrigatório | não |
| `radial` | as cores mudam do centro `cx,cy` até um círculo com esse raio; o foco `fx,fy` é onde fica a primeira cor | o centro `x,y`, um raio maior que 0 e, se quiser, o foco `x,y` | o foco fica no centro | não |
| `box` | as medidas passam a ir de 0 a 1 dentro de cada forma: `0,0` é o canto de cima à esquerda da forma, `1,1` o de baixo à direita; no `radial`, o raio 1 é a média da largura e da altura da forma | — | sem `box`, as medidas são em pixels, no lugar da forma | não |
| as cores, depois do `:` | as cores do degradê, em ordem | uma cor ou mais; `none` é transparente; outro `gradient` é erro | obrigatório | não |
| `@posição`, em cada cor | onde a cor fica no caminho | de 0 a 1, crescendo (fora disso, corta sem avisar) | a primeira em 0, a última em 1, as do meio espalhadas por igual | não |

**Cuidado:**
- O tipo vem logo depois do nome: `gradient g box linear …` é erro.
- Um ponto a mais (`linear 0,0 100,0 50,50`) ou uma palavra a mais não dá aviso: o Weasel não liga para eles.
- Posições fora de 0 a 1, ou fora de ordem, são corrigidas sem aviso: `#fff@1.5` vale 1.
- Sem `box`, as medidas são as do lugar da forma: as do `canvas` ou, numa forma de um componente, as do `def`. Uma forma presa a um osso leva o degradê junto.
- O gradiente vale no `c=` das formas, do `stroke`, da `line` e do `text`, no `inkc=` e no `bg=` do `canvas`. Onde só cabe cor `#hex`, ele é erro.
- O nome de outro `gradient` ou `pattern` é erro. O nome de uma cor da `palette` dá aviso, e vale a cor.
- A `variant` troca as cores com nome do gradiente: elas são lidas depois da variante.

**Para aprender:** [Gradientes](03-cores.md#gradientes-gradient).

### `pattern`

Uma **textura** com nome, de linhas (hachura) ou de pontos, para preencher formas fechadas: `c=tabuas`.

```
pattern nome [hatch ou dots] [cross] [opções]
```

<!-- conferir -->
```weasel
canvas 300 150 bg=#f4efe6
pattern tabuas hatch c=#6b4a30 bg=#c58a4c gap=8 w=2 angle=90
pattern bolinhas dots c=#2f6fb5 gap=10 r=2
# o padrão só preenche formas fechadas (shape, ellipse, rect)
rect caixa 30,30 110,90 c=tabuas ink=3
ellipse bola 220,75 50 c=bolinhas ink=3
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o nome | o nome do padrão | as regras de [Nomes](#nomes) | obrigatório | não |
| `hatch` | linhas paralelas | — | vale quando você não escreve `dots` | não |
| `dots` | pontos, em fileiras desencontradas | — | — | não |
| `cross` | cruza as linhas do `hatch` com outras, a 90 graus (no `dots`, não muda nada) | — | — | não |
| `c=` | a cor das linhas ou dos pontos | uma cor `#hex` | a `ink` da `palette` | não |
| `bg=` | uma cor de fundo por baixo das linhas | uma cor `#hex` | sem fundo (aparece o que está atrás) | não |
| `gap=` | a distância entre as linhas, ou entre os pontos | de 1.5 a 500, em pixels | 6 | não |
| `w=` | a grossura das linhas (só no `hatch`) | de 0.1 a 50, em pixels | 1.2 | não |
| `r=` | o raio dos pontos (só no `dots`) | de 0.1 a 50, em pixels | 1.4 | não |
| `angle=` | a inclinação das linhas; no `dots`, a das fileiras | qualquer número, em graus (0: linhas deitadas; 90: em pé) | 45 | não |

**Cuidado:**
- O padrão só preenche formas fechadas (`shape`, `ellipse`, `rect`), no `c=`. No `stroke`, na `line`, no `text` e no `inkc=`, o Weasel avisa e pinta só a cor das linhas. No `bg=` do `canvas`, é erro.
- Com `hatch` e `dots` juntos, vale o `dots`, sem aviso.
- O `c=` e o `bg=` só aceitam cor `#hex`: um nome do CSS dá aviso e fica de fora.
- As linhas e os pontos seguem a forma: andam com o osso e o tecido e crescem com o `scale=` do `use`.
- O nome de outro `pattern` ou `gradient` é erro. Com o nome de uma cor da `palette`, vale a cor, sem aviso.

**Para aprender:** [Hachura e pontos](03-cores.md#textura-pattern).

### `variant`

Outra versão do mesmo desenho: troca valores da `palette` e mostra ou esconde peças. Você escolhe a versão ao exportar (`--variant nome`) ou no editor.

```
variant nome [nome=valor …] [show=peças] [hide=peças]
```

<!-- conferir -->
```weasel
canvas 300 150 bg=ceu
palette ceu=#8fc9ee astro=#ffb300
# com --variant noite: o céu escuro, a lua clara e a estrela aparece
variant noite ceu=#1d2340 astro=#f4efe6 show=estrela
ellipse sol 150,75 40 c=astro
ellipse estrela 240,40 4 c=#ffffff hidden
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o nome | o nome da versão | as regras de [Nomes](#nomes) | obrigatório | não |
| `nome=valor` | troca o valor desse nome da `palette` nesta versão | os mesmos valores da [`palette`](#palette): uma cor `#hex`, um número, outro nome da `palette`, um nome do CSS | — | não |
| `show=` | mostra peças que têm `hidden` | nomes de formas ou de camadas, separados por vírgula | — | não |
| `hide=` | esconde peças | nomes de formas ou de camadas, separados por vírgula | — | não |

**Cuidado:**
- Sem escolher a versão, nenhuma vale. Na linha de comando, `--variant all` exporta todas.
- Um nome que não está na `palette` vira um nome novo, sem aviso: um erro de digitação (`variant noite cue=#000`) passa calado.
- Linhas `variant` com o mesmo nome se somam.
- A variante troca a `palette` antes de qualquer cor ser usada: chega aos gradientes, aos padrões, ao fundo, às luzes e às formas. Mas não chega às cores do `art` (`paper=`, `c=`, `inks=`).
- Uma cópia (`variant noite sombra=ceu`) pega o valor final de `ceu`, com todas as linhas `palette`.
- No `show=` e no `hide=`, um nome que não existe dá aviso. Um nome que é forma e camada troca as duas. Eles valem também dentro dos componentes.
- Uma palavra a mais (`variant noite clara`) não dá aviso: o Weasel não liga para ela.
- Num filme, o `--variant` não vale: escolha a versão de cada ator com `variant=` no `actor` ou com `at ator.variant=`.

**Para aprender:** [Variantes](06-componentes.md#variantes-variant) e [Trocar peças](06-componentes.md#trocar-peças-show-e-hide).

### `include`

Junta outro arquivo `.weasel` a este. As linhas dele entram no lugar do `include`, como se estivessem escritas ali.

```
include "arquivo.weasel"
```

Um arquivo só com cores:

<!-- conferir -->
<!-- arquivo: cores.weasel -->
```weasel
# cores.weasel: as cores, para usar em vários desenhos
palette pele=#f2c9a0 escuro=#2b2a33
```

E o desenho que usa esse arquivo:

<!-- conferir -->
```weasel
canvas 200 150
include "cores.weasel"
ellipse rosto 100,75 50 c=pele
ellipse pupila 85,65 6 c=escuro
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o arquivo | o arquivo que entra no lugar da linha | o nome entre aspas, com o `.weasel`; o caminho é a partir da pasta do arquivo que tem o `include` | obrigatório | não |

**Cuidado:**
- O arquivo entra no lugar da linha: o que ele desenha fica por cima do que vem antes e por baixo do que vem depois.
- Um arquivo pode incluir outro, até 8 um dentro do outro. Um arquivo que inclui a si mesmo, direto ou por outro, é erro: `include em ciclo`.
- O mesmo arquivo duas vezes não dá aviso: as linhas dele entram duas vezes (e uma camada ou um osso repetido dá o erro `já existe`).
- Dentro de um `def`, o arquivo incluído só pode ter formas e `use`.
- As imagens guia (`ref`) de um arquivo incluído não aparecem.
- Um erro no outro arquivo aparece na linha do `include`, com o nome e a linha de lá: `cores.weasel:2: …`.
- Na linha de comando, escreva o nome com o `.weasel`: `include "cores"` não acha o `cores.weasel`. No editor, o outro arquivo precisa estar aberto numa aba.
- Uma palavra a mais na linha não dá aviso.

**Para aprender:** [Vários arquivos](06-componentes.md#vários-arquivos-include).

### `ref`

Uma imagem guia: uma foto ou um rascunho por baixo do desenho, para você desenhar por cima. Ela aparece no editor. Ao exportar, ela só sai com `--refs` na linha de comando.

```
ref nome "imagem.png" [x,y] [opções]
```

<!-- conferir -->
```weasel
canvas 400 300
# troque rascunho.png pelo nome da sua imagem, na mesma pasta deste arquivo
ref rascunho "rascunho.png" 20,10 scale=0.5 opacity=0.4 lock
ellipse cabeca 200,120 60 c=#f2c9a0 ink=3
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o nome | o nome da imagem guia | as regras de [Nomes](#nomes); não pode repetir | obrigatório | não |
| a imagem | o arquivo da imagem | entre aspas: PNG, JPG, GIF, WebP, SVG…; o caminho é a partir da pasta do arquivo `.weasel` | obrigatório | não |
| o canto `x,y` | onde fica o canto de cima à esquerda da imagem | dois números, em pixels | `0,0` | não |
| `scale=` | o tamanho: 1 é o tamanho da imagem, 0.5 é a metade | de 0.001 a 100 | 1 | não |
| `rot=` | gira a imagem em volta do centro dela | qualquer número, em graus | 0 | não |
| `opacity=` | a transparência | de 0 (invisível) a 1 (inteira) | 0.5 | não |
| `only=` | só mostra a imagem nessas animações (`pose` é a pose parada, sem animação) | nomes de `anim`, separados por vírgula | em todas | não |
| `frames=a..b` | só mostra a imagem do quadro `a` até o `b` da animação | dois números inteiros, sem contas | em todos | não |
| `lock` | no editor, você não consegue clicar nem arrastar a imagem | — | — | não |
| `hidden` | esconde a imagem, que continua no arquivo | — | — | não |
| `front` | põe a imagem por cima do desenho | — | por baixo | não |

**Cuidado:**
- A imagem guia não sai na exportação. Só com `--refs`, na linha de comando.
- Uma imagem que não existe dá o aviso `não achei a imagem`.
- Num filme, a imagem guia não aparece (aviso). Num arquivo incluído com `include`, ela também não aparece.
- Uma palavra que não é `lock`, `hidden` ou `front` dá aviso. Um segundo `x,y` também.
- `frames=8..2` vale como `frames=2..8`. Na pose parada, sem animação, o `frames=` não esconde a imagem.

**Para aprender:** [Desenhar por cima de uma imagem](02-formas.md#desenhar-por-cima-de-uma-imagem-ref) e [uma imagem guia para cada movimento](09-animacao.md#uma-imagem-guia-para-cada-movimento).

## Camadas

Uma camada é uma folha do desenho: as formas dela são pintadas juntas, com os mesmos recortes e efeitos.

### `layer`

Abre uma camada. As formas das linhas seguintes vão para ela, até a próxima `layer`. As camadas são pintadas na ordem do arquivo: a primeira fica embaixo, a última fica por cima. As formas que vêm antes da primeira `layer` ficam numa camada chamada `base`, pintada antes de todas.

```
layer nome [palavras soltas] [opções]
```

<!-- conferir -->
```weasel
canvas 300 160 bg=#cfe8f5
# antes da primeira layer: a camada base, pintada primeiro
rect chao 0,120 300,40 c=#8bbf6a
layer sol
ellipse disco 150,80 50 c=#ffb000
# esta camada só aparece dentro do disco (clip=disco)
layer listras clip=disco
rect faixa1 90,60 120,10 c=#ff6b4a
rect faixa2 90,85 120,10 c=#ff6b4a
```

<!-- conferir -->
```weasel
canvas 320 140 bg=#22242e
# um brilho amarelo em volta da lua: raio 16, força 2
layer luar glow=#ffd34d,16,2
ellipse lua 80,70 36 c=#fff4c2
# uma sombra preta meio transparente, 6 para a direita, 6 para baixo, desfoque 4
layer caixas shadow=#00000099,6,6,4
rect caixa 160,40 60,60 r=8 c=#4a90d9
# as cores ficam cinza
layer cinza saturate=0
ellipse bola 270,70 30 c=#ff6b4a
```

<!-- conferir -->
```weasel
canvas 300 160 bg=#cfe8f5
# o chão deita: o que está mais para cima vai para longe, até o horizonte
layer chao floor horizon=50
rect grama -300,-400 900,560 c=#8bbf6a
rect caminho 130,-400 40,560 c=#d9c39a
# esta camada gira 35 graus em volta de um eixo em pé
layer placa yaw=35
rect tabua 190,15 90,40 r=4 c=#a0522d
```

#### O nome, a visibilidade e o recorte

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o nome | identifica a camada para `clip=`, `cut=`, `inkon=`, `from=`, [`key`](#key) e [`at`](#at) | letras, números, `_` e `-`, começando com letra ou `_` (sem acento); cada camada tem um nome diferente | obrigatório | não |
| `guide` | camada de construção: não sai na imagem; aparece só no editor (com as guias ligadas) e com `--guides` na linha de comando; nunca recebe luz | — | desligada | não |
| `hidden` | não pinta a camada; as formas dela continuam recortando outras camadas (`clip=` e `cut=`) | — | desligada | não |
| `lock` | só o editor lê: as formas da camada não se escolhem nem se arrastam pelo desenho; a imagem não muda | — | desligada | não |
| `clip=` | a camada só aparece dentro da forma que recorta (os buracos dessa forma continuam buracos) | um nome só: de uma forma fechada (`shape`, `ellipse`, `rect`) ou de uma camada (vale o que ela tem de formas fechadas); se uma forma e uma camada têm o mesmo nome, vale a forma | sem recorte | não |
| `cut=` | a camada some dentro da forma que recorta e aparece fora dela (e pelos buracos dela) | como no `clip=` | sem recorte | não |
| `only=` | a camada só aparece nessas animações | nomes de [`anim`](#anim), separados por vírgula; `pose` é a pose parada (sem animação); num filme, também nomes de [`shot`](#shot) | aparece sempre | não |

**Cuidado:**
- Dois `layer` com o mesmo nome dão erro ("camada já existe").
- Uma `layer` não pode ficar dentro de um `def` nem de um `group`.
- `clip=` e `cut=` aceitam um nome só: `clip=a,b` dá erro. Um traço (`stroke`, `line`) não recorta: ele não tem lado de dentro (aviso).
- Um nome do `only=` que não existe avisa.
- Numa animação, uma `key` não mostra uma camada `hidden`. Num filme, `at camada.show=1` mostra uma camada `hidden` do próprio arquivo do filme.

**Para aprender:** [Camadas](04-camadas.md#o-que-é-uma-camada-layer), [recortar por dentro](04-camadas.md#recortar-por-dentro-clip) e [por fora](04-camadas.md#recortar-por-fora-cut), [`guide`](04-camadas.md#camada-de-construção-guide), [`hidden`](04-camadas.md#camada-escondida-hidden), [`only=`](09-animacao.md#camadas-que-só-aparecem-em-certas-animações-only).

#### Transparência e mistura

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `opacity=` | a transparência da camada inteira | de 0 (invisível) a 1 (sem transparência) | 1 | `key` e `at` |
| `blend=` | como a camada se mistura com o que está embaixo dela | `normal`, `multiply`, `screen`, `overlay`, `darken`, `lighten`, `color-dodge`, `color-burn`, `hard-light`, `soft-light`, `difference`, `exclusion`, `hue`, `saturation`, `color` ou `luminosity` (em minúsculas; outro nome dá erro) | `normal` | não |

**Cuidado:**
- `opacity=` e `blend=` tratam a camada como uma imagem só. Duas formas da mesma camada com `opacity=0.5` não aparecem uma através da outra: a de cima cobre a de baixo, e as duas juntas ficam meio transparentes. Com `blend=`, as formas da camada não se misturam entre si, só com o que está embaixo da camada.
- Para as formas se verem umas através das outras, ponha o `opacity=` em cada forma, não na camada.
- Até a versão 1.67.0, numa camada sem efeito, `opacity=` e `blend=` valiam forma por forma. Um desenho antigo com formas que se cruzam numa camada assim sai diferente.

**Para aprender:** [`opacity=`](04-camadas.md#transparência-da-camada-opacity) e [`blend=`](04-camadas.md#misturar-com-o-que-está-embaixo-blend).

#### Efeitos

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `blur=` | desfoca a camada | de 0 a 500, em pixels | 0 | `key` e `at` |
| `glow=cor,raio,força` | um brilho da cor em volta das formas | cor: uma cor `#hex`; raio: em pixels (0 ou menos, sem brilho); força: de 0.1 a 5 (fora disso, corta sem avisar) | raio 12, força 1 | `key` e `at` (o raio) |
| `shadow=cor,dx,dy,desfoque` | uma sombra da cor, deslocada | cor: uma cor `#hex`; dx (para a direita), dy (para baixo) e desfoque: qualquer número, em pixels | dx 4, dy 6, desfoque 8 | não |
| `tint=cor,quanto` | tinge as formas com a cor | cor: uma cor `#hex`; quanto: de 0 a 1, e 1 é a cor chapada (fora disso, corta sem avisar) | quanto 0.5 | `key` e `at` (o quanto) |
| `brightness=` | clareia (acima de 1) ou escurece (abaixo de 1) | de 0 a 10 | 1 | `key` e `at` |
| `saturate=` | cores mais vivas (acima de 1) ou mais cinzentas (0 é cinza) | de 0 a 10 | 1 | `key` e `at` |
| `contrast=` | mais contraste (acima de 1) ou menos (abaixo de 1) | de 0 a 10 | 1 | `key` e `at` |
| `hue=` | gira as cores no círculo das cores | qualquer número, em graus | 0 | `key` e `at` |
| `trail=quadros,queda,cor` | rastro: as poses anteriores da animação ficam pintadas atrás, cada uma mais fraca | quadros: de 1 a 30 (arredonda; fora disso, erro); queda: de 0.05 a 0.95; quanto maior, mais fortes as cópias (fora disso, corta sem avisar); cor: uma cor `#hex`, opcional, que tinge as cópias | queda 0.5, sem cor | não |

**Cuidado:**
- O `trail=` só aparece com uma animação tocando: na pose parada, não há quadros anteriores.
- Uma `key` no `tint` de uma camada sem `tint=cor` avisa: sem a cor, não há o que pintar.

**Para aprender:** [Efeitos de camada](08-luz-efeitos.md#efeitos-de-camada) e [rastro](08-luz-efeitos.md#rastro-trail).

#### Luz e sombra

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `lit` | não muda nada: as camadas já recebem luz | — | — | não |
| `unlit` | a camada não recebe luz (nem das [`light`](#light), nem do [`ambient`](#ambient)) | — | desligada | não |
| `shade=` | quanto a luz clareia e escurece cada forma; também quanto uma forma escurece ao virar de lado em 3D | de 0 a 2 | 0.5 | não |
| `rim=cor,largura` | um fio de luz da cor na borda das formas fechadas, do lado de onde a luz vem | cor: uma cor `#hex`; largura: em pixels | largura 4 | não |
| `cast=chão,opacidade,desfoque` | uma sombra preta da camada cai deitada no chão, para longe da luz | chão: o nome de uma `line`; opacidade: de 0 a 1 (fora disso, corta sem avisar); desfoque: 0 ou mais, em pixels (abaixo de 0, vira 0 sem avisar) | opacidade 0.45, desfoque 6 | não |
| `from=` | a sombra do `cast=` sai com a silhueta destas camadas, e não com a desta | nomes de camadas, separados por vírgula | a própria camada | não |

**Cuidado:**
- `rim=` e `cast=` só aparecem com uma `light` na cena: o `ambient` sozinho não tem direção. A sombra do `cast=` precisa de uma luz acima do chão.
- `from=` sem `cast=` avisa e não faz nada.
- O chão do `cast=` precisa ser uma `line`; outra forma dá erro.

**Para aprender:** [O que recebe luz](08-luz-efeitos.md#o-que-recebe-luz) e [sombra projetada no chão](08-luz-efeitos.md#sombra-projetada-no-chão).

#### Profundidade e 2.5D

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `depth=` | num filme, a distância da camada: 1 é a distância da ação; maior fica mais longe (anda menos com a câmera e é pintada antes); menor fica mais perto | de 0.05 a 1000 | 1 | não |
| `screen` | num filme, a camada fica presa à tela: não anda com a câmera e fica por cima de tudo | — | desligada | não |
| `front` | num filme, a camada fica na frente dos atores que estão na mesma distância | — | desligada | não |
| `yaw=` | gira a camada inteira em 3D, em volta de um eixo em pé | qualquer número, em graus | 0 | `key` e `at` |
| `pitch=` | gira a camada inteira em 3D, em volta de um eixo deitado | qualquer número, em graus | 0 | `key` e `at` |
| `persp=` | a distância do olho: menor dá uma perspectiva mais forte; 0 tira a perspectiva | de 0 a 100000, em pixels | o dobro do lado maior do `canvas` | não |
| `pivot=x,y` | o centro do giro; com `floor`, a linha que fica parada | dois números, em pixels | o meio do `canvas`; com `floor`, o meio da borda de baixo | não |
| `floor` | deita a camada como um chão: o que está mais para cima vai para longe | — | desligada | não |
| `horizon=` | com `floor`, a altura do horizonte na tela | qualquer número, em pixels a partir de cima | 30% da altura do `canvas` | não |
| `zsort` | pinta as formas da camada de longe para perto, a cada quadro (no `iso`, de cima do mapa para baixo) | — | a ordem do arquivo | não |
| `iso` | mapa isométrico: o x do desenho vai para a direita e para baixo, o y para a esquerda e para baixo, e o `z=` das formas sobe | — | desligado | não |
| `iso=x,y` | o mesmo mapa, com o ponto 0,0 do desenho em x,y | dois números, em pixels | em cima, no meio do `canvas` | não |

**Cuidado:**
- Fora de um filme, `depth=`, `screen` e `front` não fazem nada.
- Com `floor` e sem `pitch=` nem `persp=`, o chão deita 45 graus. Sem `pitch=`, se o `horizon=` ficar na altura do `pivot=` ou abaixo dele, o chão não deita (sem aviso).
- `horizon=` sem `floor` avisa. Com `floor`, `persp=` e `pitch=` juntos, o `horizon=` não muda nada (aviso): use só dois dos três.
- `iso` não junta com `yaw=`, `pitch=` nem `floor`: vale o `iso` (aviso).
- `zsort` só muda a ordem quando o desenho tem 3D (`z=`, `yaw=`, `pitch=`, `floor`, `iso`…).

**Para aprender:** [Girar a camada inteira](11-profundidade.md#girar-a-camada-inteira-yaw-pitch-e-pivot), [chão em perspectiva](11-profundidade.md#chão-em-perspectiva-floor), [mapa isométrico](11-profundidade.md#mapa-isométrico-iso), [`zsort`](11-profundidade.md#quem-fica-na-frente-zsort), [profundidade no filme](10-filme.md#profundidade-e-paralaxe).

## Formas

As formas são o que aparece no desenho: formas fechadas (`shape`, `ellipse`, `rect`), traços (`stroke`, `line`), textos (`text`) e partículas (`emitter`).

### Opções de todas as formas

Estas opções valem em várias formas. Cada linha diz em quais.

- `shape`, `ellipse` e `rect` aceitam todas.
- `stroke` e `line` aceitam todas, menos as do contorno (`ink=`, `inkc=`, `weight=`, `inkon=`) e as do bloco (`thick=`, `thickc=`, `back=`).
- `text` aceita as mesmas do `stroke`, mais `ink=` e `inkc=`.
- `emitter` aceita só `opacity=`, `bone=`, `emit=`, `z=`, `hidden` e `lock`. O `c=` dele é diferente: está na ficha do [`emitter`](#emitter).

<!-- conferir -->
```weasel
canvas 300 120 bg=#22242e
# a forma do buraco fica escondida (hidden), mas continua valendo para o cut=
ellipse furo 80,60 20 hidden
rect placa 30,20 100,80 r=10 c=#4a90d9 ink=3 inkc=#ffffff cut=furo
# uma bola que brilha (emit=) e outra meio transparente (opacity=)
ellipse brasa 190,60 24 c=#ffd34d emit=#ff8a00,2
ellipse vidro 250,60 24 c=#ffffff opacity=0.4
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o nome | identifica a forma para `key`, `at`, `cut=`, `clip=`, `back=` e `mirror=`. Vale em: todas. | letras, números, `_` e `-`, começando com letra ou `_` (sem acento). Pode repetir: tudo o que usa o nome vale para todas as formas com ele | sem nome (a forma não pode ser animada nem recortar outra) | não |
| `c=` | a cor: o preenchimento das formas fechadas, a cor do traço, da linha e das letras. Vale em: todas (no `emitter`, veja a ficha dele). | uma cor; `none` deixa sem cor. Um `pattern` só preenche as formas fechadas: no `stroke`, na `line` e no `text`, avisa e usa a cor das linhas dele | a cor `ink` da [`palette`](#palette) (se você não a mudou, `#14141c`, quase preto); numa forma fechada com `ink=`, nenhuma (a forma fica vazia) | `key` |
| `opacity=` | a transparência da forma. Vale em: todas. | de 0 (invisível) a 1 (inteira) | 1 | `key` e `at` |
| `ink=` | a grossura do contorno: metade para dentro, metade para fora da borda (no `text`, só por fora). Vale em: `shape`, `ellipse`, `rect`, `text`. | uma espessura, em pixels | 0 (sem contorno) | `key` |
| `inkc=` | a cor do contorno. Vale em: `shape`, `ellipse`, `rect`, `text`. | uma cor (um `pattern` avisa e vira a cor das linhas dele) | a cor `ink` da `palette` | `key` |
| `weight=` | engrossa o contorno do lado oposto à luz e afina do lado dela; a luz vem do `light=` do [`canvas`](#canvas). Vale em: `shape`, `ellipse`, `rect`. | de 0 a 3 | 0 (contorno igual em volta) | não |
| `inkon=` | pinta o contorno em outra camada: numa camada pintada antes, só a metade de fora aparece; numa pintada depois, o contorno fica por cima. Vale em: `shape`, `ellipse`, `rect`. | o nome de uma camada (pode vir antes ou depois no arquivo); só com `ink=` maior que 0 | a camada da forma | não |
| `bone=` | a forma inteira segue o osso. Vale em: todas. | o nome de um [`bone`](#bone) | nenhum | não |
| `bones=a,b,…` | a forma dobra: cada ponto segue os ossos mais perto dele. Vale em: `shape`, `stroke`, `line`, `ellipse`, `rect` (no `text`, avisa e não vale). | dois ou mais nomes de ossos, separados por vírgula | nenhum | não |
| `cloth=` | a forma balança como um tecido. Vale em: `shape`, `stroke`, `line`, `ellipse`, `rect` (o `text` aceita, mas não muda nada). | o nome de um [`cloth`](#cloth) | nenhum | não |
| `cut=a,b,…` | abre buracos com o formato de outras formas; o contorno também passa pela borda dos buracos. Vale em: `shape`, `ellipse`, `rect` (o `stroke`, a `line` e o `text` aceitam, mas não recortam). | nomes de formas fechadas, separados por vírgula | nenhum | não |
| `mirror=forma@x` | esta linha vira uma cópia de outra forma, refletida num espelho. Vale em: todas, menos `emitter`. | o nome de uma forma do mesmo comando, mais `@` e um número (espelho em pé nesse x), `@y` e um número (espelho deitado nesse y, como `@y300`) ou nada (espelho em pé no meio do `canvas`) | — | não |
| `emit=cor,força` | a forma brilha: um halo da cor em volta, e ela deixa de receber luz. Vale em: todas. | cor: uma cor `#hex`; força: de 0 a 10 (fora disso, corta sem avisar) | força 1 | não |
| `z=` | a distância da tela: positivo é mais perto, negativo mais longe. Vale em: todas. | qualquer número, em pixels | 0 | `key` e `at` |
| `yaw=` | gira a forma em 3D em volta de um eixo em pé que passa pelo meio dela. Vale em: todas, menos `emitter`. | qualquer número, em graus | 0 | `key` e `at` |
| `pitch=` | gira a forma em 3D em volta de um eixo deitado que passa pelo meio dela. Vale em: todas, menos `emitter`. | qualquer número, em graus | 0 | `key` e `at` |
| `persp=` | a distância do olho no giro desta forma (`yaw=`, `pitch=`): menor dá uma perspectiva mais forte; 0 tira a perspectiva. Vale em: todas, menos `emitter`. | de 0 a 100000, em pixels | o dobro do lado maior do `canvas` | não |
| `thick=` | dá espessura: a forma vira um bloco, para trás (no `iso`, para cima). Vale em: `shape`, `ellipse`, `rect`. | de 0 a 10000, em pixels | 0 | não |
| `thickc=` | a cor dos lados do bloco. Vale em: `shape`, `ellipse`, `rect`. | uma cor `#hex` | a cor do `c=` 20% mais escura; se o `c=` não for uma cor `#hex`, a cor do contorno | não |
| `back=` | o verso: a forma que aparece no lugar desta quando ela fica de costas. Vale em: `shape`, `ellipse`, `rect`. | o nome de uma forma fechada (ponha `hidden` nela) | nenhum (de costas, aparece a própria forma, espelhada) | não |
| `hidden` | não pinta a forma, mas ela continua valendo para recortar (`cut=`, `clip=`) e como verso (`back=`) e para o `mirror=`. Vale em: todas. | — | a forma aparece | não |
| `lock` | só o editor lê: a forma não se escolhe nem se arrasta pelo desenho; a imagem não muda. Vale em: todas. | — | destravada | não |
| `billboard` | a forma fica sempre de frente quando a camada ou um osso gira em 3D: só o ponto de apoio (o meio da base) anda. Vale em: todas, menos `emitter`. | — | desligada | não |

A [`key`](#key) muda as formas numa animação; o [`at`](#at) só muda as formas do próprio arquivo do filme.

**Cuidado:**
- `hidden`, `lock`, `bold`, `italic` e `billboard` são palavras soltas: uma forma não pode ter um desses nomes.
- Numa animação, uma forma `hidden` nunca aparece: uma `key` com `show=1` não muda isso (aviso). Num filme, `at forma.show=1` mostra.
- `z=`, `thick=`, `back=` e `billboard` só mudam a imagem quando alguma coisa gira em 3D (o `yaw=` ou o `pitch=` da forma, de um osso ou da camada, o `floor` ou o `iso` da camada). O `z=` também decide a ordem do `zsort`.
- O `thick=` não vale numa forma `billboard`.
- O verso do `back=` sem `hidden` avisa: ele apareceria também sozinho.
- `bones=` precisa de dois ossos ou mais (com um, avisa: use `bone=`). Não junta com `cloth=` nem com pontos `@osso` (aviso).
- No `cut=`, a forma que recorta precisa ser fechada (`shape`, `ellipse` ou `rect`): um nome de camada dá erro. Todas as formas com aquele nome abrem buraco, e buracos que se cruzam viram um só.
- No `mirror=`, a forma copiada precisa ter nome e ser do mesmo comando. A cópia leva as opções dela; as que você escrever na linha do `mirror=` trocam essas. Os pontos escritos na linha do `mirror=` são ignorados (aviso).

**Para aprender:** [O que vale em toda forma](02-formas.md#o-que-vale-em-toda-forma), [contorno](03-cores.md#o-contorno-ink-e-inkc), [buracos com `cut=`](04-camadas.md#recortar-por-fora-cut), [`inkon=`](04-camadas.md#o-contorno-por-cima-inkon), [`emit=`](08-luz-efeitos.md#coisas-que-brilham-emit), [`bones=`](08-ossos.md#formas-que-dobram-bones), [`cloth=`](08-ossos.md#tecido-cloth), [`mirror=`](06-componentes.md#espelho-de-uma-forma-mirror), [2.5D nas formas](11-profundidade.md#as-três-direções), [`thick=` e `back=`](11-profundidade.md#uma-carta-que-vira-back-e-thick), [`billboard`](11-profundidade.md#de-pé-ou-deitado-billboard-numa-forma).

### `shape`

Uma forma fechada livre, feita de pontos. A curva passa por todos os pontos e volta do último ao primeiro.

```
shape [nome] [opções] : ponto ponto ponto …
```

<!-- conferir -->
```weasel
canvas 300 140 bg=#f4efe6
# uma folha: os pontos lisos fazem curvas; o ! faz um canto
shape folha c=#6cbb3c ink=3 : 40,70! 100,30 160,70! 100,110
# uma estrela só de cantos, sem contorno
shape estrela c=#ffd34d : 230,20! 242,52! 276,52! 248,72! 258,104! 230,84! 202,104! 212,72! 184,52! 218,52!
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| os pontos (depois do `:`) | o contorno da forma | 3 ou mais pontos: `x,y` (liso), `x,y!` (canto), `x,y~dx,dy` (com alça), `x,y~ax,ay~bx,by` (alça quebrada), `x,y@osso` ou `x,y@osso:peso` (preso a um osso; peso de 0 a 1), em pixels | obrigatório | não |
| `smooth=` | quanto os pontos lisos arredondam a curva | de 0 a 2 (0: retas entre os pontos; 2: bem redondo) | 1 | não |

Também aceita as [opções de todas as formas](#opções-de-todas-as-formas): `c=` `opacity=` `ink=` `inkc=` `weight=` `inkon=` `bone=` `bones=` `cloth=` `cut=` `mirror=` `emit=` `z=` `yaw=` `pitch=` `persp=` `thick=` `thickc=` `back=` `hidden` `lock` `billboard`.

**Cuidado:**
- Sem `c=` e sem `ink=`, a forma sai pintada na cor `ink` da `palette`. Com `ink=` e sem `c=`, ela fica vazia: só o contorno aparece.
- Com menos de 3 pontos, dá erro.
- `smooth=0` deixa os pontos lisos em canto, mas os pontos com alça (`~`) continuam curvos.
- O `shape` não tem `rot=` (aviso de atributo desconhecido): para girar, use um osso (`bone=`).
- O peso do `@osso` fora de 0 a 1 avisa e é cortado.

**Para aprender:** [Formas livres com pontos](02-formas.md#formas-livres-com-pontos-shape), [a alça da curva](02-formas.md#curvas-sob-medida-alças), [pontos presos a um osso](08-ossos.md#pontos-presos-a-um-osso-osso).

### `stroke`

Um traço aberto e liso, como o de um pincel. Com `hip=`, vira um braço ou uma perna que dobra sozinho (IK).

```
stroke [nome] [opções] : ponto ponto …
stroke [nome] hip=x,y foot=chão,x [on=osso] [limb=grossura1,grossura2] [opções]
stroke [nome] hip=x,y target=osso [on=osso] [limb=grossura1,grossura2] [opções]
```

<!-- conferir -->
```weasel
canvas 300 120 bg=#f4efe6
# um traço grosso e liso, que afina até sumir no fim
stroke pena c=#6a4bc4 w=14 taper=0,1 : 20,90 80,30 150,20
# pontas quadradas (cap=square) e cantos vivos (!)
stroke raio c=#ff6b4a w=6 cap=square : 180,20 230,60! 200,60! 260,100
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| os pontos (depois do `:`) | o caminho do traço | 2 ou mais pontos, como no `shape` (`!`, `~` e `@osso` valem), em pixels | obrigatório (menos num membro) | não |
| `w=` | a grossura do traço | uma espessura, em pixels | 4 | `key` |
| `taper=início,fim` | afina as pontas: 0 não afina, 1 afina até sumir | exatamente dois números, de 0 a 1 (fora disso, corta sem avisar) | 0,0 | não |
| `cap=` | o formato das pontas | `round` (redonda), `butt` (reta, no ponto) ou `square` (reta, passando do ponto) | `round` | não |
| `smooth=` | quanto os pontos lisos arredondam a curva | de 0 a 2 | 1 | não |
| `limb=grossura1,grossura2` | faz do traço um membro: a grossura na raiz e na ponta | um ou dois números, em pixels (um só vale para as duas) | o `w=` | não |
| `hip=x,y` | onde o membro nasce | dois números, em pixels | obrigatório no membro | não |
| `on=` | o osso que leva a raiz (`hip=`) do membro | o nome de um `bone` | nenhum | não |
| `foot=chão,x` | onde fica o pé: em cima da `line` chão, na posição x; ou `foot=x,y`, num ponto fixo | o nome de uma `line` e um número, ou dois números, em pixels | — | não |
| `target=` | a ponta do membro vai até o pivô desse osso (um braço que alcança) | o nome de um `bone` | — | não |
| `bend=` | para que lado e quanto o membro dobra: o sinal escolhe o lado; de 0 a 1, quanto dobra | de −3 a 3 (acima de 1, ou abaixo de −1, dobra igual a 1 ou −1) | 1 | não |

Também aceita as [opções de todas as formas](#opções-de-todas-as-formas): `c=` `opacity=` `bone=` `bones=` `cloth=` `cut=` `mirror=` `emit=` `z=` `yaw=` `pitch=` `persp=` `hidden` `lock` `billboard`.

**Cuidado:**
- Sem `c=`, o traço sai na cor `ink` da `palette`.
- `cap=` não vale junto com `taper=`: o traço afinado tem sempre as pontas redondas (aviso).
- O `taper=` precisa dos dois números: `taper=0.5` dá erro.
- Um traço vira membro com `limb=`, `hip=`, `foot=` ou `target=`. O membro precisa de `hip=` e de `foot=` ou `target=` (sem eles, erro). Os pontos depois do `:` não valem no membro, e o `taper=` também não.
- `on=` e `bend=` num traço que não é membro não fazem nada (sem aviso).
- O `stroke` não tem contorno: `ink=` avisa.

**Para aprender:** [Traço aberto](02-formas.md#traço-aberto-stroke), [pontas](02-formas.md#pontas-cap), [afinar as pontas](02-formas.md#afinar-as-pontas-taper), [pernas e braços com IK](08-ossos.md#pernas-e-braços-com-ik).

### `line`

Retas de um ponto a outro, como uma régua. Serve também de chão para o `cast=` da camada e para o `foot=` de um membro.

```
line [nome] [opções] : ponto ponto …
```

<!-- conferir -->
```weasel
canvas 300 100 bg=#f4efe6
# retas de ponto a ponto
line telhado c=#2b2a33 w=3 : 20,80 80,20 140,80
# tracejada: 8 pixels de traço e 5 de vão
line regua c=#e8443a w=2 dash=8,5 : 170,50 280,50
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| os pontos (depois do `:`) | onde a linha passa, sempre em retas | 2 ou mais pontos, em pixels (`@osso` vale; `!` e `~` não mudam nada) | obrigatório | não |
| `w=` | a grossura da linha | uma espessura, em pixels | 1 | `key` |
| `dash=traço,vão,…` | tracejado: o comprimento de cada traço e de cada vão | de 1 a 8 números maiores que 0, em pixels; com um número ímpar deles, a lista se repete | sem tracejado | não |

Também aceita as [opções de todas as formas](#opções-de-todas-as-formas): `c=` `opacity=` `bone=` `bones=` `cloth=` `cut=` `mirror=` `emit=` `z=` `yaw=` `pitch=` `persp=` `hidden` `lock` `billboard`.

**Cuidado:**
- Sem `c=`, a linha sai na cor `ink` da `palette`.
- As pontas da `line` são sempre retas, no ponto. Com `dash=2,6` e `w=8`, cada traço sai como um tracinho em pé.
- Mais de 8 números no `dash=` dá erro. Um número negativo, ou só zeros, passa sem aviso, mas a exportação pela linha de comando para com um erro.
- `smooth=` não existe na `line` (aviso).

**Para aprender:** [Linha reta](02-formas.md#linha-reta-line) e [tracejado](02-formas.md#tracejado-dash).

### `ellipse`

Um círculo ou uma elipse.

```
ellipse [nome] cx,cy raio [opções]
ellipse [nome] cx,cy raioX,raioY [opções]
```

<!-- conferir -->
```weasel
canvas 300 120 bg=#f4efe6
# um círculo de raio 40 e uma elipse deitada, girada 20 graus
ellipse bola 70,60 40 c=#ff6b4a
ellipse ovo 200,60 70,35 c=#4a90d9 ink=3 rot=20
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o centro `cx,cy` | onde fica o meio | dois números, em pixels | obrigatório | não |
| o raio | a distância do centro à borda; com dois números, o da largura e o da altura | um ou dois números, em pixels (negativo desenha como positivo; 0 não aparece) | obrigatório | não |
| `rot=` | gira em volta do centro | qualquer número, em graus (positivo: sentido do relógio) | 0 | não |

Também aceita as [opções de todas as formas](#opções-de-todas-as-formas): `c=` `opacity=` `ink=` `inkc=` `weight=` `inkon=` `bone=` `bones=` `cloth=` `cut=` `mirror=` `emit=` `z=` `yaw=` `pitch=` `persp=` `thick=` `thickc=` `back=` `hidden` `lock` `billboard`.

**Cuidado:**
- Sem `c=` e sem `ink=`, a elipse sai pintada na cor `ink` da `palette`. Com `ink=` e sem `c=`, ela fica vazia: só o contorno aparece.
- Num círculo, `rot=` não muda nada.

**Para aprender:** [Elipse e círculo](02-formas.md#círculo-e-elipse-ellipse).

### `rect`

Um retângulo, com ou sem cantos redondos.

```
rect [nome] x,y largura,altura [opções]
```

<!-- conferir -->
```weasel
canvas 300 120 bg=#f4efe6
# x,y é o canto de cima à esquerda; depois vêm a largura e a altura
rect caixa 20,20 120,80 c=#4a90d9 ink=3
# cantos redondos (r=16), girado 15 graus em volta do meio
rect cartao 170,30 100,60 r=16 rot=15 c=#ffb000
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o canto `x,y` | o canto de cima à esquerda | dois números, em pixels | obrigatório | não |
| o tamanho `largura,altura` | a largura e a altura | dois números, em pixels (negativo desenha para o outro lado) | obrigatório | não |
| `r=` | o raio dos cantos redondos | 0 ou mais, em pixels (acima da metade do lado menor, fica na metade, sem avisar) | 0 (cantos vivos) | não |
| `rot=` | gira em volta do meio do retângulo | qualquer número, em graus (positivo: sentido do relógio) | 0 | não |

Também aceita as [opções de todas as formas](#opções-de-todas-as-formas): `c=` `opacity=` `ink=` `inkc=` `weight=` `inkon=` `bone=` `bones=` `cloth=` `cut=` `mirror=` `emit=` `z=` `yaw=` `pitch=` `persp=` `thick=` `thickc=` `back=` `hidden` `lock` `billboard`.

**Cuidado:**
- Sem `c=` e sem `ink=`, o retângulo sai pintado na cor `ink` da `palette`. Com `ink=` e sem `c=`, ele fica vazio: só o contorno aparece.
- Com a largura ou a altura negativa e `r=`, os cantos saem curvados para dentro. Use um tamanho positivo e mude o `x,y`.

**Para aprender:** [Retângulo](02-formas.md#retângulo-rect) e [cantos redondos](02-formas.md#cantos-redondos-r).

### `text`

Um texto de uma linha.

```
text [nome] x,y "texto" [opções]
```

<!-- conferir -->
```weasel
canvas 300 120 bg=#f4efe6
# x,y é o começo da linha de base: as letras "sentam" no y
text titulo 20,50 "Olá!" size=36 bold c=#ff6b4a ink=2 inkc=#2b2a33
# com align=center, o x fica no meio do texto
text legenda 150,95 "um texto centrado" size=18 align=center italic
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o ponto `x,y` | onde o texto se apoia: na linha de base, onde as letras "sentam" (com `align=left`, no começo do texto) | dois números, em pixels | obrigatório | não |
| o texto | as letras | entre aspas duplas; uma linha só, sem aspas dentro | obrigatório | não |
| `size=` | o tamanho da fonte (as maiúsculas ficam com uns 70% disso) | de 1 a 2000, em pixels | 24 | não |
| `font=` | a fonte | o nome de uma fonte; com espaço, entre aspas (`font="Comic Sans MS"`) | `sans-serif` | não |
| `align=` | em que parte do texto fica o x | `left` (o começo), `center` (o meio) ou `right` (o fim) | `left` | não |
| `rot=` | gira em volta do ponto `x,y` | qualquer número, em graus (positivo: sentido do relógio) | 0 | não |
| `bold` | letras em negrito | — | desligado | não |
| `italic` | letras inclinadas (itálico) | — | desligado | não |

Também aceita as [opções de todas as formas](#opções-de-todas-as-formas): `c=` `opacity=` `ink=` `inkc=` `bone=` `bones=` `cloth=` `cut=` `mirror=` `emit=` `z=` `yaw=` `pitch=` `persp=` `hidden` `lock` `billboard`. No `text`, `bones=` avisa e não vale; `cloth=` e `cut=` são aceitos, mas não fazem nada.

**Cuidado:**
- Sem `c=`, as letras saem na cor `ink` da `palette`, mesmo com `ink=`. Para letras vazadas, escreva `c=none`.
- O contorno das letras fica só por fora: `ink=2` dá 2 pixels em volta. Com `c=none`, ele aparece com o dobro da grossura, metade para dentro.
- Sem as aspas, dá erro.
- Se a fonte não existir no computador, o texto sai numa fonte padrão.
- `weight=` e `inkon=` não existem no `text` (aviso).

**Para aprender:** [Texto](02-formas.md#texto-text), [fonte e tamanho](02-formas.md#fonte-e-tamanho-font-e-size), [giro do texto](02-formas.md#girar-o-texto) e [contorno do texto](03-cores.md#o-contorno-no-texto).

### `emitter`

Um emissor de partículas: faíscas, chuva, fumaça, bolhas. Ele solta partículas que andam sozinhas, cada uma com um pouco de sorteio.

```
emitter [nome] x,y [opções]
```

<!-- conferir -->
```weasel
canvas 240 160 bg=#22242e
# faíscas de uma fogueira: sobem (angle=-90), diminuem e mudam de cor
emitter fogo 120,140 rate=40 life=1.2 speed=70 spread=50 size=8,2 c=#ffd34d,#ff4a1c shape=soft area=30,4 emit=#ff8a00
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| a origem `x,y` | onde as partículas nascem (o meio da `area=`) | dois números, em pixels | obrigatório | não |
| `rate=` | quantas partículas nascem por segundo | de 0 a 2000 | 20 | não |
| `burst=` | uma rajada de partículas de uma vez: no começo de cada volta do loop (sem loop, só no começo) | de 0 a 5000 (arredonda) | 0 | não |
| `life=` | quanto tempo cada partícula vive (cada uma varia até 25% para mais ou para menos) | de 0.02 a 60, em segundos | 1 | não |
| `speed=` | a velocidade da partícula ao nascer (cada uma varia até 30%) | de 0 a 100000, em pixels por segundo | 80 | não |
| `angle=` | a direção em que as partículas saem | qualquer número, em graus: 0 é para a direita, 90 para baixo, −90 para cima | −90 | não |
| `spread=` | a abertura em volta do `angle=` (metade para cada lado) | de 0 a 360, em graus | 40 | não |
| `gravity=` | puxa as partículas para baixo (negativo: para cima) | qualquer número, em pixels por segundo a cada segundo | 0 | não |
| `wind=` | puxa as partículas para a direita (negativo: para a esquerda) | qualquer número, em pixels por segundo a cada segundo | 0 | não |
| `drag=` | um freio: as partículas perdem velocidade com o tempo | de 0 a 100 (0: sem freio) | 0 | não |
| `size=início,fim` | o tamanho (o diâmetro) ao nascer e ao morrer | um ou dois números, em pixels (um só vale para os dois; 0 ou menos não aparece) | 4 | não |
| `c=início,fim` | a cor ao nascer e ao morrer | uma ou duas cores `#hex` (a transparência da cor vale) | a cor `ink` da `palette` | não |
| `shape=` | o formato de cada partícula | `dot` (bolinha), `soft` (bolinha borrada, com o dobro do tamanho), `square` (quadradinho girado), `streak` (risco na direção do movimento) ou `star` (estrela) | `dot` | não |
| `area=largura,altura` | o retângulo onde as partículas nascem, com o meio em `x,y` | um ou dois números, em pixels (um só faz um quadrado) | 0 (todas no mesmo ponto) | não |
| `seed=` | troca o sorteio: o mesmo número dá sempre as mesmas partículas | qualquer número | 1 | não |

Também aceita as [opções de todas as formas](#opções-de-todas-as-formas): `opacity=` `bone=` `emit=` `z=` `hidden` `lock`.

**Cuidado:**
- Sem `c=`, as partículas saem na cor `ink` da `palette`. O `c=` do `emitter` só aceita cor `#hex` (ou um nome da `palette` que guarde uma): um nome do CSS avisa.
- Sem animação, a imagem mostra as partículas paradas num instante: depois de 1,25 vez o `life=` (só com `burst=`, depois de 0,35 vez o `life=`). Num filme, elas andam com o tempo do filme.
- Numa animação em loop, o `rate=` se ajusta para dar um número inteiro de partículas por volta: o loop fecha sem pulo.
- O `burst=` soma ao `rate=`. Para ter só a rajada, escreva `rate=0`. Com `rate=0` e sem `burst=`, o emissor não solta nada (aviso).
- Com `bone=`, o lugar onde elas nascem anda com o osso; depois de nascer, cada partícula segue sozinha.
- As partículas recebem luz, cada uma a do ponto onde está, a não ser com `emit=` ou numa camada `unlit`.
- As outras opções de todas as formas (`cut=`, `mirror=`, `yaw=`, `thick=`…) não valem no `emitter`: elas avisam (atributo desconhecido).

**Para aprender:** [Partículas](08-luz-efeitos.md#partículas), [o formato](08-luz-efeitos.md#o-formato-shape), [a direção](08-luz-efeitos.md#a-direção-angle-e-spread), [as forças](08-luz-efeitos.md#as-forças-gravity-wind-e-drag), [uma rajada só](08-luz-efeitos.md#uma-rajada-só-burst).

## Componentes e repetição

Desenhos que se repetem: um componente (`def`) usado muitas vezes (`use`), linhas que se repetem com uma conta (`repeat`) e linhas juntadas para o editor (`group`).

### `def` e `end`

Um `def` guarda um desenho com nome, um **componente**, para você pôr no desenho quantas vezes quiser com o `use`. O desenho dele fica em volta da **origem**, o ponto `0,0`. O `end` fecha o `def`; ele também fecha um `group` e um `repeat`.

```
def nome [parâmetro=padrão …]
  formas, use, repeat, group…
end
```

<!-- conferir -->
```weasel
canvas 320 150 bg=#f4efe6
palette ink=#2b2a33 folha=#6cbf4a
let alto=50
# a flor fica em volta da origem 0,0; cor= e tam= são parâmetros
def flor cor=#ff6b4a tam=1
  stroke caule w=4 c=#4c9a3a : 0,0 0,{-alto}
  ellipse folhaE -12,{-alto/2} 12,5 rot=-25 c=folha
  ellipse folhaD mirror=folhaE@0
  ellipse miolo 0,{-alto-10} {12*tam} c=cor ink=2
end
use flor 60,135
use flor 160,135 cor=#ffd34d tam=1.4
# só nesta cópia: outra cor da palette e outro valor do let
use flor 260,135 folha=#2e7d32 alto=80
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o nome | o nome do componente, que o `use` chama | um nome sem acento, que não se repete em outro `def` | obrigatório | não |
| um parâmetro `nome=padrão` | um valor que cada `use` pode trocar. Um número vale nas contas `{…}` e como espessura (`ink=tam`); outro valor vale como cor (`c=cor`) | um número, uma cor ou um gradiente (um `pattern` não vale) | o valor escrito no `def` | não |
| `end` | fecha o `def` | — | obrigatório | não |

**O que vale dentro de um `def`:**

- as formas: `shape`, `stroke`, `line`, `ellipse`, `rect`, `text` e `emitter`;
- o `use` de outro componente (até 8 componentes um dentro do outro);
- o `repeat` (os limites dele usam números ou variáveis do `let`, não os parâmetros do `def`);
- o `group`;
- o `mirror=` de uma forma, espelhando outra forma do mesmo `def`;
- o `include` de um arquivo que só tenha formas e `use`.

Qualquer outra linha (`layer`, `bone`, `anim`, `light`, `palette`, `let`, outro `def`…) dentro de um `def` dá erro.

**Nas contas `{…}` de dentro** valem os parâmetros numéricos do `def` e as variáveis do `let`. O `let` fica fora do `def`, em qualquer lugar do arquivo.

**Cuidado:**
- O `def` sozinho não desenha nada: só o `use` põe o componente no desenho. Mesmo sem `use`, os erros de dentro dele aparecem.
- O `def` pode ficar antes ou depois do `use`.
- Um `let` dentro do `def` dá erro. Escreva o `let` fora: as variáveis dele valem lá dentro.
- Um parâmetro sem `=` (`def flor tam`) é ignorado, sem aviso.
- Uma forma de dentro tem o mesmo nome em todas as cópias: `key 6 miolo.c=#ffffff` muda o miolo de todas as flores. Para animar uma cópia só, prenda essa cópia num osso (`use … bone=`).

**Para aprender:** [Componentes](06-componentes.md#componentes-def-e-use) e [`repeat` dentro do componente](06-componentes.md#repeat-dentro-do-componente).

### `use`

Põe uma cópia de um componente (`def`) no desenho. A origem `0,0` do componente vai para o ponto `x,y`.

```
use componente [x,y] [opções] [parâmetro=valor …] [lock] [billboard]
```

<!-- conferir -->
```weasel
canvas 380 120 bg=#f4efe6
palette ink=#2b2a33
# uma seta apontando para a direita, com a ponta de trás na origem 0,0
def seta cor=#4a90d9
  shape corpo c=cor ink=2 : 0,-8! 30,-8! 30,-18! 50,0! 30,18! 30,8! 0,8!
end
use seta 20,60
use seta 90,60 scale=1.5
use seta 190,40 rot=45 cor=#ff6b4a
# flip=x vira para a esquerda; opacity= deixa a cópia meio transparente
use seta 350,60 flip=x opacity=0.5
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o componente | qual `def` usar | o nome de um `def` | obrigatório | não |
| o ponto `x,y` | onde a origem `0,0` do componente vai parar | dois números, em pixels | `0,0` | não |
| `scale=` | o tamanho, em volta do ponto `x,y`. O contorno engrossa junto | um número (`scale=2`) ou dois (`scale=largura,altura`); qualquer número (negativo espelha, 0 some) | 1 | não |
| `rot=` | gira a cópia em volta do ponto `x,y` | qualquer número, em graus (positivo: sentido do relógio) | 0 | não |
| `flip=` | espelha a cópia | `x` (vira para o outro lado), `y` (de cabeça para baixo) ou `xy` (os dois) | sem espelho | não |
| `opacity=` | a transparência da cópia inteira; multiplica a `opacity=` de cada forma de dentro | de 0 a 1 | 1 | não |
| `bone=` | a cópia inteira segue o osso. Uma forma de dentro com `bone=` própria segue o osso dela | o nome de um osso | nenhum | não |
| `cloth=` | a cópia inteira balança com o tecido | o nome de um `cloth` | nenhum | não |
| `z=` | a profundidade 2.5D: soma ao `z=` de cada forma de dentro | qualquer número, em pixels (positivo: mais perto) | 0 | não |
| um parâmetro `nome=valor` | troca, só nesta cópia, um valor (veja abaixo) | como no `def`; aceita conta `{…}` | o valor do `def` | não |
| `lock` | trava a cópia no editor: o desenho não deixa escolher nem arrastar | — | — | não |
| `billboard` | num chão `floor` ou numa camada girada em 3D, a cópia inteira fica de pé e de frente para você, presa no ponto `x,y` (só diminui com a distância) | — | — | não |

**O que o `use` troca só naquela cópia** (`nome=valor`):

- um parâmetro do `def` (`cor=#ffd34d`);
- uma cor ou um número da `palette` (`ink=#ff0000`, `line=6`);
- um `gradient`, por uma cor ou por outro gradiente;
- um `pattern`, por uma cor;
- uma variável do `let` (`alto=80`).

Um nome que não é nada disso dá um aviso com a lista dos parâmetros do `def`.

**Cuidado:**
- `scale=-1,1` é o mesmo que `flip=x`, mas o `flip=` fica mais fácil de ler.
- Um `pattern` não pode ser o valor de um parâmetro: no `def` ou no `use`, dá erro (`cor desconhecida`). E um `use` que troca um `pattern` por outro (`listras=bolinhas`) não muda nada, sem aviso.
- Um componente dentro do outro vai até 8 níveis. Um componente que usa a si mesmo dá erro.
- O `use` não tem nome: uma `key` não muda a cópia inteira. Para animar a cópia, prenda num osso (`bone=`) e anime o osso.

**Para aprender:** [Parâmetros](06-componentes.md#parâmetros-números-e-cores), [Tamanho e giro](06-componentes.md#tamanho-e-giro-scale-e-rot), [Espelhar](06-componentes.md#espelhar-flip) e [Transparência](06-componentes.md#transparência-opacity).

### `repeat`

Repete as linhas até o `end`. A cada volta, uma variável muda de valor, e ela vale nas contas `{…}` das linhas de dentro.

```
repeat variável início..fim
  linhas
end
```

<!-- conferir -->
```weasel
canvas 340 190 bg=#f4efe6
palette ink=#2b2a33
# i vale 0, 1, 2, 3, 4 e 5: seis bolas, cada uma maior
repeat i 0..5
  ellipse {30+i*55},30 {6+i*2} c=#ff6b4a
end
# um repeat dentro do outro: a linha lin tem lin+1 bolas
repeat lin 0..3
  repeat col 0..lin
    ellipse {40+col*30},{80+lin*30} 10 c=#4a90d9 ink=2
  end
end
# de trás para a frente: n vale 5, 4, 3, 2 e 1
repeat n 5..1
  rect {200+(5-n)*25},{170-n*15} 20,{n*15} c=#6cbf4a
end
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| a variável | o nome que muda a cada volta | um nome sem acento | obrigatório | não |
| o intervalo `início..fim` | o primeiro e o último valor da variável, de 1 em 1 | dois números ou contas (`0..9`, `1..{n}`, `0..n-1`), arredondados | obrigatório | não |

**Os limites:**

- Até 1000 voltas num `repeat` (`0..999`). Mais que isso dá erro.
- O arquivo inteiro, com todas as voltas, pode ter até 20000 linhas. Mais que isso dá erro.
- Com `início` maior que `fim`, conta para trás: `repeat n 5..1` dá 5, 4, 3, 2, 1.
- Um `repeat` pode ficar dentro de outro, e os limites do de dentro podem usar a variável do de fora (`repeat col 0..lin`).
- Os limites podem usar as variáveis do `let`. Dentro de um `def`, não podem usar os parâmetros dele (dá erro).

**Cuidado:**
- Um `{i}` num nome vira número com zeros à esquerda, do tamanho da conta: `ellipse p{i}` dá `p000`, `p001`, `p002`… É por esse nome que a `key` acha a forma (`key 0 p001.opacity=0`).
- Um `let` dentro do `repeat` não enxerga a variável dele (dá erro). Escreva a conta direto na linha.
- Um `repeat` sem o `end` dá erro.

**Para aprender:** [Repetir](05-contas.md#repetir-repeat), [Um `repeat` dentro do outro](05-contas.md#um-repeat-dentro-do-outro) e [De trás para a frente](05-contas.md#de-trás-para-a-frente).

### `group`

Junta linhas para o editor escolher, mover e travar todas juntas. A imagem não muda. O `end` fecha o grupo.

```
group [nome] [lock]
  linhas
end
```

<!-- conferir -->
```weasel
canvas 200 160 bg=#f4efe6
palette ink=#2b2a33
layer boneco
# o rosto e os olhos andam juntos no editor; os olhos estão travados
group cabeca
  ellipse rosto 100,80 40 c=#f0c8a0 ink=2
  group olhos lock
    ellipse olhoE 86,75 5,6 c=ink
    ellipse olhoD 114,75 5,6 c=ink
  end
end
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o nome | o nome do grupo, para você se achar no código | um nome sem acento | nenhum | não |
| `lock` | trava o grupo inteiro no editor: o desenho não deixa escolher nem arrastar as formas de dentro | — | — | não |

**As regras:**

- O grupo fica dentro de uma camada: uma linha `layer` no meio dele dá erro.
- Um grupo pode ter outro grupo dentro.
- Um grupo pode ficar dentro de um `def`. Um `def` dentro de um grupo dá erro.
- Uma opção `nome=` no `group` dá aviso e não faz nada.

No editor, Ctrl+G escreve o `group` e o `end` em volta das formas escolhidas.

**Para aprender:** [Grupos](06-componentes.md#grupos-group) e [travas](04-camadas.md#travar-no-editor-lock).

## Ossos e animação

O esqueleto (`bone`, `cloth`, `ik`) e as animações (`anim`, `key`, `event`). As formas se prendem a um osso com `bone=`; a animação muda os ossos e as formas quadro a quadro.

### `bone`

Um osso: um ponto, o **pivô**, em volta do qual as formas presas a ele (`bone=nome`) giram, andam e esticam. No desenho parado, as formas ficam onde foram desenhadas; quem mexe o osso é a `key` de uma animação.

```
bone nome pivot=x,y [opções]
```

<!-- conferir -->
```weasel
canvas 260 220 bg=#f4efe6
palette ink=#2b2a33 pele=#f0c8a0
# o antebraço é filho do braço: gira junto com ele
bone braco pivot=60,180
bone antebraco parent=braco pivot=130,180
# a pena balança sozinha: 15 graus, uma ida e volta por segundo
bone pena parent=antebraco pivot=190,180 sway=15,1
rect b 50,170 80,20 r=10 c=pele ink=2 bone=braco
rect a 120,172 70,16 r=8 c=pele ink=2 bone=antebraco
stroke p w=4 c=#e8443a bone=pena : 190,180 205,140
anim acena frames=24 fps=12
key 0 braco=0,0,0 antebraco=0,0,0
key 12 braco=0,0,-25 antebraco=0,0,-50
key 24 braco=0,0,0 antebraco=0,0,0
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o nome | o nome do osso, para o `bone=` das formas e para a `key` | um nome sem acento, que não se repete | obrigatório | não |
| `pivot=x,y` | o pivô: o ponto em volta do qual o osso gira | dois números, em pixels | obrigatório | não |
| `parent=` | o osso pai: o filho anda e gira junto com ele, e ainda tem o próprio movimento | o nome de outro osso (pode vir depois no arquivo; ossos em ciclo dão erro) | nenhum | não |
| `sway=graus,segundos[,fase]` | balança sozinho, para um lado e para o outro | graus: qualquer número (para cada lado); segundos: maior que 0 (uma ida e volta); fase: qualquer número, em graus | sem balanço | não |
| `bob=pixels,segundos[,fase]` | sobe e desce sozinho (positivo: desce primeiro) | pixels: qualquer número; segundos e fase como no `sway=` | parado | não |
| `jitter=` | treme: a cada quadro, anda um pouco para um lado qualquer, em x e em y | de 0 a 200, em pixels | 0 | não |
| `spring=` | mola: o osso gira atrasado quando o pivô dele acelera, e balança até parar | de 0 a 1 (perto de 1: mola dura, volta rápido; `0` vale como uma mola muito mole) | sem mola | não |
| `path=` | o osso anda por uma linha; quanto ele andou vem da `key` com `osso.along=` | o nome de um `line`, `stroke`, `shape`, `ellipse` ou `rect` | nenhum | não |
| `turn=` | com `path=`, o osso vira junto com a curva | `0` não vira; qualquer outro valor vira | vira (com `path=`) | não |
| `yaw=` | giro 3D de lado, em volta do pivô (com `round=`, do centro da bola) | qualquer número, em graus | 0 | `key` |
| `pitch=` | giro 3D para cima e para baixo, em volta do pivô (com `round=`, do centro da bola) | qualquer número, em graus | 0 | `key` |
| `persp=` | a distância do olho no giro 3D do osso: menor deforma mais; `0` tira a perspectiva | de 0 a 100000, em pixels | 2 × o lado maior do `canvas` | não |
| `round=raio[,x,y]` | as formas do osso (e dos filhos) ficam na superfície de uma bola: no giro 3D, viram como uma cabeça | raio maior que 0; o centro `x,y` é opcional | centro: o meio das formas presas ao osso | não |

**Os movimentos automáticos** (`sway=`, `bob=`, `jitter=`) só aparecem numa animação ou num filme; no desenho parado, não. Numa animação em loop, o tempo do `sway=` e do `bob=` é ajustado para caber um número inteiro de vezes, e o loop fecha sem pulo. Num filme, eles andam mesmo sem `anim`, e o `jitter=` muda 12 vezes por segundo.

**Cuidado:**
- Sem `pivot=`, dá erro.
- Os números da `key` são medidos a partir do desenho: `key 12 braco=0,0,-25` gira o braço 25 graus para cima, a partir de onde ele foi desenhado. O filho soma o giro do pai.
- `spring=0` não desliga a mola. Para tirar a mola, apague o `spring=`.
- O `ik` muda a pose também no desenho parado: veja o [`ik`](#ik).

**Para aprender:** [O primeiro osso](07-movimento.md#a-primeira-animação), [Pai e filho](08-ossos.md#pai-e-filho-parent), [Movimentos automáticos](08-ossos.md#movimentos-automáticos-sway-bob-e-jitter), [Molas](08-ossos.md#molas-spring), [Andar por um caminho](09-animacao.md#andar-por-um-caminho-path) e [Uma cabeça que olha para os lados](11-profundidade.md#uma-cabeça-que-olha-para-os-lados-round).

### `cloth`

Um tecido. As formas com `cloth=nome` balançam como pano quando o osso delas se mexe. Perto do ponto onde o pano está preso (`pivot=`), ele fica parado; longe dele, balança mais.

```
cloth nome pivot=x,y [opções]
forma … cloth=nome
```

<!-- conferir -->
```weasel
canvas 260 220 bg=#f4efe6
palette ink=#2b2a33
bone mastro pivot=60,210
# o pano fica preso perto do mastro (pivot=) e balança quando o mastro se mexe
cloth pano pivot=66,40 tension=0.3
rect pau 56,30 10,180 c=#8d5a3b ink=2 bone=mastro
shape bandeira c=#e8443a ink=2 bone=mastro cloth=pano : 66,40! 170,52 160,92 66,84!
anim vento frames=24 fps=12
key 0 mastro=0,0,-8
key 12 mastro=0,0,8
key 24 mastro=0,0,-8
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o nome | o nome do tecido, para o `cloth=` das formas (e do `use`) | um nome sem acento | obrigatório | não |
| `pivot=x,y` | o ponto onde o pano está preso: ali ele não balança | dois números, em pixels | obrigatório | não |
| `tension=` | a dureza do pano: perto de 1, volta rápido; perto de 0, fica mole | de 0 a 1 | 0.5 | não |
| `swing=` | quanto o pano reage aos trancos do osso | de 0 a 10 | 1 | não |
| `drag=` | quanto o ar empurra o pano para trás quando o osso anda | de 0 a 10 | 1 | não |
| `bone=` | o osso de quem o pano sente o movimento (as formas podem estar presas a outro) | o nome de um osso | o osso da primeira forma com este `cloth=` que tem `bone=` | não |

**Cuidado:**
- O pano só balança numa animação, e só quando o osso se mexe. No desenho parado, fica como foi desenhado.
- O pano anda no máximo 40% da distância do `pivot=` até o ponto do pano mais longe dele.
- Numa forma, `cloth=` junto com `bones=` dá aviso: a forma dobra pelos ossos e o pano fica parado.
- Dois `cloth` com o mesmo nome: vale o de baixo, sem aviso.

**Para aprender:** [Tecido](08-ossos.md#tecido-cloth) e [`bone=` no `cloth`](08-ossos.md#vento-com-o-mastro-parado-bone-no-cloth).

### `ik`

Liga três ossos em corrente (raiz, meio e ponta) para o pivô da ponta chegar a um lugar: a raiz e o meio giram sozinhos. É o jeito de manter um pé no chão enquanto o corpo desce, ou uma mão num alvo.

```
ik nome bones=raiz,meio,ponta foot=chão,x [bend=1]
ik nome bones=raiz,meio,ponta foot=x,y [bend=1]
ik nome bones=raiz,meio,ponta target=osso [bend=1]
```

<!-- conferir -->
```weasel
canvas 220 230 bg=#f4efe6
palette ink=#2b2a33 calca=#3a6ea5
line chao c=#8a7a5a w=3 : 0,210 220,210
bone quadril pivot=110,60
bone coxa parent=quadril pivot=110,80
bone canela parent=coxa pivot=125,140
bone pe parent=canela pivot=110,200
# a coxa e a canela giram sozinhas para o pé ficar no chão
ik perna bones=coxa,canela,pe foot=chao,110
ellipse corpo 110,50 30,26 c=#ffd34d ink=2 bone=quadril
stroke c1 w=14 c=calca bone=coxa : 110,80 125,140
stroke c2 w=12 c=calca bone=canela : 125,140 110,200
ellipse sapato 120,203 16,7 c=ink bone=pe
anim agacha frames=24 fps=12
key 0 quadril=0,0
key 12 quadril=0,40
key 24 quadril=0,0
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o nome | o nome do `ik` | um nome sem acento, que não se repete | obrigatório | não |
| `bones=raiz,meio,ponta` | os três ossos da corrente. O meio precisa de `parent=raiz`, e a ponta de `parent=meio` | três nomes de osso; cada osso entra num `ik` só | obrigatório | não |
| `foot=chão,x` | o pivô da ponta fica no chão, na altura da linha `chão` em `x` | o nome de uma forma com 2 pontos ou mais (`line`, `stroke` ou `shape`) e um número | um dos três (`foot=chão,x`, `foot=x,y` ou `target=`) é obrigatório | não |
| `foot=x,y` | o pivô da ponta fica parado nesse ponto | dois números, em pixels | — | não |
| `target=` | o pivô da ponta vai até o pivô de outro osso, que pode estar animado | o nome de um osso de fora da corrente (nem a raiz nem um filho dela) | — | não |
| `bend=` | para que lado o meio dobra | `1` ou `-1` (outro número vale o sinal dele, com aviso; `0` dá erro) | o lado em que o meio está no desenho | não |

**Como a corrente se ajeita:**

- Os comprimentos vêm da pose sem o `ik`. Uma `key` que estica um osso (`sx,sy`) muda o comprimento.
- Longe demais, a corrente estica toda e aponta para o lugar.
- A ponta não gira com a corrente: fica no ângulo que teria sem o `ik`, mais as `key` dela. Um pé fica plano no chão.
- Com `foot=chão,x`, a altura é medida em linha reta entre os pontos da linha, não na curva.

**Cuidado:**
- O `ik` também vale no desenho parado: se o pivô da ponta não está desenhado no lugar do `foot=`, a pose parada muda.
- `foot=` e `target=` juntos dão aviso: vale o `target=`.
- Sem `foot=` nem `target=`, dá erro.

**Para aprender:** [IK nos ossos](08-ossos.md#ik-nos-ossos-ik) e [Braço com alvo](08-ossos.md#braço-com-alvo-target).

### `anim`

Começa uma animação com nome. As linhas `key` e `event` que vêm depois são dela, até o próximo `anim`. A duração é `frames=` ÷ `fps=`: 24 quadros a 12 por segundo dão 2 segundos.

```
anim nome [frames=…] [fps=…] [once ou loop]
anim nome mix=base,ação bones=osso,… [frames=…] [fps=…]
anim nome from=animação to=animação [frames=…] [fps=…] [every=…]
anim nome from=animação to=animação turn [pairs=…] [born=…]
```

<!-- conferir -->
```weasel
canvas 300 170 bg=#f4efe6
palette ink=#2b2a33
line chao c=#8a7a5a w=2 : 0,151 300,151
bone b1 pivot=80,135
bone b2 pivot=220,135
ellipse bola1 80,135 16 c=#4a90d9 ink=2 bone=b1
ellipse bola2 220,135 16 c=#ff6b4a ink=2 bone=b2
# quica sem parar (loop): sobe até o quadro 6 e volta sozinha para a key 0
anim quica frames=12 fps=12
key 0 b1=0,0 ease=out
key 6 b1=0,-90 ease=in
# pula uma vez e fica no chão
anim pula frames=12 fps=12 once
key 0 b2=0,0 ease=out
key 6 b2=0,-90 ease=in
key 12 b2=0,0
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o nome | o nome da animação (para o `-a` da linha de comando, o jogo, o filme) | um nome sem acento, que não se repete; `pose` dá aviso (é o nome da pose parada) | obrigatório | não |
| `frames=` | quantos quadros a animação tem | de 1 a 600 (arredondado) | 24; numa transição, 4; num `mix=`, o da ação | não |
| `fps=` | quantos quadros por segundo | de 1 a 60 | 12; num `mix=`, o da ação; numa transição, o do `from=` | não |
| `once` | toca uma vez e para no último quadro | — | sem ela, a animação repete (loop) | não |
| `loop` | repete sem parar. Só precisa ser escrito num `mix=`, que copia o `once` da ação | — | ligado | não |
| `mix=base,ação` | junta duas animações: a base inteira, com os ossos de `bones=` (e os filhos deles) vindos da ação | os nomes de duas animações do arquivo (nenhuma pode ser outro `mix=`) | — | não |
| `bones=` | no `mix=`, os ossos que vêm da ação | nomes de osso, separados por vírgula | obrigatório com `mix=` | não |
| `feet=` | os pontos que são os pés: o Weasel mede quanto o personagem anda sem os pés escorregarem | nomes de [`point`](#point), separados por vírgula | nenhum | não |
| `from=` | numa transição, a animação de onde se sai | o nome de uma animação, com ou sem a direção (`walk` acha `walk_right`, `walk_down`…) | — | não |
| `to=` | numa transição, a animação aonde se chega (no primeiro quadro dela) | o nome de uma animação, com ou sem a direção | — | não |
| `every=` | numa transição, de quantos em quantos quadros do `from=` sai uma peça | de 1 a 600 (arredondado) | 2; com um `from=` que tem `once`, só a peça do último quadro | não |
| `turn` | numa transição, cada peça vira uma **virada**: as partes da vista do `from=` se transformam nas da vista do `to=` | — | — | não |
| `pairs=a->b,…` | na virada, casa à mão uma parte de uma vista com uma da outra | pares `parte->parte`, separados por vírgula | — | não |
| `born=a->b,…` | na virada, de onde nasce (ou para onde some) uma parte que só existe numa vista | pares `parte->outra`: `outra` é uma parte da outra vista | — | não |

**Animação combinada (`mix=`):** o tempo vem da ação (`frames=`, `fps=` e `once`), a não ser que a linha diga outro. As `key` escritas na própria animação valem por cima das copiadas.

**Transição (`from=` e `to=`):** a linha não vira uma animação. No lugar dela saem as **peças**, com o nome e o quadro de onde partem: `anim stop from=run to=idle` dá `stop_0`, `stop_2`… (com direções, `stop_0_right`). Cada peça parte de um quadro do `from=` e chega ao primeiro quadro do `to=` em `frames=` quadros. As peças tocam uma vez.

**Cuidado:**
- Uma `key` ou um `event` antes de qualquer `anim` dá erro.
- Uma transição não aceita `key` nem `event` (dá erro): eles vão nas animações do `from=` e do `to=`.
- `every=`, `turn`, `pairs=` e `born=` fora de uma transição dão aviso e não fazem nada. `pairs=` e `born=` sem `turn` também.
- `loop` numa transição dá aviso: as peças sempre tocam uma vez.
- No GIF, uma animação com `once` recomeça do quadro 0 ao chegar no fim; no jogo, ela toca uma vez e para.

**Para aprender:** [A primeira animação](07-movimento.md#a-primeira-animação), [Loop ou uma vez só](07-movimento.md#loop-ou-uma-vez-só-once), [Animações combinadas](09-animacao.md#animações-combinadas-mix), [Andar sem escorregar](09-jogo-godot.md#andar-sem-escorregar-feet), [Transições](09-jogo-godot.md#sair-de-uma-animação-sem-corte-from-e-to) e [Virada](09-jogo-godot.md#virar-de-lado-para-a-frente-turn).

### `key`

Uma pose da animação num quadro: onde estão os ossos e como estão as formas, as camadas, as luzes e as caixas. Os quadros do meio o Weasel calcula sozinho.

```
key quadro osso=dx,dy,rot,sx,sy … nome.propriedade=valor … [ease=curva]
```

<!-- conferir -->
```weasel
canvas 260 120 bg=#f4efe6
palette ink=#2b2a33
bone b pivot=40,60
ellipse bola 40,60 16 c=#4a90d9 ink=2 bone=b
anim vai frames=24 fps=12
# ease=out: sai rápido da key 0 e chega devagar na key 12
key 0 b=0 bola.c=#4a90d9 ease=out
# no quadro 12: 180 pixels para a direita, vermelha e menor
key 12 b=180,0,0,0.6 bola.c=#ff6b4a
# do 12 ao 24 não há key: a bola volta sozinha para a key 0 (o loop)
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o quadro | em que quadro vale esta pose | de 0 a `frames=` do `anim` (um número quebrado é arredondado; acima de `frames=`, aviso e vale `frames=`) | obrigatório | não |
| `osso=dx,dy,rot,sx,sy` | a pose de um osso: anda `dx,dy` pixels, gira `rot` graus (positivo: sentido do relógio) e estica `sx,sy` vezes, em volta do pivô | de 1 a 5 números (veja abaixo) | `0,0,0,1,1` (a pose do desenho) | — |
| `nome.propriedade=valor` | muda uma propriedade de uma forma, camada, luz, osso ou caixa | as tabelas abaixo | — | — |
| `ease=` | a curva do trecho que sai desta `key` até a próxima; vale para todos os valores da linha | `smooth`, `linear`, `in`, `out`, `back` ou `step` | `smooth` | não |

**Quantos números no osso:**

- `braco=40`: anda 40 pixels em x.
- `braco=40,10`: anda 40 em x e 10 em y (positivo: para baixo).
- `braco=0,0,30`: gira 30 graus.
- `braco=0,0,0,1.5`: estica 1,5 vez na largura e na altura.
- `braco=0,0,0,1.5,0.8`: estica 1,5 na largura e 0,8 na altura. Um número negativo espelha.

**As curvas do `ease=`:**

| Curva | Como o valor anda |
|---|---|
| `smooth` | começa devagar, acelera e termina devagar |
| `linear` | com a mesma velocidade o tempo todo |
| `in` | começa devagar e termina rápido |
| `out` | começa rápido e termina devagar |
| `back` | passa um pouco do valor da `key` seguinte e volta |
| `step` | fica parado e pula para o valor seguinte na `key` seguinte |

**Entre uma `key` e outra:**

- Os valores são medidos a partir do desenho, não da `key` anterior: `key 12 b=0,-170` quer dizer "170 pixels acima do lugar desenhado".
- Entre duas `key`, o valor vai aos poucos de uma para a outra, pela curva `ease=` da primeira. Cada osso e cada propriedade anda sozinho: só contam as `key` em que ele aparece. O que não aparece em nenhuma `key` fica como foi desenhado.
- Com uma `key` só, o valor fica igual em todos os quadros.
- Num loop (o padrão), depois da última `key` o valor volta sozinho para a primeira, passando pelo fim e recomeçando, com a curva da última `key`. Antes da primeira `key`, o valor está nesse caminho de volta.
- Com `once`, antes da primeira `key` vale a primeira; depois da última, a última fica.
- Os quadros desenhados vão de 0 a `frames-1`. Num loop, o quadro `frames` é o quadro 0 de novo: uma `key` no quadro `frames` igual à do 0 não muda nada, e uma diferente dá um pulo quando o loop recomeça. Com `once`, uma `key` no quadro `frames` nunca chega a ser desenhada inteira.
- Várias linhas `key` no mesmo quadro se juntam. A mesma coisa duas vezes no mesmo quadro: vale a de baixo.

**Qual é o alvo:** se um nome é ao mesmo tempo de uma caixa, de um osso, de uma forma, de uma luz ou de uma camada, a `key` procura nessa ordem e muda o primeiro que tem a propriedade.

**Cuidado:**
- Uma `key` precisa vir depois de um `anim`.
- Um osso com mais de 5 números, um alvo que não existe ou uma propriedade que o alvo não tem dão erro.
- Uma forma de um componente tem o mesmo nome em todas as cópias: a `key` muda todas.
- Num filme, quem muda as coisas com o tempo é o [`at`](#at).

**Para aprender:** [Devagar ou depressa: `ease`](07-movimento.md#devagar-ou-depressa-ease), [As regras das `key`](07-movimento.md#as-regras-das-key), [Quantos números escrever](07-movimento.md#quantos-números-escrever) e [Animar formas](09-animacao.md#animar-formas-formapropriedadevalor).

#### `key` numa forma

Escreva o nome da forma, um ponto, a propriedade e o valor: `key 6 olho.opacity=0`.

| Propriedade | O que muda | Valores | Sem `key` | Entre duas `key` |
|---|---|---|---|---|
| `opacity=` | a transparência; multiplica a `opacity=` da linha | de 0 a 1 | 1 | aos poucos |
| `show=` | a forma aparece ou some | `1`, `on`, `true` ou `sim` (aparece); `0`, `off`, `false`, `nao` ou `não` (some) | aparece | troca de uma vez |
| `c=` | a cor do preenchimento (num traço, numa linha ou num texto, a cor dele) | uma cor | o `c=` da linha | aos poucos entre duas cores `#hex`; as outras (gradiente, `pattern`, nome do CSS) trocam de uma vez na `key` seguinte |
| `inkc=` | a cor do contorno | uma cor | o `inkc=` da linha (ou a `ink` da `palette`) | como no `c=` |
| `w=` | a grossura de um traço ou de uma linha | uma espessura (negativo vale 0, sem aviso) | o `w=` da linha | aos poucos |
| `ink=` | a grossura do contorno de uma forma fechada ou de um texto | uma espessura (negativo vale 0, sem aviso) | o `ink=` da linha | aos poucos |
| `shape=` | morph: a forma vira outra, com o formato e o lugar da outra | o nome de outra forma: fechada (`shape`, `ellipse`, `rect`) com fechada, aberta (`stroke`, `line`) com aberta. Texto, partículas e pernas ou braços (`stroke` com `hip=`) não fazem morph | a própria forma | aos poucos |
| `draw=` | quanto da forma já foi desenhado: 0 = nada, 1 = tudo | de 0 a 1 | 1 | aos poucos |
| `above=` | pinta a forma logo na frente de outra | o nome de outra forma da mesma camada, ou `none` (volta à ordem do arquivo) | a ordem do arquivo | troca de uma vez |
| `below=` | pinta a forma logo atrás de outra | o nome de outra forma da mesma camada, ou `none` | a ordem do arquivo | troca de uma vez |
| `yaw=` | o giro 3D de lado, em volta do meio da forma | qualquer número, em graus | o `yaw=` da linha | aos poucos |
| `pitch=` | o giro 3D para cima e para baixo, em volta do meio da forma | qualquer número, em graus | o `pitch=` da linha | aos poucos |
| `z=` | a profundidade 2.5D | qualquer número, em pixels (positivo: mais perto) | o `z=` da linha | aos poucos |

Numa forma com `hidden`, a `key` não a faz aparecer (dá aviso). Para começar escondida, tire o `hidden` e escreva `key 0 nome.show=0`.

**Para aprender:** [Animar formas](09-animacao.md#animar-formas-formapropriedadevalor), [Desenhar aos poucos](09-animacao.md#desenhar-aos-poucos-draw) e [Morph](09-animacao.md#morph-uma-forma-vira-outra).

#### `key` numa camada

Escreva o nome da camada: `key 6 fundo.blur=4`.

| Propriedade | O que muda | Valores | Sem `key` | Entre duas `key` |
|---|---|---|---|---|
| `opacity=` | a transparência da camada inteira; multiplica a `opacity=` da linha `layer` | de 0 a 1 | 1 | aos poucos |
| `show=` | a camada aparece ou some | como o `show=` da forma | aparece | troca de uma vez |
| `blur=` | o desfoque | qualquer número, em pixels (0 ou menos: sem desfoque) | o `blur=` da linha | aos poucos |
| `glow=` | o raio do brilho em volta. A cor e a força vêm do `glow=` da linha `layer`; sem ele, o brilho sai branco | qualquer número, em pixels (0 ou menos: sem brilho) | o raio do `glow=` da linha, ou 0 | aos poucos |
| `tint=` | quanto a camada é tingida. A cor vem do `tint=cor,quanto` da linha `layer`; sem ele, nada muda (dá aviso) | de 0 a 1 (acima de 1 vale 1, sem aviso) | o quanto do `tint=` da linha, ou 0 | aos poucos |
| `brightness=` | o brilho: 1 = normal, 2 = o dobro | 0 ou mais | o `brightness=` da linha, ou 1 | aos poucos |
| `saturate=` | a saturação: 1 = normal, 0 = cinza | 0 ou mais | o `saturate=` da linha, ou 1 | aos poucos |
| `contrast=` | o contraste: 1 = normal, menos de 1 = mais apagado | 0 ou mais | o `contrast=` da linha, ou 1 | aos poucos |
| `hue=` | gira as cores | qualquer número, em graus | o `hue=` da linha, ou 0 | aos poucos |
| `above=` | pinta a camada logo na frente de outra | o nome de outra camada, ou `none` (volta à ordem do arquivo) | a ordem do arquivo | troca de uma vez |
| `below=` | pinta a camada logo atrás de outra | o nome de outra camada, ou `none` | a ordem do arquivo | troca de uma vez |
| `yaw=` | o giro 3D de lado da camada inteira | qualquer número, em graus | o `yaw=` da linha | aos poucos |
| `pitch=` | o giro 3D para cima e para baixo da camada inteira | qualquer número, em graus | o `pitch=` da linha | aos poucos |

Na `key`, os efeitos da camada não têm as faixas da linha [`layer`](#layer) e não dão aviso. Não use números negativos em `brightness=`, `saturate=` e `contrast=`: a `key` aceita, mas o resultado não é garantido.

**Para aprender:** [Efeitos de camada](08-luz-efeitos.md#efeitos-de-camada).

#### `key` numa luz

Escreva o nome da luz: `key 6 lampada.power=0`.

| Propriedade | O que muda | Valores | Sem `key` | Entre duas `key` |
|---|---|---|---|---|
| `power=` | a força; 0 ou menos apaga | qualquer número (a linha `light` corta em 20; a `key`, não) | o `power=` da linha | aos poucos |
| `radius=` | o alcance | qualquer número, em pixels (menos de 1 vale 1) | o `radius=` da linha | aos poucos |
| `c=` | a cor da luz | uma cor `#hex` (outra cor dá aviso e a `key` não vale) | o `c=` da linha | aos poucos |
| `glow=` | o raio do halo | qualquer número, em pixels (0 ou menos: sem halo) | o `glow=` da linha | aos poucos |
| `aim=` | para onde o holofote aponta | qualquer número, em graus (0 = direita, 90 = para baixo) | o `aim=` da linha | aos poucos |
| `cone=` | metade da abertura do holofote | qualquer número, em graus (a linha `light` corta em 180; a `key`, não) | o `cone=` da linha | aos poucos |

A luz não tem `show`: para apagar, use `power=0`. O `ambient` não tem nome e não muda com a `key`.

**Para aprender:** [Luz de verdade](08-luz-efeitos.md#luz-de-verdade).

#### `key` num osso

A pose do osso vai direto, sem ponto: `key 6 braco=0,0,30`. As outras propriedades vão com ponto: `key 6 carro.along=0.5`.

| Propriedade | O que muda | Valores | Sem `key` | Entre duas `key` |
|---|---|---|---|---|
| `osso=dx,dy,rot,sx,sy` | a pose: anda, gira e estica em volta do pivô | de 1 a 5 números (veja [`key`](#key)) | `0,0,0,1,1` (a pose do desenho) | aos poucos |
| `along=` | quanto do caminho (`path=`) o osso já andou | de 0 (o começo) a 1 (o fim). Num caminho aberto, fora disso vale a ponta, sem aviso; num fechado, dá voltas (1.5 = uma volta e meia; negativo anda para trás) | o osso fica no pivô dele, fora do caminho | aos poucos |
| `yaw=` | o giro 3D de lado, em volta do pivô (com `round=`, do centro da bola) | qualquer número, em graus | o `yaw=` da linha `bone` | aos poucos |
| `pitch=` | o giro 3D para cima e para baixo, em volta do pivô (com `round=`, do centro da bola) | qualquer número, em graus | o `pitch=` da linha `bone` | aos poucos |

Um `along=` num osso sem `path=` dá erro.

**Para aprender:** [Quantos números escrever](07-movimento.md#quantos-números-escrever), [Andar por um caminho](09-animacao.md#andar-por-um-caminho-path) e [Uma cabeça que olha para os lados](11-profundidade.md#uma-cabeça-que-olha-para-os-lados-round).

#### `key` numa caixa

Escreva o nome da caixa de colisão ([`box`](#box)): `key 3 golpe.show=1`.

| Propriedade | O que muda | Valores | Sem `key` | Entre duas `key` |
|---|---|---|---|---|
| `show=` | liga ou desliga a caixa | `1`, `on`, `true` ou `sim` (liga); `0`, `off`, `false`, `nao` ou `não` (desliga) | o que a linha `box` diz (`off` = desligada) | troca de uma vez |

Numa animação com `once`, antes da primeira `key` vale o que a linha `box` diz. Num loop, vale a última `key`, que dá a volta.

**Para aprender:** [Uma caixa que segue o braço](09-jogo-godot.md#uma-caixa-que-segue-o-braço-e-só-liga-no-golpe).

### `event`

Marca um quadro da animação com um ou mais nomes. O jogo fica sabendo quando a animação passa por ali: um passo, um golpe que acerta, a hora de um som.

```
event quadro nome [nome …]
```

<!-- conferir -->
```weasel
canvas 200 120 bg=#f4efe6
palette ink=#2b2a33
bone pe pivot=100,100
ellipse sapato 100,100 20,8 c=#8d5a3b ink=2 bone=pe
anim anda frames=12 fps=12
key 0 pe=-30,0
key 6 pe=30,0
key 12 pe=-30,0
# nos quadros 3 e 9 o jogo fica sabendo: "passo" (e "poeira" no 9)
event 3 passo
event 9 passo poeira
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o quadro | em que quadro o evento acontece | de 0 a `frames=` (um número quebrado é arredondado; acima de `frames=`, aviso e vale `frames=`). O quadro `frames=` vale como o 0 | obrigatório | não |
| o nome | o nome do evento; vários nomes na mesma linha acontecem no mesmo quadro | uma palavra, ou um texto entre aspas (`"um passo"`) | obrigatório (pelo menos um) | não |

Os eventos vão para o JSON da sprite sheet, para a folha de conferência (`--contact`) e para o Godot, onde o personagem emite o sinal `evento(nome)`. O `--info` lista os eventos de cada animação.

**Cuidado:**
- Um `event` precisa vir depois de um `anim`, e não vale numa transição (`from=` e `to=`).

**Para aprender:** [Eventos](09-animacao.md#eventos-event).

## Luz

A luz pinta as formas com a cor e a força que chegam nelas: `light` é uma luz com lugar, e `ambient` é a luz geral.

**O que a luz precisa para aparecer:** basta uma linha `light` ou `ambient`. Ela liga a luz no desenho todo, e todas as camadas recebem luz (a palavra `lit` da [`layer`](#layer) é o padrão). Ficam de fora:

- as camadas `unlit` (um céu, um letreiro, um efeito);
- as camadas `guide`;
- as formas com `emit=`, que brilham sozinhas;
- o fundo do `canvas` (`bg=`).

Com uma `light` e sem `ambient`, vale uma luz geral branca de força 0.6. Onde nenhuma `light` chega, sobra só essa luz geral: por isso, com luz, o desenho fica mais escuro. Sem nenhuma `light` e nenhum `ambient`, as cores saem como foram escritas.

### `light`

Uma luz com nome: uma lâmpada (`point`), um holofote (`spot`) ou o sol (`dir`).

```
light nome point x,y [opções]
light nome spot x,y [aim=…] [cone=…] [opções]
light nome dir dx,dy [opções]
```

<!-- conferir -->
```weasel
canvas 420 220 bg=#1b2033
palette ink=#2b2a33
ambient c=#5866a0 power=0.4
# lâmpada: ilumina em volta até 200 pixels; glow= desenha o halo
light lampada point 110,60 c=#ffb860 power=1.5 radius=200 glow=30
# holofote: aponta para baixo (aim=90) e abre 20 graus para cada lado
light holofote spot 320,10 c=#9fe0ff power=2 aim=90 cone=20 radius=260
rect chao 0,170 420,50 c=#7a7f8c
ellipse bola1 110,140 28 c=#f4efe6 ink=3
ellipse bola2 320,140 28 c=#f4efe6 ink=3
```

<!-- conferir -->
```weasel
canvas 300 160 bg=#9fd0ee
# o sol está em cima, à direita: dx positivo (direita), dy negativo (para cima)
light sol dir 1,-1 c=#fff2c0 power=1
ambient c=#6070a0 power=0.5
layer morro
ellipse m 150,200 200,90 c=#6cbf4a ink=2
layer placa unlit
# unlit: a placa não recebe luz e sai com a cor escrita
rect p 120,40 60,30 c=#ffd34d ink=2
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o nome | o nome da luz, para a `key` e o `at` | um nome sem acento, que não se repete | obrigatório | não |
| `point` | lâmpada: ilumina em volta, até o `radius=` | — | um dos três é obrigatório | não |
| `spot` | holofote: ilumina num cone, para o lado do `aim=`, até o `radius=` | — | — | não |
| `dir` | sol ou lua: ilumina tudo igual, vindo de uma direção | — | — | não |
| o ponto `x,y` (`point` e `spot`) | onde a luz está | dois números, em pixels | obrigatório | não |
| a direção `dx,dy` (`dir`) | de que lado a luz vem, olhando do desenho: `-1,-1` = de cima, à esquerda | dois números (só a direção conta, não o tamanho) | obrigatório | não |
| `c=` | a cor da luz | uma cor `#hex` | `#ffffff` | `key` e `at` |
| `power=` | a força; 0 apaga | de 0 a 20 | 1 | `key` e `at` |
| `radius=` | o alcance: a luz cai aos poucos até zero nessa distância (`point` e `spot`) | de 1 a 100000, em pixels | 300 | `key` e `at` |
| `glow=` | o raio de um halo desenhado em volta da luz (`point` e `spot`) | de 0 a 100000, em pixels | 0 (sem halo) | `key` e `at` |
| `flicker=` | tremula: a força muda a cada quadro (num filme, 12 vezes por segundo) | de 0 a 1 | 0 | não |
| `aim=` | para onde o holofote aponta (só `spot`) | qualquer número, em graus (0 = direita, 90 = para baixo) | 90 | `key` e `at` |
| `cone=` | metade da abertura do holofote: `cone=30` abre 30 graus para cada lado do `aim=` (só `spot`) | de 1 a 180, em graus | 30 | `key` e `at` |
| `rim=` | um fio de luz na borda das formas virada para a luz, na cor da luz que chega ali, em todas as camadas sem `rim=` próprio. Com várias luzes, vale a maior largura | de 0 a 100, em pixels | 0 | não |
| `bone=` | a luz anda com o osso; o holofote também gira com ele (`point` e `spot`) | o nome de um osso | nenhum | não |

**Como a luz chega:**

- Numa `point` ou numa `spot`, a força é maior perto da luz e cai até zero no `radius=`.
- O `cone=` tem, além da abertura, uma faixa fraca até 1,25 vez o `cone=`.
- Numa `dir`, a luz chega igual em todo o desenho.
- O `flicker=` só aparece numa animação ou num filme; no desenho parado, a luz fica firme.

**Cuidado:**
- Na `dir`, `radius=`, `glow=`, `aim=`, `cone=` e `bone=` não fazem nada, e não dão aviso. Na `point`, `aim=` e `cone=` também não.
- Uma cor que não é `#hex` (um nome do CSS, como `red`) dá aviso, e a luz fica branca.
- A luz não tem `show`. Para apagar numa animação, use `key … nome.power=0`.
- O `light=` do [`canvas`](#canvas) é outra coisa: a direção que engrossa os contornos.

**Para aprender:** [Luz de verdade](08-luz-efeitos.md#luz-de-verdade), [Lâmpada](08-luz-efeitos.md#lâmpada-light-point), [Holofote](08-luz-efeitos.md#holofote), [Sol e lua](08-luz-efeitos.md#sol-e-lua-light-dir) e [O que recebe luz](08-luz-efeitos.md#o-que-recebe-luz).

### `ambient`

A luz geral: chega igual em todo lugar, onde nenhuma `light` alcança. Sozinha, sem `light`, ela escurece (ou tinge) o desenho todo por igual.

```
ambient [c=cor] [power=força]
```

<!-- conferir -->
```weasel
canvas 220 120 bg=#000000
# sem nenhuma light: só a luz geral, azulada e fraca
ambient c=#8090ff power=0.5
layer sala
rect parede 0,0 220,120 c=#f4efe6
layer letreiro unlit
text t 110,70 "ABERTO" size=28 align=center c=#ff5050
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `c=` | a cor da luz geral | uma cor `#hex` | `#ffffff` | não |
| `power=` | a força. Com `c=#ffffff`, `power=1` deixa as cores como foram escritas; menos que 1 escurece | de 0 a 5 | 0.6 | não |

**Cuidado:**
- Dois `ambient`: vale só o de baixo, sem aviso. Se o de baixo não tem `power=`, vale 0.6, e não o `power=` do de cima.
- O `ambient` não tem nome: não muda com a `key` nem com o `at`.
- Uma cor que não é `#hex` dá aviso, e a luz geral fica branca.

**Para aprender:** [A luz geral](08-luz-efeitos.md#a-luz-geral-ambient).

## Jogo

As linhas que preparam um personagem ou uma fase para um jogo: a escala da Unity, as caixas de colisão, os pontos de encaixe, o nó do Godot e os blocos de um tileset. Nenhuma delas muda a imagem: elas vão junto na exportação.

### `unity`

Diz como o desenho vira um objeto da Unity (e de outros motores): quantos pixels valem uma unidade, onde fica a raiz e o tamanho do colisor. A imagem não muda; o que muda é o que sai junto com ela.

```
unity [unit=pixels] [root=x,y] [collider=largura,altura[,dx[,dy]]]
```

<!-- conferir -->
```weasel
canvas 200 240 bg=#f4efe6
# 100 pixels do desenho = 1 unidade da Unity; a raiz fica entre os pés
# o colisor tem 0.6 × 1.8 unidades, com o meio 0.9 acima da raiz (a base no chão)
unity unit=100 root=100,220 collider=0.6,1.8,0,0.9
ellipse cabeca 100,62 30 c=#4a90d9 ink=3
rect corpo 70,92 60,128 r=20 c=#4a90d9 ink=3
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `unit=` | quantos pixels do desenho valem 1 unidade da Unity | de 1 a 100000 | 100 | não |
| `root=x,y` | a raiz: o ponto do desenho que fica na posição do objeto (em geral, entre os pés) | dois números, em pixels | o meio da base do canvas | não |
| `collider=largura,altura,dx,dy` | o colisor, em unidades da Unity: a largura, a altura e quanto o meio dele fica longe da raiz (`dx` para a direita, `dy` para cima) | de 2 a 4 números; os que faltam valem 0 | nenhum | não |

**O que o `unity` muda na saída:**
- **Na sprite sheet** (`-f sheet` ou `-o x.json`): o JSON ganha `meta.unity`, com `pixelsPerUnit` (o `unit=` vezes a escala `-s`), `pivotBottomLeft` (a raiz, de 0 a 1, contada do canto de baixo à esquerda do quadro) e `collider` (os números do `collider=`). O `pivot` de cada quadro também passa a ser a raiz; sem `unity`, ele é o meio da base do quadro.
- **No Godot** (`.tscn`): sem `root=` no [`godot`](#godot), a raiz vira a origem da cena. Sem nenhuma [`box`](#box) `body`, o `collider=` vira a caixa do corpo, com o nome `corpo`.
- **No filme:** a raiz é o ponto do ator que vai para o `x,y` da linha [`actor`](#actor) (o `origin=` padrão).
- A imagem (PNG, GIF, vídeo) não muda.

**Cuidado:**
- O `collider=` é contado do **meio** dele. Com `dy` 0, metade do colisor fica abaixo da raiz. Para a base ficar no chão, use `dy` igual à metade da altura, como no exemplo.
- Com duas linhas `unity`, vale a de baixo, e o Weasel não avisa.

**Para aprender:** [Para outros motores: sprite sheet e `unity`](09-jogo-godot.md#para-outros-motores-sprite-sheet-e-unity).

### `box`

Uma caixa de colisão: o corpo que bate no chão, o golpe que acerta ou o lugar onde o personagem leva dano. Ela não aparece na imagem. No Godot, vira um `CollisionShape2D`; no JSON da sprite sheet, vira `boxes` em cada quadro.

```
box nome [body|hit|hurt] [rect] x,y largura,altura [off] [bone=osso] [only=animações]
box nome [body|hit|hurt] circle cx,cy raio [off] [bone=osso] [only=animações]
box nome [body|hit|hurt] capsule cx,cy largura,altura [off] [bone=osso] [only=animações]
```

<!-- conferir -->
```weasel
canvas 220 200 bg=#f4efe6
bone braco pivot=120,100
rect corpo 70,60 60,130 r=16 c=#4a90d9 ink=3
rect espada 120,94 60,12 c=#9aa6b2 ink=3 bone=braco
# os pés: body e rect são o padrão, então podem ficar de fora
box pes 76,170 48,20
# onde o boneco leva dano
box dano hurt rect 70,60 60,130
# o golpe: um círculo na ponta da espada, só no ataque, desligado até a key ligar
box golpe hit circle 180,100 18 bone=braco only=ataque off
anim ataque frames=8 fps=12 once
key 0 braco=0,0,-30
key 3 braco=0,0,20 golpe.show=1
key 6 golpe.show=0
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o nome | o nome da caixa; vira o nome do nó no Godot e o alvo da `key` (`nome.show=`) | um nome; não pode repetir outra caixa nem um [`point`](#point) | obrigatório | não |
| `body` | a caixa do corpo: bate no chão e nas paredes | palavra solta | é o padrão | não |
| `hit` | o golpe: a área que acerta os outros (vai para a `Area2D` `Hitbox`) | palavra solta | — | não |
| `hurt` | onde o personagem leva dano (vai para a `Area2D` `Hurtbox`) | palavra solta | — | não |
| `rect` | um retângulo | palavra solta | é o padrão | não |
| `circle` | um círculo | palavra solta | — | não |
| `capsule` | uma cápsula (um retângulo com as pontas redondas) | palavra solta | — | não |
| a posição `x,y` | no `rect`, o canto de cima à esquerda; no `circle` e na `capsule`, o centro | dois números, em pixels | obrigatório | não |
| o tamanho | `largura,altura` no `rect` e na `capsule`; o `raio` no `circle` | números maiores que 0, em pixels | obrigatório | não |
| `off` | a caixa começa desligada | palavra solta | ligada | `key` (`nome.show=`, troca de uma vez) |
| `bone=` | a caixa segue o osso: anda e gira com ele (a escala do osso não muda a caixa) | o nome de um osso | nenhum (parada) | não |
| `only=` | a caixa só existe nessas animações | nomes de `anim` separados por vírgula; `pose` é o desenho parado | todas | não |

**Cuidado:**
- Uma caixa pode ter o mesmo nome de uma forma. O Weasel avisa, e na `key` vale a caixa.
- Uma `capsule` mais larga que alta sai deitada no Godot (girada 90 graus).
- Uma caixa chamada `Sprite`, `Hitbox`, `Hurtbox`, `Corpo` ou `AnimationPlayer` ganha `_caixa` no fim do nome do nó, para não confundir com os nós que o Weasel cria.
- A `key` só muda o `show=` da caixa: ligar e desligar. Para a caixa andar, use `bone=`.

**Para aprender:** [Caixas de colisão: `box`](09-jogo-godot.md#caixas-de-colisão-box).

### `point`

Um ponto de encaixe: de onde sai o tiro, onde a mão segura, onde nasce a poeira do passo. Ele não aparece na imagem. No Godot, vira um `Marker2D`; no JSON da sprite sheet, vira `points` em cada quadro.

```
point nome x,y [bone=osso]
```

<!-- conferir -->
```weasel
canvas 220 200 bg=#f4efe6
bone braco pivot=100,100
rect corpo 70,60 60,130 r=16 c=#4a90d9 ink=3
rect arma 100,94 70,12 c=#9aa6b2 ink=3 bone=braco
# de onde sai o tiro: anda e gira junto com o braço
point cano 170,100 bone=braco
anim mira frames=12 fps=12
key 0 braco=0,0,-20
key 6 braco=0,0,10
key 12 braco=0,0,-20
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o nome | o nome do ponto; vira o nome do `Marker2D` no Godot | um nome; não pode repetir outro ponto nem uma [`box`](#box) | obrigatório | não |
| a posição `x,y` | onde o ponto fica | dois números, em pixels | obrigatório | não |
| `bone=` | o ponto segue o osso: anda e gira com ele | o nome de um osso | nenhum (parado) | não |

**Cuidado:**
- No Godot, o eixo x do `Marker2D` aponta para onde o osso aponta. No lado espelhado (`_left` feito a partir do `_right`), a direção espelha junto.
- No JSON, cada quadro traz o `x,y` do ponto em pixels do quadro, e o `rot` só quando o osso girou.
- Um ponto chamado `Sprite`, `Hitbox`, `Hurtbox`, `Corpo` ou `AnimationPlayer` ganha `_ponto` no fim do nome do nó.
- Os pontos também são os pés do `feet=` (no [`anim`](#anim)).

**Para aprender:** [Pontos de encaixe: `point`](09-jogo-godot.md#pontos-de-encaixe-point).

### `godot`

Diz como sai a cena do Godot (`.tscn`): o tipo do nó raiz, a origem, o nome, a força do relevo e se a cena usa quadros prontos ou esqueleto. Sem esta linha, a cena sai com os padrões da tabela.

```
godot [body=tipo] [root=x,y] [name=Nome] [normal=força] [rig=frames|bones]
```

<!-- conferir -->
```weasel
canvas 120 120 bg=none
# uma moeda: o nó raiz vira uma Area2D chamada Moeda, com a origem no meio dela
godot body=area name=Moeda root=60,60 normal=2
ellipse moeda 60,60 40 c=#ffd34d ink=4 inkc=#b08a00
ellipse brilho 46,44 10,6 c=#fff3b0
box pega circle 60,60 40
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `body=` | o tipo do nó raiz | `character` (CharacterBody2D), `static` (StaticBody2D), `area` (Area2D), `rigid` (RigidBody2D) ou `node` (Node2D) | `character` | não |
| `root=x,y` | o ponto do desenho que vira a origem (0,0) da cena | dois números, em pixels | o `root=` do [`unity`](#unity); sem `unity`, o meio da base do recorte (o desenho mais 8 pixels de margem); com `rig=bones`, o meio da base do canvas | não |
| `name=` | o nome do nó raiz | letras sem acento, números e `_`, sem começar com número | o nome do arquivo exportado, juntando as palavras com maiúscula (`-o moeda_de_ouro.tscn` vira `MoedaDeOuro`) | não |
| `normal=` | a força do relevo do normal map (para a luz do Godot); 0 deixa chapado | de 0 a 10 | 1 | não |
| `rig=` | `frames`: uma imagem pronta por quadro; `bones`: um esqueleto de verdade (`Bone2D`), ainda experimental | `frames` ou `bones` | `frames` | não |

O `.tscn` sai com a folha (`.png`), o normal map (`_normal.png`), o `.tres` (SpriteFrames) e o ajudante `weasel_anim.gd`, que toca as animações. O ajudante começa virado para baixo. Quando falta a animação de uma direção (num personagem só de lado, com `_left` e `_right`), ele toca a do lado para onde o personagem vai; andando reto para cima ou para baixo, ou parado, fica virado para o lado de antes.

**Cuidado:**
- Sem `root=` e sem `unity`, a origem fica 8 pixels abaixo do desenho (a margem do recorte). Um personagem fica 8 pixels acima do chão. Ponha o `root=` entre os pés.
- O nome padrão vem do arquivo de saída (o do `-o`), não do `.weasel`.
- Com `body=node`, as caixas `body` vão para uma `Area2D` chamada `Corpo`.
- O `.tscn` leva sempre todas as animações (o `-a` não vale), sai sempre com fundo transparente e sempre recortado.
- Com duas linhas `godot`, vale a de baixo (o Weasel avisa).
- `rig=bones` num desenho com `yaw=`, `pitch=`, `z=` ou `iso` dá aviso: o esqueleto do Godot não gira em 3D, e essas partes ficam paradas.

**Para aprender:** [O nó do Godot: `godot`](09-jogo-godot.md#o-nó-do-godot-godot) e [Exportando para o Godot](09-jogo-godot.md#exportando-para-o-godot).

### `tileset`

Transforma o desenho numa folha de blocos para montar fases no Godot (um `TileSet`). O canvas é dividido numa grade, e cada célula é um bloco. Cada bloco com nome e colisão é um [`tile`](#tile).

```
tileset [size=lado] [auto] [iso]
tileset [size=largura,altura] [auto] [iso]
```

<!-- conferir -->
```weasel
canvas 96 64 bg=none
# blocos de 32×32: 3 colunas e 2 linhas
tileset size=32 auto
rect terra 0,0 32,32 c=#8d5a3b
rect grama 0,0 32,8 c=#4c9a3a
rect pedra 32,0 32,32 c=#9aa6b2
shape rampa c=#8d5a3b : 64,32! 96,0! 96,32!
tile chao 0,0 solid
tile parede 1,0 solid
tile subida 2,0 collision=rampa
# a nuvem na célula 0,1 não tem tile: com auto, vira o bloco bloco_0_1, sem colisão
ellipse nuvem 16,48 12,8 c=#ffffff
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `size=` | o tamanho de cada bloco; com um número, quadrado | um ou dois números, em pixels, arredondados; o mínimo é 2 (abaixo disso, vira 2 sem avisar) | 32 (32×32) | não |
| `auto` | toda célula desenhada que não tem `tile` vira um bloco sem colisão, com o nome `bloco_coluna_linha` | palavra solta | desligado | não |
| `iso` | blocos em losango, para mapa isométrico: o losango tem a largura do bloco e metade dela de altura, na parte de baixo da célula | palavra solta | desligado | não |

Para exportar: `-f godot` ou `-o fase.tres` (sai o `.png` e o `.tres`); com `--normal`, sai também o normal map.

**Cuidado:**
- Só um `tileset` por arquivo.
- As colunas são a largura do canvas dividida pelo `size=`, arredondada para baixo. O que sobra à direita e embaixo fica de fora. Um canvas menor que um bloco dá erro.
- Com `auto`, uma célula conta como desenhada quando tem mais de 4 pixels pintados. Um contorno (`ink=`) que passa da borda de um bloco pinta a célula vizinha e cria um bloco a mais.
- Com `iso`, um bloco mais baixo que a metade da largura dá aviso: o losango não cabe.
- Com `-s`, o bloco precisa continuar com um tamanho inteiro em pixels (32 com `-s 0.5` dá 16; com `-s 0.3`, dá erro).

**Para aprender:** [Tileset: blocos para montar fases](09-jogo-godot.md#tileset-blocos-para-montar-fases) e [Tileset isométrico para o Godot](11-profundidade.md#tileset-isométrico-para-o-godot).

### `tile`

Dá nome e colisão a uma célula do [`tileset`](#tileset). O nome vai para o Godot como o dado `nome` do bloco.

```
tile nome coluna,linha [solid] [oneway] [collision=forma]
```

<!-- conferir -->
```weasel
canvas 128 32 bg=none
tileset size=32
rect terra 0,0 32,32 c=#8d5a3b
rect tabua 32,0 32,8 c=#c9a26b
rect metade 64,16 32,16 c=#9aa6b2
rect capim 104,12 16,20 c=#4c9a3a
# colide no quadrado inteiro
tile chao 0,0 solid
# só por cima, no formato da tábua: dá para pular de baixo e parar em cima
tile ponte 1,0 oneway collision=tabua
# colide só na metade de baixo
tile meio_bloco 2,0 collision=metade
# sem colisão: só o nome vai para o Godot
tile enfeite 3,0
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o nome | o nome do bloco (o dado `nome` no Godot) | um nome, sem repetir outro `tile` | obrigatório | não |
| a célula `coluna,linha` | qual bloco da grade; a primeira coluna e a primeira linha são 0 | dois números inteiros, 0 ou mais, dentro da grade; cada célula só pode ter um `tile` | obrigatório | não |
| `solid` | colide no bloco inteiro (no `iso`, no losango) | palavra solta | sem colisão | não |
| `oneway` | só colide por cima: dá para atravessar por baixo e parar em cima; sozinho, liga também o `solid` | palavra solta | desligado | não |
| `collision=` | colide no formato de uma forma (o contorno dela, simplificado) | o nome de uma forma fechada (`shape`, `rect` ou `ellipse`); ela pode ficar numa camada `guide` | nenhuma | não |

**Cuidado:**
- Sem `solid`, `oneway` nem `collision=`, o bloco não tem colisão: só o nome.
- Com `solid` e `collision=` juntos, vale o `collision=` (o Weasel avisa).
- Com `oneway` e `collision=`, a forma colide só por cima (uma rampa ou uma tábua).
- O `tile` pode vir antes ou depois do `tileset` no arquivo.

**Para aprender:** [Tileset: blocos para montar fases](09-jogo-godot.md#tileset-blocos-para-montar-fases).

## Expressões e bocas

Ficam no arquivo do personagem, mas só servem no filme: o rosto que o ator faz (`expr`) e a boca que mexe com a fala (`mouth`). No desenho do próprio personagem, elas não mudam nada.

### `expr`

Uma expressão do personagem, com nome: a pose de alguns ossos e o jeito de algumas formas, como numa `key`, mas sem o número do quadro. No filme, o ator faz a expressão com `expr=` na linha [`actor`](#actor) ou com `ator.expr=` no [`at`](#at).

```
expr nome osso=dx,dy,giro[,sx,sy] … forma.propriedade=valor …
```

<!-- conferir -->
```weasel
canvas 200 200 bg=#f4efe6
bone cabeca pivot=100,170
ellipse cara 100,100 60 c=#ffd8a8 ink=3 bone=cabeca
ellipse olhoE 80,90 8 c=#14141c bone=cabeca
ellipse olhoD 120,90 8 c=#14141c bone=cabeca
shape boca c=#c0392b ink=2 bone=cabeca : 82,126 100,132 118,126 100,128
shape sorriso c=#c0392b ink=2 bone=cabeca hidden : 76,118 100,146 124,118 100,130
# feliz: a cabeça inclina 8 graus e a boca vira o sorriso
expr feliz cabeca=0,0,8 boca.shape=sorriso
# bravo: a cabeça desce 6 pixels e a cara fica vermelha
expr bravo cabeca=0,6 cara.c=#ff9a8a
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o nome | o nome da expressão (o que o filme escreve em `expr=`) | um nome, sem repetir outra `expr` | obrigatório | não |
| `osso=dx,dy,giro,sx,sy` | a pose do osso: quanto anda em x e em y (pixels), quanto gira (graus) e a escala em x e em y | de 1 a 5 números; os que faltam valem `0,0,0,1,1`; com 4 números, o quarto vale para `sx` e `sy` | — | não |
| `forma.propriedade=valor` | muda uma forma, como na `key` | as propriedades da [`key` numa forma](#key-numa-forma): `opacity`, `show`, `c`, `inkc`, `w`, `ink`, `shape`, `draw`, `yaw`, `pitch`, `z` | — | não |
| `osso.yaw=` e `osso.pitch=` | o giro 3D do osso | graus, qualquer número | — | não |

No filme, a troca de uma expressão para outra é aos poucos, do `at` anterior até o `at` da nova (com o `ease=` dele). `none` tira a expressão.

**Cuidado:**
- A expressão manda nos ossos e nas formas que ela cita: enquanto ela vale, a animação deixa de mexer neles. Os outros continuam com a animação.
- `ease=` não existe numa `expr` (o Weasel procura um osso chamado `ease` e dá erro).
- A expressão aceita, mas não usa no filme: camadas (`camada.opacity=`…), luzes (`luz.power=`…), caixas (`caixa.show=`), `osso.along=` e a ordem (`above=`, `below=`). Nenhuma delas muda o ator, e o Weasel não avisa.
- A boca do lip sync ([`mouth`](#mouth)) vale por cima da expressão.

**Para aprender:** [Expressões: `expr`](10-filme.md#expressões-expr).

### `mouth`

As bocas do lip sync: para cada som da fala, uma forma que a boca vira. No filme, o [`audio`](#audio) com `lips=ator` faz a boca do ator seguir a fala. As letras são as do Rhubarb Lip Sync, um programa que acha as bocas de uma gravação.

```
mouth boca A=forma[@quanto] B=forma[@quanto] … X=forma[@quanto]
```

<!-- conferir -->
```weasel
canvas 200 200 bg=#f4efe6
ellipse cara 100,100 70 c=#ffd8a8 ink=3
ellipse olhoE 75,80 8 c=#14141c
ellipse olhoD 125,80 8 c=#14141c
# a boca desenhada é a de descanso; as outras ficam escondidas e só dão o formato
ellipse boca 100,138 16,3 c=#7a2a20
ellipse fechada 100,138 16,1 c=#7a2a20 hidden
ellipse aberta 100,140 16,16 c=#7a2a20 hidden
ellipse bico 100,138 7,7 c=#7a2a20 hidden
ellipse larga 100,138 22,6 c=#7a2a20 hidden
mouth boca A=fechada B=larga@0.5 C=aberta@0.5 D=aberta E=bico@0.5 F=bico G=larga@0.3 H=aberta@0.35 X=boca
```

Em cada letra, a boca vira a forma indicada, como um morph (`shape=` da `key`). O `@quanto` diz quanto do caminho até ela: `@0.5` é a metade.

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| a boca | a forma que mexe | o nome de uma forma do arquivo | obrigatório | não |
| `A=` | lábios fechados e apertados: "m", "b", "p" | uma forma do arquivo, com `@quanto` de 0 a 1 | `@1` (a forma inteira) | não |
| `B=` | boca um pouco aberta, dentes quase juntos: a maioria das consoantes ("s", "t", "k") e o "i" | o mesmo | `@1` | não |
| `C=` | boca aberta: "é", "ê" | o mesmo | `@1` | não |
| `D=` | boca bem aberta: "á" | o mesmo | `@1` | não |
| `E=` | boca um pouco arredondada: "ó", "ô" | o mesmo | `@1` | não |
| `F=` | biquinho: "u", "w" | o mesmo | `@1` | não |
| `G=` | os dentes de cima no lábio de baixo: "f", "v" | o mesmo | `@1` | não |
| `H=` | a língua atrás dos dentes de cima, aberta como a `C`: o "l" comprido | o mesmo | `@1` | não |
| `X=` | descanso: a boca das pausas, a mesma de quando ele não fala | o mesmo | `@1` | não |

**Cuidado:**
- A boca e cada forma das letras precisam combinar: as duas fechadas (`shape`, `ellipse`, `rect`) ou as duas abertas (`stroke`, `line`). Não vale `text`, partículas nem membro (`limb`). O número de pontos pode ser diferente.
- Uma letra que falta usa a mais parecida que existe (a `D` usa a `C`, depois a `B`; a `A` usa a `X`). Sem nenhuma, a boca fica como foi desenhada.
- O lip sync automático (do `.wav`, sem `cues=`) só usa `A`, `B`, `C`, `D`, `E`, `F` e `X`: "a" vira `D`, "e" vira `C`, "i" vira `B`, "o" vira `E`, "u" vira `F`, a voz fraca vira `B`, o silêncio vira `X` e a pausa curta no meio da fala vira `A`. As bocas `G` e `H` só vêm do Rhubarb (`cues=`).
- `@quanto` fora de 0 a 1 é erro.
- Com duas linhas `mouth`, vale a de baixo (o Weasel avisa).

**Para aprender:** [A coruja fala: lips e legendas desenhadas](10-filme.md#a-coruja-fala-lips-e-legendas-desenhadas).

## Filme

Um arquivo com a linha `film` é um filme. Ele põe em cena outros desenhos (os atores), divide o tempo em planos e diz o que muda em cada momento. O próprio arquivo do filme também desenha: as formas, as camadas e as luzes dele são o palco.

### `film`

Diz que o arquivo é um filme e guarda o que vale para ele todo: quantos quadros por segundo, a língua e o jeito das legendas.

```
film [fps=quadros] [dur=tempo] [lang=língua] [subs=burn|file] [subsize=pixels] [subc=cor]
```

<!-- conferir -->
```weasel
film fps=24 subs=burn subsize=28 subc=#ffe08a
canvas 640 360 bg=#1b2633
actor heroi "cavaleiro.weasel" 320,330 scale=0.4 anim=stand
shot abertura dur=3s
sub 0.5s "Era uma vez um cavaleiro." dur=2s
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| `fps=` | quantos quadros por segundo o vídeo tem | de 1 a 120 | 24 | não |
| `dur=` | quanto dura um filme sem nenhum [`shot`](#shot) | um tempo | até o último `at` (ou a última metamorfose); sem nenhum, 3 s (com aviso) | não |
| `lang=` | a língua das legendas que não dizem `lang=` | um código: `pt`, `en`, `es`… | `pt` | não |
| `subs=` | `burn` desenha as legendas no vídeo; `file` deixa as legendas só no arquivo `.srt` | `burn` ou `file` | `file` | não |
| `subsize=` | o tamanho da letra das legendas desenhadas | de 6 a 400, em pixels | 5% da altura do quadro (54 num quadro de 1080) | não |
| `subc=` | a cor das legendas desenhadas (o contorno é sempre escuro) | uma cor `#hex` | `#ffffff` | não |

**Cuidado:**
- Só uma linha `film` por arquivo. Ela pode ficar em qualquer lugar, mas o costume é a primeira linha.
- Sem [`canvas`](#canvas), a folha do filme (o quadro do vídeo) tem 1920×1080, com fundo branco.
- Com algum `shot`, o `dur=` não vale (o Weasel avisa): a duração é a soma dos planos.
- O `.srt` sai sempre ao lado do vídeo, com ou sem `subs=burn`, um por língua (`filme.srt`, `filme.en.srt`). Só não sai no GIF e com `--subs none`.
- As legendas desenhadas são as da língua do `lang=` (ou do `--lang`, na linha de comando).

**Para aprender:** [`film` e `canvas`](10-filme.md#film-e-canvas).

### `scene`

Põe ali os planos de outro filme. Serve para dividir um filme longo em arquivos, uma cena por arquivo.

```
scene "arquivo.weasel"
```

<!-- conferir -->
```weasel
film fps=24
canvas 640 360 bg=#1b2633
actor heroi "cavaleiro.weasel" 320,330 scale=0.4 anim=stand
shot titulo dur=2s
# depois do plano titulo, os quatro planos de filme.weasel (1920×1080, encolhidos para caber)
scene "filme.weasel"
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o arquivo | o filme cujos planos entram nesta linha | o nome de um arquivo com a linha `film`, entre aspas; sem extensão, ganha `.weasel` | obrigatório | não |

**Cuidado:**
- Os planos da cena ganham o nome do arquivo na frente: `pulo`, em `cena02.weasel`, vira `cena02/pulo`.
- A cena usa os atores, as luzes e as camadas do arquivo dela. Os do filme principal não entram nos planos da cena.
- Vale o `fps=` do filme principal. Um tempo em quadros (`24f`) da cena é contado no `fps=` dela.
- Uma cena de outro tamanho é encolhida ou aumentada para caber no quadro, no meio.
- Depois de um `scene`, as linhas `actor`, `camera`, `audio`, `sub`, `art` e `at` precisam de um `shot` antes (senão, dá erro).
- O acabamento ([`finish`](#finish)) é o do filme principal; sem ele, o da cena.
- Até 8 arquivos, um dentro do outro. Um arquivo não pode usar a si mesmo.

**Para aprender:** [Filmes longos: `scene`](10-filme.md#filmes-longos-scene).

### `shot`

Começa um plano: um trecho do filme com duração própria. As linhas depois dele (até o próximo `shot`) são desse plano.

```
shot nome dur=tempo [in=tipo[,duração]]
```

<!-- conferir -->
```weasel
film fps=24
canvas 640 360 bg=#1b2633
actor heroi "cavaleiro.weasel" 320,330 scale=0.4 anim=stand
# o primeiro plano entra a partir do preto, num fade de 1 segundo
shot abertura dur=3s in=fade,1s
camera 320,250 zoom=1.5
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o nome | o nome do plano (aparece no `--info` e serve no `--shot`) | um nome, sem repetir outro plano | obrigatório | não |
| `dur=` | quanto o plano dura | um tempo; no mínimo 1 quadro (menos que isso vira 1 quadro, sem avisar) | obrigatório (sem ele, dá erro e o plano fica com 3 s) | não |
| `in=tipo,duração` | como o plano entra: `fade` (o novo aparece por cima do anterior), `wipe` (uma cortina da esquerda para a direita), `slide` (o novo empurra o anterior para a esquerda), `zoom` (o anterior cresce e some), `iris` (um círculo fecha sobre o anterior e abre sobre o novo) | um dos cinco tipos; a duração é um tempo sem `+`, até a duração do plano; `0` tira a transição | sem `in=`, a troca é instantânea (um corte); sem a duração, 0,5 s | não |

**Cuidado:**
- Cada plano começa do zero: os atores e a câmera voltam ao que as linhas [`actor`](#actor) e [`camera`](#camera) dizem, e as animações recomeçam do primeiro quadro.
- A transição usa o começo do plano novo. O filme não fica mais longo, e os sons e as legendas não atrasam. Enquanto ela acontece, o plano de antes fica parado no último quadro.
- O primeiro plano do filme entra a partir do preto (transparente, com `-t`).
- Uma transição mais longa que o plano é cortada no tamanho dele (o Weasel avisa).

**Para aprender:** [Planos: `shot`](10-filme.md#planos-shot) e [Transições: `in=`](10-filme.md#transições-in).

### `actor`

Põe um desenho no filme: um arquivo `.weasel` (um personagem, um cenário) num lugar, com um tamanho e uma animação.

```
actor nome "arquivo.weasel" [x,y] [opções] [screen] [bg] [hidden] [unlit] [front]
```

<!-- conferir -->
```weasel
film fps=24
canvas 640 360 bg=#1b2633
# o ponto entre os pés (o unity root= do arquivo) vai para 320,330
# virado para a esquerda, correndo em câmera lenta, sem a fumaça da corrida
actor heroi "cavaleiro.weasel" 320,330 scale=0.4 flip=x anim=dash speed=0.5 hide=smoke
shot corrida dur=2s
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o nome | o nome do ator (o alvo do `at`: `heroi.x=`) | um nome; `camera` não vale | obrigatório | não |
| o arquivo | o desenho que entra no filme | o nome de um arquivo entre aspas; sem extensão, ganha `.weasel`; não pode ser um filme (para isso, use [`scene`](#scene)) | obrigatório | não |
| o lugar `x,y` | onde a origem do ator (o `origin=`) fica no filme | dois números, em pixels | `0,0` | `at` (`pos=`, `x=`, `y=`) |
| `scale=` | o tamanho; com dois números, a largura e a altura | um ou dois números | 1 | `at` |
| `rot=` | gira o ator em volta da origem dele | qualquer número, em graus | 0 | `at` |
| `flip=` | espelha: `x` vira para o outro lado, `y` de cabeça para baixo, `xy` os dois | `x`, `y`, `xy`, `none` ou `0` | `none` | `at` (troca de uma vez) |
| `depth=` | a distância do ator inteiro: 2 é duas vezes mais longe; ele anda menos com a câmera | de 0.05 a 1000 | 1 | `at` |
| `anim=` | a animação que o ator toca, em loop | o nome de uma animação do arquivo dele, ou `none` | nenhuma: o desenho parado, com os movimentos automáticos dos ossos (`sway=`, `bob=`, `jitter=`) | `at` (troca de uma vez) |
| `speed=` | a velocidade da animação: 0.5 é a metade, 0 congela; `auto` acompanha o quanto o ator anda, pelo `feet=` da animação | de 0 a 100, ou `auto` | 1 | `at` (troca de uma vez) |
| `opacity=` | a transparência do ator inteiro | de 0 a 1 | 1 | `at` |
| `origin=x,y` | o ponto do desenho do ator que vai para o lugar `x,y`; o ator gira, cresce e espelha em volta dele | dois números, em pixels do desenho do ator | o `root=` do [`unity`](#unity) do arquivo dele; sem `unity`, `0,0` | não |
| `variant=` | outras cores: uma [`variant`](#variant) do arquivo dele | o nome de uma variante, ou `none` | nenhuma | `at` (troca de uma vez) |
| `hide=` | esconde camadas do arquivo do ator | nomes de camadas do arquivo dele, separados por vírgula | nenhuma | não |
| `path=` | o caminho por onde o ator anda; o `at` diz quanto ele já andou (`along=`) | o nome de uma `line`, `stroke`, `shape`, `ellipse` ou `rect` do arquivo do filme | nenhum | não |
| `turn=` | com `path=`, o ator gira com a curva do caminho; `turn=0` deixa ele de pé | `0` desliga; qualquer outro valor liga | ligado (com `path=`) | não |
| `expr=` | a expressão do começo (uma [`expr`](#expr) do arquivo dele) | o nome de uma expressão, ou `none` | nenhuma | `at` |
| `screen` | prende o ator na tela: ele não anda com a câmera e não fica na névoa | palavra solta | desligado | não |
| `bg` | desenha também o fundo do arquivo do ator (o `bg=` do `canvas` dele) | palavra solta | desligado | não |
| `hidden` | o ator começa invisível; ele aparece com `at … nome.show=1` | palavra solta | visível | `at` (`show=`, troca de uma vez) |
| `unlit` | as luzes do filme não iluminam o ator (as do arquivo dele continuam) | palavra solta | desligado | não |
| `front` | o ator fica na frente das camadas `front` do filme que estão na mesma distância | palavra solta | desligado | não |

**Cuidado:**
- Um ator escrito antes do primeiro `shot` vale em todos os planos. Um ator escrito dentro de um `shot` só existe nele. O mesmo nome não pode aparecer de novo num plano.
- Em cada plano, a animação recomeça do primeiro quadro e repete até o fim do plano. Uma animação com `once` toca uma vez e para no último quadro.
- O `depth=` do ator multiplica o `depth=` das camadas do arquivo dele: uma camada `depth=2` num ator `depth=3` fica a 6.
- `turn=` e `along=` sem `path=` não fazem nada, e o Weasel não avisa. Num caminho aberto, `along=` vai de 0 a 1; num caminho fechado (elipse, retângulo, `shape`), `along=2` dá duas voltas.
- Se o filme tem `light` ou `ambient`, o `ambient` do arquivo do ator é trocado pelo do filme (sem `ambient` no filme, uma luz branca de força 0.6). Use `unlit` para o ator ficar com a luz dele.

**Para aprender:** [Atores: `actor`](10-filme.md#atores-actor) e [Andar por um caminho: `path=`](10-filme.md#andar-por-um-caminho-path).

### `camera`

Escolhe o pedaço do filme que aparece no quadro: para onde a câmera olha, quanto ela aproxima, se ela segue um ator, treme ou escurece.

```
camera [x,y] [opções]
```

<!-- conferir -->
```weasel
film fps=24
canvas 640 360 bg=#1b2633
actor heroi "cavaleiro.weasel" 120,330 scale=0.4 anim=dash
shot corrida dur=3s
# a câmera segue o herói, olhando um pouco acima dele, com atraso e um tremor leve
camera follow=heroi offset=0,-80 lag=0.4 zoom=1.5 shake=3
at 3s heroi.x=600
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o ponto `x,y` | o ponto do filme que fica no meio do quadro | dois números, em pixels | o meio do canvas | `at` (`pos=`, `x=`, `y=`) |
| `zoom=` | aproxima a câmera: o que está perto cresce mais que o que está longe | de 0.01 a 100 | 1 | `at` |
| `rot=` | inclina o quadro | qualquer número, em graus | 0 | `at` |
| `shake=` | o tremor da câmera na mão: quanto ela balança | de 0 a 1000, em pixels | 0 | `at` |
| `follow=` | a câmera segue um ator | o nome de um ator do plano ou do filme, ou `none` | nenhum | `at` (troca de uma vez) |
| `offset=dx,dy` | desloca o ponto seguido (para olhar acima ou à frente do ator) | dois números, em pixels | `0,0` | `at` |
| `lag=` | a câmera vai atrás do alvo com atraso, sem trancos; quanto maior, mais atrasada | de 0 a 10, em segundos | 0 | `at` (troca de uma vez) |
| `fade=` | cobre o quadro com a cor do `fadec=`: 0 é a imagem normal, 1 é só a cor | de 0 a 1 | 0 | `at` |
| `fadec=` | a cor do `fade=` | uma cor `#hex` | `#000000` | `at` |
| `lens=` | a lente: aproxima tudo por igual, perto e longe | de 0.01 a 100 | 1 | `at` |
| `fog=` | a cor da névoa da distância (só nas camadas e atores com `depth=` maior que 1) | uma cor `#hex`, ou `none` | nenhuma | `at` |
| `haze=` | a distância em que a névoa cobre metade da cor | de 1.05 a 1000 | 6 | `at` |

**Cuidado:**
- A linha `camera` antes do primeiro `shot` vale para todos os planos. Dentro de um `shot`, ela parte da câmera do filme e muda só o que a linha diz.
- No [`at`](#at), as faixas são outras: `zoom=` e `lens=` vão até 1000, `lag=` vai até 100 e `haze=` aceita a partir de 0.01 (no desenho, abaixo de 1.05 vale 1.05, sem avisar).
- `lag=` não é um atraso fixo: em `lag` segundos, a câmera faz uns dois terços do caminho até o alvo. Ele vale para seguir um ator e também para os `at` que mudam o `pos=`.
- O `follow=` leva em conta a distância do ator: um ator longe (com `depth=`) também fica no meio do quadro.

**Para aprender:** [Câmera: `camera`](10-filme.md#câmera-camera) e [Profundidade no filme: lente e névoa](11-profundidade.md#profundidade-no-filme-lente-e-névoa).

### `at`

Diz o que muda num momento do plano: `at 2s heroi.x=500` põe o herói em x=500 aos 2 segundos. O valor vai mudando aos poucos desde o `at` anterior (ou desde o começo do plano). Ele muda atores, a câmera e as luzes, camadas e formas do arquivo do filme.

```
at tempo alvo.propriedade=valor … [ease=curva] [blend=tempo] [phase]
at tempo ator.morph=outro_ator [dur=tempo] [pairs=parte->parte,…] [born=parte->parte,…]
```

O tempo pode ser `2s`, `1.5` (segundos), `500ms`, `48f` (quadros do filme), `1m30s`, `+0.5s` (depois do `at` anterior), `marca`, `marca+0.3s` ou `marca-0.3s` (a partir de um [`mark`](#mark)).

<!-- conferir -->
```weasel
film fps=24
canvas 640 360 bg=#1b2633
actor heroi "cavaleiro.weasel" 120,330 scale=0.4 anim=stand
shot corrida dur=4s
# repete o lugar da linha actor: parado até 1 s; ali começa a correr (a troca de animação mistura por 0.2 s)
at 1s heroi.x=120 heroi.anim=dash blend=0.2s
# corre até x=520, freando no fim; a câmera aproxima desde 0 s
at 3s heroi.x=520 camera.zoom=1.3 ease=out
at 3.5s heroi.anim=stand heroi.flip=x
```

<!-- conferir -->
```weasel
film fps=24
canvas 640 360 bg=#1b2633
actor heroi "cavaleiro.weasel" 320,330 scale=0.4 anim=stand
shot susto dur=3s
mark pulo 1.5s
# um at só: a câmera vai aproximando desde 0 s, devagar, até 2 s
at 2s camera.zoom=2 camera.pos=320,240
at pulo heroi.anim=jump
# ease=step: o tremor fica em 0 e liga de uma vez em 2.3 s
at pulo+0.8s camera.shake=10 ease=step
# + conta do at de cima: 2.6 s
at +0.3s camera.shake=0
```

<!-- conferir -->
```weasel
film fps=24
canvas 640 360 bg=#1b2633
ambient c=#5866a0 power=0.5
light lampada point 320,60 c=#ffb860 power=0 radius=320
layer placa screen
text titulo 320,60 "Fim" size=48 align=center c=#f4efe6
line risco w=4 c=#f4efe6 : 260,80 380,80
actor heroi "cavaleiro.weasel" 320,330 scale=0.4 anim=stand
shot fim dur=3s
# a lâmpada do filme acende, a placa aparece e o risco se desenha
at 0s placa.opacity=0 risco.draw=0
at 1.5s lampada.power=1.6 placa.opacity=1
at 3s risco.draw=1
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o tempo | quando a mudança chega | um tempo; `+t` conta do `at` anterior do plano (na ordem do arquivo); `marca`, `marca+t` e `marca-t` contam de um [`mark`](#mark) | obrigatório | — |
| `alvo.propriedade=valor` | o que muda; o alvo é `camera`, um ator, ou uma luz, camada ou forma do arquivo do filme | as tabelas abaixo | pelo menos uma | — |
| `ease=` | como o valor chega neste `at`: `smooth` começa e termina devagar; `linear` vai sempre igual; `in` começa devagar; `out` termina devagar; `step` fica parado e pula no tempo do `at`; `back` passa um pouco do ponto e volta | `smooth`, `linear`, `in`, `out`, `step` ou `back` | `smooth` | — |
| `blend=` | numa troca de `anim=` desta linha, a animação de antes continua e vai virando a nova durante esse tempo | um tempo maior que 0, sem `+` | nenhum: a animação troca de uma vez | — |
| `phase` | numa troca de `anim=` desta linha, a nova começa no mesmo ponto do passo da de antes (com `feet=` nas duas, pelos pés; senão, na mesma porcentagem da animação); só entre duas animações em loop | palavra solta | desligado: a nova começa do primeiro quadro | — |
| `dur=` | quanto dura a metamorfose (`morph=`) desta linha | um tempo maior que 0, sem `+` | 1 s | — |
| `pairs=` | na metamorfose, casa as partes à mão: primeiro a parte do ator que sai, depois a do que chega | pares `parte->parte` separados por vírgula | o Weasel casa sozinho | — |
| `born=` | na metamorfose, de onde nasce (ou onde some) uma parte que só existe num dos atores | pares `parte->outra` separados por vírgula | o Weasel escolhe a parte mais perto | — |

As tabelas abaixo dizem o que o `at` muda em cada alvo. A coluna "No começo" é o valor antes do primeiro `at`: o da linha do alvo. "Aos poucos" quer dizer que o valor anda do `at` anterior até este; "de uma vez", que ele troca no tempo do `at`.

#### `at` num ator

| Propriedade | O que muda | Valores no `at` | No começo | Muda |
|---|---|---|---|---|
| `pos=x,y` | o lugar | dois números, em pixels | o `x,y` da linha `actor` | aos poucos |
| `x=` | só o x do lugar | qualquer número | o x da linha `actor` | aos poucos |
| `y=` | só o y do lugar | qualquer número | o y da linha `actor` | aos poucos |
| `scale=` | o tamanho | um ou dois números | o `scale=` da linha | aos poucos |
| `rot=` | o giro | qualquer número, em graus | o `rot=` da linha | aos poucos |
| `opacity=` | a transparência | de 0 a 1 | o `opacity=` da linha | aos poucos |
| `depth=` | a distância | de 0.01 a 1000; no desenho, abaixo de 0.05 vale 0.05 (sem avisar) | o `depth=` da linha | aos poucos |
| `speed=` | a velocidade da animação | de 0 a 100, ou `auto` | o `speed=` da linha | de uma vez |
| `anim=` | a animação | o nome de uma animação do arquivo do ator, ou `none` | o `anim=` da linha | de uma vez (a nova começa do primeiro quadro; veja `blend=` e `phase`) |
| `flip=` | o espelho | `x`, `y`, `xy`, `none` ou `0` | o `flip=` da linha | de uma vez |
| `show=` | aparece (1) ou some (0) | `1`, `on`, `true`, `sim` ou `0`, `off`, `false`, `nao`, `não` | 1 (0 com `hidden`) | de uma vez |
| `variant=` | as cores | o nome de uma variante do arquivo do ator, ou `none` | o `variant=` da linha | de uma vez |
| `along=` | quanto do caminho do `path=` o ator já andou: 0 é o começo, 1 é o fim | qualquer número; num caminho aberto, fica entre 0 e 1 (sem avisar); num caminho fechado, 2 dá duas voltas | 0 | aos poucos |
| `expr=` | a expressão | o nome de uma expressão do arquivo do ator, ou `none` | o `expr=` da linha | aos poucos |
| `morph=` | o ator vira outro ator, aos poucos, durante o `dur=`; no fim, este some e o outro aparece | o nome de outro ator do plano (que começa com `hidden`) | — | aos poucos |

#### `at` na câmera

| Propriedade | O que muda | Valores no `at` | No começo | Muda |
|---|---|---|---|---|
| `pos=x,y` | o ponto no meio do quadro | dois números, em pixels | o `x,y` da linha `camera` (sem ele, o meio do canvas) | aos poucos |
| `x=` | só o x | qualquer número | o x da linha `camera` | aos poucos |
| `y=` | só o y | qualquer número | o y da linha `camera` | aos poucos |
| `zoom=` | quanto a câmera aproxima | de 0.01 a 1000 (na linha `camera`, só até 100) | o `zoom=` da linha | aos poucos |
| `rot=` | a inclinação | qualquer número, em graus | o `rot=` da linha | aos poucos |
| `shake=` | o tremor | de 0 a 1000, em pixels | o `shake=` da linha | aos poucos |
| `follow=` | o ator seguido | o nome de um ator, ou `none` | o `follow=` da linha | de uma vez |
| `offset=dx,dy` | o deslocamento do ponto seguido | dois números, em pixels | o `offset=` da linha | aos poucos |
| `lag=` | o atraso para seguir | de 0 a 100, em segundos (na linha `camera`, só até 10) | o `lag=` da linha | de uma vez |
| `fade=` | quanto o quadro fica coberto pela cor | de 0 a 1 | o `fade=` da linha | aos poucos |
| `fadec=` | a cor do `fade=` | uma cor `#hex` | o `fadec=` da linha | aos poucos |
| `lens=` | a lente | de 0.01 a 1000 (na linha `camera`, só até 100) | o `lens=` da linha | aos poucos |
| `fog=` | a cor da névoa | uma cor `#hex`; `none` não faz nada (sem aviso) | o `fog=` da linha | aos poucos; sem névoa antes, ela liga de uma vez no tempo do `at` |
| `haze=` | a distância da meia névoa | de 0.01 a 1000; no desenho, abaixo de 1.05 vale 1.05 (sem avisar); na linha `camera`, de 1.05 a 1000 | o `haze=` da linha | aos poucos |

#### `at` numa luz

Só as luzes ([`light`](#light)) do arquivo do filme. O lugar da luz não muda com o `at`.

| Propriedade | O que muda | Valores no `at` | No começo | Muda |
|---|---|---|---|---|
| `power=` | a força da luz; 0 ou menos apaga | qualquer número (na linha `light`, de 0 a 20) | o `power=` da linha | aos poucos |
| `radius=` | até onde a luz chega | qualquer número, em pixels; abaixo de 1 vale 1 (sem avisar) | o `radius=` da linha | aos poucos |
| `c=` | a cor da luz | uma cor `#hex` | o `c=` da linha | aos poucos |
| `glow=` | o tamanho do halo em volta da lâmpada | qualquer número, em pixels | o `glow=` da linha | aos poucos |
| `aim=` | para onde o `spot` aponta | qualquer número, em graus | o `aim=` da linha | aos poucos |
| `cone=` | a metade da abertura do `spot` | qualquer número, em graus (de 180 para cima, ilumina em volta toda) | o `cone=` da linha | aos poucos |

#### `at` numa camada

Só as camadas ([`layer`](#layer)) do arquivo do filme.

| Propriedade | O que muda | Valores no `at` | No começo | Muda |
|---|---|---|---|---|
| `opacity=` | a transparência; multiplica o `opacity=` da linha da camada | de 0 a 1 | 1 | aos poucos |
| `show=` | aparece (1) ou some (0) | `1`, `on`, `true`, `sim` ou `0`, `off`, `false`, `nao`, `não` | 1 (0 com `hidden`) | de uma vez |
| `blur=` | o desfoque | qualquer número, em pixels; 0 ou menos não desfoca | o `blur=` da linha (sem ele, 0) | aos poucos |
| `glow=` | o raio do brilho em volta | qualquer número, em pixels; sem `glow=` na linha da camada, o brilho é branco | o raio do `glow=` da linha (sem ele, 0) | aos poucos |
| `tint=` | quanto da cor do `tint=` da camada | de 0 a 1 (acima de 1, vale 1 sem avisar); precisa de `tint=cor,quanto` na linha da camada | o quanto da linha | aos poucos |
| `brightness=` | o brilho: 1 é normal | qualquer número (na linha `layer`, de 0 a 10) | o da linha (sem ele, 1) | aos poucos |
| `saturate=` | a saturação das cores: 1 é normal, 0 é cinza | qualquer número (na linha `layer`, de 0 a 10) | o da linha (sem ele, 1) | aos poucos |
| `contrast=` | o contraste: 1 é normal | qualquer número (na linha `layer`, de 0 a 10) | o da linha (sem ele, 1) | aos poucos |
| `hue=` | gira as cores no círculo das cores | qualquer número, em graus | o da linha (sem ele, 0) | aos poucos |
| `above=` | não vale no `at`: a ordem das camadas só muda numa `key` (dá erro) | — | — | — |
| `below=` | não vale no `at`, como o `above=` (dá erro) | — | — | — |
| `yaw=` | o giro 3D em volta do eixo de pé | qualquer número, em graus | o `yaw=` da linha | aos poucos |
| `pitch=` | o giro 3D em volta do eixo deitado | qualquer número, em graus | o `pitch=` da linha | aos poucos |

#### `at` numa forma

Só as formas do arquivo do filme (um título, uma seta, um mapa). As formas de dentro de um ator mudam com `anim=` ou `expr=`.

| Propriedade | O que muda | Valores no `at` | No começo | Muda |
|---|---|---|---|---|
| `draw=` | quanto da forma já foi desenhado: 0 é nada, 1 é tudo | de 0 a 1 | 1 | aos poucos |
| `opacity=` | a transparência; multiplica o `opacity=` da linha da forma | de 0 a 1 | 1 | aos poucos |
| `show=` | aparece (1) ou some (0) | `1`, `on`, `true`, `sim` ou `0`, `off`, `false`, `nao`, `não` | 1 (0 com `hidden`) | de uma vez |
| `yaw=` | o giro 3D em volta do eixo de pé | qualquer número, em graus | o `yaw=` da linha | aos poucos |
| `pitch=` | o giro 3D em volta do eixo deitado | qualquer número, em graus | o `pitch=` da linha | aos poucos |
| `z=` | a distância da tela (positivo é mais perto) | qualquer número | o `z=` da linha | aos poucos |

**Cuidado (em todo `at`):**
- O `at` precisa ficar dentro de um `shot` (depois da linha `shot`). Antes do primeiro `shot`, ele dá erro. Só num filme sem nenhum `shot` ele pode ficar em qualquer lugar.
- O valor escrito na linha `actor` ou `camera` vale como um `at 0s`. Por isso, um único `at 2s heroi.x=500` faz o herói andar devagar desde o começo do plano até chegar em 500 aos 2 s. Para ele ficar parado até 1 s e só então andar, repita o valor da linha num `at 1s` (como no primeiro exemplo).
- O `ease=` diz como o valor **chega** naquele `at`: ele vale para o trecho desde o `at` anterior. Numa `key`, é o contrário: o `ease=` diz como o movimento sai dela.
- Trocam de uma vez: `anim`, `flip`, `show`, `variant` e `speed` do ator; `follow` e `lag` da câmera; `show` da camada e da forma. O resto muda aos poucos.
- As faixas do `at` não são as da linha: `zoom=` e `lens=` vão até 1000 (na `camera`, até 100); `lag=` vai até 100 (na `camera`, até 10); `haze=` e o `depth=` do ator aceitam a partir de 0.01 (na linha, 1.05 e 0.05).
- Dois `at` no mesmo tempo mudando a mesma coisa: vale o de baixo.
- Um `at` depois do fim do plano dá aviso. Um `marca` que cai fora do plano também, e a linha não vale.
- Uma forma ou camada com `hidden` só aparece com `show=1`. Mudar o `opacity=` dela sem isso dá aviso.

**Para aprender:** [Mudanças no tempo: `at`](10-filme.md#mudanças-no-tempo-at), [Camadas e formas do filme](10-filme.md#camadas-e-formas-do-filme) e [Um ator vira outro: `morph=`](10-filme.md#um-ator-vira-outro-morph).

### `audio`

Um som no filme: uma fala, uma música, um barulho. O vídeo sai com os sons misturados. Um som pode também mexer a boca de um ator (lip sync) e virar legenda.

```
audio nome "arquivo" [at=tempo] [from=tempo] [dur=tempo] [vol=volume] [lips=ator] [cues="arquivo"] [text="legenda"] [lang=língua] [loop]
```

<!-- conferir -->
```weasel
film fps=24
canvas 640 360 bg=#1b2633
actor coruja "coruja.weasel" 320,330 origin=240,404 scale=0.5 hide=ceu,fala
shot fala dur=3s
# o bico da coruja segue a fala (lip sync), e o texto vira legenda enquanto o som toca
audio voz "som/coruja_fala.wav" at=0.4s lips=coruja text="Uh-uuh! Boa noite."
audio grilos "som/grilos.wav" vol=0.3 loop
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o nome | o nome do som (aparece no `--info`) | um nome | obrigatório | não |
| o arquivo | o som | um arquivo entre aspas: `.wav`, `.mp3`, `.ogg`…; o lip sync automático só funciona com `.wav` | obrigatório | não |
| `at=` | quando o som começa: dentro de um `shot`, contado do começo dele; fora, do começo do filme | um tempo | 0 | não |
| `from=` | pula o começo do arquivo | um tempo | 0 | não |
| `dur=` | quanto do som toca | um tempo | o resto do arquivo (pode passar do fim do plano); com `loop`, até o fim do plano | não |
| `vol=` | o volume: 1 é o normal, 0 é mudo | de 0 a 4 | 1 | não |
| `lips=` | o ator cuja boca segue o som (o lip sync) | o nome de um ator do plano ou do filme, com [`mouth`](#mouth) no arquivo dele | nenhum | não |
| `cues=` | as bocas prontas, feitas pelo Rhubarb Lip Sync (acertam mais que o automático) | um arquivo entre aspas: o `.json` do Rhubarb (com `mouthCues`), ou um texto com `tempo boca` em cada linha | nenhum: o Weasel calcula as bocas do `.wav` | não |
| `text=` | uma legenda que fica enquanto o som toca; `\n` quebra a linha | um texto entre aspas | nenhuma | não |
| `lang=` | a língua da legenda do `text=` | um código: `pt`, `en`… | a do `film lang=` | não |
| `loop` | repete o som até o fim do plano (fora de um `shot`, até o fim do filme) | palavra solta | desligado | não |

**Cuidado:**
- O `at=` aceita um `+` na frente, mas não faz nada com ele: `at=+1s` é o mesmo que `at=1s`.
- Sem `dur=`, o som toca até o fim do arquivo, mesmo depois do fim do plano.
- No GIF, o som não vai.

**Para aprender:** [Som, legendas e lip sync](10-filme.md#som-legendas-e-lip-sync).

### `sub`

Uma legenda: um texto que aparece num momento do filme. As legendas vão para um arquivo `.srt` ao lado do vídeo; com `film subs=burn`, são desenhadas no vídeo também.

```
sub tempo "texto" [dur=tempo] [lang=língua]
```

<!-- conferir -->
```weasel
film fps=24 subs=burn
canvas 640 360 bg=#1b2633
actor heroi "cavaleiro.weasel" 320,330 scale=0.4 anim=stand
shot conversa dur=5s
sub 0.5s "Quem está aí?"
# + conta do fim da legenda anterior; \n quebra a linha
sub +0.3s "Ninguém…\nSó o vento." dur=2s
# a mesma fala em inglês vai para um filme.en.srt
sub 0.5s "Who's there?" lang=en
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o tempo | quando a legenda aparece: dentro de um `shot`, contado do começo dele; fora, do começo do filme | um tempo; `+t` conta do fim da legenda anterior | obrigatório | não |
| o texto | o que a legenda diz; `\n` quebra a linha | um texto entre aspas | obrigatório | não |
| `dur=` | quanto tempo a legenda fica | um tempo; no mínimo 1 quadro | o tempo de ler: 0,5 s mais 1 s a cada 15 letras, entre 1,2 s e 7 s | não |
| `lang=` | a língua da legenda | um código: `pt`, `en`… | a do `film lang=` | não |

**Cuidado:**
- O `+` conta do fim da legenda anterior do mesmo plano, de qualquer língua.
- Cada língua vai para um `.srt` próprio: `filme.srt` para a do `film lang=`, `filme.en.srt` para o inglês, e assim por diante.
- O vídeo desenha só as legendas de uma língua: a do `film lang=` (ou a do `--lang`).
- O `dur=` aceita um `+` na frente, mas não faz nada com ele.

**Para aprender:** [Som, legendas e lip sync](10-filme.md#som-legendas-e-lip-sync).

### `mark`

Um marcador: um momento do filme com nome. Os [`at`](#at) podem contar a partir dele (`at salto`, `at salto+0.5s`, `at salto-0.2s`). Mudou o momento? Mude só a linha `mark`, e todos os `at` vão junto.

```
mark nome tempo
```

<!-- conferir -->
```weasel
film fps=24
canvas 640 360 bg=#1b2633
actor heroi "cavaleiro.weasel" 320,330 scale=0.4 anim=stand
shot pulo dur=3s
# o momento do pulo tem nome; os at contam a partir dele
mark salto 1.2s
at salto heroi.anim=jump
at salto-0.2s camera.zoom=1
at salto+0.5s camera.zoom=1.4 ease=out
```

| Opção | O que faz | Valores | Padrão | Anima? |
|---|---|---|---|---|
| o nome | o nome do momento | um nome, sem repetir outro `mark` | obrigatório | não |
| o tempo | quando é o momento: dentro de um `shot`, contado do começo dele; antes dos `shot`, do começo do filme | um tempo, sem `+` | obrigatório | não |

**Cuidado:**
- O `mark` não aceita `+`: escreva o tempo dele inteiro.
- Um `at` pode usar um marcador de outro plano, desde que o momento caia dentro do plano do `at`. Se cair fora, o Weasel avisa e a linha não vale.
- Os marcadores vão para a linha do tempo do editor de vídeo (`--edl`, `--fcpxml`) e aparecem no `--info`.

**Para aprender:** [Marcadores: `mark`](10-filme.md#marcadores-mark).

[← Índice](README.md) · [Próximo: Funções das contas →](20-funcoes.md)
