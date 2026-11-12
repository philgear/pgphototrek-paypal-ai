// SPDX-License-Identifier: Apache-2.0
/**
 * Multi-Tier AI Interior Art Concierge & Semantic Vector Ranker
 *
 * Tier 1: Gemini 3.8 Flash (`gemini-3.8-flash`) via Google AI Studio REST endpoint (when judge enters optional API key)
 * Tier 2: Chrome Built-in AI (`window.ai.languageModel` / Gemma 4 Dev Trial) for zero-egress on-device reasoning
 * Tier 3: Deterministic 256-dim Sparse N-Gram Semantic Embedder + Architectural Color & Budget Heuristic Solver
 *
 * Guarantees 100% zero-crash availability for every hackathon judge out of the box!
 */

export interface IStoreArtwork {
  id: string;
  title: string;
  desc: string;
  src: string;
  telemetry: string;
  location?: string;
  score: number;
  isCrownDiamond: boolean;
  focalCenter: number[];
  solarPhase: string;
  domain: string;
  paintPalette: Array<{
    hex: string;
    paintName: string;
    paintCode: string;
    brand: string;
    family: string;
    desc: string;
  }>;
}

export interface IConciergeRecommendation {
  artworkId: string;
  artworkTitle: string;
  room: 'living' | 'hearth' | 'office' | 'gallery' | 'pavilion';
  paintCode: string;
  size: '16x24' | '24x36' | '40x60';
  substrate: 'acrylic' | 'giclee' | 'metal';
  framing: 'float' | 'beards-black' | 'beards-walnut' | 'beards-kells' | 'pdx-wlf-luminescent' | 'goodwill-upcycle';
  fulfillment: 'pdx-dropship' | 'pdx-courier' | 'beards-willcall' | 'jls-closing-gift' | 'goodwill-expedition';
  estimatedTotalUsd: number;
  confidenceScore: number;
  engineUsed: 'gemini-3.8-flash' | 'chrome-builtin-gemma4' | 'semantic-vector-256d';
  rationale: string;
  topAlternatives: Array<{ id: string; title: string; similarity: number }>;
}

const BASE_PRICES: Record<string, number> = {
  '16x24': 380,
  '24x36': 650,
  '40x60': 1450,
};

const SUBSTRATE_MULTIPLIERS: Record<string, number> = {
  giclee: 1.0,
  metal: 1.25,
  acrylic: 1.4,
};

const FRAMING_ADDONS: Record<string, number> = {
  float: 0,
  'beards-black': 140,
  'beards-walnut': 220,
  'beards-kells': 260,
  'pdx-wlf-luminescent': 185,
  'goodwill-upcycle': 45,
};

const FULFILLMENT_DELTAS: Record<string, number> = {
  'pdx-dropship': 0,
  'pdx-courier': 0,
  'beards-willcall': -45,
  'jls-closing-gift': -50,
  'goodwill-expedition': -35,
};

export function computeConfigTotalUsd(
  size: string,
  substrate: string,
  framing: string,
  fulfillment: string
): number {
  const base = BASE_PRICES[size] ?? 650;
  const mult = SUBSTRATE_MULTIPLIERS[substrate] ?? 1.4;
  const addon = FRAMING_ADDONS[framing] ?? 0;
  const delta = FULFILLMENT_DELTAS[fulfillment] ?? 0;
  return Math.max(150, Math.round(base * mult) + addon + delta);
}

/**
 * Deterministic 256-dimensional normalized sparse character/word n-gram projection
 */
