// SPDX-License-Identifier: Apache-2.0
import {
  runAiInteriorConcierge,
  type IStoreArtwork,
} from '../lib/ai-concierge';
import {
  buildPayPalOrderV2Payload,
  mountPayPalSmartButtons,
  simulateSandboxOrderCapture,
  type IPayPalCaptureReceipt,
  type IPayPalOrderSpec,
} from '../lib/paypal-orders';
import {
  registerStoreWebMcpTools,
  type IRegisteredAgentTool,
} from '../lib/webmcp-store-tools';

const LIVE_PAYPAL_CLIENT_ID =
  'AV5B-GKhcAwefq8JjRJ4RS28D-hutkEmPyTMl18Kw9kUAyYWrHXGCWEOi5-3ZDERLBIt9Z29hFgFxNvp';

const WOOD_STYLES: Record<
  string,
  { name: string; topBg: string; topBorder: string; bodyBg: string; grainOpacity: string }
> = {
  walnut: {
    name: 'Pacific Black Walnut',
    topBg: 'linear-gradient(180deg, #3d2314 0%, #2b170c 100%)',
    topBorder: 'rgba(217, 119, 6, 0.4)',
    bodyBg: 'linear-gradient(180deg, #2b170c 0%, #170b05 100%)',
    grainOpacity: '0.4',
  },
  oak: {
    name: 'Oregon White Oak',
    topBg: 'linear-gradient(180deg, #d8bc93 0%, #b8986c 100%)',
    topBorder: 'rgba(251, 191, 36, 0.6)',
    bodyBg: 'linear-gradient(180deg, #c4a478 0%, #a8885c 100%)',
    grainOpacity: '0.6',
  },
  redwood: {
    name: 'Reclaimed Redwood',
    topBg: 'linear-gradient(180deg, #8a3a22 0%, #632615 100%)',
    topBorder: 'rgba(239, 68, 68, 0.5)',
    bodyBg: 'linear-gradient(180deg, #6e2a18 0%, #4a1c10 100%)',
    grainOpacity: '0.5',
  },
  shousugi: {
    name: 'Shou Sugi Ban Charred Ash',
    topBg: 'linear-gradient(180deg, #262626 0%, #141414 100%)',
    topBorder: 'rgba(255, 255, 255, 0.2)',
    bodyBg: 'linear-gradient(180deg, #171717 0%, #0a0a0a 100%)',
    grainOpacity: '0.25',
  },
  titanium: {
    name: 'Anodized Brushed Titanium',
    topBg: 'linear-gradient(180deg, #475569 0%, #1e293b 100%)',
    topBorder: 'rgba(56, 189, 248, 0.5)',
    bodyBg: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
    grainOpacity: '0.15',
  },
  concrete: {
    name: 'Board-Formed Gallery Concrete',
    topBg: 'linear-gradient(180deg, #78716c 0%, #57534e 100%)',
    topBorder: 'rgba(214, 211, 209, 0.45)',
    bodyBg: 'linear-gradient(180deg, #57534e 0%, #292524 100%)',
    grainOpacity: '0.35',
  },
};

const TEXTURE_STYLES: Record<
  string,
  { name: string; bg: string; size: string; opacity: string; blend: string }
> = {
  eggshell: {
    name: 'Smooth Eggshell',
    bg: 'radial-gradient(rgba(0,0,0,0.08) 1px, transparent 0)',
    size: '4px 4px',
    opacity: '0.35',
    blend: 'overlay',
  },
  cedarslat: {
    name: 'Office Acoustic Cedar Slat',
    bg: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0.28) 3px, rgba(255,255,255,0.06) 3px, rgba(255,255,255,0.06) 11px)',
    size: '14px 100%',
    opacity: '0.5',
    blend: 'overlay',
  },
  gallerylinen: {
    name: 'Museum Archival Linen',
    bg: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.09) 0px, rgba(0,0,0,0.09) 1px, transparent 1px, transparent 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.09) 0px, rgba(0,0,0,0.09) 1px, transparent 1px, transparent 3px)',
    size: '3px 3px',
    opacity: '0.4',
    blend: 'multiply',
  },
  loftbrick: {
    name: 'Pearl District Loft Brick',
    bg: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.24) 0px, rgba(0,0,0,0.24) 2px, transparent 2px, transparent 14px), repeating-linear-gradient(90deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 2px, transparent 2px, transparent 28px)',
    size: '28px 14px',
    opacity: '0.45',
    blend: 'overlay',
  },
  limewash: {
    name: 'Roman Lime Wash',
    bg: 'radial-gradient(ellipse at 20% 30%, rgba(255,255,255,0.22) 0%, transparent 50%), radial-gradient(ellipse at 75% 65%, rgba(0,0,0,0.18) 0%, transparent 60%)',
    size: '100% 100%',
    opacity: '0.55',
    blend: 'overlay',
  },
  concrete: {
    name: 'Micro-Cement',
    bg: 'radial-gradient(rgba(0,0,0,0.25) 1px, transparent 0), radial-gradient(rgba(255,255,255,0.2) 1px, transparent 0)',
    size: '6px 6px, 12px 12px',
    opacity: '0.5',
    blend: 'overlay',
  },
};

const ROOM_DEFAULTS: Record<
  string,
  { caption: string; wood: string; prop: string; texture: string; paint: string }
