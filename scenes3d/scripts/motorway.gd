class_name Motorway
extends RefCounted
## Motorvei и motortrafikkvei. Своя сторона идёт вдоль -z, полосы от x = 0 вправо, камера над своей машиной.
## Профиль motorvei по N100:2023, 3.3.3: полосы 3,5 м, внутренняя обочина 0,75 м, разделитель 2 м, внешняя обочина 2 м.
## Разметка по N302:2025: края 0,30 м, левый жёлтый (табл. 3.1—1), развязки по 7.6, слияние по 5.6, конец полосы по 5.7.
## Знаки по N300:2026: 530 с обеих сторон там, где начинается слияние; 531.1 на дороге и 531.2 на съезде с неё;
## 532 только при трёх и больше полосах; 503 без разделителя вместе с 148.
## mode: plain дорога; on полоса разгона; merge две полосы в одну; yield короткий въезд с Vikeplikt;
## off съезд с полосой торможения; ramp то же, съезд уже рядом; drop третья полоса кончается.
## Длины сжаты, чтобы всё вошло в кадр: настоящие участки длиннее (полоса разгона и слияние от 100 м).

const LANE: float = 3.5
const TOP_Z: float = 70.0
const FAR_Z: float = -280.0
const INNER: float = 0.75
const MEDIAN: float = 2.0
const OUTER: float = 2.0
static var edge_w: float = 0.3


