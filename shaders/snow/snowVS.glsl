#version 300 es

in vec3 a_position;

uniform mat4 u_mvMatrix;
uniform mat4 u_pMatrix;
uniform float u_pSize;

void main() {
    gl_Position = u_pMatrix * u_mvMatrix * vec4(vec3(a_position.x, a_position.y, 0), 1.0);
    gl_PointSize = a_position.z;
}