import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    cartItems: [],
    total: 0,
};

const checkoutSlice = createSlice({
    name: 'checkout',
    initialState,
    reducers: {
        addItem: (state, action) => {
            state.cartItems.push(action.payload);
            state.total = state.cartItems.reduce((sum, item) => sum + item.total, 0);
        },
        removeItem: (state, action) => {
            const index = action.payload;
            state.cartItems.splice(index, 1);
            state.total = state.cartItems.reduce((sum, item) => sum + item.total, 0);
        },
        clearCart: (state) => {
            state.cartItems = [];
            state.total = 0;
        },
        setCartItems: (state, action) => {
            state.cartItems = action.payload;
            state.total = state.cartItems.reduce((sum, item) => sum + item.total, 0);
        }
    },
});

export const { addItem, removeItem, clearCart, setCartItems } = checkoutSlice.actions;
export default checkoutSlice.reducer;
