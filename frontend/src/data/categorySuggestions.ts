export interface ItemSuggestion {
  name: string;
  emoji?: string;
  category: string;
  aliases?: string[];
}

export interface CategoryDefinition {
  id: string;
  name: string;
  emoji: string;
  colorClass: string;
  items: string[];
  chips: Array<{ label: string; emoji: string }>;
}

export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'food',
    name: 'Food & Dining',
    emoji: '🍔',
    colorClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    chips: [
      { label: 'Swiggy / Zomato', emoji: '🛵' },
      { label: 'Dinner with Flatmates', emoji: '🍽️' },
      { label: 'Chai & Coffee', emoji: '☕' },
      { label: 'Pizza & Burgers', emoji: '🍕' },
      { label: 'Biryani Feast', emoji: '🍛' },
      { label: 'Evening Snacks', emoji: '🥪' },
    ],
    items: [
      'Swiggy / Zomato',
      'Dinner with Flatmates',
      'Lunch / Thali',
      'Breakfast',
      'Evening Snacks',
      'Pizza & Burgers',
      'Biryani Feast',
      'Chai & Coffee',
      'Party Snacks & Drinks',
      'Dessert & Ice Cream',
      'Midnight Cravings',
      'Office Cafeteria',
      'Cold Drinks & Soda',
    ],
  },
  {
    id: 'groceries',
    name: 'Groceries',
    emoji: '🛒',
    colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    chips: [
      { label: 'Milk & Dairy', emoji: '🥛' },
      { label: 'Bread & Buns', emoji: '🍞' },
      { label: 'Eggs (Tray)', emoji: '🥚' },
      { label: 'Fresh Vegetables', emoji: '🥦' },
      { label: 'Fresh Fruits', emoji: '🍎' },
      { label: 'Atta & Rice', emoji: '🌾' },
    ],
    items: [
      'Milk & Dairy (Amul / Nandini)',
      'Bread & Buns',
      'Eggs (Tray / 30pcs)',
      'Fresh Vegetables',
      'Fresh Fruits',
      'Atta & Rice',
      'Cooking Oil & Ghee',
      'Spices & Masala',
      'Curd & Paneer',
      'Maggi & Instant Noodles',
      'Dal & Pulses',
      'Tea & Coffee Powder',
      'Butter & Cheese',
      'Onions & Potatoes',
      'Biscuits & Cookies',
      'Zepto / Blinkit Quick Mart',
      'Chicken & Fresh Meat',
    ],
  },
  {
    id: 'household',
    name: 'Household Supplies',
    emoji: '🧹',
    colorClass: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30',
    chips: [
      { label: 'Vim Dishwash', emoji: '🧼' },
      { label: 'Surf Excel Detergent', emoji: '🧺' },
      { label: 'Garbage Bags', emoji: '🗑️' },
      { label: 'Harpic Toilet Cleaner', emoji: '🚽' },
      { label: 'GoodKnight / AllOut', emoji: '🦟' },
    ],
    items: [
      'Dishwashing Liquid (Vim / Pril)',
      'Washing Powder (Surf Excel / Ariel)',
      'Garbage / Trash Bags',
      'Toilet Cleaner (Harpic)',
      'Floor Cleaner (Lizol)',
      'Handwash Refill (Dettol / Lifebuoy)',
      'Broom & Mop',
      'Paper Towels & Tissues',
      'Mosquito Repellent (All Out / GoodKnight)',
      'Dish Scrubbers & Sponges',
      'Bathroom Air Freshener (Odonil)',
      'Aluminium Foil & Cling Film',
    ],
  },
  {
    id: 'utilities',
    name: 'Utilities & Bills',
    emoji: '⚡',
    colorClass: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
    chips: [
      { label: 'Wi-Fi / Internet', emoji: '🌐' },
      { label: 'Electricity Bill', emoji: '⚡' },
      { label: 'Water Cans (20L)', emoji: '💧' },
      { label: 'LPG Gas Cylinder', emoji: '🔥' },
      { label: 'Maid Salary', emoji: '🧹' },
      { label: 'Cook Salary', emoji: '👨‍🍳' },
    ],
    items: [
      'Wi-Fi / Internet Bill (Airtel / Jio Fiber)',
      'Electricity Bill (Bescom / Tata Power)',
      'Drinking Water Cans (20L Bisleri)',
      'LPG Gas Cylinder (Indane / HP)',
      'Maid / Housekeeping Salary',
      'Cook / Chef Salary',
      'Society Maintenance Fee',
      'Piped Natural Gas (PNG)',
      'DTH / Cable TV Recharge',
    ],
  },
  {
    id: 'health',
    name: 'Medicines & Health',
    emoji: '💊',
    colorClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
    chips: [
      { label: 'Dolo 650 / Crocin', emoji: '💊' },
      { label: 'First Aid & Bandages', emoji: '🩹' },
      { label: 'ORS / Electral', emoji: '⚡' },
      { label: 'Digene / Eno Antacid', emoji: '🫧' },
      { label: 'Volini Pain Spray', emoji: '💨' },
    ],
    items: [
      'Paracetamol (Dolo 650 / Crocin)',
      'Cough & Cold Syrup',
      'First Aid & Bandages',
      'ORS & Electral Sachets',
      'Antacid (Digene / Eno)',
      'Pain Relief Spray (Volini / Moov)',
      'Daily Multivitamins & Zinc',
      'Hand Sanitizer',
      'Doctor Consultation / Prescription',
    ],
  },
  {
    id: 'transport',
    name: 'Transport & Fuel',
    emoji: '🚗',
    colorClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
    chips: [
      { label: 'Uber / Ola Ride', emoji: '🚕' },
      { label: 'Auto Rickshaw', emoji: '🛺' },
      { label: 'Metro Card Recharge', emoji: '🚇' },
      { label: 'Petrol / Fuel', emoji: '⛽' },
    ],
    items: [
      'Uber / Ola / Rapido Ride',
      'Auto Rickshaw Fare',
      'Metro Card Recharge',
      'Petrol / Fuel',
      'Bus / Shuttle Pass',
      'Parking Fee',
      'FASTag / Toll Tax',
      'Train / Flight Ticket',
    ],
  },
  {
    id: 'entertainment',
    name: 'Entertainment & OTT',
    emoji: '🍿',
    colorClass: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/30',
    chips: [
      { label: 'Netflix', emoji: '🎬' },
      { label: 'Spotify', emoji: '🎵' },
      { label: 'Movie Tickets', emoji: '🎟️' },
      { label: 'Hotstar / Prime', emoji: '📺' },
    ],
    items: [
      'Netflix Subscription',
      'Spotify Family Plan',
      'Movie Tickets (BookMyShow)',
      'Board Games / Cards',
      'Hotstar / Prime Video',
      'PlayStation / Steam Game',
      'Weekend Outing / Event',
    ],
  },
  {
    id: 'personal',
    name: 'Personal Care',
    emoji: '🧴',
    colorClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
    chips: [
      { label: 'Shampoo & Soap', emoji: '🧼' },
      { label: 'Toothpaste & Brush', emoji: '🪥' },
      { label: 'Salon / Haircut', emoji: '💇' },
      { label: 'Deodorant / Perfume', emoji: '✨' },
    ],
    items: [
      'Shampoo & Conditioner',
      'Toothpaste & Toothbrush',
      'Body Wash & Bath Soap',
      'Deodorant & Perfume',
      'Salon / Haircut',
      'Sunscreen & Skincare',
      'Shaving Kit & Blades',
    ],
  },
  {
    id: 'misc',
    name: 'Miscellaneous',
    emoji: '📦',
    colorClass: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30',
    chips: [
      { label: 'Mobile Recharge', emoji: '📱' },
      { label: 'Duplicate Keys', emoji: '🔑' },
      { label: 'Laundry / Ironing', emoji: '👔' },
      { label: 'Home Repair', emoji: '🔧' },
    ],
    items: [
      'Mobile Phone Recharge',
      'Stationery & Printouts',
      'Laundry & Dry Cleaning',
      'Duplicate Flat Keys',
      'Courier & Shipping',
      'Plumber / Electrician Repair Fee',
    ],
  },
];

