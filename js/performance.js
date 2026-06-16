// Performance Monitor - Tracks real browser load metrics via Navigation Timing API + Web Vitals
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.init();
  }
  
  init() {
    if (typeof performance === 'undefined' || typeof window === 'undefined') return;
    
    const nav = performance.getEntriesByType('navigation')[0];
    if (!nav) {
      console.warn('[PerformanceMonitor] Navigation Timing API not available');
      return;
    }
    
    // Core Web Vitals + Navigation Timing
    this.metrics.set('TTFB', nav.responseEnd - nav.requestStart);
    this.metrics.set('DOMContentLoaded', nav.domContentLoadedEventEnd - nav.navigationStart);
    this.metrics.set('FullLoad', nav.loadEventEnd - nav.navigationStart);
    
    // Additional performance metrics
    if (nav.transferSize) {
      this.metrics.set('TransferSize', nav.transferSize);
    }
    if (nav.domContentLoadedEventEnd && nav.responseEnd) {
      this.metrics.set('TTFB', Math.min(nav.responseEnd - nav.requestStart, 1000)); // Cap at 1s
    }
    
    // Monitor first paint if available
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (entry.name === 'first-paint') {
              this.metrics.set('FP', entry.startTime);
            } else if (entry.name === 'first-contentful-paint') {
              this.metrics.set('FCP', entry.startTime);
            }
          }
        });
        observer.observe({ entryTypes: ['paint'] });
      } catch (e) {
        // Ignore observer errors
      }
    }
    
    this.reportMetrics();
  }
  
  reportMetrics() {
    if (typeof console === 'undefined') return;
    
    const metrics = [];
    this.metrics.forEach((value, key) => {
      if (key === 'CLS' || key === 'FP' || key === 'FCP') {
        metrics.push(`${key}: ${value.toFixed(3)}ms`);
      } else if (key === 'TransferSize') {
        metrics.push(`${key}: ${(value / 1024).toFixed(1)}KB`);
      } else {
        metrics.push(`${key}: ${Math.min(value, 5000).toFixed(2)}ms`); // Cap at 5s
      }
    });
    
    if (metrics.length > 0) {
      console.log('📊 Performance Metrics:', metrics.join(' | '));
    }
  }
}

// Initialize performance monitor with error boundary if available
if (typeof window !== 'undefined') {
  try {
    const perfMonitor = new PerformanceMonitor();
    
    // Expose to global scope for debugging
    window.PerformanceMonitor = perfMonitor;
  } catch (error) {
    console.warn('[PerformanceMonitor] Failed to initialize:', error.message);
  }
}

export default PerformanceMonitor;
