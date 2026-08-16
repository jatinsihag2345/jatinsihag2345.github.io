import React, { useEffect, useState } from 'react';
import { Square, Volume2 } from 'lucide-react';

interface ReadAloudProps {
  /** Read verbatim — pass prose, not markup. */
  text: string;
  /** Names what is being read, for screen readers ("Read the problem statement aloud"). */
  label: string;
}

/**
 * Listen instead of read. Hearing a problem statement while your eyes stay on the
 * examples is closer to how interviews actually deliver problems — someone talks,
 * you scan. Uses the browser's built-in SpeechSynthesis, so nothing is downloaded
 * and unsupported browsers simply never see the button.
 */
export const ReadAloud: React.FC<ReadAloudProps> = ({ text, label }) => {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // The viewer swaps problems while this stays mounted — a voice still reading the
  // PREVIOUS problem over the new page is worse than silence.
  useEffect(() => {
    if (!supported) return;
    return () => {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    };
  }, [text, supported]);

  // Chrome silently pauses long utterances after ~15s of continuous speech; a
  // periodic resume() is the accepted workaround and a no-op everywhere else.
  useEffect(() => {
    if (!speaking) return;
    const keepAlive = window.setInterval(() => window.speechSynthesis.resume(), 10_000);
    return () => window.clearInterval(keepAlive);
  }, [speaking]);

  if (!supported) return null;

  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const start = () => {
    window.speechSynthesis.cancel(); // never layer two readings
    const utterance = new SpeechSynthesisUtterance(text);
    // Slightly under full speed: technical prose full of variable names needs the gap.
    utterance.rate = 0.95;
    // Prefer an English voice (the content is English), letting the platform default
    // win ties. getVoices() can legitimately be empty before the async voice list
    // loads — then the engine's own default reads, which is the right fallback.
    const voices = window.speechSynthesis.getVoices();
    const enVoice =
      voices.find(v => v.lang.startsWith('en') && v.default) ??
      voices.find(v => v.lang.startsWith('en'));
    if (enVoice) utterance.voice = enVoice;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  return (
    <button
      type="button"
      className="read-aloud"
      onClick={speaking ? stop : start}
      aria-label={speaking ? `Stop reading ${label}` : `Read ${label} aloud`}
      aria-pressed={speaking}
      title={speaking ? 'Stop reading' : 'Read aloud'}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer',
        flexShrink: 0,
        background: speaking ? 'hsl(var(--secondary) / 0.15)' : 'hsl(var(--bg-tertiary))',
        border: `1px solid ${speaking ? 'hsl(var(--secondary))' : 'hsl(var(--border-color))'}`,
        color: speaking ? 'hsl(var(--secondary))' : 'hsl(var(--text-secondary))',
      }}
    >
      {speaking ? <Square size={13} /> : <Volume2 size={14} />}
    </button>
  );
};
