import type { WorldEvent } from "../events";

// The Americas. Researched 19 Oct 2026; every source URL was fetched when the entry was written.
export const AMERICAS: WorldEvent[] = [
  {
    id: "us-midterms-2026",
    title: "US midterms: House tilts Democratic, Senate a toss-up",
    type: "election",
    date: "2026-11-03",
    status: "scheduled",
    region: "United States",
    lat: 38.9072, lon: -77.0369,
    countries: ["US"],
    summary:
      "Americans vote on 3 November 2026 for all 435 House seats, 35 Senate seats and 39 governorships in Donald Trump's second-term midterm. Polling averages give Democrats a roughly 7-point generic-ballot lead; Fox News Power Rankings (13 Oct) rate Democrats favoured in at least 219 House seats with 18 toss-ups, while the Senate stands 47-47 with six toss-up states deciding control. Gasoline, diesel and grocery price rises since the Iran war began on 28 February are the dominant issue, alongside mid-cycle redistricting fights.",
    severity: 4,
    keywords: ["midterms", "house", "senate", "trump", "generic ballot", "democrats", "republicans", "toss-up", "redistricting", "gas prices", "november 3"],
    links: [
      { to: "gulf-war-energy-shock", kind: "responds_to", why: "Iran-war gasoline and diesel spikes feed the cost-of-living anger that pollsters say is driving the Democratic generic-ballot lead.", via: "gasoline and diesel prices", driver: "gulf-energy-prices" },
      { to: "us-canada-trade-war", kind: "responds_to", why: "Tariff pass-through on groceries and building materials is a cost-of-living liability for House Republicans in Rust Belt toss-ups.", via: "tariff pass-through on prices", driver: "us-trade-policy" },
      { to: "ukraine-summit-diplomacy", kind: "affects", why: "A Democratic House seated in January would constrain Trump's leverage over Ukraine aid in any Putin-Trump-Xi summit bargain.", via: "House control of Ukraine aid", driver: "us-attention-backing" },
    ],
    sources: [
      { title: "Fox News Power Rankings: As the House falls, the Senate stays in play", url: "https://www.foxnews.com/politics/fox-news-power-rankings-house-falls-senate-stays-play", publisher: "Fox News", date: "2026-10-13" },
      { title: "2026 United States elections", url: "https://en.wikipedia.org/wiki/2026_United_States_elections", publisher: "Wikipedia", date: "2026-10-19" },
    ],
  },
  {
    id: "brazil-runoff-2026",
    title: "Brazil run-off: Flávio Bolsonaro edges Lula in polls",
    type: "election",
    date: "2026-10-25",
    status: "scheduled",
    region: "Brazil",
    lat: -15.7939, lon: -47.8828,
    countries: ["BR"],
    summary:
      "Brazil's presidential run-off on 25 October pits Senator Flávio Bolsonaro, 42, against incumbent Lula, 80, after the first round on 4 October gave Bolsonaro 56.1 million votes (about 47%) to Lula's 53.9 million (about 44.9%). Final-week polls put Bolsonaro ahead by 1-2 points (CNT/MDA 46.8-45.9, Quaest 46-44, Datafolha 47-45), all within the margin of error. Bolsonaro campaigns on a crime crackdown and tax cuts while his father Jair serves a 27-year sentence under house arrest.",
    severity: 4,
    keywords: ["brazil", "run-off", "lula", "flávio bolsonaro", "bolsonaro", "datafolha", "quaest", "second round", "brasília", "crime", "october 25"],
    links: [
      { to: "eu-supply-chain-rules-2027", kind: "affects", why: "EUDR deforestation checks on Brazilian soy, beef and coffee bite in 2027; the winner sets Brazil's compliance and Mercosur stance.", via: "Brazil's EUDR compliance stance", driver: "eu-green-deal-rules" },
      { to: "venezuela-oil-reopening", kind: "shares_driver", why: "US intervention in Caracas and support for Bolsonaro are the same push to realign Latin America rightward.", via: "US backing for Latin America's right", driver: "us-attention-backing" },
    ],
    sources: [
      { title: "Latest poll shows Bolsonaro maintaining edge over Lula in Brazil run-off", url: "https://www.aljazeera.com/news/2026/10/16/latest-poll-shows-bolsonaro-maintaining-edge-over-lula-in-brazil-run-off", publisher: "Al Jazeera", date: "2026-10-16" },
      { title: "Brazil's presidential race: Three key takeaways from the first round", url: "https://www.aljazeera.com/news/2026/10/5/brazils-presidential-race-three-key-takeaways-from-the-first-round", publisher: "Al Jazeera", date: "2026-10-05" },
    ],
  },
  {
    id: "us-canada-trade-war",
    title: "US bans Canadian dairy and alcohol as tariff war escalates",
    type: "trade",
    date: "2026-09-29",
    status: "developing",
    region: "Canada",
    lat: 45.4215, lon: -75.6972,
    countries: ["CA", "US"],
    summary:
      "US-Canada trade talks collapsed on 22 August after Washington imposed 50% Section 338 tariffs on about $20 billion of Canadian goods (wine, furniture, dairy, cement, clothing), and Prime Minister Mark Carney answered with dollar-for-dollar counter-tariffs on US steel, dairy, appliances and farm equipment from 8 September. On 8 September Trump signed five proclamations converting the 50% duties on Canadian alcohol and dairy into outright import bans effective 29 September and ordering Canadian products off GSA procurement schedules. Section 338 duties apply regardless of USMCA origin and stack on Section 232 steel, aluminium, auto and lumber tariffs.",
    severity: 3,
    keywords: ["canada", "tariffs", "carney", "trump", "section 338", "import ban", "dairy", "retaliation", "counter-tariffs", "steel", "trade war", "ottawa"],
    links: [
      { to: "usmca-annual-review-2027", kind: "shares_driver", why: "The US refusal to renew USMCA on 1 July and the August talks collapse are one confrontation now channelled into yearly reviews.", via: "Washington's trade confrontation", driver: "us-trade-policy" },
      { to: "us-midterms-2026", kind: "affects", why: "Tariffs and bans raise US prices for cheese, lumber and appliances, a cost-of-living issue weeks before the 3 November vote.", via: "tariff-driven consumer prices", driver: "us-trade-policy" },
      { to: "alberta-independence-vote", kind: "amplifies", why: "US tariffs and bans on Canadian goods sharpen Alberta grievances about Ottawa's handling of trade and energy market access.", via: "Alberta grievances with Ottawa", driver: "us-trade-policy" },
    ],
    sources: [
      { title: "Fact Sheet: President Donald J. Trump Responds to Canada's Retaliation", url: "https://www.whitehouse.gov/fact-sheets/2026/09/fact-sheet-president-donald-j-trump-responds-to-canadas-retaliation/", publisher: "The White House", date: "2026-09-08" },
      { title: "Canada to hit US with retaliatory tariffs as trade war escalates", url: "https://www.aljazeera.com/news/2026/8/23/canada-to-hit-us-with-retaliatory-tariffs-as-trade-war-escalates", publisher: "Al Jazeera", date: "2026-08-23" },
    ],
  },
  {
    id: "usmca-annual-review-2027",
    title: "USMCA not renewed; yearly reviews begin, comments due 12 Jan",
    type: "trade",
    date: "2027-01-12",
    status: "scheduled",
    region: "Mexico",
    lat: 19.4326, lon: -99.1332,
    countries: ["US", "MX", "CA"],
    summary:
      "At the first USMCA joint review on 1 July 2026 the United States declined to confirm a 16-year extension, so under Article 34.7 the pact stays in force only to 1 July 2036 and must now be reviewed every year. USTR opened the 2027 review on 2 October with written comments and hearing requests due 12 January 2027; US demands centre on auto rules of origin, Chinese content, steel, dairy and trade deficits. Mexico, whose surplus with the US rose 51% to over $280 billion in the year to August, has pledged on 13 October to buy more American goods to secure a bilateral deal.",
    severity: 3,
    keywords: ["usmca", "t-mec", "cusma", "joint review", "ustr", "rules of origin", "sheinbaum", "greer", "trade deficit", "federal register", "autos", "mexico"],
    links: [
      { to: "us-canada-trade-war", kind: "shares_driver", why: "Washington uses non-renewal and Section 338 tariffs as twin levers to force Canadian and Mexican concessions.", via: "Washington's twin trade levers", driver: "us-trade-policy" },
      { to: "china-q3-growth", kind: "affects", why: "US demands on Chinese content and transshipment target the export surge behind China's 4.5% Q3 growth.", via: "rules on Chinese content", driver: "us-trade-policy" },
    ],
    sources: [
      { title: "USMCA Review 2026: Not Renewed, Still in Force", url: "https://mayo.law/articles/updates/usmca-joint-review/", publisher: "Mayo Law", date: "2026-10-07" },
      { title: "Mexico Enters New Phase: USMCA Continuity and Annual Review with the U.S. and Canada", url: "https://www.hklaw.com/en/insights/publications/2026/07/mexico-ante-una-nueva-etapa-continuidad-del-tmec", publisher: "Holland & Knight", date: "2026-07-02" },
    ],
  },
  {
    id: "venezuela-oil-reopening",
    title: "Venezuela touts $76bn oil investment under US-backed interim rule",
    type: "energy",
    date: "2026-10-17",
    status: "developing",
    region: "Venezuela",
    lat: 10.4806, lon: -66.9036,
    countries: ["VE", "US"],
    summary:
      "Acting president Delcy Rodríguez, who has led Venezuela since US forces captured Nicolás Maduro on 3 January 2026, told an energy conference in Maracaibo on 17 October that 61 signed agreements (17 with the United States) should bring nearly $76 billion of oil investment over five years, with 44 more deals worth about $12 billion in talks. A US-Venezuela deal announced by Trump on 28 August covers 17 fields; US General License 50C licenses BP, Chevron, Eni, Maurel & Prom, Repsol and Shell while excluding China, Russia and Iran. Venezuela reported 1.206 million barrels a day in September, up about 30% this year.",
    severity: 3,
    keywords: ["venezuela", "delcy rodríguez", "maduro", "pdvsa", "chevron", "oil investment", "hydrocarbons", "general license", "maracaibo", "heavy crude", "sanctions", "caracas"],
    links: [
      { to: "gulf-war-energy-shock", kind: "responds_to", why: "Washington is fast-tracking Venezuelan heavy crude to Gulf Coast refineries to offset Hormuz disruption and lower US diesel prices.", via: "Venezuelan heavy crude supply", driver: "gulf-energy-prices" },
      { to: "us-midterms-2026", kind: "affects", why: "Trump bills the 28 August Venezuela oil deal as fuel-price relief before 3 November; high pump prices are hurting Republicans.", via: "promised pump-price relief", driver: "gulf-energy-prices" },
      { to: "brazil-runoff-2026", kind: "shares_driver", why: "The Caracas intervention and Trump's backing of Bolsonaro are the same US push to realign Latin American governments.", via: "US backing for Latin America's right", driver: "us-attention-backing" },
    ],
    sources: [
      { title: "Venezuela Sees US$76 Billion Oil Investment", url: "https://www.riotimesonline.com/venezuela-oil-investment-76-billion-five-years-2026/", publisher: "The Rio Times", date: "2026-10-18" },
      { title: "Venezuela secures oil investment agreements worth nearly 76 billion USD", url: "https://vovworld.vn/news/venezuela-secures-oil-investment-agreements-worth-nearly-76-billion-usd-2473681.vov5", publisher: "VOV World", date: "2026-10-18" },
    ],
  },
];
