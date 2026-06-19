import { describe, it, expect } from 'vitest';
import { formatInventoryUnitsLeft } from './inventoryFormatters';

describe('formatInventoryUnitsLeft', () => {
  it('formats singular unit', () => {
    expect(formatInventoryUnitsLeft(1)).toBe('1 unit left');
  });

  it('formats plural units', () => {
    expect(formatInventoryUnitsLeft(5)).toBe('5 units left');
  });

  it('handles zero as out of stock', () => {
    expect(formatInventoryUnitsLeft(0)).toBe('Out of stock');
  });

  it('handles negative as out of stock', () => {
    expect(formatInventoryUnitsLeft(-5)).toBe('Out of stock');
  });

  it('handles null/undefined as out of stock', () => {
    expect(formatInventoryUnitsLeft(null as any)).toBe('Out of stock');
    expect(formatInventoryUnitsLeft(undefined)).toBe('Out of stock');
  });

  it('formats large numbers with separators', () => {
    const formatted = formatInventoryUnitsLeft(1000);
    // Support both comma and dot as separators depending on environment
    expect(formatted).toMatch(/1[.,]000 units left/);
  });
});
