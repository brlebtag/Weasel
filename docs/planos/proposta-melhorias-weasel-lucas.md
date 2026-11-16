# Sugestões de melhoria para o Weasel

Cinco ferramentas para o editor. Quatro vêm do Illustrator: pincel de bolha, borracha, curva de Bézier e simplificar pontos. A quinta é uma vista 3D das camadas.

## Por que estou pedindo

Uso o Weasel para animar um livro. Muitos personagens nascem de imagens vetorizadas, e esses desenhos chegam com três problemas:

- **Frestas** entre peças vizinhas, que aparecem quando o personagem se mexe.
- **Pontos demais** em cada forma, o que deixa o código pesado e difícil de ajustar à mão.
- **Formas empilhadas**: uma forma continua por baixo de outra, e é difícil enxergar quem está na frente de quem.

Hoje corrijo isso editando números no código ou com scripts. As ferramentas abaixo resolveriam direto no editor.

Todas seguem a regra do Weasel: **o código é a fonte da verdade**. O que a ferramenta fizer vira linhas no código (`shape` com pontos, `!` e `~`), e um Ctrl+Z desfaz cada gesto inteiro.

---

## 1. Pincel de bolha (Shift+B)

No Illustrator é o *Blob Brush*: você pinta com o mouse, e o rastro vira uma **forma preenchida**, não um traço. Se o rastro encosta numa forma da mesma cor, os dois **se fundem** numa forma só. É o jeito mais rápido de tapar uma fresta, engrossar uma borda ou completar um pedaço de roupa.

**Como funcionaria**
- **Shift+B** liga o pincel e **Esc** sai.
- **[** e **]** mudam o tamanho do pincel, e um círculo em volta do cursor mostra o tamanho.
- A cor é a da forma da linha do cursor. Sem forma no cursor, vale a cor escolhida na `palette`.
- Ao soltar o mouse:
  - **Se o rastro encosta numa forma da mesma cor e da mesma camada**, ela recebe a união das duas. Os pontos dela são reescritos, e o nome, o `bone=`, o `@osso` e o resto da linha continuam os mesmos.
  - **Se não encosta em nada**, entra uma linha `shape` nova logo abaixo da linha do cursor, como no Ctrl+I. Ela herda o `bone=` da forma da linha do cursor, se houver.
- O contorno resultante passa pelo **simplificador (item 4)**, para virar poucos pontos lisos com `!` só nos cantos, em vez de centenas de pontos.
- Um Ctrl+Z desfaz a pincelada inteira.

**Detalhes para decidir**
- Se a união deve valer também para formas da mesma cor em **outra camada**. Eu acho que não: a camada define a ordem de pintura.
- O que fazer com `ellipse` e `rect`. Sugiro converter para `shape` só quando o pincel tocar nelas, e avisar com um `hint`.

## 2. Borracha (Shift+E)

É o oposto do pincel. Por onde a borracha passa, ela **tira** área das formas (no Illustrator, a *Eraser Tool*).

**Como funcionaria**
- **Shift+E** liga a borracha, com o mesmo tamanho, as mesmas teclas **[** e **]** e o mesmo círculo do pincel.
- **Quais formas ela apaga:** as escolhidas no painel Camadas. Sem nada escolhido, as da camada da linha do cursor. Isso evita apagar sem querer o que está embaixo.
- **Quando a borracha corta uma forma em duas ou mais**, o pedaço maior fica com o nome e a linha originais, e os outros entram logo abaixo como `nome_1`, `nome_2`… (o mesmo padrão do Ctrl+D).
- **Quando a forma some inteira**, a linha sai do código.
- **Um furo no meio** pode virar um `cut=` (o Weasel já tem) ou ser recusado com um aviso. Fica a seu critério.
- **Num `stroke`**, a borracha corta o traço em traços separados, como no Illustrator.
- O contorno novo também passa pelo simplificador, e um Ctrl+Z desfaz o gesto inteiro.

**Sugestão para os itens 1 e 2:** as duas ferramentas são operações de união e diferença entre polígonos. Bibliotecas prontas, como `polygon-clipping` (MIT) ou Clipper2 (versão em JS), já tratam os casos difíceis (pedaços, furos, formas que se cruzam). O Weasel já achata as curvas em polígonos (`flatten` em `geom.js`), então o caminho seria: achatar, fazer a operação e depois simplificar de volta para pontos do Weasel.

## 3. Curvas de Bézier completas

O Weasel já tem a alça `x,y~dx,dy`. Ela é **simétrica**: a curva chega por um lado e sai pelo outro na mesma direção e com o mesmo tamanho. No Illustrator, cada ponto pode ter **duas alças independentes**, e isso permite curvas que o Weasel ainda não faz: uma volta curta de um lado e longa do outro, ou uma ponta curva (as duas alças em direções diferentes).

