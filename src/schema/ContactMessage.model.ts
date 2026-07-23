import mongoose, { Schema } from 'mongoose';
import { ContactMessageStatus } from '../libs/enums/engagement.enum';
import type { ContactMessage } from '../libs/types/engagement';

const contactMessageSchema = new Schema<ContactMessage>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10_000,
    },
    status: {
      type: String,
      enum: Object.values(ContactMessageStatus),
      default: ContactMessageStatus.NEW,
    },
    resolvedAt: Date,
  },
  { timestamps: true, collection: 'contact_messages' },
);

contactMessageSchema.index({ status: 1, createdAt: -1 });
contactMessageSchema.index({ email: 1, createdAt: -1 });
contactMessageSchema.index({ memberId: 1, createdAt: -1 });

export default mongoose.model<ContactMessage>('ContactMessage', contactMessageSchema);
