"use client";

import { useEffect, useRef } from "react";
import { getBoxRewardVisualMeta } from "@/lib/gacha-box-reward";
import { useRollAudio } from "@/lib/use-roll-audio";
import type {
  CommonBoxAudioCue,
  CommonBoxPhase,
} from "./common-box-palette";
import type { CommonBoxEngine } from "./common-box-engine";

export interface CommonBoxSceneProps {
  reward: Record<string, unknown> | null;
  error: string;
  skipRequested: boolean;
  initialAmbient: boolean;
  onPhaseChange: (phase: CommonBoxPhase) => void;
  onComplete: () => void;
  onWebGLUnavailable: () => void;
}

export function CommonBoxScene({
  reward,
  error,
  skipRequested,
  initialAmbient,
  onPhaseChange,
  onComplete,
  onWebGLUnavailable,
}: CommonBoxSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CommonBoxEngine | null>(null);
  const { sfx } = useRollAudio();

  const playCue = (cue: CommonBoxAudioCue) => {
    if (cue === "charge") {
      sfx.charge(0.42);
    } else if (cue === "unlock") {
      sfx.impact(0.55);
    } else if (cue === "reveal") {
      const activeReward = initialPropsRef.current.reward;
      const meta = activeReward ? getBoxRewardVisualMeta(activeReward) : null;
      const key = meta?.rarityKey ?? "";
      if (meta?.isDuplicateComp) {
        sfx.dupe();
      } else if (
        key === "GALACTICA" ||
        key === "GALACTIC" ||
        key === "LENDARIA" ||
        key === "LEGENDARY"
      ) {
        sfx.galacticChime();
      } else {
        sfx.chime(0.45);
      }
    }
  };

  const callbacksRef = useRef({
    onPhaseChange,
    onComplete,
    onWebGLUnavailable,
    playCue,
  });
  callbacksRef.current = {
    onPhaseChange,
    onComplete,
    onWebGLUnavailable,
    playCue,
  };

  const initialPropsRef = useRef({ reward, error, skipRequested, initialAmbient });
  initialPropsRef.current = { reward, error, skipRequested, initialAmbient };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let localEngine: CommonBoxEngine | null = null;

    void import("./common-box-engine")
      .then(({ createCommonBoxEngine, detectWebGLSupport }) => {
        if (cancelled) return;
        if (!detectWebGLSupport()) {
          callbacksRef.current.onWebGLUnavailable();
          return;
        }
        const snap = initialPropsRef.current;
        localEngine = createCommonBoxEngine(host, {
          initialReward: snap.reward,
          initialAmbient: snap.initialAmbient,
          onPhaseChange: (phase) => callbacksRef.current.onPhaseChange(phase),
          onComplete: () => callbacksRef.current.onComplete(),
          onWebGLUnavailable: () => callbacksRef.current.onWebGLUnavailable(),
          onAudioCue: (cue) => callbacksRef.current.playCue(cue),
        });
        engineRef.current = localEngine;
        if (snap.error) {
          localEngine.setError();
        } else if (snap.skipRequested && snap.reward) {
          localEngine.skipToAmbient();
        }
      })
      .catch(() => {
        if (!cancelled) {
          callbacksRef.current.onWebGLUnavailable();
        }
      });

    return () => {
      cancelled = true;
      localEngine?.dispose();
      if (engineRef.current === localEngine) {
        engineRef.current = null;
      }
      sfx.silence();
    };
  }, [sfx]);

  useEffect(() => {
    if (reward) {
      engineRef.current?.setReward(reward);
    }
  }, [reward]);

  useEffect(() => {
    if (error) {
      engineRef.current?.setError();
    }
  }, [error]);

  useEffect(() => {
    if (skipRequested && reward) {
      engineRef.current?.skipToAmbient();
    }
  }, [skipRequested, reward]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="common-box-webgl-stage"
    />
  );
}
