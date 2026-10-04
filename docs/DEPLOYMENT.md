# NestTuner deployment

Firebase project: millionsnest

Hosting sites:
- mn-nesttuner-pt-555464791734
- mn-nesttuner-en-555464791734

Hosting targets:
- nesttuner-pt -> dist/pt
- nesttuner-en -> dist/en

Custom domains:
- afinador.millionsnest.com -> PT site
- tuner.millionsnest.com -> EN site

The deploy workflow authenticates with the MillionsNest workload identity model, creates missing Hosting sites when permitted, deploys both localized builds, and requests both Firebase custom-domain mappings.

Firebase can create the mapping and SSL intent, but DNS ownership/routing records still have to exist at the authoritative DNS provider. The workflow prints Firebase requiredDnsUpdates so DNS can be completed without guessing.