**O que falta**
1. **Alças independentes (alça quebrada):** cada lado do ponto com a sua direção e o seu tamanho. Uma sintaxe possível seria `x,y~ax,ay~bx,by` (chegada e saída), mas a escolha da notação fica com você.
2. **Puxar alças de um ponto liso:** com **Alt+arrastar** num ponto, saem as duas alças, e o ponto ganha `~`.
3. **Ver as alças automáticas:** num ponto liso sem `~`, mostrar clarinhas as alças que o Weasel calcula. Arrastar uma delas a torna explícita no código, a partir da curva que já está na tela, sem pular.
4. **Quebrar e juntar:** **Alt+arrastar** uma alça mexe só aquele lado (quebra a simetria). Um duplo clique na alça volta à alça simétrica, ou à curva automática.
5. **Dobrar o lado direto** (opcional): arrastar o meio de um trecho de curva e as alças das duas pontas se ajustarem, como na *Curvature Tool* do Illustrator.
6. **Ponto novo no meio da curva sem mudar o desenho:** hoje a bolinha do meio do lado cria um ponto liso, e a curva pode mudar um pouco. Com alças, dá para dividir o trecho exatamente (De Casteljau) e a forma ficar idêntica.

## 4. Simplificar pontos

Reduz o número de pontos de uma forma e mantém o desenho o mais parecido possível (no Illustrator, *Object › Path › Simplify*).

**Como funcionaria**
- Com o cursor numa `shape` ou num `stroke` (ou com várias escolhidas no painel Camadas), um comando **Simplificar** abre um controle de **tolerância** (o quanto a forma pode se afastar da original, em pixels).
- **Prévia ao vivo:**
  - a forma original aparece fantasma por baixo;
  - a nova aparece por cima;
  - um contador mostra quantos pontos havia antes e quantos ficaram ("312 → 24 pontos").
- **Ao confirmar**, o Weasel reescreve a linha com os pontos novos:
  - **cantos vivos** (onde a direção muda de repente) ganham `!`;
  - o resto fica liso, usando a curva automática do Weasel, ou `~` quando a curva automática não bastar.
- **O que precisa ser preservado:**
  - pontos com `@osso`: o ponto novo herda o osso do ponto original mais perto;
  - pontos usados por animação de pontos (se houver índice de ponto nas `key`): avisar antes, porque a numeração muda.
- **Também na linha de comando**, por exemplo `weasel arquivo.weasel --simplificar 1.5`, para limpar arquivos gerados por outros programas e vetorizadores.

**Sugestão de método:** primeiro Ramer–Douglas–Peucker, para achar os pontos que importam. Depois um ajuste que confere a curva lisa do próprio Weasel (`smoothSegs`) contra o contorno original e acrescenta pontos só onde o erro passa da tolerância. Assim o resultado já sai no "jeito Weasel" de desenhar, com poucos pontos.

## 5. Vista 3D das camadas

Um modo de ver o desenho "explodido": cada camada num plano 3D, uma atrás da outra, com uma distância fixa entre elas. Dá para girar a vista e enxergar o empilhamento. Serve para entender:
- quem pinta na frente de quem;
- que forma está escondida atrás de outra;
- por que um pedaço aparece onde não devia.

**Como funcionaria**
- Um botão (ou atalho) **Vista 3D** troca o desenho por essa vista. É só de leitura: não muda o código.
- **Planos:**
  - cada camada (`layer`) fica no seu plano, na ordem de pintura, a primeira no fundo;
  - um modo **"por forma"** separa também as formas dentro da camada, cada linha no seu plano, porque a ordem das linhas é a ordem de pintura;
  - cada plano mostra o nome da camada e uma moldura fina.
- **Distância entre planos:** um controle deslizante muda a distância no eixo Z, de 0 (tudo colado, igual ao 2D) até bem separado.
- **Navegação:**
  - arrastar gira a vista (para os lados e para cima e para baixo);
  - a roda do mouse dá zoom;
  - Shift+arrastar ou o botão do meio movem a vista;
  - um botão "de frente" volta à vista sem giro.
- **Mostrar e esconder:** os olhos do painel Camadas ligam e desligam cada camada ou forma nesta vista. Uma opção decide se isso também grava `hidden` no código ou vale só na vista 3D.
- **Ligação com o código:** passar o mouse destaca a forma, e clicar leva o cursor à linha dela, como no desenho normal.
- **Respeita o quadro atual:** com uma animação escolhida, a vista mostra a pose daquele quadro.

**Sugestão de implementação:**
- O mais simples é desenhar cada camada (ou forma) num canvas próprio e empilhar os canvas com CSS 3D (`perspective` no contêiner, `translateZ(i × distância)` em cada canvas e `rotateX` / `rotateY` para girar). O navegador faz o 3D, rápido, sem WebGL.
- O Weasel já tem o 2.5D (`z=`, `yaw=`, `pitch=`, `persp=`), que também pode servir de base.
