# NestTuner architecture

NestTuner is one product, one repository, one canonical domain and one reusable tuner surface.

- Canonical domain: https://nesttuner.millionsnest.com
- PT-BR: /pt/
- EN: /en/
- ES: /es/
- Repository: prdanielcunha/nesttuner
- Legacy aliases: afinador.millionsnest.com -> /pt/ and tuner.millionsnest.com -> /en/ via permanent redirects only.
- Public flow: no account, no Hub, no Firestore, no audio upload.
- DSP: Pitchy/McLeod baseline, DC removal, level/clipping gates, adaptive analysis windows.
- Capture: getUserMedia -> AudioWorklet capture -> Worker analysis -> stabilized result -> React UI.
- UI: chromatic, fine, fixed-string target, auto target, A4 reference, reference tone, stage mode.
- Integration: MusicScale consumes the same NestTuner implementation rather than maintaining a second tuner.

The visual source of truth is the approved NestTuner roadmap and reference boards. Precision claims remain gated by measured validation.
