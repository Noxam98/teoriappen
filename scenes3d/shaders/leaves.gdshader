shader_type spatial;
render_mode cull_disabled, diffuse_burley, specular_schlick_ggx, world_vertex_coords;

// Листва из маленьких побегов с вырезанным контуром. Нормаль вершины направлена от центра
// кроны и даёт мягкий объём, а карта нормалей наклоняет каждый лист по-своему.
// Вершинный цвет: R — затенение внутри кроны, G — оттенок, B — сила ветра, A — фаза дрожи.

global uniform vec2 wind;
global uniform float daylight;

uniform sampler2D leaf_mask : source_color, repeat_disable, filter_linear_mipmap_anisotropic;
uniform sampler2D leaf_normal : hint_normal, repeat_disable, filter_linear_mipmap_anisotropic;
uniform vec3 color_a : source_color = vec3(0.20, 0.36, 0.08);
uniform vec3 color_b : source_color = vec3(0.36, 0.46, 0.11);
uniform float alpha_cut : hint_range(0.05, 0.95) = 0.42;
uniform float backlight : hint_range(0.0, 1.5) = 0.6;
uniform float sway_amount = 0.14;
uniform float flutter_amount = 0.022;
uniform float normal_depth : hint_range(0.0, 2.0) = 0.8;

// На каком расстоянии от камеры показывать эту детализацию. Соседние уровни
// плавно растворяются друг в друге, поэтому деревья не перещёлкиваются.
instance uniform vec2 lod_range = vec2(-100.0, 100000.0);

const float LOD_BLEND = 6.0;

varying vec3 v_tint;
varying float v_shade;
varying float v_fade;

float hash12(vec2 p) {
	vec3 q = fract(vec3(p.xyx) * 0.1031);
	q += dot(q, q.yzx + 33.33);
	return fract((q.x + q.y) * q.z);
}

void vertex() {
	vec3 origin = MODEL_MATRIX[3].xyz;
	float dist = distance(origin, MAIN_CAM_INV_VIEW_MATRIX[3].xyz);
	v_fade = smoothstep(lod_range.x - LOD_BLEND, lod_range.x + LOD_BLEND, dist)
		* (1.0 - smoothstep(lod_range.y - LOD_BLEND, lod_range.y + LOD_BLEND, dist));

	float tree_seed = hash12(origin.xz);
	if (v_fade <= 0.001) {
		VERTEX = origin;
	} else {
		float phase = origin.x * 0.11 + origin.z * 0.13 + tree_seed * 6.28;
		float weight = COLOR.b;
		// Качание всей кроны, движение ветвей и дрожь отдельных побегов.
		float slow = sin(TIME * 0.9 + phase) + sin(TIME * 1.73 + phase * 1.7) * 0.5;
		float branch = sin(TIME * 2.3 + VERTEX.x * 0.5 + VERTEX.z * 0.4) * 0.3;
		float flutter = sin(TIME * (5.0 + COLOR.a * 3.0) + COLOR.a * 40.0);
		VERTEX += vec3(wind.x, 0.1 * length(wind), wind.y) * (slow + branch) * sway_amount * weight;
		VERTEX += NORMAL * flutter * flutter_amount * weight * length(wind);
	}

	float tone = clamp(COLOR.g * 0.7 + tree_seed * 0.5 - 0.1, 0.0, 1.0);
	v_tint = mix(color_a, color_b, tone);
	v_shade = COLOR.r;
}

void fragment() {
	vec4 mask = texture(leaf_mask, UV);
	vec2 mask_size = vec2(textureSize(leaf_mask, 0));
	// В дальних мипмапах контур редеет, поэтому усиливаем альфу с расстоянием.
	vec2 dx = dFdx(UV) * mask_size;
	vec2 dy = dFdy(UV) * mask_size;
	float mip = 0.5 * log2(max(max(dot(dx, dx), dot(dy, dy)), 1.0));
	ALPHA = clamp(mask.a * (1.0 + mip * 0.24), 0.0, 1.0) * v_fade;
	ALPHA_SCISSOR_THRESHOLD = alpha_cut;
	// Для тени мелкие дырки между листьями не нужны: они только мерцают,
	// когда солнце движется. Берём размытый контур.
	if (IN_SHADOW_PASS) {
		ALPHA = clamp(textureLod(leaf_mask, UV, 3.0).a * 1.3, 0.0, 1.0) * v_fade;
	}
	ALPHA_ANTIALIASING_EDGE = 0.2;
	ALPHA_TEXTURE_COORDINATE = UV * mask_size;

	NORMAL = FRONT_FACING ? NORMAL : -NORMAL;
	NORMAL_MAP = texture(leaf_normal, UV).rgb;
	NORMAL_MAP_DEPTH = normal_depth;

	vec3 albedo = v_tint * mask.rgb * mix(0.62, 1.0, v_shade);
	ALBEDO = albedo;
	// Блик на листе отражает небо. В глубине кроны неба не видно, поэтому там его нет,
	// иначе затенённая листва получает синий налёт.
	ROUGHNESS = 0.72;
	SPECULAR = 0.14 * v_shade * v_shade;
	// На просвет лист светится жёлто-зелёным, а не просто своим цветом.
	BACKLIGHT = albedo * vec3(1.25, 1.35, 0.55) * backlight;
	AO = v_shade;
	AO_LIGHT_AFFECT = 0.35;
	// Свет, отражённый от земли и соседних листьев. Без него тень внутри кроны
	// освещается только небом и становится неестественно синей.
	EMISSION = albedo * vec3(0.26, 0.32, 0.1) * daylight * (1.0 - v_shade * 0.55);
}
