import Koa from 'koa';
import cors from '@koa/cors';
import qs from 'koa-qs';
import bodyParser from 'koa-bodyparser';
import Router from '@koa/router';
import { koaSwagger } from 'koa2-swagger-ui';
import { RegisterRoutes } from '../build/routes.js';
import swagger from '../build/swagger.json';

const app = new Koa();

// We use koa-qs to enable parsing complex query strings, like our filters.
qs(app);

// And we add cors to ensure we can access our API from the mcmasterful-books website
app.use(cors());

// Body parser for tsoa routes
app.use(bodyParser());

// Create a router for tsoa routes
const tsoaRouter = new Router();
RegisterRoutes(tsoaRouter);
app.use(tsoaRouter.routes());
app.use(tsoaRouter.allowedMethods());

// Swagger UI documentation
app.use(koaSwagger({
  routePrefix: '/docs',
  specPrefix: '/docs/spec',
  exposeSpec: true,
  swaggerOptions: {
    spec: swagger
  }
}));

app.listen(3000, () => {
  console.log('Server listening on port 3000');
  console.log('Swagger docs available at http://localhost:3000/docs');
});
