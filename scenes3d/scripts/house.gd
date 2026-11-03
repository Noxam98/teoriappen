class_name House
extends RefCounted
## Норвежский дом: фундамент, обшивка, окна с переплётом, крыша с карнизами, дымоход, дверь с крыльцом.
## Фасад с дверью смотрит вдоль +z, конёк идёт вдоль x.


static func _std(c: Color, rough: float = 0.85, metal: float = 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = rough
	m.metallic = metal
	return m


static func _box(root: Node3D, size: Vector3, pos: Vector3, mat: Material, rot := Vector3.ZERO) -> MeshInstance3D:
	var b := BoxMesh.new()
	b.size = size
	b.material = mat
	var i := MeshInstance3D.new()
	i.mesh = b
	i.position = pos
	i.rotation = rot
	root.add_child(i)
	return i


static func _window(root: Node3D, x: float, y: float, z: float, yaw: float, w: float, h: float, frame: Material, glass: Material, panes: int = 2) -> void:
	var g := Node3D.new()
	g.position = Vector3(x, y, z)
	g.rotation.y = yaw
	root.add_child(g)
	_box(g, Vector3(w + 0.2, h + 0.2, 0.05), Vector3(0, 0, 0.02), frame)
	_box(g, Vector3(w, h, 0.04), Vector3(0, 0, 0.035), glass)
	for k: int in range(1, panes):
		_box(g, Vector3(0.05, h, 0.03), Vector3(-w / 2.0 + w * k / panes, 0, 0.055), frame)
	_box(g, Vector3(w, 0.05, 0.03), Vector3(0, h * 0.1, 0.055), frame)
	_box(g, Vector3(w + 0.3, 0.06, 0.14), Vector3(0, -h / 2.0 - 0.12, 0.06), frame)


static func make(w: float, d: float, h: float, wall: Color, roof_color: Color = Color(0.16, 0.16, 0.17), floors: int = 1, pitch: float = 2.6, shop: bool = false, door: bool = true) -> Node3D:
	var root := Node3D.new()
	var noise: Texture2D = preload("res://materials/noise_detail.tres")
	var siding := ShaderMaterial.new()
	siding.shader = preload("res://shaders/siding.gdshader")
	siding.set_shader_parameter("noise", noise)
	siding.set_shader_parameter("color", wall)
	var roof_mat := ShaderMaterial.new()
	roof_mat.shader = preload("res://shaders/roof.gdshader")
	roof_mat.set_shader_parameter("noise", noise)
	roof_mat.set_shader_parameter("color", roof_color)
	var trim: StandardMaterial3D = _std(Color(0.9, 0.89, 0.85), 0.7)
	var glass: StandardMaterial3D = _std(Color(0.05, 0.07, 0.09), 0.06, 0.6)
	var stone: StandardMaterial3D = _std(Color(0.42, 0.41, 0.39), 0.95)
	var plinth: float = 0.45
	_box(root, Vector3(w + 0.1, plinth, d + 0.1), Vector3(0, plinth / 2.0, 0), stone)
	_box(root, Vector3(w, h, d), Vector3(0, plinth + h / 2.0, 0), siding)
	for sx: float in [-1.0, 1.0]:
		for sz: float in [-1.0, 1.0]:
			_box(root, Vector3(0.14, h, 0.14), Vector3(sx * (w / 2.0 + 0.0), plinth + h / 2.0, sz * (d / 2.0 + 0.0)), trim)
	var top_y: float = plinth + h
	if pitch > 0.0:
		var half: float = d / 2.0 + 0.5
		var slope: float = sqrt(half * half + pitch * pitch)
		var angle: float = atan2(pitch, half)
		for sz: float in [-1.0, 1.0]:
			var slab := _box(root, Vector3(w + 0.7, 0.14, slope), Vector3(0, top_y + pitch / 2.0 - 0.02, sz * half / 2.0), roof_mat, Vector3(sz * angle, 0, 0))
			slab.mesh.material = roof_mat
		_box(root, Vector3(w + 0.72, 0.1, 0.2), Vector3(0, top_y + pitch + 0.03, 0), _std(roof_color * 0.8))
		# Фронтоны: треугольные стены по торцам.
		for sx: float in [-1.0, 1.0]:
			var st := SurfaceTool.new()
			st.begin(Mesh.PRIMITIVE_TRIANGLES)
			var nrm := Vector3(sx, 0, 0)
			var a := Vector3(sx * w / 2.0, top_y, -d / 2.0)
			var b := Vector3(sx * w / 2.0, top_y, d / 2.0)
			var c := Vector3(sx * w / 2.0, top_y + pitch * (d / 2.0) / half, 0)
			var tri: Array = [a, c, b] if sx > 0.0 else [a, b, c]
			for p: Vector3 in tri:
				st.set_normal(nrm)
				st.add_vertex(p)
			st.set_material(siding)
			var gi := MeshInstance3D.new()
			gi.mesh = st.commit()
			root.add_child(gi)
			_window(root, sx * (w / 2.0 + 0.0), top_y + 0.55, 0.0, sx * PI / 2.0, 0.8, 0.8, trim, glass, 2)
		# Карнизы.
		for sz: float in [-1.0, 1.0]:
			_box(root, Vector3(w + 0.7, 0.16, 0.05), Vector3(0, top_y - 0.08, sz * (d / 2.0 + 0.5)), trim)
		var brick: StandardMaterial3D = _std(Color(0.33, 0.17, 0.13), 0.95)
		_box(root, Vector3(0.6, 1.5, 0.6), Vector3(w * 0.22, top_y + pitch - 0.1, -0.7), brick)
		_box(root, Vector3(0.72, 0.1, 0.72), Vector3(w * 0.22, top_y + pitch + 0.68, -0.7), stone)
	else:
		_box(root, Vector3(w + 0.3, 0.32, d + 0.3), Vector3(0, top_y + 0.16, 0), _std(roof_color))
		_box(root, Vector3(w + 0.1, 0.2, d + 0.1), Vector3(0, top_y - 0.1, 0), trim)
	var storey: float = h / floors
	for fl: int in floors:
		var y: float = plinth + storey * (fl + 0.56)
		var front_shop: bool = shop and fl == 0
		var step: float = 3.6 if front_shop else 2.6
		var u: float = -w / 2.0 + 1.5
		while u <= w / 2.0 - 1.1:
			var near_door: bool = door and fl == 0 and absf(u) < 1.2 and not shop
			if not near_door:
				if front_shop:
					_window(root, u, plinth + 1.35, d / 2.0, 0.0, 2.8, 2.2, trim, glass, 1)
				else:
					_window(root, u, y, d / 2.0, 0.0, 1.2, 1.35, trim, glass)
			_window(root, u, y, -d / 2.0, PI, 1.2, 1.35, trim, glass)
			u += step
		var v: float = -d / 2.0 + 1.4
		while v <= d / 2.0 - 1.0:
			_window(root, w / 2.0, y, v, PI / 2.0, 1.1, 1.3, trim, glass)
			_window(root, -w / 2.0, y, v, -PI / 2.0, 1.1, 1.3, trim, glass)
			v += 2.6
	if door:
		var dc: StandardMaterial3D = _std(Color(0.25, 0.15, 0.1), 0.6)
		_box(root, Vector3(1.2, 2.25, 0.05), Vector3(0, plinth + 1.12, d / 2.0 + 0.02), trim)
		_box(root, Vector3(1.0, 2.1, 0.06), Vector3(0, plinth + 1.05, d / 2.0 + 0.04), dc)
		_box(root, Vector3(1.8, plinth * 0.5, 0.9), Vector3(0, plinth * 0.25, d / 2.0 + 0.45), stone)
		_box(root, Vector3(1.8, plinth * 0.95, 0.5), Vector3(0, plinth * 0.48, d / 2.0 + 0.25), stone)
	return root
