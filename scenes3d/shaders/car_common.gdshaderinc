// Общее для кузова и стекла: рисунки стёкол и швов в проекциях, колёсные арки.
uniform sampler2D side_mask : hint_default_black, filter_linear_mipmap_anisotropic, repeat_disable;
uniform sampler2D side_left : hint_default_black, filter_linear_mipmap_anisotropic, repeat_disable;
uniform bool has_left = false;
uniform sampler2D top_mask : hint_default_black, filter_linear_mipmap_anisotropic, repeat_disable;
uniform sampler2D front_mask : hint_default_black, filter_linear_mipmap_anisotropic, repeat_disable;
uniform sampler2D rear_mask : hint_default_black, filter_linear_mipmap_anisotropic, repeat_disable;
uniform float arch_z = 1.34;
uniform float arch_zf = 1.34;
uniform float arch_y = 0.33;
uniform float arch_r = 0.39;
uniform float half_length = 2.4;
uniform float height = 1.9;
uniform float half_width = 1.05;

varying vec3 op;
varying vec3 on;

vec3 car_mask(vec3 n) {
	if (abs(n.z) < 0.86) {
		if (abs(n.x) > 0.5) {
			vec2 uv = vec2((op.z + half_length) / (2.0 * half_length), 1.0 - op.y / height);
			return (has_left && op.x < 0.0) ? texture(side_left, uv).rgb : texture(side_mask, uv).rgb;
		}
		return texture(top_mask, vec2((op.x + half_width) / (2.0 * half_width), (op.z + half_length) / (2.0 * half_length))).rgb;
	}
	vec2 uv = vec2((op.x + half_width) / (2.0 * half_width), 1.0 - op.y / height);
	return n.z < 0.0 ? texture(front_mask, uv).rgb : texture(rear_mask, uv).rgb;
}

bool in_arch(vec3 n) {
	return abs(op.x) > 0.5 && abs(n.x) > 0.25 && (distance(op.zy, vec2(arch_z, arch_y)) < arch_r || distance(op.zy, vec2(-arch_zf, arch_y)) < arch_r);
}
