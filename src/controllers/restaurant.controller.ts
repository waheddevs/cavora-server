import { NextFunction, Request, Response } from 'express';
import MemberService from '../models/Member.service';
import ProductService from '../models/Product.service';
import { MemberType } from '../libs/enums/member.enum';
import { ProductCollection } from '../libs/enums/product.enum';

const memberService = new MemberService();
const productService = new ProductService();

const restaurantController: any = {};

/* SSR views */
restaurantController.renderHome = (req: Request, res: Response) => {
  console.log('renderHome');
  res.render('home', { member: req.session.member });
};

restaurantController.renderLogin = (req: Request, res: Response) => {
  console.log('renderLogin');
  res.render('login');
};

restaurantController.renderSignup = (req: Request, res: Response) => {
  console.log('renderSignup');
  res.render('signup');
};

/* SSR actions */
restaurantController.processLogin = async (req: Request, res: Response) => {
  try {
    console.log('processLogin');
    const member = await memberService.processLogin(req.body);
    req.session.member = member as any;
    req.session.save(() => res.redirect('/admin'));
  } catch (err) {
    console.log('ERROR on processLogin: ', err);
    res.send(`<script>alert("Login failed"); window.location.href="/admin/login";</script>`);
  }
};

restaurantController.processSignup = async (req: Request, res: Response) => {
  try {
    console.log('processSignup');
    const member = await memberService.processSignup(req.body);
    req.session.member = member as any;
    req.session.save(() => res.redirect('/admin'));
  } catch (err) {
    console.log('ERROR on processSignup: ', err);
    res.send(`<script>alert("Signup failed"); window.location.href="/admin/signup";</script>`);
  }
};

restaurantController.logout = (req: Request, res: Response) => {
  console.log('logout');
  req.session.destroy(() => res.redirect('/admin/login'));
};

restaurantController.renderProducts = async (req: Request, res: Response) => {
  try {
    console.log('renderProducts');
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const products = await productService.getProductsByAdmin({ page, limit });
    res.render('products', { products, page, limit, collections: Object.values(ProductCollection) });
  } catch (err) {
    console.log('ERROR on renderProducts: ', err);
    res.send(`<script>alert("Could not load products"); window.location.href="/admin";</script>`);
  }
};

restaurantController.createProduct = async (req: Request, res: Response) => {
  try {
    console.log('createProduct');
    const images = ((req.files as Express.Multer.File[]) ?? []).map((file) =>
      `uploads/product/${file.filename}`.replace(/\\/g, '/'),
    );
    await productService.createProductByAdmin({
      ...req.body,
      productPrice: Number(req.body.productPrice),
      productLeftCount: Number(req.body.productLeftCount),
      productImages: images,
    });
    res.redirect('/admin/products');
  } catch (err) {
    console.log('ERROR on createProduct: ', err);
    res.send(`<script>alert("Could not create product"); window.location.href="/admin/products";</script>`);
  }
};

restaurantController.updateProduct = async (req: Request, res: Response) => {
  try {
    console.log('updateProduct');
    await productService.updateProductByAdmin({
      ...req.body,
      _id: req.body._id,
    });
    res.redirect('/admin/products');
  } catch (err) {
    console.log('ERROR on updateProduct: ', err);
    res.send(`<script>alert("Could not update product"); window.location.href="/admin/products";</script>`);
  }
};

restaurantController.renderUsers = async (req: Request, res: Response) => {
  try {
    console.log('renderUsers');
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const members = await memberService.getAllMembersByAdmin({ page, limit });
    res.render('users', { members, page, limit });
  } catch (err) {
    console.log('ERROR on renderUsers: ', err);
    res.send(`<script>alert("Could not load users"); window.location.href="/admin";</script>`);
  }
};

restaurantController.updateUser = async (req: Request, res: Response) => {
  try {
    console.log('updateUser');
    await memberService.updateMemberByAdmin(req.body);
    res.redirect('/admin/users');
  } catch (err) {
    console.log('ERROR on updateUser: ', err);
    res.send(`<script>alert("Could not update user"); window.location.href="/admin/users";</script>`);
  }
};

/* middleware */
restaurantController.verifyRestaurant = (req: Request, res: Response, next: NextFunction) => {
  if (req.session.member && req.session.member.memberType === MemberType.RESTAURANT) {
    next();
  } else {
    res.send(`<script>alert("Please log in as a restaurant owner"); window.location.href="/admin/login";</script>`);
  }
};

export default restaurantController;