static func build(w: World, s: Dictionary, id: String) -> void:
	w.rng.seed = hash(id)
	w.setup_light(w.rng.randf_range(10.5, 14.5), 0.0, w.rng.randf_range(0.34, 0.5))
	w.hills()
	w.ground()
	var motorvei: bool = s.get("road", "motorvei") == "motorvei"
	var mode: String = s.get("mode", "plain")
	edge_w = 0.3 if motorvei and not s.get("urban", false) else 0.15
	var lanes: int = (3 if mode == "drop" else 2) if motorvei else 1
	var r: float = LANE * lanes
	var surface: ShaderMaterial = w.asphalt(0.12)
	var steel: StandardMaterial3D = Car.mat(Color(0.6, 0.62, 0.64), 0.4, 0.7)
	if motorvei:
		_rect(w, -INNER, r, TOP_Z, FAR_Z, surface)
		var opp: float = -INNER - MEDIAN - INNER
		_rect(w, opp - 2.0 * LANE - OUTER, opp + INNER, TOP_Z, FAR_Z, surface)
		w.keep_clear(World.straight(r / 2.0, TOP_Z, r / 2.0, FAR_Z, 6.0), r / 2.0)
		w.keep_clear(World.straight(opp - LANE, TOP_Z, opp - LANE, FAR_Z, 6.0), LANE)
		_line_x(w, -edge_w / 2.0, YEL(), edge_w)
		_line_x(w, opp + edge_w / 2.0, YEL(), edge_w)
		_line_x(w, opp - 2.0 * LANE - edge_w / 2.0, World.WHITE, edge_w)
		_dash_x(w, opp - LANE, World.WHITE, 0.15, 3.0, 9.0)
		for k: int in range(1, lanes):
			if mode == "drop" and k == lanes - 1:
				continue
			_lane_line(w, s, LANE * k, mode)
		_rail(w, -INNER - MEDIAN / 2.0, TOP_Z - 20.0, -220.0, steel)
		var lz: float = 40.0
		while lz > -220.0:
			w.lamp(-INNER - MEDIAN / 2.0 + 0.3, lz, 1.0, 0.0)
			lz -= 42.0
	else:
		_rect(w, -LANE - 1.0, r, TOP_Z, FAR_Z, surface)
		w.keep_clear(World.straight(0.0, TOP_Z, 0.0, FAR_Z, 6.0), LANE)
		_line_x(w, -0.15, YEL(), 0.15)
		_line_x(w, 0.15, YEL(), 0.15)
		_line_x(w, -LANE - 0.08, World.WHITE, 0.15)
	var right_edge: float = r
	var path_in := PackedVector2Array()
	match mode:
		"on":
			path_in = _on_lane(w, r, float(s.get("join", 34.0)), surface)
			right_edge = r + LANE
		"merge":
			right_edge = _merge_lane(w, r, surface)
		"yield":
			right_edge = _yield_lane(w, r, surface)
		"off":
			right_edge = _off_lane(w, r, surface, -62.0)
		"ramp":
			right_edge = _off_lane(w, r, surface, -14.0)
		"drop":
			right_edge = _drop_lane(w, r, surface)
		_:
			_rect(w, r, r + (OUTER if motorvei else 1.0), TOP_Z, FAR_Z, surface)
			_line_x(w, r + edge_w / 2.0, World.WHITE, edge_w)
	if mode == "plain" or mode == "drop":
		_rail(w, right_edge + (OUTER if motorvei else 1.0) + 0.5, TOP_Z - 20.0, -150.0, steel)
	if s.has("over"):
		_overpass(w, s["over"], r)
	for sign: Dictionary in s.get("signs", []):
		var sx: float = sign.get("x", 0.0)
		var sz: float = sign["z"]
		var syaw: float = sign.get("yaw", 0.0)
		if sign.has("ramp_right") and path_in.size() > 2:
			# Знак справа от съезда: у точки пути на этой высоте z, лицом к едущим.
			var at_k: int = 1
			for k: int in range(1, path_in.size() - 1):
				if absf(path_in[k].y - sz) < absf(path_in[at_k].y - sz):
					at_k = k
			var dir: Vector2 = (path_in[at_k + 1] - path_in[at_k - 1]).normalized()
			var spot: Vector2 = path_in[at_k] + Vector2(-dir.y, dir.x) * float(sign["ramp_right"])
			sx = spot.x
			sz = spot.y
			syaw = atan2(-dir.x, -dir.y)
		w.road_sign(sign["id"], sx, sz, sign.get("w", 0.85), sign.get("bottom", 2.0), syaw, sign.get("under", []))
	if s.has("plate"):
		var pl: Array = s["plate"]
		Car.box(w, Vector3(2.9, 0.7, 0.06), Vector3(pl[1], 3.0, pl[2]), Car.mat(Color(0.04, 0.2, 0.55), 0.5))
		for dx: float in [-1.2, 1.2]:
			Car.box(w, Vector3(0.09, 3.0, 0.09), Vector3(pl[1] + dx, 1.5, pl[2] - 0.05), steel)
		Vehicles._text(w, pl[0], Vector3(pl[1], 3.0, pl[2] + 0.04), 0.0, 0.32, Color(0.96, 0.96, 0.96))
	var at := Vector2(s.get("own_x", r - LANE / 2.0), 0.0)
	var head := Vector2(0.0, -1.0)
	if s.get("own_ramp", false) and path_in.size() > 2:
		# Своя машина на съезде: точка пути рядом с z = 2, направление по касательной.
		var best: int = 1
		for k: int in range(1, path_in.size() - 1):
			if absf(path_in[k].y - 2.0) < absf(path_in[best].y - 2.0):
				best = k
		at = path_in[best]
		head = (path_in[best + 1] - path_in[best - 1]).normalized()
	var own: Node3D = w.car(World.ME_COLOR, at.x, at.y, Junction.yaw_of(head), "hatch")
	var back := Vector3(head.x, 0.0, head.y) * -0.9
	w.badge(Vector3(at.x, 0.82, at.y) + back, "DU", Junction.ME_BADGE)
	if s.has("own_blink"):
		Vehicles.blink(own, 1.0 if s["own_blink"] == "right" else -1.0, -1.95, 2.2, 0.8, 0.72, 0.9, true)
	var chase_back: float = 11.0
	if s.has("own_trailer"):
		Vehicles.trailer(own, Color(0.5, 0.52, 0.54), str(s["own_trailer"]) == "load")
		chase_back = 15.0
	w.chase(Vector3(at.x, 0.0, at.y), head, chase_back, 5.4, 22.0, 0.3, 48.0)
	if s.has("arrow"):
		var pts := PackedVector2Array()
		for p: Array in s["arrow"]:
			pts.push_back(Vector2(p[0], p[1]))
		w.arrow(Junction._even(pts), Junction.ME_BADGE)
	for a: Dictionary in s.get("actors", []):
		RoadScene._actor(w, a, "rural")
	var side: float = maxf(right_edge + OUTER, LANE * 4.0) + 1.0
	RoadScene._dressing(w, "rural", "", 0.0, side, side)


