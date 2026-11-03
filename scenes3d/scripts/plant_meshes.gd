class_name PlantMeshes
extends RefCounted
## Генераторы деревьев, кустов и камней. Деревья растут как настоящие: ствол, сучья,
## ветви, побеги. Детализация lod: 0 — вблизи, 1 — средняя, 2 — вдали. Все уровни одного
## дерева строятся из одного скелета, поэтому его форма при смене уровня не меняется.

const NEAR: int = 0
const MID: int = 1
const FAR: int = 2


class Builder:
	var vertices: PackedVector3Array = PackedVector3Array()
	var normals: PackedVector3Array = PackedVector3Array()
	var tangents: PackedFloat32Array = PackedFloat32Array()
	var uvs: PackedVector2Array = PackedVector2Array()
	var colors: PackedColorArray = PackedColorArray()
	var indices: PackedInt32Array = PackedInt32Array()

	func vertex(position: Vector3, normal: Vector3, uv: Vector2, color: Color, tangent: Vector3) -> int:
		vertices.push_back(position)
		normals.push_back(normal)
		uvs.push_back(uv)
		colors.push_back(color)
		tangents.push_back(tangent.x)
		tangents.push_back(tangent.y)
		tangents.push_back(tangent.z)
		tangents.push_back(1.0)
		return vertices.size() - 1

	func triangle(a: int, b: int, c: int) -> void:
		indices.push_back(a)
		indices.push_back(b)
		indices.push_back(c)

	## Побег с листьями: карточка от основания к кончику. Вблизи она ещё и прогибается.
	func twig_card(base: Vector3, direction: Vector3, side: Vector3, normal: Vector3, card_length: float, half_width: float, droop: float, bent: bool, shade: float, tone: float, wind: float, phase: float) -> void:
		var rows: PackedFloat32Array = PackedFloat32Array([0.0, 0.5, 1.0]) if bent else PackedFloat32Array([0.0, 1.0])
		var first: int = vertices.size()
		for t: float in rows:
			var center: Vector3 = base + direction * card_length * t + Vector3.DOWN * droop * t * t
			var color: Color = Color(lerpf(shade * 0.82, shade, t), tone, clampf(wind * (0.55 + 0.45 * t), 0.0, 1.0), phase)
			vertex(center - side * half_width, normal, Vector2(0.0, 1.0 - t), color, side)
			vertex(center + side * half_width, normal, Vector2(1.0, 1.0 - t), color, side)
		for row: int in rows.size() - 1:
			var a: int = first + row * 2
			triangle(a, a + 1, a + 3)
			triangle(a, a + 3, a + 2)

	## Половина листа пальмы: от стержня вбок и немного вниз, как у сложенного домиком листа.
	func half_frond(path: PackedVector3Array, side: Vector3, half_width: float, path_normals: PackedVector3Array, shade: Vector2, tone: float, phase: float) -> void:
		var last: int = path.size() - 1
		var first: int = vertices.size()
		var outer: Vector3 = (side + Vector3.DOWN * 0.42).normalized()
		for i: int in path.size():
			var t: float = float(i) / last
			var color: Color = Color(lerpf(shade.x, shade.y, t), tone, t, phase)
			vertex(path[i], path_normals[i], Vector2(0.0, 1.0 - t), color, side)
			vertex(path[i] + outer * half_width, path_normals[i], Vector2(1.0, 1.0 - t), color, side)
		for i: int in last:
			var a: int = first + i * 2
			triangle(a, a + 1, a + 3)
			triangle(a, a + 3, a + 2)

	func tube(path: PackedVector3Array, radii: PackedFloat32Array, sides: int) -> void:
		var length_along: float = 0.0
		var first_index: int = vertices.size()
		var last: int = path.size() - 1
		for i: int in path.size():
			var tangent: Vector3 = (path[mini(i + 1, last)] - path[maxi(i - 1, 0)]).normalized()
			var reference: Vector3 = Vector3.FORWARD if absf(tangent.z) < 0.9 else Vector3.RIGHT
			var right: Vector3 = tangent.cross(reference).normalized()
			var forward: Vector3 = right.cross(tangent).normalized()
			if i > 0:
				length_along += path[i].distance_to(path[i - 1])
			for s: int in sides + 1:
				var angle: float = TAU * s / sides
				var outward: Vector3 = right * cos(angle) + forward * sin(angle)
				vertex(path[i] + outward * radii[i], outward, Vector2(float(s) / sides, length_along), Color.WHITE, tangent)
		var ring: int = sides + 1
		for i: int in last:
			for s: int in sides:
				var a: int = first_index + i * ring + s
				var b: int = a + 1
				var c: int = a + ring
				var d: int = c + 1
				triangle(a, b, d)
				triangle(a, d, c)

	func commit(mesh: ArrayMesh, material: Material) -> void:
		if vertices.is_empty():
			return
		var arrays: Array = []
		arrays.resize(Mesh.ARRAY_MAX)
		arrays[Mesh.ARRAY_VERTEX] = vertices
		arrays[Mesh.ARRAY_NORMAL] = normals
		arrays[Mesh.ARRAY_TANGENT] = tangents
		arrays[Mesh.ARRAY_TEX_UV] = uvs
		arrays[Mesh.ARRAY_COLOR] = colors
		arrays[Mesh.ARRAY_INDEX] = indices
		mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
		mesh.surface_set_material(mesh.get_surface_count() - 1, material)


