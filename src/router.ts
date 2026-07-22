import express from 'express';
import memberController from './controllers/member.controller';
import productController from './controllers/product.controller';
import orderController from './controllers/order.controller';

const router = express.Router();

/* member */
router.post('/member/signup', memberController.signup);
router.post('/member/login', memberController.login);
router.get('/member/detail', memberController.verifyAuth, memberController.getMemberDetail);
router.post('/member/update', memberController.verifyAuth, memberController.updateMember);

/* product */
router.get('/product/all', memberController.retrieveAuth, productController.getProducts);
router.get('/product/:id', memberController.retrieveAuth, productController.getProduct);

/* order */
router.post('/order/create', memberController.verifyAuth, orderController.createOrder);
router.get('/order/mine', memberController.verifyAuth, orderController.getMyOrders);
router.post('/order/update', memberController.verifyAuth, orderController.updateOrderStatus);

export default router;
