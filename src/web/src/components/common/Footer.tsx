// @mui/material v5.14.0
import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Link, 
  Grid, 
  useTheme 
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { lightTheme, darkTheme } from '../../styles/theme';

// Interface for Footer component props
interface FooterProps {
  // Extensible interface for future props
}

// Styled footer container with elevation and transitions
const FooterContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(6, 0),
  marginTop: 'auto',
  boxShadow: theme.shadows[4],
  zIndex: theme.zIndex.appBar,
  transition: 'all 0.3s ease-in-out',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(4, 0),
  },
}));

// Navigation link sections with semantic grouping
const navigationSections = [
  {
    title: 'Platform',
    links: [
      { text: 'Technology Search', href: '/technologies' },
      { text: 'Grant Center', href: '/grants' },
      { text: 'About Us', href: '/about' },
      { text: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { text: 'Documentation', href: '/docs' },
      { text: 'FAQs', href: '/faqs' },
      { text: 'Support', href: '/support' },
      { text: 'Terms of Service', href: '/terms' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { text: 'Privacy Policy', href: '/privacy' },
      { text: 'Cookie Policy', href: '/cookies' },
      { text: 'Accessibility', href: '/accessibility' },
      { text: 'Licensing', href: '/licensing' },
    ],
  },
];

// Social media links with accessibility labels
const socialLinks = [
  { text: 'LinkedIn', href: 'https://linkedin.com/company/incepta', ariaLabel: 'Visit Incepta on LinkedIn' },
  { text: 'Twitter', href: 'https://twitter.com/incepta', ariaLabel: 'Follow Incepta on Twitter' },
  { text: 'GitHub', href: 'https://github.com/incepta', ariaLabel: 'View Incepta on GitHub' },
];

/**
 * Footer component implementing Material Design 3.0 principles with enhanced
 * accessibility, responsive design, and performance optimizations.
 */
export const Footer: React.FC<FooterProps> = () => {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();

  // Keyboard navigation handler for accessibility
  const handleKeyPress = (event: React.KeyboardEvent, href: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      window.location.href = href;
    }
  };

  return (
    <FooterContainer component="footer" role="contentinfo">
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Navigation Sections */}
          {navigationSections.map((section) => (
            <Grid 
              item 
              xs={12} 
              sm={6} 
              md={3} 
              key={section.title}
              component="nav"
              aria-label={`${section.title} navigation`}
            >
              <Typography
                variant="h6"
                color="text.primary"
                gutterBottom
                sx={{ fontWeight: 500 }}
              >
                {section.title}
              </Typography>
              <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                {section.links.map((link) => (
                  <Box component="li" key={link.text} sx={{ mb: 1 }}>
                    <Link
                      href={link.href}
                      color="text.secondary"
                      sx={{
                        textDecoration: 'none',
                        transition: 'color 0.2s ease-in-out',
                        '&:hover': {
                          color: theme.palette.primary.main,
                        },
                        '&:focus': {
                          outline: `2px solid ${theme.palette.primary.main}`,
                          outlineOffset: '2px',
                        },
                      }}
                      onKeyPress={(e) => handleKeyPress(e, link.href)}
                    >
                      {link.text}
                    </Link>
                  </Box>
                ))}
              </Box>
            </Grid>
          ))}

          {/* Social Links and Copyright */}
          <Grid item xs={12} md={3}>
            <Typography
              variant="h6"
              color="text.primary"
              gutterBottom
              sx={{ fontWeight: 500 }}
            >
              Connect
            </Typography>
            <Box 
              component="ul" 
              sx={{ 
                listStyle: 'none', 
                p: 0, 
                m: 0,
                display: 'flex',
                gap: 2,
                flexWrap: 'wrap',
              }}
            >
              {socialLinks.map((link) => (
                <Box component="li" key={link.text}>
                  <Link
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.ariaLabel}
                    color="text.secondary"
                    sx={{
                      textDecoration: 'none',
                      transition: 'color 0.2s ease-in-out',
                      '&:hover': {
                        color: theme.palette.primary.main,
                      },
                      '&:focus': {
                        outline: `2px solid ${theme.palette.primary.main}`,
                        outlineOffset: '2px',
                      },
                    }}
                  >
                    {link.text}
                  </Link>
                </Box>
              ))}
            </Box>
          </Grid>

          {/* Copyright Information */}
          <Grid item xs={12}>
            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ 
                mt: { xs: 3, md: 4 },
                borderTop: `1px solid ${theme.palette.divider}`,
                pt: 3,
              }}
            >
              {'© '}
              {currentYear}
              {' Incepta. All rights reserved.'}
            </Typography>
          </Grid>
        </Grid>
      </Container>
    </FooterContainer>
  );
};

export default Footer;