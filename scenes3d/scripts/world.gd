class_name World
extends Node3D
## Мир сцены: свет, небо, земля, дороги и разметка, официальные знаки, растения.
## Метры. Движение правостороннее, ученик смотрит вдоль -z, +x справа.

const NOISE: Texture2D = preload("res://materials/noise_detail.tres")
const CLOUDS: Texture2D = preload("res://materials/noise_clouds.tres")
const SKY: Shader = preload("res://shaders/sky.gdshader")
const SURFACE: Shader = preload("res://shaders/surface.gdshader")
const PAINT: Shader = preload("res://shaders/paint.gdshader")
const BARK: Material = preload("res://materials/bark.tres")
const PINE_BARK: Material = preload("res://materials/pine_bark.tres")
const ROCK: Material = preload("res://materials/rock.tres")
const LEAVES_BROAD: Material = preload("res://materials/leaves_broad.tres")
const LEAVES_BUSH: Material = preload("res://materials/leaves_bush.tres")
const LEAVES_PINE: Material = preload("res://materials/leaves_pine.tres")

const YELLOW := Color(0.86, 0.66, 0.1)
const ME_COLOR := Color(0.1, 0.3, 0.72)
const WHITE := Color(0.92, 0.91, 0.87)

var camera: Camera3D
var hour_override: float = -1.0
## Высота дороги и земли в точке z, если сцена не плоская.
var elev: Callable = Callable()
var _badges: Array = []
## Проезжая часть: [путь, полуширина]. Здесь не должно быть ничего неподвижного.
var _corridors: Array = []
## Дорога с обочиной на загородной сцене: [путь, полуширина].
var _strips: Array = []
## Газоны, уже сжатые на вылет травинок. Если они есть в сцене, трава растёт только на них.
var _lawns: Array = []
## Сколько пучков травы не посажено, потому что они попали на покрытие.
var tufts_dropped: int = 0
var _plant_radius: Dictionary = {}
## Дымка: множитель плотности тумана и воздушной перспективы.
const HAZE: float = 1.08
const CLEARANCE: float = 4.5
## Вылет травинок от центра пучка при самом большом масштабе.
const TUFT_MARGIN: float = 0.35
const TREE_MARGIN: float = 0.3
const PLANT_SEEDS: Dictionary = {"pine": [31, 37, 43], "broad": [11, 17, 23], "bush": [51, 53], "rock": [61, 67, 71]}
var rng := RandomNumberGenerator.new()
var environment: Environment
var _paints: Dictionary = {}
var _plants: Dictionary = {}
var _tufts: Array[Transform3D] = []
var _official_text: String = ""


func _init() -> void:
	rng.seed = 41


func h(z: float) -> float:
	return elev.call(z) if elev.is_valid() else 0.0


# ---- свет и небо -------------------------------------------------------------
func setup_light(scene_hour: float = 11.0, turn: float = 0.0, clouds: float = 0.42, view: Vector2 = Vector2.ZERO) -> void:
	var hour: float = scene_hour if hour_override < 0.0 else hour_override
	RenderingServer.global_shader_parameter_set(&"island_noise", NOISE)
	RenderingServer.global_shader_parameter_set(&"wind", Vector2.ZERO)
	var sky_mat := ShaderMaterial.new()
	sky_mat.shader = SKY
	sky_mat.set_shader_parameter("cloud_noise", CLOUDS)
	sky_mat.set_shader_parameter("cloud_cover", clouds)
	sky_mat.set_shader_parameter("cloud_speed", 0.0)
	var sky := Sky.new()
	sky.sky_material = sky_mat
	sky.radiance_size = Sky.RADIANCE_SIZE_256
	environment = Environment.new()
	environment.background_mode = Environment.BG_SKY
	environment.sky = sky
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	environment.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	environment.tonemap_mode = Environment.TONE_MAPPER_AGX
	environment.ssao_enabled = true
	environment.ssao_radius = 1.6
	environment.ssao_intensity = 2.4
	environment.ssr_enabled = true
	environment.sdfgi_enabled = true
	environment.sdfgi_use_occlusion = true
	environment.sdfgi_cascades = 5
	environment.sdfgi_min_cell_size = 0.2
	environment.sdfgi_energy = 1.1
	environment.glow_enabled = true
	environment.glow_intensity = 0.4
	environment.glow_bloom = 0.03
	environment.glow_hdr_threshold = 1.6
	environment.fog_enabled = true
	environment.fog_mode = Environment.FOG_MODE_EXPONENTIAL
	environment.fog_aerial_perspective = 0.55 * HAZE
	environment.fog_sky_affect = 0.12
	environment.adjustment_enabled = true
	environment.adjustment_saturation = 1.18
	var world_env := WorldEnvironment.new()
	world_env.environment = environment
	add_child(world_env)

	var sun := DirectionalLight3D.new()
	sun.shadow_enabled = true
	sun.shadow_bias = 0.05
	sun.shadow_normal_bias = 1.2
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS
	sun.directional_shadow_blend_splits = true
	sun.directional_shadow_max_distance = 320.0
	sun.light_angular_distance = 1.0
	add_child(sun)

	# Положение солнца и оттенки как в DayNight «Острова».
	var angle: float = (hour - 6.0) / 24.0 * TAU
	var tilt: float = 0.6
	var local := Vector3(cos(angle), sin(angle) * cos(tilt), sin(angle) * sin(tilt))
	var sun_vector: Vector3 = local.rotated(Vector3.UP, PI * 0.75 + turn).normalized()
	if view != Vector2.ZERO:
		# Солнце за спиной камеры и чуть сбоку: сцена хорошо видна, тени падают вперёд.
		var target: Vector2 = (-view.normalized()).rotated(0.75)
		sun_vector = local.rotated(Vector3.UP, atan2(target.x, target.y) - atan2(local.x, local.z)).normalized()
	var moon_vector: Vector3 = (-sun_vector + Vector3(0.22, 0.28, -0.14)).normalized()
	var elevation: float = sun_vector.y
	var day: float = smoothstep(-0.04, 0.3, elevation)
	var low_sun: float = smoothstep(-0.14, 0.03, elevation) * (1.0 - smoothstep(0.05, 0.42, elevation))
	var night: float = 1.0 - smoothstep(-0.22, -0.02, elevation)
	sun.basis = Basis.looking_at(-sun_vector, Vector3.UP)
	sun.light_color = Color(1.0, 0.62, 0.32).lerp(Color(1.0, 0.96, 0.89), day)
	sun.light_energy = smoothstep(-0.05, 0.1, elevation) * lerpf(1.7, 2.35, day)
	RenderingServer.global_shader_parameter_set(&"sun_dir", sun_vector)
	RenderingServer.global_shader_parameter_set(&"moon_dir", moon_vector)
	RenderingServer.global_shader_parameter_set(&"daylight", clampf(day + low_sun * 0.35 + 0.02, 0.0, 1.0))
	var fog_tint: Color = Color(0.68, 0.79, 0.92).lerp(Color(0.92, 0.62, 0.42), low_sun).lerp(Color(0.035, 0.055, 0.11), night)
	environment.fog_light_color = fog_tint
	environment.fog_sun_scatter = lerpf(0.02, 0.14, low_sun)
	environment.fog_density = lerpf(0.00018, 0.00034, maxf(low_sun, night)) * HAZE
	environment.ambient_light_energy = lerpf(1.0, 0.9, day) + night * 0.6
	environment.tonemap_exposure = lerpf(1.0, 1.25, night)


