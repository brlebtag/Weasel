# Limpeza da linguagem

**Situação:** esperando você. As três partes foram estudadas, mas nada foi decidido.

**A regra que vale para tudo aqui:** nunca mudar o sentido de uma sintaxe que já existe sem migrar os arquivos e avisar no editor.

## 1. Tirar o `finish inner=`

`finish game inner=0.6` muda a opacidade dos `stroke` que não são membro (`limb`) nas camadas com `clip=`.
- **Origem:** foi adivinhado de um quadro do vídeo (`referencia/08m32s_codigo_linhas_03-29.jpg`).
- **Efeito medido:**

  | Exemplo | Valor | Pixels que mudam |
  |---|---|---|
  | cavaleiro | 0.6 | 2,9% |
  | chefe | 0.7 | 0,4% |
  | coruja | 0.8 | 0,7% |
  | noite | — | não faz diferença |

- **Troca exata:**
  - `opacity=0.6` em cada traço; ou
  - uma cor com transparência na paleta (`dobra=#14141c99`).
- **O que fazer:**
  1. Reescrever cavaleiro, chefe, coruja e noite, em `exemplos/` e em `js/examples.js`.
  2. Tirar do código:
     - js/lang.js: ~27, ~527 e ~777;
     - js/scene.js: ~2058;
     - js/svg.js: ~255.
  3. Tirar da documentação:
     - capítulo 4, seção [Os dois `inner`](../guia/04-camadas.md#os-dois-inner) (~978), e as linhas ~796 e ~865;
     - capítulo 3, o aviso da linha ~197;
     - capítulo 12, a linha do `finish` (~131);
     - a ajuda do index.html (~118) e o README (~238).
- **Para decidir:** um arquivo antigo com `inner=` no `finish` dá aviso ou erro?

(Os números de linha são de 12/11/2026, na 1.29.0.)

## 2. Nomes que confundem

O estudo completo está no documento [Weasel: nomes que confundem](https://claude.ai/artifact/VWe5zYamERQe75LVH7NrXx). Ainda não foi decidido.

**Princípios:**
- um nome, um sentido;
- um tamanho se chama `X`, e a cor dele, `Xc`;
- os nomes da paleta não repetem instruções nem opções.

"Vídeo" quer dizer que o nome foi adivinhado do vídeo; "nosso", que foi criado aqui. "Linhas" é quanto texto muda nos exemplos, no guia e nos testes.

| # | Hoje | Confunde com | Proposta | De onde veio | Linhas | Prioridade | Outras saídas |
|---|---|---|---|---|---|---|---|
| A | `ink` da paleta (uma cor) | `ink=` (espessura) | `inkc` | vídeo | ~420 | alta | `ink` continua cor, e a espessura vira `outline=`/`outlinec=`/`outlineon=` (~730 linhas) |
| B | `line`, `inner`, `edge` da paleta (espessuras) | a instrução `line`; o `finish inner=` | `contour`, `detail`, `fine` | vídeo | ~650 | alta | `ink1`/`ink2`/`ink3`, ou manter |
| C | `weight=` | "peso da linha" | `inkvar=` | vídeo | 39 | média | `inkshade=`, ou manter |
| D | `screen` (camada e ator) | `blend=screen` | `fixed` | nosso | 14 | média | `hud`, `onscreen` |
| E | `box` do gradiente | a instrução `box` | `fit` | nosso | 15 | média | `rel`, `local` |
| F | `from=` da camada | `from=` do `audio` | `caster=` | nosso | 3 | média | `skip=` no `audio` |
| G | `frames=a..b` da `ref` | `frames=N` da `anim` | `during=` | nosso | 3 | média | `range=`, `onframes=` |
| H | `rim=cor,largura` da camada | `rim=largura` da luz | `rim=` + `rimc=` | nosso | 2 | média | — |
| I | `round=` do osso | `cap=round`, `r=` | `sphere=` | nosso | 4 | baixa | `ball=` |
| J | `lit` | nada: já é o padrão | tirar, com o aviso "lit não muda nada" | nosso | 1 | baixa | — |
| K | `depth=` | `z=` (2.5D) | `dist=` | nosso | 29 | baixa | `far=`, `parallax=` |
| L | a instrução `point` | `light nome point` | `socket` | nosso | 7 | baixa | `pin`; ou o tipo de luz vira `omni` |

**Só explicar melhor no guia, sem trocar:**
- `ink=` × `w=`;
- `inkc=` × `c=`;
- `light=` do `canvas` (vira `inklight=` se o C entrar);
- `finish inner=` (se não sair, pela parte 1);
- `shape=` do emissor (ou `particle=`);
- `bg` do ator × `bg=` do `canvas`;
- `origin=` × `root=` do `unity`;
- `flip=` × `mirror=`;
- `stroke`;
- `iso` e `iso=` (nada a mudar).

**Migração:** tudo junto, na 2.0.0. A e B mudam ~1.070 linhas; os outros, ~120.
- `cli/migrar.js` reescreve `exemplos/`, `js/examples.js`, os blocos de código do guia e `test/casos`.
- O texto do guia é revisto à mão.
- Os testes têm de dar exatamente igual.
- O editor avisa quando encontra um nome antigo.
- O capítulo 13 ganha uma tabela antes → depois.

## 3. Componentes isolados: camada e osso dentro de `def`

Conversado em 06/11/2026. Nada decidido.
- Um `def` só com formas continua como hoje.
- Um `def` com `layer` ou `bone` vira um bloco isolado, como um ator do filme:
  - parâmetros;
  - `pos`, `rot`, `scale`, `flip` e `bone`;
  - `anim` e `expr`;
  - um nome para cada instância.
- **Camadas:**
  - `clip` e `cut` valem só dentro do bloco;
  - o bloco pinta no lugar do `use`;
  - dentro só valem `clip`, `cut`, `opacity`, `blend`, `hidden`, `guide` e `only`;
  - é preciso desenhar camadas dentro de camadas.
- **Ossos:**
  - ficam achatados, com o nome da instância na frente (`p1/dobradica`);
  - primeiro vem o movimento automático, depois a animação local;
  - no Godot, o nome precisa trocar a `/` por `_`.
- **Nomes:** `porta.x` muda todas as instâncias, e `p1.x`, uma só. O ponto já tem uso, então talvez `p1/x` ou `p1::x`.
- **Ordem de fazer:** camadas, depois ossos com física, depois animação local.
- **Nível 1 (médio):** as camadas locais são desenhadas no lugar; `blend`, `fx`, `trail` e `cast` são recusados dentro do bloco.
- **Nível 2 (grande):** cada bloco é desenhado numa imagem à parte; as telas de rascunho precisam de uma pilha.
- **No código:**
  - o leitor precisa procurar os nomes por bloco (`clipEls`, `layerMap`);
  - o SVG é fácil, o filme muda pouco, e os quadros do Godot vêm de graça;
  - rig.js e normal.js agrupam por camada;
  - `pose.lprops` usa o nome da camada como chave.
