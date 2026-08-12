import mongoose from 'mongoose';
import { env } from '../src/config/env';
import { logger } from '../src/config/logger';
import rawFaqSeedData from '../src/data/faq.seed.json';
import type { FaqSection, FaqStatus } from '../src/libs/enums/faq.enum';
import Faq from '../src/schema/Faq.model';

interface SeedFaq {
  sourceKey: string;
  section: FaqSection;
  question: string;
  answer: string;
  position: number;
  status: FaqStatus;
}

const faqSeedData = rawFaqSeedData as { faqs: SeedFaq[] };

async function seedFaqs(): Promise<void> {
  await mongoose.connect(env.MONGO_URL);
  await Faq.createIndexes();
  const result = await Faq.bulkWrite(
    faqSeedData.faqs.map((faq) => ({
      updateOne: {
        filter: { sourceKey: faq.sourceKey },
        update: { $setOnInsert: faq },
        upsert: true,
      },
    })),
  );
  logger.info(
    { matched: result.matchedCount, migrated: result.upsertedCount },
    'Cavora FAQ migration completed',
  );
}

void seedFaqs()
  .catch((err: unknown) => {
    logger.error({ err }, 'Cavora FAQ migration failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
