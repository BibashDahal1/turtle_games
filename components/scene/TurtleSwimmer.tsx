"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  CENTER,
  MS,
  createPoser,
  newMotion,
  type Motion,
} from "@/lib/turtleRig";
import { ocean } from "@/lib/ocean";

const URL = "/turtle/turtle_rigged.glb";

/** Written by the scene every frame, read here. */
export interface SwimState {
  quat: THREE.Quaternion; // body orientation
  motion: Motion; // bone animation inputs
  alpha: number; // overall opacity (fade-in after the 2D mascot)
  fog: number; // 0..1 blend into the water colour
  depth: number; // 0..1 how far back it is (dims it so the content stays the highlight)
}
export const createSwimState = (): SwimState => ({
  quat: new THREE.Quaternion(),
  motion: newMotion(),
  alpha: 0,
  fog: 0,
  depth: 0,
});

/** The rigged 3D turtle (replaces the sprite-atlas Swimmer). Position / scale come from the parent group. */
export default function TurtleSwimmer({
  swim,
}: {
  swim: MutableRefObject<SwimState>;
}) {
  const gltf = useGLTF(URL);
  const model = useMemo(() => clone(gltf.scene), [gltf.scene]);
  const poser = useMemo(() => createPoser(model), [model]);

  const root = useRef<THREE.Group>(null!);
  const pivot = useRef<THREE.Group>(null!);
  const zs = useRef<THREE.Group>(null!);
  const mat = useRef<THREE.MeshStandardMaterial | null>(null);
  const fogU = useMemo(() => ({ value: 0 }), []);
  const fogC = useMemo(() => ({ value: new THREE.Color("#0a2a1f") }), []);

  const zTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    g.font = "bold 48px system-ui, sans-serif";
    g.fillStyle = "#ffffff";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("z", 32, 34);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  useEffect(() => {
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.frustumCulled = false; // skinned bounds are not updated
      const mt = (
        Array.isArray(m.material) ? m.material[0] : m.material
      ) as THREE.MeshStandardMaterial;
      // the GLB is a baked "emissive" shaded texture: show its colours as authored, ignore scene lights
      mt.color.set(0x000000);
      mt.metalness = 0;
      mt.roughness = 1;
      mt.toneMapped = false;
      mt.onBeforeCompile = (sh) => {
        sh.uniforms.uFog = fogU;
        sh.uniforms.uFogColor = fogC;
        sh.fragmentShader =
          "uniform float uFog;\nuniform vec3 uFogColor;\n" +
          sh.fragmentShader.replace(
            "#include <tonemapping_fragment>",
            "gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogColor, uFog);\n#include <tonemapping_fragment>",
          );
      };
      mt.needsUpdate = true;
      mat.current = mt;
    });
  }, [model, fogU, fogC]);

  useFrame((state, dt) => {
    const s = swim.current;
    const t = state.clock.elapsedTime;
    root.current.visible = s.alpha > 0.005;
    if (!root.current.visible) return;

    pivot.current.quaternion.copy(s.quat);
    poser.update(s.motion, t, Math.min(dt, 0.1));

    const m = mat.current;
    if (m) {
      m.opacity = s.alpha;
      m.transparent = s.alpha < 0.999;
      m.emissiveIntensity = 1 - 0.3 * s.depth; // a bit dimmer when far back
    }
    fogU.value = s.fog;
    fogC.value.setRGB(ocean.mid[0], ocean.mid[1], ocean.mid[2]);

    // "z z Z" while sleeping
    const sl = s.motion.sleep;
    zs.current.visible = sl > 0.05;
    zs.current.children.forEach((c, i) => {
      const k = (t * 0.35 + i / 3) % 1;
      c.position.set(0.9 + k * 0.5, 1.1 + k * 1.5, 0.6);
      c.scale.setScalar(0.35 + 0.5 * k);
      (c as THREE.Sprite).material.opacity = sl * Math.sin(Math.PI * k) * 0.9;
    });
  });

  return (
    <group ref={root} visible={false}>
      <group ref={pivot}>
        <group
          scale={MS}
          position={[-CENTER.x * MS, -CENTER.y * MS, -CENTER.z * MS]}
        >
          <primitive object={model} />
        </group>
      </group>
      <group ref={zs} visible={false}>
        {[0, 1, 2].map((i) => (
          <sprite key={i}>
            <spriteMaterial map={zTex} transparent depthWrite={false} />
          </sprite>
        ))}
      </group>
    </group>
  );
}

useGLTF.preload(URL);
