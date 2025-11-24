"use client";

import React, { useEffect } from "react";
import { Button, Card, Typography } from "antd";
import { GoogleOutlined } from "@ant-design/icons";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../api/chat/client";


export default function LoginPage() {
  const handleGoogleLogin = async () => {
    await signInWithPopup(auth, provider);
  };

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "#f0f2f5",
    }}>
      <Card style={{ width: 320, textAlign: "center", padding: 20 }}>
        <Typography.Title level={3}>Entrar</Typography.Title>
        <Button
          type="primary"
          icon={<GoogleOutlined />}
          onClick={handleGoogleLogin}
          block
          size="large"
        >
          Entrar com Google
        </Button>
      </Card>
    </div>
  );
}
