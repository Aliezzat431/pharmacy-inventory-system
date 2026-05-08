"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

import {
  Search,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

import { toast } from "sonner";
import Cookies from "js-cookie";

import { supabase } from "../lib/supabase";
import CreateProductForm from "../components/createProduct";
import BarcodeScanner from "../components/BarcodeScanner";
import BatchEntryDialog from "../components/BatchEntryDialog";
import { cn } from "@/lib/utils";

/* =========================================================
   DEBUG HELPERS (REPLACED WITH ALERTS ONLY)
========================================================= */

const stringifyValue = (value) => {
  try {
    if (typeof value === "string") return value;
    if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null ||
      value === undefined
    ) {
      return String(value);
    }
    return JSON.stringify(value, null, 2);
  } catch {
    return "[UNSERIALIZABLE VALUE]";
  }
};

const showAlert = (type, args) => {
  const message = `[${type}]\n\n${args
    .map((a) => stringifyValue(a))
    .join("\n\n")}`;

  alert(message);
};

const debug = (...args) => showAlert("STOCK DEBUG", args);
const debugError = (...args) => showAlert("STOCK ERROR", args);
const debugWarn = (...args) => showAlert("STOCK WARN", args);

/* =========================================================
   SAFE ARRAY
========================================================= */

const safeArray = (value, label = "unknown") => {
  debug("safeArray called", label, value);

  try {
    if (Array.isArray(value)) {
      debug("safeArray array ok", label, value.length);
      return value;
    }

    if (value && typeof value === "object") {
      const objValues = Object.values(value);
      debug("safeArray object converted", label, objValues.length);
      return objValues;
    }

    debugWarn("safeArray empty return", label, value);
    return [];
  } catch (err) {
    debugError("safeArray error", label, err);
    return [];
  }
};

/* =========================================================
   EXPIRY HELPERS
========================================================= */

