"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import DebtModal from "./components/debtModal";
import ProductsTable from "./components/productsTable";
import BarcodeScanner from "./components/BarcodeScanner";
import ProductSelectDialog from "./components/productSelectDialog";
import { useProducts } from "./hooks/useProducts";
import { useCheckout } from "./hooks/useCheckout";
import CustomDialog from "./components/common/CustomDialog";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ShoppingCart,
  Wallet,
  Heart,
  PlusCircle,
  Trash2,
  Calculator,
  Receipt,
  Search,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMultiplier } from "@/app/lib/unitOptions";
import { supabase } from "@/app/lib/supabase";

const CheckoutPage = () => {
  const { products, setProducts, decreaseStock, restoreStock } = useProducts();
  const { items, setItems, addItem, removeItem, clearCart } = useCheckout();

  const total = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.total ?? item.price * item.quantity), 0);
  }, [items]);

  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [pharmacyInfo, setPharmacyInfo] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [tempQuantity, setTempQuantity] = useState(1);
  const [tempUnit, setTempUnit] = useState("علبة");
  const [tempExpiry, setTempExpiry] = useState("");
  const [tempPillsPerStrip, setTempPillsPerStrip] = useState(10);
  const [variants, setVariants] = useState([]);
  const [tempSelections, setTempSelections] = useState({});

  const [showDebt, setShowDebt] = useState(false);
  const [barcodeNotFound, setBarcodeNotFound] = useState(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [isPendingSadaqah, setIsPendingSadaqah] = useState(false);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState("cash");
  const [settingsOptions, setSettingsOptions] = useState({ showCheckoutConfirm: true });

  const [aiMacro, setAiMacro] = useState(null);

  useEffect(() => {
    const info = localStorage.getItem("pharmacy-info");
    if (info) setPharmacyInfo(JSON.parse(info));

    const options = localStorage.getItem("settings-options");
    if (options) setSettingsOptions(JSON.parse(options));
  }, []);

  // AI action listener — replay any events that arrived before this tab was mounted
  useEffect(() => {
    // Signal the chat widget that the POS tab is mounted and listening
    window.__posTabReady = true;

    const handleAiAction = (e) => {
      if (e.detail?.type === 'ADD_TO_CART') {
        const { productName, quantity, unit } = e.detail;
        const q = (productName || "").toLowerCase();

        const matches = products.filter(
          (p) =>
            (p.name || "").toLowerCase().includes(q) ||
            (p.barcode && p.barcode.toString().includes(q))
        );

        if (matches.length > 0) {
          setShowSearch(true);
          setAiMacro({ productName, quantity, unit, matches });
        } else {
          toast.error(`عذراً، لم يتم العثور على المنتج: ${productName} ❌`);
        }
      }
    };

    window.addEventListener('ai_action', handleAiAction);

    // Replay any queued events that arrived before mount
    if (Array.isArray(window.__pendingAiActions)) {
      window.__pendingAiActions.forEach(evt => handleAiAction(evt));
      window.__pendingAiActions = [];
    }

    return () => {
      window.__posTabReady = false;
      window.removeEventListener('ai_action', handleAiAction);
    };
  }, [products, addItem, decreaseStock]);

  const resetSelection = () => {
    setSelectedProduct(null);
    setTempQuantity(1);
    setTempUnit("علبة");
    setTempExpiry("");
    setTempPillsPerStrip(10);
    setVariants([]);
  };

 const handleAddProduct = () => {
  if (!selectedProduct) return;

  // =========================
  // UNIT MULTIPLIER
  // =========================
  const multiplier = getMultiplier(
    selectedProduct,
    tempUnit,
    tempPillsPerStrip
  );

  // =========================
  // PRICE
  // =========================
  const price = Number(selectedProduct.price || 0) / multiplier;

  // =========================
  // QUANTITY REQUESTED
  // =========================
  const qty = Number(tempQuantity || 0);

  if (qty <= 0) {
    toast.error("أدخل كمية صحيحة ❌");
    return;
  }

  // =========================
  // CONVERT TO BOXES
  // =========================
  // Example:
  // 1 strip from 10 strips/box
  // = 0.1 box
  const soldInBoxes = qty / multiplier;

  // =========================
  // AVAILABLE STOCK
  // =========================
  // IMPORTANT:
  // quantity in DB is stored in BOXES
  const availableBoxes = Number(selectedProduct.quantity || 0);

  // =========================
  // VALIDATION
  // =========================
  if (soldInBoxes > availableBoxes) {

    // convert available stock to selected unit
    const availableInSelectedUnit =
      availableBoxes * multiplier;

    toast.error(
      `الكمية المطلوبة (${qty} ${tempUnit}) أكبر من المتوفرة (${Number(
        availableInSelectedUnit.toFixed(2)
      )} ${tempUnit}) ❌`
    );

    return;
  }

  // =========================
  // REMAINING STOCK
  // =========================
  const remaining = Number(
    Math.max(0, availableBoxes - soldInBoxes).toFixed(4)
  );

  // =========================
  // CREATE CART ITEM
  // =========================
  const newItem = {
    name: selectedProduct.name,

    _id:
      selectedProduct._id ||
      selectedProduct.id,

    productId:
      selectedProduct.productId ||
      selectedProduct._id ||
      selectedProduct.id,

    batchId:
      selectedProduct.batchId || null,

    barcode:
      selectedProduct.barcode || null,

    price,

    quantity: qty,

    unit: tempUnit,

    total: Number((price * qty).toFixed(2)),

    expiry: tempExpiry
      ? new Date(tempExpiry).toISOString()
      : null,

    unitOptions:
      selectedProduct.unitOptions || [
        selectedProduct.unit,
      ],

    fullProduct: selectedProduct,

    remaining,

    pillsPerStrip: tempPillsPerStrip,
  };

  // =========================
  // ADD TO CART
  // =========================
  addItem(newItem);

  // =========================
  // UPDATE LOCAL STOCK
  // =========================
  decreaseStock(
    selectedProduct,
    soldInBoxes
  );

  // =========================
  // RESET
  // =========================
  resetSelection();

  setShowSearch(false);

  toast.success(
    `تم إضافة ${qty} ${tempUnit} من ${selectedProduct.name} ✅`
  );
};

  const handleScan = useCallback((scanned) => {
    // Match by batch barcode (flattened field in search results)
    const matchingVariants = products.filter(
      (p) => p.barcode?.toString() === scanned
    );

    if (matchingVariants.length === 0) {
      setBarcodeNotFound(scanned);
      return;
    }

    const earliest = [...matchingVariants].sort((a, b) => {
      const dateA = a.expiryDate ? new Date(a.expiryDate) : new Date(8640000000000000);
      const dateB = b.expiryDate ? new Date(b.expiryDate) : new Date(8640000000000000);
      return dateA - dateB;
    })[0];

    const tUnit = earliest.unitOptions?.[0] || earliest.unit || "علبة";
    const multiplier = getMultiplier(earliest, tUnit);
    const price = earliest.price / multiplier;

    const qty = 1;
    const soldInBoxes = qty / multiplier;
    const originalQty = Number(earliest.quantity || 0);
    const remaining = Math.max(0, originalQty - soldInBoxes);

    const newItem = {
      name: earliest.name,
      _id: earliest._id,
      batchId: earliest.batchId,         // batch subdoc id for stock tracking
      barcode: earliest.barcode,         // batch barcode for checkout API
      price,
      quantity: qty,
      unit: tUnit,
      total: price * qty,
      expiry: earliest.expiryDate ? new Date(earliest.expiryDate).toISOString() : null,
      unitOptions: earliest.unitOptions || [earliest.unit],
      fullProduct: earliest,
      remaining,
    };

    addItem(newItem);
    decreaseStock(earliest, soldInBoxes);
  }, [products, addItem, decreaseStock]);

  const handleDeleteItem = (index) => {
    const removedItem = removeItem(index);
    if (removedItem) {
      const { batchId, expiry, unit, fullProduct, quantity } = removedItem;
      const multiplier = getMultiplier(fullProduct, unit);
      let restoreQty = quantity / multiplier;

      // restoreStock now matches by batchId
      restoreStock(batchId, expiry, unit, restoreQty);
    }
  };

  const handleCheckoutClick = (isSadaqah, paymentMethod = "cash") => {
    setPendingPaymentMethod(paymentMethod);
    if (settingsOptions.showCheckoutConfirm) {
      setIsPendingSadaqah(isSadaqah);
      setShowConfirm(true);
    } else {
      handleCheckout(isSadaqah, paymentMethod);
    }
  };

  const handleCheckout = async (isSadaqah = false, paymentMethod = "cash") => {
    try {
      const token = Cookies.get("token");
      const response = await axios.post(
        "/api/checkout",
        { items, isSadaqah, paymentMethod },
        {
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: () => true,
        }
      );

      if (response.status !== 201) {
        toast.error(
          response.data?.error ||
          response.data?.message ||
          `فشل الدفع (رمز الحالة: ${response.status}) ❌`
        );
        return;
      }

      const methodLabel = paymentMethod === "tablet" ? "(تابلت)" : "(كاش)";
      toast.success(`تمت عملية البيع بنجاح ${methodLabel} ✅`);
      clearCart();

    } catch (error) {
      console.error("Checkout error:", error);
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "حدث خطأ أثناء الدفع ❌";
      toast.error(message);
    }
  };

  useEffect(() => {
    if (showSearch) {
      setSearchResults(products);

      const grouped = products.reduce((acc, product) => {
        if (!acc[product.name]) acc[product.name] = [];
        acc[product.name].push(product);
        return acc;
      }, {});

      const defaultSelections = {};
      for (const [name, variants] of Object.entries(grouped)) {
        const earliest = [...variants].sort(
          (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)
        )[0];
        defaultSelections[name] = {
          unit: earliest.unitOptions?.[0] || earliest.unit || "علبة",
          expiry: earliest.expiryDate || "",
          product: earliest,
        };
      }
      setTempSelections(defaultSelections);
    }
  }, [showSearch, products]);

  useEffect(() => {
    // Only auto-select from variants during MANUAL interaction.
    // During AI macro, the macro itself sets unit/quantity -- skip to avoid overwriting.
    if (variants.length > 0 && !aiMacro) {
      const earliest = [...variants].sort(
        (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)
      )[0];
      setSelectedProduct(earliest);
      setTempExpiry(earliest.expiryDate);
      setTempUnit(earliest.unitOptions?.[0] || earliest.unit || "علبة");
      setTempQuantity(1);
    }
  }, [variants, aiMacro]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" dir="rtl">
      <BarcodeScanner onScan={handleScan} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
        {/* Left Column: Table */}
        <div className="lg:col-span-2">
          <ProductsTable
            items={items}
            setItems={setItems}
            setShowSearch={setShowSearch}
            onDelete={handleDeleteItem}
          />
        </div>

        {/* Right Column: Checkout Sidebar */}
        <div className="space-y-6">
          <Card className="glass-morphism border-none shadow-2xl p-8 rounded-[32px] overflow-hidden relative group">
            <div className="absolute top-0 left-0 right-0 h-1 premium-gradient opacity-50 group-hover:opacity-100 transition-opacity" />

            <div className="flex flex-col items-center gap-4 mb-8">
              <div className="p-4 rounded-3xl bg-primary/10 border border-primary/20">
                <Calculator className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <h2 className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">
                  Total Amount
                </h2>
                <div className="text-5xl font-black text-primary tracking-tighter flex items-center justify-center gap-2">
                  {total.toFixed(2)}
                  <span className="text-xl font-bold opacity-70">ج.م</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Button
                disabled={items.length === 0}
                onClick={() => handleCheckoutClick(false, "cash")}
                className="w-full h-16 rounded-2xl premium-gradient text-white text-xl font-black tracking-widest uppercase shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all group"
              >
                <Wallet className="ml-3 h-6 w-6 group-hover:rotate-12 transition-transform" />
                دفع كاش
              </Button>

              <Button
                disabled={items.length === 0}
                onClick={() => handleCheckoutClick(true, "cash")}
                className="w-full h-16 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white text-xl font-black tracking-widest uppercase shadow-xl shadow-violet-500/20 hover:scale-[1.02] active:scale-95 transition-all group"
              >
                <Heart className="ml-3 h-6 w-6 group-hover:scale-125 transition-transform fill-white" />
                تبرع / صدقة
              </Button>

              <div className="pt-2">
                <Button
                  variant="outline"
                  disabled={items.length === 0}
                  onClick={() => setShowDebt(true)}
                  className="w-full h-14 rounded-2xl border-2 border-primary/20 text-primary hover:bg-primary/5 text-lg font-black tracking-widest uppercase transition-all"
                >
                  <PlusCircle className="ml-3 h-5 w-5" />
                  إضافة دين
                </Button>
              </div>

              <Button
                variant="ghost"
                disabled={items.length === 0}
                onClick={clearCart}
                className="w-full h-12 rounded-2xl text-destructive hover:bg-destructive/10 font-bold transition-all"
              >
                <Trash2 className="ml-2 h-4 w-4" />
                مسح السلة
              </Button>
            </div>
          </Card>

          {/* Quick Stats / Info Widget */}
          <Card className="glass-morphism border-none shadow-lg p-6 rounded-[28px] bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Active Session</div>
                <div className="text-sm font-bold">{items.length} Products in cart</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <DebtModal
        items={items}
        total={total}
        showDebt={showDebt}
        setShowDebt={setShowDebt}
        handleReset={clearCart}
      />

      <CustomDialog
        open={Boolean(barcodeNotFound)}
        onClose={() => setBarcodeNotFound(null)}
        title="الباركود غير موجود"
        message={`الباركود "${barcodeNotFound}" غير موجود في قاعدة البيانات ❌`}
        type="error"
      />

      <CustomDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="تأكيد عملية البيع"
        message={`هل أنت متأكد من إتمام عملية البيع بقيمة ${total.toFixed(2)} ج.م؟ (${pendingPaymentMethod === "tablet" ? "تابلت" : "كاش"})`}
        type="info"
        onConfirm={() => {
          setShowConfirm(false);
          handleCheckout(isPendingSadaqah, pendingPaymentMethod);
        }}
      />

      <ProductSelectDialog
        open={showSearch}
        onClose={() => setShowSearch(false)}
        products={products}
        searchResults={searchResults}
        setSearchResults={setSearchResults}
        selectedProduct={selectedProduct}
        setSelectedProduct={setSelectedProduct}
        tempQuantity={tempQuantity}
        setTempQuantity={setTempQuantity}
        tempUnit={tempUnit}
        setTempUnit={setTempUnit}
        tempExpiry={tempExpiry}
        setTempExpiry={setTempExpiry}
        tempPillsPerStrip={tempPillsPerStrip}
        setTempPillsPerStrip={setTempPillsPerStrip}
        variants={variants}
        setVariants={setVariants}
        handleAddProduct={handleAddProduct}
        aiMacro={aiMacro}
        setAiMacro={setAiMacro}
      />
    </div>
  );
};

export default CheckoutPage;
