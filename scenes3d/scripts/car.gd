class_name Car
extends RefCounted
## Легковая машина: кузов с резкими линиями из сечений, отдельные фары, решётка, бамперы, зеркала, ручки, дворники, диски.
## Машина смотрит вдоль -z. Метры, y вверх, начало координат на земле под центром.

## Сечения кузова: z, верх по центру, линия плеч, полуширина, полуширина крыши или капота.
const KINDS: Dictionary = {
	"sedan": {
		"bottom": 0.23, "wheel": 0.325, "arch": 0.385, "axle": 1.38, "cladding": 0.3,
		"stations": [
			[-2.25, 0.76, 0.72, 0.80, 0.50], [-2.16, 0.81, 0.76, 0.86, 0.55], [-1.92, 0.87, 0.82, 0.90, 0.60],
			[-1.45, 0.95, 0.89, 0.915, 0.64], [-1.02, 1.01, 0.94, 0.92, 0.68], [-0.92, 1.05, 0.95, 0.92, 0.68],
			[-0.52, 1.24, 0.965, 0.92, 0.63], [-0.20, 1.38, 0.975, 0.92, 0.60], [0.25, 1.43, 0.985, 0.92, 0.60],
			[0.80, 1.42, 1.0, 0.92, 0.60], [1.30, 1.31, 1.02, 0.915, 0.60], [1.72, 1.12, 1.03, 0.90, 0.62],
			[2.10, 1.08, 1.03, 0.865, 0.66], [2.20, 1.04, 0.98, 0.84, 0.66], [2.25, 0.90, 0.88, 0.81, 0.60],
		],
		"glass": [-0.72, 1.56], "pillar": 0.34, "rear_door": 1.32, "rear_glass": [1.28, 1.76], "windshield": [-0.92, -0.2],
	},
	"hatch": {
		"bottom": 0.24, "wheel": 0.325, "arch": 0.385, "axle": 1.32, "cladding": 0.31,
		"stations": [
			[-2.15, 0.80, 0.76, 0.80, 0.52], [-2.06, 0.85, 0.80, 0.86, 0.56], [-1.85, 0.92, 0.86, 0.90, 0.60],
			[-1.40, 0.99, 0.92, 0.915, 0.64], [-0.98, 1.06, 0.97, 0.92, 0.68], [-0.88, 1.10, 0.98, 0.92, 0.68],
			[-0.48, 1.30, 0.99, 0.92, 0.63], [-0.18, 1.43, 1.0, 0.92, 0.60], [0.30, 1.48, 1.01, 0.92, 0.60],
			[0.90, 1.47, 1.03, 0.92, 0.60], [1.40, 1.41, 1.05, 0.915, 0.60], [1.78, 1.24, 1.06, 0.90, 0.62],
			[2.02, 1.05, 1.05, 0.87, 0.66], [2.12, 1.02, 0.98, 0.84, 0.66], [2.16, 0.90, 0.88, 0.81, 0.60],
		],
		"glass": [-0.68, 1.72], "pillar": 0.38, "rear_door": 1.38, "rear_glass": [1.46, 1.98], "windshield": [-0.88, -0.18],
	},
	"suv": {
		"bottom": 0.31, "wheel": 0.365, "arch": 0.43, "axle": 1.42, "cladding": 0.46,
		"stations": [
			[-2.30, 0.95, 0.90, 0.82, 0.52], [-2.22, 1.0, 0.95, 0.88, 0.56], [-1.98, 1.05, 1.0, 0.93, 0.62],
			[-1.50, 1.12, 1.05, 0.95, 0.66], [-1.05, 1.18, 1.10, 0.95, 0.70], [-0.95, 1.22, 1.11, 0.95, 0.70],
			[-0.55, 1.42, 1.13, 0.95, 0.65], [-0.25, 1.58, 1.14, 0.95, 0.62], [0.30, 1.65, 1.15, 0.95, 0.62],
			[1.10, 1.63, 1.17, 0.95, 0.62], [1.75, 1.55, 1.19, 0.94, 0.62], [2.10, 1.30, 1.19, 0.91, 0.66],
			[2.25, 1.12, 1.12, 0.87, 0.66], [2.30, 0.98, 0.96, 0.84, 0.60],
		],
		"glass": [-0.75, 1.92], "pillar": 0.38, "rear_door": 1.42, "rear_glass": [1.78, 2.12], "windshield": [-0.95, -0.25],
	},
}
const MASK_L: float = 2.4
const MASK_H: float = 1.9
const MASK_W: float = 1.05

static var _textures: Dictionary = {}
static var _bodies: Dictionary = {}
static var _wheels: Dictionary = {}


## Освободить общие заготовки перед выходом.
static func cleanup() -> void:
	for w: Node3D in _wheels.values():
		w.free()
	_wheels.clear()


static func _svg(key: String, svg: String) -> Texture2D:
	if not _textures.has(key):
		var img := Image.new()
		img.load_svg_from_string(svg)
		img.generate_mipmaps()
		_textures[key] = ImageTexture.create_from_image(img)
	return _textures[key]


