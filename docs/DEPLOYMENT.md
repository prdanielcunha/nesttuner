# NestTuner deployment

Firebase project: millionsnest

Canonical Hosting site:
- mn-nesttuner-555464791734

Canonical Hosting target:
- nesttuner -> dist

Official custom domain:
- nesttuner.millionsnest.com

Localized public routes:
- /pt/
- /en/
- /es/

Legacy redirect-only Hosting sites:
- mn-nesttuner-pt-555464791734 -> https://nesttuner.millionsnest.com/pt/
- mn-nesttuner-en-555464791734 -> https://nesttuner.millionsnest.com/en/

The production workflow authenticates with the MillionsNest workload identity model, deploys the single canonical application, and deploys permanent redirects to the two former aliases. Firebase owns the custom-domain resource and Cloudflare holds the authoritative DNS record.
## Embed artifact

The same build also publishes:
- `/embed/nesttuner-element.js` — short-cache latest alias registering `<nest-tuner>`;
- `/embed/nesttuner-element.v<version>.js` — immutable release module;
- `/embed/assets/v<version>/...` — immutable generated Worker assets;
- `/runtime/v<version>/pitch-capture.worklet.js` — immutable AudioWorklet runtime for the matching embed;
- `/embed/releases.json` — deployed manifest of preserved immutable releases.

The root `/pitch-capture.worklet.js` remains as the frozen compatibility runtime used by the already-published 0.4.0-beta.0 embed. New versioned embeds use their own versioned runtime directory.

## Versioned embed release

MusicScale currently remains pinned to `/embed/nesttuner-element.v0.4.0-beta.0.js`.

NestTuner 0.5.0-beta.0 introduces the complete multi-release runtime contract. Before each Firebase deploy, the workflow reads the currently published release manifest (or bootstraps the known 0.4.0-beta.0 files), downloads every historical immutable file into the new `dist`, and then merges the current release manifest. This prevents Firebase Hosting cleanup from deleting files still referenced by an older MusicScale release.

A MusicScale release must reference a concrete versioned module. The deploy smoke gate verifies the current release, the preserved 0.4 release, and every file listed in `/embed/releases.json`.
