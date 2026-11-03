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
	var weather: String = s.get("weather", "")
	w.rainy = weather == "rain"
	w.fog_scale = s.get("fog", 4.5 if weather == "rain" else (3.5 if weather == "snow" else 1.0))
	w.winter = s.get("winter", false)
	var in_tunnel: bool = s.get("env", "") == "tunnel" and not s.has("portal")
	w.tunnel_scene = in_tunnel
	if s.get("night", false):
		w.hour_override = 23.2
		w.night_scene = true
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
	left = s.get("left", left)
	right = s.get("right", right)
	own_x = s.get("own_x", own_x)
	var env: String = s.get("env", "rural")
	var zc: float = s.get("zc", -25.0)
	var cross: String = s.get("cross", "")
	if s.get("hill", false):
		if s["hill"] is String:
			# Спуск: своя машина наверху, дорога уходит вниз.
			# Вся сцена поднята: ниже плоской земли дорога бы ушла под неё.
			w.elev = func(z: float) -> float:
				return (1.0 - smoothstep(3.0, 70.0, -z)) * 8.5
		else:
			w.elev = func(z: float) -> float:
				var up: float = smoothstep(4.0, 60.0, -z) * 7.5
				return up - smoothstep(62.0, 130.0, -z) * 7.5
		var ground_path := World.straight(0.0, 80.0, 0.0, -180.0, 2.0)
		w.add_mesh(Mesher.strip(ground_path, -320.0, 320.0, -0.03, w.grass_ground(), w.elev))
	var whole := World.straight(0.0, 70.0, 0.0, -260.0, 3.0)
	var curved: bool = s.has("curve")
	if curved:
		whole = _curve_path(s["curve"])
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
		var edge: float = maxf(left, right) - 0.25
		if s.has("taper"):
			_taper_road(w, s, whole)
		else:
			w.road(whole, maxf(left, right), 0.9, 0.12)
			# Дорога уже 6 м: одна полоса, без осевой, края штриховые 3 и 3 м (5.3.1).
			var narrow: bool = left + right < 6.0
			if s.has("bay"):
				# Вдоль кармана край штриховой, его рисует _bus_bay.
				w.line(whole, edge, World.WHITE, 0.12, 0.0, 0.0, 0.0, 70.0 - float(s["bay"][0]) - 8.0, 0.35)
				w.line(whole, edge, World.WHITE, 0.12, 0.0, 0.0, 70.0 - float(s["bay"][1]) + 8.0, INF, 0.35)
			else:
				w.line(whole, edge, World.WHITE, 0.12, 3.0 if narrow else 0.0, 3.0 if narrow else 0.0, 0.0, INF, 0.35)
			w.line(whole, -edge, World.WHITE, 0.12, 3.0 if narrow else 0.0, 3.0 if narrow else 0.0, 0.0, INF, 0.35)
		if env != "tunnel" and not s.has("taper") and not s.has("bay"):
			w.posts(whole, edge + 1.5, 25.0, 12.0)
			w.posts(whole, -edge - 1.5, 25.0, 24.0)
	var road_mid: float = (right - left) / 2.0
	if curved:
		w.keep_clear(whole, (left + right) / 2.0)
	elif s.get("divided", false):
		# Две отдельные проезжие части: отбойник между ними стоит не на дороге.
		w.keep_clear(World.straight(right / 2.0, 70.0, right / 2.0, -260.0, 3.0), right / 2.0)
		w.keep_clear(World.straight(-7.0, 70.0, -7.0, -260.0, 3.0), 3.5)
	else:
		w.keep_clear(World.straight(road_mid, 70.0, road_mid, -260.0, 3.0), (left + right) / 2.0)
	if s.has("path_right"):
		# Пешеходно-велосипедная дорожка примыкает справа.
		var pz: float = s["path_right"]
		var way := World.straight(right, pz, 70.0, pz, 4.0)
		w.add_mesh(Mesher.strip(way, -1.4, 1.4, -0.008, w.asphalt(0.0)))
		w.keep_clear(way, 1.6)
		w.road_sign("gang_sykkelveg", right + 3.0, pz - 2.4, 0.7, 2.0, 0.0)
	if s.has("bay"):
		_bus_bay(w, s["bay"], right)
	if s.has("kantstopp"):
		# Остановка у края полосы: штрих 2 и 2 м вдоль неё (N302:2025, 9.2).
		var st: Array = s["kantstopp"]
		w.line(World.straight(right - 0.25, st[0], right - 0.25, st[1], 1.0), 0.0, World.WHITE, 0.1, 2.0, 2.0)
	if s.has("hump"):
		_hump(w, s["hump"], left, right)
	if s.has("rail"):
		w.rails(World.straight(-280.0, s["rail"], 280.0, s["rail"], 6.0), 0.0)
		_closed(w, float(s.get("bar_z", s["rail"])) - 11.0, s.get("rail_bars", true))
	if s.has("tunnel_exit"):
		# Дневной свет в конце туннеля: белая стенка, которую свод обрезает по дуге.
		# Это свет, а не препятствие, поэтому проверка сцены его не считает.
		var daylight := Node3D.new()
		Car.box(daylight, Vector3(14.0, 8.0, 0.1), Vector3(0.0, 4.0, s["tunnel_exit"]), Vehicles._lamp(Color(0.95, 0.97, 1.0), 2.4))
		Vehicles._beacon(daylight, Vector3(0.0, 3.0, s["tunnel_exit"] + 2.0), 15.0, Vehicles._flare(Color(0.92, 0.95, 1.0), true), 0.75)
		w.add_mover(daylight)
	if s.has("plate"):
		var pl: Array = s["plate"]
		Car.box(w, Vector3(1.9, 0.56, 0.06), Vector3(pl[1], 2.5, pl[2]), Car.mat(Color(0.04, 0.2, 0.55), 0.5))
		Car.box(w, Vector3(0.08, 2.5, 0.08), Vector3(pl[1], 1.25, pl[2] - 0.05), Car.mat(Color(0.5, 0.52, 0.54), 0.4, 0.6))
		Vehicles._text(w, pl[0], Vector3(pl[1], 2.5, pl[2] + 0.04), 0.0, 0.3, Color(0.96, 0.96, 0.96))
	if cross != "":
		w.keep_clear(World.straight(0.0, zc, 240.0, zc, 2.0), 3.5)
	if cross == "both":
		w.keep_clear(World.straight(0.0, zc, -240.0, zc, 2.0), 3.5)
	if w.winter:
		_snow_road(w, whole, maxf(left, right), env != "street" and not curved, curved)
	if s.get("env", "") == "tunnel":
		_tunnel(w, s.get("portal", 40.0), s.has("portal"), s.get("portal_style", "collar"), s.has("niche"))
		if s.get("closed", false):
			_closed(w, s["portal"])
	_marking(w, kind, s, whole, zc, left, right, cross)
	_lanes(w, kind, s, whole, zc, cross)
	if cross != "":
		_side_lines(w, zc, cross, left, right, kind == "haitenner" or kind == "stopplinje" or s.get("yield_here", false))
		if s.get("stop_line", false):
			# При светофоре стоп-линия обязательна, главный сигнал на её продолжении (N302:2025, 7.5; N303:2026).
			w.bar(0.1, zc + 5.7, right - 0.1, zc + 6.2)
	if not in_tunnel:
		_dressing(w, env, cross, zc, left, right)
	for sign: Dictionary in s.get("signs", []):
		var under: Array = sign.get("under", [])
		w.road_sign(sign["id"], sign["x"], sign["z"], sign.get("w", 0.85), sign.get("bottom", 1.95), sign.get("yaw", 0.0), under, 0.14 if env == "street" else 0.0)

	# Участники движения.
	for a: Dictionary in s.get("actors", []):
		_actor(w, a, env)
	var queue: int = s.get("queue", 0)
	var colors: Array = [Color(0.72, 0.72, 0.74), Color(0.5, 0.05, 0.06), Color(0.04, 0.05, 0.06), Color(0.06, 0.24, 0.16), Color(0.82, 0.82, 0.8)]
	var kinds: Array = ["sedan", "hatch", "suv"]
	for k: int in queue:
		w.car(colors[k % colors.size()], own_x, -8.0 - k * 6.4, 0.0, kinds[k % kinds.size()])
	var own: Node3D = w.driver(own_x, 0.0, own_x, -60.0)
	if s.has("own_yaw"):
		own.rotation.y = s["own_yaw"]
	if s.has("camera"):
		# Камера дальше и выше, чтобы в кадр вошло то, что едет за своей машиной.
		var cam: Array = s["camera"]
		w.camera.free()
		w.chase(own.position, Vector2(0.0, -1.0), cam[0], cam[1], cam[2], 0.3, cam[3])
	if s.get("own_fog", false):
		Vehicles.fog_lamp(own)
	if s.has("own_trailer"):
		Vehicles.trailer(own, Color(0.5, 0.52, 0.54), str(s["own_trailer"]) == "load")
	if s.get("own_door", false):
		Vehicles.open_door(own, World.ME_COLOR)
	if s.has("arrow_own"):
		var pts := PackedVector2Array()
		for p: Array in s["arrow_own"]:
			pts.push_back(Vector2(p[0], p[1]))
		w.arrow(Junction._even(pts), Junction.ME_BADGE)
	w.badge(Vector3(own_x, 0.82, 0.9), "DU", Junction.ME_BADGE)
	if s.get("night", false):
		Vehicles.lights(own, s.get("beam", "low"), false, 0.3)
	elif in_tunnel:
		# В туннеле светло от светильников: пятно от фар на своде только мешает, видны задние огни.
		Vehicles.lights(own, "park", false, 0.3)
	if w.rainy:
		Vehicles.spray(own)
	if weather != "":
		w.precipitation(weather)
	if s.get("own_hazard", false):
		for side: float in [-1.0, 1.0]:
			Vehicles.blink(own, side, -1.95, 2.2, 0.8, 0.72, 0.9, true)
	if s.get("own_snow", false):
		var snow: StandardMaterial3D = Car.mat(Color(0.93, 0.94, 0.97), 0.85)
		for part: Array in [[Vector3(0, 1.5, 0.12), Vector3(0.62, 0.075, 0.95)], [Vector3(0, 1.0, -1.45), Vector3(0.7, 0.06, 0.6)]]:
			var cover := MeshInstance3D.new()
			cover.mesh = Mesher.pillow(part[0], part[1], snow)
			own.add_child(cover)
	if s.has("own_blink"):
		Vehicles.blink(own, 1.0 if s["own_blink"] == "right" else -1.0, -1.95, 2.2, 0.8, 0.72, 0.9, true)
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


