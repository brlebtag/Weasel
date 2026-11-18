# 23. Atalhos do teclado

[← O editor](22-editor.md) · [Índice](README.md) · [Próximo: Problemas comuns →](24-problemas.md)

<!-- Esta página é escrita pelo npm run docs a partir de js/keys.js. Para mudar um atalho, mude a lista. -->

Esta é a lista de todos os atalhos do editor. No editor, a mesma lista fica em **Ajuda › Atalhos do teclado** (**Shift+F1** ou **Ctrl+?**), com uma busca em cima.

Quase todas as teclas valem com o foco no desenho: clique nele antes. Com o cursor no código, valem as do grupo Código e as marcadas "no código" ou "em qualquer lugar".

No Mac, use ⌘ no lugar de Ctrl e ⌥ (Option) no lugar de Alt, menos onde a linha diz outra coisa.

## Geral e arquivo

| Tecla | O que faz | Onde vale |
|---|---|---|
| `Ctrl+S` | salva o arquivo (baixa o .weasel) | em qualquer lugar |
| `Ctrl+O` | abre arquivos: .weasel, imagens e sons | em qualquer lugar |
| `Ctrl+E` | abre a janela Exportar | em qualquer lugar |
| `F1` | abre e fecha a referência da linguagem | em qualquer lugar |
| `Shift+F1` ou `Ctrl+?` | abre e fecha esta folha de atalhos | em qualquer lugar |
| `Esc` | fecha a referência e esta folha | em qualquer lugar |
| `Ctrl+R` | liga e desliga as réguas | em qualquer lugar, menos no filme |

## Editar

| Tecla | O que faz | Onde vale |
|---|---|---|
| `Ctrl+Z` | desfaz (no desenho, sem soltar a escolha) | no desenho e no código |
| `Ctrl+Shift+Z` ou `Ctrl+Y` | refaz | no desenho e no código |
| `Ctrl+X` | recorta as formas escolhidas | no desenho |
| `Ctrl+C` | copia as formas escolhidas | no desenho |
| `Ctrl+V` | cola no fim da camada, no meio da vista | no desenho |
| `Ctrl+F` | cola logo na frente da escolha, no mesmo lugar | no desenho |
| `Ctrl+B` | cola logo atrás da escolha, no mesmo lugar | no desenho |
| `Delete` ou `Backspace` | apaga as formas escolhidas; na Seleção direta, o ponto escolhido | no desenho |
| `Ctrl+D` ou `Ctrl+Shift+D` | repete a última transformação (mover, girar ou esticar); depois de um Alt+arrastar, faz outra cópia com o mesmo passo | no desenho (no código, duplica a linha) |
| `Ctrl+3` | esconde e mostra (hidden) as formas escolhidas ou a linha do cursor | no desenho e no código |

## Objeto e escolha

| Tecla | O que faz | Onde vale |
|---|---|---|
| `Ctrl+A` | escolhe tudo | no desenho |
| `Ctrl+Shift+A` | não escolhe nada | no desenho |
| `Esc` | tira a escolha; num grupo ou num símbolo aberto, sai dele | no desenho |
| `←` ou `→` ou `↑` ou `↓` | empurram a escolha 1 pixel | no desenho |
| `Shift+setas` | empurram a escolha 10 pixels | no desenho |
| `Ctrl+]` | sobe a escolha uma posição na camada | no desenho |
| `Ctrl+[` | desce a escolha uma posição na camada | no desenho |
| `Ctrl+Shift+]` | leva a escolha para a frente de tudo na camada | no desenho |
| `Ctrl+Shift+[` | leva a escolha para trás de tudo na camada | no desenho |
| `Ctrl+G` | agrupa as formas escolhidas (group … end) | no desenho |
| `Ctrl+Shift+G` | desfaz o grupo | no desenho |
| `Ctrl+2` | trava a escolha (lock) | no desenho |
| `Ctrl+Alt+2` | destrava tudo (menos as camadas) | no desenho |
| `Ctrl+J` | junta os dois traços escolhidos num só | no desenho |
| `F8` | faz das formas escolhidas um símbolo novo (def e use) | no desenho |

## Exibir

| Tecla | O que faz | Onde vale |
|---|---|---|
| `Ctrl+=` ou `Ctrl++` | aproxima | no desenho e no código |
| `Ctrl+-` | afasta | no desenho e no código |
| `Ctrl+0` | ajusta o desenho à tela | no desenho e no código |
| `Ctrl+1` | mostra no tamanho real (100%) | no desenho e no código |
| `roda do mouse` | aproxima e afasta no ponto do mouse | no desenho |
| `Espaço+arrastar` | move a vista, em qualquer ferramenta | no desenho |
| `botão do meio+arrastar` | move a vista | no desenho |
| `Ctrl segurado ao arrastar` | não gruda nas linhas guia | no desenho, com as réguas |
| `duplo clique no canto das réguas` | apaga todas as linhas guia | no desenho, com as réguas |

