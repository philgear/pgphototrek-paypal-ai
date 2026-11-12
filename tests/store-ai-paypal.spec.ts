// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest';
import catalogData from '../src/data/store-catalog.json';
import {
  computeConfigTotalUsd,
  embedText256d,
  rankCatalogForPrompt,
  runAiInteriorConcierge,
  type IStoreArtwork,
} from '../src/lib/ai-concierge';
import {
  buildPayPalOrderV2Payload,
  computeProvenanceSha256,
  simulateSandboxOrderCapture,
  type IPayPalOrderSpec,
} from '../src/lib/paypal-orders';
import { registerStoreWebMcpTools } from '../src/lib/webmcp-store-tools';

const catalog = catalogData as unknown as IStoreArtwork[];

describe('PayPal Orders v2 & Cryptographic Provenance Engine', () => {
  it('builds strictly balanced Orders v2 purchase_units math (value = item_total - discount)', () => {
    const spec: IPayPalOrderSpec = {
      artworkId: catalog[0].id,
      title: catalog[0].title,
      size: '24x36',
      substrateName: 'TruLife Face-Mount Acrylic',
      framingName: "Beard's Custom Black Gallery Frame",
      fulfillmentName: "Beard's Framing Studio Will-Call (-$45)",
      paintSpec: 'Rodda CA002 Alabaster Fog',
      partnerStudio: "Beard's Framing — Pearl District",
      basePrintUsd: 910,
      framingAddonUsd: 140,
      partnerCreditUsd: 45,
      totalUsd: 1005,
    };

    const payload = buildPayPalOrderV2Payload(spec);
    expect(payload.intent).toBe('CAPTURE');
    const unit = payload.purchase_units[0];
    expect(unit.items).toHaveLength(2);

    const itemTotal = Number(unit.amount.breakdown.item_total.value);
    const discount = Number(unit.amount.breakdown.discount?.value || '0');
    const finalValue = Number(unit.amount.value);

    expect(itemTotal).toBe(1050);
    expect(discount).toBe(45);
    expect(itemTotal - discount).toBe(finalValue);
  });

  it('mints a 64-hex-char SHA-256 provenance receipt on Sandbox Order Capture', async () => {
    const spec: IPayPalOrderSpec = {
      artworkId: catalog[0].id,
      title: catalog[0].title,
      size: '16x24',
      substrateName: 'Museo Silver Rag Archival Giclee',
      framingName: 'Borderless Gallery Float Mount',
      fulfillmentName: 'Portland Fine Art Lab Direct Dropship',
      paintSpec: 'Rodda CA002',
      basePrintUsd: 380,
      framingAddonUsd: 0,
      partnerCreditUsd: 0,
      totalUsd: 380,
    };

    const receipt = await simulateSandboxOrderCapture(spec);
    expect(receipt.status).toBe('COMPLETED');
    expect(receipt.orderId).toMatch(/^PAYPAL-SBX-[0-9A-F]{12}$/);
    expect(receipt.captureId).toMatch(/^CAP-[0-9A-F]{14}$/);
    expect(receipt.provenanceSha256).toMatch(/^[0-9a-f]{64}$/);

    const hashA = await computeProvenanceSha256('deterministic-plate-01');
    const hashB = await computeProvenanceSha256('deterministic-plate-01');
    expect(hashA).toBe(hashB);
    expect(hashA).toHaveLength(64);
  });
});

