const TRIP_DAYS = [
  {
    tripDay: 1,
    date: "2026-09-21",
    dateLabel: "Sep 21",
    weekday: "Monday",
    kind: "travel",
    title: "Los Angeles → Geneva",
    location: "Overnight flight",
    summary: "Delta overnight to Paris, then onward to Geneva.",
    image: "resources/images/places/flight-to-geneva.jpg",
    fallbackImage: "resources/images/The-view-of-the-Mont-Blanc-scaled.jpg",
    transfers: [
      { mode: "Flight", route: "LAX → Paris CDG", time: "6:00 PM departure", duration: "Overnight", status: "booked", audience: "John & Rachel" },
      { mode: "Flight", route: "Paris CDG → Geneva", time: "3:00 PM Tue", duration: "1 hr 10 min", status: "booked", audience: "John & Rachel" }
    ],
    notes: ["Land in Geneva at 4:10 PM on Tuesday, September 22."]
  },
  {
    tripDay: 2,
    date: "2026-09-22",
    dateLabel: "Sep 22",
    weekday: "Tuesday",
    kind: "travel",
    title: "Geneva → Chamonix → Les Houches",
    location: "Les Houches, France",
    summary: "Airport to Geneva bus station, FlixBus to Chamonix, luggage drop, then local bus or taxi.",
    image: "resources/images/places/les-houches.jpg",
    fallbackImage: "resources/images/window.jpg",
    transfers: [
      { mode: "Taxi / train", route: "Geneva Airport → Place Dorcière", time: "After 4:10 PM arrival", duration: "Allow 30–45 min", status: "confirm" },
      { mode: "FlixBus", route: "Geneva Place Dorcière → Chamonix", time: "Ticket confirmed", duration: "About 1 hr 15 min", status: "booked" },
      { mode: "Local bus / taxi", route: "Chamonix → Les Houches", time: "After luggage drop", duration: "About 20 min", status: "local" }
    ],
    lodging: { name: "Hotel Restaurant Le Saint Antoine", place: "Les Houches", price: "$151.49 · quadruple room", status: "booked" },
    notes: ["Drop stored luggage at Hôtel de L'Arve in Chamonix before continuing to Les Houches."]
  },
  {
    tripDay: 3,
    hikeDay: 1,
    mapDay: 1,
    date: "2026-09-23",
    dateLabel: "Sep 23",
    weekday: "Wednesday",
    kind: "hike",
    title: "Les Houches → Gîte Le Pontet",
    location: "France",
    summary: "A muscular first day: Bellevue, the Bionnassay crossing, Col du Tricot, and the Miage valley.",
    image: "resources/images/places/col-du-tricot.jpg",
    fallbackImage: "resources/images/mountains1.jpg",
    hike: {
      start: "8:00 AM",
      arrival: "2:00–3:00 PM",
      distanceMi: 10,
      distanceKm: 16,
      ascentFt: 4300,
      ascentM: 1310,
      descentFt: 4600,
      descentM: 1400,
      duration: "5½–7 hr",
      difficulty: "Hard",
      mapped: { distanceMi: 13.3, distanceKm: 21.4, ascentFt: 4920, ascentM: 1499, descentFt: 4370, descentM: 1332 },
      route: "Les Houches → Bellevue → Col de Voza → Bionnassay Bridge → Col du Tricot → Refuge de Miage → Auberge Le Truc → Gîte Le Pontet",
      stops: [
        { name: "Les Houches", detail: "Trail start", coords: [45.896025, 6.805760] },
        { name: "Bellevue", detail: "Optional cable car shortcut", coords: [45.873687, 6.779552] },
        { name: "Col de Voza", detail: "Rail crossing and pass", coords: [45.876809, 6.761170] },
        { name: "Bionnassay Bridge", detail: "Suspension bridge area", coords: [45.865524, 6.757804] },
        { name: "Col du Tricot", detail: "High point", coords: [45.850431, 6.769953] },
        { name: "Refuge de Miage", detail: "Food / water stop", coords: [45.839179, 6.759937] },
        { name: "Auberge du Truc", detail: "Possible refreshment stop", coords: [45.836241, 6.749581] },
        { name: "Gîte Le Pontet", detail: "Finish and overnight", coords: [45.802862, 6.722050] }
      ]
    },
    lodging: { name: "Gîte Le Pontet", place: "Les Contamines-Montjoie", price: "$316.05", status: "booked" },
    notes: ["Bellevue cable car can remove the opening climb if weather, legs, or timing call for it."]
  },
  {
    tripDay: 4,
    hikeDay: 2,
    mapDay: 2,
    date: "2026-09-24",
    dateLabel: "Sep 24",
    weekday: "Thursday",
    kind: "hike",
    title: "Gîte Le Pontet → Les Chapieux",
    location: "France",
    summary: "The longest planned stage, over both Bonhomme cols, followed by a confirmed taxi to Bourg-Saint-Maurice.",
    image: "resources/images/places/col-du-bonhomme.jpg",
    fallbackImage: "resources/images/signs.jpg",
    hike: {
      start: "7:30 AM",
      arrival: "3:00–3:30 PM",
      distanceMi: 11.8,
      distanceKm: 19,
      ascentFt: 4500,
      ascentM: 1370,
      descentFt: 3200,
      descentM: 975,
      duration: "7–8 hr",
      difficulty: "Hard",
      mapped: { distanceMi: 10.2, distanceKm: 16.3, ascentFt: 4310, ascentM: 1314, descentFt: 3070, descentM: 935 },
      route: "Gîte Le Pontet → Notre-Dame de la Gorge → Col du Bonhomme → Col de la Croix du Bonhomme → Les Chapieux",
      stops: [
        { name: "Gîte Le Pontet", detail: "Trail start", coords: [45.802862, 6.722050] },
        { name: "Notre-Dame de la Gorge", detail: "Historic chapel", coords: [45.792052, 6.715244] },
        { name: "Col du Bonhomme", detail: "First high pass", coords: [45.735009, 6.706605] },
        { name: "Col de la Croix du Bonhomme", detail: "Second pass / refuge area", coords: [45.722141, 6.718739] },
        { name: "Les Chapieux", detail: "Finish and taxi pickup", coords: [45.696679, 6.733581] }
      ]
    },
    transfers: [
      { mode: "Taxi Arthur", route: "Les Chapieux → Bourg-Saint-Maurice", time: "3:15 PM · driver waits 30 min", duration: "About 40 min", status: "booked", phase: "after", detail: "€80. Backup September shuttles are listed at 5:20, 5:50, and 6:20 PM; recheck near travel." }
    ],
    lodging: { name: "Hostellerie du Petit Saint-Bernard", place: "Bourg-Saint-Maurice", price: "$255.72", status: "booked" }
  },
  {
    tripDay: 5,
    hikeDay: 3,
    mapDay: 3,
    date: "2026-09-25",
    dateLabel: "Sep 25",
    weekday: "Friday",
    kind: "hike",
    title: "Refuge des Mottets → La Visaille",
    location: "France → Italy",
    summary: "Taxi to Ville des Glaciers, walk to Mottets, cross Col de la Seigne, then descend Val Veny to the bus.",
    image: "resources/images/places/col-de-la-seigne.jpg",
    fallbackImage: "resources/images/mountains2.jpg",
    hike: {
      start: "About 8:00 AM",
      arrival: "2:00–4:00 PM",
      distanceMi: 9.5,
      distanceKm: 15,
      ascentFt: 2300,
      ascentM: 700,
      descentFt: 4600,
      descentM: 1400,
      duration: "5–6½ hr",
      difficulty: "Moderate",
      mapped: { distanceMi: 8.6, distanceKm: 13.8, ascentFt: 2250, ascentM: 685, descentFt: 3040, descentM: 927 },
      route: "Refuge des Mottets → Col de la Seigne → Rifugio Elisabetta → Val Veny → La Visaille",
      stops: [
        { name: "Refuge des Mottets", detail: "Trail start", coords: [45.737141, 6.779044] },
        { name: "Col de la Seigne", detail: "France–Italy border / high point", coords: [45.751264, 6.807213] },
        { name: "Rifugio Elisabetta", detail: "Food / water stop", coords: [45.767001, 6.837437] },
        { name: "Val Veny", detail: "Long valley descent", coords: [45.775875, 6.869925] },
        { name: "La Visaille", detail: "Finish / 931 bus stop", coords: [45.786867, 6.904062] }
      ]
    },
    transfers: [
      { mode: "Taxi Arthur", route: "Bourg-Saint-Maurice → Ville des Glaciers", time: "7:00 AM", duration: "Then about 20 min walk to Mottets", status: "booked", phase: "before", detail: "€95." },
      { mode: "931 orange bus", route: "La Visaille → Courmayeur", time: "After the hike", duration: "About 23 min", status: "local", phase: "after", detail: "Free service is expected through September 27, 2026; verify timetable near travel." }
    ],
    lodging: { name: "iH Hotels Courmayeur Mont Blanc", place: "Courmayeur", price: "$250.70 · breakfast included", status: "booked" }
  },
  {
    tripDay: 6,
    hikeDay: 4,
    mapDay: 4,
    date: "2026-09-26",
    dateLabel: "Sep 26",
    weekday: "Saturday",
    kind: "hike",
    title: "Arnuva → La Fouly",
    location: "Italy → Switzerland",
    summary: "Bus up Val Ferret, climb Grand Col Ferret, then make the long descent into La Fouly.",
    image: "resources/images/places/grand-col-ferret.jpg",
    fallbackImage: "resources/images/mountains1.jpg",
    hike: {
      start: "About 8:30 AM",
      arrival: "About 2:30 PM",
      distanceMi: 10,
      distanceKm: 16,
      ascentFt: 2900,
      ascentM: 885,
      descentFt: 3600,
      descentM: 1100,
      duration: "5–6 hr",
      difficulty: "Hard",
      mapped: { distanceMi: 8.9, distanceKm: 14.4, ascentFt: 2750, ascentM: 838, descentFt: 3245, descentM: 989 },
      route: "Arp Nouvaz (Arnuva) → Grand Col Ferret → La Fouly",
      stops: [
        { name: "Piazzale Monte Bianco", detail: "Courmayeur bus departure area", coords: [45.791380, 6.970458] },
        { name: "Arp Nouvaz / Arnuva", detail: "Trail start", coords: [45.870617, 7.049758] },
        { name: "Grand Col Ferret", detail: "Italy–Switzerland border / high point", coords: [45.889029, 7.077862] },
        { name: "La Fouly", detail: "Finish / PostBus stop", coords: [45.933116, 7.098968] },
        { name: "Orsières", detail: "PostBus transfer", coords: [46.028046, 7.143696] },
        { name: "Champex-Lac", detail: "Final bus stop", coords: [46.030213, 7.116374] }
      ]
    },
    transfers: [
      { mode: "Val Ferret bus", route: "Courmayeur → Arp Nouvaz", time: "Aim for 8:00 AM", duration: "About 30 min", status: "local", phase: "before", detail: "Free, no reservation expected. Confirm departure at the hotel." },
      { mode: "Swiss PostBus", route: "La Fouly → Orsières → Champex-Lac", time: "After the hike", duration: "One transfer", status: "local", phase: "after", detail: "Buy in SBB Mobile or at the stop." }
    ],
    lodging: { name: "Pension En Plein Air", place: "Champex-Lac", price: "$437.66", status: "booked" }
  },
  {
    tripDay: 7,
    hikeDay: 5,
    mapDay: 5,
    date: "2026-09-27",
    dateLabel: "Sep 27",
    weekday: "Sunday",
    kind: "hike",
    title: "Champex-Lac → Trient",
    location: "Switzerland",
    summary: "The Bovine route contours through forest and pasture before descending to Trient.",
    image: "resources/images/places/alp-bovine.jpg",
    fallbackImage: "resources/images/hovel.jpg",
    hike: {
      start: "8:00 AM",
      arrival: "1:30–2:30 PM",
      distanceMi: 9,
      distanceKm: 14,
      ascentFt: 2700,
      ascentM: 825,
      descentFt: 3600,
      descentM: 1100,
      duration: "4½–6 hr",
      difficulty: "Moderate",
      mapped: { distanceMi: 9.8, distanceKm: 15.8, ascentFt: 2630, ascentM: 801, descentFt: 3205, descentM: 977 },
      route: "Champex-Lac → Alp Bovine → Trient",
      stops: [
        { name: "Pension En Plein Air", detail: "Trail start", coords: [46.031175, 7.112626] },
        { name: "Champex-Lac", detail: "Village / supplies", coords: [46.030213, 7.116374] },
        { name: "Alp Bovine", detail: "Pasture and possible refreshment stop", coords: [46.055470, 7.049589] },
        { name: "Trient", detail: "Finish / Bus 213", coords: [46.055949, 6.995374] }
      ]
    },
    transfers: [
      { mode: "Bus 213", route: "Trient → Martigny", time: "After the hike", duration: "Check SBB on the day", status: "local", phase: "after", detail: "No reservation. Buy in SBB Mobile." }
    ],
    lodging: { name: "Hôtel de la Poste", place: "Martigny", price: "CHF 220 · two twin rooms", status: "booked" }
  },
  {
    tripDay: 8,
    hikeDay: 6,
    mapDay: 6,
    date: "2026-09-28",
    dateLabel: "Sep 28",
    weekday: "Monday",
    kind: "hike",
    title: "Martigny → Trient → Tré-le-Champ → Chamonix",
    location: "Switzerland → France",
    summary: "Bus to Trient, climb Col de Balme, traverse Aiguillette des Posettes, hike through Tré-le-Champ to Montroc-le-Planet, then take the replacement bus to Chamonix.",
    image: "resources/images/places/aiguillette-des-posettes.jpg",
    fallbackImage: "resources/images/The-view-of-the-Mont-Blanc-scaled.jpg",
    hike: {
      start: "About 8:45 AM",
      arrival: "2:30–4:00 PM",
      distanceMi: 9,
      distanceKm: "14–15",
      ascentFt: 3200,
      ascentM: 975,
      descentFt: 3000,
      descentM: 915,
      duration: "5½–7 hr",
      difficulty: "Hard",
      mapped: { distanceMi: 8.8, distanceKm: 14.2, ascentFt: 3600, ascentM: 1099, descentFt: 3265, descentM: 995 },
      route: "Trient → Col de Balme → Aiguillette des Posettes → Tré-le-Champ → Montroc-le-Planet station",
      stops: [
        { name: "Trient", detail: "Trail start", coords: [46.055949, 6.995374] },
        { name: "Col de Balme", detail: "Switzerland–France border / high point", coords: [46.026367, 6.970289] },
        { name: "Aiguillette des Posettes", detail: "Exposed scenic ridge", coords: [46.018125, 6.940251] },
        { name: "Tré-le-Champ", detail: "Route waypoint", coords: [45.996831, 6.927821] },
        { name: "Montroc-le-Planet", detail: "Trail finish / replacement bus stop", coords: [45.996415, 6.934543] }
      ]
    },
    transfers: [
      { mode: "Bus 213", route: "Martigny Gare → Trient Village", time: "Depart about 7:56 AM", duration: "Arrive about 8:35 AM", status: "local", phase: "before", detail: "No reservation required. Buy tickets at the station or in SBB Mobile." },
      { mode: "Replacement bus", route: "Montroc-le-Planet → Chamonix", time: "After the hike", duration: "Rail replacement service", status: "local", phase: "after", detail: "The Mont-Blanc Express rail line between this area and Chamonix is closed beginning Sep 28; replacement bus service is operating instead.", mapLine: [[45.996415, 6.934543], [45.922783, 6.873841]] }
    ],
    lodging: { name: "Hôtel de L'Arve", place: "Chamonix", price: "€239.80 · family room · breakfast", status: "booked" }
  }
];

