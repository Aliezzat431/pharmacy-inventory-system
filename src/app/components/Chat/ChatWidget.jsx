"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import OpenAI from "openai";
import { useRouter } from "next/navigation";
import {
  FiSend, FiTrash2, FiRefreshCw, FiAlertCircle, FiMessageSquare,
  FiCpu, FiUser, FiClock, FiInfo, FiCheckCircle, FiXCircle,
  FiHome, FiPackage, FiUsers, FiDollarSign, FiBarChart2,
  FiPlusCircle, FiRotateCcw, FiX, FiZap, FiEye, FiSettings,
  FiActivity, FiTrendingUp, FiShoppingCart, FiNavigation,
  FiToggleLeft, FiToggleRight, FiMonitor, FiTerminal,
  FiMaximize2, FiMinimize2
} from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";
import { supabase } from "@/app/lib/supabase";

// ==================== Tools ====================

const tools = [
  { type: "function", function: { name: "search_products", description: "ابحث عن منتجات بالاسم أو الباركود", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } },
  { type: "function", function: { name: "check_low_stock", description: "اعرض المنتجات الناقصة", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_debtors", description: "اعرض المديونيات", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_dashboard", description: "اجلب إحصائيات الداشبورد", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "navigate_to", description: "انتقل إلى صفحة في النظام", parameters: { type: "object", properties: { page: { type: "string", description: "اسم الصفحة: home, stock, invoices, returns, restock, debtors, companies, dashboard, employees, activities, settings" } }, required: ["page"] } } },
  { type: "function", function: { name: "create_product", description: "إضافة منتج جديد", parameters: { type: "object", properties: { name: { type: "string" }, price: { type: "number" }, purchasePrice: { type: "number" }, quantity: { type: "number" }, company: { type: "string" }, barcode: { type: "string" } }, required: ["name", "price", "purchasePrice", "quantity", "company", "barcode"] } } },
  { type: "function", function: { name: "sell_products", description: "تسجيل عملية بيع", parameters: { type: "object", properties: { items: { type: "array", items: { type: "object", properties: { productId: { type: "string" }, productName: { type: "string" }, quantity: { type: "number" }, unit: { type: "string" } } } }, isSadaqah: { type: "boolean" } }, required: ["items"] } } },
  { type: "function", function: { name: "add_to_pos_cart", description: "إضافة منتج إلى الكاشير مباشرًة بالاسم", parameters: { type: "object", properties: { productName: { type: "string" } }, required: ["productName"] } } },
  { type: "function", function: { name: "delete_product", description: "حذف منتج من المخزون أو النظام", parameters: { type: "object", properties: { productName: { type: "string", description: "اسم المنتج الذي يريد المستخدم حذفه" } }, required: ["productName"] } } },
  { type: "function", function: { name: "ask_user", description: "اسأل المستخدم سؤالًا أو قدم له خيارات للاختيار منها قبل المتابعة في المهام المتعددة أو بعد إجراء أمر معين.", parameters: { type: "object", properties: { title: { type: "string" }, message: { type: "string" }, options: { type: "array", items: { type: "string" }, description: "قائمة بالخيارات (مثال: ['نعم', 'لا'])" } }, required: ["title", "message", "options"] } } },
  { type: "function", function: { name: "click_button", description: "الضغط على زر معين بشكل مرئي في الصفحة المفتوحة حالياً.", parameters: { type: "object", properties: { buttonText: { type: "string", description: "النص المكتوب على الزر، مثل 'إضافة منتج' أو 'حفظ'" } }, required: ["buttonText"] } } }
];

const PAGE_MAP = {
  home: "/", stock: "/stock", invoices: "/invoices", returns: "/returns",
  restock: "/restock", debtors: "/debtors", companies: "/companies",
  dashboard: "/dashboard", employees: "/employees", activities: "/activities",
  settings: "/settings", chat: "/chat"
};

// ==================== Tab Helpers ====================

/** Navigate to a tab using the global function exposed by AuthWrapper */
function navigateTab(path) {
  if (typeof window !== "undefined" && window.navigateToTab) {
    window.navigateToTab(path);
  }
}

/**
 * Signal that the AI is actively controlling a tab (shows badge + disables buttons).
 * Call with active=false to release control.
 */
function dispatchAiTabControl(path, active) {
  if (typeof window === "undefined") return;
  window.__aiControlledTab = active ? path : null;
  window.dispatchEvent(new CustomEvent('ai_tab_control', { detail: { path, active } }));
}