describe('Multi-Tier AI Interior Art Concierge', () => {
  it('generates normalized L2=1.0 256-dim embeddings and ranks landscape prompts', () => {
    const vec = embedText256d('misty waterfall moss canyon');
    expect(vec).toHaveLength(256);
    let normSq = 0;
    for (let i = 0; i < vec.length; i++) normSq += vec[i] * vec[i];
    expect(normSq).toBeCloseTo(1.0, 3);

    const ranked = rankCatalogForPrompt('ocean coastal sunset water', catalog, 'all');
    expect(ranked.length).toBeGreaterThan(5);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
  });

  it('respects strict collector budget caps (< $450 and < $750) in AI curation', async () => {
    const tightRec = await runAiInteriorConcierge(
      'Calm minimalist print for my home office desk under $450',
      catalog
    );
    expect(tightRec.estimatedTotalUsd).toBeLessThanOrEqual(450);
    expect(tightRec.room).toBe('office');
    expect(tightRec.engineUsed).toBe('semantic-vector-256d');

    const midRec = await runAiInteriorConcierge(
      'Dramatic misty Pacific Northwest forest for a walnut living room under $750',
      catalog
    );
    expect(midRec.estimatedTotalUsd).toBeLessThanOrEqual(750);
    expect(computeConfigTotalUsd(midRec.size, midRec.substrate, midRec.framing, midRec.fulfillment)).toBe(
      midRec.estimatedTotalUsd
    );
  });
});

describe('W3C WebMCP (`document.modelContext`) Agentic Commerce Tools', () => {
  it('registers all 4 compliant tools on document.modelContext and executes end-to-end', async () => {
    const nativeRegistered: string[] = [];
    (document as any).modelContext = {
      registerTool: vi.fn((toolDef: any) => {
        nativeRegistered.push(toolDef.name);
      }),
    };

    let stagedArtworkId = catalog[0].id;
    let focusedCheckout = false;

    const { tools, nativeSupported } = await registerStoreWebMcpTools({
      getCatalog: () => catalog,
      getCurrentSpec: () => ({
        artworkId: stagedArtworkId,
        title: catalog.find((c) => c.id === stagedArtworkId)?.title || catalog[0].title,
        room: 'office',
        paintCode: 'CA184',
        size: '24x36',
        substrateName: 'ChromaLuxe Brushed Aluminum',
        framingName: 'Borderless Gallery Float Mount',
        fulfillmentName: 'Portland Fine Art Lab Direct Dropship',
        paintSpec: 'Rodda CA184',
        basePrintUsd: 813,
        framingAddonUsd: 0,
        partnerCreditUsd: 0,
        totalUsd: 813,
      }),
      applyConfiguration: (cfg) => {
        if (cfg.artworkId) stagedArtworkId = cfg.artworkId;
      },
      focusPayPalCheckoutLedger: () => {
        focusedCheckout = true;
      },
    });

    expect(nativeSupported).toBe(true);
    expect(nativeRegistered).toEqual([
      'search_fine_art_prints',
      'stage_artwork_in_room',
      'curate_room_with_ai',
      'initiate_paypal_checkout',
    ]);

    // 1. Empty search returns structured WebMCP error (never throws)
    const searchTool = tools.find((t) => t.name === 'search_fine_art_prints')!;
    const badSearch: any = await searchTool.execute({ query: '   ' });
    expect(badSearch.code).toBe('INVALID_QUERY');
    expect(badSearch.retryable).toBe(true);

    // 2. Valid search returns compact <= 1500-char paginated payload
    const goodSearch: any = await searchTool.execute({ query: 'coastal twilight', page: 1 });
    expect(goodSearch.results.length).toBeGreaterThan(0);
    expect(JSON.stringify(goodSearch).length).toBeLessThanOrEqual(1500);

    // 3. AI curation updates staged artwork
    const curateTool = tools.find((t) => t.name === 'curate_room_with_ai')!;
    const curated: any = await curateTool.execute({
      design_brief: 'Coastal horizon for a concrete gallery wall under $950',
    });
    expect(curated.status).toBe('curated_and_staged');
    expect(curated.total_usd).toBeLessThanOrEqual(950);

    // 4. Checkout handoff focuses PayPal Smart Payment Buttons without auto-charging
    const checkoutTool = tools.find((t) => t.name === 'initiate_paypal_checkout')!;
    const handoff: any = await checkoutTool.execute({ buyer_note: 'Gift wrap please' });
    expect(handoff.status).toBe('requires_user_action');
    expect(focusedCheckout).toBe(true);
  });
});
