export function buildPlacePopupHtml(place: any, color: string): string {
  const stars = place.rating
    ? `<div style="display:flex;align-items:center;gap:2px;margin-top:4px">
        ${renderStars(place.rating)}
        <span style="font-size:11px;color:#888;margin-left:3px">${place.rating.toFixed(1)}</span>
       </div>`
    : '';
  const cuisine = place.cuisine
    ? `<span style="font-size:10px;color:#888;background:#f0f0f0;padding:1px 6px;border-radius:4px">${place.cuisine}</span>`
    : '';
  const address = place.address
    ? `<div style="font-size:10px;color:#666;margin-top:3px;display:flex;align-items:center;gap:3px">
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#888" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        ${place.address}
       </div>`
    : '';
  const hours = place.opening_hours
    ? `<div style="font-size:10px;color:#888;margin-top:2px;display:flex;align-items:center;gap:3px">
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#888" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        ${place.opening_hours}
       </div>`
    : '';
  const phone = place.phone
    ? `<button onclick="(function(){window.open('tel:${place.phone}')})()" style="flex:1;padding:5px;border:1px solid #e0e0e0;border-radius:6px;background:white;font-size:10px;color:#333;cursor:pointer;font-family:inherit">Call</button>`
    : '';
  const maps = place.lat && place.lon
    ? `<button onclick="(function(){window.open('https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}')})()" style="flex:1;padding:5px;border:none;border-radius:6px;background:${color};font-size:10px;color:white;cursor:pointer;font-family:inherit;font-weight:500">Directions</button>`
    : '';
  const website = place.website
    ? `<button onclick="(function(){window.open('${place.website}')})()" style="width:28px;height:26px;border:1px solid #e0e0e0;border-radius:6px;background:white;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0" title="Website">&#127760;</button>`
    : '';

  return `<div style="font-family:'DM Sans','Inter',sans-serif;min-width:200px;max-width:240px">
    <div style="height:4px;background:${color};border-radius:3px 3px 0 0;margin:-12px -12px 8px -12px"></div>
    <div style="font-weight:700;font-size:14px;color:#1a1a1a;margin-bottom:1px">${place.name}</div>
    <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">${cuisine}</div>
    ${stars}
    ${address}
    ${hours}
    ${(phone || maps || website) ? `<div style="display:flex;gap:4px;margin-top:8px">${phone}${maps}${website}</div>` : ''}
  </div>`;
}

export function buildTripPopupHtml(trip: any, color: string): string {
  const budgetStr = trip.budget ? `$${Number(trip.budget).toLocaleString()}` : '&mdash;';
  const spentStr = trip.spent ? `$${Number(trip.spent).toLocaleString()}` : '$0';
  const dates = [trip.start_date, trip.end_date].filter(Boolean).join(' &rarr; ') || 'No dates set';

  return `<div style="font-family:'DM Sans','Inter',sans-serif;min-width:200px;max-width:240px">
    <div style="height:4px;background:${color};border-radius:3px 3px 0 0;margin:-12px -12px 8px -12px"></div>
    <div style="font-weight:700;font-size:15px;margin-bottom:2px;color:#1a1a1a">${trip.destination || trip.name}</div>
    <div style="font-size:11px;color:#888;margin-bottom:8px">${dates}</div>
    <div style="display:flex;gap:8px;margin-bottom:6px">
      <div style="flex:1;background:#f5f0e8;padding:6px 8px;border-radius:8px;text-align:center">
        <div style="font-size:9px;color:#888">Budget</div>
        <div style="font-size:12px;font-weight:600;color:#2d6a4f">${budgetStr}</div>
      </div>
      <div style="flex:1;background:#f5f0e8;padding:6px 8px;border-radius:8px;text-align:center">
        <div style="font-size:9px;color:#888">Spent</div>
        <div style="font-size:12px;font-weight:600;color:#d85a30">${spentStr}</div>
      </div>
    </div>
    <div style="font-size:10px;color:${color};font-weight:500;display:flex;align-items:center;gap:3px">
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
    `<span style="color:${fill >= 1 ? '#e8a317' : fill >= 0.5 ? '#e8a317' : '#ddd'};font-size:13px">${fill >= 1 ? '★' : fill >= 0.5 ? '⯨' : '☆'}</span>`;
  return Array.from({ length: full }, () => star(1)).join('')
    + (half ? star(0.5) : '')
    + Array.from({ length: empty }, () => star(0)).join('');
}
