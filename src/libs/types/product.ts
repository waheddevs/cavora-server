import { Types } from 'mongoose';
import { ProductCollection, ProductStatus } from '../enums/product.enum';

export interface Product {
  _id: Types.ObjectId;
  productStatus: ProductStatus;
  productCollection: ProductCollection;
  productName: string;
  productPrice: number;
  productLeftCount: number;
  productDesc?: string;
  productImages: string[];
  productViews: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductInput {
  productCollection: ProductCollection;
  productName: string;
  productPrice: number;
  productLeftCount: number;
  productDesc?: string;
  productImages: string[];
}

export interface ProductUpdateInput {
  _id: Types.ObjectId;
  productStatus?: ProductStatus;
  productCollection?: ProductCollection;
  productName?: string;
  productPrice?: number;
  productLeftCount?: number;
  productDesc?: string;
  productImages?: string[];
}

export interface ProductInquiry {
  page: number;
  limit: number;
  order?: string;
  productCollection?: ProductCollection;
  search?: string;
}
