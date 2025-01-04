/**
 * Technology Redux Slice
 * Implements comprehensive state management for technology listings with normalized data structures,
 * caching, and optimistic updates
 * Version: 1.0.0
 */

import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { debounce } from 'lodash'; // ^4.17.21

import { 
  Technology, 
  TechnologySearchParams, 
  PatentStatus,
  TechnologyMetadata 
} from '../interfaces/technology.interface';
import { technologyService } from '../services/technology.service';

/**
 * Interface for normalized technology state
 */
interface TechnologyState {
  // Normalized technology entities
  entities: Record<string, Technology>;
  // IDs of technologies in current search results
  searchResults: string[];
  // IDs of matched technologies
  matchedTechnologies: string[];
  // IDs of saved technologies
  savedTechnologies: string[];
  // Current search parameters
  searchParams: TechnologySearchParams;
  // Selected technology ID
  selectedTechnologyId: string | null;
  // Loading states for different operations
  loading: {
    search: boolean;
    match: boolean;
    save: boolean;
    details: boolean;
  };
  // Error states for different operations
  error: {
    search: string | null;
    match: string | null;
    save: string | null;
    details: string | null;
  };
  // Pagination metadata
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  // Cache configuration
  cache: {
    timestamp: number;
    expiresIn: number;
  };
}

/**
 * Initial state with normalized structure
 */
const initialState: TechnologyState = {
  entities: {},
  searchResults: [],
  matchedTechnologies: [],
  savedTechnologies: [],
  searchParams: {
    query: '',
    universities: [],
    patentStatus: [],
    page: 1,
    limit: 20,
    sortBy: 'title',
    sortOrder: 'asc',
    trlRange: {
      min: 1,
      max: 9
    },
    domains: [],
    stage: [],
    dateRange: {
      start: null,
      end: null
    }
  },
  selectedTechnologyId: null,
  loading: {
    search: false,
    match: false,
    save: false,
    details: false
  },
  error: {
    search: null,
    match: null,
    save: null,
    details: null
  },
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0
  },
  cache: {
    timestamp: 0,
    expiresIn: 5 * 60 * 1000 // 5 minutes
  }
};

/**
 * Async thunk for searching technologies with debouncing
 */
export const searchTechnologies = createAsyncThunk(
  'technology/search',
  async (params: TechnologySearchParams, { rejectWithValue }) => {
    try {
      const response = await technologyService.searchTechnologies(params);
      return {
        items: response.items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize
      };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk for fetching technology details
 */
export const getTechnologyById = createAsyncThunk(
  'technology/getById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await technologyService.getTechnologyById(id);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk for getting AI-matched technologies
 */
export const getMatchingTechnologies = createAsyncThunk(
  'technology/getMatches',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await technologyService.getMatchingTechnologies(userId);
      return response.matches;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Technology slice with comprehensive state management
 */
const technologySlice = createSlice({
  name: 'technology',
  initialState,
  reducers: {
    // Update search parameters
    setSearchParams: (state, action: PayloadAction<Partial<TechnologySearchParams>>) => {
      state.searchParams = { ...state.searchParams, ...action.payload };
    },
    
    // Clear search results
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.pagination = initialState.pagination;
    },
    
    // Select technology
    selectTechnology: (state, action: PayloadAction<string>) => {
      state.selectedTechnologyId = action.payload;
    },
    
    // Clear errors
    clearErrors: (state) => {
      state.error = initialState.error;
    },
    
    // Optimistic save technology
    saveTechnologyOptimistic: (state, action: PayloadAction<string>) => {
      state.savedTechnologies.push(action.payload);
    },
    
    // Revert optimistic save
    revertSaveTechnology: (state, action: PayloadAction<string>) => {
      state.savedTechnologies = state.savedTechnologies.filter(id => id !== action.payload);
    }
  },
  extraReducers: (builder) => {
    // Search technologies
    builder
      .addCase(searchTechnologies.pending, (state) => {
        state.loading.search = true;
        state.error.search = null;
      })
      .addCase(searchTechnologies.fulfilled, (state, action) => {
        state.loading.search = false;
        // Normalize technologies
        action.payload.items.forEach(tech => {
          state.entities[tech.id] = tech;
        });
        state.searchResults = action.payload.items.map(tech => tech.id);
        state.pagination = {
          page: action.payload.page,
          pageSize: action.payload.pageSize,
          total: action.payload.total
        };
        state.cache.timestamp = Date.now();
      })
      .addCase(searchTechnologies.rejected, (state, action) => {
        state.loading.search = false;
        state.error.search = action.payload as string;
      })

    // Get technology by ID
    builder
      .addCase(getTechnologyById.pending, (state) => {
        state.loading.details = true;
        state.error.details = null;
      })
      .addCase(getTechnologyById.fulfilled, (state, action) => {
        state.loading.details = false;
        state.entities[action.payload.id] = action.payload;
        state.selectedTechnologyId = action.payload.id;
      })
      .addCase(getTechnologyById.rejected, (state, action) => {
        state.loading.details = false;
        state.error.details = action.payload as string;
      })

    // Get matching technologies
    builder
      .addCase(getMatchingTechnologies.pending, (state) => {
        state.loading.match = true;
        state.error.match = null;
      })
      .addCase(getMatchingTechnologies.fulfilled, (state, action) => {
        state.loading.match = false;
        // Normalize matched technologies
        action.payload.forEach(tech => {
          state.entities[tech.id] = tech;
        });
        state.matchedTechnologies = action.payload.map(tech => tech.id);
      })
      .addCase(getMatchingTechnologies.rejected, (state, action) => {
        state.loading.match = false;
        state.error.match = action.payload as string;
      });
  }
});

// Memoized selectors
export const selectAllTechnologies = (state: { technology: TechnologyState }) => 
  state.technology.entities;

export const selectSearchResults = createSelector(
  [selectAllTechnologies, (state: { technology: TechnologyState }) => state.technology.searchResults],
  (entities, searchResults) => searchResults.map(id => entities[id])
);

export const selectMatchedTechnologies = createSelector(
  [selectAllTechnologies, (state: { technology: TechnologyState }) => state.technology.matchedTechnologies],
  (entities, matchedTechnologies) => matchedTechnologies.map(id => entities[id])
);

export const selectSelectedTechnology = createSelector(
  [selectAllTechnologies, (state: { technology: TechnologyState }) => state.technology.selectedTechnologyId],
  (entities, selectedId) => selectedId ? entities[selectedId] : null
);

export const selectTechnologyLoadingState = (state: { technology: TechnologyState }) =>
  state.technology.loading;

export const selectTechnologyErrors = (state: { technology: TechnologyState }) =>
  state.technology.error;

export const selectSearchParams = (state: { technology: TechnologyState }) =>
  state.technology.searchParams;

export const selectPagination = (state: { technology: TechnologyState }) =>
  state.technology.pagination;

// Export actions and reducer
export const { 
  setSearchParams, 
  clearSearchResults, 
  selectTechnology, 
  clearErrors,
  saveTechnologyOptimistic,
  revertSaveTechnology
} = technologySlice.actions;

export default technologySlice.reducer;