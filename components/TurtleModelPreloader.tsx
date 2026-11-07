"use client";

import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";

const TURTLE_MODEL_URL = "/turtle/turtle_rigged.glb";

export default function TurtleModelPreloader() {
  useEffect(() => {
    useGLTF.preload(TURTLE_MODEL_URL);
  }, []);

  return null;
}
