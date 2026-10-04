# NestTuner — regras para agentes

## Produto
NestTuner é um afinador profissional do ecossistema MillionsNest. A experiência pública não exige cadastro e processa áudio localmente.

## Regras
- PT-BR e EN são obrigatórios; ES deve permanecer preparado.
- Mobile-first e desktop excelente.
- Nunca enviar, gravar ou persistir áudio do microfone.
- Não adicionar Firebase Auth, Firestore, billing ou dependência do MillionsNest Hub ao fluxo público.
- Core DSP deve permanecer testável sem React.
- AudioWorklet captura/bufferiza; análise pesada deve ficar fora da UI.
- Não prometer precisão não medida.
- Não usar iframe como integração principal no MusicScale.
- Não adicionar serviços pagos sem autorização explícita.
- Toda mudança relevante exige typecheck, testes e build.