static func mat(c: Color, rough: float = 0.6, metal: float = 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = rough
	m.metallic = metal
	return m


## Значения сечения в точке z: плавно, без перехлёстов.
static func _section(k: Dictionary, z: float) -> Array:
	var st: Array = k["stations"]
	var i: int = 0
	while i < st.size() - 2 and z > st[i + 1][0]:
		i += 1
	var z0: float = st[i][0]
	var z1: float = st[i + 1][0]
	var h: float = z1 - z0
	var t: float = clampf((z - z0) / h, 0.0, 1.0)
	var out: Array = []
	for c: int in range(1, 5):
		var p0: float = st[i][c]
		var p1: float = st[i + 1][c]
		var a: Array = st[maxi(i - 1, 0)]
		var b: Array = st[mini(i + 2, st.size() - 1)]
		var m0: float = (p1 - a[c]) / maxf(z1 - a[0], 0.001) * h
		var m1: float = (b[c] - p0) / maxf(b[0] - z0, 0.001) * h
		var lo: float = minf(p0, p1)
		var hi: float = maxf(p0, p1)
		var t2: float = t * t
		var t3: float = t2 * t
		var v: float = (2.0 * t3 - 3.0 * t2 + 1.0) * p0 + (t3 - 2.0 * t2 + t) * m0 + (-2.0 * t3 + 3.0 * t2) * p1 + (t3 - t2) * m1
		out.push_back(clampf(v, lo - 0.015, hi + 0.015))
	return out


## Половина сечения от низа по центру до верха по центру, с резкими гранями.
static func _half(k: Dictionary, z: float) -> Array:
	var s: Array = _section(k, z)
	var top: float = s[0]
	var belt: float = minf(s[1], top - 0.012)
	var hw: float = s[2]
	var roof: float = s[3]
	var b: float = k["bottom"]
	var low: float = minf(b + 0.42, belt - 0.14)
	var sill: float = minf(b + 0.13, low - 0.1)
	var gh := func(f: float, inset: float) -> Vector2:
		return Vector2(lerpf(hw * 0.945, roof + inset, f), lerpf(belt + 0.01, top - 0.018, f))
	return [
		Vector2(0.0, b),
		Vector2(hw * 0.4, b),
		Vector2(hw * 0.82, b),
		Vector2(hw * 0.955, b + 0.045),
		Vector2(hw * 0.985, sill),
		Vector2(hw * 0.962, sill + 0.022),
		Vector2(hw * 0.992, lerpf(sill, low, 0.4)),
		Vector2(hw * 1.0, lerpf(sill, low, 0.75)),
		Vector2(hw * 0.992, low),
		Vector2(hw * 0.999, lerpf(low, belt - 0.06, 0.35)),
		Vector2(hw * 1.003, lerpf(low, belt - 0.06, 0.75)),
		Vector2(hw * 0.999, belt - 0.06),
		Vector2(hw * 0.968, belt - 0.008),
		gh.call(0.0, 0.03),
		gh.call(0.3, 0.03),
		gh.call(0.65, 0.03),
		gh.call(0.92, 0.03),
		gh.call(1.0, 0.03),
		Vector2(roof * 0.84, top - 0.006),
		Vector2(roof * 0.56, top + 0.004),
		Vector2(roof * 0.28, top + 0.012),
		Vector2(0.0, top + 0.015),
	]


## Какой группе сглаживания принадлежит сегмент сечения.
const BANDS: PackedInt32Array = [1, 1, 2, 3, 4, 5, 5, 5, 6, 6, 6, 7, 8, 9, 9, 9, 9, 10, 10, 10, 10]


static func _body_mesh(k: Dictionary, material: Material) -> ArrayMesh:
	var st: Array = k["stations"]
	var z0: float = st[0][0]
	var z1: float = st[st.size() - 1][0]
	var cowl: float = k["windshield"][0]
	var rear_base: float = k["rear_glass"][1]
	var rings: Array = []
	var zones := PackedInt32Array()
	var z: float = z0
	while z < z1 - 0.001:
		var half: Array = _half(k, z)
		var ring := PackedVector3Array()
		for p: Vector2 in half:
			ring.push_back(Vector3(p.x, p.y, z))
		for j: int in range(half.size() - 2, 0, -1):
			ring.push_back(Vector3(-half[j].x, half[j].y, z))
		rings.push_back(ring)
		var step: float = 0.012 if z < z0 + 0.1 or z > z1 - 0.1 else 0.035
		var next: float = minf(z + step, z1)
		zones.push_back(0 if next <= cowl else (1 if next <= rear_base else 2))
		z = next
	var last: Array = _half(k, z1)
	var ring_end := PackedVector3Array()
	for p: Vector2 in last:
		ring_end.push_back(Vector3(p.x, p.y, z1))
	for j: int in range(last.size() - 2, 0, -1):
		ring_end.push_back(Vector3(-last[j].x, last[j].y, z1))
	rings.push_back(ring_end)
	var groups := PackedInt32Array()
	for g: int in BANDS:
		groups.push_back(g)
	for j: int in range(BANDS.size() - 1, -1, -1):
		groups.push_back(BANDS[j] + 20)
	return Mesher.creased_loft(rings, groups, zones, material)


static func _xy(z: float, y: float) -> Vector2:
	return Vector2((z + MASK_L) * 100.0, (MASK_H - y) * 100.0)


static func _side_svg(k: Dictionary) -> String:
	var a: float = k["axle"]
	var b: float = k["bottom"]
	var g: Array = k["glass"]
	var top_edge := PackedStringArray()
	var low_edge := PackedStringArray()
	var z: float = g[0]
	while z <= g[1]:
		var s: Array = _section(k, z)
		var belt: float = s[1] + 0.045
		var upper: float = s[0] - 0.105
		if upper > belt:
			var u: Vector2 = _xy(z, upper)
			var l: Vector2 = _xy(z, belt)
			top_edge.push_back("%.1f %.1f" % [u.x, u.y])
			low_edge.insert(0, "%.1f %.1f" % [l.x, l.y])
		z += 0.04
	var window: String = "M" + " L".join(top_edge) + " L" + " L".join(low_edge) + " Z"
	var pillar: Vector2 = _xy(k["pillar"], 1.0)
	var p_top: Vector2 = _xy(k["pillar"], 2.0)
	var rear: float = k["rear_door"]
	var door_top: float = _xy(0.0, _section(k, 0.0)[1] + 0.04).y
	var sill: float = _xy(0.0, b + 0.135).y
	var cl: float = _xy(0.0, k["cladding"]).y
	var f: Vector2 = _xy(-a, k["wheel"])
	var r: Vector2 = _xy(a, k["wheel"])
	var ar: float = (k["arch"] + 0.03) * 100.0
	var fd: float = _xy(-0.98, 0.0).x
	var bd: float = pillar.x
	var rd: float = _xy(rear, 0.0).x
	var h1: Vector2 = _xy(k["pillar"] - 0.2, _section(k, 0.0)[1] - 0.13)
	var h2: Vector2 = _xy(rear - 0.22, _section(k, 1.0)[1] - 0.13)
	var hood_end: Vector2 = _xy(-2.05, _section(k, -2.05)[1] - 0.03)
	var hood_mid: Vector2 = _xy(-0.98, _section(k, -0.98)[1] - 0.02)
	var fuel: Vector2 = _xy(a + 0.05, _section(k, 1.5)[1] - 0.2)
	return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="2880" height="1140">
<rect width="480" height="190" fill="#000"/>
<path d="%s" fill="#f00" stroke="#0f0" stroke-width="2.200"/>
<rect x="%.1f" y="0" width="7" height="%.1f" fill="#0f0"/>
<path d="M%.1f %.1f L%.1f %.1f M%.1f %.1f L%.1f %.1f M%.1f %.1f L%.1f %.1f" stroke="#0f0" stroke-width="0.550" fill="none"/>
<path d="M%.1f %.1f Q%.1f %.1f %.1f %.1f" stroke="#0f0" stroke-width="0.550" fill="none"/>
<path d="M%.1f %.1f L%.1f %.1f" stroke="#0f0" stroke-width="0.550" fill="none"/>
<circle cx="%.1f" cy="%.1f" r="5" fill="none" stroke="#0f0" stroke-width="0.500"/>
<rect x="0" y="%.1f" width="480" height="%.1f" fill="#0f0"/>
<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#0f0"/>
<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#0f0"/>
</svg>""" % [roundi(MASK_L * 200.0), roundi(MASK_H * 100.0), window, bd - 3.5, door_top + 2.0, fd, door_top, fd, sill, bd, door_top, bd, sill, fd, sill, rd, sill, rd, door_top, rd + 1.0, (door_top + sill) / 2.0, rd - 14.0, sill, hood_mid.x, hood_mid.y, hood_end.x, hood_end.y, fuel.x, fuel.y, cl, 190.0 - cl, f.x, f.y, ar, r.x, r.y, ar]


static func _top_svg(k: Dictionary) -> String:
	var ws: Array = k["windshield"]
	var rg: Array = k["rear_glass"]
	var st: Array = k["stations"]
	var y := func(z: float) -> float:
		return (z + MASK_L) * 100.0
	var x := func(v: float) -> float:
		return (v + MASK_W) * 100.0
	var ws0: float = _section(k, ws[0] + 0.03)[3] + 0.09
	var ws1: float = _section(k, ws[1])[3] - 0.03
	var rg0: float = _section(k, rg[0])[3] - 0.03
	var rg1: float = _section(k, rg[1])[3] + 0.06
	var z0: float = st[0][0]
	var z1: float = st[st.size() - 1][0]
	return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 480" width="1050" height="2400">
<rect width="210" height="480" fill="#000"/>
<path d="M%.1f %.1f Q105 %.1f %.1f %.1f L%.1f %.1f Q105 %.1f %.1f %.1f Z" fill="#f00" stroke="#0f0" stroke-width="1.600"/>
<path d="M%.1f %.1f Q105 %.1f %.1f %.1f L%.1f %.1f Q105 %.1f %.1f %.1f Z" fill="#f00" stroke="#0f0" stroke-width="1.600"/>
<rect x="%.1f" y="%.1f" width="%.1f" height="5" rx="2" fill="#0f0"/>
<path d="M%.1f %.1f Q105 %.1f %.1f %.1f M%.1f %.1f L%.1f %.1f M%.1f %.1f L%.1f %.1f" stroke="#0f0" stroke-width="0.550" fill="none"/>
<path d="M%.1f %.1f Q105 %.1f %.1f %.1f" stroke="#0f0" stroke-width="0.550" fill="none"/>
</svg>""" % [x.call(-ws0), y.call(ws[0]) + 2.0, y.call(ws[0]) - 6.0, x.call(ws0), y.call(ws[0]) + 2.0, x.call(ws1), y.call(ws[1]), y.call(ws[1]) - 5.0, x.call(-ws1), y.call(ws[1]), x.call(-rg0), y.call(rg[0]), y.call(rg[0]) - 5.0, x.call(rg0), y.call(rg[0]), x.call(rg1), y.call(rg[1]), y.call(rg[1]) + 6.0, x.call(-rg1), y.call(rg[1]), x.call(-ws0), y.call(ws[0]) - 6.0, ws0 * 200.0, x.call(-0.68), y.call(z0) + 16.0, y.call(z0) + 6.0, x.call(0.68), y.call(z0) + 16.0, x.call(-0.68), y.call(z0) + 16.0, x.call(-0.8), y.call(ws[0]) - 8.0, x.call(0.68), y.call(z0) + 16.0, x.call(0.8), y.call(ws[0]) - 8.0, x.call(-0.7), y.call(z1) - 14.0, y.call(z1) - 4.0, x.call(0.7), y.call(z1) - 14.0]


## Колесо: шина с боковиной, обод, пять спиц, тормозной диск. Внешняя сторона смотрит вдоль +x.
static func wheel(radius: float) -> Node3D:
	var key: String = "%.3f" % radius
	if _wheels.has(key):
		return _wheels[key].duplicate()
	var root := Node3D.new()
	var k: float = radius / 0.325
	var rubber: StandardMaterial3D = mat(Color(0.024, 0.024, 0.026), 0.82)
	var alloy: StandardMaterial3D = mat(Color(0.66, 0.68, 0.7), 0.3, 0.85)
	var dark: StandardMaterial3D = mat(Color(0.02, 0.02, 0.022), 0.8)
	var disc: StandardMaterial3D = mat(Color(0.38, 0.38, 0.39), 0.42, 0.8)
	var add := func(mesh: Mesh) -> void:
		var m := MeshInstance3D.new()
		m.mesh = mesh
		root.add_child(m)
	var hw: float = 0.115
	add.call(Mesher.lathe([Vector2(0.2, -hw), Vector2(0.27, -hw - 0.002), Vector2(0.305, -hw + 0.012), Vector2(0.322, -hw + 0.035), Vector2(0.325, -0.05), Vector2(0.325, 0.05), Vector2(0.322, hw - 0.035), Vector2(0.305, hw - 0.012), Vector2(0.27, hw + 0.002), Vector2(0.214, hw), Vector2(0.205, hw - 0.012)].map(func(p: Vector2) -> Vector2: return Vector2(p.x * k, p.y)), rubber, 48))
	add.call(Mesher.lathe([Vector2(0.216, hw + 0.004), Vector2(0.212, hw + 0.008), Vector2(0.2, hw - 0.002), Vector2(0.19, hw - 0.05)].map(func(p: Vector2) -> Vector2: return Vector2(p.x * k, p.y)), alloy, 48))
	add.call(Mesher.lathe([Vector2(0.195 * k, 0.05), Vector2(0.195 * k, -0.04), Vector2(0.0, -0.04)], dark, 32))
	add.call(Mesher.lathe([Vector2(0.15 * k, 0.03), Vector2(0.15 * k, 0.0), Vector2(0.0, 0.0)], disc, 32))
	var spoke_top: float = hw - 0.012
	for s: int in 5:
		var a: float = TAU * s / 5.0
		for side: float in [-1.0, 1.0]:
			var base: float = a + side * 0.12
			var tip: float = a + side * 0.2
			var d0 := Vector2(cos(base), sin(base))
			var d1 := Vector2(cos(tip), sin(tip))
			var n0 := Vector2(-d0.y, d0.x) * 0.012 * k
			var n1 := Vector2(-d1.y, d1.x) * 0.0115 * k
			var poly := PackedVector2Array([d0 * 0.05 * k - n0, d1 * 0.195 * k - n1, d1 * 0.195 * k + n1, d0 * 0.05 * k + n0])
			var spoke := MeshInstance3D.new()
			spoke.mesh = Mesher.prism(poly, 0.0, 0.026, alloy, alloy)
			spoke.rotation.z = -PI / 2.0
			spoke.position.x = spoke_top - 0.026
			root.add_child(spoke)
	add.call(Mesher.lathe([Vector2(0.058 * k, hw - 0.04), Vector2(0.058 * k, hw + 0.002), Vector2(0.04 * k, hw + 0.012), Vector2(0.0, hw + 0.014)], alloy, 24))
	_wheels[key] = root
	return root.duplicate()


## Плоская деталь по контуру (x, y): смотрит вперёд (-z), если front, иначе назад.
static func plate(points: Array, z: float, thick: float, mat: Material, side_mat: Material, front: bool = true) -> MeshInstance3D:
	var poly := PackedVector2Array()
	for p: Vector2 in points:
		poly.push_back(Vector2(p.x, p.y if front else -p.y))
	var i := MeshInstance3D.new()
	i.mesh = Mesher.prism(poly, 0.0, thick, mat, side_mat)
	i.rotation.x = -PI / 2.0 if front else PI / 2.0
	i.position.z = z
	return i


static func box(root: Node3D, size: Vector3, pos: Vector3, mat: Material, rot: Vector3 = Vector3.ZERO) -> void:
	var b := BoxMesh.new()
	b.size = size
	b.material = mat
	var i := MeshInstance3D.new()
	i.mesh = b
	i.position = pos
	i.rotation = rot
	root.add_child(i)


## Материал кузова: стекло в нём вырезано.
static func shell_material(color: Color, params: Dictionary) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = preload("res://shaders/car.gdshader")
	m.set_shader_parameter("paint", color)
	for key: String in params:
		m.set_shader_parameter(key, params[key])
	return m


## Кузов и поверх той же сетки прозрачное стекло.
static func shell(root: Node3D, mesh: Mesh, params: Dictionary) -> void:
	var body := MeshInstance3D.new()
	body.mesh = mesh
	root.add_child(body)
	var glass := ShaderMaterial.new()
	glass.shader = preload("res://shaders/car_glass.gdshader")
	for key: String in params:
		glass.set_shader_parameter(key, params[key])
	var g := MeshInstance3D.new()
	g.mesh = mesh
	g.material_override = glass
	g.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(g)


## Руль: обод, ступица и спицы. Ось вдоль z, чуть наклонён к водителю.
static func steering(root: Node3D, center: Vector3, radius: float, tilt: float, mat_dark: Material) -> void:
	var g := Node3D.new()
	g.position = center
	g.rotation.x = tilt
	root.add_child(g)
	var inner := Node3D.new()
	inner.rotation.y = PI / 2.0
	g.add_child(inner)
	var rim := MeshInstance3D.new()
	var t: float = radius * 0.08
	rim.mesh = Mesher.lathe([Vector2(radius - t, 0.0), Vector2(radius - t * 0.6, -t * 0.8), Vector2(radius + t * 0.6, -t * 0.8), Vector2(radius + t, 0.0), Vector2(radius + t * 0.6, t * 0.8), Vector2(radius - t * 0.6, t * 0.8), Vector2(radius - t, 0.0)], mat_dark, 28)
	inner.add_child(rim)
	var hub := MeshInstance3D.new()
	hub.mesh = Mesher.pillow(Vector3.ZERO, Vector3(radius * 0.32, radius * 0.26, radius * 0.1), mat_dark)
	g.add_child(hub)
	for a: float in [0.0, PI, -PI / 2.0]:
		box(g, Vector3(radius * 0.9, radius * 0.1, radius * 0.06), Vector3(cos(a), sin(a), 0.0) * radius * 0.5, mat_dark, Vector3(0.0, 0.0, a))


## Сидящий человек: торс, руки, голова. Смотрит вдоль -z, hip это точка сиденья.
static func occupant(root: Node3D, hip: Vector3, top: Color, hands: Array = []) -> void:
	var jacket: StandardMaterial3D = mat(top, 0.85)
	var skin: StandardMaterial3D = mat(Color(0.82, 0.62, 0.5), 0.6)
	var hair: StandardMaterial3D = mat(Color(0.13, 0.09, 0.06), 0.7)
	var add := func(mesh: Mesh) -> void:
		var i := MeshInstance3D.new()
		i.mesh = mesh
		root.add_child(i)
	var chest: Vector3 = hip + Vector3(0.0, 0.5, 0.06)
	add.call(Mesher.limb(hip + Vector3(0, 0.08, 0), chest, 0.15, 0.175, jacket))
	add.call(Mesher.limb(chest, chest + Vector3(0, 0.12, -0.02), 0.05, 0.045, skin))
	var head: Vector3 = chest + Vector3(0, 0.235, -0.03)
	add.call(Mesher.pillow(head, Vector3(0.082, 0.112, 0.098), skin))
	add.call(Mesher.pillow(head + Vector3(0, 0.035, 0.018), Vector3(0.088, 0.09, 0.098), hair))
	for side: float in [-1.0, 1.0]:
		var shoulder: Vector3 = chest + Vector3(side * 0.18, 0.02, 0.0)
		var hand: Vector3 = hands[0 if side < 0.0 else 1] if hands.size() == 2 else hip + Vector3(side * 0.17, 0.12, -0.26)
		var elbow: Vector3 = shoulder.lerp(hand, 0.5) + Vector3(side * 0.05, -0.1, 0.03)
		add.call(Mesher.limb(shoulder, elbow, 0.05, 0.042, jacket))
		add.call(Mesher.limb(elbow, hand, 0.042, 0.034, jacket))


## Салон легковой машины: пол, панель, руль, сиденья с подголовниками, задний диван, водитель.
static func _interior(root: Node3D, k: Dictionary, with_driver: bool, jacket: Color) -> void:
	var b: float = k["bottom"]
	var s_mid: Array = _section(k, 0.2)
	var hw: float = s_mid[2]
	var belt: float = s_mid[1]
	var ws0: float = k["windshield"][0]
	var rg0: float = k["rear_glass"][0]
	var floor_y: float = b + 0.16
	var fabric: StandardMaterial3D = mat(Color(0.085, 0.085, 0.095), 0.92)
	var plastic: StandardMaterial3D = mat(Color(0.04, 0.04, 0.045), 0.65)
	var carpet: StandardMaterial3D = mat(Color(0.05, 0.05, 0.055), 1.0)
	var add := func(mesh: Mesh) -> void:
		var i := MeshInstance3D.new()
		i.mesh = mesh
		root.add_child(i)
	var z_rear_end: float = minf(rg0 + 0.3, float(k["rear_door"]) + 0.15)
	box(root, Vector3(hw * 1.8, 0.04, z_rear_end - ws0), Vector3(0, floor_y, (z_rear_end + ws0) / 2.0), carpet)
	# Панель с козырьком приборов и экраном.
	var dash_z: float = ws0 + 0.3
	add.call(Mesher.pillow(Vector3(0, belt - 0.07, dash_z), Vector3(hw * 0.92, 0.1, 0.3), plastic))
	box(root, Vector3(hw * 1.8, belt - floor_y - 0.1, 0.34), Vector3(0, (belt + floor_y) / 2.0 - 0.05, dash_z - 0.1), plastic)
	add.call(Mesher.pillow(Vector3(-0.4, belt + 0.035, dash_z + 0.08), Vector3(0.18, 0.05, 0.1), plastic))
	var screen := StandardMaterial3D.new()
	screen.albedo_color = Color(0.03, 0.06, 0.1)
	screen.emission_enabled = true
	screen.emission = Color(0.3, 0.55, 0.85)
	screen.emission_energy_multiplier = 0.5
	box(root, Vector3(0.26, 0.16, 0.02), Vector3(0.04, belt + 0.02, dash_z + 0.24), screen, Vector3(-0.25, 0, 0))
	var wheel_c := Vector3(-0.4, belt - 0.1, dash_z + 0.42)
	steering(root, wheel_c, 0.185, 0.35, plastic)
	var column := MeshInstance3D.new()
	column.mesh = Mesher.limb(wheel_c, wheel_c + Vector3(0, -0.14, -0.34), 0.035, 0.05, plastic)
	root.add_child(column)
	# Все детали салона помещаются под крышу этого кузова: fit опускает их, если крыша ниже.
	var fit := func(y: float, half_h: float, z: float) -> float:
		return minf(y, float(_section(k, z)[0]) - 0.075 - half_h)
	var seat_z: float = dash_z + 0.74
	for sx: float in [-0.4, 0.4]:
		add.call(Mesher.pillow(Vector3(sx, floor_y + 0.21, seat_z), Vector3(0.24, 0.075, 0.25), fabric))
		box(root, Vector3(0.36, 0.17, 0.34), Vector3(sx, floor_y + 0.09, seat_z), plastic)
		var back_y: float = fit.call(floor_y + 0.5, 0.27, seat_z + 0.28)
		add.call(Mesher.pillow(Vector3(sx, back_y, seat_z + 0.28), Vector3(0.235, 0.27, 0.07), fabric, 0.18))
		var rest_z: float = seat_z + 0.36
		add.call(Mesher.pillow(Vector3(sx, fit.call(back_y + 0.35, 0.085, rest_z), rest_z), Vector3(0.12, 0.085, 0.05), fabric, 0.15))
	add.call(Mesher.pillow(Vector3(0, floor_y + 0.16, seat_z - 0.2), Vector3(0.09, 0.12, 0.42), plastic))
	# Задний диван: подушка, спинка и три подголовника.
	var bench_z: float = seat_z + 0.84
	var wide: float = hw * 0.86
	add.call(Mesher.pillow(Vector3(0, floor_y + 0.23, bench_z), Vector3(wide, 0.08, 0.24), fabric))
	box(root, Vector3(wide * 1.8, 0.17, 0.4), Vector3(0, floor_y + 0.09, bench_z), plastic)
	var bench_back: float = fit.call(floor_y + 0.5, 0.25, bench_z + 0.28)
	add.call(Mesher.pillow(Vector3(0, bench_back, bench_z + 0.28), Vector3(wide, 0.25, 0.07), fabric, 0.2))
	for sx: float in [-0.5, 0.0, 0.5]:
		var rz: float = bench_z + 0.34
		add.call(Mesher.pillow(Vector3(sx, fit.call(bench_back + 0.31, 0.07, rz), rz), Vector3(0.1, 0.07, 0.04), fabric, 0.15))
	# Полка за задним диваном закрывает багажник и не выходит за заднее стекло.
	var shelf0: float = bench_z + 0.34
	var shelf1: float = float(k["rear_glass"][1]) + 0.02
	if shelf1 > shelf0:
		var shelf_y: float = minf(belt + 0.01, float(_section(k, shelf1)[1]) - 0.01)
		box(root, Vector3(float(_section(k, shelf1)[2]) * 1.72, 0.025, shelf1 - shelf0), Vector3(0, shelf_y, (shelf0 + shelf1) / 2.0), plastic)
	if with_driver:
		var r: float = 0.17
		var grip: Array = [wheel_c + Vector3(-r, 0.02, 0.0), wheel_c + Vector3(r, 0.02, 0.0)]
		var hip_y: float = minf(floor_y + 0.27, float(_section(k, seat_z + 0.1)[0]) - 0.1 - 0.85)
		occupant(root, Vector3(-0.4, hip_y, seat_z + 0.04), jacket, grip)


## Машина как узел. kind: sedan, hatch, suv. occupied: за рулём сидит водитель.
static func make(color: Color, kind: String = "sedan", occupied: bool = true) -> Node3D:
	var k: Dictionary = KINDS[kind]
	var root := Node3D.new()
	var params: Dictionary = {
		"side_mask": _svg("side-" + kind, _side_svg(k)), "top_mask": _svg("top-" + kind, _top_svg(k)),
		"arch_z": k["axle"], "arch_zf": k["axle"], "arch_y": k["wheel"], "arch_r": k["arch"],
		"half_length": MASK_L, "height": MASK_H, "half_width": MASK_W, "trim_y": float(_section(k, 0.3)[1]) + 0.02,
	}
	shell(root, _body_mesh(k, shell_material(color, params)), params)

	var st: Array = k["stations"]
	var z0: float = st[0][0]
	var z1: float = st[st.size() - 1][0]
	var b: float = k["bottom"]
	var wheel_r: float = k["wheel"]
	var axle: float = k["axle"]
	var hw_mid: float = _section(k, 0.0)[2]
	var black: StandardMaterial3D = mat(Color(0.014, 0.014, 0.016), 0.55)
	var matte: StandardMaterial3D = mat(Color(0.02, 0.02, 0.022), 0.82)
	var chrome: StandardMaterial3D = mat(Color(0.8, 0.8, 0.82), 0.16, 1.0)
	var plate_mat: StandardMaterial3D = mat(Color(0.86, 0.86, 0.82), 0.5)
	var blue: StandardMaterial3D = mat(Color(0.03, 0.12, 0.42), 0.5)
	var paint: StandardMaterial3D = mat(color, 0.3, 0.55)
	var lens := StandardMaterial3D.new()
	lens.albedo_color = Color(0.8, 0.84, 0.88)
	lens.metallic = 0.3
	lens.roughness = 0.06
	lens.emission_enabled = true
	lens.emission = Color(1.0, 0.98, 0.92)
	lens.emission_energy_multiplier = 0.04
	var led := StandardMaterial3D.new()
	led.albedo_color = Color(1.0, 0.98, 0.94)
	led.emission_enabled = true
	led.emission = Color(1.0, 0.98, 0.94)
	led.emission_energy_multiplier = 0.55
	var red_lens := StandardMaterial3D.new()
	red_lens.albedo_color = Color(0.42, 0.015, 0.02)
	red_lens.roughness = 0.1
	red_lens.emission_enabled = true
	red_lens.emission = Color(0.8, 0.02, 0.03)
	red_lens.emission_energy_multiplier = 0.22

	# Колёсные арки изнутри глухие и тёмные.
	var well_top: float = wheel_r + k["arch"] + 0.02
	for wz: float in [-axle, axle]:
		for sx: float in [-1.0, 1.0]:
			box(root, Vector3(0.36, well_top - b, k["arch"] * 2.3), Vector3(sx * (hw_mid * 0.86 - 0.18), (well_top + b) / 2.0, wz), matte)
	var seed_tone: float = fposmod(color.h * 7.0 + color.v * 3.0, 1.0)
	_interior(root, k, occupied, Color(0.2, 0.25, 0.32).lerp(Color(0.5, 0.2, 0.15), seed_tone))
	# Колёса и губы арок.
	var wheel_x: float = hw_mid - 0.115
	for sx: float in [-1.0, 1.0]:
		for wz: float in [-axle, axle]:
			var w: Node3D = wheel(wheel_r)
			w.position = Vector3(sx * wheel_x, wheel_r, wz)
			if sx < 0.0:
				w.rotation.y = PI
			root.add_child(w)
			var rings: Array = []
			var r_in: float = k["arch"] - 0.008
			var r_out: float = k["arch"] + 0.028
			for step: int in 25:
				var a: float = lerpf(-0.22, PI + 0.22, step / 24.0)
				var dir := Vector2(cos(a), sin(a))
				var c := Vector2(wz, wheel_r)
				var ring := PackedVector3Array()
				var x_out: float = hw_mid + 0.012
				var x_in: float = hw_mid - 0.03
				for q: Array in [[x_in, r_in], [x_out, r_in], [x_out, r_out], [x_in, r_out]]:
					var pp: Vector2 = c + dir * q[1]
					ring.push_back(Vector3(sx * q[0], pp.y, pp.x))
				rings.push_back(ring)
			var lip := MeshInstance3D.new()
			lip.mesh = Mesher.loft(rings, matte if kind == "suv" else black)
			root.add_child(lip)

	# Перед: решётка, рамка, ламели, нижний воздухозаборник, губа, номер, фары.
	var nose: float = st[0][2]
	var face: float = nose - b
	var fy := func(f: float) -> float:
		return b + face * f
	var front_z: float = z0 - 0.002
	root.add_child(plate([Vector2(-0.42, fy.call(0.56)), Vector2(0.42, fy.call(0.56)), Vector2(0.48, fy.call(0.82)), Vector2(-0.48, fy.call(0.82))], front_z, 0.012, chrome, chrome))
	root.add_child(plate([Vector2(-0.39, fy.call(0.585)), Vector2(0.39, fy.call(0.585)), Vector2(0.445, fy.call(0.795)), Vector2(-0.445, fy.call(0.795))], front_z - 0.012, 0.004, black, black))
	for s: int in 4:
		var yy: float = fy.call(0.62 + s * 0.05)
		box(root, Vector3(0.78 + s * 0.03, 0.012, 0.014), Vector3(0.0, yy, front_z - 0.018), chrome)
	root.add_child(plate([Vector2(-0.66, fy.call(0.1)), Vector2(0.66, fy.call(0.1)), Vector2(0.58, fy.call(0.38)), Vector2(-0.58, fy.call(0.38))], front_z, 0.008, matte, matte))
	for s: int in 2:
		box(root, Vector3(1.08, 0.012, 0.012), Vector3(0.0, fy.call(0.2 + s * 0.09), front_z - 0.012), black)
	box(root, Vector3(1.5, 0.04, 0.09), Vector3(0.0, b + 0.012, z0 + 0.02), matte)
	box(root, Vector3(0.52, 0.115, 0.016), Vector3(0.0, fy.call(0.46), front_z - 0.018), plate_mat)
	box(root, Vector3(0.05, 0.115, 0.018), Vector3(-0.235, fy.call(0.46), front_z - 0.019), blue)
	for sx: float in [-1.0, 1.0]:
		var lamp_low: float = fy.call(0.72)
		var lamp_high: float = fy.call(0.93)
		var outline: Array = [Vector2(sx * 0.49, lamp_low), Vector2(sx * (nose - 0.02), lamp_low + 0.03), Vector2(sx * (nose - 0.03), lamp_high), Vector2(sx * 0.55, lamp_high - 0.01)]
		if sx < 0.0:
			outline.reverse()
		root.add_child(plate(outline, front_z, 0.012, black, black))
		var inner: Array = [Vector2(sx * 0.51, lamp_low + 0.012), Vector2(sx * (nose - 0.04), lamp_low + 0.04), Vector2(sx * (nose - 0.05), lamp_high - 0.012), Vector2(sx * 0.56, lamp_high - 0.022)]
		if sx < 0.0:
			inner.reverse()
		root.add_child(plate(inner, front_z - 0.012, 0.004, lens, lens))
		for s: int in 2:
			var ball := MeshInstance3D.new()
			var sphere := SphereMesh.new()
			sphere.radius = 0.5
			sphere.height = 1.0
			sphere.material = lens
			ball.mesh = sphere
			ball.scale = Vector3.ONE * 0.075
			ball.position = Vector3(sx * (0.6 + s * 0.11), (lamp_low + lamp_high) / 2.0 + 0.004, front_z - 0.018)
			root.add_child(ball)
		box(root, Vector3(nose - 0.57, 0.01, 0.008), Vector3(sx * (nose + 0.53) / 2.0, lamp_low + 0.02, front_z - 0.019), led)
		var fog := MeshInstance3D.new()
		var fog_m := CylinderMesh.new()
		fog_m.top_radius = 0.042
		fog_m.bottom_radius = 0.042
		fog_m.height = 0.012
		fog_m.radial_segments = 20
		fog_m.material = lens
		fog.mesh = fog_m
		fog.rotation.x = PI / 2.0
		fog.position = Vector3(sx * 0.68, fy.call(0.24), front_z - 0.004)
		root.add_child(fog)

	# Зад: фонари со вставками, бампер, номер, отражатели, выхлоп.
	var tail: float = st[st.size() - 1][2]
	var rear_top: float = st[st.size() - 1][1]
	var back_z: float = z1 + 0.002
	for sx: float in [-1.0, 1.0]:
		var hi: float = rear_top - 0.015
		var lo: float = rear_top - 0.165
		var outline: Array = [Vector2(sx * 0.38, lo + 0.03), Vector2(sx * (tail - 0.02), lo), Vector2(sx * (tail - 0.03), hi), Vector2(sx * 0.42, hi - 0.012)]
		if sx > 0.0:
			outline.reverse()
		root.add_child(plate(outline, back_z, 0.012, red_lens, red_lens, false))
		for s: int in 3:
			box(root, Vector3(tail - 0.46, 0.012, 0.006), Vector3(sx * (tail + 0.38) / 2.0, lo + 0.04 + s * 0.04, back_z + 0.014), led if s == 3 else mat(Color(0.75, 0.04, 0.05), 0.2))
		box(root, Vector3(0.1, 0.03, 0.01), Vector3(sx * (tail - 0.12), b + 0.14, back_z + 0.004), red_lens)
	box(root, Vector3(0.52, 0.115, 0.016), Vector3(0.0, lerpf(b, rear_top, 0.56), back_z + 0.008), plate_mat)
	box(root, Vector3(0.05, 0.115, 0.018), Vector3(-0.235, lerpf(b, rear_top, 0.56), back_z + 0.009), blue)
	box(root, Vector3(0.62, 0.15, 0.006), Vector3(0.0, lerpf(b, rear_top, 0.56), back_z), black)
	box(root, Vector3(tail * 1.72, 0.085, 0.012), Vector3(0.0, b + 0.05, back_z + 0.002), matte)
	box(root, Vector3(0.9, 0.016, 0.01), Vector3(0.0, lerpf(b, rear_top, 0.76), back_z + 0.002), chrome)
	var exhaust := MeshInstance3D.new()
	var ex := CylinderMesh.new()
	ex.top_radius = 0.04
	ex.bottom_radius = 0.04
	ex.height = 0.1
	ex.radial_segments = 16
	ex.material = chrome
	exhaust.mesh = ex
	exhaust.rotation.x = PI / 2.0
	exhaust.position = Vector3(0.5, b + 0.015, back_z - 0.02)
	root.add_child(exhaust)
	if kind != "sedan":
		box(root, Vector3(1.05, 0.03, 0.2), Vector3(0.0, _section(k, k["rear_glass"][0])[0] + 0.012, k["rear_glass"][0] - 0.02), paint, Vector3(-0.2, 0.0, 0.0))
		box(root, Vector3(0.34, 0.012, 0.008), Vector3(0.0, _section(k, k["rear_glass"][0])[0] - 0.012, k["rear_glass"][0] + 0.08), red_lens)

	# Зеркала, ручки, дворники, антенна.
	var s_mid: Array = _section(k, -0.56)
	for sx: float in [-1.0, 1.0]:
		var c := Vector3(sx * (s_mid[2] + 0.075), s_mid[1] + 0.09, -0.56)
		var stations: Array = []
		for f: float in [-1.0, -0.82, -0.45, 0.0, 0.5, 0.85, 1.0]:
			var q: float = sqrt(maxf(1.0 - f * f, 0.0)) * 0.9 + 0.1
			stations.push_back([c + Vector3(0.0, f * 0.068, 0.0), 0.115 * q, 0.05 * q])
		var housing := MeshInstance3D.new()
		housing.mesh = Mesher.tube(stations, paint, 16)
		root.add_child(housing)
		box(root, Vector3(0.09, 0.04, 0.06), Vector3(sx * (s_mid[2] - 0.0), s_mid[1] + 0.055, -0.56), black)
		box(root, Vector3(0.19, 0.1, 0.006), c + Vector3(0.0, 0.0, 0.049), black)
		for hz: float in [k["pillar"] - 0.2, k["rear_door"] - 0.22]:
			var hy: float = _section(k, hz)[1] - 0.13
			box(root, Vector3(0.022, 0.03, 0.17), Vector3(sx * (_section(k, hz)[2] + 0.012), hy, hz), paint)
	var ws0: float = k["windshield"][0]
	var ws_top: float = _section(k, ws0 + 0.05)[0]
	for s: float in [-1.0, 1.0]:
		box(root, Vector3(0.62, 0.014, 0.02), Vector3(s * 0.3, ws_top + 0.018, ws0 + 0.05), black, Vector3(0.0, 0.0, s * 0.05))
	var roof_z: float = 1.0
	var fin_y: float = _section(k, roof_z)[0]
	var fin := MeshInstance3D.new()
	fin.mesh = Mesher.limb(Vector3(0.0, fin_y, roof_z - 0.05), Vector3(0.0, fin_y + 0.05, roof_z + 0.08), 0.022, 0.006, black)
	root.add_child(fin)
	return root
