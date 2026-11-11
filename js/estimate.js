// Wait-time calculation. Pure functions, no page code, so they are easy to
// test and explain.
//
// Wait = (orders still waiting + your order) / orders completed per minute recently
window.SS = window.SS || {};

(function () {
  const MIN = 60000;
  const WINDOW_MIN = 10;      // how far back "recently" looks
  const LIVE_MAX_AGE = 2;     // minutes: newer data than this counts as live
  const STALE_AGE = 15;       // minutes: older than this, no estimate is shown
  const EN_ROUTE_MIN = 5;     // minutes a suggestion counts as "on the way"

  function stallStats(stall, state, now = Date.now()) {
    const mine = state.orders.filter((o) => o.stallId === stall.id);
    const waiting = mine.filter((o) => !o.readyAt);
    const windowStart = now - WINDOW_MIN * MIN;
    const doneRecent = mine.filter((o) => o.readyAt && o.readyAt > windowStart && o.readyAt <= now);

    // If the stall only started recording a few minutes ago, measure over that
    // shorter span instead of the full window.
    const firstActivity = mine.length ? Math.min(...mine.map((o) => o.createdAt)) : now;
    const spanMin = Math.max(2, Math.min(WINDOW_MIN, (now - firstActivity) / MIN));

    let rate;
    let confidence;
    if (doneRecent.length >= 3) {
      rate = doneRecent.length / spanMin;
      confidence = "measured";
    } else {
      rate = stall.baseRate;
      confidence = "typical";
    }
    rate = Math.max(rate, 0.2);

    const meta = state.stalls[stall.id];
    const activity = mine.map((o) => Math.max(o.createdAt, o.readyAt || 0));
    const lastActivity = Math.max(meta && meta.lastSeen ? meta.lastSeen : 0, ...activity, 0);
    const ageMin = lastActivity ? (now - lastActivity) / MIN : Infinity;

    const enRoute = (state.recs || []).filter(
      (r) => r.stallId === stall.id && r.at > now - EN_ROUTE_MIN * MIN
    ).length;

    const waitMid = (waiting.length + 1) / rate;
    const low = Math.max(1, Math.round(waitMid * 0.8));
    const high = Math.max(low + 2, Math.round(waitMid * 1.3));

    const freshness = ageMin <= LIVE_MAX_AGE ? "live" : ageMin <= STALE_AGE ? "recent" : "stale";
    const available = freshness !== "stale";

    let label;
    if (!available) label = "Estimate unavailable";
    else if (freshness === "recent") label = "Recent report";
    else if (confidence === "measured") label = "Live";
    else label = "Estimate";

    let level = "unknown";
    if (available) level = high <= 10 ? "ok" : high <= 20 ? "busy" : "very-busy";

    return {
      stall, waiting: waiting.length, doneRecent: doneRecent.length, rate, confidence,
      low, high, waitMid, ageMin, freshness, available, label, level, enRoute
    };
  }

  function formatAge(ageMin) {
    if (ageMin < 1) return "just now";
    if (ageMin < 60) return `${Math.round(ageMin)} min ago`;
    return `${Math.floor(ageMin / 60)} hr ago`;
  }

  // Explains the label in plain words for the student page.
  function labelDetail(st) {
    if (!st.available) {
      return st.ageMin === Infinity ? "No data from this stall yet" : `Last updated ${formatAge(st.ageMin)}`;
    }
    if (st.freshness === "recent") return `Last updated ${formatAge(st.ageMin)}`;
    if (st.confidence === "typical") return "Based on this stall's typical speed";
    return "Based on the last 10 minutes";
  }

  // Smart spreading: counts students already sent to each stall as part of its
  // queue, so the next student is not sent to the same place.
  function recommend(statsList) {
    const options = statsList.filter((s) => s.available);
    if (!options.length) return null;
    let best = null;
    for (const s of options) {
      const projectedWait = (s.waiting + s.enRoute + 1) / s.rate;
      const total = s.stall.walk + projectedWait;
      if (!best || total < best.total) best = { stats: s, projectedWait, total };
    }
    return best;
  }

  // "Will I make it?" uses the high end of the range to stay on the safe side.
  function willIMakeIt(st, classTime, { walkToClass = 5, eatMins = 15 } = {}, now = Date.now()) {
    if (!st.available) return { verdict: "unknown" };
    const foodAt = now + (st.stall.walk + st.high) * MIN;
    const arrive = foodAt + (eatMins + walkToClass) * MIN;
    const spare = (classTime - arrive) / MIN;
    const verdict = spare >= 5 ? "yes" : spare >= 0 ? "tight" : "no";
    return { verdict, spare: Math.floor(spare), foodAt };
  }

  SS.estimate = { stallStats, labelDetail, formatAge, recommend, willIMakeIt, WINDOW_MIN };
})();