## Вторая полоса в нашу сторону: белая линия между полосами. lanes: skille короткие штрихи, varsel длинные.
## Стрелка на полосе: lane_arrow [x, z] поворачивает влево, рисуется перед перекрёстком.
## Зимняя дорога: покрытие считает шейдер snow_road, по краям снежные валы.
const TUNNEL: Shader = preload("res://shaders/tunnel.gdshader")


static func _snow_road(w: World, path: PackedVector2Array, half: float, banks: bool, plain: bool = false) -> void:
	var white: StandardMaterial3D = Car.mat(Color(0.86, 0.88, 0.92), 0.9)
	var surface := ShaderMaterial.new()
	surface.shader = preload("res://shaders/snow_road.gdshader")
	surface.set_shader_parameter("noise", World.NOISE)
	surface.set_shader_parameter("plain", plain)
	w.add_mesh(Mesher.strip(path, -half - 0.2, half + 0.2, 0.02, surface, w.elev))
	if not banks:
		return
	var r := RandomNumberGenerator.new()
	r.seed = 11
	for side: float in [-1.0, 1.0]:
		var rings: Array = []
		var z: float = 40.0
		while z > -220.0:
			var top: float = r.randf_range(0.55, 1.05)
			var y: float = w.h(z)
			var ring := PackedVector3Array()
			for j: int in 9:
				var t: float = PI * j / 8.0
				var wobble: float = sin(z * 0.37 + side) * 0.28 + sin(z * 0.11) * 0.2
				ring.push_back(Vector3(side * (half + 2.4 + wobble + cos(t) * 1.6), y + sin(t) * top - 0.05, z))
			rings.push_back(ring)
			z -= 2.0
		w.add_mesh(Mesher.loft(rings, white), true)


