extends Node
## Рендер сцен в картинки:
##   godot --path scenes3d -- scene=vik-01,opp-11 dir=../src/assets/scenes
##   scene=all рендерит все сцены из specs.json и записывает manifest.json.
## Проверка без рендера, с кодом выхода:
##   godot --headless --path scenes3d -- check=all
## Перед сохранением каждая сцена проходит World.audit(): если на проезжей части что-то стоит, картинки не будет.


func _ready() -> void:
	var options: Dictionary = {}
	for argument: String in OS.get_cmdline_user_args():
		var parts: PackedStringArray = argument.split("=", true, 1)
		options[parts[0]] = parts[1] if parts.size() > 1 else "1"
	if options.has("check"):
		get_tree().quit(await _check_all())
		return
	# Манифест отдельно: его пишет scripts/render-scenes.mjs, когда все части отрендерены без ошибок.
	if options.has("manifest"):
		_write_manifest(options.get("dir", "user://"), Scenes.specs().keys())
		get_tree().quit()
		return
	var all: bool = options.get("scene", "all") == "all" and not options.has("part")
	var ids: Array = Scenes.specs().keys() if options.get("scene", "all") == "all" else Array(String(options["scene"]).split(","))
	# part=2/4: только вторая из четырёх частей, части запускаются параллельно.
	if options.has("part"):
		var piece: PackedStringArray = String(options["part"]).split("/")
		var chosen: Array = []
		for k: int in ids.size():
			if k % int(piece[1]) == int(piece[0]) - 1:
				chosen.push_back(ids[k])
		ids = chosen
	var width: int = int(options.get("width", "1920"))
	var height: int = int(options.get("height", "1200"))
	var dir: String = options.get("dir", "user://")
	# 60 кадров хватает, чтобы свет установился: от 150 картинка не отличается, от 20 уже отличается заметно.
	var frames: int = int(options.get("frames", "60"))
	var hour: float = float(options.get("hour", "-1"))
	var started: int = Time.get_ticks_msec()
	for id: String in ids:
		var view := SubViewport.new()
		view.size = Vector2i(width, height)
		view.own_world_3d = true
		view.msaa_3d = Viewport.MSAA_4X
		view.use_debanding = true
		view.render_target_update_mode = SubViewport.UPDATE_ALWAYS
		add_child(view)
		var world := World.new()
		world.hour_override = hour
		view.add_child(world)
		Scenes.build(id, world)
		world.finish()
		var bad: PackedStringArray = world.audit()
		if not bad.is_empty():
			printerr("ОШИБКА %s, картинка не сохранена:\n  %s" % [id, "\n  ".join(bad)])
			Car.cleanup()
			get_tree().quit(1)
			return
		for i: int in frames:
			await RenderingServer.frame_post_draw
		var image: Image = view.get_texture().get_image()
		image.convert(Image.FORMAT_RGB8)
		image.resize(width / 2, height / 2, Image.INTERPOLATE_LANCZOS)
		var out: String = dir.path_join(id + ".webp")
		# В густом тумане плавные переходы при обычном сжатии распадаются на ступени.
		var foggy: bool = float(Scenes.specs().get(id, {}).get("fog", 1.0)) >= 10.0
		var error: Error = image.save_webp(out, true, 0.97 if foggy else float(options.get("quality", "0.8")))
		if options.has("png"):
			image.save_png(String(options["png"]).path_join(id + ".png"))
		print("%s код %d, %d КБ" % [id, error, FileAccess.get_file_as_bytes(out).size() / 1024])
		view.queue_free()
		await get_tree().process_frame
		await get_tree().process_frame
	if all:
		_write_manifest(dir, ids)
	print("Готово: %d сцен за %d с" % [ids.size(), (Time.get_ticks_msec() - started) / 1000])
	Car.cleanup()
	get_tree().quit()


## Все сцены без рендера, потом самопроверка: дерево и столб на дороге обязаны быть пойманы.
func _check_all() -> int:
	var failed: int = 0
	var ids: Array = Scenes.specs().keys()
	var radius_max: float = 0.0
	for id: String in ids:
		var world: World = await _build(id)
		var bad: PackedStringArray = world.audit()
		if not bad.is_empty():
			failed += 1
			printerr("ОШИБКА %s:\n  %s" % [id, "\n  ".join(bad)])
		for kind: String in world._plant_radius:
			radius_max = maxf(radius_max, world._plant_radius[kind])
		if world.tufts_dropped > 0:
			print("%s: трава с покрытия убрана, %d пучков" % [id, world.tufts_dropped])
		world.free()
	# Тест самого теста: на чистой сцене нарушений нет, с деревом или столбом на дороге они есть.
	var traps: Array = [["трава на проезжей части", "vik-01", Vector2(0.0, 30.0), "tuft"], ["трава на тротуаре", "vik-01", Vector2(Junction.HW + 1.3, 30.0), "tuft"], ["трава на обочине", "myk-08", Vector2(4.0, -20.0), "tuft"], ["трава на боковой дороге", "fob-05", Vector2(14.0, -19.0), "tuft"], ["дерево на перекрёстке", "vik-01", Vector2(0.0, 30.0), "pine"], ["дерево с кроной над дорогой", "vik-01", Vector2(6.0, 40.0), "broad"], ["дерево на дороге", "opp-01", Vector2(1.0, -40.0), "pine"], ["столб на дороге", "opp-09", Vector2(1.0, -30.0), "lamp"]]
	for t: Array in traps:
		var world: World = await _build(t[1])
		var before: int = world.audit().size()
		if t[3] == "lamp":
			world.lamp(t[2].x, t[2].y)
		elif t[3] == "tuft":
			world._tuft(t[2].x, t[2].y, 0.0, true)
		else:
			world.plant(t[3], t[2].x, t[2].y, 1.0)
		var after: int = world.audit().size()
		world.free()
		if before != 0 or after == 0:
			failed += 1
			printerr("ОШИБКА самопроверки: «%s» не поймано (до %d, после %d)" % [t[0], before, after])
		else:
			print("Самопроверка: «%s» поймано" % t[0])
	Car.cleanup()
	print("Проверено сцен: %d, с ошибками: %d. Самая широкая крона: %.1f м" % [ids.size(), failed, radius_max])
	return 1 if failed > 0 else 0


func _build(id: String) -> World:
	var world := World.new()
	add_child(world)
	Scenes.build(id, world)
	world.finish()
	await get_tree().process_frame
	return world


## Отпечаток всего, из чего собираются сцены. Его сверяет scripts/validate-data.mjs при сборке приложения.
static func sources_hash() -> String:
	var lines := PackedStringArray()
	lines.push_back("specs.json " + FileAccess.get_sha256("res://specs.json"))
	for folder: String in ["scripts", "shaders"]:
		var names: Array = Array(DirAccess.get_files_at("res://" + folder))
		names.sort()
		for file: String in names:
			if file.ends_with(".gd") or file.ends_with(".gdshader") or file.ends_with(".gdshaderinc"):
				lines.push_back("%s/%s %s" % [folder, file, FileAccess.get_sha256("res://%s/%s" % [folder, file])])
	return "\n".join(lines).sha256_text()


func _write_manifest(dir: String, ids: Array) -> void:
	var f := FileAccess.open(dir.path_join("manifest.json"), FileAccess.WRITE)
	f.store_string(JSON.stringify({"audited": true, "sources": sources_hash(), "scenes": ids}, "  ") + "\n")
	f.close()
