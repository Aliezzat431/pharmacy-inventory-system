"use client";

import React from "react";
import { motion } from "framer-motion";

export const AIActionButtons = ({ config, onAction }) => {
  const { buttons } = config;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 flex flex-wrap gap-3"
    >
      {buttons.map((btn, idx) => (
        <button
          key={idx}
          onClick={() => onAction(btn.action)}
          className={`px-6 py-3 rounded-xl font-bold transition-all hover:shadow-lg ${
            btn.primary 
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
              : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-500'
          }`}
        >
          {btn.icon && <span className="ml-2">{btn.icon}</span>}
          {btn.label}
        </button>
      ))}
    </motion.div>
  );
};