## Дальние горы вокруг всей сцены.
func hills() -> void:
	var noise := FastNoiseLite.new()
	noise.seed = 19
	noise.frequency = 0.00042
	noise.fractal_octaves = 6
	noise.fractal_type = FastNoiseLite.FRACTAL_RIDGED
	noise.fractal_gain = 0.55
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var size: int = 320
	var span: float = 12000.0
	var height := func(x: float, z: float) -> float:
		var d: float = Vector2(x, z).length()
		var n: float = noise.get_noise_2d(x, z) * 0.5 + 0.5
		return smoothstep(1300.0, 5000.0, d) * (30.0 + n * n * 760.0) - 0.6
	var tint := func(y: float, n: float) -> Color:
		if y > 640.0 + n * 90.0:
			return Color(0.86, 0.89, 0.92)
		if y > 470.0 + n * 50.0:
			return Color(0.3, 0.31, 0.3)
		return Color(0.05 + n * 0.05, 0.11 + n * 0.08, 0.06)
	for i: int in size:
		for j: int in size:
			var x0: float = -span / 2.0 + span * i / size
			var z0: float = -span / 2.0 + span * j / size
			var s: float = span / size
			var corners: Array = [Vector2(x0, z0), Vector2(x0 + s, z0), Vector2(x0 + s, z0 + s), Vector2(x0, z0 + s)]
			for k: int in [0, 1, 2, 0, 2, 3]:
				var c: Vector2 = corners[k]
				var y: float = height.call(c.x, c.y)
				st.set_color(tint.call(y, noise.get_noise_2d(c.x * 5.0, c.y * 5.0) * 0.5 + 0.5))
				st.add_vertex(Vector3(c.x, y, c.y))
	st.generate_normals()
	var m := ShaderMaterial.new()
	m.shader = preload("res://shaders/hills.gdshader")
	m.set_shader_parameter("noise", NOISE)
	st.set_material(m)
	var inst := MeshInstance3D.new()
	inst.mesh = st.commit()
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	inst.set_meta("flat", true)
	add_child(inst)


# ---- материалы поверхностей ---------------------------------------------------
func surface(a: Color, b: Color, params: Dictionary = {}) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = SURFACE
	m.set_shader_parameter("noise", NOISE)
	m.set_shader_parameter("color_a", a)
	m.set_shader_parameter("color_b", b)
	for k: String in params:
		m.set_shader_parameter(k, params[k])
	return m


func asphalt(tracks: float = 0.1) -> ShaderMaterial:
	return surface(Color(0.225, 0.22, 0.21), Color(0.3, 0.295, 0.285), {"fine_scale": 2.7, "fine_amount": 0.62, "mid_amount": 0.14, "big_amount": 0.24, "mid_scale": 0.31, "big_scale": 0.031, "rough": 0.92, "bump": 0.06, "wheel_tracks": tracks})


func grass_ground() -> ShaderMaterial:
	return surface(Color(0.2, 0.31, 0.1), Color(0.37, 0.45, 0.16), {"fine_scale": 0.9, "mid_scale": 0.11, "big_scale": 0.012, "rough": 1.0, "bump": 1.0})


func gravel() -> ShaderMaterial:
	return surface(Color(0.36, 0.33, 0.28), Color(0.55, 0.51, 0.44), {"fine_scale": 2.6, "fine_amount": 0.72, "mid_amount": 0.2, "big_amount": 0.08, "rough": 1.0, "bump": 1.0})


func pavement() -> ShaderMaterial:
	return surface(Color(0.5, 0.49, 0.46), Color(0.62, 0.61, 0.57), {"fine_scale": 1.6, "rough": 0.88, "bump": 0.25, "slab_size": 0.7})


