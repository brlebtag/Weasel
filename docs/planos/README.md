# Planos de melhorias

Esta pasta guarda propostas de melhorias. Cada arquivo explica uma ideia:
- o que muda no Weasel;
- o que muda no jogo (Godot);
- as recomendações que já foram dadas;
- o que falta decidir.

Nada aqui é documentação do Weasel. O guia fica em [docs/guia](../guia/README.md), e os testes não leem esta pasta.

Antes de fazer qualquer item, a proposta é explicada de novo, e o trabalho só começa com o seu "pode fazer".

## Ainda abertos

| Plano | Em uma frase | Situação |
|---|---|---|
| [Bocas por texto](bocas-por-texto.md) | você digita uma frase, em português ou inglês, e o personagem fala (pedido do seu irmão, para o storyboard) | proposta de 12/11/2026, ampliada para inglês em 13/11; esperando você ler o capítulo de filme |
| [Limpeza da linguagem](limpeza-da-linguagem.md) | tirar o `finish inner=`, trocar nomes que confundem, componentes isolados | esperando você |
| [Desempenho](desempenho.md) | imagens, vídeos e sons mais rápidos: o que a análise de 15/11/2026 achou, o que já foi feito e o que falta | itens 1 a 4 na 1.48.1, item 6 na 1.48.2, item 5b na 1.48.3, item 7a na 1.48.4, item 8 na 1.48.5, item 5a na 1.48.6, itens 7d e 7e na 1.48.7 e item 7b na 1.48.8; 8b não ajuda, 2b e 7c ficaram de lado; nada aberto |

### Ordem sugerida para o editor (editor visual e ferramentas de desenho)

**Substituída em 16/11/2026** pelas etapas da [interface no jeito do Illustrator](interface-illustrator.md) (seção 11). A tabela fica como registro; a coluna "Situação" diz onde cada item entrou. Com a etapa 7c (1.64.0), todos os itens que não ficaram fora estão feitos.

| # | O quê | Plano | Situação |
|---|---|---|---|
| 1 | Player: um botão que alterna entre repetir e tocar uma vez; ao escolher a animação, ele segue o `once`/`loop` dela. Só para ver: não escreve no código | editor visual, item 1 | ✅ 1.49.0 |
| 2 | Painel de propriedades da linha (a base dos outros painéis) | editor visual, item 2 | ✅ 1.52.0 (riscado e depois de volta: etapa 2 da interface) |
| 3 | Bézier completo (alças quebradas, ver as automáticas, dividir sem mudar a forma) | ferramentas, item 3 | ✅ 1.56.0 (etapa 4b, com a Caneta; dobrar o lado direto ficou para depois) |
| 4 | Simplificar pontos | ferramentas, item 4 | ✅ 1.57.0 (etapa 4c, com o Lápis e o Pincel; o `--simplify` na linha de comando) |
| 5 | ~~Luzes com alças e efeitos da camada~~ | editor visual, itens 6 e 4 | ➖ as luzes com alças continuam fora; os efeitos voltaram na 1.52.0 (etapa 2) |
| 6 | Ordem das camadas arrastando, e paleta | editor visual, itens 5 e 3 | ✅ paleta 1.52.0 (Amostras); camadas arrastando 1.60.0 (etapa 6a) |
| 7 | Borracha (Shift+E) | ferramentas, item 2 | ✅ 1.58.0 (etapa 5a; um buraco vira `cut=`) |
| 8 | Pincel de bolha (Shift+B) | ferramentas, item 1 | ✅ 1.58.0 (riscado e depois de volta: etapa 5a da interface) |
| 9 | Linha do tempo da animação (as `key` e o `ease`) | editor visual, item 7 | ✅ 1.62.0 (etapa 7a) |
| 10 | Filme: `at` na linha do tempo, zoom e escala com alça, transições | editor visual, item 8 | ✅ 1.63.0 (etapa 7b) |
| 11 | Acabamento e estilo de arte com prévia | editor visual, item 9 | ✅ 1.64.0 (etapa 7c) |
| 12 | ~~Emissores, caixas do jogo e exportar pelo editor~~ | editor visual, itens 10 a 12 | ➖ fora (16/11/2026) |
| 13 | Vista 3D das camadas (já existe um protótipo fora do Weasel, `weasel-camadas3d`: ver a seção 4.4 da [interface no jeito do Illustrator](interface-illustrator.md)) | ferramentas, item 5 | ✅ 1.51.0 (etapa 1b) |

