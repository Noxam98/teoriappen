class_name Junction
extends RefCounted
## Перекрёсток из описания вопроса: те же стороны, полосы и пути, что на схеме сверху.
## Стороны как на карте: север это -z, восток это +x. Движение правостороннее.

const HW: float = 3.5
const LANE: float = 1.75
const OUT: Dictionary = {"n": Vector2(0, -1), "e": Vector2(1, 0), "s": Vector2(0, 1), "w": Vector2(-1, 0)}
const ORDER: Array = ["n", "e", "s", "w"]
const COLORS: Array = [Color(0.72, 0.08, 0.08), Color(0.05, 0.42, 0.26), Color(0.86, 0.5, 0.05), Color(0.42, 0.2, 0.62)]
const BADGE: Array = [Color(0.85, 0.2, 0.15), Color(0.05, 0.55, 0.33), Color(0.88, 0.5, 0.05), Color(0.5, 0.25, 0.75)]
const ME_BADGE := Color(0.15, 0.39, 0.92)


static func right_of(v: Vector2) -> Vector2:
	return Vector2(-v.y, v.x)


static func destination(from: String, go: String) -> String:
	var i: int = ORDER.find(from)
	match go:
		"straight":
			return ORDER[(i + 2) % 4]
		"left":
			return ORDER[(i + 1) % 4]
		_:
			return ORDER[(i + 3) % 4]


static func yaw_of(head: Vector2) -> float:
	return atan2(-head.x, -head.y)


static func _length(kind: String) -> float:
	match kind:
		"bus":
			return 12.0
		"tram":
			return 17.0
		"utrykning":
			return 5.8
		"bike":
			return 1.8
		_:
			return 4.4


static func _height(kind: String) -> float:
	match kind:
		"bus":
			return 3.3
		"tram":
			return 4.5
		"utrykning":
			return 2.65
		"bike":
			return 1.85
		_:
			return 1.5


