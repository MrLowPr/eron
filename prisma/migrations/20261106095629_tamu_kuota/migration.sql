-- CreateTable
CREATE TABLE "GuestQuota" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestQuota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuestQuota_fingerprint_key" ON "GuestQuota"("fingerprint");

-- AddForeignKey
ALTER TABLE "GuestQuota" ADD CONSTRAINT "GuestQuota_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