## Правила роста: по одному значению на каждый порядок ветвления.
class GrowthShape:
	var children: PackedInt32Array = PackedInt32Array()
	var lengths: PackedFloat32Array = PackedFloat32Array()
	var children_from: PackedFloat32Array = PackedFloat32Array()
	var angle_min: PackedFloat32Array = PackedFloat32Array()
	var angle_max: PackedFloat32Array = PackedFloat32Array()
	var rise: PackedFloat32Array = PackedFloat32Array()
	var wander: PackedFloat32Array = PackedFloat32Array()
	var shoots_per_branch: int = 3


class Limb:
	var path: PackedVector3Array = PackedVector3Array()
	var radii: PackedFloat32Array = PackedFloat32Array()
	var level: int = 0


class Skeleton:
	var limbs: Array[Limb] = []
	var shoot_positions: PackedVector3Array = PackedVector3Array()
	var shoot_directions: PackedVector3Array = PackedVector3Array()


static func _unit(rng: RandomNumberGenerator) -> Vector3:
	var v: Vector3 = Vector3(rng.randfn(), rng.randfn(), rng.randfn())
	return v.normalized() if v.length_squared() > 0.0001 else Vector3.UP


static func _along(path: PackedVector3Array, t: float) -> Vector3:
	var position: float = clampf(t, 0.0, 1.0) * (path.size() - 1)
	var index: int = mini(int(position), path.size() - 2)
	return path[index].lerp(path[index + 1], position - index)


## Один шаг роста: ветвь идёт вперёд, немного блуждая, и выпускает боковые ветви.
static func _grow(skeleton: Skeleton, rng: RandomNumberGenerator, shape: GrowthShape, start: Vector3, direction: Vector3, radius: float, level: int, length_scale: float) -> void:
	var last_level: int = shape.lengths.size() - 1
	var segments: int = 4 if level <= 1 else 3
	var branch_length: float = shape.lengths[level] * length_scale * rng.randf_range(0.82, 1.18)
	var tip_radius: float = radius * (0.32 if level == 0 else 0.46)
	var limb: Limb = Limb.new()
	limb.level = level
	limb.path.push_back(start)
	limb.radii.push_back(radius)
	var heading: Vector3 = direction
	var at: Vector3 = start
	for s: int in segments:
		heading = (heading + _unit(rng) * shape.wander[level] + Vector3.UP * shape.rise[level]).normalized()
		at += heading * branch_length / segments
		limb.path.push_back(at)
		limb.radii.push_back(lerpf(radius, tip_radius, float(s + 1) / segments))

	if level == last_level:
		for i: int in shape.shoots_per_branch:
			skeleton.shoot_positions.push_back(_along(limb.path, (i + 0.25) / shape.shoots_per_branch))
			skeleton.shoot_directions.push_back(heading)
		return
	skeleton.limbs.append(limb)

	var count: int = shape.children[level]
	for c: int in count:
		var t: float = lerpf(shape.children_from[level], 1.0, (c + rng.randf()) / count)
		var base: Vector3 = _along(limb.path, t)
		var parent: Vector3 = (_along(limb.path, minf(t + 0.1, 1.0)) - _along(limb.path, maxf(t - 0.1, 0.0))).normalized()
		var reference: Vector3 = Vector3.RIGHT if absf(parent.x) < 0.9 else Vector3.FORWARD
		# Золотой угол: боковые ветви расходятся во все стороны, как у настоящих деревьев.
		var side: Vector3 = parent.cross(reference).normalized().rotated(parent, c * 2.39996 + rng.randf_range(-0.45, 0.45))
		var angle: float = rng.randf_range(shape.angle_min[level], shape.angle_max[level])
		var child_direction: Vector3 = (parent * cos(angle) + side * sin(angle)).normalized()
		var child_radius: float = lerpf(radius, tip_radius, t) * 0.62
		_grow(skeleton, rng, shape, base, child_direction, child_radius, level + 1, lerpf(1.0, 0.68, t))


