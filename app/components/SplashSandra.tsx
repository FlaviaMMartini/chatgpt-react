// components/SplashSandra.tsx
"use client";
import React, { useEffect, useState } from "react";

type Props = {
    minDuration?: number; // ms
    maxDuration?: number; // ms
    message?: string;
    hideWhenAntdLoaded?: boolean;
};

export default function SplashSandra({
    minDuration = 700,
    maxDuration = 1200,
    message = "Acordando a Sandra...",
    hideWhenAntdLoaded = true,
}: Props) {
    const [visible, setVisible] = useState(true);
    const [minReached, setMinReached] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);
    useEffect(() => {
        setReducedMotion(
            typeof window !== "undefined" &&
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
        );

        // mínimo de tempo que o splash deve ficar
        const minTimer = setTimeout(() => setMinReached(true), minDuration);

        // máximo de tempo total
        const maxTimer = setTimeout(() => {
            setFadeOut(true);
            setTimeout(() => setVisible(false), 600); // tempo do fade
        }, maxDuration);

        // quando ANTD carregar antes do máximo
        let cssCheckInterval: number | undefined;
        if (hideWhenAntdLoaded) {
            cssCheckInterval = window.setInterval(() => {
                try {
                    const sheets = Array.from(document.styleSheets);
                    const found = sheets.some(
                        (s) => typeof s.href === "string" && s.href.toLowerCase().includes("antd")
                    );

                    if (found && minReached) {
                        clearTimeout(maxTimer); // evita duplo close
                        setFadeOut(true);
                        setTimeout(() => setVisible(false), 600);
                    }
                } catch { }
            }, 200);
        }
        return () => {
            clearTimeout(minTimer);
            clearTimeout(maxTimer);
            if (cssCheckInterval) clearInterval(cssCheckInterval);
        };
    }, [minDuration, maxDuration, hideWhenAntdLoaded, minReached]);
    if (!visible) return null;
    return (
        <div
            aria-hidden
            style={{
                position: "fixed",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 99999,
                background: "radial-gradient(circle at 50% 18%, #07101a 0%, #040307 60%)",
                color: "#fff",
                fontFamily: `Inter, system-ui, -apple-system, 'Segoe UI', Roboto`,
                pointerEvents: "none",
                opacity: fadeOut ? 0 : 1,
                transition: "opacity 0.6s ease",
            }}
        >
            {/* subtle texture */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.04,
                    background:
                        "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.02), transparent 6%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.01), transparent 8%)",
                    mixBlendMode: "overlay",
                }}
            />
            <div style={{ width: 400, maxWidth: "95%", textAlign: "center" }}>
                <div
                    style={{
                        height: 80,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 52,
                    }}
                >
                    {[0, 1].map((i) => (
                        <div
                            key={i}
                            style={{
                                width: 58,
                                height: 28,
                                background:
                                    "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.95), rgba(255,255,255,0.1) 75%, transparent 100%)",
                                borderRadius: "50% 50% 50% 50% / 80% 80% 30% 30%", // mais amendoado
                                boxShadow: "0 0 22px rgba(255,255,255,0.35)",
                                transformOrigin: "center center",
                                transform: "scaleY(0)", // começa fechado
                                animation: "eyeOpen 700ms cubic-bezier(0.26, 0.62, 0.35, 1) forwards",
                            }}
                        />
                    ))}
                </div>
                {/* name */}
                <div
                    style={{
                        marginTop: 6,
                        fontSize: 22,
                        fontWeight: 800,
                        letterSpacing: 7,
                        textTransform: "uppercase",
                        background: "linear-gradient(90deg,#8b5cf6,#f472b6,#06b6d4)",
                        WebkitBackgroundClip: "text",
                        color: "transparent",
                        opacity: 0,
                        animation: reducedMotion ? "none" : "labelIn 520ms ease 860ms forwards",
                    }}
                >
                    SANDRA
                </div>
                <div
                    style={{
                        marginTop: 8,
                        fontSize: 13,
                        color: "rgba(255,255,255,0.66)",
                        opacity: 0,
                        animation: reducedMotion ? "none" : "subIn 520ms ease 980ms forwards",
                    }}
                >
                    {message}
                </div>
            </div>
            <style>{`
            @keyframes eyeOpen {
             0% {
              transform: scaleY(0);
              filter: blur(4px);
             }
         45% {
              transform: scaleY(1.4); /* abre um pouco demais */
             }
         100% {
           transform: scaleY(1);
             filter: blur(0);
         }
            }
        @keyframes labelIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes subIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>
        </div>
    );
}
