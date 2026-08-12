import mongoose, { Schema } from 'mongoose';
import { FaqSection, FaqStatus } from '../libs/enums/faq.enum';
import type { Faq } from '../libs/types/faq';

const faqSchema = new Schema<Faq>(
  {
    sourceKey: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    section: {
      type: String,
      enum: Object.values(FaqSection),
      required: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5_000,
    },
    position: {
      type: Number,
      required: true,
      min: 1,
      max: 999,
    },
    status: {
      type: String,
      enum: Object.values(FaqStatus),
      default: FaqStatus.DRAFT,
    },
  },
  { timestamps: true, collection: 'faqs' },
);

faqSchema.index({ sourceKey: 1 }, { unique: true, sparse: true });
faqSchema.index({ status: 1, section: 1, position: 1 });
faqSchema.index({ section: 1, position: 1, createdAt: 1 });
faqSchema.index({ question: 'text', answer: 'text' }, { weights: { question: 5, answer: 2 } });

export default mongoose.model<Faq>('Faq', faqSchema);
