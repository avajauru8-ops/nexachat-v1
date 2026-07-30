import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    HAS_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });
}
