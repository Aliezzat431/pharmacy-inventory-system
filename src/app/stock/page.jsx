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

/* =========================================================
   DEBUG HELPERS
========================================================= */

const debug = (...args: any[]) => {
  console.log(
    "%c[STOCK DEBUG]",
    "background:#111;color:#0f0;padding:2px 6px;border-radius:4px",
    ...args
  );
};

const debugError = (...args: any[]) => {
  console.error(
    "%c[STOCK ERROR]",
    "background:#500;color:#fff;padding:2px 6px;border-radius:4px",
    ...args
  );
};

const debugWarn = (...args: any[]) => {
  console.warn(
    "%c[STOCK WARN]",
    "background:#aa7700;color:#fff;padding:2px 6px;border-radius:4px",
    ...args
  );
};

/* =========================================================
   SAFE ARRAY
========================================================= */

const safeArray = (value: any, label = "unknown") => {
  debug(`safeArray called -> ${label}`, {
    value,
    type: typeof value,
    isArray: Array.isArray(value),
  });

  try {
    if (Array.isArray(value)) {
      debug(`safeArray SUCCESS ARRAY -> ${label}`, {
        length: value.length,
      });

      return value;
    }

    if (value && typeof value === "object") {
      const objectValues = Object.values(value);

      debug(`safeArray OBJECT CONVERTED -> ${label}`, {
        objectKeys: Object.keys(value),
        convertedLength: objectValues.length,
      });

      return objectValues;
    }

    debugWarn(`safeArray RETURNING EMPTY ARRAY -> ${label}`, {
      received: value,
    });

    return [];
  } catch (err) {
    debugError(`safeArray FAILED -> ${label}`, err);

    return [];
  }
};

/* =========================================================
   EXPIRY HELPERS
========================================================= */