const getExpiryStatus = (expiryDate) => {
  debug("getExpiryStatus", expiryDate);

  if (!expiryDate) return "none";

  const now = new Date();
  const exp = new Date(expiryDate);

  const daysLeft = Math.ceil(
    (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  debug("expiry calc", { expiryDate, daysLeft });

  if (daysLeft < 0) return "expired";
  if (daysLeft <= 30) return "critical";
  if (daysLeft <= 90) return "warning";

  return "ok";
};

const ExpiryBadge = ({ expiryDate }) => {
  const status = getExpiryStatus(expiryDate);

  if (status === "none") {
    return (
      <span className="text-xs text-muted-foreground/40 font-bold">
        —
      </span>
    );
  }

  const exp = new Date(expiryDate);

  const daysLeft = Math.ceil(
    (exp.getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const label = exp.toLocaleDateString("ar-EG", {
    year: "2-digit",
    month: "short",
  });

  const configs = {
    expired: {
      cls: "bg-destructive/15 text-destructive border-destructive/30",
      icon: "⚠️",
    },
    critical: {
      cls: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-400/30",
      icon: "⏰",
    },
    warning: {
      cls: "bg-amber-400/15 text-amber-600 dark:text-amber-400 border-amber-400/30",
      icon: "📅",
    },
    ok: {
      cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-400/20",
      icon: "✓",
    },
  };

  const { cls, icon } = configs[status];

  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-black", cls)}>
      <span>{icon}</span>
      {label}
      {status !== "ok" && <span>({daysLeft}د)</span>}
    </span>
  );
};

/* =========================================================
   COMPONENT
========================================================= */

const Stock = () => {
  debug("COMPONENT RENDER");

  const [batches, setBatches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState("all");
  const [selectedBatchIds, setSelectedBatchIds] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [editingStockProduct, setEditingStockProduct] = useState(null);
  const [batchEntryTarget, setBatchEntryTarget] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [invoiceDetails, setInvoiceDetails] = useState({
    supplier: "",
    invoiceNumber: "",
  });
  const [loading, setLoading] = useState(false);

  /* =========================================================
     FETCH SUPPLIERS
  ========================================================= */

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        debug("fetchSuppliers");

        const token = Cookies.get("token");

        const res = await axios.get("/api/suppliers", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const normalized = safeArray(res.data?.suppliers, "suppliers");
        setSuppliers(normalized);
      } catch (err) {
        debugError("suppliers error", err);
        setSuppliers([]);
      }
    };

    fetchSuppliers();
  }, []);

  /* =========================================================
     FETCH BATCHES
  ========================================================= */

  const fetchBatches = async (query = "", mode = "all") => {
    try {
      debug("fetchBatches", query, mode);

      const token = Cookies.get("token");

      const response = await axios.get("/api/search", {
        params: {
          ...(query && { q: query }),
          mode,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      const products = safeArray(response.data?.products, "products");

      const batchesList = products.map((batch) => ({
        ...batch,
        batchId: batch.batchId || batch._id,
        originalQuantity: batch.quantity,
      }));

      setBatches(batchesList);
    } catch (error) {
      debugError("fetchBatches error", error);
      setBatches([]);
    }
  };

  /* =========================================================
     SEARCH EFFECT
  ========================================================= */

  useEffect(() => {
    const t = setTimeout(() => {
      fetchBatches(searchTerm, searchMode);
    }, 300);

    return () => clearTimeout(t);
  }, [searchTerm, searchMode]);

  /* =========================================================
     REALTIME
  ========================================================= */

  useEffect(() => {
    const channel = supabase
      .channel("stock_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        fetchBatches(searchTerm, searchMode);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [searchTerm, searchMode]);

  /* =========================================================
     GROUPED PRODUCTS
  ========================================================= */

  const groupedProducts = useMemo(() => {
    const groups = {};

    safeArray(batches, "group").forEach((batch) => {
      const id = batch._id;

      if (!groups[id]) {
        groups[id] = {
          productId: id,
          name: batch.name,
          unit: batch.unit,
          batches: [],
          totalQuantity: 0,
          lowestPrice: Infinity,
          highestPrice: 0,
        };
      }

      groups[id].batches.push(batch);
      groups[id].totalQuantity += Number(batch.quantity) || 0;
      groups[id].lowestPrice = Math.min(groups[id].lowestPrice, Number(batch.price) || 0);
      groups[id].highestPrice = Math.max(groups[id].highestPrice, Number(batch.price) || 0);
    });

    return Object.values(groups);
  }, [batches]);

  /* =========================================================
     UPDATE BATCH
  ========================================================= */

  const updateBatchState = (batchId, changes) => {
    setBatches((prev) =>
      safeArray(prev, "update").map((b) =>
        b.batchId === batchId ? { ...b, ...changes } : b
      )
    );
  };

  /* =========================================================
     TOGGLE
  ========================================================= */

  const toggleProduct = (id) => {
    setExpandedProducts((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  /* =========================================================
     DELETE
  ========================================================= */

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const token = Cookies.get("token");

      await axios.delete(`/api/products?id=${deleteId.productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("تم الحذف");
      fetchBatches(searchTerm, searchMode);
      setDeleteId(null);
    } catch (err) {
      debugError("delete error", err);
      toast.error("فشل الحذف");
    }
  };

  /* =========================================================
     STATS
  ========================================================= */

  const totalProducts = groupedProducts.length;
  const totalBatches = batches.length;

  const expiringSoon = batches.filter((p) =>
    ["critical", "warning"].includes(getExpiryStatus(p.expiryDate))
  ).length;

  const lowStock = batches.filter(
    (p) => Number(p.quantity) > 0 && Number(p.quantity) <= 10
  ).length;

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="p-4 md:p-8 w-full min-h-screen flex flex-col gap-5" dir="rtl">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4" />

          <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <Button onClick={() => setOpenModal(true)}>
          <Plus className="h-4 w-4 ml-2" />
          منتج جديد
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border rounded-xl">المنتجات: {totalProducts}</div>
        <div className="p-4 border rounded-xl">الدفعات: {totalBatches}</div>
        <div className="p-4 border rounded-xl">تنتهي قريباً: {expiringSoon}</div>
        <div className="p-4 border rounded-xl">مخزون منخفض: {lowStock}</div>
      </div>

      <div className="border rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المنتج</TableHead>
              <TableHead>الكمية</TableHead>
              <TableHead>السعر</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {groupedProducts.map((product) => {
              const isExpanded = expandedProducts.has(product.productId);

              return (
                <React.Fragment key={product.productId}>
                  <TableRow onClick={() => toggleProduct(product.productId)}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.totalQuantity}</TableCell>
                    <TableCell>{product.lowestPrice}</TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId({ productId: product.productId });
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>

                  {isExpanded &&
                    product.batches.map((batch) => (
                      <TableRow key={batch.batchId}>
                        <TableCell>دفعة</TableCell>
                        <TableCell>
                          <Input
                            value={batch.quantity || ""}
                            onChange={(e) =>
                              updateBatchState(batch.batchId, {
                                quantity: e.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={batch.price || ""}
                            onChange={(e) =>
                              updateBatchState(batch.batchId, {
                                price: e.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <ExpiryBadge expiryDate={batch.expiryDate} />
                        </TableCell>
                      </TableRow>
                    ))}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent>
          <div className="flex flex-col items-center gap-4">
            <AlertTriangle className="text-red-500" />
            <h2>تأكيد الحذف</h2>

            <div className="flex gap-3">
              <Button variant="destructive" onClick={handleDelete}>
                حذف
              </Button>
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CreateProductForm
        openModal={openModal}
        setOpenModal={setOpenModal}
        editingStockProduct={editingStockProduct}
        setEditingStockProduct={setEditingStockProduct}
        onSuccess={() => fetchBatches(searchTerm, searchMode)}
      />

      <BarcodeScanner
        onScan={(barcode) => {
          setSearchTerm(barcode);
          fetchBatches(barcode, searchMode);
        }}
      />

      {batchEntryTarget && (
        <BatchEntryDialog
          open={!!batchEntryTarget}
          onClose={() => setBatchEntryTarget(null)}
          productName={batchEntryTarget.name}
          productId={batchEntryTarget.productId}
          suppliers={suppliers}
          onSuccess={() => fetchBatches(searchTerm, searchMode)}
        />
      )}
    </div>
  );
};

export default Stock;
