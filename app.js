const STORAGE = {
  notes: "tmb-private-notes-v2",
  progress: "tmb-waypoint-progress-v2",
  checklist: "tmb-checklist-v2",
  contacts: "tmb-contacts-v2",
  expenses: "tmb-expenses-v2",
  currencyRates: "tmb-currency-rates-v1",
  selectedDay: "tmb-selected-hike-day-v1"
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const HIKING_DAYS = TRIP_DAYS.filter((day) => day.hikeDay);

let activeBookingFilter = "all";
let privateNotes = loadJson(STORAGE.notes, {});
let waypointProgress = loadJson(STORAGE.progress, {});
let checklist = loadJson(STORAGE.checklist, {});
let contacts = loadJson(STORAGE.contacts, DEFAULT_CONTACTS);
let expenses = loadJson(STORAGE.expenses, []);
let currencyRates = loadJson(STORAGE.currencyRates, null);
let deferredInstallPrompt = null;
let map = null;
let mapFeatures = null;
const actualHikeToday = HIKING_DAYS.find((day) => day.date === todayKey());
let selectedHikeDay = actualHikeToday?.hikeDay || Number(loadJson(STORAGE.selectedDay, focusDay().hikeDay));
if (!HIKING_DAYS.some((day) => day.hikeDay === selectedHikeDay)) selectedHikeDay = focusDay().hikeDay;

function loadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    showToast("Could not save on this device");
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayDifference(start, end) {
  return Math.ceil((new Date(`${end}T12:00:00`) - new Date(`${start}T12:00:00`)) / 86400000);
}

function statusLabel(status) {
  const labels = {
    booked: "Confirmed",
    local: "Buy locally",
    confirm: "Confirm",
    todo: "To book"
  };
  return labels[status] || status;
}

function statusClass(status) {
  return status === "booked" ? "confirmed" : status === "todo" || status === "confirm" ? "attention" : "local";
}

function tripStatusText() {
  const today = todayKey();
  const first = HIKING_DAYS[0].date;
  const last = HIKING_DAYS.at(-1).date;
  if (today < first) {
    const days = dayDifference(today, first);
    return `${days} day${days === 1 ? "" : "s"} to Hike 1`;
  }
  if (today > last) return "Six-day hike complete";
  const day = HIKING_DAYS.find((item) => item.date === today);
  return day ? `Today · Hike ${day.hikeDay} · ${day.title}` : "TMB in progress";
}

function focusDay() {
  const today = todayKey();
  return HIKING_DAYS.find((day) => day.date === today)
    || HIKING_DAYS.find((day) => day.date > today)
    || HIKING_DAYS.at(-1);
}

function statTiles(hike, compact = false) {
  return `
    <div class="stat-grid ${compact ? "compact-stats" : ""}">
      <div class="stat"><span>Plan distance</span><strong>${hike.distanceMi} mi</strong><small>${hike.distanceKm} km</small></div>
      <div class="stat ascent"><span>Ascent</span><strong>↑ ${hike.ascentFt.toLocaleString()} ft</strong><small>${hike.ascentM.toLocaleString()} m</small></div>
      <div class="stat descent"><span>Descent</span><strong>↓ ${hike.descentFt.toLocaleString()} ft</strong><small>${hike.descentM.toLocaleString()} m</small></div>
      <div class="stat"><span>Moving time</span><strong>${hike.duration}</strong><small>${hike.difficulty}</small></div>
    </div>
  `;
}

function mappedTrackCheck(hike) {
  return "";
}

function transferRows(transfers = []) {
  if (!transfers.length) return "";
  return `
    <div class="transfer-list">
      ${transfers.map((leg) => `
        <div class="transfer-row">
          <div class="transfer-top">
            <strong>${escapeHtml(leg.mode)} · ${escapeHtml(leg.route)}</strong>
            <span class="status ${statusClass(leg.status)}">${statusLabel(leg.status)}</span>
          </div>
          <p>${escapeHtml(leg.time)} · ${escapeHtml(leg.duration)}</p>
          ${leg.detail ? `<small>${escapeHtml(leg.detail)}</small>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function lodgingBlock(lodging) {
  if (!lodging) return "";
  return `
    <div class="lodging-block">
      <span class="card-label">Sleep</span>
      <strong>${escapeHtml(lodging.name)}</strong>
      <p>${escapeHtml(lodging.place)} · ${escapeHtml(lodging.price)}</p>
      <span class="status confirmed">Confirmed</span>
    </div>
  `;
}

function trailStops(day) {
  const stops = day.hike?.stops || [];
  const startIndex = Math.max(0, stops.findIndex((stop) => /trail start/i.test(stop.detail)));
  const finishIndex = stops.findIndex((stop, index) => index >= startIndex && /finish/i.test(stop.detail));
  return stops.slice(startIndex, finishIndex >= startIndex ? finishIndex + 1 : stops.length);
}

function stopsChecklist(day, context = "today") {
  if (!day.hike?.stops) return "";
  const key = `hike-${day.hikeDay}`;
  const completed = waypointProgress[key] || [];
  const stops = trailStops(day);
  return `
    <div class="route-checklist" data-progress-key="${key}">
      ${stops.map((stop, displayIndex) => {
        const sourceIndex = day.hike.stops.indexOf(stop);
        const checked = completed.includes(sourceIndex);
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${stop.coords.join(",")}`;
        return `
          <div class="stop-row ${checked ? "reached" : ""}">
            <label>
              <input type="checkbox" data-stop-index="${sourceIndex}" ${checked ? "checked" : ""}>
              <span class="stop-number">${String(displayIndex + 1).padStart(2, "0")}</span>
              <span><strong>${escapeHtml(stop.name)}</strong><small>${escapeHtml(stop.detail)}</small></span>
            </label>
            <a href="${mapUrl}" target="_blank" rel="noopener" aria-label="Open ${escapeHtml(stop.name)} in maps">↗</a>
          </div>
        `;
      }).join("")}
      ${context === "today" ? `<p class="local-only-note">Checks are saved only on this device.</p>` : ""}
    </div>
  `;
}

function selectedDay() {
  return HIKING_DAYS.find((day) => day.hikeDay === selectedHikeDay) || HIKING_DAYS[0];
}

function wakingLodging(day) {
  const dayIndex = HIKING_DAYS.indexOf(day);
  if (dayIndex > 0) return HIKING_DAYS[dayIndex - 1].lodging;
  return TRIP_DAYS.find((item) => item.tripDay === 2)?.lodging;
}

function stopMapLink(stop, label = "Open in Maps") {
  const url = `https://www.google.com/maps/search/?api=1&query=${stop.coords.join(",")}`;
  return `<a class="location-link" href="${url}" target="_blank" rel="noopener">${escapeHtml(label)} ↗</a>`;
}

function journeyStep(number, label, title, content, modifier = "") {
  return `
    <article class="journey-step ${modifier}">
      <div class="journey-marker"><span>${String(number).padStart(2, "0")}</span><i></i></div>
      <div class="journey-card">
        <span class="card-label">${escapeHtml(label)}</span>
        <h3>${escapeHtml(title)}</h3>
        ${content}
      </div>
    </article>
  `;
}

function renderDayPlan() {
  const day = selectedDay();
  const hike = day.hike;
  const stops = trailStops(day);
  const startStop = stops[0];
  const finishStop = stops.at(-1);
  const finishIndex = day.hike.stops.indexOf(finishStop);
  const connectionStops = day.hike.stops.slice(finishIndex + 1);
  const beforeTransfers = (day.transfers || []).filter((leg) => leg.phase === "before");
  const afterTransfers = (day.transfers || []).filter((leg) => leg.phase === "after");
  const wake = wakingLodging(day);

  $("#selectedDayLabel").textContent = `Hike ${day.hikeDay} of ${HIKING_DAYS.length} · ${day.weekday}, ${day.dateLabel}`;
  $("#selectedDayTitle").textContent = day.title;
  $("#previousDayBtn").disabled = day.hikeDay === 1;
  $("#nextDayBtn").disabled = day.hikeDay === HIKING_DAYS.length;
  $("#dayButtons").innerHTML = HIKING_DAYS.map((item) => `
    <button type="button" class="${item.hikeDay === day.hikeDay ? "active" : ""}" data-select-day="${item.hikeDay}" aria-label="Show Hike ${item.hikeDay}: ${escapeHtml(item.title)}">
      <span>${item.hikeDay}</span><small>${item.dateLabel}</small>
    </button>
  `).join("");

  $("#dayOverview").innerHTML = `
    <article class="today-card day-overview-card">
      <div class="today-image">
        <img src="${day.image}" data-fallback="${day.fallbackImage}" alt="${escapeHtml(day.title)}">
        <span>Hike ${day.hikeDay} · ${escapeHtml(day.location)}</span>
      </div>
      <div class="today-content">
        <div class="brief-title-row">
          <div>
            <p class="kicker">${day.weekday} · ${day.dateLabel}</p>
            <h2>${escapeHtml(day.title)}</h2>
          </div>
          <span class="difficulty">${hike.difficulty}</span>
        </div>
        <p class="lead">${escapeHtml(day.summary)}</p>
        <div class="time-ribbon">
          <div><span>Start hiking</span><strong>${hike.start}</strong></div>
          <div><span>Finish hiking</span><strong>${hike.arrival}</strong></div>
        </div>
        ${statTiles(hike)}
        ${mappedTrackCheck(hike)}
        <button class="ghost-btn full-btn" type="button" data-copy-brief="${day.tripDay}">Copy this day</button>
      </div>
    </article>
  `;

  const beforeContent = beforeTransfers.length
    ? transferRows(beforeTransfers)
    : `<p class="journey-note">You wake in the trail-start area. No vehicle transfer is planned before hiking.</p>`;
  const connectionContent = connectionStops.length
    ? `<div class="connection-points">${connectionStops.map((stop) => `
        <div><span>Then</span><strong>${escapeHtml(stop.name)}</strong><small>${escapeHtml(stop.detail)}</small></div>
      `).join("")}</div>`
    : "";
  const afterContent = afterTransfers.length
    ? `${connectionContent}${transferRows(afterTransfers)}`
    : `<p class="journey-note">No vehicle transfer is planned. The trail ends at tonight’s lodging.</p>`;

  $("#dayJourney").innerHTML = `
    <div class="section-heading compact journey-heading">
      <p class="kicker">Morning to night</p>
      <h2>Follow the day in order</h2>
    </div>
    ${journeyStep(1, "Wake up", wake?.name || "Morning lodging", `
      <p>${escapeHtml(wake?.place || day.location)}</p>
      <small>Start the day here.</small>
    `, "wake-step")}
    ${journeyStep(2, "Reach the trailhead", beforeTransfers.length ? "Morning transfer" : startStop.name, `
      ${beforeContent}
      <div class="location-block">
        <span>Trail starts</span>
        <strong>${escapeHtml(startStop.name)}</strong>
        <small>${escapeHtml(startStop.detail)} · ${hike.start}</small>
        ${stopMapLink(startStop, "Open trailhead")}
      </div>
    `)}
    ${journeyStep(3, `${stops.length} trail stops`, "Hike this route", `
      <p class="route-sentence">${stops.map((stop) => escapeHtml(stop.name)).join(" → ")}</p>
      <div class="subheading"><span>Check off as you go</span><strong>Saved on this device</strong></div>
      ${stopsChecklist(day, "day")}
    `, "trail-step")}
    ${journeyStep(4, "Trail finish", finishStop.name, `
      <div class="location-block finish-location">
        <span>Expected arrival</span>
        <strong>${hike.arrival}</strong>
        <small>${escapeHtml(finishStop.detail)}</small>
        ${stopMapLink(finishStop, "Open trail finish")}
      </div>
    `, "finish-step")}
    ${journeyStep(5, "After the trail", afterTransfers.length ? "Transfer to tonight’s stop" : "Walk into tonight", afterContent)}
    ${journeyStep(6, "Sleep tonight", day.lodging.name, `
      <p>${escapeHtml(day.lodging.place)} · ${escapeHtml(day.lodging.price)}</p>
      <span class="status confirmed">Confirmed</span>
      <label class="private-note">
        <span>Private day note <small>this device only</small></span>
        <textarea data-private-note="${day.tripDay}" rows="3" placeholder="Room detail, weather decision, pickup note…">${escapeHtml(privateNotes[day.tripDay] || "")}</textarea>
      </label>
    `, "sleep-step")}
  `;

  $$("[data-select-day]").forEach((button) => {
    button.addEventListener("click", () => setSelectedHikeDay(Number(button.dataset.selectDay)));
  });
  setupRenderedInteractions($("#dayOverview"));
  setupRenderedInteractions($("#dayJourney"));
}

function setSelectedHikeDay(hikeDay) {
  if (!HIKING_DAYS.some((day) => day.hikeDay === hikeDay)) return;
  selectedHikeDay = hikeDay;
  saveJson(STORAGE.selectedDay, selectedHikeDay);
  renderDayPlan();
  updateMap();
  $("#dayPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function setupDayNavigation() {
  $("#previousDayBtn").addEventListener("click", () => setSelectedHikeDay(selectedHikeDay - 1));
  $("#nextDayBtn").addEventListener("click", () => setSelectedHikeDay(selectedHikeDay + 1));
}

function fieldBrief(day, eyebrow) {
  if (!day.hike) {
    return `
      <article class="today-card travel-brief">
        <div class="today-image">
          <img src="${day.image}" data-fallback="${day.fallbackImage}" alt="${escapeHtml(day.title)}">
          <span>${escapeHtml(eyebrow)}</span>
        </div>
        <div class="today-content">
          <p class="kicker">${day.weekday} · ${day.dateLabel}</p>
          <h2>${escapeHtml(day.title)}</h2>
          <p class="lead">${escapeHtml(day.summary)}</p>
          ${transferRows(day.transfers)}
          ${lodgingBlock(day.lodging)}
          ${day.notes?.length ? `<ul class="plain-notes">${day.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>` : ""}
        </div>
      </article>
    `;
  }

  const hike = day.hike;
  return `
    <article class="today-card hike-brief" data-hike-day="${day.hikeDay}">
      <div class="today-image">
        <img src="${day.image}" data-fallback="${day.fallbackImage}" alt="${escapeHtml(day.title)}">
        <span>Hike ${day.hikeDay} of 6 · ${escapeHtml(eyebrow)}</span>
      </div>
      <div class="today-content">
        <div class="brief-title-row">
          <div>
            <p class="kicker">${day.weekday} · ${day.dateLabel}</p>
            <h2>${escapeHtml(day.title)}</h2>
          </div>
          <span class="difficulty">${hike.difficulty}</span>
        </div>
        <p class="lead">${escapeHtml(day.summary)}</p>
        ${statTiles(hike)}
        ${mappedTrackCheck(hike)}
        <div class="time-ribbon">
          <div><span>Trail start</span><strong>${hike.start}</strong></div>
          <div><span>Expected finish</span><strong>${hike.arrival}</strong></div>
        </div>
        <div class="today-actions">
          <button class="primary-btn" type="button" data-open-map="${day.mapDay}">Open stage map</button>
          <button class="ghost-btn" type="button" data-copy-brief="${day.tripDay}">Copy briefing</button>
        </div>
        <div class="subheading"><span>Route order</span><strong>${hike.stops.length} waypoints</strong></div>
        ${stopsChecklist(day)}
        ${transferRows(day.transfers)}
        ${lodgingBlock(day.lodging)}
        ${day.notes?.length ? `<ul class="plain-notes">${day.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>` : ""}
        <label class="private-note">
          <span>Private note for this day <small>saved on this device</small></span>
          <textarea data-private-note="${day.tripDay}" rows="3" placeholder="Confirmation code, room detail, weather decision…">${escapeHtml(privateNotes[day.tripDay] || "")}</textarea>
        </label>
      </div>
    </article>
  `;
}

function renderToday() {
  const day = focusDay();
  const today = todayKey();
  let label = "Today";
  if (today < HIKING_DAYS[0].date) {
    const days = dayDifference(today, day.date);
    label = `Next up · in ${days} day${days === 1 ? "" : "s"}`;
  }
  if (today > HIKING_DAYS.at(-1).date) label = "Hike archive";

  const content = `
    <div class="section-heading today-heading">
      <p class="kicker">Trail command</p>
      <h2>${today < HIKING_DAYS[0].date ? "Ready when you are." : "Today, at a glance."}</h2>
      <p>Big numbers, stop order, and transfers without digging.</p>
    </div>
    ${fieldBrief(day, label)}
  `;

  $("#todayBrief").innerHTML = content;
  setupRenderedInteractions($("#todayBrief"));
}

function itineraryCard(day) {
  const stats = day.hike ? statTiles(day.hike, true) : "";
  const dayLabel = day.hikeDay ? `Hike ${day.hikeDay}` : `Trip ${day.tripDay}`;
  return `
    <details class="day-card ${day.date === todayKey() ? "is-today" : ""}">
      <summary>
        <div class="card-image">
          <img src="${day.image}" data-fallback="${day.fallbackImage}" alt="" loading="lazy">
          <span>${dayLabel} · ${day.dateLabel}</span>
        </div>
        <div class="card-summary">
          <div class="summary-top"><span>${day.weekday} · ${escapeHtml(day.location)}</span><b>＋</b></div>
          <h3>${escapeHtml(day.title)}</h3>
          <p>${escapeHtml(day.summary)}</p>
          ${stats}
        </div>
      </summary>
      <div class="card-detail">
        ${day.hike ? `
          <div class="route-line"><span class="card-label">Full route</span><p>${escapeHtml(day.hike.route)}</p></div>
          ${mappedTrackCheck(day.hike)}
          <div class="time-ribbon">
            <div><span>Start</span><strong>${day.hike.start}</strong></div>
            <div><span>Finish</span><strong>${day.hike.arrival}</strong></div>
          </div>
          ${stopsChecklist(day, "itinerary")}
          <button class="ghost-btn full-btn" type="button" data-open-map="${day.mapDay}">Show this stage on map</button>
        ` : ""}
        ${transferRows(day.transfers)}
        ${lodgingBlock(day.lodging)}
        ${day.notes?.length ? `<ul class="plain-notes">${day.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>` : ""}
        <label class="private-note">
          <span>Private note <small>this device only</small></span>
          <textarea data-private-note="${day.tripDay}" rows="3" placeholder="Add a private reminder…">${escapeHtml(privateNotes[day.tripDay] || "")}</textarea>
        </label>
      </div>
    </details>
  `;
}

function renderItinerary() {
  $("#timeline").innerHTML = HIKING_DAYS.map(itineraryCard).join("");
  setupRenderedInteractions($("#timeline"));
}

function setupRenderedInteractions(root) {
  $$("img[data-fallback]", root).forEach((image) => {
    image.addEventListener("error", () => {
      if (image.src.endsWith(image.dataset.fallback)) return;
      image.src = image.dataset.fallback;
    }, { once: true });
  });

  $$("[data-progress-key]", root).forEach((list) => {
    $$("[data-stop-index]", list).forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const key = list.dataset.progressKey;
        const index = Number(checkbox.dataset.stopIndex);
        const current = new Set(waypointProgress[key] || []);
        checkbox.checked ? current.add(index) : current.delete(index);
        waypointProgress[key] = [...current].sort((a, b) => a - b);
        saveJson(STORAGE.progress, waypointProgress);
        checkbox.closest(".stop-row").classList.toggle("reached", checkbox.checked);
      });
    });
  });

  $$("[data-private-note]", root).forEach((textarea) => {
    textarea.addEventListener("input", () => {
      privateNotes[textarea.dataset.privateNote] = textarea.value;
      saveJson(STORAGE.notes, privateNotes);
    });
  });

  $$("[data-copy-brief]", root).forEach((button) => {
    button.addEventListener("click", () => copyBriefing(Number(button.dataset.copyBrief)));
  });
}

async function copyBriefing(tripDay) {
  const day = TRIP_DAYS.find((item) => item.tripDay === tripDay);
  if (!day?.hike) return;
  const hike = day.hike;
  const text = [
    `Hike ${day.hikeDay}: ${day.title} — ${day.weekday}, ${day.dateLabel}`,
    `${hike.distanceMi} mi / ${hike.distanceKm} km · ↑ ${hike.ascentFt.toLocaleString()} ft · ↓ ${hike.descentFt.toLocaleString()} ft · ${hike.duration}`,
    `Start ${hike.start} · finish ${hike.arrival}`,
    `Route: ${trailStops(day).map((stop) => stop.name).join(" → ")}`
  ].join("\n");
  try {
    await navigator.clipboard.writeText(text);
    showToast("Briefing copied");
  } catch {
    showToast("Copy unavailable");
  }
}

function initializeMap() {
  if (!window.L || !window.TMB_MAP_DATA) {
    $("#map").hidden = true;
    $("#mapFallback").hidden = false;
    return;
  }
  map = L.map("map", { zoomControl: true, scrollWheelZoom: false, attributionControl: false });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18
  }).addTo(map);
  updateMap();
}

function updateMap() {
  if (!map || !window.TMB_MAP_DATA) return;
  if (mapFeatures) mapFeatures.remove();
  const day = selectedDay();
  const plannedTransferLines = (day.transfers || [])
    .filter((leg) => leg.mapLine?.length > 1)
    .map((leg) => ({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: leg.mapLine.map(([latitude, longitude]) => [longitude, latitude])
      },
      properties: {
        name: `${leg.mode} ${leg.route}`,
        mapDay: day.mapDay,
        transport: true,
        source: "Planned transfer"
      }
    }));
  const filtered = {
    ...TMB_MAP_DATA,
    features: [
      ...TMB_MAP_DATA.features.filter((feature) => feature.properties.mapDay === selectedHikeDay),
      ...plannedTransferLines
    ]
  };
  const hikeColor = "#e63946";
  const transferColor = "#8338ec";
  mapFeatures = L.geoJSON(filtered, {
    style: (feature) => ({
      color: feature.properties.transport ? transferColor : hikeColor,
      weight: feature.properties.transport ? 4 : 5,
      opacity: feature.properties.transport ? 0.85 : 1,
      dashArray: feature.properties.transport ? "8 6" : null,
      lineCap: "round",
      lineJoin: "round"
    }),
    pointToLayer: (feature, latlng) => {
      if (feature.properties.lodging) {
        return L.marker(latlng, {
          title: feature.properties.name,
          alt: `Overnight: ${feature.properties.name}`,
          icon: L.divIcon({
            className: "lodging-marker",
            html: "<span><b>⌂</b></span>",
            iconSize: [36, 42],
            iconAnchor: [18, 39],
            popupAnchor: [0, -35]
          })
        });
      }
      return L.circleMarker(latlng, {
        radius: 5,
        color: "#071710",
        weight: 1.5,
        fillColor: "#ffd23f",
        fillOpacity: 1
      });
    },
    onEachFeature: (feature, layer) => {
      const name = feature.properties.name || "Route line";
      const day = feature.properties.lodging ? "Overnight" : feature.properties.mapDay ? `Hike ${feature.properties.mapDay}` : "Trail";
      const coords = feature.geometry.type === "Point"
        ? `<a href="https://www.google.com/maps/search/?api=1&query=${feature.geometry.coordinates[1]},${feature.geometry.coordinates[0]}" target="_blank" rel="noopener">Open in maps ↗</a>`
        : "";
      const trackStats = feature.properties.gpx
        ? `<small>${feature.properties.distanceKm} km mapped · ↑ ${feature.properties.ascentM} m · ↓ ${feature.properties.descentM} m</small>`
        : feature.properties.connector
          ? `<small>Approximate ${feature.properties.distanceKm} km station connection</small>`
          : "";
      layer.bindPopup(`<strong>${escapeHtml(name)}</strong><small>${day}</small>${trackStats}${coords}`);
    }
  }).addTo(map);
  const bounds = mapFeatures.getBounds();
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 13 });
  setTimeout(() => map.invalidateSize(), 80);
}

