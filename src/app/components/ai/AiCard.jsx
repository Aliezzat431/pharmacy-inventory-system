"use client";

import React from "react";
import { motion } from "framer-motion";

export const AICard = ({ config }) => {
  const { icon, title, value, trend, items } = config;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-200 shadow-xl p-6"
    >
      {icon && <div className="text-4xl mb-3">{icon}</div>}
      
      {title && <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">{title}</h3>}
      
      {value && (
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-black text-gray-900">{value}</span>
          {trend && (
            <span className={`text-sm font-bold ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
        </div>
      )}

      {items && (
        <div className="mt-4 space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{item.label}</span>
              <span className="font-bold text-gray-900">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};