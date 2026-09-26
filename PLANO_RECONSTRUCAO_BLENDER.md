# Reconstrução 3D do site TGDevs — Blender + WebGPU

## Objetivo aprovado

Reconstruir a experiência do site desde a abertura até o último frame imediatamente anterior ao preview do CRM TGBC. Remover do site ativo o preview CRM e tudo o que vem depois dele. Preservar, sem mudar sua intenção, a sequência, as marcas, a narrativa e a timeline guiada pelo scroll existentes no projeto original.

Os projetos de marca originais continuam sendo a fonte de verdade no computador. Blender lê esses arquivos diretamente, gera uma cena editável e exporta os assets usados pelo site. O runtime visual é integralmente WebGPU com Three.js `WebGPURenderer` e TSL; se o browser não oferecer/inicializar WebGPU, o site informa a indisponibilidade em vez de cair para WebGL.

## Experiência que deve permanecer

1. Abertura e construção da identidade TGDevs.
2. Textos e slogans na ordem do site atual.
3. Campo de partículas em duas folhas, que dobra para a esfera e volta no deslocamento reverso.
4. Desmontagem TGDevs e construção modular horária do símbolo TGBC.
5. Frase “Sua empresa merece :” e lockup TGBC como último estado.

O novo scroll normaliza o intervalo original `p=0..0,439` para `p=0..1`. O preview CRM começa em torno de `p=0,44` no site original e fica fora da página reconstruída. A fase do app/preview inicia exatamente em `p=.440` no código-fonte `world3d-r16-r28.js`; a reconstrução termina no estado original `p=.439`. Nesse ponto, o lockup TGBC já está completo e a frase está em `93,9%` da opacidade final. Manter esse frame preserva a curva original e deixa a fase seguinte fora do site.

## Fontes canônicas locais

- TGDevs: imagem de marca atual entregue pelo usuário, arquivada em `blender/sources/tgdevs-logo-current.png`; contornos e SVG locais continuam como referência para o loader/timeline.
- TGBC: `Documents/TGBC-FULL/TGBusinessCenter/logo-fav/fav.png` e `logotext-dark.png`.
- Blender 5.2.1 LTS instalado em `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`.

O build não precisa das cópias intermediárias de marcas dentro do site. Os exports Blender que o runtime consome ficam versionados/agrupados em `blender/assets/`.

## Estado atual implementado

