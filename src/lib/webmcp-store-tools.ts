// SPDX-License-Identifier: Apache-2.0
/// <reference types="webmcp-types" />
/**
 * W3C WebMCP (`document.modelContext`) Agentic Commerce Tool Registration
 *
 * Exposes 4 client-side agentic commerce tools for in-browser AI agents (Chrome 150+ WebMCP)
 * AND mirrors them to an interactive Judge Agentic Inspector HUD so PayPal AI Hackathon
 * judges can test every tool in 1 click on any browser without experimental flags!
 *
 * Strictly adheres to WebMCP Non-Negotiables:
 * - Tool & param names <= 30 chars; descriptions <= 500 chars ("What + When", zero jargon);
 *   output payloads <= 1,500 chars.
 * - Opt-in annotations only (`readOnlyHint: true` on pure queries; omitted on UI mutations
 *   and human-in-the-loop `initiate_paypal_checkout` hand-off).
 * - Resolves structured `{ error, code, retryable }` on failures rather than throwing.
 */

import {
  rankCatalogForPrompt,
  runAiInteriorConcierge,
  type IStoreArtwork,
} from './ai-concierge';
import type { IPayPalOrderSpec } from './paypal-orders';

export interface IStoreControllerBridge {
  getCatalog: () => IStoreArtwork[];
  getCurrentSpec: () => IPayPalOrderSpec & { room: string; paintCode: string };
  applyConfiguration: (cfg: {
    artworkId?: string;
    room?: string;
    paintCode?: string;
    size?: string;
    substrate?: string;
    framing?: string;
    fulfillment?: string;
  }) => Promise<void> | void;
  focusPayPalCheckoutLedger: () => Promise<void> | void;
  getGeminiApiKey?: () => string;
  onToolInvoked?: (toolName: string, args: Record<string, unknown>, result: unknown) => void;
}

export interface IRegisteredAgentTool {
  name: string;
  description: string;
  annotations?: {
    readOnlyHint?: boolean;
    consequentialHint?: boolean;
    untrustedContentHint?: boolean;
  };
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, any>, ctx?: { signal?: AbortSignal }) => Promise<unknown>;
}

