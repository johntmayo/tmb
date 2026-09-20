const STORAGE = {
  notes: "tmb-private-notes-v2",
  progress: "tmb-waypoint-progress-v2",
  checklist: "tmb-checklist-v2",
  contacts: "tmb-contacts-v2",
  expenses: "tmb-expenses-v2"
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

let activeItineraryFilter = "all";
let activeBookingFilter = "all";
let activeMapDay = "all";
let privateNotes = loadJson(STORAGE.notes, {});
let waypointProgress = loadJson(STORAGE.progress, {});
let checklist = loadJson(STORAGE.checklist, {});
let contacts = loadJson(STORAGE.contacts, DEFAULT_CONTACTS);
let expenses = loadJson(STORAGE.expenses, []);
let deferredInstallPrompt = null;
let map = null;
let mapFeatures = null;

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
  const first = TRIP_DAYS[0].date;
  const last = TRIP_DAYS.at(-1).date;
  if (today < first) {
    const days = dayDifference(today, first);
    return `${days} day${days === 1 ? "" : "s"} to departure`;
  }
  if (today > last) return "Trip complete";
  const day = TRIP_DAYS.find((item) => item.date === today);
  return day ? `Today · ${day.dateLabel} · ${day.title}` : "Trip in progress";
}

function focusDay() {
  const today = todayKey();
  return TRIP_DAYS.find((day) => day.date === today)
    || (today < TRIP_DAYS[0].date ? TRIP_DAYS[0] : TRIP_DAYS.at(-1));
}

