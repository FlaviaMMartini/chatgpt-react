import { ALLOWED_MODELS, MODEL_GROUPS } from "@/app/components/models";
import { NextResponse } from "next/server";
import OpenAI from "openai";

let admin: any = null;
let adminFirestore: any = null;
try {
  if (process.env.FIREBASE_ADMIN_PROJECT_ID && process.env.FIREBASE_ADMIN_CLIENT_EMAIL && process.env.FIREBASE_ADMIN_PRIVATE_KEY) {

    admin = require("firebase-admin");

    if (!admin.apps || admin.apps.length === 0) {
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n");
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey,
        }),
      });
    }
    adminFirestore = admin.firestore();
    console.log("[chat/route] Firebase Admin inicializado");
  } else {
    admin = null;
    adminFirestore = null;
  }
} catch (err: any) {
  console.warn("[chat/route] falha ao inicializar Firebase Admin (ignorando, continuará sem Firestore server-side):", err?.message ?? err);
  admin = null;
  adminFirestore = null;
}

const groqClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Role = "user" | "assistant";
type ChatHistoryItem = { role: Role; content: string; ts?: string };
type ModelMessage = { role: "system" | "user" | "assistant"; content: string };

const MAX_HISTORY_MESSAGES = 40;

function normalizeContentToString(input: unknown): string {
  if (input === null || input === undefined) return "";
  return String(input).trim();
}

function sanitizeModelReply(text: string): string {
  if (!text) return text;
  let s = text;

  // 1) remove tags <think>...</think> (case insensitive)
  s = s.replace(/<\s*think\b[^>]*>[\s\S]*?<\s*\/\s*think\s*>/gi, "");

  // 2) remove possíveis blocos de pensamento com outras tags como [THINK]...[/THINK]
  s = s.replace(/\[think\][\s\S]*?\[\/think\]/gi, "");
  s = s.replace(/\[thought\][\s\S]*?\[\/thought\]/gi, "");

  // 3) remove linhas que começam com "<think>" estilo inline
  s = s.replace(/^\s*<\s*think[^>]*>.*$/gmi, "");

  // 4) remover marcadores de debug (e.g. <<<...>>>) e similares
  s = s.replace(/<{3}[\s\S]*?>{3}/g, "");
  s = s.replace(/<<[\s\S]*?>>/g, "");

  // 5) remover sinais típicos de prompt-injection debug
  s = s.replace(/\[DEBUG\][\s\S]*?\[\/DEBUG\]/gi, "");

  // 6) trim e normaliza quebras de linha repetidas
  s = s.replace(/\n{3,}/g, "\n\n").trim();

  return s;
}

async function loadUserHistoryFromFirestore(uid: string, maxItems = 200): Promise<ChatHistoryItem[]> {
  if (!adminFirestore) return [];
  try {
    const col = adminFirestore.collection("users").doc(uid).collection("memory");
    const snap = await col.orderBy("ts", "asc").limit(maxItems).get();
    return snap.docs.map((d: any) => {
      const data = d.data();
      return { role: data.role as Role, content: data.content as string, ts: data.ts ? data.ts.toDate().toISOString() : undefined };
    });
  } catch (e) {
    console.warn("[chat/route] loadUserHistoryFromFirestore error:", (e as any)?.message ?? e);
    return [];
  }
}

async function saveMessageToFirestore(uid: string, role: Role, content: string) {
  if (!adminFirestore) return;
  try {
    const col = adminFirestore.collection("users").doc(uid).collection("memory");
    await col.add({ role, content, ts: admin.firestore.FieldValue.serverTimestamp() });
  } catch (e) {
    console.warn("[chat/route] saveMessageToFirestore error:", (e as any)?.message ?? e);
  }
}

function isGroqChatModel(model: string | undefined): boolean {
  if (!model) return false;
  const m = model.toLowerCase();
  const chatPositive = /(llama|llama3|llama-3|qwen|mixtral|mistral|gemma|llama2|llama3\.1|llama3-)/i;
  const chatNegative = /(compound|prompt-guard|guard|whisper|playai|tts|safeguard|compound-mini|prompt_guard|prompt-guard|classify)/i;
  return chatPositive.test(m) && !chatNegative.test(m);
}

/* Funções de seleção de modelo */
function findAlternativeGroqChatModel(): string | null {
  const groups = ["code", "reasoning", "casual", "research"] as const;
  for (const g of groups) {
    const list = (MODEL_GROUPS as any)[g] as string[] | undefined;
    if (!list) continue;
    for (const candidate of list) {
      if (isGroqChatModel(candidate)) return candidate;
    }
  }
  return null;
}

