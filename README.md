# NestTuner

NestTuner é o afinador profissional do ecossistema MillionsNest.

- Domínio oficial único: https://nesttuner.millionsnest.com
- Português: https://nesttuner.millionsnest.com/pt/
- English: https://nesttuner.millionsnest.com/en/
- Español: https://nesttuner.millionsnest.com/es/
- Sem cadastro para afinar.
- Processamento de áudio local no dispositivo.
- Cromático, modo fino, corda fixa, presets, A4, som de referência e modo Palco.
- Uma única base de código para todos os idiomas e para a integração com o MusicScale.

Os antigos endereços `afinador.millionsnest.com` e `tuner.millionsnest.com` existem apenas como redirects 301 para o domínio canônico NestTuner e não são produtos ou páginas separados.

## Desenvolvimento

```bash
npm install
npm run dev
npm run check
```

A aplicação usa React + TypeScript + Vite. O motor DSP e a captura de áudio ficam separados da UI para permitir testes e integração segura.
