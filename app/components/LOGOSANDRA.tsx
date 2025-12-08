// components/LOGOSANDRA.tsx
"use client";
import React from "react";

type Props = {
  reducedMotion?: boolean;
};

export default function LOGOSANDRA() {
  return (
    <div
      style={{
        marginTop: 6,
        fontSize: 22,
        fontWeight: 800,
        letterSpacing: 7,
        textTransform: "uppercase",
        background: "linear-gradient(90deg,#8b5cf6,#f472b6)",
        WebkitBackgroundClip: "text",
        color: "transparent",
        opacity: 1,
      }}
    >
      SANDRA
    </div>
  );
}
