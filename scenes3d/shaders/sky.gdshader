shader_type sky;

global uniform vec3 sun_dir;
global uniform vec3 moon_dir;

uniform sampler2D cloud_noise : filter_linear_mipmap, repeat_enable;
uniform float cloud_cover : hint_range(0.0, 1.0) = 0.4;
uniform float cloud_speed = 0.0035;

uniform vec3 zenith_day : source_color = vec3(0.17, 0.42, 0.80);
uniform vec3 horizon_day : source_color = vec3(0.70, 0.84, 0.95);
uniform vec3 zenith_dusk : source_color = vec3(0.17, 0.25, 0.52);
uniform vec3 horizon_dusk : source_color = vec3(0.92, 0.62, 0.46);
uniform vec3 zenith_night : source_color = vec3(0.012, 0.022, 0.065);
uniform vec3 horizon_night : source_color = vec3(0.075, 0.115, 0.205);

float hash13(vec3 p) {
	p = fract(p * 0.1031);
	p += dot(p, p.zyx + 31.32);
	return fract((p.x + p.y) * p.z);
}

vec3 atmosphere(vec3 d, vec3 s, float day, float dusk, float night) {
	vec3 zenith = mix(mix(zenith_dusk, zenith_day, day), zenith_night, night);
	vec3 horizon = mix(mix(horizon_dusk, horizon_day, day), horizon_night, night);

	float up = clamp(d.y, 0.0, 1.0);
	vec3 col = mix(zenith, horizon, pow(1.0 - up, 3.6));

	// Закатная полоса: со стороны солнца оранжевая, с другой сиреневая.
	vec2 dh = normalize(d.xz + vec2(0.0001));
	vec2 sh = normalize(s.xz + vec2(0.0001));
	float toward = clamp(dot(dh, sh) * 0.5 + 0.5, 0.0, 1.0);
	float band = pow(1.0 - up, 8.0);
	col += dusk * band * mix(vec3(0.20, 0.12, 0.30), vec3(1.9, 0.72, 0.18), pow(toward, 2.2));

	// Ореол вокруг солнца.
	float mu = max(dot(d, s), 0.0);
	vec3 glow_tint = mix(vec3(1.0, 0.48, 0.16), vec3(1.0, 0.92, 0.80), day);
	float above = smoothstep(-0.22, 0.0, s.y);
	col += glow_tint * above * (pow(mu, 5.0) * 0.09 + pow(mu, 42.0) * 0.26 + pow(mu, 380.0) * 0.7);
	return col;
}

void sky() {
	vec3 d = normalize(EYEDIR);
	vec3 s = sun_dir;
	float day = smoothstep(-0.04, 0.28, s.y);
	float dusk = smoothstep(-0.22, -0.02, s.y) * (1.0 - smoothstep(0.05, 0.40, s.y));
	float night = 1.0 - smoothstep(-0.24, -0.04, s.y);

	vec3 col = atmosphere(d, s, day, dusk, night);

	if (!AT_CUBEMAP_PASS) {
		if (d.y > -0.02) {
			// Звёзды: случайные яркие точки в ячейках сетки направлений.
			vec3 q = d * 210.0;
			vec3 cell = floor(q);
			float star_seed = hash13(cell);
			if (star_seed > 0.9965) {
				vec3 star_pos = cell + vec3(hash13(cell + 1.7), hash13(cell + 4.1), hash13(cell + 7.3));
				float point = 1.0 - smoothstep(0.0, 0.55, distance(q, star_pos));
				float twinkle = 0.65 + 0.35 * sin(TIME * (1.0 + star_seed * 5.0) + star_seed * 900.0);
				vec3 star_tint = mix(vec3(0.75, 0.84, 1.0), vec3(1.0, 0.88, 0.72), hash13(cell + 9.9));
				col += star_tint * point * twinkle * night * 2.6 * smoothstep(0.0, 0.1, d.y);
			}
		}

		// Диск солнца.
		float sun_disc = smoothstep(0.99955, 0.99982, dot(d, s));
		vec3 disc_tint = mix(vec3(14.0, 6.5, 2.2), vec3(26.0, 23.0, 18.0), day);
		col += disc_tint * sun_disc;

		// Диск луны с неровными пятнами.
		float moon_cos = dot(d, moon_dir);
		float moon_disc = smoothstep(0.99925, 0.99955, moon_cos);
		if (moon_disc > 0.0) {
			float moon_patches = texture(cloud_noise, d.xz * 7.0).r;
			col += moon_disc * mix(0.55, 1.1, moon_patches) * vec3(0.92, 0.95, 1.0) * mix(1.6, 0.25, day);
		}
		col += vec3(0.5, 0.58, 0.72) * pow(max(moon_cos, 0.0), 300.0) * 0.14 * night;
	}

	// Облака: плоский слой шума, спроецированный на небо.
	if (d.y > 0.0) {
		vec2 uv = d.xz / (d.y + 0.17);
		vec2 drift = vec2(TIME * cloud_speed, TIME * cloud_speed * 0.45);
		float n = texture(cloud_noise, uv * 0.13 + drift).r * 0.62
			+ texture(cloud_noise, uv * 0.31 - drift * 1.3).r * 0.28
			+ texture(cloud_noise, uv * 0.97 + drift * 2.0).r * 0.10;
		float threshold = 1.0 - cloud_cover;
		float density = smoothstep(threshold, threshold + 0.2, n) * smoothstep(0.0, 0.13, d.y);
		float toward_sun = texture(cloud_noise, (uv + s.xz * 0.45) * 0.13 + drift).r * 0.62
			+ texture(cloud_noise, (uv + s.xz * 0.45) * 0.31 - drift * 1.3).r * 0.28 + 0.05;
		float lit = clamp(0.62 + (n - toward_sun) * 3.2, 0.0, 1.0);

		vec3 lit_day = vec3(1.25, 1.22, 1.18);
		vec3 shade_day = vec3(0.52, 0.58, 0.70);
		vec3 lit_dusk = vec3(1.55, 0.72, 0.42);
		vec3 shade_dusk = vec3(0.36, 0.27, 0.40);
		vec3 lit_night = vec3(0.075, 0.09, 0.13);
		vec3 shade_night = vec3(0.018, 0.024, 0.042);
		vec3 lit_tone = mix(mix(lit_dusk, lit_day, day), lit_night, night);
		vec3 shade_tone = mix(mix(shade_dusk, shade_day, day), shade_night, night);
		col = mix(col, mix(shade_tone, lit_tone, lit), density * 0.92);
	}

	// Ниже горизонта небо темнеет: это нужно для отражений в воде.
	col *= mix(1.0, 0.6, smoothstep(0.0, 0.3, -d.y));
	COLOR = col;
}
