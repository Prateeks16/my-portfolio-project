import { useEffect } from 'react';

/**
 * Pointer-driven decoration for the public portfolio.
 *
 * Both hooks are decoration, so both refuse to attach anything at all when the
 * pointer is coarse (a tap fires a false hover) or the visitor asked for
 * reduced motion. Neither is ever used in the CRM: that surface is a tool.
 *
 * Everything is written straight onto the animated element's `transform`.
 * Setting a custom property on a parent instead would recalculate styles for
 * every child on every pointer move, which is the expensive way to do this.
 */

const canDecorate = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A soft highlight that follows the cursor across the cards inside `ref`.
 *
 * One delegated listener for the whole grid rather than one per card, and at
 * most one write per frame — pointermove fires far faster than the display.
 */
export const useSpotlight = (ref) => {
  useEffect(() => {
    const container = ref.current;
    if (!container || !canDecorate()) return undefined;

    let frame = 0;
    let latest = null;

    const paint = () => {
      frame = 0;
      if (!latest) return;
      const { card, x, y } = latest;
      const glow = card.querySelector('.spotlight');
      if (glow) glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const onMove = (event) => {
      const card = event.target.closest?.('[data-spotlight]');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      latest = {
        card,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      if (!frame) frame = requestAnimationFrame(paint);
    };

    container.addEventListener('pointermove', onMove);
    return () => {
      container.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref]);
};

const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));

/* Spring constants. Pinning an element straight to the cursor reads as
   artificial — it has position but no motion of its own. Integrating toward
   the cursor through a spring is what makes the pull feel magnetic: it lags
   slightly on the way out, overshoots a little on release, and settles.
   Damping is kept high enough that the overshoot is felt rather than seen. */
const STIFFNESS = 0.14;
const DAMPING = 0.74;
const REST = 0.01; // below this, stop integrating and park the value

/* Critically damped: no overshoot at all, settling in ~14 frames. Apple's rule
   is that bounce belongs only where the gesture itself carried momentum — a
   flick, a throw. A cursor gliding over letters carries none, so overshoot here
   would read as wobble rather than as physics. */
const LETTER_STIFFNESS = 0.18;
const LETTER_DAMPING = 0.49;

/** One spring-integrated scalar. Cheaper than a library and easier to reason
 *  about than a chain of transitions, and every consumer here needs several. */
const spring = (initial, stiffness = STIFFNESS, damping = DAMPING) => ({
  value: initial,
  target: initial,
  velocity: 0,
  step() {
    this.velocity = (this.velocity + (this.target - this.value) * stiffness) * damping;
    this.value += this.velocity;
    const settled =
      Math.abs(this.velocity) < REST && Math.abs(this.target - this.value) < REST;
    if (settled) this.value = this.target;
    return settled;
  },
  parked(rest) {
    return this.target === rest && this.value === rest;
  },
});

/**
 * Pulls an element a few pixels toward the cursor while it is nearby, then
 * springs back when the cursor leaves. Applied to a wrapper, never to the
 * button itself — the pills carry `active:scale-[0.98]`, and an inline
 * transform on the same element would silently kill that press feedback.
 */
export const useMagnetic = (ref, { max = 6, range = 80 } = {}) => {
  useEffect(() => {
    const element = ref.current;
    if (!element || !canDecorate()) return undefined;

    let frame = 0;
    let pointer = null;
    const x = spring(0);
    const y = spring(0);

    const step = () => {
      if (pointer) {
        const rect = element.getBoundingClientRect();
        // The rect already includes the current offset, so subtract it to get
        // the resting centre — otherwise the element chases its own tail.
        const dx = pointer.x - (rect.left + rect.width / 2 - x.value);
        const dy = pointer.y - (rect.top + rect.height / 2 - y.value);
        const near =
          Math.abs(dx) < rect.width / 2 + range && Math.abs(dy) < rect.height / 2 + range;
        x.target = near ? clamp(dx * 0.35, max) : 0;
        y.target = near ? clamp(dy * 0.35, max) : 0;
      }

      const settled = [x.step(), y.step()].every(Boolean);
      element.style.transform = `translate3d(${x.value.toFixed(2)}px, ${y.value.toFixed(
        2
      )}px, 0)`;

      // Keep integrating until the spring is at rest AND parked at origin;
      // otherwise the loop stops running the moment the cursor stops moving.
      frame = settled && x.parked(0) && y.parked(0) ? 0 : requestAnimationFrame(step);
    };

    const onMove = (event) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(step);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref, max, range]);
};

/**
 * Leans an element toward the cursor in 3D and magnifies it slightly while the
 * pointer is over it. Three springs — two rotations and a scale — so the plate
 * banks into the movement and settles rather than snapping to an angle.
 *
 * Kept deliberately shallow: `maxTilt` past ~10deg stops reading as a plate
 * catching light and starts reading as a novelty. `perspective` is applied in
 * the element's own transform rather than on the parent, so nothing else in
 * the hero inherits a 3D context it did not ask for.
 */
export const useTilt = (ref, { maxTilt = 7, magnify = 1.03, perspective = 900 } = {}) => {
  useEffect(() => {
    const element = ref.current;
    if (!element || !canDecorate()) return undefined;

    let frame = 0;
    let pointer = null;
    const rotateX = spring(0);
    const rotateY = spring(0);
    const scale = spring(1);

    const step = () => {
      if (pointer) {
        const rect = element.getBoundingClientRect();
        const dx = (pointer.x - (rect.left + rect.width / 2)) / (rect.width / 2);
        const dy = (pointer.y - (rect.top + rect.height / 2)) / (rect.height / 2);
        const over = Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
        // Pointer below centre tips the near edge toward the viewer, so the
        // vertical axis is inverted — otherwise the plate leans away.
        rotateX.target = over ? clamp(-dy * maxTilt, maxTilt) : 0;
        rotateY.target = over ? clamp(dx * maxTilt, maxTilt) : 0;
        scale.target = over ? magnify : 1;
      }

      const settled = [rotateX.step(), rotateY.step(), scale.step()].every(Boolean);
      element.style.transform =
        `perspective(${perspective}px) ` +
        `rotateX(${rotateX.value.toFixed(3)}deg) ` +
        `rotateY(${rotateY.value.toFixed(3)}deg) ` +
        `scale(${scale.value.toFixed(4)})`;

      frame =
        settled && rotateX.parked(0) && rotateY.parked(0) && scale.parked(1)
          ? 0
          : requestAnimationFrame(step);
    };

    const onMove = (event) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(step);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref, maxTilt, magnify, perspective]);
};

/**
 * Dock magnification for text: every letter scales by its distance from the
 * cursor, so a smooth bulge travels along the word.
 *
 * Two details do most of the work. The falloff is Gaussian rather than linear,
 * because a linear ramp puts a visible crease at the edge of its radius. And
 * each letter is pushed right by the width its predecessors gained, so the
 * magnified letters make room for each other instead of colliding — that
 * cumulative offset is what separates this from every letter simply growing
 * in place.
 *
 * Layout is read once and cached: `transform` never affects layout, so the
 * letters' resting positions cannot drift. Per frame this reads exactly one
 * rect (the container's) rather than one per letter.
 */
export const useMagnify = (ref, { amplitude = 0.28, radius = 1.35 } = {}) => {
  useEffect(() => {
    const container = ref.current;
    if (!container || !canDecorate()) return undefined;

    const letters = Array.from(container.querySelectorAll('[data-letter]'));
    if (!letters.length) return undefined;

    const metrics = letters.map((node) => ({
      node,
      left: node.offsetLeft,
      top: node.offsetTop,
      width: node.offsetWidth,
      height: node.offsetHeight,
      scale: spring(1, LETTER_STIFFNESS, LETTER_DAMPING),
    }));

    // The bulge is sized off the type itself, so it stays proportional across
    // the hero's four breakpoints without a magic pixel value per breakpoint.
    const sigma = (metrics[0].height || 100) * radius;
    const sigmaY = (metrics[0].height || 100) * 0.7;

    let frame = 0;
    let pointer = null;

    const step = () => {
      if (pointer) {
        const box = container.getBoundingClientRect();
        metrics.forEach((letter) => {
          const dx = pointer.x - (box.left + letter.left + letter.width / 2);
          const dy = pointer.y - (box.top + letter.top + letter.height / 2);
          // Vertical falloff keeps the name still while the cursor is merely
          // somewhere else on the page.
          const reach = Math.exp(-((dx * dx) / (2 * sigma * sigma)))
            * Math.exp(-((dy * dy) / (2 * sigmaY * sigmaY)));
          letter.scale.target = 1 + amplitude * reach;
        });
      }

      let settled = true;
      let shift = 0;
      metrics.forEach((letter) => {
        settled = letter.scale.step() && settled;
        // Origin is the left baseline, so a letter grows rightward and its
        // successors move by exactly the width it gained.
        letter.node.style.transform = `translateX(${shift.toFixed(2)}px) scale(${letter.scale.value.toFixed(
          4
        )})`;
        shift += letter.width * (letter.scale.value - 1);
      });

      const parked = metrics.every((letter) => letter.scale.parked(1));
      frame = settled && parked ? 0 : requestAnimationFrame(step);
    };

    const onMove = (event) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(step);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref, amplitude, radius]);
};

/**
 * A pool of light that follows the cursor across the whole page.
 *
 * The element is deliberately only as large as its gradient rather than
 * full-viewport: `mix-blend-mode` forces the browser to re-composite whatever
 * sits beneath the blended box every frame, so a full-screen blended layer
 * costs the entire viewport per move. Bounding the box bounds the cost.
 *
 * It starts hidden and fades in on the first pointer event — otherwise the
 * glow sits parked in the top-left corner until the visitor moves the mouse.
 */
export const useCursorGlow = (ref) => {
  useEffect(() => {
    const element = ref.current;
    if (!element || !canDecorate()) return undefined;

    let frame = 0;
    let pointer = null;
    let revealed = false;
    const x = spring(0);
    const y = spring(0);

    const step = () => {
      if (pointer) {
        x.target = pointer.x;
        y.target = pointer.y;
      }

      const settled = [x.step(), y.step()].every(Boolean);
      element.style.transform = `translate3d(${x.value.toFixed(1)}px, ${y.value.toFixed(
        1
      )}px, 0)`;

      // Settled is enough to stop here: the glow parks wherever the cursor
      // left it rather than returning to an origin.
      frame = settled ? 0 : requestAnimationFrame(step);
    };

    const onMove = (event) => {
      if (!revealed) {
        revealed = true;
        // Jump to the first known position instead of gliding in from 0,0.
        x.value = event.clientX;
        y.value = event.clientY;
        element.style.opacity = '1';
      }
      pointer = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(step);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref]);
};
