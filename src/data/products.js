/*
 * Catálogo do showroom.
 *
 * Para adicionar um produto, copie um item e ajuste:
 *  - design: cores/textos do rótulo (pintado proceduralmente em alta resolução)
 *  - labelImage: (opcional) caminho para a arte oficial plana do rótulo, ex.: 'labels/blackberry.png'
 *  - model: (opcional) caminho para um modelo .glb real (fotogrametria / arquivo do fabricante)
 *  - liquid / cap: materiais físicos
 *  - theme: cores do estúdio virtual
 *
 * Fontes das informações: comunicados de imprensa da Jack Daniel's / Brown-Forman,
 * imprensa especializada e páginas de varejistas (ver README). Notas sensoriais e
 * receitas marcadas como "sugestão da casa" são editoriais.
 */

const JD_PROCESS = [
  {
    step: 'Água de nascente',
    text: 'Água da Cave Spring Hollow, em Lynchburg: nascente de calcário, livre de ferro.',
  },
  {
    step: 'Mostura sour mash',
    text: 'Milho, centeio e cevada maltada são cozidos; parte da mostura anterior inicia a nova fermentação, garantindo consistência.',
  },
  {
    step: 'Destilação em cobre',
    text: 'O fermentado é destilado em alambiques de cobre até um destilado incolor e aromático.',
  },
  {
    step: 'Charcoal mellowing',
    text: 'O destilado escorre, gota a gota, por cerca de 3 metros (10 pés) de carvão de bordo-açucareiro — o Lincoln County Process, que define o Tennessee Whiskey.',
  },
  {
    step: 'Maturação',
    text: 'Envelhece em barris novos de carvalho branco americano, tostados por dentro, até que os provadores decidam que está pronto.',
  },
];

const JD_HISTORY = [
  {
    year: '1866',
    text: 'Jack Daniel registra sua destilaria em Lynchburg, Tennessee — segundo a marca, a primeira destilaria registrada dos EUA (alguns historiadores datam o registro federal de 1875).',
  },
  {
    year: 'Nearest Green',
    text: 'Nathan "Nearest" Green, homem escravizado que ensinou Jack a destilar, tornou-se o primeiro master distiller da casa. A marca passou a reconhecer publicamente sua história em 2016.',
  },
  {
    year: '1895',
    text: 'Surge a icônica garrafa quadrada, que diferenciava o whiskey nas prateleiras.',
  },
  {
    year: '1904',
    text: 'O Old No. 7 conquista medalha de ouro na Feira Mundial de St. Louis.',
  },
  {
    year: '1907',
    text: 'Sem filhos, Jack passa o comando ao sobrinho Lem Motlow. Jack Daniel morre em 1911.',
  },
  {
    year: 'Lei Seca',
    text: 'A proibição estadual (1910) e a nacional fecham a destilaria; Lem Motlow retoma a produção em 1938.',
  },
  {
    year: '1956',
    text: 'A Brown-Forman adquire a Jack Daniel Distillery.',
  },
  {
    year: '2013',
    text: 'Lei do Tennessee define "Tennessee Whiskey", exigindo o charcoal mellowing entre outros critérios.',
  },
];

const JD_SERVES = [
  { name: 'Bem gelado', detail: 'Garrafa no freezer ou shot a 4–6 °C: realça o dulçor e suaviza o álcool.' },
  { name: 'Puro', detail: 'Em copo baixo, à temperatura ambiente, para perceber carvalho e baunilha.' },
  { name: 'Com gelo', detail: 'Uma pedra grande dilui devagar e abre os aromas.' },
  { name: 'Em drinks com cítricos', detail: 'Limão, laranja ou limonada equilibram o açúcar.' },
];

const familyHotspots = (o) => ({
  cap: {
    title: 'Tampa rosqueável',
    text: 'Tampa serrilhada com vedação interna. Feche bem após o uso e armazene a garrafa em pé, longe da luz.',
    ...o.cap,
  },
  neck: {
    title: 'Colarinho',
    text: 'Faixa do gargalo com a assinatura da marca e a identificação da variedade.',
    ...o.neck,
  },
  emboss: {
    title: 'Vidro em relevo',
    text: 'O nome "Jack Daniel\'s" é gravado em alto-relevo no ombro da garrafa — um dos detalhes que ajudam a reconhecer a garrafa original.',
    ...o.emboss,
  },
  label: {
    title: 'Rótulo frontal',
    text: 'Rótulo com filetes metalizados (hot stamping) e a descrição oficial do produto.',
    ...o.label,
  },
  liquid: {
    title: 'O líquido',
    text: 'Cor obtida da maturação em barris novos de carvalho tostado.',
    ...o.liquid,
  },
  base: {
    title: 'Garrafa quadrada',
    text: 'O formato quadrado, adotado em 1895, é a assinatura visual da marca. A base espessa dá estabilidade e peso à garrafa.',
    ...o.base,
  },
});

