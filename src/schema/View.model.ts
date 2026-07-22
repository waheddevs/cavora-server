import { Schema, model } from 'mongoose';
import { ViewGroup } from '../libs/enums/view.enum';

const viewSchema = new Schema(
  {
    viewGroup: {
      type: String,
      enum: ViewGroup,
      required: true,
    },
    viewRefId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
  },
  { timestamps: true, collection: 'views' },
);

viewSchema.index({ viewGroup: 1, viewRefId: 1, memberId: 1 }, { unique: true });

export default model('View', viewSchema);
