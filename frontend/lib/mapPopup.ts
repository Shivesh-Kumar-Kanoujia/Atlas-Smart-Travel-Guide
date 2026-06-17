export function buildPlacePopupHtml(place: any, color: string): string {
  const stars = place.rating
    ? `<div class="map-popup-row" style="margin-top:4px">
        ${renderStars(place.rating)}
        <span class="map-popup-label" style="margin-left:3px">${place.rating.toFixed(1)}</span>
       </div>`
    : '';
  const cuisine = place.cuisine
    ? `<span class="map-popup-badge">${place.cuisine}</span>`
    : '';
  const address = place.address
    ? `<div class="map-popup-detail">
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" style="color:#888"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        ${place.address}
       </div>`
    : '';
  const hours = place.opening_hours
    ? `<div class="map-popup-detail" style="margin-top:2px">
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" style="color:#888"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        ${place.opening_hours}
       </div>`
    : '';
  const phone = place.phone
    ? `<button onclick="window.open('tel:${place.phone}')" class="map-popup-btn-secondary">Call</button>`
    : '';
  const maps = place.lat && place.lon
    ? `<button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}')" class="map-popup-btn-primary" style="background:${color}">Directions</button>`
    : '';
  const website = place.website
    ? `<button onclick="window.open('${place.website}')" class="map-popup-btn-icon" title="Website">&#127760;</button>`
    : '';

  return `<div class="map-popup-container">
    <div class="map-popup-color-bar" style="background:${color}"></div>
    <div class="map-popup-title">${place.name}</div>
    <div class="map-popup-row" style="flex-wrap:wrap;gap:4px">${cuisine}</div>
    ${stars}
    ${address}
    ${hours}
    ${(phone || maps || website) ? `<div class="map-popup-row" style="gap:4px;margin-top:8px">${phone}${maps}${website}</div>` : ''}
  </div>`;
}

export function buildTripPopupHtml(trip: any, color: string): string {
  const budgetStr = trip.budget ? `$${Number(trip.budget).toLocaleString()}` : '&mdash;';
  const spentStr = trip.spent ? `$${Number(trip.spent).toLocaleString()}` : '$0';
  const dates = [trip.start_date, trip.end_date].filter(Boolean).join(' &rarr; ') || 'No dates set';

  return `<div class="map-popup-container">
    <div class="map-popup-color-bar" style="background:${color}"></div>
    <div style="font-weight:700;font-size:15px;margin-bottom:2px;color:var(--text-primary,#1a1a1a)">${trip.destination || trip.name}</div>
    <div class="map-popup-label" style="margin-bottom:8px">${dates}</div>
    <div class="map-popup-row" style="gap:8px;margin-bottom:6px">
      <div class="map-popup-card">
        <div class="map-popup-card-label">Budget</div>
        <div class="map-popup-card-value" style="color:#2d6a4f">${budgetStr}</div>
      </div>
      <div class="map-popup-card">
        <div class="map-popup-card-label">Spent</div>
        <div class="map-popup-card-value" style="color:#d85a30">${spentStr}</div>
      </div>
    </div>
    <div class="map-popup-row" style="font-size:10px;font-weight:500;color:${color}">
      <span style="width:6px;height:6px;border-radius:50%;background:${color};display:inline-block"></span>
      ${trip.status ? trip.status.charAt(0).toUpperCase() + trip.status.slice(1) : 'Planned'}
    </div>
  </div>`;
}

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  const star = (fill: number) =>
    `<span class="${fill >= 1 ? 'map-popup-star-filled' : 'map-popup-star-empty'}">${fill >= 1 ? '★' : fill >= 0.5 ? '⯨' : '☆'}</span>`;
  return Array.from({ length: full }, () => star(1)).join('')
    + (half ? star(0.5) : '')
    + Array.from({ length: empty }, () => star(0)).join('');
}
