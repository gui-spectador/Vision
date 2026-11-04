# Wiki do projeto Vision

Diário de bordo do projeto: o que é, onde paramos, o que foi feito e o que falta.
**Se você é o Claude retomando o trabalho, comece por "Onde paramos".**

---

## Onde paramos (04/11/2026, 3ª rodada)

Pedido: "me manda o vídeo e as imagens, na verdade coloca dentro do artefato". Feito: o showroom
publicado (**versão 4**) ganhou a aba **Divulgação** no painel do Blackberry, com:

- o comercial de Black Friday (player com capa, tela cheia nativa) e botão **Baixar MP4**;
- as 6 imagens em galeria (miniaturas leves), cada uma com botão de baixar; ao tocar abre em tela cheia
  com setas, deslizar no celular, Esc para fechar (as setas não trocam de produto enquanto ela está aberta);
- um cartão "Campanha Black Friday" na Visão geral que leva direto à aba.

Detalhes técnicos:
- Peças movidas de `marketing/black-friday/` para **`public/divulgacao/`** (o Vite copia para a pasta de
  build) + `public/divulgacao/miniaturas/` (480–640 px) e a capa do vídeo (quadro de 12,5 s).
- No claude.ai o download usa a capacidade **`downloads`** declarada na publicação (o visualizador
  confirma cada arquivo). Fora do claude.ai é um link `download` comum. Se o visualizador não oferecer
  download, os botões somem.
- Publicação: `dist-blackberry/index.html` + os arquivos de `dist-blackberry/divulgacao/` no mesmo
  caminho relativo (`files` do Artifact).

## 2ª rodada (04/11/2026)

O usuário pediu "Continua" depois de limpar o contexto. Seguimos os próximos passos que não dependiam
dele: **revisão visual dos outros quatro produtos** e **botão "Gelada" no showroom**.

### Feito nesta rodada

1. **Contra-rótulo (todos os produtos)**: tinha um vazio grande no meio. Agora: marca, nome do produto,
   arabesco na cor da edição, descrição maior e uma ficha (Tipo, Teor alcoólico, Conteúdo, Origem,
   Servir) com filetes, e o rodapé "Beba com moderação".
2. **Old No. 7**: "Tennessee" passou a ser manuscrito, legível, entre "BRAND" e "SOUR MASH WHISKEY"
   (opção `kickerScript` no `design`).
3. **Ambientações refeitas**:
   - Old No. 7: carvão de bordo em pedaços irregulares com quinas quebradas, veios e rachaduras
     (textura de cor, rugosidade e relevo); aduela curva com a face carbonizada para cima.
   - Honey: favo com células hexagonais ocas, mel brilhante (transmissão) e opérculos de cera, sobre
     uma poça de mel. Antes eram prismas amarelos que pareciam lápis.
   - Apple: maçãs tinham formato de pera (estreitas em cima); novo perfil (ombros largos, cavidade
     do cabo), casca com lenticelas e manchas, folha no cabo.
   - Fire (canela e anis) revisado: ok, sem mudanças.
   - Blackberry: a folha da frente aparecia como um risco branco (verniz de raspão); corrigido.
4. **Botão "Gelada"** no dock (desktop e celular): liga a condensação (névoa, gotas e escorridos) e
   vale para qualquer produto ou tamanho escolhido depois.
5. Link publicado atualizado para a **versão 3**.

Capturas de revisão: renderizadas com Playwright (`window.vision.stage`, giro desligado,
`maxDt` alto para as transições terminarem em poucos quadros).

### Próximos passos sugeridos

- **Fidelidade total**: o usuário vai (talvez) fotografar a garrafa real (frente, lados, costas, quina,
  close do rótulo, colarinho girando, topo da tampa, fundo, relevo, com régua). Com isso: medir o
  perfil exato e usar as fotos como textura dos rótulos. Alternativa: arte oficial da Brown-Forman Brasil.
- Testar no **iPhone real** (desempenho, gaveta, AR, botão Gelada).
- **AR** só funciona com hospedagem própria (GitHub Pages): o visualizador do claude.ai bloqueia.
- Comercial: versão **16:9** e/ou **trilha sonora**; incluir **preço/oferta** quando o usuário definir
  (não inventamos desconto).
- Honey: a fonte oficial fala em rótulo "branco, dourado e preto" (o nosso é creme com preto e dourado);
  conferir com foto se a abelha é dourada ou preta.
- Old No. 7: o "7" no círculo abaixo da marca é licença nossa; conferir com foto (acreditamos que o
  rótulo real não tem esse medalhão).

---

## Links

- **Showroom publicado (privado, claude.ai):** https://claude.ai/artifact/5KFq4w3NMicFLxTPGngQ5e
  (versão só do Blackberry; o dono compartilha pelo menu Share).
- **Branch de trabalho:** `claude/showroom-3d` (o `main` ainda está só com o commit inicial; não
  abrimos PR).
- **Rodar:** `npm install && npm run dev` → http://localhost:5173
  - `?produto=jd-blackberry` — só o Blackberry · `?limpo` — sem interface (vídeos)
  - `/film.html` — estúdio de filmagem (fotos e comercial)

---

## Histórico (do mais antigo ao mais recente)

