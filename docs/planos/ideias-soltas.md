# Ideias soltas

**Situação:** esperando você. As duas ficaram "para depois" e quase não foram detalhadas.

## `speed=auto` no filme

Veio da lista da capivara, junto com a medida da passada do `feet=`. Os detalhes não foram anotados. Esta é só a ideia geral:
- Hoje, `speed=` do ator é um número fixo (1 normal, 0.5 metade).
- Com `speed=auto`, a animação acompanharia a velocidade com que o ator anda na tela (`path=` ou `at … x,y`), usando a passada medida pelo `feet=`. Assim os pés não escorregam.
- É o que o jogo já faz com `velocidade()` no Godot: `speed_scale = velocidade do jogo / velocidade()`.

## Traçar uma imagem

- O traçado de imagens pesado fica nos scripts do ForestPatrol, fora do Weasel.
- No Weasel, talvez um "traçar a ref" pequeno, só para imagens de cores chapadas: a imagem de referência viraria formas que você depois ajusta.
- Nada foi estudado além disso.