func kerb() -> ShaderMaterial:
	return surface(Color(0.55, 0.54, 0.5), Color(0.68, 0.67, 0.63), {"rough": 0.8, "bump": 0.3})


func add_mesh(mesh: Mesh, shadow: bool = false) -> MeshInstance3D:
	var i := MeshInstance3D.new()
	i.mesh = mesh
	i.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	i.set_meta("flat", true)
	add_child(i)
	return i


func ground(size: float = 3200.0) -> void:
	var p := PlaneMesh.new()
	p.size = Vector2(size, size)
	p.material = grass_ground()
	add_mesh(p).position.y = -0.03


# ---- пути и дороги -----------------------------------------------------------
static func straight(x0: float, z0: float, x1: float, z1: float, step: float = 4.0) -> PackedVector2Array:
	var n: int = maxi(1, roundi(Vector2(x1 - x0, z1 - z0).length() / step))
	var out := PackedVector2Array()
	for i: int in n + 1:
		out.push_back(Vector2(x0, z0).lerp(Vector2(x1, z1), float(i) / n))
	return out


static func spline(points: Array, step: float = 1.5) -> PackedVector2Array:
	var curve := Curve2D.new()
	curve.bake_interval = step
	for i: int in points.size():
		var p := Vector2(points[i][0], points[i][1])
		var prev := Vector2(points[maxi(i - 1, 0)][0], points[maxi(i - 1, 0)][1])
		var next := Vector2(points[mini(i + 1, points.size() - 1)][0], points[mini(i + 1, points.size() - 1)][1])
		var t: Vector2 = (next - prev) * 0.25
		curve.add_point(p, -t, t)
	return curve.get_baked_points()


static func length_of(path: PackedVector2Array) -> float:
	var l: float = 0.0
	for i: int in range(1, path.size()):
		l += path[i].distance_to(path[i - 1])
	return l


static func cut(path: PackedVector2Array, s0: float, s1: float) -> PackedVector2Array:
	var out := PackedVector2Array()
	var s: float = 0.0
	for i: int in path.size():
		if i > 0:
			var seg: float = path[i].distance_to(path[i - 1])
			for t: float in [s0, s1]:
				if t > s and t < s + seg:
					out.push_back(path[i - 1].lerp(path[i], (t - s) / seg))
			s += seg
		if s >= s0 and s <= s1:
			out.push_back(path[i])
	return out


## Точка пути: положение и вектор вправо.
static func at(path: PackedVector2Array, s: float) -> Array:
	var run: float = 0.0
	for i: int in range(1, path.size()):
		var seg: float = path[i].distance_to(path[i - 1])
		if run + seg >= s:
			var d: Vector2 = (path[i] - path[i - 1]).normalized()
			return [path[i - 1].lerp(path[i], (s - run) / seg), Vector2(-d.y, d.x), d]
		run += seg
	var e: Vector2 = (path[path.size() - 1] - path[path.size() - 2]).normalized()
	return [path[path.size() - 1], Vector2(-e.y, e.x), e]


func road(path: PackedVector2Array, half: float, shoulder: float = 0.8, tracks: float = 0.12) -> void:
	_strips.push_back([_simplified(path), half + shoulder])
	if shoulder > 0.0:
		add_mesh(Mesher.strip(path, -half - shoulder, half + shoulder, -0.012, gravel(), elev))
	add_mesh(Mesher.strip(path, -half, half, 0.0, asphalt(tracks), elev))


func _paint(color: Color, wear: float) -> ShaderMaterial:
	var key: String = "%s-%.2f" % [color.to_html(), wear]
	if not _paints.has(key):
		var m := ShaderMaterial.new()
		m.shader = PAINT
		m.set_shader_parameter("noise", NOISE)
		m.set_shader_parameter("color", color)
		m.set_shader_parameter("wear", wear)
		_paints[key] = m
	return _paints[key]


## Линия краски: сплошная, или штрихи `dash` метров с промежутками `gap`.
func line(path: PackedVector2Array, offset: float, color: Color, width: float = 0.12, dash: float = 0.0, gap: float = 0.0, from: float = 0.0, to: float = INF, wear: float = 0.4) -> void:
	var total: float = minf(to, length_of(path))
	var mat: ShaderMaterial = _paint(color, wear)
	if dash <= 0.0:
		add_mesh(Mesher.strip(cut(path, from, total), offset - width / 2.0, offset + width / 2.0, 0.015, mat, elev))
		return
	var s: float = from
	while s < total:
		var c: PackedVector2Array = cut(path, s, minf(s + dash, total))
		if c.size() > 1:
			add_mesh(Mesher.strip(c, offset - width / 2.0, offset + width / 2.0, 0.015, mat, elev))
		s += dash + gap


## Прямоугольник краски в мировых координатах.
func bar(x0: float, z0: float, x1: float, z1: float, color: Color = WHITE, wear: float = 0.3) -> void:
	var path := PackedVector2Array([Vector2(x0, (z0 + z1) / 2.0), Vector2(x1, (z0 + z1) / 2.0)])
	var half: float = absf(z1 - z0) / 2.0
	add_mesh(Mesher.strip(path, -half, half, 0.015, _paint(color, wear)))


