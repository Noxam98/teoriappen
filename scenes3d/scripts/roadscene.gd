class_name RoadScene
extends RefCounted
## Участок дороги с разметкой из вопроса. Своя машина внизу кадра, камера чуть выше и позади неё.

const BIKE_SVG: String = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 320" width="400" height="640"><g fill="none" stroke="#ecebe4" stroke-width="13">
<circle cx="48" cy="205" r="40"/><circle cx="152" cy="205" r="40"/>
<path d="M48 205 L82 130 L128 130 L152 205 M82 130 L98 205 L48 205 M98 205 L128 130 M128 130 L122 104 L146 100 M82 130 L74 110 L96 110"/></g></svg>"""


static func _seg(w: World, x0: float, z0: float, x1: float, z1: float, width: float, color: Color) -> void:
	w.line(World.straight(x0, z0, x1, z1, 3.0), 0.0, color, width, 0.0, 0.0, 0.0, INF, 0.3)


static func build(w: World, s: Dictionary, id: String) -> void:
	w.rng.seed = hash(id)
	var kind: String = s["kind"]
	w.setup_light(w.rng.randf_range(10.5, 14.5), 0.0, w.rng.randf_range(0.34, 0.5), Vector2(0.0, -1.0))
	w.hills()
	w.ground()
	var left: float = 3.5
	var right: float = 3.5
	var own_x: float = 1.75
	match kind:
		"sykkelfelt":
			left = 3.6
			right = 4.7
			own_x = 1.6
		"kollektivfelt":
			left = 5.25
			right = 5.25
			own_x = 0.0
		"sperreflate":
			left = 5.2
			right = 5.2
			own_x = 3.1
	var env: String = s.get("env", "rural")
	var zc: float = s.get("zc", -25.0)
	var cross: String = s.get("cross", "")
	if s.get("hill", false):
		w.elev = func(z: float) -> float:
			var up: float = smoothstep(4.0, 60.0, -z) * 7.5
			return up - smoothstep(62.0, 130.0, -z) * 7.5
		var ground_path := World.straight(0.0, 80.0, 0.0, -180.0, 2.0)
		w.add_mesh(Mesher.strip(ground_path, -320.0, 320.0, -0.03, w.grass_ground(), w.elev))
	var whole := World.straight(0.0, 70.0, 0.0, -260.0, 3.0)
	if env == "street":
		var pad := PackedVector2Array([Vector2(-260, -300), Vector2(260, -300), Vector2(260, 90), Vector2(-260, 90)])
		w.add_mesh(Mesher.prism(pad, -0.02, 0.0, w.asphalt(0.09), w.kerb()))
		if cross == "both":
			for q: Array in [[1.0, zc + 3.5, 1.0, 1.0, right], [1.0, zc - 3.5, 1.0, -1.0, right], [-1.0, zc + 3.5, -1.0, 1.0, left], [-1.0, zc - 3.5, -1.0, -1.0, left]]:
				w.lot(q[0] * q[4], q[1], q[2], q[3], 240.0, 280.0, 5.0, 2.6)
		elif cross == "right":
			w.lot(right, zc + 3.5, 1.0, 1.0, 240.0, 280.0, 5.0, 2.6)
			w.lot(right, zc - 3.5, 1.0, -1.0, 240.0, 280.0, 5.0, 2.6)
			w.lot(-left, 90.0, -1.0, -1.0, 240.0, 400.0, 0.0, 2.6)
		else:
			w.lot(right, 90.0, 1.0, -1.0, 240.0, 400.0, 0.0, 2.6)
			w.lot(-left, 90.0, -1.0, -1.0, 240.0, 400.0, 0.0, 2.6)
	else:
		w.road(whole, maxf(left, right), 0.9, 0.12)
		var edge: float = maxf(left, right) - 0.25
		w.line(whole, edge, World.WHITE, 0.12, 0.0, 0.0, 0.0, INF, 0.35)
		w.line(whole, -edge, World.WHITE, 0.12, 0.0, 0.0, 0.0, INF, 0.35)
		w.posts(whole, edge + 1.5, 25.0, 12.0)
		w.posts(whole, -edge - 1.5, 25.0, 24.0)
	var road_mid: float = (right - left) / 2.0
	w.keep_clear(World.straight(road_mid, 70.0, road_mid, -260.0, 3.0), (left + right) / 2.0)
	if cross != "":
		w.keep_clear(World.straight(0.0, zc, 240.0, zc, 2.0), 3.5)
	if cross == "both":
		w.keep_clear(World.straight(0.0, zc, -240.0, zc, 2.0), 3.5)
	_marking(w, kind, s, whole, zc, left, right, cross)
	if cross != "":
		_side_lines(w, zc, cross, left, right)
	_dressing(w, env, cross, zc, left, right)
	for sign: Dictionary in s.get("signs", []):
		var under: Array = sign.get("under", [])
		w.road_sign(sign["id"], sign["x"], sign["z"], sign.get("w", 0.85), 1.95, sign.get("yaw", 0.0), under, 0.14 if env == "street" else 0.0)

	# Участники движения.
	for a: Dictionary in s.get("actors", []):
		_actor(w, a, env)
	var queue: int = s.get("queue", 0)
	var colors: Array = [Color(0.72, 0.72, 0.74), Color(0.5, 0.05, 0.06), Color(0.04, 0.05, 0.06), Color(0.06, 0.24, 0.16), Color(0.82, 0.82, 0.8)]
	var kinds: Array = ["sedan", "hatch", "suv"]
	for k: int in queue:
		w.car(colors[k % colors.size()], own_x, -8.0 - k * 6.4, 0.0, kinds[k % kinds.size()])
	var own: Node3D = w.driver(own_x, 0.0, own_x, -60.0)
	w.badge(Vector3(own_x, 0.82, 0.9), "DU", Junction.ME_BADGE)
	if s.get("arrow", "") == "right":
		var pts := PackedVector2Array([Vector2(own_x, -2.8), Vector2(own_x, zc + 7.5)])
		var entry := Vector2(own_x, zc + 7.5)
		var corner := Vector2(own_x, zc + 1.75)
		var out := Vector2(right + 9.0, zc + 1.75)
		for k: int in range(1, 17):
			var t: float = k / 16.0
			pts.push_back(entry.lerp(corner, t).lerp(corner.lerp(out, t), t))
		w.arrow(Junction._even(pts), Junction.ME_BADGE)
		var amber := StandardMaterial3D.new()
		amber.albedo_color = Color(1.0, 0.6, 0.05)
		amber.emission_enabled = true
		amber.emission = Color(1.0, 0.55, 0.04)
		amber.emission_energy_multiplier = 3.0
		Car.box(own, Vector3(0.12, 0.09, 0.03), Vector3(0.74, 0.9, 2.18), amber)
		Car.box(own, Vector3(0.03, 0.05, 0.1), Vector3(0.95, 0.72, -1.9), amber)


static func _marking(w: World, kind: String, s: Dictionary, path: PackedVector2Array, zc: float, left: float, right: float, cross: String) -> void:
	var y: Color = World.YELLOW
	var skille := func(x: float, from: float = 0.0, to: float = INF) -> void:
		w.line(path, x, y, 0.11, 3.0, 9.0, from, to)
	var to_cross: float = 70.0 - zc - 7.0
	var from_cross: float = 70.0 - zc + 7.0
	match kind:
		"sperrelinje":
			w.line(path, 0.0, y, 0.13)
		"dobbel_sperrelinje":
			w.line(path, -0.11, y, 0.11)
			w.line(path, 0.11, y, 0.11)
		"varsellinje":
			w.line(path, 0.0, y, 0.12, 9.0, 3.0)
		"skillelinje":
			skille.call(0.0)
		"sperre_varsel":
			w.line(path, -0.12, y, 0.11, 9.0, 3.0)
			w.line(path, 0.12, y, 0.12)
		"varsel_sperre":
			w.line(path, -0.12, y, 0.12)
			w.line(path, 0.12, y, 0.11, 9.0, 3.0)
		"haitenner":
			skille.call(0.0, 0.0, to_cross - 2.0)
			skille.call(0.0, from_cross)
			var count: int = 6
			var step: float = (right - 0.3) / count
			for k: int in count:
				var x0: float = 0.15 + step * k + 0.05
				var x1: float = x0 + step - 0.1
				var tip := Vector2((x0 + x1) / 2.0, zc + 4.1 + 0.9)
				w.paint_poly(PackedVector2Array([Vector2(x0, zc + 4.1), Vector2(x1, zc + 4.1), tip]))
		"stopplinje":
			skille.call(0.0, 0.0, to_cross - 4.0)
			skille.call(0.0, from_cross)
			w.bar(0.1, zc + 4.2, right - 0.1, zc + 4.8)
			w.road_text("STOPP", right / 2.0, zc + 7.2, 0.9, Vector2(1.0, 0.0), 3.0)
		"sykkelfelt":
			if cross == "right":
				skille.call(0.0, 0.0, to_cross - 2.0)
				skille.call(0.0, from_cross)
				w.line(path, 3.2, World.WHITE, 0.2, 0.0, 0.0, 0.0, to_cross - 2.0, 0.3)
				w.line(path, 3.2, World.WHITE, 0.2, 1.0, 1.0, to_cross - 2.0, from_cross, 0.3)
				w.line(path, 3.2, World.WHITE, 0.2, 0.0, 0.0, from_cross, INF, 0.3)
			else:
				skille.call(0.0)
				w.line(path, 3.2, World.WHITE, 0.2, 0.0, 0.0, 0.0, INF, 0.3)
			for bz: float in [-7.0, -44.0, -80.0]:
				w.road_decal(BIKE_SVG, 3.95, bz, 1.05, 2.3)
		"kollektivfelt":
			skille.call(-1.75)
			w.line(path, 1.75, World.WHITE, 0.24, 0.0, 0.0, 0.0, INF, 0.3)
			for tz: float in [-13.0, -62.0]:
				w.road_text("KOLLEKTIVFELT", 3.5, tz, 1.5, Vector2(0.0, -1.0), 1.0)
		"sperreflate":
			var near: float = 70.0 + 6.0
			var far: float = 70.0 + 54.0
			w.line(path, 0.0, y, 0.13, 0.0, 0.0, 0.0, near)
			w.line(path, 0.0, y, 0.13, 0.0, 0.0, far)
			var hw: float = 1.7
			_seg(w, 0.0, -6.0, hw, -13.0, 0.13, y)
			_seg(w, 0.0, -6.0, -hw, -13.0, 0.13, y)
			_seg(w, hw, -13.0, hw, -47.0, 0.13, y)
			_seg(w, -hw, -13.0, -hw, -47.0, 0.13, y)
			_seg(w, hw, -47.0, 0.0, -54.0, 0.13, y)
			_seg(w, -hw, -47.0, 0.0, -54.0, 0.13, y)
			var z: float = -14.0
			while z > -46.0:
				_seg(w, -hw, z, hw, z - 2.2, 0.32, y)
				z -= 2.6
		"gangfelt":
			skille.call(0.0, 0.0, 70.0 + 11.5)
			skille.call(0.0, 70.0 + 18.5)
			var x: float = -3.25
			while x < 3.3:
				w.bar(x, -16.0, x + 0.5, -13.0)
				x += 1.0
			w.road_sign("gangfelt", right + 0.85, -12.3, 0.75, 2.0, 0.0, [], 0.14)
			w.road_sign("gangfelt", -left - 0.85, -16.6, 0.75, 2.0, PI, [], 0.14)


## Боковая дорога: осевая линия и край.
static func _side_lines(w: World, zc: float, cross: String, left: float, right: float) -> void:
	var y: Color = World.YELLOW
	var a := World.straight(right + 2.4, zc, 240.0, zc)
	w.line(a, 0.0, y, 0.11, 3.0, 9.0)
	if cross == "both":
		var b := World.straight(-left - 2.4, zc, -240.0, zc)
		w.line(b, 0.0, y, 0.11, 3.0, 9.0)


static func _actor(w: World, a: Dictionary, env: String) -> void:
	var x: float = a["x"]
	var z: float = a["z"]
	var yaw: float = a.get("yaw", 0.0)
	var node: Node3D
	match a["what"]:
		"car":
			var c: Array = a.get("color", [0.72, 0.72, 0.74])
			node = Car.make(Color(c[0], c[1], c[2]), a.get("kind", "sedan"))
		"tractor":
			node = Vehicles.tractor()
		"bus":
			node = Vehicles.bus(Color(0.7, 0.08, 0.06))
		"cyclist":
			node = Person.cyclist(Color(0.82, 0.3, 0.08), Color(0.1, 0.12, 0.2))
		"scooter":
			node = Person.scooter(Color(0.16, 0.3, 0.46), Color(0.14, 0.14, 0.16))
		_:
			node = Person.make(Color(0.74, 0.2, 0.12), Color(0.1, 0.13, 0.22))
	var base: float = a.get("base", 0.0)
	node.position = Vector3(x, base + w.h(z), z)
	node.rotation.y = yaw
	if w.elev.is_valid():
		node.rotation.x = atan((w.h(z - 1.0) - w.h(z + 1.0)) / 2.0)
	w.add_mover(node)


static func _dressing(w: World, env: String, cross: String, zc: float, left: float, right: float) -> void:
	var colors: Array = [Color(0.86, 0.84, 0.76), Color(0.56, 0.14, 0.1), Color(0.74, 0.6, 0.28), Color(0.42, 0.5, 0.48), Color(0.82, 0.8, 0.72), Color(0.6, 0.16, 0.12)]
	if env == "street":
		var built: int = 0
		for side: float in [1.0, -1.0]:
			var edge: float = (right if side > 0.0 else left)
			var z: float = 6.0
			while z > -190.0:
				z -= 14.0 + w.rng.randf() * 7.0
				if cross != "" and absf(z - zc) < 12.0 and (cross == "both" or side > 0.0):
					continue
				var floors: int = 1 + w.rng.randi() % 2
				var house: Node3D = House.make(11.0 + w.rng.randf() * 2.0, 8.0, 2.7 * floors, colors[built % colors.size()], Color(0.16, 0.16, 0.17), floors, 2.4)
				house.position = Vector3(side * (edge + 11.0 + w.rng.randf() * 2.0), 0.17, z)
				house.rotation.y = -side * PI / 2.0
				w.add_child(house)
				built += 1
				if w.rng.randf() < 0.7:
					w.plant_free("broad", side * (edge + 9.0 + w.rng.randf()), z + 7.0, 0.42 + w.rng.randf() * 0.2, 0.17)
			for k: int in 90:
				var bz: float = 4.0 - k * 1.5
				if cross != "" and absf(bz - zc) < 9.0 and (cross == "both" or side > 0.0):
					continue
				w.plant_free("bush", side * (edge + 3.2 + w.rng.randf() * 0.4), bz, 0.5, 0.17)
			w.tufts_rect(minf(side * (edge + 3.0), side * (edge + 9.0)), maxf(side * (edge + 3.0), side * (edge + 9.0)), -46.0, 8.0, 12000, 0.17)
			var lz: float = -17.0
			while lz > -150.0:
				if cross == "" or absf(lz - zc) > 9.0:
					w.lamp(side * (edge + 1.0), lz, -side)
				lz -= 30.0
		for k: int in 220:
			var a: float = w.rng.randf() * TAU
			var r: float = w.rng.randf_range(80.0, 240.0)
			var tx: float = cos(a) * r
			var tz: float = sin(a) * r - 40.0
			# Деревья не стоят на дороге и на её продолжении.
			if absf(tx) < maxf(left, right) + 14.0 or (cross != "" and absf(tz - zc) < 16.0):
				continue
			w.plant_free("pine" if w.rng.randf() < 0.75 else "broad", tx, tz, 0.9 + w.rng.randf() * 0.5, 0.17)
		return
	var half: float = maxf(left, right)
	for k: int in 1100:
		var z: float = w.rng.randf_range(-260.0, 60.0)
		var side: float = -1.0 if w.rng.randf() < 0.5 else 1.0
		var off: float = half + 11.0 + pow(w.rng.randf(), 1.5) * 95.0
		# Широкие кроны дальше от дороги, чтобы ветви не нависали над ней.
		var pine: bool = w.rng.randf() < 0.8 or off < half + 17.0
		w.plant_free("pine" if pine else "broad", side * off, z, 0.85 + w.rng.randf() * 0.55)
	for k: int in 170:
		var z: float = w.rng.randf_range(-120.0, 25.0)
		var side: float = -1.0 if w.rng.randf() < 0.5 else 1.0
		w.plant_free("bush", side * (half + w.rng.randf_range(5.5, 10.0)), z, 0.6 + w.rng.randf() * 0.7)
	var p := World.straight(0.0, 25.0, 0.0, -80.0, 3.0)
	w.tufts_along(p, half + 1.2, half + 10.0, 22000)
	w.tufts_along(p, -half - 10.0, -half - 1.2, 22000)
