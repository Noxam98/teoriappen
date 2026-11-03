class_name Mesher
extends RefCounted
## Построение сеток: лофт по сечениям, полосы по земле, призмы из многоугольников.


## Лофт через замкнутые сечения одинакового размера. Нормали сглажены.
static func loft(rings: Array, material: Material, caps: bool = true) -> ArrayMesh:
	var n: int = rings[0].size()
	var verts := PackedVector3Array()
	var idx := PackedInt32Array()
	for ring: PackedVector3Array in rings:
		verts.append_array(ring)
	for i: int in rings.size() - 1:
		for j: int in n:
			var a: int = i * n + j
			var b: int = i * n + (j + 1) % n
			var c: int = (i + 1) * n + j
			var d: int = (i + 1) * n + (j + 1) % n
			idx.append_array([a, b, d, a, d, c])
	if caps:
		for pick: int in [0, rings.size() - 1]:
			var center := Vector3.ZERO
			for p: Vector3 in rings[pick]:
				center += p
			verts.push_back(center / float(n))
			var c_index: int = verts.size() - 1
			for j: int in n:
				var a2: int = pick * n + j
				var b2: int = pick * n + (j + 1) % n
				if pick == 0:
					idx.append_array([c_index, b2, a2])
				else:
					idx.append_array([c_index, a2, b2])
	var mid_ring: PackedVector3Array = rings[rings.size() / 2]
	var center_mid := Vector3.ZERO
	for p: Vector3 in mid_ring:
		center_mid += p
	center_mid /= float(n)
	var base: int = (rings.size() / 2) * n
	var p1: Vector3 = verts[base]
	var p2: Vector3 = verts[base + 1]
	var p3: Vector3 = verts[base + n + 1] if rings.size() / 2 + 1 < rings.size() else verts[base - n + 1]
	var normal: Vector3 = (p1 - p3).cross(p1 - p2)
	var flip: bool = normal.dot((p1 + p2 + p3) / 3.0 - center_mid) < 0.0
	if rings.size() / 2 + 1 >= rings.size():
		flip = not flip
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_smooth_group(0)
	for i: int in range(0, idx.size(), 3):
		var order: Array = [idx[i], idx[i + 2], idx[i + 1]] if flip else [idx[i], idx[i + 1], idx[i + 2]]
		for v: int in order:
			st.add_vertex(verts[v])
	st.generate_normals()
	st.set_material(material)
	return st.commit()


## Эллиптические сечения вдоль произвольной оси: [центр, радиус x, радиус z].
static func tube(stations: Array, material: Material, segments: int = 12) -> ArrayMesh:
	var rings: Array = []
	for s: Array in stations:
		var ring := PackedVector3Array()
		for j: int in segments:
			var t: float = TAU * j / segments
			ring.push_back(s[0] + Vector3(cos(t) * s[1], 0.0, sin(t) * s[2]))
		rings.push_back(ring)
	return loft(rings, material)


## Трубка вдоль отрезка a-b (рука, нога): радиусы на концах.
static func limb(a: Vector3, b: Vector3, ra: float, rb: float, material: Material) -> ArrayMesh:
	var axis: Vector3 = (b - a).normalized()
	var u: Vector3 = axis.cross(Vector3.RIGHT if absf(axis.x) < 0.9 else Vector3.FORWARD).normalized()
	var v: Vector3 = axis.cross(u).normalized()
	var rings: Array = []
	for k: float in [-0.3, 0.0, 0.5, 1.0, 1.3]:
		var c: Vector3 = a.lerp(b, clampf(k, 0.0, 1.0)) + axis * (minf(k, 0.0) * ra * 2.0 + maxf(k - 1.0, 0.0) * rb * 2.0)
		var r: float = lerpf(ra, rb, clampf(k, 0.0, 1.0)) * (0.55 if k < 0.0 or k > 1.0 else 1.0)
		var ring := PackedVector3Array()
		for j: int in 10:
			var t: float = TAU * j / 10.0
			ring.push_back(c + (u * cos(t) + v * sin(t)) * r)
		rings.push_back(ring)
	return loft(rings, material)


## Полоса по земле вдоль пути (x, z), от a до b метров вправо от пути.
static func strip(path: PackedVector2Array, a: float, b: float, y: float, material: Material, height: Callable = Callable()) -> ArrayMesh:
	var verts := PackedVector3Array()
	var normals := PackedVector3Array()
	var idx := PackedInt32Array()
	for i: int in path.size():
		var from: Vector2 = path[maxi(i - 1, 0)]
		var to: Vector2 = path[mini(i + 1, path.size() - 1)]
		var d: Vector2 = (to - from).normalized()
		var right := Vector2(-d.y, d.x)
		var pa: Vector2 = path[i] + right * a
		var pb: Vector2 = path[i] + right * b
		var ya: float = y + (height.call(pa.y) if height.is_valid() else 0.0)
		var yb: float = y + (height.call(pb.y) if height.is_valid() else 0.0)
		verts.push_back(Vector3(pa.x, ya, pa.y))
		verts.push_back(Vector3(pb.x, yb, pb.y))
		normals.push_back(Vector3.UP)
		normals.push_back(Vector3.UP)
		if i > 0:
			var k: int = (i - 1) * 2
			idx.append_array([k, k + 3, k + 1, k, k + 2, k + 3])
	return _surface(verts, normals, idx, material)


