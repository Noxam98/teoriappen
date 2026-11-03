// Дорожная краска: слегка стёртая, с зернистой кромкой.
shader_type spatial;
render_mode blend_mix, depth_draw_never;

uniform sampler2D noise : filter_linear_mipmap_anisotropic, repeat_enable;
uniform vec3 color : source_color = vec3(0.9);
uniform float wear = 0.4;

varying vec3 wp;

void vertex() {
	wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	float n = texture(noise, wp.xz * 0.9).r * 0.6 + texture(noise, wp.xz * 0.21).r * 0.4;
	float a = 1.0 - wear * smoothstep(0.42, 0.72, n);
	ALBEDO = color * mix(0.8, 1.0, n);
	ALPHA = a;
	ROUGHNESS = 0.72;
	SPECULAR = 0.4;
}