/**
 * Poll until window.activeTab matches expectedPath (or timeout).
 * Returns a promise that resolves when the tab is active.
 */
function waitForActiveTab(expectedPath, timeoutMs = 3000) {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve();
    if (window.activeTab === expectedPath) return resolve();
    const start = Date.now();
    const interval = setInterval(() => {
      if (window.activeTab === expectedPath || Date.now() - start > timeoutMs) {
        clearInterval(interval);
        resolve();
      }
    }, 80);
  });
}

/**
 * Poll until the POS page component is mounted and listening.
 */
function waitForPosReady(timeoutMs = 4000) {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve();
    if (window.__posTabReady) return resolve();
    const start = Date.now();
    const interval = setInterval(() => {
      if (window.__posTabReady || Date.now() - start > timeoutMs) {
        clearInterval(interval);
        resolve();
      }
    }, 80);
  });
}

/**
 * Ensure a specific tab is the active one.
 * Navigates if needed then waits for it to become active AND for the
 * POS component to finish mounting (if navigating to home).
 */
async function ensureActiveTab(path) {
  if (typeof window === "undefined") return;
  // Mark this tab as AI-controlled (badge + disabled buttons)
  dispatchAiTabControl(path, true);
  if (window.activeTab !== path) {
    if (path === "/") window.__posTabReady = false;
    navigateTab(path);
    await waitForActiveTab(path);
  }
  if (path === "/") await waitForPosReady();
  await new Promise((r) => setTimeout(r, 300));
}

const systemPromptAgent = `أنت "محسن" 🤖 — وكيل ذكاء اصطناعي متكامل لنظام إدارة الصيدلية.
وضعك الحالي: AGENT MODE — تتحكم تحكم كامل في واجهة المستخدم (UI Controlling) وتدعم إنجاز المهام المتعددة (Multi-tasking).

مهامك وصلاحياتك عبر جميع صفحات النظام المتاحة:
1. الكاشير والبيع (home): إضافة منتجات لسلة الكاشير مباشرة عبر add_to_pos_cart، وتسجيل المبيعات.
2. المخزون (stock): البحث، إضافة منتجات جديدة، وحذف منتجات من المخزون وتعديلها.
3. النواقص والمشتريات (restock): عرض المنتجات الناقصة وتحديد ما يحتاج لشراء.
4. المديونيات (debtors): استعراض العملاء المدينين.
5. الداشبورد (dashboard): جلب الإحصائيات الفورية والمبيعات.
6. صفحات أخرى متاحة للتنقل: الفواتير (invoices)، المرتجعات (returns)، الشركات (companies)، الموظفين (employees)، سجل النشاطات (activities)، والإعدادات (settings).

تعليمات التحكم في الواجهة (UI Controlling) والمهام المتعددة:
- استخدم أداة navigate_to للانتقال إلى الصفحة المطلوبة قبل تنفيذ أي أداة مرئية مثل delete_product أو add_to_pos_cart.
- يرجى دمج واستخدام أكثر من أداة في نفس الرد لإنجاز العمليات المعقدة المتعددة.

مثال للعمليات المتعددة:
المستخدم: "عايز امسح بنادول من المخزون وبعدين روح الكاشير ضيف اسبرين"
الإجراءات (الأدوات) التي ستستدعيها بالترتيب مسلسلة:
1. delete_product({ productName: "بنادول" }) (والتي تتكفل بالانتقال للمخزون وحذفه)
2. add_to_pos_cart({ productName: "اسبرين" }) (والتي تتكفل بالانتقال للكاشير وإضافته)
7. تنبيه هام جداً: إذا ذكر المستخدم عبارة تحتوي ضمناً على كمية ووحدة (مثل: "بيع شريط كذا"، "اضف علبتين كذا")، فهذا يعني صراحةً: 
- "شريط" = (quantity: 1, unit: 'شريط')
- "علبتين" = (quantity: 2, unit: 'علبة')
استنتج الكميات والوحدات من النص مباشرة ونفذ الأداة (مثل sell_products أو add_to_pos_cart) بدون أي أسئلة استيضاحية إضافية! لا تعطل المستخدم بالأسئلة إلا لو كانت المعلومة ناقصة كلياً.

أسلوبك: بنكهة مصرية، سريع، وحاسم. نفذ الأدوات فورا دون تردد.`;

