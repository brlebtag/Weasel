# Bocas por texto: o personagem fala o que você digitar

**Situação:** proposta feita em 12/11/2026. Nada foi implementado. Ela espera você ler o capítulo de filme e responder as perguntas do fim.

**Origem:** o pedido do seu irmão, que usa o Weasel no storyboard do livro dele:

> "vc poderia colocar uma forma do usuario cadastrar as foneticas das bocas e ai vc digita um texto qualquer e ele mostra o personagem falando"

## Antes de ler

A proposta usa coisas do capítulo 10 do guia (filme):
- [Um filme curto](../guia/10-filme.md#um-filme-curto) e [Atores: `actor`](../guia/10-filme.md#atores-actor): como um personagem entra num filme.
- [Expressões: `expr`](../guia/10-filme.md#expressões-expr): o rosto troca uma forma por outra (`boca.shape=sorriso`).
- [Som, legendas e lip sync](../guia/10-filme.md#som-legendas-e-lip-sync): o `mouth`, o `sub` e o `audio … lips=`. A proposta aproveita os três.

## O que já existe

**`mouth`**, no arquivo do personagem, cadastra as bocas pelas letras clássicas da animação:

| Letra | Boca | Sons (como o guia diz hoje) | No texto, pela proposta abaixo |
|---|---|---|---|
| A | fechada | M, B, P | m, b, p |
| B | pouco aberta | — | i e as outras consoantes |
| C | aberta | — | e, é |
| D | bem aberta | — | a |
| E | redonda | O | o |
| F | biquinho | U | u |
| G | dentes no lábio | F, V | f, v |
| H | língua | L | l, lh |
| X | descanso | — | as pausas (vírgula e ponto) |

Sem uma letra, vale a mais parecida.

```
mouth bico A=bico B=bicoAberto@0.3 D=bicoAberto
```

- **Limite 1:** cada boca é um morph da forma da boca: muda só o contorno. O número de pontos pode ser diferente; só o tipo precisa combinar (forma fechada com forma fechada, traço com traço). Mas a cor continua a da boca, então não dá para ter dentes ou língua, que são outras formas, com outras cores.
  - *Correção de 13/11/2026:* a primeira versão deste plano dizia que precisava do mesmo número de pontos. O código não exige. A linha do [capítulo 10](../guia/10-filme.md#som-legendas-e-lip-sync) que fala da boca e o comentário de `readMouth` em js/lang.js dizem o mesmo engano e devem ser corrigidos junto.
- **Limite 2:** a boca só se mexe num filme, a partir de um som (`audio … lips=coruja`) ou das deixas do Rhubarb (`cues=`). Num jogo, `mouth` não faz nada.
- **Limite 3:** um `mouth` por arquivo.

## Proposta: fase 1 (filme e editor; o jogo não muda)

### 1. O texto vira boca: `sub … lips=ator`

```
shot conversa dur=4s
actor coruja "coruja.weasel" 240,120
sub 0.5s "Boa noite, Cavaleiro." lips=coruja
sub +0.3s "Cuidado com o fantasma!" lips=coruja rate=0.8
```

- É o mesmo `sub` de hoje. O `lips=` diz que o texto da legenda move a boca do ator.
- O caminho contrário já existe: `audio … text=` vira legenda.

O Weasel lê o texto em português por regras de pronúncia. Isso funciona porque o português se escreve quase como se fala:
- **Vogais:** a → D, é/e → C, i → B, o → E, u → F.
- **Consoantes:** m, b e p → A (a boca fecha); f e v → G; l e lh → H; as outras → B.
- **Grupos de letras:** ch, nh, rr, qu e o h mudo.
- **Fala brasileira:** o "e" no fim da palavra soa como "i" ("noite" → "noitchi").
- **Exemplo:** "Boa noite" vira A E D B E B.

**O tempo:**
- vem do tamanho da frase;
- `rate=` fala mais rápido ou mais devagar;
- a vírgula faz uma pausa curta, e o ponto, uma pausa maior;
- com `dur=`, a fala estica para caber.

**Fps baixo:** num storyboard a 8–12 quadros por segundo, bocas curtas demais se juntam para não piscar. O fechamento do M, do B e do P sempre aparece, porque é ele que mais "vende" a fala.

**O resto do filme já funciona:**
- a linha do tempo mostra as letras das bocas;
- o GIF e o vídeo saem com a boca mexendo;
- a legenda pode ir para o `.srt` ou ser desenhada no vídeo.

**Se houver um `audio … lips=` no mesmo momento,** a voz de verdade ganha.

### 2. Boca desenhada de verdade (troca, além do morph)

```
shape bocaAberta c=labio ink=line bone=cabeca hidden : …
layer bocaD hidden
shape labiosD c=labio ink=line bone=cabeca : …
shape dentesD c=#ffffff bone=cabeca : …
shape linguaD c=#d9606a bone=cabeca : …
layer bocaO hidden
…
mouth boca A=boca B=bocaAberta@0.3 C=bocaAberta@0.6 D=bocaD E=bocaO G=bocaF
```

- Uma letra que aponta para uma **forma** continua sendo morph, como hoje, com qualquer número de pontos.
- Uma letra que aponta para uma **camada** (`bocaD`, `bocaO` e `bocaF` acima) vira **troca**: a boca normal some e a camada aparece, com lábios, dentes e língua, cada um com a sua cor. Fora da fala, a camada fica escondida (`hidden`).
- Hoje apontar para uma camada dá erro ("forma não existe"). Por isso nenhum arquivo existente muda de sentido.
- **Por que não "a forma que não combina vira troca"** (a primeira versão deste plano): formas com outro número de pontos já fazem morph hoje. Trocar isso mudaria o sentido de arquivos que já funcionam.
- A expressão do filme (`boca.shape=sorriso`) também é morph: só o contorno muda, e a cor fica a da boca. Por isso dentes e língua precisam da troca.

### 3. Painel "Bocas" no editor

É o pedido literal dele: cadastrar as bocas e digitar um texto.
- **Abre** com o cursor na linha `mouth`, como o painel do gradiente abre na linha `gradient`.
- **Uma linha para cada letra (A … H e X):**
  - os sons que ela cobre ("A: M, B, P, lábios fechados");
  - qual desenho ela usa, ou "falta (usa a C)".
- **Clicar numa letra** mostra o personagem com aquela boca, e as alças editam o desenho dela.
- **"Nova", numa letra que falta:** copia a boca normal como `boca_E hidden`, logo abaixo dela, e escreve `E=boca_E` no `mouth`. Depois é só arrastar os pontos.
- **"Testar fala":** um campo onde ele digita qualquer frase e aperta ▶. O personagem fala na tela, com as letras aparecendo embaixo, e nada é escrito no código. Funciona também num arquivo de personagem fora de um filme.

## Ordem

1. O tradutor de texto para bocas e o `sub lips=`. Vem primeiro porque o painel usa esse tradutor.
2. A troca de desenho.
3. O painel.

Os itens 1 e 2 podem sair juntos (1.30.0), e o painel logo depois.

## E o jogo?

- **Na fase 1, nada muda.**
  - `sub` só existe em filme.
  - `mouth` continua sem efeito no jogo.
  - Os testes protegem as saídas do jogo.
- **Depois, se algum jogo precisar de personagem falando num diálogo:** o diálogo é decidido na hora pelo jogo, então a maior parte é coisa do jogo. A parte do Weasel seria pequena:
  - exportar cada boca como quadro (uma animação `boca_A` … no SpriteFrames, ou a boca num sprite por cima da cabeça);
  - pôr no `weasel_anim.gd` uma função `bocas("texto")` que devolve as mesmas letras e os mesmos tempos do editor.

  Não recomendo fazer isso agora: o pedido é de storyboard.

## Para decidir

1. **O nome:** `sub … lips=ator` ou uma instrução nova, `fala ator "texto"`? Recomendo o `sub`, porque ele já tem o tempo (`0.5s`, `+0.3s`) e a legenda.
2. **Como seu irmão monta o storyboard:** com filme (`shot` e `actor`) ou com o arquivo do personagem sozinho?
   - Se for sozinho, o painel com "Testar fala" já resolve.
   - Para exportar essa fala num GIF, faltaria algo como `anim … fala="texto"`.
3. **Línguas:** só português no começo? O inglês por regras sai bem mais grosseiro. Para voz gravada, o Rhubarb continua valendo.
4. **Jogo:** fica para depois, como sugeri?
5. **Como pedir a troca:** apontando para uma camada (`D=bocaD`, como acima), ou com um sinal na forma (algo como `D=bocaD!`)?
