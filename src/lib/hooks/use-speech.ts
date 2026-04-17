"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ============================================================
   TYPES — minimal Web Speech API shim
   (Lib.dom types vary by TS version; we keep this narrow.)
   ============================================================ */

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: SpeechRecognitionEvt) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvt) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionEvt {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

interface SpeechRecognitionErrorEvt {
  error: string;
  message?: string;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function getRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/* ============================================================
   useTextToSpeech — Swedish buyer voice
   ============================================================ */

export interface TtsOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface TtsApi {
  supported: boolean;
  speaking: boolean;
  voices: SpeechSynthesisVoice[];
  preferredVoice: SpeechSynthesisVoice | null;
  speak: (text: string, opts?: TtsOptions) => void;
  cancel: () => void;
}

export function useTextToSpeech(defaults?: TtsOptions): TtsApi {
  const lang = defaults?.lang || "sv-SE";
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const currentUtter = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }
    setSupported(true);

    function loadVoices() {
      const list = window.speechSynthesis.getVoices();
      if (list.length > 0) setVoices(list);
    }

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      window.speechSynthesis.cancel();
    };
  }, []);

  const preferredVoice = (() => {
    if (!voices.length) return null;
    const exact = voices.find((v) => v.lang === lang);
    if (exact) return exact;
    const langShort = lang.split("-")[0];
    const partial = voices.find((v) => v.lang.startsWith(langShort));
    return partial || null;
  })();

  const speak = useCallback(
    (text: string, opts?: TtsOptions) => {
      if (!supported || !text.trim()) return;
      // Cancel anything currently speaking
      window.speechSynthesis.cancel();

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = opts?.lang || lang;
      utter.rate = opts?.rate ?? defaults?.rate ?? 1;
      utter.pitch = opts?.pitch ?? defaults?.pitch ?? 1;
      utter.volume = opts?.volume ?? defaults?.volume ?? 1;

      const candidate = preferredVoice;
      if (candidate) utter.voice = candidate;

      utter.onstart = () => setSpeaking(true);
      utter.onend = () => {
        setSpeaking(false);
        currentUtter.current = null;
      };
      utter.onerror = () => {
        setSpeaking(false);
        currentUtter.current = null;
      };

      currentUtter.current = utter;
      window.speechSynthesis.speak(utter);
    },
    [supported, lang, preferredVoice, defaults?.rate, defaults?.pitch, defaults?.volume]
  );

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    currentUtter.current = null;
  }, [supported]);

  return { supported, speaking, voices, preferredVoice, speak, cancel };
}

/* ============================================================
   useSpeechRecognition — Swedish seller dictation
   ============================================================ */

export interface SttOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export interface SttApi {
  supported: boolean;
  listening: boolean;
  interim: string;
  finalTranscript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecognition(opts?: SttOptions): SttApi {
  const lang = opts?.lang || "sv-SE";
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = opts?.continuous ?? true;
    rec.interimResults = opts?.interimResults ?? true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setListening(true);
      setError(null);
    };
    rec.onend = () => {
      setListening(false);
    };
    rec.onerror = (e: SpeechRecognitionErrorEvt) => {
      setError(e.error || "unknown");
      setListening(false);
    };
    rec.onresult = (e: SpeechRecognitionEvt) => {
      let interimText = "";
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0].transcript;
        if (r.isFinal) finalText += text + " ";
        else interimText += text;
      }
      if (finalText) {
        setFinalTranscript((prev) => (prev + " " + finalText).trim());
        setInterim("");
      } else {
        setInterim(interimText);
      }
    };

    recognitionRef.current = rec;
    return () => {
      try {
        rec.abort();
      } catch {}
      recognitionRef.current = null;
    };
  }, [lang, opts?.continuous, opts?.interimResults]);

  const start = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec || listening) return;
    setError(null);
    setInterim("");
    try {
      rec.start();
    } catch (e: unknown) {
      // "already started" → ignore
      const err = e as { message?: string };
      if (err?.message && !/already started/i.test(err.message)) {
        setError(err.message);
      }
    }
  }, [listening]);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {}
  }, []);

  const reset = useCallback(() => {
    setInterim("");
    setFinalTranscript("");
    setError(null);
  }, []);

  return { supported, listening, interim, finalTranscript, error, start, stop, reset };
}
