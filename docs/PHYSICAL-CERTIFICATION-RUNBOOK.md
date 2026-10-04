# NestTuner — Runbook de Certificação Física R1

**Versão do produto em validação:** 0.6.1-beta.0  
**Baseline de software:** `5cb52785d2ae031538612ccb0ef1971f8364aee3`  
**Objetivo:** transformar os gates sintéticos já comprovados em evidência física reproduzível, sem gravar nem enviar áudio.

> Este runbook não autoriza claim comercial de precisão por si só. A precisão física só pode ser declarada depois de executar a matriz, revisar os relatórios exportados e documentar os resultados reais.

## 1. O que o laboratório mede

O painel **Ajustes avançados -> Certificação física** coleta somente métricas derivadas da análise local:

- frequência de referência informada;
- frequência medida pelo NestTuner;
- erro assinado em cents;
- clareza;
- dBFS;
- estado estável/instável;
- tempo interno de análise do frame;
- tamanho/janela de análise;
- sample rate;
- informações técnicas da entrada e navegador;
- duração da sessão.

O relatório não contém áudio, waveform ou gravação do microfone.

### Métricas principais

- **p50 absoluto:** erro típico/mediano das amostras estáveis;
- **p95 absoluto:** 95% das amostras estáveis ficam nesse erro ou abaixo;
- **erro máximo:** pior amostra estável observada;
- **stable rate:** proporção de leituras `status=ok` consideradas estáveis;
- **analysis p95:** tempo de processamento interno da análise; não é latência ponta a ponta;
- **gate 20 min:** comprova duração mínima da sessão, não precisão.

Amostras instáveis participam da taxa de estabilidade, mas **não** entram em p50/p95/max de precisão.

## 2. Regra da referência independente

O campo **Referência independente** deve representar uma frequência externa ao algoritmo que está sendo testado.

O botão **Usar alvo atual** é útil para preparar a sessão, mas **não transforma o alvo interno em referência de certificação**.

### Níveis de evidência

#### Nível A — certificação de engenharia

Preferido para qualquer claim numérico público.

Usar uma fonte externa cujo erro seja conhecido ou previamente caracterizado, por exemplo:

- gerador de sinal calibrado;
- fonte digital/clock de áudio previamente medida;
- cadeia de teste cuja frequência real tenha sido verificada contra instrumento de referência adequado.

Registrar no relatório/anotações externas:

- equipamento;
- modelo;
- frequência nominal;
- tolerância ou medição real conhecida;
- conexão utilizada;
- data.

#### Nível B — validação comparativa

Aceitável para QA interno, não para claim metrológico absoluto.

Comparar simultaneamente o NestTuner com pelo menos uma referência independente confiável e registrar divergências.

#### Nível C — instrumento musical real

Valida comportamento de músico, aquisição, harmônicos, ruído e usabilidade; **não** prova sozinho precisão absoluta em cents porque a própria corda varia durante ataque e sustain.

## 3. Matriz mínima obrigatória

### Dispositivos/navegadores

| ID | Plataforma | Navegador | Obrigatório |
|---|---|---|---|
| D1 | iPhone/iOS | Safari atual | Sim |
| D2 | Android | Chrome atual | Sim |
| D3 | Desktop Windows/macOS | Chrome/Edge/Safari aplicável | Sim |
| D4 | PWA instalada | engine da plataforma | Sim |

Registrar versão exata de OS e navegador no relatório de execução.

### Entradas

| ID | Entrada | Objetivo |
|---|---|---|
| I1 | Microfone interno | uso casual/profissional sem acessórios |
| I2 | Interface de áudio com fio | guitarra/baixo com melhor SNR |
| I3 | Microfone externo com fio, se disponível | comportamento alternativo |
| I4 | Bluetooth/headset | confirmar aviso e degradação; não é referência preferida |

### Instrumentos/faixas

