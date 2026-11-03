class_name Vehicles
extends RefCounted
## Большой транспорт: автобус, трамвай, скорая и трактор. Смотрят вдоль -z.

const SHADER: Shader = preload("res://shaders/car.gdshader")
## Группы сглаживания сегментов сечения: низ, нижняя кромка, борт, верхняя кромка и крыша.
const BANDS: PackedInt32Array = [1, 1, 2, 3, 3, 3, 4, 4, 4, 4]


## Сечение коробчатого кузова: половина от низа по центру до верха по центру.
static func _half(hw: float, b: float, top: float, r: float) -> Array:
	return [Vector2(0.0, b), Vector2(hw * 0.6, b), Vector2(hw - 0.08, b), Vector2(hw, b + 0.09), Vector2(hw, lerpf(b, top, 0.4)), Vector2(hw, lerpf(b, top, 0.75)), Vector2(hw, top - r * 1.1), Vector2(hw - r * 0.32, top - r * 0.32), Vector2(hw - r, top), Vector2(hw * 0.45, top + 0.025), Vector2(0.0, top + 0.03)]


## Кузов из станций [z, верх, полуширина]: между станциями прямые переходы с мелким шагом.
static func _body(stations: Array, b: float, r: float, material: Material) -> ArrayMesh:
	var rings: Array = []
	var zones := PackedInt32Array()
	for i: int in stations.size() - 1:
		var s0: Array = stations[i]
		var s1: Array = stations[i + 1]
		var n: int = maxi(1, roundi(absf(s1[0] - s0[0]) / 0.14))
		for k: int in n:
			var t: float = float(k) / n
			var half: Array = _half(lerpf(s0[2], s1[2], t), b, lerpf(s0[1], s1[1], t), r)
			rings.push_back(_ring(half, lerpf(s0[0], s1[0], t)))
			zones.push_back(0)
	var last: Array = stations[stations.size() - 1]
	rings.push_back(_ring(_half(last[2], b, last[1], r), last[0]))
	var groups := PackedInt32Array()
	for g: int in BANDS:
		groups.push_back(g)
	for j: int in range(BANDS.size() - 1, -1, -1):
		groups.push_back(BANDS[j] + 20)
	return Mesher.creased_loft(rings, groups, zones, material)


static func _ring(half: Array, z: float) -> PackedVector3Array:
	var ring := PackedVector3Array()
	for p: Vector2 in half:
		ring.push_back(Vector3(p.x, p.y, z))
	for j: int in range(half.size() - 2, 0, -1):
		ring.push_back(Vector3(-half[j].x, half[j].y, z))
	return ring


static func _params(l: float, h: float, w: float, axle: float, wheel: float, arch: float, side: String, key: String, top: String = "", front: String = "", rear: String = "", trim_y: float = 1.1) -> Dictionary:
	var p: Dictionary = {"half_length": l, "height": h, "half_width": w, "arch_z": axle, "arch_zf": axle, "arch_y": wheel, "arch_r": arch, "trim_y": trim_y, "side_mask": Car._svg("side-" + key, side)}
	if top != "":
		p["top_mask"] = Car._svg("top-" + key, top)
	if front != "":
		p["front_mask"] = Car._svg("front-" + key, front)
	if rear != "":
		p["rear_mask"] = Car._svg("rear-" + key, rear)
	return p


