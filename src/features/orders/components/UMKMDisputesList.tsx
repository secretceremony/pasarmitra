import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  Search, 
  Clock, 
  ArrowRight, 
  Building2, 
  Package, 
  FileText, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuthStore } from '../../../store/use-auth-store';
import { disputeService, Dispute } from '../services/disputeService';
import { formatDateTime } from '../../../lib/dateUtils';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { Button } from '../../../components/ui/button';
import { Pagination } from '../../../components/common/Pagination';

export const UMKMDisputesList = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const fetchDisputes = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const data = await disputeService.getDisputesByBuyer(user.id);
      setDisputes(data);
    } catch (err) {
      console.error('Gagal mengambil daftar komplain:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [user?.id]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'Diajukan';
      case 'awaiting_distributor_response':
        return 'Menunggu Respon Distributor';
      case 'under_admin_review':
        return 'Ditinjau Admin';
      case 'approved':
        return 'Disetujui';
      case 'rejected':
        return 'Ditolak';
      case 'resolved':
        return 'Selesai';
      case 'cancelled':
        return 'Dibatalkan';
      case 'OPEN':
        return 'Terbuka';
      case 'IN_MEDIATION':
        return 'Mediasi Admin';
      case 'RESOLVED':
        return 'Selesai';
      default:
        return status;
    }
  };

  const getStatusType = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'info';
      case 'awaiting_distributor_response':
        return 'warning';
      case 'under_admin_review':
        return 'warning';
      case 'approved':
      case 'resolved':
      case 'RESOLVED':
        return 'success';
      case 'rejected':
      case 'cancelled':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const getResolutionLabel = (res: string) => {
    switch (res) {
      case 'full_refund':
        return 'Refund Penuh';
      case 'partial_refund':
        return 'Refund Sebagian';
      case 'replacement':
        return 'Penggantian Barang';
      case 'discussion':
        return 'Diskusi dengan Distributor';
      default:
        return res;
    }
  };

  const filteredDisputes = disputes.filter(d => {
    const term = searchQuery.toLowerCase();
    return (
      d.id.toLowerCase().includes(term) ||
      d.order_code.toLowerCase().includes(term) ||
      d.title.toLowerCase().includes(term) ||
      d.distributor_name.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 border-l-4 border-rose-500 pl-4 py-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Komplain Saya</h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            Pantau status komplain dan pengembalian dana untuk pesanan Anda.
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari komplain berdasarkan nomor pesanan atau distributor..." 
            className="w-full h-10 bg-card border border-border/50 rounded-xl pl-10 pr-4 text-xs font-bold outline-none focus:border-primary/40 transition-all" 
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p className="font-black text-xs uppercase tracking-widest">Memuat Komplain...</p>
        </div>
      ) : filteredDisputes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center bg-card border border-dashed border-border/50 rounded-2xl max-w-xl mx-auto shadow-md">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground/50">
            <ShieldAlert size={26} />
          </div>
          <div className="space-y-1.5 max-w-xs px-4">
            <h3 className="text-sm font-black text-foreground">Belum ada komplain</h3>
            <p className="text-xs font-medium text-muted-foreground">
              Komplain pesanan dapat diajukan dari halaman detail pesanan jika ada kendala dengan barang atau pengiriman.
            </p>
          </div>
          <Button 
            onClick={() => navigate('/orders')} 
            className="h-9 px-6 bg-primary text-primary-foreground font-bold text-xs rounded-xl"
          >
            Lihat Daftar Pesanan
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDisputes.slice((currentPage - 1) * 10, currentPage * 10).map((dispute) => (
              <motion.div
                key={dispute.id}
                onClick={() => navigate(`/umkm/disputes/${dispute.id}`)}
                className="p-5 bg-card border border-border/50 rounded-2xl hover:border-rose-500/30 cursor-pointer transition-all hover:scale-[1.01] shadow-lg flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <StatusBadge 
                      type={getStatusType(dispute.status)} 
                      label={getStatusLabel(dispute.status)} 
                    />
                    <span className="text-[9px] font-mono font-black text-muted-foreground uppercase tracking-wider">#{dispute.id.slice(0, 8)}</span>
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="font-black text-sm leading-tight group-hover:text-rose-500 transition-colors">
                      {dispute.title}
                    </h4>
                    <p className="text-[10px] text-muted-foreground font-bold">
                      Pesanan: <span className="text-foreground">#{dispute.order_code || dispute.order_id.slice(0, 8)}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/30 space-y-2 text-xs font-bold text-muted-foreground">
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <Building2 size={12} className="shrink-0" />
                    <span className="truncate">{dispute.distributor_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <FileText size={12} className="shrink-0" />
                    <span>Resolusi: <span className="text-foreground">{getResolutionLabel(dispute.requested_resolution)}</span></span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[9px] text-muted-foreground font-medium flex items-center gap-1">
                      <Clock size={10} />
                      {formatDateTime(dispute.created_at)}
                    </span>
                    <span className="text-rose-500 font-black text-[10px] flex items-center gap-0.5">
                      Detail <ArrowRight size={10} />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          {filteredDisputes.length > 10 && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredDisputes.length / 10)}
              onPageChange={setCurrentPage}
              totalItems={filteredDisputes.length}
              itemsPerPage={10}
            />
          )}
        </div>
      )}
    </div>
  );
};
