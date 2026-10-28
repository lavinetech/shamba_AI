import { query, pool } from './pool.js';

const guides = [
  ['maize-cultivation', 'Maize cultivation', 'Crops', 'A practical starting framework for planning maize production.', { soil: 'Well-drained soil with good organic matter.', planting: 'Use locally recommended seed and planting windows.', care: 'Monitor weeds, water stress, and pests regularly.', safety: 'Confirm products and rates against the local label.' }],
  ['soil-preparation', 'Soil preparation', 'Soil health', 'General steps for preparing land while protecting soil structure.', { soil: 'Test soil when possible before applying amendments.', planting: 'Avoid working wet soil to reduce compaction.', care: 'Retain residue and use compost where suitable.', safety: 'Use protective equipment when handling inputs.' }],
  ['integrated-pest-management', 'Integrated pest management', 'Crop protection', 'Combine monitoring, cultural practices, biological controls, and labelled products.', { soil: 'Healthy plants can better tolerate pressure.', planting: 'Choose adapted varieties where verified.', care: 'Scout and record symptoms before acting.', safety: 'Follow the approved product label and pre-harvest interval.' }]
];
for (const [slug, title, category, overview, content] of guides) {
  await query('INSERT INTO farming_guides (slug,title,category,overview,content) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (slug) DO NOTHING', [slug, title, category, overview, content]);
}
console.log('Seed guides are ready.');
await pool.end();
