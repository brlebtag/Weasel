# Interface no jeito do Illustrator (código e desenho, como no Dreamweaver)

**Situação:** estudo de 16/11/2026, **feito**. As 9 decisões foram tomadas no mesmo dia (seção 12), e as etapas saíram no mesmo dia: a 1 (a casca) na 1.50.0, a 1b (camadas em 3D) na 1.51.0, a 2 (Propriedades e Amostras) na 1.52.0, a 3a (escolher, copiar, apagar e organizar) na 1.53.0, a 3b (travar, alinhar e grupos) na 1.54.0, a 4a (formas arrastando, caixinhas de cor, Conta-gotas, Degradê e o menu do botão direito) na 1.55.0, a 4b (alça quebrada, Caneta, Curvatura e Ponto de ancoragem) na 1.56.0, a 4c (Lápis, Pincel e Simplificar) na 1.57.0, a 5a (Pathfinder, Pincel de bolha e Borracha) na 1.58.0, a 5b (Tesoura, Faca, Junção, Borracha de caminho, Suavizar e Construtor de formas) na 1.59.0, a 6a (Camadas completas) na 1.60.0, a 6b (Símbolos) na 1.61.0, a 7a (linha do tempo da animação) na 1.62.0, a 7b (o filme pela tela) na 1.63.0 e a 7c (acabamento e estilo) na 1.64.0. Você pediu que eu fizesse as outras sozinho: as escolhas que fiz sem você estão marcadas com **(R)** em cada etapa, para você confirmar.

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

**A 4c.** O Lápis, o Pincel e o Simplificar (o pedido 4 do Lucas, seção 5.5). As escolhas marcadas com **(R)** esperam a sua confirmação:
- **O Simplificar** (`js/simplify.js`: o mesmo código no menu, no Lápis, no Pincel e na linha de comando):
  - o jeito é o que o Lucas sugeriu. O Ramer–Douglas–Peucker acha os pontos que importam; a curva lisa do próprio Weasel é conferida contra a de antes, trecho a trecho e nos dois sentidos, e ganha pontos só onde o erro passa da tolerância; por fim, sai cada ponto que dá para tirar sem passar dela;
  - tirar um ponto de cada vez empaca quando os pontos estão espaçados por igual (o círculo de 16 pontos não vira o de 8). Por isso o ajuste começa de quatro RDP, do mais fino ao mais grosso, e fica o que acaba com menos pontos **(R)**;
  - numa forma que já existe, os pontos que ficam são os dela, sem mudar nada (as coordenadas, o `@osso`, as alças): o Simplificar só **tira** pontos, não inventa outros **(R)**. Assim, o "herda o osso do ponto mais perto" do pedido sai sozinho. Onde o osso muda de um ponto para o vizinho, os dois ficam **(R)**;
  - os cantos vivos ganham `!`: os pontos onde a curva desenhada vira mais de 60 graus num pedacinho de 3 tolerâncias **(R)**. Uma ponta que já era redonda continua redonda;
  - o Simplificar não escreve `~`. Os pontos são lisos (a curva automática) ou cantos; ajustar alças para economizar mais pontos ficou para depois **(R)**;
  - a `line` e o `smooth=0` (sem curvas) passam só pelo RDP;
  - ficam como estão: os pontos com `{contas}`, os membros (`limb=`) e as formas pequenas (3 pontos num `shape`, 2 num `stroke` ou numa `line`);
  - **a troca de forma:** com outro número de pontos, o `x.shape=` e o `mouth` deixam de ir ponto a ponto (viram a mistura de contornos). O editor avisa e deixa aplicar; a linha de comando pula essas formas, a não ser com `--force` **(R)**.
- **Objeto › Caminho › Simplificar…**, também no menu do botão direito **(R)**:
  - abre um painelzinho embaixo, no meio do desenho **(R)**. Nele ficam a tolerância (de 0,1 a 20 pixels do desenho, num controle que anda mais devagar perto do zero; começa em 1,5 e guarda a última) **(R)**, o "312 → 24 pontos" e os avisos;
  - a prévia mostra a forma de antes cinza (fantasma) e a nova por cima, em azul, com os pontos (quadradinho no canto, bolinha no liso);
  - **Enter** (ou o botão) aplica todas as escolhidas de uma vez, com um Ctrl+Z só; **Esc** desiste. Sem escolha, vale a linha do cursor;
  - mexer no código com o painel aberto fecha o painel sem mudar nada **(R)**.
- **Lápis (N):**
  - o arraste vira um `stroke` com a cor e a grossura das caixinhas, simplificado com 2 pixels **da tela** de tolerância. A fidelidade não tem controle por enquanto; o Simplificar tira mais depois **(R)**;
  - terminando a menos de 12 pixels do começo, fecha um `shape`, com o preenchimento e o contorno, como a Caneta fechando **(R)**;
  - um clique sem arrastar não escreve nada. Enquanto arrasta, o traço segue o mouse com a cor e a grossura de verdade;
  - continuar um traço que já existe e o Alt (que no Illustrator vira a Suavizar) ficaram de fora **(R)**.
- **Pincel (B):** o mesmo arraste, sempre um `stroke` (não fecha), com a grossura da caixinha e `taper=0.15,0.3`: afina 15% no começo e 30% no fim, como uma pincelada **(R)**. Um anel no mouse mostra a grossura. A pressão da caneta (mesa digitalizadora) ainda não muda nada **(R)**.
- **[ e ]**, no Pincel e no Lápis, mudam a grossura da caixinha (de 1 em 1 até 10, de 2 em 2 até 30, de 5 em 5 depois), sem mexer nas formas escolhidas **(R)**.
- **Duas casas novas** na barra, depois da Linha: o Pincel e o Lápis, como no Illustrator **(R)**. Na etapa 5, o Pincel de bolha entra na casa do Pincel, e a Suavizar, a Borracha de caminho e a Junção, na do Lápis.
- **Na linha de comando:** `--simplify 1.5`, em inglês como as outras opções (o pedido falava em `--simplificar`) **(R)**.
  - Grava `arquivo_simples.weasel` ao lado do arquivo, ou o `-o`, que precisa ser `.weasel`. Com `-e` ou a entrada padrão, escreve na saída padrão.
  - Diz, forma a forma, quantos pontos havia e quantos ficaram.
  - Nunca grava em cima do arquivo de entrada (a não ser com `--force`) e confere que o código novo não ganhou erros **(R)**.
  - Mexe só nas linhas do próprio arquivo, não nas de um `include`.

