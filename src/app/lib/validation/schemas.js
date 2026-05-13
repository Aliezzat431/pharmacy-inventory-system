import { z } from "zod";
import { treatmentTypes } from "@/app/lib/unitOptions";

const TREATMENT_NAMES = treatmentTypes.map((t) => t.name);

export const pharmacyIdSchema = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) => {
    if (v == null || v === "") return "1";
    return String(v);
  })
  .pipe(z.enum(["1", "2"], { message: "معرف الصيدلية غير صالح" }));

export const loginBodySchema = z.object({
  username: z
    .string({ message: "اسم المستخدم مطلوب" })
    .trim()
    .min(3, { message: "اسم المستخدم يجب ألا يقل عن 3 أحرف" })
    .max(64, { message: "اسم المستخدم طويل جداً" })
    .refine((s) => !/[\u0000-\u001F\u007F]/.test(s), {
      message: "اسم المستخدم يحتوي على أحرف غير مسموحة",
    }),
  password: z
    .string({ message: "كلمة المرور مطلوبة" })
    .min(1, { message: "كلمة المرور مطلوبة" })
    .max(128, { message: "كلمة المرور طويلة جداً" }),
  pharmacyId: pharmacyIdSchema.optional().default("1"),
});

export const registerBodySchema = z.object({
  username: z
    .string({ message: "اسم المستخدم مطلوب" })
    .trim()
    .min(3, { message: "اسم المستخدم يجب ألا يقل عن 3 أحرف" })
    .max(64, { message: "اسم المستخدم طويل جداً" }),
  password: z
    .string({ message: "كلمة المرور مطلوبة" })
    .min(6, { message: "كلمة المرور يجب ألا تقل عن 6 أحرف" })
    .max(128, { message: "كلمة المرور طويلة جداً" }),
  pharmacyId: pharmacyIdSchema.optional().default("1"),
  masterPin: z.string().max(64).optional().nullable(),
  /** Preferred: send admin key separately instead of embedding it in the password. */
  adminKey: z.string().max(256).optional().nullable(),
});

export const companyNameSchema = z.object({
  name: z
    .string({ message: "اسم الشركة مطلوب" })
    .trim()
    .min(1, { message: "اسم الشركة مطلوب" })
    .max(200, { message: "اسم الشركة طويل جداً" })
    .refine((s) => !/[%_]/.test(s), {
      message: "لا يمكن أن يحتوي اسم الشركة على الرموز % أو _",
    }),
});

const optionalTrimmed = (max) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => {
      if (v == null) return undefined;
      const s = String(v).trim();
      return s === "" ? undefined : s;
    })
    .pipe(z.string().max(max).optional());

const nonNegNumberOptional = z.preprocess((v) => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}, z.number().finite().nonnegative().optional());

const positiveNumberOptional = z.preprocess((v) => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}, z.number().finite().positive().optional());

export const productBatchItemSchema = z.object({
  name: z.string().trim().min(1).max(500),
  type: z.enum(TREATMENT_NAMES).optional(),
  quantity: z.preprocess((v) => Number(v), z.number().finite().positive()),
  barcode: optionalTrimmed(120),
  unitConversion: positiveNumberOptional,
  expiryDate: z.union([z.string(), z.number(), z.date()]).optional().nullable(),
  purchasePrice: nonNegNumberOptional,
  salePrice: nonNegNumberOptional,
  company: optionalTrimmed(200),
  details: optionalTrimmed(2000),
  supplier: optionalTrimmed(200),
  invoiceNumber: optionalTrimmed(120),
  isGift: z.boolean().optional().default(false),
});

export const productBatchesBodySchema = z
  .array(productBatchItemSchema)
  .min(1, { message: "يجب إرسال دفعة واحدة على الأقل" })
  .max(100, { message: "عدد الدفعات في الطلب الواحد كبير جداً" });

export function formatZodIssues(error) {
  return error.issues.map((i) => i.message).filter(Boolean);
}
