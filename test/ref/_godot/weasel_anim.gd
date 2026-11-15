# Weasel — ajudante do AnimationPlayer das cenas exportadas pelo Weasel.
# Toca as animações pelo nome e pela direção (top-down), troca de animação na mesma fase da passada,
# troca com as transições geradas (trocar()), diz quantos quadros e o fps de cada animação, mostra um
# quadro parado e avisa os eventos (event).
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

## As transições geradas (anim … from= to=): para cada animação de saída e de chegada, os quadros de onde
## as peças partem e os nomes delas. trocar() acha a peça certa. Vazio sem transições.
@export var transicoes: Dictionary = {}

var _peca: StringName = &""
var _destino: StringName = &""
var _destino_tempo := 0.0


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


## Troca para "acao" sem corte seco: trocar("idle", velocity). Pode chamar a cada quadro, como o tocar():
## só começa uma troca quando a animação muda.
## - Com uma transição (anim … from= to=) da animação atual para a nova, toca a peça que parte do quadro
##   em que a atual está (arredondando para baixo) e, no fim dela, a nova, do começo.
## - Com a transição do caminho contrário (parar de correr, e agora voltar a correr), toca a peça de trás
##   para a frente, e a nova continua do quadro em que a peça termina.
## - Sem transição, entre dois loops a nova continua no mesmo ponto da passada (como tocar(acao, dir, true)).
##   Com esqueleto, mistura as duas em "mistura" segundos; por quadros, corta seco (a mistura do Godot
##   deixaria o sprite preso na animação de antes).
## Enquanto a peça toca, chame trocar(), não tocar(): o tocar() da mesma animação corta a peça.
func trocar(acao: String, dir := Vector2.ZERO, mistura := 0.2) -> void:
	if dir.length_squared() > 0.0001:
		direcao = dir.normalized()
	var para := nome_com_direcao(acao, direcao)
	if is_playing() and (current_animation == para or (_peca != &"" and current_animation == _peca and _destino == para)):
		return
	var de := StringName(current_animation if is_playing() else assigned_animation)
	_peca = &""
	var ida := _pecas(de, para)
	if not ida.is_empty():
		var quadro := _quadro_atual(de)
		var inicios: Array = ida["quadros"]
		for i in range(inicios.size() - 1, -1, -1):
			if int(inicios[i]) <= quadro:
				_tocar_peca(ida["pecas"][i], para, 0.0, false)
				return
	var volta := _pecas(para, de)
	if not volta.is_empty() and get_animation(para).loop_mode != Animation.LOOP_NONE:
		# a peça termina perto do quadro seguinte ao de onde ela parte; "para" continua do outro
		var n := quadros(para)
		_tocar_peca(volta["pecas"][0], para, (posmod(int(volta["quadros"][0]) + 2, n) + 0.01) / fps(para), true)
		return
	var tempo := _tempo_na_mesma_fase(para)
	if mistura <= 0.0 or _por_quadros(para):
		play(para)
		if tempo >= 0.0:
			seek(tempo, true)
		return
	play(para, mistura)
	if tempo >= 0.0:
		seek(tempo, true)
	# o que troca de uma vez (o lado espelhado, as caixas, os pontos) não entra na mistura do Godot: vale
	# já no começo e é conferido de novo no fim
	_aplicar_discretas(para, maxf(tempo, 0.0))
	if is_inside_tree():
		get_tree().create_timer(mistura).timeout.connect(_depois_da_mistura.bind(para))


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


## As peças da transição de "de" para "para": {"quadros": [...], "pecas": [...]}, ou {} se não há.
func _pecas(de: StringName, para: StringName) -> Dictionary:
	var saidas: Dictionary = transicoes.get(String(de), {})
	return saidas.get(String(para), {})


## O quadro em que "nome" está (tocando, parada ou já terminada).
func _quadro_atual(nome: StringName) -> int:
	var n := quadros(nome)
	if n <= 0 or (current_animation != nome and assigned_animation != nome):
		return 0
	return clampi(floori(current_animation_position * fps(nome) + 0.0001), 0, n - 1)


func _tocar_peca(peca: String, destino: StringName, destino_tempo: float, ao_contrario: bool) -> void:
	_peca = StringName(peca)
	_destino = destino
	_destino_tempo = destino_tempo
	if not animation_finished.is_connected(_fim_da_peca):
		animation_finished.connect(_fim_da_peca)
	if ao_contrario:
		play_backwards(_peca, 0.0)
	else:
		play(_peca, 0.0)


func _fim_da_peca(nome: StringName) -> void:
	if _peca == &"" or nome != _peca:
		return
	_peca = &""
	play(_destino, 0.0)
	if _destino_tempo > 0.0:
		seek(_destino_tempo, true)


## A cena por quadros troca o sprite (a pista Sprite:animation); a com esqueleto, não.
func _por_quadros(nome: StringName) -> bool:
	var a := get_animation(nome)
	return a != null and a.find_track(^"Sprite:animation", Animation.TYPE_VALUE) >= 0


## Põe nos nós os valores que trocam de uma vez (pistas discretas) de "nome" no tempo dado.
func _aplicar_discretas(nome: StringName, tempo: float) -> void:
	var a := get_animation(nome)
	var raiz := get_node_or_null(root_node)
	if a == null or raiz == null:
		return
	for i in a.get_track_count():
		if a.track_get_type(i) != Animation.TYPE_VALUE or a.value_track_get_update_mode(i) != Animation.UPDATE_DISCRETE:
			continue
		var k := a.track_find_key(i, tempo)
		if k < 0:
			continue
		var caminho := a.track_get_path(i)
		var no := raiz.get_node_or_null(NodePath(caminho.get_concatenated_names()))
		if no != null:
			no.set_indexed(NodePath(caminho.get_concatenated_subnames()), a.track_get_key_value(i, k))


func _depois_da_mistura(nome: StringName) -> void:
	if assigned_animation == nome:
		seek(current_animation_position, true)


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