**Como ficou (16/11/2026):** a 4c saiu na 1.57.0, e com ela a etapa 4 inteira.
- O Simplificar está no `js/simplify.js`, no navegador e na linha de comando. O Lápis, o Pincel e o painel estão no `js/ui-pencil.js`; o `--simplify`, no `cli/weasel.js`.
- Um teste novo (`_simplificar`) confere que a conta de cada trecho é a mesma do desenho, mede o afastamento de cada forma simplificada (sempre dentro da tolerância) e guarda os resultados. O círculo de 120 pontos fica com 8; a estrela de 300 pontos, com 10 cantos; o feijão de 600, com 19.
- Conferido no navegador:
  - o painel (a prévia, o Enter aplicando três formas com um Ctrl+Z só, o Esc, o código mudando por fora, o aviso da troca de forma);
  - o menu Objeto › Caminho e o do botão direito;
  - o Lápis (um S aberto e uma volta fechada, que virou um `shape` de 4 cantos);
  - o Pincel (o `taper=`, o `[` e o `]`, o anel no mouse).
- O guia (capítulo 2, "Menos pontos: Simplificar", e a referência), o README e a referência (F1) contam o que mudou.

### 11.6 A etapa 5 em detalhe (16/11/2026)

A etapa 5 ficou grande, então quebrei em duas **(R)**:
- **5a:** as operações entre formas (o núcleo), o Pathfinder, o Pincel de bolha e a Borracha;
- **5b:** Tesoura, Faca, Junção, Borracha de caminho, Suavizar e o Construtor de formas, que usam o mesmo núcleo.

**O núcleo (`js/pathops.js`).** O pedido do Lucas sugeria uma biblioteca pronta (`polygon-clipping` ou Clipper2). Fiz sem biblioteca **(R)**: o editor não baixa nada de fora, e a conta precisava de duas coisas que as bibliotecas não dão, manter os pontos que não mudaram e voltar para a curva lisa do Weasel. O jeito:
- as formas viram áreas numa grade fina (a casa tem 0,35 pixel da tela, com no máximo 3 milhões de casas), e a conta é feita casa a casa. Assim nunca sai um contorno quebrado, por mais que as formas se cruzem;
- o contorno da área que sobra é seguido e **encostado de volta nas bordas de verdade**: as retas ficam retas, e os cantos onde duas bordas se cruzam ficam no lugar exato (retângulo menos retângulo sai com os 6 cantos inteiros);
- os pontos da forma que a conta não tocou ficam iguais, com o texto deles (o `!`, as alças, o `@osso`). Os da beira da mudança ganham alças escritas **(R)**: do lado que não mudou, a de antes; do outro, a mesma direção. A curva lisa do Weasel depende dos vizinhos, e sem isso a mudança puxava a forma toda, ponto a ponto;
- a curva nova passa pelo Simplificar, com meio pixel da tela de tolerância **(R)**;
- a borda que vem do rastro redondo do pincel e da borracha não é exata: fica a até um décimo de pixel **(R)**.

**Pathfinder (Objeto › Caminho):**
- Unir, Subtrair (a de trás menos as da frente, o *Menos frente* do Illustrator), Interseção e Excluir **(R: os nomes)**;
- valem para `shape`, `rect` e `ellipse` escolhidos, na mesma camada **(R)**. O resultado fica na linha da forma de cima (no Subtrair, na de trás), como no Illustrator, e as outras saem;
- pedaços soltos viram `nome_1`, `nome_2`…, e os buracos, `cut=` (como na Borracha, abaixo).

**Pincel de bolha (Shift+B),** na casa do Pincel:
- a cor é a da caixinha do preenchimento (sem preenchimento, a do contorno) **(R)**. Com uma forma escolhida, as caixinhas já trazem a cor dela: é o "a cor da forma da linha do cursor" do pedido;
- junta com as formas que ele toca (ou encosta) **com o mesmo `c=` escrito, na camada onde se desenha** **(R)**. O resultado fica na de cima, e as outras saem;
- sem forma para juntar, nasce um `shape` só com `c=` (sem contorno, como no Illustrator) **(R)**, no lugar onde as formas desenhadas nascem (na frente da camada), e não "logo abaixo da linha do cursor", como no pedido **(R)**, para ficar igual às outras ferramentas de desenho;
- o `bone=` da forma do cursor não passa para a forma nova **(R)**: as outras ferramentas de desenho também não fazem isso, e numa pose animada os pontos sairiam no lugar errado.

**Borracha (Shift+E),** numa casa nova, onde a Tesoura e a Faca entram na 5b:
- apaga das escolhidas; sem escolha, das formas da camada do cursor, como o Lucas propôs (fora as escondidas e as travadas);
- o pedaço maior fica com o nome, e os outros entram logo abaixo como `nome_1`, `nome_2`…; a forma que some inteira sai do código;
- **um buraco no meio vira `cut=`** **(R)** (o pedido deixou a escolha comigo): um `shape nome_furo1 hidden` logo abaixo e o nome no `cut=`. Os furos que já existiam e não foram tocados continuam como estavam; os que a borracha juntou à borda saem, se ninguém mais usa o nome;
- num `stroke` ou numa `line`, corta pela linha do meio do traço, não pela grossura **(R)**; cada pedaço fica com o `w=` e o `taper=`;
- `rect` e `ellipse` tocados viram `shape`, com aviso, como o pedido sugeria.

**Os dois:**
- `[` e `]` mudam o tamanho (o diâmetro, no desenho, começando em 16) **(R)**. O tamanho só vale até fechar o editor: não fica guardado **(R)**;
- **Esc** no meio do arraste desiste, e um Ctrl+Z desfaz o gesto inteiro;
- ficam de fora, com aviso: formas de `repeat`, com `{contas}`, membros (`limb=`), camadas em 3D (`yaw=`, `pitch=`) e formas dobradas pelos ossos na pose de agora **(R)**. Na prévia de um componente (`def`), as três ferramentas pedem para sair dela **(R)**.

**Um conserto de passagem:** colar (Ctrl+V) uma forma no fim do arquivo comia a última letra do código (desde a 1.53.0). O mesmo erro aparecia aqui; consertei nos dois lugares.

**Como ficou (16/11/2026):** a 5a saiu na 1.58.0.
- O núcleo está no `js/pathops.js` (também na linha de comando, para o teste); as ferramentas, no `js/ui-paths.js`.
- Um teste novo (`_caminhos`) confere a área de cada conta contra a geometria (menos de 1% de diferença), os cantos exatos e que os pontos não tocados ficam.
- Conferido no navegador:
  - as quatro contas do Pathfinder, com Ctrl+Z;
  - o Pincel de bolha juntando (a forma verde ganhou um rabo) e nascendo sozinho;
  - a Borracha cortando um retângulo em dois, abrindo um furo, juntando dois furos, virando mordida e cortando um `stroke` e uma `ellipse`;
  - `[`, `]`, Esc e os atalhos Shift+B e Shift+E.
