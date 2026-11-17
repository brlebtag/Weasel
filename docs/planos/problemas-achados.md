# Problemas achados no código

Estes problemas foram achados de passagem em novembro de 2026:
- pelo diagnóstico do guia (os relatórios de cada capítulo);
- pelas sessões das tarefas A, B e J;
- pelas etapas 1 e 2 do [guia novo](guia-e-atalhos.md).

Nada aqui foi corrigido ainda. As letras A a J são as da seção 2 do plano do guia. Os números novos começam em 1.

Os casos da linha de comando foram rodados de novo em 17/11/2026 (`node cli/weasel.js -e "…" --check`) e continuam como está escrito. Os do editor e do Godot vêm da leitura do código, com a linha onde estão.

Antes de cada tarefa, a proposta é explicada de novo, e o trabalho só começa com o seu "pode fazer".

## 1. Já têm sessão

| # | O quê | Situação |
|---|---|---|
| J | **`opacity=` da forma e do `use`** vale pedaço por pedaço. Numa forma com contorno, a metade de dentro do contorno mostra o preenchimento por baixo. Num `use`, as formas do componente aparecem uma através da outra. | sessão própria, em andamento (retomada em 17/11, depois de uma queda da rede) |
| F | **`line dash=0`** (ou um número negativo) passa no `--check`, mas a exportação para com `Make line dash path effect failed`. | a sessão `corrigir-dash-0-paper-pr` está pronta e espera o seu "pode fazer" |
| G | **`art pencil` e `art crayon`:** num desenho sem fundo, um `paper=` com um canal `00` (`#ff0000`) sai preto. É uma divisão 0/0 em `art.js`. | idem |
| H | **Nomes de saída da linha de comando:** um filme com `-o x.tscn` salva centenas de PNGs com o nome `.tscn`; `-o x.bmp` salva um PNG sem aviso; `-f build -o x.png` salva um GIF com o nome `.png`. | idem |

## 2. Defeitos: a imagem, o arquivo ou a tecla saem errados

| # | O quê | Onde | O que muda ao corrigir |
|---|---|---|---|
| E | Um `rect` com largura ou altura negativa e `r=` desenha os cantos para dentro. | `geom.js:139` | só a imagem desse caso, que hoje sai errada |
| 1 | `finish posterize=palette` usa só as cores `#hex` da `palette`. Uma cor com nome (`pele=wheat`) fica de fora, sem aviso, e a transparência das cores é ignorada. | `scene.js:3094`, `:3109` | a imagem de quem usa `posterize=palette` com nomes de cor |
| 2 | **Godot sem `root=`:** a origem fica no meio da base do recorte, 8 px abaixo do desenho (a margem do `--trim`). Um personagem sem `root=` flutua 8 px acima do chão. | `godot.js:53`, `:697` | **muda os jogos já exportados**: precisa de decisão (talvez só explicar no guia) |
| 3 | **Vista 3D das camadas:** Agrupar, Travar, Organizar, Recortar, Copiar, Colar, Tudo e Nada ficam ativos no menu, mas as teclas deles não fazem nada. | `ui-select.js:478` | só o editor |
| 4 | **Espaço num botão com foco** toca o player, em vez de apertar o botão. | `app.js:5812` | só o editor |
| 5 | **← e → na linha do tempo do filme**, sem nada escolhido, mostram o aviso do desenho ("As setas empurram a forma escolhida…"), que não serve ali. | `app.js:5821` | só o editor |
| 6 | **No Mac**, Ctrl+clique no desenho escreve a coordenada e também abre o menu do botão direito. Lá, o certo seria Cmd+clique. | `app.js:4200` | só o editor |

## 3. Aceito sem fazer nada, ou cortado sem aviso

Uma tarefa de "avisos que faltam" resolve todos de uma vez: o Weasel passa a avisar e a imagem não muda. **Cuidado:** um aviso novo pode aparecer num jogo que hoje passa limpo. Antes, é preciso rodar o `--check` nos jogos.

