// @testing-library/react v14.0.0
import { render, within } from '@testing-library/react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// @vitest v0.34.0
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// @axe-core/react v4.7.3
import { axe, toHaveNoViolations } from 'jest-axe';
// @mui/material v5.14.0
import { ThemeProvider } from '@mui/material';
import { lightTheme } from '../../../src/styles/theme';

// Internal imports
import GrantCard from '../../../src/components/grants/GrantCard';
import type { IGrant } from '../../../src/interfaces/grant.interface';
import { GrantType } from '../../../src/interfaces/grant.interface';

// Mock date utilities to ensure consistent tests
vi.mock('../../../src/utils/date.utils', () => ({
  formatDeadline: () => ({
    relativeDate: '30 days remaining',
    urgencyLevel: 'normal',
    ariaLabel: 'Grant deadline: January 1, 2024, 30 days remaining'
  })
}));

// Test utilities
const createMockGrant = (overrides: Partial<IGrant> = {}): IGrant => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'Test SBIR Grant',
  description: 'A test grant for SBIR program',
  type: GrantType.SBIR,
  agency: 'NSF',
  amount: 250000,
  deadline: new Date('2024-01-01'),
  requirements: {
    technicalVolume: {
      name: 'Technical Volume',
      required: true,
      maxPages: 25,
      format: ['pdf']
    },
    businessPlan: {
      name: 'Business Plan',
      required: true,
      maxPages: 15,
      format: ['pdf']
    },
    budget: {
      name: 'Budget',
      required: true,
      maxPages: 5,
      format: ['pdf', 'xlsx']
    },
    additionalDocuments: []
  },
  eligibilityCriteria: ['Small Business', 'US-based'],
  fundingAreas: ['Technology', 'Research'],
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  ...overrides
});

const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={lightTheme}>
      {ui}
    </ThemeProvider>
  );
};

describe('GrantCard Component', () => {
  // Visual Rendering Tests
  describe('Visual Rendering', () => {
    it('renders all grant information correctly', () => {
      const mockGrant = createMockGrant();
      renderWithTheme(<GrantCard grant={mockGrant} />);

      expect(screen.getByText(mockGrant.title)).toBeInTheDocument();
      expect(screen.getByText(/NSF/)).toBeInTheDocument();
      expect(screen.getByText(/\$250,000/)).toBeInTheDocument();
      expect(screen.getByText(/SBIR/)).toBeInTheDocument();
    });

    it('displays match score when provided', () => {
      const mockGrant = createMockGrant();
      renderWithTheme(<GrantCard grant={mockGrant} matchScore={95} />);

      const matchChip = screen.getByText(/95% Match/);
      expect(matchChip).toBeInTheDocument();
      expect(matchChip).toHaveAttribute('aria-label', 'Match score: 95%');
    });

    it('shows loading skeleton in loading state', () => {
      renderWithTheme(<GrantCard grant={createMockGrant()} isLoading={true} />);
      
      const skeletons = screen.getAllByRole('progressbar');
      expect(skeletons).toHaveLength(3);
    });

    it('handles long text overflow correctly', () => {
      const longTitle = 'A'.repeat(100);
      const mockGrant = createMockGrant({ title: longTitle });
      renderWithTheme(<GrantCard grant={mockGrant} />);

      const titleElement = screen.getByText(longTitle);
      const styles = window.getComputedStyle(titleElement);
      expect(styles.overflow).toBe('hidden');
      expect(styles.textOverflow).toBe('ellipsis');
    });
  });

  // Interaction Tests
  describe('Interaction Handling', () => {
    it('handles save button click', async () => {
      const onSave = vi.fn();
      const mockGrant = createMockGrant();
      renderWithTheme(<GrantCard grant={mockGrant} onSave={onSave} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('handles apply button click', async () => {
      const onApply = vi.fn();
      const mockGrant = createMockGrant();
      renderWithTheme(<GrantCard grant={mockGrant} onApply={onApply} />);

      const applyButton = screen.getByRole('button', { name: /apply now/i });
      await userEvent.click(applyButton);

      expect(onApply).toHaveBeenCalledTimes(1);
    });

    it('supports keyboard navigation', async () => {
      const onClick = vi.fn();
      const mockGrant = createMockGrant();
      renderWithTheme(<GrantCard grant={mockGrant} onClick={onClick} />);

      const card = screen.getByRole('button', { name: new RegExp(mockGrant.title) });
      await userEvent.tab();
      expect(card).toHaveFocus();
      await userEvent.keyboard('{enter}');
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('prevents click propagation on action buttons', async () => {
      const onClick = vi.fn();
      const onSave = vi.fn();
      const mockGrant = createMockGrant();
      renderWithTheme(
        <GrantCard grant={mockGrant} onClick={onClick} onSave={onSave} />
      );

      const saveButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    it('meets WCAG 2.1 Level AA requirements', async () => {
      const { container } = renderWithTheme(<GrantCard grant={createMockGrant()} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA labels', () => {
      const mockGrant = createMockGrant();
      renderWithTheme(<GrantCard grant={mockGrant} />);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', `Grant: ${mockGrant.title} from ${mockGrant.agency}`);
    });

    it('maintains proper focus management', async () => {
      const mockGrant = createMockGrant();
      renderWithTheme(<GrantCard grant={mockGrant} onSave={() => {}} onApply={() => {}} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      const applyButton = screen.getByRole('button', { name: /apply now/i });

      await userEvent.tab();
      expect(saveButton).toHaveFocus();
      await userEvent.tab();
      expect(applyButton).toHaveFocus();
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    it('displays fallback UI for missing data', () => {
      const incompleteGrant = createMockGrant({ amount: undefined as any });
      renderWithTheme(<GrantCard grant={incompleteGrant} />);

      expect(screen.getByText(/not available/i)).toBeInTheDocument();
    });

    it('shows error state correctly', () => {
      const error = new Error('Test error');
      renderWithTheme(<GrantCard grant={createMockGrant()} error={error} />);

      expect(screen.getByText(/error loading grant information/i)).toBeInTheDocument();
    });
  });

  // Theme Compliance Tests
  describe('Theme Compliance', () => {
    it('applies theme colors correctly', () => {
      const mockGrant = createMockGrant();
      renderWithTheme(<GrantCard grant={mockGrant} />);

      const grantType = screen.getByText(GrantType.SBIR);
      expect(grantType).toHaveStyle({
        color: lightTheme.palette.primary.main,
        borderColor: lightTheme.palette.primary.main
      });
    });

    it('maintains proper spacing system', () => {
      const { container } = renderWithTheme(<GrantCard grant={createMockGrant()} />);
      const card = container.firstChild as HTMLElement;
      
      expect(card).toHaveStyle({
        padding: lightTheme.spacing(2)
      });
    });
  });
});