// Черепица или шифер: ряды по склону.
shader_type spatial;

uniform sampler2D noise : filter_linear_mipmap_anisotropic, repeat_enable;
uniform vec3 color : source_color = vec3(0.2);

varying vec3 op;
varying vec3 wp;

void vertex() {
	op = VERTEX;
	wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	float row = fract(op.y / 0.17);
	float shade = smoothstep(0.0, 0.25, row) * 0.28 + 0.72;
	float n = texture(noise, wp.xz * 0.5).r;
	ALBEDO = color * shade * (0.8 + n * 0.4);
	ROUGHNESS = 0.8;
	SPECULAR = 0.35;
}
