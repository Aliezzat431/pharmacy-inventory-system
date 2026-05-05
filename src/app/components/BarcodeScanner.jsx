"use client";
import { useEffect, useRef, useState } from "react";

const BarcodeScanner = ({ onScan }) => {
  const buffer = useRef("");
  const timeout = useRef(null);
  const isScanning = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent console when F12 is pressed
      if (e.key === "F12") {
        e.preventDefault();
        e.stopPropagation();
        isScanning.current = true; // Start scan mode
        buffer.current = "";
        return;
      }

      // Block Ctrl+Shift+I (common console shortcut)
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // If not in scan mode, ignore keys
      if (!isScanning.current) return;

      // End scan on Enter
      if (e.key === "Enter") {
        e.preventDefault();
        const scanned = buffer.current.trim();
        if (scanned) {
          onScan(scanned);
        }
        buffer.current = "";
        isScanning.current = false; // Exit scan mode
        return;
      }

      // Ignore special keys
      if (e.key.length > 1) return;

      // Append character
      buffer.current += e.key;

      // Reset buffer after timeout
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        buffer.current = "";
      }, 3000);
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [onScan]);

  return null; // No visible UI
};

export default BarcodeScanner;
