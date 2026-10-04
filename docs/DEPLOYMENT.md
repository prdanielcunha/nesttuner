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
- `/embed/nesttuner-element.js` — self-contained ES module registering `<nest-tuner>`.
- `/pitch-capture.worklet.js` and generated worker assets — loaded from the canonical NestTuner origin with cross-origin resource headers.

The fixed embed module URL intentionally uses short revalidation caching so MusicScale can receive safe updates without publishing a second copy of the tuner.
