"use client";

import { useEffect, useState } from "react";
import { Input, Button, Card, Typography, Spin } from "antd";
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
      const replyText = (typeof data?.reply === "string" && data.reply.trim()) || "Desculpa, acho que estou tendo algum problema aqui.";

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
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <Card>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16
        }}>
          <Typography.Title level={4}>Sandra IA</Typography.Title>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>{user?.displayName || user?.email}</span>
            <Button danger onClick={logout}>Sair</Button>
          </div>
        </div>

        <div style={{
          height: "60vh",
          overflowY: "auto",
          border: "1px solid #eee",
          padding: 12,
          borderRadius: 6,
          marginBottom: 16
        }}>
          {messages
            .filter((m) => m.content && m.content.trim() !== "")
            .map((m, i) => (
              <div
                key={i}
                style={{
                  marginBottom: 12,
                  textAlign: m.role === "assistant" ? "left" : "right",
                }}
              >
                <strong>{m.role === "assistant" ? "Sandra" : "Você"}:</strong>

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
                                onClick={() => navigator.clipboard.writeText(codeText)}
                                aria-label="Copiar código"
                              >
                                Copiar código
                              </Button>

                              <SyntaxHighlighter
                                language={match[1]}
                                style={docco}
                                PreTag="div"
                                showLineNumbers={false}
                                customStyle={{
                                  background: "transparent",
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
                          <code className="px-1 py-[2px] rounded bg-gray-700 text-sm">
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

        </div>

        <Input
          placeholder="Digite sua mensagem..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={sendMessage}
          disabled={sending}
        />

        <Button
          type="primary"
          block
          style={{ marginTop: 10 }}
          onClick={sendMessage}
          loading={sending}
        >
          Enviar
        </Button>
      </Card>
    </div>
  );
}
