import mongoose, { Schema } from 'mongoose';
import type { Wishlist } from '../libs/types/wishlist';

const wishlistSchema = new Schema<Wishlist>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    tourId: {
      type: Number,
      ref: 'Tour',
      required: true,
      min: 1,
    },
  },
  { timestamps: true, collection: 'wishlists' },
);

wishlistSchema.index({ memberId: 1, tourId: 1 }, { unique: true });
wishlistSchema.index({ memberId: 1, createdAt: -1 });

export default mongoose.model<Wishlist>('Wishlist', wishlistSchema);
