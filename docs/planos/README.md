# Planos de melhorias

Esta pasta guarda propostas que **ainda não foram feitas**. Cada arquivo explica uma ideia:
- o que muda no Weasel;
- o que muda no jogo (Godot);
- as recomendações que já foram dadas;
- o que falta decidir.

Nada aqui é documentação do Weasel. O guia fica em [docs/guia](../guia/README.md), e os testes não leem esta pasta.

Antes de fazer qualquer item, a proposta é explicada de novo, e o trabalho só começa com o seu "pode fazer".

## Fila combinada (10/11/2026)

Você aprovou a análise e a ordem. Ainda falta o "pode fazer" do item 1.

| # | Plano | Em uma frase |
|---|---|---|
| 1 | [Ajudante do Godot](ajudante-godot.md) | `quadros()`, `fps()`, `mostrar_quadro()` e trocar de animação na mesma fase da passada |
| 2 | [Contas novas](expressoes.md) | `smoothstep`, comparações, `c ? a : b` e `mod()` dentro de `{}` |
| 3 | [Folha de conferência](folha-de-conferencia.md) | `--contact`: um PNG com o número de cada quadro |
| 4 | [Transições geradas](transicoes.md) | `anim para_galope from=galope to=pisca`; você decide se os quadros extras valem |

## Propostas novas

| Plano | Em uma frase | Situação |
|---|---|---|
| [Bocas por texto](bocas-por-texto.md) | você digita uma frase e o personagem fala (pedido do seu irmão, para o storyboard) | proposta de 12/11/2026; esperando você ler o capítulo de filme |
| [Outros estilos](estilos.md) | pixel art nítido, ASCII, esboço, cel shading e outros, a partir do mesmo desenho | análise e protótipos de 12/11/2026; esperando você escolher os estilos |

## Para depois

| Plano | Em uma frase | Situação |
|---|---|---|
| [IK e pinos: o que ficou de fora](ik-e-pinos.md) | sobras da 1.28.0 e ideias da pata da capivara | sem data |
| [Limpeza da linguagem](limpeza-da-linguagem.md) | tirar o `finish inner=`, trocar nomes que confundem, componentes isolados | esperando você |
| [Ideias soltas](ideias-soltas.md) | `speed=auto` no filme e traçar imagem | esperando você |

## Como manter esta pasta
- Uma ideia nova ganha um arquivo aqui e uma linha numa das tabelas.
- Quando um plano vira versão, a linha dele sai da tabela e o arquivo pode ser apagado. O git guarda o texto, e o commit da versão conta o que foi feito.
