// Re-export types and controllers for backward compatibility
export type { BookID, ShelfId, OrderId, OrderListItem } from './warehouse.route';
export { WarehouseController, OrderController, FulfilController } from './warehouse.route';
