import express from 'express';
import restaurantController from './controllers/restaurant.controller';
import { makeUploader } from './libs/utlis/uploader';

const router = express.Router();
const productUploader = makeUploader('product');

router.get('/', restaurantController.verifyRestaurant, restaurantController.renderHome);

router.get('/login', restaurantController.renderLogin);
router.post('/login', restaurantController.processLogin);

router.get('/signup', restaurantController.renderSignup);
router.post('/signup', restaurantController.processSignup);

router.get('/logout', restaurantController.logout);

router.get(
  '/products',
  restaurantController.verifyRestaurant,
  restaurantController.renderProducts,
);
router.post(
  '/products/create',
  restaurantController.verifyRestaurant,
  productUploader.array('productImages'),
  restaurantController.createProduct,
);
router.post(
  '/products/update',
  restaurantController.verifyRestaurant,
  restaurantController.updateProduct,
);

router.get('/users', restaurantController.verifyRestaurant, restaurantController.renderUsers);
router.post('/users/update', restaurantController.verifyRestaurant, restaurantController.updateUser);

export default router;