## Участок с тротуаром: приподнятая плита со скруглённым бордюром, дальше трава.
func lot(x0: float, z0: float, sx: float, sz: float, w: float, d: float, radius: float = 6.0, walk: float = 2.5, with_grass: bool = true) -> void:
	var outline := func(x: float, z: float, ww: float, dd: float, r: float) -> PackedVector2Array:
		var p := PackedVector2Array()
		p.push_back(Vector2(x + sx * ww, z))
		p.push_back(Vector2(x + sx * ww, z + sz * dd))
		p.push_back(Vector2(x, z + sz * dd))
		if r > 0.0:
			for k: int in 13:
				var t: float = float(k) / 12.0
				var a := Vector2(x, z + sz * r)
				var c := Vector2(x, z)
				var b := Vector2(x + sx * r, z)
				var q: Vector2 = a.lerp(c, t).lerp(c.lerp(b, t), t)
				p.push_back(q)
		else:
			p.push_back(Vector2(x, z))
		return p
	var pave: PackedVector2Array = outline.call(x0, z0, w, d, radius)
	add_mesh(Mesher.prism(pave, -0.02, 0.14, pavement(), kerb()))
	if with_grass:
		var g: PackedVector2Array = outline.call(x0 + sx * walk, z0 + sz * walk, w - walk, d - walk, maxf(0.0, radius - walk))
		add_mesh(Mesher.prism(g, 0.1, 0.17, grass_ground(), kerb()))
		_lawns.append_array(Geometry2D.offset_polygon(g, -TUFT_MARGIN))


# ---- знаки: официальные рисунки на столбе ------------------------------------------
func _official(id: String) -> Array:
	if _official_text.is_empty():
		var path: String = ProjectSettings.globalize_path("res://").path_join("../src/components/figures/signs/official.ts")
		_official_text = FileAccess.get_file_as_string(path)
	var re := RegEx.create_from_string("(?m)^\\s*" + id + ": \\{ nr: '[^']*', vb: '([^']*)', svg: \"((?:[^\"\\\\]|\\\\.)*)\"")
	var m: RegExMatch = re.search(_official_text)
	assert(m != null, "нет знака " + id)
	return [m.get_string(1), m.get_string(2).replace('\\"', '"').replace("\\\\", "\\")]


func _sign_image(id: String) -> Image:
	var o: Array = _official(id)
	var vb: PackedStringArray = o[0].split(" ")
	var w: float = float(vb[2])
	var h: float = float(vb[3])
	var img := Image.new()
	img.load_svg_from_string('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s" width="1024" height="%d">%s</svg>' % [o[0], roundi(1024.0 * h / w), o[1]])
	img.convert(Image.FORMAT_RGBA8)
	return img


func _flat_material(texture: Texture2D) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_texture = texture
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA_SCISSOR
	m.alpha_scissor_threshold = 0.5
	m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	return m


## yaw 0: знак смотрит на водителя, едущего вдоль -z. `under`: строки таблички.
func road_sign(id: String, x: float, z: float, width: float = 0.95, bottom: float = 1.9, yaw: float = 0.0, under: Array = [], base: float = 0.0) -> Node3D:
	var g := Node3D.new()
	g.position = Vector3(x, base, z)
	g.rotation.y = yaw
	add_child(g)
	var steel := StandardMaterial3D.new()
	steel.albedo_color = Color(0.56, 0.58, 0.6)
	steel.metallic = 0.6
	steel.roughness = 0.45
	var back_mat := StandardMaterial3D.new()
	back_mat.albedo_color = Color(0.42, 0.43, 0.44)
	back_mat.metallic = 0.3
	back_mat.roughness = 0.5
	var top: float = bottom
	if not under.is_empty():
		var lh: float = width * 0.27
		var ph: float = lh * under.size() + width * 0.05
		var frame := Image.new()
		frame.load_svg_from_string('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 %d" width="512" height="%d"><rect width="100" height="%d" fill="#111"/><rect x="2.500" y="2.500" width="95" height="%d" fill="#fff"/></svg>' % [roundi(100.0 * ph / width), roundi(512.0 * ph / width), roundi(100.0 * ph / width), roundi(100.0 * ph / width) - 5])
		frame.generate_mipmaps()
		var q := QuadMesh.new()
		q.size = Vector2(width, ph)
		q.material = _flat_material(ImageTexture.create_from_image(frame))
		var pm := MeshInstance3D.new()
		pm.mesh = q
		pm.position = Vector3(0.0, top + ph / 2.0, 0.03)
		g.add_child(pm)
		var bb := BoxMesh.new()
		bb.size = Vector3(width, ph, 0.02)
		bb.material = back_mat
		var bi := MeshInstance3D.new()
		bi.mesh = bb
		bi.position = Vector3(0.0, top + ph / 2.0, 0.015)
		g.add_child(bi)
		var font := SystemFont.new()
		font.font_names = PackedStringArray(["Liberation Sans", "Arial", "DejaVu Sans"])
		font.font_weight = 700
		for i: int in under.size():
			var text: String = under[i]["text"]
			var label := Label3D.new()
			label.text = text
			label.font = font
			label.font_size = 96
			label.outline_size = 0
			label.modulate = Color(0.8, 0.09, 0.07) if under[i].get("red", false) else Color(0.03, 0.03, 0.03)
			label.shaded = false
			label.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
			var px: float = lh * 0.82 / 96.0 * 0.98
			var tw: float = font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, 96).x * px
			if tw > width * 0.86:
				px *= width * 0.86 / tw
			label.pixel_size = px
			label.position = Vector3(0.0, top + ph - width * 0.025 - lh * (i + 0.5), 0.036)
			g.add_child(label)
		top += ph + 0.05
	var img: Image = _sign_image(id)
	var h: float = width * float(img.get_height()) / img.get_width()
	var mask: Image = img.duplicate()
	img.generate_mipmaps()
	var face := QuadMesh.new()
	face.size = Vector2(width, h)
	face.material = _flat_material(ImageTexture.create_from_image(img))
	var fi := MeshInstance3D.new()
	fi.mesh = face
	fi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	fi.position = Vector3(0.0, top + h / 2.0, 0.03)
	g.add_child(fi)
	mask.resize(256, roundi(256.0 * h / width))
	for yy: int in mask.get_height():
		for xx: int in mask.get_width():
			mask.set_pixel(xx, yy, Color(0.45, 0.46, 0.47, mask.get_pixel(xx, yy).a))
	mask.generate_mipmaps()
	var back := QuadMesh.new()
	back.size = Vector2(width, h)
	var bm := StandardMaterial3D.new()
	bm.albedo_texture = ImageTexture.create_from_image(mask)
	bm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA_SCISSOR
	bm.alpha_scissor_threshold = 0.5
	bm.metallic = 0.3
	bm.roughness = 0.5
	back.material = bm
	var bk := MeshInstance3D.new()
	bk.mesh = back
	bk.rotation.y = PI
	bk.position = Vector3(0.0, top + h / 2.0, 0.025)
	g.add_child(bk)
	var pole := CylinderMesh.new()
	var pole_h: float = top + h * 0.85
	pole.top_radius = 0.035
	pole.bottom_radius = 0.035
	pole.height = pole_h
	pole.radial_segments = 12
	pole.material = steel
	var pi2 := MeshInstance3D.new()
	pi2.mesh = pole
	pi2.position = Vector3(0.0, pole_h / 2.0, -0.05)
	g.add_child(pi2)
	return g


