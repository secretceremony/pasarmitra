import { describe, it, expect } from 'vitest';
import { getInventoryStatusMeta } from './getInventoryStatusMeta';
import { INVENTORY_STATUS_CONFIG } from '../config/inventory-status.config';

describe('getInventoryStatusMeta', () => {
  it('resolves active status correctly', () => {
    const meta = getInventoryStatusMeta('Active');
    expect(meta.label).toBe('Active');
    expect(meta.type).toBe('success');
  });

  it('resolves low stock status correctly', () => {
    const meta = getInventoryStatusMeta('Low Stock');
    expect(meta.label).toBe('Low Stock');
    expect(meta.type).toBe('warning');
  });

  it('falls back to Unknown for unrecognized status', () => {
    const meta = getInventoryStatusMeta('BrokenStatus');
    expect(meta.label).toBe('Unknown');
    expect(meta).toEqual(INVENTORY_STATUS_CONFIG.Unknown);
  });

  it('falls back to Unknown for null/undefined', () => {
    expect(getInventoryStatusMeta(null).label).toBe('Unknown');
    expect(getInventoryStatusMeta(undefined).label).toBe('Unknown');
  });
});
