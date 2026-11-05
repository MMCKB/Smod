var LiquidGlassNS=(()=>{var Ie=Object.defineProperty;var ni=Object.getOwnPropertyDescriptor;var li=Object.getOwnPropertyNames;var hi=Object.prototype.hasOwnProperty;var ci=(s,e)=>{for(var t in e)Ie(s,t,{get:e[t],enumerable:!0})},ui=(s,e,t,i)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of li(e))!hi.call(s,r)&&r!==t&&Ie(s,r,{get:()=>e[r],enumerable:!(i=ni(e,r))||i.enumerable});return s};var di=s=>ui(Ie({},"__esModule",{value:!0}),s);var Ms={};ci(Ms,{BACKDROP_UPDATES:()=>q,COMPOSITE_MODES:()=>ye,DEFAULT_MATERIAL:()=>Z,DEFAULT_MATERIAL_V1:()=>Ve,DEFAULT_MATERIAL_V2:()=>Z,DEFAULT_NAVIGATION_LENS:()=>lt,LiquidGlass:()=>De,LiquidGlassNavbar:()=>_e,LiquidGlassSwitch:()=>Fe,LiquidGlassWebGL:()=>z,LiquidGlassWebGLV1:()=>ct,LiquidGlassWebGLV2:()=>z,MAX_GLASS_SHAPES:()=>A,MIPS:()=>Ge,PRESETS_V1:()=>He,PRESSED_CONTROL_MATERIAL_V2:()=>nt,REDUCED_TRANSPARENCY_MATERIAL:()=>ce,REDUCED_TRANSPARENCY_MATERIAL_V1:()=>qe,REDUCED_TRANSPARENCY_MATERIAL_V2:()=>ce,SHAPES:()=>Ue,SLIDERS:()=>Se,SLIDERS_V2:()=>Se,connectedElementGroups:()=>We,distanceToElements:()=>ue,distanceToElementsV2:()=>ue,getDefaultMaterial:()=>X,getDefaultMaterialV1:()=>Xe,getDefaultMaterialV2:()=>X,getPressedControlMaterialV2:()=>Be,groupElements:()=>ne,hitTestElements:()=>de,hitTestElementsV1:()=>Oe,hitTestElementsV2:()=>de,makeMaterial:()=>_,makeMaterialV1:()=>he,makeMaterialV2:()=>_,sdGroup:()=>we});var oe=`#version 300 es
in vec2 aPos;
out vec2 vUV;
void main() {
  vUV = aPos;
  gl_Position = vec4(aPos * 2.0 - 1.0, 0.0, 1.0);
}`,ut=`#version 300 es
in vec2 aPos;
uniform vec2 uRes;
uniform vec2 uCenter;
uniform vec2 uHalf;
uniform float uPad;
out vec2 vUV;
void main() {
  vec2 half2 = uHalf + uPad;
  vec2 px = uCenter + (aPos * 2.0 - 1.0) * half2;
  vUV = px / uRes;
  gl_Position = vec4(px / uRes * 2.0 - 1.0, 0.0, 1.0);
}`,dt=`#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D uTex;
out vec4 outColor;
vec3 linearToSrgb(vec3 c) {
  c = max(c, 0.0);
  return mix(1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055,
             12.92 * c,
             lessThanEqual(c, vec3(0.0031308)));
}
void main() { outColor = vec4(linearToSrgb(texture(uTex, vUV).rgb), 1.0); }`,ft=`#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D uTex;
uniform vec2 uTexel;   // texel size of the SOURCE level
out vec4 outColor;
void main() {
  vec2 t = uTexel;
  vec4 a = texture(uTex, vUV) * 0.125;
  vec4 b = (texture(uTex, vUV + vec2(-t.x, -t.y)) +
            texture(uTex, vUV + vec2( t.x, -t.y)) +
            texture(uTex, vUV + vec2(-t.x,  t.y)) +
            texture(uTex, vUV + vec2( t.x,  t.y))) * 0.125;
  vec4 c = (texture(uTex, vUV + vec2(-2.0 * t.x, 0.0)) +
            texture(uTex, vUV + vec2( 2.0 * t.x, 0.0)) +
            texture(uTex, vUV + vec2(0.0, -2.0 * t.y)) +
            texture(uTex, vUV + vec2(0.0,  2.0 * t.y))) * 0.0625;
  vec4 d = (texture(uTex, vUV + vec2(-2.0 * t.x, -2.0 * t.y)) +
            texture(uTex, vUV + vec2( 2.0 * t.x, -2.0 * t.y)) +
            texture(uTex, vUV + vec2(-2.0 * t.x,  2.0 * t.y)) +
            texture(uTex, vUV + vec2( 2.0 * t.x,  2.0 * t.y))) * 0.03125;
  // RGB stores radiance. Alpha stores normalized optical density, so the mip
  // chain can blur both representations with exactly the same footprint.
  outColor = a + b + c + d;
}`,pt=`#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D uLow;
uniform sampler2D uHigh;
uniform vec2 uLowTexel;
out vec4 outColor;
void main() {
  vec2 t = uLowTexel;
  vec4 low = texture(uLow, vUV) * 4.0;
  low += (texture(uLow, vUV + vec2( t.x, 0.0)) +
          texture(uLow, vUV + vec2(-t.x, 0.0)) +
          texture(uLow, vUV + vec2(0.0,  t.y)) +
          texture(uLow, vUV + vec2(0.0, -t.y))) * 2.0;
  low += texture(uLow, vUV + vec2( t.x,  t.y)) +
         texture(uLow, vUV + vec2(-t.x,  t.y)) +
         texture(uLow, vUV + vec2( t.x, -t.y)) +
         texture(uLow, vUV + vec2(-t.x, -t.y));
  low *= 1.0 / 16.0;
  vec4 high = texture(uHigh, vUV);
  outColor = mix(high, low, 0.65);
}`,mt=`#version 300 es
precision highp float;
in vec2 vUV;
uniform vec2 uRes;
uniform int uScene;
uniform float uZoom;
uniform sampler2D uWallpaper;
uniform int uUseImage;
out vec4 outColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 srgbToLinear(vec3 c) {
  bvec3 cutoff = lessThanEqual(c, vec3(0.04045));
  vec3 low = c / 12.92;
  vec3 high = pow((c + 0.055) / 1.055, vec3(2.4));
  return mix(high, low, cutoff);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.02; a *= 0.5; }
  return s;
}
// distance to a quadratic bezier (iterative, good enough for a backdrop)
float sdBezier(vec2 p, vec2 a, vec2 b, vec2 c) {
  float best = 1e9;
  vec2 prev = a;
  for (int i = 1; i <= 40; i++) {
    float t = float(i) / 40.0;
    vec2 q = mix(mix(a, b, t), mix(b, c, t), t);
    vec2 pa = p - prev, ba = q - prev;
    float u = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-9), 0.0, 1.0);
    best = min(best, length(pa - ba * u));
    prev = q;
  }
  return best;
}

vec3 sunsetBranches(vec2 uv) {
  // dusk gradient: cool grey-mauve at the top, warm amber near the horizon
  vec3 top = vec3(0.62, 0.55, 0.55);
  vec3 mid = vec3(0.85, 0.63, 0.53);
  vec3 low = vec3(0.94, 0.70, 0.52);
  vec3 col = mix(mid, top, smoothstep(0.45, 1.0, uv.y));
  col = mix(col, low, smoothstep(0.45, 0.0, uv.y));
  col += (fbm(uv * 3.0) - 0.5) * 0.05;

  vec2 p = uv * vec2(uRes.x / uRes.y, 1.0);
  float sc = uRes.x / uRes.y;
  vec3 bark = vec3(0.17, 0.10, 0.09);
  // main trunk + a few branches, thick and dark like the reference photo
  float d = sdBezier(p, vec2(0.42 * sc, -0.1), vec2(0.52 * sc, 0.45), vec2(0.36 * sc, 1.1));
  float m = smoothstep(0.060, 0.040, d);
  d = sdBezier(p, vec2(0.40 * sc, 0.30), vec2(0.62 * sc, 0.44), vec2(0.95 * sc, 0.26));
  m = max(m, smoothstep(0.034, 0.020, d));
  d = sdBezier(p, vec2(0.44 * sc, 0.62), vec2(0.25 * sc, 0.80), vec2(0.05 * sc, 0.72));
  m = max(m, smoothstep(0.022, 0.010, d));
  d = sdBezier(p, vec2(0.46 * sc, 0.80), vec2(0.72 * sc, 0.95), vec2(1.05 * sc, 0.78));
  m = max(m, smoothstep(0.016, 0.007, d));
  d = sdBezier(p, vec2(0.12 * sc, -0.05), vec2(0.18 * sc, 0.5), vec2(0.06 * sc, 1.05));
  m = max(m, smoothstep(0.038, 0.022, d));
  // seed pods
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 c = vec2((0.14 + 0.02 * fi) * sc, 0.30 + 0.26 * fi);
    m = max(m, smoothstep(0.035, 0.022, length((p - c) * vec2(1.0, 0.8))));
  }
  return mix(col, bark, m * 0.94);
}

vec3 deepBlueCity(vec2 uv) {
  vec3 col = mix(vec3(0.06, 0.14, 0.55), vec3(0.02, 0.06, 0.34), smoothstep(0.0, 1.0, uv.y));
  col += (fbm(uv * vec2(90.0, 90.0)) - 0.5) * 0.05;   // fabric-like dither
  // bright vertical tower strip
  float x = abs(uv.x - 0.5);
  float tower = smoothstep(0.035, 0.012, x) * smoothstep(0.02, 0.25, uv.y);
  col = mix(col, vec3(0.72, 0.58, 0.52), tower * 0.85);
  float glow = smoothstep(0.16, 0.0, x) * smoothstep(0.0, 0.5, uv.y) * 0.18;
  col += vec3(0.5, 0.42, 0.36) * glow;
  col = mix(col, vec3(0.10, 0.14, 0.26), smoothstep(0.16, 0.02, uv.y));
  return col;
}

vec3 islandOcean(vec2 uv) {
  float ar = uRes.x / uRes.y;
  vec3 deep = vec3(0.03, 0.26, 0.52);
  vec3 shallow = vec3(0.20, 0.74, 0.82);
  float waves = fbm(vec2(uv.x * ar * 6.0, uv.y * 22.0) + 3.0);
  vec3 col = mix(deep, shallow, smoothstep(0.30, 0.78, waves * 0.7 + uv.y * 0.5));

  vec2 p = (uv - vec2(0.5, 0.40)) * vec2(ar, 1.0);
  float isl = (fbm(p * 2.2 + 11.0) - 0.5) * 0.34;
  float d = length(p * vec2(0.62, 1.25)) - (0.42 + isl);
  // shallow reef ring around the land
  col = mix(col, vec3(0.42, 0.86, 0.86), smoothstep(0.14, 0.03, d) * 0.75);
  col = mix(col, vec3(0.94, 0.90, 0.72), smoothstep(0.035, 0.0, d));        // beach
  vec3 jungle = mix(vec3(0.04, 0.26, 0.09), vec3(0.24, 0.55, 0.20),
                    fbm(p * 9.0 + 5.0));
  col = mix(col, jungle, smoothstep(0.005, -0.02, d));                      // jungle
  return col;
}

vec2 coverUV(vec2 uv) {
  vec2 imageSize = vec2(textureSize(uWallpaper, 0));
  float imageAspect = imageSize.x / max(imageSize.y, 1.0);
  float viewportAspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = uv;
  if (imageAspect > viewportAspect) {
    float crop = (imageAspect / viewportAspect - 1.0) * 0.5;
    p.x = p.x * (1.0 - 2.0 * crop) + crop;
  } else {
    float crop = (viewportAspect / imageAspect - 1.0) * 0.5;
    p.y = p.y * (1.0 - 2.0 * crop) + crop;
  }
  return clamp(p, vec2(0.001), vec2(0.999));
}

void main() {
  vec2 uv = (vUV - 0.5) / max(uZoom, 0.01) + 0.5;
  vec3 col;
  if (uUseImage == 1) {
    // Wallpaper textures are plain RGBA8 holding display/sRGB values; decode
    // to linear radiance here. They are uploaded top row first (no
    // UNPACK_FLIP_Y_WEBGL), so the lookup flips instead.
    vec2 wallpaperUV = coverUV(uv);
    wallpaperUV.y = 1.0 - wallpaperUV.y;
    col = srgbToLinear(texture(uWallpaper, wallpaperUV).rgb);
  } else {
    // Procedural palette constants are authored as display/sRGB colours. The
    // SRGB render target expects linear shader output and encodes it on write.
    col = srgbToLinear(uScene == 0 ? sunsetBranches(uv)
                       : uScene == 1 ? deepBlueCity(uv)
                                     : islandOcean(uv));
  }
  // Beer-Lambert representation of backdrop darkness. A value of 4 optical
  // density units already corresponds to ~1.8% transmission, enough for the
  // near-black branches while retaining useful precision in RGBA8.
  float lum = max(dot(col, vec3(0.2126, 0.7152, 0.0722)), 0.018);
  float density = clamp(-log(lum) / 4.0, 0.0, 1.0);
  outColor = vec4(col, density);
}`,gt=`#version 300 es
precision highp float;
in vec2 vUV;
out vec4 outColor;

uniform sampler2D uSrc;      // blurred mip chain of the backdrop
uniform sampler2D uBlurSrc;  // tent-upsampled reconstruction chain
uniform vec2  uRes;
uniform vec2  uCenter;       // draw-group bounds centre, px (vertex quad only)
uniform vec2  uHalf;         // element half size, px
const int MAX_SHAPES = 16;
uniform int   uShapeCount;
uniform vec2  uShapeCenters[MAX_SHAPES];
uniform vec2  uShapeHalves[MAX_SHAPES];
uniform int   uShapeTypes[MAX_SHAPES]; // 0 square/rect, 1 capsule, 2 circle
uniform float uShapeRadii[MAX_SHAPES];
uniform float uMergeRadius;  // smooth-union reach, px
uniform float uSquircle;     // superellipse exponent (2 = circular corners)
uniform float uBevel;        // max width of the refracting rim, px
uniform float uHeight;       // max glass height / optical thickness, px
uniform float uSizeAdaptation;// 0 = absolute material lengths, 1 = fit small UI
uniform float uIOR;
uniform float uDispersion;
uniform float uBlurPlateau;  // blur radius in the middle, px
uniform float uBlurRim;      // blur radius at the rim, px
uniform float uOpticalDensity;// dark-detail preservation; 0 = linear radiance
uniform float uMips;         // number of levels in the blurred chain
uniform float uSpecular;
uniform float uSpecPower;
uniform float uHighlightAdapt;
uniform float uHighlightWidth;
uniform float uHighlightSharpness;
uniform float uHighlightBase;
uniform float uFresnel;
uniform float uSat;
uniform float uBright;
uniform float uTintAmount;
uniform vec3  uTintColor;
uniform float uTintAdapt;    // content-aware light/dark material polarity
uniform float uShadow;
uniform float uShadowSize;
uniform float uShadowOffset;
uniform vec2  uLightDir;
uniform float uEdgeLine;
uniform float uEdgeWidth;
uniform float uEdgeDark;
uniform float uRefractScale;
uniform float uMeniscus;     // 1 = concave meniscus rim, 0 = convex lens rim
uniform int   uDebug;        // 0 final, 1 thickness, 2 normals, 3 displacement

float sdSquircle(vec2 p, vec2 b, float r, float n) {
  vec2 q = abs(p) - b + r;
  vec2 m = max(q, 0.0) + 1e-5;
  float e = pow(pow(m.x, n) + pow(m.y, n), 1.0 / n);
  return min(max(q.x, q.y), 0.0) + e - r;
}

float sdPrimitive(vec2 p, vec2 halfSize, int shapeType, float radius) {
  if (shapeType == 2) {
    // Circle is invariant: layout cannot turn it into an ellipse.
    return length(p) - min(halfSize.x, halfSize.y);
  }
  if (shapeType == 1) {
    // Apple's capsule rule: end-cap radius is exactly half the short side.
    return sdSquircle(p, halfSize, min(halfSize.x, halfSize.y), 2.0);
  }
  // Square and rectangular folders share the same fixed-radius corner model;
  // only their bounding boxes differ. The default exponent is 2 per reference.
  return sdSquircle(p, halfSize, radius, max(uSquircle, 2.0));
}

// One distance field represents the complete component group. Because the
// normal is derived from this same field below, the meniscus, refraction and
// highlight bend continuously through the bridge instead of exposing two
// composited glass layers.
float sdAppleShape(vec2 px) {
  float nearest = 1e8;
  for (int i = 0; i < MAX_SHAPES; i++) {
    if (i >= uShapeCount) break;
    float next = sdPrimitive(px - uShapeCenters[i], uShapeHalves[i],
                             uShapeTypes[i], uShapeRadii[i]);
    nearest = min(nearest, next);
  }

  if (uMergeRadius < 0.01) return nearest;

  // Global exponential smooth-min is associative and C-infinity. Pairwise
  // polynomial unions are only C1 and become order-dependent with 3+ shapes;
  // their curvature boundaries show up as diagonal tears under sharp glass
  // highlights. 0.36 matches the polynomial union's depth at equal distances.
  float scale = max(uMergeRadius * 0.36, 0.01);
  float sum = 0.0;
  for (int i = 0; i < MAX_SHAPES; i++) {
    if (i >= uShapeCount) break;
    float next = sdPrimitive(px - uShapeCenters[i], uShapeHalves[i],
                             uShapeTypes[i], uShapeRadii[i]);
    sum += exp(-(next - nearest) / scale);
  }
  return nearest - scale * log(max(sum, 1e-6));
}

// Quintic tangent transition. Besides value and slope, its second derivative
// matches at both ends: f(0/1)=0/1, f'(0/1)=0/1, f''(0/1)=0. This lets a
// circular corner leave a straight side with zero curvature instead of the
// rounded-box SDF's abrupt 0 -> 1/r curvature jump.
float tangentTransition(float u) {
  return u * u * u * (6.0 - 8.0 * u + 3.0 * u * u);
}

vec2 primitiveOpticalGradient(vec2 p, vec2 halfSize,
                              int shapeType, float radius) {
  if (shapeType == 2) return normalize(p + 1e-6);

  float exponent = shapeType == 1 ? 2.0 : max(uSquircle, 2.0);
  float resolvedRadius = shapeType == 1
                       ? min(halfSize.x, halfSize.y) : radius;
  vec2 q = abs(p) - halfSize + resolvedRadius;
  vec2 direction;

  if (q.x > 0.0 && q.y > 0.0) {
    // Analytic Lp-corner normal. Exponents above 2 already approach the side
    // with zero curvature; blend out the circular-corner correction by n=3.
    vec2 lp = normalize(pow(q, vec2(exponent - 1.0)) + 1e-6);
    const float HALF_PI = 1.57079632679;
    const float TRANSITION_ANGLE = 0.43633231299; // 25 degrees at each tangent
    float angle = atan(q.y, q.x);
    float easedAngle = angle;
    if (angle < TRANSITION_ANGLE) {
      easedAngle = TRANSITION_ANGLE *
                   tangentTransition(angle / TRANSITION_ANGLE);
    } else if (angle > HALF_PI - TRANSITION_ANGLE) {
      float fromTop = (HALF_PI - angle) / TRANSITION_ANGLE;
      easedAngle = HALF_PI - TRANSITION_ANGLE *
                   tangentTransition(fromTop);
    }
    vec2 continuousCorner = vec2(cos(easedAngle), sin(easedAngle));
    float circularCorner = 1.0 - smoothstep(2.0, 3.0, exponent);
    direction = normalize(mix(lp, continuousCorner, circularCorner));
  } else if (q.x > q.y) {
    direction = vec2(1.0, 0.0);
  } else {
    direction = vec2(0.0, 1.0);
  }

  return direction * sign(p);
}

vec2 opticalGradient(vec2 px) {
  float nearest = 1e8;
  int nearestIndex = 0;
  for (int i = 0; i < MAX_SHAPES; i++) {
    if (i >= uShapeCount) break;
    float next = sdPrimitive(px - uShapeCenters[i], uShapeHalves[i],
                             uShapeTypes[i], uShapeRadii[i]);
    if (next < nearest) {
      nearest = next;
      nearestIndex = i;
    }
  }

  if (uMergeRadius < 0.01 || uShapeCount == 1) {
    return primitiveOpticalGradient(
      px - uShapeCenters[nearestIndex], uShapeHalves[nearestIndex],
      uShapeTypes[nearestIndex], uShapeRadii[nearestIndex]
    );
  }

  // The derivative of exponential smooth-min is the same weighted average of
  // the primitive derivatives. Reusing those weights keeps fused normals C2
  // through both a primitive's tangent and the union bridge.
  float scale = max(uMergeRadius * 0.36, 0.01);
  vec2 gradientSum = vec2(0.0);
  float weightSum = 0.0;
  for (int i = 0; i < MAX_SHAPES; i++) {
    if (i >= uShapeCount) break;
    vec2 local = px - uShapeCenters[i];
    float next = sdPrimitive(local, uShapeHalves[i],
                             uShapeTypes[i], uShapeRadii[i]);
    float weight = exp(-(next - nearest) / scale);
    gradientSum += primitiveOpticalGradient(
      local, uShapeHalves[i], uShapeTypes[i], uShapeRadii[i]
    ) * weight;
    weightSum += weight;
  }
  return gradientSum / max(weightSum, 1e-6);
}

// Shading adaptation belongs to the primitive under this fragment, not to the
// bounds of the whole draw group. The latter changes whenever any component in
// a connected fusion group moves, making every highlight pulse in sympathy.
//
// Around a genuine smooth-union bridge, use the same exponential influence as
// the distance field so the material centre crosses continuously from one
// primitive to the next. Contributions too weak to affect the visible bridge
// are smoothly discarded; a nearby-but-separate component then has exactly no
// influence on this component's highlight or light/dark tint.
void localComponentMetrics(vec2 px, out vec2 componentCenter,
                           out float componentShortSide) {
  float nearest = 1e8;
  vec2 nearestCenter = uShapeCenters[0];
  float nearestShortSide = 1.0;
  for (int i = 0; i < MAX_SHAPES; i++) {
    if (i >= uShapeCount) break;
    float next = sdPrimitive(px - uShapeCenters[i], uShapeHalves[i],
                             uShapeTypes[i], uShapeRadii[i]);
    if (next < nearest) {
      nearest = next;
      nearestCenter = uShapeCenters[i];
      nearestShortSide = 2.0 * min(uShapeHalves[i].x, uShapeHalves[i].y);
    }
  }

  componentCenter = nearestCenter;
  componentShortSide = nearestShortSide;
  if (uMergeRadius < 0.01 || uShapeCount == 1) return;

  float scale = max(uMergeRadius * 0.36, 0.01);
  vec2 centreSum = vec2(0.0);
  float shortSideSum = 0.0;
  float weightSum = 0.0;
  for (int i = 0; i < MAX_SHAPES; i++) {
    if (i >= uShapeCount) break;
    float next = sdPrimitive(px - uShapeCenters[i], uShapeHalves[i],
                             uShapeTypes[i], uShapeRadii[i]);
    float weight = exp(-(next - nearest) / scale);
    weight *= smoothstep(0.04, 0.20, weight);
    centreSum += uShapeCenters[i] * weight;
    shortSideSum += 2.0 * min(uShapeHalves[i].x, uShapeHalves[i].y) * weight;
    weightSum += weight;
  }
  if (weightSum > 0.0) {
    componentCenter = centreSum / weightSum;
    componentShortSide = shortSideSum / weightSum;
  }
}

vec4 sampleBg(vec2 px, float lod) {
  vec2 uv = clamp(px / uRes, vec2(0.001), vec2(0.999));
  return textureLod(uSrc, uv, lod);
}

vec4 sampleReconstructedBg(vec2 px, float lod) {
  vec2 uv = clamp(px / uRes, vec2(0.001), vec2(0.999));
  return textureLod(uBlurSrc, uv, lod);
}

float luminance(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 linearToSrgb(vec3 c) {
  c = max(c, 0.0);
  return mix(1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055,
             12.92 * c,
             lessThanEqual(c, vec3(0.0031308)));
}

vec2 softLimitOffset(vec2 offset, float limit) {
  float magnitude = length(offset);
  if (magnitude < 1e-4) return offset;
  float limited = tanh(magnitude / max(limit, 1.0)) * limit;
  return offset * (limited / magnitude);
}

// Variable-radius blur, radius in device px.
//
// A single textureLod() tap on the mip chain is not enough. The chain only
// offers radii in powers of two, and on the top levels one texel is tens of
// pixels wide, so a lone bilinear tap (a) averages in a huge slab of the
// screen, which drags the colour toward the frame mean -> washed out, and
// (b) reconstructs as a handful of big diamonds -> the "too few samples" mush.
// Instead take the level whose own radius is about a third of what we want and
// spread TAPS samples over the remainder on a golden-angle spiral. Neighbouring
// taps then land roughly one texel apart at that level, which is exactly the
// spacing at which the level's own filtering makes the disc continuous, so the
// result is a real wide Gaussian that keeps its local colour.
const int TAPS = 12;
const float GOLDEN_ANGLE = 2.39996323;

vec3 blurBg(vec2 px, float radius) {
  if (radius < 1.0) return sampleBg(px, 0.0).rgb;
  float lod = clamp(log2(radius) - 1.585, 0.0, uMips - 1.0);   // 2^lod ~ r/3
  vec3 acc = vec3(0.0);
  float densityAcc = 0.0;
  float wsum = 0.0;
  for (int i = 0; i < TAPS; i++) {
    float fi = float(i) + 0.5;
    float r  = sqrt(fi / float(TAPS));       // equal-area spacing over the disc
    float a  = fi * GOLDEN_ANGLE;
    float w  = exp(-1.8 * r * r);
    vec2 samplePx = px + vec2(cos(a), sin(a)) * r * radius;
    // Keep narrow blur faithful to the original downsample chain, then lean on
    // the reconstructed chain where coarse mip blocks and temporal breathing
    // become visible. Both samplers return linear radiance from sRGB textures.
    float reconstruction = 0.78 * smoothstep(10.0, 52.0, radius);
    vec4 s = mix(sampleBg(samplePx, lod),
                 sampleReconstructedBg(samplePx, lod), reconstruction);
    acc += s.rgb * w;
    densityAcc += s.a * w;
    wsum += w;
  }
  vec3 linearCol = acc / wsum;

  // A pure radiance average spreads a dark branch but also dilutes it toward
  // the pale sky. The density channel averages -log(luminance), equivalent to
  // geometrically averaging transmission. That preserves the visual weight of
  // dark occluders while keeping uniform light regions unchanged. We retain
  // the linear RGB hue and only restore the missing luminance contrast.
  float linearLum = max(dot(linearCol, vec3(0.2126, 0.7152, 0.0722)), 0.001);
  float densityLum = exp(-4.0 * densityAcc / wsum);
  float densityGap = max(linearLum - densityLum, 0.0);
  float radiusGate = smoothstep(1.0, 8.0, radius);
  float targetLum = max(linearLum * 0.22,
                        linearLum - densityGap * uOpticalDensity * radiusGate);
  return linearCol * (targetLum / linearLum);
}

void main() {
  vec2 px = vUV * uRes;

  float d = sdAppleShape(px);
  float aa = smoothstep(0.8, -0.8, d);
  vec2 adaptCenter;
  float localShortSide;
  localComponentMetrics(px, adaptCenter, localShortSide);
  // Material lengths are authored against the large demo components. Treat
  // them as maxima and fit the complete optical system to 30% of a smaller
  // primitive's short side. The shared metric call above also keeps this scale
  // continuous when differently sized primitives form one fused surface.
  float fittedScale = clamp(0.30 * localShortSide / max(uBevel, 1.0), 0.05, 1.0);
  float opticalScale = mix(1.0, fittedScale,
                           clamp(uSizeAdaptation, 0.0, 1.0));
  float bevel = max(uBevel * opticalScale, 1.0);
  float opticalHeight = uHeight * opticalScale;

  // ---- gradient of the SDF = outward direction of the surface -------------
  vec2 g = normalize(opticalGradient(px) + 1e-6);

  // ---- thickness field / bevel profile -----------------------------------
  float t  = clamp(-d / bevel, 0.0, 1.0);    // 0 at the edge, 1 on the plateau
  float ct = 1.0 - t;
  float h  = sqrt(max(1.0 - ct * ct, 0.0));  // convex (circular) bevel
  float dhdt = ct / max(h, 0.10);            // slope, clamped at the silhouette
  float slope = (opticalHeight / bevel) * dhdt;

  // 0 = convex lens, 1 = the default Apple-like concave rim. Values above 1
  // deliberately exaggerate the inward normal for exploratory tuning.
  float curveSign = 1.0 - 2.0 * uMeniscus;
  vec3 n = normalize(vec3(curveSign * g * slope, 1.0));
  vec3 I = vec3(0.0, 0.0, -1.0);

  // ---- refraction (Snell) + dispersion -----------------------------------
  float path = opticalHeight * mix(0.25, 1.0, h) * uRefractScale;
  vec2 dR, dG, dB;
  {
    float e = 1.0 / max(uIOR - uDispersion, 1.0);
    vec3 R = refract(I, n, e);
    dR = (R == vec3(0.0)) ? vec2(0.0) : R.xy / max(-R.z, 0.25) * path;
    e = 1.0 / max(uIOR, 1.0);
    R = refract(I, n, e);
    dG = (R == vec3(0.0)) ? vec2(0.0) : R.xy / max(-R.z, 0.25) * path;
    e = 1.0 / max(uIOR + uDispersion, 1.0);
    R = refract(I, n, e);
    dB = (R == vec3(0.0)) ? vec2(0.0) : R.xy / max(-R.z, 0.25) * path;
  }

  // Strong concave meniscus normals can make the screen-space mapping fold
  // over itself at multi-shape junctions. On hard-edged wallpapers that reads
  // as triangular tearing rather than refraction. Compress only the extreme
  // tail; ordinary offsets remain almost linear while caustic spikes stay
  // within a bevel-sized optical footprint.
  float maxDisplacement = max(1.15 * bevel, max(12.0 * opticalScale, 3.0));
  dR = softLimitOffset(dR, maxDisplacement);
  dG = softLimitOffset(dG, maxDisplacement);
  dB = softLimitOffset(dB, maxDisplacement);

  // ---- scattering: rim stays readable, plateau is frosted ----------------
  float radius = mix(uBlurRim, uBlurPlateau, smoothstep(0.0, 0.85, t))
               * opticalScale;

  vec3 col;
  col.r = blurBg(px + dR, radius).r;
  col.g = blurBg(px + dG, radius).g;
  col.b = blurBg(px + dB, radius).b;

  // Saturation is boosted on the TRANSMITTED backdrop only (this is what
  // UIVisualEffectView's saturationDeltaFactor does). Any wide blur averages
  // colours toward grey; without this the frosted panel reads pale even though
  // the wallpaper behind it is saturated. Doing it before the reflections keeps
  // the specular/Fresnel highlights neutral.
  col = mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, uSat);

  // ---- reflection: backdrop environment + narrow specular lobes -----------
  // Schlick: F0 for glass is ~4%, and the (1-cos)^5 falloff keeps the mirror
  // term confined to the steepest part of the bevel. A softer exponent smears
  // a grey wash across the whole rim and bleaches the refracted image there.
  float fres = 0.04 + 0.96 * pow(1.0 - n.z, 5.0);
  vec2 nn = normalize(n.xy + 1e-6);

  // Keep the reflected environment local to the fragment. Stabilise the lobe
  // controls around the owning primitive below so hard wallpaper edges do not
  // chop one rim into unrelated bright and dark pieces.
  float probeLod = clamp(3.5 + log2(max(opticalScale, 0.05)),
                         0.0, uMips - 1.0);
  float probeRadius = max(1.35 * bevel, max(18.0 * opticalScale, 3.0));
  vec3 envL = sampleBg(px + vec2(-probeRadius, 0.0), probeLod).rgb;
  vec3 envR = sampleBg(px + vec2( probeRadius, 0.0), probeLod).rgb;
  vec3 envB = sampleBg(px + vec2(0.0, -probeRadius), probeLod).rgb;
  vec3 envT = sampleBg(px + vec2(0.0,  probeRadius), probeLod).rgb;
  vec2 fallbackLight = normalize(uLightDir + vec2(1e-5));
  // Highlight adaptation must be stable across one component. Driving its
  // strength and colour from each fragment's probe makes a mountain ridge or
  // tree line cut the rim into bright and dark pieces. Probe around the local
  // component centre while retaining per-fragment environment reflection.
  vec3 adaptL = sampleBg(adaptCenter + vec2(-probeRadius, 0.0), probeLod).rgb;
  vec3 adaptR = sampleBg(adaptCenter + vec2( probeRadius, 0.0), probeLod).rgb;
  vec3 adaptB = sampleBg(adaptCenter + vec2(0.0, -probeRadius), probeLod).rgb;
  vec3 adaptT = sampleBg(adaptCenter + vec2(0.0,  probeRadius), probeLod).rgb;
  vec2 adaptGradient = vec2(luminance(adaptR) - luminance(adaptL),
                            luminance(adaptT) - luminance(adaptB));
  float stableContrast = length(adaptGradient);
  float lightAdapt = clamp(uHighlightAdapt, 0.0, 1.0) *
                     smoothstep(0.025, 0.22, stableContrast);
  // Keep the lobe direction material-local. Steering it with the wallpaper
  // gradient creates a rapidly rotating direction field around hard colour
  // edges, which appears as diagonal tears and lets unrelated components alter
  // each other's highlights. The environment still adapts strength and colour.
  vec2 lightDir = fallbackLight;

  // Reflect the colour seen in the surface-normal direction. A local sample
  // keeps small bright structures (tower lights, clouds, coastlines) attached
  // to the nearby rim instead of turning every frame into the same white ring.
  float wx = clamp(0.5 + 0.5 * nn.x, 0.0, 1.0);
  float wy = clamp(0.5 + 0.5 * nn.y, 0.0, 1.0);
  vec3 envX = mix(envL, envR, wx);
  vec3 envY = mix(envB, envT, wy);
  vec3 ringEnv = (envX * abs(nn.x) + envY * abs(nn.y)) /
                 max(abs(nn.x) + abs(nn.y), 1e-3);
  float localProbeLod = clamp(2.0 + log2(max(opticalScale, 0.05)),
                              0.0, uMips - 1.0);
  vec3 localEnv = sampleBg(px + g * max(0.55 * bevel,
                                        max(6.0 * opticalScale, 2.0)),
                           localProbeLod).rgb;
  vec3 env = mix(ringEnv, localEnv, 0.58);
  float envLum = luminance(env);
  env = mix(env, vec3(envLum), 0.10); // retain wallpaper hue, tame neon spikes
  float envStrength = mix(0.58, 1.0, smoothstep(0.08, 0.75, envLum));
  col = mix(col, env, clamp(fres * uFresnel * envStrength, 0.0, 0.82));

  vec3 L1 = normalize(vec3(lightDir, 0.58));
  vec3 L2 = normalize(vec3(-lightDir, 0.48));
  float sharpness = max(uHighlightSharpness, 0.1);
  float s1 = pow(max(dot(n, L1), 0.0),
                 max(uSpecPower * sharpness, 1.0));
  float s2 = pow(max(dot(n, L2), 0.0),
                 max(uSpecPower * sharpness * 0.78, 1.0)) * 0.18;
  float highlightWidth = clamp(uHighlightWidth, 0.16, 1.0);
  float riseEnd = min(0.10, 0.25 * highlightWidth);
  float specBand = smoothstep(0.015, riseEnd, t) *
                   (1.0 - smoothstep(0.61 * highlightWidth,
                                     highlightWidth, t));
  float baseHighlight = clamp(uHighlightBase, 0.0, 1.0);
  float sourceStrength = baseHighlight + (1.0 - baseHighlight) * lightAdapt;
  vec3 sourceEnv = mix(mix(adaptL, adaptR, 0.5 + 0.5 * lightDir.x),
                       mix(adaptB, adaptT, 0.5 + 0.5 * lightDir.y), 0.5);
  float sourceLum = max(luminance(sourceEnv), 0.08);
  vec3 specColor = clamp(mix(vec3(1.0), sourceEnv / sourceLum, 0.42),
                         vec3(0.45), vec3(2.2));
  col += uSpecular * (s1 + s2) * specBand * sourceStrength * specColor;

  // Dark contour right at the silhouette: at grazing angles the rim reflects
  // the surroundings instead of transmitting, so real glass edges read dark.
  float w = max(uEdgeWidth, 0.5);
  float contour = smoothstep(w, 0.0, abs(d + 0.55 * w));
  col *= 1.0 - uEdgeDark * contour;

  // Crisp inner highlight line; direction and colour follow the local probe.
  float line = smoothstep(1.35 * w, 0.0, abs(d + 2.2 * w));
  float lit = 0.26 + 0.74 * max(dot(g, lightDir), 0.0);
  vec3 stableEnv = (adaptL + adaptR + adaptB + adaptT) * 0.25;
  float stableEnvLum = max(luminance(stableEnv), 0.12);
  vec3 lineColor = mix(vec3(1.0), stableEnv / stableEnvLum, 0.28);
  col += uEdgeLine * line * lit * lineColor;

  // ---- tint --------------------------------------------------------------
  // Tint polarity adapts once per local component, not per draw group.
  // This captures the system-material light/dark switch without letting a hard
  // background edge split one surface into visibly different materials.
  float materialLum = luminance(sampleBg(adaptCenter, uMips - 1.0).rgb);
  float useDarkMaterial = smoothstep(0.38, 0.68, materialLum);
  vec3 automaticTint = mix(vec3(0.97, 0.985, 1.0),
                           vec3(0.035, 0.055, 0.080), useDarkMaterial);
  vec3 resolvedTint = mix(uTintColor, automaticTint, clamp(uTintAdapt, 0.0, 1.0));
  float adaptiveAmount = uTintAmount * mix(1.10, 0.92, useDarkMaterial);
  col = mix(col, resolvedTint, clamp(adaptiveAmount, 0.0, 1.0));
  col += uBright;

  // ---- soft contact shadow ----------------------------------------------
  float ds = sdAppleShape(px + vec2(0.0, uShadowOffset));
  float sh = exp(-max(ds, 0.0) / max(uShadowSize, 0.5)) * uShadow;

  if (uDebug == 1) col = vec3(h);
  if (uDebug == 2) col = vec3(0.5 + 0.5 * n.xy, n.z);
  if (uDebug == 3) col = vec3(length(dG) / max(opticalHeight, 1.0),
                              length(dR - dB) / max(opticalHeight, 1.0) * 6.0, 0.0);

  // The browser drawing buffer stores display/sRGB values, unlike the explicit
  // SRGB8_ALPHA8 offscreen attachments. Encode the final linear material here,
  // then add triangular-distribution noise smaller than one display-space LSB.
  if (uDebug == 0) {
    float n0 = hash12(gl_FragCoord.xy + vec2(17.0, 59.0));
    float n1 = hash12(gl_FragCoord.yx + vec2(83.0, 11.0));
    float noise = (n0 - n1) * (0.85 / 255.0);
    col = clamp(linearToSrgb(col) + noise, 0.0, 1.0);
  }

  float a = aa + sh * (1.0 - aa);
  outColor = vec4(col * aa, a);   // premultiplied; shadow contributes black
}`;var A=16;var fi=Object.freeze({rect:0,folder:0,pill:1,circle:2});function pi(s){return fi[s]??0}function mi(s,e=0){let t=Math.min(s.w??s.width??0,s.h??s.height??0);return Math.min(s.radius??e,t*.235)}function vt(s,e,t,i,r,a){let o=Math.abs(s)-t+r,l=Math.abs(e)-i+r,n=Math.max(o,0)+1e-5,h=Math.max(l,0)+1e-5,u=(n**a+h**a)**(1/a);return Math.min(Math.max(o,l),0)+u-r}function ze(s,e,t,i,r,a,o=2){return r===2?Math.hypot(s,e)-Math.min(t,i):r===1?vt(s,e,t,i,Math.min(t,i),2):vt(s,e,t,i,a,Math.max(o,2))}function Ne(s,e){let t=s.w??s.width??s.size??0,i=s.h??s.height??s.size??t;return{cx:(s.x??0)+t/2,cy:(s.y??0)+i/2,halfX:t/2,halfY:i/2,type:pi(s.shape),radius:mi({...s,w:t,h:i},e.radius??0)}}function we(s,e,t,i={},r=i.mergeRadius??0){if(!t.length)return 1/0;let a=t.map(c=>Ne(c,i)),o=i.squircle??2,l=1/0,n=a.map(c=>{let m=ze(s-c.cx,e-c.cy,c.halfX,c.halfY,c.type,c.radius,o);return m<l&&(l=m),m});if(!(r>=.01)||a.length===1)return l;let h=Math.max(r*.36,.01),u=0;for(let c of n)u+=Math.exp(-(c-l)/h);return l-h*Math.log(Math.max(u,1e-6))}function Oe(s,e,t,i={},r={}){let a=r.fusion===!1?0:r.mergeRadius??i.mergeRadius??0,o=r.tolerance??0,l=i.squircle??2;if(r.fusion===!1){for(let h=t.length-1;h>=0;h--){let u=Ne(t[h],i);if(ze(s-u.cx,e-u.cy,u.halfX,u.halfY,u.type,u.radius,l)<=o)return t[h]}return null}let n=ne(t,a,16).groups;for(let h=n.length-1;h>=0;h--){let u=n[h];if(we(s,e,u,i,a)>o)continue;let c=null,m=1/0;for(let f=u.length-1;f>=0;f--){let d=Ne(u[f],i),y=ze(s-d.cx,e-d.cy,d.halfX,d.halfY,d.type,d.radius,l);y<m&&(m=y,c=u[f])}return c}return null}function bt(s,e,t,i={},r=i.mergeRadius??0){let a=ne(t,r,16).groups;if(!a.length)return 1/0;let o=1/0;for(let l of a){let n=we(s,e,l,i,r);n<o&&(o=n)}return o}function gi(s,e){let t=l=>{let n=Number(l.w??l.width??l.size??0),h=Number(l.h??l.height??l.size??n);return{x:Number(l.x??0),y:Number(l.y??0),w:n,h}},i=t(s),r=t(e),a=Math.max(0,Math.max(i.x-(r.x+r.w),r.x-(i.x+i.w))),o=Math.max(0,Math.max(i.y-(r.y+r.h),r.y-(i.y+i.h)));return Math.hypot(a,o)}function We(s,e=0){if(s.length<=1)return s.length?[s.slice()]:[];let t=Math.max(0,e)*.36*8,i=s.map((o,l)=>l),r=o=>{for(;i[o]!==o;)i[o]=i[i[o]],o=i[o];return o};for(let o=0;o<s.length;o++)for(let l=o+1;l<s.length;l++)gi(s[o],s[l])<=t&&(i[r(o)]=r(l));let a=new Map;return s.forEach((o,l)=>{let n=r(l);a.has(n)||a.set(n,[]),a.get(n).push(o)}),[...a.values()]}function ne(s,e=0,t=16){let i=We(s,e),r=[],a=!1;for(let o of i){o.length>t&&(a=!0);for(let l=0;l<o.length;l+=t)r.push(o.slice(l,l+t))}return{groups:r,truncated:a}}var xt=`#version 300 es
precision highp float;
in vec2 vUV;
out vec4 outColor;

uniform sampler2D uSrc;
uniform vec2 uRes;
uniform float uDpr;
uniform float uMips;
uniform float uBackdropBlur;
const int MAX_SHAPES = 16;
uniform int uShapeCount;
uniform vec2 uShapeCenters[MAX_SHAPES];
uniform vec2 uShapeHalves[MAX_SHAPES];
uniform int uShapeTypes[MAX_SHAPES];
uniform float uShapeRadii[MAX_SHAPES];
uniform float uShapeTints[MAX_SHAPES];
uniform float uShapeTintLights[MAX_SHAPES];
uniform float uShapeFrosts[MAX_SHAPES];
uniform float uShapeOpacities[MAX_SHAPES];
uniform float uShapePressures[MAX_SHAPES];
uniform vec2 uShapePressAxes[MAX_SHAPES];
uniform vec2 uLightDirs[MAX_SHAPES];
uniform float uRefraction;
uniform float uEdgeReach;
uniform float uEdgeWidth;
uniform float uDispersion;
uniform float uBody;
uniform float uAbsorption;
uniform float uRim;
uniform float uReflection;
uniform float uHighlight;
uniform float uEcho;
uniform float uHairline;
uniform float uHairWidth;
// 1 while a layer is composited into the sRGB backdrop texture, which encodes
// on write; 0 for the display-referred drawing buffer.
uniform int uOutputLinear;

// Softness ratio -> pre-blur radius, as a fraction of the component short side.
const float FROST_PREBLUR_SCALE = 0.05;
// Strength of the pressed-in squash. The mapping slope at the contour is
// 1 - k, so k must stay below 1 to avoid folding the image.
const float PRESS_SQUASH = 0.85;

vec3 linearToSrgb(vec3 c) {
  c = max(c, 0.0);
  return mix(1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055,
             12.92 * c,
             lessThanEqual(c, vec3(0.0031308)));
}

vec3 srgbToLinear(vec3 c) {
  bvec3 cutoff = lessThanEqual(c, vec3(0.04045));
  vec3 low = c / 12.92;
  vec3 high = pow((c + 0.055) / 1.055, vec3(2.4));
  return mix(high, low, cutoff);
}

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

// Inside a rounded box the exact distance is max(q.x, q.y), and its gradient
// switches axis across the corner diagonal. Refraction reads that gradient as
// the surface normal, so the switch drew a 45-degree crease into every corner.
// A soft maximum rounds that ridge. It is used for the normal only: distance,
// masks, hairline and silhouette all keep the exact field.
// Unbiased: softMax(a, a, k) == a, so the interior term keeps its sign and
// the clamp below still recognises the inner rectangle.
float softMax(float a, float b, float k) {
  return 0.5 * (a + b + sqrt((a - b) * (a - b) + k * k)) - k * 0.5;
}

float sdRoundBoxSoft(vec2 p, vec2 b, float r, float k) {
  vec2 q = abs(p) - b + r;
  return min(softMax(q.x, q.y, k), 0.0) + length(max(q, 0.0)) - r;
}

float smoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

float shapeSdf(int index, vec2 point) {
  vec2 p = point - uShapeCenters[index];
  vec2 halfSize = uShapeHalves[index];
  int kind = uShapeTypes[index];
  float radius = min(uShapeRadii[index], min(halfSize.x, halfSize.y));
  if (kind == 0) return sdRoundBox(p, halfSize, radius);
  if (kind == 1) return sdRoundBox(p, halfSize, min(halfSize.x, halfSize.y));
  return length(p) - min(halfSize.x, halfSize.y);
}

/** The silhouette field with a rounded interior ridge, for normals. */
float shapeField(int index, vec2 point) {
  vec2 p = point - uShapeCenters[index];
  vec2 halfSize = uShapeHalves[index];
  int kind = uShapeTypes[index];
  float minHalf = min(halfSize.x, halfSize.y);
  float k = clamp(minHalf * 0.08, 1.5, 12.0);
  if (kind == 0) return sdRoundBoxSoft(p, halfSize, min(uShapeRadii[index], minHalf), k);
  if (kind == 1) return sdRoundBoxSoft(p, halfSize, minHalf, k);
  return length(p) - minHalf;
}

vec2 opticalNormal(int index, vec2 point, vec2 sdfNormal) {
  vec2 p = point - uShapeCenters[index];
  vec2 halfSize = max(uShapeHalves[index], vec2(1.0));
  int kind = uShapeTypes[index];

  if (kind == 0) {
    // The sixth-order superellipse is the optical field, while roundness only
    // controls the silhouette. This separation is part of the V2 model.
    vec2 q = p / halfSize;
    vec2 g = vec2(sign(q.x) * pow(abs(q.x), 5.0) / halfSize.x,
                  sign(q.y) * pow(abs(q.y), 5.0) / halfSize.y);
    return normalize(g + sdfNormal * 0.0001);
  }
  if (kind == 1) {
    vec2 closest;
    if (halfSize.x >= halfSize.y) {
      float segment = max(halfSize.x - halfSize.y, 0.0);
      closest = vec2(clamp(p.x, -segment, segment), 0.0);
    } else {
      float segment = max(halfSize.y - halfSize.x, 0.0);
      closest = vec2(0.0, clamp(p.y, -segment, segment));
    }
    return normalize(p - closest + sdfNormal * 0.0001);
  }
  return normalize(p + sdfNormal * 0.0001);
}

// The shared backdrop pipeline stores linear radiance in SRGB8_ALPHA8.
// V2's optical constants were authored in display space, so convert each
// sample back before applying the V2 equations.
vec3 backdropLod(vec2 uv, float lod) {
  return linearToSrgb(textureLod(uSrc, clamp(uv, vec2(0.001), vec2(0.999)),
                                 clamp(lod, 0.0, max(uMips - 1.0, 0.0))).rgb);
}

// The mip level an implicit texture() lookup selects for a refracted
// coordinate. Explicit sampling never drops below it, so compressed capture
// bands stay filtered exactly as before while pre-blur can raise the level.
float footprintLod(vec2 uv) {
  vec2 dx = dFdx(uv) * uRes;
  vec2 dy = dFdy(uv) * uRes;
  return 0.5 * log2(max(max(dot(dx, dx), dot(dy, dy)), 1e-8));
}

vec3 softBackdrop(vec2 uv, float radius) {
  float lod = log2(max(radius * 0.9, 1.0));
  vec2 r = vec2(max(radius * 0.42, 0.35)) / uRes;
  vec2 center = clamp(uv, vec2(0.001), vec2(0.999));
  vec3 c = backdropLod(center, lod) * 0.44;
  c += backdropLod(center + vec2(r.x, 0.0), lod) * 0.14;
  c += backdropLod(center - vec2(r.x, 0.0), lod) * 0.14;
  c += backdropLod(center + vec2(0.0, r.y), lod) * 0.14;
  c += backdropLod(center - vec2(0.0, r.y), lod) * 0.14;
  return c;
}

// The backdrop blurred before refraction: a frosted layer that the liquid
// glass then bends. Radius is in device pixels; zero is the sharp backdrop.
vec3 preBlurredBackdrop(vec2 uv, float radius, float footprint) {
  if (radius <= 0.0) return backdropLod(uv, footprint);
  float lod = max(log2(max(radius * 0.9, 1e-3)), footprint);
  vec2 r = vec2(radius * 0.42) / uRes;
  vec2 center = clamp(uv, vec2(0.001), vec2(0.999));
  vec3 c = backdropLod(center, lod) * 0.44;
  c += backdropLod(center + vec2(r.x, 0.0), lod) * 0.14;
  c += backdropLod(center - vec2(r.x, 0.0), lod) * 0.14;
  c += backdropLod(center + vec2(0.0, r.y), lod) * 0.14;
  c += backdropLod(center - vec2(0.0, r.y), lod) * 0.14;
  return c;
}

float luminance(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

vec3 interfaceColor(vec2 point, vec2 normal, float preBlur) {
  float radius = max(2.0, preBlur);
  vec3 outsideColor = softBackdrop((point + normal * 1.8) / uRes, radius);
  vec3 insideColor = softBackdrop((point - normal * 1.8) / uRes, radius);
  // Apple's outer interface is a neutral contrast line rather than a copy of
  // the wallpaper colour. Include display-space value as well as luminance so
  // saturated blue/purple fields select a dark line even though their formal
  // luminance is modest. The outside carries more weight because that is the
  // field the silhouette must remain legible against.
  float outsideValue = max(outsideColor.r, max(outsideColor.g, outsideColor.b));
  float insideValue = max(insideColor.r, max(insideColor.g, insideColor.b));
  float outsideLight = max(luminance(outsideColor), outsideValue * 0.72);
  float insideLight = max(luminance(insideColor), insideValue * 0.72);
  float interfaceLight = outsideLight * 0.68 + insideLight * 0.32;
  float darkLine = smoothstep(0.40, 0.61, interfaceLight);
  return mix(vec3(0.92, 0.93, 0.96), vec3(0.014, 0.013, 0.018), darkLine);
}

void main() {
  vec2 point = vUV * uRes;
  int chosen = -1;
  float chosenD = 1e6;
  int nearest = 0;
  float nearestD = 1e6;
  for (int i = 0; i < MAX_SHAPES; i++) {
    if (i >= uShapeCount) break;
    float d = shapeSdf(i, point);
    if (d < nearestD) { nearest = i; nearestD = d; }
    if (d <= 2.1) { chosen = i; chosenD = d; }
  }

  // Screen-space derivatives (fwidth, dFdx/dFdy and implicit texture LOD) are
  // only defined in uniform control flow. Fragments outside every surface
  // return early below; if that happened before the derivatives, a lane in
  // the 2x2 quad that exited with the 1e6 sentinel would make its neighbours'
  // hairline width and mip level garbage on some GPUs, sprinkling stray
  // pixels along the silhouette. So the geometric ALU runs for every lane,
  // evaluated on the nearest surface as a continuous extension for outside
  // fragments, and only the texture fetches are skipped after the return.
  bool covered = chosen >= 0;
  if (!covered) { chosen = nearest; chosenD = nearestD; }
  float edgeAA = max(fwidth(nearestD), 0.72);

  vec2 center = uShapeCenters[chosen];
  vec2 halfSize = uShapeHalves[chosen];
  float minHalf = min(halfSize.x, halfSize.y);
  float e = 1.35;
  float dx = shapeField(chosen, point + vec2(e, 0.0)) - shapeField(chosen, point - vec2(e, 0.0));
  float dy = shapeField(chosen, point + vec2(0.0, e)) - shapeField(chosen, point - vec2(0.0, e));
  vec2 normal = normalize(vec2(dx, dy) + vec2(0.0001));
  float depth = clamp(-chosenD / max(12.0, minHalf * 0.62), 0.0, 1.0);
  float refractionSupport = max(14.0, minHalf * 0.50);
  float edgeCurve = pow(1.0 - smoothstep(0.0, refractionSupport, -chosenD), 2.2);
  vec2 local = (point - center) / max(halfSize, vec2(1.0));

  float edgeDepth = max(-chosenD, 0.0);
  float causticSupport = max(8.0, minHalf * uEdgeWidth);
  float captureX = clamp(edgeDepth / causticSupport, 0.0, 1.0);
  float causticT = 1.0 - smoothstep(0.0, causticSupport, edgeDepth);
  float causticShade = causticT * causticT * (3.0 - 2.0 * causticT);
  // The old double-smoothstep displacement flattened at the visible contour.
  // Its source-coordinate derivative therefore changed sign twice, making a
  // captured line turn back just before it touched the edge. A one-sided exit
  // profile keeps a finite slope at the contour and relaxes to zero only on
  // the inner side of the capture band, leaving a single optical fold.
  float captureProfile = pow(1.0 - captureX, 1.64);
  float refractionX = clamp(edgeDepth / refractionSupport, 0.0, 1.0);
  float refractionProfile = pow(1.0 - refractionX, 2.2);
  // The silhouette and optical superellipse deliberately differ in V2, but
  // the visible contour must still exit along the silhouette normal. Blend to
  // the broader optical field only after leaving the outer edge pixels.
  float opticalNormalMix = smoothstep(0.12, 0.55, captureX);
  vec2 bendNormal = normalize(mix(normal, opticalNormal(chosen, point, normal), opticalNormalMix));
  vec2 inward = -bendNormal;
  // Edge pull used to multiply Capture reach as a second public control. Keep
  // its original default as an internal calibration so the default material
  // retains the same displacement with one unambiguous capture parameter.
  const float CAPTURE_REACH_SCALE = 1.24;
  float captureDistance = uEdgeReach * minHalf * 2.0 * CAPTURE_REACH_SCALE * captureProfile;
  float shallowRefraction = uRefraction * refractionProfile * 0.32;
  vec2 lensShift = inward * (shallowRefraction + captureDistance);
  lensShift += -local * (uRefraction * 0.035) * smoothstep(0.16, 0.92, depth);
  // A held lens is pressed in: a shallow diverging surface that squashes what
  // is seen through it. The outward displacement follows the contour normal,
  // vanishes on the centre line and at the silhouette, and softens the
  // ordinary edge fold instead of inflating the rim.
  float pressure = clamp(uShapePressures[chosen], 0.0, 1.0);
  float pressDepth = clamp(edgeDepth / max(minHalf, 1.0), 0.0, 1.0);
  lensShift *= 1.0 - pressure * 0.35;
  // Per-axis weights let a host shorten the squash along one direction, so a
  // wide capsule can keep its length while it flattens (or vice versa).
  vec2 pressAxes = clamp(uShapePressAxes[chosen], 0.0, 1.0);
  lensShift += normal * pressAxes * (PRESS_SQUASH * minHalf * pressure
                                     * pressDepth * (1.0 - pressDepth));
  vec2 chromaShift = bendNormal * uDispersion * (0.32 + edgeCurve * 0.95);
  vec2 uvR = (point + lensShift * (1.0 + uDispersion * 0.009) + chromaShift) / uRes;
  vec2 uvG = (point + lensShift) / uRes;
  vec2 uvB = (point + lensShift * (1.0 - uDispersion * 0.011) - chromaShift) / uRes;
  // Reach controls where the sample comes from, not how fat a captured line
  // becomes. Preserve the tuned reach=35 softness while preventing larger
  // reaches from silently doubling the blur radius.
  float causticBlur = min(0.7 + 1.13 * uDpr, 0.7 + captureDistance * 0.026);
  // Softness and background pre-blur are the same operation: the backdrop is
  // blurred before the lens bends it. Softness is a ratio of the component
  // short side, so a larger card is naturally more frosted at one setting;
  // pre-blur is an absolute radius. Successive blurs add in quadrature.
  float frostRadius = clamp(uShapeFrosts[chosen], 0.0, 1.0) * minHalf * 2.0 * FROST_PREBLUR_SCALE;
  float preBlur = sqrt(frostRadius * frostRadius + uBackdropBlur * uBackdropBlur);
  float lodR = footprintLod(uvR);
  float lodG = footprintLod(uvG);
  float lodB = footprintLod(uvB);
  vec2 echoUv = (point - normal * 11.0) / uRes;
  float echoLod = footprintLod(echoUv);

  if (!covered) {
    outColor = vec4(0.0);
    return;
  }

  vec3 sr = preBlurredBackdrop(uvR, preBlur, lodR);
  vec3 sg = preBlurredBackdrop(uvG, preBlur, lodG);
  vec3 sb = preBlurredBackdrop(uvB, preBlur, lodB);
  // Captured lines keep their slight softening inside the thin caustic band
  // unless the pre-blurred backdrop is already at least that soft.
  float causticMix = causticShade * 0.18;
  if (causticMix > 0.001 && causticBlur > preBlur) {
    sr = mix(sr, softBackdrop(uvR, causticBlur), causticMix);
    sg = mix(sg, softBackdrop(uvG, causticBlur), causticMix);
    sb = mix(sb, softBackdrop(uvB, causticBlur), causticMix);
  }
  vec3 transmitted = vec3(sr.r, sg.g, sb.b);

  float transmittedLum = luminance(transmitted);
  vec3 bodyTarget = mix(vec3(0.030, 0.031, 0.038), vec3(0.94, 0.95, 0.97),
                        smoothstep(0.58, 0.82, transmittedLum));
  transmitted = mix(transmitted, bodyTarget,
                    clamp(uBody * (0.034 + edgeCurve * 0.012), 0.0, 0.11));
  transmitted = mix(vec3(luminance(transmitted)), transmitted, 1.0 - uBody * 0.045);

  float opticalPath = 0.26 + sqrt(depth) * 0.74;
  transmitted *= exp(-vec3(0.018, 0.011, 0.004) * opticalPath * 2.4 * uAbsorption);
  // Tinted Liquid Glass chooses one light/dark material for the whole
  // component. Choosing per fragment lets high-contrast content punch a
  // checkerboard through the surface instead of producing the coherent milky
  // veil used by notifications and other legibility-first controls.
  vec3 tintTarget = mix(vec3(0.055, 0.057, 0.066), vec3(0.975, 0.970, 0.955),
                        clamp(uShapeTintLights[chosen], 0.0, 1.0));
  float tintOpacity = smoothstep(0.0, 1.5, uShapeTints[chosen]) * 0.78;
  transmitted = mix(transmitted, tintTarget, tintOpacity * (0.88 + depth * 0.12));

  float mask = 1.0 - smoothstep(0.0, 1.35, chosenD);
  float thinRim = exp(-pow((chosenD + 0.65) / 1.4, 2.0));
  float innerRim = exp(-pow((chosenD + 6.2) / 3.8, 2.0));
  float fresnel = pow(clamp(edgeCurve, 0.0, 1.0), 0.72);
  vec2 lightDir = normalize(uLightDirs[chosen] + vec2(0.0001));
  float key = pow(max(dot(normal, lightDir), 0.0), 7.0) * fresnel;
  float opposite = pow(max(dot(normal, -lightDir), 0.0), 5.0) * innerRim;
  vec3 color = transmitted;
  // The rim reflection, echo and interface line only exist in a band around
  // the contour. Their weights are resolved first so interior fragments skip
  // the extra backdrop probes; a skipped weight is below 1/2000.
  float rimMix = clamp((thinRim * 0.42 + innerRim * 0.18 + fresnel * 0.10)
                       * uRim * uReflection, 0.0, 0.72);
  if (rimMix > 0.0005) {
    // A softened environment probe keeps moving video/feed edges from turning
    // into one-frame white flashes while preserving the local colour response.
    vec3 reflected = softBackdrop((point + normal * (8.0 + uRefraction * 0.17)) / uRes,
                                  max(5.2, preBlur));
    vec3 adaptiveRim = reflected * 1.45 + vec3(0.06, 0.035, 0.08);
    adaptiveRim = mix(adaptiveRim, vec3(0.96, 0.97, 1.0), 0.24);
    adaptiveRim = mix(adaptiveRim, vec3(0.035, 0.025, 0.045),
                      smoothstep(0.78, 0.98, luminance(reflected)) * 0.48);
    color = mix(color, adaptiveRim, rimMix);
  }
  color += vec3(1.0, 0.82, 0.92) * key * 0.30 * uRim * uHighlight;
  color *= 1.0 - opposite * 0.12 * uRim;
  float echoMix = exp(-pow((chosenD + 11.0) / 5.5, 2.0)) * 0.075 * uRim * uEcho;
  if (echoMix > 0.0005) {
    vec3 echoColor = preBlurredBackdrop(echoUv, preBlur, echoLod);
    color = mix(color, echoColor * 1.12, echoMix);
  }

  float lineWidth = mix(0.34, 1.08, clamp(uHairWidth, 0.0, 1.0));
  float strokeDistance = abs(chosenD + 0.10) - lineWidth * 0.5;
  float hairline = 1.0 - smoothstep(-edgeAA * 0.72, edgeAA * 0.72, strokeDistance);
  // Premultiplied layer composition exactly reproduces the prototype's two
  // sequential mixes when drawn over the supplied backdrop, and also allows
  // the same shader to work in overlay mode over a DOM/canvas backdrop.
  float hairAlpha = clamp(hairline * uHairline * (0.22 + uRim * 0.20), 0.0, 1.0);
  vec3 hairColor = vec3(0.0);
  if (hairAlpha > 0.0) {
    hairColor = interfaceColor(point, normal, preBlur);
    // The contrast line is the default interface. On the light-facing arc the
    // specular key replaces it with the thin white highlight visible in the
    // native material instead of merely brightening the black line underneath.
    float hairHighlight = clamp(key * uHighlight * 2.5 * (0.65 + uRim * 0.60), 0.0, 0.96);
    hairColor = mix(hairColor, vec3(0.985, 0.99, 1.0), hairHighlight);
  }

  float alpha = hairAlpha + mask * (1.0 - hairAlpha);
  // The rim, key highlight and echo terms can push the body colour past 1.0.
  // Inside the surface the drawing buffer clamps that anyway, but on the
  // anti-aliased fringe a premultiplied rgb larger than alpha composites
  // brighter than either the glass or the backdrop, sprinkling over-bright
  // pixels along the outer edge. Saturate before premultiplying.
  color = clamp(color, 0.0, 1.0);
  if (uOutputLinear == 1) {
    color = srgbToLinear(color);
    hairColor = srgbToLinear(hairColor);
  }
  vec3 premultiplied = hairColor * hairAlpha + color * mask * (1.0 - hairAlpha);
  float surfaceOpacity = clamp(uShapeOpacities[chosen], 0.0, 1.0);
  outColor = vec4(premultiplied * surfaceOpacity, alpha * surfaceOpacity);
}`;function yt(s,e,t){let i=s.createShader(e);if(s.shaderSource(i,t),s.compileShader(i),!s.getShaderParameter(i,s.COMPILE_STATUS)){let r=s.getShaderInfoLog(i);throw s.deleteShader(i),new Error(r+`
`+t)}return i}function le(s,e,t){let i=s.createProgram(),r=yt(s,s.VERTEX_SHADER,e),a;try{a=yt(s,s.FRAGMENT_SHADER,t)}catch(n){throw s.deleteShader(r),s.deleteProgram(i),n}if(s.attachShader(i,r),s.attachShader(i,a),s.linkProgram(i),s.detachShader(i,r),s.detachShader(i,a),s.deleteShader(r),s.deleteShader(a),!s.getProgramParameter(i,s.LINK_STATUS)){let n=s.getProgramInfoLog(i);throw s.deleteProgram(i),new Error(n)}let o={},l=s.getProgramParameter(i,s.ACTIVE_UNIFORMS);for(let n=0;n<l;n++){let h=s.getActiveUniform(i,n).name.replace("[0]","");o[h]=s.getUniformLocation(i,h)}return{p:i,loc:o}}var Ge=7;var Q=class{constructor(e,t={}){let i=e.getContext("webgl2",{alpha:!!t.alpha,antialias:!1,premultipliedAlpha:!0,preserveDrawingBuffer:!!t.preserveDrawingBuffer});if(!i)throw new Error("WebGL2 unavailable");this.gl=i,this.canvas=e,this.materialVersion=t.materialVersion===2?2:1,this.lost=!1,this.tex=null,this.blurTex=null,this.wallpapers=[],this.fbos=[],this.blurFbos=[],this.mipLevels=0,this.w=0,this.h=0,this.createResources()}createResources(){let e=this.gl;this.quad=e.createVertexArray(),e.bindVertexArray(this.quad),this.quadBuffer=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,this.quadBuffer),e.bufferData(e.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,1]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),e.bindVertexArray(null),this.progWall=le(e,oe,mt),this.progDown=le(e,oe,ft),this.progUp=le(e,oe,pt),this.progBlit=le(e,oe,dt),this.progGlass=le(e,ut,this.materialVersion===2?xt:gt),this.fallbackTexture=e.createTexture(),e.bindTexture(e.TEXTURE_2D,this.fallbackTexture),e.texImage2D(e.TEXTURE_2D,0,e.SRGB8_ALPHA8,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array([0,0,0,255])),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.bindTexture(e.TEXTURE_2D,null)}releaseResources(){let e=this.gl;for(let t of[this.progWall,this.progDown,this.progUp,this.progBlit,this.progGlass])t&&e.deleteProgram(t.p);this.progWall=null,this.progDown=null,this.progUp=null,this.progBlit=null,this.progGlass=null,this.quad&&e.deleteVertexArray(this.quad),this.quadBuffer&&e.deleteBuffer(this.quadBuffer),this.fallbackTexture&&e.deleteTexture(this.fallbackTexture),this.quad=null,this.quadBuffer=null,this.fallbackTexture=null}releaseTargets(){let e=this.gl;this.tex&&e.deleteTexture(this.tex),this.blurTex&&e.deleteTexture(this.blurTex),this.fbos.forEach(t=>e.deleteFramebuffer(t)),this.blurFbos.forEach(t=>e.deleteFramebuffer(t)),this.tex=null,this.blurTex=null,this.fbos=[],this.blurFbos=[],this.mipLevels=0}handleContextLost(){this.lost=!0,this.progWall=null,this.progDown=null,this.progUp=null,this.progBlit=null,this.progGlass=null,this.quad=null,this.quadBuffer=null,this.fallbackTexture=null,this.tex=null,this.blurTex=null,this.fbos=[],this.blurFbos=[];for(let e of this.wallpapers)e.texture=null,e.ready=!1,e.width=0,e.height=0}restore(){if(!this.lost)return this;this.lost=!1,this.createResources();let{w:e,h:t}=this;return this.w=0,this.h=0,e>0&&t>0&&this.resize(e,t),this.createWallpaperTextures(),this}hasLiveBackdrop(){return this.wallpapers.some(e=>e.update==="live")}sourceSize(e){return[Number(e?.videoWidth||e?.naturalWidth||e?.width||0),Number(e?.videoHeight||e?.naturalHeight||e?.height||0)]}isPremultipliedSource(e){let t=e?.tagName?.toUpperCase();return t==="CANVAS"||t==="VIDEO"||e?.constructor?.name==="OffscreenCanvas"||e?.constructor?.name==="VideoFrame"}uploadSource(e){let[t,i]=this.sourceSize(e.source),r=Math.min(1,Math.max(.1,Number(e.scale)||1));if(r>=1||!this.isPremultipliedSource(e.source))return[e.source,t,i];let a=Math.max(1,Math.round(t*r)),o=Math.max(1,Math.round(i*r));e.scaled||(e.scaled=typeof document<"u"?document.createElement("canvas"):new globalThis.OffscreenCanvas(a,o)),e.scaled.width!==a&&(e.scaled.width=a),e.scaled.height!==o&&(e.scaled.height=o);let l=e.scaled.getContext("2d");return l.clearRect(0,0,a,o),l.drawImage(e.source,0,0,a,o),[e.scaled,a,o]}probeSource(e){let t=this.wallpapers[e];if(!t)return null;let i=Math.min(1,Math.max(.1,Number(t.scale)||1));return t.scaled&&i<1?t.scaled:t.source}uploadWallpaper(e,t=!1){if(this.lost||!e.texture)return!1;let[i,r]=this.sourceSize(e.source);if(!(i>0)||!(r>0))return!1;let[a,o,l]=this.uploadSource(e),n=this.gl;n.bindTexture(n.TEXTURE_2D,e.texture);let h=this.isPremultipliedSource(a);return n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,h),!t&&e.ready&&e.width===o&&e.height===l?n.texSubImage2D(n.TEXTURE_2D,0,0,0,n.RGBA,n.UNSIGNED_BYTE,a):n.texImage2D(n.TEXTURE_2D,0,n.RGBA8,n.RGBA,n.UNSIGNED_BYTE,a),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.width=o,e.height=l,e.ready=!0,!0}setWallpaperScale(e){let t=Math.min(1,Math.max(.1,Number(e)||1)),i=!1;for(let r of this.wallpapers)(r.scale??1)!==t&&(i=!0),r.scale=t;return i}resize(e,t){if(e=Math.max(1,Math.round(e)),t=Math.max(1,Math.round(t)),this.lost){this.w=e,this.h=t;return}if(e===this.w&&t===this.h)return;let i=this.gl;this.w=e,this.h=t,this.canvas.width=e,this.canvas.height=t,this.releaseTargets(),this.mipLevels=Math.min(Ge,Math.floor(Math.log2(Math.max(e,t)))+1);let r=()=>{let a=i.createTexture();return i.bindTexture(i.TEXTURE_2D,a),i.texStorage2D(i.TEXTURE_2D,this.mipLevels,i.SRGB8_ALPHA8,e,t),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR_MIPMAP_LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE),a};this.tex=r(),this.blurTex=r(),this.fbos=[],this.blurFbos=[];for(let a=0;a<this.mipLevels;a++){let o=i.createFramebuffer();i.bindFramebuffer(i.FRAMEBUFFER,o),i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,this.tex,a),this.fbos.push(o);let l=i.createFramebuffer();i.bindFramebuffer(i.FRAMEBUFFER,l),i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,this.blurTex,a),this.blurFbos.push(l)}i.bindFramebuffer(i.FRAMEBUFFER,null)}createWallpaperTextures(){if(this.lost)return;let e=this.gl;for(let t of this.wallpapers)t.texture&&e.deleteTexture(t.texture),t.texture=e.createTexture(),t.ready=!1,t.width=0,t.height=0,e.bindTexture(e.TEXTURE_2D,t.texture),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),this.uploadWallpaper(t,!0);e.bindTexture(e.TEXTURE_2D,null)}setWallpapers(e,t={}){let i=this.gl,r=t.update==="live"?"live":"static",a=Math.min(1,Math.max(.1,Number(t.scale)||1));this.lost||this.wallpapers.forEach(o=>i.deleteTexture(o.texture)),this.wallpapers=e.map(o=>({texture:null,source:o,update:r,scale:a,scaled:null,ready:!1,width:0,height:0})),this.createWallpaperTextures()}refreshWallpapers(e=!1){if(!this.lost){for(let t of this.wallpapers)(e||t.update==="live")&&this.uploadWallpaper(t);this.gl.bindTexture(this.gl.TEXTURE_2D,null)}}mipSize(e){return[Math.max(1,this.w>>e),Math.max(1,this.h>>e)]}buildBackdrop(e,t=1){if(this.lost||!this.fbos.length)return;let i=this.gl;this.refreshWallpapers(),i.bindVertexArray(this.quad),i.disable(i.BLEND),i.bindFramebuffer(i.FRAMEBUFFER,this.fbos[0]),i.viewport(0,0,this.w,this.h),i.useProgram(this.progWall.p),i.uniform2f(this.progWall.loc.uRes,this.w,this.h),i.uniform1i(this.progWall.loc.uScene,e),i.uniform1f(this.progWall.loc.uZoom,t);let r=this.wallpapers[e];if(i.activeTexture(i.TEXTURE1),i.bindTexture(i.TEXTURE_2D,r?.ready?r.texture:this.fallbackTexture),i.uniform1i(this.progWall.loc.uWallpaper,1),i.uniform1i(this.progWall.loc.uUseImage,r?.ready?1:0),i.drawArrays(i.TRIANGLE_STRIP,0,4),this.downsampleBackdrop(),this.materialVersion===2)return;let a=this.mipLevels-1,[o,l]=this.mipSize(a);i.bindFramebuffer(i.READ_FRAMEBUFFER,this.fbos[a]),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,this.blurFbos[a]),i.blitFramebuffer(0,0,o,l,0,0,o,l,i.COLOR_BUFFER_BIT,i.NEAREST),i.bindVertexArray(this.quad),i.useProgram(this.progUp.p),i.uniform1i(this.progUp.loc.uLow,0),i.uniform1i(this.progUp.loc.uHigh,1);for(let n=a-1;n>=0;n--){let[h,u]=this.mipSize(n+1),[c,m]=this.mipSize(n);i.activeTexture(i.TEXTURE0),i.bindTexture(i.TEXTURE_2D,this.blurTex),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_BASE_LEVEL,n+1),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAX_LEVEL,n+1),i.activeTexture(i.TEXTURE1),i.bindTexture(i.TEXTURE_2D,this.tex),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_BASE_LEVEL,n),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAX_LEVEL,n),i.bindFramebuffer(i.FRAMEBUFFER,this.blurFbos[n]),i.viewport(0,0,c,m),i.uniform2f(this.progUp.loc.uLowTexel,1/h,1/u),i.drawArrays(i.TRIANGLE_STRIP,0,4)}i.activeTexture(i.TEXTURE0),i.bindTexture(i.TEXTURE_2D,this.blurTex),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_BASE_LEVEL,0),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAX_LEVEL,this.mipLevels-1),i.activeTexture(i.TEXTURE1),i.bindTexture(i.TEXTURE_2D,this.tex),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_BASE_LEVEL,0),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAX_LEVEL,this.mipLevels-1)}downsampleBackdrop(){if(this.lost||!this.fbos.length)return;let e=this.gl;e.bindVertexArray(this.quad),e.disable(e.BLEND),e.useProgram(this.progDown.p),e.uniform1i(this.progDown.loc.uTex,0),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this.tex);for(let t=1;t<this.mipLevels;t++){let[i,r]=this.mipSize(t-1),[a,o]=this.mipSize(t);e.texParameteri(e.TEXTURE_2D,e.TEXTURE_BASE_LEVEL,t-1),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAX_LEVEL,t-1),e.bindFramebuffer(e.FRAMEBUFFER,this.fbos[t]),e.viewport(0,0,a,o),e.uniform2f(this.progDown.loc.uTexel,1/i,1/r),e.drawArrays(e.TRIANGLE_STRIP,0,4)}e.texParameteri(e.TEXTURE_2D,e.TEXTURE_BASE_LEVEL,0),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAX_LEVEL,this.mipLevels-1)}beginBackdropLayer(){if(this.lost||!this.fbos.length||!this.blurFbos.length)return!1;let e=this.gl;return e.bindFramebuffer(e.READ_FRAMEBUFFER,this.fbos[0]),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,this.blurFbos[0]),e.blitFramebuffer(0,0,this.w,this.h,0,0,this.w,this.h,e.COLOR_BUFFER_BIT,e.NEAREST),!0}commitBackdropLayer(){this.lost||!this.fbos.length||!this.blurFbos.length||([this.tex,this.blurTex]=[this.blurTex,this.tex],[this.fbos,this.blurFbos]=[this.blurFbos,this.fbos],this.downsampleBackdrop())}drawBackdrop(){if(this.lost||!this.tex)return;let e=this.gl;e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.w,this.h),e.disable(e.BLEND),e.bindVertexArray(this.quad),e.useProgram(this.progBlit.p),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this.tex),e.uniform1i(this.progBlit.loc.uTex,0),e.drawArrays(e.TRIANGLE_STRIP,0,4)}clearOutput(){if(this.lost)return;let e=this.gl;e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.w,this.h),e.disable(e.BLEND),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT)}drawGlassGroup(e,t,i,r=t.mergeRadius??0){if(!e.length||this.lost||!this.tex)return;let a=this.gl,{loc:o,p:l}=this.progGlass,n=e.slice(0,16),h=Math.min(...n.map(p=>p.x)),u=Math.min(...n.map(p=>p.y)),c=Math.max(...n.map(p=>p.x+p.w)),m=Math.max(...n.map(p=>p.y+p.h)),f=c-h,d=m-u;a.bindFramebuffer(a.FRAMEBUFFER,null),a.viewport(0,0,this.w,this.h),a.enable(a.BLEND),a.blendFunc(a.ONE,a.ONE_MINUS_SRC_ALPHA),a.bindVertexArray(this.quad),a.useProgram(l);let y=(h+f/2)*i,b=this.h-(u+d/2)*i,x=f/2*i,T=d/2*i,w=new Float32Array(32),g=new Float32Array(32),v=new Float32Array(16),R=new Int32Array(16);n.forEach((p,k)=>{let D=Math.min(p.w,p.h);w[k*2]=(p.x+p.w/2)*i,w[k*2+1]=this.h-(p.y+p.h/2)*i,g[k*2]=p.w/2*i,g[k*2+1]=p.h/2*i,v[k]=Math.min(p.radius??t.radius,D*.235)*i,R[k]=p.shape==="pill"?1:p.shape==="circle"?2:0}),a.activeTexture(a.TEXTURE0),a.bindTexture(a.TEXTURE_2D,this.tex),a.uniform1i(o.uSrc,0),a.activeTexture(a.TEXTURE2),a.bindTexture(a.TEXTURE_2D,this.blurTex),a.uniform1i(o.uBlurSrc,2),a.uniform2f(o.uRes,this.w,this.h),a.uniform2f(o.uCenter,y,b),a.uniform2f(o.uHalf,x,T),a.uniform1i(o.uShapeCount,n.length),a.uniform2fv(o.uShapeCenters,w),a.uniform2fv(o.uShapeHalves,g),a.uniform1iv(o.uShapeTypes,R),a.uniform1fv(o.uShapeRadii,v),a.uniform1f(o.uMergeRadius,Math.max(0,r)*i),a.uniform1f(o.uPad,(t.shadowSize*4+Math.max(r,0)*.3+8)*i),a.uniform1f(o.uSquircle,t.squircle),a.uniform1f(o.uBevel,t.bevel*i),a.uniform1f(o.uHeight,t.height*i),a.uniform1f(o.uSizeAdaptation,t.sizeAdaptation??1),a.uniform1f(o.uIOR,t.ior),a.uniform1f(o.uDispersion,t.dispersion),a.uniform1f(o.uBlurPlateau,t.blurPlateau*i),a.uniform1f(o.uBlurRim,t.blurRim*i),a.uniform1f(o.uOpticalDensity,t.opticalDensity),a.uniform1f(o.uMips,this.mipLevels),a.uniform1f(o.uSpecular,t.specular),a.uniform1f(o.uSpecPower,t.specPower),a.uniform1f(o.uHighlightAdapt,t.highlightAdapt),a.uniform1f(o.uHighlightWidth,t.highlightWidth),a.uniform1f(o.uHighlightSharpness,t.highlightSharpness),a.uniform1f(o.uHighlightBase,t.highlightBase),a.uniform1f(o.uFresnel,t.fresnel),a.uniform1f(o.uSat,t.saturation),a.uniform1f(o.uBright,t.brightness),a.uniform1f(o.uTintAmount,t.tintAmount),a.uniform3f(o.uTintColor,...t.tintColor),a.uniform1f(o.uTintAdapt,t.tintAdapt??0),a.uniform1f(o.uShadow,t.shadow),a.uniform1f(o.uShadowSize,t.shadowSize*i),a.uniform1f(o.uShadowOffset,t.shadowOffset*i),a.uniform2f(o.uLightDir,t.lightX,t.lightY),a.uniform1f(o.uEdgeLine,t.edgeLine),a.uniform1f(o.uEdgeWidth,t.edgeWidth*i),a.uniform1f(o.uEdgeDark,t.edgeDark),a.uniform1f(o.uRefractScale,t.refractScale),a.uniform1f(o.uMeniscus,t.meniscus),a.uniform1i(o.uDebug,t.debug|0),a.drawArrays(a.TRIANGLE_STRIP,0,4),a.disable(a.BLEND)}drawGlass(e,t,i){this.drawGlassGroup([e],t,i,0)}drawGlassV2Group(e,t,i,r=[],a=[],o={}){if(!e.length||this.lost||!this.tex)return;let l=!!o.intoBackdrop&&this.blurFbos.length>0,n=this.gl,{loc:h,p:u}=this.progGlass,c=e.slice(0,16),m=Math.min(...c.map(S=>S.x)),f=Math.min(...c.map(S=>S.y)),d=Math.max(...c.map(S=>S.x+S.w)),y=Math.max(...c.map(S=>S.y+S.h)),b=d-m,x=y-f,T=new Float32Array(32),w=new Float32Array(32),g=new Float32Array(16),v=new Int32Array(16),R=new Float32Array(32),p=new Float32Array(16),k=new Float32Array(16),D=new Float32Array(16),C=new Float32Array(16),L=new Float32Array(16),B=new Float32Array(32);c.forEach((S,E)=>{let P=Math.min(S.w,S.h);T[E*2]=(S.x+S.w/2)*i,T[E*2+1]=this.h-(S.y+S.h/2)*i,w[E*2]=S.w/2*i,w[E*2+1]=S.h/2*i,g[E]=Math.min(S.radius??P*.5*t.roundness,P*.5)*i,v[E]=S.shape==="pill"?1:S.shape==="circle"?2:0;let W=r[E]??[Math.SQRT1_2,Math.SQRT1_2];R[E*2]=W[0],R[E*2+1]=W[1],p[E]=S.tint??t.tint,k[E]=a[E]??1,D[E]=S.frost??t.frost,C[E]=S.opacity??1,L[E]=S.pressure??0,B[E*2]=S.pressureAxes?.[0]??1,B[E*2+1]=S.pressureAxes?.[1]??1}),n.bindFramebuffer(n.FRAMEBUFFER,l?this.blurFbos[0]:null),n.viewport(0,0,this.w,this.h),n.enable(n.BLEND),n.blendFunc(n.ONE,n.ONE_MINUS_SRC_ALPHA),n.bindVertexArray(this.quad),n.useProgram(u),n.activeTexture(n.TEXTURE0),n.bindTexture(n.TEXTURE_2D,this.tex),n.uniform1i(h.uSrc,0),n.uniform1i(h.uOutputLinear,l?1:0),n.uniform2f(h.uRes,this.w,this.h),n.uniform1f(h.uDpr,i),n.uniform2f(h.uCenter,(m+b/2)*i,this.h-(f+x/2)*i),n.uniform2f(h.uHalf,b/2*i,x/2*i),n.uniform1f(h.uPad,4*i),n.uniform1f(h.uMips,this.mipLevels),n.uniform1i(h.uShapeCount,c.length),n.uniform2fv(h.uShapeCenters,T),n.uniform2fv(h.uShapeHalves,w),n.uniform1iv(h.uShapeTypes,v),n.uniform1fv(h.uShapeRadii,g),n.uniform1fv(h.uShapeTints,p),n.uniform1fv(h.uShapeTintLights,k),n.uniform1fv(h.uShapeFrosts,D),n.uniform1fv(h.uShapeOpacities,C),n.uniform1fv(h.uShapePressures,L),n.uniform2fv(h.uShapePressAxes,B),n.uniform2fv(h.uLightDirs,R),n.uniform1f(h.uRefraction,t.refraction*i),n.uniform1f(h.uEdgeReach,t.edgeReach),n.uniform1f(h.uBackdropBlur,(t.backdropBlur??0)*i),n.uniform1f(h.uEdgeWidth,t.edgeWidth),n.uniform1f(h.uDispersion,t.dispersion),n.uniform1f(h.uBody,t.body),n.uniform1f(h.uAbsorption,t.absorption),n.uniform1f(h.uRim,t.rim),n.uniform1f(h.uReflection,t.reflection),n.uniform1f(h.uHighlight,t.highlight),n.uniform1f(h.uEcho,t.echo),n.uniform1f(h.uHairline,t.hairline),n.uniform1f(h.uHairWidth,t.hairWidth),n.drawArrays(n.TRIANGLE_STRIP,0,4),n.disable(n.BLEND)}destroy(){if(this.lost){this.wallpapers=[];return}let e=this.gl;this.releaseTargets(),this.releaseResources(),this.wallpapers.forEach(t=>e.deleteTexture(t.texture)),this.wallpapers=[]}};var Ve={radius:64,squircle:2,mergeRadius:52,bevel:34,height:21,sizeAdaptation:1,ior:2,dispersion:.06,refractScale:3,meniscus:1,blurPlateau:4.5,blurRim:11,opticalDensity:.4,specular:.89,specPower:29.5,fresnel:.65,saturation:1.35,brightness:0,tintAmount:.02,tintColor:[1,1,1],tintAdapt:.14,shadow:.09,shadowSize:4,shadowOffset:0,lightX:-.18,lightY:.08,highlightAdapt:.91,highlightWidth:.87,highlightSharpness:.55,highlightBase:.3,edgeLine:.3,edgeWidth:.5,edgeDark:.02,debug:0},He={regular:{},clear:{blurPlateau:3,blurRim:1,height:20,bevel:15,refractScale:1.5,specular:.36,fresnel:1,tintAmount:.02,brightness:.02,saturation:1.18},lens:{bevel:26,height:34,ior:1.62,dispersion:.09,refractScale:1.8,blurPlateau:2,blurRim:0,specular:.42,fresnel:1.2}},qe={tintAmount:.86,blurPlateau:0,blurRim:0,refractScale:0,dispersion:0,meniscus:0,specular:.12,fresnel:.15,saturation:1,highlightBase:.06,edgeLine:.22};function vi(s){return{...s,tintColor:[...s.tintColor]}}function Xe(){return vi(Ve)}function he(s="regular"){return{...Xe(),...He[s]||{}}}var Z=Object.freeze({refraction:84,edgeReach:.14,edgeWidth:.21,dispersion:2,frost:0,backdropBlur:0,body:.72,absorption:.58,tint:0,rim:.24,reflection:.31,highlight:.34,lightAngle:136,echo:.28,hairline:.92,hairWidth:.52,roundness:.47}),ce=Object.freeze({refraction:0,edgeReach:0,dispersion:0,frost:0,backdropBlur:0,body:1.5,tint:1.35,reflection:.18,highlight:.12,echo:0}),Se=Object.freeze([["refraction",0,110,1],["edgeReach",0,1.6,.01],["edgeWidth",0,.55,.01],["dispersion",0,7,.1],["frost",0,1,.01],["backdropBlur",0,64,1],["body",0,1.5,.01],["absorption",0,2,.01],["tint",0,1.5,.01],["rim",0,1,.01],["reflection",0,1.5,.01],["highlight",0,1.5,.01],["lightAngle",-180,180,1],["echo",0,1.5,.01],["hairline",0,1.5,.01],["hairWidth",0,1,.01],["roundness",.05,.6,.01]]);function X(){return{...Z}}function _(s={}){if(typeof s=="string")throw new TypeError("Liquid Glass V2 does not use V1 preset names.");let e=Object.keys(s||{}).filter(t=>!(t in Z));if(e.length)throw new TypeError(`Unknown Liquid Glass V2 material parameter${e.length===1?"":"s"}: ${e.join(", ")}`);return{...X(),...s||{}}}var bi=Object.freeze({rect:0,folder:0,pill:1,circle:2});function xi(s){return bi[s]??0}function wt(s,e,t,i,r){let a=Math.min(r,t,i),o=Math.abs(s)-t+a,l=Math.abs(e)-i+a;return Math.min(Math.max(o,l),0)+Math.hypot(Math.max(o,0),Math.max(l,0))-a}function yi(s,e=.47){let t=Number(s.w??s.width??s.size??0),i=Number(s.h??s.height??s.size??t);return Number.isFinite(s.radius)?Math.max(0,Math.min(Number(s.radius),Math.min(t,i)*.5)):Math.min(t,i)*.5*e}function St(s,e,t,i={}){let r=Number(t.w??t.width??t.size??0),a=Number(t.h??t.height??t.size??r),o=r/2,l=a/2,n=s-Number(t.x??0)-o,h=e-Number(t.y??0)-l,u=xi(t.shape),c=yi({...t,w:r,h:a},i.roundness??.47);return u===1?wt(n,h,o,l,Math.min(o,l)):u===2?Math.hypot(n,h)-Math.min(o,l):wt(n,h,o,l,c)}function ue(s,e,t,i={}){let r=1/0;for(let a of t)r=Math.min(r,St(s,e,a,i));return r}function de(s,e,t,i={},r={}){let a=r.tolerance??0;for(let o=t.length-1;o>=0;o--)if(St(s,e,t[o],i)<=a)return t[o];return null}var wi=new Set(["folder","rect","pill","circle"]),Si=new Set(["replace","overlay"]),Ti=new Set(["auto","static","live"]),Ei="(prefers-reduced-transparency: reduce)";function Ri(s){if(!Si.has(s))throw new TypeError(`Unknown liquid glass V2 composite mode: ${s}`);return s}function ki(s){let e=s==="folderRect"?"rect":s;if(!wi.has(e))throw new TypeError(`Unknown liquid glass V2 shape: ${s}`);return e}function Ye(s,e){let t=Number(s.w??s.width??s.size??0),i=Number(s.h??s.height??s.size??t);if(!Number.isFinite(t)||!Number.isFinite(i)||t<0||i<0)throw new TypeError("Liquid glass V2 elements need a finite, non-negative width and height.");let r=s.tint==null?void 0:Number(s.tint);if(r!==void 0&&!Number.isFinite(r))throw new TypeError("Liquid glass V2 element tint must be a finite number.");let a=s.frost==null?void 0:Number(s.frost);if(a!==void 0&&!Number.isFinite(a))throw new TypeError("Liquid glass V2 element frost must be a finite number.");let o=s.opacity==null?void 0:Number(s.opacity),l=Number(s.pressure??0);if(!Number.isFinite(l))throw new TypeError("Liquid glass V2 element pressure must be a finite number.");let n=s.pressureAxes==null?[1,1]:[Number(s.pressureAxes[0]??1),Number(s.pressureAxes[1]??1)];if(!n.every(Number.isFinite))throw new TypeError("Liquid glass V2 element pressureAxes must be two finite numbers.");if(o!==void 0&&!Number.isFinite(o))throw new TypeError("Liquid glass V2 element opacity must be a finite number.");let h=s.tintTone??"light";if(!["auto","light","dark"].includes(h))throw new TypeError(`Unknown liquid glass V2 tint tone: ${h}`);let u=Number(s.layer??0);if(!Number.isInteger(u)||u<0)throw new TypeError("Liquid glass V2 element layer must be a non-negative integer.");return{...s,id:s.id??`glass-v2-${e+1}`,shape:ki(s.shape??"rect"),x:Number(s.x??0),y:Number(s.y??0),w:t,h:i,...r===void 0?{}:{tint:r},...a===void 0?{}:{frost:a},...o===void 0?{}:{opacity:o},tintTone:h,layer:u,pressure:Math.max(0,Math.min(1,l)),pressureAxes:n.map(c=>Math.max(0,Math.min(1,c)))}}function Ai(s){let e=new Map;for(let t of s){let i=t.layer??0;e.has(i)||e.set(i,[]),e.get(i).push(t)}return[...e.keys()].sort((t,i)=>t-i).map(t=>e.get(t))}function Tt(s){let e=Number(s??1);if(!Number.isFinite(e)||e<=0||e>1)throw new TypeError("Liquid glass V2 backdrop scale must be a number in (0, 1].");return Math.max(.1,e)}function Et(s){return typeof s!="string"?Promise.resolve(s):new Promise((e,t)=>{let i=new Image;i.onload=()=>e(i),i.onerror=()=>t(new Error(`Unable to load liquid glass V2 wallpaper: ${s}`)),i.src=s})}function Li(s){let e=s?.tagName?.toUpperCase();return e==="CANVAS"||e==="VIDEO"||s?.constructor?.name==="OffscreenCanvas"||s?.constructor?.name==="VideoFrame"}function Mi(s,e="auto"){if(!Ti.has(e))throw new TypeError(`Unknown liquid glass V2 backdrop update mode: ${e}`);return e==="auto"?Li(s)?"live":"static":e}function Ci(s){return typeof globalThis.matchMedia=="function"?globalThis.matchMedia(s):null}function Rt(s){return[Number(s?.videoWidth||s?.naturalWidth||s?.width||0),Number(s?.videoHeight||s?.naturalHeight||s?.height||0)]}function kt(s,e,t,i){let r=Math.max(t/s,t/e)*i,a=s*r,o=e*r;return{x:(t-a)/2,y:(t-o)/2,width:a,height:o}}var Di=`
let canvas = null;
self.onmessage = ({ data }) => {
  const { id, bitmap, size, x, y, width, height } = data;
  let pixels = null;
  try {
    if (!canvas || canvas.width !== size) canvas = new OffscreenCanvas(size, size);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.clearRect(0, 0, size, size);
    context.drawImage(bitmap, x, y, width, height);
    pixels = context.getImageData(0, 0, size, size).data;
  } catch {}
  bitmap.close();
  self.postMessage({ id, pixels }, pixels ? [pixels.buffer] : []);
};`,At=84,z=class{static isSupported(){if(typeof document>"u")return!1;try{let t=document.createElement("canvas").getContext("webgl2");return t?(t.getExtension("WEBGL_lose_context")?.loseContext(),!0):!1}catch{return!1}}constructor(e,t={}){if(!e||typeof e.getContext!="function")throw new TypeError("LiquidGlassWebGLV2 needs an HTMLCanvasElement.");this.canvas=e,this.version="v2",this.compositeMode=Ri(t.compositeMode??"replace"),this.renderer=new Q(e,{alpha:this.compositeMode==="overlay",preserveDrawingBuffer:!!t.preserveDrawingBuffer,materialVersion:2}),this.material=_(t.material),this.elements=[],this.backdrops=[],this.wallpaperIndex=0,this.wallpaperZoom=t.wallpaperZoom??1,this.running=!1,this.animationFrame=0,this.dirty=!0,this.backdropDirty=!0,this.pyramidStale=!1,this.backdropScale=1,this.lightFieldDirty=!0,this.lastFrame={width:0,height:0,dpr:0},this.warnedShapeLimit=!1,this.lightCanvas=null,this.lightPixels=null,this.lightSampleSize=64,this.smoothedLightDirections=new Map,this.lastLightFieldUpdate=0,this.lastLightBlendTime=0,this.lastManualBackdropUpdate=-1/0,this.lightFieldAsyncDirty=!1,this.lightWorker=null,this.lightWorkerUnavailable=!1,this.lightProbeId=0,this.lightProbePending=!1,this.lightProbeQueued=!1,this.settledRenderFrame=0,this.onContextLost=t.onContextLost??null,this.onContextRestored=t.onContextRestored??null,this.respectReducedTransparency=t.respectReducedTransparency??!0,this.reducedTransparencyQuery=this.respectReducedTransparency?Ci(Ei):null,this.handleReducedTransparencyChange=()=>{this.markDirty(),this.render()},this.reducedTransparencyQuery?.addEventListener?.("change",this.handleReducedTransparencyChange),this.handleContextLost=i=>{i.preventDefault(),this.renderer.handleContextLost(),this.markBackdropDirty(),this.onContextLost?.(i)},this.handleContextRestored=i=>{this.renderer.restore(),this.markBackdropDirty(),this.lastFrame={width:0,height:0,dpr:0},this.onContextRestored?.(i),this.render()},e.addEventListener("webglcontextlost",this.handleContextLost,!1),e.addEventListener("webglcontextrestored",this.handleContextRestored,!1),this.resizeObserver=null,(t.autoResize??!0)&&typeof globalThis.ResizeObserver=="function"&&(this.resizeObserver=new globalThis.ResizeObserver(()=>{this.lightFieldDirty=!0,this.markDirty(),this.render()}),this.resizeObserver.observe(e)),t.elements&&this.setElements(t.elements,!1),t.wallpapers&&this.setWallpapers(t.wallpapers,!1),t.backdrop&&this.setBackdrop(t.backdrop,{update:t.backdropUpdate,autoStart:t.autoStart,shouldRender:!1})}get contextLost(){return this.renderer.lost}get reducedTransparency(){return!!this.reducedTransparencyQuery?.matches}get effectiveMaterial(){return this.reducedTransparency?{...this.material,...ce}:this.material}markDirty(){return this.dirty=!0,this}markBackdropDirty(){return this.backdropDirty=!0,this.lightFieldDirty=!0,this.lastLightFieldUpdate=0,this.smoothedLightDirections.clear(),this.markDirty()}setElements(e,t=!0){return this.elements=e.map((i,r)=>Ye(i,r)),this.markDirty(),t&&this.render(),this}addElement(e,t=!0){let i=Ye(e,this.elements.length);return this.elements.push(i),this.markDirty(),t&&this.render(),i.id}updateElement(e,t,i=!0){let r=this.elements.findIndex(a=>a.id===e);return r===-1?this:(this.elements[r]=Ye({...this.elements[r],...t},r),this.markDirty(),i&&this.render(),this)}removeElement(e,t=!0){return this.elements=this.elements.filter(i=>i.id!==e),this.markDirty(),t&&this.render(),this}setMaterial(e,t=!0){if(typeof e=="string")throw new TypeError("Liquid Glass V2 does not convert V1 preset names. Pass a V2 material object.");return this.material=_({...this.material,...e||{}}),this.markDirty(),t&&this.render(),this}setWallpapers(e,t=!0){return this.backdrops=e.slice(),this.renderer.setWallpapers(e,{update:"static"}),this.markBackdropDirty(),t&&this.render(),this}async loadWallpapers(e,t=!0){let i=await Promise.all(e.map(Et));return this.setWallpapers(i,t)}async setWallpaper(e,t=!0){return this.loadWallpapers([e],t)}setBackdrop(e,t={}){if(!e||typeof e=="string")throw new TypeError("setBackdrop needs a CanvasImageSource. Use loadBackdrop for a URL.");let i=Mi(e,t.update);return t.scale!==void 0&&(this.backdropScale=Tt(t.scale)),this.backdrops=[e],this.renderer.setWallpapers([e],{update:i,scale:this.backdropScale}),this.wallpaperIndex=0,this.markBackdropDirty(),(t.autoStart??i==="live")&&this.start(),(t.shouldRender??!0)&&this.render(),this}setBackdropScale(e,t=!0){let i=Tt(e);return i===this.backdropScale?this:(this.backdropScale=i,this.renderer.setWallpaperScale(i)&&!this.renderer.hasLiveBackdrop()&&this.renderer.refreshWallpapers(!0),this.markBackdropDirty(),t&&this.render(),this)}async loadBackdrop(e,t={}){let i=await Et(e);return this.setBackdrop(i,{...t,update:t.update??"static"})}updateBackdrop(e=!0){this.renderer.refreshWallpapers(!0);let t=globalThis.performance?.now?.()??Date.now(),i=t-this.lastManualBackdropUpdate<At;return this.lastManualBackdropUpdate=t,i&&this.lightProbeWorker()?(this.backdropDirty=!0,this.lightFieldAsyncDirty=!0,this.markDirty()):this.markBackdropDirty(),e&&this.render(),this}setWallpaperIndex(e,t=!0){return this.wallpaperIndex=Math.max(0,Math.floor(e)),this.markBackdropDirty(),t&&this.render(),this}distanceAt(e,t){return ue(e,t,this.elements,this.material)}hitTest(e,t,i={}){return de(e,t,this.elements,this.material,i)}pointerPosition(e){let t=this.canvas.getBoundingClientRect(),i=e.touches?.[0]??e.changedTouches?.[0]??e;return{x:i.clientX-t.left,y:i.clientY-t.top}}hitTestEvent(e,t={}){let{x:i,y:r}=this.pointerPosition(e),a=t.tolerance??(e.pointerType&&e.pointerType!=="mouse"?8:0);return this.hitTest(i,r,{...t,tolerance:a})}start(){if(this.running)return this;if(typeof globalThis.requestAnimationFrame!="function")throw new Error("LiquidGlassWebGLV2.start() requires requestAnimationFrame.");this.running=!0;let e=()=>{this.running&&(this.render(),this.animationFrame=globalThis.requestAnimationFrame(e))};return this.animationFrame=globalThis.requestAnimationFrame(e),this}stop(){return this.running=!1,this.animationFrame&&typeof globalThis.cancelAnimationFrame=="function"&&globalThis.cancelAnimationFrame(this.animationFrame),this.animationFrame=0,this}resize(e=this.canvas.clientWidth||this.canvas.width||1,t=this.canvas.clientHeight||this.canvas.height||1,i=Math.min(globalThis.devicePixelRatio||1,2)){return this.renderer.resize(Math.round(e*i),Math.round(t*i)),{width:e,height:t,dpr:i}}probeSource(){return this.renderer.probeSource(this.wallpaperIndex)??this.backdrops[this.wallpaperIndex]}updateLightField(){this.lightFieldDirty=!1,this.lightProbeId+=1,this.lightProbeQueued=!1;let e=this.probeSource(),[t,i]=Rt(e);if(!(t>0)||!(i>0)||typeof document>"u"){this.lightPixels=null;return}this.lightCanvas||(this.lightCanvas=document.createElement("canvas"));let r=this.lightSampleSize;this.lightCanvas.width=r,this.lightCanvas.height=r;let a=this.lightCanvas.getContext("2d",{willReadFrequently:!0});if(!a){this.lightPixels=null;return}a.clearRect(0,0,r,r);let o=kt(t,i,r,this.wallpaperZoom);try{a.drawImage(e,o.x,o.y,o.width,o.height),this.lightPixels=a.getImageData(0,0,r,r).data}catch{this.lightPixels=null}}lightProbeWorker(){if(this.lightWorker||this.lightWorkerUnavailable)return this.lightWorker;if(typeof globalThis.Worker!="function"||typeof globalThis.OffscreenCanvas!="function"||typeof globalThis.createImageBitmap!="function"||typeof globalThis.Blob!="function"||typeof globalThis.URL?.createObjectURL!="function")return this.lightWorkerUnavailable=!0,null;let e="",t=()=>{e&&globalThis.URL.revokeObjectURL(e),e=""};try{e=globalThis.URL.createObjectURL(new globalThis.Blob([Di],{type:"text/javascript"})),this.lightWorker=new globalThis.Worker(e)}catch{return t(),this.lightWorkerUnavailable=!0,null}let i=()=>{this.lightWorker?.terminate(),this.lightWorker=null,this.lightWorkerUnavailable=!0,this.lightProbePending=!1,this.lightFieldDirty=!0,this.markDirty()};return this.lightWorker.onerror=()=>{t(),i()},this.lightWorker.onmessage=({data:r})=>{if(t(),this.lightProbePending=!1,!r.pixels){i();return}r.id===this.lightProbeId&&(this.lightPixels=r.pixels,this.markDirty(),this.lightProbeQueued&&(this.lightProbeQueued=!1,this.requestLightField({queue:!0})),this.renderer.hasLiveBackdrop()||this.scheduleSettledRender())},this.lightWorker}requestLightField({queue:e=!1}={}){if(this.lightProbePending)return e&&(this.lightProbeQueued=!0),!0;let t=this.probeSource(),[i,r]=Rt(t);if(!(i>0)||!(r>0)||!this.lightProbeWorker())return!1;let a=++this.lightProbeId,o=this.lightSampleSize,l=kt(i,r,o,this.wallpaperZoom);return this.lightProbePending=!0,globalThis.createImageBitmap(t).then(n=>{if(a!==this.lightProbeId||!this.lightWorker){n.close(),a===this.lightProbeId&&(this.lightProbePending=!1);return}this.lightWorker.postMessage({id:a,bitmap:n,size:o,...l},[n])},()=>{a===this.lightProbeId&&(this.lightProbePending=!1)}),!0}scheduleSettledRender(){this.settledRenderFrame||typeof globalThis.requestAnimationFrame!="function"||(this.settledRenderFrame=globalThis.requestAnimationFrame(()=>{this.settledRenderFrame=0,this.dirty&&this.render({dpr:this.lastFrame.dpr||void 0})}))}sampleLuminance(e,t){if(!this.lightPixels)return .5;let i=this.lightSampleSize,r=Math.max(0,Math.min(i-1,Math.round(e*(i-1)))),o=(Math.max(0,Math.min(i-1,Math.round(t*(i-1))))*i+r)*4;return(this.lightPixels[o]*.2126+this.lightPixels[o+1]*.7152+this.lightPixels[o+2]*.0722)/255}lightDirection(e,t,i,r){let a=[-.34,0,.34],o=0,l=0;for(let g of a)for(let v of a){let R=(e.x+e.w*(.5+v))/Math.max(t,1),p=(e.y+e.h*(.5+g))/Math.max(i,1),k=this.sampleLuminance(R,p);o+=v*k,l+=g*k}let n=r*Math.PI/180,h=Math.cos(n),u=Math.sin(n),c=Math.hypot(o,l)/a.length;if(c<.008)return[h,u];let m=Math.hypot(o,l)||1,f=-o/m,d=l/m,y=Math.max(0,Math.min(1,(c-.015)/.13)),b=y*y*(3-2*y)*.58,x=h*(1-b)+f*b,T=u*(1-b)+d*b,w=Math.hypot(x,T)||1;return[x/w,T/w]}tintLightForElement(e,t,i){if(e.tintTone==="light")return 1;if(e.tintTone==="dark")return 0;let r=[-24,0,24],a=e.x+e.w*.5,o=e.y+e.h*.5,l=0;for(let u of r)for(let c of r){let m=(a+c)/Math.max(t,1),f=(o+u)/Math.max(i,1);l+=this.sampleLuminance(m,f)}let n=l/(r.length*r.length),h=Math.max(0,Math.min(1,(n-.22)/(.5-.22)));return h*h*(3-2*h)}render(e={}){if(this.renderer.lost)return this;let t=this.canvas.clientWidth||this.canvas.width||1,i=this.canvas.clientHeight||this.canvas.height||1,r=Number(e.dpr??globalThis.devicePixelRatio??1),a=Math.max(.5,Math.min(Number.isFinite(r)?r:1,2)),o=t!==this.lastFrame.width||i!==this.lastFrame.height||a!==this.lastFrame.dpr,l=this.renderer.hasLiveBackdrop();if(!e.force&&!this.dirty&&!o&&!l)return this;this.resize(t,i,a);let n=Ai(this.elements.filter(g=>g.w>0&&g.h>0));if(this.compositeMode==="overlay"&&!n.length)return this.renderer.clearOutput(),o&&(this.pyramidStale=!0),this.dirty=!1,this.lastFrame={width:t,height:i,dpr:a},this;let h=globalThis.performance?.now?.()??Date.now(),u=this.backdropDirty||o||l;if((u||this.pyramidStale)&&(this.renderer.buildBackdrop(this.wallpaperIndex,this.wallpaperZoom),this.pyramidStale=!1),u){let g=l&&h-this.lastLightFieldUpdate>=At;if(this.lightFieldDirty||o)this.updateLightField(),this.lastLightFieldUpdate=h;else if(g||this.lightFieldAsyncDirty){let v=this.lightFieldAsyncDirty;this.lightFieldAsyncDirty=!1,this.requestLightField({queue:v})||this.updateLightField(),this.lastLightFieldUpdate=h}this.backdropDirty=!1}this.compositeMode==="overlay"?this.renderer.clearOutput():this.renderer.drawBackdrop();let c=this.effectiveMaterial,m=n.flat(),f=this.lastLightBlendTime?Math.min(100,h-this.lastLightBlendTime):100,d=l?1-Math.exp(-f/280):1,y=new Set(m.map(g=>g.id));for(let g of this.smoothedLightDirections.keys())y.has(g)||this.smoothedLightDirections.delete(g);let b=m.map(g=>{let v=this.lightDirection(g,t,i,c.lightAngle),R=this.smoothedLightDirections.get(g.id);if(!R||d>=1)return this.smoothedLightDirections.set(g.id,v),v;let p=R[0]*(1-d)+v[0]*d,k=R[1]*(1-d)+v[1]*d,D=Math.hypot(p,k)||1,C=[p/D,k/D];return this.smoothedLightDirections.set(g.id,C),C}),x=m.map(g=>this.tintLightForElement(g,t,i));this.lastLightBlendTime=h,n.some(g=>g.length>16)&&!this.warnedShapeLimit&&(this.warnedShapeLimit=!0,console.warn(`LiquidGlassWebGLV2: more than ${16} shapes require multiple passes; overlapping shapes across a pass boundary may composite differently.`));let T=(g,v,R)=>{for(let p=0;p<g.length;p+=16)this.renderer.drawGlassV2Group(g.slice(p,p+16),c,a,b.slice(v+p,v+p+16),x.slice(v+p,v+p+16),{intoBackdrop:R})},w=0;return n.forEach((g,v)=>{T(g,w,!1),v<n.length-1&&this.renderer.beginBackdropLayer()&&(T(g,w,!0),this.renderer.commitBackdropLayer(),this.pyramidStale=!0),w+=g.length}),this.dirty=!1,this.lastFrame={width:t,height:i,dpr:a},this}destroy(){this.stop(),this.lightProbeId+=1,this.settledRenderFrame&&typeof globalThis.cancelAnimationFrame=="function"&&globalThis.cancelAnimationFrame(this.settledRenderFrame),this.settledRenderFrame=0,this.lightWorker?.terminate(),this.lightWorker=null,this.lightProbePending=!1,this.canvas.removeEventListener("webglcontextlost",this.handleContextLost,!1),this.canvas.removeEventListener("webglcontextrestored",this.handleContextRestored,!1),this.reducedTransparencyQuery?.removeEventListener?.("change",this.handleReducedTransparencyChange),this.resizeObserver?.disconnect(),this.resizeObserver=null,this.renderer.destroy(),this.elements=[],this.backdrops=[],this.lightPixels=null,this.lightCanvas=null,this.smoothedLightDirections.clear()}};var Y=new Set,O=new Map,J=0,$e=0,Te=!1,fe=null,ee=0,te=()=>ee;function Lt(){ee++,M(34)}var Mt=()=>globalThis.performance?.now?.()??Date.now();function je(){!J&&typeof globalThis.requestAnimationFrame=="function"&&(J=globalThis.requestAnimationFrame(Pi))}function M(s=0){$e=Math.max($e,Mt()+s),je()}function Bi(){for(let s of O.keys())s.isConnected||O.delete(s);return O.size>0}function Pi(){J=0;let s=Mt();O.size&&ee++;let e=[];for(let i of Y)i.visible&&e.push(i);for(let i of e)try{i.measure(s)}catch(r){console.error(r)}let t=!1;for(let i of e)try{i.draw(s)&&(t=!0)}catch(r){console.error(r)}(t||s<$e||Bi())&&je()}function _i(s){if(!s||typeof s.contains!="function")return!1;for(let e of Y)for(let t of e.trackedElements())if(s===t||s.contains(t))return!0;return!1}var Ct=()=>{ee++,M(160)},Dt=()=>{ee++,Y.forEach(s=>s.onViewportResize?.()),M(320)},Bt=s=>{_i(s.target)&&(O.set(s.target,(O.get(s.target)??0)+1),je())},Pt=s=>{let e=O.get(s.target);e&&(e<=1?O.delete(s.target):O.set(s.target,e-1),M(34))},_t=()=>{ee++,M(200)};function Fi(){if(Te||typeof globalThis.addEventListener!="function")return;Te=!0;let s={capture:!0,passive:!0};globalThis.addEventListener("scroll",Ct,s),globalThis.addEventListener("resize",Dt,{passive:!0});for(let e of["transitionrun","animationstart"])document.addEventListener(e,Bt,!0);for(let e of["transitionend","transitioncancel","animationend","animationcancel"])document.addEventListener(e,Pt,!0);document.fonts?.addEventListener?.("loadingdone",_t),typeof globalThis.IntersectionObserver=="function"&&(fe=new globalThis.IntersectionObserver(e=>{for(let t of e)for(let i of Y)i.element===t.target&&(i.visible=t.isIntersecting);M(64)},{rootMargin:"256px"}))}function Ui(){if(Te){Te=!1,globalThis.removeEventListener("scroll",Ct,!0),globalThis.removeEventListener("resize",Dt);for(let s of["transitionrun","animationstart"])document.removeEventListener(s,Bt,!0);for(let s of["transitionend","transitioncancel","animationend","animationcancel"])document.removeEventListener(s,Pt,!0);document.fonts?.removeEventListener?.("loadingdone",_t),fe?.disconnect(),fe=null,O.clear(),J&&typeof globalThis.cancelAnimationFrame=="function"&&globalThis.cancelAnimationFrame(J),J=0}}function Ee(s){Y.add(s),s.visible=!0,Fi(),fe?.observe(s.element),M(120)}function Re(s){Y.delete(s)&&(fe?.unobserve(s.element),Y.size||Ui())}function Ft(s){Y.forEach(s)}var ie="data-liquid-glass-layer",Ii=/(^(data|blob|https?):)|\/|\.(avif|webp|png|apng|jpe?g|gif|svg|bmp|ico)([?#]|$)/i,It=new Set(["IMG","VIDEO","CANVAS"]),I=s=>typeof Element<"u"&&s instanceof Element,Ut=new Map,ke=new Set;function Ae(s){return ke.add(s),()=>ke.delete(s)}function zt(s){let e=Ut.get(s);if(e)return e;let t=new Image;return t.crossOrigin="anonymous",t.decoding="async",e={url:s,image:t,state:"loading"},e.promise=new Promise(i=>{t.onload=()=>{e.state="ready",i(e),ke.forEach(r=>r(e))},t.onerror=()=>{e.state="error",console.warn(`LiquidGlass: could not load backdrop image ${s} (a cross-origin image needs CORS headers).`),i(e),ke.forEach(r=>r(e))}}),t.src=s,Ut.set(s,e),e}function zi(s){if(!s)return[0,0];let e=s.tagName?.toUpperCase();return e==="IMG"?s.complete?[s.naturalWidth,s.naturalHeight]:[0,0]:e==="VIDEO"?s.readyState>=2?[s.videoWidth,s.videoHeight]:[0,0]:[Number(s.displayWidth??s.width??0),Number(s.displayHeight??s.height??0)]}function F(s,e){let t=[],i=0,r=0;for(let a=0;a<s.length;a++){let o=s[a];o==="("?i++:o===")"?i--:i===0&&(e===" "?/\s/.test(o):o===e)&&(t.push(s.slice(r,a)),r=a+1)}return t.push(s.slice(r)),t.map(a=>a.trim()).filter(Boolean)}function $(s="0%"){if(s==="left"||s==="top")return{ratio:0,px:0};if(s==="center")return{ratio:.5,px:0};if(s==="right"||s==="bottom")return{ratio:1,px:0};let e={ratio:0,px:0},t=/([-+])?\s*(\d*\.?\d+(?:e[-+]?\d+)?)(%|px)?/gi;for(let i=t.exec(s);i;i=t.exec(s)){let r=Number(i[2])*(i[1]==="-"?-1:1);i[3]==="%"?e.ratio+=r/100:e.px+=r}return e}var U=({ratio:s,px:e},t)=>s*t+e;function G(s="50% 50%"){let e=F(s," ");return e.length===1&&e.push("50%"),[$(e[0]),$(e[1])]}function Ni(s){return Array.isArray(s)?s.map(e=>typeof e=="number"?{ratio:e,px:0}:$(String(e))):G(s??"50% 50%")}function Oi(s,e,t,i="cover",r=G()){let a=t.width,o=t.height;if(i==="cover"||i==="contain"){let l=(i==="cover"?Math.max:Math.min)(t.width/s,t.height/e);a=s*l,o=e*l}else if(i==="none"||i==="scale-down"){let l=i==="none"?1:Math.min(1,t.width/s,t.height/e);a=s*l,o=e*l}return{x:t.x+U(r[0],t.width-a),y:t.y+U(r[1],t.height-o),width:a,height:o}}var Wi=new Set(["multiply","screen","overlay","darken","lighten","color-dodge","color-burn","hard-light","soft-light","difference","exclusion","hue","saturation","color","luminosity"]);function Nt(s,e){Wi.has(e.mixBlendMode)&&(s.globalCompositeOperation=e.mixBlendMode)}var N=s=>!s||s==="transparent"||/^rgba\([^)]*,\s*0(\.0*)?\s*\)$/.test(s)||/\/\s*0(\.0*)?%?\s*\)$/.test(s);function Gi(s,e){let t=(i,r)=>{let a=F(i||"0"," ")[0];return Math.max(0,U($(a),r))};return[t(s.borderTopLeftRadius,e.width),t(s.borderTopRightRadius,e.width),t(s.borderBottomRightRadius,e.width),t(s.borderBottomLeftRadius,e.width)]}function Vi(s,e,t){s.beginPath(),t?.some(i=>i>0)&&typeof s.roundRect=="function"?s.roundRect(e.x,e.y,e.width,e.height,t):s.rect(e.x,e.y,e.width,e.height),s.clip()}var pe=s=>{let e=s.getBoundingClientRect();return{x:e.left,y:e.top,width:e.width,height:e.height}},Ke=()=>({x:0,y:0,width:globalThis.innerWidth||document.documentElement.clientWidth,height:globalThis.innerHeight||document.documentElement.clientHeight});function Hi(s,e){let t=pe(s),i=s.offsetWidth?t.width/s.offsetWidth:1,r=s.offsetHeight?t.height/s.offsetHeight:1,a=(parseFloat(e.borderLeftWidth)||0)+(parseFloat(e.paddingLeft)||0),o=(parseFloat(e.borderTopWidth)||0)+(parseFloat(e.paddingTop)||0),l=(parseFloat(e.borderRightWidth)||0)+(parseFloat(e.paddingRight)||0),n=(parseFloat(e.borderBottomWidth)||0)+(parseFloat(e.paddingBottom)||0);return{x:t.x+a*i,y:t.y+o*r,width:Math.max(0,t.width-(a+l)*i),height:Math.max(0,t.height-(o+n)*r)}}function Ot(s,e){let t=[];for(let i of s){let r=F(i," "),a=[];for(;r.length>1&&/(%|px)$|^calc\(/.test(r[r.length-1]);)a.unshift(r.pop());let o=r.join(" ");a.length||t.push({color:o,offset:null});for(let l of a)t.push({color:o,offset:U($(l),e)/Math.max(e,1e-6)})}if(!t.length)return t;t[0].offset===null&&(t[0].offset=0),t.at(-1).offset===null&&(t.at(-1).offset=1);for(let i=1;i<t.length;i++){if(t[i].offset!==null){t[i].offset=Math.max(t[i].offset,t[i-1].offset);continue}let r=i;for(;t[r].offset===null;)r++;let a=t[i-1].offset,o=Math.max(t[r].offset,a);for(let l=i;l<r;l++)t[l].offset=a+(o-a)*(l-i+1)/(r-i+1)}return t}function Wt(s){if(s.length<2)return s;let e=s[0].offset,t=s.at(-1).offset-e;if(!(t>5e-4))return s;let i=[];for(let r=Math.floor(-e/t);r<=Math.ceil((1-e)/t);r++)for(let a of s){let o=a.offset+r*t;o<-t||o>1+t||i.push({color:a.color,offset:Math.min(1,Math.max(0,o))})}return i.length>=2?i:s}function Gt(s,e){for(let t of e)try{s.addColorStop(Math.min(1,Math.max(0,t.offset)),t.color)}catch{}return s}function qi(s){let e=/^(-?\d*\.?\d+)(deg|turn|rad|grad)$/.exec(s);if(!e)return null;let t=Number(e[1]);return{deg:t,turn:t*360,rad:t*180/Math.PI,grad:t*.9}[e[2]]}function Xi(s,e,t,i=!1){let r=F(e,","),a=180,o=r[0]??"",l=qi(o);if(l!==null)a=l,r.shift();else if(/^to\s/.test(o)){let y=o.slice(3).trim().split(/\s+/),b=y.includes("right")?1:y.includes("left")?-1:0,x=y.includes("bottom")?1:y.includes("top")?-1:0,T=b&&x?b*t.height:b,w=b&&x?x*t.width:x;a=Math.atan2(T,-w)*180/Math.PI,r.shift()}else/^in\s/.test(o)&&r.shift();let n=a*Math.PI/180,h=Math.abs(t.width*Math.sin(n))+Math.abs(t.height*Math.cos(n)),u=t.x+t.width/2,c=t.y+t.height/2,m=Math.sin(n)*h/2,f=-Math.cos(n)*h/2,d=Ot(r,h);s.fillStyle=Gt(s.createLinearGradient(u-m,c-f,u+m,c+f),i?Wt(d):d),s.fillRect(t.x,t.y,t.width,t.height)}function Yi(s,e,t,i=!1){let r=F(e,","),a=r[0]??"",o=!1,l="farthest-corner",n=null,h=G("50% 50%");if(!(/^(rgb|hsl|hwb|lab|lch|oklab|oklch|color|#|transparent|currentcolor)/i.test(a)||!/(circle|ellipse|closest|farthest|at\s|\d(px|%))/.test(a))){r.shift();let[v,R]=a.split(/\s*\bat\b\s*/);R&&(h=G(R));for(let p of F(v??""," "))p==="circle"?o=!0:p==="ellipse"?o=!1:/^(closest|farthest)-(side|corner)$/.test(p)?l=p:/(px|%)$/.test(p)&&(n??=[]).push($(p));n?.length===1&&(o=!0)}let c=t.x+U(h[0],t.width),m=t.y+U(h[1],t.height),f=c-t.x,d=t.x+t.width-c,y=m-t.y,b=t.y+t.height-m,x,T;if(n)x=U(n[0],t.width),T=n[1]?U(n[1],t.height):x;else{let v=l.startsWith("closest")?Math.min:Math.max,R=v(Math.abs(f),Math.abs(d)),p=v(Math.abs(y),Math.abs(b));if(o)x=l.endsWith("side")?v(R,p):Math.hypot(R,p),T=x;else{let k=l.endsWith("corner")?Math.SQRT2:1;x=R*k,T=p*k}}x=Math.max(x,.001),T=Math.max(T,.001),s.save(),s.beginPath(),s.rect(t.x,t.y,t.width,t.height),s.clip(),s.translate(c,m),s.scale(1,T/x);let w=Ot(r,x);s.fillStyle=Gt(s.createRadialGradient(0,0,0,0,0,x),i?Wt(w):w);let g=Math.max(t.width,t.height)*2+Math.abs(c)+Math.abs(m);s.fillRect(-g,-g*x/T,g*2,g*2*x/T),s.restore()}function $i(s,e,t){let[i,r]=t??[0,0],a=i>0&&r>0;if(s==="cover"||s==="contain"){if(!a)return[e.width,e.height];let u=(s==="cover"?Math.max:Math.min)(e.width/i,e.height/r);return[i*u,r*u]}let[o="auto",l="auto"]=F(s||"auto"," "),n=o==="auto"?null:U($(o),e.width),h=l==="auto"?null:U($(l),e.height);return n===null&&h===null?a?[i,r]:[e.width,e.height]:(n===null&&(n=a?h*i/r:e.width),h===null&&(h=a?n*r/i:e.height),[n,h])}function ji(s,e,t,i,r){let a=/^url\((['"]?)(.*)\1\)$/.exec(e),o=/^(repeating-)?(linear|radial)-gradient\((.*)\)$/s.exec(e);if(!a&&!o)return!0;let l=null;if(a&&(l=zt(a[2]),l.state!=="ready"))return l.state!=="loading";let n=l?[l.image.naturalWidth,l.image.naturalHeight]:null;if(l&&!(n[0]>0&&n[1]>0))return!0;let h=t.attachment==="fixed"?Ke():i,[u,c]=$i(t.size,h,n);if(!(u>.5&&c>.5))return!0;let m=G(t.position),f=h.x+U(m[0],h.width-u),d=h.y+U(m[1],h.height-c),[y,b]=(()=>{let C=F(t.repeat||"repeat"," ");if(C[0]==="repeat-x")return[!0,!1];if(C[0]==="repeat-y")return[!1,!0];let L=C[0]!=="no-repeat",B=(C[1]??C[0])!=="no-repeat";return[L,B]})(),x=Math.max(i.x,r.x),T=Math.min(i.x+i.width,r.x+r.width),w=Math.max(i.y,r.y),g=Math.min(i.y+i.height,r.y+r.height);if(x>=T||w>=g)return!0;let v=y?f+Math.floor((x-f)/u)*u:f,R=b?d+Math.floor((w-d)/c)*c:d,p=y?T:f+1,k=b?g:d+1,D=0;for(let C=R;C<k&&D<1024;C+=c)for(let L=v;L<p&&D<1024;L+=u){D++;let B={x:L,y:C,width:u,height:c};l?s.drawImage(l.image,L,C,u,c):o[2]==="linear"?Xi(s,o[3],B,!!o[1]):Yi(s,o[3],B,!!o[1])}return!0}function Qe(s,e,t,{canvas:i=!1}={}){let r=getComputedStyle(e);if(r.display==="none")return!0;let a=pe(e),o=i?1:Number(r.opacity);if(!(o>.004))return!0;let l=r.backgroundImage&&r.backgroundImage!=="none"?F(r.backgroundImage,","):[],n=r.backgroundColor;if(!l.length&&N(n))return!0;s.save(),s.globalAlpha*=Number.isFinite(o)?o:1,i||Nt(s,r),i?(s.beginPath(),s.rect(t.x,t.y,t.width,t.height),s.clip()):Vi(s,a,Gi(r,a)),N(n)||(s.fillStyle=n,s.fillRect(t.x,t.y,t.width,t.height));let h=b=>F(b||"",","),u=h(r.backgroundSize),c=h(r.backgroundPosition),m=h(r.backgroundRepeat),f=h(r.backgroundAttachment),d=(b,x,T)=>b.length?b[x%b.length]:T,y=!0;for(let b=l.length-1;b>=0;b--)y=ji(s,l[b],{size:d(u,b,"auto"),position:d(c,b,"0% 0%"),repeat:d(m,b,"repeat"),attachment:d(f,b,"scroll")},i?pe(document.documentElement):a,t)&&y;return s.restore(),y}function Vt(s,e,t,i,r,a){let[o,l]=zi(e);if(!(o>0&&l>0)||!(t.width>0&&t.height>0)||t.x>=a.x+a.width||t.x+t.width<=a.x||t.y>=a.y+a.height||t.y+t.height<=a.y)return;let n=Oi(o,l,t,i,r);s.save(),s.beginPath(),s.rect(t.x,t.y,t.width,t.height),s.clip();try{s.drawImage(e,n.x,n.y,n.width,n.height)}catch{}s.restore()}function Ze(s,e,t){let{element:i}=e,r=getComputedStyle(i);if(r.display==="none"||r.visibility==="hidden")return;let a=Number(r.opacity);if(!(a>.004))return;s.save(),s.globalAlpha*=Number.isFinite(a)?a:1,Nt(s,r);let o=e.anchor?Ht(e.anchor):Hi(i,r);Vt(s,i,o,e.fit??r.objectFit??"fill",e.position??G(r.objectPosition),t),s.restore()}function Ht(s){return s==="viewport"||s==null?Ke():s==="document"?pe(document.documentElement):I(s)?pe(s):Ke()}function qt(s,{allowUrl:e=!0}={}){let t=null;try{t=document.querySelector(s)}catch{t=null}return t||(e&&Ii.test(s)?{url:s}:{missing:s})}function Ki(s,e={}){return It.has(s.tagName.toUpperCase())?{kind:"media",element:s,...e}:{kind:"css",element:s}}function Xt(s){return s&&typeof s=="object"&&!I(s)&&("width"in s||"displayWidth"in s)&&!("source"in s)}function j(s){if(s==null||s==="auto")return[{kind:"auto"}];if(Array.isArray(s))return s.flatMap(e=>j(e));if(typeof s=="function")return[{kind:"paint",paint:s}];if(typeof s=="string")return[{kind:"ref",ref:s}];if(I(s))return[{kind:"ref",ref:s}];if(Xt(s))return[{kind:"source",source:s,fit:"cover",position:G(),anchor:"viewport"}];if(typeof s=="object"){if(s.color&&!s.source)return[{kind:"color",color:s.color}];if(s.source!=null)return[{kind:"ref",ref:s.source,fit:s.fit,position:s.position==null?void 0:Ni(s.position),anchor:s.anchor,opacity:s.opacity}]}throw new TypeError("LiquidGlass: unsupported backdrop. Use an element, selector, image URL, canvas/video/image, painter function, or { source, fit, anchor }.")}function Qi(s){let e=document.documentElement,t=getComputedStyle(e);return[{kind:"css",element:t.backgroundImage!=="none"||!N(t.backgroundColor)||!document.body?e:document.body,canvas:!0},{kind:"page",host:s}]}function me(s,e){let t=[];for(let i of s){if(i.kind==="auto"){t.push(...Qi(e));continue}if(i.kind!=="ref"){t.push(i);continue}let r=i.ref;if(typeof r=="string"){let o=qt(r);if(o.missing){t.push({kind:"missing",ref:r});continue}r=o}let a={...i.fit?{fit:i.fit}:{},...i.position?{position:i.position}:{},...i.anchor!=null?{anchor:Zi(i.anchor)}:{},...i.opacity!=null?{opacity:i.opacity}:{}};r?.url?t.push({kind:"source",entry:zt(r.url),fit:"cover",position:G(),anchor:"viewport",...a}):I(r)&&r.isConnected?t.push(Ki(r,a)):(Xt(r)||I(r)&&It.has(r.tagName.toUpperCase()))&&t.push({kind:"source",source:r,fit:"cover",position:G(),anchor:"viewport",...a})}return t}function Zi(s){if(typeof s!="string"||s==="viewport"||s==="document")return s;let e=qt(s,{allowUrl:!1});return I(e)?e:"viewport"}function Ji(){let s=getComputedStyle(document.documentElement).colorScheme||"";return/dark/.test(s)&&!/light/.test(s)||/dark/.test(s)&&globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches?"#121212":"#ffffff"}function es(s,e,t){let i=!0;s.save(),s.fillStyle=Ji(),s.fillRect(t.x,t.y,t.width,t.height);for(let r of e){s.save();try{switch(r.opacity!=null&&(s.globalAlpha*=r.opacity),r.kind){case"css":i=Qe(s,r.element,t,{canvas:r.canvas})&&i;break;case"media":Ze(s,r,t);break;case"source":{let a=r.entry?r.entry.image:r.source;if(r.entry&&r.entry.state!=="ready"){i=i&&r.entry.state!=="loading";break}Vt(s,a,Ht(r.anchor),r.fit,r.position,t);break}case"color":s.fillStyle=r.color,s.fillRect(t.x,t.y,t.width,t.height);break;case"paint":r.paint(s,{...t});break;case"page":i=$t(s,t,r.host)&&i;break;default:break}}finally{s.restore()}}return s.restore(),i}function Le(s,e,t,i,r){let a=t.width>0?t.screenWidth/t.width:1,o=t.height>0?t.screenHeight/t.height:1;return s.setTransform(r/a,0,0,r/o,r*(i-t.x/a),r*(i-t.y/o)),es(s,e,{x:t.x-i*a,y:t.y-i*o,width:(t.width+i*2)*a,height:(t.height+i*2)*o})}function Me(s){return s.some(e=>{if(e.kind==="page")return jt(e.host);let t=e.kind==="media"?e.element:e.kind==="source"?e.source:null;if(!t)return!1;let i=t.tagName?.toUpperCase();if(i==="VIDEO")return!t.paused&&!t.ended;if(i==="CANVAS")return!0;let r=t.constructor?.name;return r==="OffscreenCanvas"||r==="VideoFrame"})}function ge(s){return s.flatMap(e=>e.kind==="media"||e.kind==="css"&&!e.canvas?[e.element]:[])}function Yt(s){return s.filter(e=>e.kind==="missing").map(e=>e.ref)}var ts="[data-liquid-glass], [data-liquid-glass-control]",is=new Set(["SCRIPT","STYLE","NOSCRIPT","TEMPLATE","HEAD","META","LINK","TITLE","BR","WBR","IFRAME","OBJECT","EMBED","INPUT","TEXTAREA","SELECT","OPTION","BUTTON"]),ss=new Set(["IMG","VIDEO","CANVAS"]),rs="http://www.w3.org/1999/xhtml",as=-.6,Kt=-.4,V=null,ve=!0,Qt=!1,Je=null,et=new Map;function ei(s,e){let t=Math.min(s.length,e.length);for(let i=0;i<t;i++){if(s[i][0]!==e[i][0])return s[i][0]-e[i][0];if(s[i][1]!==e[i][1])return s[i][1]-e[i][1]}return s.length-e.length}var Zt=s=>s.backgroundImage!=="none"||!N(s.backgroundColor),os=s=>["Top","Right","Bottom","Left"].some(e=>parseFloat(s[`border${e}Width`])>0&&s[`border${e}Style`]!=="none"&&!N(s[`border${e}Color`]));function ns(s,e){return e&&s.zIndex!=="auto"||s.position==="fixed"||s.position==="sticky"||Number(s.opacity)<1||s.transform!=="none"||s.filter!=="none"||s.isolation==="isolate"||s.mixBlendMode!=="normal"||s.backdropFilter&&s.backdropFilter!=="none"||/paint|strict|content/.test(s.contain||"")}function ls(s){let e=s.fontStyle.startsWith("oblique")?"italic":s.fontStyle,t=s.fontVariantCaps==="small-caps"?"small-caps ":"";return`${e} ${t}${s.fontWeight} ${s.fontSize} ${s.fontFamily}`}function hs(s,e){let t=et.get(s);if(t)return t;Je??=document.createElement("canvas").getContext("2d"),Je.font=s;let i=Je.measureText("Hg");return t={ascent:i.fontBoundingBoxAscent??e*.8,descent:i.fontBoundingBoxDescent??e*.2},et.set(s,t),t}function cs(s){if(!s||s==="none")return null;let e=F(F(s,",")[0]," "),t=e.find(r=>!/^-?[\d.]+(px)?$/.test(r)),i=e.filter(r=>/^-?[\d.]+(px)?$/.test(r)).map(parseFloat);return!t||i.length<2?null:{color:t,x:i[0],y:i[1],blur:i[2]??0}}function us(s,e){return e==="uppercase"?s.toUpperCase():e==="lowercase"?s.toLowerCase():e==="capitalize"?s.replace(/^\p{L}/u,t=>t.toUpperCase()):s}var tt=(s,e)=>s.x<e.x+e.width&&s.x+s.width>e.x&&s.y<e.y+e.height&&s.y+s.height>e.y;function ds(){let s=globalThis.scrollX||0,e=globalThis.scrollY||0,t=globalThis.innerWidth||document.documentElement.clientWidth,i=globalThis.innerHeight||document.documentElement.clientHeight,r={x:-t*.5,y:-i,width:t*2,height:i*3},a=[],o=new Map,l=document.createRange(),n=0,h=getComputedStyle(document.documentElement),u=Zt(h);function c(f,d,y,b,x){let T=f.data;if(!/\S/.test(T))return;let w=d.webkitTextFillColor||d.color,g=parseFloat(d.webkitTextStrokeWidth)||0;if(N(w)&&!(g>0))return;l.selectNodeContents(f);let v=l.getBoundingClientRect();if(!v.width||!tt({x:v.left,y:v.top,width:v.width,height:v.height},r))return;let R=x?0:s,p=x?0:e,k=[],D=(L,B)=>{B.width>0&&k.push({text:us(L,d.textTransform),x:B.left+R,y:B.top+p,width:B.width,height:B.height})},C=/\S+/g;for(let L=C.exec(T);L;L=C.exec(T)){l.setStart(f,L.index),l.setEnd(f,L.index+L[0].length);let B=l.getClientRects();if(B.length<=1){B.length&&D(L[0],B[0]);continue}let S="",E=null;for(let P=0;P<L[0].length;P++){l.setStart(f,L.index+P),l.setEnd(f,L.index+P+1);let W=l.getBoundingClientRect();E&&Math.abs(W.top-E.top)>1&&(D(S,E),S="",E=null),S+=L[0][P],E=E?{left:E.left,top:E.top,width:W.right-E.left,height:E.height}:{left:W.left,top:W.top,width:W.width,height:W.height}}E&&D(S,E)}k.length&&a.push({type:"text",key:y,fixed:x,alpha:b,words:k,box:{x:v.left+R,y:v.top+p,width:v.width,height:v.height},font:ls(d),size:parseFloat(d.fontSize)||16,fill:N(w)?null:w,stroke:g>0?{width:g,color:d.webkitTextStrokeColor}:null,letterSpacing:d.letterSpacing!=="normal"?d.letterSpacing:"",shadow:cs(d.textShadow)})}function m(f,d,y,b,x=!0){if(f.namespaceURI!==rs)return;let T=f.tagName.toUpperCase();if(is.has(T))return;let w=getComputedStyle(f);if(w.display==="none"||w.display==="contents"&&!f.childNodes.length)return;let g=w.position!=="static",v=ns(w,g),R=Number.parseInt(w.zIndex,10),p=g&&Number.isFinite(R)?R:g||v?0:w.display.startsWith("inline")?Kt:as,k=[...d,[p,n++]],D=b||w.position==="fixed";f.matches(ts)&&(o.set(f,k),f.getAttribute("data-liquid-glass")!=="fallback"&&(x=!1));let C=Number(w.opacity),L=y*(Number.isFinite(C)?C:1),B=w.visibility==="visible"&&L>.004,S=ss.has(T);if(x&&B&&(S||Zt(w)||os(w))){let P=f.getBoundingClientRect();P.width&&P.height&&a.push({type:S?"media":"box",element:f,key:k,fixed:D,alpha:y,box:{x:P.left+(D?0:s),y:P.top+(D?0:e),width:P.width,height:P.height}})}if(S)return;let E=v||g?k:d;for(let P of f.childNodes)P.nodeType===1?m(P,E,L,D):P.nodeType===3&&B&&c(P,w,[...E,[Kt,n++]],L,D)}return document.body&&m(document.body,[],1,!1,u),a.sort((f,d)=>ei(f.key,d.key)),{items:a,hosts:o,scrollX:s,scrollY:e,width:t,height:i}}function Jt(){let s=globalThis.innerWidth||0,e=globalThis.innerHeight||0,t=V&&(Math.abs((globalThis.scrollY||0)-V.scrollY)>e*.5||Math.abs((globalThis.scrollX||0)-V.scrollX)>s*.25||s!==V.width||e!==V.height);return(!V||ve||t)&&(V=ds(),ve=!1),V}function se(){ve||(ve=!0,Lt())}function fs(){if(Qt||typeof document>"u")return;Qt=!0,typeof MutationObserver=="function"&&new MutationObserver(e=>{for(let t of e){let i=t.target.nodeType===1?t.target:t.target.parentElement;if(!(!i||t.type==="attributes"&&i.closest(`[${ie}]`))){se();return}}}).observe(document.documentElement,{subtree:!0,childList:!0,characterData:!0,attributes:!0,attributeFilter:["style","class","hidden","src","open"]}),globalThis.addEventListener("scroll",e=>{e.target!==document&&e.target!==document.documentElement&&se()},{capture:!0,passive:!0}),globalThis.addEventListener("resize",se,{passive:!0});for(let e of["transitionend","transitioncancel","animationend","load"])document.addEventListener(e,se,!0);let s=()=>{et.clear(),se()};document.fonts?.addEventListener?.("loadingdone",s),document.fonts?.ready?.then(s)}function ps(s,e,t,i,r){let{ascent:a,descent:o}=hs(e.font,e.size);s.font=e.font,s.textBaseline="alphabetic",s.textAlign="left",e.letterSpacing&&"letterSpacing"in s&&(s.letterSpacing=e.letterSpacing),e.shadow&&(s.shadowColor=e.shadow.color,s.shadowOffsetX=e.shadow.x,s.shadowOffsetY=e.shadow.y,s.shadowBlur=e.shadow.blur),e.fill&&(s.fillStyle=e.fill),e.stroke&&(s.strokeStyle=e.stroke.color,s.lineWidth=e.stroke.width);let l=r.x+r.width,n=r.y+r.height;for(let h of e.words){let u=h.x+t,c=h.y+i;if(u>l||u+h.width<r.x||c>n||c+h.height<r.y)continue;let m=c+(h.height-(a+o))/2+a;e.fill&&s.fillText(h.text,u,m),e.stroke&&s.strokeText(h.text,u,m)}}function ti(s){let e=Jt(),t=e.hosts.get(s);if(t||(ve=!0,e=Jt(),t=e.hosts.get(s)),!t)return{state:e,end:0};let i=0,r=e.items.length;for(;i<r;){let a=i+r>>1;ei(e.items[a].key,t)<0?i=a+1:r=a}return{state:e,end:i}}function $t(s,e,t){fs();let{state:i,end:r}=ti(t),a=globalThis.scrollX||0,o=globalThis.scrollY||0,l=!0;for(let n=0;n<r;n++){let h=i.items[n],u=h.fixed?0:-a,c=h.fixed?0:-o;if(tt({...h.box,x:h.box.x+u,y:h.box.y+c},e)){s.save(),s.globalAlpha*=h.alpha;try{h.type==="text"?ps(s,h,u,c,e):h.type==="media"?Ze(s,{element:h.element},e):(l=Qe(s,h.element,e)&&l,ms(s,h.element))}finally{s.restore()}}}return l}function ms(s,e){let t=getComputedStyle(e),i=parseFloat(t.borderTopWidth)||0;if(!(i>0)||t.borderTopStyle==="none"||N(t.borderTopColor))return;let r=e.getBoundingClientRect(),a=Math.max(0,(parseFloat(t.borderTopLeftRadius)||0)-i/2);s.save(),s.globalAlpha*=Number(t.opacity)||1,s.strokeStyle=t.borderTopColor,s.lineWidth=i,s.beginPath();let o=r.left+i/2,l=r.top+i/2,n=Math.max(0,r.width-i),h=Math.max(0,r.height-i);a>0&&typeof s.roundRect=="function"?s.roundRect(o,l,n,h,Math.min(a,n/2,h/2)):s.rect(o,l,n,h),s.stroke(),s.restore()}function jt(s){if(!V)return!1;let{state:e,end:t}=ti(s),i=s.getBoundingClientRect(),r={x:i.left-96,y:i.top-96,width:i.width+192,height:i.height+192},a=globalThis.scrollX||0,o=globalThis.scrollY||0;for(let l=0;l<t;l++){let{type:n,element:h,box:u,fixed:c}=e.items[l];if(n==="media"&&tt({...u,x:u.x-(c?0:a),y:u.y-(c?0:o)},r)&&(h.tagName==="CANVAS"||h.tagName==="VIDEO"&&!h.paused&&!h.ended))return!0}return!1}function ii(){se()}var be=new WeakMap,gs=new Set(["IMG","INPUT","TEXTAREA","SELECT","VIDEO","CANVAS","IFRAME","BR","HR"]),it=["load","loadeddata","play","playing","pause","seeked","resize"],st=null;function Ce(){return st===null&&(st=z.isSupported()),st}function re(s){if(!s)return;let e=s.renderer?.gl;s.destroy(),e?.getExtension?.("WEBGL_lose_context")?.loseContext()}function rt(s,e){if(typeof MutationObserver!="function")return null;let t=new MutationObserver(e),i=new Set;for(let r of s)for(let a=r;a?.nodeType===1&&!i.has(a);a=a.parentElement)i.add(a),t.observe(a,{attributes:!0,attributeFilter:["style","class"]});return t}function at(s,e){let t=typeof s=="string"&&typeof document<"u"?document.querySelector(s):s;if(!I(t))throw new TypeError(`${e}: no element matches ${String(s)}.`);return t}function vs(s,e,t){let i=(s.borderTopLeftRadius||"0").split(/\s+/)[0],r=parseFloat(i)||0;return i.endsWith("%")?Math.min(e,t)*r/100:r}function si(s,e,t,i){if(i.shape&&i.shape!=="auto")return{shape:i.shape,...Number.isFinite(i.radius)?{radius:i.radius}:{}};let r=Number.isFinite(i.radius)?i.radius:vs(s,e,t),a=Math.min(e,t);return r>=a/2-.5?{shape:Math.abs(e-t)<1?"circle":"pill"}:{shape:"rect",radius:Math.max(0,r)}}var bs=["tint","tintTone","frost","opacity"];function ri(...s){let e={};for(let t of s)for(let i of bs)t?.[i]!=null&&(e[i]=t[i]);return e}var De=class{static isSupported(){return Ce()}static from(e){let t=typeof e=="string"?document.querySelector(e):e;return(t&&be.get(t))??null}static refreshAll(){ii(),Ft(e=>e.refresh?.())}constructor(e,t={}){let i=at(e,"LiquidGlass");if(gs.has(i.tagName.toUpperCase()))throw new TypeError(`LiquidGlass: <${i.tagName.toLowerCase()}> cannot hold the glass layer. Wrap it in an element and pass that.`);if(_(t.material??{}),be.get(i)?.destroy(),be.set(i,this),this.element=i,this.options={...t},this.destroyed=!1,this.visible=!0,this.mode="pending",this.glass=null,this.canvas=null,this.targets=[],this.layers=[],this.mediaListeners=[],this.restore=[],this.frame=null,this.sizeKey="",this.positionKey="",this.geometryKey="",this.styleDirty=!0,this.backdropDirty=!0,this.elementsDirty=!0,this.warnedMissing="",this.ready=new Promise(r=>{this.resolveReady=r}),!Ce()){this.enterFallback();return}this.buffer=document.createElement("canvas"),this.bufferContext=this.buffer.getContext("2d",{alpha:!1}),this.mountCanvas(),this.backdropSpec=j(t.backdrop),this.resolveTargets(),this.resolveBackdrop(),this.resizeObserver=typeof ResizeObserver=="function"?new ResizeObserver(()=>this.refresh({backdrop:!1})):null,this.observeSizes(),this.unsubscribeAssets=Ae(()=>{this.backdropDirty=!0,M(34)}),this.watchStyles(),Ee(this)}get supported(){return this.mode!=="fallback"}trackedElements(){return[this.element,...this.targets.map(e=>e.element)]}setStyle(e,t,i){this.restore.push([e,t,e.style[t]]),e.style[t]=i}mountCanvas(){let{element:e}=this,t=getComputedStyle(e),i=(a,o)=>this.setStyle(e,a,o);t.position==="static"&&i("position","relative"),t.isolation!=="isolate"&&i("isolation","isolate");let r=document.createElement("canvas");r.setAttribute(ie,""),r.setAttribute("aria-hidden","true"),Object.assign(r.style,{position:"absolute",left:"0px",top:"0px",width:"0px",height:"0px",margin:"0",padding:"0",border:"0",maxWidth:"none",maxHeight:"none",display:"block",pointerEvents:"none",zIndex:String(this.options.zIndex??-1),visibility:"hidden"}),e.appendChild(r),this.canvas=r,e.setAttribute("data-liquid-glass","pending")}resolveTargets(){let e=this.options.targets,t=[];typeof e=="string"?t=[...this.element.querySelectorAll(e)].map(i=>({element:i})):e&&typeof e[Symbol.iterator]=="function"&&(t=[...e].map(i=>I(i)?{element:i}:i).filter(i=>I(i?.element))),this.targets=t,this.mutationObserver?.disconnect(),this.mutationObserver=null,typeof e=="string"&&typeof MutationObserver=="function"&&(this.mutationObserver=new MutationObserver(()=>{this.resolveTargets(),this.observeSizes(),this.refresh({backdrop:!1})}),this.mutationObserver.observe(this.element,{childList:!0,subtree:!0}))}observeSizes(){if(this.resizeObserver){this.resizeObserver.disconnect();for(let e of this.trackedElements())this.resizeObserver.observe(e)}}watchStyles(){this.styleObserver?.disconnect(),this.styleObserver=rt([...this.trackedElements(),...ge(this.layers)],()=>{this.styleDirty=!0,this.backdropDirty=!0,M(120)})}onViewportResize(){this.refresh()}resolveBackdrop(){for(let[i,r]of this.mediaListeners)it.forEach(a=>i.removeEventListener(a,r));this.mediaListeners=[],this.layers=me(this.backdropSpec,this.element);let e=Yt(this.layers).join(", ");e&&e!==this.warnedMissing&&console.warn(`LiquidGlass: backdrop ${e} matched no element and is not an image URL. Call refresh() once it exists.`),this.warnedMissing=e;let t=()=>{this.backdropDirty=!0,M(34)};for(let i of ge(this.layers)){let r=i.tagName.toUpperCase();r!=="IMG"&&r!=="VIDEO"||(it.forEach(a=>i.addEventListener(a,t)),this.mediaListeners.push([i,t]))}}measure(){if(this.destroyed||this.mode==="fallback")return;let{element:e}=this,t=e.getBoundingClientRect(),i={x:t.left,y:t.top,screenWidth:t.width,screenHeight:t.height,width:e.offsetWidth??t.width,height:e.offsetHeight??t.height,borderLeft:e.clientLeft,borderTop:e.clientTop,scrollLeft:e.scrollLeft,scrollTop:e.scrollTop,targets:this.targets.map(({element:r})=>{let a=r.getBoundingClientRect();return{x:a.left,y:a.top,width:r.offsetWidth??a.width,height:r.offsetHeight??a.height,screenWidth:a.width,screenHeight:a.height}})};this.styleDirty&&(this.styles=[e,...this.targets.map(r=>r.element)].map(r=>getComputedStyle(r)).map(r=>({borderTopLeftRadius:r.borderTopLeftRadius})),this.styleDirty=!1,this.elementsDirty=!0),this.frame=i}bleed(){if(Number.isFinite(this.options.bleed))return Math.max(0,this.options.bleed);let e=this.glass?.material??_(this.options.material??{});return Math.ceil(Math.min(96,24+e.refraction*.17+e.backdropBlur*2))}createGlass(){try{this.glass=new z(this.canvas,{compositeMode:"overlay",autoResize:!1,autoStart:!1,preserveDrawingBuffer:!0,material:this.options.material,respectReducedTransparency:this.options.respectReducedTransparency??!0,onContextLost:e=>this.options.onContextLost?.(e),onContextRestored:e=>{this.sizeKey="",this.backdropDirty=!0,this.elementsDirty=!0,M(64),this.options.onContextRestored?.(e)}})}catch(e){return console.warn("LiquidGlass: WebGL2 surface could not be created; using the fallback.",e),this.enterFallback(),!1}return this.mode="webgl",this.element.setAttribute("data-liquid-glass","webgl"),!0}buildElements(e,t,i,r){let a=ri(this.options);return this.targets.length?this.targets.slice(0,e.targets.length).map((o,l)=>{let n=e.targets[l],h=n.width||n.screenWidth/i,u=n.height||n.screenHeight/r;return{id:`target-${l}`,x:(n.x-e.x)/i+t,y:(n.y-e.y)/r+t,width:h,height:u,...si(this.styles[l+1]??this.styles[0],h,u,{...this.options,...o}),...ri(this.options,o)}}).filter(o=>o.width>0&&o.height>0):[{id:"surface",x:t,y:t,width:e.width,height:e.height,...si(this.styles[0],e.width,e.height,this.options),...a}]}draw(){let e=this.frame;if(!e||this.destroyed||this.mode==="fallback")return!1;if(!(e.width>0&&e.height>0&&e.screenWidth>0&&e.screenHeight>0))return this.canvas.style.visibility!=="hidden"&&(this.canvas.style.visibility="hidden"),!1;if(!this.glass&&!this.createGlass())return!1;let t=Math.max(.5,Math.min(globalThis.devicePixelRatio||1,this.options.maxDpr??2)),i=this.bleed(),r=e.width+i*2,a=e.height+i*2,o=`${r}x${a}@${t}`;o!==this.sizeKey&&(this.sizeKey=o,this.canvas.style.width=`${r}px`,this.canvas.style.height=`${a}px`,this.buffer.width=Math.max(1,Math.round(r*t)),this.buffer.height=Math.max(1,Math.round(a*t)),this.glass.setBackdrop(this.buffer,{update:"static",autoStart:!1,shouldRender:!1}),this.backdropDirty=!0,this.elementsDirty=!0);let l=`${-i-e.borderLeft+e.scrollLeft},${-i-e.borderTop+e.scrollTop}`;if(l!==this.positionKey){this.positionKey=l;let[d,y]=l.split(",");this.canvas.style.left=`${d}px`,this.canvas.style.top=`${y}px`}let n=e.screenWidth/e.width,h=e.screenHeight/e.height,u=[e.x,e.y,e.screenWidth,e.screenHeight,...e.targets.flatMap(d=>[d.x,d.y,d.screenWidth,d.screenHeight])].map(d=>Math.round(d*64)).join(",");u!==this.geometryKey&&(this.geometryKey=u,this.backdropDirty=!0,this.elementsDirty=!0),te()!==this.epoch&&(this.epoch=te(),this.backdropDirty=!0);let c=this.options.live===!0||this.options.live!==!1&&Me(this.layers),m=!1,f=this.settled??!1;return(this.backdropDirty||c)&&(f=Le(this.bufferContext,this.layers,e,i,t),this.settled=f,this.glass.updateBackdrop(!1),this.backdropDirty=!1,m=!0),this.elementsDirty&&(this.glass.setElements(this.buildElements(e,i,n,h),!1),this.elementsDirty=!1,m=!0),(m||this.glass.dirty)&&(this.glass.render({force:!0,dpr:t}),this.canvas.style.visibility&&(this.canvas.style.visibility=""),this.options.onRender?.(this)),f&&this.resolveReady&&(this.resolveReady(this),this.resolveReady=null),c}enterFallback(){this.mode="fallback",re(this.glass),this.glass=null,this.canvas?.remove(),this.canvas=null;let{element:e}=this;e.setAttribute("data-liquid-glass","fallback");let t=this.options.fallback??"css";if(typeof t=="function")t(e);else if(t==="css"){let i=this.options.targets,r=typeof i=="string"?[...e.querySelectorAll(i)]:i?[...i].map(l=>I(l)?l:l?.element).filter(I):[e],a=Math.round(14+(this.options.frost??0)*30),o=Math.min(1,this.options.tint??0);for(let l of r){let n=getComputedStyle(l);(!n.backdropFilter||n.backdropFilter==="none")&&(this.setStyle(l,"backdropFilter",`blur(${a}px) saturate(1.6)`),this.setStyle(l,"webkitBackdropFilter",`blur(${a}px) saturate(1.6)`)),N(n.backgroundColor)&&this.setStyle(l,"backgroundColor",this.options.tintTone==="dark"?`rgba(20,21,26,${(.28+o*.5).toFixed(3)})`:`rgba(255,255,255,${(.14+o*.5).toFixed(3)})`)}}this.resolveReady?.(this),this.resolveReady=null}refresh({backdrop:e=!0}={}){return this.destroyed||this.mode==="fallback"?this:(e&&(typeof this.options.targets=="string"&&this.resolveTargets(),this.resolveBackdrop(),this.observeSizes(),this.watchStyles()),this.styleDirty=!0,this.backdropDirty=!0,this.elementsDirty=!0,M(64),this)}update(e={}){return this.destroyed?this:("material"in e&&_({...this.options.material??{},...e.material??{}}),this.options={...this.options,...e,..."material"in e?{material:{...this.options.material??{},...e.material??{}}}:{}},this.mode==="fallback"?this:("material"in e&&this.glass?.setMaterial(e.material??{},!1),"zIndex"in e&&this.canvas&&(this.canvas.style.zIndex=String(e.zIndex??-1)),"backdrop"in e&&(this.backdropSpec=j(e.backdrop)),"targets"in e&&this.resolveTargets(),this.sizeKey="",this.refresh()))}destroy(){if(!this.destroyed){this.destroyed=!0,Re(this),this.resizeObserver?.disconnect(),this.mutationObserver?.disconnect(),this.styleObserver?.disconnect(),this.unsubscribeAssets?.();for(let[e,t]of this.mediaListeners)it.forEach(i=>e.removeEventListener(i,t));re(this.glass),this.glass=null,this.canvas?.remove(),this.canvas=null;for(let[e,t,i]of this.restore.reverse())e.style[t]=i;this.element.removeAttribute("data-liquid-glass"),be.get(this.element)===this&&be.delete(this.element),this.resolveReady?.(this),this.resolveReady=null}}};var H=(s,e=0,t=1)=>Math.max(e,Math.min(t,s)),xe=new WeakMap,nt=Object.freeze({refraction:17,edgeReach:.14,edgeWidth:.22,dispersion:0,frost:0,backdropBlur:0,body:.72,absorption:.58,tint:0}),lt=Object.freeze({outerWidth:.13,outerHeight:1.24,innerLength:0,innerHeight:.24});function Be(s={}){return{...X(),...s,...nt}}var xs={navbar:[312,72],switch:[84,28]},ot=3,ys=140,ws=Object.freeze({switch:{tint:1.5,frost:.24,tintTone:"light"},navbar:{tint:.34,frost:.32,tintTone:"dark"}});function K(s,e,t){let i=document.createElement(s);return i.setAttribute(ie,""),i.setAttribute("aria-hidden","true"),Object.assign(i.style,{position:"absolute",left:"0px",top:"0px",margin:"0",padding:"0",border:"0",maxWidth:"none",maxHeight:"none",display:"block",pointerEvents:"none",zIndex:String(t)}),e?.appendChild(i),i}function ae(s,e,t,i,r,a=r/2){s.beginPath(),s.roundRect(e,t,i,r,Math.max(0,Math.min(a,i/2,r/2)))}function ai(s,e,t,i,r){s.velocity+=(e-s.value)*i*t,s.velocity*=Math.exp(-r*t),s.value+=s.velocity*t}function Ss(s){let e=s??[{value:"first",label:"First"},{value:"second",label:"Second"}];if(!Array.isArray(e)||e.length<2)throw new TypeError("LiquidGlassNavbar needs at least two items.");return e.map((t,i)=>typeof t=="string"?{value:t,label:t}:{value:t.value??String(i),label:t.label??String(t.value??i),icon:t.icon})}var Pe=class{constructor(e,t,i){let r=i==="navbar"?"LiquidGlassNavbar":"LiquidGlassSwitch",a=at(e,r);_(t?.material??{}),xe.get(a)?.destroy(),xe.set(a,this),this.container=a,this.element=a,this.options={...t??{}},this.kind=i,this.destroyed=!1,this.visible=!0,this.items=i==="navbar"?Ss(this.options.items):null;let o=i==="switch"?this.options.checked?1:0:this.indexOf(this.options.value);if(this.position={value:o,velocity:0},this.positionTarget=o,this.amount={value:0,velocity:0},this.value=i==="switch"?!!o:this.items[o].value,this.material={...X(),...this.options.material??{}},this.lens={...lt,...this.options.lens??{}},this.dragging=!1,this.animating=!1,this.releasing=!1,this.releaseMix=1,this.releaseStartedAt=0,this.activePointerId=null,this.lastTime=0,this.frame=null,this.size=null,this.sizeKey="",this.geometryKey="",this.staticDirty=!0,this.dirty=!0,this.pressedShown=!1,this.settled=!1,this.settledWaiters=[],this.restore=[],this.ready=new Promise(l=>{this.settledWaiters.push(()=>l(this))}),this.setupContainer(),this.supported=Ce(),this.backdropCanvas=K("canvas",null,0),this.compositeCanvas=K("canvas",null,0),this.baseCanvas=i==="navbar"?K("canvas",a,0):null,this.trackCanvas=K("canvas",a,1),this.pressCanvas=K("canvas",a,2),this.restCanvas=K("canvas",a,3),this.labelLayer=K("div",a,4),Object.assign(this.labelLayer.style,{inset:"0",width:"100%",height:"100%"}),this.labelLayer.removeAttribute("aria-hidden"),this.supported)try{this.baseGlass=this.baseCanvas?new z(this.baseCanvas,{material:this.material,compositeMode:"overlay",autoResize:!1,preserveDrawingBuffer:!0}):null,this.pressGlass=new z(this.pressCanvas,{material:Be(this.material),compositeMode:"overlay",autoResize:!1,preserveDrawingBuffer:!0})}catch(l){console.warn(`${r}: WebGL2 unavailable, drawing the flat fallback.`,l),re(this.baseGlass),this.baseGlass=null,this.pressGlass=null,this.supported=!1}a.setAttribute("data-liquid-glass",this.supported?"webgl":"fallback"),this.onPointerDown=l=>this.pointerDown(l),this.onPointerMove=l=>this.pointerMove(l),this.onPointerEnd=l=>this.pointerEnd(l),this.onKeyDown=l=>this.keyDown(l),a.addEventListener("pointerdown",this.onPointerDown),a.addEventListener("pointermove",this.onPointerMove),a.addEventListener("pointerup",this.onPointerEnd),a.addEventListener("pointercancel",this.onPointerEnd),a.addEventListener("lostpointercapture",this.onPointerEnd),a.addEventListener("keydown",this.onKeyDown),this.onFocusChange=l=>{l.type==="blur"&&(this.pointerFocus=!1),this.dirty=!0,M(34)},a.addEventListener("focus",this.onFocusChange),a.addEventListener("blur",this.onFocusChange),this.layers=me(j(this.options.backdrop),a),this.unsubscribeAssets=Ae(()=>{this.staticDirty=!0,M(34)}),this.resizeObserver=typeof ResizeObserver=="function"?new ResizeObserver(()=>M(64)):null,this.resizeObserver?.observe(a),this.watchStyles(),this.buildLabels(),this.updateAccessibility(),Ee(this)}static from(e){let t=typeof e=="string"?document.querySelector(e):e;return(t&&xe.get(t))??null}setupContainer(){let{container:e,kind:t}=this,i=getComputedStyle(e),r=(n,h)=>{this.restore.push([n,e.style[n]]),e.style[n]=h};i.position==="static"&&r("position","relative"),i.isolation!=="isolate"&&r("isolation","isolate"),i.display==="inline"&&r("display","inline-block");let[a,o]=xs[t],l=e.clientHeight===0&&!e.style.height;(this.options.width!=null||l&&!e.style.width)&&r("width",`${this.options.width??a}px`),(this.options.height!=null||l)&&r("height",`${this.options.height??o}px`),r("touchAction","none"),r("userSelect","none"),r("webkitUserSelect","none"),r("cursor",this.options.disabled?"default":"pointer"),r("outline","none"),this.originalAttributes=["tabindex","role","aria-checked","aria-label","aria-disabled","data-liquid-glass"].map(n=>[n,e.getAttribute(n)]),e.tabIndex=this.options.disabled?-1:e.tabIndex>=0?e.tabIndex:0,e.dataset.liquidGlassControl=t}trackedElements(){return[this.container]}watchStyles(){this.styleObserver?.disconnect(),this.styleObserver=rt([this.container,...ge(this.layers)],()=>{this.staticDirty=!0,M(120)})}onViewportResize(){this.refresh()}count(){return this.kind==="navbar"?this.items.length:2}indexOf(e){let t=this.items.findIndex(i=>i.value===e);return t<0?0:t}measure(){let e=this.container.getBoundingClientRect();this.frame={x:e.left,y:e.top,screenWidth:e.width,screenHeight:e.height,width:this.container.offsetWidth,height:this.container.offsetHeight}}draw(e){let{frame:t}=this;if(!t||this.destroyed||!(t.width>0&&t.height>0))return!1;let i=Math.min(globalThis.devicePixelRatio||1,2),r=`${t.width}x${t.height}@${i}`;r!==this.sizeKey&&(this.sizeKey=r,this.layout(t.width,t.height,i));let a=[t.x,t.y,t.screenWidth,t.screenHeight].map(n=>Math.round(n*64)).join(",");(a!==this.geometryKey||te()!==this.epoch)&&(this.geometryKey=a,this.epoch=te(),this.staticDirty=!0);let o=this.options.live===!0||this.options.live!==!1&&this.supported&&Me(this.layers);o&&(this.staticDirty=!0);let l=this.animating&&this.step(e);return(this.staticDirty||this.dirty)&&this.render(),l||o}layout(e,t,i){let r=Math.ceil(36+t*.5);this.size={width:e,height:t,dpr:i,bleed:r};let a=e+r*2,o=t+r*2,l=Math.max(1,Math.round(a*i)),n=Math.max(1,Math.round(o*i));for(let c of[this.baseCanvas,this.trackCanvas,this.pressCanvas,this.restCanvas])c&&Object.assign(c.style,{left:`${-r}px`,top:`${-r}px`,width:`${a}px`,height:`${o}px`});for(let c of[this.backdropCanvas,this.compositeCanvas,this.trackCanvas,this.restCanvas])c.width=l,c.height=n;let h=e,u=t;this.kind==="switch"&&(e/t<ot?u=e/ot:h=t*ot),this.track={x:r+(e-h)/2,y:r+(t-u)/2,w:h,h:u},this.baseGlass?.setBackdrop(this.backdropCanvas,{update:"static",autoStart:!1,shouldRender:!1}),this.pressGlass?.setBackdrop(this.compositeCanvas,{update:"static",autoStart:!1,shouldRender:!1}),this.staticDirty=!0,this.dirty=!0,this.buildLabels()}step(e){let t=H((e-this.lastTime)/1e3,.001,.034);this.lastTime=e;let i=globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,r=this.dragging?1:0,a=this.count()-1;i?(this.amount.value=r,this.amount.velocity=0,this.position.value=this.positionTarget,this.position.velocity=0):(ai(this.amount,r,t,this.dragging?520:540,this.dragging?28:31),ai(this.position,this.positionTarget,t,this.dragging?420:360,this.dragging?31:27)),this.amount.value=H(this.amount.value,0,1.12),this.position.value=H(this.position.value,0,a),this.releasing&&(this.releaseMix=i?1:H((e-this.releaseStartedAt)/ys));let o=Math.abs(this.amount.value-r)<.004&&Math.abs(this.amount.velocity)<.018&&Math.abs(this.position.value-this.positionTarget)<.003&&Math.abs(this.position.velocity)<.018&&(!this.releasing||this.releaseMix>=1);return o&&(this.amount.value=r,this.position.value=this.positionTarget,this.animating=this.dragging,this.dragging||(this.releasing=!1)),this.dirty=!0,!o||this.dragging}startAnimation(){this.destroyed||(this.animating||(this.animating=!0,this.lastTime=globalThis.performance?.now?.()??Date.now()),this.dirty=!0,M(34))}thumbGeometry(e=this.amount.value){let{track:t}=this,i=t.h*.08,r=this.count(),a=H(this.position.value/(r-1)),o=this.kind==="navbar"?(t.w-i*2)/r:t.w*.65,l=t.h*.84,n=Math.max(0,t.w-o-i*2),h=t.x+i+n*a,u=t.y+i,c,m;this.kind==="navbar"?(c=1+e*this.lens.outerWidth,m=1+e*Math.max(0,t.h*this.lens.outerHeight/l-1)):(c=1+e*.33,m=1+e);let f=o*c,d=l*m,y=h-(f-o)/2,b=this.kind==="navbar"?Math.max(0,(d-t.h)/2):t.h*.42,x=t.x-b+(t.w+b*2-f)*a;return{x:y+(x-y)*H(e),y:u-(d-l)/2,w:f,h:d}}context(e){let t=e.getContext("2d");return t.setTransform(this.size.dpr,0,0,this.size.dpr,0,0),t}drawBackdrop(){let e=this.backdropCanvas.getContext("2d");return Le(e,this.layers,this.frame,this.size.bleed,this.size.dpr)}drawTrack(){let e=this.context(this.trackCanvas);if(e.clearRect(0,0,this.trackCanvas.width,this.trackCanvas.height),this.kind==="navbar"&&this.baseGlass)return;let{x:t,y:i,w:r,h:a}=this.track;if(e.save(),ae(e,t,i,r,a),this.kind==="switch"){let o=e.createLinearGradient(t,i,t+r,i+a);o.addColorStop(0,"#c2c3c7"),o.addColorStop(1,"#a9abb0"),e.fillStyle=o,e.fill(),ae(e,t,i,r,a);let l=H(this.position.value);if(e.globalAlpha=l*l*(3-2*l),this.options.color)e.fillStyle=this.options.color;else{let n=e.createLinearGradient(t,i,t+r,i+a);n.addColorStop(0,"#34d86a"),n.addColorStop(1,"#25c653"),e.fillStyle=n}e.fill()}else{let o=this.darkTrack();e.fillStyle=o?"rgba(30,32,38,.72)":"rgba(225,230,238,.72)",e.fill(),e.strokeStyle=o?"rgba(255,255,255,.18)":"rgba(255,255,255,.5)",e.stroke()}e.restore()}renderBase(){this.baseGlass&&(this.baseGlass.updateBackdrop(!1),this.baseGlass.setElements([{id:"navbar-track",shape:"pill",...this.track,tint:this.options.tint??.86,tintTone:this.options.tintTone??"light"}],!1),this.baseGlass.render({force:!0,dpr:this.size.dpr}))}composePressedBackdrop(){let e=this.compositeCanvas.getContext("2d");e.setTransform(1,0,0,1,0,0),e.drawImage(this.backdropCanvas,0,0),this.baseCanvas&&e.drawImage(this.baseCanvas,0,0,this.compositeCanvas.width,this.compositeCanvas.height),e.drawImage(this.trackCanvas,0,0)}renderPressed(e){if(!this.pressGlass)return;if(!e){this.pressGlass.setElements([],!1),this.pressGlass.render({force:!0,dpr:this.size.dpr}),this.pressedShown=!1;return}let t=H(this.amount.value),i=this.releasing?1-this.releaseMix:t,r=ws[this.kind];this.pressGlass.updateBackdrop(!1),this.pressGlass.setElements([{id:`${this.kind}-pressed-thumb`,shape:"pill",...this.thumbGeometry(),tint:r.tint*(1-i),frost:r.frost*(1-i),opacity:this.releasing?1-this.releaseMix:1,pressure:this.kind==="navbar"?t:0,pressureAxes:this.kind==="navbar"?[1-this.lens.innerLength,1-this.lens.innerHeight]:[1,1],tintTone:r.tintTone}],!1),this.pressGlass.render({force:!0,dpr:this.size.dpr}),this.pressedShown=!0}drawRestingThumb(e){let t=this.context(this.restCanvas);t.clearRect(0,0,this.restCanvas.width,this.restCanvas.height);let i=this.dragging,r=this.supported&&(i||this.releasing),a=r?i?0:this.releaseMix:1;if(a<=.001)return;let o=this.thumbGeometry(r||!this.supported?this.amount.value:0),l=o.h/2;if(t.save(),t.globalAlpha=a,this.kind==="switch"){t.shadowColor="rgba(0,0,0,.18)",t.shadowBlur=o.h*.16,t.shadowOffsetY=o.h*.045,ae(t,o.x,o.y,o.w,o.h,l);let n=t.createLinearGradient(o.x,o.y,o.x,o.y+o.h);n.addColorStop(0,"rgba(255,255,255,.97)"),n.addColorStop(1,"rgba(238,239,242,.94)"),t.fillStyle=n,t.fill(),t.shadowColor="transparent",ae(t,o.x+.75,o.y+.75,o.w-1.5,o.h-1.5,l-.75),t.strokeStyle="rgba(83,85,91,.34)",t.lineWidth=1.5,t.stroke()}else{let n=this.darkTrack();if(t.shadowColor="rgba(0,0,0,.055)",t.shadowBlur=o.h*.09,t.shadowOffsetY=o.h*.045,ae(t,o.x,o.y,o.w,o.h,l),t.clip(),e&&"filter"in t){let{dpr:h}=this.size,u=Math.max(5,o.h*.105),c=u*2.5,m=Math.max(0,o.x-c),f=Math.max(0,o.y-c),d=o.w+c*2,y=o.h+c*2;t.filter=`blur(${u}px)`,t.drawImage(this.compositeCanvas,m*h,f*h,d*h,y*h,m,f,d,y),t.filter="none",t.globalCompositeOperation="color",t.fillStyle=n?"rgba(46,48,54,.72)":"rgba(148,150,155,.72)",t.fillRect(o.x,o.y,o.w,o.h),t.globalCompositeOperation="source-over",t.fillStyle=n?"rgba(12,13,17,.42)":"rgba(142,145,152,.24)"}else{let h=t.createLinearGradient(o.x,o.y,o.x,o.y+o.h);h.addColorStop(0,n?"rgba(62,64,72,.9)":"rgba(174,178,186,.88)"),h.addColorStop(1,n?"rgba(42,44,50,.86)":"rgba(145,149,158,.82)"),t.fillStyle=h}t.fillRect(o.x,o.y,o.w,o.h)}t.restore()}darkTrack(){let e=this.options.tintTone??"light";if(e!=="auto")return e==="dark";let t=this.baseGlass?.elements[0];if(!t||!this.size)return!1;let{width:i,height:r,bleed:a}=this.size;return this.baseGlass.tintLightForElement(t,i+a*2,r+a*2)<.5}labelColor(){return this.options.labelColor??(this.darkTrack()?"rgba(245,246,250,.95)":"rgba(22,25,31,.9)")}drawFocusRing(){let e;try{e=this.container.matches(":focus-visible")}catch{e=document.activeElement===this.container}if(!e||this.pointerFocus)return;let t=this.context(this.restCanvas),{x:i,y:r,w:a,h:o}=this.track;t.save(),ae(t,i-3,r-3,a+6,o+6),t.lineWidth=2,t.strokeStyle="rgba(10,132,255,.95)",t.stroke(),t.restore()}render(){if(this.destroyed||!this.size||!this.frame)return this;if(this.staticDirty){if(this.settled=this.supported?this.drawBackdrop():!0,this.renderBase(),this.kind==="navbar"&&this.options.tintTone==="auto"){let i=this.labelColor();if(i!==this.appliedLabelColor){this.appliedLabelColor=i;for(let r of this.labelLayer.children)r.style.color=i}}this.staticDirty=!1}this.drawTrack();let e=this.dragging||this.releasing&&this.releaseMix<1,t=this.supported&&(e||this.kind==="navbar");return t&&this.composePressedBackdrop(),(e||this.pressedShown)&&this.renderPressed(e),this.drawRestingThumb(t),this.drawFocusRing(),this.updateAccessibility(),this.dirty=!1,this.settled&&this.settledWaiters.length&&this.settledWaiters.splice(0).forEach(i=>i()),this}buildLabels(){if(this.labelLayer.replaceChildren(),this.kind!=="navbar")return;let e=this.size?.width??this.container.offsetWidth,t=this.size?.height??this.container.offsetHeight,i=t*.08,r=(e-i*2)/this.items.length;this.items.forEach((a,o)=>{let l=document.createElement("span");l.dataset.index=String(o),l.setAttribute("role","tab"),l.textContent=`${a.icon?`${a.icon}  `:""}${a.label}`,Object.assign(l.style,{position:"absolute",left:`${i+r*o}px`,top:"0px",width:`${r}px`,height:`${t}px`,display:"grid",placeItems:"center",color:this.labelColor(),font:"inherit",fontSize:`${this.options.fontSize??Math.max(13,Math.min(17,t*.22))}px`,fontWeight:"600",lineHeight:"1",whiteSpace:"nowrap",pointerEvents:"none"}),this.labelLayer.appendChild(l)})}updateAccessibility(){let{container:e}=this;if(this.kind==="switch")e.setAttribute("role","switch"),e.setAttribute("aria-checked",String(!!this.value)),e.setAttribute("aria-label",this.options.ariaLabel??e.getAttribute("aria-label")??"Liquid glass switch");else{e.setAttribute("role","tablist"),e.setAttribute("aria-label",this.options.ariaLabel??e.getAttribute("aria-label")??"Liquid glass navigation");let t=Math.round(this.positionTarget);for(let i of this.labelLayer.children)i.setAttribute("aria-selected",String(Number(i.dataset.index)===t))}}localPoint(e){let t=this.container.getBoundingClientRect(),i=this.size?.width||t.width||1,r=this.size?.height||t.height||1;return{x:(e.clientX-t.left)*i/(t.width||1),y:(e.clientY-t.top)*r/(t.height||1)}}progressForPointer(e){let{x:t}=this.localPoint(e),{track:i,size:r}=this,a=this.thumbGeometry(0),o=i.h*.08,l=Math.max(1,i.w-a.w-o*2);return H((t+r.bleed-i.x-o-a.w/2)/l)*(this.count()-1)}pointerDown(e){if(this.options.disabled||e.button!==0||!this.size)return;e.preventDefault(),this.dragging=!0;let t=Math.round(this.positionTarget);this.press={x:e.clientX,y:e.clientY,moved:!1,start:t},this.activePointerId=e.pointerId,this.releasing=!1,this.releaseMix=0;let i=this.progressForPointer(e);this.positionTarget=this.kind==="switch"?Math.round(i):i;try{this.container.setPointerCapture?.(e.pointerId)}catch{}this.pointerFocus=!0,this.container.focus({preventScroll:!0}),this.startAnimation()}pointerMove(e){if(!(!this.dragging||e.pointerId!==this.activePointerId)){if(e.preventDefault(),!this.press.moved){if(Math.hypot(e.clientX-this.press.x,e.clientY-this.press.y)<4)return;this.press.moved=!0}this.positionTarget=this.progressForPointer(e),this.startAnimation()}}pointerEnd(e){if(!this.dragging||e.pointerId!==this.activePointerId)return;e.preventDefault(),this.dragging=!1;let{start:t}=this.press??{start:Math.round(this.positionTarget)};e.type==="pointercancel"?this.positionTarget=t:this.positionTarget=Math.round(this.positionTarget),this.activePointerId=null,this.press=null,this.releasing=!0,this.releaseMix=0,this.releaseStartedAt=globalThis.performance?.now?.()??Date.now(),this.commitValue(this.positionTarget),this.startAnimation()}keyDown(e){if(this.pointerFocus&&(this.pointerFocus=!1,this.dirty=!0,M(34)),this.options.disabled)return;let t=this.count()-1,i=Math.round(this.positionTarget),r=null;(e.key==="ArrowLeft"||e.key==="ArrowUp")&&(r=Math.max(0,i-1)),(e.key==="ArrowRight"||e.key==="ArrowDown")&&(r=Math.min(t,i+1)),e.key==="Home"&&(r=0),e.key==="End"&&(r=t),this.kind==="switch"&&(e.key===" "||e.key==="Enter")&&(r=i?0:1),r!==null&&(e.preventDefault(),this.positionTarget=r,this.commitValue(r),this.startAnimation())}commitValue(e,t=!0){let i=this.value;if(this.value=this.kind==="switch"?!!e:this.items[e].value,t&&i!==this.value){let r=this.kind==="switch"?void 0:e;this.options.onChange?.(this.value,r),this.container.dispatchEvent(new CustomEvent("change",{detail:{value:this.value,index:r},bubbles:!0}))}this.updateAccessibility()}jumpTo(e,t){return this.positionTarget=e,this.position.value=e,this.position.velocity=0,this.commitValue(e,t),this.dirty=!0,M(34),this}setBackdrop(e){return this.options.backdrop=e,this.refresh().nextSettled()}nextSettled(){return new Promise(e=>{this.settled=!1,this.settledWaiters.push(()=>e(this))})}setMaterial(e){return _({...this.options.material??{},...e??{}}),this.material={...this.material,...e??{}},this.baseGlass?.setMaterial(this.material,!1),this.pressGlass?.setMaterial(Be(this.material),!1),this.staticDirty=!0,M(34),this}setLens(e){return this.kind!=="navbar"?this:(this.lens={...this.lens,...e??{}},this.dirty=!0,M(34),this)}setTintTone(e){return this.kind!=="navbar"?this:(this.options.tintTone=e,this.appliedLabelColor=null,this.staticDirty=!0,this.dirty=!0,this.buildLabels(),M(34),this)}setDisabled(e){return this.options.disabled=!!e,this.container.tabIndex=e?-1:0,this.container.style.cursor=e?"default":"pointer",this.container.setAttribute("aria-disabled",String(!!e)),this}refresh(){return this.destroyed?this:(this.layers=me(j(this.options.backdrop),this.container),this.watchStyles(),this.staticDirty=!0,this.dirty=!0,M(64),this)}updateBackdrop(){return this.refresh()}destroy(){if(this.destroyed)return;this.destroyed=!0,Re(this),this.resizeObserver?.disconnect(),this.styleObserver?.disconnect(),this.unsubscribeAssets?.(),re(this.baseGlass),re(this.pressGlass),this.baseGlass=null,this.pressGlass=null;let{container:e}=this;e.removeEventListener("pointerdown",this.onPointerDown),e.removeEventListener("pointermove",this.onPointerMove),e.removeEventListener("pointerup",this.onPointerEnd),e.removeEventListener("pointercancel",this.onPointerEnd),e.removeEventListener("lostpointercapture",this.onPointerEnd),e.removeEventListener("keydown",this.onKeyDown),e.removeEventListener("focus",this.onFocusChange),e.removeEventListener("blur",this.onFocusChange);for(let t of[this.baseCanvas,this.trackCanvas,this.pressCanvas,this.restCanvas,this.labelLayer])t?.remove();delete e.dataset.liquidGlassControl;for(let[t,i]of this.restore.reverse())e.style[t]=i;for(let[t,i]of this.originalAttributes)i===null?e.removeAttribute(t):e.setAttribute(t,i);xe.get(e)===this&&xe.delete(e),this.settledWaiters.splice(0).forEach(t=>t())}},_e=class extends Pe{constructor(e,t={}){super(e,t,"navbar")}setValue(e,{notify:t=!1}={}){return this.jumpTo(this.indexOf(e),t)}},Fe=class extends Pe{constructor(e,t={}){super(e,t,"switch")}get checked(){return!!this.value}setChecked(e,{notify:t=!1}={}){return this.jumpTo(e?1:0,t)}};var Ue=Object.freeze({FOLDER:"folder",RECT:"rect",PILL:"pill",CIRCLE:"circle"}),ye=Object.freeze({REPLACE:"replace",OVERLAY:"overlay"}),q=Object.freeze({AUTO:"auto",STATIC:"static",LIVE:"live"}),Ts="(prefers-reduced-transparency: reduce)";function Es(s){if(!Object.values(ye).includes(s))throw new TypeError(`Unknown liquid glass composite mode: ${s}`);return s}function Rs(s){let e=s?.tagName?.toUpperCase();return e==="CANVAS"||e==="VIDEO"||s?.constructor?.name==="OffscreenCanvas"||s?.constructor?.name==="VideoFrame"}function ks(s,e=q.AUTO){if(!Object.values(q).includes(e))throw new TypeError(`Unknown liquid glass backdrop update mode: ${e}`);return e===q.AUTO?Rs(s)?q.LIVE:q.STATIC:e}function As(s){let e=s==="folderRect"?Ue.RECT:s;if(!Object.values(Ue).includes(e))throw new TypeError(`Unknown liquid glass shape: ${s}`);return e}function oi(s){return typeof s!="string"?Promise.resolve(s):new Promise((e,t)=>{let i=new Image;i.onload=()=>e(i),i.onerror=()=>t(new Error(`Unable to load liquid glass wallpaper: ${s}`)),i.src=s})}function ht(s,e){let t=Number(s.w??s.width??s.size??0),i=Number(s.h??s.height??s.size??t);if(!(t>0)||!(i>0))throw new TypeError("Liquid glass elements need a positive width and height.");return{...s,id:s.id??`glass-${e+1}`,shape:As(s.shape??Ue.FOLDER),x:Number(s.x??0),y:Number(s.y??0),w:t,h:i}}function Ls(s){return typeof globalThis.matchMedia=="function"?globalThis.matchMedia(s):null}var ct=class{static isSupported(){if(typeof document>"u")return!1;try{let t=document.createElement("canvas").getContext("webgl2");return t?(t.getExtension("WEBGL_lose_context")?.loseContext(),!0):!1}catch{return!1}}constructor(e,t={}){if(!e||typeof e.getContext!="function")throw new TypeError("LiquidGlassWebGL needs an HTMLCanvasElement.");this.canvas=e,this.compositeMode=Es(t.compositeMode??ye.REPLACE),this.renderer=new Q(e,{alpha:this.compositeMode===ye.OVERLAY,preserveDrawingBuffer:!!t.preserveDrawingBuffer}),this.material=typeof t.material=="string"?he(t.material):{...he("regular"),...t.material||{}},this.elements=[],this.fusion=!!(t.fusion??!1),this.wallpaperIndex=0,this.wallpaperZoom=t.wallpaperZoom??1,this.running=!1,this.animationFrame=0,this.onContextLost=t.onContextLost??null,this.onContextRestored=t.onContextRestored??null,this.dirty=!0,this.backdropDirty=!0,this.lastFrame={width:0,height:0,dpr:0},this.warnedShapeLimit=!1,this.respectReducedTransparency=t.respectReducedTransparency??!0,this.reducedTransparencyQuery=this.respectReducedTransparency?Ls(Ts):null,this.handleReducedTransparencyChange=()=>{this.markDirty(),this.render()},this.reducedTransparencyQuery?.addEventListener?.("change",this.handleReducedTransparencyChange),this.handleContextLost=i=>{i.preventDefault(),this.renderer.handleContextLost(),this.markBackdropDirty(),this.onContextLost?.(i)},this.handleContextRestored=i=>{this.renderer.restore(),this.markBackdropDirty(),this.lastFrame={width:0,height:0,dpr:0},this.onContextRestored?.(i),this.render()},e.addEventListener("webglcontextlost",this.handleContextLost,!1),e.addEventListener("webglcontextrestored",this.handleContextRestored,!1),this.resizeObserver=null,(t.autoResize??!0)&&typeof globalThis.ResizeObserver=="function"&&(this.resizeObserver=new globalThis.ResizeObserver(()=>{this.markDirty(),this.render()}),this.resizeObserver.observe(e)),t.elements&&this.setElements(t.elements,!1),t.wallpapers&&this.setWallpapers(t.wallpapers,!1),t.backdrop&&this.setBackdrop(t.backdrop,{update:t.backdropUpdate,autoStart:t.autoStart,shouldRender:!1})}get contextLost(){return this.renderer.lost}get reducedTransparency(){return!!this.reducedTransparencyQuery?.matches}get effectiveMaterial(){return this.reducedTransparency?{...this.material,...qe}:this.material}markDirty(){return this.dirty=!0,this}markBackdropDirty(){return this.backdropDirty=!0,this.markDirty()}setElements(e,t=!0){return this.elements=e.map((i,r)=>ht(i,r)),this.markDirty(),t&&this.render(),this}addElement(e,t=!0){let i=ht(e,this.elements.length);return this.elements.push(i),this.markDirty(),t&&this.render(),i.id}updateElement(e,t,i=!0){let r=this.elements.findIndex(a=>a.id===e);return r===-1?this:(this.elements[r]=ht({...this.elements[r],...t},r),this.markDirty(),i&&this.render(),this)}removeElement(e,t=!0){return this.elements=this.elements.filter(i=>i.id!==e),this.markDirty(),t&&this.render(),this}setMaterial(e,t=!0){return this.material=typeof e=="string"?he(e):{...this.material,...e||{}},this.markDirty(),t&&this.render(),this}setFusion(e,t=this.material.mergeRadius,i=!0){return this.fusion=!!e,Number.isFinite(t)&&(this.material.mergeRadius=Math.max(0,t)),this.markDirty(),i&&this.render(),this}setWallpapers(e,t=!0){return this.renderer.setWallpapers(e,{update:q.STATIC}),this.markBackdropDirty(),t&&this.render(),this}setBackdrop(e,t={}){if(!e||typeof e=="string")throw new TypeError("setBackdrop needs a CanvasImageSource. Use loadBackdrop for a URL.");let i=ks(e,t.update);return this.renderer.setWallpapers([e],{update:i,scale:t.scale}),this.wallpaperIndex=0,this.markBackdropDirty(),(t.autoStart??i===q.LIVE)&&this.start(),(t.shouldRender??!0)&&this.render(),this}async loadBackdrop(e,t={}){let i=await oi(e);return this.setBackdrop(i,{...t,update:t.update??q.STATIC})}updateBackdrop(e=!0){return this.renderer.refreshWallpapers(!0),this.markBackdropDirty(),e&&this.render(),this}async loadWallpapers(e,t=!0){let i=await Promise.all(e.map(oi));return this.setWallpapers(i,t)}async setWallpaper(e,t=!0){return this.loadWallpapers([e],t)}setWallpaperIndex(e,t=!0){return this.wallpaperIndex=Math.max(0,Math.floor(e)),this.markBackdropDirty(),t&&this.render(),this}distanceAt(e,t,i={}){let r=i.fusion??this.fusion?i.mergeRadius??this.material.mergeRadius:0;return bt(e,t,this.elements,this.material,r)}hitTest(e,t,i={}){return Oe(e,t,this.elements,this.material,{fusion:i.fusion??this.fusion,mergeRadius:i.mergeRadius,tolerance:i.tolerance??0})}pointerPosition(e){let t=this.canvas.getBoundingClientRect(),i=e.touches?.[0]??e.changedTouches?.[0]??e;return{x:i.clientX-t.left,y:i.clientY-t.top}}hitTestEvent(e,t={}){let{x:i,y:r}=this.pointerPosition(e),a=t.tolerance??(e.pointerType&&e.pointerType!=="mouse"?8:0);return this.hitTest(i,r,{...t,tolerance:a})}start(){if(this.running)return this;if(typeof globalThis.requestAnimationFrame!="function")throw new Error("LiquidGlassWebGL.start() requires requestAnimationFrame.");this.running=!0;let e=()=>{this.running&&(this.render(),this.animationFrame=globalThis.requestAnimationFrame(e))};return this.animationFrame=globalThis.requestAnimationFrame(e),this}stop(){return this.running=!1,this.animationFrame&&typeof globalThis.cancelAnimationFrame=="function"&&globalThis.cancelAnimationFrame(this.animationFrame),this.animationFrame=0,this}resize(e=this.canvas.clientWidth||this.canvas.width||1,t=this.canvas.clientHeight||this.canvas.height||1,i=Math.min(globalThis.devicePixelRatio||1,2)){return this.renderer.resize(Math.round(e*i),Math.round(t*i)),{width:e,height:t,dpr:i}}render(e={}){if(this.renderer.lost)return this;let t=this.canvas.clientWidth||this.canvas.width||1,i=this.canvas.clientHeight||this.canvas.height||1,r=Number(e.dpr??globalThis.devicePixelRatio??1),a=Math.max(.5,Math.min(Number.isFinite(r)?r:1,2)),o=t!==this.lastFrame.width||i!==this.lastFrame.height||a!==this.lastFrame.dpr;if(!e.force&&!this.dirty&&!o&&!this.renderer.hasLiveBackdrop())return this;let l=this.renderer.hasLiveBackdrop();this.resize(t,i,a),(this.backdropDirty||o||l)&&(this.renderer.buildBackdrop(this.wallpaperIndex,this.wallpaperZoom),this.backdropDirty=!1),this.compositeMode===ye.OVERLAY?this.renderer.clearOutput():this.renderer.drawBackdrop();let n=this.effectiveMaterial;if(this.fusion){let{groups:h,truncated:u}=ne(this.elements,n.mergeRadius,16);u&&!this.warnedShapeLimit&&(this.warnedShapeLimit=!0,console.warn(`LiquidGlassWebGL: more than ${16} fused shapes are within merging distance of each other. They are drawn in separate passes, so the silhouette will not bridge across every one of them.`));for(let c of h)this.renderer.drawGlassGroup(c,n,a,n.mergeRadius)}else for(let h of this.elements)this.renderer.drawGlass(h,n,a);return this.dirty=!1,this.lastFrame={width:t,height:i,dpr:a},this}destroy(){this.stop(),this.canvas.removeEventListener("webglcontextlost",this.handleContextLost,!1),this.canvas.removeEventListener("webglcontextrestored",this.handleContextRestored,!1),this.reducedTransparencyQuery?.removeEventListener?.("change",this.handleReducedTransparencyChange),this.resizeObserver?.disconnect(),this.resizeObserver=null,this.renderer.destroy(),this.elements=[]}};return di(Ms);})();
