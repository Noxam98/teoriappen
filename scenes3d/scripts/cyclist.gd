class_name Cyclist
extends RefCounted
## Велосипедист: городской велосипед с настоящей геометрией рамы и ездок в рабочей посадке. Едет вдоль -z.

const REAR := Vector3(0, 0.345, 0.5)
const FRONT := Vector3(0, 0.345, -0.56)
const BRACKET := Vector3(0, 0.29, 0.06)
const SEAT_CLUSTER := Vector3(0, 0.79, 0.205)
const SADDLE := Vector3(0, 0.975, 0.25)
const HEAD_TOP := Vector3(0, 0.875, -0.3)
const HEAD_LOW := Vector3(0, 0.735, -0.345)
const CRANK: float = 0.17


static func _mat(c: Color, rough: float = 0.8, metal: float = 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = rough
	m.metallic = metal
	return m


static func _lamp(c: Color, energy: float) -> StandardMaterial3D:
	var m := _mat(c, 0.15)
	m.emission_enabled = true
	m.emission = c
	m.emission_energy_multiplier = energy
	return m


static func _add(root: Node3D, mesh: Mesh, at: Vector3 = Vector3.ZERO) -> MeshInstance3D:
	var i := MeshInstance3D.new()
	i.mesh = mesh
	i.position = at
	root.add_child(i)
	return i


static func _tube(root: Node3D, a: Vector3, b: Vector3, r: float, m: Material) -> void:
	_add(root, Mesher.sweep([a, a.lerp(b, 0.5), b], [Vector2(r, r), Vector2(r, r), Vector2(r, r)], m, 8))


## Точка сустава между двумя концами: колено или локоть, вынесено вперёд (-z).
static func _joint(a: Vector3, b: Vector3, l1: float, l2: float) -> Vector3:
	var d: float = minf(a.distance_to(b), (l1 + l2) * 0.995)
	var dir: Vector3 = (b - a).normalized()
	var along: float = (l1 * l1 - l2 * l2 + d * d) / (2.0 * d)
	var off: float = sqrt(maxf(l1 * l1 - along * along, 0.0))
	var perp: Vector3 = dir.cross(Vector3.RIGHT).normalized()
	if perp.z > 0.0:
		perp = -perp
	return a + dir * along + perp * off


static func _wheel(root: Node3D, c: Vector3, rubber: Material, rim: Material, steel: Material, dark: Material) -> void:
	_add(root, Mesher.torus(0.328, 0.02, 0.018, rubber), c)
	_add(root, Mesher.torus(0.3, 0.012, 0.012, rim), c)
	_add(root, Mesher.lathe([Vector2(0.018, -0.042), Vector2(0.024, -0.03), Vector2(0.018, 0.0), Vector2(0.024, 0.03), Vector2(0.018, 0.042)], dark, 16), c)
	for s: int in 24:
		var a: float = TAU * s / 24.0 + (0.13 if s % 2 == 0 else -0.13)
		var b: float = TAU * s / 24.0
		var side: float = 0.026 if s % 2 == 0 else -0.026
		var from: Vector3 = c + Vector3(side, cos(a) * 0.022, sin(a) * 0.022)
		var to: Vector3 = c + Vector3(0.0, cos(b) * 0.292, sin(b) * 0.292)
		_tube(root, from, to, 0.0016, steel)


## Крыло: тонкая вогнутая полоса над шиной от угла a0 до a1 (0 это верх, плюс это назад), стойки к оси и брызговик.
static func _fender(root: Node3D, c: Vector3, a0: float, a1: float, m: Material, steel: Material, rubber: Material) -> void:
	var half: float = 0.026
	var r0: float = 0.356
	var rings: Array = []
	for k: int in 37:
		var a: float = lerpf(a0, a1, k / 36.0)
		var d := Vector3(0.0, cos(a), sin(a))
		var ring := PackedVector3Array()
		for q: float in [-1.0, -0.6, -0.2, 0.2, 0.6, 1.0]:
			ring.push_back(c + Vector3(q * half, 0.0, 0.0) + d * (r0 + (1.0 - q * q) * 0.009))
		for q: float in [1.0, 0.6, 0.2, -0.2, -0.6, -1.0]:
			ring.push_back(c + Vector3(q * half * 0.98, 0.0, 0.0) + d * (r0 + (1.0 - q * q) * 0.009 - 0.0025))
		rings.push_back(ring)
	_add(root, Mesher.loft(rings, m))
	# Проволочные стойки от оси к крылу.
	for sa: float in [lerpf(a0, a1, 0.72), lerpf(a0, a1, 0.9)]:
		var d2 := Vector3(0.0, cos(sa), sin(sa))
		for sx: float in [-1.0, 1.0]:
			_tube(root, c + Vector3(sx * 0.054, 0.0, 0.0), c + Vector3(sx * 0.024, 0.0, 0.0) + d2 * r0, 0.0021, steel)
	# Резиновый брызговик на конце.
	var end_d := Vector3(0.0, cos(a1), sin(a1))
	var along := Vector3(0.0, -sin(a1), cos(a1))
	var flap := BoxMesh.new()
	flap.size = Vector3(half * 1.7, 0.075, 0.004)
	flap.material = rubber
	var f: MeshInstance3D = _add(root, flap, c + end_d * (r0 + 0.002) + along * 0.036)
	f.rotation.x = -a1 + PI / 2.0


## Велосипедный шлем: каплевидный корпус из продольных рёбер, между ними тёмные вентиляционные щели.
static func _helmet(root: Node3D, head: Vector3, shell: Material, liner: Material, strap: Material) -> void:
	var o: Vector3 = head + Vector3(0.0, 0.028, 0.0)
	# z, полуширина, высота купола, низ края относительно o.
	var st: Array = [[-0.128, 0.03, 0.012, 0.03], [-0.118, 0.058, 0.03, 0.03], [-0.095, 0.08, 0.052, 0.025], [-0.05, 0.097, 0.08, 0.018], [0.0, 0.104, 0.09, 0.01], [0.05, 0.102, 0.085, 0.0], [0.1, 0.086, 0.066, -0.012], [0.14, 0.058, 0.04, -0.022], [0.165, 0.032, 0.02, -0.028], [0.178, 0.012, 0.008, -0.03]]
	var section := func(z: float) -> Array:
		var i: int = 0
		while i < st.size() - 2 and z > st[i + 1][0]:
			i += 1
		var t: float = clampf((z - st[i][0]) / (st[i + 1][0] - st[i][0]), 0.0, 1.0)
		t = t * t * (3.0 - 2.0 * t)
		return [lerpf(st[i][1], st[i + 1][1], t), lerpf(st[i][2], st[i + 1][2], t), lerpf(st[i][3], st[i + 1][3], t)]
	var rib := func(t0: float, t1: float, lift: float, m: Material) -> void:
		var rings: Array = []
		var count: int = 28
		for k: int in count + 1:
			var z: float = lerpf(-0.128, 0.178, k / float(count))
			var q: Array = section.call(z)
			var ring := PackedVector3Array()
			for j: int in 6:
				var a: float = lerpf(t0, t1, j / 5.0)
				ring.push_back(o + Vector3(cos(a) * q[0], q[2] + sin(a) * (q[1] + lift), z))
			for j: int in range(5, -1, -1):
				var a2: float = lerpf(t0, t1, j / 5.0)
				ring.push_back(o + Vector3(cos(a2) * q[0] * 0.9, q[2] + sin(a2) * (q[1] * 0.86), z))
			rings.push_back(ring)
		_add(root, Mesher.loft(rings, m))
	rib.call(0.0, PI, -0.012, liner)
	for r: Array in [[0.0, 0.42], [0.54, 1.06], [1.2, 1.94], [2.08, 2.6], [2.72, PI]]:
		rib.call(r[0], r[1], 0.0, shell)
	# Ремешки под подбородком и затылочный обхват.
	for sx: float in [-1.0, 1.0]:
		var ear: Vector3 = head + Vector3(sx * 0.084, -0.045, 0.006)
		_tube(root, o + Vector3(sx * 0.098, 0.01, -0.05), ear, 0.0035, strap)
		_tube(root, o + Vector3(sx * 0.085, 0.0, 0.07), ear, 0.0035, strap)
		_tube(root, ear, head + Vector3(sx * 0.025, -0.125, -0.05), 0.0035, strap)


## Велосипед с ездоком. jacket, legs: цвет куртки и брюк.
static func make(jacket: Color, legs: Color, frame_color: Color = Color(0.05, 0.2, 0.3)) -> Node3D:
	var root := Node3D.new()
	var frame: StandardMaterial3D = _mat(frame_color, 0.28, 0.35)
	frame.clearcoat_enabled = true
	frame.clearcoat = 0.6
	var steel: StandardMaterial3D = _mat(Color(0.68, 0.69, 0.71), 0.28, 0.85)
	var dark: StandardMaterial3D = _mat(Color(0.03, 0.03, 0.035), 0.55, 0.3)
	var rubber: StandardMaterial3D = _mat(Color(0.02, 0.02, 0.022), 0.88)
	var fender: StandardMaterial3D = _mat(frame_color.darkened(0.25), 0.3, 0.35)
	_wheel(root, REAR, rubber, steel, steel, dark)
	_wheel(root, FRONT, rubber, steel, steel, dark)
	_fender(root, REAR, -1.1, 1.75, fender, steel, rubber)
	_fender(root, FRONT, -0.62, 1.95, fender, steel, rubber)

	# Рама.
	_tube(root, BRACKET, SEAT_CLUSTER + Vector3(0, 0.02, 0.005), 0.016, frame)
	_add(root, Mesher.sweep([BRACKET + Vector3(0, 0.02, -0.02), BRACKET.lerp(HEAD_LOW, 0.5), HEAD_LOW + Vector3(0, 0.01, 0.015)], [Vector2(0.023, 0.023), Vector2(0.021, 0.021), Vector2(0.023, 0.023)], frame, 10))
	_add(root, Mesher.sweep([SEAT_CLUSTER, SEAT_CLUSTER.lerp(HEAD_TOP, 0.5), HEAD_TOP + Vector3(0, -0.02, 0.01)], [Vector2(0.015, 0.015), Vector2(0.014, 0.014), Vector2(0.016, 0.016)], frame, 10))
	_tube(root, HEAD_TOP + Vector3(0, 0.012, 0.004), HEAD_LOW + Vector3(0, -0.012, -0.004), 0.021, frame)
	for sx: float in [-1.0, 1.0]:
		var hub: Vector3 = REAR + Vector3(sx * 0.052, 0, 0)
		_tube(root, BRACKET + Vector3(sx * 0.03, -0.005, 0.03), hub, 0.0095, frame)
		_tube(root, SEAT_CLUSTER + Vector3(sx * 0.016, -0.015, 0.0), hub, 0.0078, frame)
		# Вилка с выносом вперёд.
		var crown: Vector3 = HEAD_LOW + Vector3(sx * 0.034, -0.03, -0.012)
		var fhub: Vector3 = FRONT + Vector3(sx * 0.05, 0, 0)
		var mid: Vector3 = crown.lerp(fhub, 0.55) + Vector3(0, 0.0, 0.015)
		_add(root, Mesher.sweep([crown, mid, fhub], [Vector2(0.0145, 0.0145), Vector2(0.012, 0.012), Vector2(0.007, 0.007)], frame, 8))
	_tube(root, HEAD_LOW + Vector3(-0.038, -0.028, -0.012), HEAD_LOW + Vector3(0.038, -0.028, -0.012), 0.012, frame)

	# Подседельный штырь и седло.
	_tube(root, SEAT_CLUSTER, SADDLE + Vector3(0, -0.02, 0.0), 0.0125, steel)
	_add(root, Mesher.sweep([SADDLE + Vector3(0, -0.005, 0.13), SADDLE + Vector3(0, 0.01, 0.075), SADDLE + Vector3(0, 0.005, -0.03), SADDLE + Vector3(0, -0.005, -0.15)], [Vector2(0.075, 0.016), Vector2(0.083, 0.024), Vector2(0.036, 0.022), Vector2(0.022, 0.016)], _mat(Color(0.05, 0.035, 0.03), 0.5), 12))

	# Руль, вынос, ручки, тормоза, звонок.
	var stem_top := Vector3(0, 0.985, -0.262)
	_tube(root, HEAD_TOP, stem_top, 0.0135, steel)
	var bar_c := Vector3(0, 1.0, -0.355)
	_tube(root, stem_top, bar_c, 0.015, dark)
	var grip_l := Vector3(-0.3, 1.025, -0.31)
	var grip_r := Vector3(0.3, 1.025, -0.31)
	_add(root, Mesher.sweep([grip_l, Vector3(-0.15, 1.012, -0.345), bar_c, Vector3(0.15, 1.012, -0.345), grip_r], [Vector2(0.011, 0.011), Vector2(0.011, 0.011), Vector2(0.012, 0.012), Vector2(0.011, 0.011), Vector2(0.011, 0.011)], steel, 8))
	for sx: float in [-1.0, 1.0]:
		var outer: Vector3 = Vector3(sx * 0.31, 1.026, -0.308)
		var inner: Vector3 = Vector3(sx * 0.195, 1.016, -0.334)
		_tube(root, inner, outer, 0.0165, rubber)
		_tube(root, inner + Vector3(sx * -0.015, 0.0, 0.0), inner + Vector3(sx * 0.085, -0.012, -0.055), 0.0052, steel)

	# Шатуны, педали, звезда, цепь.
	var fwd := Vector3(0.0, -0.5, -0.866)
	var right_pedal: Vector3 = BRACKET + Vector3(0.078, 0, 0) + fwd * CRANK
	var left_pedal: Vector3 = BRACKET + Vector3(-0.078, 0, 0) - fwd * CRANK
	_tube(root, BRACKET + Vector3(0.062, 0, 0), right_pedal, 0.0105, steel)
	_tube(root, BRACKET + Vector3(-0.062, 0, 0), left_pedal, 0.0105, steel)
	_tube(root, BRACKET + Vector3(-0.066, 0, 0), BRACKET + Vector3(0.066, 0, 0), 0.019, dark)
	_add(root, Mesher.lathe([Vector2(0.092, -0.003), Vector2(0.092, 0.003), Vector2(0.0, 0.003)], dark, 28), BRACKET + Vector3(0.05, 0, 0))
	_add(root, Mesher.lathe([Vector2(0.038, -0.003), Vector2(0.038, 0.003), Vector2(0.0, 0.003)], dark, 20), REAR + Vector3(0.05, 0, 0))
	var chain: StandardMaterial3D = _mat(Color(0.2, 0.2, 0.22), 0.4, 0.7)
	_tube(root, BRACKET + Vector3(0.05, 0.092, 0), REAR + Vector3(0.05, 0.038, 0), 0.0038, chain)
	_tube(root, BRACKET + Vector3(0.05, -0.092, 0), REAR + Vector3(0.05, -0.038, 0), 0.0038, chain)
	for pedal: Vector3 in [right_pedal, left_pedal]:
		var sx: float = signf(pedal.x)
		var pc: Vector3 = pedal + Vector3(sx * 0.055, 0, 0)
		var box := BoxMesh.new()
		box.size = Vector3(0.095, 0.02, 0.085)
		box.material = dark
		_add(root, box, pc)

	# Фонари и отражатели, как велит закон.
	_tube(root, Vector3(0, 0.99, -0.385), Vector3(0, 0.99, -0.425), 0.024, _lamp(Color(1.0, 0.98, 0.9), 1.6))
	var tail := BoxMesh.new()
	tail.size = Vector3(0.05, 0.032, 0.014)
	tail.material = _lamp(Color(0.85, 0.03, 0.03), 1.4)
	_add(root, tail, SEAT_CLUSTER + Vector3(0, 0.06, 0.05))

	var reflector := BoxMesh.new()
	reflector.size = Vector3(0.036, 0.05, 0.008)
	reflector.material = _lamp(Color(0.7, 0.03, 0.03), 0.2)
	var ra: float = 1.25
	var ri: MeshInstance3D = _add(root, reflector, REAR + Vector3(0.0, cos(ra), sin(ra)) * 0.368)
	ri.rotation.x = -ra + PI / 2.0
	# Ездок.
	var cloth: StandardMaterial3D = _mat(jacket, 0.72)
	var trousers: StandardMaterial3D = _mat(legs, 0.85)
	var skin: StandardMaterial3D = _mat(Color(0.85, 0.64, 0.52), 0.55)
	var glove: StandardMaterial3D = _mat(Color(0.05, 0.05, 0.06), 0.6)
	var shoe: StandardMaterial3D = _mat(Color(0.82, 0.82, 0.8), 0.5)
	var sole: StandardMaterial3D = _mat(Color(0.05, 0.05, 0.05), 0.8)
	var pelvis := Vector3(0, 1.055, 0.255)
	var waist := Vector3(0, 1.2, 0.165)
	var chest := Vector3(0, 1.36, 0.06)
	var shoulders := Vector3(0, 1.47, -0.02)
	var neck := Vector3(0, 1.545, -0.075)
	var head := Vector3(0, 1.655, -0.125)
	_add(root, Mesher.sweep([pelvis + Vector3(0, -0.075, 0.03), pelvis, pelvis.lerp(waist, 0.5)], [Vector2(0.11, 0.075), Vector2(0.168, 0.115), Vector2(0.152, 0.105)], trousers, 16))
	_add(root, Mesher.sweep([pelvis.lerp(waist, 0.32), waist, chest, shoulders, shoulders.lerp(neck, 0.55), neck], [Vector2(0.155, 0.112), Vector2(0.152, 0.104), Vector2(0.186, 0.125), Vector2(0.205, 0.105), Vector2(0.105, 0.072), Vector2(0.06, 0.055)], cloth, 16))
	_add(root, Mesher.sweep([neck + Vector3(0, -0.02, 0.01), neck + Vector3(0, 0.05, -0.02), head + Vector3(0, -0.07, 0.01)], [Vector2(0.05, 0.05), Vector2(0.047, 0.05), Vector2(0.05, 0.052)], skin, 12))
	_add(root, Mesher.pillow(head, Vector3(0.078, 0.108, 0.094), skin, -0.1))
	_add(root, Mesher.pillow(head + Vector3(0, -0.045, -0.092), Vector3(0.018, 0.022, 0.016), skin))
	var hair: StandardMaterial3D = _mat(Color(0.14, 0.09, 0.06), 0.7)
	_add(root, Mesher.pillow(head + Vector3(0, -0.005, 0.045), Vector3(0.08, 0.085, 0.06), hair))
	_helmet(root, head, _mat(Color(0.88, 0.88, 0.86), 0.28), _mat(Color(0.03, 0.03, 0.035), 0.8), dark)
	# Рюкзак с лямками и светоотражающей полосой.
	var pack: StandardMaterial3D = _mat(Color(0.1, 0.11, 0.14), 0.75)
	var back_c: Vector3 = chest + Vector3(0, -0.03, 0.17)
	_add(root, Mesher.pillow(back_c, Vector3(0.155, 0.22, 0.085), pack, -0.62))
	var band := BoxMesh.new()
	band.size = Vector3(0.24, 0.028, 0.012)
	band.material = _lamp(Color(0.85, 0.87, 0.82), 0.25)
	var bi: MeshInstance3D = _add(root, band, back_c + Vector3(0, 0.02, 0.09))
	bi.rotation.x = 0.55
	# Руки.
	for sx: float in [-1.0, 1.0]:
		var shoulder: Vector3 = shoulders + Vector3(sx * 0.195, -0.012, 0.01)
		var hand: Vector3 = Vector3(sx * 0.255, 1.042, -0.32)
		var elbow: Vector3 = shoulder.lerp(hand, 0.5) + Vector3(sx * 0.055, -0.045, 0.03)
		_add(root, Mesher.sweep([shoulder + Vector3(0, 0.012, 0), shoulder.lerp(elbow, 0.5), elbow], [Vector2(0.06, 0.06), Vector2(0.053, 0.055), Vector2(0.043, 0.045)], cloth, 12))
		_add(root, Mesher.sweep([elbow, elbow.lerp(hand, 0.45), hand + Vector3(0, 0.012, 0.03)], [Vector2(0.043, 0.045), Vector2(0.041, 0.041), Vector2(0.029, 0.029)], cloth, 12))
		_add(root, Mesher.pillow(hand + Vector3(0, 0.004, -0.004), Vector3(0.05, 0.03, 0.038), glove, -0.2))
		var strap_top: Vector3 = shoulders + Vector3(sx * 0.09, 0.06, 0.03)
		_add(root, Mesher.sweep([strap_top + Vector3(0, -0.012, 0.09), strap_top, chest + Vector3(sx * 0.13, 0.04, -0.115), chest + Vector3(sx * 0.155, -0.14, -0.05)], [Vector2(0.024, 0.006), Vector2(0.024, 0.007), Vector2(0.024, 0.006), Vector2(0.022, 0.006)], pack, 8))
	# Ноги: бедро, колено, голень, кроссовок на педали.
	for pedal: Vector3 in [right_pedal, left_pedal]:
		var sx: float = signf(pedal.x)
		var hip: Vector3 = pelvis + Vector3(sx * 0.09, -0.03, 0.0)
		var foot: Vector3 = pedal + Vector3(sx * 0.055, 0.0, 0.0)
		var ankle: Vector3 = foot + Vector3(0.0, 0.095, 0.05)
		var knee: Vector3 = _joint(hip, ankle, 0.44, 0.43)
		_add(root, Mesher.sweep([hip + (hip - knee).normalized() * 0.03, hip.lerp(knee, 0.35), hip.lerp(knee, 0.8), knee + (knee - hip).normalized() * 0.025], [Vector2(0.075, 0.082), Vector2(0.075, 0.082), Vector2(0.056, 0.06), Vector2(0.05, 0.052)], trousers, 12))
		_add(root, Mesher.sweep([knee, knee.lerp(ankle, 0.3), knee.lerp(ankle, 0.8), ankle], [Vector2(0.05, 0.052), Vector2(0.053, 0.058), Vector2(0.037, 0.04), Vector2(0.034, 0.036)], trousers, 12))
		_add(root, Mesher.sweep([foot + Vector3(0, 0.03, 0.105), foot + Vector3(0, 0.048, 0.05), foot + Vector3(0, 0.038, -0.045), foot + Vector3(0, 0.025, -0.13)], [Vector2(0.036, 0.024), Vector2(0.044, 0.044), Vector2(0.046, 0.032), Vector2(0.03, 0.017)], shoe, 12))
		var s_box := BoxMesh.new()
		s_box.size = Vector3(0.085, 0.013, 0.26)
		s_box.material = sole
		_add(root, s_box, foot + Vector3(0, 0.017, -0.012))
	return root
