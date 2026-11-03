class_name Scenes
extends RefCounted
## Сцены: что стоит на дороге и откуда смотрит ученик.

const RED := Color(0.5, 0.05, 0.06)
const SILVER := Color(0.62, 0.64, 0.66)
const WHITE_CAR := Color(0.82, 0.83, 0.82)
const BLACK_CAR := Color(0.03, 0.035, 0.04)
const GREEN_CAR := Color(0.06, 0.2, 0.14)


static var _specs: Dictionary = {}


static func specs() -> Dictionary:
	if _specs.is_empty():
		_specs = JSON.parse_string(FileAccess.get_file_as_string("res://specs.json"))
	return _specs


static func build(id: String, w: World) -> void:
	match id:
		"venstresving":
			_venstresving(w)
		"fareskilt":
			_fareskilt(w)
		"parkering":
			_parkering(w)
		"modeli":
			_modeli(w)
		"sykkel":
			_sykkel(w)
		_:
			var spec: Dictionary = Scenes.specs().get(id, {})
			if spec.is_empty():
				push_error("нет сцены " + id)
			elif spec["type"] == "junction":
				Junction.build(w, spec["scene"], id)
			else:
				RoadScene.build(w, spec, id)


static func _house(w: World, x: float, z: float, yaw: float, width: float, depth: float, height: float, color: Color, floors: int = 1, base: float = 0.17, pitch: float = 2.6, shop: bool = false, roof: Color = Color(0.16, 0.16, 0.17)) -> void:
	var h: Node3D = House.make(width, depth, height, color, roof, floors, pitch, shop)
	h.position = Vector3(x, base, z)
	h.rotation.y = yaw
	w.add_child(h)


