// @testing-library/react v14.0.0
// @testing-library/user-event v14.4.3
// @jest/globals v29.5.0
// @mui/material v5.14.0
// @axe-core/react v4.7.3

import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ThemeProvider } from '@mui/material';
import { axe, toHaveNoViolations } from 'jest-axe';

import TechnologyCard from '../../../src/components/technologies/TechnologyCard';
import { Technology, PatentStatus } from '../../../src/interfaces/technology.interface';
import { lightTheme } from '../../../src/styles/theme';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock technology data
const mockTechnology: Technology = {
  id: 'test-id',
  title: 'Test Technology',
  description: 'Test description that is long enough to test truncation behavior and wrapping across multiple lines',
  university: 'Test University',
  patentStatus: PatentStatus.GRANTED,
  trl: 6,
  domains: ['AI/ML'],
  metadata: {
    inventors: ['John Doe'],
    patentNumber: 'US123456',
    filingDate: new Date('2023-01-01'),
    keywords: ['AI', 'ML'],
    stage: 'VALIDATION',
    attachments: []
  },
  permissions: {
    canView: true,
    canEdit: false,
    canDelete: false,
    canContact: true,
    canDownload: true
  },
  displayConfig: {
    showMetadata: true,
    showActions: true,
    layout: 'grid',
    highlightFields: ['title', 'university']
  },
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01')
};

// Mock handlers
const mockHandlers = {
  onSave: jest.fn(),
  onShare: jest.fn(),
  onView: jest.fn()
};

// Helper function to render card with theme
const renderTechnologyCard = (props = {}) => {
  return render(
    <ThemeProvider theme={lightTheme}>
      <TechnologyCard
        technology={mockTechnology}
        {...mockHandlers}
        {...props}
      />
    </ThemeProvider>
  );
};

