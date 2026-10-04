# NestTuner — Roadmap Mestre Canônico

**Atualizado:** 2026-10-04  
**Produto:** NestTuner  
**Repositório:** `prdanielcunha/nesttuner`  
**Domínio canônico:** `https://nesttuner.millionsnest.com`  
**Baseline técnico validado:** `main@404daf8b7e2b98957432079e6c0dc25ad35ff096`  
**Versão NestTuner:** `0.6.0-beta.0`  
**Integração MusicScale:** release `0.10.0-beta.0`, embed imutável `nesttuner-element.v0.4.0-beta.0.js`

> Este documento substitui o checkpoint antigo da PR #4. Código, testes e releases atuais prevalecem sobre checkpoints históricos.

## 1. Visão e decisões imutáveis

NestTuner é o afinador profissional do ecossistema MillionsNest. Existe uma única implementação de produto, um único motor DSP, um único repositório e um único domínio canônico.

Princípios obrigatórios:

- gratuito para afinar;
- sem cadastro no fluxo público;
- processamento do microfone 100% local;
- nenhuma gravação, upload ou persistência do áudio;
- nenhuma API paga necessária ao motor;
- sem Firebase Auth, Firestore, billing ou Hub no fluxo público;
- mobile-first, com desktop excelente;
- PT-BR, EN e ES;
- precisão visual nunca é anunciada como precisão física sem medição real;
- mesma implementação para site público e MusicScale;
- integração MusicScale sem iframe;
- builds reprodutíveis e integração pinada por versão.

Rotas públicas:

- `/pt/`
- `/en/`
- `/es/`
- `/` redireciona conforme idioma.

Aliases antigos existem apenas como redirects permanentes.

## 2. Arquitetura canônica

Fluxo:

```text
Microfone
  -> getUserMedia
  -> AudioWorklet
  -> fila limitada / backpressure
  -> Web Worker
  -> Pitchy / McLeod Pitch Method
  -> gates de silêncio, clipping e clareza
  -> janelas adaptativas
  -> proteção de oitava
  -> estabilização temporal
  -> target + cents + confiança
  -> UI
```

Componentes:

- `packages/tuner-core`: notas, frequências, cents, presets, microtuning e estabilização;
- `packages/tuner-audio`: captura, AudioWorklet, Worker, análise e referência sonora;
- `packages/tuner-ui`: superfície visual compartilhada;
- `packages/tuner-embed`: Web Component `<nest-tuner>`;
- `apps/web`: produto público;
- `tests`: matemática, verdade do runtime, precisão sintética, embed e regressões.

## 3. Precisão e contrato musical

Fórmulas:

`target = A4 * 2^((midi - 69)/12) * 2^(offsetCents/1200)`

`cents = 1200 * log2(measured / target)`

Convenção:

- cents positivos: frequência acima do alvo -> baixar;
- cents negativos: frequência abaixo do alvo -> subir.

Metas de engenharia:

- 55–1000 Hz sintético: p95 <= 0,2 cent;
- 30,87–55 Hz sintético: p95 <= 0,5 cent;
- interface física real: alvo <= 1 cent;
- microfone em ambiente silencioso: alvo <= 2 cents.

### Situação atual

O corpus sintético determinístico já cobre:

- 44,1 kHz e 48 kHz;
- offsets positivos e negativos;
- sinais senoidais e ricos em harmônicos;
- faixa B0/baixo grave;
- ruído broadband com rejeição de falsa nota.

As metas sintéticas p95 do roadmap já possuem testes automatizados. Isso **não** autoriza publicar a mesma precisão como certificação física.

O Modo Fino continua fail-closed: o lock de ±0,5 cent permanece desabilitado até certificação real.

## 4. Recursos entregues

### Motor e captura

- [x] AudioWorklet para captura/buffer;
- [x] análise em Web Worker;
- [x] Pitchy/McLeod;
- [x] janelas 2048 / 4096 / 8192 / 16384;
- [x] aquisição robusta de frequências graves;
- [x] proteção contra salto de oitava;
- [x] estabilizador temporal;
- [x] bounded worker backpressure;
- [x] silêncio/sinal fraco/clipping;
- [x] clareza, dBFS, estabilidade e histórico de pitch;
- [x] pausa/interrupção e retomada;
- [x] seleção de entrada;
- [x] aviso de processamento do navegador;
- [x] aviso para entradas Bluetooth/headset potencialmente inadequadas;
- [x] som de referência com transição sem clique.