## Туннель от z_from вглубь. portal: снаружи видна портальная стена в склоне, иначе камера внутри.
static func _tunnel(w: World, z_from: float, portal: bool, style: String = "collar", niche: bool = false) -> void:
	# Профиль T10,5 (N500:2024): ширина 10,5 м, свободная высота от 4,6 м.
	var hw: float = 5.25
	var deep := func(z: float) -> float:
		# Аварийный карман справа: свод там расходится наружу.
		if not niche:
			return 0.0
		return 3.0 * smoothstep(-20.0, -26.0, z) * smoothstep(-52.0, -46.0, z)
	var wall: float = 3.4
	var top: float = 6.3
	var rock := ShaderMaterial.new()
	rock.shader = TUNNEL
	rock.set_shader_parameter("noise", World.NOISE)
	if portal:
		rock.set_shader_parameter("mouth_z", z_from + 1.0)
	var rings: Array = []
	var z: float = z_from
	while z > -520.0:
		var extra: float = deep.call(z)
		var ring := PackedVector3Array([Vector3(hw + extra, -0.05, z)])
		for k: int in 17:
			var t: float = PI * k / 16.0
			var cx: float = cos(t)
			ring.push_back(Vector3(hw * cx + maxf(cx, 0.0) * extra, wall + (top - wall) * sin(t), z))
		ring.push_back(Vector3(-hw, -0.05, z))
		rings.push_back(ring)
		z -= 2.0 if niche and z < -14.0 and z > -60.0 else 10.0
	w.add_mesh(Mesher.loft(rings, rock, false), true)
	# Пол вместо травы и гравия: внутри туннеля их быть не должно.
	var floor_path := World.straight(0.0, z_from, 0.0, -520.0, 10.0)
	w._strips.push_back([floor_path, hw + 0.6])
	w.add_mesh(Mesher.strip(floor_path, -hw, hw, -0.006, Car.mat(Color(0.2, 0.2, 0.21), 0.9)))
	if niche:
		var bay := PackedVector2Array([Vector2(hw - 0.5, -20.0), Vector2(hw + 3.0, -26.0), Vector2(hw + 3.0, -46.0), Vector2(hw - 0.5, -52.0)])
		var bay_m: StandardMaterial3D = Car.mat(Color(0.2, 0.2, 0.21), 0.9)
		w.add_mesh(Mesher.prism(bay, -0.02, 0.0, bay_m, bay_m))
		# Знак 555 прямо перед карманом, под ним символы 605 и 606 (N300:2026, 6.4.36).
		w.road_sign("nodtelefon", hw - 0.55, -18.0, 0.34, 2.0, 0.0)
		w.road_sign("brannslokker", hw - 0.17, -18.0, 0.34, 2.0, 0.0)
		w.road_sign("havarilomme", hw - 0.36, -18.0, 0.62, 2.42, 0.0)
	# Светлые панели на стенах с тёмными швами.
	var panel := ShaderMaterial.new()
	panel.shader = TUNNEL
	panel.set_shader_parameter("noise", World.NOISE)
	panel.set_shader_parameter("panels", true)
	if portal:
		panel.set_shader_parameter("mouth_z", z_from + 1.0)
		# Дорога внутри тоже уходит в темноту, поверх неё тёмная полоса.
		var dark_floor := World.straight(0.0, z_from - 1.0, 0.0, -520.0, 10.0)
		w.add_mesh(Mesher.strip(dark_floor, -5.5, 5.5, 0.03, rock))
	var lamp: StandardMaterial3D = Vehicles._lamp(Color(1.0, 0.95, 0.85), 3.0)
	var tray: StandardMaterial3D = Car.mat(Color(0.1, 0.1, 0.11), 0.6, 0.4)
	var steel: StandardMaterial3D = Car.mat(Color(0.42, 0.44, 0.46), 0.45, 0.6)
	var length: float = z_from + 520.0
	var middle: float = (z_from - 520.0) / 2.0
	for side: float in [-1.0, 1.0]:
		var wall_x: float = hw - 0.1
		if niche and side > 0.0:
			w.add_mesh(Mesher.prism(PackedVector2Array([Vector2(wall_x, z_from), Vector2(wall_x + 0.06, z_from), Vector2(wall_x + 0.06, -20.0), Vector2(wall_x, -20.0)]), 0.0, 2.7, panel, panel))
			w.add_mesh(Mesher.prism(PackedVector2Array([Vector2(wall_x, -52.0), Vector2(wall_x + 0.06, -52.0), Vector2(wall_x + 0.06, -520.0), Vector2(wall_x, -520.0)]), 0.0, 2.7, panel, panel))
			w.add_mesh(Mesher.prism(PackedVector2Array([Vector2(hw + 2.9, -26.0), Vector2(hw + 2.96, -26.0), Vector2(hw + 2.96, -46.0), Vector2(hw + 2.9, -46.0)]), 0.0, 2.7, panel, panel))
		else:
			w.add_mesh(Mesher.prism(PackedVector2Array([Vector2(side * wall_x, z_from), Vector2(side * (wall_x + 0.06), z_from), Vector2(side * (wall_x + 0.06), -520.0), Vector2(side * wall_x, -520.0)]), 0.0, 2.7, panel, panel))
		# Верхняя кромка панелей и кабельный лоток над ней.
		Car.box(w, Vector3(0.08, 0.06, length), Vector3(side * (hw - 0.13), 2.72, middle), steel)
		Car.box(w, Vector3(0.16, 0.05, length), Vector3(side * (hw - 0.2), 3.25, middle), tray)
		# Светоотражатели вдоль стены.
		var post_z: float = z_from - 7.0
		while post_z > -180.0:
			Car.box(w, Vector3(0.02, 0.1, 0.05), Vector3(side * (hw - 0.12), 1.02, post_z), Vehicles._lamp(Color(0.95, 0.95, 0.9), 0.5))
			post_z -= 18.0
	# Вентиляторы под сводом.
	for fan_z: float in [z_from - 62.0, z_from - 122.0]:
		for fan_x: float in [-2.6, 2.6]:
			# Цилиндр с тёмным зевом и подвеска к своду.
			var fan := MeshInstance3D.new()
			fan.mesh = Person._flesh([[Vector3(fan_x, 5.15, fan_z + 1.7), 0.5, 0.5], [Vector3(fan_x, 5.15, fan_z - 1.7), 0.5, 0.5]], steel, 24)
			w.add_child(fan)
			var mouth := MeshInstance3D.new()
			mouth.mesh = Person._flesh([[Vector3(fan_x, 5.15, fan_z + 1.71), 0.42, 0.42], [Vector3(fan_x, 5.15, fan_z + 1.73), 0.42, 0.42]], tray, 24)
			w.add_child(mouth)
			Car.box(w, Vector3(0.1, 0.5, 2.2), Vector3(fan_x, 5.8, fan_z), tray)
	var lamp_z: float = z_from - 5.0
	while lamp_z > -510.0:
		Car.box(w, Vector3(0.34, 0.08, 1.3), Vector3(0.0, 6.24, lamp_z), lamp)
		lamp_z -= 9.0
	var light_z: float = z_from - 6.0
	var lights: int = 0
	while lights < 12 and not portal:
		var o := OmniLight3D.new()
		o.position = Vector3(0.0, 5.4, light_z)
		o.omni_range = 24.0
		o.omni_attenuation = 0.8
		o.light_energy = 2.0
		o.light_color = Color(1.0, 0.95, 0.86)
		w.add_child(o)
		light_z -= 13.0
		lights += 1
	# Ниша со знаком SOS на правой стене.
	var niche_z: float = z_from - 56.0 if not portal else z_from - 30.0
	# Аварийная станция: символы 605 и 606 от 2 м над обочиной (N300:2026, 1.3.3 и 7.5.1), ниже шкаф с огнетушителем.
	if not niche:
		w.road_sign("nodtelefon", hw - 0.55, niche_z, 0.36, 2.0, 0.0)
		w.road_sign("brannslokker", hw - 0.17, niche_z, 0.36, 2.0, 0.0)
	Car.box(w, Vector3(0.06, 0.82, 0.55), Vector3(hw - 0.14, 1.0, niche_z - 2.2), Car.mat(Color(0.86, 0.86, 0.84), 0.5))
	Car.box(w, Vector3(0.05, 0.56, 0.2), Vector3(hw - 0.18, 0.95, niche_z - 2.2), Car.mat(Color(0.8, 0.05, 0.04), 0.35))
	if not portal:
		return
	_portal(w, z_from, hw, wall, top, style)