- O guia (capítulo 2, "Juntar e apagar áreas"), o README e a referência (F1) contam o que mudou.

**A 5b (16/11/2026).** As seis ferramentas que faltavam. Três delas cortam e juntam traços **no lugar exato**, sem a grade: os pedaços saem das próprias cúbicas, divididas no ponto (De Casteljau). Assim a curva que fica é a mesma de antes, e só os pontos da beira do corte ganham as alças escritas **(R)**. Cada ponto é escrito do jeito mais simples que dá a mesma curva: o texto de antes, um canto (`!`), um ponto liso ou, só se precisar, as alças (`~`).

**Tesoura (C),** na casa da Borracha:
- num `stroke` ou numa `line`, um clique corta ali. O pedaço maior fica com o nome, e o outro entra logo abaixo como `nome_1` **(R: a mesma regra da Borracha)**. Perto de um ponto (3 pixels), o corte cai no próprio ponto;
- numa forma fechada, o Illustrator abre o caminho (vira um traço com preenchimento). No Weasel, um `shape` não fica aberto, então são **dois cliques na borda**, e a forma se divide em duas numa reta entre eles **(R)**. Depois do primeiro clique, uma linha tracejada mostra o corte, e Esc desiste. Os furos (`cut=`) ficam com o pedaço que passa por eles **(R)**;
- vale para as escolhidas e as formas da camada onde se desenha **(R)**.

**Faca,** na casa da Borracha, sem letra (como no Illustrator):
- o arraste corta as formas fechadas que ele atravessa de um lado ao outro: as escolhidas; sem escolha, as da camada **(R: como a Borracha)**. Um arraste que entra e para no meio da forma não corta nada;
- o arraste passa pelo Simplificar com 2 pixels de tolerância (mais liso que o Lápis) **(R)**, e o corte segue os pontos dele;
- a conta é a da grade (a faca tira uma faixa mais fina que uma casa). A borda nova sai dos próprios pontos da faca, e os dois lados do corte acham o mesmo cruzamento com a borda, pela mesma conta: os dois pedaços ficam com os mesmos pontos ali **(R)**.

**Junção,** na casa do Lápis, e **Objeto › Caminho › Juntar (Ctrl+J)**:
- a ferramenta: aperte na ponta de um `stroke` (ou `line`) e solte na ponta de outro. O menu e o Ctrl+J juntam os dois traços escolhidos, pelas pontas mais perto **(R: só dois de cada vez)**;
- pontas a até 2 pixels uma da outra viram um ponto; mais longe, uma reta liga as duas, como no Illustrator;
- fica a linha de cima, com a cor e a grossura dela, como no Pathfinder **(R)**; um `stroke` ganha de uma `line` (a curva não cabe numa `line`) **(R)**; e juntando um pedaço com o nome de origem (`s` e `s_1`), volta o nome `s` **(R)**. A linha que fica não muda de sentido, então o `taper=` continua certo;
- um `stroke` não fecha nele mesmo: juntar as duas pontas do mesmo traço só avisa **(R)**. Para uma forma fechada, existe o `shape`;
- os dois traços precisam estar na mesma camada **(R)**.

**Borracha de caminho,** na casa do Lápis:
- apaga o pedaço do traço por onde passa, com um raio fixo de 5 pixels da tela **(R)**, sem mexer no resto;
- só em `stroke` e `line` (as escolhidas; sem escolha, as da camada). Numa forma fechada, avisa para usar a Borracha (Shift+E) **(R)**. No Illustrator ela abre o caminho fechado, o que no Weasel não existe.

Junto com ela, **a Borracha (Shift+E) passou a cortar os traços do mesmo jeito, no lugar exato** **(R)**. Na 5a, o pedaço que ficava era refeito pelo Simplificar, quase igual.

**Suavizar,** na casa do Lápis:
- precisa de uma forma escolhida, como no Illustrator. Vale para `shape` e `stroke` **(R)**: o `rect` e a `ellipse` já são lisos, e a `line` é reta;
- os pontos da curva a até 12 pixels do arraste **(R)** passam por uma média ao longo da curva (três passadas de uma janela do tamanho do círculo), que entra aos poucos na beira para não fazer degrau. Depois a curva é refeita pelo Simplificar com pouco mais de 1 pixel de tolerância **(R)**;
- cada passada alisa mais e tira pontos (num zigue-zague de 9 pontos: 9, 6 e 5 em três passadas). Os pontos de fora ficam iguais, e os da beira ganham as alças, como na Borracha;
- as pontas de um traço não andam.

**Construtor de formas (Shift+M),** numa casa nova, antes do Degradê:
- precisa de duas formas fechadas ou mais escolhidas, na mesma camada (até 31) **(R)**. As **regiões** são os pedaços que as bordas separam: as casas da grade dentro das mesmas formas e ligadas entre si. O mouse acende a região debaixo dele;
- o arraste junta as regiões por onde passa numa forma só. Ela fica com a linha (o nome e a cor) da forma de cima na região onde o arraste começou, como no Illustrator **(R)**;
- **as outras formas só perdem as regiões juntadas** **(R)**. No Illustrator, todas as regiões viram formas separadas, mas assim o código fica com menos linhas, e o desenho é o mesmo;
- um clique numa região só a separa das outras. Com Alt, o arraste apaga as regiões;
- o que sobra de cada forma segue a regra da Borracha (`nome_1`, `cut=`, a forma que some sai).

**Na barra:** a Tesoura e a Faca entram na casa da Borracha. A Suavizar, a Borracha de caminho e a Junção entram na do Lápis, como já estava previsto. O Construtor de formas ganha uma casa, logo antes do Degradê **(R)**. Esc desiste no meio de qualquer uma delas.

**Como ficou (16/11/2026):** a 5b saiu na 1.59.0, e a etapa 5 está completa.
- O núcleo ganhou os caminhos exatos, a Faca e as regiões (`js/pathops.js`); as ferramentas estão no `js/ui-cut.js`.
- O teste `_caminhos` agora também confere:
  - que a Tesoura e o Juntar devolvem a curva de antes (a diferença é zero);
  - o corte exato da Borracha num traço;
  - as duas metades da Tesoura num retângulo;
  - os cantos em comum dos dois lados da Faca;
  - as áreas do Construtor de formas.
