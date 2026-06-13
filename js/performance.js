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
    
    // First Input Delay (FID) - if available via Performance API
    try {
      const fidEntries = performance.getEntriesByType('resource').filter(e => e.name.includes('first-input'));
      if (fidEntries.length > 0) {
        this.metrics.set('FID', fidEntries[0].startTime);
      } else {
        this.metrics.set('FID', 0);
      }
    } catch (e) {
      this.metrics.set('FID', 0);
    }
    
    // Largest Contentful Paint (LCP) - via Performance Observer if available
    try {
      const lcpEntries = performance.getEntriesByType('paint');
      const lcpEntry = lcpEntries.find(e => e.name === 'largest-contentful-paint');
      if (lcpEntry) {
        this.metrics.set('LCP', lcpEntry.startTime);
      } else {
        // Estimate LCP as time to first contentful paint
        const fcpEntry = lcpEntries.find(e => e.name === 'first-contentful-paint');
        this.metrics.set('LCP', fcpEntry ? fcpEntry.startTime : 0);
      }
    } catch (e) {
      this.metrics.set('LCP', 0);
    }
    
    // Cumulative Layout Shift (CLS) - via Performance Observer if available
    try {
      const clsEntries = performance.getEntriesByType('layout-shift');
      if (clsEntries.length > 0) {
        this.metrics.set('CLS', clsEntries[clsEntries.length - 1].value);
      } else {
        // Estimate CLS from layout-shift entries
        let totalShift = 0;
        const layoutShifts = performance.getEntriesByType('layout-shift');
        layoutShifts.forEach(entry => {
          totalShift += entry.value;
        });
        this.metrics.set('CLS', totalShift);
      }
    } catch (e) {
      this.metrics.set('CLS', 0);
    }
    
    this.reportMetrics();
  }
  
  reportMetrics() {
    if (typeof console === 'undefined') return;
    
    const metrics = [];
    this.metrics.forEach((value, key) => {
      if (key === 'CLS') {
        metrics.push(`${key}: ${value.toFixed(3)}`);
      } else {
        metrics.push(`${key}: ${value.toFixed(2)}ms`);
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
