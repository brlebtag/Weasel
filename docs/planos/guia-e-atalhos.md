# Guia novo e folha de atalhos

**Situação:** aprovada em 17/11/2026 ("pode fazer", com as cinco recomendações da seção 7). Etapa 1 (a folha de atalhos) feita na 1.66.0; a tarefa B na 1.66.1; etapa 2 (a consulta: capítulos 19, 20, 21 e 25) feita na 1.67.0; a tarefa A (seção 2) na 1.67.1; etapa 3 (o básico: capítulos 1 a 4, e o 22 começado) feita na 1.67.2; etapa 4 (organizar: capítulos 5 e 6) feita na 1.67.3; etapa 5 (o movimento: capítulos 7 a 9) feita na 1.67.4; etapa 6 (luz e aparência: capítulos 10 a 12) feita na 1.67.5; etapa 7 (estilos e profundidade: capítulos 13 e 14) feita na 1.67.6; etapa 8 (jogo: capítulos 15 e 16) feita na 1.67.7; etapa 9 (filme: capítulos 17 e 18) feita na 1.67.8; etapa 10 (os problemas comuns, o editor terminado e a revisão dos links) feita na 1.67.9; a tarefa J (a `opacity=` da forma e do `use`) na 1.67.10. Todas as etapas e tarefas estão feitas.

## O pedido

- O guia "não está bom":
  - muitas frases ruins, e algumas não fazem sentido;
  - a didática é fraca, e deveria ser voltada a quem está começando;
  - nem sempre lista todas as opções de um comando;
  - nem sempre diz os valores (faixas) que cada opção aceita;
  - faltam exemplos que mostrem tudo o que a linguagem faz.
- Uma folha só com os atalhos de teclado do editor, fácil de achar.

**Weasel:** muda o guia e o editor ganha a folha. A linguagem não muda.
**Jogo:** nada muda. As saídas do `regress --strict` continuam idênticas.

## 1. O que o diagnóstico achou

Os 14 capítulos (cerca de 14 mil linhas) foram conferidos, um por um, contra o código (`js/lang.js`, `scene.js`, `film.js`, `art.js`, `rig.js`, `godot.js`, `cli/`). As dúvidas foram testadas com a linha de comando.

| | Quantos |
|---|---|
| Frases ruins (cada uma com uma reescrita) | 568 |
| Erros de fato (o guia diz uma coisa, o código faz outra) | 114 |
| Itens que o código aceita e o guia não explica | 39 |
| Opções citadas sem a faixa de valores | 54 |
| Opções sem o valor padrão, ou sem dizer o que fazem | 23 |
| Opções da linha de comando que faltam (de 51) | 28 |

Os relatórios completos, capítulo por capítulo, estão fora do repositório, na pasta de notas desta sessão (`diagnostico-guia/`). Eles trazem a linha exata de cada problema e a reescrita.

### 1.1 Frases ruins: exemplos

| Onde | Como está | Problema | Como fica |
|---|---|---|---|
| 01:7 | "Não há pincel nem mouse" | falso: o editor tem Pincel, Lápis e outras ferramentas | "Você não pinta: escreve. As ferramentas do editor só escrevem as linhas por você." |
| 01:211 | a lua "aparece por cima do texto" | é o contrário: o texto vem depois e fica por cima | (corrigir o exemplo) |
| 02:368 | "vira uma linha nova logo abaixo, com o mesmo resto e o nome numerado" | "o mesmo resto" não quer dizer nada | "vira uma linha nova, com os mesmos atributos e um número no nome (`c3_1`)" |
| 03:214 | a ordem de leitura em três passos, com comparação com JavaScript e C++ | assunto avançado no meio do capítulo de cores; e a ordem está errada | sai do capítulo; vai para a referência, certa |
| 04:142 | "A barrinha de cima tem Explodir, De frente, De lado e Juntar, quanto as camadas (e as formas de uma mesma camada) se afastam e as molduras com os nomes." | a frase está quebrada; o parágrafo inteiro tem 12 ideias | vai para o capítulo do editor, em itens curtos |
| 06:268 | "Cada forma escolhe o osso que deve segui-la" | inverte o sentido: é a forma que segue o osso | "Cada forma diz qual osso ela segue" |
| 08:909 | "Os números são multiplicadores: 1 é 'como está', 0.5 é a metade, 2 é o dobro." | errado para o `tint=`, que vai de 0 a 1 | uma linha da tabela para cada um, com a faixa certa |
| 09:713 | "foram abertos no Godot 4.7.2 e comparados quadro a quadro com o Weasel" | bastidor do projeto, não ajuda quem lê | tirar |
| 10:54 | "Não se assuste com o tamanho" | o primeiro exemplo do filme tem 3 atores, luzes, 2 planos e 12 `at` | começar com um ator e um plano |
| 13:455 | "o valor vem da última `key`, dando a volta pela emenda" | jargão ("emenda") | "o valor vem da última `key`: o loop volta do fim para o começo" |
| 14:358 | "o Weasel desenha a cena com luz e sem luz e arredonda a diferença" | não explica nada a quem lê | "a luz também vira degraus, como as cores" |

Os defeitos que mais se repetem:
- frases longas, com cinco ideias ou mais;
- jargão interno: "declarado", "corta seco", "molde", "passada", "emenda", "cartão chato";
- coisas usadas antes de ser explicadas: `palette ink=` em todo exemplo do capítulo 2, `anim` e `key` em todo o capítulo 6, o `at` em todo o começo do filme;
- bastidores do guia ("a camada `guide` está aí para mostrar…", "gerado com `--guides -s 2`");
- a mesma palavra com sentidos diferentes: "alça" é a alça da curva, o ponto `0,0` do `def`, o osso e o ponto de arrastar do editor; `ink` é cor na `palette` e grossura nas formas, e o guia nunca separa os dois.

### 1.2 Erros de fato: os mais graves

- **Loop (07:41):** "repetir a primeira pose no quadro `frames` é o que faz o loop fechar sem pulo". O código já volta sozinho do fim para o começo (`geom.js:72`).
- **`at` antes do primeiro `shot` (12):** o guia diz que vale para o filme todo. Dá erro.
- **`lag=` da câmera (10):** o guia diz "atraso de meio segundo". É uma suavização.
- **Dentro do `def` (05:689):** o guia diz que "só valem formas e outros `use`". O código aceita também `repeat`, `group`, `mirror=` e `include`.
- **`dash=2,6` com `w=8` (02:584):** o guia diz "quadradinhos". Saem tracinhos em pé.
- **`lead=0,5` (14):** com vírgula, dá erro. O certo é `lead=0.5`.
- **Godot (09):** o nome do nó vem do `-o`, e não do arquivo `.weasel`. Sem `root=`, a origem fica 8 pixels abaixo do desenho (a margem do recorte).
- **As saídas de erro mostradas (01 e 13)** não são as que o Weasel imprime hoje.

### 1.3 Opções e faixas que faltam: exemplos

- `canvas`: o tamanho vai de 1 a 4096. Sem a linha `canvas`, a folha tem 800×600. `bg=none` (fundo transparente) só aparece no capítulo 9.
- `text size=`: de 1 a 2000. E é o tamanho da fonte, não a altura da letra.
- `layer`: a tabela do capítulo 4 mostra 21 das 35 opções. Faltam `brightness`, `saturate`, `contrast`, `hue`, `shade`, `from`, `yaw`, `pitch`, `persp`, `pivot`, `horizon`, `iso`, `floor` e `zsort`.
- Ossos: `jitter=` vai de 0 a 200; `spring=0` não desliga a mola; o `bend=` do `ik` só aceita 1 ou -1.
- Partículas: `rate=`, `burst=`, `life=`, `speed=` e `drag=` sem faixa.
- Filme: `fps` de 1 a 120, `depth` de 0.05 a 1000, `speed` de 0 a 100, `zoom` de 0.01 a 100, `shake` de 0 a 1000, `lag` de 0 a 10, `vol` de 0 a 4, `subsize` de 6 a 400. Nada disso está no guia.
- Estilos de arte: `paper=`, `boil=` e `seed=` valem em 18 a 22 estilos e não têm nenhum exemplo.
- Linha de comando: faltam 28 das 51 opções, quase todas de filme e vídeo (`--frames`, `-t`, `--crf`, `-j`, `--subs`, `--no-audio`, `--lang`, `.webm`…).

Recursos fortes que o guia não cita em lugar nenhum (testados):
- `use bola 50,50 line=9` troca uma cor ou um número da `palette` (ou um `let`) só naquela cópia;
- `repeat col 0..lin`: o laço de dentro usa a variável do de fora;
- `bone f{i}` dentro de um `repeat` cria um osso por cópia;
- `path=` aceita uma elipse ou um retângulo, e num caminho fechado o ator dá voltas;
- o ator `screen` (preso à tela, como um letreiro).

### 1.4 Didática

- **Editor misturado com a linguagem.** No capítulo 2, cerca de 40% do texto é sobre ferramentas de mouse. O capítulo abre com 18 linhas de ferramentas antes da primeira forma. O mesmo acontece nos capítulos 4, 7, 10 e 14.
- **Ordem que obriga a pular para a frente.** O capítulo 6 (ossos) usa animação em todos os exemplos, e a animação só vem no 7. O capítulo 9 abre com um exemplo que usa 8 conceitos novos. O filme usa o `at` desde o primeiro exemplo e só o explica na linha 553.
- **Capítulos grandes demais.** Filme (1606 linhas), luz e efeitos (1340), camadas (1248), Godot (1131), ossos (1109).
- **Referência e aula juntas.** O capítulo 5 tem 420 linhas de "as funções, uma por uma" entre o `repeat` e o `def`. O capítulo 12 tem células de tabela com parágrafos inteiros.
- **Repetição.** O `boil=` é explicado 7 vezes no capítulo 14. "Ctrl+Z desfaz" aparece umas 10 vezes no capítulo 2.
- **Faltam desenhos completos.** Os capítulos ensinam peças soltas e quase nunca juntam tudo num desenho de verdade.

## 2. Problemas no código achados de passagem

Não são do guia. Mas o guia precisa descrever o que o código faz, então alguns pedem uma decisão antes da etapa que os explica.