static func YEL() -> Color:
	return World.YELLOW


static func _rect(w: World, x0: float, x1: float, z0: float, z1: float, m: Material) -> void:
	w.add_mesh(Mesher.prism(PackedVector2Array([Vector2(x0, z0), Vector2(x1, z0), Vector2(x1, z1), Vector2(x0, z1)]), -0.02, 0.0, m, m))


static func _line_x(w: World, x: float, c: Color, width: float, z0: float = TOP_Z, z1: float = FAR_Z) -> void:
	w.line(World.straight(x, z0, x, z1, 6.0), 0.0, c, width)


static func _dash_x(w: World, x: float, c: Color, width: float, on: float, off: float, z0: float = TOP_Z, z1: float = FAR_Z) -> void:
	w.line(World.straight(x, z0, x, z1, 6.0), 0.0, c, width, on, off)


## Линия между полосами. Мимо полосы разгона комбинированная (7.6.2), иначе обычная 3 и 9 м.
static func _lane_line(w: World, s: Dictionary, x: float, mode: String) -> void:
	if mode == "on" and s.get("join", 34.0) > 0.0:
		_dash_x(w, x - 0.15, World.WHITE, 0.15, 3.0, 9.0)
		_dash_x(w, x + 0.15, World.WHITE, 0.15, 9.0, 3.0)
	else:
		_dash_x(w, x, World.WHITE, 0.15, 3.0, 9.0)


static func _rail(w: World, x: float, z0: float, z1: float, steel: Material) -> void:
	Car.box(w, Vector3(0.05, 0.3, z0 - z1), Vector3(x, 0.62, (z0 + z1) / 2.0), steel)
	var post: float = z0
	while post > z1:
		Car.box(w, Vector3(0.09, 0.72, 0.09), Vector3(x + signf(x) * 0.06, 0.36, post), steel)
		post -= 2.5


## Съезд с другой дороги: приходит справа и выпрямляется к началу полосы. Левый край жёлтый, правый белый.
static func _ramp_in(w: World, mid: float, join: float, surface: Material) -> PackedVector2Array:
	var ramp := PackedVector2Array()
	var a := Vector2(mid + 46.0, 120.0)
	var c := Vector2(mid + 4.2, join + 42.0)
	var e := Vector2(mid, join)
	for k: int in 49:
		var t: float = k / 48.0
		ramp.push_back(a.lerp(c, t).lerp(c.lerp(e, t), t))
	w.add_mesh(Mesher.strip(ramp, -LANE / 2.0 - 0.1, LANE / 2.0 + 1.0, 0.0, surface))
	w.keep_clear(ramp, LANE / 2.0)
	w.line(ramp, -LANE / 2.0 + 0.1, World.YELLOW, 0.12)
	w.line(ramp, LANE / 2.0, World.WHITE, 0.12)
	return ramp


## Штриховка клина между дорогой и съездом (1014): там, где они ещё не сошлись.
static func _wedge(w: World, r: float, edge: PackedVector2Array, surface: Material) -> void:
	var near := PackedVector2Array()
	for q: Vector2 in edge:
		if q.x - r < 3.4 and q.x > r:
			near.push_back(q)
	if near.size() < 3:
		return
	var poly := PackedVector2Array([Vector2(r, near[0].y)])
	poly.append_array(near)
	poly.push_back(Vector2(r, near[near.size() - 1].y))
	w.add_mesh(Mesher.prism(poly, -0.02, 0.0, surface, surface))
	var z_top: float = maxf(near[0].y, near[near.size() - 1].y)
	var z_low: float = minf(near[0].y, near[near.size() - 1].y)
	var z: float = z_low + 1.5
	while z < z_top - 0.5:
		var reach: float = r
		for q: Vector2 in near:
			if absf(q.y - z) < 1.2:
				reach = maxf(reach, q.x)
		if reach > r + 0.5:
			w.paint_poly(PackedVector2Array([Vector2(r + 0.1, z + 0.6), Vector2(r + 0.1, z + 0.1), Vector2(reach - 0.1, z - 1.0), Vector2(reach - 0.1, z - 0.5)]))
		z += 2.2