### Afinação

- [x] cromático;
- [x] target automático;
- [x] lock manual por corda;
- [x] A4 de 400–480 Hz;
- [x] preferência sustenido/bemol;
- [x] Modo Fino;
- [x] Modo Palco;
- [x] cents em décimos para leitura;
- [x] offset global;
- [x] offset por corda;
- [x] microtuning local;
- [x] preset personalizado de 1–12 cordas;
- [x] persistência local de preferências.

### Instrumentos e presets

Já presentes no código atual:

- guitarra 6 cordas: Standard, Drop D, meio tom abaixo, Drop C, DADGAD, Open G, Open D;
- guitarra 7 cordas Standard;
- guitarra 8 cordas Standard;
- violão: Standard, Drop D, DADGAD, Open G, Open D;
- baixo 4: Standard e Drop D;
- baixo 5: Standard com B0;
- baixo 6: Standard;
- ukulele High G e Low G;
- violino;
- viola;
- cello;
- cavaquinho;
- preset personalizado.

Isso significa que parte significativa do antigo “V1.1” já foi antecipada para o código atual.

## 5. UX/UI canônica

Direção: **instrumento digital editorial de precisão**, não velocímetro genérico, dashboard ou pedal copiado.

Hierarquia:

1. nota dominante;
2. frequência medida;
3. frequência alvo;
4. cents;
5. ação textual: subir / baixar / afinado;
6. régua;
7. histórico;
8. cordas;
9. telemetria;
10. controles avançados.

Tokens-base:

- background `#090B10`
- surface `#11151E`
- elevated `#191F2B`
- border `#293244`
- text `#F4F6FB`
- secondary `#A7B2C6`
- interactive `#9B8CFF`
- tuned `#64DDB1`
- adjustment `#F1C477`
- input error `#F38D96`

Estados obrigatórios:

- idle;
- pedindo permissão;
- bloqueado;
- capturando;
- adquirindo;
- estável;
- afinado;
- instável;
- fraco;
- clipping;
- fora da faixa;
- dispositivo removido/interrupção;
- pausado;
- incompatível;
- referência sonora ativa.

Modo Palco usa Wake Lock quando suportado e reduz distrações.

Acessibilidade:

- teclado;
- foco visível;
- leitor de tela;
- `aria-live` sem anunciar cada frame;
- `prefers-reduced-motion`;
- alvos touch adequados;
- contraste compatível com uso de palco.

## 6. Integração MusicScale

A integração já foi implementada e promovida.

Fluxo canônico:

`MusicScale -> Ferramentas de Palco -> NestTuner`

Contrato:

- sem iframe;
- `<nest-tuner>` dentro do documento do MusicScale;
- idioma herdado do MusicScale;
- áudio continua local;
- runtime do afinador não depende de tenant, billing ou Firestore;
- fallback externo permanece disponível em caso de falha de carregamento;
- MusicScale pinado na versão imutável `0.4.0-beta.0`;
- atualizações futuras do NestTuner não mudam silenciosamente o MusicScale.

Artefato imutável:

`/embed/nesttuner-element.v0.4.0-beta.0.js`

Alias de desenvolvimento:

`/embed/nesttuner-element.js`

## 7. PWA, hosting e release

- [x] Firebase Hosting dedicado;
- [x] domínio canônico;
- [x] rotas PT/EN/ES;
- [x] redirects de aliases antigos;
- [x] PWA;
- [x] Firebase deploy automatizado;
- [x] build reprodutível;
- [x] Yarn 1.22.22 pinado;
- [x] lockfile versionado;
- [x] CI com frozen lockfile;
- [x] smoke contract do embed versionado;
- [x] THIRD_PARTY_NOTICES para dependências DSP.

## 8. Status real em 04/10/2026

### Software concluído

- [x] V1 funcional;
- [x] microtuning;
- [x] presets personalizados;
- [x] instrumentos que originalmente estavam previstos para V1.1;
- [x] integração nativa no MusicScale;
- [x] promoção do MusicScale com NestTuner para production;
- [x] corpus sintético p95;
- [x] sessão local de certificação física com referência independente, métricas p50/p95/máximo, estabilidade, gate de 20 min e export JSON sem áudio;
- [x] build reprodutível;
- [x] runtime que não inventa nota quando não existe sinal confiável;
- [x] proteção de integração por artefato imutável.

