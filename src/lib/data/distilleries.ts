import type { Distillery } from "@/lib/types";

/**
 * MOCK / SEED DATA — ported verbatim from the approved mockup (index.html).
 *
 * This is Phase 0 placeholder data so pages render end-to-end before the
 * Airtable base is populated. Per the locked architecture, Distilleries are
 * an Airtable-sourced layer.
 *
 * TODO(Phase 2): replace this static export with a live call to Airtable,
 * e.g. `getDistilleriesFromAirtable()`, behind the same `getDistilleries()`
 * function in `./index.ts` so no page code needs to change.
 */
export const MOCK_DISTILLERIES: Distillery[] = [
  {
    "id": "ardbeg",
    "slug": "ardbeg",
    "name": "Ardbeg",
    "region": "South Islay",
    "style": "Heavily Peated",
    "lat": 55.6411,
    "lng": -6.1609,
    "founded": 1815,
    "tagline": "The ultimate Islay malt \u2014 peated to perfection.",
    "description": "Ardbeg is one of Scotland's most celebrated distilleries, perched on the southern shore of Islay facing the Atlantic. Known for producing some of the world's most intensely peated whiskies, a visit here combines rugged coastal scenery with an extraordinary sensory experience. The Old Kiln Caf\u00e9 is widely regarded as one of the best distillery caf\u00e9s in Scotland.",
    "image": "https://images.unsplash.com/photo-1542741081-bc7afc3480fe?w=1400&q=80",
    "tours": [
      {
        "name": "The Ardbeg Experience",
        "duration": "1 hr 15 min",
        "price": 15,
        "description": "Guided tour of the distillery with tasting of three expressions."
      },
      {
        "name": "The Warehouse Tasting",
        "duration": "2 hrs",
        "price": 45,
        "description": "Exclusive access to cask samples straight from the warehouse alongside Ardbeg's whisky specialist."
      },
      {
        "name": "The Committee Room",
        "duration": "3 hrs",
        "price": 120,
        "description": "A prestige experience for whisky connoisseurs, with rare drams and personalised guidance."
      }
    ],
    "hours": "Mon\u2013Sun: 10:00\u201316:30",
    "priceFrom": "\u00a315",
    "avgVisit": "1.5 hrs",
    "parking": "Free on-site",
    "accessibility": "Partial wheelchair access",
    "motorhomeFriendly": true,
    "giftShop": true,
    "restaurantName": "Old Kiln Caf\u00e9",
    "facilities": [
      "Caf\u00e9",
      "Gift Shop",
      "Parking",
      "Tours Daily",
      "Dog Friendly"
    ],
    "nearby": [
      {
        "name": "Loch Fada",
        "type": "Scenic Loch",
        "icon": "\ud83c\udfd4\ufe0f",
        "distance": "1.2 miles",
        "category": "viewpoint"
      },
      {
        "name": "Kildalton Cross",
        "type": "Historic Site",
        "icon": "\u26ea",
        "distance": "2.1 miles",
        "category": "attraction"
      },
      {
        "name": "Traigh Bhan Beach",
        "type": "Beach",
        "icon": "\ud83c\udfd6\ufe0f",
        "distance": "0.8 miles",
        "category": "beach"
      },
      {
        "name": "The Lochside Hotel",
        "type": "Hotel",
        "icon": "\ud83c\udfe8",
        "distance": "11 miles",
        "category": "accommodation"
      },
      {
        "name": "Old Kiln Caf\u00e9",
        "type": "Restaurant",
        "icon": "\u2615",
        "distance": "On-site",
        "category": "food"
      }
    ],
    "nextStops": [
      "lagavulin",
      "laphroaig"
    ],
    "source": "mock"
  },
  {
    "id": "lagavulin",
    "slug": "lagavulin",
    "name": "Lagavulin",
    "region": "South Islay",
    "style": "Heavily Peated",
    "lat": 55.6357,
    "lng": -6.1269,
    "founded": 1816,
    "tagline": "Deep, rich and smoky \u2014 a Scotch whisky icon.",
    "description": "Lagavulin sits in a sheltered bay on the south coast of Islay, its whitewashed walls reflected in the still waters of Lagavulin Bay. One of Islay's oldest distilleries, it produces a whisky of exceptional depth and complexity. The ruins of Dunyvaig Castle stand nearby, adding historical weight to an already atmospheric visit.",
    "image": "https://images.unsplash.com/photo-1547321430-87fec39c6952?w=1400&q=80",
    "tours": [
      {
        "name": "Lagavulin Distillery Tour",
        "duration": "1 hr",
        "price": 10,
        "description": "A guided walk through the distillery with two expression tastings."
      },
      {
        "name": "Exclusive Cask Tour",
        "duration": "2 hrs 30 min",
        "price": 60,
        "description": "In-depth tour including barrel selection and warehouse tasting."
      }
    ],
    "hours": "Mon\u2013Fri: 09:30\u201317:00, Sat\u2013Sun: 10:00\u201316:00",
    "priceFrom": "\u00a310",
    "avgVisit": "1 hr",
    "parking": "Limited roadside",
    "accessibility": "Wheelchair accessible main areas",
    "motorhomeFriendly": false,
    "giftShop": true,
    "restaurantName": null,
    "facilities": [
      "Gift Shop",
      "Parking Nearby",
      "Tours Daily"
    ],
    "nearby": [
      {
        "name": "Dunyvaig Castle Ruins",
        "type": "Historic Site",
        "icon": "\ud83c\udff0",
        "distance": "0.3 miles",
        "category": "attraction"
      },
      {
        "name": "Lagavulin Bay",
        "type": "Scenic Bay",
        "icon": "\ud83c\udf0a",
        "distance": "Adjacent",
        "category": "viewpoint"
      },
      {
        "name": "Port Ellen Village",
        "type": "Village",
        "icon": "\ud83c\udfd8\ufe0f",
        "distance": "3 miles",
        "category": "attraction"
      },
      {
        "name": "The Ardview Inn",
        "type": "Pub & Food",
        "icon": "\ud83c\udf7a",
        "distance": "3.5 miles",
        "category": "food"
      }
    ],
    "nextStops": [
      "ardbeg",
      "laphroaig"
    ],
    "source": "mock"
  },
  {
    "id": "laphroaig",
    "slug": "laphroaig",
    "name": "Laphroaig",
    "region": "South Islay",
    "style": "Heavily Peated",
    "lat": 55.6278,
    "lng": -6.1495,
    "founded": 1815,
    "tagline": "The most richly flavoured of all Scotch whiskies.",
    "description": "Laphroaig holds the rare distinction of being the only Scotch whisky with a Royal Warrant. Its distinctively medicinal, seaweed-inflected smokiness divides opinion, but its passionate following is fierce. Visitors can lease their own square foot of Islay peat bog \u2014 a charming tradition that earns them a dram on arrival.",
    "image": "https://images.unsplash.com/photo-1659977193681-c40fa885527e?w=1400&q=80",
    "tours": [
      {
        "name": "Water to Whisky Tour",
        "duration": "1 hr",
        "price": 15,
        "description": "The complete story of Laphroaig, from peat cutting to bottling."
      },
      {
        "name": "Friends of Laphroaig Experience",
        "duration": "2 hrs",
        "price": 35,
        "description": "Visit your own square foot of Islay, cut your own peat and claim your dram."
      }
    ],
    "hours": "Mon\u2013Sat: 09:45\u201317:00",
    "priceFrom": "\u00a315",
    "avgVisit": "1.25 hrs",
    "parking": "Free on-site",
    "accessibility": "Limited access",
    "motorhomeFriendly": false,
    "giftShop": true,
    "restaurantName": null,
    "facilities": [
      "Gift Shop",
      "Free Parking",
      "Tours Daily",
      "Peat Bog Visits"
    ],
    "nearby": [
      {
        "name": "Mull of Oa Viewpoint",
        "type": "Viewpoint",
        "icon": "\ud83c\udf05",
        "distance": "8 miles",
        "category": "viewpoint"
      },
      {
        "name": "Port Ellen Beach",
        "type": "Beach",
        "icon": "\ud83c\udfd6\ufe0f",
        "distance": "2 miles",
        "category": "beach"
      }
    ],
    "nextStops": [
      "lagavulin",
      "bowmore"
    ],
    "source": "mock"
  },
  {
    "id": "bowmore",
    "slug": "bowmore",
    "name": "Bowmore",
    "region": "Central Islay",
    "style": "Medium Peated",
    "lat": 55.7557,
    "lng": -6.2875,
    "founded": 1779,
    "tagline": "Islay's oldest distillery \u2014 balanced, elegant, iconic.",
    "description": "Founded in 1779, Bowmore is Islay's oldest distillery and sits at the heart of the island's largest village. Its distinctive round church \u2014 built to deny the devil a corner to hide in \u2014 overlooks the warehouse that produces one of Scotland's most balanced island malts. The No.1 Vault is the only warehouse in Scotland that sits below sea level.",
    "image": "https://images.unsplash.com/photo-1542741081-bc7afc3480fe?w=1400&q=80",
    "tours": [
      {
        "name": "Bowmore Distillery Tour",
        "duration": "1 hr",
        "price": 10,
        "description": "Classic guided tour with two tastings."
      },
      {
        "name": "The Vault Experience",
        "duration": "2 hrs",
        "price": 50,
        "description": "Access to the legendary No.1 Vault, below sea level, with warehouse sampling."
      },
      {
        "name": "Masterclass Tasting",
        "duration": "1 hr 30 min",
        "price": 30,
        "description": "A guided vertical tasting of five expressions with a whisky specialist."
      }
    ],
    "hours": "Mon\u2013Sat: 09:00\u201317:00, Sun: 12:00\u201316:00",
    "priceFrom": "\u00a310",
    "avgVisit": "1.5 hrs",
    "parking": "Village car park (5 min walk)",
    "accessibility": "Wheelchair accessible",
    "motorhomeFriendly": true,
    "giftShop": true,
    "restaurantName": null,
    "facilities": [
      "Gift Shop",
      "Wheelchair Access",
      "Daily Tours",
      "Village Location"
    ],
    "nearby": [
      {
        "name": "Round Church of Bowmore",
        "type": "Historic Church",
        "icon": "\u26ea",
        "distance": "1 min walk",
        "category": "attraction"
      },
      {
        "name": "Lochindaal Shore Walk",
        "type": "Walking",
        "icon": "\ud83d\udeb6",
        "distance": "Adjacent",
        "category": "walk"
      },
      {
        "name": "Islay Swimming Pool",
        "type": "Leisure",
        "icon": "\ud83c\udfca",
        "distance": "0.2 miles",
        "category": "attraction"
      },
      {
        "name": "Harbour Inn",
        "type": "Hotel & Restaurant",
        "icon": "\ud83c\udf7d\ufe0f",
        "distance": "0.3 miles",
        "category": "food"
      },
      {
        "name": "The Lochside Hotel",
        "type": "Hotel",
        "icon": "\ud83c\udfe8",
        "distance": "0.4 miles",
        "category": "accommodation"
      }
    ],
    "nextStops": [
      "bruichladdich",
      "caol_ila"
    ],
    "source": "mock"
  },
  {
    "id": "bruichladdich",
    "slug": "bruichladdich",
    "name": "Bruichladdich",
    "region": "West Islay",
    "style": "Unpeated / Heavily Peated",
    "lat": 55.7638,
    "lng": -6.3605,
    "founded": 1881,
    "tagline": "Progressive Hebridean distiller. Terroir-driven. Unapologetic.",
    "description": "Bruichladdich is the maverick of Islay distilleries. Independently minded and terroir-obsessed, it produces three distinct styles: the unpeated Bruichladdich, the heavily peated Port Charlotte, and Octomore \u2014 the world's most heavily peated whisky. The Victorian distillery on the shores of Loch Indaal has been meticulously restored.",
    "image": "https://images.unsplash.com/photo-1547321430-87fec39c6952?w=1400&q=80",
    "tours": [
      {
        "name": "Distillery Tour",
        "duration": "1 hr 15 min",
        "price": 10,
        "description": "Guided tour with two spirit tastings."
      },
      {
        "name": "The Progressive Tour",
        "duration": "2 hrs",
        "price": 40,
        "description": "A deep-dive across all three expressions with a distillery guide."
      }
    ],
    "hours": "Mon\u2013Sat: 09:00\u201317:00, Sun: 10:00\u201316:00",
    "priceFrom": "\u00a310",
    "avgVisit": "1 hr",
    "parking": "Free on-site",
    "accessibility": "Wheelchair accessible",
    "motorhomeFriendly": true,
    "giftShop": true,
    "restaurantName": null,
    "facilities": [
      "Gift Shop",
      "Free Parking",
      "Daily Tours",
      "Wheelchair Access"
    ],
    "nearby": [
      {
        "name": "Loch Indaal Shore Walk",
        "type": "Scenic Walk",
        "icon": "\ud83d\udeb6",
        "distance": "Adjacent",
        "category": "walk"
      },
      {
        "name": "Port Charlotte Village",
        "type": "Village",
        "icon": "\ud83c\udfd8\ufe0f",
        "distance": "3 miles",
        "category": "attraction"
      },
      {
        "name": "The Croft Kitchen",
        "type": "Restaurant",
        "icon": "\ud83c\udf7d\ufe0f",
        "distance": "3 miles",
        "category": "food"
      }
    ],
    "nextStops": [
      "bowmore",
      "kilchoman"
    ],
    "source": "mock"
  },
  {
    "id": "kilchoman",
    "slug": "kilchoman",
    "name": "Kilchoman",
    "region": "West Islay",
    "style": "Medium Peated",
    "lat": 55.7919,
    "lng": -6.4419,
    "founded": 2005,
    "tagline": "Islay's farm distillery \u2014 the most westerly in Scotland.",
    "description": "Kilchoman is Islay's newest farm distillery, growing its own barley, malting on-site and bottling everything at source. Sitting on a working farm in the wild west of Islay, it offers one of the most authentic distillery experiences in Scotland. The caf\u00e9 serves exceptional homemade food using local produce.",
    "image": "https://images.unsplash.com/photo-1659977193681-c40fa885527e?w=1400&q=80",
    "tours": [
      {
        "name": "Farm Distillery Tour",
        "duration": "1 hr 15 min",
        "price": 10,
        "description": "Explore the full farm-to-bottle process with tastings."
      },
      {
        "name": "The Field to Bottle Experience",
        "duration": "3 hrs",
        "price": 75,
        "description": "Exclusive access from barley field to cask with expert guide."
      }
    ],
    "hours": "Mon\u2013Sat: 10:00\u201317:00",
    "priceFrom": "\u00a310",
    "avgVisit": "1.5 hrs",
    "parking": "Free on-site",
    "accessibility": "Limited access (working farm)",
    "motorhomeFriendly": true,
    "giftShop": true,
    "restaurantName": "Kilchoman Caf\u00e9",
    "facilities": [
      "Farm Caf\u00e9",
      "Gift Shop",
      "Free Parking",
      "Dog Friendly",
      "Farm Setting"
    ],
    "nearby": [
      {
        "name": "Machir Bay Beach",
        "type": "Beach",
        "icon": "\ud83c\udfd6\ufe0f",
        "distance": "0.5 miles",
        "category": "beach"
      },
      {
        "name": "Loch Gorm",
        "type": "Scenic Loch",
        "icon": "\ud83e\udda2",
        "distance": "1.5 miles",
        "category": "viewpoint"
      },
      {
        "name": "Saligo Bay",
        "type": "Beach",
        "icon": "\ud83c\udf0a",
        "distance": "2 miles",
        "category": "beach"
      }
    ],
    "nextStops": [
      "bruichladdich",
      "caol_ila"
    ],
    "source": "mock"
  },
  {
    "id": "caol_ila",
    "slug": "caol_ila",
    "name": "Caol Ila",
    "region": "North Islay",
    "style": "Heavily Peated",
    "lat": 55.8819,
    "lng": -6.1044,
    "founded": 1846,
    "tagline": "The hidden giant \u2014 panoramic views, coastal peat.",
    "description": "Caol Ila sits in a dramatic position overlooking the narrow strait that separates Islay from the Jura peninsula. One of Scotland's highest-volume malt distilleries, it maintains exceptional quality. The views across to the Paps of Jura from the stillroom windows are among the finest of any distillery in Scotland.",
    "image": "https://images.unsplash.com/photo-1542741081-bc7afc3480fe?w=1400&q=80",
    "tours": [
      {
        "name": "Caol Ila Distillery Tour",
        "duration": "1 hr",
        "price": 10,
        "description": "Guided tour with two tastings overlooking the Sound of Islay."
      },
      {
        "name": "The Hidden Giant Experience",
        "duration": "2 hrs",
        "price": 50,
        "description": "Extended tour including warehouse visit and five expression tasting."
      }
    ],
    "hours": "Mon\u2013Fri: 09:30\u201317:00",
    "priceFrom": "\u00a310",
    "avgVisit": "1 hr",
    "parking": "On-site",
    "accessibility": "Limited (steep approach)",
    "motorhomeFriendly": false,
    "giftShop": true,
    "restaurantName": null,
    "facilities": [
      "Gift Shop",
      "Parking",
      "Jura Views",
      "Tours Weekdays"
    ],
    "nearby": [
      {
        "name": "Sound of Islay Viewpoint",
        "type": "Viewpoint",
        "icon": "\ud83c\udf05",
        "distance": "Adjacent",
        "category": "viewpoint"
      },
      {
        "name": "Port Askaig Ferry",
        "type": "Ferry",
        "icon": "\u26f4\ufe0f",
        "distance": "1 mile",
        "category": "attraction"
      },
      {
        "name": "Port Askaig Hotel",
        "type": "Hotel",
        "icon": "\ud83c\udfe8",
        "distance": "1 mile",
        "category": "accommodation"
      }
    ],
    "nextStops": [
      "bunnahabhain",
      "ardnahoe"
    ],
    "source": "mock"
  },
  {
    "id": "bunnahabhain",
    "slug": "bunnahabhain",
    "name": "Bunnahabhain",
    "region": "North Islay",
    "style": "Lightly Peated",
    "lat": 55.9125,
    "lng": -6.1269,
    "founded": 1881,
    "tagline": "An old sailor's welcome at the end of a wild road.",
    "description": "Bunnahabhain sits at the end of a single-track road at the northern tip of Islay. Its name means 'mouth of the river' in Gaelic. Its whisky bucks the Islay trend \u2014 lighter and maritime \u2014 though a heavily peated expression is available. The setting, with views across to Jura, is exceptional.",
    "image": "https://images.unsplash.com/photo-1547321430-87fec39c6952?w=1400&q=80",
    "tours": [
      {
        "name": "Bunnahabhain Distillery Tour",
        "duration": "1 hr 15 min",
        "price": 10,
        "description": "Guided tour with two expression tastings."
      },
      {
        "name": "Warehouse Experience",
        "duration": "2 hrs",
        "price": 40,
        "description": "Warehouse tasting direct from cask with expert guide."
      }
    ],
    "hours": "Mon\u2013Fri: 10:00\u201316:00, Sat: 10:00\u201314:00",
    "priceFrom": "\u00a310",
    "avgVisit": "1.5 hrs",
    "parking": "Free on-site",
    "accessibility": "Limited (remote road)",
    "motorhomeFriendly": false,
    "giftShop": true,
    "restaurantName": null,
    "facilities": [
      "Gift Shop",
      "Free Parking",
      "Remote Setting",
      "Dog Friendly"
    ],
    "nearby": [
      {
        "name": "Rubha Mor Headland",
        "type": "Headland Walk",
        "icon": "\ud83c\udf0a",
        "distance": "0.5 miles",
        "category": "walk"
      },
      {
        "name": "Paps of Jura View",
        "type": "Viewpoint",
        "icon": "\ud83c\udfd4\ufe0f",
        "distance": "On-site",
        "category": "viewpoint"
      }
    ],
    "nextStops": [
      "caol_ila",
      "ardnahoe"
    ],
    "source": "mock"
  },
  {
    "id": "ardnahoe",
    "slug": "ardnahoe",
    "name": "Ardnahoe",
    "region": "North Islay",
    "style": "Unpeated",
    "lat": 55.8944,
    "lng": -6.1127,
    "founded": 2019,
    "tagline": "Islay's newest distillery \u2014 and its highest.",
    "description": "Ardnahoe is the newest and highest distillery on Islay, opened in 2019. Its stillroom offers extraordinary panoramic views across the Sound of Islay to the Paps of Jura. The distillery caf\u00e9 is exceptional and the copper pot stills \u2014 the tallest on Islay \u2014 produce a light, fruity spirit generating considerable excitement.",
    "image": "https://images.unsplash.com/photo-1659977193681-c40fa885527e?w=1400&q=80",
    "tours": [
      {
        "name": "Ardnahoe Distillery Tour",
        "duration": "1 hr",
        "price": 10,
        "description": "Guided tour of Islay's newest distillery with tasting."
      },
      {
        "name": "The Panorama Experience",
        "duration": "2 hrs",
        "price": 55,
        "description": "Extended tour with warehouse visit and views across to Jura."
      }
    ],
    "hours": "Mon\u2013Sun: 10:00\u201317:00",
    "priceFrom": "\u00a310",
    "avgVisit": "1.25 hrs",
    "parking": "Free on-site",
    "accessibility": "Fully wheelchair accessible",
    "motorhomeFriendly": true,
    "giftShop": true,
    "restaurantName": "Ardnahoe Caf\u00e9",
    "facilities": [
      "Caf\u00e9",
      "Gift Shop",
      "Free Parking",
      "Wheelchair Access",
      "Jura Views"
    ],
    "nearby": [
      {
        "name": "Paps of Jura Panorama",
        "type": "Viewpoint",
        "icon": "\ud83c\udfd4\ufe0f",
        "distance": "On-site",
        "category": "viewpoint"
      },
      {
        "name": "Caol Ila Walk",
        "type": "Coastal Walk",
        "icon": "\ud83d\udeb6",
        "distance": "2 miles",
        "category": "walk"
      }
    ],
    "nextStops": [
      "caol_ila",
      "bunnahabhain"
    ],
    "source": "mock"
  }
];
