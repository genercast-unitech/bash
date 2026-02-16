/**
 * Performance Monitoring Utilities
 * 
 * Tracks and reports application performance metrics.
 * Useful for identifying bottlenecks and optimizing user experience.
 * 
 * @module utils/performance
 */

export class PerformanceMonitor {
    constructor() {
        this.metrics = {
            navigation: {},
            resources: [],
            marks: {},
            measures: {},
            custom: {}
        };
        this.observers = [];
        this.init();
    }

    /**
     * Initialize performance monitoring
     */
    init() {
        if (!window.performance) {
            console.warn('Performance API not available');
            return;
        }

        // Capture navigation timing
        if (window.performance.timing) {
            this.captureNavigationTiming();
        }

        // Set up Performance Observer for paint timing
        if (window.PerformanceObserver) {
            this.observePaintTiming();
            this.observeResourceTiming();
        }
    }

    /**
     * Capture navigation timing metrics
     */
    captureNavigationTiming() {
        const timing = window.performance.timing;

        this.metrics.navigation = {
            // Time to complete DNS lookup
            dns: timing.domainLookupEnd - timing.domainLookupStart,

            // Time to establish connection
            tcp: timing.connectEnd - timing.connectStart,

            // Time for the request
            request: timing.responseStart - timing.requestStart,

            // Time for the response
            response: timing.responseEnd - timing.responseStart,

            // Time to DOM interactive
            domInteractive: timing.domInteractive - timing.navigationStart,

            // Time to DOM complete
            domComplete: timing.domComplete - timing.navigationStart,

            // Time to page load complete
            loadComplete: timing.loadEventEnd - timing.navigationStart
        };
    }

    /**
     * Observe paint timing
     */
    observePaintTiming() {
        try {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    this.metrics.custom[entry.name] = entry.startTime;
                });
            });
            observer.observe({ entryTypes: ['paint'] });
            this.observers.push(observer);
        } catch (e) {
            console.warn('Paint timing not supported');
        }
    }

    /**
     * Observe resource timing
     */
    observeResourceTiming() {
        try {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    this.metrics.resources.push({
                        name: entry.name,
                        type: entry.initiatorType,
                        duration: entry.duration,
                        size: entry.transferSize
                    });
                });
            });
            observer.observe({ entryTypes: ['resource'] });
            this.observers.push(observer);
        } catch (e) {
            console.warn('Resource timing not supported');
        }
    }

    /**
     * Mark a point in time
     * @param {string} name - Mark name
     */
    mark(name) {
        if (window.performance && window.performance.mark) {
            window.performance.mark(name);
            this.metrics.marks[name] = performance.now();
        }
    }

    /**
     * Measure time between two marks
     * @param {string} name - Measure name
     * @param {string} startMark - Start mark name
     * @param {string} endMark - End mark name  
     * @returns {number} Duration in milliseconds
     */
    measure(name, startMark, endMark) {
        if (window.performance && window.performance.measure) {
            try {
                window.performance.measure(name, startMark, endMark);
                const measure = window.performance.getEntriesByName(name)[0];
                this.metrics.measures[name] = measure.duration;
                return measure.duration;
            } catch (e) {
                console.warn('Measurement failed:', e);
                return 0;
            }
        }
        return 0;
    }

    /**
     * Get First Contentful Paint
     * @returns {number} FCP in milliseconds
     */
    getFCP() {
        return this.metrics.custom['first-contentful-paint'] || 0;
    }

    /**
     * Get Largest Contentful Paint
     * @returns {number} LCP in milliseconds
     */
    getLCP() {
        return this.metrics.custom['largest-contentful-paint'] || 0;
    }

    /**
     * Get Time to Interactive
     * @returns {number} TTI in milliseconds
     */
    getTTI() {
        return this.metrics.navigation.domInteractive || 0;
    }

    /**
     * Get all metrics
     * @returns {Object} All performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            fcp: this.getFCP(),
            lcp: this.getLCP(),
            tti: this.getTTI()
        };
    }

    /**
     * Log performance report to console
     */
    logReport() {
        const metrics = this.getMetrics();

        console.group('🚀 Performance Report');
        console.log('Navigation Timing:', metrics.navigation);
        console.log('Core Web Vitals:');
        console.log('  - First Contentful Paint:', metrics.fcp.toFixed(2), 'ms');
        console.log('  - Largest Contentful Paint:', metrics.lcp.toFixed(2), 'ms');
        console.log('  - Time to Interactive:', metrics.tti.toFixed(2), 'ms');
        console.log('Custom Marks:', metrics.marks);
        console.log('Custom Measures:', metrics.measures);
        console.log('Resources Loaded:', metrics.resources.length);
        console.groupEnd();
    }

    /**
     * Get resource breakdown by type
     * @returns {Object} Resource breakdown
     */
    getResourceBreakdown() {
        const breakdown = {};

        this.metrics.resources.forEach(resource => {
            if (!breakdown[resource.type]) {
                breakdown[resource.type] = {
                    count: 0,
                    totalSize: 0,
                    totalDuration: 0
                };
            }
            breakdown[resource.type].count++;
            breakdown[resource.type].totalSize += resource.size || 0;
            breakdown[resource.type].totalDuration += resource.duration || 0;
        });

        return breakdown;
    }

    /**
     * Cleanup observers
     */
    cleanup() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
    }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Log performance report after page load
window.addEventListener('load', () => {
    setTimeout(() => {
        performanceMonitor.logReport();
    }, 1000);
});

// Make globally available
window.performanceMonitor = performanceMonitor;

export default performanceMonitor;
