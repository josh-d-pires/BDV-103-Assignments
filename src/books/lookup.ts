import { getBookDatabase } from '../db';
import { type BookID, type Book, getBook } from './books.route';
import { generateId, seedBookDatabase } from '../test/utilities';

// Re-export for backward compatibility
export { getBook };

if (import.meta.vitest !== undefined) {
  const { test, expect } = import.meta.vitest;

  test('Can Find A Matching Book', async () => {
    const db = getBookDatabase();
    const id: BookID = generateId();
    const testBook: Book = {
      id,
      name: 'My Book!',
      author: 'test author',
      description: '',
      price: 0,
      image: ''
    };
    await seedBookDatabase(db, { books: { [id]: testBook } });
    const result = await getBook(id, db);

    expect(result).toBeTruthy();
    if (result !== false) {
      expect(result.name).toEqual(testBook.name);
      expect(result.author).toEqual(testBook.author);
      expect(result.id).toEqual(testBook.id);
    }
  });
}
