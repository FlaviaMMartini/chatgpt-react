"use client";

import React from "react";
import { Card, Button, Typography } from "antd";
import { GoogleOutlined } from "@ant-design/icons";
import { signInWithPopup } from "firebase/auth";

import { useRouter } from "next/navigation";
import { auth, provider } from "../api/chat/client";

export default function LoginPage() {
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
    <div style={{
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "#f0f2f5"
    }}>
      <Card style={{ width: 360, textAlign: "center" }}>
        <Typography.Title level={3}>Entrar</Typography.Title>
        <Button
          type="primary"
          icon={<GoogleOutlined />}
          block
          size="large"
          onClick={handleGoogleLogin}
        >
          Entrar com Google
        </Button>
      </Card>
    </div>
  );
}
