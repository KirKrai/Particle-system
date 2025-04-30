const TrackVS = `attribute vec3 a_position;
attribute vec3 a_color;

varying vec3 v_color;

uniform mat4 u_mvMatrix;
uniform mat4 u_pMatrix;

void main() {
    v_color = a_color;
    gl_Position = u_pMatrix * u_mvMatrix * vec4(a_position, 1.0);
}`
export default TrackVS;