function allBookings() {
  const rows = [];
  const approachDay = TRIP_DAYS.find((day) => day.tripDay === 2);
  const flightDay = TRIP_DAYS.find((day) => day.tripDay === 1);
  const sharedDays = [approachDay, ...HIKING_DAYS].filter(Boolean);

  sharedDays.forEach((day) => {
    if (day.lodging) {
      rows.push({
        id: `lodging-${day.tripDay}`,
        type: "lodging",
        date: day.dateLabel,
        name: day.lodging.name,
        detail: `${day.lodging.place} · ${day.lodging.price}`,
        status: day.lodging.status
      });
    }
    day.transfers?.forEach((leg, index) => {
      rows.push({
        id: `transfer-${day.tripDay}-${index}`,
        type: "transport",
        date: day.dateLabel,
        name: `${leg.mode} · ${leg.route}`,
        detail: `${leg.time} · ${leg.duration}${leg.detail ? ` · ${leg.detail}` : ""}`,
        status: leg.status,
        audience: leg.audience
      });
    });
  });

  flightDay?.transfers?.forEach((leg, index) => {
    rows.push({
      id: `flight-${index}`,
      type: "flight",
      date: flightDay.dateLabel,
      name: `${leg.mode} · ${leg.route}`,
      detail: `${leg.time} · ${leg.duration}`,
      status: leg.status,
      audience: leg.audience || "John & Rachel"
    });
  });
  return rows;
}