export const PRODUCTS = [
  {
    id: 'jd-blackberry',
    name: "Jack Daniel's Tennessee Blackberry",
    short: 'Tennessee Blackberry',
    brand: "Jack Daniel's",
    category: 'Whiskey saborizado (licor de amora-preta + Tennessee Whiskey)',
    categoryShort: 'Whiskey saborizado',
    badge: 'Lançamento 2026',
    tagline: 'O clássico Jack com o toque da amora-preta.',
    description:
      'Começa no Old No. 7 — o Tennessee Whiskey de 80% milho, 12% cevada maltada e 8% centeio, suavizado gota a gota no carvão de bordo — e recebe um licor de amora-preta antes do engarrafamento, a 35% vol. O rótulo o define como "Blackberry liqueur blended with Jack Daniel\'s Tennessee Whiskey". A marca descreve o sabor como "doce e levemente ácido": amora madura na frente, baunilha, caramelo e carvalho tostado do Jack ao fundo.',
    quote: {
      text: 'Ao adicionar as notas maduras de amora-preta, criamos um destilado acessível, cheio de personalidade, fácil de apreciar com os amigos e perfeito para qualquer estação.',
      author: 'Chris Fletcher, master distiller da Jack Daniel Distillery (tradução livre)',
    },
    backLabel:
      'Licor de amora-preta combinado ao Tennessee Whiskey Jack Daniel\'s. Sirva bem gelado, com gelo ou em drinks.',
    abv: 35,
    proof: 70,
    origin: 'Lynchburg, Tennessee · EUA',
    sizes: [
      { ml: 1000, label: '1 L', labelText: '1 LITER', price: 'R$ 184,90' },
      { ml: 700, label: '700 ml', labelText: '700ML', price: 'R$ 149,90' },
    ],
    priceNote: 'Preço sugerido pela marca no lançamento no Brasil; pode variar por loja.',
    availability: 'Distribuição inicial no Brasil: SP, PR, SC e RS',
    closure: 'Tampa de rosca (screw cap)',
    launched: 'EUA: 04/08/2025 · Brasil: jul/2026',
    temperature: '4–6 °C (bem gelado)',
    glass: 'Copo baixo (rocks), shot ou highball',
    shape: 'tennesseeSquare',
    liquid: { color: '#c46f3a', tint: '#fff4ec' },
    cap: { color: '#0b0b0d', top: '#c9a35a', topMetal: true, ring: '#c9a35a' },
    design: {
      bg: ['#5a2f7d', '#2d1243'],
      ink: '#f5ecd9',
      foil: 'gold',
      wordmarkFill: '#ffffff',
      wordmarkStroke: '#1b0b29',
      icon: 'blackberry',
      script: 'Tennessee',
      title: 'BLACKBERRY',
      kicker: 'ORIGINAL RECIPE',
      lines: ['BLACKBERRY LIQUEUR', "BLENDED WITH JACK DANIEL'S", 'TENNESSEE WHISKEY'],
      abv: '35% Alc/Vol (70 Proof)',
      neckBg: '#3a1856',
      paperBack: '#cfc3d8',
    },
    theme: {
      base: '#12061c',
      glow: '#6d3a94',
      floor: '#1a0b27',
      accent: '#c9a3ff',
      caustic: '#ff7a3a',
    },
    props: 'blackberries',
    composition: {
      blend: [
        { label: "Tennessee Whiskey Jack Daniel's Old No. 7", role: 'Base' },
        { label: 'Licor de amora-preta', role: 'Sabor' },
      ],
      mashBill: [
        { label: 'Milho', pct: 80 },
        { label: 'Cevada maltada', pct: 12 },
        { label: 'Centeio', pct: 8 },
      ],
      mashNote: 'Receita de grãos do whiskey base (Old No. 7), informada na divulgação do lançamento no Brasil.',
      process: [...JD_PROCESS, { step: 'Blend com licor de amora', text: 'O whiskey maturado recebe o licor de amora-preta e é engarrafado a 35% vol (70 proof) — mais leve que os 40% do Old No. 7.' }],
      allergens: 'A classificação varia por mercado (whiskey saborizado ou licor). Consulte o rótulo brasileiro para ingredientes, aditivos e alérgenos.',
    },
    history: [
      { year: '04/08/2025', text: 'A Jack Daniel\'s anuncia o Tennessee Blackberry nos EUA: 70 proof (35% vol), garrafa de 750 ml, US$ 21,99 sugeridos. O comunicado fala em notas "doces e levemente ácidas" de amora.', highlight: true },
      { year: 'Família', text: 'É o novo integrante dos saborizados, ao lado de Tennessee Honey (2011), Tennessee Fire (2014/15) e Tennessee Apple (2019). Mantém a garrafa quadrada clássica, agora com detalhes em roxo.', highlight: true },
      { year: 'Jul/2026', text: 'A Brown-Forman lança o Tennessee Blackberry no Brasil, em 1 L (R$ 184,90) e 700 ml (R$ 149,90). A amora-preta foi escolhida a partir de pesquisas com consumidores. Distribuição inicial: SP, PR, SC e RS.', highlight: true },
      { year: 'Campanha', text: 'O lançamento brasileiro teve ativações no festival João Rock e destacou o Jack Blackberry & Guaraná, combinação com um mixer tipicamente brasileiro.', highlight: true },
      { year: 'Brasil', text: 'Segundo o relatório anual 2026 da Brown-Forman, o Brasil é o 3º maior mercado da família Jack Daniel\'s e o principal mercado internacional de seus saborizados.', highlight: true },
      ...JD_HISTORY,
    ],
    tasting: {
      color: 'Âmbar acobreado, brilhante.',
      nose: 'Amora-preta fresca e frutas escuras adocicadas, com a baunilha do Old No. 7 — lembra torta de amora.',
      palate: 'Licor de amora em primeiro plano, doce e levemente ácido, sobre baunilha cremosa, caramelo, carvalho tostado e um toque de mel.',
      finish: 'Médio e frutado, terminando no calor suave do whiskey, com nozes tostadas.',
    },
    sensory: { Doçura: 4.2, Frutado: 4.6, Acidez: 2.6, Carvalho: 2.0, 'Baunilha/Caramelo': 3.2, Intensidade: 2.3 },
    pairings: {
      food: [
        { name: 'Cheesecake de frutas vermelhas', why: 'A acidez da calda espelha a amora; o creme suaviza o álcool.', kind: 'sobremesa' },
        { name: 'Chocolate meio amargo 60–70%', why: 'O amargor equilibra o dulçor e destaca a fruta.', kind: 'sobremesa' },
        { name: 'Brie, camembert ou queijo de cabra com geleia', why: 'Gordura e sal contrastam com a fruta e o açúcar.', kind: 'queijo' },
        { name: 'Costelinha suína com barbecue de frutas escuras', why: 'O defumado conversa com o carvalho tostado do whiskey.', kind: 'prato' },
        { name: 'Magret de pato com redução de frutas vermelhas', why: 'Carne rica e molho frutado na mesma sintonia.', kind: 'prato' },
        { name: 'Tábua de frios com nozes e frutas secas', why: 'Ecoa as notas de nozes tostadas do final.', kind: 'petisco' },
      ],
      serves: [
        ...JD_SERVES,
        { name: 'Com frutas vermelhas', detail: 'Amoras, framboesas e morangos frescos no copo intensificam o aroma.' },
        { name: 'Com guaraná', detail: 'O destaque do lançamento no Brasil: 50 ml com guaraná bem gelado.' },
        { name: 'Com tônica', detail: 'Mais seco e refrescante; a tônica realça o lado ácido da amora.' },
      ],
      drinks: [
        {
          name: 'Jack Blackberry & Guaraná',
          source: 'Receita destaque da marca no Brasil',
          glass: 'Highball',
          ingredients: ['50 ml de Jack Daniel\'s Tennessee Blackberry', 'Refrigerante de guaraná bem gelado para completar', 'Gelo', 'Amoras frescas (opcional)'],
          steps: ['Encha o copo com gelo.', 'Adicione 50 ml de Tennessee Blackberry.', 'Complete com guaraná, mexa delicadamente e decore com amoras.'],
        },
        {
          name: 'Jack Blackberry & Lemonade',
          source: 'Receita da marca (limão-siciliano e xarope orgânico) · proporções: sugestão da casa',
          glass: 'Highball',
          ingredients: ['50 ml de Jack Daniel\'s Tennessee Blackberry', '25 ml de suco de limão-siciliano', '15 ml de xarope orgânico', 'Água com gás ou limonada para completar', 'Gelo e rodela de limão-siciliano'],
          steps: ['Encha o copo com gelo.', 'Adicione o whiskey, o limão-siciliano e o xarope.', 'Complete, mexa e finalize com a rodela de limão.'],
        },
        {
          name: 'Jack Blackberry Smash',
          source: 'Drink citado pela marca · receita: sugestão da casa',
          glass: 'Copo baixo',
          ingredients: ['50 ml de Jack Daniel\'s Tennessee Blackberry', '4 amoras', '6 folhas de hortelã', '20 ml de suco de limão', '10 ml de xarope simples', 'Gelo picado'],
          steps: ['Macere amoras, hortelã, limão e xarope no copo.', 'Adicione o whiskey e gelo picado.', 'Mexa e finalize com mais gelo e um ramo de hortelã.'],
        },
        {
          name: 'Jack Blackberry Bramble',
          source: 'Drink citado pela marca · receita: sugestão da casa',
          glass: 'Copo baixo',
          ingredients: ['50 ml de Jack Daniel\'s Tennessee Blackberry', '25 ml de suco de limão-siciliano', '10 ml de xarope simples', 'Gelo picado', 'Amoras e rodela de limão para decorar'],
          steps: ['Bata whiskey, limão e xarope com gelo.', 'Coe sobre gelo picado.', 'Decore com amoras e limão.'],
        },
      ],
    },
    hotspots: familyHotspots({
      cap: { title: 'Tampa de rosca', text: 'Tampa preta serrilhada com anel e topo dourados, que acompanham a paleta roxo e ouro da edição. Feche bem após o uso e guarde a garrafa em pé.' },
      neck: { text: 'Colarinho roxo com filetes dourados, a assinatura Jack Daniel\'s e o ícone da amora-preta.' },
      label: { title: 'Rótulo roxo "Original Recipe"', text: 'Mantém o layout clássico da marca em roxo: "Jack Daniel\'s" em arco, "Tennessee Blackberry", e a descrição "Blackberry liqueur blended with Jack Daniel\'s Tennessee Whiskey · 35% Alc/Vol (70 Proof)". Nas laterais: "Jack Daniel Distillery" e "Quality & Craftsmanship".' },
      liquid: { text: 'Âmbar acobreado e brilhante: a cor do whiskey maturado em barris novos de carvalho tostado, somada ao licor de amora-preta.' },
      base: { text: 'Garrafa quadrada clássica de faces planas e cantos chanfrados, adotada pela marca em 1895. A base espessa de vidro dá peso e estabilidade.' },
    }),
  },

  {
    id: 'jd-old-no7',
    name: "Jack Daniel's Old No. 7",
    short: 'Old No. 7',
    brand: "Jack Daniel's",
    category: 'Tennessee Whiskey',
    badge: 'Clássico',
    tagline: 'O Tennessee Whiskey original, suavizado gota a gota no carvão.',
    description:
      'O whiskey que deu origem a tudo. Feito com 80% milho, 12% cevada maltada e 8% centeio, filtrado em carvão de bordo-açucareiro e maturado em barris novos de carvalho tostado até ficar pronto — sem idade declarada.',
    backLabel: 'Tennessee Whiskey suavizado gota a gota em carvão de bordo-açucareiro e maturado em barris novos de carvalho.',
    abv: 40,
    proof: 80,
    origin: 'Lynchburg, Tennessee · EUA',
    sizes: [{ ml: 1000, label: '1 L', labelText: '1 LITER' }],
    launched: 'Destilaria registrada em 1866 (segundo a marca)',
    temperature: '16–18 °C puro, ou com gelo',
    glass: 'Copo baixo (rocks)',
    shape: 'tennesseeSquare',
    liquid: { color: '#cc8040', tint: '#fff7ee' },
    cap: { color: '#0b0b0d' },
    design: {
      bg: ['#161616', '#050505'],
      ink: '#f4f1ea',
      foil: 'silver',
      wordmarkFill: '#ffffff',
      icon: 'seven',
      iconFill: '#f4f1ea',
      script: 'Old No. 7',
      scriptSize: 230,
      title: 'BRAND',
      kicker: 'TENNESSEE',
      lines: ['SOUR MASH WHISKEY', 'DISTILLED AND BOTTLED BY', 'JACK DANIEL DISTILLERY'],
      abv: '40% Alc/Vol (80 Proof)',
      neckScript: 'Old No. 7',
      neckTitle: 'TENNESSEE WHISKEY',
      paperBack: '#bdb7ad',
    },
    theme: {
      base: '#0b0908',
      glow: '#5a4128',
      floor: '#141110',
      accent: '#e9c48f',
      caustic: '#ff9a40',
    },
    props: 'charcoal',
    composition: {
      blend: [{ label: 'Tennessee Whiskey 100%', role: 'Base' }],
      mashBill: [
        { label: 'Milho', pct: 80 },
        { label: 'Cevada maltada', pct: 12 },
        { label: 'Centeio', pct: 8 },
      ],
      mashNote: 'Receita de grãos (mash bill) do Old No. 7.',
      process: [...JD_PROCESS, { step: 'Engarrafamento', text: 'Engarrafado a 40% vol para o mercado brasileiro.' }],
      allergens: 'Consulte o rótulo da garrafa para informações complementares.',
    },
    history: [
      { year: 'Old No. 7', text: 'A origem do nome é um mistério que a própria destilaria cultiva — há várias teorias e nenhuma confirmada.', highlight: true },
      ...JD_HISTORY,
    ],
    tasting: {
      color: 'Âmbar intenso com reflexos acobreados.',
      nose: 'Caramelo, baunilha e banana madura, com carvalho tostado.',
      palate: 'Equilibrado e macio: caramelo, baunilha e um leve picante do centeio.',
      finish: 'Médio, com carvalho tostado e um toque de especiarias.',
    },
    sensory: { Doçura: 2.8, Frutado: 2.2, Acidez: 1.2, Carvalho: 3.8, 'Baunilha/Caramelo': 4.0, Intensidade: 3.6 },
    pairings: {
      food: [
        { name: 'Costela bovina defumada', why: 'O tostado do barril amplifica o defumado e a gordura suaviza o álcool.', kind: 'prato' },
        { name: 'Hambúrguer com cheddar e bacon', why: 'Sal, gordura e caramelização combinam com o caramelo do whiskey.', kind: 'prato' },
        { name: 'Cheddar maturado', why: 'Queijo intenso e cristalino equilibra o calor alcoólico.', kind: 'queijo' },
        { name: 'Torta de nozes-pecã', why: 'Clássico do sul dos EUA; nozes e caramelo em sintonia.', kind: 'sobremesa' },
        { name: 'Chocolate ao leite com caramelo salgado', why: 'Realça baunilha e caramelo.', kind: 'sobremesa' },
      ],
      serves: [...JD_SERVES, { name: 'Com cola', detail: 'Highball clássico: 1 parte de whiskey para 3 de cola.' }],
      drinks: [
        {
          name: 'Jack & Cola',
          source: 'Clássico',
          glass: 'Highball',
          ingredients: ['50 ml de Jack Daniel\'s Old No. 7', '150 ml de cola gelada', 'Gelo', 'Gomo de limão'],
          steps: ['Encha o copo com gelo.', 'Adicione o whiskey e complete com cola.', 'Finalize com o gomo de limão.'],
        },
        {
          name: 'Lynchburg Lemonade',
          source: 'Clássico',
          glass: 'Highball',
          ingredients: ['40 ml de Jack Daniel\'s Old No. 7', '20 ml de licor de laranja (triple sec)', '30 ml de suco de limão', '15 ml de xarope simples', 'Refrigerante de limão para completar'],
          steps: ['Bata whiskey, licor, limão e xarope com gelo.', 'Coe para o copo com gelo novo.', 'Complete com refrigerante de limão.'],
        },
        {
          name: 'Old Fashioned',
          source: 'Clássico',
          glass: 'Copo baixo',
          ingredients: ['60 ml de Jack Daniel\'s Old No. 7', '1 colher (chá) de xarope de açúcar', '2 dashes de bitter aromático', 'Casca de laranja', 'Uma pedra grande de gelo'],
          steps: ['Mexa xarope e bitter com o whiskey e gelo.', 'Coe sobre a pedra de gelo.', 'Torça a casca de laranja sobre o copo.'],
        },
      ],
    },
    hotspots: familyHotspots({
      label: { title: 'Rótulo preto', text: 'O rótulo preto e branco com "Old No. 7 Brand" é um dos mais reconhecidos do mundo. Indica "Tennessee Sour Mash Whiskey" e 40% vol.' },
      liquid: { text: 'Âmbar intenso: toda a cor vem dos barris novos de carvalho branco tostados por dentro.' },
    }),
  },

  {
    id: 'jd-honey',
    name: "Jack Daniel's Tennessee Honey",
    short: 'Tennessee Honey',
    brand: "Jack Daniel's",
    category: 'Whiskey saborizado',
    badge: 'Mel',
    tagline: 'Jack Daniel\'s com licor de mel: macio, dourado e aveludado.',
    description:
      'Lançado em 2011, combina o Tennessee Whiskey a um licor de mel. Três anos depois tornou-se o primeiro whiskey saborizado a ultrapassar 1 milhão de caixas vendidas. Notas de mel, baunilha e nozes, com final suave.',
    backLabel: 'Licor de mel combinado ao Tennessee Whiskey Jack Daniel\'s. Sirva gelado, com gelo ou com limonada.',
    abv: 35,
    proof: 70,
    origin: 'Lynchburg, Tennessee · EUA',
    sizes: [{ ml: 1000, label: '1 L', labelText: '1 LITER' }],
    launched: '2011',
    temperature: '4–8 °C (gelado)',
    glass: 'Copo baixo ou highball',
    shape: 'tennesseeSquare',
    liquid: { color: '#e0a64e', tint: '#fffaf0' },
    cap: { color: '#0b0b0d' },
    design: {
      bg: ['#efe3c6', '#d7c39a'],
      ink: '#1b1712',
      foil: 'darkgold',
      wordmarkFill: '#14110d',
      icon: 'bee',
      iconFill: '#1b1712',
      script: 'Tennessee',
      title: 'HONEY',
      kicker: 'ORIGINAL RECIPE',
      lines: ['HONEY LIQUEUR', "BLENDED WITH JACK DANIEL'S", 'TENNESSEE WHISKEY'],
      abv: '35% Alc/Vol (70 Proof)',
      neckBg: '#e6d6b0',
      paperGrain: 0.04,
      paperBack: '#e0d4bb',
    },
    theme: {
      base: '#150e05',
      glow: '#8f611b',
      floor: '#1b1309',
      accent: '#ffd27a',
      caustic: '#ffb43a',
    },
    props: 'honey',
    composition: {
      blend: [
        { label: "Tennessee Whiskey Jack Daniel's", role: 'Base' },
        { label: 'Licor de mel', role: 'Sabor' },
      ],
      mashBill: [
        { label: 'Milho', pct: 80 },
        { label: 'Cevada maltada', pct: 12 },
        { label: 'Centeio', pct: 8 },
      ],
      mashNote: 'Receita de grãos do whiskey base.',
      process: [...JD_PROCESS, { step: 'Blend', text: 'O whiskey é combinado ao licor de mel e engarrafado a 35% vol.' }],
      allergens: 'Consulte o rótulo da garrafa para ingredientes e alérgenos.',
    },
    history: [
      { year: '2011', text: 'Chega às prateleiras o Tennessee Honey, primeiro saborizado da família.', highlight: true },
      { year: '2014', text: 'Torna-se o primeiro whiskey saborizado a atingir 1 milhão de caixas vendidas.', highlight: true },
      { year: 'Rótulo', text: 'Rótulo bege com uma abelha como ícone, em contraste com o clássico preto.', highlight: true },
      ...JD_HISTORY,
    ],
    tasting: {
      color: 'Dourado brilhante.',
      nose: 'Mel silvestre, baunilha e nozes tostadas.',
      palate: 'Macio e adocicado; mel e caramelo sobre o carvalho do Jack.',
      finish: 'Suave, lembrando torta de nozes-pecã.',
    },
    sensory: { Doçura: 4.4, Frutado: 1.8, Acidez: 1.0, Carvalho: 2.0, 'Baunilha/Caramelo': 3.8, Intensidade: 2.2 },
    pairings: {
      food: [
        { name: 'Gorgonzola com mel e nozes', why: 'O sal e o azul do queijo contrastam com o mel.', kind: 'queijo' },
        { name: 'Frango frito crocante', why: 'Combinação sulista clássica de mel e fritura.', kind: 'prato' },
        { name: 'Torta de nozes-pecã', why: 'Ecoa as notas de nozes e caramelo.', kind: 'sobremesa' },
        { name: 'Panquecas com manteiga', why: 'Dulçor e gordura em equilíbrio.', kind: 'sobremesa' },
      ],
      serves: [...JD_SERVES, { name: 'Com chá gelado', detail: 'Chá preto gelado e limão: refrescante e pouco doce.' }],
      drinks: [
        {
          name: 'Honey & Lemonade',
          source: 'Sugestão da casa',
          glass: 'Highball',
          ingredients: ['50 ml de Jack Daniel\'s Tennessee Honey', 'Limonada para completar', 'Gelo', 'Rodela de limão'],
          steps: ['Encha o copo com gelo.', 'Adicione o Tennessee Honey e complete com limonada.', 'Decore com limão.'],
        },
        {
          name: 'Honey & Ginger',
          source: 'Sugestão da casa',
          glass: 'Highball',
          ingredients: ['50 ml de Jack Daniel\'s Tennessee Honey', '150 ml de ginger ale', 'Gelo', 'Fatia de gengibre'],
          steps: ['Monte no copo com gelo.', 'Complete com ginger ale e mexa levemente.'],
        },
      ],
    },
    hotspots: familyHotspots({
      label: { title: 'Rótulo bege com abelha', text: 'O Honey quebra o padrão preto da marca com um rótulo bege e uma abelha como ícone.' },
      liquid: { text: 'Dourado: o licor de mel deixa o líquido mais claro e luminoso que o Old No. 7.' },
    }),
  },

  {
    id: 'jd-fire',
    name: "Jack Daniel's Tennessee Fire",
    short: 'Tennessee Fire',
    brand: "Jack Daniel's",
    category: 'Whiskey saborizado',
    badge: 'Canela',
    tagline: 'Canela "red hot" com a suavidade do Jack.',
    description:
      'Combina o Tennessee Whiskey a um licor de canela picante. Teve lançamento de teste em 2014 e chegou ao mercado nacional dos EUA em março de 2015, com rótulo vermelho e um novo logotipo em chamas.',
    backLabel: 'Licor de canela combinado ao Tennessee Whiskey Jack Daniel\'s. Sirva como shot bem gelado.',
    abv: 35,
    proof: 70,
    origin: 'Lynchburg, Tennessee · EUA',
    sizes: [{ ml: 1000, label: '1 L', labelText: '1 LITER' }],
    launched: 'Teste: 2014 · EUA: mar/2015',
    temperature: '0–4 °C (shot gelado)',
    glass: 'Shot',
    shape: 'tennesseeSquare',
    liquid: { color: '#cc5a36', tint: '#fff2ec' },
    cap: { color: '#0b0b0d' },
    design: {
      bg: ['#b5231c', '#6d0f0b'],
      ink: '#fff3e6',
      foil: 'gold',
      wordmarkFill: '#ffffff',
      wordmarkStroke: '#3d0705',
      icon: 'flame',
      script: 'Tennessee',
      title: 'FIRE',
      kicker: 'ORIGINAL RECIPE',
      lines: ['CINNAMON LIQUEUR', "BLENDED WITH JACK DANIEL'S", 'TENNESSEE WHISKEY'],
      abv: '35% Alc/Vol (70 Proof)',
      neckBg: '#8d1712',
      paperBack: '#d9b8b0',
    },
    theme: {
      base: '#150504',
      glow: '#8a2410',
      floor: '#1b0907',
      accent: '#ff9a6a',
      caustic: '#ff5a2a',
    },
    props: 'cinnamon',
    composition: {
      blend: [
        { label: "Tennessee Whiskey Jack Daniel's", role: 'Base' },
        { label: 'Licor de canela', role: 'Sabor' },
      ],
      mashBill: [
        { label: 'Milho', pct: 80 },
        { label: 'Cevada maltada', pct: 12 },
        { label: 'Centeio', pct: 8 },
      ],
      mashNote: 'Receita de grãos do whiskey base.',
      process: [...JD_PROCESS, { step: 'Blend', text: 'O whiskey é combinado ao licor de canela e engarrafado a 35% vol.' }],
      allergens: 'Consulte o rótulo da garrafa para ingredientes e alérgenos.',
    },
    history: [
      { year: 'Abr/2014', text: 'Lançamento de teste do Tennessee Fire em mercados selecionados.', highlight: true },
      { year: '03/03/2015', text: 'Lançamento nacional nos EUA, com rótulo vermelho e logotipo em chamas.', highlight: true },
      ...JD_HISTORY,
    ],
    tasting: {
      color: 'Âmbar avermelhado.',
      nose: 'Canela picante e bala de canela, com fundo de carvalho.',
      palate: 'Calor da canela que cresce aos poucos, equilibrado pelo dulçor e pela maciez do Jack.',
      finish: 'Quente e especiado, sem amargor.',
    },
    sensory: { Doçura: 3.6, Frutado: 1.0, Acidez: 0.8, Carvalho: 2.2, 'Baunilha/Caramelo': 2.4, Intensidade: 3.4 },
    pairings: {
      food: [
        { name: 'Churros com doce de leite', why: 'Canela com canela: o doce de leite suaviza o picante.', kind: 'sobremesa' },
        { name: 'Asinhas de frango apimentadas', why: 'O dulçor equilibra a pimenta e a canela amplia o calor.', kind: 'prato' },
        { name: 'Chocolate com pimenta', why: 'Especiarias em camadas.', kind: 'sobremesa' },
        { name: 'Torta de maçã quente', why: 'A canela é parceira natural da maçã assada.', kind: 'sobremesa' },
      ],
      serves: [
        { name: 'Shot bem gelado', detail: 'Do freezer direto para o copo: a canela fica mais macia e refrescante.' },
        { name: 'Com gelo', detail: 'Suaviza o picante da canela.' },
        { name: 'Com refrigerante de cola', detail: 'Canela e cola formam um highball especiado.' },
      ],
      drinks: [
        {
          name: 'Fire & Ginger',
          source: 'Sugestão da casa',
          glass: 'Highball',
          ingredients: ['50 ml de Jack Daniel\'s Tennessee Fire', '150 ml de ginger beer', 'Gelo', 'Rodela de laranja'],
          steps: ['Monte no copo com gelo.', 'Complete com ginger beer e decore com laranja.'],
        },
        {
          name: 'Fire & Cider',
          source: 'Sugestão da casa',
          glass: 'Caneca',
          ingredients: ['40 ml de Jack Daniel\'s Tennessee Fire', '150 ml de suco de maçã quente', 'Pau de canela'],
          steps: ['Aqueça o suco de maçã sem ferver.', 'Adicione o Tennessee Fire e mexa com o pau de canela.'],
        },
      ],
    },
    hotspots: familyHotspots({
      label: { title: 'Rótulo vermelho', text: 'Em vez do tradicional preto e branco, o Fire usa um rótulo vermelho com logotipo em chamas.' },
      liquid: { text: 'Âmbar avermelhado, que remete à canela "red hot".' },
    }),
  },

  {
    id: 'jd-apple',
    name: "Jack Daniel's Tennessee Apple",
    short: 'Tennessee Apple',
    brand: "Jack Daniel's",
    category: 'Whiskey saborizado',
    badge: 'Maçã verde',
    tagline: 'Maçã verde crocante com o caráter do Jack.',
    description:
      'Lançado nos EUA em outubro de 2019. A destilaria produz um licor de maçã verde e o combina ao Old No. 7, resultando num perfil fresco e frutado. Seu crescimento no Brasil foi destacado pela Brown-Forman no ano fiscal 2026.',
    backLabel: 'Licor de maçã combinado ao Tennessee Whiskey Jack Daniel\'s. Experimente com tônica e gelo.',
    abv: 35,
    proof: 70,
    origin: 'Lynchburg, Tennessee · EUA',
    sizes: [{ ml: 1000, label: '1 L', labelText: '1 LITER' }],
    launched: 'EUA: out/2019',
    temperature: '4–8 °C',
    glass: 'Highball ou copo baixo',
    shape: 'tennesseeSquare',
    liquid: { color: '#e6bd68', tint: '#fffcf2' },
    cap: { color: '#0b0b0d' },
    design: {
      bg: ['#5d9a35', '#2f5c18'],
      ink: '#f7f8ee',
      foil: 'silver',
      wordmarkFill: '#ffffff',
      wordmarkStroke: '#173009',
      icon: 'apple',
      script: 'Tennessee',
      title: 'APPLE',
      kicker: 'ORIGINAL RECIPE',
      lines: ['APPLE LIQUEUR', "BLENDED WITH JACK DANIEL'S", 'TENNESSEE WHISKEY'],
      abv: '35% Alc/Vol (70 Proof)',
      neckBg: '#3d7020',
      paperBack: '#c7d6b5',
    },
    theme: {
      base: '#08120a',
      glow: '#4a7a26',
      floor: '#0e180c',
      accent: '#cdf28d',
      caustic: '#ffc24a',
    },
    props: 'apples',
    composition: {
      blend: [
        { label: "Tennessee Whiskey Jack Daniel's Old No. 7", role: 'Base' },
        { label: 'Licor de maçã verde (produzido pela destilaria)', role: 'Sabor' },
      ],
      mashBill: [
        { label: 'Milho', pct: 80 },
        { label: 'Cevada maltada', pct: 12 },
        { label: 'Centeio', pct: 8 },
      ],
      mashNote: 'Receita de grãos do whiskey base (Old No. 7).',
      process: [...JD_PROCESS, { step: 'Blend', text: 'O whiskey é combinado ao licor de maçã e engarrafado a 35% vol.' }],
      allergens: 'Consulte o rótulo da garrafa para ingredientes e alérgenos.',
    },
    history: [
      { year: '01/10/2019', text: 'A Jack Daniel\'s anuncia o Tennessee Apple, com lançamento nacional nos EUA no mesmo mês.', highlight: true },
      { year: 'Brasil', text: 'Segundo a Brown-Forman, o crescimento do Tennessee Apple no Brasil ajudou a compensar quedas de outras linhas no ano fiscal 2026.', highlight: true },
      ...JD_HISTORY,
    ],
    tasting: {
      color: 'Dourado claro.',
      nose: 'Maçã verde fresca e crocante, com toque de carvalho.',
      palate: 'Frutado e vivo, levemente ácido, com caramelo suave.',
      finish: 'Fresco e limpo.',
    },
    sensory: { Doçura: 3.4, Frutado: 4.4, Acidez: 3.2, Carvalho: 1.6, 'Baunilha/Caramelo': 2.2, Intensidade: 2.2 },
    pairings: {
      food: [
        { name: 'Lombo suíno assado com maçã', why: 'A fruta do whiskey ecoa o acompanhamento.', kind: 'prato' },
        { name: 'Brie ou camembert', why: 'A acidez da maçã corta a cremosidade.', kind: 'queijo' },
        { name: 'Torta de maçã com canela', why: 'Harmonização por semelhança.', kind: 'sobremesa' },
        { name: 'Salada com queijo de cabra e nozes', why: 'Frescor com frescor.', kind: 'prato' },
      ],
      serves: [
        ...JD_SERVES,
        { name: 'Com tônica', detail: 'Tônica e gelo destacam a maçã e deixam o drink seco e refrescante.' },
      ],
      drinks: [
        {
          name: 'Apple & Tonic',
          source: 'Sugestão da casa',
          glass: 'Highball',
          ingredients: ['50 ml de Jack Daniel\'s Tennessee Apple', '150 ml de água tônica', 'Gelo', 'Lâminas de maçã verde'],
          steps: ['Encha o copo com gelo e lâminas de maçã.', 'Adicione o Tennessee Apple e complete com tônica.'],
        },
        {
          name: 'Apple Fizz',
          source: 'Sugestão da casa',
          glass: 'Taça',
          ingredients: ['40 ml de Jack Daniel\'s Tennessee Apple', '15 ml de suco de limão', 'Espumante brut para completar'],
          steps: ['Coloque whiskey e limão na taça gelada.', 'Complete com espumante.'],
        },
      ],
    },
    hotspots: familyHotspots({
      label: { title: 'Rótulo verde com maçã', text: 'Rótulo verde com o ícone de uma maçã — a identidade visual do Tennessee Apple.' },
      liquid: { text: 'Dourado claro: o licor de maçã deixa o líquido mais leve e luminoso.' },
    }),
  },
];