- `index.html` inicia `site-webgpu.js` e remove o CRM e cenas posteriores do fluxo ativo.
- O runtime atual cria Three.js `WebGPURenderer`, usa TSL para a nuvem e animação dos pontos, testa `navigator.gpu`, desabilita o fallback interno para WebGL do Three.js e confirma `renderer.backend.isWebGPUBackend`. WebGPU ausente ou falha de inicialização mostra mensagem explícita. Erros de boot e rejeições ao carregar assets também substituem a mensagem inicial por um aviso visível.
- `blender/build_brand_assets.ps1` reconstrói `tgdevs_brands_r2.blend`, exporta quatro GLBs Draco, favicons PNG, Open Graph e dois buffers compactos de pontos para o morph do símbolo.
- Dois conjuntos de 7.200 amostras (`tgdevsMark`, `tgbcMark`) alimentam o morph; TGDevs vem da alfa/cor da marca atual, TGBC dos contornos Blender. As wordmarks são imagens oficiais incorporadas em malhas/GLBs. A timeline de origem não cria revelações de pontos nas wordmarks e deixa `wordFragments` nulo; o runtime mantém pontos exclusivamente no morph do símbolo TGDevs→TGBC.
- Três buffers `.bin` antigos de amostras de wordmarks continuam localmente: `tgbcWord-points-r1.bin`, `tgbc-wordmark-points-r1.bin` e `tgdevsWord-points-r1.bin`. Não são produzidos pelo build atual, importados nem requisitados pelo runtime e não fazem parte dos downloads do site.
- O símbolo TGBC é composto por malhas Blender com módulos nomeados e índice de módulo em extras GLTF, para a construção horária controlada pelo scroll. O wordmark TGBC usa a imagem oficial incorporada à malha/GLB.
- A composição muda para a pilha vertical em retrato e em paisagens compactas com razão largura/altura abaixo de `1,5`; isso mantém a frase e o lockup dentro do quadro em tablets quase quadrados, como 1024×768.
- A marca final do TGBC fica no centro durante a montagem e a entrada da frase; sua wordmark fica à direita. A comparação com `world3d-r16-r28.js` encontrou e corrigiu o movimento indevido do símbolo através do texto.
- Blender lê o SVG do loader diretamente do projeto TGDevs original e exporta `tgdevs-loader-r1.svg`; o arquivo gerado (613 bytes) foi comparado e é idêntico à string canônica.
- A nuvem é gerada por nós TSL: 16.000 amostras no desktop e 9.000 em retrato; preserva as duas folhas, a dobra esférica, a paleta e as fases do scroll do original.
- O indicador circular de montagem TGDevs desaparece depois de sua cena (`p=.13..15`), evitando que seu traçado permaneça como artefato por cima do lockup TGBC.
- No build r21, os quatro GLBs de marca somavam 463.516 bytes. Essa saída foi substituída pelo r22 abaixo; Three.js 0.180, GLTF/Draco loaders e licenças continuam em `vendor/webgpu/`.
- **r22 — correção das marcas:** TGDevs favicon e wordmark agora usam o PNG horizontal atual fornecido pelo usuário, recortado para símbolo e letras sem a marca antiga `TGdevs.pp.ua`. O site aplica a textura sem iluminação/tint da cena, preservando a paleta azul→ciano→verde da fonte. A TGBC usa o favicon original do projeto TGBC para o lockup; as peças vetoriais seguem disponíveis para a montagem horária. As versões compactas de favicon PNG são centradas e mantêm o fundo transparente.
- No mobile, o símbolo fica em `y=1,7` dentro do grupo WebGPU, a wordmark empilhada em `y=-0,35` e o grupo geral em `y=-0,95`; os módulos TGBC usam `y=1,28`. Esse ajuste centraliza o favicon e mantém a palavra abaixo dele, com o loader deslocado para acompanhar. O desktop e a progressão de scroll ficam preservados.
- O r22 exporta `tgdevs_brands_r2.blend` e quatro GLBs Draco (`991.336` bytes combinados), dois favicons 512×512 e Open Graph 1200×630 derivado da logo atual com fundo escuro. O build completo terminou com código 0.
- Nenhuma publicação foi feita.
- Build completo repetido nesta etapa e novamente após o r20: Blender 5.2.1 regenerou a cena editável, os quatro GLBs, os renders de favicon/social e as versões web otimizadas; as execuções terminaram com código de saída 0. O preview renderizado da cena confirma os dois lockups e a montagem modular TGBC. O r21 passou pelo build completo; os quatro GLBs somam 463.516 bytes.
- Os recursos centrais r21 responderam HTTP 200 no preview local. Para o estado atual r22, o preview local inicializa `WEBGPU • TSL` com os quatro GLBs novos.
- A comparação do runtime com `world3d-r16-r28.js` encontrou diferenças na entrada/saída dos quatro slogans. O runtime corrige isso com as faixas originais `[[0,.040],[.035,.075],[.070,.110],[.105,.185]]`, mantém suas sobreposições e reaplica os deslocamentos originais em profundidade e rotação. A paridade numérica com a tabela-fonte foi conferida.
- Capturas da versão r19 (mesmo percurso visual do r20) cobrem os quatro slogans, as transições sobrepostas, a esfera, os seis estágios de montagem TGBC, a frase e o lockup final nos cinco viewports. Comparei a fase do slogan 3 em `1280×720` com a fonte local em `p=.09`; a sequência e a coexistência com a montagem TGDevs são intencionais no original.

## Verificações concluídas

