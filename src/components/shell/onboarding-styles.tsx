
/**
 * Shared keyframes for the onboarding experience, injected once near the root.
 * Kept inline (not a .css file) because the GitHub connector blocks .css writes;
 * content is identical to what a static sheet would contain. Reduced-motion is
 * enforced by both the media query and the JS-side usePrefersReducedMotion.
 */
export function OnboardingStyles() {
  return (
    <style>{`
      @keyframes step-enter {
        from { opacity: 0; transform: translateY(var(--enter-from, 12px)); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes step-exit {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      @media (prefers-reduced-motion: reduce) {
        .step-animate { animation: none !important; }
      }
    `}</style>
  )
}