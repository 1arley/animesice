"use client";

import { useEffect, useRef } from "react";
import { getBoxRewardVisualMeta } from "@/lib/gacha-box-reward";
import { useRollAudio } from "@/lib/use-roll-audio";
import type { CommonBoxPhase } from "../common-box/common-box-palette";
import type {
  PremiumOrRareTier,
  TierBoxAudioCue,
} from "./tier-box-config";
import type { TierBoxEngine } from "./tier-box-engine";

export interface TierBoxSceneProps {
  tier: PremiumOrRareTier;
  reward: Record<string, unknown> | null;
  error: string;
  skipRequested: boolean;
  initialAmbient: boolean;
  onPhaseChange: (phase: CommonBoxPhase) => void;
  onComplete: () => void;
  onWebGLUnavailable: () => void;
}

export function TierBoxScene({
  tier,
  reward,
  error,
  skipRequested,
  initialAmbient,
  onPhaseChange,
  onComplete,
  onWebGLUnavailable,
}: TierBoxSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<TierBoxEngine | null>(null);
  const { sfx } = useRollAudio();

  const playCue = (cue: TierBoxAudioCue) => {
    const isRare = initialPropsRef.current.tier === "RARE";
    if (cue === "charge") {
      sfx.charge(isRare ? 0.55 : 0.75);
    } else if (cue === "lockTick1") {
      sfx.tick(isRare ? 2 : 0);
    } else if (cue === "lockTick2") {
      sfx.tick(3);
    } else if (cue === "unlock") {
      sfx.impact(isRare ? 0.75 : 0.95);
    } else if (cue === "reveal") {
      const activeReward = initialPropsRef.current.reward;
      const meta = activeReward ? getBoxRewardVisualMeta(activeReward) : null;
      const key = meta?.rarityKey ?? "";
      if (meta?.isDuplicateComp) {
        sfx.dupe();
      } else if (
        key === "GALACTICA" ||
        key === "GALACTIC" ||
        key === "MITICA" ||
        key === "MYTHIC" ||
        key === "LENDARIA" ||
        key === "LEGENDARY" ||
        (!isRare && (key === "EPICA" || key === "EPIC"))
      ) {
        sfx.galacticChime();
      } else {
        sfx.chime(isRare ? 0.72 : 0.9);
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

  const initialPropsRef = useRef({
    tier,
    reward,
    error,
    skipRequested,
    initialAmbient,
  });
  initialPropsRef.current = { tier, reward, error, skipRequested, initialAmbient };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let localEngine: TierBoxEngine | null = null;

    void import("./tier-box-engine")
      .then(({ createTierBoxEngine, detectWebGLSupport }) => {
        if (cancelled) return;
        if (!detectWebGLSupport()) {
          callbacksRef.current.onWebGLUnavailable();
          return;
        }
        const snap = initialPropsRef.current;
        localEngine = createTierBoxEngine(host, {
          tier: snap.tier,
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
  }, [sfx, tier]);

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
