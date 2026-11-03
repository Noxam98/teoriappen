class_name Person
extends RefCounted
## Человек в шаге. Смотрит вдоль -z. Размеры в метрах для роста 1.76, другой рост масштабируется целиком.
## Поза считается от ступней: обе стоят на земле, таз опущен так, чтобы передняя нога почти распрямилась,
## колени и локти находятся из длин костей, поэтому конечности не растягиваются и не висят над землёй.

const THIGH: float = 0.44
const SHIN: float = 0.43
const ANKLE: float = 0.085
const UPPER_ARM: float = 0.285
const FOREARM: float = 0.255


## hands: куда положить кисти, для x > 0 и x < 0; пусто, если руки свободно качаются. lean: наклон корпуса вперёд.
static func make(top: Color, legs: Color, skin: Color = Color(0.86, 0.66, 0.53), hair: Color = Color(0.2, 0.13, 0.08), height: float = 1.76, stride: float = 0.42, hands: Array = [], lean: float = 0.035) -> Node3D:
	var root := Node3D.new()
	var top_m: StandardMaterial3D = _cloth(top, 0.82)
	var leg_m: StandardMaterial3D = _cloth(legs, 0.88)
	var skin_m: StandardMaterial3D = _cloth(skin, 0.55)
	var hair_m: StandardMaterial3D = _cloth(hair, 0.7)
	var shoe_m: StandardMaterial3D = _cloth(Color(0.07, 0.07, 0.08), 0.5)
	var sole_m: StandardMaterial3D = _cloth(Color(0.78, 0.77, 0.73), 0.7)

	var walk: float = clampf(stride / 0.42, 0.0, 1.2)
	var half: float = stride * 0.76
	var heel_up: float = 0.62 * walk
	var toe_up: float = 0.3 * walk
	var track: float = 0.055 + 0.02 * walk
	# Нога с x > 0 впереди и встаёт на пятку, нога с x < 0 сзади и отталкивается носком.
	var front_y: float = _pitched(Vector3(0.0, ANKLE, -0.07), -toe_up).y
	var rear_y: float = 0.005 + _pitched(Vector3(0.0, ANKLE - 0.005, 0.2), heel_up).y
	var reach: float = (THIGH + SHIN) * 0.995
	var hip_y: float = front_y + sqrt(reach * reach - half * half)
	var dy: float = hip_y - 0.95
	var twist: float = stride * 0.3
	for side: float in [1.0, -1.0]:
		var ankle := Vector3(side * track, front_y if side > 0.0 else rear_y, -half * side)
		var hip := Vector3(side * 0.082, hip_y, -side * 0.028 * walk)
		var knee: Vector3 = _joint(hip, ankle, THIGH, SHIN, Vector3(side * 0.08, 0.0, -1.0))
		_add(root, _flesh([
			[hip.lerp(knee, -0.06), 0.08, 0.092],
			[hip.lerp(knee, 0.3), 0.078, 0.088],
			[hip.lerp(knee, 0.72), 0.062, 0.07],
			[knee, 0.054, 0.06],
			[knee.lerp(ankle, 0.28), 0.054, 0.066],
			[knee.lerp(ankle, 0.66), 0.044, 0.05],
			[knee.lerp(ankle, 0.97), 0.045, 0.05],
		], leg_m))
		var pitch: float = -toe_up if side > 0.0 else heel_up
		_shoe(root, ankle, pitch, side, shoe_m, sole_m)
		# Рука идёт навстречу ноге: при ноге впереди эта рука сзади.
		var shoulder: Vector3 = _torso(Vector3(side * 0.166, 1.395 + dy, 0.0), hip_y, lean, twist)
		var wrist: Vector3
		var elbow: Vector3
		if hands.size() == 2:
			var grip: Vector3 = hands[0 if side > 0.0 else 1]
			wrist = grip + (shoulder - grip).normalized() * 0.08
			elbow = _joint(shoulder, wrist, UPPER_ARM, FOREARM, Vector3(side * 0.7, -0.5, 0.5))
		else:
			var swing: float = -stride * side * 0.82
			var flex: float = 0.14 + maxf(swing, 0.0) * 0.8 + walk * 0.08
			elbow = shoulder + Vector3(side * 0.028, -cos(swing) * UPPER_ARM, -sin(swing) * UPPER_ARM)
			wrist = elbow + Vector3(-side * 0.012, -cos(swing + flex) * FOREARM, -sin(swing + flex) * FOREARM)
		_add(root, _flesh([
			[shoulder.lerp(elbow, -0.16), 0.008, 0.009],
			[shoulder.lerp(elbow, -0.13), 0.036, 0.04],
			[shoulder.lerp(elbow, -0.03), 0.052, 0.058],
			[shoulder.lerp(elbow, 0.22), 0.056, 0.063],
			[shoulder.lerp(elbow, 0.7), 0.047, 0.051],
			[elbow, 0.043, 0.046],
			[elbow.lerp(wrist, 0.4), 0.043, 0.045],
			[elbow.lerp(wrist, 0.97), 0.037, 0.036],
		], top_m, 16))
		var along: Vector3 = (wrist - elbow).normalized()
		_add(root, _flesh([
			[wrist - along * 0.015, 0.024, 0.024],
			[wrist + along * 0.04, 0.019, 0.036],
			[wrist + along * 0.09, 0.019, 0.041],
			[wrist + along * 0.145, 0.014, 0.028],
			[wrist + along * 0.172, 0.004, 0.008],
		], skin_m, 12))
		var thumb_at: Vector3 = wrist + along * 0.035 + Vector3(0.0, 0.0, -0.03)
		_add(root, _flesh([
			[thumb_at, 0.012, 0.012],
			[thumb_at + along * 0.05 + Vector3(0.0, 0.0, -0.016), 0.011, 0.011],
			[thumb_at + along * 0.078 + Vector3(0.0, 0.0, -0.018), 0.003, 0.003],
		], skin_m, 8))
	# Таз одного цвета с брюками: бёдра переходят в него без шва.
	var pelvis: Array = []
	for st: Array in [[0.84, 0.1, 0.07], [0.87, 0.14, 0.095], [0.91, 0.158, 0.108], [0.97, 0.16, 0.11], [1.03, 0.15, 0.1]]:
		var ring := PackedVector3Array()
		for j: int in 24:
			var t: float = TAU * j / 24.0
			ring.push_back(_torso(Vector3(cos(t) * st[1], st[0] + dy, sin(t) * st[2]), hip_y, lean, 0.0))
		pelvis.push_back(ring)
	_add(root, Mesher.loft(pelvis, leg_m))
	# Куртка до пояса: шире у подола, уже в талии, плечи скатываются к воротнику.
	var rings: Array = []
	for st: Array in [
		[0.955, 0.172, 0.122], [0.985, 0.17, 0.12], [1.03, 0.16, 0.111], [1.09, 0.156, 0.107], [1.17, 0.161, 0.111],
		[1.27, 0.172, 0.118], [1.35, 0.182, 0.118], [1.41, 0.182, 0.106], [1.445, 0.158, 0.09], [1.47, 0.112, 0.074],
		[1.49, 0.074, 0.064], [1.515, 0.062, 0.06], [1.522, 0.05, 0.05],
	]:
		var ring := PackedVector3Array()
		for j: int in 28:
			var t: float = TAU * j / 28.0
			ring.push_back(_torso(Vector3(cos(t) * st[1], st[0] + dy, sin(t) * st[2]), hip_y, lean, twist))
		rings.push_back(ring)
	_add(root, Mesher.loft(rings, top_m))
	# Голова держится прямо, корпус под ней чуть повёрнут.
	var c: Vector3 = _torso(Vector3(0.0, 1.645 + dy, -0.012), hip_y, lean * 0.6, 0.0)
	_add(root, _flesh([
		[_torso(Vector3(0.0, 1.48 + dy, 0.0), hip_y, lean, twist), 0.054, 0.056],
		[c + Vector3(0.0, -0.1, 0.018), 0.05, 0.052],
		[c + Vector3(0.0, -0.05, 0.02), 0.052, 0.054],
	], skin_m, 14))
	var skull: Array = []
	for i: int in 15:
		var a: float = PI * i / 14.0
		var k: float = -cos(a)
		var jaw: float = 1.0 - maxf(-k, 0.0) * 0.26
		var ring := PackedVector3Array()
		for j: int in 22:
			var t: float = TAU * j / 22.0
			ring.push_back(c + Vector3(cos(t) * 0.077 * sin(a) * jaw, k * 0.118, sin(t) * 0.097 * sin(a) * (1.0 - maxf(-k, 0.0) * 0.12) + minf(k, 0.0) * -0.012))
		skull.push_back(ring)
	_add(root, Mesher.loft(skull, skin_m, false))
	_add(root, _flesh([[c + Vector3(0.0, 0.016, -0.09), 0.009, 0.009], [c + Vector3(0.0, -0.016, -0.1), 0.014, 0.013], [c + Vector3(0.0, -0.028, -0.103), 0.004, 0.004]], skin_m, 10))
	var eye_m: StandardMaterial3D = _cloth(Color(0.04, 0.03, 0.03), 0.4)
	for side: float in [1.0, -1.0]:
		_add(root, _flesh([[c + Vector3(side * 0.077, 0.018, 0.006), 0.006, 0.012], [c + Vector3(side * 0.08, -0.01, 0.008), 0.008, 0.016], [c + Vector3(side * 0.077, -0.034, 0.004), 0.003, 0.005]], skin_m, 10))
		_add(root, _flesh([[c + Vector3(side * 0.031 - 0.006, 0.014, -0.083), 0.002, 0.003], [c + Vector3(side * 0.031, 0.014, -0.0855), 0.006, 0.005], [c + Vector3(side * 0.031 + 0.006, 0.014, -0.083), 0.002, 0.003]], eye_m, 8))
	# Волосы: оболочка поверх черепа. Линия волос выше лба спереди и у затылка сзади.
	var cap: Array = []
	for i: int in 13:
		var u: float = 1.0 - i / 12.0
		var ring := PackedVector3Array()
		for j: int in 24:
			var t: float = TAU * j / 24.0
			var a: float = u * lerpf(0.98, 1.98, (sin(t) + 1.0) / 2.0)
			ring.push_back(c + Vector3(sin(a) * cos(t) * 0.0825, cos(a) * 0.126, sin(a) * sin(t) * 0.104 + 0.002))
		cap.push_back(ring)
	_add(root, Mesher.loft(cap, hair_m, false))
	root.scale = Vector3.ONE * (height / 1.76)
	return root


