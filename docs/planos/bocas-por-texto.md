# Bocas por texto: o personagem fala o que você digitar

**Situação:** proposta feita em 12/11/2026 e ampliada em 13/11/2026 para português e inglês. Nada foi implementado. Ela espera você ler o capítulo de filme e responder as perguntas do fim.

**Origem:** o pedido do seu irmão, que usa o Weasel no storyboard do livro dele:

> "vc poderia colocar uma forma do usuario cadastrar as foneticas das bocas e ai vc digita um texto qualquer e ele mostra o personagem falando"

## Antes de ler

A proposta usa coisas do capítulo 10 do guia (filme):
- [Um filme curto](../guia/10-filme.md#um-filme-curto) e [Atores: `actor`](../guia/10-filme.md#atores-actor): como um personagem entra num filme.
- [Expressões: `expr`](../guia/10-filme.md#expressões-expr): o rosto troca uma forma por outra (`boca.shape=sorriso`).
- [Som, legendas e lip sync](../guia/10-filme.md#som-legendas-e-lip-sync): o `mouth`, o `sub` (com a língua de cada legenda, `lang=`) e o `audio … lips=`. A proposta aproveita os três.

## O que já existe

**`mouth`**, no arquivo do personagem, cadastra as bocas pelas letras clássicas da animação:

| Letra | Boca | Sons (como o guia diz hoje) |
|---|---|---|
| A | fechada | M, B, P |
| B | pouco aberta | — |
| C | aberta | — |
| D | bem aberta | — |
| E | redonda | O |
| F | biquinho | U |
| G | dentes no lábio | F, V |
| H | língua | L |
| X | descanso | — |

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

O Weasel faz isso em duas partes, e só a primeira depende da língua:
1. um **leitor** da língua transforma o texto em sons;
2. uma **tabela única** transforma cada som numa boca.

Uma língua nova é só um leitor novo. As bocas, os arquivos dos personagens e o resto do filme não mudam.

#### O leitor de cada língua: texto → sons

**Português**, por regras de pronúncia. Funciona porque o português se escreve quase como se fala:
- **Vogais:** a, e, é, i, o, ó, u, com os ditongos (ai, oi, ou…).
- **Grupos de letras:** ch, nh, lh, rr, qu e o h mudo.
- **Fala brasileira:** o "e" no fim da palavra soa como "i" ("noite" → "noitchi"). É o padrão; o português de Portugal poderia vir depois, como `lang=pt-PT`.

**Inglês**, por regras e uma lista de palavras. O inglês não se escreve como se fala, então só regras não bastam:
- **Grupos de letras:** igh, ph, gh, th, wh, oo, -tion, o "e" mudo no fim ("phone"), o k mudo de "kn" ("knight")…
- **Palavras irregulares:** uma lista das mais comuns que as regras erram (the, of, one, two, you, said, have, could, would, through, laugh, eye…). São algumas centenas de palavras, dezenas de KB.
- **Sotaque:** o americano. Para a boca, a diferença do britânico é pequena.
- **Por que precisa das regras:** em "Knight", ler letra por letra daria seis bocas pouco abertas. Com as regras, o k é mudo e o "igh" soa "ai", que abre a boca: B D B B.
- **A alternativa:** um dicionário de pronúncia inteiro (o CMUdict, livre, com mais de 130 mil palavras) acerta quase tudo, mas pesa uns 3,5 MB. Ver [Para decidir](#para-decidir).

#### Uma tabela só: sons → bocas

São as bocas clássicas da animação, as mesmas do Rhubarb. Elas foram pensadas por som, e não por letra, então servem para qualquer língua:

| Boca | Sons | Português | Inglês |
|---|---|---|---|
| A fechada | m, b, p | **m**ão, **b**oa, **p**ato | **m**om, **b**ig, **p**ie |
| B pouco aberta | i e a maioria das consoantes | t**i**a, **s**apo, **n**inho | s**ee**, **t**ea, **k**ey, **th**ink |
| C aberta | e, é | p**é**, m**e**sa | m**e**n, c**a**t |
| D bem aberta | a | c**a**sa, p**a**i | f**a**ther, n**igh**t |
| E redonda | o, ó | b**o**la, av**ó** | **o**ff, b**ir**d |
| F biquinho | u, w | **u**va, t**u**do | y**ou**, sh**ow**, **w**ay |
| G dentes no lábio | f, v | **f**aca, **v**aca | **f**or, **v**ery, **ph**one |
| H língua | l | **l**ua, ma**lh**a | **l**ong |
| X descanso | as pausas | a vírgula e o ponto | a vírgula e o ponto |

- **Exemplos:** "Boa noite" vira A E D B E B; "phone" vira G F B (o ph é F, e o e do fim é mudo).
- **Por que o inglês por regras dá conta:** como só existem 9 bocas, muitos erros de leitura não aparecem na tela. Trocar o "a" de "cat" pelo de "father" muda pouco (C ou D). O que mais vende a fala se escreve de um jeito regular nas duas línguas: o fechamento do M, do B e do P, o F e o V, e os sons redondos (o, u, w).

#### O tempo

- Vem do número de **sons**, e não de letras: "through" tem 7 letras e só 3 sons. Contar letras faria o inglês falar devagar demais.
- `rate=` fala mais rápido ou mais devagar.
- A vírgula faz uma pausa curta, e o ponto, uma pausa maior.
- Com `dur=`, a fala estica para caber.

**Fps baixo:** num storyboard a 8–12 quadros por segundo, bocas curtas demais se juntam para não piscar. O fechamento do M, do B e do P sempre aparece, porque é ele que mais "vende" a fala.

#### Qual língua: `lang=` e `--lang`

Não precisa de nada novo: a língua de cada legenda já existe ([capítulo 10](../guia/10-filme.md#tudo-o-que-o-som-aceita)).
- `film lang=pt` diz a língua das legendas sem `lang=` (o padrão é português), e `sub … lang=en` marca uma legenda em inglês.
- A boca lê cada legenda com o leitor da língua dela.
- Quando o filme tem as mesmas falas nas duas línguas, a boca segue a língua exportada. O `--lang en` já escolhe as legendas desenhadas no vídeo, e passaria a escolher também a boca:

```
film lang=pt subs=burn
…
sub 0.5s "Boa noite, Cavaleiro." lips=coruja
sub 0.5s "Good evening, Knight." lips=coruja lang=en
```

- Com o mesmo arquivo, `-o fala.mp4` sai em português e `-o fala_en.mp4 --lang en` sai em inglês, cada um com a boca certa.
- Se a língua exportada não tem uma das falas, a boca usa a fala na língua do filme, para não ficar parada.

#### Nomes e palavras difíceis: `say=`

```
sub 1s "Hi, Siobhan!" lips=coruja lang=en say="hi, shivawn!"
```

- A legenda mostra o texto, e a boca lê o `say=`, escrito como a frase **soa**, com as regras da mesma língua.
- Serve para nomes ("Siobhan" se fala "Shivawn"), onomatopeias ("Uh-uuh!"), gírias e sotaques.
- O nome `say=` ainda está aberto.

#### Outras línguas e voz gravada

- **Outras línguas:** cada uma é só um leitor novo. Espanhol e italiano são fáceis, porque se escrevem quase como se falam. Francês dá mais trabalho, por causa das letras mudas no fim das palavras.
- **Voz gravada:** o Rhubarb tem um modo que serve para qualquer língua (`--recognizer phonetic`); o modo padrão dele só entende inglês. Vale uma nota no capítulo 10 quando isto for feito.

#### O que o filme já faz

- A linha do tempo mostra as letras das bocas.
- O GIF e o vídeo saem com a boca mexendo.
- A legenda pode ir para o `.srt` ou ser desenhada no vídeo. Cada língua já sai no seu `.srt` (`conversa.srt`, `conversa.en.srt`).
- **Se houver um `audio … lips=` no mesmo momento,** a voz de verdade ganha.

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
- As bocas são as mesmas em qualquer língua: o desenho é feito uma vez só.

### 3. Painel "Bocas" no editor

É o pedido literal dele: cadastrar as bocas e digitar um texto.
- **Abre** com o cursor na linha `mouth`, como o painel do gradiente abre na linha `gradient`.
- **Uma linha para cada letra (A … H e X):**
  - os sons que ela cobre, com um exemplo em português e outro em inglês ("A: lábios fechados, como em **m**ão e **m**om");
  - qual desenho ela usa, ou "falta (usa a C)".
- **Clicar numa letra** mostra o personagem com aquela boca, e as alças editam o desenho dela.
- **"Nova", numa letra que falta:** copia a boca normal como `boca_E hidden`, logo abaixo dela, e escreve `E=boca_E` no `mouth`. Depois é só arrastar os pontos.
- **"Testar fala":** um campo onde ele escolhe a língua (pt ou en), digita qualquer frase e aperta ▶. O personagem fala na tela, com as letras aparecendo embaixo, e nada é escrito no código. Funciona também num arquivo de personagem fora de um filme.
- **A prévia do filme** ganha a mesma escolha de língua quando o filme tem legendas em mais de uma. Hoje o editor mostra só a língua do `film lang=`.

## Ordem

1. Os leitores do português e do inglês, a tabela de sons para bocas e o `sub lips=`. Vêm primeiro porque o painel usa os mesmos leitores.
2. A troca de desenho.
3. O painel.

Os itens 1 e 2 podem sair juntos (1.30.0), e o painel logo depois. Se o inglês demorar (a lista de palavras dá trabalho), o português pode sair antes: o resto não depende dele.

## E o jogo?

- **Na fase 1, nada muda.**
  - `sub` só existe em filme.
  - `mouth` continua sem efeito no jogo.
  - Os testes protegem as saídas do jogo.
- **Depois, se algum jogo precisar de personagem falando num diálogo:** o diálogo é decidido na hora pelo jogo, então a maior parte é coisa do jogo. A parte do Weasel seria pequena:
  - exportar cada boca como quadro (uma animação `boca_A` … no SpriteFrames, ou a boca num sprite por cima da cabeça);
  - pôr no `weasel_anim.gd` uma função `bocas("texto", "en")` que devolve as mesmas letras e os mesmos tempos do editor, na língua pedida.

  Não recomendo fazer isso agora: o pedido é de storyboard.

## Para decidir

1. **O nome:** `sub … lips=ator` ou uma instrução nova, `fala ator "texto"`? Recomendo o `sub`, porque ele já tem o tempo (`0.5s`, `+0.3s`), a legenda e a língua (`lang=`).
2. **Como seu irmão monta o storyboard:** com filme (`shot` e `actor`) ou com o arquivo do personagem sozinho?
   - Se for sozinho, o painel com "Testar fala" já resolve.
   - Para exportar essa fala num GIF, faltaria algo como `anim … fala="texto"` (com `lang=`).
3. **O leitor do inglês:** regras e uma lista de palavras (dezenas de KB) ou o dicionário inteiro (CMUdict, uns 3,5 MB, acerta quase tudo)? Recomendo as regras e a lista. Dá para trocar depois sem mudar nenhum arquivo, porque só o leitor muda.
4. **O nome do `say=`**, a fala escrita como soa.
5. **Jogo:** fica para depois, como sugeri?
6. **Como pedir a troca:** apontando para uma camada (`D=bocaD`, como acima), ou com um sinal na forma (algo como `D=bocaD!`)?
