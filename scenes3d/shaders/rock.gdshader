shader_type spatial;
render_mode diffuse_burley, specular_schlick_ggx;

global uniform sampler2D island_noise;

uniform vec3 rock_light : source_color = vec3(0.60, 0.56, 0.50);
uniform vec3 rock_dark : source_color = vec3(0.29, 0.27, 0.25);
uniform vec3 moss : source_color = vec3(0.20, 0.27, 0.11);

varying vec3 v_world;
varying vec3 v_world_normal;

void vertex() {
	v_world = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_world_normal = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

float triplanar(vec3 p, vec3 n, float scale) {
	vec3 w = pow(abs(n), vec3(4.0));
	w /= w.x + w.y + w.z;
	return texture(island_noise, p.zy * scale).r * w.x
		+ texture(island_noise, p.xz * scale).r * w.y
		+ texture(island_noise, p.xy * scale).r * w.z;
}

void fragment() {
	vec3 n = normalize(v_world_normal);
	float big = triplanar(v_world, n, 0.11);
	float fine = triplanar(v_world, n, 0.73);
	vec3 col = mix(rock_dark, rock_light, big * 0.6 + fine * 0.4);
	float moss_amount = smoothstep(0.62, 0.95, n.y + (big - 0.5) * 0.5) * 0.8;
	col = mix(col, moss * mix(0.7, 1.2, fine), moss_amount * step(1.6, v_world.y));
	ALBEDO = col;
	ROUGHNESS = 0.9;
	SPECULAR = 0.3;
}