## Въезд как на норвежских дорогах. style:
## collar: бетонный воротник дугой выступает из взорванной скалы, край скошен;
## grass: такой же воротник, но склон пологий, травяная засыпка и каменная кладка по бокам;
## box: прямоугольный бетонный портал с откосными стенками;
## raw: без бетона, отверстие прямо в скале.
static func _portal(w: World, z0: float, hw: float, wall: float, top: float, style: String) -> void:
	var has_arc: bool = style != "box"
	var front: float = {"collar": 3.5, "grass": 2.6, "raw": 0.5, "box": 0.8}[style]
	var back: float = -1.0 if style == "raw" else -4.5
	var thick: float = 0.4 if style == "raw" else 0.65
	var hole_half: float = hw + (0.9 if style == "box" else thick + 0.15)
	var rock := ShaderMaterial.new()
	rock.shader = preload("res://shaders/rock_face.gdshader")
	rock.set_shader_parameter("noise", World.NOISE)
	var slant: float = 0.0 if style == "raw" else 2.2
	var arc := func(half_w: float, side: float, rise: float, along: float) -> PackedVector3Array:
		var ring := PackedVector3Array()
		var count: int = 26
		for k: int in count + 1:
			var t: float = PI * k / count
			var x: float = half_w * cos(t)
			var y: float = side + rise * sin(t)
			# Край воротника скошен: наверху он дальше от дороги, чем внизу.
			var z: float = z0 + lerpf(front - y / top * slant, back, along)
			ring.push_back(Vector3(x, y, z))
		ring.insert(0, Vector3(half_w, -0.05, z0 + lerpf(front, back, along)))
		ring.push_back(Vector3(-half_w, -0.05, z0 + lerpf(front, back, along)))
		return ring
	var concrete: ShaderMaterial = w.surface(Color(0.56, 0.56, 0.53), Color(0.74, 0.74, 0.7), {"fine_scale": 1.4, "mid_scale": 0.2})
	concrete.set_shader_parameter("rough", 0.9)
	if has_arc:
		var shell: Material = rock if style == "raw" else concrete
		var outer: Array = []
		var inner: Array = []
		for k: int in 7:
			var along: float = k / 6.0
			outer.push_back(arc.call(hw + thick, wall + 0.25, top - wall + thick - 0.25, along))
			inner.push_back(arc.call(hw - 0.02, wall, top - wall - 0.02, along))
		w.add_mesh(Mesher.loft(outer, shell, false), true)
		w.add_mesh(Mesher.loft(inner, shell, false), true)
		w.add_mesh(Mesher.loft([outer[0], inner[0]], shell, false), true)
		# Углы между дугой и прямоугольным вырезом закрыты скалой, иначе там чёрные дыры.
		var around: PackedVector3Array = outer[outer.size() - 1]
		var sheet := PackedVector3Array()
		var centre := Vector2(0.0, wall)
		for point: Vector3 in around:
			var d := Vector2(point.x, point.y) - centre
			var scale_to: float = hole_half / maxf(absf(d.x), 0.001)
			if d.y > 0.0:
				scale_to = minf(scale_to, (top + 2.0 - wall) / d.y)
			var q: Vector2 = centre + d * scale_to if point.y > 0.0 else Vector2(signf(point.x) * hole_half, -0.05)
			sheet.push_back(Vector3(q.x, q.y, point.z))
		w.add_mesh(Mesher.loft([around, sheet], rock, false), true)
	else:
		_box_portal(w, z0, hw, concrete)
	# Склон: сетка высот, вокруг входа вырез с вертикальными краями.
	var noise := FastNoiseLite.new()
	noise.seed = 7
	noise.frequency = 0.075
	noise.fractal_octaves = 4
	var fine := FastNoiseLite.new()
	fine.seed = 13
	fine.frequency = 0.24
	fine.fractal_octaves = 2
	# Высота и ширина боковых откосов, высота над входом, сила неровностей.
	var side_h: float = {"collar": 13.0, "raw": 17.0, "grass": 5.0, "box": 6.0}[style]
	var side_w: float = {"collar": 7.0, "raw": 4.5, "grass": 22.0, "box": 10.0}[style]
	var over: float = {"collar": 13.0, "raw": 15.0, "grass": 8.5, "box": 9.5}[style]
	var soft: bool = style == "grass" or style == "box"
	var rough: float = {"collar": 0.2, "raw": 0.26, "grass": 0.05, "box": 0.05}[style]
	var height := func(x: float, z: float) -> float:
		var dz: float = z - z0
		var ax: float = absf(x)
		var channel: float = hw + 1.5 + maxf(dz, 0.0) * 0.26
		var cut: float = smoothstep(channel, channel + side_w, ax) * (1.0 - smoothstep(4.0, 44.0, dz)) * (side_h + ax * 0.24)
		var above: float = smoothstep(2.0, -9.0, dz) * (over + maxf(-dz, 0.0) * 0.28 + ax * 0.05)
		var base: float = maxf(cut, above)
		var shaped: float = base + noise.get_noise_2d(x, z) * (0.3 + base * rough) * smoothstep(0.0, 3.0, base)
		# Над воротником склон начинается чуть выше свода и дальше поднимается: иначе у края выреза торчала бы стенка.
		# Над туннелем склон всегда выше свода: иначе он зашёл бы внутрь и закрыл жерло.
		# Запас на шаг сетки: иначе у ячейки на краю выреза передняя сторона низкая и лист наклонно закрывает проём.
		if dz < back + 1.6 and ax < hole_half + 2.0:
			shaped = maxf(shaped, top + 1.0)
		var capped: float = minf(shaped, top + 1.0 + maxf(back - dz, 0.0) * 1.1 + maxf(ax - hole_half, 0.0) * 1.1)
		# Мелкие грани поверх ограничения, чтобы лицо склона не было гладким.
		return capped + fine.get_noise_2d(x, z) * 0.55 * smoothstep(0.6, 4.0, capped)
	var hole := func(x: float, z: float) -> bool:
		return absf(x) < hole_half and z - z0 > back
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	# Скала гранями, как после взрыва; травяная засыпка гладкая.
	st.set_smooth_group(0 if soft else -1)
	var step: float = 1.5
	var x0: float = -135.0
	var nx: int = 180
	var z_start: float = z0 + 48.0
	var nz: int = 140
	for j: int in nz:
		for i: int in nx:
			var xa: float = x0 + i * step
			var xb: float = xa + step
			var za: float = z_start - j * step
			var zb: float = za - step
			if hole.call((xa + xb) / 2.0, (za + zb) / 2.0):
				# Края выреза опускаем до земли, иначе под ними было бы видно насквозь.
				for edge: Array in [[xb, za, xb, zb, xb + step, (za + zb) / 2.0], [xa, zb, xa, za, xa - step, (za + zb) / 2.0], [xb, zb, xa, zb, (xa + xb) / 2.0, zb - step]]:
					if not hole.call(edge[4], edge[5]):
						var p: Vector3 = Vector3(edge[0], height.call(edge[0], edge[1]), edge[1])
						var q: Vector3 = Vector3(edge[2], height.call(edge[2], edge[3]), edge[3])
						# За задним краем туннель идёт дальше: там стенка только над сводом, иначе закрыла бы вход.
						var floor_y: float = top + 0.5 if edge[0] != edge[2] else -0.1
						for v: Vector3 in [p, q, Vector3(q.x, floor_y, q.z), p, Vector3(q.x, floor_y, q.z), Vector3(p.x, floor_y, p.z)]:
							st.add_vertex(v)
				continue
			var a := Vector3(xa, height.call(xa, za), za)
			var b := Vector3(xb, height.call(xb, za), za)
			var c := Vector3(xb, height.call(xb, zb), zb)
			var d := Vector3(xa, height.call(xa, zb), zb)
			# На ровном месте сетки нет: там дорога и обычная земля.
			if maxf(maxf(a.y, b.y), maxf(c.y, d.y)) < 0.08:
				continue
			for v: Vector3 in [a, c, b, a, d, c]:
				st.add_vertex(v)
	st.generate_normals()
	if soft:
		rock.set_shader_parameter("grass_from", 0.42)
	w.add_mesh(st.commit(), true).set_surface_override_material(0, rock)
	if style == "grass":
		# Каменная кладка у воротника.
		var stone: ShaderMaterial = w.surface(Color(0.2, 0.2, 0.2), Color(0.5, 0.49, 0.46), {"fine_scale": 2.2, "mid_scale": 0.7, "bump": 1.0})
		for side: float in [-1.0, 1.0]:
			Car.box(w, Vector3(10.0, 2.1, 1.0), Vector3(side * (hw + 5.6), 1.05, z0 + 1.2), stone)
	# Деревья на склоне.
	var r := RandomNumberGenerator.new()
	r.seed = 3
	for k: int in 150:
		var x: float = r.randf_range(-125.0, 125.0)
		var z: float = z0 - r.randf_range(-30.0, 150.0)
		if absf(x) < hw + 11.0 and z - z0 > -20.0:
			continue
		var y: float = height.call(x, z)
		if y > 3.0:
			w.plant_free("pine" if r.randf() < 0.7 else "broad", x, z, 0.65 + r.randf() * 0.45, y - 0.2)
	# Жёлтые огни над въездом.
	var amber: StandardMaterial3D = Vehicles._lamp(Color(1.0, 0.62, 0.1), 3.5)
	for k: int in 9:
		var lx: float = -3.0 + k * 0.75
		var arch_y: float = wall + (top - wall) * sqrt(maxf(1.0 - pow(lx / hw, 2.0), 0.0)) - 0.25
		Car.box(w, Vector3(0.22, 0.09, 0.09), Vector3(lx, minf(arch_y, 4.95) if style == "box" else arch_y, z0 - 1.2), amber)
	# Отбойники вдоль дороги.
	var steel: StandardMaterial3D = Car.mat(Color(0.6, 0.62, 0.64), 0.4, 0.7)
	for side: float in [-1.0, 1.0]:
		Car.box(w, Vector3(0.05, 0.3, 32.0), Vector3(side * 4.75, 0.62, z0 + 19.0), steel)
		var post: float = z0 + 3.5
		while post < z0 + 35.0:
			Car.box(w, Vector3(0.09, 0.72, 0.09), Vector3(side * 4.82, 0.36, post), steel)
			post += 2.0


