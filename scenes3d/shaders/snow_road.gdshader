// Зимняя дорога: вся полоса разъезжена до мокрой каши, снег лежит неровно по краям и вдоль середины.
shader_type spatial;

uniform sampler2D noise : filter_linear_mipmap_anisotropic, repeat_enable;

// На изгибе полосы идут не вдоль оси z, поэтому снег лежит пятнами без разделения на полосы.
uniform bool plain = false;

varying vec3 wp;

float n(vec2 p) {
	return texture(noise, p).r;
}

void vertex() {
	wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	vec2 p = wp.xz;
	// Разводы вытянуты вдоль дороги, как после колёс; шаг поперёк намного меньше, чем вдоль.
	float along = n(vec2(p.x * 0.3, p.y * 0.016));
	float streak = n(vec2(p.x * 1.3 + 3.7, p.y * 0.05));
	float blotch = n(p * 0.085 + 1.3);
	float fine = n(p * 1.5);
	float grain = n(p * 6.5);
	// Расстояние от середины своей полосы. Край разъезженной части рваный и всё время гуляет.
	float lane = abs(abs(wp.x) - 1.75);
	float wander = (along - 0.5) * 1.5 + (blotch - 0.5) * 1.2 + (fine - 0.5) * 0.5;
	float snow = plain ? 0.12 + smoothstep(0.44, 0.66, blotch * 0.6 + fine * 0.4) * 0.42 : smoothstep(0.75, 1.5, lane + wander);
	// Посреди полосы местами остаются пятна укатанного снега.
	float patches = smoothstep(0.58, 0.74, n(vec2(p.x * 0.42 + 9.1, p.y * 0.04)) * 0.55 + blotch * 0.45);
	snow = max(snow, patches * 0.5);
	vec3 slush = mix(vec3(0.13, 0.135, 0.145), vec3(0.34, 0.35, 0.37), streak * 0.65 + fine * 0.35);
	vec3 packed = mix(vec3(0.56, 0.58, 0.62), vec3(0.78, 0.8, 0.84), streak);
	vec3 clean = vec3(0.92, 0.93, 0.96);
	vec3 c = mix(slush, packed, smoothstep(0.08, 0.55, snow));
	c = mix(c, clean, smoothstep(0.55, 1.0, snow));
	ALBEDO = c + (grain - 0.5) * 0.04;
	// Каша мокрая и блестит, снег матовый.
	ROUGHNESS = mix(0.42, 0.93, smoothstep(0.0, 0.6, snow));
	SPECULAR = mix(0.55, 0.3, snow);
}
