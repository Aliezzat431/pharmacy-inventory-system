import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    items: [],
    loading: false,
    error: null,
};

const productsSlice = createSlice({
    name: 'products',
    initialState,
    reducers: {
        setProducts: (state, action) => {
            state.items = action.payload;
            state.loading = false;
        },
        setProductsLoading: (state, action) => {
            state.loading = action.payload;
        },
        setProductsError: (state, action) => {
            state.error = action.payload;
            state.loading = false;
        },
        updateStock: (state, action) => {
            const { productId, expiryDate, unit, deductQuantity } = action.payload;
            const index = state.items.findIndex(
                (p) => p._id === productId && p.expiryDate === expiryDate && p.unit === unit
            );
            if (index !== -1) {
                state.items[index].quantity = Math.max(0, state.items[index].quantity - deductQuantity);
            }
        },
        restoreStock: (state, action) => {
            const { productId, expiryDate, amountToAdd } = action.payload;
            const index = state.items.findIndex(
                (p) => p._id === productId && p.expiryDate === expiryDate
            );
            if (index !== -1) {
                state.items[index].quantity += amountToAdd;
            }
        }
    },
});

export const { setProducts, setProductsLoading, setProductsError, updateStock, restoreStock } = productsSlice.actions;
export default productsSlice.reducer;