## Полоса разгона (7.6.5): от места примыкания сплошная, затем широкий штрих 2 и 2 м, вторая половина без линии.
static func _on_lane(w: World, r: float, join: float, surface: Material) -> PackedVector2Array:
	var end_full: float = join - 150.0
	var end_tip: float = join - 190.0
	var half_way: float = (join + end_full) / 2.0
	var o: float = r + LANE
	var mid: float = r + LANE / 2.0
	var shoulder: float = OUTER if r > LANE else 1.0
	# Обочина дороги до примыкания и полоса с обочиной после него.
	_rect(w, r, r + shoulder, TOP_Z, join, surface)
	_line_x(w, r + edge_w / 2.0, World.WHITE, edge_w, TOP_Z, join)
	w.add_mesh(Mesher.prism(PackedVector2Array([Vector2(r, join), Vector2(o + shoulder, join), Vector2(o + shoulder, end_full), Vector2(r + shoulder, end_tip), Vector2(r, end_tip)]), -0.02, 0.0, surface, surface))
	_rect(w, r, r + shoulder, end_tip, FAR_Z, surface)
	w.keep_clear(World.straight(mid, join, mid, end_tip, 6.0), LANE / 2.0)
	_line_x(w, r, World.WHITE, 0.15, join, join - 18.0)
	_dash_x(w, r, World.WHITE, 0.3, 2.0, 2.0, join - 18.0, half_way)
	w.line(PackedVector2Array([Vector2(o + 0.1, join), Vector2(o + 0.1, end_full), Vector2(r + edge_w / 2.0, end_tip), Vector2(r + edge_w / 2.0, FAR_Z)]), 0.0, World.WHITE, edge_w)
	var ramp: PackedVector2Array = _ramp_in(w, mid, join, surface)
	var left := PackedVector2Array()
	for k: int in ramp.size():
		var d: Vector2 = (ramp[mini(k + 1, ramp.size() - 1)] - ramp[maxi(k - 1, 0)]).normalized()
		left.push_back(ramp[k] + Vector2(d.y, -d.x) * (LANE / 2.0 - 0.1))
	_wedge(w, r, left, surface)
	return ramp


## Sammenfletting (5.6, N300 6.4.24): линия между полосами кончается у знака, в сужении ни линий, ни стрелок.
static func _merge_lane(w: World, r: float, surface: Material) -> float:
	# Линия кончается у знака, дальше 150 м полной ширины без линий, потом сужение.
	var line_end: float = -16.0
	var full: float = line_end - 150.0
	var tip: float = full - 40.0
	var o: float = r + LANE
	var shoulder: float = 1.0
	w.add_mesh(Mesher.prism(PackedVector2Array([Vector2(r, TOP_Z), Vector2(o + shoulder, TOP_Z), Vector2(o + shoulder, full), Vector2(r + shoulder, tip), Vector2(r, tip)]), -0.02, 0.0, surface, surface))
	_rect(w, r, r + shoulder, tip, FAR_Z, surface)
	w.keep_clear(World.straight(r + LANE / 2.0, TOP_Z, r + LANE / 2.0, tip, 6.0), LANE / 2.0)
	_dash_x(w, r, World.WHITE, 0.15, 3.0, 9.0, TOP_Z, line_end)
	w.line(PackedVector2Array([Vector2(o + 0.08, TOP_Z), Vector2(o + 0.08, full), Vector2(r + 0.08, tip), Vector2(r + 0.08, FAR_Z)]), 0.0, World.WHITE, edge_w)
	return o