const OPEN_ITEMS = [
  "Download Organic Maps and the TMB area offline",
  "Confirm September bus and shuttle timetables near departure",
  "Add private confirmation codes on each traveler’s own device"
];

const PRETRIP_ITEMS = [
  "Download Organic Maps / offline TMB map",
  "Download SBB Mobile",
  "Download SNCF Connect",
  "Save this site to the phone home screen",
  "Open the map once while online",
  "Download French and Italian in Google Translate"
];

const CREW_PROFILES = [
  {
    name: "Rachel",
    title: "Le Capitaine",
    bio: "Fearless, peerless, and dear to us all. Keep her in sight and you'll make it through. She's the toughest on the trail... also the funniest, cutest, and coolest.",
    image: "resources/images/crew/rachel.webp"
  },
  {
    name: "David",
    title: "The Grease Man",
    bio: "Known for getting in and out of slippery situations. Chest: shaved. Waist: snatched. Knees: youngest in the company.",
    image: "resources/images/crew/david.webp"
  },
  {
    name: "Colleen",
    title: "The Chilanga",
    bio: "Philly-born, Mexico City-forged. Fit, flirty, and in charge if the Company gets into a bar fight. Make sure she has her passport.",
    image: "resources/images/crew/colleen.webp"
  },
  {
    name: "Marcel",
    title: "The Brazilian",
    bio: "Deft with his hands, steady as a mountain goat. Don't ask him for too many massages. Secret weapon: Italian citizenship.",
    image: "resources/images/crew/marcel.webp"
  },
  {
    name: "Arin",
    title: "The Georgia Peach",
    bio: "Ask her for a fit check while you're putting on yesterday's underwear. Cycled probably 40,000 miles in preparation for this trip. Quads: locked. Calves: loaded. Eyes: hazel.",
    image: "resources/images/crew/arin.webp"
  },
  {
    name: "John",
    title: "The Liability",
    bio: "Tell him to put that rock down, and keep a wide berth if he's muttering to himself. Ask him about his gummy bears.",
    image: "resources/images/crew/john.webp"
  }
];

const DEFAULT_CONTACTS = [
  { name: "Traveler 1", phone: "" },
  { name: "Traveler 2", phone: "" },
  { name: "Traveler 3", phone: "" },
  { name: "Traveler 4", phone: "" }
];