| # | O quê | Antes de qual etapa |
|---|---|---|
| A | **`opacity=` e `blend=` da camada.** Sem efeito na camada, eles valem forma por forma: duas formas da mesma camada `opacity=0.5` aparecem uma através da outra. Com qualquer efeito (`blur=`, `hue=`…), valem para a camada inteira. Parece um defeito (`scene.js:2601` contra `:2593`). Corrigir muda a imagem de quem usa `opacity=` em camada com formas sobrepostas. **Feito na 1.67.1** (abaixo). | Camadas (etapa 3) |
| B | **Ajudante do Godot.** Ele começa virado para baixo (`godot.js:335`). Num personagem de lado (só `_left` e `_right`), `tocar("idle")` procura `idle_down`, não acha e toca `idle`, que não existe. O script de exemplo do capítulo 9 cai nisso. **Feito na 1.66.1** (abaixo). | Jogo (etapa 8) |
| C | **Valores cortados sem aviso:** a força do `glow=`, o `tint=`, a sombra do `cast=`, o `emit=`, a queda do `trail=`, o `taper=`. E aceitos sem fazer nada: `cut=` em `stroke`/`line`/`text`, `bold` numa elipse, `cloth=` no texto, `~` na `line`, `camera.fog=none` no `at`, `audio at=+1s`. **Feito na 1.67.13:** todos avisam (e continuam cortando). | nenhuma: o guia diz o que o código faz |
| D | **Faixas diferentes no `at` e na linha do comando:** `zoom` vai até 100 na `camera` e até 1000 no `at`; `lag`, até 10 e até 100; numa `key`, a luz aceita `power=30` e `cone=999` sem aviso. **Feito na 1.67.13:** a `key` e o `at` avisam quando passam da faixa da linha (sem cortar). | nenhuma |
| E | **`rect` com tamanho negativo e `r=`** desenha os cantos para dentro (`geom.js:139`). **Feito na 1.67.12.** | nenhuma |
| F | **`line dash=0`** (ou com número negativo) passa no `--check`, mas a exportação para com `Make line dash path effect failed`. Achado na etapa 2. **Feito na 1.67.11:** `dash=0` desliga o tracejado, e um número negativo avisa e deixa a linha cheia. | nenhuma |
| G | **`art pencil` e `art crayon`:** num desenho sem fundo, um `paper=` com um canal `00` (`#ff0000`, `#f6f200`) sai preto: uma divisão 0/0 em `art.js` (`pencilPost` e `crayonPost`). Achado na etapa 2. **Feito na 1.67.11**, junto com o `watercolor`, que tinha a mesma conta. | nenhuma |
| H | **Nomes de saída da linha de comando:** um filme com `-o x.tscn` salva centenas de PNGs com o nome `.tscn`; um `-o` com extensão desconhecida (`.bmp`) salva um PNG sem aviso; `-f build -o x.png` salva um GIF com o nome `.png`. Achado na etapa 2. **Feito na 1.67.11:** o `-o` precisa de uma extensão conhecida, que combine com o `-f`. | nenhuma |
| I | **Mais coisas aceitas sem fazer nada** (achadas na etapa 2): `key emissor.c=`; no `expr`, as propriedades de camada, luz e caixa; `turn=nao` e `turn=off` (só `0` desliga); `let pi=3`; `let a-b=5` (não dá para usar nas contas); `rand(x,a)` ignora o `a`; nas funções, um número a mais é ignorado; a mensagem "não pode ficar dentro de def (só formas e use)" esquece `repeat`, `group` e `include`. **Feito na 1.67.13:** todos avisam, e a mensagem do `def` cita o `repeat`, o `group` e o `include`. | nenhuma |
| J | **`opacity=` da forma e do `use`** (achado na tarefa A): o mesmo "pedaço por pedaço" que a camada tinha. Numa forma com contorno e `opacity=0.5`, a metade de dentro do contorno mostra o preenchimento por baixo (sai `128,64,64` num contorno preto sobre vermelho, em vez do cinza `128,128,128` da metade de fora). Num `use` com `opacity=0.5`, as formas do componente aparecem uma através da outra (`128,64,191` no cruzamento de um vermelho com um azul). Hoje dá para ter o componente inteiro transparente pondo o `use` numa camada com `opacity=`. **Feito na 1.67.10** (abaixo). | Cores e contorno (etapa 3): decidir se o guia descreve ou se corrige antes |

Recomendação: A e B viram tarefas à parte, cada uma com as imagens antes/depois. C, D, E e I podem esperar uma tarefa de "avisos que faltam". F, G e H são defeitos: valem uma tarefa de conserto (G muda a imagem só no caso que hoje sai preto).

A lista completa e atualizada, com o que o diagnóstico achou nos outros capítulos, fica em [Problemas achados no código](problemas-achados.md).

### A: como ficou (1.67.1, 17/11/2026)

**Conferido nas imagens** (antes, depois e diferença, mostradas ao usuário antes do "pode fazer"): duas formas que se cruzam numa camada `opacity=0.5` apareciam uma através da outra; numa camada `blend=multiply`, amarelo e ciano davam verde no cruzamento, e duas sombras que se cruzavam faziam uma mancha mais escura no meio. O SVG exportado já fazia a camada inteira (`svg.js`: `opacity` e `mix-blend-mode` no `<g>` da camada), então o PNG e o SVG do mesmo arquivo saíam diferentes.

**A correção** fica em `js/scene.js` (a função `whole`): uma camada com transparência menor que 1 (no código, numa `key` ou num `at`) ou com `blend=` diferente de `normal` passa pelo mesmo caminho das camadas com efeito (`drawFxLayer`): pintada à parte e aplicada de uma vez. Vale também na virada e na metamorfose (`drawPartGroup`). O passe de textura dos estilos de arte continua como era. O editor e a linha de comando usam o mesmo código.

**O que mudou:**
- `regress --strict`: nenhum jogo. Cinco referências regravadas, só por arredondamento: `caso_3d_chao` (`pose`, `sheet`, `vento_meio`: a camada `curva opacity=0.4`; até 108 pixels, 1 nível de cor) e o `filme.weasel` (`filme/quadros.png` e `_conferencia/filme.png`: o letreiro que aparece e some com `at … titulo.opacity`; até 6 e 10 níveis, nas bordas das letras e no bloom). A `noite.weasel` tem `opacity=0.22` com `blur=14`: já era a camada inteira.
- Guia: `04_opacity.png` (os olhos dos fantasmas ficam mais escuros: não mostram mais o fantasma por baixo deles) e `04_blend.png` (1 a 2 níveis). O texto do capítulo 4 já dizia "a camada inteira". Na ficha `layer` do 19, o **Cuidado** de "Transparência e mistura" foi reescrito, e o de "Efeitos" que remetia a ele saiu.
- Uma forma só, com contorno, numa camada transparente, também muda: a metade de dentro do contorno não mostra mais o preenchimento por baixo.
- Pintar à parte e aplicar com transparência muda até 1 nível de cor mesmo onde nada se cruza (o fantasma de `opacity=0.25`). Não dá para ver.
- A vista 3D das camadas continua forma por forma: lá cada forma é um plano.
- Quem quiser o jeito antigo da `opacity=` põe a transparência em cada forma. O do `blend=`, só com cada forma na sua camada.

**Fica de fora:** a `opacity=` da forma e do `use` (linha J da tabela, feita na 1.67.10).

### J: como ficou (1.67.10, 17/11/2026)

**Conferido nas imagens** (antes, depois e diferença, mostradas ao usuário antes do "pode fazer"): os dois casos da tabela saem `127,127,127` dentro e fora do contorno (antes `128,64,64` dentro) e `127,127,255` no cruzamento do `use` (antes `128,64,191`), na linha de comando e no Chrome. O SVG já fazia assim.

**A correção:**
- `js/lang.js`: um `use … opacity=` menor que 1 vira um grupo; cada forma de dentro guarda o grupo e a `opacity=` da própria linha. A `opacity=` total da forma (a conta de antes) continua lá para o resto do código.
- `js/scene.js`: as formas seguidas da mesma cópia transparente são pintadas juntas numa tela à parte e aplicadas de uma vez (`drawRun`); cópia dentro de cópia é grupo dentro de grupo. Uma forma transparente que pinta mais de uma vez no mesmo lugar (preenchimento e contorno, texto com contorno, buraco com contorno, luz, `emit=`, `pattern`, os passes dos estilos de arte, `draw=` aos poucos, o bloco do `thick=`) também vai para uma tela à parte (`drawWhole`). Uma pintura só (preenchimento sem contorno nem luz, traço, linha) continua direta, igual byte a byte. Vale também na virada e na metamorfose.
- A luz numa tela à parte: o `multiply`/`overlay` da luz vazava nos pixels meio transparentes da borda e fazia um fio claro em volta da forma. O preenchimento com luz agora recebe a luz numa tela só dele, um pouco mais larga, e é recortado depois. Isso tira também o fio fraco que a 1.67.1 deixava nas camadas transparentes com luz.
- `js/svg.js`: a cópia transparente vira um `<g opacity>` só, e o bloco do `thick=` também.
- Achado no caminho: no @napi-rs/canvas, na escala 0.5, `destination-in` com `fill(path)` apaga a tela inteira. O recorte usa `drawImage` de uma máscara, que funciona.

**O que mudou:**
- `regress --strict`: 7 de 1048 referências, regravadas com o OK do usuário. O balão "uh-uuh!" da coruja (`coruja/sheet.png` e `pia_meio.png`: texto com contorno que aparece e some; até 73 níveis sobre branco), as nuvens de poeira do Cavaleiro na `noite` (`sheet_sem_acabamento.png` e `dash_meio.png`: formas com luz e `opacity=`), as bochechas e a sombra do fantasma do `filme.weasel` (`filme/quadros.png` e `_conferencia/filme.png`) e 12 pixels do `caso_metamorfose`. Nenhum SVG muda.
- Guia: `03_opacity.png`, `03_cor_ou_opacity.png`, `03_natureza_morta.png`, `05_use_opacity.png`, `05_reflexo.png`, `06_bones.gif`, `09_abertura.gif`, `10_filme.gif` e `10_morph.gif` (conferido gerando o guia com o código de antes e com o novo: só essas mudam). Textos: a ficha do `use` e a tabela "Opções de todas as formas" no 19 (com um **Cuidado** em cada), o "Repare" do `use` transparente no 6 e um item no 3 ("o contorno e o preenchimento ficam transparentes juntos").
- Partículas (`emitter`): cada uma continua transparente sozinha, e a fumaça fica mais forte onde elas se juntam. No SVG o `emitter` já era um grupo: essa diferença continua.
- O passe de textura dos estilos de arte continua forma por forma, como na tarefa A.
- Quem quiser o jeito antigo do `use` põe a `opacity=` em cada forma dentro do `def`.

