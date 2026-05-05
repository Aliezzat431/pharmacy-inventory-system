"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiLogIn,
  FiLogOut,
  FiUserPlus,
  FiShoppingCart,
  FiRotateCcw,
  FiPackage,
  FiEdit,
  FiTrash2,
  FiDollarSign,
  FiSettings,
  FiSearch,
  FiUser,
  FiChevronDown,
  FiChevronUp,
  FiCalendar,
  FiAlertCircle,
  FiRefreshCw
} from 'react-icons/fi';
import axios from 'axios';
import Cookies from 'js-cookie';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { supabase } from '../lib/supabase';

// أيقونات الإجراءات
const ACTION_ICONS = {
  login: { icon: FiLogIn, color: 'text-green-600', bg: 'bg-green-100', label: 'تسجيل دخول' },
  logout: { icon: FiLogOut, color: 'text-gray-600', bg: 'bg-gray-100', label: 'تسجيل خروج' },
  register: { icon: FiUserPlus, color: 'text-blue-600', bg: 'bg-blue-100', label: 'تسجيل مستخدم' },
  sale: { icon: FiShoppingCart, color: 'text-orange-600', bg: 'bg-orange-100', label: 'عملية بيع' },
  return: { icon: FiRotateCcw, color: 'text-red-600', bg: 'bg-red-100', label: 'مرتجع' },
  product_add: { icon: FiPackage, color: 'text-cyan-600', bg: 'bg-cyan-100', label: 'إضافة منتج' },
  product_update: { icon: FiEdit, color: 'text-purple-600', bg: 'bg-purple-100', label: 'تعديل منتج' },
  product_delete: { icon: FiTrash2, color: 'text-pink-600', bg: 'bg-pink-100', label: 'حذف منتج' },
  withdrawal: { icon: FiDollarSign, color: 'text-orange-600', bg: 'bg-orange-100', label: 'سحب' },
  salary_payment: { icon: FiDollarSign, color: 'text-teal-600', bg: 'bg-teal-100', label: 'دفع راتب' },
  settings_update: { icon: FiSettings, color: 'text-gray-600', bg: 'bg-gray-100', label: 'تحديث الإعدادات' },
  debt_payment: { icon: FiDollarSign, color: 'text-green-600', bg: 'bg-green-100', label: 'دفع دين' },
  debt_create: { icon: FiDollarSign, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'إنشاء دين' },
};

// دالة تنسيق التاريخ
const formatDate = (dateString) => {
  try {
    if (!dateString) return 'تاريخ غير معروف';
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ar });
  } catch (e) {
    console.error('Date formatting error:', e);
    return 'تاريخ غير صالح';
  }
};

// مكون بطاقة النشاط الواحدة
const ActivityCard = ({ activity }) => {
  const actionConfig = ACTION_ICONS[activity.action] || {
    icon: FiUser,
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    label: activity.action || 'نشاط غير معروف'
  };
  const IconComponent = actionConfig.icon;
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-xl transition-all border-r-4 mb-4"
      style={{ borderRightColor: actionConfig.color.replace('text-', '').replace('600', '500') }}
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* الأيقونة */}
          <div className={`p-3 rounded-xl ${actionConfig.bg} ${actionConfig.color}`}>
            <IconComponent className="w-6 h-6" />
          </div>

          {/* المحتوى */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${actionConfig.bg} ${actionConfig.color}`}>
                {actionConfig.label}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <FiCalendar className="w-3 h-3" />
                {formatDate(activity.createdAt)}
              </span>
            </div>

            <p className="text-gray-800 dark:text-white font-bold mb-2">
              {activity.description}
            </p>

            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <FiUser className="w-4 h-4" />
                {activity.username || 'النظام'}
              </span>

              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 text-sm font-medium"
                >
                  {expanded ? (
                    <>إخفاء التفاصيل <FiChevronUp className="w-4 h-4" /></>
                  ) : (
                    <>عرض التفاصيل <FiChevronDown className="w-4 h-4" /></>
                  )}
                </button>
              )}
            </div>

            {/* التفاصيل الموسعة */}
            <AnimatePresence>
              {expanded && activity.metadata && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 overflow-hidden"
                >
                  <pre className="bg-gray-50 dark:bg-slate-900 p-4 rounded-xl text-xs font-mono overflow-x-auto text-gray-700 dark:text-gray-300">
                    {JSON.stringify(activity.metadata, null, 2)}
                  </pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function ActivitiesPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("activities_page");
      return saved ? Number(saved) : 1;
    }
    return 1;
  });
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem("activities_action_filter") || "all";
    return "all";
  });
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem("activities_search_query") || "";
    return "";
  });

  useEffect(() => {
    localStorage.setItem("activities_page", page);
    localStorage.setItem("activities_action_filter", actionFilter);
    localStorage.setItem("activities_search_query", searchQuery);
  }, [page, actionFilter, searchQuery]);

  useEffect(() => {
    fetchActivities();
  }, [page, actionFilter]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('activities_realtime')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'activities' 
      }, (payload) => {
        // Only refetch if we are on the first page and everything else matches (optional: filter by actionFilter)
        if (page === 1) {
          fetchActivities();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [page, actionFilter]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = Cookies.get('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      if (actionFilter !== 'all') {
        params.append('action', actionFilter);
      }

      if (searchQuery.trim()) {
        params.append('search', searchQuery);
      }

      const response = await axios.get(`/api/activities?${params.toString()}`, { headers });

      if (response.data.success) {
        setActivities(response.data.activities);
        setTotalPages(response.data.pagination.pages);
      } else {
        setError('فشل في جلب البيانات: استجابة غير متوقعة');
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      const msg = error.response?.data?.error || error.response?.data?.message || 'حدث خطأ أثناء جلب سجل النشاطات';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchActivities();
  };

  // إذا كان في خطأ
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">⚠️ حدث خطأ</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={fetchActivities}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            📋 سجل النشاطات
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            تتبع جميع العمليات التي تمت في النظام
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-slate-700 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <FiSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="ابحث في الوصف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pr-12 pl-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-right"
              />
            </div>

            {/* Filter Select */}
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[200px]"
            >
              <option value="all">الكل</option>
              {Object.entries(ACTION_ICONS).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            {/* Refresh Button */}
            <button
              onClick={fetchActivities}
              className="p-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl transition-colors"
            >
              <FiRefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Activities List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-slate-700 p-12 text-center">
            <div className="text-6xl mb-4 opacity-20">📭</div>
            <h3 className="text-xl font-bold text-gray-500 dark:text-gray-400">لا توجد نشاطات</h3>
            <p className="text-gray-400 dark:text-gray-500 mt-2">
              لم يتم العثور على أي نشاط يطابق معايير البحث
            </p>
          </div>
        ) : (
          <>
            <AnimatePresence>
              {activities.map((activity) => (
                <ActivityCard key={activity._id} activity={activity} />
              ))}
            </AnimatePresence>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8 gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl disabled:opacity-50 font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  السابق
                </button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5) {
                      if (page > 3) {
                        pageNum = page - 3 + i;
                      }
                    }
                    if (pageNum <= totalPages) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-10 h-10 rounded-xl font-bold transition-colors ${
                            page === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl disabled:opacity-50 font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  التالي
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}