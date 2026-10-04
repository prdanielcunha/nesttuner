# NestTuner — Roadmap Mestre e Contrato de Produto

**Atualizado:** 2026-10-04  
**Produto:** NestTuner  
**Repositório:** `prdanielcunha/nesttuner`  
**Domínio canônico:** `https://nesttuner.millionsnest.com`

## 1. Decisões canônicas

NestTuner é um produto próprio do ecossistema MillionsNest. O nome público, técnico e de produto é **NestTuner**, escrito junto.

Existe **uma única aplicação, um único motor de afinação, um único repositório e um único domínio canônico**.

Rotas públicas:
- `/pt/` — Português do Brasil.
- `/en/` — English/global.
- `/es/` — Español.
- `/` — detecta o idioma preferido e direciona para a rota localizada.

Os antigos `afinador.millionsnest.com` e `tuner.millionsnest.com` não são produtos nem páginas independentes. Permanecem somente como aliases de migração com redirect permanente 301 para `/pt/` e `/en/`.

SEO:
- PT: **Afinador Online de Instrumentos | NestTuner**
- EN: **Online Instrument Tuner | NestTuner**
- ES: título e descrição localizados.
- canonical e hreflang sempre apontam para `nesttuner.millionsnest.com`.

## 2. Princípios do produto

- Sem cadastro para afinar.
- Processamento do microfone local no dispositivo.
- Nenhuma gravação ou upload de áudio.
- Nenhuma API paga necessária ao motor.
- Sem Firebase Auth, Firestore, billing ou dependência do Hub no fluxo público.
- Mobile-first e desktop excellent.
- PT-BR, EN e ES.
- Uma única implementação reutilizada no site e no MusicScale.
- Não declarar precisão real que ainda não tenha sido medida em dispositivos físicos.

## 3. Arquitetura

Fluxo de áudio:

```
Microfone
  -> getUserMedia
  -> AudioWorklet (captura/buffer)
  -> Web Worker (análise)
  -> Pitchy / McLeod Pitch Method
  -> gates de sinal + estabilização + proteção de oitava
  -> cálculo de frequência/cents/alvo
  -> UI
```

Camadas:
- `packages/tuner-core` — notas, frequências, cents, presets e estabilização.
- `packages/tuner-audio` — captura, worker, análise e som de referência.
- `packages/tuner-ui` — experiência visual compartilhada.
- `packages/tuner-embed` — Web Component `<nest-tuner>` para integração nativa.
- `apps/web` — experiência pública.
- `tests` — contratos matemáticos, áudio e precisão sintética.

## 4. Integração MusicScale

A integração principal **não usa iframe**.

O mesmo repositório NestTuner publica o ES module:

`https://nesttuner.millionsnest.com/embed/nesttuner-element.js`

Esse módulo registra `<nest-tuner>`, que roda dentro do documento do MusicScale, preservando uma experiência nativa. O MusicScale fornece o idioma atual e mantém a permissão do microfone no próprio contexto da aplicação.

Entrada planejada/canônica:
`MusicScale -> Ferramentas de Palco -> NestTuner`

O NestTuner não altera tonalidade de música, cifra, pad, metrônomo, escala ou contexto organizacional.

## 5. Escopo musical

### V1
- Cromático automático.
- Seleção/lock de corda.
- Guitarra.
- Violão.
- Baixo 4 e 5 cordas.
- A4 ajustável de 400 a 480 Hz em passos de 0,1 Hz.
- Modo Cromático.
- Modo Fino.
- Modo Palco.
- Som de referência.
- Seleção de entrada.
- Detecção de sinal fraco, instável e clipping.
- Presets principais.
- Preferências locais.

Guitarra/violão:
- Standard.
- Drop D.
- Half-step down.
- Drop C.
- DADGAD.
- Open G.
- Open D.

Baixo:
- 4 cordas Standard.
- 4 cordas Drop D.
- 5 cordas Standard, incluindo B0.

### V1.1
- Guitarra 7/8 cordas.
- Baixo 6 cordas.
- Ukulele.
- Violino.
- Viola.
- Cello.
- Cavaquinho.
- Guia de oitava.
- Presets personalizados com edição segura.

### V2
- Temperamentos.
- Scala/custom temperaments.
- Recursos avançados validados para microafinação.

Fora do escopo imediato:
- afinador polifônico completo;
- piano completo;
- reconhecimento por IA/cloud.

## 6. Precisão

Fórmulas canônicas:

`target = A4 * 2^((midi - 69)/12) * 2^(offsetCents/1200)`

`cents = 1200 * log2(measured / target)`

