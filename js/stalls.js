// Sample stalls for the prototype. These are not real APU stalls.
//
// baseRate: typical orders the stall finishes per minute. Used until there is
//           enough live data to measure the real speed.
// walk:     minutes to walk there from the main entrance.
window.SS = window.SS || {};

SS.STALLS = [
  { id: "chicken-rice", name: "Chicken Rice",    place: "Cafeteria, stall 1",  baseRate: 1.5, walk: 2 },
  { id: "noodles",      name: "Noodle House",    place: "Cafeteria, stall 2",  baseRate: 1.2, walk: 2 },
  { id: "western",      name: "Western Grill",   place: "Cafeteria, stall 3",  baseRate: 0.8, walk: 3 },
  { id: "mixed-rice",   name: "Mixed Rice",      place: "Cafeteria, stall 4",  baseRate: 2.0, walk: 3 },
  { id: "roti",         name: "Roti & Curry",    place: "Food court, stall 5", baseRate: 1.4, walk: 5 },
  { id: "drinks",       name: "Drinks & Snacks", place: "Food court, stall 6", baseRate: 2.5, walk: 5 }
];

SS.findStall = function (id) {
  return SS.STALLS.find((s) => s.id === id) || null;
};

// Small helpers shared by every page.
SS.esc = function (s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
};

SS.newId = function (prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};