## Листва на побегах скелета. На дальних уровнях побегов меньше, но каждый больше.
static func _add_shoots(leaves: Builder, skeleton: Skeleton, seed_value: int, lod: int, card_length: float, half_width: float, droop: float) -> void:
	var rng: RandomNumberGenerator = RandomNumberGenerator.new()
	rng.seed = seed_value + 1000
	var stride: int = [1, 6, 30][lod]
	var size_scale: float = [1.0, 2.35, 5.2][lod]
	var count: int = skeleton.shoot_positions.size()

	var center: Vector3 = Vector3.ZERO
	for position: Vector3 in skeleton.shoot_positions:
		center += position
	center /= maxi(count, 1)
	var reach: Vector3 = Vector3.ONE * 0.01
	for position: Vector3 in skeleton.shoot_positions:
		reach = reach.max((position - center).abs())

	for i: int in range(0, count, stride):
		var position: Vector3 = skeleton.shoot_positions[i]
		var from_center: Vector3 = position - center
		var relative: float = (from_center / reach).length() / 1.45
		var outward: Vector3 = from_center.normalized()
		# Плоскость побега случайна, но в целом смотрит наружу и вверх.
		var plane: Vector3 = (outward * 0.8 + _unit(rng) * 0.95 + Vector3.UP * 0.4).normalized()
		var heading: Vector3 = skeleton.shoot_directions[i]
		heading = (heading * 0.7 + outward * 0.5 + _unit(rng) * 0.35).normalized()
		var along: Vector3 = (heading - plane * heading.dot(plane)).normalized()
		var side: Vector3 = plane.cross(along).normalized()
		var light_normal: Vector3 = (outward * 0.72 + Vector3.UP * 0.3 + plane * 0.32).normalized()
		var shade: float = clampf(0.26 + 0.68 * pow(clampf(relative, 0.0, 1.0), 1.5) + outward.y * 0.14, 0.2, 1.0)
		var size: float = size_scale * rng.randf_range(0.82, 1.2)
		leaves.twig_card(position, along, side, light_normal, card_length * size, half_width * size, droop * size, lod == NEAR, shade, rng.randf(), clampf(0.3 + 0.7 * relative, 0.2, 1.0), rng.randf())


static func _add_limbs(bark: Builder, skeleton: Skeleton, lod: int) -> void:
	var deepest: int = [3, 1, 0][lod]
	for limb: Limb in skeleton.limbs:
		if limb.level <= deepest:
			var sides: int = [9, 6, 5, 4][limb.level] if lod == NEAR else (6 if limb.level == 0 else 4)
			bark.tube(limb.path, limb.radii, sides)


