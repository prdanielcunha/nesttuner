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

## MusicScale integration

The canonical integration surface is the `nest-tuner` Web Component generated from this repository. MusicScale loads the ES module from `https://nesttuner.millionsnest.com/embed/nesttuner-element.js`; the component executes inside the MusicScale document (not an iframe), receives the MusicScale locale, and keeps microphone permission attached to the MusicScale origin. Audio assets remain hosted by NestTuner and are CORS-enabled for module/worklet loading.

## Versioned integration contract

MusicScale must pin a concrete NestTuner embed build instead of depending on a mutable remote bundle. NestTuner 0.4.0-beta.0 publishes:

- `/embed/nesttuner-element.v0.4.0-beta.0.js` — immutable integration contract for MusicScale.
- `/embed/nesttuner-element.js` — short-cache convenience alias for development and external adopters.

The pinned module prevents a NestTuner deploy from unexpectedly changing MusicScale between MusicScale releases.

Starting with NestTuner 0.5.0-beta.0, the immutable contract includes the module **and** its runtime assets:
- embed worker assets are namespaced under `/embed/assets/v<version>/`;
- the AudioWorklet is copied to `/runtime/v<version>/pitch-capture.worklet.js`;
- `/embed/releases.json` records every immutable file belonging to every preserved embed release;
- deployment rehydrates historical release files from the currently published Hosting release before publishing a new one.

The 0.4.0-beta.0 module pinned by MusicScale remains preserved with its original worker asset. The legacy root `/pitch-capture.worklet.js` is kept frozen for that 0.4 runtime. New versioned embeds must not depend on mutable root runtime assets.