function renderBookingFilters() {
  const options = [["all", "All"], ["lodging", "Lodging"], ["transport", "Transport"], ["flight", "John & Rachel flights"], ["todo", "Needs action"]];
  $("#bookingFilters").innerHTML = options.map(([value, label]) => `
    <button class="filter-btn ${activeBookingFilter === value ? "active" : ""}" type="button" data-booking-filter="${value}">${label}</button>
  `).join("");
}

function renderBookings() {
  const everyBooking = allBookings();
  const attentionCount = everyBooking.filter((item) => ["todo", "confirm"].includes(item.status)).length;
  $("#bookingSummary").textContent = `${everyBooking.length} bookings & rides · ${attentionCount || "none"} need${attentionCount === 1 ? "s" : ""} attention`;
  let bookings = everyBooking;
  if (activeBookingFilter === "todo") {
    bookings = bookings.filter((item) => ["todo", "confirm"].includes(item.status));
  } else if (activeBookingFilter !== "all") {
    bookings = bookings.filter((item) => item.type === activeBookingFilter);
  }
  $("#bookingList").innerHTML = bookings.map((item) => `
    <article class="booking-card">
      <div class="booking-head">
        <span class="card-label">${item.date} · ${item.type}</span>
        <span class="status ${statusClass(item.status)}">${statusLabel(item.status)}</span>
      </div>
      ${item.audience ? `<span class="audience-tag">${escapeHtml(item.audience)} only</span>` : ""}
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.detail)}</p>
      <label class="private-note">
        <span>Private booking note <small>this device only</small></span>
        <textarea data-private-booking="${item.id}" rows="2" placeholder="Paste confirmation, phone, pickup instructions…">${escapeHtml(privateNotes[item.id] || "")}</textarea>
      </label>
    </article>
  `).join("");
  $$("[data-private-booking]", $("#bookingList")).forEach((textarea) => {
    textarea.addEventListener("input", () => {
      privateNotes[textarea.dataset.privateBooking] = textarea.value;
      saveJson(STORAGE.notes, privateNotes);
    });
  });
}

