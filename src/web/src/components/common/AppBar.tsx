import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Badge,
  Menu,
  MenuItem,
  Tooltip,
  useMediaQuery,
  CircularProgress,
  Box,
  InputBase,
  alpha,
  styled
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  AccountCircle,
  Settings as SettingsIcon,
  Brightness4,
  Brightness7
} from '@mui/icons-material';

import { PROTECTED_ROUTES } from '../../constants/routes.constants';
import useAuth from '../../hooks/useAuth';
import useNotification from '../../hooks/useNotification';
import useTheme from '../../hooks/useTheme';

// Styled components for enhanced AppBar features
const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '20ch',
      '&:focus': {
        width: '30ch',
      },
    },
  },
}));

// Interface definitions
interface AppBarProps {
  onMenuClick: () => void;
  isOffline?: boolean;
  loading?: boolean;
}

export const AppBarComponent: React.FC<AppBarProps> = ({
  onMenuClick,
  isOffline = false,
  loading = false,
}) => {
  // Hooks
  const navigate = useNavigate();
  const { user, handleLogout } = useAuth();
  const { showNotification } = useNotification();
  const { toggleTheme, isDarkMode } = useTheme();
  const isMobile = useMediaQuery((theme: any) => theme.breakpoints.down('sm'));

  // State
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Handlers
  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = useCallback(() => {
    handleMenuClose();
    navigate(PROTECTED_ROUTES.PROFILE);
  }, [navigate]);

  const handleSettingsClick = useCallback(() => {
    handleMenuClose();
    navigate(PROTECTED_ROUTES.SETTINGS);
  }, [navigate]);

  const handleLogoutClick = useCallback(async () => {
    try {
      handleMenuClose();
      await handleLogout();
      showNotification({
        message: 'Successfully logged out',
        type: 'success'
      });
      navigate('/login');
    } catch (error) {
      showNotification({
        message: 'Failed to logout. Please try again.',
        type: 'error'
      });
    }
  }, [handleLogout, navigate, showNotification]);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('#search-input')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <AppBar 
      position="fixed" 
      color="primary"
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        transition: (theme) => theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
      }}
    >
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="open drawer"
          onClick={onMenuClick}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ display: { xs: 'none', sm: 'block' } }}
        >
          Incepta
        </Typography>

        <Search component="form" onSubmit={handleSearchSubmit}>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <StyledInputBase
            id="search-input"
            placeholder="Search technologies..."
            inputProps={{ 'aria-label': 'search' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Search>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isOffline && (
            <Typography
              variant="caption"
              sx={{ color: 'error.main', mr: 2 }}
            >
              Offline
            </Typography>
          )}

          <Tooltip title={`Toggle ${isDarkMode ? 'light' : 'dark'} mode`}>
            <IconButton
              color="inherit"
              onClick={toggleTheme}
              aria-label="toggle theme"
            >
              {isDarkMode ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>

          {!isMobile && (
            <Tooltip title="Notifications">
              <IconButton color="inherit">
                <Badge badgeContent={4} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Account settings">
            <IconButton
              edge="end"
              onClick={handleProfileMenuOpen}
              color="inherit"
              aria-label="account settings"
              aria-controls="profile-menu"
              aria-haspopup="true"
            >
              <AccountCircle />
            </IconButton>
          </Tooltip>
        </Box>

        <Menu
          id="profile-menu"
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          keepMounted
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={handleProfileClick} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Profile'}
          </MenuItem>
          <MenuItem onClick={handleSettingsClick} disabled={loading}>
            <SettingsIcon sx={{ mr: 1 }} />
            Settings
          </MenuItem>
          <MenuItem onClick={handleLogoutClick} disabled={loading}>
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default AppBarComponent;