## Лиственное дерево.
static func broadleaf(lod: int, seed_value: int, bark_material: Material, leaf_material: Material) -> ArrayMesh:
	var rng: RandomNumberGenerator = RandomNumberGenerator.new()
	rng.seed = seed_value
	var shape: GrowthShape = GrowthShape.new()
	shape.children = PackedInt32Array([6, 4, 4, 3])
	shape.lengths = PackedFloat32Array([rng.randf_range(7.0, 8.4), 4.7, 2.5, 1.15, 0.6])
	shape.children_from = PackedFloat32Array([rng.randf_range(0.36, 0.46), 0.3, 0.25, 0.2])
	shape.angle_min = PackedFloat32Array([0.7, 0.45, 0.4, 0.4])
	shape.angle_max = PackedFloat32Array([1.1, 0.85, 0.95, 0.95])
	shape.rise = PackedFloat32Array([0.0, 0.1, 0.03, -0.04, -0.1])
	shape.wander = PackedFloat32Array([0.05, 0.13, 0.17, 0.22, 0.22])
	shape.shoots_per_branch = 4
	var skeleton: Skeleton = Skeleton.new()
	_grow(skeleton, rng, shape, Vector3(0.0, -0.6, 0.0), (Vector3.UP + _unit(rng) * 0.06).normalized(), 0.42, 0, 1.0)
	skeleton.limbs[0].radii[0] *= 1.3

	var bark: Builder = Builder.new()
	var leaves: Builder = Builder.new()
	_add_limbs(bark, skeleton, lod)
	_add_shoots(leaves, skeleton, seed_value, lod, 0.86, 0.33, 0.14)
	var mesh: ArrayMesh = ArrayMesh.new()
	bark.commit(mesh, bark_material)
	leaves.commit(mesh, leaf_material)
	return mesh


## Куст: несколько стеблей от земли, без заметного ствола.
static func bush(lod: int, seed_value: int, leaf_material: Material) -> ArrayMesh:
	var rng: RandomNumberGenerator = RandomNumberGenerator.new()
	rng.seed = seed_value
	var shape: GrowthShape = GrowthShape.new()
	shape.children = PackedInt32Array([3, 3])
	shape.lengths = PackedFloat32Array([0.72, 0.46, 0.27])
	shape.children_from = PackedFloat32Array([0.3, 0.2])
	shape.angle_min = PackedFloat32Array([0.4, 0.4])
	shape.angle_max = PackedFloat32Array([0.9, 1.0])
	shape.rise = PackedFloat32Array([0.05, 0.0, -0.08])
	shape.wander = PackedFloat32Array([0.15, 0.22, 0.25])
	shape.shoots_per_branch = 3
	var skeleton: Skeleton = Skeleton.new()
	for i: int in 8:
		var angle: float = i * 2.39996
		var outward: Vector3 = Vector3(cos(angle), rng.randf_range(0.6, 1.5), sin(angle)).normalized()
		_grow(skeleton, rng, shape, Vector3(0.0, -0.05, 0.0) + outward * 0.1, outward, 0.03, 0, 1.0)
	var leaves: Builder = Builder.new()
	_add_shoots(leaves, skeleton, seed_value, lod, 0.46, 0.2, 0.06)
	var mesh: ArrayMesh = ArrayMesh.new()
	leaves.commit(mesh, leaf_material)
	return mesh


