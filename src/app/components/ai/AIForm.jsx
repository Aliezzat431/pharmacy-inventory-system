"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

export const AIForm = ({ config, onSubmit }) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 bg-white rounded-2xl border-2 border-blue-200 shadow-xl overflow-hidden"
    >
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
        <h3 className="text-white font-bold text-lg">{config.title}</h3>
        {config.description && (
          <p className="text-white/80 text-sm mt-1">{config.description}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {config.fields.map((field) => (
          <div key={field.name} className="space-y-1">
            <label className="block text-sm font-bold text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 mr-1">*</span>}
            </label>

            {field.type === "select" ? (
              <select
                value={formData[field.name] || ""}
                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
              >
                <option value="">اختر...</option>
                {field.options?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                value={formData[field.name] || ""}
                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                placeholder={field.placeholder}
                rows={3}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            ) : (
              <input
                type={field.type || "text"}
                value={formData[field.name] || ""}
                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                placeholder={field.placeholder}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            )}
          </div>
        ))}

        <button
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
        >
          {config.submitText || "تنفيذ"}
        </button>
      </form>
    </motion.div>
  );
};