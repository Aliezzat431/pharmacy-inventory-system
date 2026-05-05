"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "../components/ToastContext";
import Cookies from "js-cookie";

export default function PayrollPage() {
    const [pin, setPin] = useState("");
    const [isAuthorized, setIsAuthorized] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem("payroll_authorized") === "true";
        }
        return false;
    });
    const [employees, setEmployees] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tempMasterToken, setTempMasterToken] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem("payroll_token");
        }
        return null;
    });
    const { showToast } = useToast();

    useEffect(() => {
        localStorage.setItem("payroll_authorized", isAuthorized);
        if (tempMasterToken) {
            localStorage.setItem("payroll_token", tempMasterToken);
        } else {
            localStorage.removeItem("payroll_token");
        }
    }, [isAuthorized, tempMasterToken]);

    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentReason, setPaymentReason] = useState("");
    const [paymentType, setPaymentType] = useState("salary"); // 'salary', 'incentive', 'withdrawal'
    const [showModal, setShowModal] = useState(false);
    const [editingSalary, setEditingSalary] = useState(null); // { id, name, currentSalary }
    const [newSalaryValue, setNewSalaryValue] = useState("");
    const [showWarning, setShowWarning] = useState(null); // stores the employee object

    useEffect(() => {
        const token = Cookies.get("token");
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split(".")[1]));
                if (payload.role === "master") {
                    setIsAuthorized(true);
                    fetchEmployees();
                    fetchHistory();
                }
            } catch (e) {
                console.error("Token parse error", e);
            }
        }
    }, []);


    const handlePinSubmit = async () => {
        if (!pin) return;
        setLoading(true);
        try {
            const res = await fetch("/api/auth/verify-master-pin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin })
            });
            const data = await res.json();
            console.log(data);

            if (data.success && data.token) {
                setTempMasterToken(data.token);
                setIsAuthorized(true);
                showToast("✅ تم تسجيل الدخول بنجاح", "success");

                // Fetch data immediately after authorization
                // We pass the token directly because state update might be slightly delayed
                fetchEmployees(data.token);
                fetchHistory(data.token);
            } else {
                showToast(data.message || "الرمز السري غير صحيح", "error");
            }
        } catch (error) {
            showToast("حدث خطأ أثناء التحقق", "error");
            console.error(error);
        } finally {
            setLoading(false);
            setPin("");
        }
    };

    const fetchEmployees = async (overrideToken = null) => {
        setLoading(true);
        try {
            const token = overrideToken || tempMasterToken || Cookies.get("token");
            const res = await fetch("/api/employees", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setEmployees(data.employees.filter(emp => emp.role !== "master"));
            }
        } catch (error) {
            showToast("فشل جلب قائمة الموظفين", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSalary = async () => {
        if (!newSalaryValue || isNaN(newSalaryValue) || newSalaryValue < 0) {
            showToast("يرجى إدخال مبلغ صحيح", "error");
            return;
        }

        setLoading(true);
        try {
            const token = tempMasterToken || Cookies.get("token");
            const res = await fetch("/api/employees", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: editingSalary.id,
                    baseSalary: newSalaryValue
                })
            });
            const data = await res.json();

            if (data.success) {
                showToast("✅ تم تحديث المرتب بنجاح", "success");
                setEditingSalary(null);
                fetchEmployees();
            } else {
                showToast(data.message || "فشل تحديث المرتب", "error");
            }
        } catch (error) {
            showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async (overrideToken = null) => {
        try {
            const token = overrideToken || tempMasterToken || Cookies.get("token");
            const res = await fetch("/api/payroll/history", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setHistory(data.transactions);
            }
        } catch (error) {
            console.error("Failed to fetch payroll history", error);
        }
    };

    const isSalaryPaid = (empName) => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        return history.some(t => {
            const tDate = new Date(t.date);
            // Check if it's the same month/year AND the reason contains both 'مرتب' and the employee name
            return tDate.getMonth() === currentMonth &&
                tDate.getFullYear() === currentYear &&
                t.reason.includes("مرتب") &&
                t.reason.includes(empName);
        });
    };


    const handlePaySalary = (emp) => {
        if (isSalaryPaid(emp.name)) {
            setShowWarning(emp);
            return;
        }
        processSalary(emp);
    };

    const processSalary = (emp) => {
        setPaymentType("salary");
        setSelectedEmployee(emp);
        setPaymentAmount(emp.baseSalary || 0);
        const currentMonth = new Intl.DateTimeFormat('ar-EG', { month: 'long' }).format(new Date());
        setPaymentReason(`مرتب شهر ${currentMonth} للموظف: ${emp.name}`);
        setShowModal(true);
        setShowWarning(null);
    };

    const handlePayIncentive = (emp) => {
        setPaymentType("incentive");
        setSelectedEmployee(emp);
        setPaymentAmount("");
        // Make "حافز رمضاني" a default or easy choice
        setPaymentReason("حافز رمضاني");
        setShowModal(true);
    };

    const handleManagerWithdrawal = () => {
        setPaymentType("withdrawal");
        setSelectedEmployee({ name: "المدير (سحب شخصي)", _id: "manager" });
        setPaymentAmount("");
        setPaymentReason("سحب شخصي للمدير");
        setShowModal(true);
    };

    const submitPayment = async () => {
        // Validate paymentAmount only if it's required (not for individual salary or bulk salary)
        if (!paymentAmount && paymentType !== 'salary' && paymentType !== 'bulk_salary') {
            showToast("يرجى إدخال مبلغ صحيح", "error");
            return;
        }
        if (paymentAmount && (isNaN(paymentAmount) || paymentAmount <= 0)) {
            showToast("يرجى إدخال مبلغ صحيح", "error");
            return;
        }

        setLoading(true);
        try {
            const token = tempMasterToken || Cookies.get("token");

            // Bulk handling
            if (paymentType === 'bulk_salary' || paymentType === 'bulk_incentive') {
                const res = await fetch("/api/payroll/bulk-pay", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        type: paymentType === 'bulk_salary' ? 'salary' : 'incentive',
                        amount: paymentAmount, // Will be ignored for bulk_salary on backend
                        reason: paymentReason
                    })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message, "success");
                    setShowModal(false);
                    fetchHistory();
                } else {
                    showToast(data.message, "error");
                }
                return;
            }

            // Individual handling
            const endpoint = paymentType === 'withdrawal' ? "/api/withdrawals" : "/api/payroll/pay";

            // Refine reason to include employee name if not already there
            let finalReason = paymentReason;
            if (paymentType !== 'withdrawal' && selectedEmployee) {
                if (!finalReason.includes(selectedEmployee.name)) {
                    finalReason = `${finalReason} - لـ ${selectedEmployee.name}`;
                }
            }

            const body = paymentType === 'withdrawal'
                ? { amount: paymentAmount, reason: paymentReason }
                : {
                    employeeId: selectedEmployee._id,
                    employeeName: selectedEmployee.name,
                    amount: paymentAmount,
                    reason: finalReason
                };

            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            const data = await res.json();

            if (data.success) {
                showToast("✅ تم تنفيذ العملية بنجاح", "success");
                setShowModal(false);
                fetchHistory();
            } else {
                showToast(data.message || "فشل تنفيذ العملية", "error");
            }
        } catch (error) {
            showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTransaction = async (id) => {
        if (!confirm("هل أنت متأكد من رغبتك في حذف هذه العملية؟ سيؤدي ذلك إلى استرداد المبلغ إلى الخزينة افتراضياً.")) return;

        setLoading(true);
        try {
            const token = tempMasterToken || Cookies.get("token");
            const res = await fetch(`/api/payroll/history?id=${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                showToast("✅ تم حذف العملية بنجاح", "success");
                fetchHistory();
            } else {
                showToast(data.message || "فشل حذف العملية", "error");
            }
        } catch (error) {
            showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
        } finally {
            setLoading(false);
        }
    };

    const getTransactionLabel = (t) => {
        const reason = t.reason || "";
        // "make manager سحب appears as مرتب"
        if (t.transactionType === 'withdrawal') return { text: 'مرتب مدير', color: 'bg-purple-100 text-purple-700' };

        // "and حوافز too"
        if (reason.includes('حافز') || reason.includes('مكافأة')) return { text: 'حوافز', color: 'bg-yellow-100 text-yellow-700' };

        // Specific salary payment
        if (reason.includes('مرتب')) return { text: 'مرتب', color: 'bg-green-100 text-green-700' };

        // Default salary/expense
        return { text: 'مرتب/مصروف', color: 'bg-blue-100 text-blue-700' };
    };

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh]">
                <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 flex flex-col items-center gap-6 w-full max-w-md">
                    <h2 className="text-2xl font-bold text-gray-800">قسم المرتبات (محمي)</h2>
                    <p className="text-gray-500 text-center">فضلاً أدخل الرقم السري للدخول إلى صفحة الموظفين والرواتب</p>
                    <input
                        type="password"
                        placeholder="****"
                        className="w-full p-4 text-center text-3xl border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-all tracking-widest"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
                        autoFocus
                    />
                    <button
                        onClick={handlePinSubmit}
                        disabled={loading}
                        className="w-full p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:shadow-lg transition-all active:scale-95 disabled:opacity-70"
                    >
                        {loading ? "جاري التحقق..." : "دخول"}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 animate-fadeIn">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">إدارة المرتبات</h1>
                    <p className="text-gray-500">تحكم كامل في بيانات الموظفين والمكافآت (محسن جاهز للمساعدة)</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Employees List */}
                <div className="md:col-span-2 bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-xl">
                    <h3 className="text-xl font-bold mb-4">قائمة الموظفين</h3>
                    {loading && employees.length === 0 ? (
                        <p className="text-center py-10">جاري التحميل...</p>
                    ) : employees.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <p className="text-gray-400">لا يوجد موظفين مسجلين حالياً</p>
                            <button className="mt-4 text-blue-600 font-bold">أضف أول موظف</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {employees.map((emp) => (
                                <div key={emp._id} className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-600 font-black text-xl">
                                            {emp.name[0].toUpperCase()}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div>
                                                <h4 className="font-bold text-lg">{emp.name}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-sm text-gray-500">{emp.role}</p>
                                                    {emp.password && (
                                                        <span 
                                                            className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-md border border-red-100 font-mono select-all flex items-center gap-1"
                                                            title="كلمة المرور للمراقبة"
                                                        >
                                                            <span>🔒</span> {emp.password}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {isSalaryPaid(emp.name) && (
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold">تم صرف المرتب</span>
                                                    <button
                                                        onClick={() => {
                                                            setEditingSalary({ id: emp._id, name: emp.name, currentSalary: emp.baseSalary || 0 });
                                                            setNewSalaryValue(emp.baseSalary || 0);
                                                        }}
                                                        className="text-[10px] text-blue-500 hover:underline font-bold"
                                                    >
                                                        (تعديل القيمة للمستقبل)
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-left">
                                            <p className="text-blue-600 font-black text-xl">{emp.baseSalary || 0} ج.م</p>
                                            <button
                                                onClick={() => {
                                                    setEditingSalary({ id: emp._id, name: emp.name, currentSalary: emp.baseSalary || 0 });
                                                    setNewSalaryValue(emp.baseSalary || 0);
                                                }}
                                                className="text-xs text-blue-500 hover:underline font-bold"
                                            >
                                                تعديل الراتب
                                            </button>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => handlePaySalary(emp)}
                                                disabled={!emp.baseSalary || emp.baseSalary <= 0}
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors shadow-sm active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                                            >
                                                صرف مرتب
                                            </button>
                                            <button
                                                onClick={() => handlePayIncentive(emp)}
                                                className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-bold hover:bg-yellow-600 transition-colors shadow-sm active:scale-95 text-xs"
                                            >
                                                صرف حافز/مكافأة
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Stats or Actions could go here */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-2xl text-white shadow-xl flex flex-col justify-between">
                    <div>
                        <h3 className="text-xl font-bold mb-2">إجمالي الرواتب</h3>
                        <p className="text-4xl font-black">
                            {employees.reduce((acc, curr) => acc + (curr.baseSalary || 0), 0)}
                            <span className="text-sm font-normal mr-2">ج.م / شهر</span>
                        </p>
                    </div>
                    <div className="mt-8 p-4 bg-white/10 rounded-xl border border-white/20">
                        <p className="text-sm opacity-80">عدد الموظفين النشطين</p>
                        <p className="text-2xl font-bold">{employees.length} موظف</p>
                    </div>

                    <div className="mt-6 flex flex-col gap-3">
                        <button
                            onClick={() => {
                                setPaymentType("bulk_salary");
                                setSelectedEmployee(null);
                                setPaymentAmount("");
                                setPaymentReason(`مرتبات شهر ${new Intl.DateTimeFormat('ar-EG', { month: 'long' }).format(new Date())}`);
                                setShowModal(true);
                            }}
                            className="w-full p-4 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-all active:scale-95 shadow-lg"
                        >
                            صرف المرتبات للكل ✅
                        </button>
                        <button
                            onClick={() => {
                                setPaymentType("bulk_incentive");
                                setSelectedEmployee(null);
                                setPaymentAmount("");
                                setPaymentReason("حافز رمضاني جماعي");
                                setShowModal(true);
                            }}
                            className="w-full p-4 bg-yellow-500 text-white font-bold rounded-xl hover:bg-yellow-600 transition-all active:scale-95 shadow-lg"
                        >
                            صرف حافز للكل 🎁
                        </button>
                        <button
                            onClick={handleManagerWithdrawal}
                            className="w-full p-4 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-all active:scale-95 shadow-lg"
                        >
                            سحب مدير شخصي 👤
                        </button>
                    </div>
                </div>
            </div>

            {/* Transaction History Section */}
            <div className="mt-8 bg-white/80 backdrop-blur rounded-2xl border border-white/50 shadow-xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">سجل الرواتب والمسحوبات</h3>
                    <button
                        onClick={() => fetchHistory()}
                        className="text-blue-600 text-sm font-bold hover:underline"
                    >
                        تحديث السجل
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-600">التاريخ</th>
                                <th className="p-3 text-sm font-semibold text-gray-600">النوع</th>
                                <th className="p-3 text-sm font-semibold text-gray-600">القيمة</th>
                                <th className="p-3 text-sm font-semibold text-gray-600">التفاصيل</th>
                                <th className="p-3 text-sm font-semibold text-gray-600">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-4 text-center text-gray-400">لا توجد سجلات حديثة</td>
                                </tr>
                            ) : (
                                history.map((t) => {
                                    const label = getTransactionLabel(t);
                                    return (
                                        <tr key={t._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-3 text-sm text-gray-600">
                                                {new Date(t.date).toLocaleDateString('ar-EG')}
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${label.color}`}>
                                                    {label.text}
                                                </span>
                                            </td>
                                            <td className="p-3 font-bold text-gray-800">{t.amount} ج.م</td>
                                            <td className="p-3 text-sm text-gray-500">{t.reason}</td>
                                            <td className="p-3">
                                                <button
                                                    onClick={() => handleDeleteTransaction(t._id)}
                                                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition-all"
                                                    title="حذف العملية"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Already Paid Warning Modal */}
            {showWarning && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-slideUp text-center p-8">
                        <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                            ⚠️
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2">تنبيه: تم الصرف بالفعل</h3>
                        <p className="text-gray-500 mb-8 leading-relaxed">
                            لقد قمت بصرف مرتب <span className="font-bold text-gray-800">{showWarning.name}</span> لهذا الشهر بالفعل.
                            هل تريد الاستمرار على أي حال أو تعديل قيمة المرتب؟
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={() => processSalary(showWarning)}
                                className="w-full p-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg"
                            >
                                نعم، صرف مرة أخرى
                            </button>
                            <button
                                onClick={() => {
                                    setEditingSalary({ id: showWarning._id, name: showWarning.name, currentSalary: showWarning.baseSalary || 0 });
                                    setNewSalaryValue(showWarning.baseSalary || 0);
                                    setShowWarning(null);
                                }}
                                className="w-full p-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all"
                            >
                                تعديل قيمة المرتب
                            </button>
                            <button
                                onClick={() => setShowWarning(null)}
                                className="w-full p-3 text-gray-400 font-bold hover:text-gray-600 transition-all"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Salary Edit Modal */}
            {editingSalary && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slideUp">
                        <div className="p-5 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg">تحديد مرتب: {editingSalary.name}</h3>
                            <button onClick={() => setEditingSalary(null)} className="text-gray-400 text-xl">×</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">الراتب الأساسي (ج.م)</label>
                                <input
                                    type="number"
                                    autoFocus
                                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl text-3xl font-black focus:border-blue-500 outline-none transition-all"
                                    value={newSalaryValue}
                                    onChange={(e) => setNewSalaryValue(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={handleUpdateSalary}
                                disabled={loading}
                                className="w-full p-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
                            >
                                {loading ? "جاري الحفظ..." : "حفظ التعديل"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-800">
                                {paymentType === 'salary' ? 'صرف مرتب' :
                                    paymentType === 'bulk_salary' ? 'صرف مرتبات جماعية' :
                                        paymentType === 'bulk_incentive' ? 'صرف حوافز جماعية' :
                                            paymentType === 'incentive' ? 'صرف حافز/مكافأة' : 'سحب مدير شخصي'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                        </div>
                        <div className="p-6 space-y-4">
                            {selectedEmployee && (
                                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                    <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-xl">
                                        {selectedEmployee.name[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm text-blue-600 font-bold">الموظف</p>
                                        <p className="text-lg font-black text-gray-900">{selectedEmployee.name}</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-600">المبلغ (ج.م)</label>
                                <input
                                    type="number"
                                    className="w-full p-4 text-2xl font-black border-2 border-gray-100 rounded-xl focus:border-blue-500 outline-none transition-all"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-600">السبب / التفاصيل</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {["حافز رمضاني", "مكافأة أداء", "بدل سهر", "سلفة"].map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => setPaymentReason(tag)}
                                            className="text-[10px] px-2 py-1 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 rounded-full transition-colors truncate"
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    className="w-full p-4 border-2 border-gray-100 rounded-xl focus:border-blue-500 outline-none transition-all"
                                    placeholder="مثلاً: مرتب شهر فبراير"
                                    value={paymentReason}
                                    onChange={(e) => setPaymentReason(e.target.value)}
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={submitPayment}
                                    disabled={loading}
                                    className="flex-1 p-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition-all active:scale-95 disabled:opacity-70"
                                >
                                    {loading ? "جاري المعالجة..." : "تأكيد الصرف"}
                                </button>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-6 p-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

