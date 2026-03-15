import { ObjectId } from 'mongodb';
import { type BookDatabaseAccessor, getBookDatabase } from '../db';
import { type BookID, type Book } from './books.route';
import { generateId, seedBookDatabase } from '../test/utilities';

export type DeleteResult =
  | { success: true }
  | { success: false; error: 'not_found' | 'invalid_id' | 'server_error' };

export async function deleteBook(
  id: BookID,
  { books }: BookDatabaseAccessor
): Promise<DeleteResult> {
  try {
    if (id.length !== 24) {
      return { success: false, error: 'invalid_id' };
    }

    const objectId = ObjectId.createFromHexString(id);
    const result = await books.deleteOne({ _id: { $eq: objectId } });

    if (result.deletedCount === 1) {
      return { success: true };
    } else {
      return { success: false, error: 'not_found' };
    }
  } catch {
    return { success: false, error: 'server_error' };
  }
}

if (import.meta.vitest !== undefined) {
  const { test, expect } = import.meta.vitest;

  test('can delete an existing book', async () => {
    const db = getBookDatabase();
    const id: BookID = generateId();
    const testBook: Book = {
      id,
      name: 'Book to Delete',
      author: 'Author',
      description: 'Description',
      price: 10.00,
      image: 'http://example.com/book.jpg'
    };
    await seedBookDatabase(db, { books: { [id]: testBook } });

    const result = await deleteBook(id, db);

    expect(result.success).toBe(true);
  });

  test('deleting a non-existent book returns not_found', async () => {
    const db = getBookDatabase();
    const id: BookID = generateId();

    const result = await deleteBook(id, db);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('not_found');
    }
  });

  test('deleting with invalid id returns invalid_id', async () => {
    const db = getBookDatabase();

    const result = await deleteBook('invalid-id', db);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('invalid_id');
    }
  });

  test('book is actually removed from database after delete', async () => {
    const db = getBookDatabase();
    const id: BookID = generateId();
    const testBook: Book = {
      id,
      name: 'Book to Delete',
      author: 'Author',
      description: 'Description',
      price: 10.00,
      image: 'http://example.com/book.jpg'
    };
    await seedBookDatabase(db, { books: { [id]: testBook } });

    await deleteBook(id, db);

    // Try to find the book - should be null
    const found = await db.books.findOne({ _id: ObjectId.createFromHexString(id) });
    expect(found).toBeNull();
  });
}
