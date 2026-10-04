# Third-party notices

NestTuner keeps its pitch-estimation dependency local to the build; no runtime CDN is required.

## Pitchy

- Package: `pitchy@4.1.0`
- Project: `ianprime0509/pitchy`
- Purpose: McLeod Pitch Method pitch estimation baseline
- License: Zero Clause BSD (0BSD)

NestTuner adds its own signal gating, harmonic/octave validation, adaptive analysis windows, stabilization, target matching, and UI behavior around this baseline.

## Other runtime libraries

React, React DOM and Lucide React are bundled as application dependencies. Their exact transitive dependency graph is frozen in `yarn.lock`.
