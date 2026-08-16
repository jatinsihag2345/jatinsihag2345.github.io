import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

/**
 * Dictate instead of type.
 *
 * The Feynman box asks you to explain a solution "as if to your interviewer" — but in
 * the room you will be SAYING it, and spoken sentences fall apart in places typed ones
 * don't. This mic transcribes speech into the host's textarea so saying it counts as
 * writing it. Appends only, never replaces: dictation must not eat typed work.
 *
 * Uses the browser's SpeechRecognition (webkit-prefixed in Chrome). No support means
 * no button — an honest absence, not a dead control.
 */

interface VoiceDictationProps {
  /** Called once per FINALISED utterance; the host appends it to its own state. */
  onAppend: (finalText: string) => void;
  /** Names the destination for screen readers ("the explanation box"). */
  targetLabel: string;
}

// The lib.dom typings don't ship SpeechRecognition, so declare just the surface we
// touch — events stay loose because the two vendor implementations disagree anyway.
interface RecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
}
interface SpeechEventLike {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0?: { transcript?: string } }>;
}

const RecognitionCtor: (new () => RecognitionLike) | undefined =
  typeof window !== 'undefined'
    ? ((window as unknown as Record<string, new () => RecognitionLike>).SpeechRecognition ??
       (window as unknown as Record<string, new () => RecognitionLike>).webkitSpeechRecognition)
    : undefined;

const Dictation: React.FC<VoiceDictationProps> = ({ onAppend, targetLabel }) => {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [micError, setMicError] = useState('');
  const recRef = useRef<RecognitionLike | null>(null);
  // Refs so the long-lived recognizer always sees the freshest callback/flag without
  // being torn down and rebuilt on every host re-render.
  const appendRef = useRef(onAppend);
  const listeningRef = useRef(false);
  useEffect(() => {
    appendRef.current = onAppend;
  });

  const stop = () => {
    listeningRef.current = false;
    setListening(false);
    setInterim('');
    const rec = recRef.current;
    recRef.current = null;
    rec?.stop();
  };

  const start = () => {
    const rec = new RecognitionCtor!();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = e => {
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const transcript = String(r[0]?.transcript ?? '');
        if (r.isFinal) {
          // Finalised speech is handed up immediately; the host appends it, so a
          // mid-dictation crash loses at most the current phrase.
          if (transcript.trim()) appendRef.current(transcript.trim());
        } else {
          interimText += transcript;
        }
      }
      setInterim(interimText);
    };
    rec.onerror = e => {
      // Permission problems are terminal — auto-restarting would loop the prompt.
      if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed' || e?.error === 'audio-capture') {
        setMicError('Microphone unavailable or permission denied — typing still works.');
        stop();
      }
      // Chrome's recogniser is cloud-backed: offline it errors 'network', onend
      // fires, the re-arm restarts it, and the pair loops forever. Terminal too.
      if (e?.error === 'network') {
        setMicError('Speech recognition needs a connection — you look offline. Typing still works.');
        stop();
      }
      // 'no-speech' and friends: onend fires next and the re-arm below handles it.
    };
    rec.onend = () => {
      // Browsers end recognition after a few silent seconds. The learner asked for an
      // EXPLICIT stop, so re-arm until they give one (stop() clears the flag first).
      if (listeningRef.current && recRef.current === rec) {
        try {
          rec.start();
        } catch {
          /* engine already restarting — the next onend re-arms again */
        }
      }
    };
    recRef.current = rec;
    listeningRef.current = true;
    setMicError('');
    setListening(true);
    try {
      rec.start();
    } catch {
      stop();
    }
  };

  // A voice still transcribing into an unmounted box is worse than silence.
  useEffect(
    () => () => {
      listeningRef.current = false;
      recRef.current?.stop();
    },
    [],
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={listening ? stop : start}
        aria-label={listening ? `Stop dictating into ${targetLabel}` : `Dictate into ${targetLabel}`}
        aria-pressed={listening}
        title={listening ? 'Stop dictating' : 'Dictate — speech becomes text'}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer', flexShrink: 0,
          background: listening ? 'hsl(var(--hard) / 0.15)' : 'hsl(var(--bg-tertiary))',
          border: `1px solid ${listening ? 'hsl(var(--hard))' : 'hsl(var(--border-color))'}`,
          color: listening ? 'hsl(var(--hard))' : 'hsl(var(--text-secondary))',
        }}
      >
        {listening ? <MicOff size={14} /> : <Mic size={14} />}
      </button>
      {listening ? (
        // Interim words render muted and italic HERE, outside the textarea — only
        // finalised speech is committed, so the box never shows text that might
        // still be retracted by the recognizer.
        <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>
          {interim || 'Listening — speak your explanation…'}
        </span>
      ) : (
        <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
          {micError || 'Or say it out loud — the mic appends what you speak.'}
        </span>
      )}
    </div>
  );
};

/** Feature detection lives in the wrapper so the inner component can use hooks
 *  unconditionally. No SpeechRecognition → no button at all, as promised. */
export const VoiceDictation: React.FC<VoiceDictationProps> = props =>
  RecognitionCtor ? <Dictation {...props} /> : null;
