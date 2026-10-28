export function calculateProfit(input) {
  const area = Number(input.area) || 0;
  const yieldPerArea = Number(input.yieldPerArea) || 0;
  const price = Number(input.pricePerUnit) || 0;
  const harvest = area * yieldPerArea;
  const totalCosts = ['seedCosts', 'fertilizerCosts', 'cropProtectionCosts', 'laborCosts', 'irrigationCosts', 'transportCosts', 'otherCosts'].reduce((sum, key) => sum + (Number(input[key]) || 0), 0);
  const grossRevenue = harvest * price;
  return { estimatedHarvest: harvest, grossRevenue, totalCosts, netProfit: grossRevenue - totalCosts, costPerUnit: harvest ? totalCosts / harvest : 0, breakEvenPrice: harvest ? totalCosts / harvest : 0 };
}