# ---- машины и люди ------------------------------------------------------------
func car(color: Color, x: float, z: float, yaw: float = 0.0, kind: String = "sedan") -> Node3D:
	var c: Node3D = Car.make(color, kind)
	c.position = Vector3(x, 0.0, z)
	c.rotation.y = yaw
	add_mover(c)
	return c


func person(x: float, z: float, yaw: float, top: Color, legs: Color, base: float = 0.0, height: float = 1.76) -> Node3D:
	var p: Node3D = Person.make(top, legs, Color(0.86, 0.66, 0.53), Color(0.2, 0.13, 0.08), height)
	p.position = Vector3(x, base, z)
	p.rotation.y = yaw
	add_mover(p)
	return p


## Камера чуть выше и позади точки `at`, смотрит вдоль heading (x, z).
func chase(at: Vector3, heading: Vector2, back: float = 8.5, up: float = 3.0, ahead: float = 18.0, look_y: float = 0.4, fov: float = 46.0) -> void:
	camera = Camera3D.new()
	camera.fov = fov
	camera.near = 0.2
	camera.far = 14000.0
	var d := Vector3(heading.x, 0.0, heading.y).normalized()
	camera.position = at - d * back + Vector3.UP * up
	add_child(camera)
	camera.look_at(at + d * ahead + Vector3.UP * look_y, Vector3.UP)
	camera.current = true


## Своя машина с камерой позади: синий цвет, как «ты» на схемах.
func driver(x: float, z: float, look_x: float = INF, look_z: float = INF, kind: String = "hatch") -> Node3D:
	var dx: float = 0.0 if is_inf(look_x) else look_x - x
	var dz: float = -60.0 if is_inf(look_z) else look_z - z
	var own: Node3D = car(ME_COLOR, x, z, atan2(-dx, -dz), kind)
	own.position.y = h(z)
	chase(own.position, Vector2(dx, dz), 10.0, 3.7, 20.0, 0.3, 46.0)
	return own


## Подпись над машиной или человеком: кружок с буквой всегда виден и одного размера на экране.
func badge(at: Vector3, text: String, color: Color) -> void:
	_badges.push_back([at, text, color])


func _make_badges() -> void:
	var font := SystemFont.new()
	font.font_names = PackedStringArray(["Liberation Sans", "Arial", "DejaVu Sans"])
	font.font_weight = 800
	for b: Array in _badges:
		var at: Vector3 = b[0]
		var dist: float = camera.position.distance_to(at)
		var size: float = dist * 0.066
		var img := Image.new()
		img.load_svg_from_string('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100" width="256" height="256"><circle r="46" fill="#%s" stroke="#fff" stroke-width="7"/></svg>' % b[2].to_html(false))
		img.generate_mipmaps()
		var q := QuadMesh.new()
		q.size = Vector2(size, size)
		var m := StandardMaterial3D.new()
		m.albedo_texture = ImageTexture.create_from_image(img)
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		m.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
		m.no_depth_test = true
		m.render_priority = 2
		q.material = m
		var disc := MeshInstance3D.new()
		disc.mesh = q
		disc.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		disc.position = at + Vector3.UP * (size * 0.5 + 0.25)
		disc.set_meta("flat", true)
		add_child(disc)
		var label := Label3D.new()
		label.text = b[1]
		label.font = font
		label.font_size = 128
		label.outline_size = 0
		label.modulate = Color.WHITE
		label.shaded = false
		label.no_depth_test = true
		label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		label.render_priority = 3
		var small: float = 0.5 if String(b[1]).length() > 1 else 0.68
		label.pixel_size = size * small / 128.0
		label.position = disc.position
		add_child(label)


## Стрелка пути на дороге: штрихи и наконечник.
func arrow(points: PackedVector2Array, color: Color, width: float = 0.46) -> void:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(color.r, color.g, color.b, 0.92)
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	var total: float = length_of(points)
	var head_len: float = 1.5
	var s: float = 0.0
	while s < total - head_len:
		var c: PackedVector2Array = cut(points, s, minf(s + 1.25, total - head_len))
		if c.size() > 1:
			add_mesh(Mesher.strip(c, -width / 2.0, width / 2.0, 0.035 + h(0.0), m))
		s += 2.05
	var end: Array = at(points, total - head_len)
	var base: Vector2 = end[0]
	var right: Vector2 = end[1]
	var dir: Vector2 = end[2]
	var poly := PackedVector2Array([base + right * 0.85, base + dir * head_len, base - right * 0.85])
	add_mesh(Mesher.prism(poly, 0.03, 0.036, m, m))


