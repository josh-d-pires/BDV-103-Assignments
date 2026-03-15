// Re-export types and functions for backward compatibility
export { getBook } from './lookup';
export { listBooks } from './list';
export { createBook, updateBook, createOrUpdateBook } from './create';
export { deleteBook } from './delete';
export type { Book, BookID, BookFilter } from './books.route';
