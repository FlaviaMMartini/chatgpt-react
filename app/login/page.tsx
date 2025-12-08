"use client";

import React, { JSX, useState } from "react";
import { Card, Button } from "antd";
import { GoogleOutlined } from "@ant-design/icons";
import { signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth, provider } from "../api/chat/client";
import SplashSandra from "../components/SplashSandra";
import LOGOSANDRA from "../components/LOGOSANDRA";

export default function LoginPage(): JSX.Element {
  const [reducedMotion, setReducedMotion] = useState(false);
  const router = useRouter();
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      router.push("/chatpage");
    } catch (error) {
      console.error("Erro login:", error);
      alert("Erro ao autenticar com Google.");
    }
  };

  return (
    <>
      <SplashSandra minDuration={3000} maxDuration={3000} message="Acordando..." />
      <div style={{
        background: '#111', height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "fixed",
        inset: 0, padding: '1rem'
      }}>
        <Card
          style={{
            background: '#111',
            width: 420,
            borderRadius: 12,
            textAlign: "center",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            <LOGOSANDRA />
            <div style={{ color: "#6b7280" }}>Sua assistente conversacional</div>
            <div style={{ width: "100%", marginTop: 12 }}>
              <Button type="primary" icon={<GoogleOutlined />} block size="large" onClick={handleGoogleLogin}>
                Entrar com Google
              </Button>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#9ca3af" }}>
              Clique para entrar — é rápido e seguro
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: "#9ca3af" }}>
              Ao entrar você concorda com os termos — (demo)
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