// ── Smart Keyword & Alias Dictionary ──────────────────────────────────────────

const ALIAS_MAP: Record<string, { category: string; primaryItem: string }> = {
  // Food & Dining
  swiggy: { category: 'Food & Dining', primaryItem: 'Swiggy / Zomato' },
  zomato: { category: 'Food & Dining', primaryItem: 'Swiggy / Zomato' },
  dinner: { category: 'Food & Dining', primaryItem: 'Dinner with Flatmates' },
  lunch: { category: 'Food & Dining', primaryItem: 'Lunch / Thali' },
  thali: { category: 'Food & Dining', primaryItem: 'Lunch / Thali' },
  breakfast: { category: 'Food & Dining', primaryItem: 'Breakfast' },
  pizza: { category: 'Food & Dining', primaryItem: 'Pizza & Burgers' },
  burger: { category: 'Food & Dining', primaryItem: 'Pizza & Burgers' },
  mcdonalds: { category: 'Food & Dining', primaryItem: 'Pizza & Burgers' },
  dominos: { category: 'Food & Dining', primaryItem: 'Pizza & Burgers' },
  biryani: { category: 'Food & Dining', primaryItem: 'Biryani Feast' },
  chai: { category: 'Food & Dining', primaryItem: 'Chai & Coffee' },
  coffee: { category: 'Food & Dining', primaryItem: 'Chai & Coffee' },
  starbucks: { category: 'Food & Dining', primaryItem: 'Chai & Coffee' },
  beer: { category: 'Food & Dining', primaryItem: 'Party Snacks & Drinks' },
  drinks: { category: 'Food & Dining', primaryItem: 'Party Snacks & Drinks' },
  alcohol: { category: 'Food & Dining', primaryItem: 'Party Snacks & Drinks' },
  coke: { category: 'Food & Dining', primaryItem: 'Cold Drinks & Soda' },
  pepsi: { category: 'Food & Dining', primaryItem: 'Cold Drinks & Soda' },

  // Groceries
  milk: { category: 'Groceries', primaryItem: 'Milk & Dairy (Amul / Nandini)' },
  amul: { category: 'Groceries', primaryItem: 'Milk & Dairy (Amul / Nandini)' },
  nandini: { category: 'Groceries', primaryItem: 'Milk & Dairy (Amul / Nandini)' },
  bread: { category: 'Groceries', primaryItem: 'Bread & Buns' },
  bun: { category: 'Groceries', primaryItem: 'Bread & Buns' },
  egg: { category: 'Groceries', primaryItem: 'Eggs (Tray / 30pcs)' },
  eggs: { category: 'Groceries', primaryItem: 'Eggs (Tray / 30pcs)' },
  veggies: { category: 'Groceries', primaryItem: 'Fresh Vegetables' },
  vegetables: { category: 'Groceries', primaryItem: 'Fresh Vegetables' },
  sabzi: { category: 'Groceries', primaryItem: 'Fresh Vegetables' },
  potato: { category: 'Groceries', primaryItem: 'Onions & Potatoes' },
  onion: { category: 'Groceries', primaryItem: 'Onions & Potatoes' },
  tomato: { category: 'Groceries', primaryItem: 'Fresh Vegetables' },
  fruits: { category: 'Groceries', primaryItem: 'Fresh Fruits' },
  atta: { category: 'Groceries', primaryItem: 'Atta & Rice' },
  rice: { category: 'Groceries', primaryItem: 'Atta & Rice' },
  oil: { category: 'Groceries', primaryItem: 'Cooking Oil & Ghee' },
  ghee: { category: 'Groceries', primaryItem: 'Cooking Oil & Ghee' },
  curd: { category: 'Groceries', primaryItem: 'Curd & Paneer' },
  dahi: { category: 'Groceries', primaryItem: 'Curd & Paneer' },
  paneer: { category: 'Groceries', primaryItem: 'Curd & Paneer' },
  maggi: { category: 'Groceries', primaryItem: 'Maggi & Instant Noodles' },
  noodles: { category: 'Groceries', primaryItem: 'Maggi & Instant Noodles' },
  dal: { category: 'Groceries', primaryItem: 'Dal & Pulses' },
  zepto: { category: 'Groceries', primaryItem: 'Zepto / Blinkit Quick Mart' },
  blinkit: { category: 'Groceries', primaryItem: 'Zepto / Blinkit Quick Mart' },
  instamart: { category: 'Groceries', primaryItem: 'Zepto / Blinkit Quick Mart' },
  chicken: { category: 'Groceries', primaryItem: 'Chicken & Fresh Meat' },
  meat: { category: 'Groceries', primaryItem: 'Chicken & Fresh Meat' },

  // Household Supplies
  vim: { category: 'Household Supplies', primaryItem: 'Dishwashing Liquid (Vim / Pril)' },
  dishwash: { category: 'Household Supplies', primaryItem: 'Dishwashing Liquid (Vim / Pril)' },
  surf: { category: 'Household Supplies', primaryItem: 'Washing Powder (Surf Excel / Ariel)' },
  detergent: { category: 'Household Supplies', primaryItem: 'Washing Powder (Surf Excel / Ariel)' },
  garbage: { category: 'Household Supplies', primaryItem: 'Garbage / Trash Bags' },
  trash: { category: 'Household Supplies', primaryItem: 'Garbage / Trash Bags' },
  harpic: { category: 'Household Supplies', primaryItem: 'Toilet Cleaner (Harpic)' },
  lizol: { category: 'Household Supplies', primaryItem: 'Floor Cleaner (Lizol)' },
  handwash: { category: 'Household Supplies', primaryItem: 'Handwash Refill (Dettol / Lifebuoy)' },
  mop: { category: 'Household Supplies', primaryItem: 'Broom & Mop' },
  broom: { category: 'Household Supplies', primaryItem: 'Broom & Mop' },
  jhadu: { category: 'Household Supplies', primaryItem: 'Broom & Mop' },
  goodknight: { category: 'Household Supplies', primaryItem: 'Mosquito Repellent (All Out / GoodKnight)' },
  allout: { category: 'Household Supplies', primaryItem: 'Mosquito Repellent (All Out / GoodKnight)' },
  tissue: { category: 'Household Supplies', primaryItem: 'Paper Towels & Tissues' },

  // Utilities & Bills
  wifi: { category: 'Utilities & Bills', primaryItem: 'Wi-Fi / Internet Bill (Airtel / Jio Fiber)' },
  internet: { category: 'Utilities & Bills', primaryItem: 'Wi-Fi / Internet Bill (Airtel / Jio Fiber)' },
  broadband: { category: 'Utilities & Bills', primaryItem: 'Wi-Fi / Internet Bill (Airtel / Jio Fiber)' },
  airtel: { category: 'Utilities & Bills', primaryItem: 'Wi-Fi / Internet Bill (Airtel / Jio Fiber)' },
  jio: { category: 'Utilities & Bills', primaryItem: 'Wi-Fi / Internet Bill (Airtel / Jio Fiber)' },
  electricity: { category: 'Utilities & Bills', primaryItem: 'Electricity Bill (Bescom / Tata Power)' },
  bijli: { category: 'Utilities & Bills', primaryItem: 'Electricity Bill (Bescom / Tata Power)' },
  bescom: { category: 'Utilities & Bills', primaryItem: 'Electricity Bill (Bescom / Tata Power)' },
  power: { category: 'Utilities & Bills', primaryItem: 'Electricity Bill (Bescom / Tata Power)' },
  water: { category: 'Utilities & Bills', primaryItem: 'Drinking Water Cans (20L Bisleri)' },
  bisleri: { category: 'Utilities & Bills', primaryItem: 'Drinking Water Cans (20L Bisleri)' },
  can: { category: 'Utilities & Bills', primaryItem: 'Drinking Water Cans (20L Bisleri)' },
  gas: { category: 'Utilities & Bills', primaryItem: 'LPG Gas Cylinder (Indane / HP)' },
  cylinder: { category: 'Utilities & Bills', primaryItem: 'LPG Gas Cylinder (Indane / HP)' },
  indane: { category: 'Utilities & Bills', primaryItem: 'LPG Gas Cylinder (Indane / HP)' },
  maid: { category: 'Utilities & Bills', primaryItem: 'Maid / Housekeeping Salary' },
  bai: { category: 'Utilities & Bills', primaryItem: 'Maid / Housekeeping Salary' },
  kamwali: { category: 'Utilities & Bills', primaryItem: 'Maid / Housekeeping Salary' },
  cook: { category: 'Utilities & Bills', primaryItem: 'Cook / Chef Salary' },
  maintenance: { category: 'Utilities & Bills', primaryItem: 'Society Maintenance Fee' },

  // Health
  dolo: { category: 'Medicines & Health', primaryItem: 'Paracetamol (Dolo 650 / Crocin)' },
  crocin: { category: 'Medicines & Health', primaryItem: 'Paracetamol (Dolo 650 / Crocin)' },
  paracetamol: { category: 'Medicines & Health', primaryItem: 'Paracetamol (Dolo 650 / Crocin)' },
  bandage: { category: 'Medicines & Health', primaryItem: 'First Aid & Bandages' },
  bandaid: { category: 'Medicines & Health', primaryItem: 'First Aid & Bandages' },
  ors: { category: 'Medicines & Health', primaryItem: 'ORS & Electral Sachets' },
  electral: { category: 'Medicines & Health', primaryItem: 'ORS & Electral Sachets' },
  eno: { category: 'Medicines & Health', primaryItem: 'Antacid (Digene / Eno)' },
  digene: { category: 'Medicines & Health', primaryItem: 'Antacid (Digene / Eno)' },
  volini: { category: 'Medicines & Health', primaryItem: 'Pain Relief Spray (Volini / Moov)' },
  moov: { category: 'Medicines & Health', primaryItem: 'Pain Relief Spray (Volini / Moov)' },

  // Transport
  uber: { category: 'Transport & Fuel', primaryItem: 'Uber / Ola / Rapido Ride' },
  ola: { category: 'Transport & Fuel', primaryItem: 'Uber / Ola / Rapido Ride' },
  rapido: { category: 'Transport & Fuel', primaryItem: 'Uber / Ola / Rapido Ride' },
  auto: { category: 'Transport & Fuel', primaryItem: 'Auto Rickshaw Fare' },
  metro: { category: 'Transport & Fuel', primaryItem: 'Metro Card Recharge' },
  petrol: { category: 'Transport & Fuel', primaryItem: 'Petrol / Fuel' },
  diesel: { category: 'Transport & Fuel', primaryItem: 'Petrol / Fuel' },
  fuel: { category: 'Transport & Fuel', primaryItem: 'Petrol / Fuel' },

  // Entertainment
  netflix: { category: 'Entertainment & OTT', primaryItem: 'Netflix Subscription' },
  spotify: { category: 'Entertainment & OTT', primaryItem: 'Spotify Family Plan' },
  hotstar: { category: 'Entertainment & OTT', primaryItem: 'Hotstar / Prime Video' },
  prime: { category: 'Entertainment & OTT', primaryItem: 'Hotstar / Prime Video' },
  movie: { category: 'Entertainment & OTT', primaryItem: 'Movie Tickets (BookMyShow)' },
};