## Прямоугольный портал: балка и стойки вокруг въезда, от них к дороге сплошные откосные стенки с понижением.
## Карман для автобуса: штриховая кромка 2 и 2 м вместо сплошной (N302:2025, 9.1).
static func _bus_bay(w: World, b: Array, right: float) -> void:
	var z0: float = b[0]
	var z1: float = b[1]
	var taper: float = 8.0
	var deep: float = right + 3.5
	var m: ShaderMaterial = w.asphalt(0.0)
	w.add_mesh(Mesher.prism(PackedVector2Array([Vector2(right, z0 + taper), Vector2(deep, z0), Vector2(deep, z1), Vector2(right, z1 - taper)]), -0.01, 0.002, m, m))
	w.keep_clear(World.straight(right + 1.75, z0, right + 1.75, z1, 2.0), 1.75)
	w.line(World.straight(right - 0.25, z0 + taper, right - 0.25, z1 - taper, 1.0), 0.0, World.WHITE, 0.12, 2.0, 2.0)
	var outer := PackedVector2Array([Vector2(right - 0.25, z0 + taper), Vector2(deep - 0.2, z0), Vector2(deep - 0.2, z1), Vector2(right - 0.25, z1 - taper)])
	w.line(outer, 0.0, World.WHITE, 0.12)


## Дорога с изгибом: прямо до start, дальше дуга радиуса r вправо (dir 1) или влево (dir -1), потом снова прямо.
static func _curve_path(c: Dictionary) -> PackedVector2Array:
	var r: float = c.get("r", 42.0)
	var start: float = c.get("start", -7.0)
	var side: float = c.get("dir", 1.0)
	var pts := PackedVector2Array()
	var z: float = 70.0
	while z > start:
		pts.push_back(Vector2(0.0, z))
		z -= 3.0
	var turn: float = deg_to_rad(c.get("angle", 85.0))
	var count: int = 40
	for k: int in count + 1:
		var a: float = turn * k / count
		pts.push_back(Vector2(side * (r - r * cos(a)), start - r * sin(a)))
	var last: Vector2 = pts[pts.size() - 1]
	var d := Vector2(side * sin(turn), -cos(turn))
	for k: int in range(1, 90):
		pts.push_back(last + d * (k * 3.0))
	return pts


## Две полосы переходят в одну: правая сужается между taper[0] и taper[1]. divided: встречная отделена отбойником.
static func _taper_road(w: World, s: Dictionary, whole: PackedVector2Array) -> void:
	var t0: float = s["taper"][0]
	var t1: float = s["taper"][1]
	var divided: bool = s.get("divided", false)
	var near: float = -0.75 if divided else -3.5
	var straight_part := PackedVector2Array([Vector2(3.5, 70.0), Vector2(7.0, 70.0), Vector2(7.0, t0), Vector2(3.5, t1)])
	var shoulder := PackedVector2Array([Vector2(3.5, 70.0), Vector2(7.9, 70.0), Vector2(7.9, t0), Vector2(4.4, t1)])
	w.add_mesh(Mesher.strip(whole, near - 0.9, 4.4, -0.012, w.gravel()))
	w.add_mesh(Mesher.prism(shoulder, -0.015, -0.012, w.gravel(), w.gravel()))
	w.add_mesh(Mesher.strip(whole, near, 3.5, 0.0, w.asphalt(0.12)))
	w.add_mesh(Mesher.prism(straight_part, -0.02, 0.0, w.asphalt(0.12), w.kerb()))
	w._strips.push_back([whole, 4.4 if not divided else 9.5])
	w._strips.push_back([PackedVector2Array([Vector2(5.2, 70.0), Vector2(5.2, t0), Vector2(3.5, t1)]), 2.8])
	var edge := PackedVector2Array([Vector2(6.75, 70.0), Vector2(6.75, t0), Vector2(3.25, t1), Vector2(3.25, -260.0)])
	w.line(edge, 0.0, World.WHITE, 0.3 if divided else 0.12)
	if divided:
		# Отдельная проезжая часть для встречных, между ними газон и отбойник.
		# Профиль по N100:2023, 3.3.3: внутренняя обочина 0,75 м, разделитель 2 м.
		w.add_mesh(Mesher.strip(whole, -12.5, -2.75, 0.0, w.asphalt(0.12)))
		w.line(whole, -0.15, World.YELLOW, 0.3)
		w.line(whole, -3.35, World.YELLOW, 0.3)
		w.line(whole, -10.65, World.WHITE, 0.3)
		w.line(whole, -7.0, World.WHITE, 0.15, 3.0, 9.0)
		var steel: StandardMaterial3D = Car.mat(Color(0.6, 0.62, 0.64), 0.4, 0.7)
		Car.box(w, Vector3(0.05, 0.3, 200.0), Vector3(-1.75, 0.62, -60.0), steel)
		var post: float = 30.0
		while post > -150.0:
			Car.box(w, Vector3(0.09, 0.72, 0.09), Vector3(-1.82, 0.36, post), steel)
			post -= 2.5
	else:
		w.line(whole, -3.25, World.WHITE, 0.12)


