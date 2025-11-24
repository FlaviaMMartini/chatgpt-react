export type ModelGroup =
  | "code"
  | "reasoning"
  | "casual"
  | "research"
  | "audio"
  | "guard";

export const MODEL_GROUPS: Record<ModelGroup, string[]> = {
  code: [
    "llama-3.3-70b-versatile",
    "moonshotai/kimi-k2-instruct",
    "moonshotai/kimi-k2-instruct-0905",
    "qwen/qwen3-32b",
  ],
  reasoning: [
    "meta-llama/llama-4-maverick-17b-128e-instruct",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3-32b",
  ],
  casual: [
    "llama-3.1-8b-instant",
    "groq/compound-mini",
    "meta-llama/llama-prompt-guard-2-22m",
    "meta-llama/llama-prompt-guard-2-86m",
  ],
  research: [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "openai/gpt-oss-safeguard-20b",
    "openai/gpt-oss-120b",
    "groq/compound",
  ],
  audio: [
    "playai-tts",
    "playai-tts-arabic",
    "whisper-large-v3",
    "whisper-large-v3-turbo",
  ],
  guard: [
    "meta-llama/llama-guard-4-12b",
  ],
};

export function detectIntent(message: string): ModelGroup {
  const m = (message || "").toLowerCase();

  if (/\b(code|react|bug|erro|programa|function|typescript|refatorar|refactor|review|testes|jest|cypress|playwright)\b/.test(m))
    return "code";

  if (/\b(pense|explique|analise|porque|arquitetura|design|risco)\b/.test(m))
    return "reasoning";

  if (/\b(pesquise|procure|compare|dados|estat|dados|dataset|fontes)\b/.test(m))
    return "research";

  if (/\b(voz|audio|transcrever|transcrição|tts|whisper)\b/.test(m))
    return "audio";

  return "casual";
}

export function pickModel(intent: ModelGroup): string {
  const list = MODEL_GROUPS[intent];
  if (!list || list.length === 0) {
    return "llama-3.3-70b-versatile";
  }
  return list[Math.floor(Math.random() * list.length)];
}

export const ALLOWED_MODELS = new Set<string>(
  Object.values(MODEL_GROUPS).flat()
);