static func build(w: World, s: Dictionary, id: String) -> void:
	w.rng.seed = hash(id)
	var veh: Array = s["veh"]
	var ped: Array = s.get("ped", [])
	var me: Dictionary = {}
	for v: Dictionary in veh:
		if v.get("me", false):
			me = v
	var view: Vector2 = -OUT[me["from"]]
	w.setup_light(w.rng.randf_range(10.5, 14.5), 0.0, w.rng.randf_range(0.34, 0.5), view)
	w.hills()
	w.ground()
	var t: bool = s["type"] == "t"
	var legs: Array = ["w", "e", "s"] if t else ["n", "e", "s", "w"]
	# Асфальт и участки с тротуарами.
	var pad := PackedVector2Array([Vector2(-260, -260), Vector2(260, -260), Vector2(260, 260), Vector2(-260, 260)])
	w.add_mesh(Mesher.prism(pad, -0.02, 0.0, w.asphalt(0.0), w.kerb()))
	var sides: Array = [[1.0, 1.0], [-1.0, 1.0]]
	if not t:
		sides.append_array([[1.0, -1.0], [-1.0, -1.0]])
	for q: Array in sides:
		w.lot(q[0] * HW, q[1] * HW, q[0], q[1], 256.0, 256.0, 5.5, 2.6)
	if t:
		w.lot(256.0, -HW, -1.0, -1.0, 512.0, 256.0, 0.0, 2.6)
	# Осевые линии и проезжая часть, на которой ничего не должно стоять.
	for leg: String in legs:
		var o: Vector2 = OUT[leg]
		w.keep_clear(World.straight(0.0, 0.0, o.x * 250.0, o.y * 250.0, 2.0), HW)
		var near: float = HW + (6.0 if ped.has(leg) else 2.2)
		var path := World.straight(o.x * near, o.y * near, o.x * 250.0, o.y * 250.0)
		w.line(path, 0.0, World.YELLOW, 0.11, 3.0, 9.0)
	# Знаки и разметка перед ними.
	var signs: Dictionary = s.get("signs", {})
	for leg: String in signs:
		var o: Vector2 = OUT[leg]
		var r: Vector2 = right_of(-o)
		var p: Vector2 = o * (HW + 3.6) + r * (HW + 1.15)
		w.road_sign(signs[leg], p.x, p.y, 0.95, 1.95, atan2(o.x, o.y), [], 0.14)
		if signs[leg] == "vikeplikt":
			_teeth(w, o, r)
		elif signs[leg] == "stopp":
			var a: Vector2 = o * (HW + 0.7)
			var b: Vector2 = o * (HW + 1.2)
			var c: Vector2 = a + r * (HW - 0.15)
			var d: Vector2 = b + r * (HW - 0.15)
			w.paint_poly(PackedVector2Array([a, c, d, b]))
	# Пешеходные переходы.
	for leg: String in ped:
		var o: Vector2 = OUT[leg]
		var across: Vector2 = right_of(o)
		_zebra(w, o, across)
		var walker: Vector2 = o * (HW + 2.5) + across * ((-HW + 1.5) if s.get("pedAt", "") == "crossing" else (-HW - 0.9))
		var base: float = 0.0 if s.get("pedAt", "") == "crossing" else 0.14
		var pp: Node3D = w.person(walker.x, walker.y, yaw_of(across), Color(0.8, 0.45, 0.08), Color(0.1, 0.13, 0.22), base)
		pp.name = "ped"
	# Транспорт, стрелки и подписи.
	var color_index: int = 0
	var kinds: Array = ["sedan", "hatch", "suv"]
	for v: Dictionary in veh:
		var kind: String = v.get("kind", "car")
		var o: Vector2 = OUT[v["from"]]
		var head: Vector2 = -o
		var right: Vector2 = right_of(head)
		var lane: float = 2.75 if kind == "bike" else LANE
		var is_me: bool = v.get("me", false)
		var body_color: Color = World.ME_COLOR
		var tag: Color = ME_BADGE
		if not is_me:
			if kind == "utrykning":
				tag = Color(0.86, 0.1, 0.2)
			else:
				tag = BADGE[color_index % BADGE.size()]
				body_color = COLORS[color_index % COLORS.size()]
				color_index += 1
		var len: float = _length(kind)
		var gap: float = 5.6 if ped.has(v["from"]) else 1.6
		var centre: Vector2 = o * (HW + gap + len / 2.0) + right * lane
		var yaw: float = yaw_of(head)
		var node: Node3D
		match kind:
			"bus":
				node = Vehicles.bus(body_color)
			"tram":
				node = Vehicles.tram(Color(0.16, 0.36, 0.62))
			"utrykning":
				node = Vehicles.ambulance()
			"bike":
				node = Person.cyclist(body_color, Color(0.12, 0.13, 0.2))
			_:
				node = Car.make(body_color, kinds[w.rng.randi() % kinds.size()])
		node.position = Vector3(centre.x, 0.0, centre.y)
		node.rotation.y = yaw
		w.add_mover(node)
		var d_out: Vector2 = OUT[destination(v["from"], v["go"])]
		var d_right: Vector2 = right_of(d_out)
		var front: Vector2 = centre + head * (len / 2.0 + 0.5)
		var entry: Vector2 = o * HW + right * lane
		# Путь в сторону камеры заканчивается раньше: иначе стрелка огромная на переднем плане.
		var towards_camera: bool = d_out.dot(-OUT[me["from"]]) < -0.5
		var exit_p: Vector2 = d_out * (HW + (2.2 if towards_camera else 6.5)) + d_right * lane
		var corner: Vector2 = entry + head * (exit_p - entry).dot(head)
		var points := PackedVector2Array([front, entry])
		if v["go"] == "straight":
			points = PackedVector2Array([front, exit_p])
		else:
			for k: int in range(1, 17):
				var a: float = k / 16.0
				points.push_back(entry.lerp(corner, a).lerp(corner.lerp(exit_p, a), a))
		w.arrow(_even(points), tag.darkened(0.05))
		if kind == "tram":
			var far: Vector2 = o * 250.0 + right * lane
			var away: Vector2 = d_out * 250.0 + d_right * lane
			w.rails(World.straight(far.x, far.y, away.x, away.y, 6.0), 0.0)
		if is_me:
			w.badge(Vector3(centre.x, 0.82, centre.y) + Vector3(head.x, 0.0, head.y) * -0.9, v["id"], tag)
		else:
			var at: Vector2 = centre + head * maxf(0.0, len / 2.0 - 2.4)
			w.badge(Vector3(at.x, _height(kind), at.y), v["id"], tag)
		if is_me:
			w.chase(Vector3(centre.x, 0.0, centre.y), head, 11.5, 5.6, 16.0, 0.4, 46.0)
	_surroundings(w, t, -OUT[me["from"]])


## Зубы дракона поперёк своей полосы: вершины смотрят на подъезжающего водителя.
static func _teeth(w: World, o: Vector2, r: Vector2) -> void:
	var count: int = 5
	var step: float = (HW - 0.25) / count
	for k: int in count:
		var a: Vector2 = o * (HW + 0.6) + r * (0.14 + step * k + 0.04)
		var b: Vector2 = a + r * (step - 0.1)
		var tip: Vector2 = (a + b) / 2.0 + o * 0.85
		w.paint_poly(PackedVector2Array([a, b, tip]))


