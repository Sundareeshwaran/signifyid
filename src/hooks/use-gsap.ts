"use client";

import { useEffect, useRef } from "react";

// Lazy-loaded GSAP instance
let gsapPromise: Promise<typeof import("gsap")> | null = null;
let scrollTriggerPromise: Promise<typeof import("gsap/ScrollTrigger")> | null =
  null;

// Lazy load GSAP and ScrollTrigger
async function loadGsap() {
  if (!gsapPromise) {
    gsapPromise = import("gsap");
    scrollTriggerPromise = import("gsap/ScrollTrigger");
  }
  const [gsapModule, scrollTriggerModule] = await Promise.all([
    gsapPromise,
    scrollTriggerPromise,
  ]);
  const gsap = gsapModule.default;
  const ScrollTrigger = scrollTriggerModule!.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  return { gsap, ScrollTrigger };
}

/**
 * Check if user prefers reduced motion
 */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Hook for scroll-triggered reveal animation
 */
export function useScrollReveal<T extends HTMLElement>(
  options: {
    y?: number;
    x?: number;
    opacity?: number;
    duration?: number;
    delay?: number;
    ease?: string;
    start?: string;
  } = {}
) {
  const ref = useRef<T>(null);

  const {
    y = 40,
    x = 0,
    opacity = 0,
    duration = 0.6,
    delay = 0,
    ease = "power2.out",
    start = "top 85%",
  } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Respect reduced motion preference
    if (prefersReducedMotion()) {
      element.style.opacity = "1";
      element.style.transform = "none";
      return;
    }

    let ctx: { revert: () => void } | null = null;

    loadGsap().then(({ gsap }) => {
      gsap.set(element, { opacity, y, x });

      ctx = gsap.context(() => {
        gsap.to(element, {
          opacity: 1,
          y: 0,
          x: 0,
          duration,
          delay,
          ease,
          scrollTrigger: {
            trigger: element,
            start,
            toggleActions: "play none none none",
          },
        });
      });
    });

    return () => ctx?.revert();
  }, [y, x, opacity, duration, delay, ease, start]);

  return ref;
}

/**
 * Hook for staggered reveal of child elements
 */
export function useStaggeredReveal<T extends HTMLElement>(
  childSelector: string,
  options: {
    y?: number;
    opacity?: number;
    duration?: number;
    stagger?: number;
    ease?: string;
    start?: string;
  } = {}
) {
  const ref = useRef<T>(null);

  const {
    y = 30,
    opacity = 0,
    duration = 0.5,
    stagger = 0.1,
    ease = "power2.out",
    start = "top 85%",
  } = options;

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const children = container.querySelectorAll(childSelector);
    if (children.length === 0) return;

    // Respect reduced motion preference
    if (prefersReducedMotion()) {
      children.forEach((child) => {
        (child as HTMLElement).style.opacity = "1";
        (child as HTMLElement).style.transform = "none";
      });
      return;
    }

    let ctx: { revert: () => void } | null = null;

    loadGsap().then(({ gsap }) => {
      gsap.set(children, { opacity, y });

      ctx = gsap.context(() => {
        gsap.to(children, {
          opacity: 1,
          y: 0,
          duration,
          stagger,
          ease,
          scrollTrigger: {
            trigger: container,
            start,
            toggleActions: "play none none none",
          },
        });
      });
    });

    return () => ctx?.revert();
  }, [childSelector, y, opacity, duration, stagger, ease, start]);

  return ref;
}

/**
 * Hook for hero entrance animation (no scroll trigger)
 */
export function useHeroAnimation<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Respect reduced motion preference
    if (prefersReducedMotion()) {
      Array.from(element.children).forEach((child) => {
        (child as HTMLElement).style.opacity = "1";
        (child as HTMLElement).style.transform = "none";
      });
      return;
    }

    let ctx: { revert: () => void } | null = null;

    loadGsap().then(({ gsap }) => {
      const children = element.children;
      ctx = gsap.context(() => {
        gsap.set(children, { opacity: 0, y: 30 });
        gsap.to(children, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.12,
          ease: "power2.out",
          delay: 0.1,
        });
      });
    });

    return () => ctx?.revert();
  }, []);

  return ref;
}

/**
 * Hook for timeline/step animation with line drawing effect
 */
export function useTimelineAnimation<T extends HTMLElement>(
  stepSelector: string,
  lineSelector?: string
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const steps = container.querySelectorAll(stepSelector);
    const line = lineSelector ? container.querySelector(lineSelector) : null;

    // Respect reduced motion preference
    if (prefersReducedMotion()) {
      steps.forEach((step) => {
        (step as HTMLElement).style.opacity = "1";
        (step as HTMLElement).style.transform = "none";
      });
      if (line) (line as HTMLElement).style.transform = "scaleY(1)";
      return;
    }

    let ctx: { revert: () => void } | null = null;

    loadGsap().then(({ gsap }) => {
      gsap.set(steps, { opacity: 0, y: 20 });
      if (line) gsap.set(line, { scaleY: 0, transformOrigin: "top" });

      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: container,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        });

        if (line) {
          tl.to(line, {
            scaleY: 1,
            duration: 0.8,
            ease: "power2.out",
          });
        }

        tl.to(
          steps,
          {
            opacity: 1,
            y: 0,
            duration: 0.4,
            stagger: 0.15,
            ease: "power2.out",
          },
          line ? "-=0.4" : 0
        );
      });
    });

    return () => ctx?.revert();
  }, [stepSelector, lineSelector]);

  return ref;
}