### Pendente — não pode ser falsificado por software

- [ ] certificação física em iPhone/Safari;
- [ ] certificação física em Android/Chrome;
- [ ] desktop Chrome/Edge/Safari quando aplicável;
- [ ] guitarra/violão por microfone;
- [ ] guitarra/baixo por interface de áudio;
- [ ] B0 de baixo real;
- [ ] comparação com fonte/referência independente caracterizada;
- [ ] medição de latência percebida;
- [ ] teste contínuo de 20 minutos;
- [ ] ambientes silencioso e palco/igreja;
- [ ] relatório p95 físico;
- [ ] decisão baseada em evidência para ativar ou não ±0,5 cent no Modo Fino.

## 9. Protocolo de certificação física

Para cada combinação relevante de dispositivo + entrada + instrumento:

1. registrar aparelho, OS e navegador;
2. registrar sample rate real;
3. registrar constraints/processing ativo;
4. selecionar referência conhecida;
5. medir notas graves, médias e agudas;
6. testar -20, -10, -5, -2, 0, +2, +5, +10 e +20 cents quando a referência permitir;
7. repetir amostras suficientes para p50/p95;
8. registrar aquisição inicial e estabilidade;
9. testar dinâmica/ataque e decaimento;
10. testar ruído ambiental;
11. testar harmônicos;
12. testar clipping;
13. testar silêncio;
14. testar troca/remoção de dispositivo;
15. testar pausa/background/retorno;
16. rodar sessão contínua mínima de 20 minutos;
17. calcular p95 por faixa;
18. registrar falhas e falsos locks;
19. guardar apenas métricas — nunca áudio do usuário;
20. só então liberar qualquer claim comercial de precisão.

## 10. Próximas fases

### R1 — certificação física

Objetivo: transformar o excelente resultado sintético em precisão comprovada em hardware real.

Ferramenta de coleta implementada no próprio NestTuner: referência independente configurável, captura de métricas locais, separação entre aquisição e amostras estáveis, p50/p95/máximo, estabilidade, tempo de análise, gate de 20 minutos e exportação JSON. Ela não grava nem envia áudio e não transforma o alvo interno em prova de precisão.

Saída:

- relatório por dispositivo;
- relatório por tipo de entrada;
- p95 físico;
- decisão de Fine Lock;
- lista de dispositivos/entradas recomendados e alertas conhecidos.

### R2 — polimento visual e QA real

- safe areas iOS;
- landscape;
- teclado/VoiceOver/TalkBack;
- reduced motion;
- PWA standalone;
- tela bloqueada / retomada;
- dispositivos de entrada removidos;
- layout ultracompacto;
- palco com pouca luz.

### R3 — release profissional validado

Somente após R1 e R2:

- versão estável;
- claims de precisão baseados em dados;
- release notes;
- rollback documentado;
- atualização pinada no MusicScale por nova versão de embed.

### V2

Somente depois da V1 fisicamente certificada:

- temperamentos alternativos;
- Scala/custom temperaments;
- recursos avançados microtonais;
- pesquisa de polifonia, sem prometer viabilidade antes de benchmark.

## 11. Definition of Done

NestTuner pode ser chamado de afinador profissional **fisicamente validado** quando:

- typecheck, testes e build verdes;
- site público e MusicScale usam a mesma implementação;
- o MusicScale usa embed versionado;
- PT/EN/ES funcionam;
- nenhum áudio é enviado ao servidor;
- presets e microtuning funcionam;
- sinais inválidos não geram notas inventadas;
- corpus sintético permanece dentro dos gates;
- QA físico iOS, Android e desktop está documentado;
- precisão real é medida e publicada apenas de acordo com os dados;
- Fine Lock usa tolerância compatível com os resultados físicos;
- existe SHA de release, rollback e versão do embed;
- nenhuma regressão de áudio ou captura está aberta.

## 12. Regra de continuidade

Antes de qualquer mudança:

1. ler `AGENTS.md`;
2. ler este roadmap;
3. ler a implementação e testes atuais;
4. preservar o domínio único;
5. preservar o motor compartilhado;
6. preservar áudio local;
7. preservar integração sem iframe;
8. executar typecheck, testes e build;
9. nunca transformar resolução visual em claim de precisão;
10. nunca recriar o NestTuner dentro do MusicScale.
