# Preview WebGPU TGDevs e fluxo de cena Blender

O arquivo `assets/tgdevs_site_experience_r1.blend` é a fonte central de autoria: contém a cena modular, a timeline, os parâmetros do campo de partículas e sua disposição. O site publicado não é um único arquivo: o navegador carrega `site_artwork_r1.glb`, o arco de traçado progressivo `site_arc_r1.glb`, a timeline amostrada em `site_timeline_r1.json`, a fonte de pontos em `site_particles_r1.bin`, os arquivos HTML/CSS/JS e o runtime WebGPU. O arco fica em um GLB à parte porque a compressão de malha pode reordenar triângulos e quebrar sua animação de desenho. O runtime não precisa do Blender instalado.

Para editar a cena, abra o `.blend` e modifique os objetos da coleção `03 • Exported interactive website artwork` ou as curvas nomeadas no Empty `TIMELINE • Scroll-controlled scene state`. Depois exporte os dados que o site serve:

```powershell
.\blender\export_site_artifacts.ps1
```

Esse export lê a cena e a timeline existentes, preserva as edições no `.blend` e regenera o GLB, JSON e BIN. `build_site_experience.py` cria a cena inicial a partir das marcas canônicas. O script geral `build_brand_assets.ps1` preserva a cena mestre existente; use `-RebuildSiteMaster` apenas para recriar a composição a partir das marcas canônicas.

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