## Рельсы: два тёмных желоба вдоль пути.
func rails(path: PackedVector2Array, offset: float) -> void:
	var dark: ShaderMaterial = _paint(Color(0.1, 0.1, 0.11), 0.0)
	var steel: ShaderMaterial = _paint(Color(0.55, 0.56, 0.58), 0.1)
	for g: float in [-0.72, 0.72]:
		add_mesh(Mesher.strip(path, offset + g - 0.075, offset + g + 0.075, 0.016, dark))
		add_mesh(Mesher.strip(path, offset + g - 0.075, offset + g - 0.02, 0.018, steel))
		add_mesh(Mesher.strip(path, offset + g + 0.02, offset + g + 0.075, 0.018, steel))


## Многоугольник краски на дороге (треугольники «зубов дракона», стрелки).
func paint_poly(points: PackedVector2Array, color: Color = WHITE) -> void:
	var m: ShaderMaterial = _paint(color, 0.3)
	var inst := add_mesh(Mesher.prism(points, 0.012, 0.016, m, m))
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF


## Надпись краской на дороге. reading: куда идёт текст (x, z). stretch растягивает вдоль направления водителя.
func road_text(text: String, x: float, z: float, size: float, reading: Vector2, stretch: float = 1.0, color: Color = WHITE) -> void:
	var font := SystemFont.new()
	font.font_names = PackedStringArray(["Liberation Sans", "Arial", "DejaVu Sans"])
	font.font_weight = 700
	var label := Label3D.new()
	label.text = text
	label.font = font
	label.font_size = 128
	label.outline_size = 0
	label.modulate = Color(color.r, color.g, color.b, 0.9)
	label.shaded = false
	label.pixel_size = size / 128.0
	var r := Vector3(reading.x, 0.0, reading.y).normalized()
	var up_on_road: Vector3 = Vector3.UP.cross(r).normalized()
	label.basis = Basis(r, up_on_road * stretch, Vector3.UP)
	label.position = Vector3(x, 0.022 + h(z), z)
	add_child(label)


## Рисунок из SVG, лежащий на дороге, верх рисунка смотрит вдоль -z.
func road_decal(svg: String, x: float, z: float, width: float, length: float) -> void:
	var img := Image.new()
	img.load_svg_from_string(svg)
	img.generate_mipmaps()
	var q := PlaneMesh.new()
	q.size = Vector2(width, length)
	var m := StandardMaterial3D.new()
	m.albedo_texture = ImageTexture.create_from_image(img)
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.roughness = 0.75
	m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	q.material = m
	var i := add_mesh(q)
	i.position = Vector3(x, 0.02 + h(z), z)


# ---- растения --------------------------------------------------------------------
## kind: pine, broad, bush, rock. Собираются в finish(), детализация по расстоянию до камеры.
func plant(kind: String, x: float, z: float, scale_value: float = 1.0, base: float = 0.0, pick: int = -1) -> void:
	if not _plants.has(kind):
		_plants[kind] = []
	_plants[kind].push_back([Vector3(x, base + h(z), z), scale_value, rng.randf() * TAU, rng.randi() if pick < 0 else pick])


## Посадить, только если самая широкая часть этого растения не задевает проезжую часть.
func plant_free(kind: String, x: float, z: float, scale_value: float = 1.0, base: float = 0.0) -> void:
	var pick: int = rng.randi()
	if road_free(x, z, _radius_of(kind, pick) * scale_value + TREE_MARGIN):
		plant(kind, x, z, scale_value, base, pick)


## Радиус растения по настоящей сетке: кончики самых длинных ветвей.
func _radius_of(kind: String, pick: int) -> float:
	var seed_value: int = PLANT_SEEDS[kind][pick % PLANT_SEEDS[kind].size()]
	var key: String = "%s-%d" % [kind, seed_value]
	if not _plant_radius.has(key):
		var box: AABB = _species(kind, seed_value, 0).get_aabb()
		_plant_radius[key] = maxf(maxf(absf(box.position.x), absf(box.end.x)), maxf(absf(box.position.z), absf(box.end.z)))
	return _plant_radius[key]


## Отметить проезжую часть: путь и половина ширины.
func keep_clear(path: PackedVector2Array, half: float) -> void:
	_corridors.push_back([_simplified(path), half])


## Путь без промежуточных точек на прямых: проверки идут десятки тысяч раз.
func _simplified(path: PackedVector2Array) -> PackedVector2Array:
	var out := PackedVector2Array([path[0]])
	for i: int in range(1, path.size() - 1):
		var a: Vector2 = (path[i] - out[out.size() - 1]).normalized()
		var b: Vector2 = (path[i + 1] - path[i]).normalized()
		if absf(a.cross(b)) > 0.001:
			out.push_back(path[i])
	out.push_back(path[path.size() - 1])
	return out


## Можно ли здесь расти траве: не на проезжей части и обочине, а на сцене с газонами только на газоне.
func grass_free(x: float, z: float) -> bool:
	var q := Vector2(x, z)
	for list: Array in [_corridors, _strips]:
		for c: Array in list:
			var path: PackedVector2Array = c[0]
			var limit: float = float(c[1]) + TUFT_MARGIN
			for i: int in range(1, path.size()):
				if Geometry2D.get_closest_point_to_segment(q, path[i - 1], path[i]).distance_to(q) < limit:
					return false
	if _lawns.is_empty():
		return true
	for g: PackedVector2Array in _lawns:
		if Geometry2D.is_point_in_polygon(q, g):
			return true
	return false


