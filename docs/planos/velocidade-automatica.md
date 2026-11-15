# `speed=auto` no filme

**Situação:** esperando você. Saiu das "ideias soltas" em 15/11/2026.

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
