class_name Roundabout
extends RefCounted
## Круговое движение: центральный остров, кольцо и четыре подъезда.
## Угол a на кольце в градусах: 0 юг (z > 0), 90 восток, 180 север, 270 запад. Едут в сторону роста угла.


static func point(a_deg: float, r: float) -> Vector2:
	var a: float = deg_to_rad(a_deg)
	return Vector2(sin(a), cos(a)) * r


static func tangent(a_deg: float) -> Vector2:
	var a: float = deg_to_rad(a_deg)
	return Vector2(cos(a), -sin(a))


static func _circle(r: float, count: int = 96) -> PackedVector2Array:
	var out := PackedVector2Array()
	for k: int in count + 1:
		out.push_back(point(360.0 * k / count, r))
	return out


static func _bezier(a: Vector2, c: Vector2, b: Vector2, pts: PackedVector2Array) -> void:
	for k: int in range(1, 13):
		var t: float = k / 12.0
		pts.push_back(a.lerp(c, t).lerp(c.lerp(b, t), t))


static func build(w: World, s: Dictionary, id: String) -> void:
	w.rng.seed = hash(id)
	w.setup_light(w.rng.randf_range(10.5, 14.5), 0.0, w.rng.randf_range(0.34, 0.5))
	w.hills()
	w.ground()
	var lanes: int = s.get("lanes", 1)
	var inner: float = 7.0 if lanes == 1 else 9.5
	var outer: float = 13.0 if lanes == 1 else 18.0
	var hw: float = 3.5 if lanes == 1 else 7.0
	var pad := PackedVector2Array([Vector2(-300, -300), Vector2(300, -300), Vector2(300, 300), Vector2(-300, 300)])
	w.add_mesh(Mesher.prism(pad, -0.02, 0.0, w.asphalt(0.0), w.kerb()))
	var corner: float = sqrt(outer * outer - hw * hw)
	for q: Array in [[1.0, 1.0], [-1.0, 1.0], [1.0, -1.0], [-1.0, -1.0]]:
		var poly := PackedVector2Array([Vector2(q[0] * 280.0, q[1] * 280.0), Vector2(q[0] * hw, q[1] * 280.0)])
		var a0: float = asin(hw / outer)
		for k: int in 19:
			var a: float = lerpf(a0, PI / 2.0 - a0, k / 18.0)
			poly.push_back(Vector2(q[0] * sin(a) * outer, q[1] * cos(a) * outer))
		poly.push_back(Vector2(q[0] * 280.0, q[1] * hw))
		w.lot_outline(poly, 2.6)
	# Остров: бортик, газон и низкие кусты, деревьев нет: они закрывали бы обзор.
	w.add_mesh(Mesher.prism(_circle(inner, 64), -0.02, 0.14, w.pavement(), w.kerb()))
	w.add_mesh(Mesher.prism(_circle(inner - 1.2, 64), 0.1, 0.2, w.grass_ground(), w.kerb()))
	w.keep_clear(_circle((inner + outer) / 2.0), (outer - inner) / 2.0)
	for k: int in 9:
		w.plant_free("bush", sin(k * 0.7) * (inner - 3.4), cos(k * 0.7) * (inner - 3.4), 0.5, 0.2)
	if lanes == 2:
		# Ледельинье 1 и 1 м внутри кольца.
		w.line(_circle((inner + outer) / 2.0), 0.0, World.WHITE, 0.1, 1.0, 1.0)
	for leg: String in ["s", "e", "n", "w"]:
		var o: Vector2 = Junction.OUT[leg]
		var r: Vector2 = Junction.right_of(-o)
		var path := World.straight(o.x * (outer + 13.0), o.y * (outer + 13.0), o.x * 280.0, o.y * 280.0, 6.0)
		w.keep_clear(World.straight(o.x * outer, o.y * outer, o.x * 280.0, o.y * 280.0, 6.0), hw)
		# N302:2025, 7.4 и рис. 7.4—1: осевая в городе 3 и 1 м доходит до штриховки и приподнятого островка с жёлтым контуром.
		w.line(path, 0.0, World.YELLOW, 0.1, 3.0, 1.0)
		if lanes == 2:
			for side: float in [-3.5, 3.5]:
				var off := World.straight(o.x * (outer + 1.0) + r.x * side, o.y * (outer + 1.0) + r.y * side, o.x * 280.0 + r.x * side, o.y * 280.0 + r.y * side, 6.0)
				w.line(off, 0.0, World.WHITE, 0.1, 3.0, 1.0)
		var isle := PackedVector2Array([o * (outer + 0.7) + r * 0.95, o * (outer + 0.7) - r * 0.95, o * (outer + 7.0) - r * 0.4, o * (outer + 7.0) + r * 0.4])
		w.add_mesh(Mesher.prism(isle, -0.02, 0.16, w.grass_ground(), w.kerb()))
		# Контур островка жёлтый, как на рис. 7.4—1.
		var ring_line := PackedVector2Array([o * (outer + 0.45) + r * 1.15, o * (outer + 7.25) + r * 0.6, o * (outer + 7.25) - r * 0.6, o * (outer + 0.45) - r * 1.15])
		w.line(ring_line, 0.0, World.YELLOW, 0.12)
		# Жёлтые границы и штриховка перед островком.
		for side: float in [-1.0, 1.0]:
			w.paint_poly(PackedVector2Array([o * (outer + 7.0) + r * side * 0.55, o * (outer + 7.0) + r * side * 0.43, o * (outer + 13.0) + r * side * 0.02, o * (outer + 13.0) + r * side * 0.12]), World.YELLOW)
		var hatch: float = outer + 7.6
		while hatch < outer + 12.4:
			var hw_h: float = 0.5 * (outer + 13.0 - hatch) / 6.0
			w.paint_poly(PackedVector2Array([o * hatch - r * hw_h, o * (hatch + 0.28) - r * hw_h, o * (hatch + 0.9) + r * hw_h, o * (hatch + 0.62) + r * hw_h]), World.YELLOW)
			hatch += 1.1
		var count: int = 5 * lanes
		var step: float = (hw - 1.1) / count
		for k: int in count:
			var a: Vector2 = o * (outer + 0.25) + r * (1.0 + step * k)
			var b: Vector2 = a + r * (step - 0.1)
			w.paint_poly(PackedVector2Array([a, b, (a + b) / 2.0 + o * 0.85]))
		var yaw: float = atan2(o.x, o.y)
		var at: Vector2 = o * (outer + 2.2) + r * (hw + 1.0)
		# 406 только вместе с 202 на одной стойке, меньший номер наверху (N300:2026, 1.3.2 и 5.4.3).
		w.road_sign("rundkjoring", at.x, at.y, 0.6, 2.0, yaw, [], 0.14)
		w.road_sign("vikeplikt", at.x, at.y, 0.78, 2.65, yaw, [], 0.14)
	_vehicles(w, s, inner, outer, hw, lanes)
	_dress(w, outer, hw)


