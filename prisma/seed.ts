import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const db = new PrismaClient();

// Cosmetic claims only: appearance, hydration, texture. No medical language.

type SeedVariant = { label: string; sizeMl: number; priceCents: number; stock: number };
type SeedProduct = {
  slug: string;
  sku: string;
  category: string;
  form: string;
  isPopular?: boolean;
  name: { en: string; es: string };
  short: { en: string; es: string };
  description: { en: string; es: string };
  specs: {
    keyPeptides: string[];
    inci: string;
    skinTypes: string[];
    texture: string;
    ph: string;
    pao: string;
    shelfLife: string;
    usage: string;
  };
  variants: SeedVariant[];
  related: string[];
  faqs: { en: { q: string; a: string }[]; es: { q: string; a: string }[] };
  color: string; // placeholder image tint
};

const categories = [
  { slug: "serums", name: { en: "Serums", es: "Sérums", de: "Seren", nl: "Serums" }, sortOrder: 1 },
  { slug: "creams", name: { en: "Creams", es: "Cremas", de: "Cremes", nl: "Crèmes" }, sortOrder: 2 },
  { slug: "eye-and-masks", name: { en: "Eye & Masks", es: "Ojos y mascarillas", de: "Augen & Masken", nl: "Oog & maskers" }, sortOrder: 3 },
  { slug: "bundles", name: { en: "Bundles", es: "Packs", de: "Sets", nl: "Bundels" }, sortOrder: 4 },
];

const genericFaqsEn = [
  { q: "Can I use this with retinol or vitamin C?", a: "Yes. Peptides layer well with most actives. Apply the thinnest texture first and let each layer absorb for a minute." },
  { q: "Morning or evening?", a: "Either. Many people use serums in the morning under SPF and creams at night." },
  { q: "Is it fragrance-free?", a: "Yes — all our formulas are fragrance-free and dye-free." },
  { q: "How long does a bottle last?", a: "Used once daily, a 30 ml serum lasts roughly 8–10 weeks." },
  { q: "Is it tested on animals?", a: "No. We don't test on animals and don't sell in markets that require it." },
];
const genericFaqsEs = [
  { q: "¿Puedo usarlo con retinol o vitamina C?", a: "Sí. Los péptidos combinan bien con la mayoría de activos. Aplica primero la textura más ligera y deja absorber cada capa un minuto." },
  { q: "¿Mañana o noche?", a: "Ambas. Muchas personas usan los sérums por la mañana bajo el SPF y las cremas por la noche." },
  { q: "¿Lleva perfume?", a: "No — todas nuestras fórmulas son sin perfume y sin colorantes." },
  { q: "¿Cuánto dura un envase?", a: "Con un uso diario, un sérum de 30 ml dura unas 8–10 semanas." },
  { q: "¿Se testa en animales?", a: "No. No testamos en animales ni vendemos en mercados que lo exijan." },
];

