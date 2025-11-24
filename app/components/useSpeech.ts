export function useSpeech() {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

  // remove emojis e formata o texto antes de ler
  const cleanText = (text: string) =>
    text
      .replace(/:[^:\s]*(?:::[^:\s]*)*:/g, "") // remove :emoji:
      .replace(/[\u{1F600}-\u{1F64F}]/gu, "") // remove emojis comuns
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, "")
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, "")
      .replace(/[\u{2600}-\u{26FF}]/gu, "")
      .replace(/\*\*(.*?)\*\*/g, "$1") // remove markdown bold
      .replace(/[`*_~]/g, "") // remove caracteres markdown
      .trim();

  const speak = (text: string) => {
    if (!synth) return;
    stop();

    const utter = new SpeechSynthesisUtterance(cleanText(text));
    utter.lang = "pt-BR";
    utter.pitch = 1.1; // voz com leve doçura
    utter.rate = 0.95; // ritmo natural
    utter.volume = 1;

    // tenta achar a voz “Maria” (ou a mais próxima)
    const voices = synth.getVoices();
    const mariaVoice =
      voices.find((v) => v.name.toLowerCase().includes("maria")) ||
      voices.find((v) => v.lang.startsWith("pt") && v.name.toLowerCase().includes("female")) ||
      voices.find((v) => v.lang.startsWith("pt")) ||
      voices.find((v) => v.lang.startsWith("en"));

    if (mariaVoice) utter.voice = mariaVoice;

    synth.speak(utter);
  };

  const stop = () => {
    if (synth && synth.speaking) synth.cancel();
  };

  return { speak, stop };
}