## Лежачий полицейский поперёк дороги: плавный горб и белые треугольники на вершине.
static func _hump(w: World, z: float, left: float, right: float) -> void:
	var rings: Array = []
	for k: int in 11:
		var t: float = -1.0 + k / 5.0
		var h: float = 0.11 * (0.5 + 0.5 * cos(t * PI))
		rings.push_back(PackedVector3Array([Vector3(-left, -0.01, z + t * 2.2), Vector3(right, -0.01, z + t * 2.2), Vector3(right, h, z + t * 2.2), Vector3(-left, h, z + t * 2.2)]))
	w.add_mesh(Mesher.loft(rings, w.asphalt(0.0)))
	# Обозначение 1027: шашечки в два ряда на вершине горба, клетка 0,5 м (N302:2025, табл. 3.3—1).
	var paint: ShaderMaterial = w._paint(World.WHITE, 0.3)
	for row: int in 2:
		var x: float = -left + (0.5 if row == 1 else 0.0)
		while x < right - 0.4:
			var z0: float = z + 0.5 - row * 0.5
			w.add_mesh(Mesher.prism(PackedVector2Array([Vector2(x, z0), Vector2(x + 0.5, z0), Vector2(x + 0.5, z0 - 0.5), Vector2(x, z0 - 0.5)]), 0.1, 0.116, paint, paint))
			x += 1.0


## Закрытый туннель и переезд: опущенный шлагбаум поперёк дороги и красные огни на стойке.
## bars: опущены ли шлагбаумы, у переезда огни могут мигать раньше.
static func _closed(w: World, z0: float, bars: bool = true) -> void:
	var red: StandardMaterial3D = Car.mat(Color(0.75, 0.05, 0.04), 0.4)
	var white: StandardMaterial3D = Car.mat(Color(0.92, 0.92, 0.9), 0.4)
	var steel: StandardMaterial3D = Car.mat(Color(0.5, 0.52, 0.54), 0.4, 0.6)
	var z: float = z0 + 11.0
	# Шлагбаум стоит на дороге намеренно, поэтому он mover, а не препятствие для проверки сцены.
	var bom := Node3D.new()
	for side: float in [-1.0, 1.0]:
		Car.box(bom, Vector3(0.28, 1.1, 0.28), Vector3(side * 4.3, 0.55, z), steel)
		for k: int in (8 if bars else 0):
			var x: float = side * (4.2 - k * 0.52 - 0.26)
			Car.box(bom, Vector3(0.52, 0.11, 0.07), Vector3(x, 1.0, z), red if k % 2 == 0 else white)
	# Два красных огня, кадр поймал момент, когда горит один.
	var pole := MeshInstance3D.new()
	pole.mesh = Mesher.limb(Vector3(4.75, 0.0, z + 2.0), Vector3(4.75, 3.2, z + 2.0), 0.05, 0.045, steel)
	bom.add_child(pole)
	Car.box(bom, Vector3(0.78, 0.36, 0.08), Vector3(4.75, 3.0, z + 2.0), Car.mat(Color(0.03, 0.03, 0.035), 0.5))
	Car.box(bom, Vector3(0.2, 0.2, 0.02), Vector3(4.53, 3.0, z + 2.05), Vehicles._lamp(Color(0.95, 0.03, 0.03), 4.0))
	Car.box(bom, Vector3(0.2, 0.2, 0.02), Vector3(4.97, 3.0, z + 2.05), Car.mat(Color(0.18, 0.02, 0.02), 0.3))
	Vehicles._beacon(bom, Vector3(4.53, 3.0, z + 2.1), 1.5, Vehicles._flare(Color(0.95, 0.03, 0.04)))
	w.add_mover(bom)


static func _box_portal(w: World, z0: float, hw: float, concrete: Material) -> void:
	var inner: float = hw - 0.7
	var depth: float = 2.2
	Car.box(w, Vector3(2.0 * hw + 2.4, 3.0, depth), Vector3(0.0, 6.7, z0 - 0.3), concrete)
	for side: float in [-1.0, 1.0]:
		Car.box(w, Vector3(1.9, 5.3, depth), Vector3(side * (inner + 0.95), 2.65, z0 - 0.3), concrete)
		var rings: Array = []
		for k: int in 9:
			var t: float = k / 8.0
			var x: float = side * lerpf(hw + 1.05, hw + 8.0, t)
			var z: float = z0 + 0.7 + t * 17.0
			var h: float = lerpf(5.2, 0.35, t)
			rings.push_back(PackedVector3Array([Vector3(x - 0.22, -0.05, z), Vector3(x + 0.22, -0.05, z), Vector3(x + 0.22, h, z), Vector3(x - 0.22, h, z)]))
		w.add_mesh(Mesher.loft(rings, concrete), true)


static func _lanes(w: World, kind: String, s: Dictionary, path: PackedVector2Array, zc: float, cross: String) -> void:
	var lanes: String = s.get("lanes", "")
	if lanes == "sperre":
		w.line(path, 3.5, World.WHITE, 0.12)
	elif lanes != "":
		# Длина штрихов зависит от скорости: в городе 1 и 3 м или 3 и 1 м, за городом 3 и 9 м или 9 и 3 м (табл. 3.1—1).
		var town: bool = s.get("env", "") == "street"
		var dash: float = (1.0 if town else 3.0) if lanes == "skille" else (3.0 if town else 9.0)
		var gap: float = (3.0 if town else 9.0) if lanes == "skille" else (1.0 if town else 3.0)
		var pause: Array = [70.0 + 11.5, 70.0 + 18.5] if kind == "gangfelt" else ([70.0 - zc - 7.0, 70.0 - zc + 7.0] if cross != "" else [])
		if s.has("taper"):
			# Знак 530: линия кончается там, где начинается сужение, дальше её быть не должно (N302:2025, 5.6).
			w.line(path, 3.5, World.WHITE, 0.11, dash, gap, 0.0, 70.0 - float(s["taper"][0]))
		elif pause.is_empty():
			w.line(path, 3.5, World.WHITE, 0.11, dash, gap)
		elif kind == "gangfelt":
			# Перед переходом между попутными полосами сплошная на половину остановочного пути (8.1).
			w.line(path, 3.5, World.WHITE, 0.11, dash, gap, 0.0, pause[0] - 25.0)
			w.line(path, 3.5, World.WHITE, 0.12, 0.0, 0.0, pause[0] - 25.0, pause[0])
			w.line(path, 3.5, World.WHITE, 0.11, dash, gap, pause[1])
		else:
			w.line(path, 3.5, World.WHITE, 0.11, dash, gap, 0.0, pause[0])
			w.line(path, 3.5, World.WHITE, 0.11, dash, gap, pause[1])
	if s.has("lane_arrow"):
		var c := Vector2(s["lane_arrow"][0], s["lane_arrow"][1])
		w.paint_poly(PackedVector2Array([c + Vector2(-0.1, 0.0), c + Vector2(0.1, 0.0), c + Vector2(0.1, -3.5), c + Vector2(-0.1, -3.5)]))
		w.paint_poly(PackedVector2Array([c + Vector2(-0.1, -3.5), c + Vector2(0.1, -3.5), c + Vector2(-0.52, -5.05), c + Vector2(-0.76, -4.92)]))
		w.paint_poly(PackedVector2Array([c + Vector2(-0.22, -5.25), c + Vector2(-1.2, -6.4), c + Vector2(-1.05, -4.55)]))


