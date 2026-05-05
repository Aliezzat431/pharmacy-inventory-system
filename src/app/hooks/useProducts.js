import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { supabase } from '../lib/supabase';

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const token = Cookies.get("token");
      const res = await axios.get("/api/search", {
        params: { q: "", mode: "all" },
        headers: { Authorization: `Bearer ${token}` },
      });

      // res.data.products is an array of flattened batch records
      setProducts(res.data.products || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();

    const channel = supabase
      .channel('products_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProducts]);

  /**
   * Decrease stock in UI after a sale.
   * Matches by `batchId` (the subdocument _id from the flattened search result).
   */
  const decreaseStock = useCallback((productToMatch, deductQuantity) => {
    setProducts(prev => prev.map(p => {
      // Match by batchId (string comparison for safety)
      if (p.batchId?.toString() === productToMatch.batchId?.toString()) {
        return { ...p, quantity: Math.max(0, p.quantity - deductQuantity) };
      }
      return p;
    }));
  }, []);

  /**
   * Restore stock in UI when a cart item is removed.
   * productId here is the batchId from the item that was removed.
   */
  const restoreStock = useCallback((batchId, _expiry, _unit, amountToAdd) => {
    setProducts(prev => prev.map(p => {
      if (p.batchId?.toString() === batchId?.toString()) {
        return { ...p, quantity: p.quantity + amountToAdd };
      }
      return p;
    }));
  }, []);

  return { products, setProducts, loading, error, fetchProducts, decreaseStock, restoreStock };
};
