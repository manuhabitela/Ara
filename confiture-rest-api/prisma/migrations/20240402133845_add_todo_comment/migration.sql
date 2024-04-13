-- AlterTable
ALTER TABLE "CriterionResult" ADD COLUMN     "todoComment" TEXT;
-- AlterEnum
ALTER TYPE "CriterionResultStatus" ADD VALUE 'TODO';