## Светофор лицом к +z. state: green горит зелёный, off погашен весь.
static func _signal(state: String) -> Node3D:
	var root := Node3D.new()
	var shell: StandardMaterial3D = Car.mat(Color(0.04, 0.04, 0.045), 0.5)
	var pole := MeshInstance3D.new()
	pole.mesh = Mesher.limb(Vector3.ZERO, Vector3(0.0, 3.0, 0.0), 0.055, 0.048, Car.mat(Color(0.2, 0.21, 0.22), 0.5, 0.4))
	root.add_child(pole)
	# Низ сигнала в 2 м над дорогой (N303:2026).
	Car.box(root, Vector3(0.48, 1.12, 0.02), Vector3(0.0, 2.5, -0.1), Car.mat(Color(0.9, 0.9, 0.86), 0.6))
	Car.box(root, Vector3(0.3, 0.96, 0.18), Vector3(0.0, 2.5, 0.0), shell)
	var colors: Array = [Color(0.92, 0.05, 0.04), Color(0.95, 0.6, 0.05), Color(0.05, 0.9, 0.32)]
	for k: int in 3:
		var y: float = 2.8 - k * 0.3
		var lit: bool = state == "green" and k == 2
		var lens := MeshInstance3D.new()
		lens.mesh = Mesher.pillow(Vector3(0.0, y, 0.095), Vector3(0.105, 0.105, 0.012), Vehicles._lamp(colors[k], 3.0) if lit else Car.mat(colors[k] * 0.16, 0.3))
		root.add_child(lens)
		Car.box(root, Vector3(0.25, 0.015, 0.14), Vector3(0.0, y + 0.125, 0.16), shell)
		if lit:
			Vehicles._beacon(root, Vector3(0.0, y, 0.12), 1.1, Vehicles._flare(colors[k]))
	return root


## Регулировщик в жёлтой жилетке и фуражке, смотрит вдоль -z. pose: up рука вверх, side рука в сторону.
static func _police(pose: String, lantern: bool = false) -> Node3D:
	var navy: StandardMaterial3D = Car.mat(Color(0.04, 0.06, 0.14), 0.7)
	var raised := Vector3(0.2, 2.02, -0.02) if pose == "up" else Vector3(0.8, 1.38, -0.02)
	var root: Node3D = Person.make(Color(0.82, 0.86, 0.06), Color(0.04, 0.06, 0.14), Color(0.86, 0.66, 0.53), Color(0.2, 0.13, 0.08), 1.78, 0.05, [raised, Vector3(-0.21, 0.8, 0.02)], 0.0)
	var cap := MeshInstance3D.new()
	cap.mesh = Mesher.tube([[Vector3(0, 1.712, -0.012), 0.086, 0.106], [Vector3(0, 1.75, -0.012), 0.096, 0.118], [Vector3(0, 1.785, -0.012), 0.106, 0.13], [Vector3(0, 1.797, -0.012), 0.08, 0.1]], navy, 20)
	root.add_child(cap)
	var brim := MeshInstance3D.new()
	brim.mesh = Mesher.pillow(Vector3(0, 1.716, -0.118), Vector3(0.078, 0.008, 0.05), Car.mat(Color(0.02, 0.02, 0.03), 0.3))
	root.add_child(brim)
	if lantern:
		Car.box(root, Vector3(0.1, 0.16, 0.1), raised + Vector3(0.06, -0.06, 0.0), Vehicles._lamp(Color(0.95, 0.03, 0.03), 4.0))
		Vehicles._beacon(root, raised + Vector3(0.06, -0.06, 0.0), 1.5, Vehicles._flare(Color(0.95, 0.03, 0.04)))
	Vehicles._text(root, "POLITI", Vector3(0, 1.25, -0.124), PI, 0.07, Color(0.04, 0.06, 0.14))
	return root


static func _marking(w: World, kind: String, s: Dictionary, path: PackedVector2Array, zc: float, left: float, right: float, cross: String) -> void:
	var y: Color = World.YELLOW
	# N302:2025, табл. 3.1—1: в городе (до 50 км/ч) кжёрефельтлинье 1 и 3 м, за городом 3 и 9 м.
	var town: bool = s.get("env", "") == "street"
	var dash_on: float = 1.0 if town else 3.0
	var dash_off: float = 3.0 if town else 9.0
	var skille := func(x: float, from: float = 0.0, to: float = INF) -> void:
		w.line(path, x, y, 0.1 if town else 0.12, dash_on, dash_off, from, to)
	var to_cross: float = 70.0 - zc - 7.0
	var from_cross: float = 70.0 - zc + 7.0
	match kind:
		"sperrelinje", "dobbel_sperrelinje":
			# Одиночная сплошная осевой быть не может: только двойная или вместе с прерывистой (N302:2025, 1004).
			w.line(path, -0.11, y, 0.11)
			w.line(path, 0.11, y, 0.11)
		"varsellinje":
			w.line(path, 0.0, y, 0.12, 9.0, 3.0)
		"skillelinje":
			# На перекрёстке осевая прерывается (N302:2025, 7.2).
			if cross != "":
				skille.call(0.0, 0.0, to_cross - 2.0)
				skille.call(0.0, from_cross)
			else:
				skille.call(0.0)
		"sperre_varsel":
			w.line(path, -0.12, y, 0.11, 9.0, 3.0)
			w.line(path, 0.12, y, 0.12)
		"varsel_sperre":
			w.line(path, -0.12, y, 0.12)
			w.line(path, 0.12, y, 0.11, 9.0, 3.0)
		"haitenner":
			# Подъезд к главной дороге: осевая предупреждающая до самой линии, 3 и 1 м (7.3.1).
			w.line(path, 0.0, y, 0.1, 3.0, 1.0, 0.0, to_cross + 2.4)
			skille.call(0.0, from_cross)
			w.line(World.straight(-left, zc + 3.5, right, zc + 3.5, 1.0), 0.0, World.WHITE, 0.1, 2.0, 2.0)
			var count: int = 6
			var step: float = (right - 0.3) / count
			for k: int in count:
				var x0: float = 0.15 + step * k + 0.05
				var x1: float = x0 + step - 0.1
				var tip := Vector2((x0 + x1) / 2.0, zc + 4.5 + 0.85)
				w.paint_poly(PackedVector2Array([Vector2(x0, zc + 4.5), Vector2(x1, zc + 4.5), tip]))
		"stopplinje":
			w.line(path, 0.0, y, 0.1, 3.0, 1.0, 0.0, to_cross + 2.2)
			skille.call(0.0, from_cross)
			w.line(World.straight(-left, zc + 3.5, right, zc + 3.5, 1.0), 0.0, World.WHITE, 0.1, 2.0, 2.0)
			w.bar(0.1, zc + 4.3, right - 0.1, zc + 4.8)
			# Надпись примерно за 10 м до стоп-линии (7.3.1).
			w.road_text("STOPP", right / 2.0, zc + 14.8, 0.9, Vector2(1.0, 0.0), 3.0)
		"sykkelfelt":
			if cross == "right":
				skille.call(0.0, 0.0, to_cross - 2.0)
				skille.call(0.0, from_cross)
				# Скиллелинье велополосы: 1 м штрих, 1 м просвет, ширина 0,2 м (8.2). Через Т-образный перекрёсток можно вести.
				w.line(path, 3.2, World.WHITE, 0.2, 1.0, 1.0, 0.0, INF, 0.3)
			else:
				skille.call(0.0)
				w.line(path, 3.2, World.WHITE, 0.2, 1.0, 1.0, 0.0, INF, 0.3)
			for bz: float in [-7.0, -44.0, -80.0]:
				w.road_decal(BIKE_SVG, 3.95, bz, 1.05, 2.3)
		"kollektivfelt":
			skille.call(-1.75)
			# Скиллелинье 2 и 2 м, ширина 0,2 м; на полосе надпись BUSS (9.4).
			w.line(path, 1.75, World.WHITE, 0.2, 2.0, 2.0, 0.0, INF, 0.3)
			for tz: float in [-13.0, -62.0]:
				w.road_text("BUSS", 3.5, tz, 1.0, Vector2(1.0, 0.0), 3.0)
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
			if s.get("oneway", false):
				# Улица в одну сторону: осевой нет, левый край жёлтый (5.2).
				w.line(path, 0.15, y, 0.1)
			else:
				# Перед переходом в городе осевая предупреждающая, 3 и 1 м (8.1).
				w.line(path, 0.0, y, 0.1, 3.0, 1.0, 40.0, 70.0 + 11.5)
				skille.call(0.0, 0.0, 40.0)
				w.line(path, 0.0, y, 0.1, 3.0, 1.0, 70.0 + 18.5, 70.0 + 44.0)
				skille.call(0.0, 70.0 + 44.0)
			var x: float = -left + 0.25
			while x < right - 0.2:
				w.bar(x, -16.0, x + 0.5, -13.0)
				x += 1.0
			w.road_sign("gangfelt", right + 0.85, -12.3, 0.75, 2.0, 0.0, [], 0.14)
			w.road_sign("gangfelt", -left - 0.85, -16.6, 0.75, 2.0, PI, [], 0.14)