function renderPretripChecklist() {
  $("#pretripChecklist").innerHTML = PRETRIP_ITEMS.map((item, index) => `
    <li class="${checklist[index] ? "done" : ""}">
      <label><input type="checkbox" data-checklist="${index}" ${checklist[index] ? "checked" : ""}><span>${escapeHtml(item)}</span></label>
    </li>
  `).join("");
  $$("[data-checklist]").forEach((box) => {
    box.addEventListener("change", () => {
      checklist[box.dataset.checklist] = box.checked;
      saveJson(STORAGE.checklist, checklist);
      box.closest("li").classList.toggle("done", box.checked);
    });
  });
}

function renderOpenItems() {
  $("#pendingList").innerHTML = OPEN_ITEMS.map((item) => `<span>${escapeHtml(item)}</span>`).join("");
}

function compactRide(leg) {
  return [
    `${leg.mode}: ${leg.route}`,
    leg.time,
    leg.duration,
    leg.detail
  ].filter(Boolean).join(" · ");
}

function renderReferenceCard() {
  $("#referenceCardDays").innerHTML = HIKING_DAYS.map((day) => {
    const before = (day.transfers || []).filter((leg) => leg.phase === "before");
    const after = (day.transfers || []).filter((leg) => leg.phase === "after");
    const rides = [
      ...before.map((leg) => `<div><b>TO TRAIL</b><span>${escapeHtml(compactRide(leg))}</span></div>`),
      ...after.map((leg) => `<div><b>TO BED</b><span>${escapeHtml(compactRide(leg))}</span></div>`)
    ];
    const stops = day.hike.stops.map((stop) => stop.name).join(" → ");
    return `
      <section class="pocket-day">
        <div class="pocket-day-number">${String(day.hikeDay).padStart(2, "0")}</div>
        <div class="pocket-day-main">
          <h3>${escapeHtml(day.title)}</h3>
          <div class="pocket-stats">
            <strong>${escapeHtml(day.dateLabel)}</strong>
            <strong>${day.hike.distanceMi} mi</strong>
            <span>${escapeHtml(day.hike.duration)}</span>
            <span>↑ ${day.hike.ascentFt.toLocaleString()} ft</span>
            <span>↓ ${day.hike.descentFt.toLocaleString()} ft</span>
          </div>
          <div class="pocket-time"><b>HIKE</b><span>${escapeHtml(day.hike.start)} → ${escapeHtml(day.hike.arrival)}</span></div>
          <div class="pocket-stops"><b>STOPS</b><span>${escapeHtml(stops)}</span></div>
          ${rides.length ? `<div class="pocket-rides">${rides.join("")}</div>` : ""}
        </div>
      </section>
    `;
  }).join("");
}

