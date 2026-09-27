// src/components/AlertSound.jsx

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'terrassafe_alarm_armed';

export default function AlertSound({
  level = 'normal',
  acknowledged = false,
}) {
  const audioContextRef = useRef(null);
  const intervalRef = useRef(null);

  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [muted, setMuted] = useState(false);

  const getAudioContext = useCallback(() => {
    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContext) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    return audioContextRef.current;
  }, []);

  const stopAlarm = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /*
   * Strong emergency siren for CRITICAL.
   *
   * Two oscillators sweep up/down at different
   * frequencies so the danger sound is clearly
   * different from warning/high alerts.
   */
  const playEmergencySiren = useCallback(() => {
    if (!enabled || muted || acknowledged) return;

    const context = getAudioContext();
    if (!context) return;

    if (context.state === 'suspended') {
      context.resume().catch(() => {});
    }

    const now = context.currentTime;

    const createSirenOscillator = (
      type,
      startFrequency,
      peakFrequency,
      volume
    ) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = type;
      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.frequency.setValueAtTime(
        startFrequency,
        now
      );

      oscillator.frequency.linearRampToValueAtTime(
        peakFrequency,
        now + 0.23
      );

      oscillator.frequency.linearRampToValueAtTime(
        startFrequency,
        now + 0.46
      );

      gain.gain.setValueAtTime(
        0.0001,
        now
      );

      gain.gain.exponentialRampToValueAtTime(
        volume,
        now + 0.025
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + 0.49
      );

      oscillator.start(now);
      oscillator.stop(now + 0.52);
    };

    createSirenOscillator(
      'sawtooth',
      600,
      1200,
      0.30
    );

    createSirenOscillator(
      'square',
      900,
      1500,
      0.16
    );
  }, [
    acknowledged,
    enabled,
    getAudioContext,
    muted,
  ]);

  const playAlertBeep = useCallback(
    (beepLevel) => {
      if (!enabled || muted || acknowledged) return;

      const context = getAudioContext();
      if (!context) return;

      if (context.state === 'suspended') {
        context.resume().catch(() => {});
      }

      const oscillator =
        context.createOscillator();

      const gain =
        context.createGain();

      oscillator.connect(gain);
      gain.connect(context.destination);

      const frequency =
        beepLevel === 'high'
          ? 850
          : 650;

      oscillator.type =
        beepLevel === 'high'
          ? 'square'
          : 'sine';

      oscillator.frequency.value = frequency;

      gain.gain.setValueAtTime(
        0.0001,
        context.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        beepLevel === 'high'
          ? 0.20
          : 0.14,
        context.currentTime + 0.02
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime + 0.25
      );

      oscillator.start();

      oscillator.stop(
        context.currentTime + 0.3
      );
    },
    [
      acknowledged,
      enabled,
      getAudioContext,
      muted,
    ]
  );

  const enableSound = async () => {
    const context = getAudioContext();

    if (!context) return;

    try {
      if (context.state === 'suspended') {
        await context.resume();
      }

      localStorage.setItem(
        STORAGE_KEY,
        'true'
      );

      setEnabled(true);

      // Short confirmation sound.
      const oscillator =
        context.createOscillator();

      const gain =
        context.createGain();

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.type = 'sine';
      oscillator.frequency.value = 600;

      gain.gain.setValueAtTime(
        0.0001,
        context.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.16,
        context.currentTime + 0.02
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime + 0.2
      );

      oscillator.start();
      oscillator.stop(
        context.currentTime + 0.25
      );
    } catch (error) {
      console.error(
        'Unable to enable alarm audio:',
        error
      );
    }
  };

  const disarmSound = () => {
    stopAlarm();

    try {
      localStorage.removeItem(
        STORAGE_KEY
      );
    } catch {
      // Ignore storage errors.
    }

    setEnabled(false);
  };

  /*
   * Automatically run the appropriate alarm
   * whenever the current risk level changes.
   */
  useEffect(() => {
    stopAlarm();

    if (
      !enabled ||
      muted ||
      acknowledged ||
      level === 'normal'
    ) {
      return undefined;
    }

    if (level === 'critical') {
      playEmergencySiren();

      intervalRef.current =
        setInterval(() => {
          playEmergencySiren();
        }, 650);
    } else {
      const interval =
        level === 'high'
          ? 800
          : 1400;

      playAlertBeep(level);

      intervalRef.current =
        setInterval(() => {
          playAlertBeep(level);
        }, interval);
    }

    return stopAlarm;
  }, [
    level,
    enabled,
    muted,
    acknowledged,
    playEmergencySiren,
    playAlertBeep,
    stopAlarm,
  ]);

  /*
   * If the browser restored the armed state from
   * localStorage, try to resume the audio context.
   *
   * Browser autoplay policy can still keep audio
   * suspended until the user interacts with the page.
   */
  useEffect(() => {
    if (!enabled) return;

    const resumeAudio = () => {
      const context =
        audioContextRef.current;

      if (
        context &&
        context.state === 'suspended'
      ) {
        context.resume().catch(() => {});
      }
    };

    window.addEventListener(
      'pointerdown',
      resumeAudio,
      { once: true }
    );

    window.addEventListener(
      'keydown',
      resumeAudio,
      { once: true }
    );

    return () => {
      window.removeEventListener(
        'pointerdown',
        resumeAudio
      );

      window.removeEventListener(
        'keydown',
        resumeAudio
      );
    };
  }, [enabled]);

  useEffect(() => {
    return () => {
      stopAlarm();

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [stopAlarm]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      {!enabled ? (
        <button
          type="button"
          onClick={enableSound}
          style={{
            padding: '7px 12px',
            borderRadius:
              'var(--radius-sm)',
            border:
              '1px solid var(--border)',
            background:
              'var(--bg-secondary)',
            color:
              'var(--text-primary)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          🔊 ARM ALARM SYSTEM
        </button>
      ) : (
        <>
          <span
            style={{
              padding: '7px 10px',
              borderRadius:
                'var(--radius-sm)',
              border:
                '1px solid var(--status-normal)',
              background:
                'var(--status-normal-bg)',
              color:
                'var(--status-normal)',
              fontFamily:
                "'IBM Plex Mono', monospace",
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            🔊 ALARM ARMED
          </span>

          <button
            type="button"
            onClick={() =>
              setMuted((value) => !value)
            }
            style={{
              padding: '7px 12px',
              borderRadius:
                'var(--radius-sm)',
              border:
                '1px solid var(--border)',
              background:
                muted
                  ? 'var(--status-high-bg)'
                  : 'var(--bg-secondary)',
              color:
                muted
                  ? 'var(--status-high)'
                  : 'var(--text-primary)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.75rem',
              fontWeight: 500,
            }}
          >
            {muted
              ? '🔇 Alarm Muted'
              : '🔊 Mute Alarm'}
          </button>

          <button
            type="button"
            onClick={disarmSound}
            style={{
              padding: '7px 10px',
              borderRadius:
                'var(--radius-sm)',
              border:
                '1px solid var(--border)',
              background:
                'transparent',
              color:
                'var(--text-muted)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.7rem',
            }}
          >
            Disarm
          </button>

          {level !== 'normal' && (
            <span
              style={{
                fontSize: '0.72rem',
                fontFamily:
                  "'IBM Plex Mono', monospace",
                color:
                  level === 'critical'
                    ? 'var(--status-high)'
                    : level === 'high'
                      ? 'var(--status-high)'
                      : 'var(--status-warning)',
                fontWeight: 700,
              }}
            >
              {level === 'critical'
                ? '🚨 DANGER ALARM'
                : `${level.toUpperCase()} ALARM`}
            </span>
          )}
        </>
      )}
    </div>
  );
}
