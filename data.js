// Starter data for Smoove Prep. Nutrition is per 100g (or 100ml) and is
// approximate — check supplier spec sheets before printing labels.
// Costs are example prices in £ per kg (or per litre). Edit them in the app.

const ALLERGENS = [
  'Celery', 'Cereals (gluten)', 'Crustaceans', 'Eggs', 'Fish', 'Lupin', 'Milk',
  'Molluscs', 'Mustard', 'Tree nuts', 'Peanuts', 'Sesame', 'Soya', 'Sulphites'
];

const NUTRIENTS = [
  { key: 'kcal', label: 'Energy', unit: 'kcal' },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'sat', label: 'of which saturates', unit: 'g' },
  { key: 'carbs', label: 'Carbohydrate', unit: 'g' },
  { key: 'sugar', label: 'of which sugars', unit: 'g' },
  { key: 'fibre', label: 'Fibre', unit: 'g' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'salt', label: 'Salt', unit: 'g' }
];

const SEED = {
  version: 1,
  settings: {
    businessName: 'Smoove Cafe',
    address: 'Melksham, Wiltshire',
    vatRate: 20,
    targetGp: 70,
    shelfLifeDays: 3,
    targets: { kcal: 2000, protein: 140, carbs: 200, fat: 65 },
    slots: ['Breakfast', 'Lunch', 'Snack', 'Dinner']
  },
  ingredients: [
    { id: 'i1', name: 'Frozen mixed berries', unit: 'g', costPerKg: 4.20, n: { kcal: 45, fat: 0.3, sat: 0, carbs: 8.6, sugar: 6.5, fibre: 3.2, protein: 1, salt: 0 }, allergens: [] },
    { id: 'i2', name: 'Banana', unit: 'g', costPerKg: 1.10, n: { kcal: 89, fat: 0.3, sat: 0.1, carbs: 22.8, sugar: 12.2, fibre: 2.6, protein: 1.1, salt: 0 }, allergens: [] },
    { id: 'i3', name: 'Frozen açaí purée', unit: 'g', costPerKg: 12.00, n: { kcal: 70, fat: 5, sat: 1.2, carbs: 4, sugar: 0, fibre: 3, protein: 1, salt: 0 }, allergens: [] },
    { id: 'i4', name: 'Granola (oat)', unit: 'g', costPerKg: 6.50, n: { kcal: 450, fat: 16, sat: 3, carbs: 62, sugar: 18, fibre: 7, protein: 10, salt: 0.1 }, allergens: ['Cereals (gluten)', 'Tree nuts'] },
    { id: 'i5', name: 'Whey protein (vanilla)', unit: 'g', costPerKg: 22.00, n: { kcal: 390, fat: 6, sat: 3.5, carbs: 7, sugar: 5, fibre: 0, protein: 76, salt: 0.5 }, allergens: ['Milk', 'Soya'] },
    { id: 'i6', name: 'Semi-skimmed milk', unit: 'ml', costPerKg: 1.05, n: { kcal: 47, fat: 1.7, sat: 1.1, carbs: 4.8, sugar: 4.8, fibre: 0, protein: 3.5, salt: 0.1 }, allergens: ['Milk'] },
    { id: 'i7', name: 'Oat milk', unit: 'ml', costPerKg: 1.80, n: { kcal: 46, fat: 1.5, sat: 0.2, carbs: 6.7, sugar: 4, fibre: 0.8, protein: 1, salt: 0.1 }, allergens: ['Cereals (gluten)'] },
    { id: 'i8', name: 'Peanut butter', unit: 'g', costPerKg: 7.00, n: { kcal: 600, fat: 49, sat: 9, carbs: 13, sugar: 6, fibre: 7, protein: 25, salt: 0.5 }, allergens: ['Peanuts'] },
    { id: 'i9', name: 'Greek yoghurt 0%', unit: 'g', costPerKg: 3.50, n: { kcal: 57, fat: 0.2, sat: 0.1, carbs: 3.6, sugar: 3.6, fibre: 0, protein: 10.3, salt: 0.1 }, allergens: ['Milk'] },
    { id: 'i10', name: 'Rolled oats', unit: 'g', costPerKg: 1.40, n: { kcal: 375, fat: 8, sat: 1.5, carbs: 60, sugar: 1, fibre: 9, protein: 13, salt: 0 }, allergens: ['Cereals (gluten)'] },
    { id: 'i11', name: 'Honey', unit: 'g', costPerKg: 8.00, n: { kcal: 304, fat: 0, sat: 0, carbs: 82, sugar: 82, fibre: 0, protein: 0.3, salt: 0 }, allergens: [] },
    { id: 'i12', name: 'Chicken breast', unit: 'g', costPerKg: 8.50, n: { kcal: 120, fat: 2, sat: 0.5, carbs: 0, sugar: 0, fibre: 0, protein: 24, salt: 0.2 }, allergens: [] },
    { id: 'i13', name: 'Basmati rice (cooked)', unit: 'g', costPerKg: 2.00, n: { kcal: 130, fat: 0.3, sat: 0.1, carbs: 28, sugar: 0.1, fibre: 0.4, protein: 2.7, salt: 0 }, allergens: [] },
    { id: 'i14', name: 'Broccoli', unit: 'g', costPerKg: 2.20, n: { kcal: 34, fat: 0.4, sat: 0, carbs: 7, sugar: 1.7, fibre: 2.6, protein: 2.8, salt: 0 }, allergens: [] },
    { id: 'i15', name: 'Sweet potato', unit: 'g', costPerKg: 1.60, n: { kcal: 86, fat: 0.1, sat: 0, carbs: 20, sugar: 4.2, fibre: 3, protein: 1.6, salt: 0.1 }, allergens: [] },
    { id: 'i16', name: 'Teriyaki sauce', unit: 'g', costPerKg: 5.00, n: { kcal: 89, fat: 0, sat: 0, carbs: 16, sugar: 14, fibre: 0, protein: 5.9, salt: 10 }, allergens: ['Soya', 'Cereals (gluten)'] },
    { id: 'i17', name: 'Free-range egg', unit: 'g', costPerKg: 5.00, n: { kcal: 143, fat: 9.5, sat: 3.1, carbs: 0.7, sugar: 0.4, fibre: 0, protein: 12.6, salt: 0.4 }, allergens: ['Eggs'] },
    { id: 'i18', name: 'Baby spinach', unit: 'g', costPerKg: 6.00, n: { kcal: 23, fat: 0.4, sat: 0.1, carbs: 3.6, sugar: 0.4, fibre: 2.2, protein: 2.9, salt: 0.2 }, allergens: [] },
    { id: 'i19', name: 'Wholemeal wrap', unit: 'g', costPerKg: 4.50, n: { kcal: 290, fat: 6, sat: 2.5, carbs: 46, sugar: 3, fibre: 6, protein: 9, salt: 1.1 }, allergens: ['Cereals (gluten)'] },
    { id: 'i20', name: 'Dark chocolate 70%', unit: 'g', costPerKg: 14.00, n: { kcal: 580, fat: 42, sat: 25, carbs: 33, sugar: 28, fibre: 11, protein: 8, salt: 0 }, allergens: ['Soya', 'Milk'] },
    { id: 'i21', name: 'Chia seeds', unit: 'g', costPerKg: 9.00, n: { kcal: 486, fat: 31, sat: 3.3, carbs: 8, sugar: 0, fibre: 34, protein: 17, salt: 0 }, allergens: [] },
    { id: 'i22', name: 'Salmon fillet', unit: 'g', costPerKg: 18.00, n: { kcal: 208, fat: 13, sat: 3, carbs: 0, sugar: 0, fibre: 0, protein: 20, salt: 0.1 }, allergens: ['Fish'] }
  ],
  recipes: [
    { id: 'r1', name: 'Açaí Power Bowl', category: 'Smoothie bowl', portions: 1, price: 7.95,
      items: [{ ing: 'i3', qty: 100 }, { ing: 'i2', qty: 80 }, { ing: 'i1', qty: 60 }, { ing: 'i4', qty: 40 }, { ing: 'i11', qty: 10 }],
      method: 'Blend açaí, half the banana and berries until thick. Top with granola, sliced banana and honey.' },
    { id: 'r2', name: 'PB Protein Shake', category: 'Protein shake', portions: 1, price: 5.50,
      items: [{ ing: 'i5', qty: 30 }, { ing: 'i6', qty: 300 }, { ing: 'i2', qty: 100 }, { ing: 'i8', qty: 15 }],
      method: 'Blend all ingredients with ice for 40 seconds.' },
    { id: 'r3', name: 'Berry Overnight Oats', category: 'Breakfast', portions: 1, price: 4.50,
      items: [{ ing: 'i10', qty: 50 }, { ing: 'i9', qty: 100 }, { ing: 'i7', qty: 100 }, { ing: 'i1', qty: 60 }, { ing: 'i21', qty: 10 }],
      method: 'Mix oats, yoghurt, oat milk and chia. Top with berries. Chill overnight.' },
    { id: 'r4', name: 'Teriyaki Chicken & Rice', category: 'Prep meal', portions: 4, price: 8.50,
      items: [{ ing: 'i12', qty: 600 }, { ing: 'i13', qty: 700 }, { ing: 'i14', qty: 400 }, { ing: 'i16', qty: 120 }],
      method: 'Dice and pan-fry chicken, glaze with teriyaki. Portion with rice and steamed broccoli. Chill below 5°C within 90 minutes.' },
    { id: 'r5', name: 'Salmon & Sweet Potato', category: 'Prep meal', portions: 4, price: 9.95,
      items: [{ ing: 'i22', qty: 560 }, { ing: 'i15', qty: 800 }, { ing: 'i18', qty: 160 }],
      method: 'Roast sweet potato wedges 25 min at 200°C. Bake salmon 12–15 min to 63°C core. Portion over spinach.' },
    { id: 'r6', name: 'Egg & Spinach Protein Wrap', category: 'Lunch', portions: 1, price: 5.95,
      items: [{ ing: 'i17', qty: 120 }, { ing: 'i18', qty: 30 }, { ing: 'i19', qty: 62 }],
      method: 'Scramble eggs with spinach, fill wrap, fold and toast.' },
    { id: 'r7', name: 'Choc Chia Protein Pot', category: 'Snack', portions: 1, price: 3.50,
      items: [{ ing: 'i9', qty: 150 }, { ing: 'i5', qty: 15 }, { ing: 'i21', qty: 10 }, { ing: 'i20', qty: 10 }],
      method: 'Whisk yoghurt and protein, stir in chia, top with grated chocolate.' }
  ],
  plans: [
    { id: 'p1', name: 'Lean Week', customers: 10, days: {} }
  ],
  activePlan: 'p1'
};

// Fill the starter plan with an example week.
(function seedWeek() {
  const week = [
    ['r3', 'r6', 'r7', 'r4'], ['r1', 'r4', 'r2', 'r5'], ['r3', 'r5', 'r7', 'r4'],
    ['r1', 'r6', 'r2', 'r5'], ['r3', 'r4', 'r7', 'r5'], ['r1', 'r6', 'r2', 'r4'], ['r3', 'r5', 'r7', 'r4']
  ];
  week.forEach((day, d) => {
    SEED.plans[0].days[d] = {};
    SEED.settings.slots.forEach((slot, s) => { SEED.plans[0].days[d][slot] = [day[s]]; });
  });
})();
