import {
  Controller,
  Get,
  Put,
  Post,
  Route,
  Path,
  Body,
  SuccessResponse,
  Response
} from 'tsoa';
import { getDefaultWarehouseData, type WarehouseData } from './warehouse_data';
import { type BookID } from '../books/books.route';
// import { isArray } from 'node:util';

// Re-export BookID for convenience
export type { BookID } from '../books/books.route';

/**
 * Shelf ID type
 */
export type ShelfId = string;

/**
 * Order ID type
 */
export type OrderId = string;

/**
 * Order listing response
 */
export interface OrderListItem {
  orderId: OrderId;
  books: Record<BookID, number>;
}

/**
 * Request body for placing an order
 */
export interface PlaceOrderRequest {
  order: BookID[];
}

/**
 * Request body for fulfilling an order
 */
export interface FulfilBookItem {
  book: BookID;
  shelf: ShelfId;
  numberOfBooks: number;
}

// Helper functions extracted from original routes

async function placeBooksOnShelf(
  data: WarehouseData,
  bookId: BookID,
  numberOfBooks: number,
  shelf: ShelfId
): Promise<void> {
  if (numberOfBooks < 0) {
    throw new Error('Can\'t place less than 0 books on a shelf');
  }
  const current = (await data.getCopiesOnShelf(bookId, shelf)) ?? 0;
  await data.placeBookOnShelf(bookId, shelf, current + numberOfBooks);
}

async function getBookInfo(
  data: WarehouseData,
  bookId: BookID
): Promise<Record<ShelfId, number>> {
  const copies = await data.getCopies(bookId);
  const response: Record<ShelfId, number> = {};

  for (const shelf of Object.keys(copies)) {
    const number = copies[shelf];
    if (number > 0) {
      response[shelf] = number;
    }
  }

  return response;
}

async function placeOrder(data: WarehouseData, books: BookID[]): Promise<OrderId> {
  const order: Record<BookID, number> = {};

  for (const book of books) {
    order[book] = 1 + (order[book] ?? 0);
  }

  return await data.placeOrder(order);
}

async function listOrders(
  data: WarehouseData
): Promise<OrderListItem[]> {
  return await data.listOrders();
}

async function fulfilOrder(
  data: WarehouseData,
  orderId: OrderId,
  booksFulfilled: FulfilBookItem[]
): Promise<void> {
  const order = await data.getOrder(orderId);
  if (order === false) {
    throw new Error('no such order');
  }

  const removedCount: Record<BookID, number> = {};
  for (const { book, numberOfBooks } of booksFulfilled) {
    if (!(book in order)) {
      throw new Error('one of the books is not in the order');
    }
    removedCount[book] = numberOfBooks + (removedCount[book] ?? 0);
  }

  for (const book of Object.keys(order)) {
    if (removedCount[book] !== order[book]) {
      throw new Error('incorrect number of books');
    }
  }

  const processedFulfilment = await Promise.all(
    booksFulfilled.map(async ({ book, shelf, numberOfBooks }) => {
      const currentCopiesOnShelf = await data.getCopiesOnShelf(book, shelf);
      const newCopiesOnShelf = currentCopiesOnShelf - numberOfBooks;
      if (newCopiesOnShelf < 0) {
        throw new Error('not enough copies on given shelves');
      }
      return { book, shelf, numberOfBooks: newCopiesOnShelf };
    })
  );

  await data.removeOrder(orderId);
  await Promise.all(
    processedFulfilment.map(async ({ book, shelf, numberOfBooks }) => {
      await data.placeBookOnShelf(book, shelf, numberOfBooks);
    })
  );
}






/**
 * Controller for warehouse operations
 */
@Route('warehouse')
export class WarehouseController extends Controller {
  /**
   * Get book inventory information across all shelves
   * @param book The book ID
   * @returns Record of shelf IDs to copy counts
   */
  @Get('{book}')
  public async getBookInfo(
    @Path() book: string
  ): Promise<Record<ShelfId, number>> {
    try {
      const data = await getDefaultWarehouseData();
      return await getBookInfo(data, book);
    } catch {
      this.setStatus(500);
      throw new Error('Server error');
    }
  }

  /**
   * Place books on a shelf
   * @param book The book ID
   * @param shelf The shelf ID
   * @param number Number of books to place
   */
  @Put('{book}/{shelf}/{number}')
  @SuccessResponse(200, 'Books placed on shelf')
  @Response(500, 'Server error')
  public async placeBooksOnShelf(
    @Path() book: string,
    @Path() shelf: string,
    @Path() number: number
  ): Promise<void> {
    try {
      const data = await getDefaultWarehouseData();
      await placeBooksOnShelf(data, book, number, shelf);
    } catch {
      this.setStatus(500);
      throw new Error('Server error');
    }
  }
}

/**
 * Controller for order operations
 */
@Route('order')
export class OrderController extends Controller {
  /**
   * List all orders
   * @returns Array of orders with their books
   */
  @Get()
  @SuccessResponse(201, 'Orders listed')
  public async listOrders(): Promise<OrderListItem[]> {
    try {
      const data = await getDefaultWarehouseData();
      const result = await listOrders(data);
      this.setStatus(201);
      return result;
    } catch {
      this.setStatus(500);
      throw new Error('Server error');
    }
  }

  /**
   * Place a new order
   * @param requestBody The order request containing book IDs
   * @returns The order ID
   */
  @Post()
  @SuccessResponse(201, 'Order placed')
  @Response(500, 'Server error')
  public async placeOrder(
    @Body() requestBody: PlaceOrderRequest 
  ): Promise<string> {
    try {
      const data = await getDefaultWarehouseData();
      const orderId = await placeOrder(data, requestBody.order);
      this.setStatus(201);
      return orderId;
    } catch {
      this.setStatus(500);
      throw new Error('Server error');
    }
  }
}

/**
 * Controller for order fulfillment operations
 */
@Route('fulfil')
export class FulfilController extends Controller {
  /**
   * Fulfil an order by removing books from shelves
   * @param order The order ID
   * @param requestBody Array of books to fulfil with shelf locations
   */
  @Put('{order}')
  @SuccessResponse(200, 'Order fulfilled')
  @Response(500, 'Server error')
  public async fulfilOrder(
    @Path() order: string,
    @Body() requestBody: FulfilBookItem[]
  ): Promise<void> {
    try {
      const data = await getDefaultWarehouseData();
      await fulfilOrder(data, order, requestBody);
    } catch {
      this.setStatus(500);
      throw new Error('Server error');
    }
  }
}
