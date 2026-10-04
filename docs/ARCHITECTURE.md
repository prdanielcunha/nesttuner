# NestTuner architecture

NestTuner is one product with two public localized shells and one reusable tuner surface.

- PT-BR: https://afinador.millionsnest.com
- EN/global: https://tuner.millionsnest.com
- Repository: prdanielcunha/nesttuner
- Public flow: no account, no Hub, no Firestore, no audio upload.
- DSP: Pitchy/McLeod baseline, DC removal, level/clipping gates, adaptive 4096/8192/16384-sample windows.
- Capture: getUserMedia -> AudioWorklet capture -> Worker analysis -> stabilized result -> React UI.
- UI: chromatic, fine, fixed-string target, auto target, A4 reference, reference tone, stage mode.
- Integration: MusicScale should consume a pinned NestTuner module/version rather than an iframe.

The visual source of truth is the approved NestTuner roadmap and reference boards. Precision claims remain gated by measured validation.