## Поворот налево на перекрёстке: встречная машина и пешеход на переходе в улице слева.
static func _venstresving(w: World) -> void:
	w.setup_light(11.2, -0.4, 0.42)
	w.hills()
	w.ground()
	var hw: float = 3.5
	var pad := PackedVector2Array([Vector2(-260, -260), Vector2(260, -260), Vector2(260, 260), Vector2(-260, 260)])
	w.add_mesh(Mesher.prism(pad, -0.02, 0.0, w.asphalt(0.0), w.kerb()))
	for sx: float in [-1.0, 1.0]:
		for sz: float in [-1.0, 1.0]:
			w.lot(sx * hw, sz * hw, sx, sz, 256.0, 256.0, 6.5, 2.6)
	var along := World.straight(0, 240, 0, -240)
	w.line(along, 0.0, World.YELLOW, 0.11, 3.0, 9.0, 0.0, 228.5)
	w.line(along, 0.0, World.YELLOW, 0.11, 3.0, 9.0, 251.0)
	var across := World.straight(240, 0, -240, 0)
	w.line(across, 0.0, World.YELLOW, 0.11, 3.0, 9.0, 0.0, 228.5)
	w.line(across, 0.0, World.YELLOW, 0.11, 3.0, 9.0, 254.0)
	# Переход в улице слева.
	var z: float = -3.3
	while z < 3.3:
		w.bar(-9.6, z, -6.6, z + 0.5)
		z += 1.0
	w.road_sign("gangfelt", -6.4, -5.6, 0.8, 2.0, PI / 2.0, [], 0.14)
	w.road_sign("gangfelt", -10.2, 5.2, 0.8, 2.0, -PI / 2.0, [], 0.14)
	w.person(-8.1, -0.3, PI, Color(0.72, 0.2, 0.1), Color(0.1, 0.13, 0.22))
	w.car(RED, -1.75, -15.0, PI)
	w.car(SILVER, 1.75, -46.0, 0.0, "hatch")
	w.car(WHITE_CAR, -36.0, 1.75, PI / 2.0, "suv")
	# Дома и сады.
	_house(w, 21.0, 24.0, -PI / 2.0, 11.0, 8.0, 3.0, Color(0.8, 0.77, 0.68))
	_house(w, 21.0, -22.0, -PI / 2.0, 12.0, 8.5, 5.4, Color(0.55, 0.13, 0.1), 2)
	_house(w, -24.0, -21.0, PI / 2.0, 11.0, 8.0, 5.2, Color(0.86, 0.85, 0.8), 2)
	_house(w, -31.0, 27.0, PI / 2.0, 12.0, 8.0, 3.0, Color(0.74, 0.6, 0.28))
	_house(w, 23.0, -50.0, -PI / 2.0, 11.0, 8.0, 5.0, Color(0.82, 0.8, 0.72), 2)
	_house(w, -24.0, -52.0, PI / 2.0, 12.0, 8.0, 5.0, Color(0.42, 0.5, 0.48), 2)
	_house(w, 44.0, 8.5, PI, 12.0, 8.0, 5.0, Color(0.78, 0.74, 0.62), 2)
	_house(w, -52.0, -16.0, 0.0, 12.0, 8.0, 5.0, Color(0.6, 0.15, 0.12), 2)
	for p: Array in [[9.5, 13.0], [11.0, -9.0], [14.0, -36.0], [-11.0, -33.0], [-14.0, -11.0], [30.0, 12.0], [-42.0, 14.0], [31.0, -36.0], [-36.0, -38.0], [-22.0, 44.0], [20.0, 44.0]]:
		w.plant("broad", p[0], p[1], 0.62 + w.rng.randf() * 0.25, 0.17)
	for k: int in 26:
		w.plant("bush", 7.4 + w.rng.randf() * 0.6, -8.0 - k * 1.6, 0.8, 0.17)
		w.plant("bush", -7.4 - w.rng.randf() * 0.6, -8.0 - k * 1.6, 0.8, 0.17)
		w.plant("bush", 7.4 + w.rng.randf() * 0.6, 9.0 + k * 1.6, 0.8, 0.17)
	for k: int in 240:
		var a: float = w.rng.randf() * TAU
		var r: float = w.rng.randf_range(90.0, 260.0)
		w.plant("pine" if w.rng.randf() < 0.75 else "broad", cos(a) * r, sin(a) * r, 0.9 + w.rng.randf() * 0.5, 0.17)
	w.lamp(6.0, 20.0)
	w.lamp(6.0, -8.0)
	w.lamp(6.0, -38.0)
	w.lamp(-6.0, -24.0, 1.0)
	w.tufts_rect(6.2, 20.0, 5.0, 26.0, 16000, 0.17)
	w.tufts_rect(-24.0, -9.0, 8.0, 26.0, 12000, 0.17)
	w.tufts_rect(6.2, 20.0, -26.0, -5.0, 10000, 0.17)
	w.tufts_rect(-24.0, -6.2, -26.0, -5.0, 10000, 0.17)
	w.driver(0.75, 13.0, -11.0, -30.0)


