import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ChevronDown, ExternalLink, Guitar, Info, Link2, Maximize2,
  Mic2, Pause, Play, Settings, SlidersHorizontal, Volume2, Waves, X
} from 'lucide-react';
import {
  PitchStabilizer, closestTarget, midiToFrequency, midiToNote, nearestNote,
  noteToMidi, presetName, presetsForInstrument, resolveOctaveAgainstTargets,
  type AccidentalPreference, type InstrumentId, type StringTarget, type TuningPreset
} from '@nesttuner/core';
import {
  ReferenceTone, TunerAudioSession, UnsupportedAudioCaptureError,
  type AnalysisResult, type AudioInputDevice, type AudioSessionDiagnostics
} from '@nesttuner/audio';
import { COPY, type TunerLocale } from './copy';
import { CertificationPanel } from './CertificationPanel';

type Mode = 'chromatic' | 'fine';
type CaptureState = 'idle' | 'starting' | 'running' | 'paused' | 'blocked' | 'unsupported';

type Props = {
  locale: TunerLocale;
  embedded?: boolean;
  onBack?: () => void;
  assetBaseUrl?: string;
};

const INSTRUMENTS: InstrumentId[] = [
  'guitar', 'acoustic', 'bass', 'ukulele', 'violin', 'viola', 'cello', 'cavaquinho'
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function noteDisplay(note: string) {
  return note.replace('#', '♯').replace('b', '♭');
}

function formatHz(value: number, locale: TunerLocale) {
  return value.toLocaleString(locale === 'pt-BR' ? 'pt-BR' : locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatCents(value: number, locale: TunerLocale) {
  return new Intl.NumberFormat(locale === 'pt-BR' ? 'pt-BR' : locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: 'always'
  }).format(value);
}

function formatMs(value: number | null | undefined, locale: TunerLocale) {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toLocaleString(locale === 'pt-BR' ? 'pt-BR' : locale, {
    maximumFractionDigits: 1
  }) + ' ms';
}

function instrumentLabel(id: InstrumentId, copy: Record<string, string>) {
  return copy[id] ?? id;
}

function processingActive(diagnostics: AudioSessionDiagnostics | null) {
  const settings = diagnostics?.trackSettings;
  return Boolean(settings?.autoGainControl || settings?.echoCancellation || settings?.noiseSuppression);
}

function PitchTrace({
  history,
  range,
  label
}: {
  history: number[];
  range: number;
  label: string;
}) {
  const path = useMemo(() => {
    if (history.length < 2) return '';
    return history.map((value, index) => {
      const x = (index / Math.max(1, history.length - 1)) * 100;
      const y = 50 - clamp(value / Math.max(1, range), -1, 1) * 44;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');
  }, [history, range]);

  return (
    <div className="pitch-trace" aria-label={label}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" x2="100" y1="50" y2="50" className="trace-center" />
        {path && <path d={path} className="trace-line" />}
      </svg>
    </div>
  );
}

function Metric({
  label,
  value,
  percent,
  state = 'neutral'
}: {
  label: string;
  value: string;
  percent: number;
  state?: 'neutral' | 'good' | 'warn';
}) {
  return (
    <div className={'live-metric ' + state}>
      <div className="live-metric-head"><span>{label}</span><b>{value}</b></div>
      <div className="live-meter"><i style={{ width: clamp(percent, 0, 100) + '%' }} /></div>
    </div>
  );
}

export function NestTuner({ locale, embedded = false, onBack, assetBaseUrl }: Props) {
  const copy = COPY[locale] as Record<keyof typeof COPY['pt-BR'], string>;
  const [instrument, setInstrument] = useState<InstrumentId>('guitar');
  const presets = useMemo(() => presetsForInstrument(instrument), [instrument]);
  const [presetId, setPresetId] = useState('guitar-standard');
  const [customMidis, setCustomMidis] = useState<number[]>([40, 45, 50, 55, 59, 64]);
  const [customOffsets, setCustomOffsets] = useState<number[]>([0, 0, 0, 0, 0, 0]);

  const [mode, setMode] = useState<Mode>('chromatic');
  const [auto, setAuto] = useState(true);
  const [lockedTarget, setLockedTarget] = useState<StringTarget | null>(null);
  const [a4, setA4] = useState(440);
  const [offset, setOffset] = useState(0);
  const [accidental, setAccidental] = useState<AccidentalPreference>('sharp');
  const [captureState, setCaptureState] = useState<CaptureState>('idle');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [stableFrequency, setStableFrequency] = useState<number | null>(null);
  const [stable, setStable] = useState(false);
  const [spreadCents, setSpreadCents] = useState(100);
  const [devices, setDevices] = useState<AudioInputDevice[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [diagnostics, setDiagnostics] = useState<AudioSessionDiagnostics | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [toneActive, setToneActive] = useState(false);
  const [stage, setStage] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pitchHistory, setPitchHistory] = useState<number[]>([]);
  const [announcedStatus, setAnnouncedStatus] = useState('');

  const customPreset = useMemo<TuningPreset>(() => {
    const notes = customMidis.map((midi) => midiToNote(midi, accidental));
    return {
      id: 'custom',
      instrument,
      namePt: copy.customTuning,
      nameEn: copy.customTuning,
      nameEs: copy.customTuning,
      short: notes.map((note) => note.name).join(''),
      strings: customMidis.map((midi, index) => ({
        id: String(customMidis.length - index),
        note: midiToNote(midi, accidental).label,
        midi,
        offsetCents: customOffsets[index] ?? 0
      }))
    };
  }, [customMidis, customOffsets, accidental, instrument, copy.customTuning]);

  const preset = presetId === 'custom'
    ? customPreset
    : presets.find((item) => item.id === presetId) ?? presets[0];

  const audio = useRef(new TunerAudioSession(assetBaseUrl));
  const lastUiAnalysisAt = useRef(0);
  const lastGoodAt = useRef(0);
  const resumeAfterTone = useRef(false);
  const tone = useRef(new ReferenceTone());
  const stabilizer = useRef(new PitchStabilizer());

  useEffect(() => {
    const saved = localStorage.getItem('nesttuner:prefs:v2');
    if (!saved) return;
    try {
      const prefs = JSON.parse(saved) as Partial<{
        instrument: InstrumentId;
        presetId: string;
        mode: Mode;
        a4: number;
        accidental: AccidentalPreference;
        customMidis: number[];
        customOffsets: number[];
      }>;
      if (prefs.instrument && INSTRUMENTS.includes(prefs.instrument)) setInstrument(prefs.instrument);
      if (prefs.presetId) setPresetId(prefs.presetId);
      if (prefs.mode) setMode(prefs.mode);
      if (prefs.a4 && prefs.a4 >= 400 && prefs.a4 <= 480) setA4(prefs.a4);
      if (prefs.accidental === 'flat' || prefs.accidental === 'sharp') setAccidental(prefs.accidental);
      if (
        Array.isArray(prefs.customMidis) &&
        prefs.customMidis.length >= 1 &&
        prefs.customMidis.length <= 12 &&
        prefs.customMidis.every((midi) => Number.isInteger(midi) && midi >= 23 && midi <= 96)
      ) {
        setCustomMidis(prefs.customMidis);
        if (
          Array.isArray(prefs.customOffsets) &&
          prefs.customOffsets.length === prefs.customMidis.length &&
          prefs.customOffsets.every((value) => Number.isFinite(value) && value >= -50 && value <= 50)
        ) {
          setCustomOffsets(prefs.customOffsets);
        } else {
          setCustomOffsets(prefs.customMidis.map(() => 0));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(
      'nesttuner:prefs:v2',
      JSON.stringify({ instrument, presetId, mode, a4, accidental, customMidis, customOffsets })
    );
  }, [instrument, presetId, mode, a4, accidental, customMidis, customOffsets]);

  useEffect(() => {
    if (presetId !== 'custom' && !presets.some((item) => item.id === presetId)) {
      setPresetId(presets[0]?.id ?? '');
      setLockedTarget(null);
      setAuto(true);
    }
  }, [presets, presetId]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && captureState === 'running') {
        void audio.current.stop();
        setCaptureState('paused');
        setStable(false);
        setStableFrequency(null);
        setSpreadCents(100);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [captureState]);

  useEffect(() => {
    if (!navigator.mediaDevices?.addEventListener) return;
    const refresh = () => {
      if (captureState === 'running') {
        void audio.current.listInputs().then(setDevices).catch(() => undefined);
      }
    };
    navigator.mediaDevices.addEventListener('devicechange', refresh);
    return () => navigator.mediaDevices.removeEventListener('devicechange', refresh);
  }, [captureState]);

  useEffect(() => () => {
    void tone.current.dispose();
    void audio.current.stop();
  }, []);

  useEffect(() => {
    if (!stage) return;
    let wakeLock: { release: () => Promise<void> } | null = null;
    const request = async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
        };
        wakeLock = await nav.wakeLock?.request('screen') ?? null;
      } catch {}
    };
    void request();
    return () => { void wakeLock?.release(); };
  }, [stage]);

  const onAnalysis = (result: AnalysisResult) => {
    const now = performance.now();
    if (now - lastUiAnalysisAt.current < 50) return;
    lastUiAnalysisAt.current = now;
    setAnalysis(result);

    if (result.status !== 'ok') {
      const age = now - lastGoodAt.current;
      if (age > 320) setStable(false);
      if (age > 900) {
        stabilizer.current.reset();
        setStableFrequency(null);
        setSpreadCents(100);
      }
      return;
    }

    lastGoodAt.current = now;
    const stabilized = stabilizer.current.push(result);
    if (stabilized) {
      setStable(stabilized.stable);
      setStableFrequency(stabilized.frequency);
      setSpreadCents(stabilized.spreadCents);
    }
  };

  const start = async (nextDeviceId = deviceId) => {
    if (!TunerAudioSession.isSupported()) {
      setCaptureState('unsupported');
      return;
    }

    setCaptureState('starting');
    setAnalysis(null);
    setPitchHistory([]);
    setDiagnostics(null);
    stabilizer.current.reset();
    lastGoodAt.current = 0;

    try {
      await audio.current.start(
        onAnalysis,
        nextDeviceId || undefined,
        () => {
          stabilizer.current.reset();
          setStable(false);
          setStableFrequency(null);
          setSpreadCents(100);
          setCaptureState('paused');
        }
      );
      setCaptureState('running');
      setDiagnostics(audio.current.getDiagnostics());
      setDevices(await audio.current.listInputs());
    } catch (error) {
      setCaptureState(error instanceof UnsupportedAudioCaptureError ? 'unsupported' : 'blocked');
    }
  };

  const togglePause = async () => {
    if (captureState === 'running') {
      await audio.current.stop();
      stabilizer.current.reset();
      setStable(false);
      setStableFrequency(null);
      setSpreadCents(100);
      setCaptureState('paused');
      return;
    }
    await start();
  };

  const effectiveA4 = a4 * Math.pow(2, offset / 1200);
  const detectedFrequency = stableFrequency ?? (analysis?.status === 'ok' ? analysis.frequency : null);
  const targetHints = !auto && lockedTarget ? [lockedTarget] : preset?.strings ?? [];
  const measuredFrequency = detectedFrequency
    ? resolveOctaveAgainstTargets(detectedFrequency, targetHints, effectiveA4)
    : null;

  const closestString = measuredFrequency && preset
    ? closestTarget(measuredFrequency, preset.strings, effectiveA4)
    : null;

  const currentTarget = auto ? closestString?.target ?? null : lockedTarget;
  const chromatic = measuredFrequency ? nearestNote(measuredFrequency, effectiveA4, accidental) : null;
  const targetFrequency = currentTarget
    ? midiToFrequency(currentTarget.midi, a4, offset + (currentTarget.offsetCents ?? 0))
    : chromatic?.target ?? null;

  const cents = measuredFrequency && targetFrequency
    ? 1200 * Math.log2(measuredFrequency / targetFrequency)
    : 0;

  const displayMidi = currentTarget?.midi ?? chromatic?.midi ?? null;
  const displayNote = displayMidi == null ? null : midiToNote(displayMidi, accidental);
  const highlighted = auto && analysis?.status === 'ok' ? closestString?.target.id : lockedTarget?.id;

  const signalState = analysis?.status === 'clipping'
    ? copy.clipping
    : analysis?.status === 'weak' || analysis?.status === 'silence'
      ? copy.weak
      : stable
        ? copy.stable
        : copy.unstable;

  const trustworthy = analysis?.status === 'ok' && stable;
  const physicalFineCertified = false;
  const tunedLimit = mode === 'fine' && physicalFineCertified ? 0.5 : 2;
  const isTuned = trustworthy && Math.abs(cents) <= tunedLimit;
  const direction = !trustworthy
    ? copy.ready
    : Math.abs(cents) > (mode === 'fine' ? 12 : 65)
      ? copy.far
      : isTuned
        ? copy.inTune
        : cents > 0
          ? copy.tuneDown
          : copy.tuneUp;

  const statusTone = isTuned ? 'good' : trustworthy ? 'warn' : 'neutral';
  const rulerRange = mode === 'fine' ? 5 : 50;
  const pointer = clamp((cents / rulerRange) * 100, -100, 100);
  const firstTarget = preset?.strings[0];
  const referenceFrequency = targetFrequency ?? midiToFrequency(
    firstTarget?.midi ?? 64,
    a4,
    offset + (firstTarget?.offsetCents ?? 0)
  );

  const clarityPercent = clamp((analysis?.clarity ?? 0) * 100, 0, 100);
  const levelPercent = clamp((((analysis?.dbfs ?? -80) + 60) / 54) * 100, 0, 100);
  const stabilityPercent = stable ? clamp(100 - spreadCents * 8, 0, 100) : clamp(60 - spreadCents * 3, 0, 60);
  const confidenceLabel = trustworthy
    ? copy.confidenceHigh
    : analysis?.status === 'ok'
      ? copy.confidenceMedium
      : copy.confidenceLow;

  useEffect(() => {
    if (!measuredFrequency || !targetFrequency || analysis?.status !== 'ok') return;
    const nextCents = 1200 * Math.log2(measuredFrequency / targetFrequency);
    setPitchHistory((history) => [...history.slice(-47), clamp(nextCents, -100, 100)]);
  }, [analysis, measuredFrequency, targetFrequency]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (measuredFrequency && displayNote) {
        setAnnouncedStatus(`${noteDisplay(displayNote.name)} ${displayNote.octave}. ${direction}`);
      } else {
        setAnnouncedStatus(signalState);
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [measuredFrequency, displayNote?.name, displayNote?.octave, direction, signalState]);

  const toggleTone = async () => {
    if (toneActive) {
      tone.current.stop();
      setToneActive(false);
      if (resumeAfterTone.current) {
        resumeAfterTone.current = false;
        window.setTimeout(() => { void start(); }, 250);
      }
      return;
    }

    // IMPORTANT: prepare() must be invoked synchronously from the user's tap.
    // Safari/iOS can reject or silently mute Web Audio when AudioContext.resume()
    // happens only after awaiting microphone teardown.
    const toneReady = tone.current.prepare(referenceFrequency);

    resumeAfterTone.current = captureState === 'running';
    if (captureState === 'running') {
      await audio.current.stop();
      stabilizer.current.reset();
      setStable(false);
      setStableFrequency(null);
      setSpreadCents(100);
      setCaptureState('paused');
    }

    try {
      await toneReady;
      tone.current.startPrepared();
      setToneActive(true);
    } catch {
      tone.current.stop();
      setToneActive(false);
      if (resumeAfterTone.current) {
        resumeAfterTone.current = false;
        window.setTimeout(() => { void start(); }, 250);
      }
    }
  };

  const selectInstrument = (next: InstrumentId) => {
    setInstrument(next);
    const first = presetsForInstrument(next)[0];
    if (first) setPresetId(first.id);
    setLockedTarget(null);
    setAuto(true);
    setPitchHistory([]);
  };

  const selectPreset = (next: string) => {
    if (next === 'custom' && presetId !== 'custom' && preset?.strings.length) {
      setCustomMidis(preset.strings.map((target) => target.midi));
      setCustomOffsets(preset.strings.map((target) => target.offsetCents ?? 0));
    }
    setPresetId(next);
    setAuto(true);
    setLockedTarget(null);
    setPitchHistory([]);
  };

  const addLowString = () => {
    setCustomMidis((notes) => {
      if (notes.length >= 12) return notes;
      const nextLow = clamp((notes[0] ?? noteToMidi('E2')) - 5, 23, 96);
      return [nextLow, ...notes];
    });
    setCustomOffsets((offsets) => offsets.length >= 12 ? offsets : [0, ...offsets]);
  };

  const removeLowString = () => {
    setCustomMidis((notes) => notes.length > 1 ? notes.slice(1) : notes);
    setCustomOffsets((offsets) => offsets.length > 1 ? offsets.slice(1) : offsets);
  };

  const changeCustomString = (index: number, midi: number) => {
    setCustomMidis((notes) => notes.map((value, itemIndex) => itemIndex === index ? midi : value));
    setLockedTarget(null);
    setAuto(true);
    setPitchHistory([]);
  };

  const changeCustomOffset = (index: number, value: number) => {
    setCustomOffsets((offsets) => offsets.map((offset, itemIndex) =>
      itemIndex === index ? clamp(value, -50, 50) : offset
    ));
    setLockedTarget(null);
    setAuto(true);
    setPitchHistory([]);
  };

  const changeDevice = async (next: string) => {
    setDeviceId(next);
    if (captureState === 'running' || captureState === 'paused') await start(next);
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const instrumentOptions = INSTRUMENTS.map((id) => (
    <option value={id} key={id}>{instrumentLabel(id, copy)}</option>
  ));

  const presetOptions = (
    <>
      {presets.map((item) => (
        <option value={item.id} key={item.id}>{presetName(item, locale)} · {item.short}</option>
      ))}
      <option value="custom">{copy.customTuning}</option>
    </>
  );

  const activeDeviceId = diagnostics?.trackSettings?.deviceId ?? deviceId;
  const selectedDeviceLabel = activeDeviceId
    ? devices.find((device) => device.deviceId === activeDeviceId)?.label ?? ''
    : '';
  const bluetoothInput = /bluetooth|airpods|buds|headset|hands[- ]?free|\bbt\b/i.test(selectedDeviceLabel);

  const customNoteOptions = useMemo(() => {
    const options: React.ReactNode[] = [];
    for (let midi = 23; midi <= 96; midi += 1) {
      const note = midiToNote(midi, accidental);
      options.push(<option value={midi} key={midi}>{noteDisplay(note.name)}{note.octave}</option>);
    }
    return options;
  }, [accidental]);

  const diagnosticsPanel = (
    <div className="diagnostics-panel">
      <div className="diagnostics-title"><Waves size={16} />{copy.diagnostics}</div>
      <div className="diagnostics-grid">
        <span><small>{copy.sampleRate}</small><b>{diagnostics ? Math.round(diagnostics.sampleRate).toLocaleString() + ' Hz' : '—'}</b></span>
        <span><small>{copy.analysisWindow}</small><b>{analysis?.windowMs ? formatMs(analysis.windowMs, locale) : '—'}</b></span>
        <span><small>{copy.processingTime}</small><b>{analysis?.analysisMs ? formatMs(analysis.analysisMs, locale) : '—'}</b></span>
        <span>
          <small>{copy.browserProcessing}</small>
          <b className={processingActive(diagnostics) ? 'diagnostic-warn' : 'diagnostic-good'}>
            {processingActive(diagnostics) ? copy.processedInput : copy.rawInput}
          </b>
        </span>
      </div>
      {analysis?.status === 'ok' && analysis.correction !== 'none' && (
        <div className="diagnostic-note">{copy.octaveCorrected}</div>
      )}
      {processingActive(diagnostics) && <div className="diagnostic-note diagnostic-warning">{copy.processedInputWarning}</div>}
      {bluetoothInput && <div className="diagnostic-note diagnostic-warning">{copy.bluetoothWarning}</div>}
      {mode === 'fine' && <div className="diagnostic-note">{copy.fineNotice}</div>}
    </div>
  );

  const liveTelemetry = (
    <details className="live-telemetry">
      <summary className="live-head">
        <span><span className={'live-dot ' + (trustworthy ? 'good' : '')} />{copy.live}</span>
        <b>{confidenceLabel}</b>
        <ChevronDown className="telemetry-chevron" size={15} aria-hidden="true" />
      </summary>
      <div className="live-telemetry-body">
        <PitchTrace history={pitchHistory} range={rulerRange} label={copy.signalHistory} />
        <div className="metrics-grid">
          <Metric label={copy.level} value={(analysis?.dbfs ?? -120).toFixed(0) + ' ' + copy.dbfs} percent={levelPercent} state={analysis?.status === 'clipping' ? 'warn' : 'neutral'} />
          <Metric label={copy.clarity} value={Math.round(clarityPercent) + '%'} percent={clarityPercent} state={clarityPercent >= 82 ? 'good' : clarityPercent >= 60 ? 'warn' : 'neutral'} />
          <Metric label={copy.stability} value={Math.round(stabilityPercent) + '%'} percent={stabilityPercent} state={stable ? 'good' : 'neutral'} />
        </div>
      </div>
    </details>
  );

  const tunerFace = (
    <section className="tuner-card">
      <div className="mode-row">
        <div className="segmented" aria-label="Tuner mode">
          <button className={mode === 'chromatic' ? 'active' : ''} onClick={() => setMode('chromatic')}>{copy.chromatic}</button>
          <button className={mode === 'fine' ? 'active' : ''} onClick={() => setMode('fine')}>{copy.fine}</button>
        </div>
        <div className="desktop-status">
          <span className={'signal-dot ' + (stable ? 'good' : '')} />
          <span>{signalState}</span>
          <button className="icon-text" onClick={togglePause}>
            {captureState === 'running' ? <Pause size={17} /> : <Play size={17} />}
            {captureState === 'running' ? copy.pause : copy.resume}
          </button>
          <button className="icon-text" onClick={() => setStage(true)}><Maximize2 size={17} />{copy.stage}</button>
        </div>
      </div>

      <div className="readout">
        <span className="sr-only" aria-live="polite">{announcedStatus}</span>
        <div className="string-caption">
          {currentTarget ? copy.string + ' ' + currentTarget.id + ' · ' + noteDisplay(currentTarget.note.replace(/-?\d/g, '')) : copy.note}
        </div>
        <div className={'note ' + (!displayNote ? 'empty' : '')}>
          <span>{displayNote ? noteDisplay(displayNote.name) : '—'}</span>
          {displayNote && <sub>{displayNote.octave}</sub>}
        </div>
        <div className="frequency-pair">
          <span><small>{copy.measured}</small><b>{measuredFrequency ? formatHz(measuredFrequency, locale) : '—'} Hz</b></span>
          <i />
          <span><small>{copy.target}</small><b>{targetFrequency ? formatHz(targetFrequency, locale) : '—'} Hz</b></span>
        </div>
        <div className={'cents ' + statusTone}>
          {measuredFrequency ? <>{formatCents(cents, locale)} cent{locale === 'en' ? 's' : ''}</> : '—'}
        </div>
        <div className={'direction ' + statusTone}>{direction}</div>
      </div>

      <div className={'ruler ' + (mode === 'fine' ? 'fine' : '')} aria-label="Cents deviation">
        <div className="ruler-labels">
          <span>{-rulerRange}</span><span>{-rulerRange / 2}</span><span>0</span><span>+{rulerRange / 2}</span><span>+{rulerRange}</span>
        </div>
        <div className="tick-bed">
          {Array.from({ length: 41 }).map((_, index) => <i key={index} className={index % 10 === 0 ? 'major' : ''} />)}
          <b className={'needle ' + statusTone} style={{ left: 'calc(50% + ' + pointer / 2 + '%)' }} />
        </div>
        {mode === 'fine' && (
          <div
            className={'strobe ' + (trustworthy ? (cents > 0 ? 'right' : 'left') : 'still')}
            style={{ '--speed': Math.max(0.35, 2.8 - Math.min(2.4, Math.abs(cents) * 0.24)) + 's' } as React.CSSProperties}
          />
        )}
      </div>

      {liveTelemetry}

      <div
        className="strings"
        role="group"
        aria-label="Strings"
        style={{ '--string-count': preset?.strings.length ?? 6 } as React.CSSProperties}
      >
        {preset?.strings.map((target) => (
          <button
            key={target.id}
            className={highlighted === target.id ? 'active' : ''}
            onClick={() => {
              setAuto(false);
              setLockedTarget(target);
              setPitchHistory([]);
            }}
            aria-label={copy.string + ' ' + target.id + ' ' + noteDisplay(target.note)}
          >
            <small>{target.id}</small>
            <b>{noteDisplay(target.note.replace(/-?\d/g, ''))}</b>
            <span>{target.note.match(/-?\d/)?.[0] ?? ''}</span>
          </button>
        ))}
      </div>

      <label className="quick-input">
        <Mic2 size={18} aria-hidden="true" />
        <span>
          <small>{copy.input}</small>
          <select value={deviceId} onChange={(event) => void changeDevice(event.target.value)}>
            <option value="">{copy.deviceMic}</option>
            {devices.map((device) => <option value={device.deviceId} key={device.deviceId}>{device.label}</option>)}
          </select>
          <em>{copy.inputHint}</em>
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </label>

      <div className="auto-row">
        <div><strong><Activity size={20} />{copy.auto}</strong><small>{copy.micTip}</small></div>
        <button
          className={'switch ' + (auto ? 'on' : '')}
          role="switch"
          aria-checked={auto}
          onClick={() => {
            setAuto(!auto);
            if (!auto) setLockedTarget(null);
            setPitchHistory([]);
          }}
        >
          <span />
        </button>
      </div>

      <div className="signal-row">
        <span><Activity size={18} />{signalState}</span>
        <span>A4 · {a4.toFixed(1).replace('.0', '')} Hz</span>
      </div>

      {captureState !== 'running' && captureState !== 'paused' && (
        <div className="start-panel">
          <button className="start-button" onClick={() => void start()} disabled={captureState === 'starting'}>
            <Mic2 size={20} />
            {captureState === 'starting' ? copy.starting : copy.start}
          </button>
          {(captureState === 'blocked' || captureState === 'unsupported') && (
            <p>{captureState === 'unsupported' ? copy.unsupported : copy.permission}</p>
          )}
        </div>
      )}

      <div className="mobile-actions">
        <button onClick={() => void toggleTone()}><Volume2 size={20} />{toneActive ? copy.stopTone : copy.referenceTone}</button>
        <button onClick={() => setStage(true)}><Maximize2 size={20} />{copy.stage}</button>
        <button onClick={togglePause}>{captureState === 'running' ? <Pause size={20} /> : <Play size={20} />}{captureState === 'running' ? copy.pause : copy.resume}</button>
      </div>
    </section>
  );

  const settingsFields = (
    <>
      <label className="field">
        <span>{copy.instrument}</span>
        <div>
          <select value={instrument} onChange={(event) => selectInstrument(event.target.value as InstrumentId)}>
            {instrumentOptions}
          </select>
          <ChevronDown size={17} />
        </div>
      </label>

      <label className="field">
        <span>{copy.tuning}</span>
        <div>
          <select value={presetId} onChange={(event) => selectPreset(event.target.value)}>
            {presetOptions}
          </select>
          <ChevronDown size={17} />
        </div>
      </label>

      {presetId === 'custom' && (
        <div className="custom-tuning-editor">
          <div className="custom-tuning-head">
            <div>
              <strong>{copy.customTuning}</strong>
              <small>{copy.customTuningHint}</small>
            </div>
            <div className="custom-tuning-actions">
              <button type="button" onClick={removeLowString} disabled={customMidis.length <= 1}>−</button>
              <span>{customMidis.length}</span>
              <button type="button" onClick={addLowString} disabled={customMidis.length >= 12}>+</button>
            </div>
          </div>
          <div className="custom-string-grid">
            {customMidis.map((midi, index) => (
              <label key={index}>
                <span>{copy.customString} {customMidis.length - index}</span>
                <div className="custom-string-controls">
                  <select value={midi} onChange={(event) => changeCustomString(index, Number(event.target.value))}>
                    {customNoteOptions}
                  </select>
                  <div className="custom-offset-control">
                    <input
                      aria-label={copy.microOffset + ' ' + (customMidis.length - index)}
                      type="number"
                      min={-50}
                      max={50}
                      step={0.1}
                      value={customOffsets[index] ?? 0}
                      onChange={(event) => changeCustomOffset(index, Number(event.target.value) || 0)}
                    />
                    <small>¢</small>
                  </div>
                </div>
              </label>
            ))}
          </div>
          <div className="custom-tuning-buttons">
            <button type="button" onClick={removeLowString} disabled={customMidis.length <= 1}>{copy.removeString}</button>
            <button type="button" onClick={addLowString} disabled={customMidis.length >= 12}>{copy.addString}</button>
          </div>
        </div>
      )}

      <label className="field">
        <span>{copy.input}</span>
        <div>
          <select value={deviceId} onChange={(event) => void changeDevice(event.target.value)}>
            <option value="">{copy.deviceMic}</option>
            {devices.map((device) => <option value={device.deviceId} key={device.deviceId}>{device.label}</option>)}
          </select>
          <ChevronDown size={17} />
        </div>
      </label>

      <label className="field">
        <span>{copy.referenceA4}</span>
        <div>
          <input
            type="number"
            min={400}
            max={480}
            step={0.1}
            value={a4}
            onChange={(event) => setA4(clamp(Number(event.target.value) || 440, 400, 480))}
          />
          <span className="suffix">Hz</span>
        </div>
      </label>

      <label className="field">
        <span>{copy.accidental}</span>
        <div>
          <select value={accidental} onChange={(event) => setAccidental(event.target.value as AccidentalPreference)}>
            <option value="sharp">{copy.sharps} · ♯</option>
            <option value="flat">{copy.flats} · ♭</option>
          </select>
          <ChevronDown size={17} />
        </div>
      </label>

      <button className="outline-primary" onClick={() => void toggleTone()}>
        <Volume2 size={19} />{toneActive ? copy.stopTone : copy.referenceTone}
      </button>

      <button className="advanced-toggle" onClick={() => setAdvanced(!advanced)}>
        <SlidersHorizontal size={19} />{copy.advanced}<ChevronDown className={advanced ? 'rotate' : ''} size={18} />
      </button>

      {advanced && (
        <>
          <label className="field advanced-field">
            <span>{copy.centsOffset}</span>
            <div>
              <input
                type="number"
                min={-50}
                max={50}
                step={0.1}
                value={offset}
                onChange={(event) => setOffset(clamp(Number(event.target.value) || 0, -50, 50))}
              />
              <span className="suffix">cent</span>
            </div>
          </label>
          {diagnosticsPanel}
          <CertificationPanel
            locale={locale}
            measuredHz={measuredFrequency}
            targetHz={targetFrequency}
            status={analysis?.status}
            stable={stable}
            clarity={analysis?.clarity ?? 0}
            dbfs={analysis?.dbfs ?? -120}
            analysisMs={analysis?.analysisMs}
            windowMs={analysis?.windowMs}
            sampleRate={diagnostics?.sampleRate}
            inputLabel={selectedDeviceLabel || copy.deviceMic}
            browserProcessing={processingActive(diagnostics)}
            instrument={instrumentLabel(instrument, copy)}
            tuning={preset ? presetName(preset, locale) : ''}
          />
        </>
      )}

      <div className="hint"><Info size={17} />{copy.micTip}</div>
    </>
  );

  return (
    <div className={'nesttuner ' + (embedded ? 'embedded' : 'public')}>
      {!embedded && (
        <header className="brand-header">
          <a className="brand" href="/" aria-label="NestTuner"><span>Nest</span><b>Tuner</b></a>
          <span className="brand-divider" />
          <span className="brand-section">{copy.tuner}</span>
          <nav className="locale-switch" aria-label="Language">
            <a className={locale === 'pt-BR' ? 'active' : ''} aria-current={locale === 'pt-BR' ? 'page' : undefined} href="/pt/">PT</a>
            <a className={locale === 'en' ? 'active' : ''} aria-current={locale === 'en' ? 'page' : undefined} href="/en/">EN</a>
            <a className={locale === 'es' ? 'active' : ''} aria-current={locale === 'es' ? 'page' : undefined} href="/es/">ES</a>
          </nav>
          <a className="discover" href="https://musicscale.millionsnest.com" target="_blank" rel="noreferrer">{copy.discover}<ExternalLink size={16} /></a>
        </header>
      )}

      {embedded && (
        <header className="embedded-header">
          <button aria-label="Back" onClick={onBack}>‹</button>
          <strong>{copy.tuner}</strong>
          <button aria-label={copy.advanced} onClick={() => setAdvanced(!advanced)}><Settings size={22} /></button>
        </header>
      )}

      <main className="tuner-shell">
        {!embedded && (
          <nav className="mobile-locale-switch" aria-label="Language">
            <a className={locale === 'pt-BR' ? 'active' : ''} aria-current={locale === 'pt-BR' ? 'page' : undefined} href="/pt/">PT</a>
            <a className={locale === 'en' ? 'active' : ''} aria-current={locale === 'en' ? 'page' : undefined} href="/en/">EN</a>
            <a className={locale === 'es' ? 'active' : ''} aria-current={locale === 'es' ? 'page' : undefined} href="/es/">ES</a>
          </nav>
        )}

        {!embedded && <div className="hero-copy"><h1>{copy.tagline}</h1><p>{copy.subtitle}</p></div>}

        <div className="mobile-context">
          <label>
            <Guitar size={18} />
            <select value={instrument} onChange={(event) => selectInstrument(event.target.value as InstrumentId)}>
              {instrumentOptions}
            </select>
            <ChevronDown size={16} />
          </label>
          <label>
            <select value={presetId} onChange={(event) => selectPreset(event.target.value)}>
              {presetOptions}
            </select>
            <ChevronDown size={16} />
          </label>
        </div>

        <div className="desktop-grid">
          {tunerFace}
          <aside className="settings-card">
            <h2>{copy.yourInstrument}</h2>
            <p>{copy.configure}</p>
            {settingsFields}
          </aside>
        </div>

        {advanced && (
          <section className="mobile-advanced-panel">
            <h2>{copy.advanced}</h2>
            {settingsFields}
          </section>
        )}

        <footer className="tuner-footer">
          <span><Activity size={17} />{copy.localAudio}</span>
          <button onClick={() => void copyUrl()}><Link2 size={17} />{copied ? copy.copied : copy.copyLink}</button>
          <span>by MillionsNest</span>
        </footer>
      </main>

      {stage && (
        <div className="stage-overlay">
          <button className="stage-close" onClick={() => setStage(false)}><X size={26} />{copy.exitStage}</button>
          <div className={'stage-note ' + (!displayNote ? 'empty' : '')}>
            <span>{displayNote ? noteDisplay(displayNote.name) : '—'}</span>
            {displayNote && <sub>{displayNote.octave}</sub>}
          </div>
          <div className="stage-hz">
            {measuredFrequency ? formatHz(measuredFrequency, locale) : '—'} Hz
            <span>→ {targetFrequency ? formatHz(targetFrequency, locale) : '—'} Hz</span>
          </div>
          <div className={'stage-cents ' + statusTone}>{measuredFrequency ? formatCents(cents, locale) : '—'} cent{locale === 'en' ? 's' : ''}</div>
          <div className={'stage-direction ' + statusTone}>{direction}</div>
          <div className="stage-meter">
            <i />
            <b className={statusTone} style={{ left: 'calc(50% + ' + pointer / 2 + '%)' }} />
          </div>
          {mode === 'fine' && (
            <div
              className={'stage-strobe ' + (trustworthy ? (cents > 0 ? 'right' : 'left') : 'still')}
              style={{ '--speed': Math.max(0.28, 2.3 - Math.min(2, Math.abs(cents) * 0.22)) + 's' } as React.CSSProperties}
            />
          )}
          <div className="stage-signal"><Activity size={22} />{signalState}<span>{Math.round(clarityPercent)}%</span></div>
        </div>
      )}
    </div>
  );
}
