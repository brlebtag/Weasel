# Editor visual: menos código digitado, mais arrastar e painéis

**Situação:** proposta de 16/11/2026. O item 1 saiu na 1.49.0. Os itens 2, 4, 6, 10, 11 e 12 ficaram fora por enquanto (decisão de 16/11/2026). A ordem do resto fica no [README desta pasta](README.md).

A ideia: o Weasel continua sendo código. Cada painel ou alça só **reescreve a linha** que está no código, como já fazem o editor de degradê e as alças dos pontos. Nada fica escondido fora do texto, e cada gesto vira um Ctrl+Z.

Legenda: ⬜ falta fazer · 🔶 em parte (ou falta o commit) · ✅ feito · ➖ fora por enquanto

## O que já existe (para reaproveitar)

- **Alças no desenho** (`rec.handles` em `lang.js`, desenho e arrastar em `app.js` `drawHandles` e `pointerdown`): pontos, curvas, tamanho de `ellipse`/`rect`, `rot=`, pivô de osso, pé do `ik`, `light=`, posição de `light`, `box`, `point`, ator e câmera do filme.
- **Painel do degradê** (`#gradPanel`, `fillGradPanel`): barra de paradas que se arrastam, seletor de cor, opacidade. É o modelo para os painéis novos.
- **Posar arrastando os ossos**, que escreve as `key`.
- **Linha do tempo do filme**, que arrasta `shot dur=`, `audio`, `sub` e `mark`.
- **Painel de camadas**, que esconde (`hidden`) e escolhe formas para mover juntas.

## Resumo

| # | Melhoria | Tipo | Situação |
|---|---|---|---|
| 1 | Player: repetir ou tocar uma vez | botão no player | ✅ 1.49.0 |
| 2 | Painel de propriedades da linha (cores, números, palavras) | painel | ➖ |
| 3 | Paleta com amostras e seletores | painel | ⬜ |
| 4 | Efeitos da camada (opacity, blur, glow, shadow, tint…) | painel + alças | ➖ |
| 5 | Ordem das camadas arrastando | arrastar no painel de camadas | ⬜ |
| 6 | Luzes: raio, cone, mira e brilho | alças no desenho | ➖ |
| 7 | Linha do tempo da animação (as `key`, com easing) | tela nova | ⬜ |
| 8 | Filme: linhas `at` na linha do tempo, zoom e escala com alça, transições | linha do tempo + alças | ⬜ |
| 9 | Acabamento (`finish`) e estilo de arte (`art`) | painel com prévia | ⬜ |
| 10 | Emissores: área, ângulo e espalhamento | alças + painel | ➖ |
| 11 | Jogo: tamanho e tipo de `box`, `point` | alças | ➖ |
| 12 | Exportar pelo editor (folha, GIF, Godot) | tela | ➖ |

## Os itens

### ✅ 1. Player: repetir ou tocar uma vez (1.49.0)

- **Antes:** o player ignorava o `once`. Uma anim `once` repetia igual a uma `loop`, então não dava para ver como ela termina.
- **Como ficou** (decidido em 16/11/2026: dois estados, seguindo a anim, sem escrever no código):
  - um botão ao lado do ▶ troca entre **repetir** (setas em volta) e **tocar uma vez** (seta até a barra);
  - ao escolher a anim, ele segue o `once`/`loop` dela: a `once` toca uma vez e para no último quadro, como no Godot; a de loop repete;
  - o clique vale para aquela anim até o `once`/`loop` dela mudar no código; outra anim volta a seguir o dela;
  - parada no fim, ▶ começa de novo do quadro 0; ← e → continuam dando a volta;
  - no filme, repete o trecho (o filme inteiro ou o plano), como antes, ou para no fim; o som para junto;
  - na pose parada, o botão fica desligado;
  - não escreve no código e não fica guardado: ao abrir a página, segue a anim de novo.
- **Ficou de fora:** trocar `once` ↔ `loop` no código pelo botão (clique direito).
- **Jogo:** nada muda; é só o player do editor.

### ⬜ 2. Painel de propriedades da linha

- **Hoje:** o painel do degradê só abre em `gradient`. Para mudar `c=`, `ink=`, `w=`, `opacity=`, `taper=`, `dash=` de uma forma, é preciso digitar.
- **Proposta:** com o cursor numa linha, um painel mostra os atributos dela, pela lista `ATTRS` de `lang.js`:
  - cor → seletor + lista das cores da paleta;
  - número → campo que se arrasta (como no painel do def) e slider quando há faixa conhecida;
  - palavras soltas (`closed`, `hidden`, `bold`…) → chaves;
  - atributo ausente → aparece apagado; mexer nele o acrescenta à linha.