Por que essa ordem:
- **1:** pequeno e já pedido.
- **3 e 4:** o Bézier e o simplificar mexem nos pontos que a borracha vai criar. Fazendo antes, ela já sai com curvas boas e poucos pontos.
- **13:** a vista 3D é a maior e a que menos muda o resultado, por isso fica no fim.

Riscados em 16/11/2026 (2, 5, 8 e 12). No mesmo dia, com a interface decidida, o 2 voltou (etapa 2), os efeitos do 5 também (as luzes com alças, não) e o 8 voltou (etapa 5); o 12 continua fora.

## Já implementados

| Plano | Em uma frase | Versões |
|---|---|---|
| ✅ [Contas novas](expressoes.md) | `smoothstep`, comparações, `c ? a : b` e `mod()` dentro de `{}` | 1.38.0 |
| ✅ [Outros estilos](estilos.md) | pixel art, ASCII, esboço, marcador, lápis de cor, giz, aquarela, cel shading, HQ, recorte, vitral, massinha e outros, a partir do mesmo desenho | 1.30.0 a 1.37.0 (fases 1 a 6) |
| ✅ [Transições](transicoes.md) | de qualquer animação para qualquer outra: `blend=` no filme, peças na sprite sheet e `trocar()` no Godot | 1.40.0, 1.41.0 e 1.43.0 |
| ✅ [Ajudante do Godot](ajudante-godot.md) | `quadros()`, `fps()`, `mostrar_quadro()` e trocar de animação na mesma fase da passada | 1.42.0 |
| ✅ [Folha de conferência](folha-de-conferencia.md) | `--contact`: um PNG com o número de cada quadro | 1.44.0 |
| ✅ [Virada e metamorfose](metamorfose.md) | o personagem de lado virando de frente (`anim … turn`, jogo) e a aranha virando jacaré (`morph=`, filme) | 1.45.0 e 1.46.0 |
| ✅ [IK e pinos: o que ficou de fora](ik-e-pinos.md) | "Testar giro" no Prender (gira os ossos só na tela) e a ponta do `ik` que move o alvo (o resto saiu na revisão de 15/11/2026) | 1.47.0 |
| ✅ [Velocidade automática](velocidade-automatica.md) | `speed=auto` no filme: a animação acompanha o ator andando no palco, e os pés não escorregam | 1.48.0 |
| ✅ [Interface no jeito do Illustrator](interface-illustrator.md) | vistas Código, Dividido e Design (como no Dreamweaver), barra de ferramentas, seleção, painéis e atalhos do Illustrator, e um modo só desenho para quem não programa | 1.50.0 a 1.64.0 (etapas 1 a 7c, todas em 16/11/2026; as escolhas marcadas **(R)** esperam a sua confirmação) |
| ✅ [Editor visual](editor-visual.md) | menos código digitado: repetir ou tocar uma vez no player, painéis (propriedades, paleta, efeitos, acabamento, estilo), camadas arrastando, linha do tempo da animação e o filme pela tela | 1.49.0 e, pelas etapas da interface, 1.52.0 a 1.64.0; os itens 6, 10, 11 e 12 ficaram fora |
| ✅ [Ferramentas de desenho](proposta-melhorias-weasel-lucas.md) | pincel de bolha, borracha, Bézier completo, simplificar pontos e vista 3D das camadas (pedido de quem anima um livro) | 1.51.0, 1.56.0, 1.57.0 e 1.58.0 (etapas 1b, 4b, 4c e 5a da interface) |

A fila combinada de 10/11/2026 (ajudante do Godot, contas novas, folha de conferência e transições) está toda feita.

## O que saiu

- **Traçar uma imagem** (das antigas "ideias soltas", tirado em 15/11/2026): o traçado de verdade fica nos scripts do ForestPatrol; uma versão pequena no Weasel daria muito trabalho para pouco ganho, e nenhum personagem pediu.

## Como manter esta pasta
- Uma ideia nova ganha um arquivo aqui e uma linha em "Ainda abertos".
- Quando um plano vira versão, a linha dele passa para "Já implementados", com as versões. O commit da versão conta o que foi feito.
