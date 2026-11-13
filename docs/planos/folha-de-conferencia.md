# Folha de conferência: `--contact`

**Situação:** item 3 da fila combinada em 10/11/2026. Você aprovou a análise e a ordem; falta o "pode fazer".

## O problema

Para dizer "o pé escorrega no quadro 7", hoje é preciso contar quadros num GIF, ou na sprite sheet, que não tem números.

## A proposta

Uma opção nova na linha de comando:

```
weasel capivara.weasel --contact -a anda -o folha.png
weasel capivara.weasel --contact -a all -o folha.png
```

- Sai um PNG em grade, com fundo claro.
- **Cada quadro** tem o número dele no canto.
- **Cada linha** é uma animação, com o nome no começo. `-a all` põe todas.
- **Marcas:**
  - os quadros que têm `event`;
  - para cada pé do `feet=`, os quadros em que ele está no chão.
- **Filme:** um quadro a cada N segundos, com o tempo embaixo (0s, 0.5s, 1s…).
- **`-f sheet` não muda.** Continua sem números, porque é a imagem que o jogo usa.

## No Weasel e no jogo
- **Weasel:** só a linha de comando. Nenhuma saída existente muda.
- **Jogo:** nada muda. A folha serve para conferir, não vai para o jogo.
