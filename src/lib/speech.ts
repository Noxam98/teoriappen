import { useEffect, useState } from 'react';

const isNorwegian = (v: SpeechSynthesisVoice) => /^(nb|no|nn)([-_]|$)/i.test(v.lang);

/** A Norwegian text-to-speech voice, if the device has one (null otherwise). */
export function useNorwegianVoice(): SpeechSynthesisVoice | null {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const pick = () => setVoice(speechSynthesis.getVoices().find(isNorwegian) ?? null);
    pick();
    speechSynthesis.addEventListener('voiceschanged', pick);
    return () => speechSynthesis.removeEventListener('voiceschanged', pick);
  }, []);
  return voice;
}

export function speak(text: string, voice: SpeechSynthesisVoice | null): void {
  if (!voice) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.9;
    speechSynthesis.speak(u);
  } catch {
    // speech is a nice-to-have
  }
}
