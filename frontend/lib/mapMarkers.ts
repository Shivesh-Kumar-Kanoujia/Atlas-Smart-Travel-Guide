export const PLACE_MARKERS: Record<string, { color: string; svg: string }> = {
  restaurant: {
    color: '#378ADD',
    svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 20V2l6 4-6 4"/><path d="M18 20V10"/><path d="M18 8V2"/><path d="M18 8a3 3 0 0 1 0 6"/>
    </svg>`,
  },
  attraction: {
    color: '#D85A30',
    svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
    </svg>`,
  },
  hotel: {
    color: '#7F77DD',
    svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 21V7l9-4 9 4v14"/><path d="M9 21V11h6v10"/><path d="M9 7h.01"/><path d="M15 7h.01"/><path d="M9 15h6"/><path d="M9 19h6"/>
    </svg>`,
  },
  hospital: {
    color: '#D4537E',
    svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 3h18v18H3z"/><path d="M12 8v8"/><path d="M8 12h8"/>
    </svg>`,
  },
  atm: {
    color: '#BA7517',
    svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h.01M18 12h.01"/><path d="M10 12h4"/><path d="M6 16h12"/>
    </svg>`,
  },
  pharmacy: {
    color: '#2D6A4F',
    svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 6h12v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6z"/><path d="M8 6V4c0-1.1.9-2 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 13h4"/><path d="M12 11v4"/>
    </svg>`,
  },
  airport: {
    color: '#1E4D8C',
    svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
    </svg>`,
  },
  transport: {
    color: '#BA7517',
    svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="4" y="3" width="16" height="13" rx="2"/><path d="M4 16v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3"/><path d="M16 16v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3"/><circle cx="8.5" cy="10.5" r="1.5"/><circle cx="15.5" cy="10.5" r="1.5"/><path d="M4 10h16"/>
    </svg>`,
  },
  shopping: {
    color: '#7F77DD',
    svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>`,
  },
  other: {
    color: '#888',
    svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>`,
  },
};

export function buildMarkerHtml(cfg: { color: string; svg: string }): string {
  return `<div class="map-marker-icon" style="background:${cfg.color}">${cfg.svg}</div>`;
}