- Conferido no navegador:
  - a Tesoura num `stroke`, numa `line` e num `shape` (dois cliques);
  - o Ctrl+J e a Junção (o nome `s` volta);
  - a Faca num quadrado e num círculo;
  - a Borracha de caminho;
  - três passadas do Suavizar;
  - o Construtor separando, juntando e apagando (com Alt);
  - os atalhos C e Shift+M, as casas da barra e o Esc.
- O guia (capítulo 2, "Cortar, juntar e alisar"), o README e a referência (F1) contam o que mudou.

### 11.7 A etapa 6 em detalhe (16/11/2026)

A etapa 6 também foi dividida em duas **(R)**, como a 3, a 4 e a 5: a **6a** (Camadas completas) e a **6b** (Símbolos). As duas mexem em painéis diferentes, e cada uma já dá para usar sozinha.

**A 6a (16/11/2026): o painel Camadas completo.**
- **Na coluna da direita,** entre as Propriedades e as Amostras, como no desenho da seção 4.2 **(R)**. Ele começa aberto, como no Illustrator, e lembra se você fechou **(R)**. Numa janela estreita (até 640 px), onde a coluna some, ele continua por cima do desenho, como antes **(R)**.
- **O título de cada parte da coluna dobra e desdobra** (Propriedades, Camadas, Amostras), como os painéis do Illustrator, e isso fica guardado neste navegador **(R)**. Com as três abertas, a coluna ficava comprida demais.
- **Arrastar uma linha** muda o lugar dela no código:
  - solta entre duas linhas, entra ali;
  - solta em cima do nome de uma camada, vai para a frente dela, no fim dela, como no Illustrator **(R)**;
  - com várias escolhidas, todas vão juntas, na ordem do código, com os comentários logo acima de cada uma, como no Organizar **(R)**. Um grupo inteiro anda inteiro, e uma linha de dentro de um `repeat` leva o `repeat`.
- **Objeto › Mandar para a camada** (também no botão direito): o mesmo, pelo menu, com a lista das camadas **(R)**. O Illustrator faz isso arrastando o quadradinho da escolha no painel; o menu é mais fácil de achar.
- **Arrastar o nome de uma camada** muda a ordem das camadas. O bloco dela anda no código: os comentários de cima, a linha `layer` e as linhas até a última forma dela. O que vem depois da última forma (as `anim` no fim do arquivo, por exemplo) fica onde está **(R)**. Uma linha em branco separa o bloco das camadas vizinhas. A camada automática (o que vem antes do primeiro `layer`) fica sempre no fundo e não se arrasta **(R)**.
- **A ordem do painel é a do código:** a de cima é a de trás **(R)**. No Illustrator é o contrário (a de cima fica na frente). Mantive a do código, que é a do painel desde a etapa 1. Se o seu irmão estranhar, dá para inverter só a lista.
- **O ＋ cria uma camada:** `layer layer1` (o nome em inglês, decisão 5), logo acima da camada onde se desenha. O cursor vai para a linha dela, e ela passa a ser a camada onde se desenha **(R)**.
- **A camada onde se desenha** ganha uma barrinha laranja no nome **(R)**. É a do cursor, como desde a etapa 4a. Escolher uma forma ou clicar no nome de uma camada muda essa camada.
- **Duplo clique num nome** (da camada ou de uma linha) renomeia ali mesmo:
  - Enter grava, Esc desiste;
  - trocam a linha e as palavras que apontam para o nome no arquivo inteiro: `clip=`, `cut=`, `inkon=`, `hide=`, `show=`, `above=`, `below=`, `mirror=`, `shape=`, o `mouth`, a `key forma.prop=` e o `at` do filme;
  - um nome que outra linha também cria (dois furos com o mesmo nome) muda só na linha, e o resto fica **(R)**;
  - um nome que já aparece no arquivo não é aceito **(R)**;
  - o `use` e o `include` não têm nome (o painel avisa), e a camada automática não tem linha.
- **A lixeira** aparece com o mouse no nome de uma camada. Ela apaga a linha `layer`, as formas da camada (com os comentários de cima) e a linha em branco antes dela. As `anim`, as `key` e o resto do trecho ficam **(R)**. Se alguma linha usava o nome da camada (`clip=`…), o editor avisa, e o código mostra o erro.
- Tudo é uma edição só do código: um Ctrl+Z desfaz. Esc no meio de um arraste desiste.

**Como ficou (16/11/2026):** a 6a saiu na 1.60.0.
- O código novo está no `js/ui-layers.js`. O renomear fica no `js/app.js`, ao lado do renomear das cópias (Ctrl+D).
- Conferido no navegador:
  - arrastar linhas entre camadas, antes e depois de outra linha (com o comentário junto), e camadas antes e depois de outras;
  - o Ctrl+Z;
  - o ＋ (o cursor vai para a camada nova);
  - renomear a camada (o `clip=` acompanha), a forma (as `key` acompanham), um furo repetido (só a linha) e os nomes recusados;
  - a lixeira e o Mandar para a camada;
  - o painel dobrando e, numa janela estreita, de volta por cima do desenho.
- Não há teste automático novo: tudo isso é da página, e o `npm test` roda sem ela.
- O guia (capítulo 4), o README e a referência (F1) contam o que mudou.

**A 6b (16/11/2026): os símbolos.** No Illustrator, um desenho que se repete vira um símbolo, e cada cópia é uma instância ligada a ele. No Weasel isso já existe: o `def` é o símbolo e o `use` é a instância. A 6b dá a eles um painel e os gestos do Illustrator.
- **O painel Símbolos fica na coluna da direita,** depois das Amostras **(R)**. Ele abre e fecha pelo **Janela › Símbolos** e pelo ✕, lembra se você fechou e dobra pelo título, como as outras partes. Começa aberto **(R)**.
- **Uma miniatura por `def`,** desenhada com os valores padrão dos parâmetros (a mesma leitura da prévia), num fundo xadrez **(R)**. Um número no canto conta os `use`. Um `def` que vem de um `include` aparece em itálico e não se edita, renomeia nem apaga daqui **(R)**. As miniaturas são desenhadas uma por vez, depois de uma pausa, e só mudam quando muda uma linha de um `def`, da `palette`, de um `gradient`, de um `pattern` ou de um `let` **(R)**. Assim o painel não pesa enquanto você digita.
- **Arrastar uma miniatura para o desenho** escreve `use nome x,y` na camada onde se desenha. O `0,0` do símbolo fica onde você soltou **(R)**. **Colocar** (no painel e em **Objeto › Símbolo › Colocar**) põe no meio da vista. Esc no meio do arraste desiste.
- **Criar símbolo (F8, como no Illustrator, ou o ＋):**
  - as formas escolhidas viram `def symbol1` … `end` (o nome em inglês, decisão 5) **(R)**;
  - o `0,0` fica no meio da caixa delas, arredondado, e as formas são escritas em volta dele **(R)**. O Illustrator deixa escolher o ponto de registro; aqui ele é sempre o meio, e mudar depois é mexer nas formas dentro do símbolo;
  - no lugar da de cima fica `use symbol1 x,y`, e o desenho não muda;
  - o `def` entra logo depois do último `def` do arquivo; sem nenhum, antes da primeira camada; sem camada, logo antes do `use` **(R)**. Assim os símbolos ficam juntos no alto do arquivo, como nos exemplos do guia;
  - os comentários logo acima das formas vão junto, como no Agrupar.
