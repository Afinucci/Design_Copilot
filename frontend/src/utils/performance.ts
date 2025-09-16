// Performance monitoring utilities for the Guided Mode components

// Performance constants
export const PERFORMANCE_CONSTANTS = {
  // Timing thresholds (in milliseconds)
  CONSTRAINT_CHECK_DEBOUNCE: 300,
  SNAP_CONNECTION_DELAY: 300,
  LAYOUT_ANALYSIS_TIMEOUT: 5000,
  RENDER_THRESHOLD_WARNING: 16, // 60fps threshold
  RENDER_THRESHOLD_ERROR: 32,   // 30fps threshold
  
  // Memory thresholds
  MAX_NODES_COUNT: 100,
  MAX_EDGES_COUNT: 200,
  MAX_VIOLATIONS_DISPLAY: 50,
  MAX_SUGGESTIONS_DISPLAY: 3,
  
  // UI thresholds
  SNAP_DISTANCE: 50,
  GRID_SIZE: 20,
  MINIMUM_NODE_SPACING: 10,
  // Fixed buffer to keep non-adjacent shapes apart (in pixels)
  NON_ADJACENT_BUFFER: 20,
  // Amount (in px) a node may overlap into another when adjacency is allowed
  OVERLAP_AMOUNT: 20,
  
  // Compliance scoring
  MIN_COMPLIANCE_SCORE: 60,
  WARNING_COMPLIANCE_SCORE: 80,
  GOOD_COMPLIANCE_SCORE: 90,
} as const;

// Performance measurement utilities
export class PerformanceMonitor {
  private static measurements = new Map<string, number>();
  private static isEnabled = process.env.NODE_ENV === 'development';

  static start(label: string): void {
    if (!this.isEnabled) return;
    this.measurements.set(label, performance.now());
  }

  static end(label: string): number {
    if (!this.isEnabled) return 0;
    
    const startTime = this.measurements.get(label);
    if (!startTime) {
      console.warn(`Performance measurement '${label}' was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.measurements.delete(label);
    
    // Log slow operations
    if (duration > PERFORMANCE_CONSTANTS.RENDER_THRESHOLD_WARNING) {
      const level = duration > PERFORMANCE_CONSTANTS.RENDER_THRESHOLD_ERROR ? 'error' : 'warn';
      console[level](`Slow operation detected: ${label} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  static measure<T>(label: string, fn: () => T): T {
    if (!this.isEnabled) return fn();
    
    this.start(label);
    try {
      return fn();
    } finally {
      this.end(label);
    }
  }

  static async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    if (!this.isEnabled) return await fn();
    
    this.start(label);
    try {
      return await fn();
    } finally {
      this.end(label);
    }
  }

  static logMemoryUsage(context: string): void {
    if (!this.isEnabled || !('memory' in performance)) return;

    const memory = (performance as any).memory;
    console.log(`Memory usage [${context}]:`, {
      used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
    });
  }

  static checkComponentComplexity(nodeCount: number, edgeCount: number): {
    isWithinLimits: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let isWithinLimits = true;

    if (nodeCount > PERFORMANCE_CONSTANTS.MAX_NODES_COUNT) {
      warnings.push(`Node count (${nodeCount}) exceeds recommended limit (${PERFORMANCE_CONSTANTS.MAX_NODES_COUNT})`);
      isWithinLimits = false;
    }

    if (edgeCount > PERFORMANCE_CONSTANTS.MAX_EDGES_COUNT) {
      warnings.push(`Edge count (${edgeCount}) exceeds recommended limit (${PERFORMANCE_CONSTANTS.MAX_EDGES_COUNT})`);
      isWithinLimits = false;
    }

    return { isWithinLimits, warnings };
  }
}

// React performance hook
export const usePerformanceMonitoring = (componentName: string) => {
  const measureRender = (renderFn: () => void) => {
    PerformanceMonitor.measure(`${componentName}-render`, renderFn);
  };

  const measureEffect = (effectName: string, effectFn: () => void) => {
    PerformanceMonitor.measure(`${componentName}-effect-${effectName}`, effectFn);
  };

  const logMemory = () => {
    PerformanceMonitor.logMemoryUsage(componentName);
  };

  return {
    measureRender,
    measureEffect,
    logMemory,
  };
};

// Debounce utility with performance monitoring
export function createDebouncedFunction<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  label?: string
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      if (label && PerformanceMonitor) {
        PerformanceMonitor.measure(label, () => func(...args));
      } else {
        func(...args);
      }
    }, delay);
  };
}

// Throttle utility with performance monitoring
export function createThrottledFunction<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  label?: string
): (...args: Parameters<T>) => void {
  let lastCallTime = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastCallTime >= delay) {
      lastCallTime = now;
      if (label && PerformanceMonitor) {
        PerformanceMonitor.measure(label, () => func(...args));
      } else {
        func(...args);
      }
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now();
        timeoutId = null;
        if (label && PerformanceMonitor) {
          PerformanceMonitor.measure(label, () => func(...args));
        } else {
          func(...args);
        }
      }, delay - (now - lastCallTime));
    }
  };
}

// Memory cleanup utility
export const createCleanupManager = () => {
  const cleanupTasks: Array<() => void> = [];

  const addCleanupTask = (task: () => void) => {
    cleanupTasks.push(task);
  };

  const cleanup = () => {
    cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.error('Cleanup task failed:', error);
      }
    });
    cleanupTasks.length = 0;
  };

  return { addCleanupTask, cleanup };
};

// Error boundary performance metrics
export const trackErrorBoundaryMetrics = (error: Error, componentStack: string) => {
  if (PerformanceMonitor) {
    console.error('Error Boundary Triggered:', {
      error: error.message,
      stack: error.stack,
      componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    PerformanceMonitor.logMemoryUsage('error-boundary');
  }
};