"use client";

import React, { JSX } from "react";
import { Card, Button, Typography, Avatar } from "antd";
import { GoogleOutlined } from "@ant-design/icons";
import { signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth, provider } from "../api/chat/client";

export default function LoginPage(): JSX.Element {
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
    <div style={{ height: "4rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Card style={{ width: 420, borderRadius: 12, textAlign: "center", boxShadow: "0 8px 30px rgba(2,6,23,0.06)", marginTop: "30rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          <Avatar size={64} style={{ background: "linear-gradient(90deg,#7c3aed,#06b6d4)" }}>S</Avatar>
          <Typography.Title level={2} style={{ margin: 0, background: "linear-gradient(90deg,#6366f1,#f472b6)", WebkitBackgroundClip: "text", color: "transparent" }}>
            SANDRA
          </Typography.Title>
          <div style={{ color: "#6b7280" }}>Seu assistente conversacional</div>
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
  );
}