**Formas** (C, do diagnóstico dos capítulos 1 e 2):
- `cut=` em `stroke`, `line` e `text`: aceito, sem efeito.
- `bold` e `italic` fora do `text`; `cloth=` no `text`; `~` e `!` na `line`: aceitos, sem efeito.
- `ink=` e `w=` negativos viram 0; o `taper=` fora de 0 a 1 é cortado.

**Cores** (diagnóstico dos capítulos 3 e 4):
- 7. Uma `variant` com um nome que não está na `palette` cria um nome novo: um erro de digitação passa calado.
- 8. Um `pattern` com o mesmo nome de uma cor da `palette` não avisa, e vale a cor. O `gradient` avisa ("já é um nome da palette").
- 9. As posições do `gradient` (`cor@posição`) fora de 0 a 1 ou fora de ordem são corrigidas sem aviso.
- 10. No `pattern dots`, o `cross` e o `w=` não fazem nada.

**Camadas e acabamento:**
- 11. Escrever `layer base` com formas antes do primeiro `layer` cria duas camadas `base`.
- 12. Uma segunda palavra no `finish` (`finish game flat`) é ignorada. Várias linhas `finish` se somam, e vale o estilo da última.
- C. Cortados sem aviso: a força do `glow=` (0,1 a 5), o `tint=` (0 a 1), a sombra do `cast=`, o `emit=` e a queda do `trail=`.

**Contas e componentes** (I e diagnóstico dos capítulos 5 e 6):
- 13. Um `let` repetido vale o último no arquivo inteiro, também nas linhas de cima.
- I. `let pi=3` é ignorado nas contas; `let a-b=5` cria um nome que não dá para usar; `rand(x,a)` ignora o `a`; nas funções, um número a mais é ignorado.
- 14. Um parâmetro do `def` sem `=` (`def x semvalor`) é ignorado.
- 15. Um `use` com o nome de uma cor da `palette` ou de um `let` (`use arvore 60,206 line=9`) vira um parâmetro escondido, sem aviso.

**Ossos e caminhos:**
- I. `turn=nao` e `turn=off` ligam a virada (só `0` desliga).
- 16. `turn=` e `along` sem `path=` não fazem nada.
- 17. No membro, `target=` junto com `foot=`: vale o `target`, sem aviso. O `bone=` no membro é ignorado.

**Luz:**
- 18. O `bone=` numa luz `dir` não faz nada.
- 19. Dois `ambient`: vale o último. A opção `lit` da camada não faz nada.
- D. Numa `key`, a luz aceita `power=30` e `cone=999`; a linha `light` corta em 0 a 20 e 1 a 180. O `zoom` vai até 100 na `camera` e até 1000 no `at`; o `lag`, até 10 e até 100.

**Animação** (I): `key emissor.c=`; no `expr`, as propriedades de camada, luz e caixa.

**Jogo:**
- 20. O `size=` do `tileset` tem mínimo 2, sem aviso.
- 21. O `horizon=` abaixo do pivô não faz nada.

**Filme** (C): `at … camera.fog=none` é ignorado; `audio at=+1s` ignora o `+`.

**Estilos:** 22. O `angle=` não faz nada no `art color` (os ângulos são fixos, `art.js:562`).

## 4. Mensagens que enganam

- 23. **Um nome com acento** (`ellipse chaminé 50,50 20`) dá "esperado o centro no formato x,y" e mais um "valor solto". O certo seria dizer que o nome só aceita letras sem acento, números, `_` e `-`.
- I. "não pode ficar dentro de def (só formas e use)" esquece o `repeat`, o `group` e o `include`, que também podem.

## 5. Recomendação

1. **F, G e H** primeiro: a sessão já está pronta.
2. **Consertos pequenos:** E, 1, 3, 4, 5 e 6, numa versão só. E e 1 mudam a imagem só nos casos que hoje saem errados, com as imagens antes e depois.
3. **Avisos que faltam:** as seções 3 e 4 juntas. A imagem não muda. Rodar o `--check` nos jogos antes.
4. **O 2 (Godot sem `root=`)** pede uma decisão sua, porque mexe nos jogos. A recomendação é não mudar o padrão e explicar no capítulo do jogo.
