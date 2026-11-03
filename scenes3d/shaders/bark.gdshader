shader_type spatial;
render_mode diffuse_burley, specular_schlick_ggx;

global uniform sampler2D island_noise;

uniform vec3 bark_dark : source_color = vec3(0.24, 0.19, 0.14);
uniform vec3 bark_light : source_color = vec3(0.47, 0.40, 0.31);
// Сколько колец на метр ствола. Ноль означает обычную кору с продольными бороздами.
uniform float rings_per_meter = 0.0;

instance uniform vec2 lod_range = vec2(-100.0, 100000.0);

void vertex() {
	vec3 origin = MODEL_MATRIX[3].xyz;
	float dist = distance(origin, MAIN_CAM_INV_VIEW_MATRIX[3].xyz);
	if (dist < lod_range.x || dist >= lod_range.y) {
		VERTEX = vec3(0.0);
	}
}

void fragment() {
	// Продольные борозды коры: шум сильно вытянут вдоль ствола.
	float stripes = texture(island_noise, UV * vec2(1.3, 0.09)).r;
	float flakes = texture(island_noise, UV * vec2(4.3, 0.75)).r;
	float furrow = smoothstep(0.34, 0.68, stripes * 0.72 + flakes * 0.28);
	if (rings_per_meter > 0.0) {
		float ring = pow(0.5 + 0.5 * sin(UV.y * rings_per_meter * 6.2831853 + flakes * 2.0), 3.0);
		furrow = mix(0.72 + flakes * 0.28, 0.1, ring);
	}
	ALBEDO = mix(bark_dark, bark_light, furrow) * COLOR.r;
	ROUGHNESS = 0.94;
	SPECULAR = 0.12;
	AO = mix(0.6, 1.0, furrow);
}