### B: como ficou (1.66.1, 17/11/2026)

**Conferido no Godot 4.7.2**, sem janela, com a gosma do capítulo 9 (só `_right` e as `_left` espelhadas):
- `tocar("idle")` e `tocar("attack")` no começo dão "Animation not found", e a animação de antes continua. O golpe só sai depois que o jogador aperta ← ou →.
- Andar reto para cima ou para baixo, ou na diagonal que arredonda para cima ou para baixo, dá o mesmo erro. `quadros("attack")` devolve 0.
- No personagem de 4 direções, tudo funciona, menos uma ação que só existe de lado (`attack_right`) com ele olhando para cima ou para baixo.

**A correção** fica só no `nome_com_direcao` do `weasel_anim.gd`. Ela age quando nem a animação com a direção nem a ação sem direção existem, o caso que dava erro. Aí ela escolhe o lado:
- Andando para a esquerda ou para a direita (também na diagonal), toca a `_left` ou a `_right` desse lado.
- Reto para cima ou para baixo (até 22,5° de inclinação, a fatia do "cima" nas oito direções) ou parado, continua no lado da animação atual (`assigned_animation`).
- A `direcao` continua começando em `Vector2.DOWN`.

**Por que não "começar na primeira direção":** só consertaria o começo, e subir ou descer continuaria com o erro. Num personagem de 4 direções cuja primeira animação é `_right`, mudaria a direção inicial de jogos que funcionam.

**O que mudou:**
- **No Weasel:** só o texto do `weasel_anim.gd`, nas exportações por quadros e com esqueleto. No `regress --strict`, só a referência `test/ref/_godot/weasel_anim.gd` mudou; as outras conferências (imagens, `.tscn`, `.tres`) ficaram iguais byte a byte. O README e o capítulo 9 ganharam uma frase.
- **No jogo:** o que funcionava continua igual. O ForestPatrol chama `nome_com_direcao(acao, Vector2(_facing, 0.0))`, sempre na horizontal, e não muda. Os jogos já exportados só pegam o ajudante novo quando você exportar de novo.
- No teste no Godot, os erros caíram de 24 para 2. Os 2 que sobram são `tocar("walk")` na gosma, que não tem `walk`.

## 3. A nova estrutura

### 3.1 A ideia

Hoje o guia mistura três coisas. Na nova estrutura, cada uma tem o seu lugar:

1. **A aula** (capítulos 1 a 18): ensina em ordem. Cada exemplo só usa o que já foi ensinado.
2. **A consulta** (capítulos 19 a 25): a referência completa, as funções, a linha de comando, o editor, os atalhos, os problemas e o glossário.
3. **O editor** sai da aula. No texto da linguagem fica uma linha só, com o link: "No editor, a ferramenta Elipse (L) escreve esta linha para você ([capítulo 23](…))".

### 3.2 Os capítulos

| Parte | # | Capítulo | Vem de |
|---|---|---|---|
| **1. O básico** (leia em ordem) | 1 | Primeiros passos | 01 (o "como rodar" vai para o começo) |
| | 2 | Formas | 02, só a linguagem |
| | 3 | Cores e contorno | 03 + o contorno do 02 (`ink`, `inkc`, `weight`, `inkon`, `light`) |
| | 4 | Camadas | 04, sem o `finish` |
| **2. Organizar** | 5 | Contas e repetição | 05: `let`, `{contas}`, `repeat`, `rand()` |
| | 6 | Componentes e arquivos | 05: `def`/`use`, `group`, `mirror=`, `include`; e o `variant` do 03 |
| **3. Movimento** | 7 | Primeiro movimento | **novo**: um osso, uma animação, `key`, `ease`, loop e `once` (o mínimo para os próximos) |
| | 8 | Ossos | 06 |
| | 9 | Animação | 07 |
| **4. Luz e aparência** | 10 | Luz e sombra | 08, primeira metade |
| | 11 | Efeitos e partículas | 08, segunda metade |
| | 12 | Acabamento (`finish`) | 04, o fim |
| | 13 | Estilos de arte (`art`) | 14 |
| | 14 | Profundidade (2.5D) | 11, e o paralaxe do 10 |
| **5. Jogo e filme** | 15 | Jogo: o personagem no Godot | 09: caixas, pontos, exportar, direções, `feet=` |
| | 16 | Jogo: fases e recursos avançados | 09 e 11: `tileset`, transições, virada, `rig=bones`, `unity` |
| | 17 | Filme: atores, planos e câmera | 10, primeira metade |
| | 18 | Filme: atuação, som e legendas | 10: expressões, bocas, `audio`, `sub`, `mark`, `path=`, `blend=`, `morph=`, `speed=auto` |
| **6. Consulta** | 19 | Referência completa | 12, refeito |
| | 20 | Funções das contas | 05, "as funções, uma por uma" |
| | 21 | Linha de comando | **novo** (as 51 opções) |
| | 22 | O editor | as dicas do editor de todos os capítulos |
| | 23 | Atalhos do teclado | **novo** (a mesma lista da folha do editor) |
| | 24 | Problemas comuns | 13, organizado pela mensagem de erro |
| | 25 | Glossário | **novo** |

- Os arquivos ganham os números novos (`02-formas.md` continua; `12-referencia.md` vira `20-referencia.md`…). Os links de fora do guia são poucos: o README e alguns planos. As imagens antigas mantêm o nome.
- Os capítulos ficam menores. O maior deve ter umas 700 linhas.

### 3.3 Como cada comando aparece (a "ficha")

Nos capítulos da aula, cada comando segue sempre a mesma ordem:

1. **O título** com o comando: "Círculo e elipse: `ellipse`".
2. **As formas de escrever**, num bloco curto.
3. **Um exemplo mínimo**, com a imagem e "linha por linha".
4. **Variações**, um exemplo para cada ideia.
5. **A tabela de opções** do que o capítulo ensina: `Opção | O que faz | Valores | Se não escrever`. Embaixo, um link para a ficha completa na referência.
6. **Experimente:** uma mudança para fazer e o que esperar.
7. **Cuidado:** as armadilhas, quando houver.

No fim de cada capítulo:
- **Juntando tudo:** um desenho completo que usa o capítulo inteiro (por exemplo, um rosto, a doninha, uma placa de loja, um campo de flores ao vento, uma lanterna presa ao braço, uma perseguição no filme);
- **Resumo:** de 3 a 6 linhas.

Na referência (capítulo 19), cada comando tem a ficha completa: a sintaxe e a tabela de todas as opções e palavras soltas, com as colunas `Opção | O que faz | Valores | Padrão | Anima?` e o link para o capítulo que ensina.

**Para nunca mais faltar opção:** o `npm test` passa a conferir a referência. Ele lê as listas do código (`KEYWORDS`, `ATTRS`, `FLAGS`, as propriedades do `at` e da `key`, as opções de cada estilo de arte e as opções da linha de comando) e falha se alguma não estiver na tabela do seu comando. Uma opção nova no Weasel obriga a uma linha nova no guia.

### 3.4 Regras de escrita

- Frases curtas, uma ideia por frase. Fala com "você".
- Um termo, um sentido. O glossário fixa os nomes: "alça" é só a alça da curva; no editor, "ponto de arrastar"; no `def`, "origem".
- `ink` é explicado com cuidado: na `palette` é a cor da tinta; nas formas, `ink=` é a grossura do contorno e `inkc=` a cor.
- Nunca usa o que ainda não foi explicado. Se precisar, diz "(capítulo N)" e explica numa frase.
- Os exemplos só usam o que já foi ensinado. Nada de `palette ink=` nem camada `guide` nos primeiros capítulos.
- Toda faixa é dita: "de 0 a 1". Todo padrão é dito: "se não escrever, 1".
- Nada de bastidores do guia ("esta imagem foi gerada com…").
- Todo exemplo principal tem um "Experimente".

## 4. Amostra: o `ellipse`, antes e depois

### Antes (02-formas.md, linhas 40 a 70)

> ## Elipse e círculo
> ```
> ellipse nome cx,cy raio
> ellipse nome cx,cy raioX,raioY rot=graus
> ```
> (exemplo com três elipses)
> - `cx,cy` é o **centro**.
> - Um raio só (`54`) dá um círculo. Dois raios (`64,38`) dão uma elipse: o primeiro é o raio na horizontal, o segundo na vertical. Os raios são em pixels.
> - `rot=30` gira 30° em volta do centro, no sentido horário.
>
> **Experimente:** troque `rot=30` por `rot=90`: a elipse verde fica em pé. Num círculo, `rot=` não muda nada.
>
> > **Dica do editor:** ponha o cursor na linha de uma elipse. Além da bolinha do centro (arraste para mudar o `cx,cy`), aparecem **quadradinhos** na borda, ligados ao centro por uma linha tracejada. … (mais 10 linhas sobre as alças, o Shift, a alça de giro verde, o duplo clique…)

O que falta: a cor (`c=`), que todos os exemplos usam e não é explicada; o contorno (`ink=`), usado sem explicação; o que acontece sem `c=`; que o nome é opcional; a lista das opções. E sobra o editor.

### Depois