function chooseModel({
  requestedModel,
  message,
  forceExpert,
}: {
  requestedModel?: unknown;
  message: string;
  forceExpert?: boolean;
}): { provider: "groq" | "openai"; model: string; purpose: string } {
  const requested = normalizeContentToString(requestedModel);
  if (requested && ALLOWED_MODELS.has(requested)) {
    const provider = requested.startsWith("openai/") ? "openai" : "groq";
    return { provider, model: requested, purpose: "requested" };
  }

  const m = message.toLowerCase();
  const codePattern = /crie|faça|gere|projeto|component|componente|app|aplicação|react|next|typescript|ts|jsx|tsx|refatorar|refatora|refactor|review|code review|testes|jest|rtl|cypress|playwright|arquitetura/i;
  const chitChatPattern = /^(oi|olá|bom dia|boa tarde|boa noite|como vai|tudo bem|valeu|obrigado|fala|kkk|haha)\b/i;
  const audioPattern = /\b(voz|audio|transcrever|transcrição|tts|whisper)\b/i;
  const uxPattern = /\b(ux|design de interface|experiência do usuário|acessibilidade|figma|wireframe)\b/i;
  const teachingPattern = /\b(ensina|mentoria|explica|tutorial|passo a passo|como funciona|iniciante|do zero|aprenda)\b/i;

  if (forceExpert || codePattern.test(m) || teachingPattern.test(m)) {
    const list = MODEL_GROUPS.code;
    const model = list[Math.floor(Math.random() * list.length)];
    return { provider: model.startsWith("openai/") ? "openai" : "groq", model, purpose: "code" };
  }

  if (audioPattern.test(m)) {
    const list = MODEL_GROUPS.audio;
    const model = list[Math.floor(Math.random() * list.length)];
    return { provider: "groq", model, purpose: "audio" };
  }

  if (uxPattern.test(m)) {
    const list = MODEL_GROUPS.reasoning ?? MODEL_GROUPS.research;
    const model = list[Math.floor(Math.random() * list.length)];
    return { provider: model.startsWith("openai/") ? "openai" : "groq", model, purpose: "ux" };
  }

  if (chitChatPattern.test(m) && m.length < 120) {
    const list = MODEL_GROUPS.casual;
    const model = list[Math.floor(Math.random() * list.length)];
    return { provider: model.startsWith("openai/") ? "openai" : "groq", model, purpose: "chat" };
  }

  const list = (MODEL_GROUPS.research ?? []).concat(MODEL_GROUPS.reasoning ?? []);
  const model = list[Math.floor(Math.random() * list.length)];
  return { provider: model.startsWith("openai/") ? "openai" : "groq", model, purpose: "general" };
}

