// Drivers: the underlying forces that push several events at once. A dotted line between two
// events names one; readers can follow a driver instead of chasing each event it moves.

export interface Driver {
  id: string;
  name: string; // 2-5 words
  what: string; // one plain sentence
  how: string; // how it moves events: prices, votes, money
  watch: string; // one signal to follow
}

export const DRIVERS: Driver[] = [
  { id: "gulf-energy-prices", name: "Gulf war energy prices",
    what: "The war with Iran has cut how much oil and gas can leave the Gulf, so fuel costs more almost everywhere.",
    how: "Brent above $100 pushes up diesel, freight and heating bills, which lifts inflation, squeezes household budgets and moves oil money between countries.",
    watch: "Brent crude above $100 a barrel" },
  { id: "cost-of-living-squeeze", name: "Cost-of-living squeeze",
    what: "Prices, rents and mortgage costs are rising faster than most people's pay.",
    how: "When wages buy less, people march, strike and vote against whoever is in charge.",
    watch: "Euro-area inflation (3.8% in September) staying above wage growth" },
  { id: "us-trade-policy", name: "US tariffs and market access",
    what: "The US is using tariffs, import bans and trade deals to decide who can sell to American buyers and on what terms.",
    how: "Each tariff change moves prices for US shoppers, export orders for China, India, Canada and Mexico, and the bargaining at every summit.",
    watch: "New Section 338 or Section 232 tariff proclamations" },
  { id: "sovereign-debt-markets", name: "Sovereign debt and bond markets",
    what: "Governments borrow by selling bonds, and investors charge more interest to the ones they trust less.",
    how: "A wider spread raises a government's interest bill, leaves less money for everything else and can trigger downgrades or central-bank rescues.",
    watch: "French-German 10-year spread above 150 basis points" },
  { id: "us-attention-backing", name: "US attention and backing",
    what: "Washington can only put its time, money, weapons and political support into so many places at once.",
    how: "Where the US sends aid, intelligence, oil licences or endorsements changes who wins wars, elections and negotiations.",
    watch: "New US aid packages, endorsements or sanctions waivers" },
  { id: "europe-right-surge", name: "Europe's right-wing surge",
    what: "Nationalist right-wing parties lead the polls in several European countries ahead of 2027 votes.",
    how: "Their poll leads make governments rush deals before elections and put Ukraine aid, the EU budget and green rules up for renegotiation.",
    watch: "National Rally polling above 35% in France" },
  { id: "eu-green-deal-rules", name: "EU Green Deal rules",
    what: "The EU is making importers prove their goods did not cause deforestation and pay for the carbon in steel and aluminium.",
    how: "New paperwork and carbon charges from December 2026 raise costs for anyone selling into Europe and give anti-Brussels politicians a target.",
    watch: "Any EU vote to delay the 30 December 2026 EUDR start" },
  { id: "red-sea-rivalry", name: "Red Sea power contest",
    what: "Egypt, Ethiopia, Eritrea, Sudan and the Gulf states are competing for ports, water and influence around the Red Sea.",
    how: "Each side backs allies and proxies, so a fight in one country pulls in arms, money and refugees from its neighbours.",
    watch: "Troop moves or fighting near the Eritrean port of Assab" },
  { id: "trump-summitry", name: "Trump's summit deal-making",
    what: "Trump is seeking face-to-face deals with Xi, Putin and Kim, and both rivals and allies are positioning around those meetings.",
    how: "Leaders time missile tests, sea clashes or shows of calm to raise their price or look reliable before a meeting.",
    watch: "A confirmed date for a Trump-Kim or Trump-Xi-Putin meeting" },
  { id: "compliance-capacity", name: "Firms' compliance capacity",
    what: "Companies have limited staff, time and money to redo paperwork and switch suppliers when trade rules change.",
    how: "Overlapping deadlines force firms to choose which market's rules to meet first, raising costs and shifting where they buy.",
    watch: "USMCA comments due 12 January and CBAM certificate sales opening 1 February 2027" },
];

export function getDriver(id?: string): Driver | undefined {
  return id ? DRIVERS.find((d) => d.id === id) : undefined;
}
