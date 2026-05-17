'use client'

import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * Slanted-stripe placeholder material used when the part is shown
 * inside the mold blocks. Solid black/white diagonal bands give a
 * "engineering cross-hatch" look that still reads the part's
 * silhouette but signals "this is a placeholder, not the finished
 * surface."
 *
 * Stripes are computed from world position projected onto a slant
 * direction — no texture, no UVs, single-pass opaque rendering so it
 * doesn't pile up overdraw the way the previous transparent variant
 * did.
 */
const VERTEX = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const FRAGMENT = /* glsl */ `
  uniform float uStripe;
  uniform float uDuty;
  uniform float uAlphaOn;
  uniform float uAlphaOff;
  uniform vec3 uSlant;
  uniform vec3 uLightDir;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  void main() {
    // Project world pos onto slant direction and wrap. Stripes run
    // perpendicular to uSlant, so (1,1,0)/sqrt(2) gives 45° diagonals.
    float p = dot(vWorldPos, uSlant);
    float t = fract(p / uStripe);

    // Anti-aliased edge using screen-space derivative of t. Keeps the
    // stripes crisp at oblique angles without crawling.
    float aa = fwidth(t) * 1.5;
    float band = smoothstep(uDuty + aa, uDuty - aa, t);

    // Dark-grey / white bands at different alpha levels. Dark grey
    // (rather than pure black) reads better against the dark zinc-950
    // viewport background — pure black would disappear into it.
    vec3 albedo = mix(vec3(0.22), vec3(1.0), band);
    float diff = clamp(dot(normalize(vNormal), uLightDir), 0.0, 1.0);
    vec3 shaded = albedo * (0.5 + 0.5 * diff);

    float alpha = mix(uAlphaOff, uAlphaOn, band);
    gl_FragColor = vec4(shaded, alpha);
  }
`

export function MoldCheckerMaterial({
  stripeWidth = 6,
  duty = 0.5,
  slant = [1, 1, 0],
  alphaOn = 0.7,
  alphaOff = 0.12,
}: {
  /** Distance between successive stripe centers in world units (mm). */
  stripeWidth?: number
  /** Fraction of each cycle occupied by the white band (0..1). */
  duty?: number
  /** Direction the stripes are perpendicular to. (1,1,0) = 45° diagonal. */
  slant?: [number, number, number]
  /** Alpha of the white band — solid enough to read as a stripe. */
  alphaOn?: number
  /** Alpha of the black band — kept low so mold geometry shows through. */
  alphaOff?: number
}) {
  // FrontSide + depthWrite=false + no DoubleSide keeps overdraw to a
  // single transparent pass — the heavy combo from the earlier
  // translucent variant (DoubleSide + DoubleSided depthWrite) was the
  // lag source on the bumper mesh.
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uStripe: { value: stripeWidth },
        uDuty: { value: duty },
        uAlphaOn: { value: alphaOn },
        uAlphaOff: { value: alphaOff },
        uSlant: { value: new THREE.Vector3(...slant).normalize() },
        uLightDir: { value: new THREE.Vector3(0.6, 0.8, 0.4).normalize() },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
    })
  }, [])

  material.uniforms.uStripe.value = stripeWidth
  material.uniforms.uDuty.value = duty
  material.uniforms.uAlphaOn.value = alphaOn
  material.uniforms.uAlphaOff.value = alphaOff
  ;(material.uniforms.uSlant.value as THREE.Vector3)
    .set(slant[0], slant[1], slant[2])
    .normalize()

  return <primitive object={material} attach="material" />
}
