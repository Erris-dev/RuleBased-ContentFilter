import { useEffect, useRef, useState } from 'react';

import { api } from '@/api';
import type { ProcessResult, Rule } from '@/types';

/** Debounce before processing. Long enough to skip mid-word, short enough to feel live. */
const DEBOUNCE_MS = 250;

const EMPTY: ProcessResult = { segments: [], summary: [] };

/**
 * Processes text as it is typed (plan §8.5).
 *
 * Three things make this feel instant rather than laggy:
 *  - a debounce, so a fast typist does not queue a request per keystroke
 *  - a request counter, so a slow response can never overwrite a newer one
 *  - keeping the previous result on screen while the next is in flight, because
 *    blanking the panel between keystrokes reads as broken
 */
export const useProcessedText = (text: string, rules: Rule[], draftRule: Rule | null) => {
  const [result, setResult] = useState<ProcessResult>(EMPTY);
  const [isProcessing, setIsProcessing] = useState(false);

  /** Bumped per request; a response is applied only if it is still the latest. */
  const latest = useRef(0);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!text.trim()) {
      setResult(EMPTY);
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    const requestId = (latest.current += 1);

    const timer = setTimeout(() => {
      void api
        .processText(text, draftRule)
        .then((next) => {
          if (requestId !== latest.current) return; // superseded
          setResult(next);
        })
        .catch(() => {
          if (requestId !== latest.current) return;
          setResult(EMPTY);
        })
        .finally(() => {
          if (requestId === latest.current) setIsProcessing(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // `rules` participates because saving, toggling or deleting a rule must
    // re-process; `nonce` lets the Ctrl+Enter shortcut force a run.
  }, [text, rules, draftRule, nonce]);

  return { ...result, isProcessing, processNow: () => setNonce((n) => n + 1) };
};