## Ель: ствол и мутовки отдельных лап. Каждая лапа несёт свои веточки с хвоей,
## поэтому между ярусами виден свет, а не сплошные тарелки.
static func pine(lod: int, seed_value: int, bark_material: Material, leaf_material: Material) -> ArrayMesh:
	var rng: RandomNumberGenerator = RandomNumberGenerator.new()
	rng.seed = seed_value
	var bark: Builder = Builder.new()
	var needles: Builder = Builder.new()
	var height: float = rng.randf_range(15.0, 19.0)
	bark.tube(
		PackedVector3Array([Vector3(0.0, -0.6, 0.0), Vector3(0.0, 1.0, 0.0), Vector3(0.0, height * 0.5, 0.0), Vector3(0.0, height, 0.0)]),
		PackedFloat32Array([0.44, 0.33, 0.2, 0.02]),
		9 if lod == NEAR else 5
	)

	var whorls: int = 31
	var stride: int = [1, 7, 34][lod]
	var size_scale: float = [1.0, 2.5, 5.2][lod]
	var spray_index: int = 0
	for whorl: int in whorls:
		var t: float = float(whorl) / (whorls - 1)
		var y: float = lerpf(2.0, height - 0.15, pow(t, 0.95)) + rng.randf_range(-0.12, 0.12)
		var bough_count: int = rng.randi_range(4, 7)
		for bough: int in bough_count:
			var angle: float = TAU * (bough + rng.randf_range(-0.3, 0.3)) / bough_count + whorl * 2.39996
			var out: Vector3 = Vector3(cos(angle), 0.0, sin(angle))
			var bough_length: float = lerpf(4.7, 0.45, pow(t, 0.82)) * rng.randf_range(0.8, 1.14)
			var sag: float = bough_length * rng.randf_range(0.14, 0.26)
			var start: Vector3 = Vector3(0.0, y, 0.0)
			var path: PackedVector3Array = PackedVector3Array([
				start,
				start + out * bough_length * 0.36 + Vector3.DOWN * sag * 0.55,
				start + out * bough_length * 0.72 + Vector3.DOWN * sag,
				start + out * bough_length + Vector3.DOWN * sag * 0.72,
			])
			if lod == NEAR and bough_length > 1.1:
				bark.tube(path, PackedFloat32Array([bough_length * 0.022, bough_length * 0.016, bough_length * 0.01, bough_length * 0.004]), 4)

			var sprays: int = maxi(int(bough_length / 0.42), 2)
			for s: int in sprays:
				var along_bough: float = lerpf(0.22, 1.0, float(s) / maxi(sprays - 1, 1))
				var base: Vector3 = _along(path, along_bough)
				var is_tip: bool = s == sprays - 1
				for side_sign: float in (PackedFloat32Array([0.0]) if is_tip else PackedFloat32Array([-1.0, 1.0])):
					spray_index += 1
					if spray_index % stride != 0:
						continue
					var side_out: Vector3 = out.cross(Vector3.UP)
					var spread: float = rng.randf_range(0.42, 0.85)
					var heading: Vector3 = (out * cos(spread * absf(side_sign)) + side_out * side_sign * sin(spread) + Vector3.DOWN * rng.randf_range(0.05, 0.28)).normalized()
					var spray_length: float = clampf(bough_length * (1.15 - along_bough * 0.55) * 0.34, 0.36, 1.2) * rng.randf_range(0.85, 1.15) * size_scale
					var roll: Vector3 = (Vector3.UP + _unit(rng) * 0.42).normalized()
					var card_side: Vector3 = roll.cross(heading).normalized()
					var plane: Vector3 = heading.cross(card_side).normalized()
					if plane.y < 0.0:
						plane = -plane
					var light_normal: Vector3 = (out * 0.5 + Vector3.UP * 0.75 + plane * 0.3).normalized()
					var inner: float = lerpf(0.34, 0.68, t)
					var shade: float = lerpf(inner, 1.0, along_bough)
					needles.twig_card(base, heading, card_side, light_normal, spray_length, spray_length * 0.46, spray_length * 0.1, false, shade, rng.randf(), clampf(along_bough, 0.2, 1.0), rng.randf())

	var mesh: ArrayMesh = ArrayMesh.new()
	bark.commit(mesh, bark_material)
	needles.commit(mesh, leaf_material)
	return mesh