> ## Círculo e elipse: `ellipse`
>
> ```
> ellipse nome cx,cy raio
> ellipse nome cx,cy raioX,raioY
> ```
>
> Para um círculo, diga onde fica o centro e qual é o raio.
>
> ```weasel
> canvas 300 200 bg=#f4efe6
> ellipse bola 150,100 60 c=#ff6b4a
> ```
>
> (imagem: um círculo laranja no meio)
>
> - `bola` é o nome. Ele é opcional, mas sem nome não dá para animar nem recortar a forma depois.
> - `150,100` é o centro: 150 para a direita e 100 para baixo.
> - `60` é o raio, a distância do centro até a borda. O círculo fica com 120 de largura.
> - `c=#ff6b4a` é a cor de dentro. As cores são o assunto do capítulo 3.
>
> Com dois raios, o círculo vira uma elipse. O primeiro raio é o da largura; o segundo, o da altura.
>
> ```weasel
> canvas 440 200 bg=#f4efe6
> ellipse circulo 80,100 54 c=#ff6b4a ink=4
> ellipse deitada 220,100 64,38 c=#4a90d9 ink=4
> ellipse girada 360,100 64,30 c=#6cbb3c ink=4 rot=30
> ```
>
> (imagem: um círculo, uma elipse deitada e uma girada)
>
> - `64,38`: 64 para cada lado na largura e 38 na altura. A elipse fica deitada.
> - `rot=30` gira a elipse 30 graus em volta do centro, no sentido do relógio.
> - `ink=4` desenha um contorno de 4 pixels de grossura.
>
> **Experimente:** troque `rot=30` por `rot=90`. A elipse verde fica em pé.
>
> ### Opções do `ellipse`
>
> | Opção | O que faz | Valores | Se não escrever |
> |---|---|---|---|
> | `c=` | a cor de dentro | uma cor ([capítulo 3](03-cores.md)) ou `none` (vazia) | quase preto; vazia, se houver `ink=` |
> | `ink=` | a grossura do contorno, em pixels | 0 ou mais | 0 (sem contorno) |
> | `inkc=` | a cor do contorno | uma cor | quase preto |
> | `rot=` | gira em volta do centro, em graus | qualquer número; positivo gira no sentido do relógio | 0 |
> | `opacity=` | a transparência | de 0 (invisível) a 1 (inteira) | 1 |
> | `hidden` | não pinta a forma, mas ela continua existindo | — | a forma aparece |
>
> As outras opções aparecem nos próximos capítulos: `weight=` e `inkon=` (contorno), `cut=` (recorte), `bone=` (osso)… A lista completa, com todas as faixas, está na [referência do `ellipse`](20-referencia.md#ellipse).
>
> > **Cuidado:** com `ink=` e sem `c=`, a forma fica **vazia**: só o contorno aparece. Para ter as duas coisas, escreva as duas.
> >
> > ```weasel
> > canvas 300 160 bg=#f4efe6
> > ellipse so_contorno 80,80 50 ink=6 inkc=#2f6fb5
> > ellipse as_duas 220,80 50 c=#ffb000 ink=6 inkc=#2f6fb5
> > ```
>
> No editor, a ferramenta **Elipse** (L) escreve esta linha para você, e a elipse ganha pontos de arrastar para o tamanho e o giro ([capítulo 23](23-editor.md#elipse)).

Os três exemplos da amostra já foram rodados: sem erros e sem avisos.

## 5. A folha de atalhos

### 5.1 O que existe hoje

- O editor tem uns 85 atalhos de teclado, mais uns 40 gestos de mouse com tecla (Shift+arrastar, Alt+arrastar, Ctrl+clique…).
- Eles estão espalhados: alguns nos menus, alguns na referência F1, alguns no README e muitos em lugar nenhum (Ctrl+Y e Ctrl+Shift+D no desenho, `<` e `>` para trocar de quadro, Tab no código, os números 1 a 9 no menu do Prender…).
- A F1 é um painel fixo à direita (`<aside id="help">` no `index.html`), não um diálogo.

### 5.2 Onde a folha fica

- **Menu Ajuda › Atalhos do teclado**, logo abaixo de "Referência da linguagem".
- **Teclas para abrir:** **Shift+F1** (o par da F1) e **Ctrl+?** (Ctrl+Shift+/). As duas valem em qualquer lugar, até com o cursor no código. Hoje o Shift+F1 abre a F1 por acaso: isso muda.
- **Como aparece:** um painel à direita, igual ao da F1 (mesmo lugar, mesmo estilo). Não tampa o desenho e não trava as teclas: dá para ler e testar ao mesmo tempo. Abrir um fecha o outro. Esc fecha.

### 5.3 O que tem dentro

- **Uma busca no topo:** digite "zoom", "duplicar" ou "Ctrl+D", e só as linhas que batem ficam.
- **Grupos**, nesta ordem:
  1. Geral e arquivo
  2. Editar e escolher
  3. Exibir
  4. Ferramentas (uma grade com a letra e o nome)
  5. Desenho: mouse com teclas
  6. Código
  7. Animação: player e linha do tempo
  8. Filme
  9. Camadas em 3D e Palco em 3D
  10. Menus e painéis
- **Cada linha** tem a tecla, o que faz e, quando a tecla só vale num lugar, onde ("no código", "com a Caneta", "na linha do tempo").
- **No Mac**, a folha mostra ⌘ no lugar de Ctrl.

### 5.4 Uma lista só, para não ficar velha

- Os atalhos ficam num arquivo de dados (`js/keys.js`, sem nada de tela).
- O painel do editor lê esse arquivo.
- O `npm run docs` escreve a página do guia (capítulo 23) a partir do mesmo arquivo, e o `npm test` falha se a página estiver velha.
- O `npm test` também confere que toda tecla que aparece nos menus e toda letra de ferramenta estão na lista.

### 5.5 Teclas com problema

O levantamento achou teclas que não funcionam como o menu diz. A folha precisa dizer a verdade, então há duas saídas: corrigir as pequenas junto, ou a folha avisar onde a tecla vale.

| Tecla | O problema |
|---|---|
| Shift+F1 | abre a F1 por acaso (o código não olha o Shift) |
| Ctrl+O | com o cursor no código, abre a janela de abrir arquivo do navegador |
| Ctrl+= / Ctrl+- / Ctrl+0 / Ctrl+1 | com o cursor no código, dão zoom na página inteira; Ctrl+1 troca a aba do navegador |
| Cmd (Mac) na linha do tempo da animação | só o Ctrl funciona no clique e na roda |
| Vista 3D | Agrupar, Travar, Organizar, Copiar, Colar e Tudo ficam ativos no menu, mas as teclas não fazem nada |
| README | ainda diz que Ctrl+D duplica no desenho (hoje ele repete a última transformação; para levar uma cópia, Alt+arrastar) |

Recomendação: corrigir junto as quatro primeiras e o README, porque são pequenas e a folha fica mais simples ("vale em qualquer lugar"). A vista 3D fica para depois.

## 6. As etapas

Cada etapa sai numa versão, com `npm test` e `regress --strict` passando, as imagens novas, o commit e o push.

| Etapa | Versão | O quê |
|---|---|---|
| 1 | 1.66.0 | **Folha de atalhos:** `js/keys.js`, o painel, Ajuda › Atalhos (Shift+F1 e Ctrl+?), o capítulo 23 gerado e as conferências no `npm test` |
| 2 | 1.67.0 | **A consulta:** referência completa (19) com a conferência no `npm test`, funções das contas (20), linha de comando (21), glossário (25) e o índice novo do guia |
| 3 | 1.67.2 | Primeiros passos, Formas, Cores e contorno, Camadas (1 a 4); o capítulo do editor (22) começa a receber as dicas |
| 4 | 1.67.3 | Contas e repetição, Componentes e arquivos (5 e 6) |
| 5 | 1.67.4 | Primeiro movimento, Ossos, Animação (7 a 9) |
| 6 | 1.67.5 | Luz e sombra, Efeitos e partículas, Acabamento (10 a 12) |
| 7 | 1.67.6 | Estilos de arte, Profundidade (13 e 14) |
| 8 | 1.67.7 | Jogo (15 e 16) |
| 9 | 1.67.8 | Filme (17 e 18) |
| 10 | 1.67.9 | Problemas comuns (24), o editor (22) terminado, revisão dos links e do README |

A tarefa A saiu na 1.67.1, e as etapas 3 a 10 andaram uma versão. A tarefa J saiu na 1.67.10, depois da etapa 10.

Durante as etapas 3 a 9, o índice mostra os capítulos novos e, no lugar dos que faltam, os antigos.

## 7. O que foi decidido (17/11/2026)

1. **A estrutura** (seção 3): sim, 25 capítulos em 6 partes, com os arquivos renomeados.
2. **A folha de atalhos** (seção 5): sim, como está.
3. **As teclas com problema** (5.5): as quatro pequenas e o README foram corrigidos junto com a folha. Os itens da vista 3D ficam para depois.
4. **A `opacity=` da camada** (2.A): corrigir numa tarefa à parte, antes da etapa 3.
5. **O ajudante do Godot** (2.B): corrigir numa tarefa à parte, antes da etapa 8.

## 8. Notas das etapas

### Etapa 1 (1.66.0): a folha de atalhos

- **A lista** está em `js/keys.js`: grupos com título, nota opcional e linhas `{ k, d, w, mac, tool }` (tecla ou teclas, o que faz, onde vale, a forma do Mac quando não é só trocar Ctrl por ⌘ e Alt por ⌥, e a ferramenta).
- **Os grupos ficaram 12, não 10:** "Editar e escolher" virou "Editar" e "Objeto e escolha" (os menus Editar e Objeto do editor), e as caixinhas de cor ganharam um grupo próprio.
- **As ferramentas** ficaram numa tabela como os outros grupos, não numa grade: assim a busca e a página do guia tratam todas as linhas do mesmo jeito.
- **O painel** (`js/ui-keys.js`) fica no lugar da F1, com a busca em cima. A busca não liga para maiúsculas nem acentos ("selecao" acha "Seleção"). Esc com a folha aberta só fecha a folha: a forma escolhida continua escolhida.
- **Ctrl+?** também vale na tecla /? do teclado brasileiro (ao lado do Shift direito).
- **As conferências** ficam no `docs/guia/gerar.js` e rodam no `npm test`: a página 23 precisa estar igual à que sairia da lista; toda letra de ferramenta (`TOOLS` no `ui-shell.js`), toda tecla dos menus (`ui-shell.js` e `ui-symbols.js`) e toda tecla das dicas das linhas do tempo (`ui-anim.js` e `ui-film.js`) precisam estar na lista.
- **As teclas corrigidas:** Shift+F1 não abre mais a F1; Ctrl+O e o zoom (Ctrl+0, Ctrl+1, Ctrl+=, Ctrl+-) valem também com o cursor no código; Cmd vale no lugar do Ctrl na linha do tempo da animação; o README não diz mais que Ctrl+D duplica no desenho.

### Etapa 2 (1.67.0): a consulta

- **Capítulo 19, Referência completa** (no lugar do 12): 48 fichas, uma por comando, com a tabela `Opção | O que faz | Valores | Padrão | Anima?`, um exemplo que roda e o link **Para aprender**. Antes das fichas, "Como ler", "A escrita" (nomes, pontos, cores, tempos, curvas, misturas…) e "A ordem das linhas". O `art` tem um título por estilo; a `key` e o `at` têm uma tabela por alvo (forma, camada, luz, osso, caixa; ator, câmera, luz, camada, forma), com as colunas "sem `key`/antes do primeiro `at`" e "aos poucos/de uma vez".
- **Ficou maior que as 700 linhas** da seção 3.2 (cerca de 3.400; só o `art` tem 670). É consulta, não aula: uma página só deixa a busca do navegador achar tudo, e as âncoras ficam simples (`20-referencia.md#ellipse`).
- **Capítulo 20, Funções das contas** (com 3 imagens novas, `20_*.png`), **21, Linha de comando** (as 62 grafias de opção, todos os comandos rodados, inclusive os de vídeo) e **25, Glossário**.
- **O índice novo** (`docs/guia/README.md`) mostra as seis partes e os 25 números. Os capítulos que ainda não foram reescritos levam ao antigo, marcados "(antigo)".
- **A conferência** (`docs/guia/conferir.js`, no `npm test` pelo `gerar.js`): a referência precisa ter uma ficha para cada comando de `KEYWORDS`, com toda opção de `ATTRS` e toda palavra de `FLAGS`; cada estilo do `art` com as opções de `ART_OPTS`; cada alvo da `key` e do `at` com as suas propriedades. O 20 precisa ter toda função de `FN` e o `pi`; o 21, toda opção do `parseArgs`. E todo link entre os capítulos precisa levar a um arquivo e a um título que existem (um link do capítulo 1 estava quebrado e foi corrigido).
- **O capítulo 12 antigo saiu**, com as 11 imagens `12_*`. Os links para ele levam agora ao 19 e ao 21.
- **Para as próximas etapas:** cada capítulo reescrito precisa atualizar os links **Para aprender** do 19 que apontam para o capítulo antigo, e o link do começo do 20 (hoje para o 5 antigo). Quando a tarefa A mudar a `opacity=`/`blend=` da camada, o **Cuidado** da ficha `layer` no 19 muda junto (feito na 1.67.1).

### Etapa 3 (1.67.2): o básico

- **Os capítulos 1 a 4 foram reescritos do zero**, no formato da seção 3.3 (ficha de cada comando, Experimente, Cuidado, Juntando tudo e Resumo). Tamanhos: 1 com 508 linhas, 2 com 668, 3 com 914 e 4 com 726. O 3 passou das 700 porque juntou o contorno do 2 antigo (`ink`, `inkc`, `weight`, contorno só por fora).
- **Os desenhos de vitrine** (Juntando tudo): a Vila Sol (1), a placa do café (2), a natureza-morta com a maçã (3) e a poção na janela (4).
- **O que saiu dos capítulos e para onde foi:**
  - o `finish` foi para um capítulo 12 provisório (`12-acabamento.md`), com o texto antigo, até a etapa 6;
  - a `variant` (do 3) e o `group` (do 4) foram para o fim do capítulo 6 (`05-componentes.md`), ainda no texto antigo;
  - o `above=`/`below=` foi para o capítulo 9 (`07-animacao.md`), que já tinha o `only=`;
  - as dicas do editor viraram o **capítulo 22** (`23-editor.md`), com as dicas dos capítulos 1 a 4 e os três exemplos com imagem do 2 antigo (Simplificar, Pathfinder e Borracha, Tesoura e Faca);
  - os dois casos de borda do `inkon=` (a camada recortada que encosta na borda toda e a forma maior que cobre o contorno inteiro) viraram uma linha de **Cuidado** no `clip=`.
- **Escolhas minhas:**
  - "molde" saiu do texto: no lugar, "a forma que recorta";
  - a ordem de pintura do 4 não usa mais `def`/`use` (é do capítulo 6);
  - o capítulo 1 dizia que as camadas mudam a ordem de pintura, o que não é verdade: agora aponta para a ordem completa no 4.
- **Linha J** (a `opacity=` da forma e do `use`): a sessão que corrige ainda não terminou. O texto do 3 ("Cor transparente ou forma transparente") ficou neutro, verdadeiro antes e depois da correção, com uma marca `<!-- conferir -->`. Quando a J sair, ela gera de novo o `03_opacity.png` e o `03_cor_ou_opacity.png`, devolve a frase "o contorno e o preenchimento ficam transparentes juntos, como uma peça só" e tira a marca.
- **As imagens:** 46 novas ou refeitas nos capítulos 1 a 4. Saíram 28 que nenhum exemplo gera mais (`01_sol_lua`, nove `02_*` do contorno e da transparência, treze `03_*` da variante e do gradiente antigos e cinco `04_*`).
- **Os links:** os **Para aprender** do 19, os capítulos 7, 8, 13, 14 e 21, o índice e dois planos levam aos títulos novos. A conferência do `npm test` não acha nenhum link quebrado.
- **Problemas do código achados de passagem:** juntados em [Problemas achados no código](problemas-achados.md), com os das outras sessões e do diagnóstico.

### Etapa 4 (1.67.3): organizar

- **O capítulo 5 antigo (`05-componentes.md`) virou dois**, no formato da seção 3.3: o 5, Contas e repetição (`05-contas.md`, 495 linhas), e o 6, Componentes e arquivos (`06-componentes.md`, 666 linhas).
- **"As funções, uma por uma"** (420 linhas do 5 antigo) saiu: o capítulo 20 já tem todas, com exemplos. O 5 novo ensina o `cos` e o `sin` com um relógio, as comparações e o `? :` com uma régua, e mostra uma tabela das funções mais usadas, com o link para o 20.
- **Os desenhos de vitrine:** o jardim num dia de sol (5) e a cidade à noite na beira de um lago (6): um componente de prédio dentro de um componente de cidade, refletido com `flip=y`.
- **Escolhas minhas:**
  - o 5 começa onde o 1 parou: o boneco de neve do capítulo 1 ganha `let`;
  - nenhum exemplo usa o que ainda não foi ensinado: o `repeat` começa sem `rand` (a cerca), e o `%` entra na tabela das contas, antes do xadrez;
  - o `0,0` do componente se chama **origem**, como no glossário, e não mais "alça";
  - o exemplo do `include` com o Cavaleiro saiu (o `canvas` depois do `include` confundia); ficou o arquivo de peças, e o `noite.weasel` é citado;
  - o 6 junta `def`/`use`, `mirror=`, `include`, `group` e `variant` (estes dois estavam no fim do 5 antigo desde a etapa 3).
- **Erros de fato corrigidos** (do diagnóstico): o `def` aceita também `repeat`, `group`, `mirror=` e `include` (o texto dizia "só formas e use"); com o mesmo `rand` em `x`, `y` e no tamanho, as estrelas ficam numa diagonal, as maiores à direita (não "cada uma maior que a anterior"); o nome de uma variável também pode começar com `_`; o `mirror=` sem `@` usa a linha em pé no meio do canvas.
- **As dicas do editor** foram para o 22, em cinco títulos novos: Números no código, Prévia do componente, Painel Símbolos, Vários arquivos e Variantes.
- **Linha J:** o "Repare" da transparência do `use` (no 6) ficou neutro, verdadeiro antes e depois da correção, com a marca `<!-- conferir -->`, como o do 3. Quando a J sair, ela devolve ali a frase do componente transparente como uma imagem só, gera de novo o `05_use_opacity.png` e o `05_reflexo.png` (agora no 6) e tira a marca. O `05_grade.png` saiu com as funções.
- **As imagens:** 11 novas (`05_boneco`, `05_cerca`, `05_bolhas`, `05_piramide`, `05_capim`, `05_regua`, `05_relogio`, `05_jardim`, `06_arvores`, `06_parametros` e `06_cidade`). As outras 18 dos dois capítulos saem iguais, byte a byte. Saíram 16 que nenhum exemplo gera mais: as 13 das funções, o `05_componentes`, o `05_include` e o `05_repeat`.
- **Os links:** os **Para aprender** do 19, os capítulos 1 a 4, 20 e 21, os antigos de ossos, luz e problemas, o índice e o plano das expressões levam aos arquivos novos. A navegação do capítulo de ossos volta para o 6, até o 7 existir.

### Etapa 5 (1.67.4): o movimento

- **Os capítulos de ossos e de animação antigos (`06-ossos.md` e `07-animacao.md`) viraram três**, no formato da seção 3.3: o 7, Primeiro movimento (`07-movimento.md`, 492 linhas), o 8, Ossos (`08-ossos.md`, 829 linhas), e o 9, Animação (`09-animacao.md`, 624 linhas).
- **O 8 passou das 700 linhas.** Ele junta o capítulo de ossos antigo inteiro (1.109 linhas), menos a primeira animação (foi para o 7) e o `path=` (foi para o 9). Cada coisa que mexe sozinha (o `sway`, a mola, o pano, o vento, o peso do `@osso`, o IK com alvo) precisa de um exemplo que mexe, e dividir em dois deixaria o IK sozinho num capítulo pequeno.
- **Os desenhos de vitrine:** o sapo que pula entre duas folhas no lago (7), o bicho de cachecol que prepara o pulo, salta e cai, com as pernas em IK e as antenas e o rabo em mola (8), e a abertura de um vídeo explicativo, com o título digitado, a lâmpada que acende, a seta que se desenha, o morph e os eventos (9).
- **O que saiu dos capítulos e para onde foi:**
  - o `path=` (no capítulo de ossos antigo) foi para o 9, junto das outras animações que não são de osso;
  - "Camadas inteiras" e "Luzes" (no capítulo de animação antigo) saíram: o capítulo de luz e efeitos (o 8 antigo) já ensina a `key` nas luzes e nos efeitos de camada, e o 9 aponta para lá. A etapa 6 reescreve esse capítulo; o texto antigo está no b3c66e6 (`docs/guia/07-animacao.md`), se ela quiser aproveitar;
  - cinco exemplos com imagem viraram texto ou entraram em outro exemplo: "Com e sem `parent=`" virou o **Experimente** de "Pai e filho"; o chapéu de "Outras coisas que seguem um osso" entrou no esqueleto (`08_esqueleto`); o tremor (`jitter`), o pé num ponto (`foot=x,y`) e "Até onde o braço alcança" ficaram só com texto;
  - as dicas do editor foram para o 22, em quatro títulos novos: Player (com Exportar uma animação), Ossos no desenho (com um boneco para treinar), Prender e Linha do tempo. O aviso do começo do 22 diz agora "capítulos 1 a 9".
- **Escolhas minhas:**
  - o 7 começa com um osso só (a bola que sobe e desce) e não usa `parent=`: o esqueleto é o começo do 8;
  - a ponta que gira o osso no editor se chama **haste**, porque "alça" já é a da curva (capítulo 2);
  - nenhum exemplo usa o que ainda não foi ensinado: o `ease` vem antes da bola quicando, e o `only=`, o `above=` e o `mix=` ficam no 9, depois do personagem completo.
- **Erros de fato corrigidos** (do diagnóstico):
  - a `key` no quadro `frames=` igual à `key 0` não é obrigatória: o loop volta para a primeira `key` sozinho;
  - no exemplo do pai e filho, o texto antigo falava em 60° na tela; o antebraço fica em −80° (−25 − 55);
  - um `target=` com um nome errado é um erro, não um aviso do editor;
  - com `foot=`, o pé guarda o ângulo que teria sem o `ik`;
  - o `ik` muda também a pose parada, não só as animações;
  - os comprimentos dos ossos do IK mudam com o `sx,sy`;
  - o `foot=` aceita também `stroke` e `shape`, não só `line`;
  - `spring=0` não desliga a mola; o `jitter` vai de 0 a 200; a corrente do `ik` é obrigatória; um osso só pode estar num `ik`;
  - o morph não precisa do mesmo número de pontos, e o texto conta como ele junta os pontos de uma forma com os da outra;
  - uma animação combinada (`mix=`) aceita `key` próprias.
- **As imagens:** 5 novas (`07_primeira`, `07_sapo`, `08_esqueleto`, `08_bicho` e `09_abertura`). As outras 37 dos três capítulos são as mesmas de antes: os exemplos ficaram iguais, letra por letra, e os arquivos não foram gerados de novo (um GIF gerado de novo sai com outros bytes). Saíram 7 que nenhum exemplo gera mais: `06_alcance`, `06_chapeu`, `06_degrau`, `06_jitter`, `06_sem_pai`, `07_camadas` e `07_luzes`.
- **Os links:** os **Para aprender** do 19, os capítulos 2, 3, 4, 6, 12, 13 e 21, os antigos de luz, jogo e filme, o índice e o plano da metamorfose levam aos arquivos novos. A navegação do capítulo de luz antigo volta para o 9.

### Etapa 6 (1.67.5): luz e aparência

- **O capítulo de luz e efeitos antigo (`08-luz-efeitos.md`, 1.340 linhas) virou dois**, no formato da seção 3.3: o 10, Luz e sombra (`10-luz.md`, 942 linhas), e o 11, Efeitos e partículas (`11-efeitos.md`, 691 linhas). O 12, Acabamento (`12-acabamento.md`, 476 linhas), foi reescrito no mesmo formato.
- **O 10 passou das 700 linhas.** Ele tem quatro tipos de luz (`ambient`, `point`, `spot` e `dir`), a luz que muda com o tempo, o que recebe luz e a sombra no chão, cada um com o seu exemplo, e as lâmpadas aparecem lado a lado (três por imagem) para comparar. Para encurtar, os exemplos da força e do alcance passaram a incluir uma sala pronta (`include "sala.weasel"`, com `<!-- arquivo: -->`), e as imagens saíram iguais, byte a byte. Dividir em dois deixaria a sombra sozinha num capítulo pequeno.
- **Os desenhos de vitrine:** o porão com a lanterna que procura, a vela que tremula e o luar na janela (10), o caldeirão da bruxa, com o vapor, as bolhas, o brilho e a placa com sombra (11), e uma fase de videogame antigo numa televisão de tubo (12: `pixel=4`, `posterize=palette` e `crt=0.6`).
- **O que saiu dos capítulos e para onde foi:**
  - os "Acabamentos de cinema" do 8 antigo saíram: o 12 já ensina o `bloom=`, o `vignette=` e o `grain=` com exemplo, e a fogueira do 11 usa os três; saíram junto a rua de cinema (`08_rua_cinema`) e a rua com a luz menor (`08_luz_menor`);
  - "Camadas inteiras" do capítulo de animação antigo (b3c66e6) voltou, igual, como "Animar os efeitos com `key`" do 11, com a mesma imagem (`07_camadas.gif`, devolvida);
  - as dicas do editor foram para o 22, em três títulos novos: Luzes no desenho, Efeitos da camada e Acabamento e estilo (o painel inteiro continua no capítulo dos estilos, até a etapa 7). O aviso do começo do 22 diz agora "capítulos 1 a 12".
- **Escolhas minhas:**
  - o 10 começa com a rua que já existia (a luz de verdade, com e sem luz) e só depois apresenta cada tipo de luz, um por título;
  - no 12, o "game" e o "flat" ficam juntos com o `pixel=` e o `posterize=` numa tabela de quatro imagens, como antes; o `pixel=` do `finish` aponta para o `art pixel` quando a pessoa quer pixel art nítida;
  - na vitrine do 12, a moeda sobe e desce (`bob=`) em vez de girar: girando, ela fica fina, e o `pixel=` faz a média das cores, que o `posterize=palette` troca por uma cor errada.
- **Erros de fato corrigidos** (do diagnóstico e da conferência com o código):
  - o `tint=` vai de 0 a 1, não é um multiplicador como o `brightness=`;
  - as partículas ganharam as faixas e os padrões de todas as opções;
  - o `ambient` não muda com a `key`, e dois `ambient` valem pelo de baixo; com uma `light` e sem `ambient`, vale branco com 0.6;
  - na `dir`, `radius=`, `glow=`, `aim=`, `cone=` e `bone=` não fazem nada; o `flicker=` e o `rim=` valem;
  - a luz não tem `show`; na `key`, os números das luzes e dos efeitos não são cortados;
  - o `rim=` usa a direção da luz mais forte no centro da forma;
  - no `finish`: só a primeira palavra vale (`finish game flat` fica `game`); várias linhas `finish` se somam; o `flat` também tira o contorno dos textos e deixa os traços, e uma forma só com `ink=` some; o `pixel=` vai de 1 a 32 e é medido na imagem exportada; o `posterize=palette` só usa as cores `#hex`;
  - os efeitos de tela saem no PNG, no JPG, no GIF, no WebP, no vídeo e no filme, e não na folha de sprites, no Godot, no SVG nem no `--contact`/`--trajectory`; o SVG também deixa de fora o `pixel=` e o `posterize=`;
  - o `inner=` do `finish` deixa os traços mais **transparentes** (não "mais claros") e não vale para os braços e as pernas com IK.
- **As imagens:** 4 novas (`10_sala`, `10_porao`, `11_caldeirao` e `12_fita`), e o `07_camadas` voltou. As outras dos três capítulos são as mesmas de antes: os exemplos ficaram iguais, letra por letra (os de força e de alcance mudaram por dentro, com o `include`, e saíram iguais, byte a byte). Saíram 2 que nenhum exemplo gera mais: `08_luz_menor` e `08_rua_cinema`. Os GIFs das vitrines do 10 e do 11 saem com `-s 0.75`, para ficarem abaixo de 600 KB.
- **Os links:** os **Para aprender** do 19, os capítulos 2, 3, 4, 8 e 9, os antigos de jogo, profundidade e estilos e o índice levam aos arquivos novos. A navegação do capítulo de jogo antigo volta para o de profundidade (o 14), que vem antes dele na ordem nova. O índice também corrige o 22 ("capítulos 1 a 12"; dizia "1 a 4").

### Etapa 7 (1.67.6): estilos e profundidade

- **Os dois capítulos novos, no formato da seção 3.3:** o 13, Estilos de arte (`13-estilos.md`), sai do antigo `14-estilos.md` (1.323 linhas), e o 14, Profundidade (2.5D) (`14-profundidade.md`), sai do antigo `11-profundidade.md` (657 linhas) e da paralaxe do capítulo de filme, como a seção 5 pedia.
- **Os dois passaram das 700 linhas, mas não à vista.** O 13 tem 1.117 linhas, das quais 405 ficam fechadas em `<details>` (o código das comparações: a gosma, as três paletas, o Cavaleiro e a vila em cada estilo); à vista, umas 712. São 26 estilos, cada um com imagem, e dividir em dois separaria estilos que se comparam. O 14 tem 833 linhas, 148 fechadas (as três estradas, os dois planos do zoom e da lente, os quatro da névoa e o efeito de vertigem); à vista, 685.
- **As vitrines:** no 13, um gato no telhado, à noite, em `art cutout boil=3` (o papel recortado treme como animação de recorte); no 14, uma vila num mapa isométrico, com casas, torre, poço, caixas empilhadas (`use … z=`), árvores de pé (`billboard`) e uma caixa vermelha que pula.
- **A parte do filme fica no fim, com aviso:** no 13 ("No filme") e no 14 ("Profundidade no filme": paralaxe, zoom e lente, névoa, vertigem e o giro com `at`), cada uma começa com "usa o filme (capítulo 17): pule e volte depois". O `front` e o Palco em 3D continuam no capítulo de filme, que agora só resume a paralaxe e leva ao 14.
- **`include` no 13:** a vila e a vila de dia viraram arquivos do capítulo (`<!-- arquivo: vila.weasel -->` e `dia.weasel`), e os outros exemplos fazem `include` e trocam só a linha `art`. As imagens saíram iguais, byte a byte, até nos estilos com textura.
- **A ordem do 14 mudou** (pelo diagnóstico): primeiro o `z=` e o `zsort` (antes vinham depois da carta), depois o giro da forma, a espessura, o verso, a camada inteira, a cabeça redonda, o chão, o mapa isométrico e o filme. O `thick=` ganhou título próprio, separado do `back=`.
- **O que saiu dos capítulos e para onde foi:**
  - o painel "Pelo editor: Janela › Acabamento e estilo" foi inteiro para o 22, no título Acabamento e estilo, agora em três partes (Acabamento, Estilo de arte e O desenho com estilo); as alças das formas giradas, dos chãos e dos mapas foram para um título novo do 22, Formas em 3D. O aviso do começo do 22 diz agora "capítulos 1 a 14";
  - a imagem `14_tom_silhouette` saiu: a silhueta aparece com a vila (`14_vila_silhouette`), como as outras cores só;
  - o "Junto com o resto" do 14 antigo foi para a linha `art` (o `finish` e o SVG) e para "As opções que vários estilos têm" (`boil=` e `seed=`).
- **Erros de fato corrigidos** (do diagnóstico e da conferência com o código):
  - estilos: o editor mostra o desenho normal ao arrastar em todos os estilos menos `pixel`, `ascii`, `silhouette` e `lines` (dizia "menos `silhouette`"); os padrões do `lines` e do `neon` (`w=`: o contorno de cada forma, ou 2,5 vezes a unidade; `c=`: o `ink`, ou a cor de cada forma); o `lines` e o `neon` não tremem com `boil=`; o mosaico tem fileiras levemente onduladas, e não uma grade; o tricô mede 1/3 e o pixel 1/4 da tinta; o transparente só sai na exportação transparente; o `paper=` não aparece com `bg=none` na folha e no Godot; a faixa do `toon` conta quando a forma tem 90% da largura **ou** da altura; no filme, o lugar do `art` decide, e uma `scene` sem `shot` com `art` é erro; o `boil=` vai de 0 a 1000, inteiro, e o `seed=` de 0 a 1.000.000.000; o `angle=` é ignorado com `color`; o `chars=` precisa de 2 letras ou mais; no `levels=a,b`, `a` menor que `b`; o `actor=` aceita uma lista;
  - profundidade: o verso (`back=`) precisa estar **no mesmo lugar** da frente, não só ter o mesmo tamanho; com `round=`, o osso gira em volta do centro da bola, e não do pivô; o `round=` vale também para as peças dos ossos filhos; o `thick=` vai para trás, e só no `iso` sobe; as faixas: `persp=` de 0 a 100000, `thick=` de 0 a 10000, `lens=` de 0,01 a 100, `haze=` de 1,05 a 1000, `depth=` de 0,05 a 1000, `round=` com raio maior que 0 e 1 ou 3 números (2 é erro); `fog=none` tira a névoa; um horizonte abaixo do pivô não deita o chão (sem aviso); o `iso` não junta com `yaw=`, `pitch=` nem `floor` (aviso); as formas de dentro de um ator não giram com `at`.
- **As imagens:** 4 novas no 13 (`13_riso_seed`, a folha `13_boil_tela`, com o seu `.json`, e a vitrine `13_gato`) e 1 no 14 (`14_vila_iso`). As outras continuam com os mesmos nomes (os `14_` dos estilos, os `11_` da profundidade e o `10_paralaxe`): os exemplos ficaram iguais, letra por letra, os PNG saem iguais, byte a byte, e os GIFs antigos ficaram (com o mesmo código, um GIF regravado sai com outros bytes). Saiu 1 que nenhum exemplo gera mais: `14_tom_silhouette`.
- **Os links:** os **Para aprender** do 19, os capítulos 2, 3, 4, 6, 8, 9 e 12, os antigos de jogo, filme e problemas, o 21, o 25, o README do projeto e o índice levam aos arquivos novos. Navegação: o 12 leva ao 13, o 13 ao 14, e o 14 ao capítulo de jogo antigo (o 15), que volta para o 14; o de filme antigo agora leva à Referência (o 11 antigo saiu), e o de problemas antigo leva ao Glossário, como no índice.

### Etapa 8 (1.67.7): jogo

- **Os dois capítulos novos, no formato da seção 3.3:** o 15, Jogo: o personagem no Godot (`15-jogo-personagem.md`), e o 16, Jogo: fases e recursos avançados (`16-jogo-avancado.md`), saem do antigo `09-jogo-godot.md` (1.131 linhas), que saiu. O tileset isométrico, que estava no 14, foi para o 16, como a seção 3.2 pedia; no 14 ficou só um parágrafo que leva até lá.
- **A divisão:** o 15 tem o que todo personagem de jogo usa: exportar e abrir no Godot (primeiro, com a gosma mínima e um script de plataforma), a linha `godot`, as caixas (`box`), os pontos (`point`), o ajudante `tocar()`, as direções e o `feet=` (com a trajetória, a folha de conferência e a velocidade dos pés no jogo). O 16 tem o resto, que cada jogo usa ou não: o tileset (com o isométrico), as transições e o `trocar()`, a virada (`turn`), o esqueleto de verdade (`rig=bones`), a sprite sheet e a `unity`.
- **O tamanho:** o 15 tem 760 linhas, das quais 41 ficam fechadas em `<details>` (o script do herói no Godot); à vista, umas 719. O 16 tem 663, todas à vista.
- **As vitrines:** no 15, um herói com espada: parado, andando com `feet=` (120 pixels por segundo), e um golpe com a caixa `corte` presa ao braço, que só liga nos quadros da espada esticada; os eventos `passo` e `golpe`, o ponto `ponta`, a folha de conferência e o script do jogo. No 16, um arquivo de componentes (`pecas.weasel`, 8 blocos), um tileset que usa esse arquivo com `include` (sólidos, rampa, tábua `oneway`, meio bloco, espinhos, moeda e uma flor com o nome automático do `auto`) e uma fase de teste montada com `repeat`, com os mesmos componentes.
- **Testado no Godot 4** (sem janela, numa cópia do projeto): o script de plataforma do começo do 15 e o do herói (parado → anda a 120 → eventos `passo` → golpe → evento `golpe` → parado de novo). O `@onready var anim: AnimationPlayer = $AnimationPlayer` com `anim.tocar()` funciona sem erro.
- **O que saiu dos capítulos e para onde foi:**
  - as dicas do editor (as cores das caixas e o Hitboxes, os pontos e o tileset com Guias, a aba Godot da janela Exportar e o botão Sprite sheet) foram para um título novo do 22, **Jogo**. O aviso do começo do 22 diz agora "capítulos 1 a 16"; o link da Trajetória, no Player, leva ao 15;
  - no `rig=bones`, saíram os detalhes de dentro da cena (RemoteTransform2D, malha e pesos) e a nota da versão do Godot em que foi aberto; ficaram a tabela de comparação, a árvore da cena e o que dobra, troca de imagem ou fica livre para o código;
  - os dicionários `velocidades`, `fases` e `transicoes` do ajudante não aparecem: o `tocar()`, o `trocar()` e o `velocidade()` já os usam sozinhos.
- **Erros de fato corrigidos** (do diagnóstico e da conferência com o código):
  - B1: sem `name=`, o nó leva o nome do arquivo **exportado** (`-o`), e não o do `.weasel`; B7: o nome não pode começar com número nem ter acento;
  - B2: sem `root=`, a origem é o meio da base do **recorte** (o desenho mais 8 pixels de folga), e não do desenho; o 15 avisa que, num personagem que não enche o `canvas`, ela fica uns 8 pixels abaixo dos pés;
  - B3: uma caixa pode ter o nome de uma forma (dá aviso, e numa `key` vale a caixa); B4: o script do começo é de plataforma, com `get_axis`, e o capítulo explica que a direção começa para baixo e que um personagem só de lado fica no lado e começa no `_right`;
  - B6: o *nearest* vale para qualquer `art pixel`, com ou sem `small`; B8: o `feet=` aceita um ponto ou mais; B10: a cena troca as imagens sempre no `fps` da animação; B11: o `--trim` deixa 8 pixels de folga (de 0 a 1000); B13: no Godot, a imagem sai sempre transparente, e o `bg=none` só vale para a sprite sheet e para o editor;
  - tileset: `size=` vale 32 sem escrever e no mínimo 2; um `tileset` por arquivo; a célula do `tile` tem inteiros a partir de 0, dentro da grade, e não repete; um `tile` sem `solid`, `oneway` nem `collision=` não colide; `oneway` com `collision=` colide só por cima, no formato da forma; o `collision=` precisa de uma forma fechada; `solid` com `collision=` dá aviso (vale o `collision=`); com `-s`, o bloco precisa dar um número inteiro de pixels; no `iso`, uma célula mais baixa que a metade da largura dá aviso;
  - transições: `frames=` de 1 a 600 (4 sem escrever), `fps=` de 1 a 60 (o do `from=`), `every=` de 1 a 600 (2; numa `once`, só a peça do último quadro, a não ser que o `every=` esteja escrito); `loop` dá aviso, e o `mix=` não junta;
  - `unity`: `unit=` de 1 a 100.000 (100 sem escrever); sem `root=`, o meio da base do `canvas`; `collider=` com 2 a 4 números, em unidades.
- **As imagens:** 5 novas, `15_heroi` (GIF), `15_heroi_folha`, `16_tileset_iso` (o tileset isométrico, que antes só era conferido), `16_blocos` e `16_fase`. As outras continuam com os nomes `09_`: o código dos exemplos ficou igual, letra por letra (só mudaram comentários), os PNG saem iguais, byte a byte, e os GIFs antigos ficaram. A gosma do começo do 15 é a do antigo sem o golpe, e a imagem dela sai igual (é o primeiro quadro do `idle_right`); a gosma inteira, com o golpe, gera a folha `09_folha` no 16.
- **Os links:** os capítulos 8, 9, 13, 14, 19 (os **Para aprender**), 21 e 22, os antigos de filme e problemas e o índice levam aos capítulos novos. Navegação: o 14 leva ao 15, o 15 ao 16, e o 16 ao capítulo de filme antigo, que volta para o 16.

### Etapa 9 (1.67.8): filme

- **Os dois capítulos novos, no formato da seção 3.3:** o 17, Filme: atores, planos e câmera (`18-filme.md`), e o 18, Filme: atuação, som e legendas (`19-filme-atuacao.md`), saem do antigo `10-filme.md` (1.547 linhas), que saiu.
- **A divisão:** o 17 tem o que todo filme usa: `film` e `canvas` (começando pelo menor filme, sem planos, como a tabela da seção 1 pedia), os atores, as mudanças no tempo (`at`), a câmera, os planos e as transições, a luz e os comandos para ver e exportar. O 18 tem a atuação: as expressões (`expr`), os marcadores (`mark`), os caminhos (`path=`), trocar de animação sem tranco (`blend=` e `phase`), o `speed=auto`, a metamorfose (`morph=`), o `front`, o som, as legendas e o lip sync, os filmes longos (`scene`) e a exportação para o editor de vídeo. A profundidade no filme já estava no 14; no 17 ficou só um parágrafo que leva até lá.
- **O tamanho:** o 17 tem 904 linhas, das quais 31 ficam fechadas em `<details>` (o código da vila); à vista, umas 873. Passou das 700, como o 3, o 8 e o 10: cada parte do filme (o ator, o `at`, a câmera, o plano, a transição) precisa de um exemplo que mexe, e cada um tem a sua imagem. O 18 tem 754, das quais 86 em `<details>` (o Andador e as duas cenas); à vista, umas 668.
- **As vitrines:** no 17, o filme curto que abria o capítulo antigo (3 atores, luzes, 2 planos e 12 `at`) agora fecha o capítulo, quando tudo já foi ensinado, com um Experimente que troca a câmera parada por `follow=`. No 18, uma cena nova (`18_aviso`): a carinha sai de trás de uma moita `front` por uma trilha `guide` (`path=`), a coruja fala com lip sync e legenda desenhada, e a carinha se assusta num marcador. A vitrine antiga do `path=` (`10_marcas`) saiu.
- **Exemplos que não rodavam:** o do `phase` usava uma animação `trote` que não existe; virou um exemplo conferido com a capivara (`run` para `run4`). A saída do `--info` da metamorfose mostrava atores que não existem (`aranha` e `jacare`); agora é a saída de verdade da capivara virando o furão, e o Experimente (`born=narinaP->focinhoL`) foi rodado.
- **O que saiu dos capítulos e para onde foi:** as dicas do editor (o player do filme, a linha do tempo com os planos, os sons, as legendas, a cunha da transição e os marcadores, as faixas dos `at`, o painel Filme, as alças e o Palco em 3D) foram para um título novo do 22, **Filme**. O aviso do começo do 22 diz agora "capítulos 1 a 18". A exportação ficou curta no 17 e no 18, com links para a linha de comando (21), que já tinha tudo.
- **Erros de fato corrigidos** (do diagnóstico e da conferência com o código):
  - `expr`: um osso leva de 1 a 5 números (`dx,dy,giro,sx,sy`); a linha não tem `ease=` (o ritmo vem do `at`);
  - `mark`: o tempo não aceita `+`, e o nome não repete; um `at` com um marcador de outro plano dá aviso e não vale;
  - `path=` aceita `line`, `stroke`, `shape`, `ellipse` e `rect`; num caminho fechado, o `along=` passa de 1 e dá voltas;
  - `mouth`: as duas formas fechadas, ou as duas abertas; com o mesmo tipo e o mesmo número de pontos, elas se misturam ponto a ponto, e senão pelo contorno; dois `mouth` dão aviso, e vale o último;
  - o `.srt` sai sempre ao lado do vídeo, mesmo com `subs=burn` (não sai com `--subs none` nem no GIF); `-o x.srt` não é uma saída (o ffmpeg dá erro), e o guia não diz mais isso;
  - `audio`: `vol=` de 0 a 4; sem `dur=`, o som toca até o fim do arquivo, mesmo depois do fim do plano; `loop` vai até o fim do plano (ou do filme); `cues=` aceita o `.json` do Rhubarb ou um texto com "tempo letra" por linha;
  - `sub`: sem `dur=`, 0,5 s mais um quinze avos de segundo por letra, de 1,2 a 7 s; o `+` conta do fim da legenda anterior, de qualquer língua;
  - `film`: `subs=` (`file` sem escrever), `subsize=` de 6 a 400 (5% da altura do quadro), `subc=` (branco, com contorno preto), `lang=` (`pt`);
  - `scene`: precisa de `film`; até 8 níveis, sem chamar a si mesma; vale o `fps=` do filme principal; depois de um `scene`, `actor`, `camera`, `audio`, `sub` e `art` precisam de um `shot` antes; os atores, as luzes e as camadas do principal não entram nas cenas; uma cena de outro tamanho é ajustada ao quadro, no meio dele.
- **As imagens:** 1 nova, `18_aviso` (GIF). As outras continuam com os nomes `10_`: o código dos exemplos ficou igual, letra por letra (só um comentário novo, no `10_ator_origin`); os PNG saem iguais, byte a byte, menos o `10_ator_jeitos`, que sai diferente em 53 pixels, por até 5 níveis de cor (a imagem guardada é de uma versão anterior; ficou a guardada); e os GIFs antigos ficaram. O `10_marcas` saiu.
- **Os links:** os capítulos 4, 6, 8, 9, 13 (estilos e problemas), 14, 15, 16, 19 (os **Para aprender**), 21 e 22 e o índice levam aos capítulos novos; o `depth=` do 4 leva agora ao 14. Navegação: o 16 leva ao 17, o 17 ao 18, e o 18 à referência (19).

### Etapa 10 (1.67.9): problemas comuns, o editor e a revisão

- **O capítulo 24, Problemas comuns (`25-problemas.md`),** sai do antigo `13-problemas.md`, que saiu. Cada problema tem as três partes da seção 3.3 (o que você vê, por quê, como resolver). As mensagens do capítulo são as de verdade: cada uma foi rodada na linha de comando e copiada com a linha, a coluna e os `^^^^`.
- **Achar pela mensagem:** uma tabela no começo, em ordem alfabética, leva do começo de cada mensagem ao problema que a explica (38 linhas). É o "organizado pela mensagem de erro" da seção 5. Quem não tem mensagem (a forma sumiu, o braço não mexe) procura pelo assunto, nos links logo abaixo do título.
- **Um título novo, Escrever as linhas:** os erros de quem está começando, juntos: instrução desconhecida, atributo desconhecido (e o atributo repetido), valor solto (com o comentário `#cafe`), o ponto com espaço (`200, 120`) e o nome com acento, nome inválido, ponto inválido e pelo menos 3 pontos, cor desconhecida, use uma cor #hex aqui, deve ficar entre, já existe e sem end. O formato x,y, a cor desconhecida e o `#cafe` já estavam no antigo; os outros são novos.
- **Problemas novos nos outros títulos:** falta pivot, quadro passa do fim, componente que não existe, o `at` fora de um filme ou de um plano, e o `horizon=` sem `floor`. São 83 problemas; o antigo tinha 73.
- **Mudanças de lugar:** "Quero que uma forma passe para a frente" entrou em "não está na mesma camada", com o exemplo das camadas inteiras; os pés que escorregam no jogo foram para "Jogo e exportação", e os do filme e a troca de jeito de andar, para "Filme"; "Arquivos" virou "Componentes e arquivos", com a variável e o parâmetro desconhecidos.
- **Correções (do diagnóstico e da conferência com o código):**
  - "Uma transição (`once`) começa torta" virou "Uma animação `once`": a palavra transição é das peças do capítulo 16;
  - "O ator ficou parado e depois pulou" virou "O ator começa a andar antes da hora", que é o que acontece, e o exemplo ganhou a linha `actor`;
  - a pose estranha ganhou um exemplo (`key 4` e `key 8`, sem `key 0`): os quadros antes da primeira `key` fazem a passagem da última para a primeira;
  - o balanço parado diz que, num filme, o `sway=`, o `bob=` e o `jitter=` andam sem `anim`;
  - o `cloth=` com `bones=` explica que cada ponto segue uma média dos ossos, com mais peso para os mais perto;
  - a troca de jeito de andar usa a capivara (`run` para `run4`), a mesma do 18;
  - o marcador fora do plano mostra o código que dá o aviso, conferido;
  - o `include` diz que o nome vai com o `.weasel`, e que no editor o arquivo fica aberto numa aba (como o 22);
  - o vídeo sem ffmpeg diz do `--ffmpeg` e do botão **Vídeo** do editor;
  - "use uma cor #hex aqui" lista os lugares que só aceitam `#`, conferidos no `lang.js` (luzes, efeitos de camada, padrões, partículas, `thickc=`, `art`, câmera, legendas e `at`).
- **O tamanho:** 1.488 linhas (o antigo tinha 1.118). Passa das 700, como o 19: é um capítulo de consulta, e cada problema precisa da mensagem, do porquê e do código certo. Ninguém lê de uma vez: a tabela do começo leva direto ao problema.
- **As imagens:** nenhuma nova, e nenhuma mudou. Os 27 exemplos com imagem ficaram iguais, letra por letra, com os nomes `13_` de antes.
- **O editor (22):** o aviso "ainda está sendo montado" saiu. O 22 já tinha as dicas de todos os capítulos de aula (1 a 18); os de consulta (19 a 25) não trazem dicas que faltassem. A lista de erros leva aos problemas comuns.
- **O índice:** saíram o aviso do guia em reescrita e o "(antigo)"; o começo leva à referência (19) e aos problemas comuns (24), em vez de dizer que o README é a lista de tudo; "Como testar" diz o que instalar (nada para o editor; Node.js 18 e `npm install`, uma vez, para a linha de comando) e aonde ir quando algo dá errado; "Como este guia é feito" virou "Para quem mantém o guia", no fim.
- **Os links e a navegação:** o 1, o 21 e o índice levam ao 24. O 23 (escrito pelo `gerar.js`) leva ao 24, e o 25 volta para o 24. Nos planos, os links para capítulos que mudaram de número (`ajudante-godot`, `bocas-por-texto`, `estilos` e `metamorfose`) levam aos capítulos novos; só o link mudou, e o `bocas-por-texto` continua parado.
- **O README da raiz:** a linha do guia cita também o editor, os atalhos e os problemas comuns; o parágrafo dos testes diz o que o `npm test` confere no guia (antes dizia que ele lê todos os exemplos; ele roda os que geram imagem ou estão marcados para conferir, e confere a referência, os atalhos e os links).
- **O plano terminou:** a linha dele, no README dos planos, passou para "Já implementados".