static func _ring_radius(lane: String, inner: float, outer: float, lanes: int) -> float:
	if lanes == 1:
		return (inner + outer) / 2.0
	return inner + 2.1 if lane == "inner" else outer - 2.1


static func _vehicles(w: World, s: Dictionary, inner: float, outer: float, hw: float, lanes: int) -> void:
	var me: Dictionary = s["me"]
	var head := Vector2(0.0, -1.0)
	var at: Vector2
	if me.has("ring"):
		at = point(me["ring"], _ring_radius(me.get("lane", "outer"), inner, outer, lanes))
		head = tangent(me["ring"])
	else:
		at = Vector2(me["lane"], outer + 4.6)
	var own: Node3D = w.car(World.ME_COLOR, at.x, at.y, Junction.yaw_of(head), "hatch")
	w.badge(Vector3(at.x, 0.82, at.y) - Vector3(head.x, 0.0, head.y) * 0.9, "DU", Junction.ME_BADGE)
	if me.has("blink"):
		Vehicles.blink(own, 1.0 if me["blink"] == "right" else -1.0, -1.95, 2.2, 0.8, 0.72, 0.9, true)
	w.chase(Vector3(at.x, 0.0, at.y), head, 12.0, 7.0, 17.0, 0.4, 50.0)
	for c: Dictionary in s.get("cars", []):
		var r: float = _ring_radius(c.get("lane", "outer"), inner, outer, lanes)
		var p: Vector2 = point(c["a"], r)
		var col: Array = c.get("color", [0.72, 0.72, 0.74])
		w.car(Color(col[0], col[1], col[2]), p.x, p.y, Junction.yaw_of(tangent(c["a"])), c.get("kind", "sedan"))
	# Стрелка: весь путь или только выезд, если путь и есть вопрос.
	var go: String = me.get("go", "straight")
	var exit_a: float = {"right": 90.0, "straight": 180.0, "left": 270.0}[go]
	var o: Vector2 = point(exit_a, 1.0)
	var r_out: Vector2 = Junction.right_of(o)
	var lane_off: float = hw / 2.0 if lanes == 1 else hw - 1.75
	var out_a: Vector2 = o * (outer + 0.6) + r_out * lane_off
	var out_b: Vector2 = o * (outer + 8.0) + r_out * lane_off
	if s.get("arrow", "full") == "exit":
		w.arrow(Junction._even(PackedVector2Array([out_a, out_b])), Junction.ME_BADGE.darkened(0.05))
		return
	var ring_r: float = _ring_radius("outer", inner, outer, lanes)
	var pts := PackedVector2Array([at + head * 2.6, Vector2(at.x, outer + 0.3)])
	var a_in: float = 32.0
	var a_out: float = exit_a - 30.0
	_bezier(Vector2(at.x, outer + 0.3), Vector2(at.x, ring_r), point(a_in, ring_r), pts)
	var count: int = maxi(2, ceili((a_out - a_in) / 6.0))
	for k: int in range(1, count + 1):
		pts.push_back(point(lerpf(a_in, a_out, float(k) / count), ring_r))
	_bezier(point(a_out, ring_r), point(exit_a - 8.0, ring_r), out_a, pts)
	pts.push_back(out_b)
	w.arrow(Junction._even(pts), Junction.ME_BADGE.darkened(0.05))


