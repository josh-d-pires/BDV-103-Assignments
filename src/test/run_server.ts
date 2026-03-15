import { afterEach, beforeEach } from 'vitest';
/* create run-server.ts to replace src/server.ts, which itself now exports the server function */
import server from '../server';
import { type AppBookDatabaseState } from '../books/book_database_access';
import { type AppWarehouseDatabaseState } from '../warehouse/warehouse_database_access';

export interface ServerTestContext {
  address: string
  state: AppBookDatabaseState & AppWarehouseDatabaseState
  closeServer: ()=> void
}
export default function (): void {
  beforeEach<ServerTestContext>(async (context) => {
    const { server: instance, state } = await server(0);
    const address = instance.address();
    if (typeof address === 'string') {
      context.address = `http://${address}`;
    } else if (address !== null) {
      context.address = `http://localhost:${address.port}`;
    } else {
      throw new Error('couldnt set up server');
    }
    context.state = state;
    context.closeServer = () => {
      instance.close();
    };
  });
  afterEach<ServerTestContext>(async (context) => {
    context.closeServer();
  });
}
