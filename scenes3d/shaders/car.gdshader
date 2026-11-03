// Кузов: краска, швы и пластик по рисункам. Там, где стекло, кузова нет: его рисует car_glass.
shader_type spatial;
render_mode cull_disabled;

#include "car_common.gdshaderinc"

uniform vec3 paint : source_color = vec3(0.6, 0.05, 0.05);
uniform vec3 trim_low : source_color = vec3(0.07);
uniform vec3 trim_high : source_color = vec3(0.42, 0.41, 0.39);
uniform float trim_y = 1.05;

void vertex() {
	op = VERTEX;
	on = NORMAL;
}

void fragment() {
	vec3 n = normalize(on);
	if (in_arch(n)) {
		discard;
	}
	vec3 m = car_mask(n);
	if (m.r > 0.5) {
		discard;
	}
	if (!FRONT_FACING) {
		ALBEDO = op.y > trim_y ? trim_high : trim_low;
		ROUGHNESS = 0.9;
	} else {
		vec3 col = mix(paint, vec3(0.012), m.g);
		float metal = mix(0.18, 0.0, m.g);
		float r = mix(0.34, 0.62, m.g);
		col = mix(col, vec3(0.75), m.b);
		metal = mix(metal, 1.0, m.b);
		r = mix(r, 0.2, m.b);
		ALBEDO = col;
		METALLIC = metal;
		ROUGHNESS = r;
		CLEARCOAT = (1.0 - m.g) * 0.55;
		CLEARCOAT_ROUGHNESS = 0.14;
		SPECULAR = 0.55;
	}
}
