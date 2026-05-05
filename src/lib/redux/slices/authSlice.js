import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const initialState = {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null,
};

// Async thunk to check auth status on app load
export const checkAuth = createAsyncThunk('auth/checkAuth', async (_, { rejectWithValue }) => {
    try {
        const response = await axios.get('/api/auth/me');
        return response.data.user;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Not authenticated');
    }
});

// Async thunk for logout
export const logoutUser = createAsyncThunk('auth/logoutUser', async () => {
    await axios.post('/api/auth/logout');
});

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (state, action) => {
            const { user } = action.payload;
            state.user = user;
            state.token = true; // Flag for auth status, actual token in cookie
            state.isAuthenticated = true;
        },
        clearAuth: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(checkAuth.pending, (state) => {
                state.loading = true;
            })
            .addCase(checkAuth.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
                state.isAuthenticated = true;
            })
            .addCase(checkAuth.rejected, (state) => {
                state.loading = false;
                state.isAuthenticated = false;
                state.user = null;
            })
            .addCase(logoutUser.fulfilled, (state) => {
                state.user = null;
                state.isAuthenticated = false;
            });
    }
});

export const { setCredentials, clearAuth } = authSlice.actions;
export default authSlice.reducer;