## Многоугольник (x, z), поднятый от y0 до y1, с отдельным материалом боковин.
static func prism(polygon: PackedVector2Array, y0: float, y1: float, top: Material, side: Material) -> ArrayMesh:
	var mesh := ArrayMesh.new()
	var tris: PackedInt32Array = Geometry2D.triangulate_polygon(polygon)
	var verts := PackedVector3Array()
	var normals := PackedVector3Array()
	for p: Vector2 in polygon:
		verts.push_back(Vector3(p.x, y1, p.y))
		normals.push_back(Vector3.UP)
	var ordered := PackedInt32Array()
	for i: int in range(0, tris.size(), 3):
		var p1: Vector3 = verts[tris[i]]
		var p2: Vector3 = verts[tris[i + 1]]
		var p3: Vector3 = verts[tris[i + 2]]
		if (p1 - p3).cross(p1 - p2).y > 0.0:
			ordered.append_array([tris[i], tris[i + 1], tris[i + 2]])
		else:
			ordered.append_array([tris[i], tris[i + 2], tris[i + 1]])
	_append(mesh, verts, normals, ordered, top)
	var sv := PackedVector3Array()
	var sn := PackedVector3Array()
	var si := PackedInt32Array()
	var area: float = 0.0
	for i: int in polygon.size():
		var a: Vector2 = polygon[i]
		var b: Vector2 = polygon[(i + 1) % polygon.size()]
		area += a.x * b.y - b.x * a.y
	for i: int in polygon.size():
		var a: Vector2 = polygon[i]
		var b: Vector2 = polygon[(i + 1) % polygon.size()]
		var edge: Vector2 = (b - a).normalized()
		var out := Vector3(edge.y, 0.0, -edge.x) if area > 0.0 else Vector3(-edge.y, 0.0, edge.x)
		var k: int = sv.size()
		sv.append_array([Vector3(a.x, y0, a.y), Vector3(b.x, y0, b.y), Vector3(b.x, y1, b.y), Vector3(a.x, y1, a.y)])
		sn.append_array([out, out, out, out])
		var q1: Vector3 = sv[k]
		var q2: Vector3 = sv[k + 1]
		var q3: Vector3 = sv[k + 2]
		if (q1 - q3).cross(q1 - q2).dot(out) > 0.0:
			si.append_array([k, k + 1, k + 2, k, k + 2, k + 3])
		else:
			si.append_array([k, k + 2, k + 1, k, k + 3, k + 2])
	_append(mesh, sv, sn, si, side)
	return mesh


static func _surface(verts: PackedVector3Array, normals: PackedVector3Array, idx: PackedInt32Array, material: Material) -> ArrayMesh:
	var mesh := ArrayMesh.new()
	_append(mesh, verts, normals, idx, material)
	return mesh


static func _append(mesh: ArrayMesh, verts: PackedVector3Array, normals: PackedVector3Array, idx: PackedInt32Array, material: Material) -> void:
	var arrays: Array = []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = verts
	arrays[Mesh.ARRAY_NORMAL] = normals
	arrays[Mesh.ARRAY_INDEX] = idx
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	mesh.surface_set_material(mesh.get_surface_count() - 1, material)


## Лофт с резкими линиями: у каждого сегмента сечения своя группа сглаживания (groups),
## у каждого промежутка между сечениями своя зона (zones). Торцы плоские, с острой кромкой.
static func creased_loft(rings: Array, groups: PackedInt32Array, zones: PackedInt32Array, material: Material) -> ArrayMesh:
	var n: int = rings[0].size()
	var mid: int = rings.size() / 2
	var center_mid := Vector3.ZERO
	for p: Vector3 in rings[mid]:
		center_mid += p
	center_mid /= float(n)
	var a0: Vector3 = rings[mid][n / 4]
	var b0: Vector3 = rings[mid][n / 4 + 1]
	var c0: Vector3 = rings[mid + 1][n / 4 + 1]
	var flip: bool = (a0 - c0).cross(a0 - b0).dot((a0 + b0 + c0) / 3.0 - center_mid) < 0.0
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var tri := func(p1: Vector3, p2: Vector3, p3: Vector3) -> void:
		st.add_vertex(p1)
		if flip:
			st.add_vertex(p3)
			st.add_vertex(p2)
		else:
			st.add_vertex(p2)
			st.add_vertex(p3)
	for i: int in rings.size() - 1:
		var ra: PackedVector3Array = rings[i]
		var rb: PackedVector3Array = rings[i + 1]
		for j: int in n:
			st.set_smooth_group(groups[j] + zones[i] * 100)
			var k: int = (j + 1) % n
			tri.call(ra[j], ra[k], rb[k])
			tri.call(ra[j], rb[k], rb[j])
	for pick: int in [0, rings.size() - 1]:
		var center := Vector3.ZERO
		for p: Vector3 in rings[pick]:
			center += p
		center /= float(n)
		st.set_smooth_group(9000 + pick)
		for j: int in n:
			var k: int = (j + 1) % n
			if pick == 0:
				tri.call(center, rings[pick][k], rings[pick][j])
			else:
				tri.call(center, rings[pick][j], rings[pick][k])
	st.generate_normals()
	st.set_material(material)
	return st.commit()


