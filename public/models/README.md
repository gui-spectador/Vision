# Modelos 3D reais (.glb)

Coloque aqui modelos escaneados (fotogrametria) ou fornecidos pelo fabricante, em glTF binário
(`.glb`), para substituir a garrafa procedural de um produto.

Recomendações:

- Escala em metros, garrafa em pé, base em y = 0 e frente voltada para +Z.
- Materiais PBR (metallic/roughness). Para vidro e líquido use `KHR_materials_transmission`,
  `KHR_materials_volume` e `KHR_materials_ior` — o Three.js os lê automaticamente.
- Até ~150 mil triângulos e texturas de 2048 px (KTX2/Basis ou WebP) para abrir rápido no celular.

A arte plana do rótulo (opção mais simples) vai em `public/labels/` e é informada em
`labelImage` no produto (`src/data/products.js`).