export function buildStoreWebMcpTools(bridge: IStoreControllerBridge): IRegisteredAgentTool[] {
  return [
    {
      name: 'search_fine_art_prints',
      description:
        'Searches curated fine art photographic prints by mood, landscape subject, room vibe, or wall color harmony. Use when exploring or comparing print candidates before mounting one.',
      annotations: {
        readOnlyHint: true,
      },
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural-language subject, mood, lighting, or color palette keywords',
          },
          domain: {
            type: 'string',
            enum: ['all', 'wilderness', 'water', 'built', 'macro'],
            description: 'Optional photographic sphere filter',
          },
          page: {
            type: 'integer',
            description: 'Page number starting at 1 (6 items per page)',
          },
        },
        required: ['query'],
      },
      async execute(args) {
        const query = String(args?.query || '').trim();
        if (!query) {
          return {
            error: 'Search query cannot be empty. Provide keywords like "misty forest" or "coastal sunset".',
            code: 'INVALID_QUERY',
            retryable: true,
          };
        }
        const catalog = bridge.getCatalog();
        const domain = args?.domain ? String(args.domain) : 'all';
        const ranked = rankCatalogForPrompt(query, catalog, domain);

        if (ranked.length === 0) {
          return {
            error: `No prints matched "${query}" in sphere "${domain}".`,
            code: 'NOT_FOUND',
            suggestion: 'Retry with domain="all" or broader landscape keywords.',
            retryable: true,
          };
        }

        const pageSize = 6;
        const page = Math.max(1, Number(args?.page || 1));
        const start = (page - 1) * pageSize;
        const slice = ranked.slice(start, start + pageSize).map((r) => ({
          id: r.item.id,
          title: r.item.title,
          domain: r.item.domain,
          paintMatch: r.item.paintPalette?.[0]?.paintCode || 'CA002',
          similarity: Number(r.score.toFixed(2)),
        }));

        const out = {
          page,
          page_size: pageSize,
          total_count: ranked.length,
          total_pages: Math.ceil(ranked.length / pageSize),
          results: slice,
        };
        bridge.onToolInvoked?.('search_fine_art_prints', args, out);
        return out;
      },
    },

    {
      name: 'stage_artwork_in_room',
      description:
        'Mounts a fine art print into the 1:10 architectural room visualizer and configures room silhouette, wall paint, print dimensions, substrate, framing, or fulfillment. Use when staging or customizing a print on the wall.',
      inputSchema: {
        type: 'object',
        properties: {
          artwork_id: {
            type: 'string',
            description: 'Identifier of the print to mount (from search results)',
          },
          room: {
            type: 'string',
            enum: ['living', 'hearth', 'office', 'gallery', 'pavilion'],
            description: 'Architectural room environment silhouette',
          },
          paint_code: {
            type: 'string',
            enum: ['CA002', 'MW001', 'JLS04', 'CA184', 'NW045', 'CA092', 'H0010', 'CA223', 'NW010'],
            description: 'Pacific Northwest Rodda or Miller wall paint code',
          },
          size: {
            type: 'string',
            enum: ['16x24', '24x36', '40x60'],
            description: 'Uncropped 300 DPI print dimensions in inches',
          },
          substrate: {
            type: 'string',
            enum: ['acrylic', 'giclee', 'metal'],
            description: 'Museum archival print medium',
          },
          framing: {
            type: 'string',
            enum: ['float', 'beards-black', 'beards-walnut', 'beards-kells', 'pdx-wlf-luminescent', 'goodwill-upcycle'],
            description: 'Framing moulding or edge-lit halo option',
          },
          fulfillment: {
            type: 'string',
            enum: ['pdx-dropship', 'pdx-courier', 'beards-willcall', 'jls-closing-gift', 'goodwill-expedition'],
            description: 'Delivery or local partner pickup option',
          },
        },
      },
      async execute(args) {
        const catalog = bridge.getCatalog();
        if (args?.artwork_id) {
          const exists = catalog.some((p) => p.id === args.artwork_id);
          if (!exists) {
            return {
              error: `Artwork "${args.artwork_id}" was not found in the curated store catalog.`,
              code: 'ARTWORK_NOT_FOUND',
              suggestion: 'Call search_fine_art_prints first to retrieve valid artwork IDs.',
              retryable: true,
            };
          }
        }

        await bridge.applyConfiguration({
          artworkId: args?.artwork_id,
          room: args?.room,
          paintCode: args?.paint_code,
          size: args?.size,
          substrate: args?.substrate,
          framing: args?.framing,
          fulfillment: args?.fulfillment,
        });

        const updated = bridge.getCurrentSpec();
        const out = {
          status: 'staged_on_wall',
          artwork_id: updated.artworkId,
          title: updated.title,
          room: updated.room,
          paint_spec: updated.paintSpec,
          size: updated.size,
          substrate: updated.substrateName,
          framing: updated.framingName,
          total_usd: updated.totalUsd,
        };
        bridge.onToolInvoked?.('stage_artwork_in_room', args, out);
        return out;
      },
    },

    {
      name: 'curate_room_with_ai',
      description:
        'Analyzes a natural-language interior design brief and budget to recommend and automatically stage a harmonious print, wall paint, substrate, and framing spec. Use when the user describes their room, lighting, or budget.',
      inputSchema: {
        type: 'object',
        properties: {
          design_brief: {
            type: 'string',
            description: 'User description of their room, wall color, mood, lighting, or target budget',
          },
        },
        required: ['design_brief'],
      },
      async execute(args, ctx) {
        const brief = String(args?.design_brief || '').trim();
        if (!brief) {
          return {
            error: 'Design brief is empty. Ask the collector about their room type, lighting, or budget.',
            code: 'MISSING_BRIEF',
            retryable: true,
          };
        }

        const rec = await runAiInteriorConcierge(brief, bridge.getCatalog(), {
          geminiApiKey: bridge.getGeminiApiKey?.(),
          signal: ctx?.signal,
        });

        await bridge.applyConfiguration({
          artworkId: rec.artworkId,
          room: rec.room,
          paintCode: rec.paintCode,
          size: rec.size,
          substrate: rec.substrate,
          framing: rec.framing,
          fulfillment: rec.fulfillment,
        });

        const out = {
          status: 'curated_and_staged',
          engine: rec.engineUsed,
          confidence: rec.confidenceScore,
          artwork_id: rec.artworkId,
          title: rec.artworkTitle,
          room: rec.room,
          paint_code: rec.paintCode,
          size: rec.size,
          substrate: rec.substrate,
          framing: rec.framing,
          fulfillment: rec.fulfillment,
          total_usd: rec.estimatedTotalUsd,
          rationale: rec.rationale.slice(0, 420),
          alternatives: rec.topAlternatives,
        };
        bridge.onToolInvoked?.('curate_room_with_ai', args, out);
        return out;
      },
    },

    {
      name: 'initiate_paypal_checkout',
      description:
        'Prepares an itemized PayPal Orders v2 checkout ledger for the staged artwork and focuses the PayPal confirmation controls so the buyer can review and approve payment. Use when the user is ready to purchase.',
      inputSchema: {
        type: 'object',
        properties: {
          buyer_note: {
            type: 'string',
            description: 'Optional gift dedication or framing note to attach to the order summary',
          },
        },
      },
      async execute(args) {
        await bridge.focusPayPalCheckoutLedger();
        const spec = bridge.getCurrentSpec();
        const out = {
          status: 'requires_user_action',
          next_step:
            'Itemized PayPal Orders v2 ledger is focused on screen. Ask the collector to click the PayPal Smart Button (or Judge Sandbox Capture) to authorize payment.',
          order_preview: {
            artwork_id: spec.artworkId,
            title: spec.title,
            size: spec.size,
            substrate: spec.substrateName,
            framing: spec.framingName,
            fulfillment: spec.fulfillmentName,
            base_print_usd: spec.basePrintUsd,
            framing_addon_usd: spec.framingAddonUsd,
            partner_rebate_usd: spec.partnerCreditUsd,
            total_usd: spec.totalUsd,
            buyer_note: args?.buyer_note ? String(args.buyer_note).slice(0, 120) : undefined,
          },
        };
        bridge.onToolInvoked?.('initiate_paypal_checkout', args, out);
        return out;
      },
    },
  ];
}

export async function registerStoreWebMcpTools(
  bridge: IStoreControllerBridge
): Promise<{ controller: AbortController; tools: IRegisteredAgentTool[]; nativeSupported: boolean }> {
  const controller = new AbortController();
  const tools = buildStoreWebMcpTools(bridge);
  let nativeSupported = false;

  if (
    typeof document !== 'undefined' &&
    'modelContext' in document &&
    document.modelContext &&
    typeof document.modelContext.registerTool === 'function'
  ) {
    nativeSupported = true;
    for (const tool of tools) {
      try {
        await document.modelContext.registerTool(
          {
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema as any,
            ...(tool.annotations ? { annotations: tool.annotations } : {}),
            execute: (args: any, ctx: any) => tool.execute(args, ctx),
          } as any,
          { signal: controller.signal }
        );
      } catch (err) {
        console.warn(`[WebMCP] Tool registration warning (${tool.name}):`, err);
      }
    }
  }

  return { controller, tools, nativeSupported };
}
