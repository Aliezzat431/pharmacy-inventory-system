import { formatZodIssues } from "@/app/lib/validation/schemas";

/**
 * Parse JSON body and validate with a Zod schema.
 * @template {import("zod").ZodTypeAny} T
 * @param {Request} request
 * @param {T} schema
 * @returns {Promise<{ ok: true, data: import("zod").infer<T> } | { ok: false, status: number, body: object }>}
 */
export async function parseAndValidate(request, schema) {
  let raw;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      status: 400,
      body: { success: false, message: "تعذر قراءة الطلب (JSON غير صالح)" },
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const messages = formatZodIssues(parsed.error);
    return {
      ok: false,
      status: 400,
      body: {
        success: false,
        message: messages[0] || "بيانات الطلب غير صالحة",
        errors: messages,
      },
    };
  }

  return { ok: true, data: parsed.data };
}
