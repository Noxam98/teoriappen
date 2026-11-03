// Деревянная обшивка дома: горизонтальные доски с тенью в стыках.
shader_type spatial;

uniform sampler2D noise : filter_linear_mipmap_anisotropic, repeat_enable;
uniform vec3 color : source_color = vec3(0.85, 0.82, 0.74);
uniform float board = 0.2;

varying vec3 wp;
varying vec3 wn;

void vertex() {
	wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wn = (MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz;
}

void fragment() {
	float h = fract(wp.y / board);
	float seam = smoothstep(0.84, 0.98, h);
	vec2 along = abs(wn.x) > abs(wn.z) ? vec2(wp.z, wp.y) : vec2(wp.x, wp.y);
	float grain = texture(noise, along * vec2(0.12, 1.6)).r;
	ALBEDO = color * (0.86 + grain * 0.24) * (1.0 - seam * 0.42);
	ROUGHNESS = 0.82;
	SPECULAR = 0.3;
}
