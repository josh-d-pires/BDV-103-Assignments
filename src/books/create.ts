import { ObjectId } from 'mongodb';
import { type BookDatabaseAccessor, getBookDatabase } from '../db';
import { type BookID, type Book } from './books.route';
import { generateId, seedBookDatabase } from '../test/utilities';

export interface CreateBookInput {
  name: string;
  price: number;
  description: string;
  author: string;
  image: string;
}

export interface UpdateBookInput extends CreateBookInput {
  id: BookID;
}

export type CreateOrUpdateResult =
  | { success: true; id: BookID }
  | { success: false; error: 'not_found' | 'server_error' };

export async function createBook(
  input: CreateBookInput,
  { books }: BookDatabaseAccessor
): Promise<CreateOrUpdateResult> {
  try {
    const result = await books.insertOne({
      name: input.name,
      description: input.description,
      price: input.price,
      author: input.author,
      image: input.image
    });
    return { success: true, id: result.insertedId.toHexString() };
  } catch {
    return { success: false, error: 'server_error' };
  }
}

export async function updateBook(
  input: UpdateBookInput,
  { books }: BookDatabaseAccessor
): Promise<CreateOrUpdateResult> {
  try {
    const result = await books.replaceOne(
      { _id: { $eq: ObjectId.createFromHexString(input.id) } },
      {
        id: input.id,
        name: input.name,
        description: input.description,
        price: input.price,
        author: input.author,
        image: input.image
      }
    );
    if (result.modifiedCount === 1) {
      return { success: true, id: input.id };
    } else {
      return { success: false, error: 'not_found' };
    }
  } catch {
    return { success: false, error: 'server_error' };
  }
}

export async function createOrUpdateBook(
  input: CreateBookInput & { id?: BookID },
  db: BookDatabaseAccessor
): Promise<CreateOrUpdateResult> {
  if (typeof input.id === 'string') {
    return updateBook(input as UpdateBookInput, db);
  }
  return createBook(input, db);
}

if (import.meta.vitest !== undefined) {
  const { test, expect } = import.meta.vitest;

  test('can create a new book', async () => {
    const db = getBookDatabase();
    const input: CreateBookInput = {
      name: 'Test Book',
      author: 'Test Author',
      description: 'A test book',
      price: 19.99,
      image: 'http://example.com/book.jpg'
    };

    const result = await createBook(input, db);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBeTruthy();
      expect(result.id.length).toBe(24);
    }
  });

  test('can update an existing book', async () => {
    const db = getBookDatabase();
    const id: BookID = generateId();
    const originalBook: Book = {
      id,
      name: 'Original Name',
      author: 'Original Author',
      description: 'Original description',
      price: 10.00,
      image: 'http://example.com/original.jpg'
    };
    await seedBookDatabase(db, { books: { [id]: originalBook } });

    const updateInput: UpdateBookInput = {
      id,
      name: 'Updated Name',
      author: 'Updated Author',
      description: 'Updated description',
      price: 25.00,
      image: 'http://example.com/updated.jpg'
    };

    const result = await updateBook(updateInput, db);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(id);
    }
  });

  test('updating a non-existent book returns not_found', async () => {
    const db = getBookDatabase();
    const id: BookID = generateId();

    const updateInput: UpdateBookInput = {
      id,
      name: 'Updated Name',
      author: 'Updated Author',
      description: 'Updated description',
      price: 25.00,
      image: 'http://example.com/updated.jpg'
    };

    const result = await updateBook(updateInput, db);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('not_found');
    }
  });

  test('createOrUpdateBook creates when no id provided', async () => {
    const db = getBookDatabase();
    const input: CreateBookInput = {
      name: 'New Book',
      author: 'New Author',
      description: 'New description',
      price: 15.00,
      image: 'http://example.com/new.jpg'
    };

    const result = await createOrUpdateBook(input, db);

    expect(result.success).toBe(true);
  });

  test('createOrUpdateBook updates when id is provided', async () => {
    const db = getBookDatabase();
    const id: BookID = generateId();
    const originalBook: Book = {
      id,
      name: 'Original',
      author: 'Author',
      description: 'Desc',
      price: 10.00,
      image: 'http://example.com/img.jpg'
    };
    await seedBookDatabase(db, { books: { [id]: originalBook } });

    const result = await createOrUpdateBook({ ...originalBook, name: 'Updated' }, db);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(id);
    }
  });
}