const products: SeedProduct[] = [
  {
    slug: "matrixyl-firming-serum",
    sku: "NPS-SER-MTX",
    category: "serums",
    form: "SERUM",
    isPopular: true,
    color: "#dfe8e2",
    name: { en: "Matrixyl Firming Serum", es: "Sérum Reafirmante Matrixyl" },
    short: {
      en: "A lightweight daily serum with 5% Matrixyl 3000 and hyaluronic acid for a firmer, smoother-looking complexion.",
      es: "Sérum diario ligero con 5% de Matrixyl 3000 y ácido hialurónico para una piel de aspecto más firme y uniforme.",
    },
    description: {
      en: "Our best-selling serum pairs **Matrixyl 3000** (palmitoyl tripeptide-1 and palmitoyl tetrapeptide-7) with multi-weight hyaluronic acid and panthenol.\n\nThe texture is a fast-absorbing water gel that sits well under moisturiser and SPF. With regular use skin looks smoother, feels more hydrated and fine lines appear less noticeable.\n\n- 5% Matrixyl 3000\n- 1% multi-weight hyaluronic acid\n- Fragrance-free, dye-free, vegan",
      es: "Nuestro sérum más vendido combina **Matrixyl 3000** (palmitoil tripéptido-1 y palmitoil tetrapéptido-7) con ácido hialurónico de varios pesos y pantenol.\n\nSu textura es un gel acuoso de rápida absorción que se lleva bien bajo la hidratante y el SPF. Con el uso regular la piel se ve más lisa, se siente más hidratada y las líneas finas se notan menos.\n\n- 5% Matrixyl 3000\n- 1% ácido hialurónico multi-peso\n- Sin perfume, sin colorantes, vegano",
    },
    specs: {
      keyPeptides: ["Palmitoyl Tripeptide-1", "Palmitoyl Tetrapeptide-7"],
      inci: "Aqua, Glycerin, Butylene Glycol, Palmitoyl Tripeptide-1, Palmitoyl Tetrapeptide-7, Sodium Hyaluronate, Hydrolyzed Sodium Hyaluronate, Panthenol, Carbomer, Polysorbate 20, Sodium Hydroxide, Phenoxyethanol, Ethylhexylglycerin",
      skinTypes: ["All skin types", "Mature", "Combination"],
      texture: "Water gel",
      ph: "5.5 – 6.0",
      pao: "12M",
      shelfLife: "24 months unopened",
      usage: "Apply 3–4 drops to clean, dry skin morning and/or evening. Follow with moisturiser. Use SPF during the day.",
    },
    variants: [
      { label: "15 ml", sizeMl: 15, priceCents: 2900, stock: 120 },
      { label: "30 ml", sizeMl: 30, priceCents: 4900, stock: 200 },
      { label: "50 ml", sizeMl: 50, priceCents: 6900, stock: 60 },
    ],
    related: ["copper-peptide-night-cream", "hydra-peptide-daily-cream", "peptide-eye-complex"],
    faqs: { en: genericFaqsEn, es: genericFaqsEs },
  },
  {
    slug: "argireline-smoothing-serum",
    sku: "NPS-SER-ARG",
    category: "serums",
    form: "SERUM",
    isPopular: true,
    color: "#e4e1ee",
    name: { en: "Argireline Smoothing Serum", es: "Sérum Alisador Argireline" },
    short: {
      en: "10% Argireline solution targeting the look of expression lines on the forehead and around the eyes.",
      es: "Solución al 10% de Argireline para el aspecto de las líneas de expresión en frente y contorno de ojos.",
    },
    description: {
      en: "A focused serum built around **acetyl hexapeptide-8 (Argireline)** at 10%, supported by glycerin and allantoin for comfort.\n\nUse it on areas where expression lines show most — forehead, between the brows, outer eye. Lightweight and fast-absorbing, it layers under any moisturiser.\n\n- 10% Argireline\n- Allantoin for comfort\n- Fragrance-free, vegan",
      es: "Sérum concentrado en torno al **acetil hexapéptido-8 (Argireline)** al 10%, con glicerina y alantoína para mayor confort.\n\nÚsalo en las zonas donde más se marcan las líneas de expresión: frente, entrecejo y contorno externo del ojo. Ligero y de rápida absorción, se aplica bajo cualquier hidratante.\n\n- 10% Argireline\n- Alantoína para el confort\n- Sin perfume, vegano",
    },
    specs: {
      keyPeptides: ["Acetyl Hexapeptide-8"],
      inci: "Aqua, Acetyl Hexapeptide-8, Glycerin, Propanediol, Allantoin, Hydroxyethylcellulose, Sodium Citrate, Citric Acid, Phenoxyethanol, Ethylhexylglycerin",
      skinTypes: ["All skin types", "Mature"],
      texture: "Light fluid",
      ph: "5.0 – 5.5",
      pao: "12M",
      shelfLife: "24 months unopened",
      usage: "Apply 2–3 drops to targeted areas morning and evening. Can be used under the Matrixyl Firming Serum.",
    },
    variants: [
      { label: "15 ml", sizeMl: 15, priceCents: 2700, stock: 90 },
      { label: "30 ml", sizeMl: 30, priceCents: 4500, stock: 150 },
    ],
    related: ["matrixyl-firming-serum", "peptide-eye-complex"],
    faqs: { en: genericFaqsEn, es: genericFaqsEs },
  },
  {
    slug: "copper-peptide-serum",
    sku: "NPS-SER-CU",
    category: "serums",
    form: "SERUM",
    color: "#dde6f0",
    name: { en: "Copper Peptide Serum", es: "Sérum de Péptidos de Cobre" },
    short: {
      en: "1% GHK-Cu copper tripeptide in a soothing base for skin that looks rested and even.",
      es: "1% de tripéptido de cobre GHK-Cu en una base calmante para una piel de aspecto descansado y uniforme.",
    },
    description: {
      en: "The signature blue serum. **Copper tripeptide-1 (GHK-Cu)** at 1% in a base of glycerin, aloe and panthenol.\n\nBest used in the evening; avoid layering directly with strong acids or vitamin C in the same step.\n\n- 1% copper tripeptide-1\n- Aloe & panthenol\n- Fragrance-free, vegan",
      es: "El sérum azul de la casa. **Tripéptido de cobre-1 (GHK-Cu)** al 1% en una base de glicerina, aloe y pantenol.\n\nIdeal por la noche; evita aplicarlo en el mismo paso que ácidos fuertes o vitamina C.\n\n- 1% tripéptido de cobre-1\n- Aloe y pantenol\n- Sin perfume, vegano",
    },
    specs: {
      keyPeptides: ["Copper Tripeptide-1"],
      inci: "Aqua, Glycerin, Aloe Barbadensis Leaf Juice, Copper Tripeptide-1, Panthenol, Propanediol, Xanthan Gum, Sodium Phytate, Phenoxyethanol, Ethylhexylglycerin",
      skinTypes: ["All skin types", "Sensitive"],
      texture: "Light fluid",
      ph: "6.0 – 6.5",
      pao: "6M",
      shelfLife: "18 months unopened",
      usage: "Apply 3 drops in the evening after cleansing. Follow with moisturiser.",
    },
    variants: [
      { label: "15 ml", sizeMl: 15, priceCents: 3200, stock: 70 },
      { label: "30 ml", sizeMl: 30, priceCents: 5400, stock: 110 },
    ],
    related: ["copper-peptide-night-cream", "matrixyl-firming-serum"],
    faqs: { en: genericFaqsEn, es: genericFaqsEs },
  },
  {
    slug: "hydra-peptide-daily-cream",
    sku: "NPS-CRM-HYD",
    category: "creams",
    form: "CREAM",
    isPopular: true,
    color: "#f0e8dc",
    name: { en: "Hydra-Peptide Daily Cream", es: "Crema Diaria Hydra-Péptido" },
    short: {
      en: "A daily moisturiser with Matrixyl 3000, ceramides and squalane. Comfortable under makeup and SPF.",
      es: "Hidratante diaria con Matrixyl 3000, ceramidas y escualano. Cómoda bajo maquillaje y SPF.",
    },
    description: {
      en: "Everyday hydration with a peptide backbone. **Matrixyl 3000** at 3% alongside a ceramide complex, squalane and glycerin.\n\nMedium-weight cream that absorbs cleanly. Skin feels soft and looks plump through the day.\n\n- 3% Matrixyl 3000\n- Ceramide NP, AP, EOP\n- Fragrance-free, vegan",
      es: "Hidratación diaria con base de péptidos. **Matrixyl 3000** al 3% junto a un complejo de ceramidas, escualano y glicerina.\n\nCrema de peso medio que se absorbe limpiamente. La piel se siente suave y se ve jugosa durante el día.\n\n- 3% Matrixyl 3000\n- Ceramidas NP, AP, EOP\n- Sin perfume, vegana",
    },
    specs: {
      keyPeptides: ["Palmitoyl Tripeptide-1", "Palmitoyl Tetrapeptide-7"],
      inci: "Aqua, Glycerin, Squalane, Caprylic/Capric Triglyceride, Cetearyl Alcohol, Glyceryl Stearate, Palmitoyl Tripeptide-1, Palmitoyl Tetrapeptide-7, Ceramide NP, Ceramide AP, Ceramide EOP, Phytosphingosine, Cholesterol, Sodium Lauroyl Lactylate, Carbomer, Xanthan Gum, Tocopherol, Phenoxyethanol, Ethylhexylglycerin",
      skinTypes: ["Normal", "Dry", "Combination"],
      texture: "Medium cream",
      ph: "5.5 – 6.0",
      pao: "12M",
      shelfLife: "24 months unopened",
      usage: "Apply a pea-sized amount morning and evening after serum.",
    },
    variants: [
      { label: "30 ml", sizeMl: 30, priceCents: 3900, stock: 140 },
      { label: "50 ml", sizeMl: 50, priceCents: 5500, stock: 180 },
    ],
    related: ["matrixyl-firming-serum", "copper-peptide-night-cream"],
    faqs: { en: genericFaqsEn, es: genericFaqsEs },
  },
  {
    slug: "copper-peptide-night-cream",
    sku: "NPS-CRM-CUN",
    category: "creams",
    form: "CREAM",
    color: "#d9e3ec",
    name: { en: "Copper Peptide Night Cream", es: "Crema de Noche con Péptidos de Cobre" },
    short: {
      en: "Rich overnight cream with 0.5% GHK-Cu, shea butter and niacinamide for skin that looks rested by morning.",
      es: "Crema de noche rica con 0,5% de GHK-Cu, manteca de karité y niacinamida para una piel de aspecto descansado por la mañana.",
    },
    description: {
      en: "A nourishing night cream. **Copper tripeptide-1** at 0.5% with 4% niacinamide, shea butter and squalane.\n\nRich but not heavy. Wake up to skin that feels soft and looks even.\n\n- 0.5% copper tripeptide-1\n- 4% niacinamide\n- Fragrance-free, vegan",
      es: "Crema de noche nutritiva. **Tripéptido de cobre-1** al 0,5% con 4% de niacinamida, manteca de karité y escualano.\n\nRica pero no pesada. Despierta con una piel suave y de aspecto uniforme.\n\n- 0,5% tripéptido de cobre-1\n- 4% niacinamida\n- Sin perfume, vegana",
    },
    specs: {
      keyPeptides: ["Copper Tripeptide-1"],
      inci: "Aqua, Butyrospermum Parkii Butter, Glycerin, Niacinamide, Squalane, Cetearyl Alcohol, Glyceryl Stearate, Copper Tripeptide-1, Panthenol, Sodium Stearoyl Glutamate, Xanthan Gum, Tocopherol, Phenoxyethanol, Ethylhexylglycerin",
      skinTypes: ["Dry", "Mature", "Normal"],
      texture: "Rich cream",
      ph: "5.5 – 6.0",
      pao: "12M",
      shelfLife: "24 months unopened",
      usage: "Apply in the evening as the last step of your routine.",
    },
    variants: [{ label: "50 ml", sizeMl: 50, priceCents: 6200, stock: 95 }],
    related: ["copper-peptide-serum", "hydra-peptide-daily-cream"],
    faqs: { en: genericFaqsEn, es: genericFaqsEs },
  },
  {
    slug: "peptide-eye-complex",
    sku: "NPS-EYE-CPX",
    category: "eye-and-masks",
    form: "EYE",
    isPopular: true,
    color: "#e6e9df",
    name: { en: "Peptide Eye Complex", es: "Complejo de Ojos con Péptidos" },
    short: {
      en: "Eye cream with Eyeseryl, Argireline and caffeine for a brighter, smoother-looking eye area.",
      es: "Contorno de ojos con Eyeseryl, Argireline y cafeína para una mirada de aspecto más luminoso y liso.",
    },
    description: {
      en: "Three targeted actives: **acetyl tetrapeptide-5 (Eyeseryl)**, **acetyl hexapeptide-8 (Argireline)** and caffeine, in a cushiony cream-gel.\n\nHelps the under-eye area look fresher and smoother. Ophthalmologist tested.\n\n- Eyeseryl 2%, Argireline 5%, caffeine 1%\n- Fragrance-free, vegan",
      es: "Tres activos específicos: **acetil tetrapéptido-5 (Eyeseryl)**, **acetil hexapéptido-8 (Argireline)** y cafeína, en una crema-gel mullida.\n\nAyuda a que el contorno se vea más fresco y liso. Testado oftalmológicamente.\n\n- Eyeseryl 2%, Argireline 5%, cafeína 1%\n- Sin perfume, vegano",
    },
    specs: {
      keyPeptides: ["Acetyl Tetrapeptide-5", "Acetyl Hexapeptide-8"],
      inci: "Aqua, Glycerin, Acetyl Hexapeptide-8, Acetyl Tetrapeptide-5, Caffeine, Squalane, Cetearyl Olivate, Sorbitan Olivate, Sodium Hyaluronate, Carbomer, Sodium Hydroxide, Phenoxyethanol, Ethylhexylglycerin",
      skinTypes: ["All skin types"],
      texture: "Cream-gel",
      ph: "5.5 – 6.0",
      pao: "6M",
      shelfLife: "18 months unopened",
      usage: "Pat a rice-grain amount around the orbital bone morning and evening.",
    },
    variants: [{ label: "15 ml", sizeMl: 15, priceCents: 3600, stock: 160 }],
    related: ["argireline-smoothing-serum", "matrixyl-firming-serum"],
    faqs: { en: genericFaqsEn, es: genericFaqsEs },
  },
  {
    slug: "barrier-repair-mask",
    sku: "NPS-MSK-BAR",
    category: "eye-and-masks",
    form: "MASK",
    color: "#ece4e4",
    name: { en: "Barrier Repair Mask", es: "Mascarilla Reparadora de Barrera" },
    short: {
      en: "Overnight or 20-minute mask with palmitoyl pentapeptide-4, ceramides and oat for comfortable, soft-feeling skin.",
      es: "Mascarilla de noche o de 20 minutos con palmitoil pentapéptido-4, ceramidas y avena para una piel cómoda y suave.",
    },
    description: {
      en: "A comforting mask for days when skin feels tight. **Palmitoyl pentapeptide-4** with ceramides, colloidal oat and glycerin.\n\nLeave on for 20 minutes and tissue off, or wear overnight as a sleeping mask.\n\n- Fragrance-free, vegan",
      es: "Mascarilla reconfortante para los días en que la piel se siente tirante. **Palmitoil pentapéptido-4** con ceramidas, avena coloidal y glicerina.\n\nDeja actuar 20 minutos y retira con un pañuelo, o úsala toda la noche.\n\n- Sin perfume, vegana",
    },
    specs: {
      keyPeptides: ["Palmitoyl Pentapeptide-4"],
      inci: "Aqua, Glycerin, Avena Sativa Kernel Flour, Squalane, Cetearyl Alcohol, Palmitoyl Pentapeptide-4, Ceramide NP, Panthenol, Allantoin, Xanthan Gum, Tocopherol, Phenoxyethanol, Ethylhexylglycerin",
      skinTypes: ["Dry", "Sensitive", "All skin types"],
      texture: "Balm-cream",
      ph: "5.5 – 6.0",
      pao: "12M",
      shelfLife: "24 months unopened",
      usage: "Apply a generous layer to clean skin 1–3 times per week.",
    },
    variants: [{ label: "50 ml", sizeMl: 50, priceCents: 4400, stock: 85 }],
    related: ["hydra-peptide-daily-cream"],
    faqs: { en: genericFaqsEn, es: genericFaqsEs },
  },
  {
    slug: "starter-routine-bundle",
    sku: "NPS-BND-START",
    category: "bundles",
    form: "BUNDLE",
    isPopular: true,
    color: "#e2ebe6",
    name: { en: "Starter Routine Bundle", es: "Pack Rutina Inicial" },
    short: {
      en: "Matrixyl Firming Serum 15 ml + Hydra-Peptide Daily Cream 30 ml. Save 15% versus buying separately.",
      es: "Sérum Reafirmante Matrixyl 15 ml + Crema Diaria Hydra-Péptido 30 ml. Ahorra un 15% frente a comprarlos por separado.",
    },
    description: {
      en: "Everything you need to start a peptide routine: a serum and a moisturiser that work together.\n\n**Includes:** Matrixyl Firming Serum 15 ml, Hydra-Peptide Daily Cream 30 ml.",
      es: "Todo lo necesario para empezar una rutina con péptidos: un sérum y una hidratante que trabajan juntos.\n\n**Incluye:** Sérum Reafirmante Matrixyl 15 ml, Crema Diaria Hydra-Péptido 30 ml.",
    },
    specs: {
      keyPeptides: ["Palmitoyl Tripeptide-1", "Palmitoyl Tetrapeptide-7"],
      inci: "See individual products.",
      skinTypes: ["All skin types"],
      texture: "Serum + cream",
      ph: "—",
      pao: "12M",
      shelfLife: "24 months unopened",
      usage: "Serum first, then cream. Morning and evening.",
    },
    variants: [{ label: "Set", sizeMl: 45, priceCents: 5800, stock: 75 }],
    related: ["matrixyl-firming-serum", "hydra-peptide-daily-cream"],
    faqs: { en: genericFaqsEn, es: genericFaqsEs },
  },
  {
    slug: "complete-routine-bundle",
    sku: "NPS-BND-FULL",
    category: "bundles",
    form: "BUNDLE",
    color: "#dfe5ea",
    name: { en: "Complete Routine Bundle", es: "Pack Rutina Completa" },
    short: {
      en: "Four-step routine: Matrixyl Serum 30 ml, Argireline Serum 15 ml, Eye Complex 15 ml, Copper Night Cream 50 ml. Save 20%.",
      es: "Rutina de cuatro pasos: Sérum Matrixyl 30 ml, Sérum Argireline 15 ml, Complejo de Ojos 15 ml, Crema de Noche de Cobre 50 ml. Ahorra un 20%.",
    },
    description: {
      en: "The full line in one box.\n\n**Includes:** Matrixyl Firming Serum 30 ml, Argireline Smoothing Serum 15 ml, Peptide Eye Complex 15 ml, Copper Peptide Night Cream 50 ml.",
      es: "La línea completa en una caja.\n\n**Incluye:** Sérum Reafirmante Matrixyl 30 ml, Sérum Alisador Argireline 15 ml, Complejo de Ojos 15 ml, Crema de Noche con Péptidos de Cobre 50 ml.",
    },
    specs: {
      keyPeptides: ["Palmitoyl Tripeptide-1", "Acetyl Hexapeptide-8", "Acetyl Tetrapeptide-5", "Copper Tripeptide-1"],
      inci: "See individual products.",
      skinTypes: ["All skin types"],
      texture: "Mixed",
      ph: "—",
      pao: "12M",
      shelfLife: "24 months unopened",
      usage: "AM: Matrixyl serum, eye complex, SPF. PM: Argireline serum, eye complex, copper night cream.",
    },
    variants: [{ label: "Set", sizeMl: 110, priceCents: 14900, stock: 40 }],
    related: ["starter-routine-bundle"],
    faqs: { en: genericFaqsEn, es: genericFaqsEs },
  },
  {
    slug: "gentle-cleansing-gel",
    sku: "NPS-ACC-CLN",
    category: "creams",
    form: "ACCESSORY",
    color: "#e9eef0",
    name: { en: "Gentle Cleansing Gel", es: "Gel Limpiador Suave" },
    short: {
      en: "pH-balanced, sulfate-free gel cleanser that preps skin for peptides without stripping.",
      es: "Gel limpiador sin sulfatos y con pH equilibrado que prepara la piel para los péptidos sin resecar.",
    },
    description: {
      en: "A soft, low-foam cleanser with glycerin and panthenol. Removes SPF and light makeup; leaves skin comfortable.\n\n- Sulfate-free, fragrance-free, vegan",
      es: "Limpiador suave de poca espuma con glicerina y pantenol. Retira SPF y maquillaje ligero; deja la piel cómoda.\n\n- Sin sulfatos, sin perfume, vegano",
    },
    specs: {
      keyPeptides: [],
      inci: "Aqua, Glycerin, Coco-Glucoside, Cocamidopropyl Betaine, Panthenol, Sodium Chloride, Citric Acid, Sodium Benzoate, Potassium Sorbate",
      skinTypes: ["All skin types"],
      texture: "Gel",
      ph: "5.0 – 5.5",
      pao: "12M",
      shelfLife: "24 months unopened",
      usage: "Massage onto damp skin, rinse. Morning and evening.",
    },
    variants: [{ label: "150 ml", sizeMl: 150, priceCents: 1900, stock: 220 }],
    related: ["matrixyl-firming-serum"],
    faqs: { en: genericFaqsEn, es: genericFaqsEs },
  },
  {
    slug: "daily-spf-50",
    sku: "NPS-ACC-SPF",
    category: "creams",
    form: "ACCESSORY",
    color: "#f3ecd9",
    name: { en: "Daily Mineral SPF 50", es: "Protector Solar Mineral Diario SPF 50" },
    short: {
      en: "Lightweight zinc oxide SPF 50 with a sheer finish. The non-negotiable last step of a morning routine.",
      es: "SPF 50 ligero con óxido de zinc y acabado transparente. El paso final imprescindible de la rutina de mañana.",
    },
    description: {
      en: "Broad-spectrum mineral sunscreen with 20% non-nano zinc oxide, squalane and vitamin E.\n\n- SPF 50, UVA\n- Fragrance-free, reef-safe",
      es: "Protector solar mineral de amplio espectro con 20% de óxido de zinc no nano, escualano y vitamina E.\n\n- SPF 50, UVA\n- Sin perfume, respetuoso con los arrecifes",
    },
    specs: {
      keyPeptides: [],
      inci: "Zinc Oxide (20%), Aqua, Caprylic/Capric Triglyceride, Squalane, Glycerin, Polyglyceryl-3 Polyricinoleate, Cetearyl Alcohol, Tocopherol, Xanthan Gum, Phenoxyethanol, Ethylhexylglycerin",
      skinTypes: ["All skin types", "Sensitive"],
      texture: "Light lotion",
      ph: "7.0 – 7.5",
      pao: "12M",
      shelfLife: "24 months unopened",
      usage: "Apply generously as the last step in the morning. Reapply every 2 hours in direct sun.",
    },
    variants: [{ label: "50 ml", sizeMl: 50, priceCents: 2800, stock: 190 }],
    related: ["hydra-peptide-daily-cream"],
    faqs: { en: genericFaqsEn, es: genericFaqsEs },
  },
  {
    slug: "travel-case",
    sku: "NPS-ACC-CASE",
    category: "bundles",
    form: "ACCESSORY",
    color: "#e5e5e5",
    name: { en: "Travel Case", es: "Estuche de Viaje" },
    short: {
      en: "Padded recycled-fabric case that holds three 30 ml bottles and an eye cream.",
      es: "Estuche acolchado de tejido reciclado para tres frascos de 30 ml y un contorno de ojos.",
    },
    description: {
      en: "Keeps bottles upright and protected. Wipe-clean lining, zip closure.",
      es: "Mantiene los frascos en pie y protegidos. Forro lavable, cierre de cremallera.",
    },
    specs: {
      keyPeptides: [],
      inci: "Recycled polyester, EVA foam.",
      skinTypes: [],
      texture: "—",
      ph: "—",
      pao: "—",
      shelfLife: "—",
      usage: "—",
    },
    variants: [{ label: "One size", sizeMl: 0, priceCents: 1500, stock: 300 }],
    related: ["complete-routine-bundle"],
    faqs: { en: [], es: [] },
  },
];