- **Entrar no símbolo (isolamento):**
  - duplo clique num `use` com a Seleção, duplo clique na miniatura, **Editar** ou **Objeto › Símbolo › Editar símbolo** **(R)**;
  - o desenho mostra só o símbolo, com a prévia que já existia (cruz rosa no `0,0`, painel dos parâmetros). O cursor vai para dentro do `def`;
  - lá dentro, a escolha passou a valer como no desenho: caixa, mover, esticar, girar, as setas, apagar, agrupar, desagrupar, travar e criar outro símbolo (um dentro do outro) **(R)**. Organizar, alinhar, colar, a Varinha e os Selecionar ainda pedem para sair: eles olham as camadas do desenho, e o símbolo não tem camadas **(R)**;
  - duplo clique num `use` lá dentro entra no de dentro;
  - **Esc** (ou duplo clique no vazio, ou **Sair do símbolo**) sai um nível e escolhe de novo o `use` de onde você entrou. Se as linhas mudaram de número lá dentro, ele acha o `use` desse símbolo mais perto **(R)**. Com algo escolhido lá dentro, o Esc também sai direto, como o Esc do isolamento do Illustrator **(R)**.
- **Quebrar vínculo** (no painel e em **Objeto › Símbolo**) troca cada `use` escolhido pelas formas do `def`, que ficam escolhidas:
  - no mesmo lugar, tamanho, giro e espelho do `use` (`scale=`, `rot=`, `flip=`) **(R)**;
  - os parâmetros viram os valores do `use` (`c=c` vira a cor dele, e uma cor da `palette` que o `use` troca também), e as `{contas}` viram números **(R)**;
  - o `ink=`, o `w=`, o `thick=`, o `dash=`, o `size=` das partículas e o `z=` das formas engrossam junto com o `scale=`, como o `use` desenha. Um nome da `palette` nessas espessuras vira o número dele **(R)**;
  - o `opacity=` do `use` multiplica o de cada forma, e o `z=` dele soma no de cada uma **(R)**;
  - um nome que já existe no desenho ganha um número (`pupil_1`), como no colar **(R)**;
  - um `rect` girado dentro de um `use` esticado só para um lado vira o `rect` mais parecido, porque o `rect` não entorta (o mesmo do esticar da etapa 3) **(R)**;
  - não quebra **(R)**: um `def` com `repeat` (as cópias não viram linhas soltas), um `def` de `include`, e um `use` com `bone=`, `cloth=`, `billboard` ou `{contas}` na posição, no `scale=`, no `rot=`, no `opacity=` ou no `z=`. O editor diz por quê.
- **Renomear:** duplo clique no nome da miniatura. O renomear da 6a troca o `def` e todos os `use` dele.
- **Apagar** (no painel) apaga só um `def` sem nenhum `use`, com os comentários de cima **(R)**. Com `use`, ele avisa: apague os `use` ou quebre o vínculo antes. O Illustrator pergunta se quer quebrar ou apagar as instâncias; aqui ficou o mais seguro.
- **Menus:** **Objeto › Símbolo** (Criar símbolo, Editar símbolo, Sair do símbolo, Colocar, Quebrar vínculo), também no botão direito, e **Janela › Símbolos**.
- Tudo é uma edição só do código: um Ctrl+Z desfaz.

**Como ficou (16/11/2026):** a 6b saiu na 1.61.0, e a etapa 6 terminou.
- O código novo está no `js/ui-symbols.js`. O entrar e sair do símbolo ficam no `js/app.js`, ao lado do isolamento do grupo.
- Conferido no navegador:
  - a miniatura;
  - arrastar para o desenho;
  - o F8 fora e dentro de um símbolo, com o comentário junto;
  - o duplo clique e o Esc, também um símbolo dentro do outro;
  - mover, agrupar e apagar lá dentro, com o Ctrl+Z;
  - quebrar o vínculo de um `use` com `scale=2 rot=30` e parâmetros, e de um com `scale=1.5,2 rot=45 flip=x opacity=0.5 z=3` (as caixas antes e depois batem, a menos de 1 pixel, menos o `rect` girado do segundo, que é o mais parecido);
  - renomear, apagar (recusado com `use`; sem `use`, sai com o comentário) e os menus.
- Não há teste automático novo: tudo isso é da página, e o `npm test` roda sem ela.
- O guia (capítulo 5), o README e a referência (F1) contam o que mudou.

### 11.8 A etapa 7 em detalhe (16/11/2026)

A etapa 7 junta três itens grandes que não dependem um do outro. Ela foi quebrada em três, cada uma com a sua versão **(R)**:
- **7a. A linha do tempo da animação** (item 9): as `key`, os `event` e o `ease` no jeito do Animate.
- **7b. O filme** (item 10): as linhas `at` numa faixa por ator e uma para a câmera, as alças do `zoom=` da câmera e do `scale=`/`rot=` do ator, o seletor de transição do `shot … in=` com prévia e a lista de animações do ator.
- **7c. O acabamento e o estilo** (item 11): o `finish` com sliders e a galeria do `art` com miniaturas do desenho atual (em escala menor, porque os estilos são lentos).

#### A 7a: a linha do tempo da animação

- **Onde fica:**
  - embaixo do desenho, entre a vista e o player, num desenho com `anim` e uma delas escolhida no player **(R)**;
  - em "pose parada", ela mostra os nomes das animações, e um clique escolhe uma **(R)**;
  - o botão da linha do tempo no player (e **Exibir › Linha do tempo**) esconde e mostra, o mesmo do filme **(R)**. Antes, ele só aparecia no filme.
- **Feita à parte do `js/timeline.js` do filme** **(R)**. O plano do editor visual pedia para reaproveitar a do filme, mas ela mede em segundos e mostra blocos com duração, e a da animação mede em quadros e mostra losangos. Ficou um arquivo novo, o `js/ui-anim.js`, também num canvas, com as cores do resto.
- **As linhas** **(R)**:
  - uma por osso ou `forma.propriedade` que aparece nas `key` da animação, na ordem em que aparece no código;
  - em cima, **todas** (as `key` de cada quadro, juntas) e **eventos** (só se a animação tem `event`);
  - num quadro com duas linhas `key` para o mesmo alvo, ela mostra a última, que é a que vale.
