"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiHome, FiSearch } from 'react-icons/fi';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 text-center"
      >
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-3xl opacity-20" />
          <FiSearch className="w-20 h-20 mx-auto text-blue-600 relative z-10" />
        </div>

        <h1 className="text-7xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          404
        </h1>

        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          عذراً، الصفحة غير موجودة
        </h2>

        <p className="text-gray-500 mb-8">
          الصفحة التي تبحث عنها قد تكون تم نقلها أو حذفها
        </p>

        <Link href="/">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all"
          >
            <FiHome className="w-5 h-5" />
            العودة للرئيسية
          </motion.button>
        </Link>

        <div className="mt-8 text-xs text-gray-400">
          نظام إدارة الصيدلية المتكامل
        </div>
      </motion.div>
    </div>
  );
}