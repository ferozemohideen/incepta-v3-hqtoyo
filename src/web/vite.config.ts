import { defineConfig } from 'vite'; // ^4.3.0
import react from '@vitejs/plugin-react'; // ^4.0.0
import path from 'path'; // ^18.16.3

// Enterprise-grade Vite configuration with advanced optimizations
export default defineConfig({
  // React plugin configuration with fast refresh and emotion support
  plugins: [
    react({
      fastRefresh: true,
      babel: {
        plugins: ['@emotion/babel-plugin']
      }
    })
  ],

  // Comprehensive path aliases for improved code organization
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@store': path.resolve(__dirname, 'src/store'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@interfaces': path.resolve(__dirname, 'src/interfaces'),
      '@constants': path.resolve(__dirname, 'src/constants'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@styles': path.resolve(__dirname, 'src/styles'),
      '@config': path.resolve(__dirname, 'src/config')
    }
  },

  // Development server configuration with enhanced security
  server: {
    port: 3000,
    strictPort: true, // Fail if port is in use
    host: true, // Listen on all network interfaces
    cors: true, // Enable CORS for development
    hmr: {
      overlay: true // Show errors as overlay
    },
    watch: {
      usePolling: true // Ensure file changes are detected in all environments
    }
  },

  // Production build optimization configuration
  build: {
    outDir: 'dist',
    sourcemap: true, // Enable source maps for debugging
    minify: 'terser', // Use terser for better minification
    target: 'esnext', // Target modern browsers for better optimization
    chunkSizeWarningLimit: 1000, // Increase chunk size warning limit
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true // Remove debugger statements
      }
    },
    rollupOptions: {
      output: {
        // Optimize chunk splitting for better caching
        manualChunks: {
          // Core vendor dependencies
          vendor: ['react', 'react-dom'],
          // UI framework chunk
          ui: ['@mui/material'],
          // State management chunk
          state: ['@reduxjs/toolkit', 'react-query'],
          // Routing chunk
          routing: ['react-router-dom']
        }
      }
    }
  },

  // Dependency optimization configuration
  optimizeDeps: {
    // Pre-bundle these dependencies for better performance
    include: [
      'react',
      'react-dom',
      '@mui/material',
      '@reduxjs/toolkit',
      'react-router-dom',
      'react-query',
      'socket.io-client',
      'axios',
      'date-fns',
      'yup'
    ],
    // Exclude test libraries from pre-bundling
    exclude: ['@testing-library/react']
  },

  // Enable preview features for development
  preview: {
    port: 3000,
    strictPort: true,
    host: true
  },

  // Performance optimizations
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    target: 'esnext'
  }
});