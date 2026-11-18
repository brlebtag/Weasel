<p align="center"><img src="../logo.svg" width="120" alt="Logo do Weasel: uma doninha de frente num selo escuro, com uma pincelada laranja"></p>

# Guia da linguagem Weasel

Este guia ensina a linguagem do Weasel desde o começo, para quem nunca escreveu um desenho em código. Cada passo tem um exemplo e, logo abaixo, a imagem que ele gera. O [README](../../README.md) é a lista de tudo o que existe; este guia explica o que cada coisa faz, em que ordem aprender e onde estão as armadilhas.

![O Pingo, o personagem do capítulo de animação, respirando, falando e piscando](img/07_pingo.gif)

> **O guia está sendo reescrito.** Os capítulos novos entram aos poucos. Enquanto um capítulo novo não fica pronto, o link dele leva ao capítulo antigo que tem o mesmo assunto; esses estão marcados com "(antigo)" e ainda têm o número velho no título.

## Os capítulos

O guia tem seis partes. As cinco primeiras são **aulas**: leia em ordem, porque cada exemplo só usa o que já foi ensinado. A sexta é para **consultar** quando precisar.

### 1. O básico (leia em ordem)

| | Capítulo | O que você aprende |
|---|---|---|
| 1 | [Primeiros passos](01-primeiros-passos.md) | como rodar um desenho, as coordenadas (o `y` cresce para baixo), o formato de uma linha e como ler os erros |
| 2 | [Formas](02-formas.md) | círculo e elipse, retângulo, formas com pontos (lisos, cantos e alças), traços, linhas e texto |
| 3 | [Cores e contorno](03-cores.md) | cores com transparência, a `palette`, gradientes, texturas e o contorno das formas |
| 4 | [Camadas](04-camadas.md) | `layer`, a ordem de pintura, recortar por dentro e por fora e furar formas |

### 2. Organizar

| | Capítulo | O que você aprende |
|---|---|---|
| 5 | [Contas e repetição](05-contas.md) | `let` e as contas, `repeat`, `rand()`, comparar e escolher, e as funções mais usadas |
| 6 | [Componentes e arquivos](06-componentes.md) | `def` e `use`, o espelho `mirror=`, `include`, `group` e as variantes (`variant`) |

### 3. Movimento

| | Capítulo | O que você aprende |
|---|---|---|
| 7 | [Primeiro movimento](07-movimento.md) | um osso, uma animação, a `key`, andar, girar e esticar, o pivô, `frames=` e `fps=`, o `ease`, o loop e o `once` |
| 8 | [Ossos](08-ossos.md) | pai e filho, o esqueleto de um personagem, movimentos automáticos, molas, tecido, formas que dobram, pontos presos a um osso e pernas com IK |
| 9 | [Animação](09-animacao.md) | animar cores e formas, desenhar aos poucos, morph, eventos, andar por um caminho, `only=`, quem fica na frente, animações combinadas e exportar |

### 4. Luz e aparência

| | Capítulo | O que você aprende |
|---|---|---|
| 10 | [Luz e sombra](10-luz.md) | lâmpadas, holofotes, sol e lua, brilho e sombra no chão |
| 11 | [Efeitos e partículas](11-efeitos.md) | os efeitos de camada, o rastro e as partículas |
| 12 | [Acabamento](12-acabamento.md) | a linha `finish`: o estilo do desenho inteiro, os acabamentos de cinema e os efeitos de tela |
| 13 | [Estilos de arte](13-estilos.md) | a linha `art`: o mesmo desenho em pixel art, aquarela, gravura, HQ, mangá, vitral, tricô e mais 19 estilos |
| 14 | [Profundidade (2.5D)](14-profundidade.md) | girar formas em 3D, verso e espessura, chão em perspectiva, mapa isométrico, lente e névoa |

### 5. Jogo e filme

| | Capítulo | O que você aprende |
|---|---|---|
| 15 | [Jogo: o personagem no Godot](15-jogo-personagem.md) | exportar para o Godot, caixas de colisão, pontos de encaixe, o ajudante `tocar()`, direções e andar sem escorregar |
| 16 | [Jogo: fases e recursos avançados](16-jogo-avancado.md) | o tileset, transições entre animações, a virada, o esqueleto de verdade, a sprite sheet e a Unity |
| 17 | [Filme: atores, planos e câmera](17-filme.md) | atores, planos e transições, a câmera e as mudanças no tempo (`at`) |
| 18 | [Filme: atuação, som e legendas](18-filme-atuacao.md) | expressões, marcadores, caminhos, trocar de animação sem tranco, um ator que vira outro, som, legendas, lip sync e filmes longos |

### 6. Consulta

| | Capítulo | O que tem |
|---|---|---|
| 19 | [Referência completa](19-referencia.md) | todos os comandos, com **todas** as opções, as faixas de valores e os padrões |
| 20 | [Funções das contas](20-funcoes.md) | o que vale dentro de `{…}`: as operações e cada função, com exemplos |
| 21 | [Linha de comando](21-linha-de-comando.md) | todas as opções do `weasel`: imagens, animações, sprite sheets, Godot, vídeo e filme |
| 22 | [O editor](22-editor.md) | as ferramentas e os painéis do editor (por enquanto, os dos capítulos 1 a 14) |
| 23 | [Atalhos do teclado](23-atalhos.md) | todos os atalhos do editor, a mesma lista da folha **Ajuda › Atalhos do teclado** (Shift+F1) |
| 24 | [Problemas comuns](13-problemas.md) (antigo) | o que costuma dar errado e como resolver |
| 25 | [Glossário](25-glossario.md) | as palavras que o guia usa, cada uma com um sentido só |

## Como testar os exemplos

Os exemplos grandes do guia são desenhos completos: copie, cole e rode. Alguns blocos são só pedaços de um desenho, para mostrar uma linha; o texto em volta diz quando é assim.

- **No editor web:** abra o `index.html`, crie um arquivo com **Arquivo › Novo** e cole o exemplo no lugar do desenho que vem nele. O desenho aparece à direita, e as animações tocam no player.
- **Na linha de comando:** salve como `teste.weasel` e rode `node cli/weasel.js teste.weasel`. Para uma animação, `node cli/weasel.js teste.weasel -a nome_da_animacao -o teste.gif`. O [capítulo 21](21-linha-de-comando.md) tem todas as opções.

Os exemplos que usam outros arquivos (`include "cavaleiro.weasel"`, `actor … "fantasma.weasel"`) esperam estar na pasta [`exemplos/`](../../exemplos/), junto com os personagens de exemplo.

## Como este guia é feito

As imagens não são desenhadas à mão: cada uma é a saída do exemplo que está logo acima dela, feita pela linha de comando. Um comentário invisível antes do bloco de código diz o nome da imagem e as opções:

```
<!-- gerar: img/07_bola.gif -a quica -->
```

Para gerar tudo de novo (depois de mudar um exemplo ou o próprio Weasel):

```bash
npm run docs
```

O `npm test` confere o guia:
- os exemplos com o comentário `<!-- gerar: … -->` ou `<!-- conferir -->` precisam rodar sem erro e sem aviso;
- a referência (capítulo 19) precisa ter todo comando e toda opção que o Weasel aceita; as funções (20) e a linha de comando (21) também;
- os atalhos (capítulo 23) precisam estar iguais à lista do editor;
- todo link de um capítulo para outro precisa levar a um título que existe.

Assim, uma opção nova no Weasel não fica de fora do guia.
