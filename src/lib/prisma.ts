import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@/generated/prisma/client"

if (typeof window !== "undefined") {
  throw new Error("Prisma is available only on the server.")
}

const globalPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient }

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to connect to PostgreSQL.")
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

export const prisma = globalPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalPrisma.prisma = prisma
}