function renderCrew() {
  $("#crewGrid").innerHTML = CREW_PROFILES.map((profile, index) => `
    <article class="crew-profile">
      ${profile.image ? `
        <button class="crew-photo" type="button" data-crew-photo="${index}" aria-label="View ${escapeHtml(profile.name)}’s photo full screen">
          <img src="${escapeHtml(profile.image)}" alt="${escapeHtml(profile.name)}, ${escapeHtml(profile.title)}">
        </button>
      ` : `
        <div class="crew-photo crew-photo-placeholder" aria-label="${escapeHtml(profile.name)}’s photo coming soon">
          <span>${profile.name.split(/\s+/).map((part) => part[0]).join("")}</span>
          <small>Portrait incoming</small>
        </div>
      `}
      <div class="crew-profile-copy">
        <p>Personnel file ${String(index + 1).padStart(2, "0")}</p>
        <h3>${escapeHtml(profile.name)}</h3>
        <strong>${escapeHtml(profile.title)}</strong>
        <span>${escapeHtml(profile.bio)}</span>
      </div>
    </article>
  `).join("");
}

function setupSpecialViews() {
  const referenceViewer = $("#referenceCardViewer");
  const crewViewer = $("#crewViewer");
  const photoViewer = $("#photoViewer");
  const overlayViewers = [referenceViewer, crewViewer, photoViewer];
  const setOpen = (viewer, open) => {
    viewer.hidden = !open;
    document.body.classList.toggle("overlay-open", overlayViewers.some((item) => !item.hidden));
  };

  $("#openReferenceCardBtn").addEventListener("click", () => setOpen(referenceViewer, true));
  $("#closeReferenceCardBtn").addEventListener("click", () => setOpen(referenceViewer, false));
  $("#printReferenceCardBtn").addEventListener("click", () => window.print());
  $$("[data-open-crew]").forEach((button) => {
    button.addEventListener("click", () => setOpen(crewViewer, true));
  });
  $("#closeCrewBtn").addEventListener("click", () => setOpen(crewViewer, false));
  $("#closePhotoViewerBtn").addEventListener("click", () => setOpen(photoViewer, false));
  $("#crewGrid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-crew-photo]");
    if (!button) return;
    const profile = CREW_PROFILES[Number(button.dataset.crewPhoto)];
    if (!profile?.image) return;
    $("#fullScreenCrewPhoto").src = profile.image;
    $("#fullScreenCrewPhoto").alt = `${profile.name}, ${profile.title}`;
    $("#photoViewerName").textContent = profile.name;
    $("#photoViewerTitle").textContent = profile.title;
    setOpen(photoViewer, true);
  });
  overlayViewers.forEach((viewer) => {
    viewer.addEventListener("click", (event) => {
      if (event.target === viewer) setOpen(viewer, false);
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!photoViewer.hidden) {
      setOpen(photoViewer, false);
      return;
    }
    setOpen(referenceViewer, false);
    setOpen(crewViewer, false);
  });
}

