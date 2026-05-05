import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function verifyToken(headers, returnToken = false) {
  let token = null;

  // 1. Try Authorization header
  const authHeader = headers?.get?.("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const extracted = authHeader.slice(7);
    if (isValidToken(extracted)) {
      token = extracted;
    }
  }

  // 2. Try cookie if no header token
  if (!token) {
    try {
      const cookieStore = await cookies();
      const cookieToken = cookieStore.get("token")?.value;
      if (isValidToken(cookieToken)) {
        token = cookieToken;
      }
    } catch {
      // cookies() not available in this context
    }
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return returnToken ? { user: decoded, token } : decoded;
  } catch (err) {
    console.error("❌ JWT verification failed:", err.message);
    return null;
  }
}

function isValidToken(token) {
  return token && token !== "undefined" && token !== "null";
}