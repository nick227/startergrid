import type { PrismaClient } from '@prisma/client';
import type { BusinessCategoryId } from '@auto-dealer/category-schemas';
import { getCategoryInventorySchema } from '@auto-dealer/category-schemas';

export type CreateCategoryItemInput = {
  dealershipId: string;
  categoryId: BusinessCategoryId;
  /** The ISBN, ASIN, or other external identifier — may be absent for SKU-only items. */
  primaryIdentifier?: string;
  /** Dealer's internal stock number / SKU. Auto-generated if absent. */
  stockNumber?: string;
  priceCents?: number;
  condition?: string;
  /** All category-specific fields (title, author, format, etc.). */
  data: Record<string, unknown>;
  /** OperatorAccount.id if a SUPER_ADMIN is acting on behalf of the dealer. */
  adminActorId?: string;
};

export type CreateCategoryItemResult = {
  itemId: string;
  stockNumber: string;
};

function generateStockNumber(categoryId: string): string {
  const prefix = categoryId.slice(0, 3).toUpperCase();
  const suffix = Date.now().toString(36).toUpperCase().slice(-6);
  return `${prefix}-${suffix}`;
}

function resolveCondition(
  input: CreateCategoryItemInput,
): string | null {
  if (input.condition) return input.condition;
  const schema = getCategoryInventorySchema(input.categoryId);
  if (schema?.validConditionValues?.length === 1) {
    return schema.validConditionValues[0] as string;
  }
  return null;
}

export async function createCategoryItemShell(
  prisma: PrismaClient,
  input: CreateCategoryItemInput,
): Promise<CreateCategoryItemResult> {
  const stockNumber = input.stockNumber ?? generateStockNumber(input.categoryId);
  const condition = resolveCondition(input);

  const item = await prisma.categoryInventoryItem.create({
    data: {
      dealershipId:      input.dealershipId,
      categoryId:        input.categoryId,
      primaryIdentifier: input.primaryIdentifier ?? null,
      stockNumber,
      priceCents:        input.priceCents ?? null,
      condition,
      listingStatus:     'DRAFT',
      data:              input.data as import('@prisma/client').Prisma.InputJsonValue,
    },
    select: { id: true, stockNumber: true },
  });

  if (input.adminActorId) {
    await prisma.adminAuditLog.create({
      data: {
        action:     'CREATE_CATEGORY_ITEM',
        actorId:    input.adminActorId,
        actorEmail: '',
        detail: {
          dealershipId: input.dealershipId,
          categoryId:   input.categoryId,
          itemId:       item.id,
          stockNumber,
        } as import('@prisma/client').Prisma.InputJsonValue,
      },
    });
  }

  return { itemId: item.id, stockNumber };
}
