/**
 * Grant Slice
 * Redux Toolkit slice for managing grant-related state with enhanced caching and real-time updates
 * Version: 1.0.0
 */

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit'; // ^1.9.5
import { persistReducer } from 'redux-persist'; // ^6.0.0
import { 
  IGrant, 
  IGrantApplication,
  IGrantSearchParams
} from '../interfaces/grant.interface';
import { grantService } from '../services/grant.service';

// Cache timeout in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Interface defining the grant slice state structure
 */
interface GrantState {
  grants: IGrant[];
  selectedGrant: IGrant | null;
  applications: IGrantApplication[];
  loading: Record<string, boolean>;
  error: Record<string, string | null>;
  totalResults: number;
  currentPage: number;
  pageSize: number;
  searchCache: Record<string, { data: IGrant[]; timestamp: number }>;
  lastUpdated: Record<string, number>;
}

/**
 * Initial state for the grant slice
 */
const initialState: GrantState = {
  grants: [],
  selectedGrant: null,
  applications: [],
  loading: {},
  error: {},
  totalResults: 0,
  currentPage: 1,
  pageSize: 10,
  searchCache: {},
  lastUpdated: {}
};

/**
 * Async thunk for searching grants with caching
 */
export const searchGrants = createAsyncThunk(
  'grants/search',
  async (params: IGrantSearchParams, { getState, rejectWithValue }) => {
    try {
      const cacheKey = JSON.stringify(params);
      const state = getState() as { grants: GrantState };
      const cached = state.grants.searchCache[cacheKey];

      // Return cached results if valid
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return { data: cached.data, fromCache: true };
      }

      const response = await grantService.searchGrants(params);
      return { data: response, fromCache: false };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Async thunk for fetching grant details by ID
 */
export const getGrantById = createAsyncThunk(
  'grants/getById',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { grants: GrantState };
      const lastUpdated = state.grants.lastUpdated[id];

      // Return cached grant if recently updated
      if (lastUpdated && Date.now() - lastUpdated < CACHE_TTL) {
        const cached = state.grants.grants.find(grant => grant.id === id);
        if (cached) return cached;
      }

      return await grantService.getGrantById(id);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Async thunk for submitting grant applications with optimistic updates
 */
export const submitApplication = createAsyncThunk(
  'grants/submit',
  async ({ grantId, applicationData }: { grantId: string; applicationData: Partial<IGrantApplication> }, 
    { rejectWithValue }) => {
    try {
      const response = await grantService.submitApplication(grantId, applicationData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Grant slice definition with reducers and actions
 */
const grantSlice = createSlice({
  name: 'grants',
  initialState,
  reducers: {
    clearErrors: (state) => {
      state.error = {};
    },
    clearCache: (state) => {
      state.searchCache = {};
      state.lastUpdated = {};
    },
    updateApplicationStatus: (state, action) => {
      const { id, status } = action.payload;
      const application = state.applications.find(app => app.id === id);
      if (application) {
        application.status = status;
        application.lastModifiedAt = new Date();
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Search Grants Reducers
      .addCase(searchGrants.pending, (state) => {
        state.loading['search'] = true;
        state.error['search'] = null;
      })
      .addCase(searchGrants.fulfilled, (state, action) => {
        const { data, fromCache } = action.payload;
        state.grants = data.data;
        state.totalResults = data.total;
        state.currentPage = data.page;
        state.pageSize = data.limit;
        
        if (!fromCache) {
          state.searchCache[JSON.stringify(action.meta.arg)] = {
            data: data.data,
            timestamp: Date.now()
          };
        }
        
        state.loading['search'] = false;
      })
      .addCase(searchGrants.rejected, (state, action) => {
        state.loading['search'] = false;
        state.error['search'] = action.payload as string;
      })

      // Get Grant By ID Reducers
      .addCase(getGrantById.pending, (state) => {
        state.loading['getById'] = true;
        state.error['getById'] = null;
      })
      .addCase(getGrantById.fulfilled, (state, action) => {
        state.selectedGrant = action.payload;
        state.lastUpdated[action.payload.id] = Date.now();
        state.loading['getById'] = false;
      })
      .addCase(getGrantById.rejected, (state, action) => {
        state.loading['getById'] = false;
        state.error['getById'] = action.payload as string;
      })

      // Submit Application Reducers
      .addCase(submitApplication.pending, (state) => {
        state.loading['submit'] = true;
        state.error['submit'] = null;
      })
      .addCase(submitApplication.fulfilled, (state, action) => {
        state.applications.push(action.payload);
        state.loading['submit'] = false;
      })
      .addCase(submitApplication.rejected, (state, action) => {
        state.loading['submit'] = false;
        state.error['submit'] = action.payload as string;
      });
  }
});

/**
 * Memoized selectors for optimized state access
 */
export const selectGrants = createSelector(
  [(state: { grants: GrantState }) => state.grants],
  (grantState) => ({
    grants: grantState.grants,
    totalResults: grantState.totalResults,
    currentPage: grantState.currentPage,
    pageSize: grantState.pageSize
  })
);

export const selectSelectedGrant = createSelector(
  [(state: { grants: GrantState }) => state.grants.selectedGrant],
  (selectedGrant) => selectedGrant
);

export const selectApplications = createSelector(
  [(state: { grants: GrantState }) => state.grants.applications],
  (applications) => applications
);

export const selectLoadingState = createSelector(
  [(state: { grants: GrantState }) => state.grants.loading],
  (loading) => loading
);

export const selectErrors = createSelector(
  [(state: { grants: GrantState }) => state.grants.error],
  (error) => error
);

// Export actions
export const { clearErrors, clearCache, updateApplicationStatus } = grantSlice.actions;

// Configure persistence
const persistConfig = {
  key: 'grants',
  storage: localStorage,
  whitelist: ['grants', 'applications', 'searchCache', 'lastUpdated']
};

// Export persisted reducer
export default persistReducer(persistConfig, grantSlice.reducer);