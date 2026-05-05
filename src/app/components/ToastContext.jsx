"use client";

import React, { createContext, useContext, useCallback } from "react";
import { toast } from "sonner";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const showToast = useCallback((message, type = "success") => {
        switch (type) {
            case "success":
                toast.success(message);
                break;
            case "error":
                toast.error(message);
                break;
            case "warning":
                toast.warning(message);
                break;
            case "info":
                toast.info(message);
                break;
            default:
                toast(message);
        }
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};
