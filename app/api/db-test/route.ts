
import { NextResponse } from "next/server";
import { neonSql } from "@/index";

export async function GET() {
  try {
    const [result] = await neonSql`
      SELECT
        NOW() AS server_time,
        current_database() AS database_name
    `;

    return NextResponse.json({
      success: true,
      message: "Neon database connected successfully!",
      database: result.database_name,
      serverTime: result.server_time,
    });
  } catch (error) {
    console.error("Database connection error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Neon database connection failed.",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}