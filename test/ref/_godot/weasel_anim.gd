# Weasel — ajudante do AnimationPlayer das cenas exportadas pelo Weasel.
# Toca as animações pelo nome e pela direção (top-down), troca de animação na mesma fase da passada,
# diz quantos quadros e o fps de cada animação, mostra um quadro parado e avisa os eventos (event).
# É o mesmo arquivo para todos os personagens; pode copiar e mudar à vontade.
extends AnimationPlayer

## Emitido em cada event das animações (passo, golpe, pouso...).
signal evento(nome: StringName)

const DIRECOES_4: Array[String] = ["_right", "_down", "_left", "_up"]
const DIRECOES_8: Array[String] = ["_right", "_down_right", "_down", "_down_left", "_left", "_up_left", "_up", "_up_right"]

## A última direção pedida a tocar(); vale quando a direção passada é zero (personagem parado).
var direcao := Vector2.DOWN

## Quantos pixels por segundo o personagem anda em cada animação com feet= para os pés no chão não
## escorregarem (o Weasel mede nos quadros). Vazio quando nenhuma animação tem feet=.
@export var velocidades: Dictionary = {}

## Onde fica o meio do apoio do primeiro pé (feet=) em cada animação em loop, em fração do ciclo (0 a 1).
## tocar(acao, dir, true) usa para trocar de animação com o pé no chão ainda no chão. Vazio sem feet=.
@export var fases: Dictionary = {}


## Toca "acao" virada para a direção: tocar("walk", velocity) escolhe walk_down, walk_up, walk_right
## ou walk_left (e as diagonais, se houver). Sem animações com direção, toca "acao" mesmo.
## Só recomeça a animação quando ela muda.
## Com mesma_fase = true, a troca entre duas animações em loop continua no mesmo ponto da passada, em vez
## de recomeçar do quadro 0: tocar("trote", velocity, true). Com feet= nas duas, o pé que está no chão
## continua no chão; sem feet=, 40% do ciclo de uma vira 40% da outra.
func tocar(acao: String, dir := Vector2.ZERO, mesma_fase := false) -> void:
	if dir.length_squared() > 0.0001:
		direcao = dir.normalized()
	var nome := nome_com_direcao(acao, direcao)
	if current_animation != nome or not is_playing():
		var tempo := -1.0
		if mesma_fase:
			tempo = _tempo_na_mesma_fase(nome)
		play(nome)
		if tempo >= 0.0:
			seek(tempo, true)


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


## A velocidade (px/s, na escala da cena) em que o personagem anda na animação "nome" sem os pés
## escorregarem: velocidade("trote") vale trote ou, sem ela, trote virado para a última direção (como
## tocar()); velocidade() é a da animação tocando agora. 0 se a animação não tem feet=.
## Para o passo acompanhar o jogo: speed_scale = absf(velocity.x) / velocidade()
func velocidade(nome := "") -> float:
	if nome == "":
		nome = String(current_animation)
	if not velocidades.has(nome):
		nome = String(nome_com_direcao(nome, direcao))
	return float(velocidades.get(nome, 0.0))


## Quantos quadros a animação tem: quadros("walk") (com a direção, como tocar()); quadros() é a que está
## tocando agora (ou parada em mostrar_quadro()). 0 se a animação não existe.
func quadros(acao := "") -> int:
	var a := _animacao(acao)
	if a == null:
		return 0
	return maxi(1, roundi(a.length * fps(acao)))


## A velocidade da animação em quadros por segundo (o fps= do Weasel): fps("walk"); fps() é a que está
## tocando agora. 0 se a animação não existe.
func fps(acao := "") -> float:
	var a := _animacao(acao)
	if a == null or a.step <= 0.0:
		return 0.0
	# a cena guarda o tempo de um quadro com 4 casas (1/24 vira 0.0417): vale o fps redondo que dá esse tempo
	var bruto := 1.0 / a.step
	for passo in [1.0, 0.5, 0.25, 0.1]:
		var redondo := snappedf(bruto, passo)
		if redondo > 0.0 and absf(snappedf(1.0 / redondo, 0.0001) - a.step) < 0.00001:
			return redondo
	return bruto


## Mostra a animação parada num quadro, que o jogo escolhe (uma barra que enche, um passo que o jogador
## controla...): mostrar_quadro("walk", 3, velocity). O quadro vai de 0 a quadros("walk") - 1. Para no
## meio do quadro, sem avisar os eventos. Depois, tocar() a mesma animação continua dali.
func mostrar_quadro(acao: String, quadro: int, dir := Vector2.ZERO) -> void:
	if dir.length_squared() > 0.0001:
		direcao = dir.normalized()
	var nome := String(nome_com_direcao(acao, direcao))
	var n := quadros(nome)
	if n <= 0:
		return
	play(nome, 0.0)
	seek((clampi(quadro, 0, n - 1) + 0.5) / fps(nome), true)
	pause()


## A Animation de "acao" (com a direção, como tocar()); "" é a que está tocando ou parada.
func _animacao(acao: String) -> Animation:
	var nome := acao
	if nome == "":
		nome = current_animation if current_animation != "" else assigned_animation
	if not has_animation(nome):
		nome = String(nome_com_direcao(nome, direcao))
	if not has_animation(nome):
		return null
	return get_animation(nome)


## Onde "para" continua a passada da animação que está tocando (em segundos), ou -1 se não dá: nada
## tocando, ou uma das duas não é loop.
func _tempo_na_mesma_fase(para: StringName) -> float:
	var de := current_animation
	if not is_playing() or de == "" or not has_animation(de) or not has_animation(para):
		return -1.0
	var a := get_animation(de)
	var b := get_animation(para)
	if a.loop_mode == Animation.LOOP_NONE or b.loop_mode == Animation.LOOP_NONE or a.length <= 0.0:
		return -1.0
	var fase := current_animation_position / a.length
	if fases.has(de) and fases.has(String(para)):
		fase += float(fases[String(para)]) - float(fases[de])
	return fposmod(fase, 1.0) * b.length


func _weasel_evento(nome: StringName) -> void:
	evento.emit(nome)


## Vários event no mesmo quadro (event 8 pata_e pata_d): avisa um de cada vez, na ordem do código.
func _weasel_eventos(nomes: Array) -> void:
	for nome in nomes:
		evento.emit(nome)
