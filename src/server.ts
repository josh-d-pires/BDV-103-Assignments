import Koa from 'koa';
import cors from '@koa/cors';
import qs from 'koa-qs';
import bodyParser from 'koa-bodyparser';
import Router from '@koa/router';
import { koaSwagger } from 'koa2-swagger-ui';
import { RegisterRoutes } from '../build/routes';
import swagger from '../build/swagger.json';
// import { createTextChangeRange } from 'typescript';
import { type AppBookDatabaseState, getBookDatabase} from './books/book_database_access';
import { type AppWarehouseDatabaseState, getDefaultWarehouseDatabase} from './warehouse/warehouse_database_access';

export default async function(port?: number) {
  const bookDb = await getBookDatabase('mcmasterful-books');
  const warehouseDb = await getDefaultWarehouseDatabase('mcmasterful-warehouse');

  const state: AppBookDatabaseState & AppWarehouseDatabaseState = {
    books: bookDb,
    warehouse: warehouseDb
  };
  
  const app = new Koa();
  
  app.use(async (ctx,next): Promise<void>=>{
    ctx.state=state;
    await next();
  });

  qs(app);
  app.use(cors());
  app.use(bodyParser());

  const tsoaRouter = new Router();
  RegisterRoutes(tsoaRouter);
  app.use(tsoaRouter.routes());
  app.use(tsoaRouter.allowedMethods());
  
  app.use(koaSwagger({
    routePrefix: '/docs',
    specPrefix: '/docs/spec',
    exposeSpec: true,
    swaggerOptions: {
      spec: swagger
    }
  }));
  
  
  return {
    server: app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
      console.log(`Swagger docs available at http://localhost:${port}/docs`);
    }),
    state
  };
}

