"use client";

import React, { useEffect, useState } from "react";
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
  AlertTriangle,
  X,
  ChevronDown,
  ChevronLeft,
} from "lucide-react";

import Cookies from "js-cookie";

import CreateProductForm from "../components/createProduct";
import BarcodeScanner from "../components/BarcodeScanner";
import BatchEntryDialog from "../components/BatchEntryDialog";

/* =========================================================
   SAFE HELPERS
========================================================= */
const safeArray = (value) => {
  try {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return Object.values(value);
    return [];
  } catch {
    return [];
  }
};

const safeNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/* =========================================================
   COMPONENT
========================================================= */
const Stock = () => {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode] = useState("all");

  const [deleteId, setDeleteId] = useState(null);

  const [openModal, setOpenModal] = useState(false);

  const [editingStockProduct, setEditingStockProduct] = useState(null);

  const [batchEntryTarget, setBatchEntryTarget] = useState(null);

  const [expandedProducts, setExpandedProducts] = useState(new Set());

  const [errors, setErrors] = useState([]);

  /* =========================================================
     ERROR HANDLER
  ========================================================= */
  const pushError = (msg) => {
    setErrors((prev) => [msg, ...prev].slice(0, 3));
  };

  /* =========================================================
     FETCH SUPPLIERS
  ========================================================= */
  const fetchSuppliers = async () => {
    try {
      const token = Cookies.get("token");

      const res = await axios.get("/api/suppliers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSuppliers(safeArray(res.data?.suppliers));
    } catch (err) {
      console.error(err);
      pushError("فشل في تحميل الموردين");
    }
  };

  /* =========================================================
     FETCH PRODUCTS
  ========================================================= */
  const fetchProducts = async (query = "", mode = "all") => {
    try {
      const token = Cookies.get("token");

      const res = await axios.get("/api/search", {
        params: {
          q: query,
          mode,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const incomingProducts = safeArray(res.data?.products);

      const normalizedProducts = incomingProducts.map((product) => ({
        ...product,

        _id: product?._id || "",

        name: product?.name || "منتج بدون اسم",

        totalQuantity: safeNumber(product?.totalQuantity),

        batches: safeArray(product?.batches).map((batch) => ({
          ...batch,

          batchId:
            batch?.batchId ||
            batch?.id ||
            crypto.randomUUID(),

          quantity: safeNumber(batch?.quantity),
        })),
      }));

      setProducts(normalizedProducts);
    } catch (err) {
      console.error(err);
      pushError("حدث خطأ أثناء تحميل المنتجات");
    }
  };

  /* =========================================================
     INITIAL LOAD
  ========================================================= */
  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(searchTerm, searchMode);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchMode]);

  /* =========================================================
     TOGGLE PRODUCT
  ========================================================= */
  const toggleProduct = (productId) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);

      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }

      return next;
    });
  };

  /* =========================================================
     UPDATE BATCH STATE
  ========================================================= */
  const updateBatchState = (batchId, changes) => {
    try {
      setProducts((prev) =>
        safeArray(prev).map((product) => ({
          ...product,

          batches: safeArray(product.batches).map((batch) =>
            batch.batchId === batchId
              ? {
                  ...batch,
                  ...changes,
                }
              : batch
          ),
        }))
      );
    } catch (err) {
      console.error(err);
      pushError("تعذر تحديث بيانات الدفعة");
    }
  };

  /* =========================================================
     DELETE PRODUCT
  ========================================================= */
  const handleDelete = async () => {
    try {
      if (!deleteId?.productId) return;

      const token = Cookies.get("token");

      await axios.delete(
        `/api/products?id=${deleteId.productId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setDeleteId(null);

      fetchProducts(searchTerm, searchMode);
    } catch (err) {
      console.error(err);
      pushError("فشل حذف المنتج");
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */
  return (
    <div className="p-4 flex flex-col gap-4" dir="rtl">

      {/* =====================================================
          ERRORS
      ====================================================== */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-md p-3">
          <div className="flex items-start justify-between gap-3">

            <div className="flex flex-col gap-1">
              {errors.map((error, index) => (
                <div
                  key={index}
                  className="text-red-600 text-xs flex items-center gap-2"
                >
                  <span className="w-1 h-1 rounded-full bg-red-500" />
                  {error}
                </div>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setErrors([])}
            >
              <X className="h-3 w-3" />
            </Button>

          </div>
        </div>
      )}

      {/* =====================================================
          SEARCH + ACTIONS
      ====================================================== */}
      <div className="flex gap-2">

        <div className="relative flex-1">

          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />

          <Input
            className="pr-10"
            placeholder="بحث في المخزون..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

        </div>

        <Button
          variant="default"
          onClick={() => setOpenModal(true)}
        >
          <Plus className="ml-2 h-4 w-4" />
          جديد
        </Button>

      </div>

      {/* =====================================================
          TABLE
      ====================================================== */}
      <div className="rounded-md border overflow-hidden">

        <Table>

          <TableHeader>
            <TableRow className="bg-gray-50/70">

              <TableHead className="text-right">
                المنتج
              </TableHead>

              <TableHead className="text-right">
                الكمية
              </TableHead>

              <TableHead className="text-center">
                تحكم
              </TableHead>

            </TableRow>
          </TableHeader>

          <TableBody>

            {safeArray(products).length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center text-gray-500 py-10"
                >
                  لا توجد منتجات
                </TableCell>
              </TableRow>
            )}

            {safeArray(products).map((product) => {
              const productId = product._id;

              const isExpanded =
                expandedProducts.has(productId);

              return (
                <React.Fragment key={productId}>

                  {/* PRODUCT ROW */}
                  <TableRow
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleProduct(productId)}
                  >

                    <TableCell className="font-medium">

                      <div className="flex items-center gap-2">

                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronLeft className="h-4 w-4 text-gray-400" />
                        )}

                        <span>{product.name}</span>

                      </div>

                    </TableCell>

                    <TableCell>
                      {safeNumber(product.totalQuantity)}
                    </TableCell>

                    <TableCell className="text-center">

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();

                          setDeleteId({
                            productId,
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>

                    </TableCell>

                  </TableRow>

                  {/* BATCHES */}
                  {isExpanded &&
                    safeArray(product.batches).map((batch) => (
                      <TableRow
                        key={batch.batchId}
                        className="bg-gray-50/40"
                      >

                        <TableCell className="pr-10">

                          <div className="flex flex-col gap-1 text-sm">

                            <span className="text-gray-700">
                              باركود:
                              {" "}
                              {batch.barcode || "-"}
                            </span>

                            <span className="text-gray-500 text-xs">
                              دفعة:
                              {" "}
                              {batch.batchNumber || "-"}
                            </span>

                          </div>

                        </TableCell>

                        <TableCell>

                          <Input
                            type="number"
                            className="w-24 h-8"
                            value={batch.quantity || ""}
                            onChange={(e) =>
                              updateBatchState(
                                batch.batchId,
                                {
                                  quantity: e.target.value,
                                }
                              )
                            }
                          />

                        </TableCell>

                        <TableCell />

                      </TableRow>
                    ))}

                </React.Fragment>
              );
            })}

          </TableBody>

        </Table>

      </div>

      {/* =====================================================
          DELETE DIALOG
      ====================================================== */}
      <Dialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
      >

        <DialogContent>

          <div className="flex flex-col items-center gap-3 text-center">

            <AlertTriangle className="h-10 w-10 text-amber-500" />

            <h2 className="text-lg font-bold">
              تأكيد الحذف
            </h2>

            <p className="text-sm text-gray-500">
              لا يمكن التراجع عن هذه العملية
            </p>

            <div className="flex gap-2 mt-4">

              <Button
                variant="outline"
                onClick={() => setDeleteId(null)}
              >
                إلغاء
              </Button>

              <Button
                variant="destructive"
                onClick={handleDelete}
              >
                حذف
              </Button>

            </div>

          </div>

        </DialogContent>

      </Dialog>

      {/* =====================================================
          CREATE PRODUCT
      ====================================================== */}
      <CreateProductForm
        openModal={openModal}
        setOpenModal={setOpenModal}
        editingStockProduct={editingStockProduct}
        setEditingStockProduct={setEditingStockProduct}
        onSuccess={() =>
          fetchProducts(searchTerm, searchMode)
        }
      />

      {/* =====================================================
          BARCODE SCANNER
      ====================================================== */}
      <BarcodeScanner
        onScan={(code) => setSearchTerm(code)}
      />

      {/* =====================================================
          BATCH ENTRY
      ====================================================== */}
      {batchEntryTarget && (
        <BatchEntryDialog
          open={!!batchEntryTarget}
          onClose={() => setBatchEntryTarget(null)}
          productName={batchEntryTarget?.name}
          productId={batchEntryTarget?._id}
          suppliers={suppliers}
        />
      )}

    </div>
  );
};

export default Stock;