- **O desenho** **(R)**:
  - um losango em cada `key`;
  - entre duas `key`, uma barra: roxa para osso, verde-água para propriedade e cinza para `step`, com o desenho pequeno da curva do `ease` no meio;
  - a volta do loop (da última `key` para a primeira) mais apagada; numa `once`, depois da última `key`, só um traço (parada);
  - colunas de 5 em 5, o quadro `frames` com outra cor e o depois dele apagado, e a faixa laranja no quadro do player.
- **O mouse** **(R)**:
  - um clique num losango leva o player ao quadro e o código à linha da `key`;
  - arrastar muda o quadro; **Alt** copia; **Shift** ou **Ctrl** somam e tiram; o nome da linha escolhe todas as `key` dela;
  - na régua e nos quadros vazios, clicar e arrastar levam o player;
  - a roda anda, **Ctrl**+roda dá zoom, e um duplo clique num quadro vazio volta a caber tudo.
- **O teclado** (com o foco nela) **(R)**: **Delete**, **← →** (com **Shift**, 5), **Ctrl+A**, **Esc**, e os do Animate: **F6**, **Shift+F6**, **F5** e **Shift+F5**.
- **O botão direito** abre um menu próprio, não o do desenho **(R)**: os seis `ease` com o desenho da curva (o atual marcado), e Inserir key, Limpar key do quadro, Inserir quadro, Remover quadro e Apagar.
- **Como escreve no código:**
  - mover uma `key` cuja linha tem outros alvos tira só ela para uma linha nova **(R)**. No Animate, a key é da camada; aqui, a "camada" é o alvo, e a linha `key` é só onde o código guarda;
  - uma `key` que chega a um quadro onde o mesmo alvo já tinha `key` fica, e a outra sai **(R)**, como no Animate;
  - uma linha nova entra logo antes da primeira `key` (ou `event`) de quadro maior; se já existe uma linha do mesmo quadro e do mesmo `ease`, o alvo entra nela **(R)**;
  - o `ease` vale para a linha inteira: trocar o de um alvo numa linha com outros também o tira para uma linha só dele **(R)**;
  - o F6 escreve o valor que o player mostra naquele quadro (posição e giro com uma casa, escala com três, sem os zeros do fim: `b2=40`) e herda o `ease` do trecho onde caiu **(R)**. Cores e formas (`c=`, `shape=`) ele não interpola, então não escreve e avisa **(R)**;
  - o F5 e o Shift+F5 mudam o `frames=` e levam junto as `key` e os `event` depois do quadro. O Shift+F5 num quadro com `key` recusa **(R)**: o Animate apagaria a key, e aqui seria perder código sem querer;
  - a alça do fim muda o `frames=` e leva junto as `key` do quadro `frames` (as que fecham o loop) **(R)**. Ela não deixa o fim passar para antes de uma `key` ou de um `event`;
  - depois de cada gesto, o cursor do código vai para a linha do `anim` **(R)**: numa linha `key`, o player pularia para o quadro dela (isso já existia), e o F6 seguido do Shift+F6 mexeria em quadros diferentes. Para isso, o `rewrite` do `js/ui-select.js` ganhou onde deixar o cursor;
  - com o player tocando, ela só mostra **(R)**.
- **Fora, por enquanto** **(R)**:
  - escolher arrastando uma caixa;
  - copiar e colar quadros entre animações;
  - as pastas de camadas do Animate;
  - as animações de `mix=`, `from=` e `to=` (a linha do tempo só diz que elas vêm das outras);
  - uma régua que fica parada quando a lista rola (com muitas linhas, a caixa vai até 200 px e rola inteira).

**Como ficou (16/11/2026):** a 7a saiu na 1.62.0.
- O código novo está no `js/ui-anim.js`.
- Conferido no navegador, com uma bola de dois ossos, um `event` e uma `forma.opacity`, e com o cavaleiro dos exemplos:
  - o desenho das linhas, das barras e do quadro do player;
  - o clique (o quadro e a linha do código);
  - arrastar uma `key` sozinha na linha, uma que divide a linha, a coluna inteira pela linha **todas**, e o Alt+arrastar;
  - o Delete, as setas, o Ctrl+A e o Ctrl+Z;
  - o `ease` pelo menu do botão direito;
  - o F6 numa linha e em todas, o Shift+F6, o F5 e o Shift+F5 (com a recusa num quadro com `key`);
  - a alça do fim, para mais e para menos;
  - arrastar e apagar um `event`;
  - a "pose parada", o botão que esconde e um desenho sem `anim`.
- Não há teste automático novo: tudo isso é da página, e o `npm test` roda sem ela.
- O guia (capítulo 7), o README e a referência (F1) contam o que mudou.

#### A 7b: o filme

- **As faixas dos `at`** **(R)**:
  - ficam na linha do tempo que o filme já tinha (`js/timeline.js`), entre os planos e os sons, uma por alvo: os atores na ordem em que aparecem no arquivo, depois a câmera, depois as luzes, camadas e formas;
  - cada `at` vira um losango na faixa de cada alvo dele, com uma linha clara ligando os do mesmo plano; as cores seguem as de cada coisa (ator lilás, câmera amarela, luz laranja, camada e forma verde-água);
  - só os `at` do próprio arquivo: os planos que vêm de `scene` ficam sem faixa.
- **O mouse e o teclado nas faixas** **(R)**, os mesmos da linha do tempo da animação:
  - clique vai ao momento e à linha;
  - arrastar muda o tempo; **Alt** copia; **Shift** ou **Ctrl** somam; o nome da faixa escolhe todos os dela;
  - **Ctrl+A**, **Delete**, **← →** (com **Shift**, 5) e **Esc**;
  - o botão direito abre os seis `ease`, com o texto "como o valor chega nele" (no `at`, o `ease` é da chegada), mais Ir para a linha e Apagar.