export const SOURCES = [
  { label: 'Marcas pelo Mundo — Tennessee Blackberry no Brasil (drinks, receita de grãos)', url: 'https://marcaspelomundo.com.br/anunciantes/jack-daniels-tennessee-blackberry-aposta-no-sabor-de-amora-para-conquistar-o-brasil/' },
  { label: 'Gastronominho — chegada ao Brasil, preços sugeridos', url: 'https://gastronominho.com.br/bebidas/2026/07/jack-daniels-blackberry-chega-brasil/' },
  { label: 'Topview — distribuição inicial e drinks', url: 'https://topview.com.br/estilo/bebidas/jack-daniels-lanca-whiskey-de-blackberry-no-brasil/' },
  { label: 'Tasting Table — review e citação de Chris Fletcher', url: 'https://www.tastingtable.com/1935132/jack-daniels-whiskey-blackberry-review' },
  { label: 'Nashville Scene — texto do rótulo', url: 'https://www.nashvillescene.com/food_drink/bites/jack-daniels-blackberry/article_105f7a46-ce01-40b3-b9c3-daab5a6cd783.html' },
  { label: 'Jack Daniel\'s Pressroom — lançamento do Tennessee Blackberry (04/08/2025)', url: 'https://pressroom.jackdaniels.com/?p=1187' },
  { label: 'Propmark — lançamento do Tennessee Blackberry no Brasil', url: 'https://propmark.com.br/anunciantes/jack-daniels-lanca-o-tennessee-blackberry-no-brasil-whiskey-saborizado-de-amora-preta/' },
  { label: 'Brown-Forman — relatório anual 2026 (SEC)', url: 'https://www.sec.gov/Archives/edgar/data/0000014693/000001469326000027/bfb-010_2026integratedarxv.pdf' },
  { label: 'Jack Daniel\'s Pressroom — lançamento nacional do Tennessee Fire', url: 'https://pressroom.jackdaniels.com/?p=369' },
  { label: 'Jack Daniel\'s Pressroom — lançamento do Tennessee Apple', url: 'https://pressroom.jackdaniels.com/?p=720' },
  { label: 'Jack Daniel\'s — Our History', url: 'https://www.jackdaniels.com/our-story/our-history' },
];