> = {
  living: {
    caption: 'Mid-Century Tambour Credenza • 1:10 Scale',
    wood: 'walnut',
    prop: 'skateboard',
    texture: 'eggshell',
    paint: 'CA002',
  },
  hearth: {
    caption: 'PNW Live-Edge Fireplace Mantle & Basalt Hearth • 1:10 Scale',
    wood: 'walnut',
    prop: 'hearth',
    texture: 'limewash',
    paint: 'JLS04',
  },
  office: {
    caption: "Architect's Cantilevered Sit-Stand Studio Desk • 1:10 Scale",
    wood: 'titanium',
    prop: 'workstation',
    texture: 'cedarslat',
    paint: 'CA184',
  },
  gallery: {
    caption: 'Pearl District Slatted Museum Viewing Bench • 1:10 Scale',
    wood: 'concrete',
    prop: 'sculpture',
    texture: 'gallerylinen',
    paint: 'MW001',
  },
  pavilion: {
    caption: 'PDX Winter Light Festival Nocturnal Plinth • 1:10 Scale',
    wood: 'shousugi',
    prop: 'sculpture',
    texture: 'concrete',
    paint: 'NW010',
  },
};

function getBasePrefix(): string {
  const b = document.documentElement.getAttribute('data-base-url') || '/';
  return b.endsWith('/') ? b : `${b}/`;
}

