const pricing = require('../config/pricing.json');

function round2(n) {
  return Math.round(n * 100) / 100;
}

function calcQuote({ propertyId, bed, bath, tierId, addonIds = [], freqId }) {
  const property = pricing.properties.find(p => p.id === propertyId) || pricing.properties[0];
  const tier = pricing.tiers.find(t => t.id === tierId) || pricing.tiers[0];
  const freq = pricing.frequencies.find(f => f.id === freqId) || pricing.frequencies[0];
  const addons = pricing.addons.filter(a => (addonIds || []).includes(a.id));

  const bedN = Math.max(0, Number(bed) || 0);
  const bathN = Math.max(pricing.minBathrooms || 1, Number(bath) || 1);
  const rooms = bedN + bathN;

  const subtotal = (tier.base + rooms * tier.ratePerRoom) * property.multiplier;
  const addonTotal = addons.reduce((s, a) => s + a.price, 0);
  const raw = subtotal + addonTotal;
  const discount = raw * freq.discount;
  const total = round2(raw - discount);

  return {
    property, tier, freq, addons,
    bed: bedN, bath: bathN,
    breakdown: {
      subtotal: round2(subtotal),
      addonTotal: round2(addonTotal),
      discount: round2(discount)
    },
    total,
    currency: pricing.currency
  };
}

module.exports = { calcQuote, pricing };
