import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ChevronDown, ExternalLink, Guitar, Info, Link2, Maximize2,
  Mic2, Pause, Play, Settings, SlidersHorizontal, Volume2, X
} from 'lucide-react';
import {
  PitchStabilizer, closestTarget, midiToFrequency, midiToNote, nearestNote,
  presetsForInstrument, type InstrumentId, type StringTarget
} from '@nesttuner/core';
import {
  ReferenceTone, TunerAudioSession, type AnalysisResult, type AudioInputDevice
} from '@nesttuner/audio';
import { COPY, type TunerLocale } from './copy';

type Mode = 'chromatic' | 'fine';
type CaptureState = 'idle' | 'starting' | 'running' | 'paused' | 'blocked' | 'unsupported';

type Props = { locale: TunerLocale; embedded?: boolean; onBack?: () => void };

function noteDisplay(note: string) { return note.replace('#', '♯'); }

function formatHz(value: number, locale: TunerLocale) {
  return value.toLocaleString(locale === 'pt-BR' ? 'pt-BR' : locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCents(value: number, locale: TunerLocale) {
  return new Intl.NumberFormat(locale === 'pt-BR' ? 'pt-BR' : locale, {
    minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'always'
  }).format(value);
}

export function NestTuner({ locale, embedded = false, onBack }: Props) {
  const copy = COPY[locale] as Record<keyof typeof COPY['pt-BR'], string>;
  const [instrument, setInstrument] = useState<InstrumentId>('guitar');
  const presets = useMemo(() => presetsForInstrument(instrument), [instrument]);
  const [presetId, setPresetId] = useState('guitar-standard');
  const preset = presets.find((item) => item.id === presetId) ?? presets[0];

  const [mode, setMode] = useState<Mode>('chromatic');
  const [auto, setAuto] = useState(true);
  const [lockedTarget, setLockedTarget] = useState<StringTarget | null>(null);
  const [a4, setA4] = useState(440);
  const [offset, setOffset] = useState(0);
  const [captureState, setCaptureState] = useState<CaptureState>('idle');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [stableFrequency, setStableFrequency] = useState<number | null>(null);
  const [stable, setStable] = useState(false);
  const [devices, setDevices] = useState<AudioInputDevice[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [toneActive, setToneActive] = useState(false);
  const [stage, setStage] = useState(false);
  const [copied, setCopied] = useState(false);

  const audio = useRef(new TunerAudioSession());
  const tone = useRef(new ReferenceTone());
  const stabilizer = useRef(new PitchStabilizer());

  useEffect(() => {
    const saved = localStorage.getItem('nesttuner:prefs:v1');
    if (!saved) return;
    try {
      const prefs = JSON.parse(saved) as Partial<{ instrument: InstrumentId; presetId: string; mode: Mode; a4: number }>;
      if (prefs.instrument) setInstrument(prefs.instrument);
      if (prefs.presetId) setPresetId(prefs.presetId);
      if (prefs.mode) setMode(prefs.mode);
      if (prefs.a4 && prefs.a4 >= 400 && prefs.a4 <= 480) setA4(prefs.a4);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem('nesttuner:prefs:v1', JSON.stringify({ instrument, presetId, mode, a4 }));
  }, [instrument, presetId, mode, a4]);

  useEffect(() => {
    if (!presets.some((item) => item.id === presetId)) {
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
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [captureState]);

  useEffect(() => () => {
    tone.current.stop();
    void audio.current.stop();
  }, []);

  useEffect(() => {
    if (!stage) return;
    let wakeLock: { release: () => Promise<void> } | null = null;
    const request = async () => {
      try {
        const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } };
        wakeLock = await nav.wakeLock?.request('screen') ?? null;
      } catch {}
    };
    void request();
    return () => { void wakeLock?.release(); };
  }, [stage]);

  const onAnalysis = (result: AnalysisResult) => {
    setAnalysis(result);
    if (result.status !== 'ok') {
      stabilizer.current.reset();
      setStable(false);
      setStableFrequency(null);
      return;
    }
    const stabilized = stabilizer.current.push(result);
    if (stabilized) {
      setStable(stabilized.stable);
      setStableFrequency(stabilized.frequency);
    }
  };

  const start = async (nextDeviceId = deviceId) => {
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === 'undefined') {
      setCaptureState('unsupported');
      return;
    }
    setCaptureState('starting');
    setAnalysis(null);
    stabilizer.current.reset();
    try {
      await audio.current.start(onAnalysis, nextDeviceId || undefined);
      setCaptureState('running');
      setDevices(await audio.current.listInputs());
    } catch {
      setCaptureState('blocked');
    }
  };

  const togglePause = async () => {
    if (captureState === 'running') {
      await audio.current.pause();
      setCaptureState('paused');
    } else if (captureState === 'paused') {
      try {
        await audio.current.resume();
        setCaptureState('running');
      } catch {
        await start();
      }
    } else {
      await start();
    }
  };

  const measuredFrequency = stableFrequency ?? (analysis?.status === 'ok' ? analysis.frequency : null);
  const closestString = measuredFrequency && preset ? closestTarget(measuredFrequency, preset.strings, a4) : null;
  const currentTarget = auto ? closestString?.target ?? null : lockedTarget;
  const chromatic = measuredFrequency ? nearestNote(measuredFrequency, a4) : null;
  const targetFrequency = currentTarget ? midiToFrequency(currentTarget.midi, a4, offset) : chromatic?.target ?? null;
  const cents = measuredFrequency && targetFrequency ? 1200 * Math.log2(measuredFrequency / targetFrequency) : 0;
  const displayMidi = currentTarget?.midi ?? chromatic?.midi ?? 59;
  const displayNote = midiToNote(displayMidi);
  const highlighted = auto ? closestString?.target.id : lockedTarget?.id;

  const signalState = analysis?.status === 'clipping'
    ? copy.clipping
    : analysis?.status === 'weak' || analysis?.status === 'silence'
      ? copy.weak
      : stable ? copy.stable : copy.unstable;

  const trustworthy = analysis?.status === 'ok' && stable;
  const tunedLimit = mode === 'fine' ? 0.5 : 2;
  const isTuned = trustworthy && Math.abs(cents) <= tunedLimit;
  const direction = !trustworthy ? copy.ready
    : Math.abs(cents) > (mode === 'fine' ? 12 : 65) ? copy.far
      : isTuned ? copy.inTune : cents > 0 ? copy.tuneDown : copy.tuneUp;
  const statusTone = isTuned ? 'good' : trustworthy ? 'warn' : 'neutral';
  const rulerRange = mode === 'fine' ? 5 : 50;
  const pointer = Math.max(-100, Math.min(100, (cents / rulerRange) * 100));
  const referenceFrequency = targetFrequency ?? midiToFrequency(preset?.strings[0]?.midi ?? 64, a4);

  const toggleTone = async () => {
    if (toneActive) {
      tone.current.stop();
      setToneActive(false);
      if (captureState === 'running') setTimeout(() => { void audio.current.resume(); }, 250);
      return;
    }
    if (captureState === 'running') await audio.current.pause();
    await tone.current.play(referenceFrequency);
    setToneActive(true);
  };

  const selectInstrument = (next: InstrumentId) => {
    setInstrument(next);
    const first = presetsForInstrument(next)[0];
    if (first) setPresetId(first.id);
    setLockedTarget(null);
    setAuto(true);
  };

  const changeDevice = async (next: string) => {
    setDeviceId(next);
    if (captureState === 'running' || captureState === 'paused') await start(next);
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

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

      <div className="readout" aria-live="polite">
        <div className="string-caption">
          {currentTarget ? copy.string + ' ' + currentTarget.id + ' · ' + noteDisplay(currentTarget.note.replace(/\d/g, '')) : copy.note}
        </div>
        <div className="note"><span>{noteDisplay(displayNote.name)}</span><sub>{displayNote.octave}</sub></div>
        <div className="frequency">{measuredFrequency ? formatHz(measuredFrequency, locale) : '—'} Hz</div>
        <div className={'cents ' + statusTone}>{measuredFrequency ? formatCents(cents, locale) : '±0,0'} cent{locale === 'en' ? 's' : ''}</div>
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
        {mode === 'fine' && <div className={'strobe ' + (trustworthy ? (cents > 0 ? 'right' : 'left') : 'still')} style={{ '--speed': Math.max(0.35, 2.8 - Math.min(2.4, Math.abs(cents) * 0.24)) + 's' } as React.CSSProperties} />}
      </div>

      <div className="strings" role="group" aria-label="Strings">
        {preset?.strings.map((target) => (
          <button key={target.id} className={highlighted === target.id ? 'active' : ''} onClick={() => { setAuto(false); setLockedTarget(target); }}>
            {noteDisplay(target.note)}
          </button>
        ))}
      </div>

      <div className="auto-row">
        <div><strong><Activity size={20} />{copy.auto}</strong><small>{copy.ready}</small></div>
        <button className={'switch ' + (auto ? 'on' : '')} role="switch" aria-checked={auto} onClick={() => { setAuto(!auto); if (!auto) setLockedTarget(null); }}>
          <span />
        </button>
      </div>

      <div className="signal-row">
        <span><Activity size={18} />{signalState}</span><span>A4 · {a4.toFixed(1).replace('.0', '')} Hz</span>
      </div>

      {captureState !== 'running' && captureState !== 'paused' && (
        <div className="start-panel">
          <button className="start-button" onClick={() => void start()} disabled={captureState === 'starting'}>
            <Mic2 size={20} />{captureState === 'starting' ? copy.starting : copy.start}
          </button>
          {(captureState === 'blocked' || captureState === 'unsupported') && <p>{captureState === 'unsupported' ? copy.unsupported : copy.permission}</p>}
        </div>
      )}

      <div className="mobile-actions">
        <button onClick={() => void toggleTone()}><Volume2 size={20} />{toneActive ? copy.stopTone : copy.referenceTone}</button>
        <button onClick={() => setStage(true)}><Maximize2 size={20} />{copy.stage}</button>
        <button onClick={togglePause}>{captureState === 'running' ? <Pause size={20} /> : <Play size={20} />}{captureState === 'running' ? copy.pause : copy.resume}</button>
      </div>
    </section>
  );

  return (
    <div className={'nesttuner ' + (embedded ? 'embedded' : 'public')}>
      {!embedded && (
        <header className="brand-header">
          <a className="brand" href="/" aria-label="NestTuner"><span>Nest</span><b>Tuner</b></a>
          <span className="brand-divider" />
          <span className="brand-section">{copy.tuner}</span>
          <a className="discover" href="https://musicscale.millionsnest.com" target="_blank" rel="noreferrer">{copy.discover}<ExternalLink size={16} /></a>
        </header>
      )}

      {embedded && (
        <header className="embedded-header">
          <button aria-label="Back" onClick={onBack}>‹</button>
          <strong>NestTuner</strong>
          <button aria-label={copy.advanced} onClick={() => setAdvanced(!advanced)}><Settings size={22} /></button>
        </header>
      )}

      <main className="tuner-shell">
        {!embedded && <div className="hero-copy"><h1>{copy.tagline}</h1><p>{copy.subtitle}</p></div>}

        <div className="mobile-context">
          <label>
            <Guitar size={18} />
            <select value={instrument} onChange={(event) => selectInstrument(event.target.value as InstrumentId)}>
              <option value="guitar">{copy.guitar}</option><option value="acoustic">{copy.acoustic}</option><option value="bass">{copy.bass}</option>
            </select><ChevronDown size={16} />
          </label>
          <label>
            <select value={presetId} onChange={(event) => { setPresetId(event.target.value); setAuto(true); setLockedTarget(null); }}>
              {presets.map((item) => <option value={item.id} key={item.id}>{locale === 'pt-BR' ? item.namePt : item.nameEn} · {item.short}</option>)}
            </select><ChevronDown size={16} />
          </label>
        </div>

        <div className="desktop-grid">
          {tunerFace}
          <aside className="settings-card">
            <h2>{copy.yourInstrument}</h2><p>{copy.configure}</p>
            <label className="field"><span>{copy.instrument}</span><div>
              <select value={instrument} onChange={(event) => selectInstrument(event.target.value as InstrumentId)}>
                <option value="guitar">{copy.guitar}</option><option value="acoustic">{copy.acoustic}</option><option value="bass">{copy.bass}</option>
              </select><ChevronDown size={17} /></div></label>
            <label className="field"><span>{copy.tuning}</span><div>
              <select value={presetId} onChange={(event) => { setPresetId(event.target.value); setAuto(true); setLockedTarget(null); }}>
                {presets.map((item) => <option value={item.id} key={item.id}>{locale === 'pt-BR' ? item.namePt : item.nameEn} · {item.short}</option>)}
              </select><ChevronDown size={17} /></div></label>
            <label className="field"><span>{copy.input}</span><div>
              <select value={deviceId} onChange={(event) => void changeDevice(event.target.value)}>
                <option value="">{copy.deviceMic}</option>
                {devices.map((device) => <option value={device.deviceId} key={device.deviceId}>{device.label}</option>)}
              </select><ChevronDown size={17} /></div></label>
            <label className="field"><span>{copy.referenceA4}</span><div>
              <input type="number" min={400} max={480} step={0.1} value={a4} onChange={(event) => setA4(Math.max(400, Math.min(480, Number(event.target.value) || 440)))} />
              <span className="suffix">Hz</span></div></label>
            <button className="outline-primary" onClick={() => void toggleTone()}><Volume2 size={19} />{toneActive ? copy.stopTone : copy.referenceTone}</button>
            <button className="advanced-toggle" onClick={() => setAdvanced(!advanced)}>
              <SlidersHorizontal size={19} />{copy.advanced}<ChevronDown className={advanced ? 'rotate' : ''} size={18} />
            </button>
            {advanced && <label className="field advanced-field"><span>{copy.centsOffset}</span><div>
              <input type="number" min={-50} max={50} step={0.1} value={offset} onChange={(event) => setOffset(Math.max(-50, Math.min(50, Number(event.target.value) || 0)))} />
              <span className="suffix">cent</span></div></label>}
            <div className="hint"><Info size={17} />{copy.ready}</div>
          </aside>
        </div>

        <footer className="tuner-footer">
          <span><Activity size={17} />{copy.localAudio}</span>
          <button onClick={() => void copyUrl()}><Link2 size={17} />{copied ? copy.copied : copy.copyLink}</button>
          <span>by MillionsNest</span>
        </footer>
      </main>

      {stage && (
        <div className="stage-overlay">
          <button className="stage-close" onClick={() => setStage(false)}><X size={26} />{copy.exitStage}</button>
          <div className="stage-note"><span>{noteDisplay(displayNote.name)}</span><sub>{displayNote.octave}</sub></div>
          <div className={'stage-cents ' + statusTone}>{measuredFrequency ? formatCents(cents, locale) : '—'} cent{locale === 'en' ? 's' : ''}</div>
          <div className={'stage-direction ' + statusTone}>{direction}</div>
          <div className="stage-signal"><Activity size={22} />{signalState}</div>
        </div>
      )}
    </div>
  );
}