## Свободна ли точка: круг радиуса radius не касается ни одной проезжей части.
func road_free(x: float, z: float, radius: float) -> bool:
	var q := Vector2(x, z)
	for c: Array in _corridors:
		var path: PackedVector2Array = c[0]
		var limit: float = float(c[1]) + radius
		for i: int in range(1, path.size()):
			if Geometry2D.get_closest_point_to_segment(q, path[i - 1], path[i]).distance_to(q) < limit:
				return false
	return true


## Транспорт и люди могут быть на дороге, остальное нет.
func add_mover(node: Node3D) -> void:
	node.set_meta("mover", true)
	add_child(node)


func _rect_free(rect: Rect2) -> bool:
	for c: Array in _corridors:
		var path: PackedVector2Array = c[0]
		var grown: Rect2 = rect.grow(float(c[1]))
		for i: int in range(1, path.size()):
			var a: Vector2 = path[i - 1]
			var b: Vector2 = path[i]
			var n: int = maxi(1, ceili(a.distance_to(b) / 0.5))
			for k: int in n + 1:
				if grown.has_point(a.lerp(b, float(k) / n)):
					return false
	return true


## Проверка собранной сцены: на проезжей части нет деревьев, домов, столбов и знаков.
## Возвращает список нарушений. Пустой список значит, что картинку можно сохранять.
func audit() -> PackedStringArray:
	var bad := PackedStringArray()
	for kind: String in _plants:
		for p: Array in _plants[kind]:
			var r: float = _radius_of(kind, p[3]) * float(p[1])
			if not road_free(p[0].x, p[0].z, r):
				bad.push_back("%s (%.1f, %.1f), крона %.1f м, задевает проезжую часть" % [kind, p[0].x, p[0].z, r])
	_audit_node(self, bad)
	var wrong: int = 0
	var first := Vector3.ZERO
	for t: Transform3D in _tufts:
		if not grass_free(t.origin.x, t.origin.z):
			if wrong == 0:
				first = t.origin
			wrong += 1
	if wrong > 0:
		bad.push_back("трава: %d пучков на дороге или тротуаре, первый (%.1f, %.1f)" % [wrong, first.x, first.z])
	return bad


func _audit_node(node: Node, bad: PackedStringArray) -> void:
	for child: Node in node.get_children():
		if child.has_meta("mover") or child.has_meta("flat"):
			continue
		if child is MeshInstance3D:
			var box: AABB = child.global_transform * child.get_aabb()
			if box.position.y < CLEARANCE:
				var rect := Rect2(box.position.x, box.position.z, box.size.x, box.size.z)
				if not _rect_free(rect):
					bad.push_back("%s (%.1f, %.1f) стоит на проезжей части" % [child.name, box.get_center().x, box.get_center().z])
		_audit_node(child, bad)


func _species(kind: String, seed_value: int, lod: int) -> Mesh:
	match kind:
		"pine":
			return PlantMeshes.pine(lod, seed_value, PINE_BARK, LEAVES_PINE)
		"broad":
			return PlantMeshes.broadleaf(lod, seed_value, BARK, LEAVES_BROAD)
		"bush":
			return PlantMeshes.bush(mini(lod, 1), seed_value, LEAVES_BUSH)
		_:
			return PlantMeshes.rock(seed_value, ROCK)


func tufts_rect(x0: float, x1: float, z0: float, z1: float, count: int, base: float = 0.0) -> void:
	for i: int in count:
		_tuft(rng.randf_range(x0, x1), rng.randf_range(z0, z1), base)


func tufts_along(path: PackedVector2Array, a: float, b: float, count: int, to: float = INF) -> void:
	var total: float = minf(to, length_of(path))
	for i: int in count:
		var p: Array = at(path, rng.randf() * total)
		var q: Vector2 = p[0] + p[1] * rng.randf_range(a, b)
		_tuft(q.x, q.y, -0.03)


## force сажает без проверки: так самопроверка ставит ловушку для audit.
func _tuft(x: float, z: float, base: float, force: bool = false) -> void:
	var b := Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3.ONE * rng.randf_range(0.7, 1.5))
	if not force and not grass_free(x, z):
		tufts_dropped += 1
		return
	_tufts.push_back(Transform3D(b, Vector3(x, base + h(z), z)))


func _tuft_mesh() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var r := RandomNumberGenerator.new()
	r.seed = 3
	for blade: int in 9:
		var a: float = r.randf() * TAU
		var d := Vector3(cos(a), 0.0, sin(a))
		var side := Vector3(-d.z, 0.0, d.x)
		var o: Vector3 = d * r.randf_range(0.0, 0.09)
		var h: float = r.randf_range(0.14, 0.3)
		var w: float = r.randf_range(0.009, 0.016)
		var lean: float = r.randf_range(0.04, 0.14)
		var base_c := Color(0.1, 0.17, 0.05)
		var tip_c := Color(0.2, 0.3, 0.09).lerp(Color(0.3, 0.36, 0.12), r.randf() * 0.5)
		var p0: Vector3 = o - side * w
		var p1: Vector3 = o + side * w
		var p2: Vector3 = o + d * lean * 0.4 + Vector3.UP * h * 0.6 - side * w * 0.7
		var p3: Vector3 = o + d * lean * 0.4 + Vector3.UP * h * 0.6 + side * w * 0.7
		var p4: Vector3 = o + d * lean + Vector3.UP * h
		for tri: Array in [[p0, p1, p3, base_c, base_c, tip_c.lerp(base_c, 0.4)], [p0, p3, p2, base_c, tip_c.lerp(base_c, 0.4), tip_c.lerp(base_c, 0.4)], [p2, p3, p4, tip_c.lerp(base_c, 0.4), tip_c.lerp(base_c, 0.4), tip_c]]:
			for k: int in 3:
				st.set_color(tri[k + 3])
				st.set_normal(Vector3.UP)
				st.add_vertex(tri[k])
	var m := StandardMaterial3D.new()
	m.vertex_color_use_as_albedo = true
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.roughness = 0.95
	st.set_material(m)
	return st.commit()


