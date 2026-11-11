// Smart spreading test: runs the same lunch rush twice and compares waits.
//
// "Shortest queue" = what a plain queue app does. Every student goes to the
// stall with the shortest wait on screen, which only refreshes once a minute
// and doesn't know who is already walking there.
//
// "Smart spreading" = StallSense. It also counts students it has already sent
// to each stall who haven't arrived yet.
//
// Assumptions (say these in the pitch): every student follows the suggestion,
// everyone walks the same time, and each stall works at a steady speed.
window.SS = window.SS || {};

(function () {
function rng(seed) {
  // Small seeded random generator, so the same settings give the same result.
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function arrivals(students, minutes, seed) {
  const r = rng(seed);
  const times = [];
  for (let i = 0; i < students; i++) {
    // Average of three randoms peaks in the middle, like a lunch rush.
    times.push(((r() + r() + r()) / 3) * minutes);
  }
  return times.sort((a, b) => a - b);
}

function simulate(stalls, times, { walk, refresh, strategy }) {
  const lanes = stalls.map(() => ({ joins: [], nextFree: 0 }));

  // People standing in the queue at time t (joined and not served yet).
  const queueAt = (lane, t) => lane.joins.filter((j) => j.join <= t && j.done > t).length;
  // People already sent but still walking there.
  const enRouteAt = (lane, t) => lane.joins.filter((j) => j.chose <= t && j.join > t).length;

  const waits = [];
  for (const t of times) {
    let best = 0;
    let bestScore = Infinity;
    stalls.forEach((s, i) => {
      let people;
      if (strategy === "smart") {
        people = queueAt(lanes[i], t) + enRouteAt(lanes[i], t);
      } else {
        const shownAt = Math.floor(t / refresh) * refresh;
        people = queueAt(lanes[i], shownAt);
      }
      const score = (people + 1) / s.baseRate;
      if (score < bestScore) { bestScore = score; best = i; }
    });
    const lane = lanes[best];
    const join = t + walk;
    const start = Math.max(join, lane.nextFree);
    const done = start + 1 / stalls[best].baseRate;
    lane.nextFree = done;
    lane.joins.push({ chose: t, join, done });
    waits.push({ stall: best, wait: done - join });
  }

  const perStall = stalls.map((s, i) => {
    const mine = waits.filter((w) => w.stall === i);
    return {
      name: s.name,
      students: mine.length,
      longest: mine.reduce((m, w) => Math.max(m, w.wait), 0)
    };
  });
  const total = waits.reduce((sum, w) => sum + w.wait, 0);
  return {
    longest: waits.reduce((m, w) => Math.max(m, w.wait), 0),
    average: waits.length ? total / waits.length : 0,
    over15: waits.filter((w) => w.wait > 15).length,
    perStall
  };
}

SS.runSpreadTest = function (stalls, { students = 150, minutes = 30, walk = 3, refresh = 1, seed = 7 } = {}) {
  const times = arrivals(students, minutes, seed);
  return {
    plain: simulate(stalls, times, { walk, refresh, strategy: "plain" }),
    smart: simulate(stalls, times, { walk, refresh, strategy: "smart" })
  };
};
})();