- **Como escreve no código** **(R)**:
  - o losango arrastado cai num quadro (e gruda no player e no começo dos planos), e os outros escolhidos andam o mesmo tanto, sem arredondar: um `at 4.2s` empurrado um quadro pelas setas vira `4.242s`, mas arrastado cai em `4.25s`;
  - um `at` não sai do plano dele;
  - mover só um alvo de uma linha com outros tira ele para uma linha nova, com o mesmo `ease`. O `blend=` e o `phase` vão junto com o `anim=`, e o `dur=`, o `pairs=` e o `born=` com o `morph=`;
  - um `at +0.5s` arrastado continua com `+` (com o valor novo); se ficaria negativo, vira um tempo escrito. Os `+` depois dele andam junto, e a mensagem conta quantos;
  - apagar a linha de que um `+` conta escreve o tempo nele, para ele ficar onde estava;
  - o `at` com o tempo de um marcador (`at trovao+0.3s`) recusa arrastar, com um aviso: ele anda com o marcador;
  - o mesmo alvo chegando a um tempo onde outro `at` do plano já o mudava: o que chegou fica, e o outro sai daquela linha (como na 7a);
  - uma linha nova entra antes do primeiro `at` de tempo escrito maior do mesmo plano (nunca entre um `at` e o `+` que conta dele); se já existe uma linha do mesmo tempo e do mesmo `ease`, sem `blend=` nem `dur=`, o alvo entra nela;
  - o cursor vai para a linha movida (ou para a nova). Numa linha `at`, o player vai até ela, e é isso que se quer aqui: o player mostra o momento do `at`.
- **A transição** **(R)**:
  - o botão direito num plano da linha do tempo, e a parte **Plano** do painel, mostram seis botões: **corte**, **dissolver** (`fade`), **cortina** (`wipe`), **empurrar** (`slide`), **zoom** e **íris** (os nomes em português, com o do código na dica);
  - cada um tem uma prévia pequena: o último quadro do plano anterior (ou preto, no primeiro) e o quadro deste no fim da transição, compostos pela mesma função do filme (`composeTransition`, que o `js/film.js` passou a exportar). Parada, ela mostra o meio da troca (a íris, abrindo; o corte, metade de cada lado); com o mouse em cima, ela anda;
  - o clique escreve `in=tipo,duração` (ou tira o `in=`, no corte). O campo ao lado de **Entrada** muda a duração. Sem transição, a duração começa em 0.5s, a mesma do código.
- **O painel Filme** **(R)**:
  - fica na coluna da direita, que no filme mostra só ele (no desenho, ele some). **Janela › Filme** abre e fecha, e o ✕ fecha, como as outras partes;
  - **Plano**: o nome (que leva à linha), a duração e a transição;
  - **Câmera**: `zoom=`, giro, tremor e escurecer no momento do player. O `offset=`, o `follow=`, o `lag=`, a lente e a névoa ficaram no código;
  - **Ator**: uma lista com os atores do plano; a **animação** numa lista (com "nenhuma"), velocidade (aceita `auto`), tamanho (`scale=`, um número ou `x,y`), giro, espelho, opacidade e aparece;
  - durante o play, só o título acompanha (o resto lê o quadro inteiro e ficaria pesado).
- **Onde o painel e as alças escrevem** **(R)**, a decisão mais importante desta parte:
  - com o cursor numa linha `at` do plano do player: nela, como `alvo.prop=`. Assim se anima pela tela: **+ at aqui** cria um `at` no momento do player (com a posição de agora do ator escolhido, ou o zoom da câmera) e põe o cursor nele;
  - fora de um `at`: na linha que declara o ator, ou na `camera` do plano. Se o plano não tem uma, ela nasce logo depois do `shot`;
  - se a propriedade muda num `at` antes do player, escrever na declaração não mudaria o que se vê: recusa, com um aviso que diz a linha do `at` e lembra do **+ at aqui**;
  - o topo do painel diz onde vai ("Escreve em `at 2s` linha 34"), e uma lista ao lado escolhe o `ease=` do `at`;
  - o `show` na declaração vira a palavra `hidden`; no `at`, `show=0` e `show=1`.
- **As alças no desenho** **(R)**:
  - só com a Seleção ou a Seleção direta, o player parado e o painel Filme aberto;
  - o ator escolhido ganha a caixa tracejada do que ele desenha naquele quadro (sem as camadas escondidas e as guias), com os quatro cantos para o `scale=` (a partir do ponto dele, o `origin`; **Shift** de 0.05 em 0.05) e a bolinha verde em cima para o `rot=` (**Shift** de 15 em 15 graus);
  - na vista do mundo, os quatro cantos da moldura laranja da câmera mudam o `zoom=` (para dentro aproxima). Na vista da câmera, a moldura é a tela inteira, e o zoom fica no painel;
  - clicar num ator escolhe ele (o da frente, pela profundidade). O cursor vai para a linha dele, menos quando está num `at` do plano: aí fica, para o painel continuar escrevendo no `at`;
  - um Ctrl+Z por arraste. Para isso, o `js/app.js` ganhou o `addFilmHook`, um gancho que desenha por cima e pega o aperto antes dos outros, só no filme.
- **Fora, por enquanto** **(R)**:
  - escolher losangos arrastando uma caixa;
  - arrastar um ator num momento e o `at` de posição nascer sozinho (o "auto-key" do Animate). Hoje é **+ at aqui** e depois o arraste;
  - as faixas dos planos que vêm de `scene` (abra o arquivo deles);
  - os `at` de `along=`, `expr=`, `variant=` e `morph=` no painel: eles aparecem nas faixas e arrastam, mas o painel não tem campo para eles.

**Como ficou (16/11/2026):** a 7b saiu na 1.63.0.
- O código novo está no `js/ui-film.js`. O `js/timeline.js` ganhou as faixas, e o `js/app.js` e o `js/ui-props.js` ganharam os ganchos.
- Conferido no navegador com o `filme.weasel` dos exemplos:
  - as faixas (herói, fantasma, câmera e o letreiro);
  - arrastar a câmera de uma linha com o letreiro (sai para uma linha nova), o Alt+arrastar (que tira o mesmo alvo da linha onde chegou), o Delete e o Ctrl+Z de cada gesto;
  - os `+` andando junto, e o apagar que escreve o tempo no seguinte;
  - o `ease` pelo menu;
  - a transição pelo menu e pelo painel (`in=fade,0.5s`, a duração, a íris e o corte);
  - o painel na declaração e no `at`, a recusa com aviso e o **+ at aqui**;
  - as alças do tamanho, do giro (com e sem Shift) e do zoom da câmera;
  - o painel sumindo num desenho.
- Não há teste automático novo (é tudo da página). O `npm test` e o `regress --strict` continuam iguais.
- O guia (capítulo 10, "O filme pela tela"), o README e a referência (F1) contam o que mudou.

#### A 7c: o acabamento e o estilo

- **Onde fica** **(R)**:
  - uma parte nova da coluna da direita, **Acabamento e estilo**, no desenho e no filme (no filme, ela fica junto do painel Filme);
  - **Janela › Acabamento e estilo** abre e fecha, o ✕ fecha e o título dobra, como as outras partes;
  - tem dois grupos: **Acabamento** (o `finish`) e **Estilo de arte** (o `art`). Cada título tem um botão **linha N**, que leva o código à linha.
