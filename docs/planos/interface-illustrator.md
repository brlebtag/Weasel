# Interface no jeito do Illustrator (código e desenho, como no Dreamweaver)

**Situação:** estudo de 16/11/2026. As 9 decisões foram tomadas no mesmo dia (seção 12), a etapa 1 (a casca) saiu na 1.50.0, a 1b (camadas em 3D) na 1.51.0 a 2 (Propriedades e Amostras) na 1.52.0, a 3a (escolher, copiar, apagar e organizar) na 1.53.0, a 3b (travar, alinhar e grupos) na 1.54.0 a 4a (formas arrastando, caixinhas de cor, Conta-gotas, Degradê e o menu do botão direito) na 1.55.0 e a 4b (alça quebrada, Caneta, Curvatura e Ponto de ancoragem) na 1.56.0, no mesmo dia. Você pediu que eu fizesse as outras sozinho: as escolhas que fiz sem você estão marcadas com **(R)** em cada etapa, para você confirmar.

Hoje o Weasel tem duas pessoas usando:
- **você**, programador, que pensa em código;
- **seu irmão**, designer, que pensa em Illustrator e Photoshop.

A ideia é o editor servir aos dois:
- continuar funcionando como hoje (código e desenho lado a lado);
- ganhar um modo **só desenho**, em que dá para trabalhar sem ver o código;
- trazer as ferramentas e o **comportamento** do Illustrator (atalhos, seleção, painéis).

O Dreamweaver é a referência para juntar as duas coisas: ele tem as vistas Código, Dividido e Design, e o que se faz numa aparece na outra.

Legenda: ✅ já existe · 🔶 existe, mas muda · 🆕 novo · ➖ fica de fora

## A regra que não muda

**O arquivo continua sendo o código.** No modo só desenho, o código continua lá, escondido:
- cada gesto (arrastar, desenhar, mudar uma cor) vira uma mudança pequena no código e um Ctrl+Z;
- nada fica guardado fora do texto;
- você abre o mesmo arquivo depois e lê, versiona e edita como sempre.

**O jogo e o filme não mudam.** O editor só escreve linhas que o Weasel já entende. Os poucos itens novos de linguagem (seção 9) não mudam nenhum arquivo que já existe: só valem onde forem usados.

---

## 1. Como o Illustrator funciona

### 1.1 A tela

| Parte | Onde | O que faz |
|---|---|---|
| Barra de menus | em cima | Arquivo, Editar, Objeto, Texto, Selecionar, Efeito, Exibir, Janela, Ajuda |
| Barra de ferramentas | à esquerda | uma ferramenta ativa por vez; as parecidas ficam agrupadas (segurar o ícone mostra as escondidas); "Editar barra de ferramentas" mostra todas e deixa escolher quais aparecem |
| Pé da barra de ferramentas | à esquerda | preenchimento e contorno atuais (D volta ao padrão, X alterna qual está na frente, Shift+X troca os dois), modos de desenho (normal, atrás, dentro: Shift+D) e modo de tela (F) |
| Painel Propriedades | à direita | muda conforme o que está escolhido: Transformar (X, Y, L, A, ângulo), Aparência (preenchimento, contorno, opacidade), Caractere, e botões de ação rápida |
| Painéis | à direita, encaixados | Camadas, Amostras, Cor, Traçado, Degradê, Transparência, Aparência, Alinhar, Pathfinder, Transformar, Caractere, Símbolos, Pranchetas |
| Pranchetas | no meio | as "folhas" do documento (pode haver várias) |
| Barra de status | embaixo | zoom, prancheta atual, ferramenta |

### 1.2 O comportamento que faz "parecer Illustrator"

- **Uma ferramenta ativa.** O mesmo arraste faz coisas diferentes conforme a ferramenta. Uma letra troca de ferramenta (V, A, P, T, M, L…).
- **Teclas que trocam por um instante.** Segurar Espaço vira a Mão; segurar Ctrl vira a última ferramenta de seleção; Alt é a variação de quase tudo:
  - Alt+arrastar faz uma cópia;
  - Alt ao desenhar parte do centro;
  - Alt+clique nas ferramentas de girar ou refletir escolhe o ponto de referência.
- **Seleção (V).**
  - Um clique escolhe o objeto (o grupo inteiro), e Shift+clique soma ou tira.
  - Arrastar no vazio faz uma caixa que escolhe o que ela toca.
  - O escolhido ganha a caixa delimitadora: 8 alças esticam, e perto do canto, por fora, gira.
  - Duplo clique num grupo entra nele (modo isolamento); Esc sai.
