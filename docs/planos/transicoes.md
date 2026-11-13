# Transições geradas entre duas animações

**Situação:** item 4 da fila combinada em 10/11/2026. Você aprovou a análise e a ordem; falta o "pode fazer". Você também decide se os quadros extras na sprite sheet valem a pena.

**Origem:** capivara #4: passar do galope para a pose parada sem pular.

## O problema

Ir do galope para a pose parada (`pisca`) hoje é um corte seco. Num quadro a capivara está esticada; no seguinte, está parada. Desenhar a transição à mão dá trabalho e quebra quando o galope muda.

## A proposta

```
anim para_galope from=galope to=pisca frames=5
```

- O Weasel gera os quadros do meio: parte de um quadro do galope e chega na pose do `pisca` em 5 quadros.
- **Uma peça a cada 2 quadros do galope** (`every=2`). Não se sabe em que quadro do galope o jogo vai parar, então há uma transição para cada ponto de partida. Os nomes: `para_galope_0_right`, `para_galope_2_right`…
- **Como os valores andam:**
  - números (posições, ângulos, cores) vão aos poucos;
  - o que liga e desliga (`show`, `above`) troca no meio;
  - `event` não entra.
- **Sair da pose parada e voltar a galopar:** é a mesma peça tocada de trás para a frente. Não precisa de quadros novos.

## Onde usar
- **Filme:** `at 5s capivara.anim=pisca via=para_galope`.
- **Godot:** no ajudante, `parar("galope", "pisca")` escolhe a peça certa pelo quadro atual do galope. Depende do [ajudante do Godot](ajudante-godot.md).
- **Com `rig=bones`:** não precisa de quadros novos; o Godot mistura as duas animações.

## O custo
- Cada peça são `frames=` quadros a mais na sprite sheet. Um galope de 12 quadros com `every=2` dá 6 peças × 5 quadros = 30 quadros.
- Só você pode julgar, olhando o jogo, se compensa. Um `every=` maior gera menos peças, com uma transição menos exata.

## No Weasel e no jogo
- **Weasel:** um jeito novo de `anim` (com `from=` e `to=`). As animações existentes não mudam.
- **Jogo:** só quem usar `para_galope` ganha quadros novos.
