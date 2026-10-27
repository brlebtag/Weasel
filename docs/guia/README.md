# Guia da linguagem Weasel

Este guia ensina a linguagem do Weasel do começo, com um exemplo em cada passo e a imagem que ele gera logo abaixo. Se o [README](../../README.md) é a lista de tudo o que existe, este guia é o **porquê** e o **como**: o que cada coisa faz, em que ordem aprender e onde estão as armadilhas.

![O Pingo, o personagem do capítulo de animação, respirando, falando e piscando](img/07_pingo.gif)

## Capítulos

| | Capítulo | O que você aprende |
|---|---|---|
| 1 | [Primeiros passos](01-primeiros-passos.md) | a ideia, as coordenadas (y para baixo!), o formato de uma linha, como ler os erros e como rodar os exemplos |
| 2 | [Formas](02-formas.md) | elipse, retângulo, formas com pontos (lisos, cantos e alças), traços, linhas, texto e contornos |
| 3 | [Cores e estilos](03-cores.md) | cores com transparência, a `palette`, variantes, gradientes e hachuras |
| 4 | [Camadas, recortes e acabamento](04-camadas.md) | `layer`, a ordem de pintura, recortar por dentro e por fora, contorno por cima, buracos e o estilo do desenho inteiro |
| 5 | [Contas, componentes e arquivos](05-componentes.md) | `let` e `{contas}`, componentes com `def`/`use`, espelho e `include` |
| 6 | [Ossos](06-ossos.md) | o que é um osso, o pivô, pai e filho, movimentos automáticos, molas, tecido e pernas com IK |
| 7 | [Animação](07-animacao.md) | `anim` e `key`, como os quadros do meio são calculados (`ease`), loop, animar cores e formas, morph e eventos |
| 8 | [Luz, efeitos e partículas](08-luz-efeitos.md) | lâmpadas, holofotes, sol e lua, brilho, sombra no chão, efeitos de camada, rastro e partículas |
| 9 | [Jogo e Godot](09-jogo-godot.md) | caixas de colisão, golpe e dano por quadro, a cena pronta do Godot, direções, tileset e sprite sheet |
| 10 | [Filme](10-filme.md) | atores, planos, câmera, mudanças no tempo, profundidade, som, legendas e lip sync |
| 11 | [Referência rápida](11-referencia.md) | todas as instruções e atributos, com os valores padrão |
| 12 | [Problemas comuns](12-problemas.md) | o que costuma dar errado e como resolver |

**Por onde começar:** leia os capítulos 1 a 4 em ordem; eles são a base de tudo. Depois, os capítulos 6 e 7 (ossos e animação) são os mais importantes para personagens. O resto pode ser lido conforme a necessidade.

## Como testar os exemplos

Todo exemplo deste guia é um desenho completo: copie, cole e rode.

- **No editor web:** abra o `index.html`, crie um arquivo novo na barra acima do código e cole. O desenho aparece à direita, e as animações tocam no player.
- **Na linha de comando:** salve como `teste.weasel` e rode `node cli/weasel.js teste.weasel` (ou `-a nome_da_anim -o teste.gif` para uma animação).

Os exemplos que usam outros arquivos (`include "cavaleiro.weasel"`, `actor … "fantasma.weasel"`) esperam estar na pasta [`exemplos/`](../../exemplos/), junto com os personagens de exemplo.

## Como este guia é feito

As imagens não foram desenhadas à mão: cada uma é a saída do exemplo que está logo acima dela, gerada pela linha de comando. Um comentário invisível antes do bloco de código diz o nome da imagem e as opções:

```
<!-- gerar: img/07_bola.gif -a quica -->
```

Para gerar tudo de novo (depois de mudar um exemplo ou o próprio Weasel):

```bash
npm run docs
```

O `npm test` também lê todos os exemplos do guia e falha se algum deles der erro ou aviso, para o guia não ficar desatualizado em relação à linguagem.