function withBase(src: string): string {
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  const base = getBasePrefix();
  const clean = src.replace(/^\//, '');
  return `${base}${clean}`;
}

export function initStoreApp() {
  const dataEl = document.getElementById('store-catalog-json');
  if (!dataEl) return;

  let catalog: IStoreArtwork[] = [];
  try {
    catalog = JSON.parse(dataEl.textContent || '[]');
  } catch {
    catalog = [];
  }
  if (catalog.length === 0) return;

  const basePrefix = getBasePrefix();

  // State
  let currentArtworkId = catalog[0].id;
  let currentRoom = 'living';
  let currentWood = 'walnut';
  let currentTexture = 'eggshell';
  let basePrice = 650;
  let multiplier = 1.0;
  let framingAddon = 0;
  let fulfillmentDelta = 0;
  let activeFramingId = 'float';
  let activeFramingName = 'Borderless Gallery Float Mount';
  let activeFulfillmentId = 'pdx-dropship';
  let activeFulfillmentName = 'Portland Fine Art Lab Direct Dropship';
  let paypalEnvMode: 'sandbox' | 'live' = 'sandbox';
  let gnomesEnabled = true;
  let gnomeTimer: ReturnType<typeof setTimeout> | null = null;

  // DOM Elements
  const wall = document.getElementById('virtual-room-wall');
  const wallLighting = document.getElementById('wall-lighting-overlay');
  const textureOverlay = document.getElementById('wall-texture-overlay');
  const paintLabel = document.getElementById('active-wall-paint-label');
  const frame = document.getElementById('artwork-mounting-frame');
  const artworkFrameWrapper = document.getElementById('artwork-mounting-frame-wrapper');
  const activeImg = document.getElementById('active-wall-artwork') as HTMLImageElement | null;
  const titleEl = document.getElementById('store-artwork-title');
  const telemetryEl = document.getElementById('store-artwork-telemetry');
  const priceDisplay = document.getElementById('calculated-price');
  const ledgerBasePrint = document.getElementById('ledger-base-print');
  const ledgerPartnerAddon = document.getElementById('ledger-partner-addon');
  const ledgerPartnerCredit = document.getElementById('ledger-partner-credit');
  const ledgerPaintSpec = document.getElementById('ledger-paint-spec');
  const breakdownSummary = document.getElementById('price-breakdown-summary');
  const orderPayloadPre = document.getElementById('paypal-order-json-preview');
  const studioPicker = document.getElementById('beards-studio-picker');
  const studioSelect = document.getElementById('beards-studio-select') as HTMLSelectElement | null;

  const paintBtns = document.querySelectorAll<HTMLButtonElement>('.paint-swatch-btn');
  const sizeBtns = document.querySelectorAll<HTMLButtonElement>('.size-btn');
  const substrateBtns = document.querySelectorAll<HTMLButtonElement>('.substrate-btn');
  const framingBtns = document.querySelectorAll<HTMLButtonElement>('.framing-btn');
  const fulfillmentBtns = document.querySelectorAll<HTMLButtonElement>('.fulfillment-btn');
  const roomBtns = document.querySelectorAll<HTMLButtonElement>('.room-btn');
  const woodBtns = document.querySelectorAll<HTMLButtonElement>('.wood-btn');
  const propBtns = document.querySelectorAll<HTMLButtonElement>('.prop-btn');
  const textureBtns = document.querySelectorAll<HTMLButtonElement>('.texture-btn');
  const partnerPresetBtns = document.querySelectorAll<HTMLButtonElement>('.partner-preset-btn');
  const quickSwapBtns = document.querySelectorAll<HTMLButtonElement>('.quick-swap-btn');
  const catalogMountBtns = document.querySelectorAll<HTMLButtonElement>('.catalog-mount-btn');
  const filterBtns = document.querySelectorAll<HTMLButtonElement>('.store-filter-btn');
  const catalogCards = document.querySelectorAll<HTMLElement>('.store-catalog-card');

  function getActivePaintInfo() {
    const activeBtn =
      document.querySelector<HTMLButtonElement>('.paint-swatch-btn.ring-amber-400') || paintBtns[0];
    return {
      brand: activeBtn?.getAttribute('data-brand') || 'Rodda',
      code: activeBtn?.getAttribute('data-code') || 'CA002',
      name: activeBtn?.getAttribute('data-name') || 'Alabaster Fog',
      hex: activeBtn?.getAttribute('data-hex') || '#E8E7E0',
    };
  }

  function getCurrentOrderSpec(): IPayPalOrderSpec & { room: string; paintCode: string } {
    const basePrintUsd = Math.round(basePrice * multiplier);
    const totalUsd = Math.max(150, basePrintUsd + framingAddon + fulfillmentDelta);
    const activeSizeBtn = document.querySelector<HTMLButtonElement>('.size-btn.bg-amber-500');
    const size = activeSizeBtn?.getAttribute('data-size') || '24x36';
    const activeSubBtn = document.querySelector<HTMLButtonElement>('.substrate-btn.border-amber-400');
    const substrateName =
      activeSubBtn?.getAttribute('data-name') || 'Hahnemühle Photo Rag 308g (Fine Art Giclée)';
    const paint = getActivePaintInfo();

    return {
      artworkId: currentArtworkId,
      title: titleEl?.textContent?.trim() || catalog[0].title,
      size,
      substrateName,
      framingName: activeFramingName,
      fulfillmentName: activeFulfillmentName,
      paintSpec: `${paint.brand} ${paint.code} ${paint.name}`,
      partnerStudio: studioSelect?.value || undefined,
      basePrintUsd,
      framingAddonUsd: framingAddon,
      partnerCreditUsd: fulfillmentDelta < 0 ? Math.abs(fulfillmentDelta) : 0,
      totalUsd,
      room: currentRoom,
      paintCode: paint.code,
    };
  }

  function updatePriceAndLedger() {
    const spec = getCurrentOrderSpec();
    if (priceDisplay) priceDisplay.textContent = `$${spec.totalUsd}`;
    if (ledgerBasePrint) ledgerBasePrint.textContent = `$${spec.basePrintUsd}`;
    if (ledgerPartnerAddon) {
      ledgerPartnerAddon.textContent =
        spec.framingAddonUsd > 0 ? `+$${spec.framingAddonUsd}` : 'Included';
    }
    if (ledgerPartnerCredit) {
      ledgerPartnerCredit.textContent =
        spec.partnerCreditUsd > 0 ? `-$${spec.partnerCreditUsd}` : '$0';
    }
    if (ledgerPaintSpec) {
      const paint = getActivePaintInfo();
      ledgerPaintSpec.textContent = `${paint.brand} ${paint.code}`;
    }

    const needsHub =
      activeFulfillmentId === 'beards-willcall' ||
      activeFulfillmentId === 'jls-closing-gift' ||
      activeFulfillmentId === 'goodwill-expedition' ||
      activeFramingId === 'goodwill-upcycle' ||
      activeFramingId === 'pdx-wlf-luminescent';

    if (studioPicker) {
      studioPicker.classList.toggle('hidden', !needsHub);
    }

    const hubNote = needsHub && studioSelect?.value ? ` • ${studioSelect.value}` : '';
    if (breakdownSummary) {
      breakdownSummary.textContent = `${spec.size}" ${spec.substrateName} • ${spec.framingName} • ${spec.fulfillmentName}${hubNote}`;
    }

    if (orderPayloadPre) {
      const v2Payload = buildPayPalOrderV2Payload(spec);
      orderPayloadPre.textContent = JSON.stringify(v2Payload, null, 2);
    }

    // Keep the 3 size buttons showing honest, transparent print prices for the active medium
    sizeBtns.forEach((b) => {
      const szBase = parseInt(b.getAttribute('data-base-price') || '650', 10);
      const priceTag = b.querySelector<HTMLElement>('.size-price-label');
      if (priceTag) {
        priceTag.textContent = `$${Math.round(szBase * multiplier)}`;
      }
    });

    const simPriceSpan = document.getElementById('judge-sim-price');
    if (simPriceSpan) simPriceSpan.textContent = `$${spec.totalUsd} → COA`;
  }

  function applyPaintByCodeOrName(queryStr: string) {
    if (!queryStr) return;
    const clean = queryStr.toLowerCase().replace(/[^a-z0-9]/g, '');
    let matchedBtn: HTMLButtonElement | null = null;
    paintBtns.forEach((btn) => {
      const code = (btn.getAttribute('data-code') || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const name = (btn.getAttribute('data-name') || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if ((code && clean.includes(code)) || (name && clean.includes(name))) {
        matchedBtn = btn;
      }
    });
    if (matchedBtn) {
      (matchedBtn as HTMLButtonElement).click();
    }
  }

  function applyWood(woodKey: string) {
    currentWood = WOOD_STYLES[woodKey] ? woodKey : 'walnut';
    const w = WOOD_STYLES[currentWood];
    woodBtns.forEach((b) => {
      if (b.parentElement?.classList.contains('hidden')) return;
      const active = b.getAttribute('data-wood') === currentWood;
      b.className = active
        ? 'wood-btn px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500 text-black border border-amber-400 cursor-pointer shrink-0'
        : 'wood-btn px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-800 cursor-pointer shrink-0';
    });
    document.querySelectorAll<HTMLElement>('.timber-surface').forEach((el) => {
      el.style.background = w.topBg;
      el.style.borderColor = w.topBorder;
    });
    document.querySelectorAll<HTMLElement>('.timber-body').forEach((el) => {
      el.style.background = w.bodyBg;
    });
    const cap = document.getElementById('furniture-caption');
    const roomCfg = ROOM_DEFAULTS[currentRoom] || ROOM_DEFAULTS.living;
    if (cap) {
      cap.textContent =
        currentRoom === 'pavilion' ? roomCfg.caption : `${roomCfg.caption} (${w.name})`;
    }
  }

  function applyProp(propKey: string) {
    propBtns.forEach((b) => {
      const active = b.getAttribute('data-prop') === propKey;
      b.className = active
        ? 'prop-btn px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-amber-500 text-black border border-amber-400 cursor-pointer shadow-md shrink-0'
        : 'prop-btn px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-900 text-slate-300 hover:text-white border border-slate-800 cursor-pointer shrink-0';
    });
    const map: Record<string, string> = {
      skateboard: 'prop-skateboard',
      plant: 'prop-plant',
      workstation: 'prop-workstation',
      sculpture: 'prop-sculpture',
      hearth: 'prop-hearth-vessels',
    };
    Object.entries(map).forEach(([k, domId]) => {
      const el = document.getElementById(domId);
      if (el) {
        if (k === propKey) {
          el.classList.remove('hidden');
          el.classList.add('flex');
        } else {
          el.classList.add('hidden');
          el.classList.remove('flex');
        }
      }
    });
  }

  function selectRoomEnvironment(room: string) {
    currentRoom = ROOM_DEFAULTS[room] ? room : 'living';
    roomBtns.forEach((b) => {
      const rKey = b.getAttribute('data-room');
      if (rKey === 'pavilion' && currentRoom !== 'pavilion') {
        b.className = 'room-btn hidden';
        return;
      }
      const active = rKey === currentRoom;
      b.className = active
        ? 'room-btn px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-400 text-slate-950 cursor-pointer'
        : 'room-btn px-2.5 py-0.5 rounded-full text-[11px] text-slate-200 hover:text-white cursor-pointer';
    });

    ['living', 'hearth', 'office', 'gallery', 'pavilion'].forEach((r) => {
      const el = document.getElementById(`silhouette-${r}`);
      if (el) {
        if (r === currentRoom) {
          el.classList.remove('hidden');
          el.classList.add('flex');
        } else {
          el.classList.add('hidden');
          el.classList.remove('flex');
        }
      }
    });

    const cfg = ROOM_DEFAULTS[currentRoom];
    applyWood(cfg.wood);
    applyProp(cfg.prop);
    const texBtn = document.querySelector<HTMLButtonElement>(
      `.texture-btn[data-texture="${cfg.texture}"]`
    );
    if (texBtn) texBtn.click();
    applyPaintByCodeOrName(cfg.paint);
  }

  function mountArtwork(
    art: IStoreArtwork,
    animateGnomes = true,
    explicitPaintCode?: string
  ) {
    currentArtworkId = art.id;
    if (activeImg) {
      activeImg.style.opacity = '0.35';
      activeImg.src = withBase(art.src);
      activeImg.alt = art.title;
      activeImg.onload = () => {
        activeImg.style.opacity = '1';
      };
    }
    if (titleEl) titleEl.textContent = art.title;
    if (telemetryEl) telemetryEl.textContent = art.telemetry;

    quickSwapBtns.forEach((b) => {
      const active = b.getAttribute('data-id') === art.id;
      b.className = active
        ? 'quick-swap-btn shrink-0 w-20 rounded-lg overflow-hidden border transition-all cursor-pointer border-amber-400 ring-1 ring-amber-400'
        : 'quick-swap-btn shrink-0 w-20 rounded-lg overflow-hidden border transition-all cursor-pointer border-slate-800 opacity-75 hover:opacity-100';
    });

    catalogCards.forEach((card) => {
      const active = card.getAttribute('data-id') === art.id;
      card.classList.toggle('border-amber-400', active);
      card.classList.toggle('ring-2', active);
      card.classList.toggle('ring-amber-400/50', active);
    });

    if (explicitPaintCode) {
      applyPaintByCodeOrName(explicitPaintCode);
    } else if (art.paintPalette?.[0]?.paintCode) {
      applyPaintByCodeOrName(art.paintPalette[0].paintCode);
    }

    const gnomeLeft = document.getElementById('gnome-left');
    const gnomeRight = document.getElementById('gnome-right');
    const sparkles = document.getElementById('fairy-sparkles');
    if (gnomesEnabled && animateGnomes && gnomeLeft && gnomeRight) {
      if (gnomeTimer) clearTimeout(gnomeTimer);
      gnomeLeft.style.opacity = '1';
      gnomeRight.style.opacity = '1';
      if (sparkles) sparkles.style.opacity = '0.85';
      if (artworkFrameWrapper) {
        artworkFrameWrapper.style.transform = 'scale(0.98) rotate(-0.5deg)';
        setTimeout(() => {
          artworkFrameWrapper.style.transform = 'scale(1) rotate(0deg)';
        }, 250);
      }
      gnomeTimer = setTimeout(() => {
        gnomeLeft.style.opacity = '0';
        gnomeRight.style.opacity = '0';
        if (sparkles) sparkles.style.opacity = '0';
      }, 1100);
    }

    updatePriceAndLedger();
  }

  // Wire UI Buttons
  roomBtns.forEach((btn) =>
    btn.addEventListener('click', () =>
      selectRoomEnvironment(btn.getAttribute('data-room') || 'living')
    )
  );
  woodBtns.forEach((btn) =>
    btn.addEventListener('click', () => applyWood(btn.getAttribute('data-wood') || 'walnut'))
  );
  propBtns.forEach((btn) =>
    btn.addEventListener('click', () => applyProp(btn.getAttribute('data-prop') || 'skateboard'))
  );

  textureBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-texture') || 'eggshell';
      currentTexture = TEXTURE_STYLES[key] ? key : 'eggshell';
      const st = TEXTURE_STYLES[currentTexture];
      textureBtns.forEach((b) => {
        if (b.parentElement?.classList.contains('hidden') || b.classList.contains('hidden')) return;
        const active = b === btn;
        b.className = active
          ? 'texture-btn px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500 text-black cursor-pointer shrink-0'
          : 'texture-btn px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900 text-slate-300 cursor-pointer shrink-0';
      });
      if (textureOverlay) {
        textureOverlay.style.backgroundImage = st.bg;
        textureOverlay.style.backgroundSize = st.size;
        textureOverlay.style.opacity = st.opacity;
      }
      const paint = getActivePaintInfo();
      if (paintLabel) {
        paintLabel.textContent = `Wall Paint: ${paint.brand} ${paint.code} ${paint.name} • ${st.name}`;
      }
    });
  });

  paintBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      paintBtns.forEach((b) => b.classList.remove('ring-2', 'ring-amber-400', 'scale-105'));
      btn.classList.add('ring-2', 'ring-amber-400', 'scale-105');
      const hex = btn.getAttribute('data-hex') || '#E8E7E0';
      const brand = btn.getAttribute('data-brand') || 'Rodda';
      const code = btn.getAttribute('data-code') || 'CA002';
      const name = btn.getAttribute('data-name') || 'Alabaster Fog';
      const texName = TEXTURE_STYLES[currentTexture]?.name || 'Smooth Eggshell';
      if (wall) wall.style.backgroundColor = hex;
      if (paintLabel) {
        paintLabel.textContent = `Wall Paint: ${brand} ${code} ${name} • ${texName}`;
      }
      updatePriceAndLedger();
    });
  });

  sizeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      sizeBtns.forEach((b) => {
        b.className =
          'size-btn py-2.5 px-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-400 text-center cursor-pointer transition-all text-white';
      });
      btn.className =
        'size-btn py-2.5 px-2 rounded-xl bg-amber-500 text-black border border-amber-400 font-bold text-center cursor-pointer';
      basePrice = parseInt(btn.getAttribute('data-base-price') || '650', 10);
      const sz = btn.getAttribute('data-size');
      if (frame) {
        frame.style.maxWidth = sz === '16x24' ? '62%' : sz === '40x60' ? '95%' : '82%';
      }
      updatePriceAndLedger();
    });
  });

  substrateBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      substrateBtns.forEach((b) => {
        b.className =
          'substrate-btn py-2 px-2 rounded-xl text-center border transition-all cursor-pointer bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700';
      });
      btn.className =
        'substrate-btn py-2 px-2 rounded-xl text-center border transition-all cursor-pointer bg-amber-500/15 border-amber-400 text-white font-bold';
      multiplier = parseFloat(btn.getAttribute('data-multiplier') || '1.0');
      const descEl = document.getElementById('active-substrate-desc');
      if (descEl) descEl.textContent = btn.getAttribute('data-desc') || '';
      updatePriceAndLedger();
    });
  });

  framingBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      framingBtns.forEach((b) => {
        b.className =
          'framing-btn py-2 px-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between gap-1 bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700';
      });
      btn.className =
        'framing-btn py-2 px-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between gap-1 bg-amber-500/15 border-amber-400 text-white font-bold';
      framingAddon = parseInt(btn.getAttribute('data-addon') || '0', 10);
      activeFramingId = btn.getAttribute('data-id') || 'float';
      activeFramingName = btn.getAttribute('data-name') || 'Borderless Gallery Float Mount';
      const descEl = document.getElementById('active-framing-desc');
      if (descEl) descEl.textContent = btn.getAttribute('data-desc') || '';

      if (frame) {
        frame.style.borderColor = btn.getAttribute('data-border-color') || '#1c1917';
        frame.style.borderWidth = btn.getAttribute('data-border-width') || '2px';
        frame.style.backgroundColor = btn.getAttribute('data-mat-bg') || '#0c0a09';
        frame.style.padding = btn.getAttribute('data-mat-pad') || '2px';
        frame.style.boxShadow =
          activeFramingId === 'pdx-wlf-luminescent'
            ? '0 0 48px rgba(245,158,11,0.55), 0 0 18px rgba(56,189,248,0.45), 0 30px 70px rgba(0,0,0,0.85)'
            : '';
      }
      if (wallLighting) {
        wallLighting.style.background =
          activeFramingId === 'pdx-wlf-luminescent'
            ? 'radial-gradient(ellipse at 50% 35%, rgba(245,158,11,0.32) 0%, rgba(56,189,248,0.12) 45%, rgba(0,0,0,0.55) 100%)'
            : 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.06) 45%, rgba(0,0,0,0.25) 100%)';
      }
      updatePriceAndLedger();
    });
  });

  fulfillmentBtns.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      fulfillmentBtns.forEach((b, bIdx) => {
        const span = bIdx === fulfillmentBtns.length - 1 ? ' col-span-2' : '';
        b.className =
          'fulfillment-btn py-2 px-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between gap-1 bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700' +
          span;
      });
      const activeSpan = idx === fulfillmentBtns.length - 1 ? ' col-span-2' : '';
      btn.className =
        'fulfillment-btn py-2 px-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between gap-1 bg-cyan-500/15 border-cyan-400 text-white font-bold' +
        activeSpan;
      fulfillmentDelta = parseInt(btn.getAttribute('data-delta') || '0', 10);
      activeFulfillmentId = btn.getAttribute('data-id') || 'pdx-dropship';
      activeFulfillmentName = (btn.getAttribute('data-name') || '')
        .replace(/^[^\w]+/, '')
        .trim();
      const descEl = document.getElementById('active-fulfillment-desc');
      if (descEl) descEl.textContent = btn.getAttribute('data-desc') || '';
      updatePriceAndLedger();
    });
  });

  quickSwapBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const found = catalog.find((p) => p.id === id);
      if (found) mountArtwork(found, true);
    });
  });

  catalogMountBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const found = catalog.find((p) => p.id === id);
      if (found) {
        mountArtwork(found, true);
        wall?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => {
        b.className =
          'store-filter-btn px-3 py-1 rounded-full bg-slate-900 text-slate-300 border border-slate-800 cursor-pointer shrink-0';
      });
      btn.className =
        'store-filter-btn px-3 py-1 rounded-full font-bold bg-amber-500 text-black cursor-pointer shrink-0';
      const filter = btn.getAttribute('data-filter') || 'all';
      catalogCards.forEach((card) => {
        const domain = card.getAttribute('data-domain');
        const isDiamond = card.getAttribute('data-diamond') === 'true';
        const show =
          filter === 'all' || (filter === 'diamonds' && isDiamond) || domain === filter;
        card.classList.toggle('hidden', !show);
      });
    });
  });

  const toggleGnomesBtn = document.getElementById('toggle-gnomes-btn');
  const gnomeStatusLabel = document.getElementById('gnome-status-label');
  toggleGnomesBtn?.addEventListener('click', () => {
    gnomesEnabled = !gnomesEnabled;
    if (gnomeStatusLabel) {
      gnomeStatusLabel.textContent = gnomesEnabled ? 'ON' : 'OFF';
      gnomeStatusLabel.className = gnomesEnabled
        ? 'text-emerald-400 font-bold'
        : 'text-slate-500 font-bold';
    }
  });

  // Partner Presets
  partnerPresetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-partner-preset') || 'collector';
      partnerPresetBtns.forEach((b) => {
        b.className =
          b === btn
            ? 'partner-preset-btn px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500 text-black border border-amber-400 cursor-pointer transition-all shadow-sm'
            : 'partner-preset-btn px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-900 text-slate-300 hover:text-white border border-slate-800 cursor-pointer transition-all';
      });
      if (preset === 'jls') {
        selectRoomEnvironment('hearth');
        applyPaintByCodeOrName('CA002');
        document.querySelector<HTMLButtonElement>('.framing-btn[data-id="beards-walnut"]')?.click();
        document
          .querySelector<HTMLButtonElement>('.fulfillment-btn[data-id="jls-closing-gift"]')
          ?.click();
      } else if (preset === 'pdxwlf') {
        selectRoomEnvironment('pavilion');
        applyPaintByCodeOrName('NW010');
        document
          .querySelector<HTMLButtonElement>('.framing-btn[data-id="pdx-wlf-luminescent"]')
          ?.click();
        document.querySelector<HTMLButtonElement>('.fulfillment-btn[data-id="pdx-courier"]')?.click();
      } else if (preset === 'beards') {
        selectRoomEnvironment('gallery');
        applyPaintByCodeOrName('CA092');
        document.querySelector<HTMLButtonElement>('.framing-btn[data-id="beards-black"]')?.click();
        document
          .querySelector<HTMLButtonElement>('.fulfillment-btn[data-id="beards-willcall"]')
          ?.click();
      } else if (preset === 'goodwill') {
        selectRoomEnvironment('living');
        applyPaintByCodeOrName('H0010');
        document
          .querySelector<HTMLButtonElement>('.framing-btn[data-id="goodwill-upcycle"]')
          ?.click();
        document
          .querySelector<HTMLButtonElement>('.fulfillment-btn[data-id="goodwill-expedition"]')
          ?.click();
      } else {
        selectRoomEnvironment('living');
        applyPaintByCodeOrName('CA002');
        document.querySelector<HTMLButtonElement>('.framing-btn[data-id="float"]')?.click();
        document
          .querySelector<HTMLButtonElement>('.fulfillment-btn[data-id="pdx-dropship"]')
          ?.click();
      }
    });
  });

  // Programmatic Bridge for AI Concierge & WebMCP Tools
  async function applyProgrammaticConfig(cfg: {
    artworkId?: string;
    room?: string;
    paintCode?: string;
    size?: string;
    substrate?: string;
    framing?: string;
    fulfillment?: string;
  }) {
    if (cfg.room) selectRoomEnvironment(cfg.room);
    if (cfg.artworkId) {
      const target = catalog.find((p) => p.id === cfg.artworkId);
      if (target) mountArtwork(target, true, cfg.paintCode);
    } else if (cfg.paintCode) {
      applyPaintByCodeOrName(cfg.paintCode);
    }
    if (cfg.size) {
      document.querySelector<HTMLButtonElement>(`.size-btn[data-size="${cfg.size}"]`)?.click();
    }
    if (cfg.substrate) {
      document
        .querySelector<HTMLButtonElement>(`.substrate-btn[data-id="${cfg.substrate}"]`)
        ?.click();
    }
    if (cfg.framing) {
      document.querySelector<HTMLButtonElement>(`.framing-btn[data-id="${cfg.framing}"]`)?.click();
    }
    if (cfg.fulfillment) {
      document
        .querySelector<HTMLButtonElement>(`.fulfillment-btn[data-id="${cfg.fulfillment}"]`)
        ?.click();
    }
    updatePriceAndLedger();
  }

  // Receipt Completion Handler -> Persist to sessionStorage & navigate to /success
  function handleOrderCaptured(receipt: IPayPalCaptureReceipt) {
    try {
      sessionStorage.setItem('pg_latest_paypal_receipt', JSON.stringify(receipt));
    } catch {}
    const params = new URLSearchParams({
      orderId: receipt.orderId,
      captureId: receipt.captureId,
      env: receipt.environment,
      title: receipt.spec.title,
      size: receipt.spec.size,
      substrate: receipt.spec.substrateName,
      framing: receipt.spec.framingName,
      fulfillment: receipt.spec.fulfillmentName,
      paint: receipt.spec.paintSpec,
      total: String(receipt.spec.totalUsd),
      sha256: receipt.provenanceSha256,
    });
    window.location.href = `${basePrefix}success/?${params.toString()}`;
  }

  // Mount PayPal JS SDK Smart Buttons
  const paypalStatusBadge = document.getElementById('paypal-sdk-status');
  async function refreshPayPalButtons() {
    const isSandbox = paypalEnvMode === 'sandbox';
    const clientId = isSandbox ? 'sb' : LIVE_PAYPAL_CLIENT_ID;
    if (paypalStatusBadge) {
      paypalStatusBadge.textContent = isSandbox
        ? 'PayPal Orders v2 • Sandbox SDK Ready'
        : 'PayPal Orders v2 • Live Merchant SDK';
    }
    const ok = await mountPayPalSmartButtons({
      containerSelector: '#paypal-smart-button-container',
      clientId,
      environmentLabel: isSandbox ? 'paypal-sandbox-sdk' : 'paypal-live-sdk',
      getOrderSpec: getCurrentOrderSpec,
      onOrderCreated: (orderId) => {
        if (paypalStatusBadge) {
          paypalStatusBadge.textContent = `Order Created: ${orderId}`;
        }
      },
      onCaptureSuccess: handleOrderCaptured,
      onError: (msg) => {
        console.warn('[PayPal SDK]', msg);
      },
    });
    if (!ok && paypalStatusBadge) {
      paypalStatusBadge.textContent = 'Offline / Use Instant Judge Sandbox Capture Below';
    }
  }

  const envToggleBtns = document.querySelectorAll<HTMLButtonElement>('.paypal-env-btn');
  envToggleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-env') === 'live' ? 'live' : 'sandbox';
      paypalEnvMode = mode;
      envToggleBtns.forEach((b) => {
        const active = b === btn;
        b.className = active
          ? 'paypal-env-btn px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-[#0070BA] text-white border border-sky-400 cursor-pointer'
          : 'paypal-env-btn px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-slate-900 text-slate-400 hover:text-white border border-slate-700 cursor-pointer';
      });
      refreshPayPalButtons();
    });
  });

  // 1-Click Judge Sandbox Order v2 Capture Simulator (zero PayPal login friction)
  const judgeSimBtn = document.getElementById('judge-simulate-capture-btn');
  judgeSimBtn?.addEventListener('click', async () => {
    judgeSimBtn.setAttribute('disabled', 'true');
    judgeSimBtn.innerHTML =
      '<i class="fas fa-circle-notch fa-spin"></i> <span>Capturing Orders v2 & Minting SHA-256 COA...</span>';
    const spec = getCurrentOrderSpec();
    const receipt = await simulateSandboxOrderCapture(spec);
    handleOrderCaptured(receipt);
  });

  // AI Interior Art Concierge UI Wiring
  const aiInput = document.getElementById('ai-concierge-input') as HTMLInputElement | null;
  const aiKeyInput = document.getElementById('ai-gemini-key-input') as HTMLInputElement | null;
  const aiSubmitBtn = document.getElementById('ai-concierge-submit-btn');
  const aiResultBox = document.getElementById('ai-concierge-result');
  const aiRationaleEl = document.getElementById('ai-concierge-rationale');
  const aiEngineBadge = document.getElementById('ai-concierge-engine-badge');
  const aiChips = document.querySelectorAll<HTMLButtonElement>('.ai-prompt-chip');

  async function executeConciergePrompt(promptText: string) {
    if (!promptText.trim()) return;
    if (aiSubmitBtn) {
      aiSubmitBtn.setAttribute('disabled', 'true');
      aiSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Curating...</span>';
    }
    const rec = await runAiInteriorConcierge(promptText, catalog, {
      geminiApiKey: aiKeyInput?.value || '',
    });
    await applyProgrammaticConfig({
      artworkId: rec.artworkId,
      room: rec.room,
      paintCode: rec.paintCode,
      size: rec.size,
      substrate: rec.substrate,
      framing: rec.framing,
      fulfillment: rec.fulfillment,
    });
    if (aiResultBox) aiResultBox.classList.remove('hidden');
    if (aiRationaleEl) aiRationaleEl.textContent = rec.rationale;
    if (aiEngineBadge) {
      aiEngineBadge.textContent = `Matched for your space • $${rec.estimatedTotalUsd} total`;
    }
    if (aiSubmitBtn) {
      aiSubmitBtn.removeAttribute('disabled');
      aiSubmitBtn.innerHTML =
        '<i class="fas fa-wand-magic-sparkles"></i> <span>Match My Room</span>';
    }
    wall?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  aiSubmitBtn?.addEventListener('click', () => {
    if (aiInput?.value) executeConciergePrompt(aiInput.value);
  });
  aiInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && aiInput.value) {
      e.preventDefault();
      executeConciergePrompt(aiInput.value);
    }
  });
  aiChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt') || '';
      if (aiInput) aiInput.value = prompt;
      executeConciergePrompt(prompt);
    });
  });

  // WebMCP Registration & Interactive Judge Agentic Inspector
  const webmcpLogPre = document.getElementById('webmcp-execution-log');
  const webmcpStatusBadge = document.getElementById('webmcp-native-badge');
  let registeredTools: IRegisteredAgentTool[] = [];

  registerStoreWebMcpTools({
    getCatalog: () => catalog,
    getCurrentSpec: getCurrentOrderSpec,
    applyConfiguration: applyProgrammaticConfig,
    focusPayPalCheckoutLedger: () => {
      const ledger = document.getElementById('paypal-checkout-ledger');
      ledger?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      ledger?.classList.add('ring-4', 'ring-sky-400');
      setTimeout(() => ledger?.classList.remove('ring-4', 'ring-sky-400'), 2200);
    },
    getGeminiApiKey: () => aiKeyInput?.value || '',
    onToolInvoked: (toolName, args, result) => {
      if (webmcpLogPre) {
        webmcpLogPre.textContent = JSON.stringify(
          {
            invokedAt: new Date().toISOString(),
            tool: toolName,
            arguments: args,
            output: result,
          },
          null,
          2
        );
      }
    },
  }).then(({ tools, nativeSupported }) => {
    registeredTools = tools;
    if (webmcpStatusBadge) {
      webmcpStatusBadge.textContent = nativeSupported
        ? 'document.modelContext: ACTIVE (Native Browser Agent Ready)'
        : 'WebMCP Polyfill Inspector Ready (4 Tools Registered)';
    }
  });

  document.querySelectorAll<HTMLButtonElement>('.webmcp-test-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const devDrawer = document.getElementById('judge-developer-drawer') as HTMLDetailsElement | null;
      if (devDrawer) devDrawer.open = true;
      const toolName = btn.getAttribute('data-tool') || '';
      const rawArgs = btn.getAttribute('data-args') || '{}';
      const tool = registeredTools.find((t) => t.name === toolName);
      if (!tool) return;
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(rawArgs);
      } catch {}
      await tool.execute(parsedArgs);
    });
  });

  // Share Spec Link
  const copySpecBtn = document.getElementById('copy-partner-spec-btn');
  const copySpecLabel = document.getElementById('copy-partner-spec-label');
  copySpecBtn?.addEventListener('click', () => {
    const spec = getCurrentOrderSpec();
    const url = new URL(window.location.href);
    url.searchParams.set('id', spec.artworkId);
    url.searchParams.set('room', spec.room);
    url.searchParams.set('paint', spec.paintCode);
    url.searchParams.set('size', spec.size);
    window.history.replaceState({}, '', url.toString());
    navigator.clipboard?.writeText(url.toString());
    if (copySpecLabel) {
      copySpecLabel.textContent = 'Copied Deep Link!';
      setTimeout(() => {
        copySpecLabel.textContent = 'Share Spec Link';
      }, 2000);
    }
  });

  studioSelect?.addEventListener('change', updatePriceAndLedger);

  // Hydrate URL params if present
  try {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const room = params.get('room');
    const paint = params.get('paint');
    const size = params.get('size');
    if (id || room || paint || size) {
      applyProgrammaticConfig({
        artworkId: id || undefined,
        room: room || undefined,
        paintCode: paint || undefined,
        size: size || undefined,
      });
    }
  } catch {}

  updatePriceAndLedger();
  refreshPayPalButtons();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStoreApp);
  } else {
    initStoreApp();
  }
}
