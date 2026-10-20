import type { WorldEvent } from "../events";

// Middle East, Africa and Russia. Researched 19 Oct 2026; every source URL was fetched when the entry was written.
export const MEA: WorldEvent[] = [
  {
    id: "sudan-darfur-kordofan-famine-alert",
    title: "IPC warns famine is spreading across Darfur and Kordofan",
    type: "conflict",
    date: "2026-10-12",
    status: "developing",
    region: "Sudan",
    lat: 13.18, lon: 30.22,
    countries: ["SD"],
    summary:
      "An IPC Famine Review Committee alert issued 12 October 2026 says war, displacement and El Niño drought are accelerating famine risk across Greater Darfur and Greater Kordofan, with child acute malnutrition at 38% and 30.8% in two South Darfur camps, above the 30% famine threshold. Drought covers more than half of Sudan's cropland, 8.58 million people are displaced nationwide and over 300,000 have fled Kordofan since October 2025. The 2026 humanitarian plan is 57% unfunded as of 8 October and WFP convoys came under fire on 2 and 3 October.",
    severity: 4,
    keywords: ["sudan", "famine", "ipc", "darfur", "kordofan", "el obeid", "nyala", "rsf", "drought", "malnutrition", "wfp", "khartoum"],
    links: [
      { to: "ethiopia-eritrea-war-fears", kind: "shares_driver", why: "Both crises sit on the same Horn-of-Africa fault line; Sudan is named in the Cairo-Khartoum-Mogadishu bloc opposing Addis Ababa.", via: "rival Horn of Africa blocs", driver: "red-sea-rivalry" },
      { to: "gulf-war-energy-shock", kind: "responds_to", why: "Famine relief is falling further behind because Brent above $100 and Red Sea disruption raise the cost of moving fuel and food aid into Port Sudan.", via: "aid fuel and shipping costs", driver: "gulf-energy-prices" },
    ],
    sources: [
      { title: "Sudan: Drought and war push Darfur and Kordofan towards famine", url: "https://news.un.org/en/story/2026/10/1168577", publisher: "UN News", date: "2026-10-12" },
      { title: "Famine risk surges across Sudan's Darfur and Kordofan regions, alert warns", url: "https://sudantribune.com/article/319889", publisher: "Sudan Tribune", date: "2026-10-13" },
    ],
  },
  {
    id: "ethiopia-eritrea-war-fears",
    title: "Ethiopia and Eritrea trade war accusations at the UN",
    type: "conflict",
    date: "2026-10-10",
    status: "developing",
    region: "Horn of Africa",
    lat: 14.28, lon: 39.46,
    countries: ["ET", "ER"],
    summary:
      "Ethiopia tells the UN Security Council on 9 October 2026 that Eritrean troops have advanced up to 60 km into Tigray and invokes Article 51; Eritrea replies on 10 October calling it a 'declaration of war' and says Addis Ababa wants to seize the Red Sea port of Assab. Federal forces retook Mekelle on 3-4 October and Adigrat on 10 October from a TPLF-led seven-group rebel alliance formed in September. The two states severed diplomatic ties on 1 October and roughly 4 million people in Tigray need urgent aid.",
    severity: 4,
    keywords: ["ethiopia", "eritrea", "tigray", "tplf", "assab", "red sea", "abiy", "mekelle", "adigrat", "security council", "horn of africa", "asmara"],
    links: [
      { to: "sudan-darfur-kordofan-famine-alert", kind: "amplifies", why: "A Tigray-Eritrea war would push refugees and arms into eastern Sudan and divert aid logistics from Darfur.", via: "refugees, arms and aid diversion", driver: "red-sea-rivalry" },
      { to: "gulf-war-energy-shock", kind: "amplifies", why: "Fighting over Assab adds a second chokepoint risk on the Bab al-Mandeb approach already strained by the Iran war.", via: "Bab al-Mandeb shipping risk", driver: "gulf-energy-prices" },
    ],
    sources: [
      { title: "Ethiopia and Eritrea accuse one another of launching war", url: "https://www.aljazeera.com/news/2026/10/9/ethiopia-and-eritrea-accuse-one-another-of-launching-war", publisher: "Al Jazeera", date: "2026-10-09" },
      { title: "Eritrean incursions raise fears of a wider regional war in Ethiopia", url: "https://www.thenewhumanitarian.org/analysis/2026/10/12/eritrean-incursions-raise-fears-wider-regional-war-ethiopia", publisher: "The New Humanitarian", date: "2026-10-12" },
    ],
  },
  {
    id: "israel-election-2026",
    title: "Israel votes 27 Oct with Netanyahu's bloc short of a majority",
    type: "election",
    date: "2026-10-27",
    status: "scheduled",
    region: "Israel",
    lat: 31.77, lon: 35.21,
    countries: ["IL"],
    summary:
      "Israel elects its 120-seat Knesset on 27 October 2026, the first vote held on its legally scheduled date since 1988. A Kan poll on 18 October gives Gadi Eisenkot's Yashar 23 seats to Likud's 21, with Netanyahu's bloc at 51 and the anti-Netanyahu bloc at 52 without the Arab parties, so neither camp reaches 61. The campaign is a referendum on Netanyahu's handling of Gaza and the Iran war; Trump has endorsed him and the cabinet has approved NIS 2.6 billion in cuts to fund defence.",
    severity: 4,
    keywords: ["israel", "election", "knesset", "netanyahu", "eisenkot", "yashar", "likud", "coalition", "ben-gvir", "smotrich", "gaza", "jerusalem"],
    links: [
      { to: "gulf-war-energy-shock", kind: "responds_to", why: "The vote is a referendum on the Iran war; Netanyahu vows to topple Tehran's regime while Trump endorses him.", via: "a referendum on the Iran war" },
      { to: "opec-plus-november-output-hold", kind: "affects", why: "The result sets whether the Iran war escalates, which determines how much Gulf export capacity OPEC+ can restore.", via: "risk of wider Iran war", driver: "gulf-energy-prices" },
    ],
    sources: [
      { title: "FALQs: Israel's Upcoming Election on October 27, 2026", url: "https://blogs.loc.gov/law/2026/10/falqs-israels-upcoming-election-on-october-27-2026/", publisher: "Library of Congress", date: "2026-10-09" },
      { title: "Israeli Election Poll: New Far-Right Party Sinks Under Threshold, Smotrich Gains", url: "https://www.haaretz.com/israel-news/elections/2026-10-18/ty-article/israeli-election-poll-new-far-right-party-sinks-under-threshold-smotrich-gains/000001a1-505c-da7f-a7a5-dcffffe30000", publisher: "Haaretz", date: "2026-10-18" },
    ],
  },
  {
    id: "opec-plus-november-output-hold",
    title: "OPEC+ freezes quotas as Gulf exports run at 60-80% of normal",
    type: "energy",
    date: "2026-11-01",
    status: "scheduled",
    region: "Gulf",
    lat: 24.71, lon: 46.68,
    countries: ["SA", "RU", "IQ", "KW", "KZ", "DZ", "OM"],
    summary:
      "Seven core OPEC+ producers (Saudi Arabia 10.5 mb/d, Russia 9.9, Iraq 4.4, Kuwait 2.7, Kazakhstan 1.6, Algeria 1.0, Oman 0.8) keep November 2026 targets unchanged at a 4 October online meeting and next meet on 1 November. Actual output of about 25 mb/d in August remains roughly 5 mb/d below pre-war February levels because Gulf exports through Hormuz fluctuate at 60-80% of normal. Brent trades above $100 versus $73 before the war, and the capacity review needed to set 2027 quotas is delayed.",
    severity: 4,
    keywords: ["opec", "opec+", "oil", "brent", "saudi arabia", "hormuz", "output", "quotas", "crude", "riyadh", "iraq", "kazakhstan"],
    links: [
      { to: "gulf-war-energy-shock", kind: "responds_to", why: "Quotas are frozen because the Iran war, not policy, caps Gulf exports at 60-80% of normal.", via: "Hormuz export limits", driver: "gulf-energy-prices" },
      { to: "russia-record-budget-deficit-2026", kind: "affects", why: "Russia's 9.9 mb/d quota and Urals pricing set the oil-and-gas revenue line in a budget assuming $50 oil.", via: "Russian quota and Urals prices" },
      { to: "ecb-inflation-and-rates", kind: "affects", why: "Brent above $100 with no quota relief keeps euro-area inflation near 3.8% into the 29 October ECB meeting.", via: "crude prices into inflation", driver: "gulf-energy-prices" },
      { to: "china-q3-growth", kind: "affects", why: "Tight crude supply raises import costs for China, the largest buyer of Gulf and Russian oil.", via: "crude import costs", driver: "gulf-energy-prices" },
    ],
    sources: [
      { title: "OPEC+ Agrees to Keep November Oil Output Targets Steady", url: "https://www.themoscowtimes.com/2026/10/04/opec-agrees-to-keep-november-oil-output-targets-steady-a93865", publisher: "The Moscow Times / Reuters", date: "2026-10-04" },
      { title: "OPEC+ Keeps November 2026 oil output targets unchanged", url: "https://www.enerdata.net/publications/daily-energy-news/opec-keeps-november-2026-production-targets-unchanged-amid-supply-disruptions.html", publisher: "Enerdata", date: "2026-10-06" },
    ],
  },
  {
    id: "russia-record-budget-deficit-2026",
    title: "Russia doubles its 2026 deficit forecast as oil revenue falls 17%",
    type: "economy",
    date: "2026-10-29",
    status: "scheduled",
    region: "Russia",
    lat: 55.75, lon: 37.62,
    countries: ["RU"],
    summary:
      "Russia's government submits a three-year budget to the Duma on 1 October 2026 projecting a 2026 deficit of 7.345 trillion rubles ($88bn, 3.2% of GDP), nearly double the 3.785 trillion originally planned, with the first reading set for 29 October. The January-September deficit already reached 5.2 trillion rubles ($61bn) as oil-and-gas revenue fell 17.2% while spending rose 14.5%. Defence spending in 2027 rises 27% to a record 17.1 trillion rubles, more than a third of federal outlays, on a $50 oil baseline.",
    severity: 3,
    keywords: ["russia", "budget", "deficit", "duma", "oil and gas revenue", "sanctions", "defence spending", "ruble", "siluanov", "national wealth fund", "urals", "moscow"],
    links: [
      { to: "ukraine-summit-diplomacy", kind: "amplifies", why: "A deficit double the plan and a third of spending on defence raise the Kremlin's incentive to seek a Trump-Xi summit.", via: "Kremlin's money squeeze" },
      { to: "opec-plus-november-output-hold", kind: "affects", why: "Moscow needs higher quotas and prices; it pushes within OPEC+ to protect its 9.9 mb/d share.", via: "Moscow's lobbying inside OPEC+" },
      { to: "gulf-war-energy-shock", kind: "responds_to", why: "Brent above $100 cushions sanctioned Urals sales, yet constrained Russian flows still leave energy revenue down 17%.", via: "oil prices and sanctions discounts", driver: "gulf-energy-prices" },
    ],
    sources: [
      { title: "Government Submits 3-Year Budget to State Duma as 2026 Deficit Set to Reach $88Bln", url: "https://www.themoscowtimes.com/2026/10/01/government-submits-3-year-budget-to-state-duma-with-record-88bln-2026-deficit-a93836", publisher: "The Moscow Times", date: "2026-10-01" },
      { title: "Russian budget deficit total $61.1 bln in 9M 2026 — Finance Ministry", url: "https://tass.com/economy/2199975", publisher: "TASS", date: "2026-10-09" },
    ],
  },
];