Convenção:
- cents positivos: frequência acima do alvo -> **baixar**.
- cents negativos: frequência abaixo do alvo -> **subir**.

Objetivos de engenharia, não promessas comerciais:
- sintético estável 55–1000 Hz: p95 alvo <= 0,2 cent;
- sintético grave 30,87–55 Hz: p95 alvo <= 0,5 cent;
- interface real: <= 1 cent como alvo;
- microfone em ambiente silencioso: <= 2 cents como alvo.

Modo Fino pode exibir resolução de 0,1 cent, mas **resolução visual não equivale a precisão física**. O lock de sucesso de ±0,5 cent somente poderá ser ativado depois de certificação física.

## 7. UX/UI

Direção visual: **instrumento digital editorial de precisão**, e não velocímetro, pedal genérico ou dashboard.

Tokens-base:
- background: `#090B10`
- surface: `#11151E`
- elevated: `#191F2B`
- border: `#293244`
- text: `#F4F6FB`
- secondary: `#A7B2C6`
- interactive: `#9B8CFF`
- tuned: `#64DDB1`
- adjustment: `#F1C477`
- input error: `#F38D96`

Hierarquia:
1. nota dominante;
2. frequência;
3. cents;
4. direção textual;
5. régua horizontal;
6. cordas;
7. controles contextuais.

Modo Fino usa régua ±5 cents e movimento estroboscópico, respeitando `prefers-reduced-motion`.

Modo Palco maximiza legibilidade, mantém tela ativa quando suportado e reduz distrações.

Estados obrigatórios:
idle, pedindo permissão, bloqueado, capturando, adquirindo, estável, afinado, instável, fraco, clipping, fora da faixa, dispositivo removido/interrupção, pausado, incompatível e som de referência ativo.

## 8. Status de implementação

### Concluído
- [x] Nome NestTuner consolidado.
- [x] Repositório separado.
- [x] Domínio canônico único preparado.
- [x] Rotas PT/EN/ES.
- [x] SEO localizado e hreflang.
- [x] Aliases antigos convertidos em 301.
- [x] Hosting Firebase dedicado.
- [x] DNS Cloudflare automatizado.
- [x] PWA.
- [x] Core musical.
- [x] Captura por AudioWorklet.
- [x] Análise em Worker.
- [x] Pitchy/McLeod.
- [x] Gates de silêncio/sinal fraco/clipping.
- [x] Janelas adaptativas 2048/4096/8192/16384.
- [x] Estabilização e proteção contra glitch de oitava.
- [x] Modos Cromático/Fino/Palco.
- [x] A4, referência sonora e seleção de entrada.
- [x] UI pública responsiva.
- [x] Artefato nativo de embed `<nest-tuner>`.
- [x] Testes matemáticos e banco sintético inicial.
- [x] CI e deploy automatizados.

### Em andamento
- [ ] Integração do Web Component no MusicScale e certificação do fluxo completo.
- [ ] Refinamento dos presets V1 e preset personalizado.
- [ ] Testes de desempenho/latência em dispositivos-alvo.
- [ ] Certificação física comparada com referência independente.
- [ ] QA real de Safari/iOS, Chrome/Android e desktop.
- [ ] Relatório de precisão p95 por faixa/instrumento.

### Depois da certificação
- [ ] Liberar regra Fine ±0,5 cent somente se os dados suportarem.
- [ ] V1.1 de instrumentos.
- [ ] Guia de oitava.
- [ ] Presets avançados/custom.
- [ ] Temperamentos/Scala em V2.

## 9. Definition of Done V1

A V1 só pode ser chamada de afinador profissional validado quando:
- core matemático, CI e build estiverem verdes;
- site público e integração MusicScale usarem a mesma implementação;
- permissão/negação/pausa/interrupção/dispositivo removido funcionarem;
- nenhum áudio for enviado para servidor;
- PT/EN/ES funcionarem;
- PWA e rotas localizadas funcionarem;
- presets V1 estiverem completos;
- testes sintéticos e físicos estiverem documentados;
- precisão real publicada corresponder aos dados medidos;
- iOS/Safari, Android/Chrome e desktop-alvo tiverem QA registrado;
- houver SHA de release e rollback claro.

## 10. Regra de continuidade

Antes de qualquer mudança:
1. ler `AGENTS.md`;
2. ler este roadmap;
3. localizar a implementação e testes atuais;
4. preservar o domínio canônico único e o motor compartilhado;
5. executar typecheck, testes e build;
6. não duplicar o afinador em outro repositório ou página;
7. não criar promessa de precisão sem medição.