function renderContacts() {
  $("#contactsForm").innerHTML = contacts.map((contact, index) => `
    <div class="contact-row">
      <label>Name <input data-contact-name="${index}" value="${escapeHtml(contact.name)}" placeholder="Name"></label>
      <label>Phone <input type="tel" data-contact-phone="${index}" value="${escapeHtml(contact.phone)}" placeholder="+1…"></label>
    </div>
  `).join("");
  renderPayerOptions();
}

function saveContacts() {
  contacts = contacts.map((_, index) => ({
    name: $(`[data-contact-name="${index}"]`).value.trim() || `Traveler ${index + 1}`,
    phone: $(`[data-contact-phone="${index}"]`).value.trim()
  }));
  saveJson(STORAGE.contacts, contacts);
  renderContacts();
  renderExpenses();
  showToast("Contacts saved");
}

function renderPayerOptions() {
  $("#expensePayer").innerHTML = contacts.map((contact) => `<option>${escapeHtml(contact.name)}</option>`).join("");
}

function formatCurrency(amount, currency) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount || 0);
}

function renderWorldClock() {
  const now = new Date();
  const clocks = [
    ["losAngeles", "America/Los_Angeles"],
    ["alps", "Europe/Paris"]
  ];
  clocks.forEach(([id, timeZone]) => {
    $(`#${id}Time`).textContent = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit"
    }).format(now);
    $(`#${id}Date`).textContent = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZoneName: "short"
    }).format(now);
  });
}

