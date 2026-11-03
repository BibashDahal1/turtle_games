/**
 * Tells the turtle which section of the page you are in.
 *
 * Every top-level <section> on the page is one "habitat" (index 0 = the hero).
 * `desired` is what the turtle should do:
 *   0      -> be the hero mascot (as long as the hero is the section under the middle of the screen)
 *   1..n   -> live in that section (reached once the section's top passes the middle of the screen)
 * It is debounced and has a little hysteresis, so flicking past (or hovering on) a boundary does not
 * make the turtle change its mind.
 *
 * `bounds(i)` gives the section's top / bottom in document pixels (the director anchors the turtle in it).
 */
export interface SectionInfo {
  index: number; // section under the middle of the screen
  count: number; // how many sections
  desired: number; // 0 = hero spot, otherwise the section the turtle should be in
}

const HYSTERESIS = 0.04; // fraction of a screen height a boundary must pass the middle before the index flips
const DEBOUNCE = 0.25; // seconds a new section must stay current

export function createSectionTracker() {
  let els: HTMLElement[] = [];
  let clock = 0,
    lastQuery = -1e9,
    lastMeasure = -1e9,
    candSince = 0;
  const info: SectionInfo = { index: 0, count: 1, desired: 0 };
  let cand = 0;

  const query = () => {
    els = Array.from(document.querySelectorAll<HTMLElement>("section")).filter(
      (e) => !e.parentElement?.closest("section"),
    );
  };

  /** section edges in document pixels (falls back to one screen per "section" when there are no <section> tags) */
  function bounds(i: number) {
    const y = window.scrollY;
    const vh = window.innerHeight;
    const el = els[i];
    if (el) {
      const r = el.getBoundingClientRect();
      return { top: r.top + y, bottom: r.bottom + y };
    }
    return { top: i * vh, bottom: (i + 1) * vh };
  }

  function update(dt: number): SectionInfo {
    clock += dt;
    if (clock - lastQuery > 1.5) {
      query();
      lastQuery = clock;
    }
    if (clock - lastMeasure > 0.1) {
      lastMeasure = clock;
      const vh = window.innerHeight,
        y = window.scrollY,
        mid = vh * 0.5;
      if (els.length) {
        info.count = els.length;
        if (info.index > els.length - 1) info.index = els.length - 1;
        let idx = 0;
        for (let i = 0; i < els.length; i++)
          if (els[i].getBoundingClientRect().top <= mid) idx = i;
        if (idx !== info.index) {
          const m = vh * HYSTERESIS;
          const ok =
            idx > info.index
              ? els[idx].getBoundingClientRect().top <= mid - m // next section really passed the middle
              : els[info.index].getBoundingClientRect().top > mid + m; // we really went back above it
          if (ok) info.index = idx;
        }
      } else {
        // no <section> tags found: fall back to one "section" per screen
        info.count = Math.max(
          1,
          Math.ceil(document.documentElement.scrollHeight / vh),
        );
        info.index = Math.min(info.count - 1, Math.max(0, Math.round(y / vh)));
      }
      // the turtle only leaves the hero once the NEXT section / screen is reached
      const want = info.index === 0 ? 0 : info.index;
      if (want !== cand) {
        cand = want;
        candSince = clock;
      }
      if (cand !== info.desired && clock - candSince >= DEBOUNCE)
        info.desired = cand;
    }
    return info;
  }
  return { update, bounds };
}