### 1. Showroom 3D (03/11)
- Vite + Three.js, garrafas procedurais (torno de superelipses), líquido transmissivo com absorção,
  vidro com reflexos, rótulos pintados em canvas com dourado metalizado e relevo.
- Estúdio virtual (softboxes, fundo infinito, iluminações Estúdio/Contraluz/Bar), giro 360°,
  6 pontos de interesse, vista explodida, painel (Visão geral, Composição, História,
  Harmonização, Sensorial), confirmação de 18+, AR Quick Look (USDZ), suporte a `.glb`.
- Coleção: Blackberry, Old No. 7, Honey, Fire, Apple.

### 2. Foco no Tennessee Blackberry (03/11)
- Pesquisa: lançamento EUA 04/08/2025, Brasil jul/2026, R$ 184,90 (1 L) e R$ 149,90 (700 ml)
  sugeridos, distribuição inicial SP/PR/SC/RS, citação de Chris Fletcher, drinks da marca
  (Guaraná, Lemonade, Smash, Bramble), receita de grãos 80/12/8.
- Modo produto único, build dedicado, vídeo 360° (Estúdio + Contraluz).

### 3. Garrafa medida da foto real (04/11)
- Usuário pediu formato exato. Sketchfab bloqueado na rede e o modelo de lá é do Old No. 7 e pouco
  detalhado (usuário concordou em não usar).
- Perfil extraído pixel a pixel de foto frontal de 1 L (largura 8,5 cm; altura resultante 27,0 cm,
  compatível com fichas de varejo 27,2–28 cm): ombro curto, gargalo cônico com anel, tampa Ø 2,9 cm
  com faixa dourada, cantos chanfrados.
- Rótulo redesenhado no layout original: painel roxo de quina a quina (9,3 cm), textos verticais
  nos chanfros, colarinho envolvendo o gargalo, cores amostradas da foto.
- Publicado no claude.ai (link acima).

### 4. Divulgação e Black Friday (04/11)
- Novos elementos de cena (`src/film/set.js`): mesa de madeira, copo baixo de vidro grosso,
  drink longo com gelo/limão/amora, pilha de amoras (`berryPile`), cone de luz volumétrica,
  lâmpada pendente.
- Página `film.html` + `src/film/main.js`: quadros determinísticos (`window.film.frame(t)`) e
  imagens (`window.film.still(nome)`); script `tools/render-film.cjs` para gerar tudo.
- Imagens: `black-friday-feed` (1080×1350), `black-friday-story` (1080×1920),
  `blackberry-amoras-paisagem` (1920×1080), `blackberry-drink-feed`, `blackberry-detalhe-feed`,
  `blackberry-contraluz-feed` (1080×1350).
- Showroom: abas arrastáveis, líquido com comportamento de fluido na vista explodida.

### 5. Revisão da coleção (04/11, 2ª rodada)
- Contra-rótulo com ficha técnica; "Tennessee" manuscrito no Old No. 7.
- Carvão, favo de mel e maçãs refeitos; folha da frente do Blackberry sem reflexo branco.
- Botão "Gelada" no showroom; link publicado na versão 3.

### 6. Divulgação dentro do showroom (04/11, 3ª rodada)
- Aba Divulgação com vídeo, galeria, tela cheia e download; peças em `public/divulgacao/`; versão 4.

---

## Decisões e limitações

- **Medidas**: proporções da foto + largura de varejo. Margem estimada de alguns milímetros.
- **Rótulos**: recriações (fonte do logotipo aproximada). Para ficar idêntico: fotos de alta
  resolução da garrafa ou arte oficial (`labelImage` no produto).
- **Conteúdo**: notas sensoriais (0–5) e receitas marcadas "sugestão da casa" são editoriais.
- **Textos do comercial**: "Seu copo está vazio?" na abertura (sugestão nossa), título, nome do
  produto e "Beba com moderação. Venda proibida para menores de 18 anos." Sem preço/desconto.
- **Rede do ambiente**: vários sites bloqueados (Sketchfab, Wikipedia, pressroom). Pesquisas feitas
  por busca. Para liberar: configurações do ambiente → Network access → Allowed domains.
- **Testes**: feitos em navegador sem GPU (render por software, ~1 quadro/s). Ainda não validado em
  iPhone real.

---

## Mapa do código

```
index.html, film.html        páginas (showroom e estúdio de filmagem)
src/main.js                  showroom: carregamento, seleção, controles, gaveta
src/data/products.js         catálogo e conteúdo (composição, história, harmonização…)
src/three/stage.js           renderizador, estúdio, câmera, giro, explodir, miniaturas, luz de recorte
src/three/bottle.js          garrafa medida, vidro, líquido (fluido), rótulos, tampa, condensação
src/three/geometry.js        torno de superelipses com chanfro
src/three/labels.js          pintura dos rótulos e do colarinho
src/three/props.js           amoras (berryField, berryPile) e outras ambientações
src/three/ar.js              exportação USDZ (AR Quick Look)
src/film/                    cenas, câmera e textos do comercial e das fotos
src/ui/                      painel, radar sensorial, hotspots
src/ui/media.js              aba Divulgação: galeria, tela cheia, download (capacidade downloads)
public/divulgacao/           comercial e imagens de divulgação (+ miniaturas/)
tools/render-film.cjs        gera imagens e quadros do comercial
```
