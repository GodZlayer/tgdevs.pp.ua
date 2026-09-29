# Preview WebGPU TGDevs e fluxo de cena Blender

O arquivo `assets/tgdevs_site_experience_r1.blend` é a fonte editável e contém a cena modular, a timeline e os parâmetros do campo de partículas. O exportador produz `assets/tgdevs_universe_r1.glb`: um único pacote com todas as malhas visíveis, a timeline amostrada, a disposição de partículas e os alvos vetoriais usados na transição das marcas. A timeline e os dados WebGPU vivem no campo glTF `asset.extras.tgdevs` dentro do mesmo GLB. O runtime do site lê esse único pacote, mapeia o scroll ao quadro e processa as interações; não precisa do Blender instalado.

Para editar a cena, abra o `.blend` e modifique os objetos da coleção `03 • Exported interactive website artwork` ou as curvas nomeadas no Empty `TIMELINE • Scroll-controlled scene state`. No Outliner, selecione um módulo — por exemplo `TGDEVS_GEAR`, `TGDEVS_ARC`, `TGDEVS_WORD`, `TGBC_MODULE_1` ou `SLOGAN_01` — e use `G` para mover, `R` para girar e `S` para redimensionar. Os elementos dentro de cada Empty podem ser ajustados individualmente expandindo sua hierarquia. Materiais e malhas continuam editáveis nos painéis Material Properties e Edit Mode. Salve o `.blend` e exporte os dados que o site serve:

```powershell
.\blender\export_site_artifacts.ps1
```

Esse export lê a cena e a timeline existentes, preserva as edições no `.blend` e regenera o GLB autocontido. `build_site_experience.py` cria a cena inicial a partir das marcas canônicas. `build_site.ps1` preserva a cena mestre existente; use `-RebuildSiteMaster` somente para recriar a composição a partir das fontes canônicas locais.

O runtime combina os transforms base exportados do Blender com os deslocamentos responsivos e animações da timeline. Assim, mover um objeto no Blender muda sua posição de autoria e as regras de enquadramento mobile/desktop continuam funcionando. As curvas com propriedades nomeadas no Empty `TIMELINE • Scroll-controlled scene state` são a timeline ativa: ajuste-as no Graph Editor; o exportador amostra cada frame e o scroll reproduz esses valores.

## Edição visual com preview e timeline

O navegador é o monitor interativo da cena: os mesmos canais exportados do Blender dirigem tanto o scroll normal quanto o modo de inspeção quadro a quadro. Com o site servido em localhost, abra `http://localhost:8765/?editor=timeline`. Arraste a régua para qualquer quadro ou clique num marcador para inspecionar a pose. O modo editor pausa o scroll e não altera os canais; remova `?editor=timeline` para voltar à experiência normal.

O Blender é o editor de autoria recomendado para mexer na composição, curvas, timing, marcadores, geometria e materiais. O campo de partículas 3D é deformado em tempo real por shaders TSL/WebGPU em `site-webgpu.js`; nós de shader do Blender não são convertidos em TSL. Uma nova lógica visual de shader precisa também de implementação no runtime, embora seus dados de entrada permaneçam no GLB. Alguns materiais das camadas originais do favicon são deliberadamente trocados no runtime por materiais de textura WebGPU simples. O Premiere Pro, After Effects e Vegas podem editar uma captura/render linear de referência, mas não preservam a cena WebGPU, partículas dinâmicas, resposta de scroll nem o controle interativo. Após editar no Blender, execute `blender\export_site_artifacts.ps1` e publique o GLB gerado junto dos arquivos HTML/CSS/JS do site.

Para uma captura linear de revisão, renderize a câmera no Blender com o mesmo frame rate e intervalo da cena. A reprodução publicada continua sendo gerada pelo runtime WebGPU e pode ser percorrida nos dois sentidos pelo scroll.

## Abrir localmente

1. Extraia `tgdevs-webgpu-validation-r27.zip` para uma pasta local.
2. Abra PowerShell nessa pasta e inicie um servidor local: `py -m http.server 8765`.
3. No Edge ou Chrome atualizado, abra `http://localhost:8765/`. WebGPU precisa de um contexto seguro; `localhost` atende esse requisito.
4. Percorra o scroll do início ao fim e volte ao topo. O último frame deve ser o lockup TGBC; o CRM não deve aparecer.
5. Abra o Console do DevTools e execute `navigator.gpu.requestAdapter().then(a => console.log(a?.info))` para registrar o adaptador selecionado. Anote o navegador e o modelo da GPU junto com qualquer erro de Console.
6. Para medir cadência, grave um percurso de scroll no painel Performance do DevTools; registre FPS ou duração de quadros e eventuais pausas visíveis.

`py` requer Python instalado no computador. Se não estiver disponível, sirva a pasta por qualquer servidor HTTP local e mantenha o endereço em `localhost`.

## Pacote

O pacote é produzido em `dist/tgdevs-webgpu-validation-r27.zip` por `blender/package_gpu_validation.ps1`.

