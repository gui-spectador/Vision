# Wiki do projeto Vision

Diário de bordo do projeto: o que é, onde paramos, o que foi feito e o que falta.
**Se você é o Claude retomando o trabalho, comece por "Onde paramos".**

---

## Onde paramos (04/11/2026)

Estamos no **Jack Daniel's Tennessee Blackberry**: showroom 3D publicado e materiais de divulgação
de Black Friday prontos. Últimos pedidos do usuário, todos atendidos nesta rodada:

1. **Mais amoras no chão** em volta da garrafa (grupos encostados na base, algumas empilhadas).
2. **Imagens de divulgação** para enviar, no estilo dos anúncios de referência (lista abaixo).
3. **Comercial de Black Friday** (vertical, 13 s): quarto escuro, copo de whisky vazio na mesa,
   câmera saindo de dentro do copo até a garrafa na pilha de amoras, luz vermelha piscando por
   cima e o título **BLACK FRIDAY** descendo (BLACK preto com contorno vermelho, FRIDAY vermelho).
   - Ajuste pedido no meio: **vermelho só como luz suave** (o líquido manteve o âmbar natural) e
     **garrafa bem gelada**, com névoa, gotas de condensação e escorridos.
4. **Aba "Sensorial" cortada** no painel: as abas agora cabem e, se faltar espaço, a barra pode ser
   arrastada com o botão esquerdo do mouse (ou com a roda).
5. **Líquido da vista explodida** deixou de parecer gelatina: volume ondula como fluido (com
   balanço inicial), superfície livre ondulando, reflexos que escorrem, mais transparência e
   brilho molhado, bolhas subindo.

### Entregue no fim do dia (04/11)

- Comercial `marketing/black-friday/black-friday-jack-blackberry.mp4` (13 s, 720×1280, 24 fps) e as
  seis imagens na mesma pasta (também enviados no chat).
- Link publicado atualizado para a **versão 2** (abas arrastáveis + líquido fluido na vista explodida).
- Tudo commitado e enviado na branch `claude/showroom-3d`.

### Próximos passos sugeridos

- **Fidelidade total**: o usuário vai (talvez) fotografar a garrafa real (frente, lados, costas, quina,
  close do rótulo, colarinho girando, topo da tampa, fundo, relevo, com régua). Com isso: medir o
  perfil exato e usar as fotos como textura dos rótulos. Alternativa: arte oficial da Brown-Forman Brasil.
- Testar no **iPhone real** (desempenho, gaveta, AR).
- **AR** só funciona com hospedagem própria (GitHub Pages): o visualizador do claude.ai bloqueia.
- Comercial: versão **16:9** e/ou **trilha sonora**; incluir **preço/oferta** quando o usuário definir
  (não inventamos desconto).
- Revisar os outros produtos (Old No. 7, Honey, Fire, Apple), que herdaram o novo layout de rótulo
  sem revisão visual.
- Oferecer a condensação ("garrafa gelada") também como botão no showroom.

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
tools/render-film.cjs        gera imagens e quadros do comercial
```