## Короткий въезд (7.6.6): съезд изгибом, полоса короче 30 м, зубцы по границе, штриховая кромка, знак Vikeplikt.
static func _yield_lane(w: World, r: float, surface: Material) -> float:
	var start: float = 6.0
	var full: float = -22.0
	var tip: float = -34.0
	var o: float = r + LANE
	var mid: float = r + LANE / 2.0
	var shoulder: float = 1.0
	_rect(w, r, r + shoulder, TOP_Z, start, surface)
	w.add_mesh(Mesher.prism(PackedVector2Array([Vector2(r, start), Vector2(o + 0.6, start), Vector2(o + 0.6, full), Vector2(r + shoulder, tip), Vector2(r, tip)]), -0.02, 0.0, surface, surface))
	_rect(w, r, r + shoulder, tip, FAR_Z, surface)
	w.keep_clear(World.straight(mid, start, mid, tip, 6.0), LANE / 2.0)
	var ramp := PackedVector2Array()
	var a := Vector2(mid + 34.0, TOP_Z)
	var c := Vector2(mid, 34.0)
	var e := Vector2(mid, start)
	for k: int in 33:
		var t: float = k / 32.0
		ramp.push_back(a.lerp(c, t).lerp(c.lerp(e, t), t))
	w.add_mesh(Mesher.strip(ramp, -LANE / 2.0 - 0.1, LANE / 2.0 + 0.6, 0.0, surface))
	w.keep_clear(ramp, LANE / 2.0)
	w.line(ramp, -LANE / 2.0 + 0.2, World.YELLOW, 0.12)
	w.line(ramp, LANE / 2.0, World.WHITE, 0.12)
	_line_x(w, r + edge_w / 2.0, World.WHITE, edge_w, TOP_Z, start)
	_dash_x(w, r + 0.1, World.WHITE, 0.1, 1.0, 1.0, start, tip)
	var z: float = start - 0.4
	while z > full + 0.4:
		w.paint_poly(PackedVector2Array([Vector2(r + 0.3, z), Vector2(r + 0.3, z - 0.62), Vector2(r + 0.85, z - 0.31)]))
		z -= 0.95
	w.line(PackedVector2Array([Vector2(o + 0.08, start), Vector2(o + 0.08, full), Vector2(r + 0.08, tip), Vector2(r + 0.08, FAR_Z)]), 0.0, World.WHITE, edge_w)
	return o


## Полоса торможения (7.6.3): появляется сужением, вдоль неё широкий штрих, у носа сплошная и штриховка.
static func _off_lane(w: World, r: float, surface: Material, leave: float) -> float:
	var o: float = r + LANE
	var start: float = leave + 150.0
	var open: float = leave + 110.0
	var solid_from: float = leave + 16.0
	var shoulder: float = OUTER if r > LANE else 1.0
	_rect(w, r, r + shoulder, TOP_Z, start, surface)
	_line_x(w, r + edge_w / 2.0, World.WHITE, edge_w, TOP_Z, start)
	w.add_mesh(Mesher.prism(PackedVector2Array([Vector2(r, start), Vector2(r + shoulder, start), Vector2(o + shoulder, open), Vector2(o + shoulder, leave), Vector2(r, leave)]), -0.02, 0.0, surface, surface))
	w.keep_clear(World.straight(r + LANE / 2.0, open, r + LANE / 2.0, leave, 6.0), LANE / 2.0)
	var mid := Vector2(r + LANE / 2.0, leave)
	var ramp := PackedVector2Array()
	for k: int in 33:
		var t: float = k / 32.0
		var a: Vector2 = mid.lerp(Vector2(mid.x, leave - 34.0), t)
		var b: Vector2 = Vector2(mid.x, leave - 34.0).lerp(Vector2(mid.x + 60.0, leave - 70.0), t)
		ramp.push_back(a.lerp(b, t))
	w.add_mesh(Mesher.strip(ramp, -LANE / 2.0 - 0.1, LANE / 2.0 + 1.0, 0.0, surface))
	w.keep_clear(ramp, LANE / 2.0)
	var left_edge := PackedVector2Array()
	var nose_len: float = 0.0
	for k: int in ramp.size():
		var d: Vector2 = (ramp[mini(k + 1, ramp.size() - 1)] - ramp[maxi(k - 1, 0)]).normalized()
		var q: Vector2 = ramp[k] + Vector2(d.y, -d.x) * (LANE / 2.0 - 0.1)
		if q.x - r > 3.4:
			break
		left_edge.push_back(q)
		if k > 0:
			nose_len += ramp[k].distance_to(ramp[k - 1])
	_wedge(w, r, left_edge, surface)
	# Левый край съезда до носа белый (граница штриховки), от носа жёлтый (7.6.9).
	w.line(ramp, -LANE / 2.0 + 0.1, World.WHITE, 0.15, 0.0, 0.0, 0.0, nose_len)
	w.line(ramp, -LANE / 2.0 + 0.1, World.YELLOW, 0.12, 0.0, 0.0, nose_len)
	w.line(ramp, LANE / 2.0, World.WHITE, 0.12)
	_dash_x(w, r, World.WHITE, 0.3, 2.0, 2.0, start - 10.0, solid_from)
	_line_x(w, r, World.WHITE, 0.15, solid_from, leave)
	_line_x(w, r + edge_w / 2.0, World.WHITE, edge_w, leave, FAR_Z)
	_rect(w, r, r + shoulder, leave, FAR_Z, surface)
	w.line(PackedVector2Array([Vector2(r + edge_w / 2.0, start), Vector2(o + 0.1, open), Vector2(o + 0.1, leave)]), 0.0, World.WHITE, edge_w)
	return o


