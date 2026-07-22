import Product from '../schema/Product.model';
import { Errors, HttpCode, Message } from '../libs/Errors';
import { shapeIntoMongooseObjectId } from '../libs/config';
import { ProductStatus } from '../libs/enums/product.enum';
import {
  Product as ProductType_,
  ProductInput,
  ProductInquiry,
  ProductUpdateInput,
} from '../libs/types/product';

class ProductService {
  /* SPA */
  public async getProducts(inquiry: ProductInquiry): Promise<ProductType_[]> {
    const { page, limit, productCollection, search } = inquiry;
    const match: Record<string, any> = { productStatus: ProductStatus.PROCESS };
    if (productCollection) match.productCollection = productCollection;
    if (search) match.productName = { $regex: search, $options: 'i' };

    const result = await Product.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]).exec();
    return result;
  }

  public async getProduct(productId: any): Promise<ProductType_> {
    const result = await Product.findOne({
      _id: shapeIntoMongooseObjectId(productId),
      productStatus: ProductStatus.PROCESS,
    }).exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result.toObject();
  }

  /* SSR */
  public async createProductByAdmin(input: ProductInput): Promise<ProductType_> {
    try {
      const result = await Product.create(input);
      return result.toObject();
    } catch (err) {
      console.log('ERROR on createProductByAdmin: ', err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  public async getProductsByAdmin(inquiry: ProductInquiry): Promise<ProductType_[]> {
    const { page, limit, productCollection, search } = inquiry;
    const match: Record<string, any> = {};
    if (productCollection) match.productCollection = productCollection;
    if (search) match.productName = { $regex: search, $options: 'i' };

    const result = await Product.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]).exec();
    return result;
  }

  public async updateProductByAdmin(input: ProductUpdateInput): Promise<ProductType_> {
    const result = await Product.findByIdAndUpdate(
      shapeIntoMongooseObjectId(input._id),
      { $set: input },
      { new: true },
    ).exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.UPDATE_FAILED);
    return result.toObject();
  }
}

export default ProductService;
