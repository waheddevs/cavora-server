import { Schema, model } from 'mongoose';
import { OrderStatus } from '../libs/enums/order.enum';

const orderSchema = new Schema(
  {
    orderTotal: {
      type: Number,
      required: true,
      default: 0,
    },
    orderDelivery: {
      type: Number,
      required: true,
      default: 0,
    },
    orderStatus: {
      type: String,
      enum: OrderStatus,
      default: OrderStatus.PAUSE,
    },
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
  },
  { timestamps: true, collection: 'orders' },
);

export default model('Order', orderSchema);