- **O acabamento** **(R)**:
  - uma lista para o contorno (`game`: com contorno; `flat`: sem);
  - um controle deslizante, com uma caixa de número ao lado, para cada número do `finish`, nos limites da linguagem: Brilho (`bloom=`, 0 a 3), Vinheta (`vignette=`, 0 a 1), Granulado (`grain=`, 0 a 0.33), Posterizar (`posterize=`), Pixel (`pixel=`, 1 a 32) e Traço de dentro (`inner=`, 0 a 1);
  - o Posterizar vai de 0 a 32 no controle (0 desliga) e até 64 na caixa. A caixinha **só as cores da palette** escreve `posterize=palette` e trava o controle;
  - os efeitos de tela (Filme antigo, VHS, Tubo e Falha), de 0 a 1, num subgrupo que diz onde eles valem (filme, vídeo, GIF e PNG);
  - nomes em português, e o atributo do código na dica de cada linha.
- **Como o acabamento escreve** **(R)**:
  - arrastar escreve na linha `finish` uma vez por quadro da tela, com um Ctrl+Z para o arraste inteiro;
  - o valor padrão **tira** o atributo da linha (o Brilho em 0 apaga o `bloom=`), para o código ficar limpo;
  - sem a linha `finish`, ela nasce logo depois do `canvas` (num filme sem `canvas`, depois do `film`), e só quando o valor não é o padrão. O `game` sem linha não escreve nada; o `flat` entra como a segunda palavra;
  - com o player andando, o painel não escreve: um aviso pede para pausar.
- **A galeria** **(R)**:
  - 27 botões, três por linha: **nenhum** e os 26 estilos, com o nome em português e o do código na dica;
  - cada miniatura (72 por 54, e o dobro numa tela de alta densidade) é o desenho aberto, na variante, na animação e no quadro do player. No filme, é o quadro do player inteiro, com a câmera, os atores e o `finish`;
  - **o recorte**: o desenho inteiro quando cabe; num desenho maior, um pedaço do meio com até 480 pixels de largura do desenho (no filme, 720). Os estilos trabalham em casinhas do tamanho do desenho, e um desenho grande reduzido a 72 pixels deixaria todos iguais;
  - a miniatura do estilo de agora usa as opções da linha `art`; as outras, as opções padrão de cada estilo.
- **Onde as miniaturas são feitas** **(R)**:
  - cada uma custa de 100 a 400 ms, então elas saem no worker da exportação (`js/worker.js`), fora da página, e a digitação não trava;
  - a do estilo de agora sai primeiro. Um pedido novo (o código, o quadro ou a variante mudou) abandona o anterior, e as velhas ficam meio apagadas até as novas chegarem;
  - só com a parte aberta, sem dobrar e à vista na coluna (a conta é pela posição na tela: o `IntersectionObserver` não avisa com o painel escondido), meio segundo depois de o código parar de mudar, e nunca com o player andando ou durante um arraste;
  - num navegador sem worker com `OffscreenCanvas`, elas saem na página, uma de cada vez, com uma pausa entre elas.
- **O clique numa miniatura** **(R)**:
  - troca o estilo na linha `art` que existe, e ficam só as opções que valem no novo (e as de todos: `boil=`, `seed=` e `actor=`). Sem a linha, ela nasce logo depois do `finish` (senão, do `canvas`);
  - **nenhum** tira a linha. No plano de um filme, escreve `art none`, senão o plano pegaria o estilo do filme;
  - liga **Exibir › Estilo de arte**, se estava desligada, e um aviso diz o que mudou e lembra do Ctrl+Z.
- **As opções do estilo** **(R)**, embaixo das miniaturas:
  - um campo de texto para cada uma (vazio, ele mostra o padrão apagado; apagar o que tem nele tira a opção da linha);
  - uma lista para o `palette=` e o `dither=`, e uma caixinha para cada palavra (`outline`, `small`, `color`, `old`, `bw`, `frame`);
  - campos em vez de controles deslizantes, porque as opções têm formatos diferentes (`size=5,10`, `c=#cor`, `palette=pico8`).
- **No filme** **(R)**:
  - o painel muda o `art` do plano do player quando o plano tem um `art` próprio (o título diz "do plano …"); senão, o do filme todo ("do filme todo"), que nasce depois do `finish`;
  - para dar a um plano um estilo só dele, escreva `art` no bloco do `shot`: daí em diante, o painel mexe nele;
  - o `art` de uma cena (`scene`) e o de um ator (`actor=`) ficam só no código.
- **Fora, por enquanto** **(R)**:
  - controles deslizantes para as opções do `art`;
  - criar o `art` de um plano, de uma cena ou de um ator pelo painel;
  - miniaturas que andam (a animação inteira em cada estilo).

**Como ficou (16/11/2026):** a 7c saiu na 1.64.0.
- O painel está no `js/ui-style.js`. O `js/export.js` ganhou o `artTarget` (qual `art` o painel muda) e o `artThumb` (uma miniatura), a mesma conta na página e no worker; o `js/worker.js` ganhou o pedido das miniaturas. O `js/ui-props.js` e o `js/ui-shell.js` ganharam a parte nova na coluna e no menu Janela.
- Conferido no navegador:
  - no `cavaleiro.weasel`, as 27 miniaturas pelo worker (perto de 5 segundos para todas, com a página livre);
  - no `filme.weasel`, as 27 do quadro 408 (perto de 8 segundos), com o cenário, o herói, o fantasma e o lampião em cada estilo;
  - os controles do acabamento escrevendo e tirando os atributos, a linha `finish` nascendo depois do `canvas` e o Ctrl+Z de cada arraste;
  - a troca de estilo mantendo as opções que valem, o **nenhum** tirando a linha e as opções do estilo;
  - no filme, o `art` do filme todo nascendo depois do `finish`, e o de um plano (`art comic` → `art toon` → `art none`);
  - **Janela › Acabamento e estilo** abrindo e fechando, e o console sem erros.
- Não há teste automático novo (é tudo da página). O `npm test` e o `regress --strict` continuam iguais: as funções novas do `js/export.js` só rodam quando o painel pede.
- O guia (capítulo 14, "Pelo editor: Janela › Acabamento e estilo", e uma nota no `finish` do capítulo 4), o README e a referência (F1) contam o que mudou.

**Com a 7c, o plano acabou.** Todas as etapas saíram, da 1.50.0 à 1.64.0. O que ficou de fora em cada uma está no fim da seção dela, e as escolhas que fiz sem você estão marcadas com **(R)**, para você confirmar.

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
