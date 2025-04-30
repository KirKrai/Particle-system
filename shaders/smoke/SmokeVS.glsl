uniform mat4 u_mvMatrix;
uniform mat4 u_pMatrix;

attribute vec3 a_position;

void main() {
    gl_Position = u_pMatrix * u_mvMatrix * vec4(a_position, 1.0);
    gl_PointSize = 256.0;
}