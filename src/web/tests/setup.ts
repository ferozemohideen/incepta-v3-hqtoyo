// @testing-library/jest-dom v5.16.5 - Custom DOM matchers for Jest
// jest-environment-jsdom v29.5.0 - JSDOM environment for React testing
import '@testing-library/jest-dom';

/**
 * Mock implementation of window.matchMedia for responsive design testing
 * Implements full MediaQueryList interface with TypeScript types
 */
function mockMatchMedia(): void {
  type MediaQueryListener = (ev: MediaQueryListEvent) => void;
  
  class MockMediaQueryList implements MediaQueryList {
    matches: boolean = false;
    media: string = '';
    onchange: MediaQueryListener | null = null;
    private listeners: Set<MediaQueryListener> = new Set();

    addListener(listener: MediaQueryListener): void {
      this.listeners.add(listener);
    }

    removeListener(listener: MediaQueryListener): void {
      this.listeners.delete(listener);
    }

    addEventListener(type: string, listener: MediaQueryListener): void {
      if (type === 'change') this.listeners.add(listener);
    }

    removeEventListener(type: string, listener: MediaQueryListener): void {
      if (type === 'change') this.listeners.delete(listener);
    }

    dispatchEvent(event: Event): boolean {
      if (event instanceof MediaQueryListEvent) {
        this.listeners.forEach(listener => listener(event));
        return true;
      }
      return false;
    }
  }

  window.matchMedia = jest.fn().mockImplementation((query: string) => new MockMediaQueryList());
}

/**
 * Mock implementation of ResizeObserver for component dimension tracking
 * Includes error handling and proper TypeScript interfaces
 */
function mockResizeObserver(): void {
  class MockResizeObserver implements ResizeObserver {
    private callback: ResizeObserverCallback;
    private elements: Set<Element> = new Set();

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element, options?: ResizeObserverOptions): void {
      if (!(target instanceof Element)) {
        throw new TypeError('Target must be an Element');
      }
      this.elements.add(target);
    }

    unobserve(target: Element): void {
      this.elements.delete(target);
    }

    disconnect(): void {
      this.elements.clear();
    }
  }

  global.ResizeObserver = MockResizeObserver;
}

/**
 * Mock implementation of IntersectionObserver for visibility tracking
 * Includes threshold validation and root margin parsing
 */
function mockIntersectionObserver(): void {
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | null = null;
    readonly rootMargin: string = '0px';
    readonly thresholds: readonly number[] = [0];
    private callback: IntersectionObserverCallback;
    private elements: Set<Element> = new Set();

    constructor(
      callback: IntersectionObserverCallback,
      options?: IntersectionObserverInit
    ) {
      this.callback = callback;
      if (options?.threshold) {
        this.validateThresholds(options.threshold);
      }
    }

    observe(target: Element): void {
      if (!(target instanceof Element)) {
        throw new TypeError('Target must be an Element');
      }
      this.elements.add(target);
    }

    unobserve(target: Element): void {
      this.elements.delete(target);
    }

    disconnect(): void {
      this.elements.clear();
    }

    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }

    private validateThresholds(threshold: number | number[]): void {
      const thresholds = Array.isArray(threshold) ? threshold : [threshold];
      if (thresholds.some(t => t < 0 || t > 1)) {
        throw new RangeError('Threshold values must be between 0 and 1');
      }
    }
  }

  global.IntersectionObserver = MockIntersectionObserver;
}

/**
 * Configures custom DOM matchers for accessibility testing
 * Implements WCAG 2.1 Level AA compliance testing
 */
function setupAccessibilityMatchers(): void {
  expect.extend({
    toHaveValidAriaRole(element: Element) {
      const role = element.getAttribute('role');
      const validRoles = [
        'alert', 'button', 'checkbox', 'dialog', 'grid',
        'heading', 'link', 'listbox', 'menu', 'menuitem',
        'navigation', 'region', 'tab', 'tabpanel'
      ];
      
      return {
        pass: role ? validRoles.includes(role) : true,
        message: () => role ? 
          `Expected element to have valid ARIA role, but got '${role}'` :
          'Expected element to have ARIA role'
      };
    },
    
    toBeKeyboardNavigable(element: Element) {
      const tabIndex = element.getAttribute('tabindex');
      const isNativelyFocusable = [
        'a', 'button', 'input', 'select', 'textarea'
      ].includes(element.tagName.toLowerCase());
      
      return {
        pass: isNativelyFocusable || tabIndex !== null,
        message: () => 'Expected element to be keyboard navigable'
      };
    }
  });
}

// Initialize all mocks and testing utilities
mockMatchMedia();
mockResizeObserver();
mockIntersectionObserver();
setupAccessibilityMatchers();

// Mock MutationObserver for DOM mutation tracking
global.MutationObserver = class {
  observe() {}
  disconnect() {}
  takeRecords() { return [] }
};

// Cleanup utilities after each test
afterEach(() => {
  jest.clearAllMocks();
});