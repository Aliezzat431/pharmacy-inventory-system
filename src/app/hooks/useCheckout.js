import { useState, useCallback, useEffect } from 'react';

export const useCheckout = () => {
    const [items, setItems] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('checkout_items');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });
    
    const [total, setTotal] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('checkout_total');
            return saved ? JSON.parse(saved) : 0;
        }
        return 0;
    });

    useEffect(() => {
        localStorage.setItem('checkout_items', JSON.stringify(items));
        localStorage.setItem('checkout_total', JSON.stringify(total));
    }, [items, total]);

    const addItem = useCallback((newItem) => {
        setItems((prev) => {
            const next = [...prev, newItem];
            setTotal(next.reduce((sum, i) => sum + i.total, 0));
            return next;
        });
    }, []);

    const removeItem = useCallback((index) => {
        let removedItem = null;
        setItems((prev) => {
            const next = [...prev];
            removedItem = next.splice(index, 1)[0];
            setTotal(next.reduce((sum, i) => sum + i.total, 0));
            return next;
        });
        return removedItem;
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
        setTotal(0);
    }, []);

    return {
        items,
        setItems,
        total,
        setTotal,
        addItem,
        removeItem,
        clearCart
    };
};