## Конец крайней из трёх полос (5.7): штрих 2 и 2 м до конца сужения, стрелки перестроения, знак 532.
static func _drop_lane(w: World, r: float, surface: Material) -> float:
	var x: float = r - LANE
	var full: float = -26.0
	var tip: float = -66.0
	w.add_mesh(Mesher.prism(PackedVector2Array([Vector2(r, TOP_Z), Vector2(r + OUTER, TOP_Z), Vector2(r + OUTER, full), Vector2(x + OUTER, tip), Vector2(x, tip), Vector2(r, full)]), -0.02, 0.0, surface, surface))
	_rect(w, x, x + OUTER, tip, FAR_Z, surface)
	_dash_x(w, x, World.WHITE, 0.2, 2.0, 2.0, TOP_Z, tip)
	w.line(PackedVector2Array([Vector2(r + edge_w / 2.0, TOP_Z), Vector2(r + edge_w / 2.0, full), Vector2(x + edge_w / 2.0, tip), Vector2(x + edge_w / 2.0, FAR_Z)]), 0.0, World.WHITE, edge_w)
	for z: float in [-8.0, -21.0, -34.0]:
		var c := Vector2(x + LANE / 2.0, z)
		w.paint_poly(PackedVector2Array([c + Vector2(0.72, 0.0), c + Vector2(0.98, 0.0), c + Vector2(0.2, -3.9), c + Vector2(-0.06, -3.9)]))
		w.paint_poly(PackedVector2Array([c + Vector2(-0.62, -3.2), c + Vector2(0.62, -3.9), c + Vector2(-0.72, -5.7)]))
	return r


## Мост над дорогой: планскильное пересечение. Опоры на разделителе и за обочинами.
static func _overpass(w: World, z: float, r: float) -> void:
	var concrete: StandardMaterial3D = Car.mat(Color(0.55, 0.55, 0.52), 0.8)
	var steel: StandardMaterial3D = Car.mat(Color(0.6, 0.62, 0.64), 0.4, 0.7)
	Car.box(w, Vector3(90.0, 0.9, 9.0), Vector3(0.0, 6.2, z), concrete)
	for side: float in [-1.0, 1.0]:
		Car.box(w, Vector3(90.0, 0.7, 0.06), Vector3(0.0, 7.0, z + side * 4.4), steel)
	for x: float in [-15.0, -1.75, r + 4.0]:
		for dz: float in [-3.0, 3.0]:
			Car.box(w, Vector3(0.9, 5.8, 1.1), Vector3(x, 2.9, z + dz), concrete)
	var c: Node3D = Car.make(Color(0.5, 0.05, 0.06), "suv")
	c.position = Vector3(6.0, 6.66, z - 1.75)
	c.rotation.y = -PI / 2.0
	w.add_mover(c)
