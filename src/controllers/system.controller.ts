import type { NextFunction, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { HttpCode } from '../common/errors/error-codes';
import SystemService from '../models/System.service';

const systemService = new SystemService();

const systemController = {
  async getHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getHealth');
      const result = systemService.getHealth();
      const status = result.status === 'ok' ? HttpCode.OK : HttpCode.SERVICE_UNAVAILABLE;
      res.setHeader('Cache-Control', 'no-store');
      res.status(status).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getHealth');
      next(err);
    }
  },

  async getDocs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getDocs');
      const result = systemService.getOpenApiDocument();
      const html = swaggerUi
        .generateHTML(result, {
          customCss: '.swagger-ui .topbar { display: none }',
          customSiteTitle: 'Cavora API Documentation',
          swaggerOptions: {
            displayRequestDuration: true,
            persistAuthorization: false,
          },
        })
        .replaceAll('href="./', 'href="/cavora/docs/')
        .replaceAll('src="./', 'src="/cavora/docs/');

      res.setHeader('Cache-Control', 'public, max-age=300');
      res.status(HttpCode.OK).type('html').send(html);
    } catch (err) {
      req.log.error({ err }, 'ERROR on getDocs');
      next(err);
    }
  },

  async getOpenApiDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getOpenApiDocument');
      const result = systemService.getOpenApiDocument();
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.status(HttpCode.OK).json(result);
    } catch (err) {
      req.log.error({ err }, 'ERROR on getOpenApiDocument');
      next(err);
    }
  },
};

export default systemController;
