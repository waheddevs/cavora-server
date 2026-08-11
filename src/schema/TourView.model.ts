import mongoose, { Schema, type Types } from 'mongoose';

interface TourView {
  _id: Types.ObjectId;
  tourId: number;
  viewerKeyHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const tourViewSchema = new Schema<TourView>(
  {
    tourId: {
      type: Number,
      required: true,
      min: 1,
      ref: 'Tour',
    },
    viewerKeyHash: {
      type: String,
      required: true,
      minlength: 64,
      maxlength: 64,
    },
  },
  { timestamps: true, collection: 'tour_views' },
);

tourViewSchema.index({ tourId: 1, viewerKeyHash: 1 }, { unique: true });

export default mongoose.model<TourView>('TourView', tourViewSchema);
