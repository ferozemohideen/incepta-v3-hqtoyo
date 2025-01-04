import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material';
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { persistStore } from 'redux-persist';
import { PersistGate } from 'redux-persist/integration/react';

import App from './App';
import { store } from './store';
import { lightTheme } from './styles/theme';

/**
 * Initialize core application services including monitoring and error tracking
 */
const initializeApp = async (): Promise<void> => {
  // Initialize Sentry in production
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.REACT_APP_SENTRY_DSN,
      integrations: [
        new BrowserTracing({
          tracingOrigins: ['localhost', process.env.REACT_APP_API_URL as string],
        }),
      ],
      tracesSampleRate: 0.2,
      environment: process.env.NODE_ENV,
    });
  }

  // Configure Content Security Policy
  if (process.env.NODE_ENV === 'production') {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      `connect-src 'self' ${process.env.REACT_APP_API_URL} *.sentry.io`,
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "object-src 'none'",
      "media-src 'self'",
      "frame-src 'self'",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ].join('; ');
    document.head.appendChild(meta);
  }

  // Configure performance monitoring
  if ('performance' in window && 'PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        // Report long tasks (>50ms) to Sentry
        if (entry.duration > 50) {
          Sentry.addBreadcrumb({
            category: 'performance',
            message: `Long task detected: ${entry.duration}ms`,
            level: 'warning',
          });
        }
      });
    });
    observer.observe({ entryTypes: ['longtask', 'paint', 'largest-contentful-paint'] });
  }
};

/**
 * Custom error boundary fallback component
 */
const ErrorFallback = ({ error }: { error: Error }) => (
  <div role="alert" style={{ padding: '20px', textAlign: 'center' }}>
    <h2>Something went wrong</h2>
    <pre style={{ color: 'red' }}>{error.message}</pre>
    <button onClick={() => window.location.reload()}>Reload Application</button>
  </div>
);

/**
 * Initialize and render the React application with all required providers
 */
const renderApp = (): void => {
  const rootElement = document.getElementById('root') as HTMLElement;
  const root = ReactDOM.createRoot(rootElement);

  // Create Redux persistor
  const persistor = persistStore(store);

  root.render(
    <React.StrictMode>
      <ErrorBoundary
        fallback={(error: Error) => <ErrorFallback error={error} />}
        onError={(error) => {
          console.error('Application error:', error);
          if (process.env.NODE_ENV === 'production') {
            Sentry.captureException(error);
          }
        }}
      >
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <ThemeProvider theme={lightTheme}>
              <App />
            </ThemeProvider>
          </PersistGate>
        </Provider>
      </ErrorBoundary>
    </React.StrictMode>
  );
};

// Initialize app and render
initializeApp().then(() => {
  renderApp();
}).catch((error) => {
  console.error('Failed to initialize application:', error);
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error);
  }
});

// Register service worker
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((error) => {
      console.error('Service worker registration failed:', error);
      if (process.env.NODE_ENV === 'production') {
        Sentry.captureException(error);
      }
    });
  });
}

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(event.reason);
  }
  event.preventDefault();
});

// Export for testing purposes
export { initializeApp, renderApp };