function nextHike(fromDate = todayKey()) {
  return TRIP_DAYS.find((day) => day.hikeDay && day.date >= fromDate)
    || TRIP_DAYS.find((day) => day.hikeDay);
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
  if (!hike.mapped) return "";
  const difference = Math.abs(hike.mapped.distanceKm - hike.distanceKm) / hike.distanceKm;
  return `
    <div class="track-check ${difference >= 0.12 ? "track-warning" : ""}">
      <span>Supplied GPX</span>
      <strong>${hike.mapped.distanceMi} mi / ${hike.mapped.distanceKm} km</strong>
      <small>↑ ${hike.mapped.ascentFt.toLocaleString()} ft · ↓ ${hike.mapped.descentFt.toLocaleString()} ft${difference >= 0.12 ? " · differs from itinerary estimate" : ""}</small>
    </div>
  `;
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

function stopsChecklist(day, context = "today") {
  if (!day.hike?.stops) return "";
  const key = `hike-${day.hikeDay}`;
  const completed = waypointProgress[key] || [];
  return `
    <div class="route-checklist" data-progress-key="${key}">
      ${day.hike.stops.map((stop, index) => {
        const checked = completed.includes(index);
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${stop.coords.join(",")}`;
        return `
          <div class="stop-row ${checked ? "reached" : ""}">
            <label>
              <input type="checkbox" data-stop-index="${index}" ${checked ? "checked" : ""}>
              <span class="stop-number">${String(index + 1).padStart(2, "0")}</span>
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
  if (today < TRIP_DAYS[0].date) label = `Next up · in ${dayDifference(today, day.date)} day`;
  if (today > TRIP_DAYS.at(-1).date) label = "Trip archive";

  let content = `
    <div class="section-heading today-heading">
      <p class="kicker">Trail command</p>
      <h2>${today < TRIP_DAYS[0].date ? "Ready when you are." : "Today, at a glance."}</h2>
      <p>Big numbers, stop order, and transfers without digging.</p>
    </div>
    ${fieldBrief(day, label)}
  `;

  if (!day.hike) {
    const upcoming = nextHike(day.date);
    if (upcoming && upcoming.tripDay !== day.tripDay) {
      content += `
        <div class="section-heading compact">
          <p class="kicker">Next trail stage</p>
          <h2>Know the day before it starts.</h2>
        </div>
        ${fieldBrief(upcoming, `in ${Math.max(0, dayDifference(today, upcoming.date))} days`)}
      `;
    }
  }

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

function renderItineraryFilters() {
  const filters = [
    ["all", "All 15 days"],
    ["hike", "6 hikes"],
    ["travel", "Travel"],
    ["city", "City"]
  ];
  $("#itineraryFilters").innerHTML = filters.map(([value, label]) => `
    <button class="filter-btn ${activeItineraryFilter === value ? "active" : ""}" type="button" data-itinerary-filter="${value}">${label}</button>
  `).join("");
}

function renderItinerary() {
  const days = activeItineraryFilter === "all"
    ? TRIP_DAYS
    : TRIP_DAYS.filter((day) => day.kind === activeItineraryFilter);
  $("#timeline").innerHTML = days.map(itineraryCard).join("");
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

  $$("[data-open-map]", root).forEach((button) => {
    button.addEventListener("click", () => {
      activeMapDay = String(button.dataset.openMap);
      activateTab("map");
      renderMapFilters();
      updateMap();
      scrollToPanel("map");
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
    `Route: ${hike.stops.map((stop) => stop.name).join(" → ")}`
  ].join("\n");
  try {
    await navigator.clipboard.writeText(text);
    showToast("Briefing copied");
  } catch {
    showToast("Copy unavailable");
  }
}

function renderMapFilters() {
  const options = [["all", "All"]];
  TRIP_DAYS.filter((day) => day.hikeDay).forEach((day) => options.push([String(day.mapDay), `Hike ${day.hikeDay}`]));
  $("#mapFilters").innerHTML = options.map(([value, label]) => `
    <button class="filter-btn ${activeMapDay === value ? "active" : ""}" type="button" data-map-filter="${value}">${label}</button>
  `).join("");
}

function initializeMap() {
  if (!window.L || !window.TMB_MAP_DATA) {
    $("#map").hidden = true;
    $("#mapFallback").hidden = false;
    renderWaypointDirectory();
    return;
  }
  map = L.map("map", { zoomControl: true, scrollWheelZoom: false });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  updateMap();
}

function updateMap() {
  renderWaypointDirectory();
  if (!map || !window.TMB_MAP_DATA) return;
  if (mapFeatures) mapFeatures.remove();
  const filtered = activeMapDay === "all"
    ? TMB_MAP_DATA
    : {
        ...TMB_MAP_DATA,
        features: TMB_MAP_DATA.features.filter((feature) => String(feature.properties.mapDay) === activeMapDay)
      };
  const colors = { 1: "#f2bf45", 2: "#e57e49", 3: "#8fc7d9", 4: "#85b86d", 5: "#d8b4e2", 6: "#f1e5c6" };
  mapFeatures = L.geoJSON(filtered, {
    style: (feature) => ({
      color: colors[feature.properties.mapDay] || "#f2bf45",
      weight: feature.properties.transport ? 3 : 4,
      opacity: 0.86,
      dashArray: feature.properties.transport ? "7 7" : null
    }),
    pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
      radius: 7,
      color: "#071710",
      weight: 2,
      fillColor: colors[feature.properties.mapDay] || "#f2bf45",
      fillOpacity: 1
    }),
    onEachFeature: (feature, layer) => {
      const name = feature.properties.name || "Route line";
      const day = feature.properties.mapDay ? `Hike ${feature.properties.mapDay}` : "Travel";
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
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: activeMapDay === "all" ? 10 : 13 });
  setTimeout(() => map.invalidateSize(), 80);
}

function renderWaypointDirectory() {
  const hikes = activeMapDay === "all"
    ? TRIP_DAYS.filter((day) => day.hikeDay)
    : TRIP_DAYS.filter((day) => String(day.mapDay) === activeMapDay);
  $("#waypointDirectory").innerHTML = hikes.map((day) => `
    <details ${activeMapDay !== "all" ? "open" : ""}>
      <summary><span>Hike ${day.hikeDay}</span><strong>${escapeHtml(day.title)}</strong></summary>
      <div>
        ${day.hike.stops.map((stop, index) => `
          <a href="https://www.google.com/maps/search/?api=1&query=${stop.coords.join(",")}" target="_blank" rel="noopener">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <div><strong>${escapeHtml(stop.name)}</strong><small>${escapeHtml(stop.detail)}</small></div>
            <b>↗</b>
          </a>
        `).join("")}
      </div>
    </details>
  `).join("");
}

function allBookings() {
  const rows = [];
  TRIP_DAYS.forEach((day) => {
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
        status: leg.status
      });
    });
  });
  return rows;
}

function renderBookingFilters() {
  const options = [["all", "All"], ["lodging", "Lodging"], ["transport", "Transport"], ["todo", "Needs action"]];
  $("#bookingFilters").innerHTML = options.map(([value, label]) => `
    <button class="filter-btn ${activeBookingFilter === value ? "active" : ""}" type="button" data-booking-filter="${value}">${label}</button>
  `).join("");
}

function renderBookings() {
  let bookings = allBookings();
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
  if (tab === "map" && map) setTimeout(() => map.invalidateSize(), 80);
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
  $("#itineraryFilters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-itinerary-filter]");
    if (!button) return;
    activeItineraryFilter = button.dataset.itineraryFilter;
    renderItineraryFilters();
    renderItinerary();
  });
  $("#bookingFilters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-booking-filter]");
    if (!button) return;
    activeBookingFilter = button.dataset.bookingFilter;
    renderBookingFilters();
    renderBookings();
  });
  $("#mapFilters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-map-filter]");
    if (!button) return;
    activeMapDay = button.dataset.mapFilter;
    renderMapFilters();
    updateMap();
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
  window.addEventListener("appinstalled", () => showToast("Tiens Bon! installed"));
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
  renderToday();
  renderItineraryFilters();
  renderItinerary();
  renderMapFilters();
  initializeMap();
  renderBookingFilters();
  renderBookings();
  renderPretripChecklist();
  renderOpenItems();
  renderContacts();
  renderExpenses();
  setupExpenseModal();
  setupNavigation();
  setupInstall();
  updateConnectionStatus();
  window.addEventListener("online", updateConnectionStatus);
  window.addEventListener("offline", updateConnectionStatus);
  $("#saveContactsBtn").addEventListener("click", saveContacts);
  registerServiceWorker();
  setTimeout(() => $("#splash").classList.add("hidden"), 950);
}

init();