## Тело вращения вокруг оси x: профиль из точек (радиус, x).
static func lathe(profile: Array, material: Material, segments: int = 40) -> ArrayMesh:
	var rings: Array = []
	for p: Vector2 in profile:
		var ring := PackedVector3Array()
		for j: int in segments:
			var t: float = TAU * j / segments
			ring.push_back(Vector3(p.y, cos(t) * p.x, sin(t) * p.x))
		rings.push_back(ring)
	return loft(rings, material)


## Мягкий брусок: сиденье, спинка, подголовник. Центр, полуразмеры (x, y, z).
static func pillow(center: Vector3, half: Vector3, material: Material, tilt: float = 0.0) -> ArrayMesh:
	var rings: Array = []
	for k: float in [-1.0, -0.94, -0.8, -0.45, 0.0, 0.45, 0.8, 0.94, 1.0]:
		var r: float = pow(maxf(1.0 - pow(absf(k), 4.0), 0.0), 0.25) * 0.97 + 0.03
		var ring := PackedVector3Array()
		for j: int in 16:
			var t: float = TAU * j / 16.0
			var c: float = cos(t)
			var s: float = sin(t)
			var px: float = signf(c) * pow(absf(c), 0.5) * half.x * r
			var pz: float = signf(s) * pow(absf(s), 0.5) * half.z * r
			var py: float = k * half.y
			ring.push_back(center + Vector3(px, py, pz + py * tilt))
		rings.push_back(ring)
	return loft(rings, material)


## Плавная трубка по ломаной: у каждой точки свой радиус (Vector2: поперёк x и поперёк тела).
static func sweep(points: Array, radii: Array, material: Material, segments: int = 12) -> ArrayMesh:
	var rings: Array = []
	var count: int = points.size()
	for i: int in count:
		var a: Vector3 = points[maxi(i - 1, 0)]
		var b: Vector3 = points[mini(i + 1, count - 1)]
		var axis: Vector3 = (b - a).normalized()
		var u: Vector3 = (Vector3.RIGHT - axis * Vector3.RIGHT.dot(axis))
		if u.length() < 0.2:
			u = Vector3.FORWARD - axis * Vector3.FORWARD.dot(axis)
		u = u.normalized()
		var v: Vector3 = axis.cross(u).normalized()
		var r: Vector2 = radii[i]
		var ring := PackedVector3Array()
		for j: int in segments:
			var t: float = TAU * j / segments
			ring.push_back(points[i] + u * cos(t) * r.x + v * sin(t) * r.y)
		rings.push_back(ring)
	return loft(rings, material)


## Кольцо вокруг оси x: шина или обод. Радиус R, сечение rx (вдоль оси) и ry (по радиусу).
static func torus(radius: float, rx: float, ry: float, material: Material, segments: int = 48, sides: int = 10) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var point := func(i: int, j: int) -> Array:
		var a: float = TAU * i / segments
		var t: float = TAU * j / sides
		var rad: float = radius + cos(t) * ry
		var dir := Vector3(0.0, cos(a), sin(a))
		return [Vector3(sin(t) * rx, 0.0, 0.0) + dir * rad, (Vector3(sin(t) / maxf(rx, 0.001), 0.0, 0.0) + dir * cos(t) / maxf(ry, 0.001)).normalized()]
	for i: int in segments:
		for j: int in sides:
			var q: Array = [point.call(i, j), point.call(i + 1, j), point.call(i + 1, j + 1), point.call(i, j + 1)]
			var p0: Vector3 = q[0][0]
			var p1: Vector3 = q[1][0]
			var p2: Vector3 = q[2][0]
			var flip: bool = (p0 - p2).cross(p0 - p1).dot(q[0][1]) < 0.0
			for k: int in ([0, 2, 1, 0, 3, 2] if flip else [0, 1, 2, 0, 2, 3]):
				st.set_normal(q[k][1])
				st.add_vertex(q[k][0])
	st.set_material(material)
	return st.commit()
