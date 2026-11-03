// Дальние склоны: лес и камень пятнами, чтобы они не выглядели гладкими.
shader_type spatial;

uniform sampler2D noise : filter_linear_mipmap_anisotropic, repeat_enable;

varying vec3 wp;

void vertex() {
	wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	float a = texture(noise, wp.xz * 0.0031).r;
	float b = texture(noise, wp.xz * 0.019).r;
	float c = texture(noise, wp.xz * 0.11).r;
	ALBEDO = COLOR.rgb * (0.5 + a * 0.5 + b * 0.5 + c * 0.25);
	ROUGHNESS = 1.0;
	SPECULAR = 0.1;
}
