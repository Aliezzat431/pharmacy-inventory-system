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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

import { Checkbox } from "@/components/ui/checkbox";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Search,
  Plus,
  Save,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Package,
  X,
  Layers,
  ShieldAlert,
  TrendingUp,
  Boxes,
  Clock,
  SlidersHorizontal,
  CheckSquare,
} from "lucide-react";

import { toast } from "sonner";
import Cookies from "js-cookie";

import { supabase } from "../lib/supabase";
import CreateProductForm from "../components/createProduct";
import BarcodeScanner from "../components/BarcodeScanner";
import BatchEntryDialog from "../components/BatchEntryDialog";
import { cn } from "@/lib/utils";

/* helpers */

const safeArray = (value) => {
  if (Array.isArray(value)) return value;

  if (value && typeof value === "object") {
    return Object.values(value);
  }

  return [];
};

const getExpiryStatus = (expiryDate) => {
  if (!expiryDate) return "none";

  const now = new Date();
  const exp = new Date(expiryDate);

  const daysLeft = Math.ceil(
    (exp - now) / (1000 * 60 * 60 * 24)
  );

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
    (exp - new Date()) / (1000 * 60 * 60 * 24)
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
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-black whitespace-nowrap",
        cls
      )}
    >
      <span>{icon}</span>
      {label}

      {status !== "ok" && (
        <span className="opacity-60">
          ({daysLeft}د)
        </span>
      )}
    </span>
  );
};

const Stock = () => {
  const [batches, setBatches] = useState([]);
  const [suppliers, setSuppliers] = useState(() => []);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState("all");

  const [selectedBatchIds, setSelectedBatchIds] = useState([]);

  const [deleteId, setDeleteId] = useState(null);

  const [openModal, setOpenModal] = useState(false);

  const [editingStockProduct, setEditingStockProduct] =
    useState(null);

  const [batchEntryTarget, setBatchEntryTarget] =
    useState(null);

  const [expandedProducts, setExpandedProducts] =
    useState(new Set());

  const [invoiceDetails, setInvoiceDetails] = useState({
    supplier: "",
    invoiceNumber: "",
  });

  const [loading, setLoading] = useState(false);

  /* fetch suppliers */

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const token = Cookies.get("token");

        const res = await axios.get("/api/suppliers", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.data?.success) {
          const normalizedSuppliers = safeArray(
            res.data?.suppliers
          );

          setSuppliers(normalizedSuppliers);
        } else {
          setSuppliers([]);
        }
      } catch (err) {
        console.error(err);
        setSuppliers([]);
      }
    };

    fetchSuppliers();
  }, []);

  /* fetch batches */

  const fetchBatches = async (query = "", mode = "all") => {
    try {
      const token = Cookies.get("token");

      const response = await axios.get("/api/search", {
        params: {
          ...(query && { q: query }),
          mode,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const products = safeArray(response.data?.products);

      const batchesList = products.map((batch) => ({
        ...batch,
        batchId: batch.batchId || batch._id,
        originalQuantity: batch.quantity,
      }));

      setBatches(batchesList);
    } catch (error) {
      console.error(error);
      setBatches([]);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchBatches(searchTerm, searchMode);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchTerm, searchMode]);

  /* realtime */

  useEffect(() => {
    const stockChannel = supabase
      .channel("stock_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          fetchBatches(searchTerm, searchMode);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(stockChannel);
    };
  }, [searchTerm, searchMode]);

  /* grouped */

  const groupedProducts = useMemo(() => {
    const groups = {};

    safeArray(batches).forEach((batch) => {
      const productId = batch._id;

      if (!groups[productId]) {
        groups[productId] = {
          productId,
          name: batch.name,
          unit: batch.unit,
          batches: [],
          totalQuantity: 0,
          lowestPrice: Infinity,
          highestPrice: 0,
        };
      }

      groups[productId].batches.push(batch);

      groups[productId].totalQuantity +=
        Number(batch.quantity) || 0;

      groups[productId].lowestPrice = Math.min(
        groups[productId].lowestPrice,
        Number(batch.price) || 0
      );

      groups[productId].highestPrice = Math.max(
        groups[productId].highestPrice,
        Number(batch.price) || 0
      );
    });

    return safeArray(Object.values(groups));
  }, [batches]);

  /* update */

  const updateBatchState = (batchId, changes) => {
    setBatches((prev) =>
      safeArray(prev).map((batch) =>
        batch.batchId?.toString() === batchId?.toString()
          ? { ...batch, ...changes }
          : batch
      )
    );
  };

  const toggleProduct = (productId) => {
    setExpandedProducts((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(productId)) newSet.delete(productId);
      else newSet.add(productId);

      return newSet;
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const token = Cookies.get("token");
      const { productId, batchId } = deleteId;

      const url = batchId
        ? `/api/products?id=${productId}&batchId=${batchId}`
        : `/api/products?id=${productId}`;

      await axios.delete(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("تم الحذف بنجاح");
      fetchBatches(searchTerm, searchMode);
      setDeleteId(null);
    } catch (err) {
      console.error(err);
      toast.error("فشل الحذف");
    }
  };

  /* stats */

  const totalProducts = safeArray(groupedProducts).length;
  const totalBatches = safeArray(batches).length;

  const expiringSoon = safeArray(batches).filter((p) =>
    ["critical", "warning"].includes(getExpiryStatus(p.expiryDate))
  ).length;

  const lowStock = safeArray(batches).filter(
    (p) => Number(p.quantity) > 0 && Number(p.quantity) <= 10
  ).length;

  return (
    <div className="p-4 md:p-8 w-full min-h-screen flex flex-col gap-5" dir="rtl">

      {/* search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث..."
            className="pr-10"
          />
        </div>

        <Button onClick={() => { setEditingStockProduct(null); setOpenModal(true); }}>
          <Plus className="h-4 w-4 ml-2" />
          منتج جديد
        </Button>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border rounded-xl">المنتجات: {totalProducts}</div>
        <div className="p-4 border rounded-xl">الدفعات: {totalBatches}</div>
        <div className="p-4 border rounded-xl">تنتهي قريباً: {expiringSoon}</div>
        <div className="p-4 border rounded-xl">مخزون منخفض: {lowStock}</div>
      </div>

      {/* table */}
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
            {groupedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10">
                  لا توجد منتجات
                </TableCell>
              </TableRow>
            ) : (
              groupedProducts.map((product) => {
                const isExpanded = expandedProducts.has(product.productId);

                return (
                  <React.Fragment key={product.productId}>
                    <TableRow onClick={() => toggleProduct(product.productId)} className="cursor-pointer">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown /> : <ChevronRight />}
                          {product.name}
                        </div>
                      </TableCell>

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
                          <TableCell className="pr-10">دفعة</TableCell>

                          <TableCell>
                            <Input
                              type="number"
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
                              type="number"
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
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* delete dialog */}
      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent>
          <div className="flex flex-col items-center gap-4">
            <AlertTriangle className="text-red-500" />
            <h2>تأكيد الحذف</h2>

            <div className="flex gap-3">
              <Button variant="destructive" onClick={handleDelete}>حذف</Button>
              <Button variant="outline" onClick={() => setDeleteId(null)}>إلغاء</Button>
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
          suppliers={safeArray(suppliers)}
          onSuccess={() => fetchBatches(searchTerm, searchMode)}
        />
      )}
    </div>
  );
};

export default Stock;