function setupWorldClock() {
  renderWorldClock();
  setInterval(renderWorldClock, 1000);
}

function renderCurrencyConversion() {
  const amount = Number($("#currencyAmount").value);
  const from = $("#currencyFrom").value;
  const to = $("#currencyTo").value;
  if (!currencyRates?.rates || !Number.isFinite(amount)) {
    $("#currencyResult").textContent = "Connect once to load current rates";
    return;
  }
  const rates = { USD: 1, ...currencyRates.rates };
  const converted = (amount / rates[from]) * rates[to];
  $("#currencyResult").textContent = `${formatCurrency(amount, from)} = ${formatCurrency(converted, to)}`;
}

async function refreshCurrencyRates() {
  const status = $("#currencyRateStatus");
  if (currencyRates?.rates) {
    status.textContent = `Rates from ${currencyRates.date}`;
    renderCurrencyConversion();
  }
  try {
    const response = await fetch("https://api.frankfurter.dev/v1/latest?from=USD&to=EUR,CHF");
    if (!response.ok) throw new Error("Rate request failed");
    const data = await response.json();
    currencyRates = { date: data.date, rates: data.rates };
    saveJson(STORAGE.currencyRates, currencyRates);
    status.textContent = `Rates from ${data.date}`;
    renderCurrencyConversion();
  } catch {
    status.textContent = currencyRates?.rates ? `Cached rates · ${currencyRates.date}` : "Rates unavailable offline";
  }
}

function setupCurrencyConverter() {
  ["currencyAmount", "currencyFrom", "currencyTo"].forEach((id) => {
    $(`#${id}`).addEventListener("input", renderCurrencyConversion);
    $(`#${id}`).addEventListener("change", renderCurrencyConversion);
  });
  $("#swapCurrencyBtn").addEventListener("click", () => {
    const from = $("#currencyFrom");
    const to = $("#currencyTo");
    [from.value, to.value] = [to.value, from.value];
    renderCurrencyConversion();
  });
  refreshCurrencyRates();
}

function expenseGroups() {
  return expenses.reduce((groups, expense) => {
    const currency = expense.currency || "USD";
    groups[currency] ||= [];
    groups[currency].push(expense);
    return groups;
  }, {});
}

