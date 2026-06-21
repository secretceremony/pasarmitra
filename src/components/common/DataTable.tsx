import React, { useState } from 'react';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  SearchX,
  Inbox
} from 'lucide-react';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'motion/react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  searchPlaceholder?: string;
  actions?: (item: T) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<T extends { id: string | number }>({ 
  columns, 
  data, 
  onRowClick,
  searchPlaceholder = "Cari data...",
  actions,
  emptyTitle,
  emptyDescription,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof T; direction: 'asc' | 'desc' } | null>(null);

  const filteredData = data.filter(item => 
    Object.values(item).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
    if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (key: keyof T) => {
    setSortConfig(prev => {
      if (prev?.key === key && prev.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return { key, direction: 'asc' };
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 bg-background border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2 rounded-xl">
          <Filter size={18} />
          Filters
        </Button>
      </div>

      <div className="border rounded-2xl bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b">
                {columns.map((col, i) => (
                  <th 
                    key={i} 
                    className={`px-6 py-4 font-semibold text-muted-foreground ${col.sortable ? 'cursor-pointer hover:text-foreground select-none' : ''}`}
                    onClick={() => col.sortable && typeof col.accessor === 'string' && toggleSort(col.accessor as keyof T)}
                  >
                    <div className="flex items-center gap-2">
                      {col.header}
                      {col.sortable && typeof col.accessor === 'string' && (
                        <div className="flex flex-col">
                          <ChevronUp size={12} className={sortConfig?.key === col.accessor && sortConfig.direction === 'asc' ? 'text-primary' : 'text-muted-foreground/30'} />
                          <ChevronDown size={12} className={sortConfig?.key === col.accessor && sortConfig.direction === 'desc' ? 'text-primary' : 'text-muted-foreground/30'} />
                        </div>
                      )}
                    </div>
                  </th>
                ))}
                {actions && <th className="px-6 py-4"></th>}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {sortedData.map((item, index) => (
                  <motion.tr
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={item.id}
                    onClick={() => onRowClick?.(item)}
                    className={`
                      border-b last:border-0 hover:bg-muted/30 transition-colors
                      ${onRowClick ? 'cursor-pointer' : ''}
                    `}
                  >
                    {columns.map((col, i) => (
                      <td key={i} className="px-6 py-4">
                        {typeof col.accessor === 'function' 
                          ? col.accessor(item) 
                          : String(item[col.accessor as keyof T])
                        }
                      </td>
                    ))}
                    {actions && (
                      <td className="px-6 py-4 text-right">
                        {actions(item)}
                      </td>
                    )}
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        {sortedData.length === 0 && (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground/50">
              {searchTerm ? <SearchX size={22} strokeWidth={1.5} /> : <Inbox size={22} strokeWidth={1.5} />}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black text-foreground">
                {searchTerm
                  ? (emptyTitle ?? 'Tidak ada hasil yang cocok')
                  : (emptyTitle ?? 'Belum ada data')}
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                {searchTerm
                  ? (emptyDescription ?? 'Coba kata kunci lain atau ubah filter pencarian Anda.')
                  : (emptyDescription ?? 'Data akan muncul di sini setelah tersedia.')}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-2">
        <p className="text-xs text-muted-foreground">
          Menampilkan <span className="font-medium">{sortedData.length}</span> dari <span className="font-medium">{data.length}</span> data
        </p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" disabled className="rounded-lg h-8 w-8">
            <ChevronLeft size={16} />
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg h-8 w-8 p-0 text-xs bg-primary text-primary-foreground">1</Button>
          <Button variant="ghost" size="icon" disabled className="rounded-lg h-8 w-8">
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