const systemPromptAssistant = `أنت "محسن" 💬 — مساعد ذكي خفيف للصيدلاني.
وضعك الحالي: ASSISTANT MODE — تعمل في الخلفية.

مهامك:
- الإجابة على الأسئلة والاستفسارات
- مساعدة في اتخاذ القرارات
- شرح أي شيء في النظام
- تقديم توصيات بدون تنفيذ مباشر

أسلوبك: ودي، مختصر، مفيد. استخدم markdown للتنظيم.`;

// ==================== Tool Executor ====================

async function executeTool(name, args, router, askUserPrompt) {
  try {
    const token = Cookies.get("token") || "";

    switch (name) {
      case "search_products": {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent('ai_action', { detail: { type: 'GENERIC_SEARCH', query: args.query } }));
        }
        const res = await fetch(`/api/search?q=${encodeURIComponent(args.query)}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        return (data.products || []).map(p => ({
          ...p,
          quantity: typeof p.quantity === 'number' ? Number(p.quantity.toFixed(2)) : p.quantity
        }));
      }
      case "check_low_stock": {
        const res = await fetch("/api/search?mode=shortcomings", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        return (data.products || []).map(p => ({ name: p.name, quantity: p.quantity, unit: p.unit }));
      }
      case "get_debtors": {
        const res = await fetch("/api/debt", { headers: { Authorization: `Bearer ${token}` } });
        return await res.json();
      }
      case "get_dashboard": {
        const res = await fetch("/api/dashboard", { headers: { Authorization: `Bearer ${token}` } });
        return await res.json();
      }
      case "navigate_to": {
        const path = PAGE_MAP[args.page] || "/";
        // Use the tab system — navigate and wait for the tab to become active
        await ensureActiveTab(path);
        return { navigated: true, page: args.page, path };
      }
      case "create_product": {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify([{ name: args.name, price: args.price, salePrice: args.price, purchasePrice: args.purchasePrice, quantity: args.quantity, company: args.company, barcode: args.barcode, type: "دواء عادي برشام" }])
        });
        return await res.json();
      }
      case "sell_products": {
        // Ensure the POS tab is active and rendered
        await ensureActiveTab("/");

        // Per-item slot: 3500 ms is enough for the ADD_TO_CART macro
        // (typing ~1s + 500ms pause + 1000ms panel + 400ms click = ~3s)
        const ITEM_SLOT = 3500;
        let delay = 600;
        args.items.forEach(item => {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('ai_action', {
              detail: {
                type: 'ADD_TO_CART',
                productName: item.productName || item.name,
                quantity: item.quantity,
                unit: item.unit
              }
            }));
          }, delay);
          delay += ITEM_SLOT;
        });

        // After all items are added, click 'دفع كاش' then 'نعم' (confirm dialog)
        setTimeout(() => {
          // Click the pay button — exact text is 'دفع كاش'
          window.dispatchEvent(new CustomEvent('ai_action', { detail: { type: 'GENERIC_CLICK', buttonText: 'دفع كاش' } }));
          // Wait for confirm dialog to open, then click 'نعم'
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('ai_action', { detail: { type: 'GENERIC_CLICK', buttonText: 'نعم' } }));
            // Release AI control after checkout completes
            setTimeout(() => dispatchAiTabControl("/", false), 800);
          }, 2000);
        }, delay + 800); // extra 800 ms buffer after last item

        return { success: true, message: `جاري إضافة عناصر الفاتورة بصرياً ثم إتمام البيع...` };
      }
      case "delete_product": {
        // Ensure stock tab is active before dispatching delete action
        await ensureActiveTab("/stock");

        window.dispatchEvent(new CustomEvent('ai_action', { detail: { type: 'DELETE_PRODUCT', productName: args.productName } }));

        return { success: true, message: `تم الانتقال إلى المخزون وحذف "${args.productName}".` };
      }
      case "click_button": {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent('ai_action', { detail: { type: 'GENERIC_CLICK', buttonText: args.buttonText } }));
        }
        return { success: true, message: `جاري النقر على ${args.buttonText}` };
      }
      case "add_to_pos_cart": {
        // Ensure POS/home tab is active before adding to cart
        await ensureActiveTab("/");

        window.dispatchEvent(new CustomEvent('ai_action', { detail: { type: 'ADD_TO_CART', productName: args.productName } }));

        // Release AI control after macro finishes (~3.5 s)
        setTimeout(() => dispatchAiTabControl("/", false), 4000);

        return { success: true, message: `تم الانتقال إلى الكاشير وإضافة "${args.productName}".` };
      }
      case "ask_user": {
        if (!askUserPrompt) return { error: "askUserPrompt block not provided" };
        const answer = await askUserPrompt(args.title, args.message, args.options);
        return { user_answer: answer };
      }
      default:
        throw new Error(`أداة غير معروفة: ${name}`);
    }
  } catch (error) {
    return { error: error.message };
  }
}

function convertToolsToGemini(tools) {
  return {
    functionDeclarations: tools.map(tool => ({
      name: tool.function.name,
      description: tool.function.description,
      parameters: { type: tool.function.parameters.type || "object", properties: tool.function.parameters.properties || {}, required: tool.function.parameters.required || [] }
    }))
  };
}

// ==================== Quick Action Cards (Agent Mode) ====================

const agentActions = [
  { icon: FiShoppingCart, label: "دفع منتج", color: "from-fuchsia-500 to-pink-500", action: "عايز ادفع بنادول اكسترا" },
  { icon: FiPackage, label: "عرض النواقص", color: "from-orange-500 to-red-500", action: "اعرض المنتجات الناقصة" },
  { icon: FiTrendingUp, label: "تقرير المبيعات", color: "from-emerald-500 to-teal-500", action: "اعطيني تقرير المبيعات" },
  { icon: FiUsers, label: "المديونيات", color: "from-blue-500 to-indigo-500", action: "اعرض المديونيات" },
  { icon: FiBarChart2, label: "الداشبورد", color: "from-cyan-500 to-blue-500", action: "روح للداشبورد" },
  { icon: FiPlusCircle, label: "إضافة منتج", color: "from-green-500 to-emerald-500", action: "عايز أضيف منتج جديد" },
  { icon: FiActivity, label: "سجل النشاط", color: "from-yellow-500 to-orange-500", action: "روح لسجل النشاطات" },
  { icon: FiSettings, label: "الإعدادات", color: "from-slate-500 to-gray-500", action: "روح للإعدادات" },
];

const assistantSuggestions = [
  { icon: "📦", text: "عرض النواقص", action: "عرض النواقص" },
  { icon: "📊", text: "تحليل المخزون", action: "تحليل المخزون" },
  { icon: "⏰", text: "قريبة الانتهاء", action: "المنتجات اللي صلاحيتها قربت" },
  { icon: "💳", text: "المديونيات", action: "عرض المديونيات" },
  { icon: "➕", text: "إضافة منتج", action: "عايز أضيف منتج جديد" },
  { icon: "💰", text: "تقرير المبيعات", action: "عايز تقرير المبيعات" },
];

// ==================== Message Bubble ====================

const MessageBubble = ({ msg, isAgent }) => {
  const formatTime = (ts) => new Date(ts).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.22 }}
      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
    >
      {msg.role === "assistant" && (
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-lg mr-2 shrink-0 mt-1 ${isAgent ? "bg-gradient-to-br from-violet-600 to-purple-700" : "bg-gradient-to-br from-blue-500 to-indigo-600"}`}>
          {isAgent ? <FiZap className="w-4 h-4 text-white" /> : <HiSparkles className="w-4 h-4 text-white" />}
        </div>
      )}
      <div className={`max-w-[85%] md:max-w-[72%] rounded-2xl px-4 py-3 shadow-md ${msg.role === "user"
          ? isAgent
            ? "bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-br-sm"
            : "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-sm"
          : "bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 rounded-bl-sm border border-gray-100 dark:border-gray-700/50"
        }`}>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
        </div>
        <div className="mt-1 text-[10px] opacity-40 text-right">{formatTime(msg.timestamp)}</div>
      </div>
      {msg.role === "user" && (
        <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center ml-2 shrink-0 mt-1">
          <FiUser className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </div>
      )}
    </motion.div>
  );
};