## Загородная дорога: предупреждающий знак с табличкой, поворот уходит за лес.
static func _fareskilt(w: World) -> void:
	w.setup_light(15.5, 0.5, 0.5)
	w.hills()
	w.ground()
	var path := World.spline([[0, 110], [0, 30], [0, -30], [0, -62], [4, -92], [16, -122], [37, -150], [66, -172], [102, -188], [170, -205]], 1.5)
	var half: float = 3.25
	w.road(path, half, 0.9, 0.13)
	w.line(path, 3.0, World.WHITE, 0.12, 0.0, 0.0, 0.0, INF, 0.35)
	w.line(path, -3.0, World.WHITE, 0.12, 0.0, 0.0, 0.0, INF, 0.35)
	w.line(path, 0.0, World.YELLOW, 0.11, 3.0, 9.0, 0.0, 130.0)
	w.line(path, 0.0, World.YELLOW, 0.11, 9.0, 3.0, 130.0)
	w.posts(path, 4.5, 25.0, 6.0)
	w.posts(path, -4.5, 25.0, 18.0)
	w.guardrail(path, -4.2, 172.0, 245.0)
	w.road_sign("fare_sving_h", 4.9, -14.0, 1.05, 1.75, 0.03, [{"text": "50 m"}])
	w.car(WHITE_CAR, -1.65, -40.0, PI, "suv")
	# Лес по обе стороны, ближе к дороге берёзы и кусты.
	var total: float = World.length_of(path)
	for k: int in 1500:
		var p: Array = World.at(path, w.rng.randf() * total)
		var side: float = -1.0 if w.rng.randf() < 0.5 else 1.0
		var off: float = 10.0 + pow(w.rng.randf(), 1.6) * 90.0
		var q: Vector2 = p[0] + p[1] * side * off
		if _too_close(path, q, 9.0):
			continue
		var pine: bool = off > 15.0 or w.rng.randf() < 0.3
		w.plant("pine" if pine and w.rng.randf() < 0.85 else "broad", q.x, q.y, 0.85 + w.rng.randf() * 0.55)
	for k: int in 260:
		var p: Array = World.at(path, w.rng.randf() * total)
		var q: Vector2 = p[0] + p[1] * (-1.0 if w.rng.randf() < 0.5 else 1.0) * w.rng.randf_range(6.0, 11.0)
		if not _too_close(path, q, 5.5):
			w.plant("bush", q.x, q.y, 0.7 + w.rng.randf() * 0.8)
	for k: int in 24:
		var p: Array = World.at(path, w.rng.randf() * total)
		var q: Vector2 = p[0] + p[1] * (-1.0 if w.rng.randf() < 0.5 else 1.0) * w.rng.randf_range(5.5, 9.0)
		w.plant("rock", q.x, q.y, 0.3 + w.rng.randf() * 0.5)
	w.tufts_along(path, 4.1, 11.0, 26000, 85.0)
	w.tufts_along(path, -11.0, -4.1, 26000, 85.0)
	w.driver(1.3, 3.0, 2.0, -60.0)


static func _too_close(path: PackedVector2Array, q: Vector2, limit: float) -> bool:
	for i: int in range(0, path.size(), 4):
		if path[i].distance_squared_to(q) < limit * limit:
			return true
	return false


## Городская улица: припаркованные машины, запрет стоянки с табличкой времени.
static func _parkering(w: World) -> void:
	w.setup_light(13.0, 0.3, 0.4)
	w.hills()
	w.ground()
	var hw: float = 4.6
	var pad := PackedVector2Array([Vector2(-120, -300), Vector2(120, -300), Vector2(120, 120), Vector2(-120, 120)])
	w.add_mesh(Mesher.prism(pad, -0.02, 0.0, w.asphalt(0.08), w.kerb()))
	w.lot(hw, 110.0, 1.0, -1.0, 110.0, 400.0, 0.0, 2.6, false)
	w.lot(-hw, 110.0, -1.0, -1.0, 110.0, 400.0, 0.0, 2.6, false)
	w.road_sign("parkering_forbudt", 5.15, -13.0, 0.85, 2.0, 0.0, [{"text": "08–17"}, {"text": "(08–15)"}, {"text": "10–14", "red": true}], 0.14)
	w.car(SILVER, 3.45, -4.5, 0.0, "hatch")
	w.car(RED, 3.45, -21.0, 0.0)
	w.car(BLACK_CAR, 3.45, -27.5, 0.0, "suv")
	w.car(WHITE_CAR, -3.45, -10.0, PI, "suv")
	w.car(GREEN_CAR, -3.45, -17.0, PI, "hatch")
	w.car(SILVER, -3.45, -36.0, PI)
	w.car(RED, -1.3, -62.0, PI)
	w.person(6.3, -17.0, 0.0, Color(0.16, 0.3, 0.46), Color(0.14, 0.14, 0.16), 0.14)
	w.person(-6.2, -7.5, PI, Color(0.74, 0.55, 0.16), Color(0.1, 0.12, 0.2), 0.14, 1.68)
	# Дома вдоль улицы стоят сплошным рядом.
	var colors: Array = [Color(0.86, 0.82, 0.7), Color(0.55, 0.18, 0.13), Color(0.8, 0.8, 0.77), Color(0.72, 0.62, 0.36), Color(0.46, 0.5, 0.5), Color(0.82, 0.72, 0.6)]
	var z: float = 34.0
	var k: int = 0
	while z > -220.0:
		var width: float = 13.0 + float(k % 3) * 2.0
		var floors: int = 3 + k % 2
		var high: float = 3.1 * floors
		_house(w, 13.3 + 4.5, z - width / 2.0, -PI / 2.0, width - 0.05, 9.0, high, colors[k % colors.size()], floors, 0.14, 2.2 if k % 3 != 1 else 0.0, true)
		_house(w, -13.3 - 4.5, z - width / 2.0 - 2.0, PI / 2.0, width - 0.05, 9.0, high, colors[(k + 3) % colors.size()], floors, 0.14, 2.2 if k % 3 != 0 else 0.0, true)
		z -= width
		k += 1
	for tz: float in [6.0, -35.0, -60.0, -90.0]:
		w.plant("broad", 6.9, tz, 0.5, 0.14)
		w.plant("broad", -6.9, tz - 12.0, 0.5, 0.14)
	w.lamp(5.5, 2.0)
	w.lamp(5.5, -32.0)
	w.lamp(5.5, -66.0)
	w.lamp(-5.5, -18.0, 1.0)
	w.lamp(-5.5, -50.0, 1.0)
	w.driver(1.05, 9.0, 0.9, -50.0)


