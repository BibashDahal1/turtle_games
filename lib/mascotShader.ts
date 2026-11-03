/**
 * Skinned-sprite shader for the waving diver turtle.
 *
 * The mascot is the exact artwork (public/turtle/turtle-mascot.png, 896 x 1200 px) on a finely
 * subdivided plane. Instead of cutting the arm out, the vertex shader bends the mesh with soft
 * "bone weights": the raised arm sways from the shoulder and the hand waves from the wrist.
 * Nothing is cut, so there are no seams or gaps. Coordinates below are pixels of that image
 * (y pointing down). If you swap the artwork, update MASCOT_SIZE and the joint positions.
 */
export const MASCOT_SIZE: [number, number] = [896, 1200];

export const MASCOT_VERT = /* glsl */ `
uniform vec2 uSize;
uniform float uWorldPerPx;
uniform float uA;   // arm sway (radians), pivot = shoulder
uniform float uH;   // hand wave (radians), pivot = wrist
varying vec2 vUv;

float sstep(float a, float b, float x) {
  float t = clamp((x - a) / (b - a), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}
vec2 rot(vec2 v, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

void main() {
  vUv = uv;
  vec2 p = vec2(uv.x * uSize.x, (1.0 - uv.y) * uSize.y);

  const vec2 S  = vec2(330.0, 650.0);   // shoulder
  const vec2 W  = vec2(155.0, 560.0);   // wrist (green cuff)
  const vec2 A0 = vec2(280.0, 632.0);   // arm "bone" start
  const vec2 A1 = vec2(120.0, 450.0);   // arm "bone" end (over the hand)

  vec2 ab = A1 - A0;
  float L = length(ab);
  vec2 d = ab / L;
  vec2 q = p - A0;
  float tt = dot(q, d) / L;                         // position along the arm
  float perp = abs(q.x * d.y - q.y * d.x);          // distance from the arm axis
  float tw = dot(W - A0, d) / L;                    // where the wrist sits

  float grow = sstep(tw, tw + 0.2, tt);             // the hand is wider than the sleeve
  float rin = mix(58.0, 85.0, grow);
  float w = 1.0 - sstep(rin, rin + 27.0, perp);     // 1 on the arm, 0 on head / shell / torso
  w *= sstep(0.08, 0.45, tt);                       // pinned near the shoulder
  float hs = sstep(tw - 0.05, tw + 0.15, tt);       // 0 on the forearm, 1 on the hand

  vec2 p1 = p + w * (rot(p - S, uA) + S - p);
  vec2 W1 = rot(W - S, uA) + S;
  vec2 p2 = p1 + (w * hs) * (rot(p1 - W1, uH) + W1 - p1);

  vec2 dp = p2 - p;
  vec3 pos = position + vec3(dp.x * uWorldPerPx, -dp.y * uWorldPerPx, 0.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`;

export const MASCOT_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uAlpha;   // 1 = visible, 0 = faded out (it swims away into the background)
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(uMap, vUv);
  gl_FragColor.a *= uAlpha;
  //__COLORSPACE__
}`;