const getExpiryStatus = (expiryDate: string) => {
  debug("getExpiryStatus", expiryDate);

  if (!expiryDate) return "none";

  const now = new Date();
  const exp = new Date(expiryDate);

  const daysLeft = Math.ceil(
    (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  debug("Expiry Calculation", {
    now,
    exp,
    daysLeft,
  });

  if (daysLeft < 0) return "expired";
  if (daysLeft <= 30) return "critical";
  if (daysLeft <= 90) return "warning";

  return "ok";
};

const ExpiryBadge = ({ expiryDate }: any) => {
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

  const configs: any = {
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

/* =========================================================
   COMPONENT
========================================================= */

const Stock = () => {
  debug("COMPONENT RENDER");

  const [batches, setBatches] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState("all");

  const [selectedBatchIds, setSelectedBatchIds] =
    useState<string[]>([]);

  const [deleteId, setDeleteId] = useState<any>(null);

  const [openModal, setOpenModal] = useState(false);

  const [editingStockProduct, setEditingStockProduct] =
    useState<any>(null);

  const [batchEntryTarget, setBatchEntryTarget] =
    useState<any>(null);

  const [expandedProducts, setExpandedProducts] =
    useState(new Set());

  const [invoiceDetails, setInvoiceDetails] = useState({
    supplier: "",
    invoiceNumber: "",
  });

  const [loading, setLoading] = useState(false);

  /* =========================================================
     FETCH SUPPLIERS
  ========================================================= */

  useEffect(() => {
    debug("FETCH SUPPLIERS EFFECT START");

    const fetchSuppliers = async () => {
      try {
        debug("fetchSuppliers START");

        const token = Cookies.get("token");

        debug("TOKEN", token);

        const res = await axios.get("/api/suppliers", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        debug("SUPPLIERS RESPONSE", res);

        debug("SUPPLIERS RESPONSE DATA", res.data);

        debug("SUPPLIERS TYPE", typeof res.data?.suppliers);

        debug("SUPPLIERS IS ARRAY", Array.isArray(res.data?.suppliers));

        const normalizedSuppliers = safeArray(
          res.data?.suppliers,
          "suppliers"
        );

        debug("NORMALIZED SUPPLIERS", normalizedSuppliers);

        setSuppliers(normalizedSuppliers);
      } catch (err) {
        debugError("FETCH SUPPLIERS FAILED", err);

        setSuppliers([]);
      }
    };

    fetchSuppliers();
  }, []);

  /* =========================================================
     FETCH BATCHES
  ========================================================= */

  const fetchBatches = async (
    query = "",
    mode = "all"
  ) => {
    try {
      debug("fetchBatches START", {
        query,
        mode,
      });

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

      debug("SEARCH RESPONSE FULL", response);

      debug("SEARCH RESPONSE DATA", response.data);

      debug("PRODUCTS RAW", response.data?.products);

      debug("PRODUCTS TYPE", typeof response.data?.products);

      debug(
        "PRODUCTS IS ARRAY",
        Array.isArray(response.data?.products)
      );

      /*
        THIS IS IMPORTANT
        TO DETECT WHY .map FAILS
      */

      if (
        response.data?.products &&
        !Array.isArray(response.data?.products)
      ) {
        debugWarn("PRODUCTS IS NOT ARRAY", {
          keys: Object.keys(response.data?.products || {}),
          value: response.data?.products,
        });
      }

      const products = safeArray(
        response.data?.products,
        "products"
      );

      debug("PRODUCTS AFTER SAFE ARRAY", products);

      debug(
        "PRODUCTS EVERY ITEM",
        products.map((item: any, index: number) => ({
          index,
          type: typeof item,
          item,
        }))
      );

      const batchesList = products.map(
        (batch: any, index: number) => {
          debug("MAPPING BATCH", {
            index,
            batch,
          });

          return {
            ...batch,
            batchId: batch.batchId || batch._id,
            originalQuantity: batch.quantity,
          };
        }
      );

      debug("FINAL BATCHES LIST", batchesList);

      setBatches(batchesList);
    } catch (error: any) {
      debugError("fetchBatches FAILED", error);

      debugError("ERROR RESPONSE", error?.response);

      debugError("ERROR RESPONSE DATA", error?.response?.data);

      setBatches([]);
    }
  };

  /* =========================================================
     SEARCH EFFECT
  ========================================================= */

  useEffect(() => {
    debug("SEARCH EFFECT", {
      searchTerm,
      searchMode,
    });

    const timeout = setTimeout(() => {
      fetchBatches(searchTerm, searchMode);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchTerm, searchMode]);

  /* =========================================================
     REALTIME
  ========================================================= */

  useEffect(() => {
    debug("REALTIME EFFECT START");

    const stockChannel = supabase
      .channel("stock_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        (payload) => {
          debug("REALTIME EVENT", payload);

          fetchBatches(searchTerm, searchMode);
        }
      )
      .subscribe((status) => {
        debug("SUPABASE STATUS", status);
      });

    return () => {
      debug("REMOVE CHANNEL");

      supabase.removeChannel(stockChannel);
    };
  }, [searchTerm, searchMode]);

  /* =========================================================
     GROUPED PRODUCTS
  ========================================================= */

  const groupedProducts = useMemo(() => {
    debug("GROUPING PRODUCTS START");

    debug("BATCHES BEFORE GROUP", batches);

    const groups: any = {};

    safeArray(batches, "batches for grouping").forEach(
      (batch: any, index: number) => {
        debug("GROUP LOOP ITEM", {
          index,
          batch,
        });

        const productId = batch._id;

        if (!groups[productId]) {
          debug("CREATING NEW GROUP", productId);

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
      }
    );

    debug("GROUPS OBJECT", groups);

    const finalGroups = safeArray(
      Object.values(groups),
      "grouped products"
    );

    debug("FINAL GROUPED PRODUCTS", finalGroups);

    return finalGroups;
  }, [batches]);

  /* =========================================================
     UPDATE BATCH
  ========================================================= */

  const updateBatchState = (
    batchId: string,
    changes: any
  ) => {
    debug("updateBatchState", {
      batchId,
      changes,
    });

    setBatches((prev) => {
      debug("PREV BATCHES", prev);

      const updated = safeArray(
        prev,
        "updateBatchState prev"
      ).map((batch: any) =>
        batch.batchId?.toString() ===
        batchId?.toString()
          ? { ...batch, ...changes }
          : batch
      );

      debug("UPDATED BATCHES", updated);

      return updated;
    });
  };

  /* =========================================================
     TOGGLE PRODUCT
  ========================================================= */

  const toggleProduct = (productId: string) => {
    debug("toggleProduct", productId);

    setExpandedProducts((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(productId)) {
        debug("COLLAPSING", productId);

        newSet.delete(productId);
      } else {
        debug("EXPANDING", productId);

        newSet.add(productId);
      }

      return newSet;
    });
  };

  /* =========================================================
     DELETE
  ========================================================= */

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      debug("DELETE START", deleteId);

      const token = Cookies.get("token");

      const { productId, batchId } = deleteId;

      const url = batchId
        ? `/api/products?id=${productId}&batchId=${batchId}`
        : `/api/products?id=${productId}`;

      debug("DELETE URL", url);

      const response = await axios.delete(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      debug("DELETE RESPONSE", response);

      toast.success("تم الحذف بنجاح");

      fetchBatches(searchTerm, searchMode);

      setDeleteId(null);
    } catch (err) {
      debugError("DELETE FAILED", err);

      toast.error("فشل الحذف");
    }
  };

  /* =========================================================
     STATS
  ========================================================= */

  const totalProducts = safeArray(
    groupedProducts,
    "totalProducts"
  ).length;

  const totalBatches = safeArray(
    batches,
    "totalBatches"
  ).length;

  const expiringSoon = safeArray(
    batches,
    "expiringSoon"
  ).filter((p: any) =>
    ["critical", "warning"].includes(
      getExpiryStatus(p.expiryDate)
    )
  ).length;

  const lowStock = safeArray(
    batches,
    "lowStock"
  ).filter(
    (p: any) =>
      Number(p.quantity) > 0 &&
      Number(p.quantity) <= 10
  ).length;

  debug("FINAL STATS", {
    totalProducts,
    totalBatches,
    expiringSoon,
    lowStock,
  });

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div
      className="p-4 md:p-8 w-full min-h-screen flex flex-col gap-5"
      dir="rtl"
    >
      {/* SEARCH */}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4" />

          <Input
            value={searchTerm}
            onChange={(e) => {
              debug("SEARCH INPUT CHANGE", e.target.value);

              setSearchTerm(e.target.value);
            }}
            placeholder="ابحث..."
            className="pr-10"
          />
        </div>

        <Button
          onClick={() => {
            debug("OPEN CREATE PRODUCT MODAL");

            setEditingStockProduct(null);

            setOpenModal(true);
          }}
        >
          <Plus className="h-4 w-4 ml-2" />

          منتج جديد
        </Button>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border rounded-xl">
          المنتجات: {totalProducts}
        </div>

        <div className="p-4 border rounded-xl">
          الدفعات: {totalBatches}
        </div>

        <div className="p-4 border rounded-xl">
          تنتهي قريباً: {expiringSoon}
        </div>

        <div className="p-4 border rounded-xl">
          مخزون منخفض: {lowStock}
        </div>
      </div>

      {/* TABLE */}

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
                <TableCell
                  colSpan={4}
                  className="text-center py-10"
                >
                  لا توجد منتجات
                </TableCell>
              </TableRow>
            ) : (
              safeArray(
                groupedProducts,
                "render groupedProducts"
              ).map((product: any, productIndex: number) => {
                debug("RENDER PRODUCT", {
                  productIndex,
                  product,
                });

                const isExpanded =
                  expandedProducts.has(
                    product.productId
                  );

                return (
                  <React.Fragment
                    key={product.productId}
                  >
                    <TableRow
                      onClick={() =>
                        toggleProduct(
                          product.productId
                        )
                      }
                      className="cursor-pointer"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown />
                          ) : (
                            <ChevronRight />
                          )}

                          {product.name}
                        </div>
                      </TableCell>

                      <TableCell>
                        {product.totalQuantity}
                      </TableCell>

                      <TableCell>
                        {product.lowestPrice}
                      </TableCell>

                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();

                            debug(
                              "DELETE PRODUCT CLICK",
                              product
                            );

                            setDeleteId({
                              productId:
                                product.productId,
                            });
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>

                    {isExpanded &&
                      safeArray(
                        product.batches,
                        "product batches render"
                      ).map(
                        (
                          batch: any,
                          batchIndex: number
                        ) => {
                          debug(
                            "RENDER BATCH",
                            {
                              batchIndex,
                              batch,
                            }
                          );

                          return (
                            <TableRow
                              key={batch.batchId}
                            >
                              <TableCell className="pr-10">
                                دفعة
                              </TableCell>

                              <TableCell>
                                <Input
                                  type="number"
                                  value={
                                    batch.quantity ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    updateBatchState(
                                      batch.batchId,
                                      {
                                        quantity:
                                          e.target
                                            .value,
                                      }
                                    )
                                  }
                                />
                              </TableCell>

                              <TableCell>
                                <Input
                                  type="number"
                                  value={
                                    batch.price || ""
                                  }
                                  onChange={(e) =>
                                    updateBatchState(
                                      batch.batchId,
                                      {
                                        price:
                                          e.target
                                            .value,
                                      }
                                    )
                                  }
                                />
                              </TableCell>

                              <TableCell>
                                <ExpiryBadge
                                  expiryDate={
                                    batch.expiryDate
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          );
                        }
                      )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* DELETE DIALOG */}

      <Dialog
        open={!!deleteId}
        onOpenChange={(v) => {
          debug("DELETE DIALOG CHANGE", v);

          if (!v) {
            setDeleteId(null);
          }
        }}
      >
        <DialogContent>
          <div className="flex flex-col items-center gap-4">
            <AlertTriangle className="text-red-500" />

            <h2>تأكيد الحذف</h2>

            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={handleDelete}
              >
                حذف
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  debug(
                    "DELETE CANCEL CLICK"
                  );

                  setDeleteId(null);
                }}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CREATE PRODUCT */}

      <CreateProductForm
        openModal={openModal}
        setOpenModal={setOpenModal}
        editingStockProduct={
          editingStockProduct
        }
        setEditingStockProduct={
          setEditingStockProduct
        }
        onSuccess={() => {
          debug(
            "CREATE PRODUCT SUCCESS"
          );

          fetchBatches(
            searchTerm,
            searchMode
          );
        }}
      />

      {/* BARCODE */}

      <BarcodeScanner
        onScan={(barcode: string) => {
          debug("BARCODE SCANNED", barcode);

          setSearchTerm(barcode);

          fetchBatches(
            barcode,
            searchMode
          );
        }}
      />

      {/* BATCH ENTRY */}

      {batchEntryTarget && (
        <BatchEntryDialog
          open={!!batchEntryTarget}
          onClose={() => {
            debug(
              "BATCH ENTRY CLOSED"
            );

            setBatchEntryTarget(null);
          }}
          productName={
            batchEntryTarget.name
          }
          productId={
            batchEntryTarget.productId
          }
          suppliers={safeArray(
            suppliers,
            "batchEntry suppliers"
          )}
          onSuccess={() => {
            debug(
              "BATCH ENTRY SUCCESS"
            );

            fetchBatches(
              searchTerm,
              searchMode
            );
          }}
        />
      )}
    </div>
  );
};

export default Stock;
