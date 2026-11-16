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
| [Desempenho](desempenho.md) | imagens, vídeos e sons mais rápidos: o que a análise de 15/11/2026 achou, o que já foi feito e o que falta | itens 1 a 4 na 1.48.1 e item 6 na 1.48.2; o resto aberto |

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

A fila combinada de 10/11/2026 (ajudante do Godot, contas novas, folha de conferência e transições) está toda feita.

## O que saiu

- **Traçar uma imagem** (das antigas "ideias soltas", tirado em 15/11/2026): o traçado de verdade fica nos scripts do ForestPatrol; uma versão pequena no Weasel daria muito trabalho para pouco ganho, e nenhum personagem pediu.

## Como manter esta pasta
- Uma ideia nova ganha um arquivo aqui e uma linha em "Ainda abertos".
- Quando um plano vira versão, a linha dele passa para "Já implementados", com as versões. O commit da versão conta o que foi feito.