## Ferramentas

Com o foco no desenho. No filme e nas vistas em 3D, só V, A, H e Z. Polígono, Estrela, Suavizar, Borracha de caminho, Junção, Faca e Medir não têm letra.

| Tecla | O que faz | Onde vale |
|---|---|---|
| `V` | Seleção | no desenho |
| `A` | Seleção direta | no desenho |
| `Y` | Varinha mágica | no desenho |
| `Q` | Laço | no desenho |
| `P` | Caneta | no desenho |
| `Shift+~` | Curvatura (no teclado brasileiro, a tecla ~ sozinha também) | no desenho |
| `Shift+C` | Ponto de ancoragem | no desenho |
| `T` | Texto | no desenho |
| `M` | Retângulo | no desenho |
| `L` | Elipse | no desenho |
| `\` | Linha | no desenho |
| `B` | Pincel | no desenho |
| `Shift+B` | Pincel de bolha | no desenho |
| `N` | Lápis | no desenho |
| `Shift+E` | Borracha | no desenho |
| `C` | Tesoura | no desenho |
| `Shift+M` | Construtor de formas | no desenho |
| `G` | Degradê | no desenho |
| `I` | Conta-gotas | no desenho |
| `Shift+P` | Prender | no desenho |
| `H` | Mão | no desenho |
| `Z` | Zoom | no desenho |
| `segurar o botão da ferramenta` | mostra as outras ferramentas da mesma casa (o botão direito também) | na barra de ferramentas |

## Caixinhas de cor

As duas caixinhas no pé da barra de ferramentas: a cor de dentro (preenchimento) e a do contorno.

| Tecla | O que faz | Onde vale |
|---|---|---|
| `X` | troca qual caixinha fica na frente | no desenho |
| `Shift+X` | troca as duas cores | no desenho |
| `/` | tira a cor da caixinha da frente (none) | no desenho |
| `D` | volta às cores padrão | no desenho |
| `Shift+D` | liga e desliga o "desenhar atrás" (as formas novas nascem atrás de tudo) | no desenho |
| `duplo clique numa caixinha` | abre o seletor de cor | na barra de ferramentas |

## Desenho: mouse com teclas

| Tecla | O que faz | Onde vale |
|---|---|---|
| `Shift+clique` | soma ou tira uma forma da escolha | Seleção e Seleção direta |
| `arrastar no vazio` | caixa de seleção (Shift soma, Alt tira) | Seleção e Seleção direta |
| `Alt+arrastar uma forma` | leva uma cópia | Seleção |
| `clicar de novo no mesmo lugar` | pega a forma de baixo | Seleção |
| `duplo clique numa forma` | entra no grupo ou no símbolo dela; no vazio, sai | Seleção |
| `Shift ao esticar` | mantém a proporção | caixa de esticar |
| `Alt ao esticar` | estica a partir do meio | caixa de esticar |
| `Shift ao girar` | gira de 15 em 15 graus | bolinha verde de girar |
| `duplo clique na bolinha verde` | volta a rot=0 | elipse, retângulo e texto |
| `Shift+arrastar um ponto` | move a forma inteira | Seleção direta |
| `Alt+arrastar um ponto` | leva uma cópia da forma | Seleção direta |
| `Alt ao arrastar uma alça` | quebra a alça: mexe só num lado | Seleção direta |
| `duplo clique num ponto` | liga e desliga o canto (!) | Seleção direta |
| `duplo clique numa alça` | junta a alça quebrada; de novo, tira a alça | Seleção direta |
| `duplo clique nas letras` | edita o texto ali (Enter grava, Esc desiste) | texto |
| `Shift ao arrastar o quadradinho do texto` | muda o size= de 4 em 4 | texto |
| `Shift ao desenhar` | quadrado, círculo, de 45 em 45 graus, ou em pé | Retângulo, Elipse, Linha, Polígono e Estrela |
| `Alt ao desenhar` | desenha a partir do meio | Retângulo, Elipse, Linha, Polígono e Estrela |
| `↑` ou `↓` | durante o arraste, põem e tiram lados ou pontas | Polígono e Estrela |
| `Esc` | durante o arraste, desiste | ferramentas de desenhar, cortar e apagar, e o Degradê |
| `Alt no meio do arraste` | só a alça de saída anda (alça quebrada) | Caneta |
| `Shift` | o ponto novo vai de 45 em 45 graus | Caneta e Curvatura |
| `Alt+clique` ou `duplo clique` | põe um canto | Curvatura |
| `Enter` ou `Esc` | termina o traço (um stroke) | Caneta e Curvatura |
| `Backspace` ou `Delete` | tira o último ponto | Caneta e Curvatura |
| `[` ou `]` | diminuem e aumentam a grossura | Pincel e Lápis |
| `[` ou `]` | diminuem e aumentam o tamanho | Pincel de bolha e Borracha |
| `Alt ao arrastar` | apaga as regiões, em vez de juntar | Construtor de formas |
| `Alt ao arrastar` | faz o degradê redondo; com Shift, de 45 em 45 graus | Degradê |
| `Alt+clique` | pinta a forma clicada com as caixinhas de cor | Conta-gotas |
| `Shift+clique` ou `Alt+clique` | soma / tira da escolha | Varinha mágica e Laço |
| `clique` ou `Alt+clique` | aproxima / afasta | Zoom |
| `Shift ao arrastar` | mede de 45 em 45 graus | Medir |
| `clique` ou `Esc` | tira a medida | Medir |
| `clique ou caixa (Shift soma, Alt tira)` | escolhe pontos | Prender |
| `botão direito, depois 1 a 9` | prende os pontos escolhidos ao osso de número 1 a 9 | Prender |
| `Esc` | desfaz os giros de teste; de novo, solta os pontos | Prender |
| `Ctrl+clique` | escreve no código, onde está o cursor, a coordenada do lugar clicado | vistas Código e Dividido |
| `botão direito` | abre o menu da forma (copiar, organizar, agrupar, inserir forma…) | no desenho |

## Código

Com o cursor no código.

| Tecla | O que faz | Onde vale |
|---|---|---|
| `Ctrl+Espaço` (no Mac, `Ctrl+Espaço`) | abre as sugestões | no código |
| `↑` ou `↓` | andam nas sugestões | com as sugestões abertas |
| `Enter` ou `Tab` | aceita a sugestão | com as sugestões abertas |
| `Esc` | fecha as sugestões | com as sugestões abertas |
| `Tab` | escreve dois espaços | no código |
| `Ctrl+/` | comenta e descomenta as linhas | no código |
| `Ctrl+D` ou `Ctrl+Shift+D` | duplica a linha (ou as linhas), com um nome novo | no código |
| `Ctrl+H` ou `Ctrl+3` (no Mac, `Ctrl+H` ou `⌘+3`) | esconde e mostra (hidden) a linha do cursor | no código |
| `Alt+arrastar sobre um número` | muda o número (com Shift, 10 vezes mais rápido) | no código |
| `Alt+clique numa cor #hex` | abre o seletor de cor | no código |

