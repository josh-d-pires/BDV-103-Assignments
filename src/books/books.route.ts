import {
  Controller,
  Get,
  Post,
  Delete,
  Route,
  Path,
  Body,
  Request,
  SuccessResponse,
  Response
} from 'tsoa';
import { ObjectId } from 'mongodb';
import type { Context } from 'koa';
import { getBookDatabase, type BookDatabaseAccessor } from '../db';
import { listBooks as listBooksLogic } from './list';
import { createOrUpdateBook as createOrUpdateBookLogic } from './create';
import { deleteBook as deleteBookLogic } from './delete';

// Re-export for backward compatibility
export { listBooks } from './list';
export { createBook, updateBook, createOrUpdateBook } from './create';
export { deleteBook } from './delete';

/**
 * Book ID type (MongoDB ObjectId hex string)
 */
export type BookID = string;

/**
 * Book entity
 */
export interface Book {
  /** Unique identifier for the book */
  id?: BookID;
  /** Title of the book */
  name: string;
  /** Author of the book */
  author: string;
  /** Description of the book */
  description: string;
  /** Price in dollars */
  price: number;
  /** URL to the book cover image */
  image: string;
}

/**
 * Filter for listing books
 */
export interface BookFilter {
  /** Minimum price */
  from?: number;
  /** Maximum price */
  to?: number;
  /** Filter by book name (partial match) */
  name?: string;
  /** Filter by author name (partial match) */
  author?: string;
}

/**
 * Response when creating or updating a book
 */
export interface BookIdResponse {
  id: string;
}

/**
 * Request body for creating or updating a book
 */
export interface CreateOrUpdateBookRequest {
  /** ID for update, omit for create */
  id?: string;
  /** Title of the book */
  name: string;
  /** Price in dollars */
  price: number;
  /** Description of the book */
  description: string;
  /** Author of the book */
  author: string;
  /** URL to the book cover image */
  image: string;
}

/**
 * Helper function to get a book by ID
 */
export async function getBook(id: BookID, { books }: BookDatabaseAccessor): Promise<Book | false> {
  if (id.length !== 24) {
    console.error('Failed with id: ', id);
    return false;
  }
  const result = await books.findOne({ _id: ObjectId.createFromHexString(id.trim()) });
  if (result === null) {
    return false;
  }
  const book: Book = {
    id,
    name: result.name,
    author: result.author,
    description: result.description,
    price: result.price,
    image: result.image
  };
  return book;
}









/**
 * Controller for book operations
 */
@Route('books')
export class BooksController extends Controller {
  /**
   * List all books with optional filtering
   * @returns Array of books matching the filters
   */
  @Get()
  public async listBooks(
    @Request() ctx: Context
  ): Promise<Book[]> {
    // Extract filters from parsed query (koa-qs parses complex query strings)
    const queryParams = ctx.query as { filters?: BookFilter[] };
    return listBooksLogic({ filters: queryParams.filters }, getBookDatabase());
  }

  /**
   * Get a specific book by ID
   * @param id The book's unique identifier
   * @returns The book if found
   */
  @Get('{id}')
  @Response(404, 'Book not found')
  public async getBook(
    @Path() id: string
  ): Promise<Book> {
    const result = await getBook(id, getBookDatabase());

    if (result === false) {
      this.setStatus(404);
      throw new Error('Book not found');
    }

    return result;
  }

  /**
   * Create a new book or update an existing one
   * @param requestBody The book data to create or update
   * @returns The ID of the created/updated book
   */
  @Post()
  @SuccessResponse(200, 'Book created or updated')
  @Response(404, 'Book not found for update')
  @Response(500, 'Server error')
  public async createOrUpdateBook(
    @Body() requestBody: CreateOrUpdateBookRequest
  ): Promise<BookIdResponse> {
    const result = await createOrUpdateBookLogic(requestBody, getBookDatabase());

    if (result.success) {
      return { id: result.id };
    } else {
      if (result.error === 'not_found') {
        this.setStatus(404);
        throw new Error('Book not found');
      } else {
        this.setStatus(500);
        throw new Error('Server error');
      }
    }
  }

  /**
   * Delete a book by ID
   * @param id The book's unique identifier
   */
  @Delete('{id}')
  @SuccessResponse(200, 'Book deleted')
  @Response(404, 'Book not found')
  public async deleteBook(
    @Path() id: string
  ): Promise<void> {
    const result = await deleteBookLogic(id, getBookDatabase());

    if (!result.success) {
      this.setStatus(404);
      throw new Error('Book not found');
    }
  }
}
