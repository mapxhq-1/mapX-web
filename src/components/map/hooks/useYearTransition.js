import { useRef, useCallback, useEffect } from 'react';
import { debounce } from '../utils/mapPerformance';

/**
 * Hook for handling smooth year transitions with debouncing
 */
export function useYearTransition(options = {}) {
    const { 
        debounceMs = 200,  // Debounce rapid year changes
        onYearChange,      // Callback when year actually changes
        onYearChangeStart, // Callback when year starts changing
        onYearChangeEnd    // Callback when year finishes changing
    } = options;
    
    const lastYearRef = useRef(null);
    const isTransitioningRef = useRef(false);
    const pendingCallsRef = useRef([]);
    
    // Debounced year change handler
    const debouncedYearChange = useRef(
        debounce((year, callbacks) => {
            const { onChange, onStart, onEnd } = callbacks;
            
            if (lastYearRef.current === year) {
                isTransitioningRef.current = false;
                return;
            }
            
            // Signal transition start
            if (onStart && !isTransitioningRef.current) {
                onStart(year, lastYearRef.current);
            }
            
            isTransitioningRef.current = true;
            lastYearRef.current = year;
            
            // Execute the change
            if (onChange) {
                Promise.resolve(onChange(year))
                    .then(() => {
                        isTransitioningRef.current = false;
                        if (onEnd) onEnd(year);
                        
                        // Process any pending calls
                        if (pendingCallsRef.current.length > 0) {
                            const latestCall = pendingCallsRef.current.pop();
                            pendingCallsRef.current = [];
                            latestCall();
                        }
                    })
                    .catch((err) => {
                        console.error('Year change error:', err);
                        isTransitioningRef.current = false;
                    });
            } else {
                isTransitioningRef.current = false;
                if (onEnd) onEnd(year);
            }
        }, debounceMs)
    ).current;
    
    // Public API
    const triggerYearChange = useCallback((year) => {
        debouncedYearChange(year, {
            onChange: onYearChange,
            onStart: onYearChangeStart,
            onEnd: onYearChangeEnd
        });
    }, [onYearChange, onYearChangeStart, onYearChangeEnd, debouncedYearChange]);
    
    const isTransitioning = useCallback(() => isTransitioningRef.current, []);
    
    const cancelTransition = useCallback(() => {
        debouncedYearChange.cancel && debouncedYearChange.cancel();
        pendingCallsRef.current = [];
        isTransitioningRef.current = false;
    }, [debouncedYearChange]);
    
    // Cleanup
    useEffect(() => {
        return () => {
            cancelTransition();
        };
    }, [cancelTransition]);
    
    return {
        triggerYearChange,
        isTransitioning,
        cancelTransition
    };
}