## Animação: player e linha do tempo

As teclas F5, F6, Delete, as setas e Ctrl+A valem com o foco na linha do tempo (clique nela antes). Fora dela, o F5 recarrega a página.

| Tecla | O que faz | Onde vale |
|---|---|---|
| `Espaço` ou `Enter` | toca e pausa | no desenho |
| `,` ou `.` | vai para o quadro anterior / o seguinte (< e > também) | no desenho |
| `F6` | põe uma key no quadro do player | na linha do tempo |
| `Shift+F6` | tira as key desse quadro | na linha do tempo |
| `F5` | põe um quadro a mais | na linha do tempo |
| `Shift+F5` | tira um quadro | na linha do tempo |
| `Delete` ou `Backspace` | apaga as key e os event escolhidos | na linha do tempo |
| `←` ou `→` | empurram as key escolhidas um quadro; sem escolha, trocam de quadro | na linha do tempo |
| `Shift+← →` | empurram as key escolhidas cinco quadros | na linha do tempo |
| `Ctrl+A` | escolhe todas as key | na linha do tempo |
| `Esc` | tira a escolha | na linha do tempo |
| `Shift+clique` ou `Ctrl+clique` | soma ou tira um losango da escolha | na linha do tempo |
| `Alt+arrastar um losango` | copia a key | na linha do tempo |
| `botão direito` | abre o menu dos ease e das ações | na linha do tempo |
| `roda do mouse` | anda pela linha do tempo | na linha do tempo |
| `Ctrl+roda` | aproxima e afasta | na linha do tempo |
| `duplo clique` | volta a caber tudo | na linha do tempo |

## Filme

Num arquivo com film. As teclas da linha do tempo valem com o foco nela (clique nela antes).