/**
 * Match a category by name or keyword (case-insensitive)
 */
export function findCategoryByName(name?: string | null): CategoryDefinition | undefined {
  if (!name || !name.trim()) return undefined;
  const query = name.trim().toLowerCase();

  // 1. Direct match on name or ID
  const directMatch = DEFAULT_CATEGORIES.find(
    (c) => c.name.toLowerCase() === query || c.id.toLowerCase() === query
  );
  if (directMatch) return directMatch;

  // 2. Keyword/Alias check
  if (ALIAS_MAP[query]) {
    const matched = DEFAULT_CATEGORIES.find(
      (c) => c.name.toLowerCase() === ALIAS_MAP[query].category.toLowerCase()
    );
    if (matched) return matched;
  }

  // 3. Substring matching
  return DEFAULT_CATEGORIES.find((c) => {
    const cName = c.name.toLowerCase();
    return (
      cName.includes(query) ||
      query.includes(cName) ||
      (query === 'food' && c.id === 'food') ||
      (query === 'grocery' && c.id === 'groceries') ||
      (query === 'bill' && c.id === 'utilities') ||
      (query === 'bills' && c.id === 'utilities') ||
      (query === 'medicine' && c.id === 'health') ||
      (query === 'medicines' && c.id === 'health') ||
      (query === 'cab' && c.id === 'transport')
    );
  });
}

