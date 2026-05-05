"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { checkAuth } from "@/lib/redux/slices/authSlice";
import { X, Plus, Zap, RotateCcw } from "lucide-react";
import Login from "./login";
import Sidebar from "./sidebar";
import GlobalLoader from "./GlobalLoader";
import dynamic from "next/dynamic";

const TABS = {
  "/": dynamic(() => import("@/app/page")),
  "/stock": dynamic(() => import("@/app/stock/page")),
  "/returns": dynamic(() => import("@/app/returns/page")),
  "/invoices": dynamic(() => import("@/app/invoices/page")),
  "/restock": dynamic(() => import("@/app/restock/page")),
  "/debtors": dynamic(() => import("@/app/debtors/page")),
  "/companies": dynamic(() => import("@/app/companies/page")),
  "/chat": dynamic(() => import("@/app/chat/page")),
  "/inventory-report": dynamic(() => import("@/app/inventory-report/page")),
  "/dashboard": dynamic(() => import("@/app/dashboard/page")),
  "/activities": dynamic(() => import("@/app/activities/page")),
  "/sessions": dynamic(() => import("@/app/sessions/page")),
  "/settings": dynamic(() => import("@/app/settings/page")),
  "/documentation": dynamic(() => import("@/app/documentation/page")),
  "/payroll": dynamic(() => import("@/app/payroll/page")),
  "/new-tab": dynamic(() => import("@/app/new-tab/page"))
};

const PAGE_LABELS = {
  "/": "كاشير المبيعات",
  "/stock": "إدارة المخزون",
  "/returns": "مرتجع مبيعات",
  "/invoices": "الفواتير",
  "/restock": "إضافة رصيد",
  "/debtors": "حسابات العملاء",
  "/companies": "الموردين",
  "/chat": "شات الذكاء الاصطناعي",
  "/inventory-report": "النواقص والانتهاء",
  "/dashboard": "تقارير الأرباح",
  "/activities": "سجل النشاطات",
  "/settings": "الإعدادات",
  "/documentation": "دليل الإستخدام",
"/payroll": "المرتبات",
  "/new-tab": "علامة تبويب جديدة"
};

