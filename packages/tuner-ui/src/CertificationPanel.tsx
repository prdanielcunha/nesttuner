import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createCertificationSample,
  summarizeCertification,
  type CertificationSample
} from '@nesttuner/core';
import type { TunerLocale } from './copy';

type Props = {
  locale: TunerLocale;
  measuredHz: number | null;
  targetHz: number | null;
  status: string | undefined;
  stable: boolean;
  clarity: number;
  dbfs: number;
  analysisMs?: number;
  windowMs?: number;
  sampleRate?: number;
  inputLabel?: string;
  browserProcessing: boolean;
  instrument: string;
  tuning: string;
};

const COPY = {
  'pt-BR': {
    title: 'Certificação física',
    description:
      'Meça o comportamento real do NestTuner contra uma fonte de frequência independente. Somente métricas são armazenadas neste aparelho; nenhum áudio é gravado ou enviado.',
    reference: 'Referência independente',
    useTarget: 'Usar alvo atual',
    start: 'Iniciar sessão',
    stop: 'Finalizar sessão',
    reset: 'Limpar',
    export: 'Exportar relatório',
    waiting: 'Aguardando leituras estáveis',
    recording: 'Registrando métricas locais',
    samples: 'Amostras',
    duration: 'Duração',
    p50: 'Erro p50',
    p95: 'Erro p95',
    maximum: 'Erro máximo',
    stability: 'Leituras estáveis',
    analysis: 'Análise p95',
    gate: 'Gate de 20 min',
    gateReady: 'atingido',
    gatePending: 'pendente',
    warning:
      'Para certificação oficial, a referência precisa vir de uma fonte independente e caracterizada. Usar apenas o alvo interno do NestTuner não comprova precisão física.',
    noData: 'Colete leituras estáveis antes de exportar.',
    hz: 'Hz'
  },
  en: {
    title: 'Physical certification',
    description:
      'Measure real NestTuner behavior against an independent frequency source. Only metrics are stored on this device; no audio is recorded or uploaded.',
    reference: 'Independent reference',
    useTarget: 'Use current target',
    start: 'Start session',
    stop: 'Finish session',
    reset: 'Clear',
    export: 'Export report',
    waiting: 'Waiting for stable readings',
    recording: 'Recording local metrics',
    samples: 'Samples',
    duration: 'Duration',
    p50: 'p50 error',
    p95: 'p95 error',
    maximum: 'Maximum error',
    stability: 'Stable readings',
    analysis: 'p95 analysis',
    gate: '20 min gate',
    gateReady: 'reached',
    gatePending: 'pending',
    warning:
      'For official certification, the reference must come from an independent characterized source. Using only NestTuner’s internal target does not prove physical accuracy.',
    noData: 'Collect stable readings before exporting.',
    hz: 'Hz'
  },
  es: {
    title: 'Certificación física',
    description:
      'Mide el comportamiento real de NestTuner frente a una fuente de frecuencia independiente. Solo se guardan métricas en este dispositivo; no se graba ni se envía audio.',
    reference: 'Referencia independiente',
    useTarget: 'Usar objetivo actual',
    start: 'Iniciar sesión',
    stop: 'Finalizar sesión',
    reset: 'Limpiar',
    export: 'Exportar informe',
    waiting: 'Esperando lecturas estables',
    recording: 'Registrando métricas locales',
    samples: 'Muestras',
    duration: 'Duración',
    p50: 'Error p50',
    p95: 'Error p95',
    maximum: 'Error máximo',
    stability: 'Lecturas estables',
    analysis: 'Análisis p95',
    gate: 'Gate de 20 min',
    gateReady: 'alcanzado',
    gatePending: 'pendiente',
    warning:
      'Para una certificación oficial, la referencia debe provenir de una fuente independiente y caracterizada. Usar solo el objetivo interno de NestTuner no demuestra precisión física.',
    noData: 'Recoge lecturas estables antes de exportar.',
    hz: 'Hz'
  }
} as const;

