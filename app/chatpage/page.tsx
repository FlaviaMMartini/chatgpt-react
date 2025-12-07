"use client";

import { useEffect, useRef, useState } from "react";
import { Input, Button, Card, Typography, Spin, Avatar } from "antd";
import { useRouter } from "next/navigation";
import { useAuth } from "../AuthProvider";
import { loadUserHistory, saveUserMessage } from "../lib/firestoreHistory";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';


type Msg = {
  role: "assistant" | "user";
  content: string;
  ts?: string;
  meta?: {
    model?: string;
    provider?: string;
    structured?: any;
  };
};

export default function ChatPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading]);
  useEffect(() => {
    if (!user) return;
    if (messages.length > 0) return;

    (async () => {
      try {
        const body = {
          message: "Olá",
          sessionId: user.uid,
          user: { uid: user.uid, name: user.displayName || "", email: user.email || "" },
          history: [],
        };

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const replyText = (typeof data?.reply === "string" && data.reply.trim()) || "Olá!";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: replyText, ts: new Date().toISOString(), meta: { model: data?.model } },
        ]);

        if (data?.structured) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "",
              ts: new Date().toISOString(),
              meta: { structured: data.structured, model: data?.model },
            },
          ]);
        }
      } catch (e) {
        console.warn("greeting error:", e);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const data = await loadUserHistory(user.uid);
      if (data.length) {
        setMessages(
          data.map((d: any) => ({
            role: d.role,
            content: d.content,
            ts: d.ts?.toDate?.().toISOString() || "",
          }))
        );
      } else {
        const welcome: Msg = {
          role: "assistant",
          content: `Oi ${user.displayName || user.email}! 💜 Como posso te ajudar hoje?`,
          ts: new Date().toISOString(),
        };
        setMessages([welcome]);
        await saveUserMessage(user.uid, "assistant", welcome.content);
      }
      setLoadingHistory(false);
    })();
  }, [user]);

  function makeServerHistory(messages: Msg[], limit = 12) {
    const last = messages.slice(-limit).map((m) => ({
      role: m.role,
      content: String(m.content || ""),
      ts: m.ts,
    }));
    return last;
  }

  const sendMessage = async () => {
    const text = input?.trim();
    if (!text || !user) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text, ts: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    try {
      if (typeof saveUserMessage === "function") {
        await saveUserMessage(user.uid, "user", text);
      }
    } catch (err) {
      console.warn("saveUserMessage client error:", err);
    }

    setSending(true);

    try {
      const body = {
        message: text,
        sessionId: user.uid,
        user: {
          uid: user.uid,
          name: user.displayName || "",
          email: user.email || "",
        },
        history: makeServerHistory([...messages, userMsg], 12),
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`API error ${res.status}: ${txt}`);
      }

      const data = await res.json().catch(() => ({}));
      let replyText = "";

      if (data?.reply && data.reply.trim()) {
        replyText = data.reply.trim();
      } else if (!data?.structured) {
        replyText = "Desculpa, acho que estou tendo algum problema aqui.";
      }

      const botMsg: Msg = {
        role: "assistant",
        content: replyText,
        ts: new Date().toISOString(),
        meta: { model: data?.model, provider: data?.provider },
      };
      setMessages((prev) => [...prev, botMsg]);
      try {
        if (typeof saveUserMessage === "function") {
          await saveUserMessage(user.uid, "assistant", replyText);
        }
      } catch (err) {
        console.warn("saveUserMessage client error (assistant):", err);
      }
      if (data?.structured) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "",
            ts: new Date().toISOString(),
            meta: { structured: data.structured, model: data?.model, provider: data?.provider },
          },
        ]);
      }
    } catch (err: any) {
      console.error("sendMessage error:", err);
      const errStr = String(err?.message || err);
      if (errStr.includes("500") || errStr.includes("Internal server error")) {
        setIsOffline?.(true);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "parece que estou offline...",
            ts: new Date().toISOString(),
          },
        ]);
        setTimeout(() => {
          setIsOffline?.(false);

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "cai mas voltei 😅",
              ts: new Date().toISOString(),
            },
          ]);
        }, 5000);

        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errStr || "Erro ao conectar. Tente novamente.",
          ts: new Date().toISOString(),
        },
      ]);
    }
    finally {
      setSending(false);
    }
  };


  if (authLoading || loadingHistory) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Card
        style={{
          width: 900,
          maxWidth: "95%",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 8px 30px rgba(2,6,23,0.06)",
          display: "flex",
          flexDirection: "column",
          height: "90vh",
        }}
      >
        {/* TOPO */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar
              size={48}
              style={{
                background: "#7c3aed",
              }}
            >
              S
            </Avatar>

            <Typography.Title
              level={3}
              style={{
                margin: 0,
                background: "linear-gradient(90deg,#6366f1,#f472b6)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              SANDRA
            </Typography.Title>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#6b7280", fontSize: 14 }}>
              {user?.displayName || user?.email}
            </span>
            <Button danger type="default" size="middle" onClick={logout}>
              Sair
            </Button>
          </div>
        </div>

        {/* ÁREA DE MENSAGENS */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            border: "1px solid #eee",
            padding: 16,
            borderRadius: 10,
            background: "#ffffff",
            marginBottom: 16,
            height: "40vh",
          }}
        >
          {messages
            .filter((m) => m.content && m.content.trim() !== "")
            .map((m, i) => (
              <div
                key={i}
                style={{
                  marginBottom: 16,
                  textAlign: m.role === "assistant" ? "left" : "right",
                }}
              >
                <strong
                  style={{ color: m.role === "assistant" ? "#7c3aed" : "#0ea5e9" }}
                >
                  {m.role === "assistant" ? "Sandra" : "Você"}:
                </strong>

                <div className="message-text prose prose-invert max-w-full">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ inline, className, children }: any) {
                        const match = /language-(\w+)/.exec(className || "");
                        if (!inline && match) {
                          const codeText = String(children).replace(/\n$/, "");
                          return (
                            <div className="relative my-3">
                              <Button
                                onClick={() =>
                                  navigator.clipboard.writeText(codeText)
                                }
                                aria-label="Copiar código"
                                size="small"
                                style={{ marginBottom: 6 }}
                              >
                                Copiar
                              </Button>

                              <SyntaxHighlighter
                                language={match[1]}
                                style={docco}
                                PreTag="div"
                                showLineNumbers={false}
                                customStyle={{
                                  background: "#f1f5f9",
                                  padding: 12,
                                  borderRadius: 8,
                                  fontSize: 13,
                                  overflowX: "auto",
                                }}
                              >
                                {codeText}
                              </SyntaxHighlighter>
                            </div>
                          );
                        }
                        return (
                          <code className="px-1 py-[2px] rounded bg-gray-300 text-sm">
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT */}
        <Input
          placeholder="Digite sua mensagem..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={sendMessage}
          disabled={sending}
          style={{
            height: 42,
            borderRadius: 8,
          }}
        />

        <Button
          type="primary"
          block
          size="large"
          style={{ marginTop: 10, borderRadius: 8 }}
          onClick={sendMessage}
          loading={sending}
        >
          Enviar
        </Button>
      </Card>
    </div>
  );
}