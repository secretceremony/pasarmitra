import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 10
}: PaginationProps) {
  if (totalPages <= 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems || 0);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 select-none border-t border-border/50">
      {totalItems !== undefined && totalItems > 0 ? (
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Menampilkan <span className="text-foreground">{startItem}</span> - <span className="text-foreground">{endItem}</span> dari <span className="text-foreground">{totalItems}</span> data
        </p>
      ) : (
        <div />
      )}
      
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-10 rounded-xl px-4 border-border/60 hover:bg-muted text-xs font-black uppercase tracking-widest cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Sebelumnya
        </Button>

        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Halaman <span className="text-foreground font-black">{currentPage}</span> dari <span className="text-foreground font-black">{totalPages}</span>
        </span>

        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-10 rounded-xl px-4 border-border/60 hover:bg-muted text-xs font-black uppercase tracking-widest cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Berikutnya
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