// -------------- Global Macro Runner (Magic UI) --------------
const GlobalMacroRunner = () => {
  const [ghostCursor, setGhostCursor] = useState({ visible: false, x: 0, y: 0, text: "" });
  const [aiActive, setAiActive] = useState(false);

  useEffect(() => {
    const handleAiAction = (e) => {
      const type = e.detail?.type;

      const triggerMagic = (targetEl, label, onArrive) => {
        if (!targetEl) return;
        setAiActive(true);
        const rect = targetEl.getBoundingClientRect();
        
        // Start from bottom right (near chat widget) if not already visible
        setGhostCursor(prev => ({
          visible: true,
          x: prev.visible ? prev.x : window.innerWidth - 80,
          y: prev.visible ? prev.y : window.innerHeight - 80,
          text: label,
        }));

        // Move to target
        setTimeout(() => {
          setGhostCursor({ visible: true, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, text: label });
          
          // Arrive
          setTimeout(() => {
            // Ripple/Aura on target
            targetEl.classList.add("ring-4", "ring-violet-500", "shadow-[0_0_30px_theme('colors.violet.500')]", "scale-95", "transition-all", "relative", "z-50");
            
            // Execute action
            onArrive(targetEl);

            // Clean up
            setTimeout(() => {
              targetEl.classList.remove("ring-4", "ring-violet-500", "shadow-[0_0_30px_theme('colors.violet.500')]", "scale-95", "z-50");
              setGhostCursor(prev => ({ ...prev, visible: false }));
              setAiActive(false);
            }, 1500);
          }, 800); // travel time
        }, 50);
      };

      if (type === 'GENERIC_SEARCH' || type === 'SEARCH') {
        const query = e.detail.query;
        const inputs = Array.from(document.querySelectorAll("input"));
        const targetInput = inputs.find(i => {
           const r = i.getBoundingClientRect();
           return r.width > 0 && r.height > 0 && (i.placeholder.includes("بحث") || i.id.includes("search"));
        });
        
        triggerMagic(targetInput, "جاري البحث...", (el) => {
          let currentText = "";
          let idx = 0;
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          const typeNext = () => {
            if (idx >= query.length) return;
            currentText += query[idx];
            nativeSetter.call(el, currentText);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            idx++;
            setTimeout(typeNext, 60);
          };
          typeNext();
        });
      }

      if (type === 'GENERIC_CLICK') {
        const btnText = (e.detail.buttonText || "").toLowerCase();
        const buttons = Array.from(document.querySelectorAll("button, [role='button']"));
        const targetBtn = buttons.find(b => {
           const r = b.getBoundingClientRect();
           return r.width > 0 && r.height > 0 && r.top >= 0 && b.textContent?.toLowerCase().includes(btnText);
        });

        triggerMagic(targetBtn, `جاري الضغط...`, (el) => {
          el.click();
        });
      }
    };

    window.addEventListener('ai_action', handleAiAction);
    return () => window.removeEventListener('ai_action', handleAiAction);
  }, []);

  return (
    <>
      {/* Ghost AI Cursor */}
      <div 
        className={`fixed z-[9999] pointer-events-none flex flex-col items-center gap-2 transition-all duration-700 ease-out`}
        style={{
          left: ghostCursor.x,
          top: ghostCursor.y,
          opacity: ghostCursor.visible ? 1 : 0,
          transform: `translate(-50%, -50%) scale(${ghostCursor.visible ? 1 : 0.5})`
        }}
      >
        <div className="relative">
          {/* Pulsing Aura */}
          <div className="absolute -inset-4 bg-violet-500/30 rounded-full blur-xl animate-pulse"></div>
          {/* Custom Cursor Icon */}
          <div className="w-8 h-8 rounded-full premium-gradient shadow-2xl flex items-center justify-center border-2 border-white">
             <span className="text-white text-xs font-black">AI</span>
          </div>
        </div>
        <div className="bg-foreground text-background text-[10px] font-black px-3 py-1 rounded-full shadow-lg whitespace-nowrap opacity-90">
          {ghostCursor.text}
        </div>
      </div>

      {/* Screen Edge Aura when AI is active */}
      <div className={`fixed inset-0 pointer-events-none z-[9998] transition-opacity duration-1000 ${aiActive ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(139,92,246,0.15)] mix-blend-screen" />
      </div>
    </>
  );
};
// ------------------------------------------------

const AuthWrapper = ({ children }) => {
  const dispatch = useDispatch();
  const { isAuthenticated, loading } = useSelector((state) => state.auth);
  
  const [openedTabs, setOpenedTabs] = useState(["/"]);
  const [activeTab, setActiveTab] = useState("/");
  const [isClient, setIsClient] = useState(false);
  // Per-tab generation counter — incrementing forces the component to fully remount
  const [tabKeys, setTabKeys] = useState({});

  const resetTab = (e, path) => {
    e.stopPropagation();
    e.preventDefault();

    // 1. Remount the component — wipes all local React state
    setTabKeys((prev) => ({ ...prev, [path]: (prev[path] || 0) + 1 }));

    // 2. Clear AI control badge + re-enable page buttons
    setAiControlledTab(null);

    // 3. Clean up window globals used by the AI agent
    if (typeof window !== "undefined") {
      window.__aiControlledTab = null;
      window.__posTabReady = false;          // force re-wait on next navigation
      window.dispatchEvent(
        new CustomEvent("ai_tab_control", { detail: { path, active: false } })
      );
    }
  };
  const [aiControlledTab, setAiControlledTab] = useState(null);

  // Listen for AI tab-control events
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.active) {
        setAiControlledTab(e.detail.path);
      } else {
        setAiControlledTab(null);
      }
    };
    window.addEventListener('ai_tab_control', handler);
    return () => window.removeEventListener('ai_tab_control', handler);
  }, []);

  useEffect(() => {
    dispatch(checkAuth());
    setIsClient(true);
    
    try {
      const savedTabs = JSON.parse(localStorage.getItem("openedTabs") || '["/"]');
      const savedActive = localStorage.getItem("activeTab") || "/";
      setOpenedTabs(Array.isArray(savedTabs) && savedTabs.length ? savedTabs : ["/"]);
      setActiveTab(savedActive);
    } catch (e) {
      console.error("Failed to load tabs state from localStorage", e);
    }
  }, [dispatch]);

  // Sync state to local storage when it changes
  useEffect(() => {
    if (!isClient) return;
    localStorage.setItem("openedTabs", JSON.stringify(openedTabs));
    localStorage.setItem("activeTab", activeTab);
    
    // Attempt to keep URL at /
    if (window.location.pathname !== "/") {
      window.history.replaceState(null, '', '/');
    }
    window.activeTab = activeTab;
  }, [openedTabs, activeTab, isClient]);

  // Expose global nav for AI macros
  useEffect(() => {
    window.navigateToTab = (path) => {
      setOpenedTabs((prev) => {
        if (!prev.includes(path)) return [...prev, path];
        return prev;
      });
      setActiveTab(path);
    };
  }, []);

  const handleNavigate = (path) => {
    setOpenedTabs((prev) => {
      if (!prev.includes(path)) return [...prev, path];
      return prev;
    });
    setActiveTab(path);
  };

  const closeTab = (e, path) => {
    e.stopPropagation();
    e.preventDefault();
    setOpenedTabs((prev) => {
      const newTabs = prev.filter((t) => t !== path);
      if (activeTab === path) {
        const lastTab = newTabs[newTabs.length - 1];
        setActiveTab(lastTab || "/");
      }
      if (newTabs.length === 0) return ["/"];
      return newTabs;
    });
  };

  // 🔹 Loading state
  if (loading) {
    return <GlobalLoader />;
  }

  // 🔹 Not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  // 🔹 Authenticated
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <GlobalMacroRunner />
      <Sidebar activeTab={activeTab} onNavigate={handleNavigate} />

      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* Main Tabs Bar */}
        {openedTabs.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto bg-black/5 dark:bg-white/5 border-b border-border/50 px-4 pt-2 hide-scrollbar shrink-0">
            {openedTabs.map((path) => {
              const isActive = activeTab === path;
              return (
                <div
                  key={path}
                  onClick={() => setActiveTab(path)}
                  className={`group relative flex items-center gap-3 px-4 py-2 min-w-[120px] max-w-[200px] cursor-pointer rounded-t-2xl transition-all duration-300 select-none ${
                    isActive
                      ? "bg-background text-primary shadow-[0_-4px_10px_rgba(0,0,0,0.05)] font-black border-x border-t border-border/50 z-10 before:absolute before:-bottom-px before:left-0 before:right-0 before:h-px before:bg-background"
                      : "text-muted-foreground font-semibold hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-border/50 hover:text-foreground"
                  } ${aiControlledTab === path ? "ring-2 ring-violet-500/70 shadow-[0_0_12px_rgba(139,92,246,0.4)]" : ""}`}
                >
                  <span className="truncate flex-1 text-sm">{PAGE_LABELS[path] || "نافذة"}</span>

                  {/* AI control badge */}
                  {aiControlledTab === path && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-600 text-white text-[9px] font-black animate-pulse shrink-0">
                      <Zap className="w-2.5 h-2.5" />
                      AI
                    </span>
                  )}

                  {/* Reset tab state button — only visible on active tab */}
                  {isActive && (
                    <div
                      onClick={(e) => resetTab(e, path)}
                      title="تصفير الصفحة"
                      className="flex items-center justify-center rounded-full p-1 opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-blue-500 hover:text-white transition-all"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </div>
                  )}

                  <div
                    onClick={(e) => closeTab(e, path)}
                    className={`flex items-center justify-center rounded-full p-1 opacity-60 hover:opacity-100 hover:bg-red-500 hover:text-white transition-all ${
                      openedTabs.length === 1 && path !== "/new-tab" ? "hidden" : ""
                    }`}
                  >
                    <X className="h-3 w-3" />
                  </div>
                </div>
              );
            })}
            
            <button
              onClick={() => handleNavigate("/new-tab")}
              className="flex items-center justify-center h-8 w-8 ml-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all shrink-0"
              title="علامة تبويب جديدة"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 relative bg-background">
          {Object.keys(TABS).map((path) => {
            if (!openedTabs.includes(path)) return null;
            const Component = TABS[path];
            // Changing the key forces React to fully unmount + remount the component,
            // wiping all local state — this is triggered by the reset button.
            const componentKey = `${path}-${tabKeys[path] || 0}`;
            return (
              <div
                key={path}
                style={{ display: activeTab === path ? "block" : "none" }}
                className="h-full"
              >
                <Component key={componentKey} />
              </div>
            );
          })}
        </div>

        <footer className="text-center text-xs opacity-50 py-2 border-t border-[var(--glass-border)] shrink-0">
          جميع الحقوق محفوظة © 2025 Smart Pharma
        </footer>
      </main>
    </div>
  );
};

export default AuthWrapper;
