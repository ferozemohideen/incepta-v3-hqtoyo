// @mui/material v5.14.0
import React, { useCallback, useEffect, useRef } from 'react';
import { Tabs as MuiTabs, Tab, Box, useMediaQuery } from '@mui/material';
import { lightTheme } from '../../styles/theme';
import { useTheme } from '../../hooks/useTheme';

// Interface for individual tab item
interface TabItem {
  label: string;
  value: string | number;
  icon?: React.ReactElement;
  disabled?: boolean;
}

// Props interface with comprehensive enterprise features
interface TabsProps {
  tabs: TabItem[];
  value: string | number;
  onChange: (value: string | number) => void;
  variant?: 'standard' | 'scrollable' | 'fullWidth';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  ariaLabel?: string;
  centered?: boolean;
  scrollButtons?: boolean | 'auto';
}

/**
 * Enhanced accessibility props generator following WCAG 2.1 guidelines
 * @param index - Tab index
 * @param orientation - Tab orientation
 * @returns Object containing ARIA and role attributes
 */
const a11yProps = (index: number, orientation: 'horizontal' | 'vertical' = 'horizontal') => ({
  id: `tab-${index}`,
  'aria-controls': `tabpanel-${index}`,
  role: 'tab',
  tabIndex: 0,
  'aria-orientation': orientation,
  'aria-selected': false,
});

/**
 * Enterprise-grade tabs component with comprehensive features including
 * accessibility, responsive design, and theme integration
 */
export const CustomTabs: React.FC<TabsProps> = React.memo(({
  tabs,
  value,
  onChange,
  variant = 'standard',
  orientation = 'horizontal',
  className,
  ariaLabel = 'navigation tabs',
  centered = false,
  scrollButtons = 'auto'
}) => {
  // Theme and responsive hooks
  const { isDarkMode } = useTheme();
  const isMobile = useMediaQuery(lightTheme.breakpoints.down('sm'));
  
  // Refs for touch interaction handling
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  
  /**
   * Handles tab change with analytics tracking
   */
  const handleChange = useCallback((_: React.SyntheticEvent, newValue: string | number) => {
    onChange(newValue);
    // Analytics tracking could be added here
  }, [onChange]);

  /**
   * Touch event handlers for mobile swipe support
   */
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    handleSwipe();
  };

  /**
   * Processes swipe gestures for touch navigation
   */
  const handleSwipe = useCallback(() => {
    const swipeThreshold = 50;
    const diff = touchEndX.current - touchStartX.current;
    
    if (Math.abs(diff) > swipeThreshold) {
      const currentIndex = tabs.findIndex(tab => tab.value === value);
      if (diff > 0 && currentIndex > 0) {
        // Swipe right - previous tab
        onChange(tabs[currentIndex - 1].value);
      } else if (diff < 0 && currentIndex < tabs.length - 1) {
        // Swipe left - next tab
        onChange(tabs[currentIndex + 1].value);
      }
    }
  }, [tabs, value, onChange]);

  // Keyboard navigation setup
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      const currentIndex = tabs.findIndex(tab => tab.value === value);
      
      switch(e.key) {
        case 'ArrowRight':
          if (currentIndex < tabs.length - 1) {
            onChange(tabs[currentIndex + 1].value);
          }
          break;
        case 'ArrowLeft':
          if (currentIndex > 0) {
            onChange(tabs[currentIndex - 1].value);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [tabs, value, onChange]);

  return (
    <Box
      sx={{
        width: '100%',
        borderBottom: 1,
        borderColor: 'divider',
        position: 'relative',
        zIndex: 1,
        transition: 'all 0.2s ease',
        backgroundColor: theme => theme.palette.background.paper,
        boxShadow: isDarkMode ? '0 1px 2px rgba(255,255,255,0.05)' : '0 1px 2px rgba(0,0,0,0.05)',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={className}
    >
      <MuiTabs
        value={value}
        onChange={handleChange}
        variant={isMobile ? 'scrollable' : variant}
        orientation={orientation}
        aria-label={ariaLabel}
        centered={!isMobile && centered}
        scrollButtons={scrollButtons}
        allowScrollButtonsMobile
        sx={{
          minHeight: {
            xs: '40px',
            sm: '48px'
          },
          '& .MuiTabs-indicator': {
            transition: 'all 0.2s ease',
            height: '2px',
          },
          '& .MuiTabs-scrollButtons': {
            '&.Mui-disabled': {
              opacity: 0.3,
            },
          },
        }}
      >
        {tabs.map((tab, index) => (
          <Tab
            key={tab.value}
            label={tab.label}
            icon={tab.icon}
            value={tab.value}
            disabled={tab.disabled}
            {...a11yProps(index, orientation)}
            sx={{
              minHeight: {
                xs: '40px',
                sm: '48px'
              },
              padding: {
                xs: '6px 12px',
                sm: '8px 16px'
              },
              fontSize: {
                xs: '14px',
                sm: '16px'
              },
              textTransform: 'none',
              fontWeight: 'medium',
              transition: 'all 0.2s ease',
              '&.Mui-selected': {
                fontWeight: 'bold',
              },
              '&.Mui-disabled': {
                opacity: 0.5,
              },
            }}
          />
        ))}
      </MuiTabs>
    </Box>
  );
});

CustomTabs.displayName = 'CustomTabs';