# Weasel — ajudante do AnimationPlayer das cenas exportadas pelo Weasel.
# Toca as animações pelo nome e pela direção (top-down) e avisa os eventos (event) das animações.
# É o mesmo arquivo para todos os personagens; pode copiar e mudar à vontade.
extends AnimationPlayer

## Emitido em cada event das animações (passo, golpe, pouso...).
signal evento(nome: StringName)

const DIRECOES_4: Array[String] = ["_right", "_down", "_left", "_up"]
const DIRECOES_8: Array[String] = ["_right", "_down_right", "_down", "_down_left", "_left", "_up_left", "_up", "_up_right"]

## A última direção pedida a tocar(); vale quando a direção passada é zero (personagem parado).
var direcao := Vector2.DOWN


## Toca "acao" virada para a direção: tocar("walk", velocity) escolhe walk_down, walk_up, walk_right
## ou walk_left (e as diagonais, se houver). Sem animações com direção, toca "acao" mesmo.
## Só recomeça a animação quando ela muda.
func tocar(acao: String, dir := Vector2.ZERO) -> void:
	if dir.length_squared() > 0.0001:
		direcao = dir.normalized()
	var nome := nome_com_direcao(acao, direcao)
	if current_animation != nome or not is_playing():
		play(nome)


## O nome da animação de "acao" para a direção (ou "acao", se não houver versões com direção).
func nome_com_direcao(acao: String, dir: Vector2) -> StringName:
	var angulo := rad_to_deg(dir.angle())
	if has_animation(acao + "_down_right") or has_animation(acao + "_up_right"):
		var oito := acao + DIRECOES_8[posmod(roundi(angulo / 45.0), 8)]
		if has_animation(oito):
			return StringName(oito)
	var quatro := acao + DIRECOES_4[posmod(roundi(angulo / 90.0), 4)]
	if has_animation(quatro):
		return StringName(quatro)
	return StringName(acao)


func _weasel_evento(nome: StringName) -> void:
	evento.emit(nome)
