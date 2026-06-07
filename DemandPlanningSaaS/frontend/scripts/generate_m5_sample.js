const fs = require('fs');

const CATEGORIES = ['FOODS', 'HOBBIES', 'HOUSEHOLD'];
const STATES = ['CA', 'TX', 'WI'];
const STORES_PER_STATE = 2; // e.g. CA_1, CA_2
const DAYS_HISTORY = 90;
const DAYS_FORECAST = 15;

const TOTAL_SKUS_TARGET = 250;
let skus_generated = 0;

// Helper to generate a zero-inflated poisson-like count
function generatePoisson(lambda, zeroInflationProb) {
   if (Math.random() < zeroInflationProb) return 0;
   
   // Simple Knuth Poisson generator
   let L = Math.exp(-lambda);
   let k = 0;
   let p = 1.0;
   do {
       k++;
       p *= Math.random();
   } while (p > L && k < 100);
   return k - 1;
}

const skus = [];

while (skus_generated < TOTAL_SKUS_TARGET) {
   const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
   const state = STATES[Math.floor(Math.random() * STATES.length)];
   const storeIdx = Math.floor(Math.random() * STORES_PER_STATE) + 1;
   
   let deptId;
   if (category === 'FOODS') deptId = Math.floor(Math.random() * 3) + 1; // 1-3
   else if (category === 'HOBBIES') deptId = Math.floor(Math.random() * 2) + 1; // 1-2
   else deptId = Math.floor(Math.random() * 2) + 1; // 1-2
   
   const itemId = Math.floor(Math.random() * 100).toString().padStart(3, '0');
   
   const skuId = `${category}_${deptId}_${itemId}_${state}_${storeIdx}`;
   const skuName = `${category} Dept ${deptId} Item ${itemId}`;

   // Assign a typical volume profile
   const profileTypeRand = Math.random();
   let type, lambda, zeroProb;
   
   if (profileTypeRand < 0.3) {
      type = 'intermittent'; // very heavy zeros
      lambda = 1.2;
      zeroProb = 0.6;
   } else if (profileTypeRand < 0.6) {
      type = 'slow-moving'; // few sales
      lambda = 2.5;
      zeroProb = 0.3;
   } else if (profileTypeRand < 0.85) {
      type = 'fast-moving'; // high volume consistently
      lambda = 12.0;
      zeroProb = 0.05;
   } else {
      type = 'volatile'; // wild swings
      lambda = 6.0;
      zeroProb = 0.2;
   }

   // Generate historical data
   const historicalData = [];
   const forecastData = [];
   
   let baseLambda = lambda;

   for (let i = 0; i < DAYS_HISTORY; i++) {
       // Add some weak weekend seasonality (i%7 == 5 or 6 -> weekend boost in retail)
       let dailyLambda = baseLambda * ((i % 7 === 5 || i % 7 === 6) ? 1.4 : 0.9);
       if (type === 'volatile' && Math.random() > 0.95) dailyLambda *= 3; // random spikes
       
       historicalData.push({
           date: `Day -${DAYS_HISTORY - i}`,
           actual: generatePoisson(dailyLambda, zeroProb),
           forecast: generatePoisson(dailyLambda, zeroProb) // fitted
       });
   }
   
   for (let i = 0; i < DAYS_FORECAST; i++) {
       let dailyLambda = baseLambda * (((DAYS_HISTORY + i) % 7 === 5 || (DAYS_HISTORY + i) % 7 === 6) ? 1.4 : 0.9);
       let predicted = generatePoisson(dailyLambda, zeroProb);
       let lower = Math.max(0, Math.floor(predicted * 0.7));
       let upper = Math.ceil(predicted * 1.3) + 1;
       
       forecastData.push({
           date: `Day +${i + 1}`,
           forecast: predicted,
           lower_bound: lower,
           upper_bound: upper
       });
   }
   
   const unitCost = Math.floor(Math.random() * 50) + 5;
   const asp = Math.floor(unitCost * (1.2 + Math.random()));
   const onHand = Math.floor(Math.random() * 500);
   const inTransit = Math.floor(Math.random() * 200);
   const supplyCapacity = 2000;
   
   skus.push({
      id: skuId,
      name: skuName,
      category: category,
      type: type,
      base: lambda,
      unitCost: unitCost,
      asp: asp,
      aopVolume: lambda * 365,
      supplyCapacity: supplyCapacity,
      holdingCostPct: 0.15 + (Math.random() * 0.1),
      onHand: onHand,
      inTransit: inTransit,
      leadTime: 30 + Math.floor(Math.random() * 15),
      leadTimeStdDev: 5 + Math.floor(Math.random() * 5),
      cv: 0.5 + Math.random(),
      adi: 1.0 + Math.random(),
      sysMape: 12.0 + Math.random() * 15.0,
      humMape: 15.0 + Math.random() * 15.0,
      overrideRate: Math.floor(Math.random() * 50),
      historicalData,
      forecastData
   });
   
   skus_generated++;
}

// deduplicate theoretically identical IDs
const uniqueSkus = Array.from(new Map(skus.map(item => [item.id, item])).values());

fs.writeFileSync('../public/m5_data.json', JSON.stringify(uniqueSkus, null, 2));

console.log(`Generated ${uniqueSkus.length} unique M5 structurally accurate SKUs into public/m5_data.json`);
