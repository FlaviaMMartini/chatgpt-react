"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Layout,
  Input,
  Button,
  List,
  Typography,
  Space,
  Spin,
  Drawer,
  Tag,
} from "antd";
import { MenuOutlined, SendOutlined } from "@ant-design/icons";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { darcula } from "react-syntax-highlighter/dist/esm/styles/prism";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "antd/dist/reset.css";
import { ModelGroup, detectIntent, pickModel } from "./components/models";

function RenderStructuredMessage({ model }: { model: any }) {
  if (!model || !Array.isArray(model.render)) return null;

  const colors = {
    purple: "#8F6CFF",
    purpleDark: "#6f4cff",
    bgCard: "#fbf8ff",
    text: "#111827",
    muted: "#6B7280",
    bubbleBg: "#F6F0FF",
    codeBg: "#0f1720",
  };

  const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ marginTop: 8, fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" }}>{children}</div>
  );

  const PremiumHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 style={{ margin: "6px 0 8px 0", color: colors.purpleDark, fontSize: 20, lineHeight: 1.2 }}>{children}</h2>
  );

  const PremiumSubheading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h4 style={{ margin: "0 0 12px 0", color: colors.purple, fontSize: 14, fontWeight: 600 }}>{children}</h4>
  );

  const PremiumParagraph: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p style={{ margin: "0 0 12px 0", color: colors.text, fontSize: 14, lineHeight: 1.6 }}>{children}</p>
  );

  const PremiumCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{
      background: colors.bgCard,
      borderRadius: 12,
      padding: 14,
      boxShadow: "0 6px 18px rgba(99,72,197,0.08)",
      marginBottom: 12,
      border: `1px solid rgba(143,108,255,0.08)`
    }}>
      {children}
    </div>
  );

  const PremiumTag: React.FC<{ text: string }> = ({ text }) => (
    <span style={{
      display: "inline-block",
      padding: "4px 8px",
      borderRadius: 999,
      background: "linear-gradient(90deg, rgba(143,108,255,0.12), rgba(111,76,255,0.08))",
      color: colors.purpleDark,
      fontSize: 12,
      fontWeight: 600,
      marginRight: 8
    }}>{text}</span>
  );

  const PremiumQuote: React.FC<{ text: string }> = ({ text }) => (
    <blockquote style={{
      margin: "8px 0 12px 0",
      padding: "10px 14px",
      borderLeft: `4px solid ${colors.purple}`,
      background: "rgba(143,108,255,0.04)",
      borderRadius: 8,
      color: colors.muted,
    }}>{text}</blockquote>
  );

  const PremiumStat: React.FC<{ label?: string; value?: string | number }> = ({ label, value }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: colors.muted }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: colors.text }}>{value}</div>
    </div>
  );

  const CodeBlock: React.FC<{ lang?: string; text?: string }> = ({ lang, text }) => (
    <div style={{ marginBottom: 12 }}>
      <SyntaxHighlighter
        language={lang || "text"}
        style={darcula}
        customStyle={{
          background: colors.codeBg,
          borderRadius: 8,
          padding: 12,
          fontSize: 13,
          lineHeight: 1.5,
        }}
        wrapLongLines
      >
        {text || ""}
      </SyntaxHighlighter>
    </div>
  );

  const PremiumList: React.FC<{ items: string[] }> = ({ items }) => (
    <ul style={{ margin: "0 0 12px 18px", color: colors.text }}>
      {items.map((it, i) => (
        <li key={i} style={{ marginBottom: 6 }}>{it}</li>
      ))}
    </ul>
  );

  const PremiumChecklist: React.FC<{ items: { text: string; checked?: boolean }[] }> = ({ items }) => (
    <div style={{ marginBottom: 12 }}>
      {items.map((it, i) => (
        <label key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, cursor: "default" }}>
          <input type="checkbox" checked={!!it.checked} readOnly style={{ width: 16, height: 16, borderRadius: 4 }} />
          <span style={{ color: colors.text }}>{it.text}</span>
        </label>
      ))}
    </div>
  );

  return (
    <Container>
      {model.render.map((block: any, idx: number) => {
        const t = block.type?.toLowerCase?.() || "paragraph";

        switch (t) {
          case "heading":
          case "title":
            return <div key={idx}><PremiumHeading>{block.text}</PremiumHeading></div>;

          case "subheading":
            return <div key={idx}><PremiumSubheading>{block.text}</PremiumSubheading></div>;

          case "paragraph":
            return (
              <div key={idx}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: (props) => <a {...props} style={{ color: colors.purpleDark, textDecoration: "underline" }} target="_blank" rel="noreferrer" />,
                    p: (props) => <p style={{ margin: 0, color: colors.text, fontSize: 14, lineHeight: 1.6 }} {...props} />
                  }}
                >
                  {block.text || ""}
                </ReactMarkdown>
              </div>
            );

          case "list":
            return <div key={idx}><PremiumList items={block.items || []} /></div>;

          case "checklist":
            return <div key={idx}><PremiumChecklist items={block.items || []} /></div>;

          case "card":
            return (
              <div key={idx}>
                <PremiumCard>
                  {(block.content || []).map((c: any, i: number) => {
                    if (c.type === "paragraph") return <PremiumParagraph key={i}>{c.text}</PremiumParagraph>;
                    if (c.type === "list") return <PremiumList key={i} items={c.items || []} />;
                    return <PremiumParagraph key={i}>{c.text}</PremiumParagraph>;
                  })}
                </PremiumCard>
              </div>
            );

          case "tag":
            return <div key={idx}><PremiumTag text={block.text} /></div>;

          case "info":
          case "warning":
          case "success":
          case "error":
            const colorMap: Record<string, string> = {
              info: "#e6f0ff",
              warning: "#fff4e5",
              success: "#f3ffef",
              error: "#fff0f0",
            };
            const borderMap: Record<string, string> = {
              info: colors.purple,
              warning: "#D9822B",
              success: "#2B8A3E",
              error: "#D93025",
            };
            return (
              <div key={idx} style={{
                background: colorMap[t] || "#f6f6f6",
                borderLeft: `4px solid ${borderMap[t] || colors.purple}`,
                padding: "10px 12px",
                borderRadius: 8,
                marginBottom: 12,
                color: colors.text,
              }}>
                <div style={{ fontWeight: 600, marginBottom: 6, color: borderMap[t] || colors.purple }}>{(t).toUpperCase()}</div>
                <div>{block.text}</div>
              </div>
            );

          case "quote":
            return <div key={idx}><PremiumQuote text={block.text} /></div>;

          case "stat":
            return <div key={idx}><PremiumStat label={block.label} value={block.value} /></div>;

          case "code":
            return <div key={idx}><CodeBlock lang={block.lang} text={block.text} /></div>;

          case "divider":
            return <div key={idx} style={{ margin: "12px 0" }}><hr style={{ border: "none", height: 1, background: "linear-gradient(90deg, rgba(143,108,255,0.12), rgba(111,76,255,0.06))" }} /></div>;

          default:
            // fallback: render markdown if text exists, otherwise JSON debug
            if (block.text) {
              return (
                <div key={idx}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.text}</ReactMarkdown>
                </div>
              );
            }
            return <div key={idx}><pre style={{ background: "#fff", padding: 8, borderRadius: 6 }}>{JSON.stringify(block)}</pre></div>;
        }
      })}
    </Container>
  );
}

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