- **Seleção direta (A).** Pontos e alças, de várias formas ao mesmo tempo, por clique ou por caixa.
- **Teclado.**
  - As setas empurram o escolhido (Shift: 10 vezes mais) e Delete apaga o objeto.
  - Ctrl+C e Ctrl+V copiam e colam; Ctrl+F e Ctrl+B colam na frente e atrás.
  - Ctrl+G agrupa; Ctrl+] e Ctrl+[ mudam a ordem; Ctrl+2 trava; Ctrl+3 esconde.
  - Ctrl+D repete a última transformação (mover e copiar, depois Ctrl+D, Ctrl+D…).
  - Ctrl+Y é a vista de contorno, Ctrl+R mostra as réguas, Ctrl+U liga as guias inteligentes, Ctrl+0 ajusta à tela e Ctrl+1 mostra em 100%.
- **Guias inteligentes.** Enquanto arrasta, linhas finas mostram o alinhamento com outros objetos, o centro e a distância.
- **Desenhar arrastando.** Retângulo, elipse, polígono e estrela nascem do arraste: Shift mantém a proporção e Alt parte do centro. Depois de prontos, o retângulo tem alças para arredondar os cantos e o polígono, para mudar o número de lados.
- **Caneta (P).** Clique põe um canto; arrastar puxa as duas alças de uma curva; Alt quebra a alça (cada lado para um lado); clicar no primeiro ponto fecha.
- **Curvatura (Shift+~).** Cada clique põe um ponto liso e a curva passa por eles sozinha; duplo clique faz um canto. É exatamente o jeito Weasel de desenhar.

### 1.3 As ferramentas

São seis grupos (a lista da página da Adobe, com os atalhos). Na seção 5, cada uma ganha o que o Weasel faria com ela.

- **Seleção:** Seleção (V), Seleção direta (A), Seleção de grupo, Varinha mágica (Y), Laço (Q), Prancheta (Shift+O).
- **Navegação:** Mão (H), Girar vista (Shift+H), Zoom (Z), Imprimir divisão em blocos.
- **Desenho:**
  - caminhos: Caneta (P), Curvatura (Shift+~), Adicionar ponto (+), Excluir ponto (−), Ponto de ancoragem (Shift+C), Lápis (N);
  - formas: Segmento de linha (\), Arco, Espiral, Grade retangular, Grade polar, Retângulo (M), Retângulo arredondado, Elipse (L), Polígono, Estrela, Clarão;
  - à mão livre: Pincel (B), Pincel de bolha (Shift+B), Suavizar, Borracha de caminho, Junção, Shaper (Shift+N);
  - outros: as ferramentas de Símbolos (Shift+S) e de Gráficos (J), e a Grade de perspectiva.
- **Pintura:** Degradê (G), Malha (U), Construtor de formas (Shift+M), Pintura em tempo real (K, Shift+L).
- **Texto:** Texto (T), Texto de área, Texto no caminho, os três verticais e Datilografia (Shift+T).
- **Modificação:**
  - transformar: Rotação (R), Refletir (O), Escala (S), Distorcer (inclinar), Alterar forma, Largura (Shift+W);
  - deformar: as deformações (Shift+R: distorcer, redemoinho, enrugar, inchar, guirlanda, cristalizar, vincar), Distorção de marionete e Transformação livre (E);
  - medir e copiar: Medida, Conta-gotas (I), Mesclar (W), Dimensão;
  - cortar: Borracha (Shift+E), Tesoura (C), Faca;
  - Objetos no caminho.

---

## 2. Como o editor do Weasel funciona hoje

(O levantamento completo do código está na seção 2.1. Aqui, o resumo.)

- **A tela.** Código à esquerda, desenho à direita, com um divisor que se arrasta. Em cima: exemplos, Novo, Abrir, Salvar, Referência e Exportar. Em cima do desenho, as chaves:
  - Guias, Hitboxes, Pontos, Ossos, Papel vegetal, Estilo, Trajetória, Réguas, Câmera;
  - os botões Medir, Prender, Camadas e Referências;
  - o zoom.

  Embaixo: o player e, no filme, a linha do tempo.
- **A seleção é a linha do cursor.** A forma "escolhida" é a da linha onde está o cursor do código. Clicar numa forma no desenho leva o cursor até a linha dela. Para várias, Shift+clique no desenho ou o painel Camadas.
- **O que já se faz no desenho, sem digitar:**
  - pontos: arrastar, criar no meio de um lado, apagar (Delete), trocar liso e canto (duplo clique) e puxar uma alça de curva (Alt+arrastar);
  - a forma inteira: mover pelo ✥ ou com Shift+arrastar, esticar pela caixa (Shift mantém a proporção, Alt estica a partir do meio) e girar pela bolinha verde; com várias escolhidas, as três coisas valem para todas juntas;
  - ellipse e rect: raio, largura, altura e canto arredondado;
  - text: tamanho e o próprio texto (duplo clique);
  - o resto: a direção da luz, os gradientes (painel e alças), as imagens guia (ref) e os ossos (com uma animação parada, arrastar escreve a key);
  - Prender: pontos em ossos.
- **Criar sem digitar:** Ctrl+I ou o botão direito abre o menu de formas (a escolhida entra pronta para arrastar). Ctrl+D duplica a linha.
- **Ajudas:** réguas com linhas guia que puxam o que você arrasta, Medir e o olho do painel Camadas (`hidden`).
- **Só no código hoje:**
  - mudar cor, espessura e opacidade (há só o seletor de cor por Alt+clique num #hex);
  - mudar a ordem, criar e renomear camadas;
  - apagar uma forma inteira;
  - operações entre formas;
  - alinhar;
  - quase todo o resto da linguagem: efeitos, luzes, animação e filme.

### 2.1 Detalhes do código (para a implementação)

- **O clique no desenho** (`pointerdown` no `app.js`) passa por uma fila: régua, Prender, Ctrl+clique, Medir, osso, caixa de várias, alças de esticar, alça, linha guia, imagem guia. Se nada pegou:
  - arrastar **move a vista**, mesmo em cima de uma forma (fora das alças);
  - um clique sem arrastar escolhe a forma (`pickShape`).

  O botão do meio também move a vista, e a roda dá zoom.
- **A forma "atual" é sempre a linha do cursor** (`m.byLine.get(st.caret.line)`); só as alças dela aparecem. Clicar numa forma leva o cursor até a linha e **joga o foco para o código**: depois disso, Espaço, setas e Delete agem no código. Clicar num ponto não muda o foco.
- **Tudo o que o desenho escreve passa por `editor.replaceRange`** (`writeTok`, `rewritePts`, `writeLines`). Cada arraste tem uma chave própria e vira um Ctrl+Z. Dois problemas:
  - parar o mouse por mais de 0,9 s no meio do arraste começa outro passo de desfazer;
  - cada movimento do mouse refaz a leitura inteira do arquivo.
- **Várias escolhidas** (`st.sel`) já têm caixa com mover, girar e esticar, e escrevem `rot=`, `scale=` e `flip=` no `use`. A escolha some quando o cursor do código sai dela.
- **Não existe:**
  - caixa de seleção de formas (só a de pontos, no Prender);
  - Alt+arrastar para copiar;
  - setas para empurrar;
  - grudar em outras formas ou guias inteligentes (só nas linhas guia das réguas);
  - Shift para andar só na horizontal ou na vertical.
- **Linhas que não arrastam:**
  - as de `repeat` (a dica diz, errado, que o ponto "vem de uma {expressão}");
  - as de `mirror=`;
  - as de `include`.

  O `def` arrasta pela primeira cópia (muda todas). Um `use` sozinho só move: girar e esticar, só com várias escolhidas.
- **Só no código hoje:**
  - cor e espessura de forma (só com Alt+clique no `#hex` e Alt+arrastar no número);
  - ordem, grupos, criar camada e levar forma para outra camada;
  - apagar a forma inteira, copiar e colar no desenho;
  - `clip=` e `cut=`;
  - fonte e alinhamento do texto;
  - inclinar, alinhar, campos numéricos e travar (só as `ref` têm `lock`);
  - criar osso, `ik`, `def` e `gradient`;
  - escolher no filme (fora as alças do ator e da câmera).

---

## 3. O Dreamweaver: o que copiar dele

| No Dreamweaver | No Weasel |
|---|---|
| Vistas **Código**, **Dividido** e **Design** | as mesmas três: o Dividido é a tela de hoje |
| Escolher algo no Design marca o código, e o contrário | já é assim (o clique leva o cursor à linha); no Dividido, a linha fica marcada sem roubar o foco do desenho |
| **Inspetor de propriedades** embaixo: os atributos do que está escolhido, em campos que reescrevem o código | o painel **Propriedades**, à direita, como no Illustrator |
| **Seletor de tags** na barra de status (`<body> <div> <p>`): onde você está e como subir de nível | `arquivo › camada › forma › ponto`: clicar num nível escolhe ele |
| **Regiões travadas** dos modelos: aparecem, mas não se editam ali | linhas com `{contas}`, `repeat`, `include`, `use` e `mirror=`: aparecem e se escolhem, mas mudam pelo lugar certo (seção 8) |

---

## 4. A proposta: a tela

### 4.1 Três vistas

Um seletor no canto de cima, como no Dreamweaver: **Código · Dividido · Design**.

- **Código:** só o código, com o desenho fechado (para quem só escreve).
- **Dividido:** a tela de hoje, com a barra de ferramentas e os painéis novos. O código acompanha o que se escolhe no desenho.
- **Design:** só o desenho, no jeito do Illustrator. O código existe, mas fica escondido. Um erro no código aparece como aviso na barra de status, com um botão para abrir a vista Código naquela linha.

### 4.2 A tela no modo Design

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Arquivo Editar Objeto Texto Selecionar Efeito Exibir Janela Ajuda   [Código|Dividido|Design]  Exportar │
├──┬─────────────────────────────────────────────────────────┬────────────────┤
│V │                                                         │ Propriedades   │
│A │                                                         │  Transformar   │
│P │                    o desenho (o canvas)                 │  Aparência     │
│T │                                                         │  Caractere     │
│M │                                                         ├────────────────┤
│L │                                                         │ Camadas        │
│… │                                                         │ Amostras       │
│■□│                                                         │ Símbolos …     │
├──┴─────────────────────────────────────────────────────────┴────────────────┤
│ cavaleiro.weasel › corpo › capa › ponto 4      zoom 100%   sem erros         │
├──────────────────────────────────────────────────────────────────────────────┤
│ player: animação ▾  ⏮ ▶ ⏭ ⟲  ━━━━━━━━━━  1/24   (e a linha do tempo, no filme)│
└──────────────────────────────────────────────────────────────────────────────┘
```

- **À esquerda:** a barra de ferramentas, em uma coluna, com as ferramentas parecidas agrupadas. No pé ficam o preenchimento e o contorno atuais: são as cores que uma forma nova recebe.
- **À direita:** Propriedades em cima e, embaixo, os outros painéis em abas que se abrem e fecham.
- **Embaixo:** a barra de status, com o caminho do escolhido, e o player (o player e a linha do tempo são do Weasel: o Illustrator não tem).
- **No modo Dividido:** o código volta entre a barra de ferramentas e o desenho, como hoje.

### 4.3 Seleção: o coração da mudança

Hoje, "escolhido" é a linha do cursor. Passa a ser uma **lista de coisas escolhidas**, a mesma para o desenho, os painéis, a barra de status e o código:
- **objetos:** uma linha de forma (`shape`, `stroke`, `line`, `ellipse`, `rect`, `text`, `use`…);
- **pontos:** pontos de uma ou mais formas.

O que muda no comportamento:

| Gesto | Hoje | Proposta (como no Illustrator) |
|---|---|---|
| Clique numa forma | o cursor vai para a linha, e o foco, para o código | escolhe a forma; no Dividido, a linha fica marcada, mas o foco fica no desenho |
| Clique no vazio | nada | tira a escolha |
| Arrastar no vazio | move a vista | caixa de seleção (a vista move com Espaço+arrastar, a Mão ou o botão do meio) |
| Arrastar a forma (fora das alças) | move a vista | com V move a forma inteira; com A mexe os pontos |
| Arrastar um ponto | mexe o ponto (Shift: a forma inteira) | com A mexe o ponto; com V move a forma inteira |
| Alt+arrastar um ponto ou uma forma | puxa uma alça de curva | faz uma cópia (as alças passam a sair com o Ponto de ancoragem, Shift+C, ou com Alt na Caneta) |
| Setas | trocam de quadro | empurram 1 px (Shift: 10) |
| Delete | apaga o ponto escolhido | apaga a forma (com A, o ponto) |
| Duplo clique | troca liso e canto | entra no grupo ou no `def` (isolamento); com A, troca liso e canto |
| Esc | solta a escolha do painel Camadas | sai do isolamento ou tira a escolha |

### 4.4 Camadas em 3D (o protótipo do seu irmão)

O protótipo `weasel-camadas3d` (16/11/2026) é o item 5 da proposta das ferramentas de desenho (item 13 da ordem do editor), já funcionando fora do Weasel.

**O que ele faz**
- **Lê o SVG que o Weasel exporta.** O SVG tem um `<g data-layer>` por camada, e o protótipo transforma cada forma numa peça plana em 3D, com three.js.
- **Afasta as peças:** dois controles deslizantes, um para as camadas e outro para as formas dentro de cada camada.
- **Muda de vista:** os botões Explodir, De frente, De lado e Juntar levam a câmera suave de uma vista para a outra. Arrastar gira, a roda dá zoom e o botão direito move.
- **Lista as camadas,** com o olho e o número de formas. Passar o mouse num nome apaga as outras.
- **Mostra de onde é a forma:** passar o mouse mostra a camada e o número dela, e clicar fixa a informação.
- **O que fica de fora:** o `clip-path` vira um recorte, mas os degradês viram a cor média, e `cut=`, os efeitos e o `blend=` não aparecem.

**Faz sentido?** Sim, com uma condição.
- **Resolve um problema que o 2D não mostra:** o que está escondido atrás do quê. No exemplo da folha vetorizada (379 formas numa camada só), as manchas magenta que o vetorizador deixou por baixo só aparecem assim. É o problema 3 do pedido das ferramentas ("formas empilhadas").
- **Ensina a ordem:** quem vem do Illustrator vê que, no Weasel, a ordem das linhas é a ordem de pintura.
- **A condição: só ver não basta.** O que corrige o problema é escolher a forma escondida e apagá-la, mudar a ordem ou levá-la para outra camada. Por isso a vista tem de estar dentro do editor, ligada à seleção e ao painel Camadas.

Fora do editor, a vista fica limitada:
- é preciso exportar um SVG a cada mudança;
- o clique não leva à linha;
- degradês, `cut=`, efeitos e `blend=` não aparecem como no Weasel;
- fica num quadro só, sem acompanhar a animação;
- a regra que pula "o fundo da folha" (qualquer forma do tamanho do desenho) também pula uma forma grande de verdade, como um céu.

**Como entra na interface nova**
- **Lê as camadas do Weasel, não o SVG.** Mostra o arquivo aberto no editor, do jeito que ele está agora: cada `layer` é um plano e, no modo "por forma", cada linha também. Não precisa exportar nada. O SVG só existe no protótipo porque, fora do Weasel, era o jeito de chegar às camadas.
  - Um `use` é uma peça só (como no painel Camadas). As linhas de um `include` vão junto com a camada em que são desenhadas.
  - O que se perde: abrir um SVG qualquer, como o da folha vetorizada antes de virar Weasel. Se isso for útil, dá para manter um "Abrir SVG" à parte, só para olhar.
- **É uma vista,** como a de contorno (Ctrl+Y) do Illustrator: **Exibir › Camadas em 3D**, e um botão perto do zoom. O desenho dá lugar à vista 3D; a barra de ferramentas, os painéis e o player continuam.
- **A seleção é a mesma.** Clicar numa forma em 3D escolhe a forma; o painel Propriedades mostra a forma e, no Dividido, a linha fica marcada. Mudar a cor ou apagar aparece na hora em 3D.
- **O painel Camadas faz o papel da lista do protótipo.** Passar o mouse numa camada (ou numa linha) apaga as outras em 3D. Ctrl+] e Ctrl+[ (Organizar) mudam a ordem, e a peça anda para a frente ou para trás.
- **O olho dentro da vista 3D esconde só na vista** (decisão 9): serve para ver o que está atrás, sem mexer no arquivo. O olho do painel Camadas (Ctrl+3) continua escrevendo `hidden`, como hoje.
- **Navegar:**
  - arrastar gira;
  - Espaço+arrastar, a Mão ou o botão do meio movem;
  - a roda dá zoom;
  - os botões e os dois controles do protótipo ficam numa barrinha em cima da vista.
- **Acompanha o quadro** da animação escolhida, com a ordem de pintura daquele quadro (também com `key … above=`, `below=` e as camadas `zsort`).
- **O fundo** (`bg=` do `canvas`) vira o plano de trás, que se esconde. Não precisa de regra para adivinhar.

**Por dentro: sem three.js**
- **O Weasel já pinta uma camada ou uma forma sozinha:** o `drawScene` com `layers` e `items`, o mesmo que o esqueleto do Godot usa para pintar cada peça.
  - Cada camada vira um canvas; no modo "por forma", cada forma vira um, recortado na caixa dela.
  - Tudo sai pintado como no desenho de sempre: degradês, `cut=`, `clip=`, luz e efeitos.
- **O navegador faz o 3D.** Os canvas ficam em 3D com CSS (`perspective` e `translateZ`), como a própria proposta do seu irmão sugeria. Para saber o que está sob o mouse, `elementsFromPoint` dá os canvas na ordem, e a transparência do ponto diz se acertou.
- **O editor continua sem nada vindo da internet.** O three.js viria por CDN (ou seriam mais uns 700 KB no projeto), e é um módulo, diferente dos scripts do Weasel.
- **O que se perde:** o three.js é vetorial e fica nítido em qualquer zoom; os canvas são imagem. A saída é pintar de novo, na resolução certa, quando o zoom para.
- **O que fica do protótipo:** toda a forma de usar. Os dois controles, os quatro botões, a câmera suave, as molduras com os nomes, o destaque ao passar o mouse e a informação da forma.

**Ideias que ficam fáceis dentro do Weasel** (para decidir depois):
- mostrar as formas `hidden` (os moldes de `clip=` e `cut=`) como fantasmas;
- pintar cada peça com a cor do osso dela (como no Prender), para ver o que segue cada osso;
- tocar a animação em 3D (mais lento, porque pinta cada camada à parte).

**Custo:** médio. Não depende das ferramentas novas, então pode entrar logo depois da etapa 1 (a casca), num arquivo próprio (`js/ui-3d.js`). O jogo e o filme não mudam.

---

## 5. As ferramentas: o que o Weasel faria com cada uma

### 5.1 Seleção e navegação

| Ferramenta | | No Weasel |
|---|---|---|
| Seleção (V) | 🔶 | a caixa de hoje (mover, esticar, girar, espelhar passando para o outro lado), mais caixa no vazio, Alt+arrastar copia, setas e Delete |
| Seleção direta (A) | 🔶 | os pontos de hoje, mas de várias formas ao mesmo tempo (o Prender já escolhe assim) |
| Seleção de grupo | 🆕 | depende de haver grupo (seção 9) |
| Varinha mágica (Y) | 🆕 | escolhe as formas com a mesma cor (o mesmo `c=`, ou o mesmo nome da `palette`) |
| Laço (Q) | 🆕 | escolhe pontos ou formas dentro de um contorno livre |
| Prancheta (Shift+O) | 🆕 | arrastar as bordas muda o `canvas L A`. Só uma prancheta por arquivo |
| Mão (H, Espaço segurado) | 🔶 | hoje, arrastar no vazio já move a vista; passa a ser a Mão, com Espaço segurado e o botão do meio |
| Zoom (Z) | 🔶 | o zoom de hoje, mais clique para aproximar e Alt+clique para afastar |
| Girar vista, Imprimir divisão | ➖ | |

### 5.2 Desenho

| Ferramenta | | No Weasel |
|---|---|---|
| Curvatura (Shift+~) | 🆕 | **o jeito Weasel**: cada clique põe um ponto liso (`x,y`), e o duplo clique, um canto (`x,y!`). Escreve um `shape` (fechando no primeiro ponto) ou um `stroke` |
| Caneta (P) | 🆕 | clique escreve `x,y!`, arrastar escreve `x,y~dx,dy`. Para Alt quebrar a alça como no Illustrator, precisa do Bézier completo (item 3 da ordem do editor) |
| Adicionar e excluir ponto (+, −) | ✅ | a bolinha do meio do lado e o Delete de hoje, também como ferramentas |
| Ponto de ancoragem (Shift+C) | 🔶 | o duplo clique de hoje (`!`) e, arrastando o ponto, puxa as alças (o que hoje é Alt+arrastar) |
| Lápis (N) | 🆕 | o arraste vira pontos e passa pelo Simplificar (item 4 da ordem) |
| Segmento de linha (\\) | 🔶 | arrastar escreve uma `line` (Shift: de 45 em 45 graus) |
| Retângulo (M), Retângulo arredondado | 🔶 | hoje o menu de formas põe uma pronta; passa a nascer do arraste (Shift: quadrado; Alt: do centro). O losango do `r=` já existe |
| Elipse (L) | 🔶 | o mesmo, com `ellipse` |
| Polígono, Estrela | 🆕 | um `shape` com os cantos já calculados (`!`). Enquanto arrasta, ↑ e ↓ mudam o número de lados, como no Illustrator. Depois de pronto, é um `shape` comum |
| Arco, Espiral | ➖ | dá para fazer depois, como `stroke` |
| Grades, Clarão, Shaper | ➖ | |
| Pincel (B) | 🆕 | o arraste vira um `stroke` (com `w=` e `taper=` do contorno atual), simplificado |
| Pincel de bolha (Shift+B) | 🆕 | o arraste pinta uma área cheia, que se junta às formas da mesma cor que toca. Volta na etapa 5 (decisão 6), porque usa as mesmas operações entre formas da Borracha e do Pathfinder |
| Suavizar | 🆕 | o Simplificar aplicado só onde se passa o mouse |
| Borracha de caminho, Junção | 🆕 | corta um `stroke` em dois ou junta dois em um |
| Símbolos, Gráficos, Grade de perspectiva | ➖ | (os símbolos do Weasel são o `def`/`use`: seção 6) |

### 5.3 Pintura e texto

| Ferramenta | | No Weasel |
|---|---|---|
| Degradê (G) | 🔶 | o painel e as alças de hoje viram ferramenta: arrastar sobre uma forma cria um `gradient` e põe o nome no `c=` |
| Construtor de formas (Shift+M) | 🆕 | precisa de operações entre formas (unir, subtrair): seção 5.4 |
| Malha, Pintura em tempo real | ➖ | |
| Texto (T) | 🔶 | clique escreve um `text` e já abre a edição; o duplo clique para editar já existe |
| Texto de área, no caminho, verticais, Datilografia | ➖ | a linguagem não tem |

### 5.4 Modificação

| Ferramenta | | No Weasel |
|---|---|---|
| Rotação (R), Escala (S) | 🔶 | a caixa já gira e estica; a ferramenta deixa escolher o ponto de referência com um clique |
| Refletir (O) | 🔶 | espelha os pontos (como passar a caixa para o outro lado). Com Alt, pode escrever `mirror=` (a cópia espelhada viva que o Weasel já tem) |
| Distorcer (inclinar) | 🆕 | só em `shape`, `stroke` e `line` (os pontos); `ellipse` e `rect` não inclinam |
| Largura (Shift+W) | 🔶 | o `taper=` do `stroke`. A largura ponto a ponto precisaria de linguagem nova |
| Transformação livre (E) | ✅ | é a caixa de hoje |
| Distorção de marionete | ✅ | o jeito Weasel: ossos e pontos presos (`@osso`), a ferramenta Prender |
| Medida | ✅ | o Medir de hoje |
| Conta-gotas (I) | 🆕 | copia `c=`, `ink=`, `inkc=` e `opacity=` de uma forma para as escolhidas |
| Borracha (Shift+E) | 🆕 | item 7 da ordem do editor |
| Tesoura (C), Faca | 🆕 | dividem um `shape` ou um `stroke` em dois |
| Pathfinder (painel) | 🆕 | unir, subtrair, interseção e excluir **escrevendo os pontos novos**. O Weasel já tem as versões vivas: `cut=` (furo) e o `clip=` da camada (máscara) |
| Deformações (Shift+R), Alterar forma, Mesclar, Dimensão, Objetos no caminho | ➖ | |

### 5.5 O pedido das ferramentas de desenho

As cinco ferramentas da [proposta do seu irmão](proposta-melhorias-weasel-lucas.md) entram todas aqui:

| Pedido | No Illustrator | Onde entra |
|---|---|---|
| 1. Pincel de bolha (Shift+B) | Pincel de bolha (*Blob Brush*), o mesmo atalho | seção 5.2, etapa 5 (estava fora; voltou na decisão 6) |
| 2. Borracha (Shift+E) | Borracha (*Eraser*), o mesmo atalho | seção 5.4, etapa 5 |
| 3. Bézier completo | Caneta e Ponto de ancoragem | etapa 4, junto com a Caneta. É a única mudança de linguagem do pedido (seção 9) |
| 4. Simplificar pontos | Objeto › Caminho › Simplificar | etapa 4 (o Lápis e o Pincel precisam dele) e o menu Objeto › Caminho |
| 5. Vista 3D das camadas | não existe | seção 4.4, etapa 1b, a partir do protótipo dele |

O que muda em relação ao que ele escreveu:
- **Alt+arrastar num ponto** (pedido 3, item 2): ele pediu que puxasse as alças. Aqui, Alt+arrastar faz uma cópia, como no Illustrator, e as alças saem como no Illustrator: pela ferramenta Ponto de ancoragem (Shift+C) ou segurando Alt com a Caneta.
- **Alt+arrastar uma alça** (pedido 3, item 4) continua quebrando a simetria, como ele pediu. Não há conflito: a cópia vale para o ponto e para a forma, não para a alça.
- **Quais formas a borracha apaga** (pedido 2): fica como ele propôs. Apaga as escolhidas e, sem escolha, as da camada atual. É mais seguro que o Illustrator, que apaga tudo o que a borracha toca. A diferença é que "escolhidas" passa a ser a seleção do desenho, não só o painel Camadas.
- **O `--simplificar` na linha de comando** (pedido 4): não faz parte da interface, mas sai junto com o Simplificar, porque usa o mesmo código.
- **O olho na vista 3D** (pedido 5): ele perguntou se grava `hidden` ou vale só na vista. Ficou só na vista (decisão 9).

---

## 6. Os painéis

| Painel | | No Weasel |
|---|---|---|
| **Propriedades** | 🆕 | o que está escolhido, em campos: posição, tamanho e ângulo; preenchimento (`c=`), contorno (`ink=`, `inkc=`, `w=`, `cap=`, `dash=`, `taper=`), opacidade; no texto, `size=`, `font=`, `bold`, `italic` e `align=`; na camada, os efeitos. **É o item 2 da ordem do editor, que tinha sido riscado e volta na etapa 2 (decisão 2):** sem ele, o modo só desenho não funciona (não há como mudar uma cor sem digitar) |
| Camadas | 🔶 | já tem a árvore, a escolha e o olho (`hidden`). Faltam: travar, arrastar para mudar a ordem (item 6 da ordem), criar, renomear e apagar camada, levar uma forma para outra camada |
| Amostras | 🆕 | a `palette`: as cores com nome, para clicar e aplicar (item 6 da ordem). As variantes aparecem aqui também |
| Cor | 🔶 | o seletor de cor que já abre com Alt+clique num `#hex` |
| Degradê | ✅ | o painel de hoje |
| Transparência | 🆕 | `opacity=` da forma e da camada, o `blend=` da camada, e o `clip=` como máscara |
| Aparência / Efeito | 🆕 | os efeitos da camada (`blur`, `glow`, `shadow`, `tint`…). Era parte do item 5, riscado |
| Alinhar | 🆕 | alinhar e distribuir as escolhidas |
| Símbolos | 🆕 | a lista dos `def`: arrastar um para o desenho escreve um `use`; duplo clique no `use` entra no `def` (isolamento), com a prévia que já existe |
| Pranchetas | 🔶 | o `canvas` |
| Referências | ✅ | o painel de hoje (o "Colocar como modelo" do Illustrator) |
| Do Weasel, sem par no Illustrator | ✅ | player, ossos, animação, filme, linha do tempo, exportar |

---

## 7. Menus e atalhos

### 7.1 Os menus

- **Arquivo:** Novo, Abrir, exemplos, Salvar, Exportar.
- **Editar:** desfazer e refazer; recortar, copiar e colar (também na frente e atrás); apagar; preferências.
- **Objeto:**
  - Transformar (mover, girar, refletir, escala, repetir com Ctrl+D) e Organizar (Ctrl+] e Ctrl+[);
  - Agrupar, Travar e Esconder;
  - Caminho (juntar, simplificar, contorno do traço);
  - Máscara (`clip=`), Furo (`cut=`), Símbolo (`def`/`use`).
- **Texto:** fonte, tamanho e estilo.
- **Selecionar:** tudo, nada, a mesma cor, a mesma camada, inverter.
- **Efeito:** os efeitos da camada.
- **Exibir:**
  - contorno (Ctrl+Y), réguas, guias, guias inteligentes e zoom;
  - as chaves de hoje: Guias, Hitboxes, Ossos, Papel vegetal, Estilo, Trajetória, Câmera.
- **Janela:** os painéis.
- **Ajuda:** a referência da linguagem e o guia.

### 7.2 Atalhos que mudam

Os atalhos do Illustrator valem quando o foco está no desenho. No código, o editor de código continua com os dele (Ctrl+D duplica a linha, Ctrl+/ comenta…).

| Tecla | Hoje no Weasel | Proposta |
|---|---|---|
| Espaço | toca e pausa | **tocar e soltar** continua tocando; **segurar e arrastar** move a vista (como no After Effects) |
| Enter | — | toca e pausa também (como no Adobe Animate) |
| ← → | quadro anterior e seguinte | empurram o escolhido; os quadros passam para `,` e `.` (como no Animate) |
| P | Prender | Caneta. O Prender vira uma ferramenta no grupo dos ossos (letra a decidir) |
| M | Medir | Retângulo. O Medir fica sem letra, como no Illustrator |
| R | réguas | Rotação; as réguas passam para Ctrl+R |
| F | ajustar à tela | Ctrl+0 (e F troca o modo de tela, como no Illustrator) |
| Ctrl+D | duplica a linha | no desenho, repete a última transformação; copiar passa a ser Alt+arrastar ou Ctrl+C e Ctrl+F |
| Ctrl+H | esconde (`hidden`) | Ctrl+3 no desenho |
| Ctrl+I | menu de formas | a barra de ferramentas substitui o menu; o botão direito vira o menu do objeto (Agrupar, Organizar, Transformar…) |

---

## 8. Como o código fica quando o desenho é feito pela tela

O código feito pela tela tem de ser bom de ler, porque você vai abrir o arquivo depois.

- **Nomes:** automáticos, em inglês, pela palavra da linha (decisão 5): `rect1`, `ellipse2`, `shape3`, `stroke1`, `line1`, `text1`, `group1`. O número é o primeiro livre no arquivo. Renomear pelo painel Camadas (ou por Propriedades) troca o nome em todas as linhas que o usam.
- **Onde a linha entra:** na camada escolhida, no fim dela (a forma nova fica na frente). Os modos de desenho do Illustrator viram:
  - **normal:** no fim da camada (na frente);
  - **atrás:** no começo da camada;
  - **dentro:** um recorte (`clip=`) pela forma escolhida.
- **Números:** inteiros (com uma casa decimal só quando o zoom passa de 4×).
- **Cores:** se a cor está na `palette`, o nome; senão, o `#hex`. Uma forma nova recebe o preenchimento e o contorno do pé da barra de ferramentas, e só escreve `c=` e `ink=` quando forem diferentes do padrão.
- **Nunca reescrever o resto:** cada gesto troca só o pedaço da linha que mudou. Comentários, espaços e a ordem das outras linhas ficam.
- **Linhas que o desenho não mexe direto** (as "regiões travadas" do Dreamweaver). Elas aparecem e se escolhem, com um cadeado no painel Camadas:
  - **`{contas}`** na posição: mexer pede para trocar a conta pelo número;
  - **`repeat` e `include`**: mexer abre a linha certa no código;
  - **`use`**: move, gira e estica o próprio `use`; duplo clique entra no `def`;
  - **`mirror=`**: mexe na original.

  Isso já é parecido com o de hoje: o painel Camadas já deixa essas linhas paradas e apagadas.

---

## 9. O que muda na linguagem

Pouco, e nada que mude um arquivo que já existe:

| O quê | Para quê | Jogo e filme |
|---|---|---|
| `lock` em qualquer linha | Ctrl+2: o desenho não deixa escolher nem arrastar | não muda nada (só o editor lê) |
| Grupos: um bloco `group nome` … `end` dentro da camada (decisão 4) | Ctrl+G, Seleção de grupo, isolamento. O bloco só junta linhas para escolher e mover juntas | não muda a imagem |
| Alças quebradas `x,y~ax,ay~bx,by` (item 3 da ordem) | a Caneta com Alt e o Bézier completo | só muda onde for usado |

Ficam de fora: vários preenchimentos e contornos na mesma forma (a Aparência do Illustrator), a largura ponto a ponto, o texto no caminho e as várias pranchetas.

---

## 10. O que quebra (caso a caso)

1. **Espaço, setas, P, M, R, F, Ctrl+D, Ctrl+H e Ctrl+I** mudam no desenho (tabela 7.2).
2. **Arrastar no vazio (ou no meio de uma forma) deixa de mover a vista:** vira caixa de seleção ou move a forma. A vista passa a mover com Espaço+arrastar, a Mão (H) ou o botão do meio, como no Illustrator.
3. **Clicar numa forma não joga mais o foco para o código** (no Dividido, a linha só fica marcada).
4. **Alt+arrastar um ponto** deixa de puxar a alça (passa a copiar). As alças passam a sair com a ferramenta Ponto de ancoragem (Shift+C) ou com Alt na Caneta, como no Illustrator.
5. **Arrastar um ponto com a Seleção (V)** move a forma inteira; para mexer no ponto, a Seleção direta (A). O ✥ do meio sai.
6. **A chave Pontos** sai: quem mostra os pontos é a Seleção direta (A).
7. **As chaves de cima do desenho** (Guias, Hitboxes, Ossos, Papel vegetal, Estilo, Trajetória, Réguas, Câmera) vão para o menu Exibir. Os botões Medir, Prender, Camadas e Referências vão para a barra de ferramentas e para o menu Janela.
8. **O menu de formas** (Ctrl+I e botão direito) sai: as formas vêm da barra de ferramentas.
9. **Ctrl+clique** (escrever a coordenada no cursor do código) só vale no Dividido e no Código.

O Dividido pode manter um interruptor "atalhos do Weasel antigo", se você quiser os de hoje enquanto escreve código.

---

## 11. Etapas sugeridas

Cada etapa já dá para usar sozinha.

1. **A casca.** As vistas Código, Dividido e Design, a barra de menus, a barra de ferramentas e a barra de status com o caminho. Nela, as ferramentas que já existem: Seleção, Seleção direta, Texto, Retângulo, Elipse, Linha, Degradê, Medir, Prender, Mão e Zoom. Mais os atalhos novos. Quase nada novo de verdade: é o que existe, reorganizado.
   - **1b. Camadas em 3D** (seção 4.4): uma vista nova dentro da casca, com o clique levando à forma. Não depende das etapas seguintes; quando a seleção completa (etapa 3) chegar, ela passa a usar a mesma seleção.
2. **Propriedades e Amostras.** Posição, tamanho, ângulo, preenchimento, contorno, opacidade, texto e efeitos da camada. A `palette` para clicar. **É o que destrava o modo só desenho.**
3. **Seleção completa.**
   - escolher: caixa no vazio, Varinha;
   - copiar e apagar: Alt+arrastar, copiar e colar (na frente e atrás), Delete;
   - mexer e organizar: setas, Organizar (Ctrl+] e Ctrl+[), Travar, Alinhar e Grupos.
4. **Desenhar.**
   - Formas arrastando: retângulo, elipse, linha, polígono, estrela.
   - Curvatura e Caneta, com o Bézier completo (item 3 da ordem): alças quebradas, ver as automáticas e dividir sem mudar a forma. A Caneta precisa dele para quebrar a alça com Alt, então os dois vêm juntos.
   - Lápis e Pincel, com o Simplificar (item 4).
   - Conta-gotas.
5. **Caminhos.** Tesoura, Junção, Faca, Borracha (item 7), Pincel de bolha (item 8, que volta), Pathfinder e Construtor de formas (operações entre formas) e Suavizar.
6. **Símbolos e Camadas completas.** `def`/`use` como símbolos com isolamento; camadas arrastando, criar, renomear e levar formas de uma para outra.
7. **Depois:** a linha do tempo da animação (item 9 da ordem, no jeito do Adobe Animate), o filme (item 10) e o acabamento e o estilo (item 11). A vista 3D (item 13) sobe para a etapa 1b.

Esta lista substitui a "Ordem sugerida para o editor" do README (decisão 7): os itens 3, 4, 6, 7 e 9 a 13 entram nas etapas; o 2 volta (etapa 2); parte do 5 volta (efeitos, na etapa 2; luzes com alças, não); o 8 volta (etapa 5); o 12 continua fora.

### 11.1 A etapa 1 em detalhe (16/11/2026)

O que entra, e as escolhas pequenas feitas na hora (marcadas com *):
- **Vistas:** o seletor Código · Dividido · Design no alto, à direita, e no menu Exibir. A vista fica guardada neste navegador. No Design, o código fica escondido de vez; um erro aparece na barra de status, e clicar nele abre o Dividido na linha.
- **Barra de menus:** Arquivo, Editar, Objeto, Exibir, Janela e Ajuda, só com o que já funciona. Texto, Selecionar e Efeito entram quando tiverem o que fazer (etapas 2 e 3)*. Os botões de cima (Novo, Abrir, Salvar, exemplos, Referência) vão para os menus; Exportar fica à vista.
- **Barra de ferramentas:** na beirada esquerda do desenho, e não do lado do código*: no Dividido fica perto do desenho, e na vista Código some junto com ele. Tem:
  - Seleção (V): escolhe formas e mostra a caixa (mover, girar, esticar) também com uma forma só. Os pontos não aparecem;
  - Seleção direta (A): os pontos e as alças de hoje;
  - Texto (T), Retângulo (M), Elipse (L) e Linha (\\): um clique põe a forma pronta ali, como o menu de formas (arrastar para desenhar é a etapa 4). O Texto já abre a caixinha para escrever, e clicar num texto que existe edita ele;
  - Medir (sem letra), Prender (Shift+P*), Mão (H) e Zoom (Z: clique aproxima, Alt+clique afasta).
  - O Degradê (G) fica para a etapa 4*, quando arrastar sobre uma forma criar o `gradient`. Até lá, o painel do gradiente continua abrindo sozinho.
- **Escolher no desenho não leva mais o foco para o código.** No Dividido, o código vai até a linha e marca, mas as teclas continuam no desenho. Os nomes de quem vai para o código (o nome no painel do gradiente, na prévia do def, nas referências e o erro) abrem o código de propósito.
- **Atalhos da tabela 7.2:**
  - Espaço tocado toca, segurado com arraste move a vista; Enter toca;
  - `,` e `.` trocam de quadro;
  - as setas empurram a escolha 1 px (Shift: 10);
  - Ctrl+R réguas (também no código, para o navegador não recarregar a página), Ctrl+0 ajustar, Ctrl+1 100%, Ctrl+= e Ctrl+- zoom;
  - Ctrl+3 esconde; o Ctrl+H fica só no código;
  - Ctrl+D no desenho duplica a escolha, como no código, até a etapa 3 (lá vira repetir a última transformação, e copiar passa a ser Alt+arrastar ou Ctrl+C e Ctrl+F). Decidido no mesmo dia, para não perder o "escolher, Ctrl+D e arrastar a cópia" de hoje. Também está em Editar › Duplicar. O Ctrl+I sai.
  - Enquanto as ferramentas novas não chegam, as teclas que mudaram dão um aviso*: F lembra o Ctrl+0, R o Ctrl+R, P o Shift+P, e as setas sem nada escolhido lembram o `,` e o `.`.
- **O botão direito** continua abrindo o menu de formas até a etapa 4*, porque a forma livre e o traço ainda não têm ferramenta. Ele também fica no menu Objeto › Inserir.
- **Nomes em inglês** (decisão 5) já valem para o que o menu e as ferramentas põem: `rect1`, `ellipse1`, `text1`…
- **Barra de status,** embaixo de tudo: os erros, o caminho `arquivo › camada › forma › ponto` (clicar na camada escolhe ela inteira), a linha do código, as coordenadas, a variante de cores, a prévia do def e o zoom.
- **As chaves de cima do desenho** vão para o menu Exibir, e a barra delas some. Medir e Prender vão para a barra de ferramentas; Camadas, Referências e Sons, para o menu Janela.
- **Painéis:** continuam flutuando sobre o desenho. A coluna da direita (o dock) vem na etapa 2*, junto com Propriedades, para o layout ser pensado uma vez só.
- **Filme:** só as duas seleções, a Mão e o Zoom. Nas duas, as alças do filme aparecem como hoje (o filme não tem formas para escolher). Na prévia do def, a Seleção também mostra as alças, como a Seleção direta.
- **O guia e a referência do editor (F1)** mudam junto, nos trechos dos atalhos e dos botões.

**Como ficou (16/11/2026):** feita e conferida no navegador, nas três vistas, no filme e numa tela estreita. Os menus e a barra de ferramentas estão em `js/ui-menu.js` e `js/ui-shell.js`; o `app.js` expõe o que eles chamam em `W.app`. O guia, o README e a referência (F1) contam os menus, as ferramentas e os atalhos novos. A pergunta que sobrou (o Ctrl+D no desenho até a etapa 3) foi respondida no mesmo dia: ele duplica a escolha. As cópias de linhas seguidas ficam juntas, logo abaixo, e os nomes que uma usa da outra mudam junto; um Ctrl+Z desfaz tudo.

### 11.2 A etapa 1b em detalhe (16/11/2026)

Respondido por você no mesmo dia: a vista **acompanha o player** (num desenho grande, pula quadros em vez de travar), vale **só em desenhos** por enquanto (o filme fica para a etapa 7), sai **sem o estilo de arte**, e as ideias dos fantasmas e da cor do osso ficam **para depois**.

Depois disso você pediu que eu fizesse todas as etapas sozinho. As escolhas marcadas com **(R)** são minhas recomendações e esperam a sua confirmação:
- **Abrir:** **Exibir › Camadas em 3D** e um botão na barra de baixo, ao lado do zoom. Sem atalho de teclado, porque o Illustrator não tem um para isso **(R)**. A vista abre de frente, igual ao desenho, e se abre em leque em um segundo, como no protótipo **(R)**.
- **A barrinha em cima da vista:** Explodir, De frente, De lado e Juntar; os dois controles (distância entre camadas e entre formas, em pixels do desenho, até um quarto do tamanho dele); a chave Molduras e nomes; e o ✕ que volta ao desenho.
- **Ferramentas na vista:** as mesmas do filme. Com as duas seleções, clicar escolhe (Shift+clique soma ou tira) e arrastar gira. A Mão, o Espaço segurado ou o botão do meio movem. O Zoom aproxima com um clique (Alt afasta), e a roda dá zoom. As outras ferramentas somem enquanto a vista está aberta **(R)**.
- **Teclas:** Ctrl+0 volta de frente e ajusta; Ctrl+1 é 100% no meio da pilha; Ctrl+= e Ctrl+- dão zoom. As setas, o Ctrl+3, o Ctrl+D, o Ctrl+Z e o Esc fazem o mesmo que no desenho, e a vista se pinta de novo **(R)**.
- **Peças:** uma por linha do painel Camadas (um `use` é uma peça, e as linhas de um `include` também), pintada pelo `drawScene` com a camada dela (recorte, efeitos e luz como no desenho). Fica na ordem de pintura do quadro. O fundo (`bg=`) é o plano de trás.
- **Escolha:** a forma escolhida brilha em laranja. Passar o mouse acende a peça e mostra, embaixo à esquerda, a linha, o tipo, o nome e a camada. Passar o mouse numa linha ou camada do painel Camadas apaga as outras peças.
- **O olho:** fica na etiqueta de cada camada (e do fundo), ao lado do nome, e esconde só na vista. Ele dura enquanto a página estiver aberta **(R)**.
- **Nitidez:** as peças são imagens. Quando o zoom para, elas são pintadas de novo na resolução da tela.
- **O desenho de baixo** não é pintado enquanto a vista está aberta, para sobrar tempo para ela **(R)**.
- **Mistura de camadas:** o `blend=` de uma camada vira o `mix-blend-mode` das peças dela, para o Juntar ficar igual ao desenho **(R)**. As auréolas das luzes (`glow`) não aparecem na vista **(R)**.

Escolhas que apareceram durante o trabalho:
- **Explodir:** gira 45° para o lado e 18° para cima, e afasta as camadas de modo que a pilha toda tenha perto de 90% do tamanho do desenho (cada vão entre 3% e 12% dele). Num desenho de uma camada só, quem se afasta são as formas **(R)**.
- **Os nomes:** cada um no canto do papel da sua camada. Quando dois cairiam um em cima do outro, fica o mais perto de você, e os outros aparecem quando as camadas se afastam mais **(R)**. Uma camada escondida pelo olho continua com o nome (e um —), para dar para mostrar de novo.
- **A informação de baixo** fica à esquerda e anda para o lado quando o painel Camadas está aberto; a barrinha de cima também **(R)**.
- **Uma linha em duas camadas** (uma forma com `inkon=`, por exemplo) vira duas peças, e as duas brilham quando ela é escolhida.
- **Limite:** num quadro de virada (`anim … turn`), as peças mostram as partes como estão escritas, sem a virada. Fica para quando a vista chegar ao filme (etapa 7).

**Como ficou (16/11/2026):** saiu na 1.51.0, em `js/ui-3d.js`. Conferida no navegador com o cavaleiro e a coruja: abrir e fechar pelo menu, pelo botão e pelo ✕; Explodir, De frente, De lado e Juntar; os dois controles; girar arrastando, mover, a roda, Ctrl+0 e Ctrl+1; clicar escolhe a linha (e o código vai até ela); as setas mexem e a vista se pinta de novo; Ctrl+Z volta; o olho; o realce pelo painel Camadas; o player trocando de quadro; e o filme, que fecha a vista e esconde o botão. O guia (capítulo 4, na ordem de pintura), o README e a referência (F1) contam a vista.

### 11.3 A etapa 2 em detalhe (16/11/2026)

Feita sozinho, como você pediu. As escolhas marcadas com **(R)** esperam a sua confirmação:
- **A coluna da direita (o dock):** fica ao lado do desenho, com 250 px, e tem duas partes, **Propriedades** e **Amostras**, uma embaixo da outra. Cada uma abre e fecha pelo menu Janela ou pelo ✕ dela; o que fica aberto é guardado neste navegador. As duas começam abertas **(R)**. Os painéis Camadas, Referências e Sons continuam flutuando até a etapa 6 **(R)**. Numa tela estreita (até 640 px) a coluna some, para o desenho caber **(R)**. No filme ela também some: as propriedades dos atores ficam para a etapa 7 **(R)**.
- **O que o painel mostra:** a escolha da Seleção; sem escolha, a forma da linha onde o cursor está no código; numa linha `layer`, só a camada; e sem forma nenhuma, o **documento** (largura e altura do `canvas` e o `bg=`) **(R)**.
- **Transformar:** X e Y são o canto de cima à esquerda da caixa, e L e A o tamanho dela, **sem a grossura do contorno** (como no Illustrator com "usar limites de visualização" desligado) **(R)**. Esticar parte desse canto **(R)**. O elo ao lado de L e A estica sem perder a proporção; ele começa solto e fica guardado **(R)**. O ângulo de uma `ellipse`, `rect`, `text` ou `use` sozinho é o `rot=` dele; nas outras formas (e em várias juntas) não há ângulo guardado, então o campo mostra 0 e o número que você escreve é um giro em volta do meio da caixa **(R)**. Mover, esticar e girar usam o mesmo caminho das alças do desenho, então os pontos, os raios, o `size=` do texto e as linhas paradas (`hold`) se comportam igual.
- **Aparência:** preenchimento (`c=`), contorno (`inkc=`), grossura (`ink=`), largura do traço (`w=`), cantos (`r=`), afinar (`taper=`), pontas (`cap=`), tracejado (`dash=`) e opacidade. Só aparece o que todas as escolhidas aceitam. Quando elas têm valores diferentes, o campo fica vazio com "vários" **(R)**. O campo de cor tem uma lista com os nomes da `palette`, dos gradientes e dos padrões, e o quadradinho ao lado abre o seletor do sistema; se a cor escolhida for igual a uma da `palette`, o código ganha o nome e não o `#hex` (seção 8) **(R)**. Nos campos de grossura vale também um nome de largura da `palette` (`ink=line`).
- **Texto:** as letras (o que está entre aspas), o tamanho, a fonte (com a lista das quatro famílias que valem em qualquer lugar: sans-serif, serif, monospace e cursive) **(R)**, negrito, itálico e as três posições do `align=`. Alinhar à esquerda tira o `align=`, que é o padrão **(R)**.
- **Camada:** a camada da forma (a do preenchimento, se a forma tiver `inkon=`). Opacidade, mistura (`blend=`) e os oito efeitos, cada um com uma chave e os números dele. Ligar um efeito escreve um valor de partida (desfoque 4, brilho branco de raio 12, sombra preta 4,6,8, tingir laranja pela metade, claridade 1.2, saturação 1.5, contraste 1.2, matiz 30°) **(R)**. Uma camada sem linha `layer` (a automática) não tem efeitos: o painel diz para escrever `layer nome` antes das formas **(R)**. O nome da camada leva à linha dela no código.
- **Escrever:** Enter grava, Esc desfaz o que você digitou; ↑ e ↓ mudam de 1 (Shift: 10; na opacidade, 0.05) **(R)**. Arrastar o nome de um campo de número para os lados muda o valor, como no Illustrator e no After Effects **(R)**. O ↺ ao lado de um campo tira o atributo do código (volta ao padrão). Cada mudança é um Ctrl+Z, e um arraste inteiro (do nome ou do seletor de cor) também é um só. Os números saem com até 3 casas, e os da caixa com 1 **(R)**.
- **Amostras:** a `palette` em quadradinhos, na ordem do código: as variantes (um clique troca, como o seletor da barra de status), as cores, as larguras, os gradientes e os padrões. **Aplicar em** escolhe se o clique pinta o preenchimento ou o contorno; Alt+clique pinta o outro, como o X do Illustrator **(R)**. Num `stroke` ou numa `line`, a cor vai para o `c=` (a cor do traço). Uma largura vai para o `ink=` (ou o `w=` do traço). Duplo clique leva à linha da amostra no código **(R)**.
- **+ nova:** guarda na `palette` a cor do preenchimento da forma escolhida, com o nome livre seguinte (`cor1`, `cor2`…), na primeira linha `palette` (ou numa nova logo depois do `canvas`), e a forma passa a usar o nome **(R)**. Os nomes em português seguem os da `palette` dos exemplos; a decisão 5 (nomes em inglês) vale para as formas **(R)**. Se a cor já estiver lá, ele só diz o nome dela.
- **Menu Texto:** Negrito, Itálico, as três posições e Aumentar e Diminuir o tamanho (20% por vez) **(R)**. **Menu Efeito:** os oito efeitos da camada, cada um ligando e desligando com o valor de partida, e Tirar os efeitos. O menu Selecionar fica para a etapa 3.

**Como ficou (16/11/2026):** saiu na 1.52.0, em `js/ui-props.js` (o painel e as amostras), com o `app.js` dando a ele o que escreve no código: a lista do que está escolhido, a caixa, trocar atributos e chaves, trocar uma palavra e mover, esticar e girar linhas. Conferido no navegador com o cavaleiro: mover, esticar e girar pelos campos (e o Ctrl+Z de cada um); arrastar o nome de um campo; preenchimento e contorno pelo campo, pelo seletor e pelas amostras (com Alt e com Contorno marcado); uma largura da `palette`; + nova; trocar a variante; o texto, a fonte, negrito e alinhar (pelo painel e pelo menu Texto); a opacidade, a mistura e os efeitos da camada (pelo painel e pelo menu Efeito); o documento; e fechar e abrir as duas partes. O guia (capítulos 3 e 8), o README e a referência (F1) contam o painel e os menus novos.

### 11.4 A etapa 3 em detalhe (16/11/2026)

Dividi a etapa em duas **(R)**, para cada uma sair testada: a **3a** só mexe no editor (escolher, copiar, apagar, organizar, repetir); a **3b** mexe na linguagem (`lock` e `group … end`) e traz Travar, Alinhar e Grupos.

**A 3a.** As escolhas marcadas com **(R)** esperam a sua confirmação:
- **Caixa de seleção:** arrastar no vazio, com a Seleção (V) e também com a Seleção direta (A), onde ela escolhe formas inteiras e não pontos, por enquanto **(R)**. Entra a forma que a caixa toca (um pedaço do contorno dentro dela), como no Illustrator. **Shift** soma e **Alt** tira **(R)** (no Illustrator, o Shift troca: tira o que já estava). As camadas guia ficam de fora da caixa, mas o clique ainda pega uma linha guia **(R)**.
- **Clique no vazio** tira a escolha, inclusive a forma da linha do cursor, até o cursor andar no código **(R)**. O Esc faz o mesmo (no código, o Esc só solta a escolha do painel, como antes).
- **Laço (Q):** não estava na lista da etapa, mas saiu quase de graça junto com a caixa **(R)**. Entra a forma que tem um pedaço do contorno dentro do laço.
- **Varinha mágica (Y):** as formas com a **mesma cor de preenchimento**, sem tolerância; um nome da `palette` vale pela cor dele, então `c=pele` e `c=#f0c8a0` são a mesma **(R)**. As formas sem `c=` combinam entre si. Shift soma, Alt tira.
- **Menu Selecionar:** Tudo (Ctrl+A), Nada (Ctrl+Shift+A), Inverter e **A mesma** (cor de preenchimento, cor do contorno, camada). O Tudo deixa de fora as formas escondidas (`hidden`) e as das camadas guia **(R)**.
- **Copiar, recortar e colar:** o que vai para a área de transferência é o **texto das linhas**, então dá para colar no código, em outro arquivo ou em outro programa **(R)**. O desenho só cola formas (`shape`, `stroke`, `line`, `ellipse`, `rect`, `text`, `emitter`, `use`, `include`, `repeat`); o resto se cola no código **(R)**.
  - **Ctrl+V:** no fim da camada da escolha (sem escolha, a da linha do cursor; sem ela, a de cima), e as formas vão para o meio da vista, como no Illustrator **(R)**;
  - **Ctrl+F:** logo depois da última escolhida (na frente dela), no mesmo lugar; **Ctrl+B:** logo antes da primeira (atrás). Sem escolha, na frente ou atrás de tudo da camada **(R)**;
  - os nomes só ganham número quando já existe uma forma com o mesmo nome. Assim, depois de um **Ctrl+X**, colar devolve os nomes, e as `key` que usavam esses nomes voltam a valer **(R)**;
  - **Editar › Colar** (pelo menu) usa o que foi copiado no Weasel; colar o que veio de fora é pelo Ctrl+V **(R)**.
- **Delete:** com a caixa da escolha, apaga as linhas das formas; na Seleção direta, com um ponto laranja, apaga o ponto, como antes. Os comentários ficam **(R)**. Se o nome de uma forma apagada ainda aparece em outra linha (uma `key`, um `clip=`), o aviso diz onde **(R)**.
- **Organizar:** Ctrl+] sobe um passo, Ctrl+[ desce, e com Shift vai para a frente ou para trás de tudo, **dentro da camada** (como no Illustrator). A linha muda de lugar no código, e os comentários logo acima dela vão junto **(R)**; o que não é forma (um `bone`, um `anim`) fica onde estava. Uma forma de dentro de um `repeat` leva o `repeat` inteiro **(R)**. Escolhas em camadas diferentes andam cada uma na sua.
- **Ctrl+D = repetir a última transformação:** a última vez que a escolha andou, girou ou esticou (pelo desenho, pelas setas ou pelo painel Propriedades). Se ela veio de um **Alt+arrastar**, o Ctrl+D copia de novo antes: cópias em fila, com o mesmo passo, como no Illustrator. **Editar › Duplicar** continua no menu, sem atalho **(R)**; no código, o Ctrl+D continua duplicando a linha.
- **Alt+arrastar** com a Seleção (V) leva uma cópia: ela nasce logo abaixo da original no código (na frente dela) e é ela que anda; um Ctrl+Z desfaz a cópia e o arraste juntos. Na Seleção direta, Alt+arrastar um ponto continua puxando a alça da curva, até a etapa 4 trazer a ferramenta Ponto de ancoragem **(R)**.
- **Linhas de `repeat`** não se copiam nem se apagam pelo desenho (a linha de dentro vale para todas as cópias, e as contas dela usam a variável do `repeat`): o aviso manda para o código **(R)**.
- **Achado no caminho:** uma forma com `inkon=` pegava o clique pelo meio na camada do contorno (que fica por cima), e escondia o que estava embaixo, como os olhos do cavaleiro. Agora a parte do contorno só pega pela borda.

**Como ficou (16/11/2026):** a 3a saiu na 1.53.0. O que muda no código pela escolha está em `js/ui-select.js` (a Varinha, o menu Selecionar, copiar e colar, apagar, organizar); a caixa, o Laço, o Alt+arrastar e o Ctrl+D ficam no `app.js`, junto com o resto do desenho. Conferido no navegador com o cavaleiro: a caixa (com Shift e Alt), o clique no vazio, o Laço, a Varinha, Tudo, Inverter e A mesma camada; copiar e colar no meio da vista, na frente e atrás; recortar e colar de volta com os mesmos nomes; Delete (com o aviso do nome que ficou numa `key`); subir, descer, para a frente e para trás; Alt+arrastar e o Ctrl+D fazendo cópias em fila; girar e esticar pelo painel e repetir com o Ctrl+D; e o Ctrl+Z de cada um. O guia (capítulos 2 e 4), o README e a referência (F1) contam o que mudou.

**A 3b.** Trouxe `lock` e `group … end` para a linguagem (os dois só o editor lê: a imagem do jogo e do filme não muda, e os testes do jogo continuam iguais), e com eles Travar, Grupos e Alinhar. As escolhas marcadas com **(R)** esperam a sua confirmação:
- **`group nome` … `end`:** o nome é opcional no código, mas o Ctrl+G sempre escreve um (`group1`, `group2`…, decisão 5) **(R)**. O grupo fica dentro de uma camada: uma `layer` no meio dele dá erro. Pode ter outro grupo dentro e pode ficar dentro de um `def` (para quando os símbolos chegarem, na etapa 6); um `def` dentro de um grupo dá erro **(R)**. Atributos (`c=`, `opacity=`…) no grupo dão aviso: ele só junta as linhas **(R)**.
- **`lock`:** vale nas formas, no `emitter`, no `use`, no `group` (trava tudo de dentro) e na `layer` (a camada inteira) **(R)**. O `include` não aceita (trava-se pela camada) e o `ref` continua com o `lock` dele (não arrastar a imagem guia). Uma linha travada não se escolhe nem se arrasta pelo desenho, e o clique passa para o que está embaixo, como no Illustrator. No código ela continua normal; o desenho só não mostra os pontos dela **(R)**.
- **O clique da Seleção (V)** numa forma de um grupo escolhe o grupo mais de fora, inteiro (como no Illustrator). A **Seleção direta (A)** pega uma forma só. A caixa de seleção com V também pega os grupos inteiros; o Laço e a Varinha pegam formas soltas **(R)**. O cursor andando no código (o jeito do Dreamweaver) continua escolhendo só a forma da linha **(R)**.
- **A ferramenta Seleção de grupo** do Illustrator não entrou: o duplo clique (isolamento) e a Seleção direta fazem o que ela faria **(R)**.
- **Isolamento:** duplo clique numa forma de um grupo entra nele. O resto do desenho fica apagado (um véu claro por cima) e parado, e um aviso no canto diz em que grupo você está **(R)**. Dentro, o clique escolhe as formas (ou os grupos de dentro) daquele grupo, e o Ctrl+V cola dentro dele. **Esc** sai um nível por vez (de `olhos` volta para `cabeca`, depois para fora) **(R)**; um duplo clique no vazio também sai.
- **Ctrl+G** põe o `group` e o `end` em volta das escolhidas. Se elas não estavam juntas no código, vão para o lugar da de cima (a última no código, a que fica na frente), na ordem em que estavam, como no Illustrator; os comentários logo acima de cada uma vão junto, e as linhas de dentro ganham dois espaços de recuo **(R)**. **Ctrl+Shift+G** desfaz um nível de grupo e tira os dois espaços.
- **Ctrl+2** trava a escolha; num grupo escolhido inteiro, o `lock` vai na linha do `group` **(R)**. **Ctrl+Alt+2** destrava as formas, os `use` e os grupos, e deixa escolhido o que destravou (como no Illustrator); as camadas travadas ficam, porque elas se destravam pelo cadeado do painel Camadas **(R)**. As duas teclas são lidas pela posição: no teclado brasileiro, Ctrl+Alt+2 escreve ².
- **O cadeado no painel Camadas:** em cada linha e em cada camada, ao lado do olho, só aparece com o mouse em cima ou quando a linha está travada (amarelo; apagado quando quem trava é a camada ou o grupo) **(R)**. Clicar numa linha travada no painel só avisa, não escolhe.
- **Alinhar:** no menu **Objeto › Alinhar** e num grupo novo do painel Propriedades, com oito botões: à esquerda, ao centro, à direita, em cima, no meio, embaixo, e distribuir na horizontal e na vertical. Cada grupo escolhido inteiro anda junto. Com duas peças ou mais, a referência é a caixa de todas; com uma só, a prancheta (o `canvas`) **(R)**. Distribuir põe os meios à mesma distância e deixa as duas das pontas paradas; o "distribuir o espaço entre elas" ficou para depois **(R)**. Alinhar não muda o que o Ctrl+D repete **(R)**.
- **O resto da escolha com grupos:** copiar, recortar, colar, apagar, organizar, o Alt+arrastar e o Ctrl+D levam o grupo inteiro, do `group` ao `end` (a cópia ganha nomes novos, também o do grupo). Organizar com uma forma de dentro (pela Seleção direta, ou no isolamento) muda a ordem dentro do grupo.

**Como ficou (16/11/2026):** a 3b saiu na 1.54.0, e com ela a etapa 3 inteira. A linguagem (`group` e `lock`) está no `js/lang.js`; os grupos, as travas, o isolamento e o cadeado ficam no `app.js`; agrupar, travar e alinhar estão no `js/ui-select.js`, e o grupo Alinhar, no `js/ui-props.js`. Conferido no navegador com um boneco de teste (cabeça com os olhos num grupo de dentro, um braço travado): o clique e o Shift+clique no grupo, a Seleção direta, a caixa com V e com A, o Laço; o isolamento em dois níveis e o Esc; o clique passando pela forma travada e pela camada travada; Ctrl+G com formas que não estavam juntas, Ctrl+Shift+G e o Ctrl+Z dos dois; Ctrl+2 num grupo e Ctrl+Alt+2 (com o ²); o cadeado do painel; alinhar à esquerda, embaixo (com o grupo andando inteiro), na prancheta e distribuir; organizar o grupo na camada e uma forma dentro do grupo; copiar e colar o grupo (com os nomes novos), colar dentro do isolamento, apagar o grupo e o Alt+arrastar com o Ctrl+D. O guia (capítulo 4, "Grupos e travas", e a referência), o README e a referência (F1) contam o que mudou.

**A etapa 4** (desenhar arrastando, Caneta e Curvatura, Lápis, Conta-gotas, Degradê e o menu do botão direito) está na seção 11.5.

### 11.5 A etapa 4 em detalhe (16/11/2026)

Dividi a etapa em três **(R)**, para cada uma sair testada e publicada sozinha:
- **4a:** as formas arrastando (retângulo, elipse, polígono, estrela e linha), as caixinhas de preenchimento e contorno, o Conta-gotas, o Degradê e o menu do botão direito. Só mexe no editor.
- **4b:** o Bézier completo na linguagem (as alças quebradas), a Caneta, a Curvatura e o Ponto de ancoragem.
- **4c:** o Lápis e o Pincel, com o Simplificar (no menu Objeto › Caminho e no `--simplificar` da linha de comando).

**A 4a.** As escolhas marcadas com **(R)** esperam a sua confirmação:
- **Onde a forma nova entra:** na frente de tudo na camada da linha do cursor, isto é, no fim da camada (depois do grupo ou do `repeat` que a fecha) **(R)**. Sem uma forma na linha do cursor, na última camada que não é guia.
  - **Shift+D** (o "desenhar atrás" do Illustrator) põe atrás de tudo, logo depois da linha `layer`; o botão no pé da barra mostra o modo.
  - No isolamento de um grupo, a forma entra no fim do grupo (antes do `end`), com o recuo dele.
  - Uma camada ou um grupo travado não aceita formas novas, e o aviso diz por quê **(R)**.
  - Com a prévia de um `def` ligada, a forma entra na linha de baixo do cursor, nas coordenadas do `def`.
  - O "desenhar dentro" do Illustrator (a máscara) ficou de fora **(R)**.
- **Arrastar:**
  - o que cada uma escreve: o retângulo, `rect nome x,y w,h`; a elipse, `ellipse nome cx,cy r` (ou `rx,ry`); o polígono e a estrela, um `shape` com os cantos já calculados (`x,y!`); a linha, `line nome : a b`;
  - **Shift**: quadrado, círculo, de 45 em 45 graus, e o polígono e a estrela em pé, com uma ponta para cima **(R)**;
  - **Alt**: a partir do meio. O polígono e a estrela crescem sempre do meio, como no Illustrator, com o primeiro canto apontando para o mouse;
  - **↑** e **↓**, sem soltar, mudam os lados ou as pontas (de 3 a 64). O polígono começa com 6 lados e a estrela com 5 pontas, com o raio de dentro na metade do de fora **(R)**;
  - **Esc**, sem soltar, desiste;
  - um clique sem arrastar põe ali uma forma de um tamanho que cabe na vista, em vez da caixinha de números do Illustrator **(R)**.
- **As alças da forma escolhida continuam valendo** com as ferramentas de forma: apertar num quadradinho estica a forma em vez de desenhar uma nova por cima **(R)**.
- **As casas da barra:** Retângulo, Elipse, Polígono e Estrela dividem uma casa; Conta-gotas e Medir, outra, como no Illustrator **(R)**. Segurar o botão (ou o botão direito nele) abre as outras ao lado, e a casa mostra a última usada. O Degradê (G) ganhou casa própria, logo depois da Linha.
- **As caixinhas de preenchimento e contorno** ficam no pé da barra de ferramentas, como no Illustrator:
  - o preenchimento é o `c=`; o contorno, o `inkc=`; a grossura (o campo embaixo), o `ink=`;
  - na `line` e no `stroke`, o contorno é a cor do traço e a grossura é o `w=`. Se o contorno estiver vazio, a linha usa a cor do preenchimento **(R)**;
  - o contorno padrão é a cor do `ink` (a da `palette`), e aí não se escreve `inkc=` **(R)**;
  - **D** volta ao padrão: o azul `#4a90d9`, o contorno do `ink` e a grossura 4 **(R)**;
  - **elas seguem a escolha**, como no Illustrator: escolher uma forma traz a pintura dela, e mudar uma caixinha com formas escolhidas pinta as formas, num Ctrl+Z só **(R)**;
  - **X** traz a outra caixinha para a frente, **Shift+X** troca as duas cores e **/** tira a cor da da frente (sem preenchimento, sem contorno, ou `c=none` se ficarem as duas vazias) **(R)**;
  - clicar numa amostra do painel Amostras sem nada escolhido muda a caixinha **(R)**.
- **Conta-gotas (I):**
  - um clique numa forma copia o `c=`, o `ink=`, o `inkc=` e o `opacity=` dela para as escolhidas (as do painel, ou a da linha do cursor) **(R)**;
  - sem escolha, só as caixinhas pegam a pintura;
  - entre uma forma fechada e uma `line` ou um `stroke`, a cor e a grossura passam pelo papel (preenchimento ou contorno), não pelo nome do atributo **(R)**;
  - **Alt+clique** faz o contrário: pinta a forma clicada com as caixinhas **(R)**.
- **Degradê (G):** arrastar sobre a forma escolhida (ou a de baixo do mouse) escreve o começo e o fim do gradiente.
  - Se só as escolhidas usam o gradiente dela, ele muda. Se outras formas também usam, ou se ela não tem um, nasce um novo (`gradient1`), logo depois da última `palette`, `gradient` ou `pattern` **(R)**.
  - O novo vai da cor dela clareada (65% do caminho até o branco) até a própria cor **(R)**; a cópia de um gradiente dividido leva as mesmas cores.
  - **Alt** troca linear e radial (no radial, o centro fica no começo do arraste e o raio vai até o fim); **Shift** anda de 45 em 45 graus.
  - Um clique sem arrastar faz um gradiente deitado, de um lado ao outro da caixa da forma **(R)**.
  - **Esc** para o arraste e deixa o que já foi escrito **(R)**.
  - As coordenadas são as da forma (com `box`, de 0 a 1 na caixa dela).
- **O botão direito no desenho** escolhe a forma de baixo do mouse (se ela ainda não estava escolhida) e abre o menu do objeto. Ele tem os itens de Editar e Objeto que valem ali (os apagados nem aparecem) **(R)**, mais **Selecionar** e **Inserir forma**. O menu de formas antigo saiu (decisão 8): **Inserir forma** põe uma forma pronta no lugar do clique, e **Objeto › Inserir**, no meio da tela **(R)**.
- **O modo de tela F** do Illustrator ficou de fora **(R)**: a vista Design já faz esse papel.
- **Achado no caminho:** no painel Amostras, o **+ nova**, quando escrevia a primeira linha da `palette`, trocava o `c=` da linha de cima da forma, e não o da forma. Está corrigido.

**Como ficou (16/11/2026):** a 4a saiu na 1.55.0.
- As ferramentas novas e as caixinhas estão no `js/ui-draw.js`.
- O `app.js` ganhou o jeito de uma ferramenta tomar o mouse (`addTool`), o lugar das formas novas (`drawPlace`) e o menu do botão direito, que a casca (`js/ui-shell.js`) monta.
- Conferido no navegador com o cavaleiro:
  - as cinco formas arrastando, com Shift, Alt, ↑ e ↓, Esc e o clique sem arrastar;
  - desenhar atrás, a camada travada, o isolamento e o Ctrl+Z de cada uma;
  - as caixinhas (D, X, Shift+X, /, a cor e a grossura), com e sem escolha, e as amostras sem escolha;
  - o Conta-gotas nos dois sentidos;
  - o Degradê criando um gradiente, trocando para radial, copiando um gradiente dividido e avisando na camada travada;
  - o menu do botão direito, o Inserir forma no lugar do clique e as casas da barra.
- A prévia do `def` não foi conferida.
- O guia (capítulos 1, 2 e 3), o README e a referência (F1) contam o que mudou.

**A 4b.** O Bézier completo (o pedido 3 do seu irmão, seção 5.5), a Caneta, a Curvatura e o Ponto de ancoragem. As escolhas marcadas com **(R)** esperam a sua confirmação:
- **A alça quebrada na linguagem: `x,y~ax,ay~bx,by`.** A primeira é a chegada e a segunda é a saída, na ordem que ele sugeriu. As duas são a **direção em que a curva anda** (a de chegada fica atrás do ponto, em `x-ax`; a de saída, na frente, em `x+bx`) **(R)**. Assim:
  - `~d~d` é o mesmo que `~d`, e a alça de hoje não muda de sentido;
  - na mesma direção e com tamanhos diferentes, o ponto continua liso, com a volta mais longa de um lado (o caso mais comum);
  - em direções diferentes, é uma ponta curva;
  - `~0,0~b` recolhe um lado.
  - O `!` continua não indo junto com alça (uma ponta curva é `~a~b` com as duas em direções diferentes). A `line` continua sem curvas: as alças dela não aparecem.
  - Por dentro, o `tan` de sempre é a saída e o `tin` novo é a chegada. Ele foi para a curva (`geom.smoothSegs`), para os pontos presos a ossos, para o SVG e para a troca de forma (`shape=`): entre uma alça inteira e uma quebrada, a inteira vale para os dois lados. Um caso novo nos testes (`test/casos/alca_quebrada.weasel`) confere tudo isso, e a imagem do jogo continua igual nos outros.
- **As alças no desenho:**
  - cada alça aparece como dois losangos, um de cada lado do ponto, também a inteira (antes, só o da frente arrastava). Nas pontas de um traço aberto, só o lado que tem curva **(R)**;
  - arrastar um losango da alça inteira muda os dois lados (continua inteira). Na quebrada, o outro lado gira junto (sem mudar de tamanho) se os dois estavam na mesma reta, como um ponto liso do Illustrator; se não estavam, fica parado. Com **Alt**, só aquele lado anda, sempre **(R)**. **Shift** anda de 45 em 45 graus **(R)**;
  - quando os dois lados acabam iguais, escreve `~d` em vez de `~d~d` **(R)**;
  - soltar um losango em cima do ponto: na inteira, tira a alça (como antes); na quebrada, recolhe só aquele lado (`0,0`), e, se os dois ficarem recolhidos, o ponto vira canto (`!`) **(R)**;
  - duplo clique num losango da quebrada junta os dois lados com o do clique; na inteira, tira a alça, como antes **(R)**.
- **As alças automáticas (pedido 3, item 3):** num ponto liso sem `~`, as alças que o Weasel calcula aparecem clarinhas e tracejadas, só no ponto escolhido (o laranja), para não encher a tela **(R)**. Arrastar uma escreve as duas do jeito que a curva já está (`~a~b`, sem pular), e o outro lado gira junto.
- **Alt+arrastar um ponto** (Seleção direta) agora leva uma cópia da forma inteira, como no Illustrator (decidido na seção 5.5). Puxar a alça de um ponto passou para o Ponto de ancoragem.
- **Ponto de ancoragem (Shift+C):** arrastar um ponto puxa uma alça inteira nova; arrastar um losango mexe só naquele lado. O clique num ponto **troca** canto e liso **(R)**: no Illustrator ele só vira canto, mas no Weasel o liso automático é o normal, então a volta também precisa de um clique.
- **Caneta (P):**
  - o clique põe um canto (`x,y!`); apertar e arrastar puxa uma alça inteira (o arraste é a saída); o **Alt** no meio do arraste quebra a alça (daí em diante, só a de saída anda), como no Illustrator;
  - **Shift**: o ponto e a alça de 45 em 45 graus;
  - clicar no primeiro ponto (com 3 ou mais) fecha um `shape`; arrastar ali deixa o primeiro ponto liso (com Alt, só a alça de chegada muda);
  - **Enter** ou **Esc** termina um `stroke` (o Esc guarda o caminho, como no Illustrator de hoje) **(R)**; **Backspace** tira o último ponto **(R)**; trocar de ferramenta também termina **(R)**;
  - a linha só é escrita no fim, inteira, e um Ctrl+Z a tira **(R)**. Enquanto isso, o caminho aparece na tela, com o próximo trecho até o mouse;
  - o primeiro ponto tira a escolha, para as alças da forma de antes não atrapalharem **(R)**;
  - nas pontas de um traço aberto, o `!` e o lado de fora da alça não mudam nada, e não são escritos **(R)**;
  - a cor vem das caixinhas (o `shape` com o preenchimento e o contorno; o `stroke` com o contorno e a grossura), e os nomes são `shape1`, `stroke1`… (decisão 5);
  - ficaram de fora: continuar um traço aberto que já existe e o + e o − da Caneta em cima de um caminho (a bolinha do meio e o Delete fazem isso) **(R)**.
- **Curvatura (Shift+~):** cada clique põe um ponto liso, e a curva automática já passa pelo mouse enquanto você anda. O duplo clique ou o Alt+clique põe um canto. Apertar e arrastar leva o ponto novo. O fim é como na Caneta. No teclado brasileiro, o ~ é uma tecla morta: a tecla do ~ (com ou sem Shift) escolhe a Curvatura **(R)**. Mexer nos pontos de antes sem trocar de ferramenta (como no Illustrator) ficou de fora **(R)**.
- **Uma casa só** para Caneta, Curvatura e Ponto de ancoragem, logo depois do Laço **(R)** (no Illustrator, a Curvatura tem casa própria).
- **Ponto novo sem mudar o desenho (pedido 3, item 6):** a bolinha do meio de um lado curvo divide a curva exatamente no meio (De Casteljau). O ponto novo e os dois vizinhos ganham as alças de como a curva estava, com uma casa decimal **(R)**. O erro fica abaixo de 0,1 pixel, só do arredondamento. Num lado reto (entre dois cantos) e na `line`, entra solto, como antes.
- **Dobrar o lado direto** (pedido 3, item 5, opcional) ficou para depois **(R)**.
- Girar, esticar, espelhar e o painel Propriedades levam as duas alças juntas.

**Como ficou (16/11/2026):** a 4b saiu na 1.56.0.
- A linguagem está em `js/lang.js` (`parsePoint`), `js/geom.js` e `js/scene.js`; as alças no desenho, o Ponto de ancoragem e o ponto novo, no `app.js`.
- A Caneta e a Curvatura estão no `js/ui-pen.js`.
- Conferido no navegador:
  - arrastar uma alça automática (com e sem Alt), um lado da quebrada (o outro girando junto) e a inteira, e o duplo clique juntando e tirando;
  - o Alt+arrastar copiando a forma, com um Ctrl+Z só;
  - o ponto novo em nove lados, de traço, de forma fechada e no lado que fecha a volta, medindo a curva antes e depois;
  - o Ponto de ancoragem (clique, puxar, quebrar);
  - a Caneta (canto, alça, Alt, fechar, terminar com Enter) e a Curvatura (liso, duplo clique, Alt+clique, Backspace, Esc, fechar);
  - as teclas P, Shift+C, Shift+~ e a tecla morta;
  - girar e espelhar uma alça quebrada.
- O guia (capítulo 2, "Alça quebrada", e a referência), o README e a referência (F1) contam o que mudou.

**A 4c** (o Lápis, o Pincel e o Simplificar) vem em seguida.

### Como ficaria por dentro

- O `app.js` tem perto de 4.700 linhas. As partes novas entram em arquivos próprios (`js/ui-*.js`: seleção, ferramentas, painéis, menus), cada uma com a sua tag no `index.html`. A linha de comando não usa nada disso, então o `cli/runtime.js` não muda.
- Cada ferramenta é um objeto com a letra, o cursor e o que fazer ao apertar, arrastar e soltar. A barra de ferramentas e os atalhos saem da mesma lista.
- Uma camada única para escrever no código, usada por tudo: trocar um atributo, trocar os pontos, pôr uma linha, apagar linhas, mudar linhas de lugar. Ela garante um Ctrl+Z por gesto.
- Os testes do jogo (`npm test` e `--strict`) continuam valendo e não mudam, porque nada disso toca na linguagem nem na exportação. O editor se confere no navegador.

---

## 12. Decisões (16/11/2026)

1. **Vistas:** as três, Código, Dividido e Design. O Design esconde o código de vez.
2. **Propriedades (item 2):** volta, na etapa 2, junto com Amostras.
3. **Atalhos:** os do Illustrator no desenho, com as trocas da tabela 7.2.
4. **Grupos:** o bloco `group nome` … `end` (opção A). Só o editor usa; a imagem não muda.
5. **Nomes automáticos:** em inglês, pela palavra da linha (`rect1`, `ellipse2`, `shape3`), sem perguntar.
6. **Pincel de bolha:** volta, na etapa 5, com a Borracha e as operações entre formas.
7. **Ordem das etapas:** a da seção 11 (1, 1b, 2, 3, 4, 5, 6).
8. **Camadas em 3D:** dentro do editor, pintada pelo próprio Weasel e montada com CSS 3D (sem three.js), logo depois da etapa 1.
9. **O olho na vista 3D:** esconde só na vista. O olho do painel Camadas continua escrevendo `hidden`.
