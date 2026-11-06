"use client";

import dynamic from "next/dynamic";

const GameScene = dynamic(() => import("@/components/scene/GameScene"), {
  ssr: false,
});

export default function GameSceneMount() {
  return <GameScene />;
}
