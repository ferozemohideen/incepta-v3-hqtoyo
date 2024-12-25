import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import { axe } from '@axe-core/react';
import Home from '../../src/pages/dashboard/Home';
import { AuthContextType } from '../../src/hooks/useAuth';

// Mock dependencies
vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      name: 'John Doe',
      role: 'entrepreneur'
    }
  })
}));

vi.mock('../../src/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: true,
    sendMessage: vi.fn(),
    connectionState: 'CONNECTED'
  })
}));

vi.mock('../../src/hooks/useNotification', () => ({
  useNotification: () => ({
    showNotification: vi.fn()
  })
}));

// Mock data
const mockDashboardData = {
  activities: [
    {
      id: '1',
      type: 'TECHNOLOGY_MATCH',
      data: {
        id: 'tech-1',
        title: 'AI Algorithm',
        university: 'Stanford'
      },
      timestamp: new Date().toISOString(),
      metadata: {},
      read: false,
      priority: 1
    }
  ],
  savedTechnologies: [
    {
      id: 'tech-1',
      title: 'Quantum Computing Patent',
      university: 'MIT',
      description: 'Novel quantum computing approach',
      patentStatus: 'PENDING'
    }
  ],
  savedGrants: [
    {
      id: 'grant-1',
      title: 'SBIR Phase I',
      agency: 'NSF',
      deadline: new Date(Date.now() + 86400000).toISOString(),
      amount: 250000
    }
  ],
  analyticsData: [
    {
      timestamp: new Date().toISOString(),
      value: 75,
      label: 'Platform Activity'
    }
  ]
};

// Mock fetch responses
global.fetch = vi.fn((url) => {
  let response;
  switch (url) {
    case '/api/activities':
      response = mockDashboardData.activities;
      break;
    case '/api/technologies/saved':
      response = mockDashboardData.savedTechnologies;
      break;
    case '/api/grants/saved':
      response = mockDashboardData.savedGrants;
      break;
    case '/api/analytics/dashboard':
      response = mockDashboardData.analyticsData;
      break;
    default:
      response = {};
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(response)
  });
}) as jest.Mock;

describe('Home Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard layout correctly', async () => {
    const { container } = render(<Home />);

    // Verify main sections are present
    expect(screen.getByText(/Welcome back, John Doe/i)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /quick actions/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /recent activity/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /saved items/i })).toBeInTheDocument();

    // Check accessibility
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('fetches and displays initial dashboard data', async () => {
    render(<Home />);

    // Wait for data to load
    await waitFor(() => {
      // Verify activities are displayed
      expect(screen.getByText('AI Algorithm')).toBeInTheDocument();
      
      // Verify saved technologies are displayed
      expect(screen.getByText('Quantum Computing Patent')).toBeInTheDocument();
      
      // Verify saved grants are displayed
      expect(screen.getByText('SBIR Phase I')).toBeInTheDocument();
    });

    // Verify API calls
    expect(global.fetch).toHaveBeenCalledWith('/api/activities');
    expect(global.fetch).toHaveBeenCalledWith('/api/technologies/saved');
    expect(global.fetch).toHaveBeenCalledWith('/api/grants/saved');
    expect(global.fetch).toHaveBeenCalledWith('/api/analytics/dashboard');
  });

  it('handles real-time updates via WebSocket', async () => {
    const { rerender } = render(<Home />);

    // Simulate new activity via WebSocket
    const newActivity = {
      id: '2',
      type: 'GRANT_DEADLINE',
      data: {
        id: 'grant-2',
        title: 'New Grant Opportunity',
        deadline: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      metadata: {},
      read: false,
      priority: 1
    };

    // Mock WebSocket message
    const mockWebSocket = new WebSocket('ws://localhost:8080');
    mockWebSocket.onmessage({ data: JSON.stringify(newActivity) } as MessageEvent);

    // Rerender component
    rerender(<Home />);

    // Verify new activity is displayed
    await waitFor(() => {
      expect(screen.getByText('New Grant Opportunity')).toBeInTheDocument();
    });
  });

  it('handles error states gracefully', async () => {
    // Mock API error
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    render(<Home />);

    // Verify error state
    await waitFor(() => {
      expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
    });
  });

  it('handles user interactions correctly', async () => {
    render(<Home />);

    // Test technology removal
    await waitFor(() => {
      const removeButton = screen.getByLabelText(/remove quantum computing patent/i);
      fireEvent.click(removeButton);
    });

    // Verify removal API call
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/technologies/saved/tech-1',
      { method: 'DELETE' }
    );

    // Test grant removal
    await waitFor(() => {
      const removeButton = screen.getByLabelText(/remove sbir phase i/i);
      fireEvent.click(removeButton);
    });

    // Verify removal API call
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/grants/saved/grant-1',
      { method: 'DELETE' }
    );
  });

  it('maintains accessibility during dynamic updates', async () => {
    const { container } = render(<Home />);

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });

    // Check accessibility after data load
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Simulate activity update
    const activitySection = screen.getByRole('region', { name: /recent activity/i });
    expect(activitySection).toHaveAttribute('aria-live', 'polite');
  });

  it('handles offline state appropriately', async () => {
    // Mock offline WebSocket connection
    vi.mock('../../src/hooks/useWebSocket', () => ({
      useWebSocket: () => ({
        isConnected: false,
        connectionState: 'DISCONNECTED'
      })
    }));

    render(<Home />);

    // Verify offline indicator
    expect(screen.getByText(/offline/i)).toBeInTheDocument();

    // Verify data still loads from cache/API
    await waitFor(() => {
      expect(screen.getByText('Quantum Computing Patent')).toBeInTheDocument();
    });
  });
});