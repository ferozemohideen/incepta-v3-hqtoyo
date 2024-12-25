import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { axe } from '@axe-core/react';
import QuickActions, { QuickActionsProps } from '../../src/components/dashboard/QuickActions';
import { PROTECTED_ROUTES } from '../../src/constants/routes.constants';
import ErrorBoundary from '../../src/components/common/ErrorBoundary';
import { UserRole } from '../../src/constants/auth.constants';

// Mock navigation hook
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

// Mock test data
const mockUsers = {
  admin: {
    id: 'test-admin-id',
    email: 'admin@test.com',
    role: UserRole.ADMIN,
    isAuthenticated: true,
  },
  tto: {
    id: 'test-tto-id',
    email: 'tto@test.com',
    role: UserRole.TTO,
    isAuthenticated: true,
  },
  entrepreneur: {
    id: 'test-entrepreneur-id',
    email: 'entrepreneur@test.com',
    role: UserRole.ENTREPRENEUR,
    isAuthenticated: true,
  },
  researcher: {
    id: 'test-researcher-id',
    email: 'researcher@test.com',
    role: UserRole.RESEARCHER,
    isAuthenticated: true,
  },
};

// Helper function to render component with router
const renderWithRouter = (
  component: React.ReactElement,
  { withErrorBoundary = false } = {}
) => {
  const navigate = jest.fn();
  (useNavigate as jest.Mock).mockReturnValue(navigate);

  const wrappedComponent = withErrorBoundary ? (
    <ErrorBoundary>
      <BrowserRouter>{component}</BrowserRouter>
    </ErrorBoundary>
  ) : (
    <BrowserRouter>{component}</BrowserRouter>
  );

  return {
    ...render(wrappedComponent),
    navigate,
  };
};

describe('QuickActions Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Role-based Rendering', () => {
    it('renders all quick actions for admin role', () => {
      const { container } = renderWithRouter(<QuickActions user={mockUsers.admin} />);
      
      // Verify admin-specific actions
      expect(screen.getByText('Search Technologies')).toBeInTheDocument();
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Update Profile')).toBeInTheDocument();

      // Check accessibility
      expect(container).toBeAccessible();
    });

    it('renders TTO-specific actions for TTO role', () => {
      renderWithRouter(<QuickActions user={mockUsers.tto} />);
      
      // Verify TTO-specific actions
      expect(screen.getByText('License Management')).toBeInTheDocument();
      expect(screen.getByText('University Portal')).toBeInTheDocument();
      expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
    });

    it('renders entrepreneur-specific actions for entrepreneur role', () => {
      renderWithRouter(<QuickActions user={mockUsers.entrepreneur} />);
      
      // Verify entrepreneur-specific actions
      expect(screen.getByText('Search Technologies')).toBeInTheDocument();
      expect(screen.getByText('View Grants')).toBeInTheDocument();
      expect(screen.queryByText('License Management')).not.toBeInTheDocument();
    });

    it('renders researcher-specific actions for researcher role', () => {
      renderWithRouter(<QuickActions user={mockUsers.researcher} />);
      
      // Verify researcher-specific actions
      expect(screen.getByText('Research Data')).toBeInTheDocument();
      expect(screen.getByText('View Grants')).toBeInTheDocument();
    });
  });

  describe('Navigation Functionality', () => {
    it('navigates to correct route when action is clicked', async () => {
      const { navigate } = renderWithRouter(<QuickActions user={mockUsers.admin} />);
      
      // Click search technologies action
      await userEvent.click(screen.getByText('Search Technologies'));
      expect(navigate).toHaveBeenCalledWith(PROTECTED_ROUTES.TECHNOLOGIES);
      
      // Click admin dashboard action
      await userEvent.click(screen.getByText('Admin Dashboard'));
      expect(navigate).toHaveBeenCalledWith(PROTECTED_ROUTES.ADMIN_DASHBOARD);
    });

    it('handles navigation errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const { navigate } = renderWithRouter(
        <QuickActions user={mockUsers.admin} />,
        { withErrorBoundary: true }
      );

      navigate.mockImplementationOnce(() => {
        throw new Error('Navigation failed');
      });

      await userEvent.click(screen.getByText('Search Technologies'));
      expect(consoleError).toHaveBeenCalledWith(
        'Navigation error:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG accessibility guidelines', async () => {
      const { container } = renderWithRouter(<QuickActions user={mockUsers.admin} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', () => {
      renderWithRouter(<QuickActions user={mockUsers.admin} />);
      
      const buttons = screen.getAllByRole('button');
      buttons[0].focus();
      
      // Verify focus handling
      expect(document.activeElement).toBe(buttons[0]);
      fireEvent.keyDown(buttons[0], { key: 'Tab' });
      expect(document.activeElement).toBe(buttons[1]);
    });

    it('provides proper ARIA labels and tooltips', () => {
      renderWithRouter(<QuickActions user={mockUsers.admin} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });

      // Verify tooltips
      const searchButton = screen.getByText('Search Technologies');
      expect(searchButton.closest('div')).toHaveAttribute(
        'aria-label',
        'Discover and explore available technologies'
      );
    });
  });

  describe('Error Handling', () => {
    it('renders error boundary fallback on component error', () => {
      const errorMessage = 'Test error';
      jest.spyOn(console, 'error').mockImplementation();

      const BrokenQuickActions: React.FC<QuickActionsProps> = ({ user }) => {
        throw new Error(errorMessage);
        return <QuickActions user={user} />;
      };

      renderWithRouter(
        <BrokenQuickActions user={mockUsers.admin} />,
        { withErrorBoundary: true }
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });
  });

  describe('Grid Layout', () => {
    it('renders actions in a responsive grid', () => {
      renderWithRouter(<QuickActions user={mockUsers.admin} />);
      
      const grid = screen.getByRole('navigation');
      expect(grid).toHaveClass('MuiGrid-container');
      
      const gridItems = within(grid).getAllByRole('gridcell');
      gridItems.forEach(item => {
        expect(item).toHaveClass('MuiGrid-item');
      });
    });
  });
});