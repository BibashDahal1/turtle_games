"use client";

import dynamic from "next/dynamic";

// three.js can't render on the server
const Scene = dynamic(() => import("./Scene"), { ssr: false });

export default function SceneMount() {
  return <Scene />;
}
