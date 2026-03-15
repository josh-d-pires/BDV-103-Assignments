import { MongoMemoryServer } from 'mongodb-memory-server';
import { beforeAll, afterAll } from 'vitest';

let mongoServer: MongoMemoryServer | null = null;

beforeAll(async () => {
  // Create MongoDB Memory Server - let it use the default/latest version
  mongoServer = await MongoMemoryServer.create();

  const uri = mongoServer.getUri();
  // Store the URI globally for tests to use
  (global as Record<string, unknown>).MONGO_URI = uri.slice(0, uri.lastIndexOf('/'));
}, 120000); // 2 minute timeout for setup

afterAll(async () => {
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
});
