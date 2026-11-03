// Асфальт, трава, тротуар, бордюр: цвет и неровности считаются по мировым координатам.
shader_type spatial;

uniform sampler2D noise : filter_linear_mipmap_anisotropic, repeat_enable;
uniform vec3 color_a : source_color = vec3(0.16);
uniform vec3 color_b : source_color = vec3(0.24);
uniform float fine_scale = 1.1;
uniform float mid_scale = 0.17;
uniform float big_scale = 0.019;
uniform float fine_amount = 0.5;
uniform float mid_amount = 0.3;
uniform float big_amount = 0.2;
uniform float rough = 0.9;
uniform float bump = 0.35;
uniform float slab_size = 0.0;
uniform float wheel_tracks = 0.0;
uniform float tracks_half = 1.75;

varying vec3 wp;

float field(vec2 p) {
	vec2 a = mat2(vec2(0.8, 0.6), vec2(-0.6, 0.8)) * p;
	vec2 b = mat2(vec2(0.28, 0.96), vec2(-0.96, 0.28)) * p;
	float fine = (texture(noise, a * fine_scale).r + texture(noise, b * fine_scale * 0.61 + 0.37).r) * 0.5;
	return fine * fine_amount + texture(noise, b * mid_scale).r * mid_amount + texture(noise, a * big_scale).r * big_amount;
}

void vertex() {
	wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	vec2 p = wp.xz + vec2(wp.y * 0.7);
	float f = field(p);
	vec3 col = mix(color_a, color_b, smoothstep(0.3, 0.7, f));
	float r = rough;
	if (wheel_tracks > 0.0) {
		float d = abs(abs(wp.x) - tracks_half);
		float track = 1.0 - smoothstep(0.25, 0.75, abs(d - 0.8));
		col *= 1.0 - track * wheel_tracks;
		r -= track * wheel_tracks * 0.35;
	}
	if (slab_size > 0.0) {
		vec2 q = wp.xz / slab_size;
		vec2 g = abs(fract(q) - 0.5);
		float joint = smoothstep(0.47, 0.495, max(g.x, g.y));
		col *= 1.0 - joint * 0.45;
	}
	float e = 0.03;
	float dx = field(p + vec2(e, 0.0)) - f;
	float dz = field(p + vec2(0.0, e)) - f;
	NORMAL = normalize(NORMAL + (VIEW_MATRIX * vec4(-dx, 0.0, -dz, 0.0)).xyz * bump * 6.0);
	ALBEDO = col;
	ROUGHNESS = r;
	SPECULAR = 0.35;
}