static func _dress(w: World, outer: float, hw: float) -> void:
	var colors: Array = [Color(0.86, 0.84, 0.76), Color(0.56, 0.14, 0.1), Color(0.74, 0.6, 0.28), Color(0.42, 0.5, 0.48)]
	var built: int = 0
	for q: Array in [[1.0, -1.0], [-1.0, -1.0], [1.0, 1.0], [-1.0, 1.0]]:
		for row: int in 3:
			# За спиной камеры дома не нужны, ближние углы оставлены открытыми, чтобы видеть кольцо.
			if q[1] > 0.0 and row < 2:
				continue
			var along: float = outer + 18.0 + row * 19.0
			var p := Vector2(q[0] * (hw + 15.0), q[1] * along)
			var floors: int = 1 + w.rng.randi() % 2
			var h: Node3D = House.make(11.0, 8.0, 2.7 * floors, colors[built % colors.size()], Color(0.16, 0.16, 0.17), floors, 2.4)
			h.position = Vector3(p.x, 0.17, p.y)
			h.rotation.y = PI / 2.0 if q[0] < 0.0 else -PI / 2.0
			w.add_child(h)
			built += 1
		w.tufts_rect(minf(q[0] * (hw + 3.0), q[0] * 40.0), maxf(q[0] * (hw + 3.0), q[0] * 40.0), minf(q[1] * (hw + 3.0), q[1] * 40.0), maxf(q[1] * (hw + 3.0), q[1] * 40.0), 9000, 0.17)
		var base: float = 45.0 if q[0] > 0.0 else -45.0
		var mid: float = (0.0 if q[1] > 0.0 else 180.0)
		var bush_a: float = mid + (base if q[1] > 0.0 else -base)
		for k: int in 13:
			var p: Vector2 = point(bush_a + (k - 6) * 3.4, outer + 4.0)
			w.plant_free("bush", p.x, p.y, 0.55, 0.17)
	for k: int in 240:
		var a: float = w.rng.randf() * TAU
		var r: float = w.rng.randf_range(70.0, 240.0)
		var tx: float = cos(a) * r
		var tz: float = sin(a) * r
		if absf(tx) < hw + 14.0 or absf(tz) < hw + 14.0:
			continue
		w.plant_free("pine" if w.rng.randf() < 0.75 else "broad", tx, tz, 0.9 + w.rng.randf() * 0.5, 0.17)
