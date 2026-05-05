import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    loading: false,
    notification: null, // { type: 'success' | 'error', message: string }
    darkMode: false,
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setNotification: (state, action) => {
            state.notification = action.payload;
        },
        clearNotification: (state) => {
            state.notification = null;
        },
        toggleDarkMode: (state) => {
            state.darkMode = !state.darkMode;
        },
        setDarkMode: (state, action) => {
            state.darkMode = action.payload;
        },
    },
});

export const { setLoading, setNotification, clearNotification, toggleDarkMode, setDarkMode } = uiSlice.actions;
export default uiSlice.reducer;