// ==================== Tool Status Badge ====================

const ToolBadge = ({ status }) => (
  <AnimatePresence>
    {status && (
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
        className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 rounded-full text-violet-700 dark:text-violet-300 text-xs font-semibold"
      >
        <FiRefreshCw className="w-3 h-3 animate-spin" />
        {status}
      </motion.div>
    )}
  </AnimatePresence>
);

// ==================== Typing Indicator ====================

const TypingIndicator = ({ isAgent }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start items-end gap-2">
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-lg shrink-0 ${isAgent ? "bg-gradient-to-br from-violet-600 to-purple-700" : "bg-gradient-to-br from-blue-500 to-indigo-600"}`}>
      {isAgent ? <FiZap className="w-4 h-4 text-white" /> : <HiSparkles className="w-4 h-4 text-white" />}
    </div>
    <div className="bg-white/90 dark:bg-gray-800/90 border border-gray-100 dark:border-gray-700/50 rounded-2xl rounded-bl-sm px-4 py-3 shadow-md">
      <div className="flex items-center gap-1.5">
        {[0, 0.2, 0.4].map((delay, i) => (
          <motion.div key={i} animate={{ y: [0, -5, 0] }} transition={{ duration: 0.7, repeat: Infinity, delay }}
            className={`w-2 h-2 rounded-full ${isAgent ? "bg-violet-500" : "bg-blue-500"}`}
          />
        ))}
      </div>
    </div>
  </motion.div>
);

// ==================== Mode Toggle ====================

const ModeToggle = ({ mode, onToggle }) => (
  <div className="flex items-center gap-1 p-1 bg-black/10 dark:bg-white/10 rounded-2xl backdrop-blur-sm">
    <button
      onClick={() => onToggle("agent")}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${mode === "agent"
          ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/30"
          : "text-gray-500 dark:text-gray-400 hover:text-violet-600"
        }`}
    >
      <FiMonitor className="w-3.5 h-3.5" />
      Agent
    </button>
    <button
      onClick={() => onToggle("assistant")}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${mode === "assistant"
          ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
          : "text-gray-500 dark:text-gray-400 hover:text-blue-600"
        }`}
    >
      <FiTerminal className="w-3.5 h-3.5" />
      Assistant
    </button>
  </div>
);

// ==================== Agent Quick Actions Panel ====================

const AgentActionsPanel = ({ onAction, loading }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="w-72 shrink-0 flex flex-col gap-3 p-4 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-gray-700/50 shadow-xl overflow-y-auto"
  >
    <div className="flex items-center gap-2 mb-2">
      <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-purple-700 rounded-xl flex items-center justify-center">
        <FiZap className="w-4 h-4 text-white" />
      </div>
      <div>
        <h3 className="text-sm font-black text-gray-800 dark:text-white">إجراءات سريعة</h3>
        <p className="text-[10px] text-gray-500 dark:text-gray-400">اضغط لتنفيذ فوري</p>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2">
      {agentActions.map((act, i) => (
        <motion.button
          key={i}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => onAction(act.action)}
          disabled={loading}
          className={`relative overflow-hidden flex flex-col items-center gap-2 p-3 rounded-2xl bg-gradient-to-br ${act.color} text-white shadow-md disabled:opacity-50 transition-all`}
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
          <act.icon className="w-5 h-5" />
          <span className="text-[11px] font-bold text-center leading-tight">{act.label}</span>
        </motion.button>
      ))}
    </div>

    {/* System Status */}
    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50">
      <h4 className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">حالة النظام</h4>
      {[
        { label: "المخزون", status: "نشط", color: "bg-emerald-500" },
        { label: "الكاشير", status: "نشط", color: "bg-emerald-500" },
        { label: "التقارير", status: "نشط", color: "bg-emerald-500" },
        { label: "AI Engine", status: "متصل", color: "bg-violet-500" },
      ].map((item, i) => (
        <div key={i} className="flex items-center justify-between py-1">
          <span className="text-xs text-gray-600 dark:text-gray-400">{item.label}</span>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${item.color} animate-pulse`} />
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{item.status}</span>
          </div>
        </div>
      ))}
    </div>
  </motion.div>
);