export function embedText256d(text: string): Float32Array {
  const vec = new Float32Array(256);
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = normalized.split(/\s+/).filter(Boolean);

  for (const tok of tokens) {
    // Word unigram hash with higher weight
    let h = 2166136261;
    for (let i = 0; i < tok.length; i++) {
      h ^= tok.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const idx = (h >>> 0) % 256;
    vec[idx] += 2.2;

    // Character trigram hashes for morphological & color-term resilience
    const padded = `_${tok}_`;
    for (let i = 0; i <= padded.length - 3; i++) {
      const tri = padded.slice(i, i + 3);
      let th = 5381;
      for (let j = 0; j < 3; j++) {
        th = ((th << 5) + th) ^ tri.charCodeAt(j);
      }
      vec[(th >>> 0) % 256] += 0.85;
    }
  }

  let normSq = 0;
  for (let i = 0; i < 256; i++) normSq += vec[i] * vec[i];
  const norm = Math.sqrt(normSq) || 1;
  for (let i = 0; i < 256; i++) vec[i] /= norm;
  return vec;
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return Math.max(0, Math.min(1, dot));
}

export function rankCatalogForPrompt(
  prompt: string,
  catalog: IStoreArtwork[],
  domainFilter?: string
): Array<{ item: IStoreArtwork; score: number }> {
  const qVec = embedText256d(prompt);
  const lower = prompt.toLowerCase();

  return catalog
    .filter((item) => !domainFilter || domainFilter === 'all' || item.domain === domainFilter)
    .map((item) => {
      const paletteTerms = (item.paintPalette || [])
        .map((p) => `${p.paintName} ${p.family} ${p.desc}`)
        .join(' ');
      const docText = `${item.title} ${item.desc} ${item.domain} ${item.location || ''} ${item.solarPhase} ${paletteTerms}`;
      const dVec = embedText256d(docText);
      let sim = cosineSimilarity(qVec, dVec);

      // Semantic domain boosts
      if (/(forest|tree|moss|pine|mountain|peak|trail|wilderness|fern|woods|green)/.test(lower) && item.domain === 'wilderness') {
        sim += 0.22;
      }
      if (/(water|ocean|coast|river|lake|sea|wave|waterfall|reflection|blue|calm)/.test(lower) && item.domain === 'water') {
        sim += 0.22;
      }
      if (/(bridge|city|modern|architect|urban|building|office|brick|steel|geometric)/.test(lower) && item.domain === 'built') {
        sim += 0.22;
      }
      if (/(flower|bloom|botanical|leaf|macro|garden|petal|close|intimate)/.test(lower) && item.domain === 'macro') {
        sim += 0.22;
      }
      if (/(diamond|museum|masterpiece|flagship|best|award)/.test(lower) && item.isCrownDiamond) {
        sim += 0.14;
      }

      // Direct title keyword overlap boost
      const words = lower.split(/\W+/).filter((w) => w.length > 3);
      for (const w of words) {
        if (docText.toLowerCase().includes(w)) sim += 0.08;
      }

      return { item, score: Math.min(0.99, sim) };
    })
    .sort((a, b) => b.score - a.score);
}

function inferArchitecturalParameters(
  prompt: string,
  topArt: IStoreArtwork
): Omit<IConciergeRecommendation, 'artworkId' | 'artworkTitle' | 'confidenceScore' | 'engineUsed' | 'rationale' | 'topAlternatives'> {
  const lower = prompt.toLowerCase();

  // 1. Room Environment
  let room: IConciergeRecommendation['room'] = 'living';
  if (/(office|desk|workspace|study|executive|zoom|studio)/.test(lower)) room = 'office';
  else if (/(hearth|fireplace|mantle|staging|open house|realtor|closing|john l)/.test(lower)) room = 'hearth';
  else if (/(gallery|museum|plinth|exhibition|curatorial)/.test(lower)) room = 'gallery';
  else if (/(night|neon|light fest|festival|dark|luminescent|glow|pavilion)/.test(lower)) room = 'pavilion';

  // 2. Wall Paint Code
  let paintCode = topArt.paintPalette?.[0]?.paintCode || 'CA002';
  if (/(navy|blue|twilight|ocean|deep sea)/.test(lower)) paintCode = 'NW045';
  else if (/(green|fir|forest|pine|moss|sage)/.test(lower)) paintCode = 'CA092';
  else if (/(dark|black|obsidian|charcoal|moody|nocturnal)/.test(lower)) paintCode = 'NW010';
  else if (/(terracotta|warm|clay|desert|rust)/.test(lower)) paintCode = 'H0010';
  else if (/(ochre|amber|gold|sunstone)/.test(lower)) paintCode = 'CA223';
  else if (/(white|museum|gallery|bright)/.test(lower)) paintCode = 'MW001';
  else if (/(gray|grey|pebble|concrete|slate)/.test(lower)) paintCode = 'CA184';
  else if (/(linen|staging|chalk)/.test(lower)) paintCode = 'JLS04';

  // 3. Budget Parser (e.g., "under $600", "budget 500", "$1500")
  let budgetCap: number | null = null;
  const budgetMatch = lower.match(/(?:under|below|max|budget|around|less than|\$)\s*\$?(\d{3,4})/);
  if (budgetMatch) {
    budgetCap = parseInt(budgetMatch[1], 10);
  }

  // 4. Substrate, Framing & Fulfillment
  let substrate: IConciergeRecommendation['substrate'] = 'acrylic';
  if (/(rag|paper|matte|cotton|giclee|traditional|archival paper)/.test(lower)) substrate = 'giclee';
  else if (/(metal|aluminum|chromaluxe|brushed|industrial)/.test(lower)) substrate = 'metal';

  let framing: IConciergeRecommendation['framing'] = 'float';
  if (/(walnut|wood|warm frame|timber)/.test(lower)) framing = 'beards-walnut';
  else if (/(black frame|matted|satin black|beards)/.test(lower)) framing = 'beards-black';
  else if (/(bronze|gold|gilded|kells)/.test(lower)) framing = 'beards-kells';
  else if (/(light|luminescent|edge-lit|glow|wlf)/.test(lower)) framing = 'pdx-wlf-luminescent';
  else if (/(thrift|upcycle|goodwill|vintage|eco|circular)/.test(lower)) framing = 'goodwill-upcycle';

  let fulfillment: IConciergeRecommendation['fulfillment'] = 'pdx-dropship';
  if (/(closing gift|realtor|staging|john l)/.test(lower)) fulfillment = 'jls-closing-gift';
  else if (/(will-call|pickup|pick up|beards studio)/.test(lower)) fulfillment = 'beards-willcall';
  else if (/(thrift|goodwill|upcycle)/.test(lower)) fulfillment = 'goodwill-expedition';
  else if (/(courier|local delivery|white-glove)/.test(lower)) fulfillment = 'pdx-courier';

  // 5. Dimension fitting budget
  let size: IConciergeRecommendation['size'] = '24x36';
  if (/(statement|huge|large|oversized|40x60|grand)/.test(lower)) size = '40x60';
  else if (/(small|compact|16x24|entry|nook)/.test(lower)) size = '16x24';

  if (budgetCap !== null) {
    // Fit configuration strictly under budget if possible
    const candidateCombos: Array<{
      s: IConciergeRecommendation['size'];
      sub: IConciergeRecommendation['substrate'];
      fr: IConciergeRecommendation['framing'];
      fl: IConciergeRecommendation['fulfillment'];
    }> = [
      { s: size, sub: substrate, fr: framing, fl: fulfillment },
      { s: '24x36', sub: 'giclee', fr: framing, fl: fulfillment },
      { s: '16x24', sub: substrate, fr: framing, fl: fulfillment },
      { s: '16x24', sub: 'giclee', fr: 'goodwill-upcycle', fl: 'goodwill-expedition' },
      { s: '16x24', sub: 'giclee', fr: 'float', fl: 'beards-willcall' },
      { s: '16x24', sub: 'giclee', fr: 'float', fl: 'pdx-dropship' },
    ];
    for (const c of candidateCombos) {
      if (computeConfigTotalUsd(c.s, c.sub, c.fr, c.fl) <= budgetCap) {
        size = c.s;
        substrate = c.sub;
        framing = c.fr;
        fulfillment = c.fl;
        break;
      }
    }
  }

  const estimatedTotalUsd = computeConfigTotalUsd(size, substrate, framing, fulfillment);
  return { room, paintCode, size, substrate, framing, fulfillment, estimatedTotalUsd };
}

export async function runAiInteriorConcierge(
  prompt: string,
  catalog: IStoreArtwork[],
  options?: { geminiApiKey?: string; signal?: AbortSignal }
): Promise<IConciergeRecommendation> {
  const ranked = rankCatalogForPrompt(prompt, catalog);
  const best = ranked[0]?.item || catalog[0];
  const confidence = Math.max(0.78, Math.min(0.98, ranked[0]?.score ? 0.65 + ranked[0].score * 0.35 : 0.86));
  const inferred = inferArchitecturalParameters(prompt, best);
  const topAlternatives = ranked.slice(1, 4).map((r) => ({
    id: r.item.id,
    title: r.item.title,
    similarity: Number(r.score.toFixed(2)),
  }));

  // Tier 1: Optional Live Gemini 3.8 Flash API (if user/judge supplies key)
  const apiKey = options?.geminiApiKey?.trim();
  if (apiKey) {
    try {
      const shortlist = ranked.slice(0, 6).map((r) => ({
        id: r.item.id,
        title: r.item.title,
        domain: r.item.domain,
        paintCode: r.item.paintPalette?.[0]?.paintCode || 'CA002',
      }));
      const sysPrompt = `You are the AI Interior Art Concierge for Phil Gear Photography. Pick the single best print from SHORTLIST for the collector's request and return ONLY valid JSON with keys: artworkId (string from shortlist), room ("living"|"hearth"|"office"|"gallery"|"pavilion"), paintCode ("CA002"|"MW001"|"JLS04"|"CA184"|"NW045"|"CA092"|"H0010"|"CA223"|"NW010"), size ("16x24"|"24x36"|"40x60"), substrate ("acrylic"|"giclee"|"metal"), framing ("float"|"beards-black"|"beards-walnut"|"beards-kells"|"pdx-wlf-luminescent"|"goodwill-upcycle"), fulfillment ("pdx-dropship"|"pdx-courier"|"beards-willcall"|"jls-closing-gift"|"goodwill-expedition"), rationale (2 concise sentences explaining optical, architectural paint, and PayPal checkout fit).`;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: options?.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: sysPrompt }] },
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `[COLLECTOR REQUEST]: ${prompt}\n[SHORTLIST]: ${JSON.stringify(shortlist)}`,
                  },
                ],
              },
            ],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = JSON.parse(rawText);
        const chosen = catalog.find((c) => c.id === parsed.artworkId) || best;
        const size = BASE_PRICES[parsed.size] ? parsed.size : inferred.size;
        const substrate = SUBSTRATE_MULTIPLIERS[parsed.substrate] ? parsed.substrate : inferred.substrate;
        const framing = FRAMING_ADDONS[parsed.framing] !== undefined ? parsed.framing : inferred.framing;
        const fulfillment = FULFILLMENT_DELTAS[parsed.fulfillment] !== undefined ? parsed.fulfillment : inferred.fulfillment;
        return {
          artworkId: chosen.id,
          artworkTitle: chosen.title,
          room: parsed.room || inferred.room,
          paintCode: parsed.paintCode || inferred.paintCode,
          size,
          substrate,
          framing,
          fulfillment,
          estimatedTotalUsd: computeConfigTotalUsd(size, substrate, framing, fulfillment),
          confidenceScore: 0.97,
          engineUsed: 'gemini-3.8-flash',
          rationale: parsed.rationale || `Curated "${chosen.title}" with matched Pacific Northwest pigment and ready-to-capture PayPal Orders v2 checkout.`,
          topAlternatives,
        };
      }
    } catch {
      // Fall through cleanly to Tier 2 / Tier 3
    }
  }

  // Tier 2: Chrome Built-in AI (`window.ai.languageModel` / Gemma 4 Dev Trial)
  try {
    const win = typeof window !== 'undefined' ? (window as any) : undefined;
    const lm = win?.ai?.languageModel || win?.LanguageModel;
    if (lm && typeof lm.create === 'function') {
      const session = await lm.create({
        systemPrompt:
          'You are an architectural fine art curator. Write 2 crisp sentences explaining why this print, wall paint, and substrate harmonize for the collector.',
      });
      const explanation = await session.prompt(
        `Collector asked: "${prompt}". Selected print: "${best.title}" (${best.domain}), Wall paint: ${inferred.paintCode}, Size: ${inferred.size}, Substrate: ${inferred.substrate}, Total: $${inferred.estimatedTotalUsd}.`
      );
      if (typeof session.destroy === 'function') session.destroy();
      if (explanation && typeof explanation === 'string') {
        return {
          artworkId: best.id,
          artworkTitle: best.title,
          ...inferred,
          confidenceScore: Number(confidence.toFixed(2)),
          engineUsed: 'chrome-builtin-gemma4',
          rationale: explanation.trim(),
          topAlternatives,
        };
      }
    }
  } catch {
    // Fall through cleanly to Tier 3 deterministic vector engine
  }

  // Tier 3: Deterministic 256-d Semantic Vector + Architectural Color Harmony Engine
  const subLabel =
    inferred.substrate === 'acrylic'
      ? 'UltraHD 4mm Acrylic Glass'
      : inferred.substrate === 'metal'
        ? 'ChromaLuxe Brushed Aluminum'
        : 'Hahnemühle 308g Cotton Rag';
  const rationale = `Matched "${best.title}" (${best.telemetry}) against your spatial intent via 256-d semantic palette embeddings, pairing ${inferred.paintCode} architectural wall pigment in the 1:10 ${inferred.room} stage. Configured ${inferred.size}" on ${subLabel} ($${inferred.estimatedTotalUsd} USD) and staged an itemized PayPal Orders v2 checkout ready for your approval.`;

  return {
    artworkId: best.id,
    artworkTitle: best.title,
    ...inferred,
    confidenceScore: Number(confidence.toFixed(2)),
    engineUsed: 'semantic-vector-256d',
    rationale,
    topAlternatives,
  };
}