/**
 * Get items related to a category name. If category is empty or unknown,
 * returns top flatmate everyday essentials.
 */
export function getRelatedItems(categoryName?: string | null): string[] {
  const cat = findCategoryByName(categoryName);
  if (cat) {
    return cat.items;
  }

  return [
    'Milk & Dairy (Amul / Nandini)',
    'Bread & Buns',
    'Eggs (Tray / 30pcs)',
    'Drinking Water Cans (20L Bisleri)',
    'Swiggy / Zomato',
    'Dishwashing Liquid (Vim / Pril)',
    'Garbage / Trash Bags',
    'Fresh Vegetables',
    'Wi-Fi / Internet Bill (Airtel / Jio Fiber)',
    'Electricity Bill (Bescom / Tata Power)',
  ];
}

/**
 * Get quick-pick chips for a category
 */
export function getQuickChips(categoryName?: string | null) {
  const cat = findCategoryByName(categoryName);
  if (cat && cat.chips.length > 0) {
    return cat.chips;
  }

  return [
    { label: 'Milk', emoji: '🥛' },
    { label: 'Bread', emoji: '🍞' },
    { label: 'Eggs', emoji: '🥚' },
    { label: 'Water Can', emoji: '💧' },
    { label: 'Swiggy', emoji: '🛵' },
    { label: 'Wi-Fi', emoji: '🌐' },
  ];
}

