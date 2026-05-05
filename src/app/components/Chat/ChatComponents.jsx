"use client";
import React from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { motion } from "framer-motion";
import { FiTrendingUp, FiShoppingBag, FiAlertTriangle, FiPlusCircle, FiActivity } from "react-icons/fi";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement
);

export const SalesChart = ({ data }) => {
    if (!data || !data.totalSales) return null;

    const chartData = {
        labels: ['مبيعات اليوم'],
        datasets: [
            {
                label: 'إجمالي المبيعات (ج.م)',
                data: [data.totalSales],
                backgroundColor: 'rgba(37, 99, 235, 0.6)',
                borderColor: 'rgb(37, 99, 235)',
                borderWidth: 1,
            },
        ],
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-blue-100 shadow-xl mt-3"
        >
            <div className="flex items-center gap-2 mb-4 text-blue-700 font-bold">
                <FiTrendingUp />
                <span>تحليل المبيعات</span>
            </div>
            <div className="h-48">
                <Bar
                    data={chartData}
                    options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } }
                    }}
                />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="bg-blue-50 p-2 rounded-xl">
                    <div className="text-xs text-blue-600">الإجمالي</div>
                    <div className="font-bold text-blue-800">{data.totalSales} ج.م</div>
                </div>
                <div className="bg-emerald-50 p-2 rounded-xl">
                    <div className="text-xs text-emerald-600">العدد</div>
                    <div className="font-bold text-emerald-800">{data.count} عملية</div>
                </div>
            </div>
        </motion.div>
    );
};

export const StockAnalyticsChart = ({ data }) => {
    if (!data || !data.stockItems) return null;

    const chartData = {
        labels: data.stockItems.map(item => item.name).slice(0, 5),
        datasets: [
            {
                data: data.stockItems.map(item => item.quantity).slice(0, 5),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                ],
                borderWidth: 1,
            },
        ],
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-purple-100 shadow-xl mt-3"
        >
            <div className="flex items-center gap-2 mb-4 text-purple-700 font-bold">
                <FiShoppingBag />
                <span>توزيع المخزون (أعلى 5)</span>
            </div>
            <div className="h-48 flex justify-center">
                <Pie data={chartData} options={{ maintainAspectRatio: false }} />
            </div>
        </motion.div>
    );
};

export const SmartActionChips = ({ onAction }) => {
    const actions = [
        { id: 'low_stock', label: 'تحليل النواقص', icon: <FiAlertTriangle />, query: 'عرض النواقص' },
        { id: 'sales', label: 'تقرير المبيعات', icon: <FiTrendingUp />, query: 'تحليل مبيعات اليوم' },
        { id: 'stock', label: 'تحليل المخزون', icon: <FiActivity />, query: 'تحليل المخزون الحالي' },
        { id: 'create', label: 'صنف جديد', icon: <FiPlusCircle />, query: 'عايز أضيف صنف جديد' },
    ];

    return (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1">
            {actions.map((action) => (
                <motion.button
                    key={action.id}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onAction(action.query)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur border border-white/40 rounded-full shadow-sm text-sm font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700 whitespace-nowrap transition-all"
                >
                    {action.icon}
                    {action.label}
                </motion.button>
            ))}
        </div>
    );
};
