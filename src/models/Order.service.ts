import Order from '../schema/Order.model';
import OrderItem from '../schema/OrderItem.model';
import { Errors, HttpCode, Message } from '../libs/Errors';
import { shapeIntoMongooseObjectId } from '../libs/config';
import { Order as OrderType_, OrderInput, OrderInquiry, OrderUpdateInput } from '../libs/types/order';

class OrderService {
  /* SPA */
  public async createOrder(memberId: any, input: OrderInput): Promise<OrderType_> {
    const orderTotal = input.orderItems.reduce(
      (sum, item) => sum + item.itemPrice * item.itemQuantity,
      0,
    );

    try {
      const newOrder = await Order.create({
        memberId: shapeIntoMongooseObjectId(memberId),
        orderTotal,
      });

      const orderItems = input.orderItems.map((item) => ({
        ...item,
        orderId: newOrder._id,
      }));
      await OrderItem.insertMany(orderItems);

      return newOrder.toObject();
    } catch (err) {
      console.log('ERROR on createOrder: ', err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  public async getMyOrders(memberId: any, inquiry: OrderInquiry): Promise<OrderType_[]> {
    const { page, limit, orderStatus } = inquiry;
    const result = await Order.aggregate([
      {
        $match: {
          memberId: shapeIntoMongooseObjectId(memberId),
          orderStatus,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]).exec();
    return result;
  }

  public async updateOrderStatus(input: OrderUpdateInput): Promise<OrderType_> {
    const result = await Order.findByIdAndUpdate(
      shapeIntoMongooseObjectId(input.orderId),
      { $set: { orderStatus: input.orderStatus } },
      { new: true },
    ).exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.UPDATE_FAILED);
    return result.toObject();
  }

  /* SSR */
  public async getAllOrdersByAdmin(inquiry: OrderInquiry): Promise<OrderType_[]> {
    const { page, limit, orderStatus } = inquiry;
    const match: Record<string, any> = {};
    if (orderStatus) match.orderStatus = orderStatus;

    const result = await Order.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]).exec();
    return result;
  }

  public async updateOrderByAdmin(input: OrderUpdateInput): Promise<OrderType_> {
    const result = await Order.findByIdAndUpdate(
      shapeIntoMongooseObjectId(input.orderId),
      { $set: { orderStatus: input.orderStatus } },
      { new: true },
    ).exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.UPDATE_FAILED);
    return result.toObject();
  }
}

export default OrderService;