function settlementsFor(items, currency) {
  const names = contacts.map((contact) => contact.name);
  const total = items.reduce((sum, item) => sum + Number(item.amount), 0);
  const share = names.length ? total / names.length : 0;
  const balances = names.map((name) => ({
    name,
    amount: items.filter((item) => item.payer === name).reduce((sum, item) => sum + Number(item.amount), 0) - share
  }));
  const debtors = balances.filter((item) => item.amount < -0.005).map((item) => ({ ...item, amount: Math.abs(item.amount) }));
  const creditors = balances.filter((item) => item.amount > 0.005).map((item) => ({ ...item }));
  const result = [];
  let d = 0;
  let c = 0;
  while (d < debtors.length && c < creditors.length) {
    const amount = Math.min(debtors[d].amount, creditors[c].amount);
    result.push(`${debtors[d].name} pays ${creditors[c].name} ${formatCurrency(amount, currency)}`);
    debtors[d].amount -= amount;
    creditors[c].amount -= amount;
    if (debtors[d].amount < 0.005) d += 1;
    if (creditors[c].amount < 0.005) c += 1;
  }
  return { total, share, result };
}

function renderExpenses() {
  const groups = expenseGroups();
  const summaries = Object.entries(groups).map(([currency, items]) => [currency, settlementsFor(items, currency)]);
  $("#expenseTotal").textContent = summaries.length
    ? summaries.map(([currency, data]) => formatCurrency(data.total, currency)).join(" · ")
    : "$0.00";
  $("#perPersonTotal").textContent = summaries.length
    ? summaries.map(([currency, data]) => `${formatCurrency(data.share, currency)} each`).join(" · ")
    : "$0.00 per person";
  const settlementLines = summaries.flatMap(([currency, data]) => data.result.map((line) => `<div class="settle-row">${escapeHtml(line)}</div>`));
  $("#settleList").innerHTML = settlementLines.join("") || `<p class="empty-state">Nothing to settle.</p>`;
  $("#expenseList").innerHTML = expenses.length ? expenses.map((expense) => `
    <div class="expense-row">
      <div><strong>${formatCurrency(Number(expense.amount), expense.currency || "USD")} · ${escapeHtml(expense.category)}</strong><small>${escapeHtml(expense.payer)}${expense.note ? ` · ${escapeHtml(expense.note)}` : ""}</small></div>
      <button class="icon-btn" type="button" data-delete-expense="${expense.id}" aria-label="Delete expense">×</button>
    </div>
  `).join("") : `<p class="empty-state">No trail expenses yet.</p>`;
  $$("[data-delete-expense]").forEach((button) => {
    button.addEventListener("click", () => {
      expenses = expenses.filter((expense) => expense.id !== button.dataset.deleteExpense);
      saveJson(STORAGE.expenses, expenses);
      renderExpenses();
    });
  });
}

function setupExpenseModal() {
  const modal = $("#expenseModal");
  $("#addExpenseBtn").addEventListener("click", () => {
    renderPayerOptions();
    modal.classList.add("open");
    $("[name=amount]", modal).focus();
  });
  $("#closeExpenseBtn").addEventListener("click", () => modal.classList.remove("open"));
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.classList.remove("open");
  });
  $("#expenseForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    expenses.unshift({
      id: crypto.randomUUID?.() || String(Date.now()),
      amount: Number(data.get("amount")),
      currency: data.get("currency"),
      payer: data.get("payer"),
      category: data.get("category"),
      note: String(data.get("note") || "").trim()
    });
    saveJson(STORAGE.expenses, expenses);
    event.currentTarget.reset();
    modal.classList.remove("open");
    renderExpenses();
    showToast("Expense saved");
  });
  $("#clearExpensesBtn").addEventListener("click", () => {
    if (!expenses.length || !confirm("Clear every expense saved on this device?")) return;
    expenses = [];
    saveJson(STORAGE.expenses, expenses);
    renderExpenses();
  });
}

function activateTab(tab) {
  $$(".tab-btn").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
  $$(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `${tab}Panel`));
  if (tab === "day" && map) setTimeout(() => map.invalidateSize(), 80);
}

function scrollToPanel(tab) {
  requestAnimationFrame(() => {
    document.getElementById(`${tab}Panel`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function setupNavigation() {
  $$(".tab-btn").forEach((button) => {
    button.addEventListener("click", () => {
      activateTab(button.dataset.tab);
      scrollToPanel(button.dataset.tab);
    });
  });
  $("#bookingFilters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-booking-filter]");
    if (!button) return;
    activeBookingFilter = button.dataset.bookingFilter;
    renderBookingFilters();
    renderBookings();
  });
}

function updateConnectionStatus() {
  const badge = $("#connectionBadge");
  badge.textContent = navigator.onLine ? "Online" : "Offline field mode";
  badge.classList.toggle("offline", !navigator.onLine);
}

function setupInstall() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    $("#installBtn").hidden = false;
  });
  $("#installBtn").addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    $("#installBtn").hidden = true;
  });
  window.addEventListener("appinstalled", () => showToast("Mont Blanc Touring Company installed"));
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
}

function init() {
  $("#tripStatus").textContent = tripStatusText();
  renderReferenceCard();
  renderCrew();
  setupSpecialViews();
  setupWorldClock();
  renderDayPlan();
  initializeMap();
  renderBookingFilters();
  renderBookings();
  renderPretripChecklist();
  renderExpenses();
  setupCurrencyConverter();
  setupExpenseModal();
  setupDayNavigation();
  setupNavigation();
  setupInstall();
  updateConnectionStatus();
  window.addEventListener("online", updateConnectionStatus);
  window.addEventListener("offline", updateConnectionStatus);
  registerServiceWorker();
  setTimeout(() => $("#splash").classList.add("hidden"), 950);
}

init();