- O build `powershell -ExecutionPolicy Bypass -File blender\build_brand_assets.ps1` concluiu com código 0 após a simplificação para dois buffers: quatro GLBs, favicon, imagem Open Graph e amostras vetoriais.
- `node --check site-webgpu.js` e `git diff --check` passaram; Git apenas informa conversão de newline de `index.html` para CRLF.
- HTTP local em `127.0.0.1:8765` respondeu 200 para HTML, CSS, JS, pacote Three.js WebGPU, quatro GLBs de marca, os dois buffers vetoriais carregados pelo runtime e SVG Blender.
- O Edge indicou `WEBGPU • TSL` depois da inicialização no caminho suportado. No r20, o fallback automático WebGL do Three.js 0.180 fica desativado antes de `init()`.
- Revisão visual do último estado em `320×568`, `390×844`, `768×1024`, `1024×768` e `1280×720`: frase, símbolo e wordmark visíveis, sem corte. `1024×768` usa a pilha vertical compacta.
- Validação automatizada do r20 no Edge em `320×568`, `390×844`, `768×1024`, `1024×768` e `1280×720`: 21 pontos de scroll percorridos para frente e depois para trás em cada tamanho (210 amostras no total). Em todas as amostras, o status permaneceu `WEBGPU • TSL`, a barra correspondeu à posição de scroll e não houve erros de página nem de console. A revisão visual dos finais nos cinco tamanhos e das fases listadas acima também não encontrou cortes.
- Teste adicional de fluidez no Edge/WebGPU em `1920×1080`, `2560×1440` e `3840×2160`, mais `3840×2160` com DPR 1,5 e mobile `390×844` com DPR 3: entre `57,6` e `58,5 FPS`, p95 de quadro `16,8 ms` nas medições coletadas e nenhum erro de página. O canvas 4K/DPR 1,5 foi renderizado a `5760×3240`; o mobile/DPR 3 respeitou o limite interno de DPR 1,8 e renderizou a `702×1519`. Todos esses resultados usam a GTX 1660 desta máquina.
- Os seis passos TGBC foram inspecionados individualmente em `p≈.654,.695,.733,.773,.813,.853`. A direção visual progride do topo no sentido horário. Em `p=.95`, a entrada da frase foi revista após ancorar o símbolo ao centro; não há cruzamento. A frase e o lockup finais estão visíveis em `p=1`.
- A revisão de transição no mobile `390×844` mostrou slogan/TGDevs em `p=.11,.26`, esfera e início de montagem em `p=.68`, e a entrada do lockup em `p=.95`, sem cortes ou sobreposição. No desktop, também foram verificados `p=.26,.50,.598,.68,.95,1`; o retorno por `p=.50` até `p=0` voltou à marca TGDevs.
- Edge registrou console sem erros/avisos após a inicialização e as revisões r15. O In-app Browser mostrou o mesmo resultado no r17. Os recursos usados (HTML, JS, CSS, quatro GLBs, dois buffers, SVG) responderam HTTP 200.
- A inspeção atual do `PerformanceResourceTiming` no Edge r21 contou 22 recursos no carregamento frio, com `transferSize` combinado de `2.223.052` bytes. Os quatro GLBs somam 463.516 bytes; o total inclui os módulos Three.js, loaders e runtime.
- O desenho é acionado por scroll/resize e agrupado em `requestAnimationFrame`; não há renderização WebGPU contínua quando a página está parada. O runtime desenha até 16.000 pontos no desktop e reduz para 9.000 em retrato. No Edge/WebGPU com a NVIDIA GTX 1660, dois percursos de scroll contínuo de 10 segundos mediram `59,2 FPS`, p50 `16,7 ms`, p95 `16,8 ms`, com 1 frame acima de 20 ms e nenhum erro em `1280×720` e `390×844`. Os testes adicionais até 4K/DPR 1,5 e mobile/DPR 3 também permaneceram perto de 58 FPS. São testes de resolução e densidade no mesmo hardware, não substituem GPU integrada/de entrada.
- A comparação Blender anterior dos mesmos quatro modelos em export sem Draco resultou em `642.032` bytes contra `221.256` nos GLBs daquela execução. Após o build r20, os quatro GLBs Draco atuais somam `221.332` bytes. O runtime não solicita o JS fallback do decoder; o export Draco permanece substancialmente menor que o conjunto sem Draco.
- Comparação direta com o site original local foi feita nos pontos `p=0`, `p=.325` e `p=.439` em `1280×720`: abertura discreta, tamanho/distribuição da esfera e intervalo de gradiente/lockup final.
- Revalidação do r21 no Edge em `320×568`, `390×844`, `768×1024`, `1024×768` e `1280×720`: 21 pontos de scroll ida/volta por viewport (210 amostras); status `WEBGPU • TSL`, barra alinhada, zero erros e término do track em 5.268 px, correspondente ao limite anterior ao CRM.
- Revisão visual r22 no Edge/WebGPU: abertura em `1280×720` e viewport `390×844` mostra a marca atual TGDevs legível e centralizada; a palavra permanece abaixo no mobile. O lockup TGBC final carrega o ícone e wordmark originais. O logo Open Graph r22 também foi inspecionado depois de compor o PNG transparente sobre fundo escuro.

