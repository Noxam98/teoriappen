class_name Exits
extends RefCounted
## Выезд на дорогу не через перекрёсток: со двора, парковки, заправки, из гатетуна. Дорога идёт поперёк кадра,
## тротуар проходит сплошной полосой поперёк выезда, поэтому выезжающий пересекает его.

const HW: float = 3.5
const WALK: float = 2.6


static func build(w: World, s: Dictionary, id: String) -> void:
	w.rng.seed = hash(id)
	w.setup_light(w.rng.randf_range(10.5, 14.5), 0.0, w.rng.randf_range(0.34, 0.5))
	w.hills()
	w.ground()
	var style: String = s.get("style", "drive")
	var gap: float = {"drive": 3.0, "parking": 15.0, "station": 12.0, "gatetun": 4.4}[style]
	var pad := PackedVector2Array([Vector2(-300, -300), Vector2(300, -300), Vector2(300, 300), Vector2(-300, 300)])
	w.add_mesh(Mesher.prism(pad, -0.02, 0.0, w.asphalt(0.0), w.kerb()))
	w.lot(-280.0, -HW, 1.0, -1.0, 560.0, 280.0, 0.0, WALK)
	w.lot(gap, HW, 1.0, 1.0, 280.0 - gap, 280.0, 0.0, WALK)
	w.lot(-gap, HW, -1.0, 1.0, 280.0 - gap, 280.0, 0.0, WALK)
	var road := World.straight(-280.0, 0.0, 280.0, 0.0, 6.0)
	w.keep_clear(road, HW)
	w.line(road, 0.0, World.YELLOW, 0.1, 1.0, 3.0)
	# Тротуар поперёк выезда с пониженным бордюром.
	var across := PackedVector2Array([Vector2(-gap, HW), Vector2(gap, HW), Vector2(gap, HW + WALK), Vector2(-gap, HW + WALK)])
	w.add_mesh(Mesher.prism(across, -0.02, 0.07, w.pavement(), w.kerb()))
	var own_x: float = s.get("own_x", 1.5)
	var own_z: float = s.get("own_z", HW + WALK + 3.2)
	var own_yaw: float = s.get("own_yaw", 0.0)
	w.keep_clear(World.straight(own_x, HW, own_x, 70.0, 6.0), 3.0)
	match style:
		"parking":
			_parking(w, gap, own_x)
		"station":
			_station(w)
		"gatetun":
			var yard := PackedVector2Array([Vector2(-gap, HW + WALK), Vector2(gap, HW + WALK), Vector2(gap, 90.0), Vector2(-gap, 90.0)])
			w.add_mesh(Mesher.prism(yard, -0.01, 0.02, w.surface(Color(0.46, 0.4, 0.34), Color(0.62, 0.55, 0.47), {"slab_size": 0.5, "fine_scale": 1.3}), w.kerb()))
		_:
			for side: float in [-1.0, 1.0]:
				for k: int in 26:
					w.plant_free("bush", side * (gap + 3.2), HW + WALK + 1.0 + k * 1.3, 0.5, 0.17)
	var own: Node3D = w.car(World.ME_COLOR, own_x, own_z, own_yaw, "hatch")
	w.badge(Vector3(own_x, 0.82, own_z + 0.9), "DU", Junction.ME_BADGE)
	if s.has("own_blink"):
		Vehicles.blink(own, 1.0 if s["own_blink"] == "right" else -1.0, -1.95, 2.2, 0.8, 0.72, 0.9, true)
	w.chase(Vector3(own_x, 0.0, own_z), Vector2(0.0, -1.0), 10.5, 4.7, 18.0, 0.4, 52.0)
	for a: Dictionary in s.get("actors", []):
		RoadScene._actor(w, a, "street")
	for sign: Dictionary in s.get("signs", []):
		w.road_sign(sign["id"], sign["x"], sign["z"], sign.get("w", 0.85), 2.0, sign.get("yaw", 0.0), [], 0.14)
	_dress(w, gap, style)


static func _parking(w: World, gap: float, own_x: float) -> void:
	# Разметка мест и ряд машин по обе стороны от проезда.
	var colors: Array = [Color(0.72, 0.72, 0.74), Color(0.5, 0.05, 0.06), Color(0.08, 0.09, 0.11), Color(0.06, 0.24, 0.16), Color(0.82, 0.82, 0.8)]
	var kinds: Array = ["sedan", "hatch", "suv"]
	var n: int = 0
	var x: float = -gap + 1.0
	while x < gap - 1.0:
		w.paint_poly(PackedVector2Array([Vector2(x, 11.0), Vector2(x + 0.1, 11.0), Vector2(x + 0.1, 16.2), Vector2(x, 16.2)]))
		if absf(x + 1.3 - own_x) > 3.4 and n % 3 != 1:
			w.car(colors[n % colors.size()], x + 1.3, 13.6, PI, kinds[n % kinds.size()])
		x += 2.6
		n += 1
	w.road_sign("parkering", gap - 1.6, HW + WALK + 1.0, 0.72, 2.0, 0.0, [], 0.0)