## Пальма: изогнутый ствол и дуги листьев, сложенных домиком.
static func palm(lod: int, seed_value: int, bark_material: Material, leaf_material: Material) -> ArrayMesh:
	var rng: RandomNumberGenerator = RandomNumberGenerator.new()
	rng.seed = seed_value
	var bark: Builder = Builder.new()
	var fronds: Builder = Builder.new()

	var height: float = rng.randf_range(7.5, 10.5)
	var lean: float = rng.randf_range(1.6, 3.4)
	var trunk_segments: int = 9 if lod == NEAR else 3
	var path: PackedVector3Array = PackedVector3Array()
	var radii: PackedFloat32Array = PackedFloat32Array()
	for i: int in trunk_segments + 1:
		var t: float = float(i) / trunk_segments
		path.push_back(Vector3(lean * t * t, height * t - 0.4, 0.0))
		radii.push_back(lerpf(0.31, 0.13, t) * (1.0 + 0.5 * pow(1.0 - t, 8.0)))
	bark.tube(path, radii, 8 if lod == NEAR else 4)

	var crown: Vector3 = path[path.size() - 1]
	var frond_count: int = [24, 12, 7][lod]
	var frond_segments: int = [8, 4, 2][lod]
	var width_scale: float = [1.0, 1.15, 1.4][lod]
	for i: int in frond_count:
		var angle: float = i * 2.39996 + rng.randf_range(-0.2, 0.2)
		var out: Vector3 = Vector3(cos(angle), 0.0, sin(angle))
		var side: Vector3 = out.cross(Vector3.UP)
		var age: float = rng.randf()
		var frond_length: float = lerpf(3.6, 6.1, age) * rng.randf_range(0.9, 1.1)
		# Молодые листья торчат вверх, старые свисают.
		var rise: float = lerpf(3.0, 0.6, age)
		var droop: float = lerpf(2.2, 4.4, age)
		var points: PackedVector3Array = PackedVector3Array()
		var normals: PackedVector3Array = PackedVector3Array()
		for s: int in frond_segments + 1:
			var along: float = float(s) / frond_segments
			points.push_back(crown + out * frond_length * along * lerpf(0.82, 1.0, age) + Vector3.UP * (rise * along - droop * along * along))
			normals.push_back((Vector3.UP + out * (along * 1.2 - 0.3)).normalized())
		var half_width: float = lerpf(0.62, 0.9, age) * width_scale
		var tone: float = rng.randf()
		var phase: float = rng.randf()
		var shade: Vector2 = Vector2(0.55, lerpf(1.0, 0.82, age))
		fronds.half_frond(points, side, half_width, normals, shade, tone, phase)
		fronds.half_frond(points, -side, half_width, normals, shade, tone, phase)

	var mesh: ArrayMesh = ArrayMesh.new()
	bark.commit(mesh, bark_material)
	fronds.commit(mesh, leaf_material)
	return mesh


## Камень: сфера, искажённая шумом, с плоским основанием.
static func rock(seed_value: int, material: Material) -> ArrayMesh:
	var noise: FastNoiseLite = FastNoiseLite.new()
	noise.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	noise.seed = seed_value
	noise.frequency = 0.62
	noise.fractal_octaves = 4

	var sphere: SphereMesh = SphereMesh.new()
	sphere.radius = 1.0
	sphere.height = 2.0
	sphere.radial_segments = 26
	sphere.rings = 14
	var arrays: Array = sphere.get_mesh_arrays()
	var vertices: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
	var indices: PackedInt32Array = arrays[Mesh.ARRAY_INDEX]

	var squash: Vector3 = Vector3(1.0, 0.72, 0.86)
	for i: int in vertices.size():
		var v: Vector3 = vertices[i]
		var bump: float = noise.get_noise_3dv(v) * 0.62
		var moved: Vector3 = v * (1.0 + bump) * squash
		moved.y = maxf(moved.y, -0.28)
		vertices[i] = moved

	# Сглаженные нормали: шов сферы склеиваем по совпадающим позициям.
	var accumulated: Dictionary[Vector3i, Vector3] = {}
	for i: int in range(0, indices.size(), 3):
		var a: Vector3 = vertices[indices[i]]
		var b: Vector3 = vertices[indices[i + 1]]
		var c: Vector3 = vertices[indices[i + 2]]
		# Передняя грань в Godot идёт по часовой стрелке, поэтому меняем порядок.
		var face: Vector3 = (c - a).cross(b - a)
		for index: int in [indices[i], indices[i + 1], indices[i + 2]]:
			var key: Vector3i = Vector3i((vertices[index] * 2000.0).round())
			accumulated[key] = accumulated.get(key, Vector3.ZERO) + face

	var normals: PackedVector3Array = PackedVector3Array()
	normals.resize(vertices.size())
	var uvs: PackedVector2Array = arrays[Mesh.ARRAY_TEX_UV]
	for i: int in vertices.size():
		var key: Vector3i = Vector3i((vertices[i] * 2000.0).round())
		normals[i] = accumulated[key].normalized()

	var out: Array = []
	out.resize(Mesh.ARRAY_MAX)
	out[Mesh.ARRAY_VERTEX] = vertices
	out[Mesh.ARRAY_NORMAL] = normals
	out[Mesh.ARRAY_TEX_UV] = uvs
	out[Mesh.ARRAY_INDEX] = indices
	var mesh: ArrayMesh = ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, out)
	mesh.surface_set_material(0, material)
	return mesh
