// Склон над туннелем: взорванная скала на крутом, трава на пологом. Текстура проецируется по трём осям и не тянется.
shader_type spatial;
render_mode cull_disabled;

uniform sampler2D noise : filter_linear_mipmap_anisotropic, repeat_enable;
// С какой пологости начинается трава: 0,66 только на почти ровном, 0,42 и на крутой засыпке.
uniform float grass_from = 0.66;

varying vec3 wp;
varying vec3 wn;

float tri(vec3 p, vec3 b, float s) {
	return texture(noise, p.zy * s).r * b.x + texture(noise, p.xz * s).r * b.y + texture(noise, p.xy * s).r * b.z;
}

void vertex() {
	wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wn = (MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz;
}

void fragment() {
	vec3 u = normalize(wn);
	vec3 b = pow(abs(u), vec3(4.0));
	b /= b.x + b.y + b.z;
	float lumps = tri(wp, b, 0.05) * 0.5 + tri(wp, b, 0.21) * 0.28 + tri(wp, b, 0.8) * 0.14 + tri(wp, b, 2.6) * 0.08;
	vec3 rock = mix(vec3(0.12, 0.115, 0.11), vec3(0.38, 0.365, 0.34), smoothstep(0.3, 0.72, lumps));
	// Трещины: тонкие тёмные линии там, где шум проходит через середину.
	float crack = abs(tri(wp, b, 0.12) - 0.5);
	rock *= mix(0.5, 1.0, smoothstep(0.0, 0.016, crack));
	float green = smoothstep(grass_from, grass_from + 0.2, abs(u.y) + (tri(wp, b, 0.17) - 0.5) * 0.3);
	vec3 grass = mix(vec3(0.09, 0.16, 0.045), vec3(0.2, 0.27, 0.08), tri(wp, b, 0.4));
	ALBEDO = mix(rock, grass, green);
	ROUGHNESS = 0.95;
	vec3 dpx = dFdx(VERTEX);
	vec3 dpy = dFdy(VERTEX);
	vec3 r1 = cross(dpy, NORMAL);
	vec3 r2 = cross(NORMAL, dpx);
	float det = dot(dpx, r1);
	vec3 grad = sign(det) * (dFdx(lumps) * r1 + dFdy(lumps) * r2);
	NORMAL = normalize(abs(det) * NORMAL - mix(0.7, 0.15, green) * grad);
}