## Боковая дорога: осевая линия и край.
static func _side_lines(w: World, zc: float, cross: String, left: float, right: float, main: bool = false) -> void:
	var y: Color = World.YELLOW
	if main:
		# Главная дорога: осевая проходит через перекрёсток без разрыва, у перекрёстка предупреждающая (7.3.1).
		var whole := World.straight(-240.0 if cross == "both" else 0.0, zc, 240.0, zc)
		w.line(whole, 0.0, y, 0.1, 3.0, 1.0)
		return
	var a := World.straight(right + 2.4, zc, 240.0, zc)
	w.line(a, 0.0, y, 0.1, 1.0, 3.0)
	if cross == "both":
		var b := World.straight(-left - 2.4, zc, -240.0, zc)
		w.line(b, 0.0, y, 0.1, 1.0, 3.0)


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
			if a.has("blink"):
				Vehicles.blink(node, 1.0 if a["blink"] == "right" else -1.0, -5.9, 5.9, 1.2, 0.95, 0.95, true)
		"ambulance":
			node = Vehicles.ambulance(a.get("lit", true))
		"van":
			var vc: Array = a.get("color", [0.88, 0.88, 0.86])
			node = Vehicles.ambulance(false, true, Color(vc[0], vc[1], vc[2]))
		"mc":
			node = Vehicles.motorcycle(Color(0.08, 0.1, 0.5))
		"triangle":
			# Варсельтрекант: красная рамка на ножке, лицом к подъезжающим.
			node = Node3D.new()
			var red: StandardMaterial3D = Vehicles._lamp(Color(0.85, 0.03, 0.03), 0.35)
			Car.box(node, Vector3(0.46, 0.05, 0.02), Vector3(0, 0.1, 0), red)
			Car.box(node, Vector3(0.05, 0.46, 0.02), Vector3(-0.115, 0.3, 0), red, Vector3(0, 0, -0.52))
			Car.box(node, Vector3(0.05, 0.46, 0.02), Vector3(0.115, 0.3, 0), red, Vector3(0, 0, 0.52))
		"truck":
			var tc: Array = a.get("color", [0.1, 0.24, 0.5])
			var semi: bool = a.get("semi", false)
			node = Vehicles.truck(Color(tc[0], tc[1], tc[2]), semi)
			if a.has("blink"):
				var half_t: float = 8.25 if semi else 4.5
				Vehicles.blink(node, 1.0 if a["blink"] == "right" else -1.0, -half_t - 0.02, half_t + 0.02, 1.2, 1.26, 1.0, true)
		"signal":
			# Не mover: светофор стоит неподвижно, и audit должен проверить, что он не на дороге.
			node = _signal(a.get("state", "off"))
			node.position = Vector3(x, a.get("base", 0.14), z)
			w.add_child(node)
			return
		"police":
			node = _police(a.get("pose", "side"), a.get("lantern", false))
		"ball":
			node = Node3D.new()
			var ball := MeshInstance3D.new()
			var sphere := SphereMesh.new()
			sphere.radius = 0.14
			sphere.height = 0.28
			sphere.material = Car.mat(Color(0.85, 0.06, 0.05), 0.4)
			ball.mesh = sphere
			ball.position.y = 0.14
			node.add_child(ball)
		"cyclist":
			node = Person.cyclist(Color(0.82, 0.3, 0.08), Color(0.1, 0.12, 0.2))
		"scooter":
			node = Person.scooter(Color(0.16, 0.3, 0.46), Color(0.14, 0.14, 0.16))
		_:
			var top: Array = a.get("top", [0.74, 0.2, 0.12])
			var legs: Array = a.get("legs", [0.1, 0.13, 0.22])
			var top_c := Color(top[0], top[1], top[2])
			var legs_c := Color(legs[0], legs[1], legs[2])
			var skin := Color(0.86, 0.66, 0.53)
			var hc: Array = a.get("hair", [0.2, 0.13, 0.08])
			var hair := Color(hc[0], hc[1], hc[2])
			var tall: float = a.get("height", 1.76)
			if a.get("cane", false):
				# Белая трость в правой руке, кончик впереди на земле.
				var grip := Vector3(0.24, 0.88, -0.3)
				node = Person.make(top_c, legs_c, skin, hair, tall, 0.26, [grip, Vector3(-0.21, 0.8, 0.02)])
				var stick := MeshInstance3D.new()
				stick.mesh = Mesher.limb(grip, Vector3(0.36, 0.01, -1.0), 0.019, 0.015, Car.mat(Color(0.95, 0.95, 0.93), 0.4))
				node.add_child(stick)
			else:
				node = Person.make(top_c, legs_c, skin, hair, tall, a.get("stride", 0.42))
				if a.get("reflex", false):
					var shine: ImageTexture = Vehicles._flare(Color(0.95, 0.97, 1.0))
					for spot: Vector3 in [Vector3(0.08, 0.24, -0.25), Vector3(-0.08, 0.35, 0.2), Vector3(0.2, 0.85, 0.05), Vector3(-0.2, 0.85, -0.05)]:
						Vehicles._beacon(node, spot, 0.95, shine)
	if a.has("lights"):
		Vehicles.lights(node, a["lights"], absf(yaw) > 1.5)
	if a.get("fire", false):
		Vehicles.fire(node)
	if a.get("blink_left", false):
		Vehicles.blink(node, -1.0, -1.95, 2.2, 0.8, 0.72, 0.9, true)
	if w.rainy and a["what"] == "car" and absf(yaw) < 1.5:
		Vehicles.spray(node)
	if a.get("hazard", false):
		for side: float in [-1.0, 1.0]:
			Vehicles.blink(node, side, -1.95, 2.2, 0.8, 0.72, 0.9, true)
	var base: float = a.get("base", 0.0)
	node.position = Vector3(x, base + w.h(z), z)
	node.rotation.y = yaw
	if w.elev.is_valid():
		node.rotation.x = atan((w.h(z - 1.0) - w.h(z + 1.0)) / 2.0) * cos(yaw)
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
