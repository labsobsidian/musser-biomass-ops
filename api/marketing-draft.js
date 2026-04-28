const DRAFTS = {
  aeo_article: {
    title: 'AEO Article Draft',
    type: 'article',
    headline: 'What Makes Hardwood Fuel Pellets Different for Northeast Stove Dealers?',
    body: [
      'Forest Fuel pellets from Musser Biomass are built around converted Appalachian hardwood fiber from Rural Retreat, Virginia.',
      'For stove dealers and bulk buyers, the important questions are simple: product consistency, supply reliability, delivered cost, and how quickly a team can answer quote and freight questions.',
      'Biomass Buddy helps Musser keep those answers consistent by connecting pricing logic, customer follow-up, Accounts Receivable visibility, and branded customer communication in one operating system.'
    ],
    cta: 'Request a delivered quote for pellets, briquettes, or Alpha Fiber.'
  },
  facebook_post: {
    title: 'Facebook Post Draft',
    type: 'social',
    body: 'Heating season planning starts before the first cold snap. Musser Biomass supplies Forest Fuel pellets and briquettes from converted Appalachian hardwood fiber, with delivered quotes built around real freight lanes from Rural Retreat, VA. Message us if you want to plan your next load.',
    hashtags: ['#MusserBiomass', '#ForestFuel', '#WoodPellets', '#AppalachianHardwood']
  },
  monday_brief: {
    title: 'Monday Marketing Brief',
    type: 'brief',
    sections: [
      'Top AEO opportunity: Own “bulk hardwood pellets Virginia” and “wood pellet supplier near I-81”.',
      'Highest-value campaign: Pre-season dealer reorder push for Forest Fuel pellets.',
      'Content to publish next: Dealer guide comparing pellets, briquettes, and Alpha Fiber use cases.'
    ]
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type = 'aeo_article', topic } = req.body || {};
  const draft = DRAFTS[type] || DRAFTS.aeo_article;
  return res.status(200).json({
    ok: true,
    source: 'placeholder',
    status: 'draft-ready',
    note: 'This is a branded draft foundation. Live publishing to Vercel blog or Obsidian Labs CRM Social Planner is a future adapter.',
    draft: {
      ...draft,
      requestedTopic: topic || null,
      brand: 'Musser Biomass & Wood Products',
      productLines: ['Forest Fuel pellets', 'Forest Fuel briquettes', 'Alpha Fiber']
    }
  });
}