static func _zebra(w: World, o: Vector2, across: Vector2) -> void:
	var near: float = HW + 1.0
	var far: float = HW + 4.0
	var k: float = -HW + 0.25
	while k < HW - 0.3:
		var a: Vector2 = o * near + across * k
		var b: Vector2 = o * far + across * k
		var c: Vector2 = o * far + across * (k + 0.5)
		var d: Vector2 = o * near + across * (k + 0.5)
		w.paint_poly(PackedVector2Array([a, b, c, d]))
		k += 1.0
	var s1: Vector2 = o * (HW + 0.7) + across * (HW + 0.95)
	w.road_sign("gangfelt", s1.x, s1.y, 0.75, 2.0, atan2(-o.x, -o.y), [], 0.14)
	var s2: Vector2 = o * (HW + 4.3) - across * (HW + 0.95)
	w.road_sign("gangfelt", s2.x, s2.y, 0.75, 2.0, atan2(o.x, o.y), [], 0.14)


## Точки стрелки через равный шаг, чтобы штрихи шли ровно.
static func _even(points: PackedVector2Array) -> PackedVector2Array:
	var out := PackedVector2Array([points[0]])
	for i: int in range(1, points.size()):
		var a: Vector2 = points[i - 1]
		var b: Vector2 = points[i]
		var n: int = maxi(1, roundi(a.distance_to(b) / 0.5))
		for k: int in range(1, n + 1):
			out.push_back(a.lerp(b, float(k) / n))
	return out


## Дома и деревья: на дальней от камеры стороне дома, на ближней только трава и невысокие кусты.
static func _surroundings(w: World, t: bool, view: Vector2) -> void:
	var colors: Array = [Color(0.86, 0.84, 0.76), Color(0.56, 0.14, 0.1), Color(0.74, 0.6, 0.28), Color(0.42, 0.5, 0.48), Color(0.82, 0.8, 0.72), Color(0.6, 0.16, 0.12)]
	var quads: Array = [[1.0, 1.0], [-1.0, 1.0], [1.0, -1.0], [-1.0, -1.0]]
	var built: int = 0
	for q: Array in quads:
		var dir := Vector2(q[0], q[1]).normalized()
		var is_far: bool = dir.dot(view) > 0.0
		if t and q[1] < 0.0:
			is_far = true
		for row: int in 4:
			var along: float = 12.0 + row * 19.0 + w.rng.randf() * 3.0
			var set_back: float = 12.0 + w.rng.randf() * 3.0
			var pts: Array = [Vector2(q[0] * (HW + set_back), q[1] * (HW + along)), Vector2(q[0] * (HW + along), q[1] * (HW + set_back))]
			for pi: int in 2:
				var p: Vector2 = pts[pi]
				if not is_far and p.length() < 38.0:
					continue
				if t and q[1] < 0.0 and pi == 0:
					continue
				var yaw: float = (PI / 2.0 if q[0] < 0.0 else -PI / 2.0) if pi == 0 else (0.0 if q[1] < 0.0 else PI)
				var floors: int = 1 + w.rng.randi() % 2
				var h: Node3D = House.make(11.0 + w.rng.randf() * 2.0, 8.0, 2.7 * floors, colors[built % colors.size()], Color(0.16, 0.16, 0.17), floors, 2.4)
				h.position = Vector3(p.x, 0.17, p.y)
				h.rotation.y = yaw
				w.add_child(h)
				built += 1
		for k: int in 16:
			var x: float = q[0] * (HW + 12.0 + w.rng.randf() * 58.0)
			var z: float = q[1] * (HW + 12.0 + w.rng.randf() * 58.0)
			if not is_far and Vector2(x, z).length() < 30.0:
				continue
			w.plant_free("broad", x, z, 0.5 + w.rng.randf() * 0.3, 0.17)
		for k: int in 26:
			var along: float = 7.0 + k * 1.5
			w.plant_free("bush", q[0] * (HW + 3.3 + w.rng.randf() * 0.5), q[1] * (HW + along), 0.55, 0.17)
			w.plant_free("bush", q[0] * (HW + along), q[1] * (HW + 3.3 + w.rng.randf() * 0.5), 0.55, 0.17)
		w.tufts_rect(minf(q[0] * (HW + 3.0), q[0] * 34.0), maxf(q[0] * (HW + 3.0), q[0] * 34.0), minf(q[1] * (HW + 3.0), q[1] * 34.0), maxf(q[1] * (HW + 3.0), q[1] * 34.0), 9000, 0.17)
		if is_far:
			w.lamp(q[0] * (HW + 1.0), q[1] * (HW + 9.0), -q[0])
	for k: int in 300:
		var a: float = w.rng.randf() * TAU
		var r: float = w.rng.randf_range(90.0, 250.0)
		var tx: float = cos(a) * r
		var tz: float = sin(a) * r
		# Деревья не стоят на дорогах: ни на продолжении улиц, ни рядом с ними.
		if absf(tx) < 16.0 or absf(tz) < 16.0:
			continue
		w.plant_free("pine" if w.rng.randf() < 0.75 else "broad", tx, tz, 0.9 + w.rng.randf() * 0.5, 0.17)
