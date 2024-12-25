/**
 * @fileoverview Main server entry point for the Incepta platform
 * Implements advanced clustering, comprehensive error handling, graceful shutdown,
 * health monitoring, and high-availability features
 * @version 1.0.0
 */

import http from 'http'; // ^1.0.0
import cluster from 'cluster'; // ^1.0.0
import os from 'os'; // ^1.0.0
import winston from 'winston'; // ^3.0.0

import app from './app';
import { config } from './config';
import { enhancedLogger as logger } from './lib/logger';

// Constants for server configuration
const SHUTDOWN_TIMEOUT = 30000; // 30 seconds
const HEALTH_CHECK_INTERVAL = 10000; // 10 seconds
const CONNECTION_TIMEOUT = 5000; // 5 seconds

/**
 * Starts the HTTP server with proper error handling and event listeners
 * @returns Promise resolving to HTTP server instance
 */
async function startServer(): Promise<http.Server> {
  const server = http.createServer(app);

  // Configure server timeouts
  server.timeout = CONNECTION_TIMEOUT;
  server.keepAliveTimeout = 65000; // Slightly higher than ALB's 60s timeout
  server.headersTimeout = 66000; // Slightly higher than keepAliveTimeout

  // Error event handling
  server.on('error', (error: NodeJS.ErrnoException) => {
    logger.error('Server error occurred', {
      error: error.message,
      code: error.code,
      syscall: error.syscall
    });

    if (error.syscall !== 'listen') {
      throw error;
    }

    switch (error.code) {
      case 'EACCES':
        logger.error('Port requires elevated privileges');
        process.exit(1);
        break;
      case 'EADDRINUSE':
        logger.error('Port is already in use');
        process.exit(1);
        break;
      default:
        throw error;
    }
  });

  // Start listening
  await new Promise<void>((resolve) => {
    server.listen(config.port, () => {
      logger.info(`Server started`, {
        port: config.port,
        environment: config.env,
        nodeVersion: process.version,
        pid: process.pid
      });
      resolve();
    });
  });

  return server;
}

/**
 * Sets up server clustering for multi-core processing
 */
function setupCluster(): void {
  if (!config.clusterEnabled) {
    startServer();
    return;
  }

  if (cluster.isPrimary) {
    // Calculate optimal number of workers
    const numCPUs = os.cpus().length;
    const numWorkers = process.env.NODE_ENV === 'production' ? numCPUs : Math.min(2, numCPUs);

    logger.info(`Setting up cluster with ${numWorkers} workers`);

    // Fork workers
    for (let i = 0; i < numWorkers; i++) {
      cluster.fork();
    }

    // Handle worker events
    cluster.on('exit', (worker, code, signal) => {
      logger.warn(`Worker ${worker.id} died`, {
        code,
        signal,
        pid: worker.process.pid
      });

      // Respawn worker
      logger.info('Spawning new worker');
      cluster.fork();
    });

    // Log cluster events
    cluster.on('online', (worker) => {
      logger.info(`Worker ${worker.id} is online`, {
        pid: worker.process.pid
      });
    });

    // Monitor cluster health
    setInterval(() => {
      const workers = Object.values(cluster.workers || {});
      logger.info('Cluster health check', {
        totalWorkers: workers.length,
        activeWorkers: workers.filter(w => w?.isConnected()).length
      });
    }, HEALTH_CHECK_INTERVAL);
  } else {
    startServer();
  }
}

/**
 * Implements graceful shutdown with connection draining
 * @param server HTTP server instance
 * @param cleanupFn Optional cleanup function
 */
function handleShutdown(server: http.Server, cleanupFn?: () => Promise<void>): void {
  let shuttingDown = false;

  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info(`Received ${signal}, starting graceful shutdown`);

    // Stop accepting new connections
    server.close(async () => {
      logger.info('Server closed, cleaning up');

      try {
        // Execute cleanup if provided
        if (cleanupFn) {
          await cleanupFn();
        }

        logger.info('Cleanup completed, exiting process');
        process.exit(0);
      } catch (error) {
        logger.error('Error during cleanup', { error });
        process.exit(1);
      }
    });

    // Force shutdown after timeout
    setTimeout(() => {
      logger.error('Shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT);
  }

  // Handle shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error });
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
    shutdown('unhandledRejection');
  });
}

/**
 * Configures server health check endpoint and monitoring
 */
function setupHealthCheck(): void {
  // Basic health metrics
  const healthMetrics = {
    startTime: Date.now(),
    totalRequests: 0,
    lastChecked: Date.now()
  };

  // Update metrics periodically
  setInterval(() => {
    healthMetrics.lastChecked = Date.now();
    logger.info('Health metrics updated', {
      uptime: Date.now() - healthMetrics.startTime,
      totalRequests: healthMetrics.totalRequests
    });
  }, HEALTH_CHECK_INTERVAL);

  // Track requests
  app.use((req, res, next) => {
    healthMetrics.totalRequests++;
    next();
  });
}

// Initialize server
setupCluster();

// Export for testing
export { startServer, handleShutdown, setupHealthCheck };