| Tecla | O que faz | Onde vale |
|---|---|---|
| `Ctrl+A` | escolhe todos os at | na linha do tempo do filme |
| `Delete` ou `Backspace` | apaga os at escolhidos | na linha do tempo do filme |
| `←` ou `→` | empurram os at escolhidos um quadro (com Shift, cinco) | na linha do tempo do filme |
| `Esc` | tira a escolha | na linha do tempo do filme |
| `Shift+clique` ou `Ctrl+clique` | soma ou tira um losango da escolha | na linha do tempo do filme |
| `Shift+clique no nome da faixa` | soma todos os at da faixa | na linha do tempo do filme |
| `Alt+arrastar um losango` | copia o at | na linha do tempo do filme |
| `Alt ao arrastar um som ou uma legenda` | não gruda no player nem no começo dos planos | na linha do tempo do filme |
| `botão direito` | num losango, os ease; num plano, a transição (in=) | na linha do tempo do filme |
| `roda do mouse` | anda pela linha do tempo | na linha do tempo do filme |
| `Ctrl+roda` | aproxima e afasta | na linha do tempo do filme |
| `duplo clique` | no vazio, mostra tudo; num bloco de outro arquivo, abre o arquivo | na linha do tempo do filme |
| `Shift ao arrastar as alças` | zoom de 0.1 em 0.1, scale= de 0.05 em 0.05 e rot= de 15 em 15 graus | no desenho do filme |
| `Enter` ou `Esc` | grava / desiste | nos campos do painel Filme |

## Camadas em 3D e Palco em 3D

Para entrar e sair: Exibir › Camadas em 3D (no filme, Palco em 3D) ou o botão da barra de baixo.

| Tecla | O que faz | Onde vale |
|---|---|---|
| `arrastar` | gira a vista | na vista 3D |
| `Espaço+arrastar` ou `botão do meio+arrastar` | move a vista (a Mão, H, também) | na vista 3D |
| `roda do mouse` | aproxima e afasta | na vista 3D |
| `clique numa peça` | escolhe a linha dela (no filme, o ator); com Shift, soma ou tira | na vista 3D |
| `Ctrl+0` | volta a olhar de frente (no filme, da câmera) | na vista 3D |
| `Ctrl+1` ou `Ctrl+=` ou `Ctrl+-` | tamanho real, aproxima, afasta | na vista 3D |
| `setas` ou `Ctrl+3` ou `Ctrl+D` ou `Ctrl+Z` ou `Delete` ou `Ctrl+A` ou `Ctrl+C` ou `Ctrl+V` ou `Ctrl+G` ou `Ctrl+2` | fazem o mesmo que no desenho | na vista 3D |

## Menus e painéis

| Tecla | O que faz | Onde vale |
|---|---|---|
| `↑` ou `↓` | andam nos itens | num menu aberto |
| `→` ou `←` | abre o submenu / fecha o submenu | num menu aberto |
| `Enter` ou `Espaço` | escolhe o item | num menu aberto |
| `Esc` | fecha o menu | num menu aberto |
| `Enter` ou `Esc` | grava / volta o valor de antes | nos campos de Propriedades |
| `↑` ou `↓` | mudam o número (com Shift, de 10 em 10) | nos campos de número de Propriedades |
| `arrastar o nome de um campo` | muda o número (com Shift, 10 vezes mais rápido) | Propriedades e Prévia do def |
| `Alt+clique numa amostra` | pinta a outra parte (o contorno em vez do preenchimento, ou o contrário) | Amostras |
| `duplo clique numa amostra` | leva o código à linha dela | Amostras |
| `Ctrl+clique` | soma ou tira uma linha da escolha | painel Camadas |
| `Shift+clique` | escolhe um trecho de linhas | painel Camadas |
| `Ctrl+clique no nome de uma camada` | soma ou tira todas as linhas dela | painel Camadas e barra de baixo |
| `duplo clique num nome` | renomeia (Enter grava, Esc desiste) | Camadas e Símbolos |
| `duplo clique na miniatura` | entra no símbolo | Símbolos |
| `Esc durante um arraste` | desiste do arraste | Camadas e Símbolos |
| `Enter` ou `Esc` | aplica / desiste | painel Simplificar |
| `Shift ao arrastar uma marca` | muda a posição de 0.05 em 0.05 | painel do gradiente |
| `botão direito numa marca` | tira a cor | painel do gradiente |
| `Esc` | fecha a janela | janela Exportar |

[← O editor](22-editor.md) · [Índice](README.md) · [Próximo: Problemas comuns →](24-problemas.md)
