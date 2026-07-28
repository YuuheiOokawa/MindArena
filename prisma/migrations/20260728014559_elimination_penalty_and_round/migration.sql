-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PointReason" ADD VALUE 'ROUND_1_ELIMINATION';
ALTER TYPE "PointReason" ADD VALUE 'ROUND_2_ELIMINATION';
ALTER TYPE "PointReason" ADD VALUE 'QUARTERFINAL_ELIMINATION';

-- AlterTable
ALTER TABLE "point_transactions" ADD COLUMN     "round" INTEGER;