static func _lamp(c: Color, energy: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = 0.12
	m.emission_enabled = true
	m.emission = c
	m.emission_energy_multiplier = energy
	return m


## Ореол маячка: белая сердцевина, насыщенный синий и четыре луча. Прозрачность обычная, а не сложение:
## сложенный синий на жёлтой стене дал бы белёсое пятно.
static func _flare() -> ImageTexture:
	var n: int = 128
	var image := Image.create(n, n, false, Image.FORMAT_RGBA8)
	for py: int in n:
		for px: int in n:
			var u: float = (px + 0.5) / n * 2.0 - 1.0
			var v: float = (py + 0.5) / n * 2.0 - 1.0
			var r: float = sqrt(u * u + v * v)
			var edge: float = clampf(1.0 - r, 0.0, 1.0)
			var rays: float = (exp(-absf(v) * 34.0) + exp(-absf(u) * 34.0)) * edge * edge
			var glow: float = pow(edge, 2.4) * 1.5
			var core: float = 1.0 - smoothstep(0.03, 0.15, r)
			var c: Color = Color(0.02, 0.2, 1.0).lerp(Color(0.85, 0.92, 1.0), core)
			c.a = clampf(glow + rays * 0.9, 0.0, 1.0)
			image.set_pixel(px, py, c)
	return ImageTexture.create_from_image(image)


## Ореол всегда лицом к камере и поверх кузова: иначе крыша срезает его нижнюю половину.
static func _beacon(root: Node3D, pos: Vector3, size: float, flare: Texture2D) -> void:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	m.no_depth_test = true
	m.disable_fog = true
	m.albedo_texture = flare
	var quad := QuadMesh.new()
	quad.size = Vector2(size, size)
	quad.material = m
	var node := MeshInstance3D.new()
	node.mesh = quad
	node.position = pos
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(node)


static func _text(root: Node3D, text: String, pos: Vector3, yaw: float, size: float, color: Color) -> void:
	var font := SystemFont.new()
	font.font_names = PackedStringArray(["Liberation Sans", "Arial", "DejaVu Sans"])
	font.font_weight = 700
	var l := Label3D.new()
	l.text = text
	l.font = font
	l.font_size = 96
	l.outline_size = 0
	l.modulate = color
	l.shaded = false
	l.pixel_size = size / 96.0
	l.rotation.y = yaw
	l.position = pos
	root.add_child(l)


## Сечение городского автобуса: юбка, поясная грань, наклонённая стеклянная часть, скруглённая крыша.
static func _bus_half(hw: float, b: float, top: float) -> Array:
	var belt: float = minf(1.08, top - 0.03)
	var glass_top: float = minf(2.66, top - 0.02)
	var pts: Array = [
		Vector2(0.0, b), Vector2(hw * 0.7, b), Vector2(hw - 0.05, b), Vector2(hw * 0.985, b + 0.07),
		Vector2(hw * 0.995, lerpf(b + 0.07, belt, 0.45)), Vector2(hw, belt - 0.08), Vector2(hw * 0.992, belt),
		Vector2(hw * 0.984, belt + 0.02), Vector2(lerpf(hw * 0.984, hw * 0.905, 0.5), lerpf(belt + 0.02, glass_top, 0.5)),
		Vector2(hw * 0.905, glass_top), Vector2(hw * 0.89, minf(2.76, top - 0.012)),
		Vector2(hw * 0.78, top - 0.1), Vector2(hw * 0.52, top - 0.03), Vector2(hw * 0.25, top - 0.006), Vector2(0.0, top),
	]
	for i: int in range(1, pts.size()):
		if pts[i].y < pts[i - 1].y + 0.0015:
			pts[i] = Vector2(pts[i].x, pts[i - 1].y + 0.0015)
	return pts


const BUS_BANDS: PackedInt32Array = [1, 1, 2, 3, 3, 3, 4, 5, 5, 6, 7, 7, 7, 7]


static func _bus_body(material: Material) -> ArrayMesh:
	var stations: Array = [[-6.0, 0.92, 0.92], [-5.985, 1.0, 1.02], [-5.95, 1.1, 1.1], [-5.88, 1.4, 1.16], [-5.78, 1.85, 1.2], [-5.66, 2.35, 1.23], [-5.54, 2.76, 1.25], [-5.4, 2.98, 1.265], [-5.1, 3.08, 1.27], [5.2, 3.08, 1.27], [5.62, 2.98, 1.26], [5.82, 2.78, 1.24], [5.93, 2.55, 1.2], [6.0, 2.2, 1.1]]
	var rings: Array = []
	var zones := PackedInt32Array()
	for i: int in stations.size() - 1:
		var s0: Array = stations[i]
		var s1: Array = stations[i + 1]
		var n: int = maxi(3, roundi(absf(s1[0] - s0[0]) / 0.15))
		for k: int in n:
			var t: float = float(k) / n
			rings.push_back(_ring(_bus_half(lerpf(s0[2], s1[2], t), 0.36, lerpf(s0[1], s1[1], t)), lerpf(s0[0], s1[0], t)))
			zones.push_back(0)
	var last: Array = stations[stations.size() - 1]
	rings.push_back(_ring(_bus_half(last[2], 0.36, last[1]), last[0]))
	var groups := PackedInt32Array()
	for g: int in BUS_BANDS:
		groups.push_back(g)
	for j: int in range(BUS_BANDS.size() - 1, -1, -1):
		groups.push_back(BUS_BANDS[j] + 20)
	return Mesher.creased_loft(rings, groups, zones, material)


## Современный городской автобус: наклонное лобовое стекло, блок на крыше, двери и салон с поручнями.
static func bus(color: Color) -> Node3D:
	var root := Node3D.new()
	var L: float = 6.2
	var H: float = 3.5
	var W: float = 1.35
	var front_axle: float = 3.3
	var rear_axle: float = 2.75
	var wheel_r: float = 0.5
	var arch: float = 0.59
	var x := func(z: float) -> float:
		return (z + L) * 100.0
	var y := func(v: float) -> float:
		return (H - v) * 100.0
	var head := '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 350" width="2480" height="700"><rect width="1240" height="350" fill="#000"/>'
	var band := '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="#0f0"/>' % [x.call(-5.45), y.call(2.72), 10.9 * 100.0, 1.68 * 100.0]
	var skirt := '<rect y="%.1f" width="1240" height="60" fill="#0f0"/>' % y.call(0.56)
	var seams := ""
	var sz: float = -4.6
	while sz < 5.8:
		seams += '<rect x="%.1f" y="%.1f" width="0.8" height="%.1f" fill="#0f0"/>' % [x.call(sz), y.call(1.04), 0.5 * 100.0]
		sz += 1.5
	var arches := ""
	for s: float in [-front_axle, rear_axle]:
		arches += '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#0f0"/>' % [x.call(s), y.call(wheel_r), (arch + 0.05) * 100.0]
	var win := func(z0: float, z1: float, v0: float, v1: float) -> String:
		return '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="4" fill="#f00"/>' % [x.call(z0), y.call(v1), (z1 - z0) * 100.0, (v1 - v0) * 100.0]
	var door := func(z0: float, z1: float) -> String:
		var out: String = '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="#0f0"/>' % [x.call(z0) - 3.0, y.call(2.68), (z1 - z0) * 100.0 + 6.0, 2.3 * 100.0]
		var mid: float = (z0 + z1) / 2.0
		out += win.call(z0 + 0.03, mid - 0.025, 0.52, 2.62) + win.call(mid + 0.025, z1 - 0.03, 0.52, 2.62)
		out += '<rect x="%.1f" y="%.1f" width="%.1f" height="3" fill="#0f0"/>' % [x.call(z0), y.call(1.6), (z1 - z0) * 100.0]
		return out
	var right: String = head + band + skirt + seams + arches
	var left: String = right
	# Окна правого борта идут между дверями, у левого сплошным рядом с окном водителя.
	for span: Array in [[-3.95, -0.8], [0.7, 5.5]]:
		var a0: float = span[0]
		while a0 < float(span[1]) - 0.3:
			var a1: float = minf(a0 + 1.5, span[1])
			right += win.call(a0 + 0.025, a1 - 0.025, 1.12, 2.64)
			a0 = a1
	right += door.call(-5.32, -4.02) + door.call(-0.72, 0.62)
	var a2: float = -5.42
	left += win.call(a2, -4.5, 1.3, 2.62)
	a2 = -4.45
	while a2 < 5.2:
		var a3: float = minf(a2 + 1.5, 5.5)
		left += win.call(a2 + 0.025, a3 - 0.025, 1.12, 2.64)
		a2 = a3
	right += '</svg>'
	left += '</svg>'
	var front := '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 270 350" width="1080" height="1400"><rect width="270" height="350" fill="#000"/><rect x="20" y="62" width="230" height="200" rx="16" fill="#0f0"/><rect x="30" y="102" width="210" height="154" rx="12" fill="#f00"/></svg>'
	var rear := '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 270 350" width="1080" height="1400"><rect width="270" height="350" fill="#000"/><rect x="36" y="84" width="198" height="86" rx="8" fill="#0f0"/><rect x="44" y="92" width="182" height="70" rx="6" fill="#f00"/><g fill="#0f0"><rect x="52" y="214" width="166" height="4"/><rect x="52" y="224" width="166" height="4"/><rect x="52" y="234" width="166" height="4"/><rect x="52" y="244" width="166" height="4"/><rect x="52" y="254" width="166" height="4"/></g><rect y="290" width="270" height="60" fill="#0f0"/></svg>'
	var params: Dictionary = _params(L, H, W, rear_axle, wheel_r, arch, right, "bus", "", front, rear, 1.15)
	params["arch_zf"] = front_axle
	params["has_left"] = true
	params["side_left"] = Car._svg("side-left-bus", left)
	Car.shell(root, _bus_body(Car.shell_material(color, params)), params)
	var dark: StandardMaterial3D = Car.mat(Color(0.02, 0.02, 0.022), 0.8)
	var ceiling: StandardMaterial3D = Car.mat(Color(0.72, 0.72, 0.7), 0.7)
	for s: float in [-front_axle, rear_axle]:
		for sx: float in [-1.0, 1.0]:
			Car.box(root, Vector3(0.62, 1.14, 1.34), Vector3(sx * 0.82, 0.9, s), Car.mat(Color(0.12, 0.13, 0.15), 0.8))
			var w: Node3D = Car.wheel(wheel_r)
			w.scale = Vector3(1.25, 1.0, 1.0)
			w.position = Vector3(sx * 1.13, wheel_r, s)
			if sx < 0.0:
				w.rotation.y = PI
			root.add_child(w)
	# Блок на крыше, фары, фонари, зеркала, номера, табло.
	var pod := MeshInstance3D.new()
	pod.mesh = Mesher.pillow(Vector3(0, 3.2, 1.1), Vector3(0.92, 0.17, 3.9), Car.mat(color.lerp(Color(0.8, 0.8, 0.8), 0.25), 0.7))
	root.add_child(pod)
	var head_l: StandardMaterial3D = _lamp(Color(0.95, 0.96, 0.92), 0.35)
	var tail: StandardMaterial3D = _lamp(Color(0.72, 0.03, 0.04), 0.3)
	for sx: float in [-1.0, 1.0]:
		var lamp := MeshInstance3D.new()
		lamp.mesh = Mesher.pillow(Vector3(sx * 0.72, 0.8, -5.99), Vector3(0.27, 0.075, 0.02), head_l)
		root.add_child(lamp)
		Car.box(root, Vector3(0.1, 0.6, 0.03), Vector3(sx * 0.98, 1.3, 6.0), tail)
		var arm := MeshInstance3D.new()
		arm.mesh = Mesher.limb(Vector3(sx * 1.05, 2.82, -5.42), Vector3(sx * 1.46, 2.62, -5.62), 0.022, 0.022, dark)
		root.add_child(arm)
		var mirror := MeshInstance3D.new()
		mirror.mesh = Mesher.pillow(Vector3(sx * 1.47, 2.36, -5.62), Vector3(0.1, 0.27, 0.045), dark)
		root.add_child(mirror)
	Car.box(root, Vector3(1.5, 0.3, 0.04), Vector3(0, 0.55, -5.99), dark)
	Car.box(root, Vector3(0.52, 0.115, 0.02), Vector3(0, 0.6, -6.015), Car.mat(Color(0.86, 0.86, 0.82), 0.5))
	Car.box(root, Vector3(0.52, 0.115, 0.02), Vector3(0, 0.74, 6.005), Car.mat(Color(0.86, 0.86, 0.82), 0.5))
	Car.box(root, Vector3(1.9, 0.26, 0.04), Vector3(0, 2.76, -5.53), dark, Vector3(0.26, 0, 0))
	_text(root, "31 Tonsenhagen", Vector3(0, 2.76, -5.56), PI, 0.2, Color(1.0, 0.62, 0.1))
	Car.box(root, Vector3(0.02, 0.2, 1.3), Vector3(1.16, 2.72, 2.2), dark)
	_text(root, "31", Vector3(1.175, 2.72, 2.2), PI / 2.0, 0.17, Color(1.0, 0.62, 0.1))
	# Салон: пол с подиумом сзади, потолок, сиденья, поручни, место водителя, пассажиры.
	var floor_m: StandardMaterial3D = Car.mat(Color(0.2, 0.22, 0.25), 0.85)
	Car.box(root, Vector3(2.36, 0.06, 10.6), Vector3(0, 0.42, -0.2), floor_m)
	Car.box(root, Vector3(2.36, 0.34, 3.6), Vector3(0, 0.62, 3.9), floor_m)
	Car.box(root, Vector3(2.0, 0.04, 10.4), Vector3(0, 2.78, -0.1), ceiling)
	var strip: StandardMaterial3D = _lamp(Color(1.0, 0.98, 0.92), 0.8)
	for sx: float in [-0.72, 0.72]:
		Car.box(root, Vector3(0.1, 0.02, 9.6), Vector3(sx, 2.755, 0.0), strip)
	var seat_m: StandardMaterial3D = Car.mat(Color(0.12, 0.2, 0.42), 0.85)
	var shell_m: StandardMaterial3D = Car.mat(Color(0.5, 0.5, 0.52), 0.5)
	var yellow: StandardMaterial3D = Car.mat(Color(0.9, 0.68, 0.08), 0.4, 0.2)
	var rows: Array = []
	var rz: float = -3.2
	while rz < -1.0:
		rows.push_back([rz, 0.45, [-1.0, 1.0]])
		rz += 0.82
	rz = 0.95
	while rz < 2.0:
		rows.push_back([rz, 0.45, [-1.0, 1.0]])
		rz += 0.82
	rz = 2.45
	while rz < 5.4:
		rows.push_back([rz, 0.79, [-1.0, 1.0]])
		rz += 0.84
	var tones: Array = [Color(0.2, 0.28, 0.38), Color(0.5, 0.16, 0.14), Color(0.16, 0.34, 0.24), Color(0.45, 0.38, 0.2), Color(0.3, 0.3, 0.33)]
	var who: int = 0
	for r: Array in rows:
		var fy: float = r[1]
		for sx: float in r[2]:
			for off: float in [0.56, 0.98]:
				var c := Vector3(sx * off, fy + 0.44, r[0])
				var cushion := MeshInstance3D.new()
				cushion.mesh = Mesher.pillow(c, Vector3(0.2, 0.05, 0.2), seat_m)
				root.add_child(cushion)
				var back := MeshInstance3D.new()
				back.mesh = Mesher.pillow(c + Vector3(0, 0.32, 0.2), Vector3(0.195, 0.31, 0.04), seat_m, 0.08)
				root.add_child(back)
				Car.box(root, Vector3(0.06, 0.4, 0.06), c + Vector3(0, -0.24, 0), shell_m)
				who += 1
				if who % 5 == 2:
					Car.occupant(root, c + Vector3(0, 0.02, 0.04), tones[who % tones.size()])
	var pz: float = -3.0
	while pz < 5.4:
		for sx: float in [-0.34, 0.34]:
			var pole := MeshInstance3D.new()
			pole.mesh = Mesher.limb(Vector3(sx, 0.44, pz), Vector3(sx, 2.76, pz), 0.018, 0.018, yellow)
			root.add_child(pole)
		pz += 1.65
	for sx: float in [-0.34, 0.34]:
		var rail := MeshInstance3D.new()
		rail.mesh = Mesher.limb(Vector3(sx, 2.5, -4.0), Vector3(sx, 2.5, 5.4), 0.016, 0.016, yellow)
		root.add_child(rail)
	# Рабочее место водителя.
	var plastic: StandardMaterial3D = Car.mat(Color(0.05, 0.05, 0.055), 0.6)
	var dash := MeshInstance3D.new()
	dash.mesh = Mesher.pillow(Vector3(0, 1.06, -5.42), Vector3(1.1, 0.13, 0.22), plastic)
	root.add_child(dash)
	Car.box(root, Vector3(2.2, 0.6, 0.3), Vector3(0, 0.74, -5.46), plastic)
	Car.steering(root, Vector3(-0.56, 1.28, -4.98), 0.24, 1.05, plastic)
	var d_seat := MeshInstance3D.new()
	d_seat.mesh = Mesher.pillow(Vector3(-0.56, 0.92, -4.42), Vector3(0.25, 0.08, 0.25), seat_m)
	root.add_child(d_seat)
	var d_back := MeshInstance3D.new()
	d_back.mesh = Mesher.pillow(Vector3(-0.56, 1.32, -4.14), Vector3(0.24, 0.36, 0.08), seat_m, 0.12)
	root.add_child(d_back)
	Car.occupant(root, Vector3(-0.56, 0.96, -4.38), Color(0.14, 0.18, 0.28), [Vector3(-0.72, 1.33, -4.98), Vector3(-0.4, 1.33, -4.98)])
	Car.box(root, Vector3(0.05, 1.5, 0.9), Vector3(-0.1, 1.2, -4.3), Car.mat(Color(0.5, 0.55, 0.58), 0.4))
	# Стоящие пассажиры в проходе.
	for spot: Array in [[0.05, -1.9, Color(0.55, 0.2, 0.14), 0.4], [-0.08, 0.1, Color(0.2, 0.32, 0.46), 2.6]]:
		var p: Node3D = Person.make(spot[2], Color(0.1, 0.12, 0.18), Color(0.86, 0.66, 0.53), Color(0.2, 0.13, 0.08), 1.72, 0.04)
		p.position = Vector3(spot[0], 0.45, spot[1])
		p.rotation.y = spot[3]
		root.add_child(p)
	return root


static func tram(color: Color) -> Node3D:
	var root := Node3D.new()
	var L: float = 8.6
	var H: float = 3.6
	var W: float = 1.4
	var x := func(z: float) -> float:
		return (z + L) * 100.0
	var side := '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1720 360" width="3440" height="720"><rect width="1720" height="360" fill="#000"/>'
	side += '<rect x="%.1f" y="82" width="%.1f" height="150" fill="#f00"/>' % [x.call(-7.8), 15.6 * 100.0]
	var z: float = -7.8
	while z < 7.8:
		side += '<rect x="%.1f" y="82" width="7" height="150" fill="#0f0"/>' % x.call(z)
		z += 1.3
	for dz: float in [-5.2, -0.65, 3.9]:
		side += '<rect x="%.1f" y="72" width="130" height="270" fill="#f00" stroke="#0f0" stroke-width="5"/><rect x="%.1f" y="72" width="5" height="270" fill="#0f0"/>' % [x.call(dz), x.call(dz + 0.65) - 2.5]
	side += '<rect y="340" width="1720" height="20" fill="#0f0"/></svg>'
	var front := '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 360" width="1120" height="1440"><rect width="280" height="360" fill="#000"/><rect x="42" y="74" width="196" height="146" rx="12" fill="#f00"/><rect x="62" y="36" width="156" height="32" rx="3" fill="#0f0"/></svg>'
	var params: Dictionary = _params(L, H, W, 0.0, 0.0, 0.0, side, "tram", "", front, front, 1.35)
	Car.shell(root, _body([[-8.5, 3.1, 1.12], [-8.38, 3.24, 1.2], [-7.9, 3.32, 1.3], [7.9, 3.32, 1.3], [8.38, 3.24, 1.2], [8.5, 3.1, 1.12]], 0.2, 0.24, Car.shell_material(color, params)), params)
	var seat_t: StandardMaterial3D = Car.mat(Color(0.14, 0.24, 0.4), 0.85)
	var yellow_t: StandardMaterial3D = Car.mat(Color(0.85, 0.65, 0.1), 0.4, 0.2)
	Car.box(root, Vector3(2.4, 0.06, 16.4), Vector3(0, 0.42, 0), Car.mat(Color(0.2, 0.22, 0.25), 0.85))
	Car.box(root, Vector3(2.2, 0.04, 16.2), Vector3(0, 3.08, 0), Car.mat(Color(0.72, 0.72, 0.7), 0.7))
	var tz: float = -7.0
	var tn: int = 0
	while tz < 7.2:
		for sx: float in [-1.0, 1.0]:
			if absf(tz + 4.55) < 0.8 or absf(tz) < 0.8 or absf(tz - 4.55) < 0.8:
				continue
			var cc := Vector3(sx * 0.82, 0.88, tz)
			var cu := MeshInstance3D.new()
			cu.mesh = Mesher.pillow(cc, Vector3(0.38, 0.05, 0.2), seat_t)
			root.add_child(cu)
			var ba := MeshInstance3D.new()
			ba.mesh = Mesher.pillow(cc + Vector3(0, 0.34, 0.2), Vector3(0.37, 0.32, 0.04), seat_t, 0.08)
			root.add_child(ba)
			tn += 1
			if tn % 4 == 1:
				Car.occupant(root, cc + Vector3(sx * -0.16, 0.02, 0.04), Color(0.45, 0.25, 0.2) if tn % 8 == 1 else Color(0.2, 0.3, 0.42))
		var po := MeshInstance3D.new()
		po.mesh = Mesher.limb(Vector3(0.42, 0.44, tz + 0.4), Vector3(0.42, 3.06, tz + 0.4), 0.018, 0.018, yellow_t)
		root.add_child(po)
		tz += 1.1
	var dark: StandardMaterial3D = Car.mat(Color(0.05, 0.05, 0.055), 0.6)
	var head: StandardMaterial3D = _lamp(Color(0.95, 0.96, 0.92), 0.45)
	var tail: StandardMaterial3D = _lamp(Color(0.72, 0.03, 0.04), 0.3)
	for sz: float in [-1.0, 1.0]:
		for sx: float in [-1.0, 1.0]:
			Car.box(root, Vector3(0.24, 0.1, 0.03), Vector3(sx * 0.72, 0.95, sz * 8.51), head if sz < 0.0 else tail)
	var a := Vector3(0, 3.36, 1.2)
	var b := Vector3(0, 3.95, 0.4)
	var c := Vector3(0, 4.5, 1.0)
	for pair: Array in [[a, b], [b, c]]:
		var arm := MeshInstance3D.new()
		arm.mesh = Mesher.limb(pair[0], pair[1], 0.03, 0.025, dark)
		root.add_child(arm)
	Car.box(root, Vector3(1.2, 0.04, 0.1), c, dark)
	Car.box(root, Vector3(1.4, 0.2, 3.0), Vector3(0, 3.42, 1.0), Car.mat(Color(0.5, 0.52, 0.55), 0.6))
	_text(root, "18 Rikshospitalet", Vector3(0, 3.0, -8.512), PI, 0.17, Color(1.0, 0.62, 0.1))
	return root


static func ambulance() -> Node3D:
	var root := Node3D.new()
	var color := Color(0.93, 0.8, 0.08)
	var L: float = 3.0
	var H: float = 2.7
	var W: float = 1.1
	var axle: float = 1.6
	var wheel_r: float = 0.36
	var arch: float = 0.42
	var x := func(z: float) -> float:
		return (z + L) * 100.0
	var side := '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 270" width="2400" height="1080"><rect width="600" height="270" fill="#000"/>'
	side += '<path d="M%.1f 118 L%.1f 56 L%.1f 56 L%.1f 118 Z" fill="#f00" stroke="#0f0" stroke-width="2"/>' % [x.call(-1.5), x.call(-1.12), x.call(-0.2), x.call(-0.2)]
	side += '<rect y="238" width="600" height="32" fill="#0f0"/>'
	for s: float in [-axle, axle]:
		side += '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#0f0"/>' % [x.call(s), (H - wheel_r) * 100.0, (arch + 0.03) * 100.0]
	side += '</svg>'
	var top := '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 600" width="880" height="2400"><rect width="220" height="600" fill="#000"/><path d="M26 146 Q110 136 194 146 L184 204 Q110 198 36 204 Z" fill="#f00" stroke="#0f0" stroke-width="2"/></svg>'
	var front := '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 270" width="880" height="1080"><rect width="220" height="270" fill="#000"/><rect x="62" y="172" width="96" height="24" rx="4" fill="#0f0"/><rect x="40" y="214" width="140" height="22" rx="4" fill="#0f0"/></svg>'
	var rear := '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 270" width="880" height="1080"><rect width="220" height="270" fill="#000"/><rect x="26" y="58" width="74" height="70" rx="6" fill="#f00"/><rect x="120" y="58" width="74" height="70" rx="6" fill="#f00"/><rect x="108" y="30" width="4" height="200" fill="#0f0"/><rect x="24" y="226" width="172" height="24" fill="#0f0"/></svg>'
	var params: Dictionary = _params(L, H, W, axle, wheel_r, arch, side, "amb", top, front, rear, 1.3)
	Car.shell(root, _body([[-2.9, 1.05, 0.88], [-2.78, 1.14, 0.97], [-2.3, 1.28, 1.02], [-1.75, 1.48, 1.03], [-1.2, 2.2, 1.03], [-0.9, 2.42, 1.03], [2.75, 2.48, 1.03], [2.9, 2.36, 0.98]], 0.34, 0.14, Car.shell_material(color, params)), params)
	var seat_a: StandardMaterial3D = Car.mat(Color(0.08, 0.08, 0.09), 0.9)
	var plast_a: StandardMaterial3D = Car.mat(Color(0.05, 0.05, 0.055), 0.65)
	var dash_a := MeshInstance3D.new()
	dash_a.mesh = Mesher.pillow(Vector3(0, 1.32, -1.5), Vector3(0.95, 0.12, 0.28), plast_a)
	root.add_child(dash_a)
	Car.box(root, Vector3(1.9, 0.7, 0.3), Vector3(0, 0.92, -1.56), plast_a)
	Car.box(root, Vector3(1.96, 0.05, 1.5), Vector3(0, 0.62, -0.6), plast_a)
	Car.box(root, Vector3(1.96, 1.7, 0.05), Vector3(0, 1.5, 0.0), Car.mat(Color(0.75, 0.76, 0.74), 0.6))
	Car.steering(root, Vector3(-0.46, 1.42, -1.16), 0.19, 0.6, plast_a)
	for sx: float in [-0.46, 0.46]:
		var s1 := MeshInstance3D.new()
		s1.mesh = Mesher.pillow(Vector3(sx, 0.98, -0.58), Vector3(0.25, 0.08, 0.25), seat_a)
		root.add_child(s1)
		var s2 := MeshInstance3D.new()
		s2.mesh = Mesher.pillow(Vector3(sx, 1.4, -0.3), Vector3(0.24, 0.36, 0.08), seat_a, 0.15)
		root.add_child(s2)
		Car.occupant(root, Vector3(sx, 1.02, -0.55), Color(0.9, 0.55, 0.1), [Vector3(-0.6, 1.44, -1.16), Vector3(-0.32, 1.44, -1.16)] if sx < 0.0 else [])
	var dark: StandardMaterial3D = Car.mat(Color(0.02, 0.02, 0.022), 0.8)
	for s: float in [-axle, axle]:
		Car.box(root, Vector3(1.76, 0.86, 1.06), Vector3(0, 0.76, s), dark)
		for sx: float in [-1.0, 1.0]:
			var w: Node3D = Car.wheel(wheel_r)
			w.position = Vector3(sx * 0.915, wheel_r, s)
			if sx < 0.0:
				w.rotation.y = PI
			root.add_child(w)
	# Зелёной доли в синем почти нет: при большей яркости AgX выбеливает цвет.
	var blue: StandardMaterial3D = _lamp(Color(0.005, 0.07, 1.0), 2.4)
	Car.box(root, Vector3(1.7, 0.09, 0.36), Vector3(0, 2.5, -0.68), dark)
	for sx: float in [-1.0, 1.0]:
		Car.box(root, Vector3(0.62, 0.2, 0.32), Vector3(sx * 0.5, 2.64, -0.68), blue)
		Car.box(root, Vector3(0.22, 0.09, 0.26), Vector3(sx * 0.6, 2.54, 2.72), blue)
		Car.box(root, Vector3(0.26, 0.1, 0.03), Vector3(sx * 0.42, 0.84, -2.92), blue)
	# Кадр застывает на вспышке: левая лампа горит сильнее правой. Днём одной светящейся лампы не видно.
	var flare: ImageTexture = _flare()
	_beacon(root, Vector3(-0.5, 2.68, -0.68), 3.0, flare)
	_beacon(root, Vector3(0.5, 2.68, -0.68), 1.9, flare)
	_beacon(root, Vector3(-0.42, 0.84, -2.98), 1.3, flare)
	_beacon(root, Vector3(0.42, 0.84, -2.98), 0.8, flare)
	for sx: float in [-1.0, 1.0]:
		Car.box(root, Vector3(0.34, 0.12, 0.03), Vector3(sx * 0.6, 1.0, -2.91), _lamp(Color(0.95, 0.96, 0.92), 0.35))
		Car.box(root, Vector3(0.12, 0.4, 0.03), Vector3(sx * 0.86, 1.0, 2.91), _lamp(Color(0.72, 0.03, 0.04), 0.3))
		Car.box(root, Vector3(0.06, 0.16, 0.1), Vector3(sx * 1.1, 1.75, -1.25), dark)
		# Сигнальные клетки на борту.
		for k: int in 9:
			var clr: Color = Color(0.1, 0.45, 0.2) if k % 2 == 0 else Color(0.92, 0.92, 0.9)
			Car.box(root, Vector3(0.012, 0.3, 0.46), Vector3(sx * 1.035, 1.16, -0.75 + k * 0.42), Car.mat(clr, 0.5))
		_text(root, "AMBULANSE", Vector3(sx * 1.04, 1.9, 1.2), sx * PI / 2.0, 0.26, Color(0.06, 0.25, 0.12))
	_text(root, "AMBULANSE", Vector3(0, 1.3, -2.915), PI, 0.17, Color(0.06, 0.25, 0.12))
	Car.box(root, Vector3(0.52, 0.115, 0.02), Vector3(0, 0.62, -2.915), Car.mat(Color(0.86, 0.86, 0.82), 0.5))
	Car.box(root, Vector3(0.52, 0.115, 0.02), Vector3(0, 0.62, 2.915), Car.mat(Color(0.86, 0.86, 0.82), 0.5))
	return root


static func tractor(color: Color = Color(0.68, 0.08, 0.06)) -> Node3D:
	var root := Node3D.new()
	var paint: StandardMaterial3D = Car.mat(color, 0.34, 0.2)
	var dark: StandardMaterial3D = Car.mat(Color(0.03, 0.03, 0.035), 0.7)
	var steel: StandardMaterial3D = Car.mat(Color(0.5, 0.5, 0.52), 0.35, 0.8)
	var rubber: StandardMaterial3D = Car.mat(Color(0.024, 0.024, 0.026), 0.9)
	var rim: StandardMaterial3D = Car.mat(Color(0.86, 0.78, 0.2), 0.45)
	var tyre := func(r: float, w: float, pos: Vector3) -> void:
		var t := MeshInstance3D.new()
		t.mesh = Mesher.lathe([Vector2(r * 0.55, -w), Vector2(r * 0.92, -w), Vector2(r, -w * 0.7), Vector2(r, w * 0.7), Vector2(r * 0.92, w), Vector2(r * 0.55, w)], rubber, 36)
		t.position = pos
		root.add_child(t)
		var lug := 18
		for k: int in lug:
			var a: float = TAU * k / lug
			var bar := BoxMesh.new()
			bar.size = Vector3(w * 1.7, 0.05, 0.07)
			bar.material = rubber
			var b := MeshInstance3D.new()
			b.mesh = bar
			b.position = pos + Vector3(0, sin(a), cos(a)) * (r + 0.005)
			b.rotation.x = -a
			root.add_child(b)
		var hub := MeshInstance3D.new()
		hub.mesh = Mesher.lathe([Vector2(r * 0.56, w * 0.8), Vector2(r * 0.3, w * 0.86), Vector2(0.0, w * 0.86)], rim, 24)
		hub.position = pos
		root.add_child(hub)
		var hub2 := MeshInstance3D.new()
		hub2.mesh = Mesher.lathe([Vector2(r * 0.56, -w * 0.8), Vector2(r * 0.3, -w * 0.86), Vector2(0.0, -w * 0.86)], rim, 24)
		hub2.position = pos
		root.add_child(hub2)
	for sx: float in [-1.0, 1.0]:
		tyre.call(0.78, 0.21, Vector3(sx * 0.82, 0.78, 0.82))
		tyre.call(0.46, 0.12, Vector3(sx * 0.72, 0.46, -1.42))
		Car.box(root, Vector3(0.48, 0.05, 1.26), Vector3(sx * 0.82, 1.62, 0.7), paint)
		Car.box(root, Vector3(0.06, 1.15, 0.06), Vector3(sx * 0.62, 2.12, 0.2), paint)
		Car.box(root, Vector3(0.06, 1.15, 0.06), Vector3(sx * 0.62, 2.12, 1.18), paint)
		Car.box(root, Vector3(0.14, 0.09, 0.03), Vector3(sx * 0.34, 1.25, -1.91), Vehicles._lamp(Color(0.95, 0.96, 0.92), 0.4))
		Car.box(root, Vector3(0.1, 0.16, 0.03), Vector3(sx * 0.6, 1.6, 1.26), Vehicles._lamp(Color(0.72, 0.03, 0.04), 0.3))
	Car.box(root, Vector3(1.34, 0.1, 1.2), Vector3(0, 2.72, 0.68), paint)
	var clear := StandardMaterial3D.new()
	clear.albedo_color = Color(0.05, 0.08, 0.1, 0.24)
	clear.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	clear.roughness = 0.05
	clear.metallic_specular = 0.8
	var cab := BoxMesh.new()
	cab.size = Vector3(1.2, 1.1, 1.0)
	cab.material = clear
	var cab_i := MeshInstance3D.new()
	cab_i.mesh = cab
	cab_i.position = Vector3(0, 2.12, 0.68)
	cab_i.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(cab_i)
	var seat_tr := MeshInstance3D.new()
	seat_tr.mesh = Mesher.pillow(Vector3(0, 1.72, 0.82), Vector3(0.23, 0.07, 0.22), dark)
	root.add_child(seat_tr)
	var back_tr := MeshInstance3D.new()
	back_tr.mesh = Mesher.pillow(Vector3(0, 2.06, 1.04), Vector3(0.22, 0.28, 0.06), dark, 0.1)
	root.add_child(back_tr)
	Car.steering(root, Vector3(0, 2.1, 0.36), 0.18, 0.75, dark)
	Car.occupant(root, Vector3(0, 1.74, 0.86), Color(0.14, 0.22, 0.34), [Vector3(-0.14, 2.14, 0.38), Vector3(0.14, 2.14, 0.38)])
	Car.box(root, Vector3(0.82, 0.92, 2.1), Vector3(0, 1.1, -0.86), paint)
	Car.box(root, Vector3(0.84, 0.44, 0.04), Vector3(0, 1.1, -1.92), dark)
	Car.box(root, Vector3(0.98, 0.6, 1.3), Vector3(0, 1.1, 0.68), paint.duplicate())
	Car.box(root, Vector3(1.6, 0.14, 0.4), Vector3(0, 0.7, 0.3), dark)
	var pipe := MeshInstance3D.new()
	pipe.mesh = Mesher.limb(Vector3(0.3, 1.5, -1.1), Vector3(0.3, 2.5, -1.1), 0.04, 0.04, steel)
	root.add_child(pipe)
	return root