## Проверка моделей крупным планом.
static func _modeli(w: World) -> void:
	w.setup_light(11.0, 0.9, 0.4)
	w.hills()
	w.ground()
	var pad := PackedVector2Array([Vector2(-60, -80), Vector2(60, -80), Vector2(60, 40), Vector2(-60, 40)])
	w.add_mesh(Mesher.prism(pad, -0.02, 0.0, w.asphalt(0.0), w.kerb()))
	var b: Node3D = Vehicles.bus(Color(0.72, 0.08, 0.08))
	b.position = Vector3(-1.5, 0.0, -2.5)
	b.rotation.y = -2.25
	w.add_child(b)
	w.car(SILVER, 6.2, 1.8, 2.5, "suv")
	w.camera = Camera3D.new()
	w.camera.fov = 44.0
	w.camera.far = 9000.0
	w.camera.position = Vector3(-1.0, 1.8, 11.5)
	w.add_child(w.camera)
	w.camera.look_at(Vector3(0.5, 1.4, -2.0), Vector3.UP)
	w.camera.current = true


## Проверка велосипедиста крупным планом.
static func _sykkel(w: World) -> void:
	w.setup_light(11.0, 1.6, 0.4)
	w.hills()
	w.ground()
	var pad := PackedVector2Array([Vector2(-60, -80), Vector2(60, -80), Vector2(60, 40), Vector2(-60, 40)])
	w.add_mesh(Mesher.prism(pad, -0.02, 0.0, w.asphalt(0.0), w.kerb()))
	var a: Node3D = Person.cyclist(Color(0.75, 0.2, 0.1), Color(0.1, 0.12, 0.2))
	a.rotation.y = -PI / 2.0 + 0.3
	w.add_child(a)
	var b: Node3D = Person.cyclist(Color(0.12, 0.35, 0.5), Color(0.2, 0.2, 0.22))
	b.position = Vector3(-1.9, 0.0, -1.5)
	b.rotation.y = PI - 0.5
	w.add_child(b)
	var c: Node3D = Person.cyclist(Color(0.8, 0.6, 0.1), Color(0.08, 0.1, 0.16))
	c.position = Vector3(1.9, 0.0, -1.2)
	c.rotation.y = -0.45
	w.add_child(c)
	w.camera = Camera3D.new()
	w.camera.fov = 34.0
	w.camera.far = 9000.0
	w.camera.position = Vector3(0.2, 1.3, 4.4)
	w.add_child(w.camera)
	w.camera.look_at(Vector3(0.0, 0.92, -0.5), Vector3.UP)
	w.camera.current = true
