# `speed=auto` no filme

**Situação:** feito na 1.48.0 (15/11/2026). Saiu das "ideias soltas" em 15/11/2026.

## A ideia

- Hoje, `speed=` do ator é um número fixo (1 normal, 0.5 metade). Um ator que anda na tela (`path=` ou `at … x,y`) escorrega os pés se o número não for acertado à mão.
- Com `speed=auto`, a animação acompanha a velocidade com que o ator anda na tela, usando a passada medida pelo `feet=`. Assim os pés não escorregam.
- É o que o jogo já faz com `velocidade()` no Godot: `speed_scale = velocidade do jogo / velocidade()`.
- **Weasel:** só o filme; é uma opção nova, nada que existe muda. **Jogo:** nada muda.

## O que dá para reaproveitar

- A passada do `feet=` (já medida para o Godot).
- A posição do ator em cada quadro (`frameState` do filme).
- A "mesma fase" da 1.42.0, para trocar de animação sem pular a passada.

## O que falta decidir

1. **Ator parado:** a animação para no quadro em que está, ou continua no ritmo normal?
2. **Andar para trás:** a animação corre ao contrário, ou só vira com o `flip`?
3. **Limite:** um teto (e um piso) para a velocidade da animação, para um salto de posição não virar um borrão.
4. **Mistura (`blend=`) e metamorfose (`morph=`):** com duas passadas diferentes, vale a média pesada pela mistura?
5. **Animação sem `feet=`:** um aviso, e `speed=1`.

## As escolhas (15/11/2026)

1. **Ator parado:** a animação para no quadro em que está. Para ficar de pé, troca-se para a parada com `at … anim=` (com `blend=` ou `phase`).
2. **Andar para trás:** a animação toca ao contrário, com os pés presos. Para onde ele olha continua sendo o `flip=`.
3. **Limite:** um teto de 3× a velocidade normal, com um aviso no trecho em que o ator passa dele; sem piso (devagar é devagar, parado é parado).
4. **Mistura e metamorfose:** não precisou decidir. No `blend=`, cada animação anda na própria passada (as duas com os pés presos); na metamorfose, cada ator tem o seu `speed=`.
5. **Animação sem `feet=`:** toca em 1, e o aviso só aparece se o ator anda enquanto ela toca.

## Como ficou (1.48.0)

- `actor … speed=auto` e `at … ator.speed=auto` (e `at … ator.speed=1` para voltar ao número). Na câmera, `lag=auto` continua sendo erro.
- `film.js`: o tempo de cada animação vem de `animSecs()`, que soma os trechos com número (como antes) e os trechos com auto. No auto, o ator é medido em amostras de 1/120 s, uma vez por plano: quanto ele anda no palco na direção do x do desenho (com o `rot=` e o giro do `path=`), dividido pelo `scale=` e pelo `flip=`; dividido pela passada do `feet=` (`scene.gait`), limitado a ±3×, e somado.
- Uma passada que não dá para medir (sem pé no chão em dois quadros seguidos, ou parada) conta como sem `feet=`.
- Avisos (na linha do `speed=auto` que vale no trecho, com o shot quando há mais de um): mais rápido que 3× a passada; anda com uma animação sem `feet=`; anda com uma passada que não dá para medir.
- O `--info` do filme mostra, embaixo de cada plano, a passada de cada animação tocada com auto e o ritmo dela enquanto o ator anda.
- O editor completa `speed=auto` no `actor` e no `at`.
- **Jogo:** nada muda (o Godot já tem `velocidade()`). **Filmes que existem:** nada muda.