// ==================== Main Chat Interface ====================

const ChatInterface = ({ mode, messages, loading, isTyping, toolStatus, input, setInput, onSend, onClear, inputRef, bottomRef }) => {
  const isAgent = mode === "agent";

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
        {messages.length === 0 && !loading && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-2xl bg-gradient-to-br ${isAgent ? "from-violet-600 to-purple-700 shadow-violet-500/30" : "from-blue-500 to-indigo-600 shadow-blue-500/30"}`}>
              {isAgent ? <FiZap className="w-10 h-10 text-white" /> : <HiSparkles className="w-10 h-10 text-white" />}
            </div>
            <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2">
              {isAgent ? "🤖 Agent Mode نشط" : "💬 Assistant Mode"}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto mb-8">
              {isAgent
                ? "أنا باتحكم في كل النظام. قولي اعمل إيه وهنفذه فوراً."
                : "أنا هنا أساعدك وأجاوب على كل أسئلتك في الخلفية."
              }
            </p>
            {!isAgent && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-lg mx-auto">
                {assistantSuggestions.map((s, i) => (
                  <motion.button key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    onClick={() => setInput(s.action)}
                    className="p-3 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl transition-all hover:shadow-lg group backdrop-blur-sm"
                  >
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{s.text}</p>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((msg, i) => (
            <MessageBubble key={msg.id || i} msg={msg} isAgent={isAgent} />
          ))}
        </AnimatePresence>

        {isTyping && <TypingIndicator isAgent={isAgent} />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={`shrink-0 border-t ${isAgent ? "border-violet-100 dark:border-violet-900/30" : "border-gray-100 dark:border-gray-700/50"} p-4 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl`}>
        {toolStatus && (
          <div className="mb-2 flex">
            <ToolBadge status={toolStatus} />
          </div>
        )}
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
              placeholder={isAgent ? "اكتب أمرك للنظام..." : "اكتب سؤالك..."}
              rows={1}
              disabled={loading}
              className={`w-full px-4 py-3 rounded-2xl resize-none focus:outline-none transition-all border-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-gray-50 dark:bg-gray-800 ${isAgent
                  ? "border-violet-200 dark:border-violet-800 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  : "border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                }`}
              style={{ minHeight: 52, maxHeight: 120 }}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={onSend}
            disabled={loading || !input.trim()}
            className={`px-5 py-3 rounded-2xl font-bold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 bg-gradient-to-r ${isAgent
                ? "from-violet-600 to-purple-700 shadow-violet-500/30 hover:shadow-violet-500/50"
                : "from-blue-500 to-indigo-600 shadow-blue-500/30 hover:shadow-blue-500/50"
              }`}
          >
            {loading ? <FiRefreshCw className="w-5 h-5 animate-spin" /> : <FiSend className="w-5 h-5" />}
            <span className="hidden sm:inline text-sm">{isAgent ? "تنفيذ" : "إرسال"}</span>
          </motion.button>
        </div>
        <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
          <FiInfo className="w-3 h-3" />
          Enter للإرسال • Shift+Enter لسطر جديد
        </p>
      </div>
    </div>
  );
};

// ==================== Main Page ====================

export default function ChatWidget() {
  const router = useRouter();
  
  const openai = useMemo(() => {
    const key = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!key) return null;
    return new OpenAI({
      apiKey: key,
      baseURL: "https://openrouter.ai/api/v1",
      dangerouslyAllowBrowser: true
    });
  }, []);

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState("agent"); // "agent" | "assistant"
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [askPrompt, setAskPrompt] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const isAgent = mode === "agent";

  const handleAskUser = useCallback((title, message, options) => {
    return new Promise((resolve) => {
      setAskPrompt({ title, message, options, resolve });
    });
  }, []);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  // Load chat history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = Cookies.get("token") || "";
        const res = await fetch("/api/chat", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success) {
          setMessages(data.messages.map(m => ({
            id: m._id || Math.random(),
            role: m.sender === "محسن" ? "assistant" : "user",
            content: m.content,
            timestamp: m.createdAt || new Date().toISOString()
          })));
        }
      } catch (e) { console.error(e); }
    };
    
    fetchHistory();

    if (!supabase) return;

    const channel = supabase
      .channel('chat_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        // Just refetch for simplicity and to ensure order
        fetchHistory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const saveMessage = useCallback(async (role, content) => {
    try {
      const token = Cookies.get("token") || "";
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content, sender: role === "assistant" ? "محسن" : "user" })
      });
    } catch (e) { console.error(e); }
  }, []);

  const sendMessage = useCallback(async (overrideInput) => {
    const text = (overrideInput || input).trim();
    if (!text || loading) return;

    const userMsg = { id: Date.now(), role: "user", content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    saveMessage("user", text);
    setInput("");
    setLoading(true);
    setIsTyping(true);
    setToolStatus(isAgent ? "⚙️ محسن يعالج الأمر..." : "🤔 محسن يفكر...");
    setError(null);

    if (!openai) {
        setError("API Key missing or invalid");
        setLoading(false);
        setIsTyping(false);
        setToolStatus("");
        return;
    }

    try {
      const history = messages.filter(m => m.role !== "system").slice(-10).map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content
      }));

      const systemPrompt = isAgent
        ? `${systemPromptAgent}\n\nتنبيه: أنت تعمل باستخدام OpenAI.\nالمستخدم: ${text}`
        : `${systemPromptAssistant}\n\nالمستخدم: ${text}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: text }
        ],
        tools: tools,
        temperature: 0.2
      });

      const responseMessage = completion.choices[0].message;
      const toolCalls = responseMessage.tool_calls || [];

      if (toolCalls.length > 0) {
        const resultsMessages = [];
        let shouldReturnEarly = false;

        for (const tc of toolCalls) {
          const fnName = tc.function.name;
          const fnArgs = JSON.parse(tc.function.arguments || "{}");

          // Show which tool is running
          const toolLabel = fnName.replace(/_/g, " ");
          setToolStatus(`⚙️ تنفيذ: ${toolLabel}...`);

          // Execute — navigate_to now awaits tab readiness internally,
          // so subsequent tools in the same batch always run on the correct tab.
          const toolResult = await executeTool(fnName, fnArgs, router, handleAskUser);

          resultsMessages.push({
            tool_call_id: tc.id,
            role: "tool",
            name: fnName,
            content: JSON.stringify(toolResult)
          });

          // Only early-exit for pure search results (let navigate_to continue chaining)
          if (fnName === "search_products" && toolResult?.length > 0) {
            const list = toolResult.slice(0, 5).map(p => `• **${p.name}** — ${p.price} ج.م (${p.quantity} ${p.unit})`).join("\n");
            const assistantMsg = {
              id: Date.now() + 1, role: "assistant",
              content: `🔍 لقيت **${toolResult.length}** منتج:\n\n${list}\n\nهل تقصد واحد منهم؟`,
              timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, assistantMsg]);
            saveMessage("assistant", assistantMsg.content);
            setLoading(false); setIsTyping(false); setToolStatus("");
            shouldReturnEarly = true;
            break;
          }
        }

        if (shouldReturnEarly) return;

        const finalCompletion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: text },
            responseMessage,
            ...resultsMessages
          ],
          temperature: 0.2
        });

        const finalText = finalCompletion.choices[0].message.content || "تم تنفيذ الأمر بنجاح.";
        const assistantMsg = { id: Date.now() + 2, role: "assistant", content: finalText, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, assistantMsg]);
        saveMessage("assistant", finalText);
      } else {
        const txt = responseMessage.content || "لا يمكنني الإجابة حالياً.";
        const assistantMsg = { id: Date.now() + 1, role: "assistant", content: txt, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, assistantMsg]);
        saveMessage("assistant", txt);
      }
    } catch (err) {
      console.error(err);
      const errorMsg = { id: Date.now(), role: "assistant", content: "❌ عذراً، حصل خطأ في الاتصال بـ OpenAI. تأكد من صحة المفتاح.", timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, errorMsg]);
      setError("فشل في إرسال الرسالة");
    } finally {
      setLoading(false);
      setIsTyping(false);
      setToolStatus("");
      // Safety: release control for non-POS tabs (POS clears itself via its own setTimeout)
      if (window.__aiControlledTab && window.__aiControlledTab !== "/") {
        dispatchAiTabControl(window.__aiControlledTab, false);
      }
    }
  }, [input, loading, messages, isAgent, saveMessage, router, openai]);

  const handleClearChat = useCallback(async () => {
    if (!window.confirm("هل أنت متأكد من مسح سجل المحادثة؟")) return;
    try {
      const token = Cookies.get("token") || "";
      const res = await fetch("/api/chat", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setMessages([]);
    } catch (e) { console.error(e); }
  }, []);

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setMessages([]);
    setInput("");
    setError(null);
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 left-6 z-50 flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-full shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 transition-all border border-blue-400"
          >
            <HiSparkles className="w-7 h-7" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(isAgent) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-30 shadow-[inset_0_0_120px_rgba(59,130,246,0.15)] border-[2px] border-blue-400/20 mix-blend-screen transition-all duration-1000"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-40 shadow-[inset_0_0_150px_rgba(59,130,246,0.3)] border-4 border-blue-500/50 mix-blend-screen"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`fixed bottom-6 left-6 z-[60] w-[400px] h-[600px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-3rem)] shadow-2xl rounded-3xl flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 border border-gray-200 dark:border-gray-800 transition-all duration-500 ${loading || toolStatus ? "shadow-[0_0_50px_rgba(59,130,246,0.5)] border-blue-500 ring-2 ring-blue-500" : ""}`}
          >

            {/* ===== HEADER ===== */}
            <motion.header
              initial={{ y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`shrink-0 flex items-center justify-between px-5 py-3 border-b backdrop-blur-xl transition-all duration-500 ${isAgent
                  ? "bg-gradient-to-r from-violet-600/10 to-purple-600/5 border-violet-200/50 dark:border-violet-800/30"
                  : "bg-white/70 dark:bg-gray-900/70 border-gray-100/80 dark:border-gray-800/50"
                }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 bg-gradient-to-br ${isAgent ? "from-violet-600 to-purple-700 shadow-violet-500/30" : "from-blue-500 to-indigo-600 shadow-blue-500/20"}`}>
                  {isAgent ? <FiZap className="w-5 h-5 text-white" /> : <HiSparkles className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <h1 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                    محسن
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${isAgent ? "bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300" : "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"}`}>
                      {isAgent ? "AGENT" : "ASSISTANT"}
                    </span>
                  </h1>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <FiCpu className="w-3 h-3" />
                    {isAgent ? "يتحكم في النظام كاملاً" : "مساعد ذكي في الخلفية"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ToolBadge status={toolStatus} />
                <ModeToggle mode={mode} onToggle={handleModeSwitch} />
                <button onClick={() => setIsOpen(false)} title="إغلاق Copilot" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors">
                  <FiMinimize2 className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={handleClearChat} title="مسح المحادثة"
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors group">
                  <FiTrash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                </button>
              </div>
            </motion.header>

            {/* ===== ERROR BANNER ===== */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="shrink-0 flex items-center gap-3 px-5 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-sm"
                >
                  <FiAlertCircle className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button onClick={() => setError(null)}><FiX className="w-4 h-4" /></button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ===== BODY ===== */}
            <div className="flex-1 flex min-h-0 overflow-hidden">

              {/* --- Agent Side Panel --- */}
              <AnimatePresence>
                {isAgent && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 288, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    className="shrink-0 overflow-hidden"
                  >
                    <div className="w-72 h-full p-3 overflow-y-auto">
                      <AgentActionsPanel onAction={(a) => { setInput(a); setTimeout(() => sendMessage(a), 80); }} loading={loading} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* --- Chat Area --- */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Mode info strip */}
                <motion.div
                  key={mode}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`shrink-0 px-5 py-2 text-[11px] font-semibold flex items-center gap-2 border-b ${isAgent
                      ? "bg-violet-50/80 dark:bg-violet-950/30 border-violet-100 dark:border-violet-900/30 text-violet-600 dark:text-violet-400"
                      : "bg-blue-50/80 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400"
                    }`}
                >
                  {isAgent ? (
                    <><FiZap className="w-3.5 h-3.5" /> <span>وضع الوكيل — محسن يتحكم في النظام ويمكنه التنقل والتنفيذ تلقائياً</span></>
                  ) : (
                    <><HiSparkles className="w-3.5 h-3.5" /> <span>وضع المساعد — محسن يعمل في الخلفية ويجيب على الأسئلة بدون تنفيذ عمليات</span></>
                  )}
                </motion.div>

                <ChatInterface
                  mode={mode}
                  messages={messages}
                  loading={loading}
                  isTyping={isTyping}
                  toolStatus={toolStatus}
                  input={input}
                  setInput={setInput}
                  onSend={() => sendMessage()}
                  onClear={handleClearChat}
                  inputRef={inputRef}
                  bottomRef={bottomRef}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {askPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center gap-3 mb-4 text-violet-600 dark:text-violet-400">
                <FiAlertCircle className="w-6 h-6" />
                <h3 className="text-lg font-black">{askPrompt.title}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{askPrompt.message}</p>
              <div className="grid gap-2">
                {askPrompt.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      askPrompt.resolve(opt);
                      setAskPrompt(null);
                    }}
                    className="w-full p-3 rounded-xl font-bold bg-violet-50 text-violet-700 hover:bg-violet-600 hover:text-white dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-violet-600 dark:hover:text-white transition-colors"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}