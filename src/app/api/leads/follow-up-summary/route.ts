import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const startOfTomorrow = new Date(startOfToday); startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const sevenDaysOut = new Date(startOfToday); sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);

  const [overdue, dueToday, upcoming] = await Promise.all([
    prisma.lead.count({ where: { followUpDate: { lt: startOfToday }, status: "contacted" } }),
    prisma.lead.count({ where: { followUpDate: { gte: startOfToday, lte: endOfToday }, status: "contacted" } }),
    prisma.lead.count({ where: { followUpDate: { gte: startOfTomorrow, lt: sevenDaysOut }, status: "contacted" } }),
  ]);

  return NextResponse.json({ overdue, dueToday, upcoming });
}
