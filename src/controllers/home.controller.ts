import type { NextFunction, Request, Response } from 'express';
import { HttpCode } from '../common/errors/error-codes';
import HomeService from '../models/Home.service';

const homeService = new HomeService();

const homeController = {
  async getHome(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getHome');
      const result = await homeService.getHome();
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getHome');
      next(err);
    }
  },
};

export default homeController;
