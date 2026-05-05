"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setDarkMode } from "../../lib/redux/slices/uiSlice";

const ThemeProvider = ({ children }) => {
    const dispatch = useDispatch();
    const darkMode = useSelector((state) => state.ui.darkMode);
    const [mounted, setMounted] = useState(false);

    // Initial Sync on Mount
    useEffect(() => {
        const storedTheme = localStorage.getItem("theme");
        const systemPrefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches;

        if (storedTheme === "dark" || (!storedTheme && systemPrefersDark)) {
            dispatch(setDarkMode(true));
            document.documentElement.classList.add("dark");
        } else {
            dispatch(setDarkMode(false));
            document.documentElement.classList.remove("dark");
        }

        setMounted(true);
    }, [dispatch]);

    // Sync Redux state changes
    useEffect(() => {
        if (!mounted) return;

        if (darkMode) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    }, [darkMode, mounted]);

    // ⛔ Prevent render before theme is ready
    if (!mounted) {
        return null; // أو spinner لو حابب
    }

    return <>{children}</>;
};

export default ThemeProvider;