describe('TechnologyCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders technology information correctly', () => {
      renderTechnologyCard();

      // Title
      const title = screen.getByRole('heading', { name: mockTechnology.title });
      expect(title).toBeInTheDocument();
      expect(title).toHaveStyle({ fontWeight: 500 });

      // University
      const university = screen.getByText(mockTechnology.university);
      expect(university).toBeInTheDocument();
      expect(university).toHaveStyle({ color: expect.stringContaining('rgba') });

      // Patent status
      const patentStatus = screen.getByText(mockTechnology.patentStatus.toLowerCase());
      expect(patentStatus).toBeInTheDocument();
      expect(patentStatus).toHaveClass(expect.stringContaining('MuiChip-colorSuccess'));

      // Description
      const description = screen.getByText(mockTechnology.description);
      expect(description).toBeInTheDocument();
      expect(description).toHaveStyle({
        display: '-webkit-box',
        WebkitLineClamp: 3,
        overflow: 'hidden'
      });

      // TRL indicator
      const trlLabel = screen.getByText(/TRL Level:/i);
      expect(trlLabel).toBeInTheDocument();
      const trlTooltip = screen.getByRole('tooltip', { hidden: true });
      expect(trlTooltip).toHaveTextContent(`Technology Readiness Level: ${mockTechnology.trl}/9`);
    });

    it('renders match score when provided', () => {
      const matchScore = 95;
      renderTechnologyCard({ matchScore });

      const scoreChip = screen.getByText(`${matchScore}% Match`);
      expect(scoreChip).toBeInTheDocument();
      expect(scoreChip).toHaveClass(expect.stringContaining('MuiChip-colorPrimary'));
    });

    it('renders action buttons when showActions is true', () => {
      renderTechnologyCard({ showActions: true });

      const saveButton = screen.getByRole('button', { name: /save technology/i });
      const shareButton = screen.getByRole('button', { name: /share technology/i });
      const viewButton = screen.getByRole('button', { name: /view technology details/i });

      expect(saveButton).toBeInTheDocument();
      expect(shareButton).toBeInTheDocument();
      expect(viewButton).toBeInTheDocument();
    });

    it('hides action buttons when showActions is false', () => {
      renderTechnologyCard({ showActions: false });

      const actionButtons = screen.queryAllByRole('button');
      expect(actionButtons).toHaveLength(0);
    });
  });

  describe('Interactions', () => {
    it('handles save action correctly', async () => {
      const user = userEvent.setup();
      renderTechnologyCard();

      const saveButton = screen.getByRole('button', { name: /save technology/i });
      await user.click(saveButton);

      expect(mockHandlers.onSave).toHaveBeenCalledWith(mockTechnology.id.toString());
      expect(saveButton).toBeEnabled(); // Button should re-enable after save
    });

    it('handles share action correctly', async () => {
      const user = userEvent.setup();
      renderTechnologyCard();

      const shareButton = screen.getByRole('button', { name: /share technology/i });
      await user.click(shareButton);

      expect(mockHandlers.onShare).toHaveBeenCalledWith(mockTechnology.id.toString());
      expect(shareButton).toBeEnabled(); // Button should re-enable after share
    });

    it('handles view action correctly', async () => {
      const user = userEvent.setup();
      renderTechnologyCard();

      const viewButton = screen.getByRole('button', { name: /view technology details/i });
      await user.click(viewButton);

      expect(mockHandlers.onView).toHaveBeenCalledWith(mockTechnology.id.toString());
    });

    it('prevents event propagation when clicking action buttons', async () => {
      const user = userEvent.setup();
      const onCardClick = jest.fn();
      renderTechnologyCard({ onView: onCardClick });

      const saveButton = screen.getByRole('button', { name: /save technology/i });
      await user.click(saveButton);

      expect(mockHandlers.onSave).toHaveBeenCalled();
      expect(onCardClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 Level AA requirements', async () => {
      const { container } = renderTechnologyCard();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA labels and roles', () => {
      renderTechnologyCard();

      // Card should have proper aria-label
      const card = screen.getByRole('button', { name: `Technology: ${mockTechnology.title}` });
      expect(card).toBeInTheDocument();

      // Action buttons should have proper aria-labels
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });

      // Tooltips should be properly associated
      const tooltips = screen.getAllByRole('tooltip', { hidden: true });
      tooltips.forEach(tooltip => {
        expect(tooltip).toHaveAttribute('id');
        expect(tooltip).toHaveAttribute('role', 'tooltip');
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderTechnologyCard();

      // Tab through interactive elements
      const buttons = screen.getAllByRole('button');
      for (const button of buttons) {
        await user.tab();
        expect(button).toHaveFocus();
      }

      // Enter key should trigger button actions
      const saveButton = screen.getByRole('button', { name: /save technology/i });
      saveButton.focus();
      await user.keyboard('{Enter}');
      expect(mockHandlers.onSave).toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('adjusts layout for mobile viewport', () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));
      
      renderTechnologyCard();
      
      const content = screen.getByText(mockTechnology.description).parentElement;
      expect(content).toHaveStyle({ padding: '1.5rem' });
    });

    it('maintains touch target sizes for mobile', () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));
      
      renderTechnologyCard();
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const { height, width } = button.getBoundingClientRect();
        expect(height).toBeGreaterThanOrEqual(48); // Minimum touch target size
        expect(width).toBeGreaterThanOrEqual(48);
      });
    });
  });

  describe('Visual Design', () => {
    it('applies correct Material Design elevation', () => {
      renderTechnologyCard();
      
      const card = screen.getByRole('button', { name: `Technology: ${mockTechnology.title}` });
      expect(card).toHaveStyle({ boxShadow: expect.stringContaining('0px') });
    });

    it('applies hover states correctly', async () => {
      const user = userEvent.setup();
      renderTechnologyCard();
      
      const card = screen.getByRole('button', { name: `Technology: ${mockTechnology.title}` });
      await user.hover(card);
      
      expect(card).toHaveStyle({
        transform: 'translateY(-2px)',
        boxShadow: expect.stringContaining('0px')
      });
    });
  });
});