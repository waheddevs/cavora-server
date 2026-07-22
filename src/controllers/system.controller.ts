import type { NextFunction, Request, Response } from 'express';
import { HttpCode } from '../common/errors/error-codes';
import SystemService from '../models/System.service';

const systemService = new SystemService();

const systemController = {
  async getHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getHealth');
      const result = systemService.getHealth();
      const status = result.status === 'ok' ? HttpCode.OK : HttpCode.SERVICE_UNAVAILABLE;
      res.status(status).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getHealth');
      next(err);
    }
  },
};

export default systemController;