type Msg = {
  role: "user" | "assistant";
  content: string;
  ts?: string;
  meta?: { model?: string; provider?: string; structured?: any };
};

function makeSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as any).randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [expert, setExpert] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sessionId] = useState<string>(() => makeSessionId());
  const [lastModelInfo, setLastModelInfo] = useState<{ provider?: string; model?: string } | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Msg = {
      role: "user",
      content: text,
      ts: new Date().toISOString(),
    };

    setMessages((s) => [...s, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const intent: ModelGroup = detectIntent(text);
      const selectedModel = pickModel(intent);

      console.debug("sending to /api/chat", {
        text,
        sessionId,
        expert,
        model: selectedModel,
        intent,
      });

      const body: any = {
        message: text,
        sessionId,
        expert,
        model: selectedModel,
        intent,
      };

      const controller = new AbortController();
      const TIMEOUT_MS = 60_000;
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errBody = await res.text().catch(() => "Erro desconhecido");
        throw new Error(`API error ${res.status}: ${errBody}`);
      }

      const data = await res.json().catch(async () => {
        const txt = await res.text().catch(() => "");
        return { reply: txt };
      });

      const replyText =
        (typeof data?.reply === "string" && data.reply.trim()) ||
        (typeof data?.replyText === "string" && data.replyText.trim()) ||
        "";

      const assistantMsg: Msg = {
        role: "assistant",
        content: replyText || "Desculpe, não entendi.",
        ts: new Date().toISOString(),
        meta: {
          model: data?.model,
          provider: data?.provider,
        },
      };

      setMessages((s) => [...s, assistantMsg]);
      if (data?.structured) {
        setMessages((s) => [
          ...s,
          {
            role: "assistant",
            content: "",
            ts: new Date().toISOString(),
            meta: {
              model: data?.model,
              provider: data?.provider,
              structured: data.structured,
            },
          },
        ]);
      }
      setLastModelInfo({
        provider: data?.provider,
        model: data?.model,
      });
    } catch (err: any) {
      console.error("sendMessage error:", err);

      const userFacing =
        err?.name === "AbortError"
          ? "Requisição expirou. Tente novamente."
          : err?.message || "Erro ao conectar com o servidor. Tente novamente.";

      setMessages((s) => [
        ...s,
        {
          role: "assistant",
          content: userFacing,
          ts: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    sendMessage();
  };

  const bubbleStyle = (isUser: boolean): React.CSSProperties => ({
    maxWidth: "75%",
    padding: "14px 18px",
    borderRadius: 16,
    background: isUser ? "#F3F3F5" : "linear-gradient(180deg,#F6F0FF 0%, #EADCFF 100%)",
    color: isUser ? "#111" : "#2b0f6a",
    boxShadow: isUser ? "none" : "0 4px 12px rgba(163,123,255,0.12)",
    whiteSpace: "pre-wrap",
    lineHeight: 1.5,
    alignSelf: isUser ? "flex-end" : "flex-start",
  });

  const renderMessageContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    let parsedStructured: any = null;
    let jsonBlockRaw: string | null = null;

    for (const p of parts) {
      const jsonFenceMatch = p.match(/```json\s*([\s\S]*?)\s*```/i);
      if (jsonFenceMatch) {
        jsonBlockRaw = jsonFenceMatch[1];
        try {
          parsedStructured = JSON.parse(jsonBlockRaw);
        } catch (e) {
          parsedStructured = null;
        }
        if (parsedStructured) break;
      }
    }

    if (!parsedStructured) {
      const noCode = parts.filter((p) => !/^```/.test(p)).join("\n");
      const rawJsonMatch = noCode.match(/(\{[\s\S]*\})\s*$/);
      if (rawJsonMatch) {
        jsonBlockRaw = rawJsonMatch[1];
        try {
          parsedStructured = JSON.parse(jsonBlockRaw);
        } catch (e) {
          parsedStructured = null;
        }
      }
    }

    if (parsedStructured) {
      let indexOfJson = -1;
      if (jsonBlockRaw) {
        indexOfJson = content.lastIndexOf(jsonBlockRaw);
      }
      const textBeforeJson = indexOfJson >= 0 ? content.slice(0, indexOfJson) : content;

      return (
        <>
          {textBeforeJson.trim() ? (
            <div style={{ marginBottom: 8 }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {textBeforeJson.trim()}
              </ReactMarkdown>
            </div>
          ) : null}

          <RenderStructuredMessage model={parsedStructured} />
        </>
      );
    }
    return (
      <>
        {parts.map((p, i) => {
          const codeMatch = p.match(/```(?:([\w+]+)\n)?([\s\S]*?)```/);
          if (codeMatch) {
            const lang = codeMatch[1];
            const code = codeMatch[2];
            return (
              <div key={i} style={{ marginBottom: 12 }}>
                <SyntaxHighlighter
                  language={lang || "text"}
                  style={darcula}
                  customStyle={{
                    background: "#0f1720",
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 13,
                  }}
                  wrapLongLines
                >
                  {code}
                </SyntaxHighlighter>
              </div>
            );
          }
          return (
            <div key={i} style={{ whiteSpace: "pre-wrap", marginBottom: 6 }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{p}</ReactMarkdown>
            </div>
          );
        })}
      </>
    );
  };


  return (
    <Layout style={{ maxHeight: "100vh", background: "#fff" }}>
      <Header
        style={{
          background: "#fff",
          padding: "12px 20px",
          borderBottom: "1px solid rgba(160,130,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Space align="center">
          <Button icon={<MenuOutlined />} type="text" onClick={() => setDrawerOpen(true)} />
          <img src="/assets/logosandra.png" alt="Logo Sandra" style={{ width: 48, height: 48, borderRadius: "50%" }} />
          <Text style={{ fontSize: 18, fontWeight: 700, color: "#8F6CFF" }}>Sandra</Text>

          {lastModelInfo && (
            <Tag style={{ marginLeft: 8 }}>
              {lastModelInfo.provider} · {lastModelInfo.model}
            </Tag>
          )}
        </Space>
      </Header>

      <Drawer title="Opções" placement="left" onClose={() => setDrawerOpen(false)} open={drawerOpen}>
        <p>Preferências da Sandra</p>
        <p>Session ID: <code style={{ wordBreak: "break-all" }}>{sessionId}</code></p>
      </Drawer>

      <Content style={{ padding: "16px 24px", display: "flex", flexDirection: "column", height: "calc(100vh - 80px)" }}>
        <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: 16, borderRadius: 16, background: "#fff", display: "flex", flexDirection: "column", gap: 12 }}>
          <List
            dataSource={messages}
            locale={{ emptyText: <Text type="secondary">Comece a conversar com a Sandra</Text> }}
            renderItem={(item: Msg) => {
              const isUser = item.role === "user";
              const time = item.ts ? new Date(item.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
              return (
                <List.Item style={{ border: "none", padding: 0, display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{isUser ? "Você" : "Sandra"}</span> <span style={{ marginLeft: 8 }}>{time}</span>
                  </div>

                  <div style={bubbleStyle(isUser)}>
                    {item.role === "assistant" && item.meta?.structured
                      ? <RenderStructuredMessage model={item.meta.structured} />
                      : item.role === "assistant"
                        ? renderMessageContent(item.content)
                        : item.content
                    }
                  </div>

                </List.Item>
              );
            }}
          />

          {loading && (
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ ...bubbleStyle(false), display: "flex", alignItems: "center", gap: 8 }}>
                <Spin size="small" /> <Text>Digitando...</Text>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <Input.TextArea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Digite sua mensagem..." autoSize={{ minRows: 2, maxRows: 6 }} style={{ flex: 1, borderRadius: 12, padding: "12px 14px", background: "#fff", border: "1px solid rgba(160,130,255,0.12)" }} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />

          <Button type="primary" icon={<SendOutlined />} onClick={sendMessage} loading={loading} style={{ borderRadius: 12, width: 48, height: 48, padding: 0 }} />

          <Button onClick={() => setMessages([])} style={{ borderRadius: 12, width: 48, height: 48, padding: 0 }} title="Limpar conversa">🗑️</Button>
        </form>
      </Content>

      <Footer style={{ textAlign: "center", background: "#fff", padding: 12 }}>
        <Text type="secondary">Sandra • Criada por Flavia Martini • Não compartilhe informações pessoais</Text>
      </Footer>
    </Layout>
  );
}
