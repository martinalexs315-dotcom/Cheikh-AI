import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Check, Mic, MicOff, AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceRecorderProps {
  isRecording: boolean;
  onStart: () => void;
  onCancel: () => void;
  onConfirm: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({
  isRecording,
  onStart,
  onCancel,
  onConfirm,
  disabled = false
}: VoiceRecorderProps) {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>([2, 4, 3, 6, 8, 5, 10, 7, 4, 2]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef<boolean>(false);
  const finalTranscriptAccumulatorRef = useRef<string>('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  isRecordingRef.current = isRecording;

  // Initialisation et gestion de la reconnaissance vocale
  useEffect(() => {
    if (!isRecording) {
      cleanupAudio();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage("La reconnaissance vocale n'est pas supportée par ce navigateur.");
      return;
    }

    finalTranscriptAccumulatorRef.current = '';
    setTranscript('');
    setErrorMessage(null);

    let recognition: any = null;
    try {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'fr-FR';
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let newlyFinal = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            newlyFinal += res[0].transcript + ' ';
          } else {
            interim += res[0].transcript;
          }
        }

        if (newlyFinal) {
          finalTranscriptAccumulatorRef.current += newlyFinal;
        }

        const fullText = (finalTranscriptAccumulatorRef.current + interim).trim();
        setTranscript(fullText);
      };

      recognition.onerror = (event: any) => {
        console.warn("[VoiceRecorder] Speech recognition error:", event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage("Accès au micro refusé. Veuillez autoriser le microphone.");
        }
      };

      // Crucial : Si le navigateur coupe la reconnaissance après un temps de silence,
      // on redémarre immédiatement tant que l'utilisateur n'a pas cliqué sur la croix ou le "v".
      recognition.onend = () => {
        if (isRecordingRef.current) {
          try {
            recognition.start();
          } catch (e) {
            // Ignorer si déjà en cours
          }
        } else {
          setIsListening(false);
        }
      };

      recognition.start();
    } catch (err: any) {
      console.error("[VoiceRecorder] Impossible de démarrer la reconnaissance:", err);
      setErrorMessage("Impossible d'accéder à la reconnaissance vocale.");
    }

    // Gestion du flux audio et des barres d'égaliseur dynamiques
    startAudioVisualizer();

    return () => {
      cleanupAudio();
    };
  }, [isRecording]);

  const startAudioVisualizer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioContext = new AudioCtx();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateWaveform = () => {
        if (!isRecordingRef.current) return;

        analyser.getByteFrequencyData(dataArray);
        
        // Extraire 10 points de fréquence pour animer les barres
        const barsCount = 10;
        const step = Math.floor(bufferLength / barsCount);
        const newLevels: number[] = [];

        for (let i = 0; i < barsCount; i++) {
          const val = dataArray[i * step] || 0;
          // Hauteur entre 2px et 20px
          const normalized = Math.max(2, Math.min(22, Math.floor((val / 255) * 22)));
          newLevels.push(normalized);
        }

        setAudioLevels(newLevels);
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };

      updateWaveform();
    } catch (err) {
      console.warn("[VoiceRecorder] Audio visualizer non disponible, utilisation de l'animation par défaut:", err);
      // Fallback : onde animée aléatoire douce
      const fallbackInterval = setInterval(() => {
        if (!isRecordingRef.current) {
          clearInterval(fallbackInterval);
          return;
        }
        setAudioLevels(() => 
          Array.from({ length: 10 }, () => Math.floor(Math.random() * 16) + 3)
        );
      }, 100);
    }
  };

  const cleanupAudio = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    setIsListening(false);
  };

  const handleCancel = () => {
    cleanupAudio();
    onCancel();
  };

  const handleConfirm = () => {
    const textToSend = (transcript || finalTranscriptAccumulatorRef.current).trim();
    cleanupAudio();
    onConfirm(textToSend);
  };

  if (!isRecording) {
    return (
      <button
        type="button"
        onClick={onStart}
        disabled={disabled}
        title="Enregistrement vocal"
        className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors active:scale-95 disabled:opacity-40 cursor-pointer"
      >
        <Mic className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="w-full flex items-center justify-between min-h-[52px] px-3.5 sm:px-4 py-2 bg-white dark:bg-zinc-900/90 rounded-3xl transition-all">
      {/* Bouton Plus à gauche comme dans la photo */}
      <div className="flex items-center shrink-0 pr-2 sm:pr-3">
        <button
          type="button"
          disabled
          title="Ajouter"
          className="p-1.5 text-zinc-400 dark:text-zinc-500 rounded-lg cursor-default"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Texte en italique au centre : transcription en temps réel */}
      <div className="flex-1 min-w-0 px-1 sm:px-2 overflow-hidden">
        {errorMessage ? (
          <div className="flex items-center gap-1.5 text-red-500 text-xs sm:text-sm truncate">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : transcript.trim() ? (
          <p className="italic text-[14.5px] sm:text-[15px] text-zinc-800 dark:text-zinc-200 truncate select-none leading-tight">
            {transcript}
          </p>
        ) : (
          <p className="italic text-[13.5px] sm:text-[14.5px] text-zinc-400 dark:text-zinc-500 truncate select-none leading-tight animate-pulse">
            Prenez votre temps pour parler...
          </p>
        )}
      </div>

      {/* Partie droite : Égaliseur audio (points + barres) + Croix [✕] + Validation [✓] */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 pl-2">
        {/* Visualiseur d'ondes sonores (points suivis de barres verticales comme sur la photo) */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-1">
          {/* Petits points discrets avant les barres (comme sur la capture) */}
          <div className="hidden xs:flex items-center gap-0.5 text-zinc-300 dark:text-zinc-700 tracking-widest text-xs select-none">
            ····
          </div>

          {/* Barres verticales oscillantes de l'égaliseur sonore */}
          <div className="flex items-center gap-[2.5px] sm:gap-[3px] h-6">
            {audioLevels.map((lvl, index) => (
              <span
                key={index}
                className="w-[2.5px] sm:w-[3px] bg-zinc-700 dark:bg-zinc-300 rounded-full transition-all duration-75 ease-out"
                style={{
                  height: `${Math.max(3, lvl)}px`,
                  opacity: 0.5 + (lvl / 24) * 0.5
                }}
              />
            ))}
          </div>
        </div>

        {/* Bouton Croix [X] pour annuler */}
        <button
          type="button"
          onClick={handleCancel}
          title="Annuler le vocal"
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer shadow-xs"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Bouton Validation [V / Checkmark] pour valider et arrêter */}
        <button
          type="button"
          onClick={handleConfirm}
          title="Valider et insérer"
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer shadow-xs"
        >
          <Check className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