## Hardware de referência e escopo validado

A NVIDIA GeForce GTX 1660 é a única GPU física disponível nesta máquina; o Parsec Virtual Display Adapter é um adaptador virtual. Ela fica definida como hardware de referência deste site, sem exigir uma segunda GPU. O r21 foi percorrido no Edge/WebGPU em cinco viewports, com ida e volta por 21 pontos de scroll em cada tamanho (210 amostras), além de medidas de fluidez até 4K e testes de densidade/DPR no mesmo hardware. O percurso termina antes do CRM, na marca TGBC.

Os resultados comprovam o funcionamento e a fluidez medidos nesta GTX 1660. Viewports mobile emulados e resoluções altas não equivalem a testes em outros modelos de GPU; portanto, o plano não atribui números de desempenho a GPUs integradas ou de entrada. O pacote em `dist/tgdevs-webgpu-validation-r21.zip` fica disponível como referência portátil, caso outro equipamento exista no futuro, e não é requisito para concluir este trabalho.

Nenhuma publicação foi feita. Preview local: `http://127.0.0.1:8765/`.
## Como reconstruir os assets

### Correção de orientação e do favicon TGBC (r21)

- O wordmark TGDevs agora usa a arte oficial local, recortada para retirar o favicon duplicado e reduzida a 2048 px antes de ser embutida numa face Blender/GLB. Isso preserva o lockup e corrige o espelhamento do texto mantendo o peso do arquivo menor que a metade do primeiro export. O favicon da abertura permanece centrado na viewport.
- Substituído o favicon TGBC modular aproximado pelas oito regiões vetoriais do `brandContours-r1.js`; cada região recebe um índice Blender exportado no GLB e a montagem continua organizada em seis etapas mais o núcleo.
- A exportação TGBC converte as curvas selecionadas em malhas antes de embutir `moduleIndex`, evitando nós duplicados e garantindo que os oito grupos sejam identificados no runtime.
- O asset TGDevs da abertura mantém o centro do grupo no centro da viewport. O ícone TGBC no lockup permanece alinhado à esquerda do wordmark conforme a composição original.
- Verificação: build completo Blender/Draco/FFmpeg terminou com código 0; Edge iniciou como `WEBGPU • TSL` e percorreu abertura, lockup TGDevs corrigido, montagem vetorial TGBC e lockup final sem erros de console/página. O build HTML e as URLs dos GLBs/buffers receberam cache-busting r21.
- Revisão visual confirmou TGDevs legível da esquerda para a direita, ícone na posição central da abertura e TGBC montado a partir das regiões oficiais. Capturas da execução ficam em `%LOCALAPPDATA%\Temp\tgdevs-r21-*`.
- O wordmark TGDevs exportado ficou em 299.796 bytes; os quatro GLBs somam 463.516 bytes. O render Open Graph foi inspecionado e mostra um único lockup sem símbolo duplicado. `node --check site-webgpu.js` e `git diff --check` passaram; o Edge também confirmou o estado final em desktop e mobile com WebGPU ativo.

Na raiz do projeto:

```powershell
powershell -ExecutionPolicy Bypass -File blender\build_brand_assets.ps1
```

O script usa as fontes canônicas nos projetos vizinhos; Blender deve continuar instalado no caminho indicado. `ffmpeg` também é necessário para a amostragem do wordmark e a conversão dos exports web.

### Restauração das métricas da Cena 1

A comparação com `TGWorld3D` do site anterior identificou os desvios: o grupo do favicon havia sido movido no retrato (`markY=1.62` e deslocamento global `-1.4`), ampliado até `.9` em vez de manter escala `.74`, e o wordmark não respeitava o limite de 3,05 unidades. Restaurados o emblema no centro da câmera, escala unitária em paisagem e `.74` em retrato; o wordmark usa a altura real exportada para manter o vão vertical original.

As três peças originais (cada canvas `2369 × 2394 px`) agora são camadas Blender alinhadas, sem redimensionamento ou reposicionamento independente. O setor visível do aro começa às 7 horas e avança no sentido horário; engrenagem e ponteiro giram no plano da arte. O favicon TGBC foi normalizado para a mesma altura do canvas TGDevs. As frases voltaram às posições verticais `2.38` e `2.18` em retrato. O master Blender e os GLBs foram regenerados; a prévia WebGPU foi conferida em `p=0, .177, .248, .310 e 1`.


