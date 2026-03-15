import { type BookDatabaseAccessor, getBookDatabase } from '../db';
import { type BookID, type Book, type BookFilter } from './books.route';
import { generateId, seedBookDatabase } from '../test/utilities';

export interface ListBooksOptions {
  filters?: BookFilter[];
}

export async function listBooks(
  options: ListBooksOptions,
  { books: bookCollection }: BookDatabaseAccessor
): Promise<Book[]> {
  const { filters } = options;

  // Coerce string values to numbers and validate filters
  const validFilters = filters?.map(({ from, to, name, author }) => ({
    from: from !== undefined ? Number(from) : undefined,
    to: to !== undefined ? Number(to) : undefined,
    name,
    author
  })).filter(({ from, to, name, author }) =>
    (from !== undefined && !isNaN(from)) ||
    (to !== undefined && !isNaN(to)) ||
    (typeof name === 'string' && name.trim().length > 0) ||
    (typeof author === 'string' && author.trim().length > 0)
  ) ?? [];

  const query = validFilters.length > 0
    ? {
        $or: validFilters.map(({ from, to, name, author }) => {
          const filter: {
            price?: { $gte?: number; $lte?: number };
            name?: { $regex: string; $options: string };
            author?: { $regex: string; $options: string };
          } = {};
          if (from !== undefined && !isNaN(from)) {
            filter.price = { $gte: from };
          }
          if (to !== undefined && !isNaN(to)) {
            filter.price = { ...(filter.price ?? {}), $lte: to };
          }
          if (typeof name === 'string') {
            filter.name = { $regex: name.toLowerCase(), $options: 'ix' };
          }
          if (typeof author === 'string') {
            filter.author = { $regex: author.toLowerCase(), $options: 'ix' };
          }
          return filter;
        })
      }
    : {};

  const bookList = await bookCollection.find(query).map(document => {
    const book: Book = {
      id: document._id.toHexString(),
      name: document.name,
      image: document.image,
      price: document.price,
      author: document.author,
      description: document.description
    };
    return book;
  }).toArray();

  return bookList;
}

if (import.meta.vitest !== undefined) {
  const { test, expect } = import.meta.vitest;

  test('lists all books when no filters provided', async () => {
    const db = getBookDatabase();
    const id1: BookID = generateId();
    const id2: BookID = generateId();
    const book1: Book = {
      id: id1,
      name: 'Book One',
      author: 'Author One',
      description: 'Description 1',
      price: 10.00,
      image: 'http://example.com/1.jpg'
    };
    const book2: Book = {
      id: id2,
      name: 'Book Two',
      author: 'Author Two',
      description: 'Description 2',
      price: 20.00,
      image: 'http://example.com/2.jpg'
    };
    await seedBookDatabase(db, { books: { [id1]: book1, [id2]: book2 } });

    const result = await listBooks({}, db);

    expect(result.length).toBeGreaterThanOrEqual(2);
    const names = result.map(b => b.name);
    expect(names).toContain('Book One');
    expect(names).toContain('Book Two');
  });

  test('lists all books when filters is undefined', async () => {
    const db = getBookDatabase();
    const id: BookID = generateId();
    const book: Book = {
      id,
      name: 'Undefined Filter Book',
      author: 'Author',
      description: 'Description',
      price: 15.00,
      image: 'http://example.com/book.jpg'
    };
    await seedBookDatabase(db, { books: { [id]: book } });

    const result = await listBooks({ filters: undefined }, db);

    const names = result.map(b => b.name);
    expect(names).toContain('Undefined Filter Book');
  });

  test('lists all books when filters is empty array', async () => {
    const db = getBookDatabase();
    const id: BookID = generateId();
    const book: Book = {
      id,
      name: 'Empty Filter Book',
      author: 'Author',
      description: 'Description',
      price: 15.00,
      image: 'http://example.com/book.jpg'
    };
    await seedBookDatabase(db, { books: { [id]: book } });

    const result = await listBooks({ filters: [] }, db);

    const names = result.map(b => b.name);
    expect(names).toContain('Empty Filter Book');
  });

  test('filters books by price range', async () => {
    const db = getBookDatabase();
    const id1: BookID = generateId();
    const id2: BookID = generateId();
    const cheapBook: Book = {
      id: id1,
      name: 'Cheap Book',
      author: 'Author',
      description: 'Description',
      price: 5.00,
      image: 'http://example.com/cheap.jpg'
    };
    const expensiveBook: Book = {
      id: id2,
      name: 'Expensive Book',
      author: 'Author',
      description: 'Description',
      price: 100.00,
      image: 'http://example.com/expensive.jpg'
    };
    await seedBookDatabase(db, { books: { [id1]: cheapBook, [id2]: expensiveBook } });

    const result = await listBooks({ filters: [{ from: 50, to: 150 }] }, db);

    const names = result.map(b => b.name);
    expect(names).toContain('Expensive Book');
    expect(names).not.toContain('Cheap Book');
  });

  test('filters books by name', async () => {
    const db = getBookDatabase();
    const id1: BookID = generateId();
    const id2: BookID = generateId();
    const book1: Book = {
      id: id1,
      name: 'JavaScript Guide',
      author: 'Author',
      description: 'Description',
      price: 30.00,
      image: 'http://example.com/js.jpg'
    };
    const book2: Book = {
      id: id2,
      name: 'Python Basics',
      author: 'Author',
      description: 'Description',
      price: 25.00,
      image: 'http://example.com/py.jpg'
    };
    await seedBookDatabase(db, { books: { [id1]: book1, [id2]: book2 } });

    const result = await listBooks({ filters: [{ name: 'javascript' }] }, db);

    const names = result.map(b => b.name);
    expect(names).toContain('JavaScript Guide');
    expect(names).not.toContain('Python Basics');
  });

  test('filters books by author', async () => {
    const db = getBookDatabase();
    const id1: BookID = generateId();
    const id2: BookID = generateId();
    const book1: Book = {
      id: id1,
      name: 'Book by Smith',
      author: 'John Smith',
      description: 'Description',
      price: 15.00,
      image: 'http://example.com/smith.jpg'
    };
    const book2: Book = {
      id: id2,
      name: 'Book by Jones',
      author: 'Jane Jones',
      description: 'Description',
      price: 18.00,
      image: 'http://example.com/jones.jpg'
    };
    await seedBookDatabase(db, { books: { [id1]: book1, [id2]: book2 } });

    const result = await listBooks({ filters: [{ author: 'smith' }] }, db);

    const authors = result.map(b => b.author);
    expect(authors).toContain('John Smith');
    expect(authors).not.toContain('Jane Jones');
  });

  test('handles string number filters (from query params)', async () => {
    const db = getBookDatabase();
    const id: BookID = generateId();
    const book: Book = {
      id,
      name: 'Mid-Price Book',
      author: 'Author',
      description: 'Description',
      price: 25.00,
      image: 'http://example.com/mid.jpg'
    };
    await seedBookDatabase(db, { books: { [id]: book } });

    // Simulate query params coming as strings
    const result = await listBooks({
      filters: [{ from: '20' as unknown as number, to: '30' as unknown as number }]
    }, db);

    const names = result.map(b => b.name);
    expect(names).toContain('Mid-Price Book');
  });
}