## Собрать растения и траву. Вызывается после постановки камеры.
func finish() -> void:
	var eye: Vector3 = camera.global_position if camera.is_inside_tree() else camera.position
	var seeds: Dictionary = PLANT_SEEDS
	for kind: String in _plants:
		var groups: Dictionary = {}
		for p: Array in _plants[kind]:
			var dist: float = eye.distance_to(p[0])
			var lod: int = 0 if dist < 40.0 else (1 if dist < 150.0 else 2)
			if kind == "bush":
				lod = 0 if dist < 40.0 else 1
			if kind == "rock":
				lod = 0
			var seed_value: int = seeds[kind][p[3] % seeds[kind].size()]
			var key: String = "%d-%d" % [seed_value, lod]
			if not groups.has(key):
				groups[key] = {"seed": seed_value, "lod": lod, "items": []}
			groups[key]["items"].push_back(p)
		for key: String in groups:
			var mm := MultiMesh.new()
			mm.transform_format = MultiMesh.TRANSFORM_3D
			mm.mesh = _species(kind, groups[key]["seed"], groups[key]["lod"])
			var items: Array = groups[key]["items"]
			mm.instance_count = items.size()
			for i: int in items.size():
				var it: Array = items[i]
				mm.set_instance_transform(i, Transform3D(Basis(Vector3.UP, it[2]).scaled(Vector3.ONE * it[1]), it[0]))
			var inst := MultiMeshInstance3D.new()
			inst.multimesh = mm
			add_child(inst)
	_make_badges()
	if not _tufts.is_empty():
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = _tuft_mesh()
		mm.instance_count = _tufts.size()
		for i: int in _tufts.size():
			mm.set_instance_transform(i, _tufts[i])
		var inst := MultiMeshInstance3D.new()
		inst.multimesh = mm
		inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		add_child(inst)


# ---- уличная мелочь --------------------------------------------------------------
func lamp(x: float, z: float, side: float = -1.0, base: float = 0.14) -> void:
	var steel := StandardMaterial3D.new()
	steel.albedo_color = Color(0.4, 0.42, 0.44)
	steel.metallic = 0.5
	steel.roughness = 0.5
	var g := Node3D.new()
	g.position = Vector3(x, base, z)
	add_child(g)
	var pole := CylinderMesh.new()
	pole.top_radius = 0.045
	pole.bottom_radius = 0.085
	pole.height = 7.6
	pole.radial_segments = 12
	pole.material = steel
	var a := MeshInstance3D.new()
	a.mesh = pole
	a.position.y = 3.8
	g.add_child(a)
	g.add_child(_box(Vector3(1.5, 0.05, 0.05), Vector3(side * 0.72, 7.55, 0.0), steel))
	g.add_child(_box(Vector3(0.6, 0.09, 0.22), Vector3(side * 1.5, 7.52, 0.0), steel))


func _box(size: Vector3, pos: Vector3, material: Material) -> MeshInstance3D:
	var b := BoxMesh.new()
	b.size = size
	b.material = material
	var i := MeshInstance3D.new()
	i.mesh = b
	i.position = pos
	return i


## Столбики вдоль загородной дороги.
func posts(path: PackedVector2Array, offset: float, every: float = 25.0, start: float = 6.0) -> void:
	var white := StandardMaterial3D.new()
	white.albedo_color = Color(0.86, 0.86, 0.83)
	var black := StandardMaterial3D.new()
	black.albedo_color = Color(0.03, 0.03, 0.03)
	var s: float = start
	var total: float = length_of(path)
	while s < total:
		var p: Array = at(path, s)
		var q: Vector2 = p[0] + p[1] * offset
		add_child(_box(Vector3(0.1, 0.85, 0.1), Vector3(q.x, 0.42 + h(q.y), q.y), white))
		add_child(_box(Vector3(0.105, 0.18, 0.105), Vector3(q.x, 0.7 + h(q.y), q.y), black))
		s += every


## Отбойник из коротких звеньев и стоек.
func guardrail(path: PackedVector2Array, offset: float, from: float, to: float) -> void:
	var steel := StandardMaterial3D.new()
	steel.albedo_color = Color(0.62, 0.64, 0.66)
	steel.metallic = 0.65
	steel.roughness = 0.42
	var s: float = from
	while s < to:
		var a: Array = at(path, s)
		var b: Array = at(path, s + 2.0)
		var qa: Vector2 = a[0] + a[1] * offset
		var qb: Vector2 = b[0] + b[1] * offset
		var c: Vector2 = (qa + qb) / 2.0
		var link := BoxMesh.new()
		link.size = Vector3(0.05, 0.31, qa.distance_to(qb) + 0.05)
		link.material = steel
		var i := MeshInstance3D.new()
		i.mesh = link
		i.position = Vector3(c.x, 0.6, c.y)
		i.rotation.y = atan2(qb.x - qa.x, qb.y - qa.y)
		add_child(i)
		add_child(_box(Vector3(0.09, 0.62, 0.09), Vector3(qa.x, 0.31, qa.y), steel))
		s += 2.0
