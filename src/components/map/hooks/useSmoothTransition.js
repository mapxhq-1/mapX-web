import { useRef, useCallback, useEffect } from 'react';

/**
 * Hook for smooth animated transitions between states
 */
export function useSmoothTransition(options = {}) {
    const {
        duration = 300,
        easing = 'easeOutCubic',
        onFrame,
        onComplete
    } = options;

    const animationRef = useRef(null);
    const startTimeRef = useRef(null);
    const fromValueRef = useRef(null);
    const toValueRef = useRef(null);

    // Easing functions
    const easings = {
        linear: t => t,
        easeOutCubic: t => 1 - Math.pow(1 - t, 3),
        easeOutQuart: t => 1 - Math.pow(1 - t, 4),
        easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    };

    const animate = useCallback((timestamp) => {
        if (!startTimeRef.current) {
            startTimeRef.current = timestamp;
        }

        const elapsed = timestamp - startTimeRef.current;
        const rawProgress = Math.min(elapsed / duration, 1);
        const easedProgress = easings[easing]?.(rawProgress) || rawProgress;

        if (onFrame) {
            onFrame(easedProgress, fromValueRef.current, toValueRef.current);
        }

        if (rawProgress < 1) {
            animationRef.current = requestAnimationFrame(animate);
        } else {
            animationRef.current = null;
            startTimeRef.current = null;
            if (onComplete) {
                onComplete(toValueRef.current);
            }
        }
    }, [duration, easing, onFrame, onComplete]);

    const start = useCallback((from, to) => {
        // Cancel existing animation
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }

        fromValueRef.current = from;
        toValueRef.current = to;
        startTimeRef.current = null;
        animationRef.current = requestAnimationFrame(animate);
    }, [animate]);

    const stop = useCallback(() => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
    }, []);

    const isAnimating = useCallback(() => {
        return animationRef.current !== null;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    return { start, stop, isAnimating };
}