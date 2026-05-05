"use client";

import React from "react";
import { motion } from "framer-motion";

export const AIChart = ({ config }) => {
  const { type, data, title, xAxis, yAxis } = config;

  if (!data || data.length === 0) {
    return (
      <div className="mt-4 bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-6 text-center">
        <p className="text-gray-500">لا توجد بيانات للعرض</p>
      </div>
    );
  }

  // Bar Chart بسيط باستخدام Tailwind
  const renderBarChart = () => {
    const maxValue = Math.max(...data.map(item => item[yAxis] || 0));
    
    return (
      <div className="space-y-3">
        {data.map((item, idx) => {
          const value = item[yAxis] || 0;
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">{item[xAxis]}</span>
                <span className="font-bold text-blue-600">{value.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2.5 rounded-full"
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Pie Chart بسيط باستخدام div دائرية
  const renderPieChart = () => {
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    
    return (
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Pie representation */}
        <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-lg">
          {data.map((item, idx) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            const rotation = data.slice(0, idx).reduce((sum, i) => sum + (i.value / total) * 360, 0);
            
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="absolute inset-0"
                style={{
                  background: colors[idx % colors.length],
                  clipPath: `polygon(50% 50%, 50% 0, ${50 + 50 * Math.sin(rotation * Math.PI / 180)}% ${50 - 50 * Math.cos(rotation * Math.PI / 180)}%, 50% 50%)`,
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: 'center',
                }}
              />
            );
          })}
          <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
            <span className="text-lg font-bold text-gray-800">{total}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: colors[idx % colors.length] }} />
              <span className="text-sm text-gray-600">{item.name || item.label}</span>
              <span className="text-sm font-bold text-gray-800 mr-auto">
                {item.value} ({Math.round((item.value / total) * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Line Chart بسيط
  const renderLineChart = () => {
    const maxValue = Math.max(...data.map(item => item[yAxis] || 0));
    const minValue = Math.min(...data.map(item => item[yAxis] || 0));
    const range = maxValue - minValue || 1;
    
    // نقاط الرسم
    const points = data.map((item, idx) => {
      const x = (idx / (data.length - 1)) * 100;
      const y = 100 - ((item[yAxis] - minValue) / range) * 80; // 80% من الارتفاع
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="space-y-4">
        {/* SVG Line Chart */}
        <div className="relative h-48 w-full">
          <svg viewBox="0 0 100 100" className="w-full h-full preserve-3d">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(line => (
              <React.Fragment key={line}>
                <line
                  x1="0"
                  y1={line}
                  x2="100"
                  y2={line}
                  stroke="#e5e7eb"
                  strokeWidth="0.5"
                />
              </React.Fragment>
            ))}
            
            {/* Line */}
            <motion.polyline
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              points={points}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            
            {/* Points */}
            {data.map((item, idx) => {
              const x = (idx / (data.length - 1)) * 100;
              const y = 100 - ((item[yAxis] - minValue) / range) * 80;
              return (
                <motion.circle
                  key={idx}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.5 + idx * 0.1 }}
                  cx={x}
                  cy={y}
                  r="2"
                  fill="#3B82F6"
                  stroke="white"
                  strokeWidth="1"
                />
              );
            })}
          </svg>
        </div>

        {/* X-Axis Labels */}
        <div className="flex justify-between px-2">
          {data.map((item, idx) => (
            <div key={idx} className="text-xs text-gray-500 rotate-45 origin-left">
              {item[xAxis]}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-4 bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-6"
    >
      {title && (
        <h3 className="text-lg font-bold text-gray-800 mb-4 text-right">{title}</h3>
      )}
      
      {type === "bar" && renderBarChart()}
      {type === "pie" && renderPieChart()}
      {type === "line" && renderLineChart()}
      {!["bar", "pie", "line"].includes(type) && (
        <div className="text-center text-red-500">نوع الرسم البياني غير مدعوم</div>
      )}
    </motion.div>
  );
};