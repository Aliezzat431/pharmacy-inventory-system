import { useState, useCallback, useRef } from 'react';
import axios from 'axios';

export const useInternetSearch = () => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const timeoutRef = useRef(null);

    const searchInternet = useCallback((query, type = "") => {
        if (!query || query.length < 2) {
            setResults([]);
            return;
        }

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await axios.get(`/api/search-external?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}`);
                setResults(response.data.results || []);
            } catch (err) {
                console.error("Internet search failed:", err);
                if (err.response?.status === 429) {
                    setError("تجاوزت حد البحث المسموح به حالياً. يرجى المحاولة بعد قليل.");
                } else {
                    setError("فشل البحث على الإنترنت");
                }
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 600); // 600ms debounce
    }, []);

    const clearResults = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setResults([]);
        setError(null);
    }, []);

    return { results, loading, error, searchInternet, clearResults };
};
