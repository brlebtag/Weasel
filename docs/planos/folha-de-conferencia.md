# Folha de conferência: `--contact`

**Situação:** item 3 da fila combinada em 10/11/2026. **Feito na 1.44.0.** O que ficou está em [Como ficou](#como-ficou-1440), no fim deste arquivo.

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

## Como ficou (1.44.0)

As escolhas de 15/11/2026 (todas as recomendadas):
- **O intervalo do filme é automático:** 1 s, ou, num filme longo, o menor entre 2, 5, 10, 15, 30 s… que dê até uns 120 quadros. `--contact=5` escolhe (também `500ms`, `12f`).
- **No filme, uma linha por plano:** o nome do plano no começo; os quadros a cada N s contados do começo do plano, e todo plano aparece. Embaixo, o tempo do filme, no jeito que o `--time` aceita; no canto, o número do quadro.
- **O escorregão em vermelho:** o quadro em que um pé no chão andou diferente da medida (a mesma conta do aviso do `--info`) ganha a bolinha do pé e o contorno em vermelho, e o terminal diz os quadros.
- **Tamanho automático:** o mesmo recorte para todas as animações, uns 160 px no lado maior (no filme, 240 px); `-s` escolhe. Uma animação longa quebra em linhas de 12 quadros (no filme, 8); `--cols` muda.

Mais:
- `-a "idle walk"` escolhe as animações; sem `-a`, todas.
- Sai em PNG ou JPG; o fundo é sempre claro, e os efeitos de tela (`oldfilm`, `vhs`…) ficam de fora no desenho, como na sprite sheet.
- O guia: capítulo 9 ("A folha de conferência"), capítulo 10 (no filme), capítulos 12 e 13, README e a ajuda da linha de comando.
