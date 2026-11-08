"use client";

import dynamic from "next/dynamic";

const VisitorScene = dynamic(() => import("@/components/visitor/VisitorScene"), {
  ssr: false,
});

export default function VisitorSceneMount() {
  return <VisitorScene />;
}
