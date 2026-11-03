class_name Person
extends RefCounted
## Человек в шаге: нормальные пропорции, суставы, куртка и брюки. Смотрит вдоль -z.


static func make(top: Color, legs: Color, skin: Color = Color(0.86, 0.66, 0.53), hair: Color = Color(0.2, 0.13, 0.08), height: float = 1.76, stride: float = 0.42) -> Node3D:
	var root := Node3D.new()
	var mat := func(c: Color, rough: float = 0.85) -> StandardMaterial3D:
		var m := StandardMaterial3D.new()
		m.albedo_color = c
		m.roughness = rough
		return m
	var top_m: StandardMaterial3D = mat.call(top)
	var leg_m: StandardMaterial3D = mat.call(legs)
	var skin_m: StandardMaterial3D = mat.call(skin, 0.6)
	var hair_m: StandardMaterial3D = mat.call(hair, 0.75)
	var shoe_m: StandardMaterial3D = mat.call(Color(0.06, 0.06, 0.07), 0.55)
	var add := func(mesh: Mesh) -> void:
		var i := MeshInstance3D.new()
		i.mesh = mesh
		root.add_child(i)
	for side: float in [1.0, -1.0]:
		var swing: float = stride * side
		var hip := Vector3(side * 0.095, 0.93, 0.0)
		var knee_bend: float = 0.18 if side > 0.0 else 0.55
		var knee: Vector3 = hip + Vector3(0.0, -cos(swing) * 0.44, -sin(swing) * 0.44)
		var ankle: Vector3 = knee + Vector3(0.0, -cos(swing - knee_bend) * 0.42, -sin(swing - knee_bend) * 0.42)
		ankle.y = maxf(ankle.y, 0.08)
		add.call(Mesher.limb(hip, knee, 0.082, 0.062, leg_m))
		add.call(Mesher.limb(knee, ankle, 0.06, 0.042, leg_m))
		add.call(Mesher.limb(ankle + Vector3(0.0, -0.035, 0.05), ankle + Vector3(0.0, -0.045, -0.17), 0.05, 0.043, shoe_m))
		var arm_swing: float = -stride * side * 0.8
		var shoulder := Vector3(side * 0.195, 1.41, 0.0)
		var elbow: Vector3 = shoulder + Vector3(side * 0.03, -cos(arm_swing) * 0.27, -sin(arm_swing) * 0.27)
		var wrist: Vector3 = elbow + Vector3(0.0, -cos(arm_swing + 0.3) * 0.24, -sin(arm_swing + 0.3) * 0.24)
		add.call(Mesher.limb(shoulder, elbow, 0.06, 0.05, top_m))
		add.call(Mesher.limb(elbow, wrist, 0.05, 0.04, top_m))
		add.call(Mesher.limb(wrist, wrist + (wrist - elbow).normalized() * 0.08, 0.04, 0.035, skin_m))
	add.call(Mesher.tube([
		[Vector3(0, 0.86, 0), 0.16, 0.11],
		[Vector3(0, 0.96, 0), 0.175, 0.125],
		[Vector3(0, 1.10, 0), 0.155, 0.105],
		[Vector3(0, 1.30, 0), 0.19, 0.125],
		[Vector3(0, 1.42, 0), 0.195, 0.105],
		[Vector3(0, 1.475, 0), 0.10, 0.07],
		[Vector3(0, 1.50, 0), 0.055, 0.055],
	], top_m, 16))
	add.call(Mesher.tube([[Vector3(0, 1.47, 0), 0.05, 0.05], [Vector3(0, 1.56, -0.005), 0.05, 0.05]], skin_m, 10))
	var head_rings: Array = []
	for k: float in [-1.0, -0.8, -0.4, 0.0, 0.4, 0.8, 1.0]:
		var r: float = sqrt(maxf(1.0 - k * k, 0.0)) + 0.02
		head_rings.push_back([Vector3(0, 1.645 + k * 0.128, -0.01), 0.098 * r, 0.112 * r])
	add.call(Mesher.tube(head_rings, skin_m, 14))
	var hair_rings: Array = []
	for k: float in [-0.05, 0.2, 0.5, 0.8, 1.0]:
		var r: float = sqrt(maxf(1.0 - k * k, 0.0)) + 0.02
		hair_rings.push_back([Vector3(0, 1.66 + k * 0.128, 0.01), 0.105 * r, 0.122 * r])
	add.call(Mesher.tube(hair_rings, hair_m, 14))
	root.scale = Vector3.ONE * (height / 1.76)
	return root


## Велосипедист: подробная модель в cyclist.gd.
static func cyclist(top: Color, legs: Color) -> Node3D:
	return Cyclist.make(top, legs)


## Человек на электросамокате. Едет вдоль -z.
static func scooter(top: Color, legs: Color) -> Node3D:
	var root := Node3D.new()
	var std := func(c: Color, rough: float = 0.6, metal: float = 0.0) -> StandardMaterial3D:
		var m := StandardMaterial3D.new()
		m.albedo_color = c
		m.roughness = rough
		m.metallic = metal
		return m
	var body: StandardMaterial3D = std.call(Color(0.06, 0.45, 0.32), 0.35, 0.3)
	var rubber: StandardMaterial3D = std.call(Color(0.02, 0.02, 0.02), 0.85)
	var deck := BoxMesh.new()
	deck.size = Vector3(0.16, 0.045, 0.72)
	deck.material = body
	var d := MeshInstance3D.new()
	d.mesh = deck
	d.position = Vector3(0, 0.15, 0.02)
	root.add_child(d)
	for z: float in [-0.42, 0.42]:
		var w := MeshInstance3D.new()
		w.mesh = Mesher.lathe([Vector2(0.06, -0.03), Vector2(0.1, -0.03), Vector2(0.11, 0.0), Vector2(0.1, 0.03), Vector2(0.06, 0.03)], rubber, 20)
		w.position = Vector3(0, 0.11, z)
		root.add_child(w)
	for pair: Array in [[Vector3(0, 0.12, -0.42), Vector3(0, 1.12, -0.46), 0.022], [Vector3(-0.24, 1.12, -0.46), Vector3(0.24, 1.12, -0.46), 0.014]]:
		var stem := MeshInstance3D.new()
		stem.mesh = Mesher.limb(pair[0], pair[1], pair[2], pair[2], body)
		root.add_child(stem)
	var rider: Node3D = make(top, legs, Color(0.86, 0.66, 0.53), Color(0.2, 0.13, 0.08), 1.74, 0.06)
	rider.position = Vector3(0, 0.17, 0.03)
	root.add_child(rider)
	return root
