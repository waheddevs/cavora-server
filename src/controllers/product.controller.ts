import { Request, Response } from 'express';
import ProductService from '../models/Product.service';
import ViewService from '../models/View.service';
import { Errors, HttpCode } from '../libs/Errors';
import { ViewGroup } from '../libs/enums/view.enum';

const productService = new ProductService();
const viewService = new ViewService();

const productController: any = {};

productController.getProducts = async (req: Request, res: Response) => {
  try {
    console.log('getProducts');
    const { page = 1, limit = 12, order, productCollection, search } = req.query;
    const result = await productService.getProducts({
      page: Number(page),
      limit: Number(limit),
      order: order as string,
      productCollection: productCollection as any,
      search: search as string,
    });
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log('ERROR on getProducts: ', err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

productController.getProduct = async (req: Request, res: Response) => {
  try {
    console.log('getProduct');
    const result = await productService.getProduct(req.params.id);

    if (req.member) {
      await viewService.recordView({
        viewGroup: ViewGroup.PRODUCT,
        viewRefId: result._id,
        memberId: req.member._id,
      });
    }

    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log('ERROR on getProduct: ', err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

export default productController;