const coupons = [
  { code: "WELCOME10", type: "PERCENT", value: 10, minCents: 3000, active: true, usageLimit: null },
  { code: "ROUTINE15", type: "FIXED", value: 1500, minCents: 9000, active: true, usageLimit: 500 },
];

function placeholderSvg(title: string, tint: string) {
  const short = title.split(" ").slice(0, 2).join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="${tint}"/>
  <rect x="300" y="180" width="200" height="440" rx="60" fill="#ffffff" opacity="0.9"/>
  <rect x="350" y="120" width="100" height="80" rx="14" fill="#2b3a35" opacity="0.85"/>
  <rect x="330" y="330" width="140" height="160" rx="8" fill="${tint}"/>
  <text x="400" y="420" font-family="Helvetica, Arial, sans-serif" font-size="22" text-anchor="middle" fill="#2b3a35">${short}</text>
  <text x="400" y="700" font-family="Helvetica, Arial, sans-serif" font-size="20" text-anchor="middle" fill="#2b3a35" opacity="0.6">nordic peptide skin</text>
</svg>`;
}

function dummyPdf(title: string) {
  const text = `BT /F1 18 Tf 60 740 Td (${title}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return out;
}

async function main() {
  const root = process.cwd();
  mkdirSync(join(root, "public/products"), { recursive: true });
  mkdirSync(join(root, "public/batch-tests"), { recursive: true });

  await db.orderEvent.deleteMany();
  await db.checkoutSession.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.batchTest.deleteMany();
  await db.variant.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.coupon.deleteMany();

  const catIds: Record<string, string> = {};
  for (const c of categories) {
    const row = await db.category.create({ data: c });
    catIds[c.slug] = row.id;
  }

  const slugToId: Record<string, string> = {};
  for (const p of products) {
    writeFileSync(join(root, "public/products", `${p.slug}.svg`), placeholderSvg(p.name.en, p.color));
    const row = await db.product.create({
      data: {
        slug: p.slug,
        sku: p.sku,
        name: p.name,
        shortDescription: p.short,
        description: p.description,
        categoryId: catIds[p.category],
        isPopular: p.isPopular ?? false,
        form: p.form,
        specs: p.specs,
        images: [`/products/${p.slug}.svg`],
        relatedIds: [], // filled below once ids exist
        faqs: p.faqs,
        variants: {
          create: p.variants.map((v, i) => ({
            label: v.label,
            sizeMl: v.sizeMl,
            priceCents: v.priceCents,
            stock: v.stock,
            sku: `${p.sku}-${v.label.replace(/\s+/g, "").toUpperCase()}`,
            sortOrder: i,
          })),
        },
      },
    });
    slugToId[p.slug] = row.id;
  }

  for (const p of products) {
    await db.product.update({
      where: { slug: p.slug },
      data: { relatedIds: p.related.map((s) => slugToId[s]).filter(Boolean) },
    });
  }

  // One batch test per product (skip the travel case).
  let n = 1;
  for (const p of products.filter((x) => x.form !== "ACCESSORY" || x.slug !== "travel-case")) {
    const batchNo = `B${String(2409000 + n++).padStart(7, "0")}`;
    const pdfPath = `/batch-tests/${batchNo}.pdf`;
    writeFileSync(join(root, "public", pdfPath), dummyPdf(`Batch ${batchNo} — ${p.name.en}`));
    await db.batchTest.create({
      data: {
        productId: slugToId[p.slug],
        batchNo,
        labName: "Eurofins Cosmetics Testing",
        tests: [
          { name: "Microbial limits (ISO 17516)", result: "Pass" },
          { name: "Preservative efficacy (ISO 11930)", result: "Pass" },
          { name: "pH", result: p.specs.ph },
          { name: "Stability (3 months, 40 °C / 75% RH)", result: "Pass" },
        ],
        pdfPath,
        issuedAt: new Date(2026, 7, 1 + n),
      },
    });
  }

  for (const c of coupons) await db.coupon.create({ data: c });

  console.log(`Seeded ${categories.length} categories, ${products.length} products, ${coupons.length} coupons.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
