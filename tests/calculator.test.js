import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProfit } from '../src/services/calculator.js';

test('calculates harvest, revenue, costs, and net profit', () => {
  const result = calculateProfit({ area: 2, yieldPerArea: 500, pricePerUnit: 0.4, seedCosts: 20, fertilizerCosts: 30, otherCosts: 10 });
  assert.equal(result.estimatedHarvest, 1000);
  assert.equal(result.grossRevenue, 400);
  assert.equal(result.totalCosts, 60);
  assert.equal(result.netProfit, 340);
  assert.equal(result.breakEvenPrice, 0.06);
});
