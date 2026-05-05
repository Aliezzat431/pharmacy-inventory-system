"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  FiBookOpen,
  FiChevronLeft,
  FiHome,
  FiPackage,
  FiPlusCircle,
  FiRotateCcw,
  FiUsers,
  FiAlertTriangle,
  FiBarChart2,
  FiTruck,
  FiSettings,
  FiChevronRight,
  FiInfo
} from "react-icons/fi";

const pages = [
  {
    name: "كاشير المبيعات",
    desc: "تسجيل مبيعات العملاء بسرعة بالباركود أو يدويًا + دفع كاش + تبرعات/صدقات.",
    path: "/checkout",
    example: "مثال: اكتب باركود المنتج، حط الكمية، واضغط دفع كاش.",
    icon: FiHome,
    color: "from-blue-600 to-blue-400"
  },
  {
    name: "إدارة المخزون",
    desc: "عرض المخزون الحالي، إضافة/تعديل المنتجات، تتبع الكميات وتواريخ الصلاحية.",
    path: "/inventory",
    example: "مثال: لو عايز تزود كمية دواء، افتح المنتج وعدل الكمية.",
    icon: FiPackage,
    color: "from-green-600 to-green-400"
  },
  {
    name: "إضافة رصيد",
    desc: "تسجيل إيداع رصيد للصيدلية (زيادة رأس المال أو دخل إضافي).",
    path: "/add-balance",
    example: "مثال: دخلت مبلغ من بيع كاش أو من مورد، تسجله هنا.",
    icon: FiPlusCircle,
    color: "from-purple-600 to-purple-400"
  },
  {
    name: "مرتجع مبيعات",
    desc: "تسجيل المرتجعات وتحديث المخزون تلقائيًا مع حساب إجمالي المرتجع.",
    path: "/returns",
    example: "مثال: لو العميل رجّع دواء، أضف المنتج وكمية المرتجع واحفظ.",
    icon: FiRotateCcw,
    color: "from-red-600 to-red-400"
  },
  {
    name: "حسابات العملاء",
    desc: "تسجيل الديون، تسديدها، ومتابعة العملاء اللي عليهم مبالغ.",
    path: "/customers",
    example: "مثال: سجل عميل عليه دين، وبعد كده تسديده من هنا.",
    icon: FiUsers,
    color: "from-orange-600 to-orange-400"
  },
  {
    name: "النواقص والانتهاء",
    desc: "عرض المنتجات الناقصة أو المنتهية، وتنبيه عند قرب الانتهاء.",
    path: "/shortages",
    example: "مثال: هتلاقي المنتجات اللي قربت تنتهي أو خلصت.",
    icon: FiAlertTriangle,
    color: "from-yellow-600 to-yellow-400"
  },
  {
    name: "تقارير الأرباح",
    desc: "عرض تقارير يومية/شهرية، ورسومات بيانية، وتسجيل الصدقات.",
    path: "/dashboard",
    example: "مثال: شوف أرباح اليوم، الشهر، وكم اتبرع من الصدقات.",
    icon: FiBarChart2,
    color: "from-indigo-600 to-indigo-400"
  },
  {
    name: "الموردين",
    desc: "إضافة وتعديل الموردين ومتابعة مشترياتك منهم.",
    path: "/suppliers",
    example: "مثال: سجل مورد جديد وامسح مشترياتك منه.",
    icon: FiTruck,
    color: "from-teal-600 to-teal-400"
  },
  {
    name: "الإعدادات",
    desc: "تخصيص الإعدادات العامة: تأكيد الدفع، تأكيد الحذف، إعدادات الصيدلية…",
    path: "/settings",
    example: "مثال: فعل تأكيد الحذف عشان ميحصلش حذف غلط.",
    icon: FiSettings,
    color: "from-gray-600 to-gray-400"
  },
];

export default function Documentation() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-block p-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl shadow-2xl shadow-blue-500/30 mb-6">
            <FiBookOpen className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            🧭 دليل استخدام المشروع
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            دليل سريع يشرح كل صفحة في المشروع وإزاي تستخدمها
          </p>
        </motion.div>

        {/* How to use section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700 p-8 mb-8"
        >
          <h2 className="text-2xl font-black text-blue-600 dark:text-blue-400 mb-6 flex items-center gap-2">
            <FiInfo className="w-6 h-6" />
            👇 ازاي تستخدم النظام؟
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl mb-4">1</div>
              <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-2">افتح الصفحة المطلوبة</h3>
              <p className="text-gray-600 dark:text-gray-400">افتح الصفحة اللي عايزها من القائمة الجانبية.</p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">مثال: لو هتسجل مبيعات، افتح كاشير المبيعات.</p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-6">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-white font-black text-xl mb-4">2</div>
              <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-2">اتبع الخطوات</h3>
              <p className="text-gray-600 dark:text-gray-400">اتبع الخطوات داخل كل صفحة.</p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">كل صفحة فيها شرح مختصر في الأعلى.</p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-6">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white font-black text-xl mb-4">3</div>
              <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-2">التعديل عند الحاجة</h3>
              <p className="text-gray-600 dark:text-gray-400">لو محتاج تعديل، استخدم زر التعديل داخل الصفحة.</p>
              <p className="text-sm text-purple-600 dark:text-purple-400 mt-2">مثال: تعديل كمية منتج أو حذف سطر.</p>
            </div>
          </div>
        </motion.div>

        {/* Pages Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {pages.map((page, index) => {
            const IconComponent = page.icon;
            
            return (
              <motion.div
                key={page.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                className="group"
              >
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-slate-700 p-6 h-full hover:shadow-2xl transition-all">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${page.color} text-white shadow-lg`}>
                      <IconComponent className="w-6 h-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-gray-800 dark:text-white mb-2">
                        {page.name}
                      </h3>
                      
                      <p className="text-gray-600 dark:text-gray-300 mb-3 text-sm">
                        {page.desc}
                      </p>

                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                        <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                          {page.example}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          المسار: {page.path}
                        </span>
                        
                        <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                          <FiChevronLeft className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center"
        >
          <div className="inline-block bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl px-8 py-4 border border-white/20 dark:border-slate-700">
            <p className="text-gray-600 dark:text-gray-300">
              نظام إدارة الصيدلية المتكامل - الإصدار 2.0
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              © 2024 جميع الحقوق محفوظة
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}