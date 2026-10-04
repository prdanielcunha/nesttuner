# NestTuner

NestTuner é o afinador profissional do ecossistema MillionsNest.

- PT-BR: https://afinador.millionsnest.com
- Global/EN: https://tuner.millionsnest.com
- Sem cadastro para afinar.
- Processamento de áudio local no dispositivo.
- Cromático, modo fino, corda fixa, presets, A4, som de referência e modo Palco.
- Uma única base de código para os dois domínios e para integração futura no MusicScale.

## Desenvolvimento

```bash
npm install
npm run dev
npm run check
```

A aplicação usa React + TypeScript + Vite. O motor DSP e a captura de áudio ficam separados da UI para permitir testes e integração segura.