static func _station(w: World) -> void:
	# Навес с колонками слева от выезда, стойка с ценами справа. Без марки.
	var roof: StandardMaterial3D = Car.mat(Color(0.86, 0.86, 0.84), 0.5)
	var band: StandardMaterial3D = Car.mat(Color(0.05, 0.36, 0.5), 0.4)
	var steel: StandardMaterial3D = Car.mat(Color(0.55, 0.57, 0.6), 0.4, 0.5)
	var c := Vector3(-7.8, 0.0, 12.2)
	Car.box(w, Vector3(9.0, 0.4, 8.0), c + Vector3(0.0, 5.0, 0.0), roof)
	Car.box(w, Vector3(9.1, 0.28, 8.1), c + Vector3(0.0, 4.72, 0.0), band)
	for dx: float in [-3.4, 3.4]:
		for dz: float in [-2.6, 2.6]:
			Car.box(w, Vector3(0.28, 4.7, 0.28), c + Vector3(dx, 2.35, dz), steel)
	for dz: float in [-2.2, 2.2]:
		Car.box(w, Vector3(0.75, 1.75, 0.42), c + Vector3(0.0, 0.87, dz), Car.mat(Color(0.2, 0.24, 0.28), 0.4))
		Car.box(w, Vector3(0.55, 0.32, 0.03), c + Vector3(0.0, 1.45, dz + 0.22), Vehicles._lamp(Color(0.4, 0.8, 0.9), 0.7))
	Car.box(w, Vector3(1.5, 6.2, 0.4), Vector3(9.4, 3.1, HW + WALK + 2.4), band)
	Vehicles._text(w, "DRIVSTOFF", Vector3(9.4, 5.4, HW + WALK + 2.62), 0.0, 0.17, Color(0.96, 0.96, 0.96))
	Car.box(w, Vector3(1.26, 1.5, 0.03), Vector3(9.4, 3.2, HW + WALK + 2.62), Car.mat(Color(0.04, 0.05, 0.06), 0.4))


static func _dress(w: World, gap: float, style: String) -> void:
	var colors: Array = [Color(0.86, 0.84, 0.76), Color(0.56, 0.14, 0.1), Color(0.74, 0.6, 0.28), Color(0.42, 0.5, 0.48), Color(0.82, 0.8, 0.72)]
	var built: int = 0
	var x: float = -70.0
	while x < 70.0:
		var floors: int = 1 + w.rng.randi() % 2
		var h: Node3D = House.make(11.0 + w.rng.randf() * 2.0, 8.0, 2.7 * floors, colors[built % colors.size()], Color(0.16, 0.16, 0.17), floors, 2.4)
		h.position = Vector3(x, 0.17, -HW - WALK - 11.0)
		h.rotation.y = 0.0
		w.add_child(h)
		built += 1
		x += 17.0 + w.rng.randf() * 3.0
	# Ближние участки: дома сбоку от выезда, у гатетуна и двора они стоят совсем рядом.
	for side: float in [-1.0, 1.0]:
		var offset: float = gap + (9.0 if style == "gatetun" or style == "drive" else 11.0)
		if style != "station" or side > 0.0:
			var floors: int = 1 + w.rng.randi() % 2
			var h: Node3D = House.make(11.0, 8.0, 2.7 * floors, colors[built % colors.size()], Color(0.16, 0.16, 0.17), floors, 2.4)
			h.position = Vector3(side * offset, 0.17, HW + WALK + 7.0)
			h.rotation.y = -side * PI / 2.0
			w.add_child(h)
			built += 1
		w.tufts_rect(minf(side * (gap + 3.0), side * 60.0), maxf(side * (gap + 3.0), side * 60.0), HW + 3.0, 34.0, 9000, 0.17)
	w.tufts_rect(-70.0, 70.0, -HW - 22.0, -HW - 3.0, 12000, 0.17)
	for k: int in 60:
		w.plant_free("bush", -70.0 + k * 2.4, -HW - WALK - 1.2, 0.5, 0.17)
	var lx: float = -48.0
	while lx < 60.0:
		w.lamp(lx, -HW - 1.0, 1.0)
		lx += 30.0
	for k: int in 240:
		var a: float = w.rng.randf() * TAU
		var r: float = w.rng.randf_range(70.0, 240.0)
		w.plant_free("pine" if w.rng.randf() < 0.75 else "broad", cos(a) * r, sin(a) * r - 40.0, 0.9 + w.rng.randf() * 0.5, 0.17)