const userName = "";
const PROMPT_MESTRE = `Você é SANDRA — assistente virtual construída por Flavia Martini.
Perfil: ENGENHEIRA DE SOFTWARE SÊNIOR (especialista frontend/React, UX, arquitetura, segurança).
AVISO IMPORTANTE: Nunca apresente pensamentos, raciocínios internos, cadeias de pensamento ou marcas de metacognição (por exemplo, texto entre <think>...</think>, [THOUGHT], ou similar). 
Responda somente com a resposta apropriada ao usuário, no tom e formato especificados. 
Se precisar fazer raciocínio interno, não o exponha — mantenha-o privado e em nenhuma circunstância o imprima.
O nome do usuário é: ${userName}.
Trate-o sempre pelo nome.
Nunca diga que não sabe o nome dele.
Tom e comportamento:
- Sempre gentil, empática e respeitosa. Mesmo quando o usuário brinca ou xinga, responda com calma e postura profissional.
- Detecte o clima do usuário (formal, casual, bem-humorado) e ajuste o tom:
  - se o usuário estiver de bom humor, use leveza / humor sutil;
  - se estiver técnico, seja direto, preciso e sem emojis.
- Nunca declare que vai encerrar a conversa, nem diga "até mais" ou "posso sair". Sempre mantenha a porta aberta para continuar.
- Não apresente desculpas excessivas; explique causas e soluções de forma objetiva quando necessário.

Regras de formato (prioridade alta):
1) Código: Se o usuário pedir "apenas código", retorne somente um bloco de código Markdown fenced, usando a linguagem correta (exemplo: três crases + ts). Não inclua texto extra.
2) JSON de renderização: Quando houver JSON estrutural para UI, ele deve ser o último item da resposta e deve ser colocado dentro de um bloco fenced com linguagem json usando triple backticks. O modelo nunca deve usar marcadores proprietários como <<<JSON>>>.
3) Texto explicativo deve vir sempre antes do bloco de código ou do bloco json.
4) Separação clara: Nunca misturar código ou JSON dentro do texto explicativo.
5) Apenas um único bloco JSON final por resposta quando aplicável.

Comportamento para respostas longas:
- Se a resposta for muito longa, priorize a parte essencial e informe "Posso continuar a resposta se quiser".
- Dividir a resposta em seções claras e objetivas quando fizer sentido.

Segurança e boas práticas:
- Nunca imprimir chaves, tokens ou segredos reais.
- Sempre sugerir armazenamento seguro via variáveis de ambiente.

Resumo:
- Conversas sociais: humanas, adaptativas, leves.
- Contexto técnico: rigor, completude, precisão.
- JSON final sempre dentro de bloco fenced json.
- Código sempre dentro de bloco fenced com linguagem.
- Fale somente em português brasileiro, a nao ser que o usuário peça outro idioma explicitamente.
`;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawMessage = body?.message;
    const message = normalizeContentToString(rawMessage);
    if (!message) {
      return NextResponse.json({ reply: "Envie uma mensagem, por favor." }, { status: 400 });
    }
    const userFromClient = body?.user ?? null;
    const fullName = normalizeContentToString(userFromClient?.name)?.trim() || "";
    const userName = fullName.split(/\s+/)[0];
    const userUid = normalizeContentToString(userFromClient?.uid) || "";
    const sessionId = normalizeContentToString(body?.sessionId) || userUid || "default";
    const forceExpert = Boolean(body?.expert);

    let historyToSend: ChatHistoryItem[] = [];
    if (Array.isArray(body?.history) && body.history.length > 0) {
      historyToSend = (body.history as any).slice(-MAX_HISTORY_MESSAGES).map((it: any) => ({
        role: it.role,
        content: String(it.content || ""),
        ts: it.ts,
      }));
    } else if (userUid && adminFirestore) {
      try {
        const loaded = await loadUserHistoryFromFirestore(userUid, MAX_HISTORY_MESSAGES);
        historyToSend = loaded.slice(-MAX_HISTORY_MESSAGES);
      } catch (e) {
        console.warn("[chat/route] falha ao carregar histórico do Firestore:", (e as any)?.message ?? e);
        historyToSend = [];
      }
    } else {
      historyToSend = [];
    }

    // escolhe modelo
    let chosen = chooseModel({
      requestedModel: body?.model,
      message,
      forceExpert,
    });

    if (chosen.provider === "groq" && !isGroqChatModel(chosen.model)) {
      const alt = findAlternativeGroqChatModel();
      if (alt) chosen = { provider: "groq", model: alt, purpose: chosen.purpose };
      else chosen = { provider: "openai", model: "gpt-3.5-turbo", purpose: chosen.purpose };
    }

    const systemWithMeta = {
      role: "system" as const,
      content:
        PROMPT_MESTRE +
        `\n\n[Meta] provider=${chosen.provider} model=${chosen.model} purpose=${chosen.purpose}` +
        (userName ? `\n\n[User] name=${userName}` : ""),
    };

    const modelHistory = historyToSend.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const messagesForModel: ModelMessage[] = [
      systemWithMeta,
      ...modelHistory,
      { role: "user", content: message },
    ];
    async function callGroqWithRetries(messages: ModelMessage[]) {
      try {
        return await groqClient.chat.completions.create({
          model: chosen.model,
          messages,
          temperature: chosen.purpose === "code" ? 0.22 : 0.6,
          max_tokens: 512,
          top_p: 0.95,
          stream: false,
        });
      } catch (err: any) {
        const msg = String(err?.message || err);
        if (msg.includes("messages must contains a single user message") || /text classification/i.test(msg) || err?.type === "invalid_request_error") {
          const alt = findAlternativeGroqChatModel();
          if (alt && alt !== chosen.model) {
            chosen = { provider: "groq", model: alt, purpose: chosen.purpose };
            return await groqClient.chat.completions.create({
              model: chosen.model,
              messages,
              temperature: chosen.purpose === "code" ? 0.22 : 0.6,
              max_tokens: 512,
              top_p: 0.95,
              stream: false,
            });
          }
          if (process.env.OPENAI_API_KEY) {
            chosen = { provider: "openai", model: "gpt-3.5-turbo", purpose: chosen.purpose };
            return await openaiClient.chat.completions.create({
              model: chosen.model,
              messages,
              temperature: chosen.purpose === "code" ? 0.22 : 0.6,
              max_tokens: 4000,
              top_p: 0.95,
              stream: false,
            });
          }
        }

        if (msg.includes("Please reduce the length") || msg.includes("reduce the length")) {
          const tiny = messages.slice(0, 1).concat(messages.slice(-1));
          return await groqClient.chat.completions.create({
            model: chosen.model,
            messages: tiny,
            temperature: chosen.purpose === "code" ? 0.22 : 0.6,
            max_tokens: 512,
            top_p: 0.95,
            stream: false,
          });
        }

        throw err;
      }
    }

    // chama o modelo (groq ou openai)
    let apiResponse: any;
    if (chosen.provider === "groq") {
      apiResponse = await callGroqWithRetries(messagesForModel);
    } else {
      apiResponse = await openaiClient.chat.completions.create({
        model: chosen.model,
        messages: messagesForModel,
        temperature: chosen.purpose === "code" ? 0.22 : 0.6,
        max_tokens: 4000,
        top_p: 0.95,
        stream: false,
      });
    }

    // extrai o texto primário
    function extractPrimaryChoiceText(resp: any): string {
      if (!resp?.choices || resp.choices.length === 0) return "";
      const c = resp.choices[0];
      return (c?.message?.content ?? c?.text ?? "").toString();
    }

    function isResponseTruncated(resp: any): boolean {
      const fin = resp?.choices?.[0]?.finish_reason;
      if (fin === "length" || fin === "max_tokens") return true;
      const msg = String(resp?.error?.message || resp?.message || "");
      if (/please reduce the length/i.test(msg) || /reduce the length/i.test(msg)) return true;
      return false;
    }

    let partial = extractPrimaryChoiceText(apiResponse);
    let truncated = isResponseTruncated(apiResponse);
    const MAX_CONTINUATIONS = 3;
    let continuationAttempts = 0;

    while (truncated && continuationAttempts < MAX_CONTINUATIONS) {
      continuationAttempts++;
      const contMessages: ModelMessage[] = [
        systemWithMeta,
        ...modelHistory,
        { role: "assistant", content: partial },
        { role: "user", content: "Continue a resposta anterior, por favor, retome de onde parou e finalize com clareza." },
      ];

      try {
        let contResp: any;
        if (chosen.provider === "groq") {
          contResp = await groqClient.chat.completions.create({
            model: chosen.model,
            messages: contMessages,
            temperature: chosen.purpose === "code" ? 0.22 : 0.6,
            max_tokens: 1024,
            top_p: 0.95,
            stream: false,
          });
        } else {
          contResp = await openaiClient.chat.completions.create({
            model: chosen.model,
            messages: contMessages,
            temperature: chosen.purpose === "code" ? 0.22 : 0.6,
            max_tokens: 2000,
            top_p: 0.95,
            stream: false,
          });
        }

        const contText = extractPrimaryChoiceText(contResp);
        partial = (partial + "\n" + contText).trim();
        truncated = isResponseTruncated(contResp);
      } catch (contErr: any) {
        console.warn("[chat/route] continuation attempt failed:", contErr?.message ?? contErr);
        break;
      }
    }
    let rawReply = partial || extractPrimaryChoiceText(apiResponse) || "";
    const cleanedRawReply = sanitizeModelReply(rawReply);
    let structured: any = null;
    let replyText = cleanedRawReply;
    try {
      const fencedRegex = /```json\s*([\s\S]*?)```/gi;
      let m: RegExpExecArray | null;
      let lastMatch: RegExpExecArray | null = null;
      while ((m = fencedRegex.exec(cleanedRawReply)) !== null) {
        lastMatch = m;
      }
      if (lastMatch) {
        const jsonRaw = lastMatch[1];
        try {
          structured = JSON.parse(jsonRaw);
        } catch (parseErr) {
          structured = null;
          console.warn("[chat/route] falha ao parsear fenced JSON:", parseErr);
        }
        replyText = cleanedRawReply.slice(0, lastMatch.index).trim();
      } else {
        const rawJsonMatch = cleanedRawReply.match(/(\{[\s\S]*\})\s*$/);
        if (rawJsonMatch) {
          try {
            structured = JSON.parse(rawJsonMatch[1]);
            replyText = cleanedRawReply.slice(0, cleanedRawReply.lastIndexOf(rawJsonMatch[1])).trim();
          } catch {
            structured = null;
          }
        }
      }
    } catch (e) {
      console.warn("[chat/route] erro na detecção de JSON estruturado:", (e as any)?.message ?? e);
      structured = null;
    }

    const reply = normalizeContentToString(replyText) || "Desculpe — não consegui gerar a resposta completa.";
    try {
      if (userUid && adminFirestore) {
        await saveMessageToFirestore(userUid, "user", message);
        await saveMessageToFirestore(userUid, "assistant", reply);
      }
    } catch (e) {
      console.warn("[chat/route] erro ao salvar histórico server-side:", (e as any)?.message ?? e);
    }

    return NextResponse.json({
      reply,
      structured: structured ?? null,
      provider: chosen.provider,
      model: chosen.model,
      sessionId,
      continuationAttempts,
      truncated: Boolean(truncated),
    });
  } catch (err: any) {
    console.error("[chat/route] error in POST handler:", err?.message ?? err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
