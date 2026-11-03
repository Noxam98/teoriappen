// Туннель. Свод: торкрет с буграми, потёками и швами. Стены: бетонные панели с копотью снизу.
shader_type spatial;
render_mode cull_disabled;

uniform sampler2D noise : filter_linear_mipmap_anisotropic, repeat_enable;
uniform bool panels = false;
// Снаружи видно жерло: чем глубже от входа, тем темнее. 1000 значит, что камера внутри и темнить нечего.
uniform float mouth_z = 1000.0;

varying vec3 wp;

float n(vec2 p) {
	return texture(noise, p).r;
}

float hash(float v) {
	return fract(sin(v * 91.17) * 43758.5453);
}

void vertex() {
	wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	// Развёртка по настоящей длине дуги: метр поверхности равен метру текстуры, поэтому ничего не тянется.
	// Правая стена, свод и левая стена идут одной непрерывной координатой.
	const float WALL = 3.4;
	const float RISE = 2.9;
	const float HALF = 5.6;
	const float RADIUS = 4.25;
	float s;
	if (wp.y > WALL) {
		s = WALL + atan((wp.y - WALL) / RISE, wp.x / HALF) * RADIUS;
	} else if (wp.x > 0.0) {
		s = wp.y;
	} else {
		s = WALL + PI * RADIUS + (WALL - wp.y);
	}
	vec2 uv = vec2(wp.z, s);
	vec3 c;
	float h;
	float rough = 0.95;
	if (panels) {
		float cell = floor(wp.z / 6.0);
		float along = fract(wp.z / 6.0) * 6.0;
		float seam = 1.0 - smoothstep(0.02, 0.07, min(along, 6.0 - along));
		float tone = 0.86 + hash(cell) * 0.2;
		float cloud = n(uv * 0.13 + hash(cell) * 7.0) * 0.6 + n(uv * 0.55) * 0.28 + n(uv * 2.3) * 0.12;
		float grain = n(uv * 6.0);
		// Копоть и брызги от колёс: густо у пола, кверху рваными пятнами. Шум не вытянут ни в какую сторону.
		float soot = smoothstep(2.3, 0.2, wp.y + (n(uv * 0.17) - 0.5) * 1.5 + (n(uv * 0.8) - 0.5) * 0.6);
		float stain = smoothstep(0.6, 0.8, n(uv * 0.21 + 3.1));
		c = vec3(0.6, 0.61, 0.6) * tone * (0.8 + cloud * 0.4) + (grain - 0.5) * 0.05;
		c = mix(c, vec3(0.34, 0.31, 0.27), stain * 0.2);
		c = mix(c, vec3(0.1, 0.1, 0.105), soot * 0.8);
		c = mix(c, vec3(0.03), seam);
		// Отбойная полоса краской на уровне колеса.
		float band = smoothstep(0.02, 0.0, abs(wp.y - 1.02) - 0.05);
		c = mix(c, vec3(0.62, 0.64, 0.66), band * (1.0 - soot * 0.45));
		h = grain * 0.04 + cloud * 0.06 - seam * 0.7;
		rough = 0.74;
	} else {
		float lumps = n(uv * 0.3) * 0.52 + n(uv * 0.95 + 0.3) * 0.3 + n(uv * 3.4 + 0.7) * 0.18;
		float blot = n(uv * 0.09 + 2.1);
		// Сырые пятна на своде: шум одинаков во все стороны.
		float wet = smoothstep(0.6, 0.78, n(uv * 0.16 + 4.2) * 0.65 + blot * 0.35);
		float rust = smoothstep(0.68, 0.82, n(uv * 0.21 + 5.3));
		// Швы опалубки через каждые 12 м.
		float ring = fract(wp.z / 12.0) * 12.0;
		float joint = 1.0 - smoothstep(0.02, 0.09, min(ring, 12.0 - ring));
		c = mix(vec3(0.15, 0.15, 0.155), vec3(0.34, 0.335, 0.32), smoothstep(0.32, 0.72, lumps));
		c *= 0.78 + blot * 0.44;
		c = mix(c, vec3(0.08, 0.085, 0.09), wet * 0.6);
		c = mix(c, vec3(0.27, 0.17, 0.1), rust * 0.42);
		c = mix(c, vec3(0.05), joint * 0.8);
		h = lumps - joint * 0.18;
		rough = mix(0.96, 0.5, wet);
	}
	if (mouth_z < 999.0) {
		c *= mix(1.0, 0.07, smoothstep(0.0, 15.0, mouth_z - wp.z));
	}
	ALBEDO = c;
	ROUGHNESS = rough;
	// Неровность из высоты: нормаль по производным, без отдельной карты.
	vec3 dpx = dFdx(VERTEX);
	vec3 dpy = dFdy(VERTEX);
	vec3 r1 = cross(dpy, NORMAL);
	vec3 r2 = cross(NORMAL, dpx);
	float det = dot(dpx, r1);
	vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
	float k = panels ? 0.06 : 0.2;
	NORMAL = normalize(abs(det) * NORMAL - k * grad);
}