static func _cloth(c: Color, rough: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = rough
	return m


static func _add(root: Node3D, mesh: Mesh) -> void:
	var i := MeshInstance3D.new()
	i.mesh = mesh
	root.add_child(i)


## Сустав между a и b при длинах костей la и lb; hint показывает, куда он выгибается.
static func _joint(a: Vector3, b: Vector3, la: float, lb: float, hint: Vector3) -> Vector3:
	var d: float = minf(a.distance_to(b), (la + lb) * 0.999)
	var along: Vector3 = (b - a).normalized()
	var x: float = (la * la - lb * lb + d * d) / (2.0 * d)
	var side: Vector3 = (hint - along * hint.dot(along)).normalized()
	return a + along * x + side * sqrt(maxf(la * la - x * x, 0.0))


## Точка корпуса: плечи повёрнуты навстречу тазу, выше таза корпус наклонён вперёд.
static func _torso(p: Vector3, hip_y: float, lean: float, twist: float) -> Vector3:
	var above: float = p.y - hip_y
	var t: float = twist * smoothstep(0.0, 0.5, above)
	return Vector3(p.x * cos(t) - p.z * sin(t), p.y, p.x * sin(t) + p.z * cos(t) - above * lean)


## Поворот ступни вокруг оси x: pitch > 0 поднимает пятку.
static func _pitched(v: Vector3, pitch: float) -> Vector3:
	return Vector3(v.x, v.y * cos(pitch) + v.z * sin(pitch), -v.y * sin(pitch) + v.z * cos(pitch))


## Плавная трубка по опорным точкам [точка, радиус вбок, радиус вглубь].
static func _flesh(ctrl: Array, material: Material, segments: int = 18) -> ArrayMesh:
	var points: Array = []
	var radii: Array = []
	var n: int = ctrl.size()
	for i: int in n - 1:
		var p0: Vector3 = ctrl[maxi(i - 1, 0)][0]
		var p1: Vector3 = ctrl[i][0]
		var p2: Vector3 = ctrl[i + 1][0]
		var p3: Vector3 = ctrl[mini(i + 2, n - 1)][0]
		for k: int in 4:
			var t: float = k / 4.0
			points.push_back(((p1 * 2.0) + (p2 - p0) * t + (p0 * 2.0 - p1 * 5.0 + p2 * 4.0 - p3) * t * t + (p1 * 3.0 - p0 - p2 * 3.0 + p3) * t * t * t) * 0.5)
			var s: float = smoothstep(0.0, 1.0, t)
			radii.push_back(Vector2(lerpf(ctrl[i][1], ctrl[i + 1][1], s), lerpf(ctrl[i][2], ctrl[i + 1][2], s)))
	points.push_back(ctrl[n - 1][0])
	radii.push_back(Vector2(ctrl[n - 1][1], ctrl[n - 1][2]))
	return Mesher.sweep(points, radii, material, segments)


## Ботинок с подошвой. Начало координат на подошве под лодыжкой, носок вдоль -z.
static func _shoe(root: Node3D, ankle: Vector3, pitch: float, side: float, upper: Material, sole: Material) -> void:
	var stations: Array = [
		[0.088, 0.012, 0.045, 0.018], [0.08, 0.03, 0.066, 0.004], [0.056, 0.042, 0.098, 0.0], [0.015, 0.046, 0.114, 0.0],
		[-0.03, 0.047, 0.1, 0.0], [-0.075, 0.051, 0.076, 0.0], [-0.125, 0.055, 0.06, 0.0], [-0.165, 0.052, 0.052, 0.0],
		[-0.195, 0.038, 0.044, 0.002], [-0.212, 0.014, 0.03, 0.012],
	]
	for part: int in 2:
		var rings: Array = []
		for st: Array in stations:
			var top: float = st[2] if part == 0 else minf(st[2], 0.024)
			var mid: float = lerpf(st[3], top, 0.3)
			var width: float = st[1] + (0.0 if part == 0 else 0.003)
			var ring := PackedVector3Array()
			for j: int in 16:
				var t: float = TAU * j / 16.0
				var up: float = sin(t)
				var y: float = mid + (top - mid) * up if up > 0.0 else mid + (mid - st[3]) * up
				var local := Vector3(signf(cos(t)) * pow(absf(cos(t)), 0.8) * width, y - ANKLE, st[0] * 0.92)
				local.x -= side * st[0] * 0.1
				ring.push_back(ankle + _pitched(local, pitch))
			rings.push_back(ring)
		_add(root, Mesher.loft(rings, upper if part == 0 else sole))


## Велосипедист: подробная модель в cyclist.gd.
static func cyclist(top: Color, legs: Color) -> Node3D:
	return Cyclist.make(top, legs)


## Человек на электросамокате. Едет вдоль -z.
static func scooter(top: Color, legs: Color) -> Node3D:
	var root := Node3D.new()
	var std := func(c: Color, rough: float = 0.6, metal: float = 0.0) -> StandardMaterial3D:
		var m := StandardMaterial3D.new()
		m.albedo_color = c
		m.roughness = rough
		m.metallic = metal
		return m
	var body: StandardMaterial3D = std.call(Color(0.05, 0.36, 0.26), 0.32, 0.25)
	var frame: StandardMaterial3D = std.call(Color(0.1, 0.11, 0.12), 0.42, 0.5)
	var steel: StandardMaterial3D = std.call(Color(0.62, 0.63, 0.65), 0.3, 0.8)
	var rubber: StandardMaterial3D = std.call(Color(0.02, 0.02, 0.02), 0.85)
	var tape: StandardMaterial3D = std.call(Color(0.035, 0.035, 0.04), 0.95)
	var front := Vector3(0, 0.115, -0.52)
	var rear := Vector3(0, 0.115, 0.5)
	for at: Vector3 in [front, rear]:
		var tyre := MeshInstance3D.new()
		tyre.mesh = Mesher.lathe([Vector2(0.066, -0.026), Vector2(0.1, -0.027), Vector2(0.111, -0.015), Vector2(0.115, 0.0), Vector2(0.111, 0.015), Vector2(0.1, 0.027), Vector2(0.066, 0.026)], rubber, 32)
		tyre.position = at
		root.add_child(tyre)
		var hub := MeshInstance3D.new()
		hub.mesh = Mesher.lathe([Vector2(0.0, -0.032), Vector2(0.024, -0.032), Vector2(0.07, -0.02), Vector2(0.07, 0.02), Vector2(0.024, 0.032), Vector2(0.0, 0.032)], steel, 24)
		hub.position = at
		root.add_child(hub)
	# Дека снизу толще, в ней батарея; сверху нескользящее покрытие.
	_add(root, _slab([[0.37, 0.03, 0.185, 0.16], [0.36, 0.07, 0.195, 0.135], [0.3, 0.085, 0.2, 0.112], [0.0, 0.09, 0.2, 0.098], [-0.25, 0.085, 0.2, 0.098], [-0.31, 0.06, 0.2, 0.125], [-0.335, 0.02, 0.19, 0.16]], body))
	_add(root, _slab([[0.34, 0.05, 0.204, 0.19], [0.3, 0.074, 0.206, 0.19], [-0.25, 0.074, 0.206, 0.19], [-0.3, 0.046, 0.204, 0.19]], tape))
	# Стойка наклонена назад: верх ближе к человеку, чем передняя ось.
	var stem := func(y: float) -> Vector3:
		return Vector3(0.0, y, front.z + (y - front.y) * 0.153)
	_add(root, _flesh([[Vector3(0, 0.15, -0.28), 0.05, 0.03], [Vector3(0, 0.17, -0.36), 0.04, 0.032], [Vector3(0, 0.24, -0.43), 0.032, 0.032], [stem.call(0.34), 0.034, 0.034]], body, 14))
	_add(root, _flesh([[stem.call(0.3), 0.036, 0.036], [stem.call(0.44), 0.034, 0.034]], frame, 14))
	_add(root, _flesh([[stem.call(0.42), 0.025, 0.025], [stem.call(0.62), 0.025, 0.025]], body, 14))
	_add(root, _flesh([[stem.call(0.6), 0.03, 0.032], [stem.call(0.67), 0.03, 0.032]], frame, 14))
	_add(root, _flesh([[stem.call(0.65), 0.02, 0.02], [stem.call(1.17), 0.02, 0.02]], body, 14))
	# Вилка обнимает переднее колесо с двух сторон.
	var crown: Vector3 = stem.call(0.3)
	_add(root, _flesh([[crown + Vector3(-0.044, 0.0, 0.0), 0.012, 0.016], [crown + Vector3(0.044, 0.0, 0.0), 0.012, 0.016]], frame, 10))
	for sx: float in [-1.0, 1.0]:
		_add(root, _flesh([[crown + Vector3(sx * 0.042, 0.005, 0.0), 0.009, 0.015], [front + Vector3(sx * 0.038, 0.0, 0.0), 0.009, 0.013]], frame, 10))
		# Задние перья от деки к оси.
		_add(root, _flesh([[Vector3(sx * 0.052, 0.16, 0.3), 0.008, 0.018], [rear + Vector3(sx * 0.038, 0.0, 0.0), 0.008, 0.013]], frame, 10))
	_scooter_fender(root, front, -1.15, 0.62, frame)
	_scooter_fender(root, rear, -0.42, 1.62, frame)
	# Руль: перекладина, грипсы, дисплей, рычаг тормоза.
	var bar_y: float = 1.16
	var bar_z: float = stem.call(bar_y).z
	_add(root, _flesh([[Vector3(-0.24, bar_y, bar_z), 0.011, 0.011], [Vector3(0.24, bar_y, bar_z), 0.011, 0.011]], frame, 10))
	for sx: float in [-1.0, 1.0]:
		_add(root, _flesh([[Vector3(sx * 0.135, bar_y, bar_z), 0.0165, 0.0165], [Vector3(sx * 0.2, bar_y, bar_z), 0.0175, 0.0175], [Vector3(sx * 0.248, bar_y, bar_z), 0.019, 0.019]], rubber, 12))
	_add(root, _flesh([[Vector3(0.1, bar_y + 0.005, bar_z - 0.02), 0.006, 0.006], [Vector3(0.14, bar_y - 0.012, bar_z - 0.05), 0.005, 0.005], [Vector3(0.21, bar_y - 0.022, bar_z - 0.052), 0.004, 0.004]], steel, 8))
	var pod := MeshInstance3D.new()
	pod.mesh = Mesher.pillow(Vector3(0.0, bar_y + 0.022, bar_z), Vector3(0.05, 0.014, 0.038), frame)
	root.add_child(pod)
	var screen := MeshInstance3D.new()
	screen.mesh = Mesher.pillow(Vector3(0.0, bar_y + 0.036, bar_z + 0.002), Vector3(0.034, 0.002, 0.024), Vehicles._lamp(Color(0.3, 0.75, 0.85), 0.8))
	root.add_child(screen)
	# Фара на стойке и стоп-сигнал на заднем крыле.
	var lamp_at: Vector3 = stem.call(1.02)
	var housing := MeshInstance3D.new()
	housing.mesh = Mesher.pillow(lamp_at + Vector3(0.0, 0.0, -0.024), Vector3(0.032, 0.026, 0.016), frame)
	root.add_child(housing)
	var lens := MeshInstance3D.new()
	lens.mesh = Mesher.pillow(lamp_at + Vector3(0.0, 0.0, -0.042), Vector3(0.024, 0.019, 0.004), Vehicles._lamp(Color(0.95, 0.95, 0.85), 1.6))
	root.add_child(lens)
	var tail := MeshInstance3D.new()
	tail.mesh = Mesher.pillow(rear + Vector3(0.0, 0.09, 0.098), Vector3(0.024, 0.008, 0.012), Vehicles._lamp(Color(0.85, 0.02, 0.03), 1.4), -0.7)
	root.add_child(tail)
	# Человек стоит на деке, кисти на грипсах: координаты руля пересчитаны в его систему.
	var at := Vector3(0.0, 0.206, 0.02)
	var size: float = 1.74 / 1.76
	var grips: Array = [(Vector3(0.19, bar_y, bar_z) - at) / size, (Vector3(-0.19, bar_y, bar_z) - at) / size]
	var rider: Node3D = make(top, legs, Color(0.86, 0.66, 0.53), Color(0.2, 0.13, 0.08), 1.74, 0.1, grips, 0.12)
	rider.position = at
	root.add_child(rider)
	return root


## Плита со скруглёнными углами вдоль z: станции [z, полуширина, верх, низ].
static func _slab(stations: Array, material: Material) -> ArrayMesh:
	var rings: Array = []
	for st: Array in stations:
		var mid: float = (st[2] + st[3]) / 2.0
		var half: float = (st[2] - st[3]) / 2.0
		var ring := PackedVector3Array()
		for j: int in 20:
			var t: float = TAU * j / 20.0
			var cx: float = cos(t)
			var sy: float = sin(t)
			ring.push_back(Vector3(signf(cx) * pow(absf(cx), 0.5) * st[1], mid + signf(sy) * pow(absf(sy), 0.5) * half, st[0]))
		rings.push_back(ring)
	return Mesher.loft(rings, material)


## Тонкое крыло над колесом. Углы от верха колеса: плюс назад, минус вперёд.
static func _scooter_fender(root: Node3D, axle: Vector3, a0: float, a1: float, material: Material) -> void:
	var rings: Array = []
	for k: int in 25:
		var a: float = lerpf(a0, a1, k / 24.0)
		var radial := Vector3(0.0, cos(a), sin(a))
		var ring := PackedVector3Array()
		for j: int in 10:
			var t: float = TAU * j / 10.0
			var x: float = cos(t) * 0.036
			var dip: float = (x / 0.036) * (x / 0.036) * -0.012
			ring.push_back(axle + Vector3(x, 0.0, 0.0) + radial * (0.13 + dip + sin(t) * 0.0035))
		rings.push_back(ring)
	_add(root, Mesher.loft(rings, material))
