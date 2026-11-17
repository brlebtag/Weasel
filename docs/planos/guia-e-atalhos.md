# Guia novo e folha de atalhos

**Situação:** aprovada em 17/11/2026 ("pode fazer", com as cinco recomendações da seção 7). Etapa 1 (a folha de atalhos) feita na 1.66.0. Próximo: as tarefas à parte A e B (seção 2) e a etapa 2.

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
| A | **`opacity=` e `blend=` da camada.** Sem efeito na camada, eles valem forma por forma: duas formas da mesma camada `opacity=0.5` aparecem uma através da outra. Com qualquer efeito (`blur=`, `hue=`…), valem para a camada inteira. Parece um defeito (`scene.js:2601` contra `:2593`). Corrigir muda a imagem de quem usa `opacity=` em camada com formas sobrepostas. | Camadas (etapa 3) |
| B | **Ajudante do Godot.** Ele começa virado para baixo (`godot.js:335`). Num personagem de lado (só `_left` e `_right`), `tocar("idle")` procura `idle_down`, não acha e toca `idle`, que não existe. O script de exemplo do capítulo 9 cai nisso. Lido no código; não testado no Godot. | Jogo (etapa 8) |
| C | **Valores cortados sem aviso:** a força do `glow=`, o `tint=`, a sombra do `cast=`, o `emit=`, a queda do `trail=`, o `taper=`. E aceitos sem fazer nada: `cut=` em `stroke`/`line`/`text`, `bold` numa elipse, `cloth=` no texto, `~` na `line`, `camera.fog=none` no `at`, `audio at=+1s`. | nenhuma: o guia diz o que o código faz |
| D | **Faixas diferentes no `at` e na linha do comando:** `zoom` vai até 100 na `camera` e até 1000 no `at`; `lag`, até 10 e até 100; numa `key`, a luz aceita `power=30` e `cone=999` sem aviso. | nenhuma |
| E | **`rect` com tamanho negativo e `r=`** desenha os cantos para dentro (`geom.js:139`). | nenhuma |

Recomendação: A e B viram tarefas à parte, cada uma com as imagens antes/depois. C, D e E podem esperar uma tarefa de "avisos que faltam".

## 3. A nova estrutura

### 3.1 A ideia

Hoje o guia mistura três coisas. Na nova estrutura, cada uma tem o seu lugar:

1. **A aula** (capítulos 1 a 18): ensina em ordem. Cada exemplo só usa o que já foi ensinado.
2. **A consulta** (capítulos 19 a 25): a referência completa, as funções, a linha de comando, o editor, os atalhos, os problemas e o glossário.
3. **O editor** sai da aula. No texto da linguagem fica uma linha só, com o link: "No editor, a ferramenta Elipse (L) escreve esta linha para você ([capítulo 22](…))".

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

- Os arquivos ganham os números novos (`02-formas.md` continua; `12-referencia.md` vira `19-referencia.md`…). Os links de fora do guia são poucos: o README e alguns planos. As imagens antigas mantêm o nome.
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
> As outras opções aparecem nos próximos capítulos: `weight=` e `inkon=` (contorno), `cut=` (recorte), `bone=` (osso)… A lista completa, com todas as faixas, está na [referência do `ellipse`](19-referencia.md#ellipse).
>
> > **Cuidado:** com `ink=` e sem `c=`, a forma fica **vazia**: só o contorno aparece. Para ter as duas coisas, escreva as duas.
> >
> > ```weasel
> > canvas 300 160 bg=#f4efe6
> > ellipse so_contorno 80,80 50 ink=6 inkc=#2f6fb5
> > ellipse as_duas 220,80 50 c=#ffb000 ink=6 inkc=#2f6fb5
> > ```
>
> No editor, a ferramenta **Elipse** (L) escreve esta linha para você, e a elipse ganha pontos de arrastar para o tamanho e o giro ([capítulo 22](22-editor.md#elipse)).

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
| 3 | 1.67.1 | Primeiros passos, Formas, Cores e contorno, Camadas (1 a 4); o capítulo do editor (22) começa a receber as dicas |
| 4 | 1.67.2 | Contas e repetição, Componentes e arquivos (5 e 6) |
| 5 | 1.67.3 | Primeiro movimento, Ossos, Animação (7 a 9) |
| 6 | 1.67.4 | Luz e sombra, Efeitos e partículas, Acabamento (10 a 12) |
| 7 | 1.67.5 | Estilos de arte, Profundidade (13 e 14) |
| 8 | 1.67.6 | Jogo (15 e 16) |
| 9 | 1.67.7 | Filme (17 e 18) |
| 10 | 1.67.8 | Problemas comuns (24), o editor (22) terminado, revisão dos links e do README |

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