- É a base dos itens 3, 4, 6, 9 e 10: cada um vira só uma lista de campos com faixas e ícones.
- **Custo:** médio; o maior trabalho é reescrever o texto da linha sem estragar a formatação.

### ⬜ 3. Paleta

- `palette nome=valor …` hoje é só texto. Painel com as amostras: clicar abre o seletor, arrastar uma amostra para uma forma escreve `c=nome`.
- Mostra onde cada cor é usada (clicar leva às linhas).

### ⬜ 4. Efeitos da camada

- `layer … opacity blur glow shadow tint brightness saturate contrast hue blend clip` com sliders e prévia ao vivo.
- `shadow` com alça no desenho para o deslocamento (dx, dy).
- `depth`, `yaw`, `pitch` com sliders.

### ⬜ 5. Ordem das camadas arrastando

- No painel de camadas, arrastar uma camada para cima ou para baixo move as linhas no arquivo (ou escreve `above=`/`below=` quando a camada vem de outro arquivo).
- Arrastar uma forma para outra camada move a linha para dentro dela.

### ⬜ 6. Luzes com alças

- `point`: círculo do `radius=` e do `glow=` arrastáveis.
- `spot`: alças do `aim=` (direção) e do `cone=` (abertura).
- `power`, `flicker`, `c=` no painel do item 2. `ambient` também.

### ⬜ 7. Linha do tempo da animação

- **Hoje:** só se cria uma `key` posando o osso; para mover uma `key` no tempo ou mudar o `ease`, é digitar.
- **Proposta:** com uma anim escolhida, uma faixa embaixo do player com um losango por `key` (uma linha por osso):
  - arrastar o losango muda o quadro da `key`;
  - Alt+arrastar duplica; Delete apaga;
  - clique direito escolhe o `ease` com um desenho da curva;
  - arrastar a ponta da faixa muda `frames=`.
- Reaproveita `js/timeline.js` do filme.
- **Custo:** grande, mas é o que mais tira código das animações.

### ⬜ 8. Filme

- As linhas `at 1.5s …` como marcas na linha do tempo, uma faixa por ator e uma para a câmera. Arrastar muda o tempo.
- Alças de `zoom=` da câmera (um retângulo do enquadramento) e de `scale=`/`rot=` do ator.
- Seletor de transição do `shot … in=` com prévia pequena.
- Lista de animações do ator no painel (troca `anim=`).

### ⬜ 9. Acabamento e estilo de arte

- `finish` (`bloom`, `vignette`, `grain`, `posterize`, `crt`, `vhs`…) com sliders.
- `art`: galeria com miniaturas de cada estilo no desenho atual; escolher escreve `art <estilo>`; depois, os parâmetros do estilo no painel (`size`, `tones`, `angle`, `paper`, `seed`…).
- Cuidado: os estilos custam 100–700 ms por quadro; a prévia precisa ser em escala menor.

### ⬜ 10. Emissores

- Alças para `area=`, `angle=` e `spread=` (um leque no desenho), `gravity`/`wind` como seta.
- `shape=` como ícones; o resto no painel.

### ⬜ 11. Jogo

- `box`: alças do tamanho e do raio; tipo (`body`, `hit`, `hurt`) e forma (`rect`, `circle`, `capsule`) no painel.
- `tile`: pintar a grade de colisão clicando.
- **Jogo:** só muda como se escreve; o arquivo gerado é o mesmo.

### ➖ 12. Exportar pelo editor

- A proposta dizia que exportar folha, GIF e Godot era só da linha de comando. Não é: o editor já tem a tela **Exportar** (PNG, JPG, GIF, WebP, vídeo, SVG, texto, folha, Godot e sequência). Só o `--contact` falta nela.

## Proposta da outra pessoa

[`proposta-melhorias-weasel-lucas.md`](proposta-melhorias-weasel-lucas.md) pede ferramentas de desenho: pincel de bolha, borracha, Bézier completo, simplificar pontos e vista 3D das camadas. Elas combinam com este plano (todas escrevem no código). O pincel de bolha ficou fora por enquanto; as outras estão na ordem do README.

## Ordem sugerida

A ordem junto com as ferramentas de desenho da outra proposta fica no [README desta pasta](README.md), na seção "Ordem sugerida para o editor". É lá que se acompanha o que falta.
