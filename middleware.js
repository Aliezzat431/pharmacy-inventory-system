import { NextResponse } from "next/server";

export function middleware(req) {
  const origin = req.headers.get("origin");
  console.log(`got`);
  
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Max-Age": "86400",
        "Access-Control-Allow-Credentials": "true",
      },
    });
  }

  const res = NextResponse.next();
  res.headers.set("Access-Control-Allow-Origin", origin || "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.headers.set("Access-Control-Allow-Credentials", "true");

  return res;
}

export const config = {
  matcher: "/api/:path*",
};
