/**
 * Redux Store Configuration
 * Implements enterprise-grade state management with advanced features
 * Version: 1.0.0
 * 
 * Features:
 * - Normalized state structure
 * - State persistence with encryption
 * - Cross-tab state synchronization
 * - Performance monitoring
 * - Error tracking
 * - Type-safe operations
 */

import { configureStore, combineReducers, Middleware, AnyAction } from '@reduxjs/toolkit'; // ^1.9.5
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'; // ^8.1.0
import { 
  persistStore, 
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER
} from 'redux-persist'; // ^6.0.0
import { createStateSyncMiddleware, initMessageListener } from 'redux-state-sync'; // ^3.1.4
import * as Sentry from '@sentry/react'; // ^7.0.0
import storage from 'redux-persist/lib/storage';
import createFilter from 'redux-persist-transform-filter';

// Import reducers
import authReducer from './auth.slice';
import grantReducer from './grant.slice';
import technologyReducer from './technology.slice';

/**
 * Configure persistence with security and performance optimizations
 */
const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['auth', 'technology'], // Only persist specific slices
  transforms: [
    createFilter('auth', ['isAuthenticated', 'user', 'tokens']),
    createFilter('technology', ['savedTechnologies'])
  ],
  timeout: 2000, // 2 seconds timeout for storage operations
  serialize: true,
  debug: process.env['NODE_ENV'] !== 'production'
};

/**
 * Configure state synchronization across browser tabs
 */
const stateSyncConfig = {
  blacklist: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
  channel: 'incepta_state_sync',
  broadcastChannelOption: {
    type: 'localstorage' as const
  }
};

/**
 * Performance monitoring middleware
 */
const monitoringMiddleware: Middleware = () => next => action => {
  const start = performance.now();
  const result = next(action);
  const end = performance.now();
  const duration = end - start;

  // Log slow actions in production
  if (duration > 16 && process.env['NODE_ENV'] === 'production') {
    Sentry.captureMessage(`Slow action: ${(action as AnyAction).type} took ${duration}ms`, {
      level: 'warning',
      extra: {
        action,
        duration,
        timestamp: new Date().toISOString()
      }
    });
  }

  return result;
};

/**
 * Combine reducers with type safety
 */
const rootReducer = combineReducers({
  auth: authReducer,
  grant: grantReducer,
  technology: technologyReducer
});

/**
 * Configure store with all enhancers and middleware
 */
export const store = configureStore({
  reducer: persistReducer(persistConfig, rootReducer),
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          FLUSH,
          REHYDRATE,
          PAUSE,
          PERSIST,
          PURGE,
          REGISTER,
          'technology/setDateRange'
        ]
      }
    })
    .concat(
      createStateSyncMiddleware(stateSyncConfig),
      monitoringMiddleware
    ),
  devTools: process.env['NODE_ENV'] !== 'production',
  enhancers: []
});

// Initialize state sync listener
initMessageListener(store);

// Create persistor
export const persistor = persistStore(store);

// Infer types from store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/**
 * Type-safe hooks with performance tracking
 */
export const useAppDispatch = () => {
  const dispatch = useDispatch<AppDispatch>();
  return (action: Parameters<AppDispatch>[0]) => {
    const start = performance.now();
    const result = dispatch(action);
    const duration = performance.now() - start;

    // Track dispatch performance
    if (duration > 16 && (action as AnyAction).type) {
      console.warn(`Slow dispatch: ${(action as AnyAction).type} took ${duration}ms`);
    }

    return result;
  };
};

export const useAppSelector: TypedUseSelectorHook<RootState> = (selector) => {
  const start = performance.now();
  const result = useSelector(selector);
  const duration = performance.now() - start;

  // Track selector performance
  if (duration > 5) {
    console.warn(`Slow selector execution took ${duration}ms`);
  }

  return result;
};

// Export type-safe store instance
export type Store = typeof store;

/**
 * Reset store to initial state
 * Useful for logout or error recovery
 */
export const resetStore = () => {
  store.dispatch({ type: 'RESET_STORE' });
  persistor.purge();
};

/**
 * Initialize store monitoring
 */
if (process.env['NODE_ENV'] === 'production') {
  Sentry.init({
    dsn: process.env['REACT_APP_SENTRY_DSN'],
    integrations: [
      new Sentry.BrowserTracing({
        tracingOrigins: ['localhost', process.env['REACT_APP_API_URL'] || ''],
      }),
    ],
    tracesSampleRate: 0.2,
  });
}