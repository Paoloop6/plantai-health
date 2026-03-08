import { useCallback, useRef, useState } from "react";

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.08) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
  }
}

export function useSound() {
  const [enabled, setEnabled] = useState(false);
  const toggledRef = useRef(false);

  const enable = useCallback(() => {
    if (!toggledRef.current) {
      try {
        getAudioContext();
        toggledRef.current = true;
        setEnabled(true);
      } catch {
      }
    }
  }, []);

  const playLeafRustle = useCallback(() => {
    if (!enabled) return;
    playTone(800, 0.08, "triangle", 0.04);
    setTimeout(() => playTone(600, 0.06, "triangle", 0.03), 30);
  }, [enabled]);

  const playPotTap = useCallback(() => {
    if (!enabled) return;
    playTone(200, 0.15, "sine", 0.1);
    setTimeout(() => playTone(180, 0.1, "sine", 0.06), 60);
  }, [enabled]);

  const playScanComplete = useCallback(() => {
    if (!enabled) return;
    playTone(523, 0.12, "sine", 0.12);
    setTimeout(() => playTone(659, 0.12, "sine", 0.1), 150);
    setTimeout(() => playTone(784, 0.2, "sine", 0.09), 300);
    setTimeout(() => playTone(1047, 0.3, "sine", 0.08), 500);
  }, [enabled]);

  const playWindGust = useCallback(() => {
    if (!enabled) return;
    playTone(120, 0.3, "sawtooth", 0.05);
    setTimeout(() => playTone(80, 0.2, "sawtooth", 0.03), 150);
  }, [enabled]);

  const toggle = useCallback(() => {
    if (!enabled) enable();
    setEnabled(prev => !prev);
  }, [enabled, enable]);

  return {
    enabled,
    toggle,
    enable,
    playLeafRustle,
    playPotTap,
    playScanComplete,
    playWindGust,
  };
}
