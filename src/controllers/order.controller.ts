import { Request, Response } from 'express';
import OrderService from '../models/Order.service';
import { Errors, HttpCode } from '../libs/Errors';
import { OrderStatus } from '../libs/enums/order.enum';

const orderService = new OrderService();

const orderController: any = {};

orderController.createOrder = async (req: Request, res: Response) => {
  try {
    console.log('createOrder');
    const result = await orderService.createOrder(req.member?._id, req.body);
    res.status(HttpCode.CREATED).json(result);
  } catch (err) {
    console.log('ERROR on createOrder: ', err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

orderController.getMyOrders = async (req: Request, res: Response) => {
  try {
    console.log('getMyOrders');
    const { page = 1, limit = 10, orderStatus = OrderStatus.PROCESS } = req.query;
    const result = await orderService.getMyOrders(req.member?._id, {
      page: Number(page),
      limit: Number(limit),
      orderStatus: orderStatus as OrderStatus,
    });
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log('ERROR on getMyOrders: ', err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

orderController.updateOrderStatus = async (req: Request, res: Response) => {
  try {
    console.log('updateOrderStatus');
    const result = await orderService.updateOrderStatus(req.body);
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log('ERROR on updateOrderStatus: ', err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

export default orderController;
