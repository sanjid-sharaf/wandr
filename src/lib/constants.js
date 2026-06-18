export const TRIP_TYPES = [
  { value: 'road',     label: '🚗 Road Trip',  cls: 'type-road'     },
  { value: 'vacation', label: '🌴 Vacation',    cls: 'type-vacation' },
  { value: 'city',     label: '🏙️ City Break',  cls: 'type-city'     },
  { value: 'custom',   label: '✨ Custom',       cls: 'type-custom'   },
];

export const CATEGORIES = [
  { value: 'restaurant', label: '🍽️ Restaurant', cls: 'cat-restaurant' },
  { value: 'cafe',       label: '☕ Cafe',        cls: 'cat-cafe'       },
  { value: 'bar',        label: '🍺 Bar',         cls: 'cat-bar'        },
  { value: 'park',       label: '🌿 Park',        cls: 'cat-park'       },
  { value: 'attraction', label: '🏛️ Attraction',  cls: 'cat-attraction' },
  { value: 'travel',     label: '🚌 Travel',      cls: 'cat-travel'     },
  { value: 'event',      label: '💃 Event',       cls: 'cat-event'      },
  { value: 'free',       label: '🎲 Free Time',   cls: 'cat-free'       },
];

export const COLLECTION_TYPES = [
  { value: 'restaurant', label: 'Restaurants', icon: '🍽️' },
  { value: 'bar',        label: 'Bars',        icon: '🍺' },
  { value: 'cafe',       label: 'Cafes',       icon: '☕' },
  { value: 'park',       label: 'Parks',       icon: '🌿' },
  { value: 'attraction', label: 'Attractions', icon: '🏛️' },
  { value: 'event',      label: 'Events',      icon: '💃' },
];

export const PERIODS = [
  { id: 'morning',   label: 'Morning',   range: '6am – 12pm' },
  { id: 'afternoon', label: 'Afternoon', range: '12pm – 6pm' },
  { id: 'evening',   label: 'Evening',   range: '6pm – late' },
];

export const catInfo      = (val) => CATEGORIES.find((c) => c.value === val)  || CATEGORIES[4];
export const tripTypeInfo = (val) => TRIP_TYPES.find((t) => t.value === val)  || TRIP_TYPES[3];

export const genId = () => Math.random().toString(36).slice(2, 9);
