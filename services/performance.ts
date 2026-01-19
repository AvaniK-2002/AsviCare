import React from 'react';

// Performance optimization utilities for ClinicTrack

// Debounce function for search and input handling
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
};

// Throttle function for scroll and resize handlers
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Memoization utility
export const memoize = <T extends (...args: any[]) => any>(
  fn: T,
  getKey?: (...args: Parameters<T>) => string
): T => {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

// Lazy loading for components
export const lazyLoad = (importFunc: () => Promise<any>, fallback?: React.ComponentType) => {
  return React.lazy(importFunc);
};

// Intersection Observer for lazy loading images and content
export const useIntersectionObserver = (
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [ref, options]);

  return isIntersecting;
};

// Virtual scrolling utilities
export const useVirtualScroll = (items: any[], itemHeight: number, containerHeight: number) => {
  const [scrollTop, setScrollTop] = React.useState(0);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight),
    items.length - 1
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    startIndex,
    endIndex,
    offsetY,
    onScroll: (event: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(event.currentTarget.scrollTop);
    },
  };
};

// React hooks for performance optimization
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useThrottle = <T>(value: T, delay: number): T => {
  const [throttledValue, setThrottledValue] = React.useState<T>(value);
  const lastRan = React.useRef<number>(Date.now());

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= delay) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, delay - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return throttledValue;
};

export const useMemoCompare = <T>(
  next: T,
  compare: (previous: T | undefined, next: T) => boolean
): T => {
  const previousRef = React.useRef<T>();
  const previous = previousRef.current;

  const isEqual = compare(previous, next);

  React.useEffect(() => {
    if (!isEqual) {
      previousRef.current = next;
    }
  });

  return isEqual ? previous! : next;
};

// Performance monitoring
export const performanceMonitor = {
  start: (name: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.time(name);
      performance.mark(`${name}-start`);
    }
  },

  end: (name: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.timeEnd(name);
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    }
  },

  measure: (name: string, fn: () => void) => {
    performanceMonitor.start(name);
    const result = fn();
    performanceMonitor.end(name);
    return result;
  },

  getMetrics: () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');

    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime,
      firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime,
    };
  },
};

// Bundle optimization helpers
export const dynamicImport = (moduleId: string) => {
  return import(/* webpackChunkName: "[request]" */ moduleId);
};

// Preload critical resources
export const preloadImage = (src: string) => {
  const img = new Image();
  img.src = src;
};

export const preloadModule = (moduleId: string) => {
  return import(/* webpackPreload: true */ moduleId);
};

// Cache API for HTTP requests
export const apiCache = {
  get: async (key: string): Promise<any | null> => {
    try {
      if ('caches' in window) {
        const cache = await caches.open('clinictrack-api-v1');
        const response = await cache.match(key);
        if (response) {
          return await response.json();
        }
      }
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  set: async (key: string, data: any, ttl: number = 300000): Promise<void> => {
    try {
      if ('caches' in window) {
        const cache = await caches.open('clinictrack-api-v1');
        const response = new Response(JSON.stringify(data), {
          headers: {
            'content-type': 'application/json',
            'sw-cache-expires': (Date.now() + ttl).toString(),
          },
        });
        await cache.put(key, response);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  },

  clear: async (): Promise<void> => {
    try {
      if ('caches' in window) {
        await caches.delete('clinictrack-api-v1');
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  },
};

// React component optimization HOCs
export const withMemo = <P extends object>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  return React.memo(Component, propsAreEqual);
};

// Performance-optimized list rendering utilities (no JSX)
export const createVirtualScroll = (items: any[], itemHeight: number, containerHeight: number) => {
  const startIndex = 0; // This would be calculated based on scroll position
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight),
    items.length - 1
  );

  return {
    visibleItems: items.slice(startIndex, endIndex + 1),
    totalHeight: items.length * itemHeight,
    offsetY: startIndex * itemHeight,
  };
};