| ID | Caso | Pontos prioritários |
|---|---|---|
| M1 | Guitarra/violão | E2, A2, D3, G3, B3, E4 |
| M2 | Baixo 4 cordas | E1, A1, D2, G2 |
| M3 | Baixo 5 cordas | **B0**, E1, A1, D2, G2 |
| M4 | Cordas agudas | violino/ukulele/cavaquinho conforme disponibilidade |
| M5 | Cromático | graves, médios e agudos fora dos presets |

B0 é gate explícito porque exige janela longa e é uma das condições mais difíceis do produto.

## 4. Teste de precisão por frequência

Para cada combinação importante de dispositivo + entrada:

1. Fechar apps que usem microfone.
2. Abrir NestTuner na versão em teste.
3. Selecionar a entrada correta.
4. Abrir **Ajustes avançados**.
5. Confirmar sample rate e se o navegador manteve AGC/noise suppression/echo cancellation.
6. Abrir **Certificação física**.
7. Informar a frequência real da fonte independente.
8. Iniciar a sessão.
9. Sustentar o sinal por tempo suficiente para aquisição e estabilidade.
10. Obter no mínimo 100 amostras úteis por ponto; preferível 300+.
11. Finalizar e exportar JSON.
12. Repetir para frequências graves, médias e agudas.
13. Repetir em 44,1 kHz e 48 kHz quando a cadeia/dispositivo permitir.
14. Nunca misturar frequências de referência diferentes na mesma sessão.

### Offsets recomendados

Quando a fonte permitir ajuste conhecido, testar:

- -20 cents;
- -10;
- -5;
- -2;
- 0;
- +2;
- +5;
- +10;
- +20.

Para uma frequência base `f`:

`f_offset = f * 2^(cents/1200)`

## 5. Teste específico de B0

Frequência nominal no A4=440: aproximadamente **30,8677 Hz**.

Executar separadamente:

- B0 puro/senoidal da referência;
- B0 com conteúdo harmônico;
- baixo real, corda B aberta;
- interface com fio;
- microfone interno;
- ambiente silencioso;
- ambiente de igreja/palco.

Verificar:

- tempo de aquisição;
- se ocorre salto de oitava;
- stable rate;
- p95;
- falsos locks;
- recuperação após parar e tocar novamente.

Qualquer lock frequente em B1/oitava errada bloqueia certificação profissional de baixo 5 cordas até correção.

## 6. Teste de aquisição e estabilidade

A precisão só é útil se a nota entrar rápido e permanecer estável.

Para cada faixa:

1. silêncio por 2 s;
2. iniciar nota;
3. observar tempo até primeira leitura útil;
4. observar tempo até estado estável;
5. sustentar por 5–10 s;
6. parar;
7. confirmar que a UI deixa de apresentar leitura antiga;
8. repetir 20 vezes.

Registrar separadamente falhas de:

- aquisição lenta;
- falsa nota;
- salto de oitava;
- instabilidade;
- leitura “presa” após silêncio.

O `analysis p95` do relatório é apenas custo computacional do Worker. Latência percebida deve ser medida à parte se for necessária uma métrica ponta a ponta.

## 7. Teste contínuo de 20 minutos

Objetivo: detectar drift, vazamento, throttling, queda de Worklet/Worker e deterioração térmica.

1. Reiniciar a página/PWA.
2. Começar com bateria/energia registrada.
3. Iniciar certificação.
4. Manter sessões de sinal recorrentes durante pelo menos 20 minutos.
5. Alternar grave/médio/agudo quando aplicável.
6. Observar memória, responsividade e aquecimento perceptível.
7. Confirmar que o gate **20 min** fica atingido.
8. Exportar JSON.
9. Pausar e retomar.
10. Confirmar que o afinador volta a adquirir normalmente.

Não aprovar estabilidade de longo prazo apenas porque o cronômetro chegou a 20 minutos; revisar o comportamento da sessão.

## 8. Interrupções e lifecycle

Executar em mobile:

- ir para background e voltar;
- bloquear/desbloquear tela;
- trocar orientação;
- remover interface/microfone externo;
- reconectar entrada;
- negar microfone;
- permitir microfone depois;
- trocar dispositivo de entrada;
- iniciar/parar som de referência;
- entrar/sair do Modo Palco;
- PWA fechada e reaberta.

