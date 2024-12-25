import React from 'react';
import { render, fireEvent, screen, within, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '@mui/material';
import { createAppTheme } from '../../../src/config/theme.config';
import CustomButton, { CustomButtonProps } from '../../../src/components/common/Button';

// Extend expect with accessibility matchers
expect.extend(toHaveNoViolations);

// Create theme instance for testing
const theme = createAppTheme('light');

// Helper function to render components with theme
const renderWithTheme = (children: React.ReactNode) => {
  return render(
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  );
};

// Mock handlers
const mockOnClick = jest.fn();
const mockOnFocus = jest.fn();
const mockOnBlur = jest.fn();

describe('CustomButton', () => {
  // Clear mocks before each test
  beforeEach(() => {
    mockOnClick.mockClear();
    mockOnFocus.mockClear();
    mockOnBlur.mockClear();
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      renderWithTheme(<CustomButton>Click me</CustomButton>);
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('MuiButton-contained');
    });

    it('applies Material Design classes correctly', () => {
      renderWithTheme(<CustomButton>Test</CustomButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({
        textTransform: 'none',
        fontWeight: 500,
        minWidth: '64px'
      });
    });

    it('maintains proper HTML semantics', () => {
      renderWithTheme(<CustomButton>Test</CustomButton>);
      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('handles custom className prop', () => {
      renderWithTheme(<CustomButton className="custom-class">Test</CustomButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Variants', () => {
    it('renders contained variant with correct styles', () => {
      renderWithTheme(<CustomButton variant="contained">Test</CustomButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-contained');
    });

    it('renders outlined variant with proper borders', () => {
      renderWithTheme(<CustomButton variant="outlined">Test</CustomButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-outlined');
    });

    it('renders text variant without background', () => {
      renderWithTheme(<CustomButton variant="text">Test</CustomButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-text');
    });

    it('renders TTO variant with correct colors', () => {
      renderWithTheme(<CustomButton variant="tto">Test</CustomButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({
        backgroundColor: theme.palette.tto.license.available
      });
    });
  });

  describe('States', () => {
    it('handles disabled state correctly', () => {
      renderWithTheme(<CustomButton disabled>Test</CustomButton>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('Mui-disabled');
    });

    it('shows loading spinner when loading', async () => {
      renderWithTheme(<CustomButton loading>Test</CustomButton>);
      const spinner = screen.getByRole('progressbar');
      expect(spinner).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    });

    it('prevents interactions while loading', () => {
      renderWithTheme(
        <CustomButton loading onClick={mockOnClick}>
          Test
        </CustomButton>
      );
      fireEvent.click(screen.getByRole('button'));
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 accessibility standards', async () => {
      const { container } = renderWithTheme(
        <CustomButton aria-label="Accessible button">
          Test
        </CustomButton>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', () => {
      renderWithTheme(
        <CustomButton onClick={mockOnClick}>
          Test
        </CustomButton>
      );
      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(mockOnClick).toHaveBeenCalled();
      
      mockOnClick.mockClear();
      fireEvent.keyDown(button, { key: ' ' });
      expect(mockOnClick).toHaveBeenCalled();
    });

    it('has correct ARIA attributes', () => {
      renderWithTheme(
        <CustomButton 
          loading 
          disabled 
          ariaLabel="Test button"
        >
          Test
        </CustomButton>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Test button');
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Interactions', () => {
    it('handles click events properly', () => {
      renderWithTheme(
        <CustomButton onClick={mockOnClick}>
          Test
        </CustomButton>
      );
      fireEvent.click(screen.getByRole('button'));
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('handles tooltip display', async () => {
      renderWithTheme(
        <CustomButton tooltipText="Helpful tip">
          Test
        </CustomButton>
      );
      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });

    it('supports icons with proper spacing', () => {
      renderWithTheme(
        <CustomButton 
          startIcon={<span data-testid="start-icon" />}
          endIcon={<span data-testid="end-icon" />}
        >
          Test
        </CustomButton>
      );
      expect(screen.getByTestId('start-icon')).toBeInTheDocument();
      expect(screen.getByTestId('end-icon')).toBeInTheDocument();
    });
  });

  describe('Theme Integration', () => {
    it('uses theme colors correctly', () => {
      renderWithTheme(
        <CustomButton color="primary">
          Test
        </CustomButton>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-containedPrimary');
    });

    it('applies theme transitions', () => {
      renderWithTheme(<CustomButton>Test</CustomButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({
        transition: expect.stringContaining('background-color'),
        transition: expect.stringContaining('box-shadow')
      });
    });

    it('supports theme customization', () => {
      const customTheme = createAppTheme('dark');
      render(
        <ThemeProvider theme={customTheme}>
          <CustomButton>Test</CustomButton>
        </ThemeProvider>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({
        backgroundColor: customTheme.palette.primary.main
      });
    });
  });

  describe('Size Variants', () => {
    it('renders small size correctly', () => {
      renderWithTheme(<CustomButton size="small">Test</CustomButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({
        padding: '6px 16px',
        fontSize: '0.8125rem',
        minHeight: '32px'
      });
    });

    it('renders large size correctly', () => {
      renderWithTheme(<CustomButton size="large">Test</CustomButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({
        padding: '10px 26px',
        fontSize: '0.9375rem',
        minHeight: '48px'
      });
    });
  });
});