/**
 * Given an item name or search query, smartly guess the most likely category.
 */
export function guessCategoryForItem(itemName?: string | null): CategoryDefinition | undefined {
  if (!itemName || !itemName.trim()) return undefined;
  const q = itemName.trim().toLowerCase();

  // 1. Direct alias match
  const aliasWords = q.split(/[\s/()&,.-]+/).filter((w) => w.length >= 3);
  for (const word of [q, ...aliasWords]) {
    if (ALIAS_MAP[word]) {
      const cat = DEFAULT_CATEGORIES.find(
        (c) => c.name.toLowerCase() === ALIAS_MAP[word].category.toLowerCase()
      );
      if (cat) return cat;
    }
  }

  // 2. Search category items
  for (const cat of DEFAULT_CATEGORIES) {
    for (const item of cat.items) {
      const itemLower = item.toLowerCase();
      if (itemLower.includes(q) || q.includes(itemLower)) {
        return cat;
      }
      const words = itemLower.split(/[\s/()&,.-]+/).filter((w) => w.length >= 3);
      if (words.some((w) => q.includes(w) || w.includes(q))) {
        return cat;
      }
    }
  }

  return undefined;
}

// ── Local Storage Recents Memory ─────────────────────────────────────────────

const RECENTS_KEY = 'flatmate_recent_purchases_v1';

export function getRecentPurchases(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function saveRecentPurchase(item: string) {
  if (!item || !item.trim()) return;
  const clean = item.trim();
  try {
    const current = getRecentPurchases().filter(
      (it) => it.toLowerCase() !== clean.toLowerCase()
    );
    const updated = [clean, ...current].slice(0, 10);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}
