import { PrismaClient } from "@prisma/client";
import catalog from "../src/lib/static-catalog.json";

const prisma = new PrismaClient();

async function main() {
  for (const category of catalog.categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      create: category,
      update: { name: category.name, sortOrder: category.sortOrder },
    });
  }

  for (const product of catalog.products) {
    const { category, variants, batchTests: _batchTests, ...fields } = product;
    const categoryId = category.id;
    const variantRows = variants.map((entry) => {
      const variant = entry as typeof entry & { images?: string[] };
      const { id: _id, productId: _productId, images: _images, ...row } = variant;
      return { ...row, sizeMl: Number(row.sizeMl), isActive: true };
    });
    await prisma.product.upsert({
      where: { slug: product.slug },
      create: {
        ...fields,
        categoryId,
        variants: { create: variantRows },
      },
      update: {
        ...fields,
        categoryId,
        variants: { deleteMany: {}, create: variantRows },
      },
    });
  }

  console.log(`Seeded ${catalog.products.length} peptide products.`);
}

main().finally(() => prisma.$disconnect());
