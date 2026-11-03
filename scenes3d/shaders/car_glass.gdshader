// Стекло: прозрачное, с лёгкой тонировкой и отражением неба.
shader_type spatial;
render_mode blend_premul_alpha, depth_draw_never;

#include "car_common.gdshaderinc"

uniform float tint = 0.3;

void vertex() {
	op = VERTEX;
	on = NORMAL;
}

void fragment() {
	vec3 n = normalize(on);
	vec3 m = car_mask(n);
	if (m.r <= 0.5) {
		discard;
	}
	ALBEDO = vec3(0.012, 0.018, 0.02);
	ALPHA = tint;
	ROUGHNESS = 0.05;
	METALLIC = 0.0;
	SPECULAR = 0.75;
}