function formatNumber(value: number | null, digits = 2): string {
  return value == null || !Number.isFinite(value) ? '—' : value.toFixed(digits);
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function CertificationPanel(props: Props) {
  const copy = COPY[props.locale];
  const [referenceHz, setReferenceHz] = useState(props.targetHz ?? 440);
  const [recording, setRecording] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [samples, setSamples] = useState<CertificationSample[]>([]);
  const [now, setNow] = useState(Date.now());
  const lastSampleAt = useRef(0);

  useEffect(() => {
    if (!recording && props.targetHz && Number.isFinite(props.targetHz)) {
      setReferenceHz(Number(props.targetHz.toFixed(4)));
    }
  }, [props.targetHz, recording]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    if (
      !recording ||
      props.status !== 'ok' ||
      !props.measuredHz ||
      !Number.isFinite(referenceHz) ||
      referenceHz <= 0
    ) {
      return;
    }

    const capturedAt = Date.now();
    if (capturedAt - lastSampleAt.current < 100) return;
    lastSampleAt.current = capturedAt;

    const sample = createCertificationSample({
      capturedAt,
      referenceHz,
      measuredHz: props.measuredHz,
      clarity: props.clarity,
      dbfs: props.dbfs,
      stable: props.stable,
      analysisMs: props.analysisMs,
      windowMs: props.windowMs
    });

    setSamples(previous => [...previous.slice(-29_999), sample]);
  }, [
    recording,
    props.status,
    props.stable,
    props.measuredHz,
    props.clarity,
    props.dbfs,
    props.analysisMs,
    props.windowMs,
    referenceHz
  ]);

  const summary = useMemo(() => summarizeCertification(samples), [samples]);
  const elapsed = startedAt ? (recording ? now : samples.at(-1)?.capturedAt ?? now) - startedAt : 0;
  const twentyMinuteGate = elapsed >= 20 * 60 * 1000;

  const begin = () => {
    if (!Number.isFinite(referenceHz) || referenceHz <= 0) return;
    setSamples([]);
    lastSampleAt.current = 0;
    const timestamp = Date.now();
    setStartedAt(timestamp);
    setNow(timestamp);
    setRecording(true);
  };

  const reset = () => {
    setRecording(false);
    setStartedAt(null);
    setSamples([]);
    lastSampleAt.current = 0;
  };

  const exportReport = () => {
    if (samples.length === 0) return;

    const report = {
      schemaVersion: 1,
      product: 'NestTuner',
      generatedAt: new Date().toISOString(),
      privacy: 'metrics-only; no audio captured, stored or uploaded by this report',
      referenceHz,
      environment: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        sampleRate: props.sampleRate ?? null,
        inputLabel: props.inputLabel || null,
        browserProcessing: props.browserProcessing,
        instrument: props.instrument,
        tuning: props.tuning
      },
      session: {
        startedAt: startedAt ? new Date(startedAt).toISOString() : null,
        durationMs: elapsed,
        twentyMinuteGate
      },
      summary,
      samples
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `nesttuner-certification-${new Date()
      .toISOString()
      .replace(/[:.]/g, '-')}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <section className="certification-panel" aria-label={copy.title}>
      <div className="certification-head">
        <div>
          <strong>{copy.title}</strong>
          <p>{copy.description}</p>
        </div>
        <span className={recording ? 'certification-live active' : 'certification-live'}>
          {recording ? copy.recording : copy.waiting}
        </span>
      </div>

      <label className="certification-reference">
        <span>{copy.reference}</span>
        <div>
          <input
            type="number"
            min={20}
            max={5000}
            step={0.001}
            value={referenceHz}
            disabled={recording}
            onChange={event => setReferenceHz(Number(event.target.value) || 440)}
          />
          <small>{copy.hz}</small>
        </div>
      </label>

      <button
        type="button"
        className="certification-target"
        disabled={recording || !props.targetHz}
        onClick={() => props.targetHz && setReferenceHz(Number(props.targetHz.toFixed(4)))}
      >
        {copy.useTarget}
        <span>{props.targetHz ? `${props.targetHz.toFixed(3)} Hz` : '—'}</span>
      </button>

      <div className="certification-stats">
        <span><small>{copy.samples}</small><b>{summary.sampleCount}</b></span>
        <span><small>{copy.duration}</small><b>{formatDuration(elapsed)}</b></span>
        <span><small>{copy.p50}</small><b>{formatNumber(summary.p50AbsCents)} ¢</b></span>
        <span><small>{copy.p95}</small><b>{formatNumber(summary.p95AbsCents)} ¢</b></span>
        <span><small>{copy.maximum}</small><b>{formatNumber(summary.maxAbsCents)} ¢</b></span>
        <span><small>{copy.stability}</small><b>{summary.stableRate == null ? '—' : `${Math.round(summary.stableRate * 100)}%`}</b></span>
        <span><small>{copy.analysis}</small><b>{formatNumber(summary.p95AnalysisMs, 1)} ms</b></span>
        <span>
          <small>{copy.gate}</small>
          <b className={twentyMinuteGate ? 'certification-pass' : ''}>
            {twentyMinuteGate ? copy.gateReady : copy.gatePending}
          </b>
        </span>
      </div>

      <div className="certification-actions">
        <button type="button" className="certification-primary" onClick={recording ? () => setRecording(false) : begin}>
          {recording ? copy.stop : copy.start}
        </button>
        <button type="button" onClick={reset}>{copy.reset}</button>
        <button type="button" onClick={exportReport} disabled={samples.length === 0}>
          {copy.export}
        </button>
      </div>

      <p className="certification-warning">
        {samples.length === 0 && !recording ? copy.noData + ' ' : ''}
        {copy.warning}
      </p>
    </section>
  );
}
