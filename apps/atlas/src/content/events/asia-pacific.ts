import type { WorldEvent } from "../events";

// Asia-Pacific. Researched 19 Oct 2026; every source URL was fetched when the entry was written.
export const ASIA_PACIFIC: WorldEvent[] = [
  {
    id: "apec-shenzhen-2026",
    title: "Trump heads to Xi's APEC summit in Shenzhen, 18-19 Nov",
    type: "diplomacy",
    date: "2026-11-18",
    status: "scheduled",
    region: "China",
    lat: 22.54, lon: 114.06,
    countries: ["CN", "US", "JP", "KR", "TW", "AU", "ID", "VN", "PH"],
    summary:
      "China hosts the APEC Economic Leaders' Meeting in Shenzhen on 18-19 November 2026, its first time as host since 2014, and Trump plans to attend. It follows Xi's three-day state visit to Washington that ended 25 September with a declared 'constructive relationship of strategic stability' but few concrete trade deliverables. As host, Beijing controls the agenda and will use the summit to press for tariff relief, while Trump says he 'may' also meet Kim Jong Un on the trip.",
    severity: 4,
    keywords: ["apec", "shenzhen", "xi jinping", "trump", "summit", "tariffs", "trade truce", "rare earths", "guangdong", "us-china", "leaders meeting"],
    links: [
      { to: "china-q3-growth", kind: "affects", why: "Beijing arrives as host with export-led 4.5% growth and weak domestic demand, so any tariff relief it wins from Trump in Shenzhen would shape its export outlook.", via: "hoped-for US tariff relief", driver: "us-trade-policy" },
      { to: "north-korea-missile-tests-2026", kind: "affects", why: "Trump says he may meet Kim during the Shenzhen trip, giving Pyongyang's October launches direct bargaining value.", via: "prospect of a Trump-Kim meeting", driver: "trump-summitry" },
      { to: "ukraine-summit-diplomacy", kind: "affects", why: "A Trump-Xi face-to-face in Shenzhen is the nearest venue for the Trump-Xi-Putin summit Moscow is seeking.", via: "Trump-Xi meeting as venue", driver: "trump-summitry" },
      { to: "south-china-sea-incidents-2026", kind: "affects", why: "Beijing's incentive to look like a stable host before 18 November may restrain or redirect coast-guard pressure on Manila.", via: "Beijing's wish to look stable", driver: "trump-summitry" },
    ],
    sources: [
      { title: "Trump says he 'may' meet N. Korean leader Kim during upcoming Asia trip", url: "https://www.koreatimes.co.kr/foreignaffairs/northkorea/20261013/trump-says-he-may-meet-n-korean-leader-kim-during-upcoming-asia-trip", publisher: "The Korea Times / Yonhap", date: "2026-10-13" },
      { title: "3 top reasons Trump will face a stronger Xi Jinping at November Apec forum in China", url: "https://www.scmp.com/news/china/diplomacy/article/3368914/3-top-reasons-trump-will-face-stronger-xi-jinping-november-apec-forum-china", publisher: "South China Morning Post", date: "2026-09-26" },
    ],
  },
  {
    id: "boj-october-decision-2026",
    title: "BoJ meets 30 Oct with rates at a 31-year high, yen near 158",
    type: "markets",
    date: "2026-10-30",
    status: "scheduled",
    region: "Japan",
    lat: 35.68, lon: 139.69,
    countries: ["JP", "US"],
    summary:
      "The Bank of Japan concludes its two-day meeting on 30 October with the policy rate at 1.25%, the highest since April 1995 after a 7-2 vote to hike on 18 September, the shortest gap between hikes since 1990. Markets expect a hold but watch for guidance toward 1.5% as early as December; Governor Ueda says underlying inflation is 'quite close' to 2% and flags elevated crude oil as an upside risk. USD/JPY trades near 158 as the Quarterly Outlook Report lands the same day.",
    severity: 3,
    keywords: ["bank of japan", "boj", "ueda", "rate hike", "yen", "jgb", "inflation", "quarterly outlook", "usd/jpy", "tokyo", "japan"],
    links: [
      { to: "gulf-war-energy-shock", kind: "responds_to", why: "Japan imports nearly all its crude, so Hormuz-driven oil prices feed the inflation upside risk the BoJ board flagged in September.", via: "imported crude costs", driver: "gulf-energy-prices" },
      { to: "ecb-inflation-and-rates", kind: "shares_driver", why: "ECB decides 29 October and BoJ 30 October, both weighing energy-driven inflation above target against slowing growth.", via: "energy-driven inflation", driver: "gulf-energy-prices" },
      { to: "france-debt-stress", kind: "affects", why: "Rising JGB yields pull Japanese investors, among the largest foreign holders of French OATs, back home and lift France's funding costs.", via: "Japanese money flowing home", driver: "sovereign-debt-markets" },
    ],
    sources: [
      { title: "Japan Interest Rate", url: "https://tradingeconomics.com/japan/interest-rate", publisher: "Trading Economics", date: "2026-10-19" },
      { title: "Japanese Yen holds steady near 158.00 as BoJ's Ueda says underlying inflation close to target", url: "https://www.fxstreet.com/news/japanese-yen-holds-steady-near-15800-as-bojs-ueda-says-underlying-inflation-close-to-target-202610190652", publisher: "FXStreet", date: "2026-10-19" },
    ],
  },
  {
    id: "india-us-trade-deal-2026",
    title: "Rubio in Mumbai as US-India trade deal nears signing",
    type: "trade",
    date: "2026-10-20",
    status: "developing",
    region: "India",
    lat: 28.61, lon: 77.21,
    countries: ["IN", "US", "RU"],
    summary:
      "US Secretary of State Marco Rubio says Washington is 'very close' to finalising a trade deal with India and meets External Affairs Minister Jaishankar in Mumbai on 20 October before visiting the Jamnagar refinery on 21 October. The February 2026 framework cut the US reciprocal tariff on Indian goods from 25% to 18% and removed a separate 25% penalty tied to Russian oil, but the first tranche is still in legal drafting and USTR Greer said on 2 October a deal was not imminent. Rubio explicitly ties US waivers on Russian-energy sanctions to the trade talks.",
    severity: 3,
    keywords: ["india", "trade deal", "rubio", "jaishankar", "tariffs", "russian oil", "sanctions waiver", "jamnagar", "goyal", "greer", "new delhi", "mumbai"],
    links: [
      { to: "gulf-war-energy-shock", kind: "responds_to", why: "With Hormuz flows disrupted, India cannot easily replace Russian crude, so Rubio links sanctions waivers to closing the trade deal.", via: "India's need for Russian crude", driver: "gulf-energy-prices" },
      { to: "china-q3-growth", kind: "competes_with", why: "An 18% US tariff on Indian goods competes directly with China's export-led 4.5% growth for US import share.", via: "share of US imports", driver: "us-trade-policy" },
      { to: "apec-shenzhen-2026", kind: "shares_driver", why: "Both are stops in Trump's pre-midterm push to lock in bilateral tariff deals before the Shenzhen summit.", via: "Trump's bilateral tariff deals", driver: "us-trade-policy" },
    ],
    sources: [
      { title: "US Close To Finalising Trade Deal With India: Marco Rubio Day Before Mumbai Visit", url: "https://www.etvbharat.com/en/business/close-to-finalising-trade-deal-with-india-marco-rubio-day-before-mumbai-visit-enn26101901587", publisher: "ETV Bharat", date: "2026-10-19" },
      { title: "Implications of US-India Trade Announcements", url: "https://www.stimson.org/2026/implications-of-us-india-trade-announcements/", publisher: "Stimson Center", date: "2026-02-15" },
    ],
  },
  {
    id: "north-korea-missile-tests-2026",
    title: "North Korea tests sub-launched missiles after Trump offer",
    type: "security",
    date: "2026-10-14",
    status: "developing",
    region: "North Korea",
    lat: 39.02, lon: 125.75,
    countries: ["KP", "KR", "US", "JP", "CN", "RU"],
    summary:
      "North Korea fires two types of submarine-launched strategic cruise missiles off its east coast on 14 October, including a Pulhwasal-3-31, its first reported sub-launched cruise test since January 2024. It caps a month of launches: a hypersonic intermediate-range missile on 3 October and two ballistic missiles on 12 October that flew more than 560 miles, days after South Korea's first hypersonic test and a DMZ landmine blast that wounded three South Korean soldiers. Trump said on 12 October he 'may' meet Kim during his November Asia trip.",
    severity: 3,
    keywords: ["north korea", "kim jong un", "missile", "submarine-launched", "cruise missile", "hypersonic", "pulhwasal", "kcna", "dmz", "pyongyang", "lee jae myung"],
    links: [
      { to: "apec-shenzhen-2026", kind: "responds_to", why: "The launches came two days after Trump said he may meet Kim on the Shenzhen trip, raising Pyongyang's price for talks.", via: "raising the price for talks", driver: "trump-summitry" },
      { to: "ukraine-summit-diplomacy", kind: "shares_driver", why: "Kim and Putin are both angling for a Trump summit, and Pyongyang's troops-for-technology alliance with Moscow ties their bargaining together.", via: "bids for a Trump summit", driver: "trump-summitry" },
      { to: "south-china-sea-incidents-2026", kind: "shares_driver", why: "Both test US alliance resolve in Northeast and Southeast Asia while Trump pursues summitry with Xi and Kim.", via: "testing US alliance resolve", driver: "trump-summitry" },
    ],
    sources: [
      { title: "North Korea tests two submarine-launched missiles, state media reports", url: "https://www.aljazeera.com/news/2026/10/15/north-korea-tests-two-submarine-launched-missiles-state-media-reports", publisher: "Al Jazeera", date: "2026-10-15" },
      { title: "North Korea fires cruise missiles from a submarine as October launches mount", url: "https://www.stripes.com/theaters/asia_pacific/2026-10-15/north-korea-submarine-launched-cruise-missiles-23160219.html", publisher: "Stars and Stripes", date: "2026-10-15" },
    ],
  },
  {
    id: "south-china-sea-incidents-2026",
    title: "Philippine-Chinese clashes spike across the South China Sea",
    type: "security",
    date: "2026-10-09",
    status: "developing",
    region: "Philippines",
    lat: 15.15, lon: 117.76,
    countries: ["PH", "CN", "TW", "US"],
    summary:
      "At least six dangerous encounters between Philippine and Chinese forces occur between 1 and 9 October at Scarborough Shoal, Second Thomas Shoal, the Spratlys and a new flashpoint off Batanes in the Luzon Strait, where Taiwan sent three coast guard boats as a China Coast Guard cutter escorted a survey ship near its EEZ. A PLA J-16 closes on a Philippine Cessna 208 on 3 October, Chinese ships block a Philippine patrol within 9 metres on 4 October, and China Coast Guard harassment delays a medevac from BRP Sierra Madre. In September Beijing blocked a Sierra Madre resupply for the first time since the June 2024 provisional arrangement.",
    severity: 3,
    keywords: ["south china sea", "philippines", "china coast guard", "scarborough shoal", "second thomas shoal", "sierra madre", "spratlys", "batanes", "luzon strait", "maritime militia", "manila", "taiwan"],
    links: [
      { to: "apec-shenzhen-2026", kind: "affects", why: "Continued coast-guard coercion while Beijing prepares to host Trump tests whether summitry restrains Chinese behaviour at sea.", via: "coast-guard pressure before the summit", driver: "trump-summitry" },
      { to: "north-korea-missile-tests-2026", kind: "shares_driver", why: "Both are US-allied frontline states facing escalation as Trump seeks deals with Xi and Kim in November.", via: "frontline pressure on US allies", driver: "trump-summitry" },
    ],
    sources: [
      { title: "Philippine and Chinese Incidents Spike in South China Sea, Luzon Strait", url: "https://news.usni.org/2026/10/09/philippine-and-chinese-incidents-spike-in-south-china-sea-luzon-strait", publisher: "USNI News", date: "2026-10-09" },
      { title: "Philippines accuses China of harassing patrols in disputed waters", url: "https://www.arabnews.com/world/philippines-accuses-china-of-harassing-patrols-in-disputed-waters-3004551", publisher: "Arab News / AFP", date: "2026-10-04" },
    ],
  },
];
