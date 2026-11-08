"use client";

import WaterRipple from "@/components/effects/WaterRipple";
import VisitorSceneMount from "@/components/visitor/VisitorSceneMount";

export default function SupportScene() {
  return (
    <>
      <WaterRipple
        scope="window"
        quality={0.65}
        intensity={0.7}
        backgroundDepth={0}
      />
      <VisitorSceneMount />
    </>
  );
}