Critérios:

- nenhuma nota inventada;
- nenhum áudio continua capturando quando deveria estar pausado;
- nenhum crash;
- nenhuma permissão silenciosamente ampliada;
- estado visual corresponde ao estado real;
- retomada exige reaquisição antes de mostrar “afinado”.

## 9. Ruído, clipping e harmônicos

### Ruído

- silêncio;
- ventilador/ar;
- fala;
- música ambiente;
- palco em passagem de som.

Esperado: ausência de lock confiante quando não há fundamental confiável.

### Clipping

Aumentar entrada até saturar deliberadamente em ambiente controlado.

Esperado:
- estado de clipping visível;
- nenhuma falsa indicação de precisão;
- recuperação quando o nível volta ao normal.

### Harmônicos

Instrumentos reais e sinais ricos em 2º/3º/4º harmônicos.

Esperado:
- fundamental correto;
- proteção contra oitava;
- transição estável.

## 10. Critérios de aceite provisórios R1

Estes valores são **gates de engenharia**, não claims públicos automáticos.

### Fonte caracterizada / interface

- p95 absoluto alvo: <= 1,0 cent;
- nenhum falso lock sistemático;
- B0 sem salto de oitava recorrente;
- stable rate compatível com operação musical contínua;
- sem regressão após 20 minutos.

### Microfone interno em ambiente silencioso

- p95 absoluto alvo: <= 2,0 cents;
- aquisição consistente;
- sem falsos positivos em silêncio/ruído;
- sem regressão clara entre início e fim da sessão.

### Fine Lock ±0,5 cent

Permanece **DESABILITADO**.

Só pode ser habilitado se uma matriz física suficiente demonstrar que:
- a dispersão real sustenta a tolerância;
- dispositivos-alvo não induzem falsa sensação de precisão;
- comportamento em graves, incluindo B0, é aceitável.

## 11. Convenção de nomes dos relatórios

Guardar relatórios fora do produto usando:

`YYYY-MM-DD__device__browser__input__case__referenceHz.json`

Exemplos:

`2026-10-04__iphone__safari__internal-mic__guitar-e2__82.4069.json`

`2026-10-04__android__chrome__wired-interface__bass-b0__30.8677.json`

Não renomear o conteúdo do relatório nem editar números manualmente.

## 12. Resultado por combinação

Cada combinação deve terminar em um dos estados:

- **PASS** — cumpre os gates aplicáveis;
- **PASS WITH NOTE** — cumpre, mas existe limitação documentada;
- **FAIL** — não cumpre;
- **NOT TESTED** — sem evidência;
- **NOT APPLICABLE** — caso não se aplica.

Nunca converter ausência de teste em PASS.

## 13. Checklist para liberar release estável

- [ ] iPhone/Safari validado;
- [ ] Android/Chrome validado;
- [ ] desktop validado;
- [ ] PWA validada;
- [ ] microfone interno validado;
- [ ] interface com fio validada;
- [ ] guitarra/violão validados;
- [ ] baixo 4 cordas validado;
- [ ] baixo 5 cordas / B0 validado;
- [ ] 20 minutos concluídos por plataforma principal;
- [ ] lifecycle/interrupções aprovados;
- [ ] clipping/ruído/harmônicos aprovados;
- [ ] p50/p95 revisados;
- [ ] nenhum claim excede os dados;
- [ ] decisão explícita sobre Fine Lock;
- [ ] SHA e versão de release registrados;
- [ ] rollback definido;
- [ ] MusicScale continua pinado até nova integração ser certificada separadamente.

## 14. Regra final

**Resolução de 0,1 cent na tela não é sinônimo de precisão de 0,1 cent.**

A força do NestTuner deve vir de:
- DSP sólido;
- comportamento previsível;
- evidência reproduzível;
- transparência sobre limitações;
- experiência musical excelente.
