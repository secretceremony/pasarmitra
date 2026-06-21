import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  Percent, 
  AlertCircle,
  Plus,
  Loader2,
  Calendar,
  X,
  Building
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../../lib/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { useAuthStore } from '../../../store/use-auth-store';
import { orderService } from '../../orders/services/orderService';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

export const DistributorWallet = () => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  
  // Wallet Balances
  const [availableBalance, setAvailableBalance] = useState(0);
  const [escrowBalance, setEscrowBalance] = useState(0);
  const [totalPaidOut, setTotalPaidOut] = useState(0);
  const [totalPlatformFee, setTotalPlatformFee] = useState(0);
  
  // Lists
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  
  // UI Tabs & Modal
  const [activeTab, setActiveTab] = useState<'transactions' | 'payouts'>('transactions');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Payout Form Fields
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  const fetchWalletData = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);

      // Run backfill database migration for delivered orders once per session
      const sessionKey = `PM_BACKFILL_DONE_${user.id}`;
      if (!sessionStorage.getItem(sessionKey)) {
        await orderService.backfillWalletTransactionsForDeliveredOrders(user.id);
        sessionStorage.setItem(sessionKey, 'true');
      }
      
      // 1. Fetch wallet transactions
      const txQuery = query(
        collection(db, 'wallet_transactions'),
        where('distributor_id', '==', user.id)
      );
      const txSnap = await getDocs(txQuery);
      const txList: any[] = [];
      const txOrderIds = new Set<string>();
      
      let sumCredit = 0;
      let sumDebit = 0;
      let paidOutVal = 0;
      let platformFeeVal = 0;

      txSnap.forEach(docSnap => {
        const data = docSnap.data();
        const tx = {
          id: docSnap.id,
          ...data,
          created_at: data.created_at?.toDate ? data.created_at.toDate() : new Date(data.created_at || Date.now())
        };
        txList.push(tx);

        if (data.order_id) {
          txOrderIds.add(data.order_id);
        }

        if (data.status === 'completed') {
          if (data.direction === 'credit') {
            sumCredit += data.net_amount || 0;
            if (data.type === 'order_release') {
              platformFeeVal += data.platform_fee_amount || 0;
            }
          } else if (data.direction === 'debit') {
            sumDebit += data.net_amount || 0;
            if (data.type === 'payout') {
              paidOutVal += data.net_amount || 0;
            }
          }
        }
      });

      // 2. Fetch all orders for this distributor to calculate escrow and fallback credit
      const orderQuery = query(
        collection(db, 'orders'),
        where('distributor_id', '==', user.id)
      );
      const orderSnap = await getDocs(orderQuery);
      let heldEscrow = 0;
      
      orderSnap.forEach(docSnap => {
        const data = docSnap.data();
        const orderId = docSnap.id;

        // Dana Tertahan: payment_status === 'paid' and escrow_status === 'held'
        if (data.payment_status === 'paid' && data.escrow_status === 'held') {
          heldEscrow += data.distributor_net_amount ?? (data.subtotal || data.total_amount || 0);
        }

        // Fallback for delivered & paid orders that don't have a transaction record yet
        if (data.status === 'delivered' && data.payment_status === 'paid') {
          if (!txOrderIds.has(orderId)) {
            const gross = data.subtotal || data.total_amount || 0;
            const feeRate = data.platform_fee_rate ?? 1.5;
            const feeAmount = data.platform_fee_amount ?? Math.round(gross * feeRate / 100);
            const net = data.distributor_net_amount ?? (gross - feeAmount);

            sumCredit += net;
            platformFeeVal += feeAmount;

            txList.push({
              id: `virtual_release_${orderId}`,
              order_id: orderId,
              order_code: data.order_code || '',
              type: 'order_release',
              direction: 'credit',
              net_amount: net,
              platform_fee_amount: feeAmount,
              status: 'completed',
              created_at: data.released_at ? new Date(data.released_at) : (data.updated_at ? new Date(data.updated_at) : new Date())
            });
          }
        }
      });

      // Sort transactions descending
      txList.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      setTransactions(txList);

      // Available balance = sum credit - sum debit
      setAvailableBalance(sumCredit - sumDebit);
      setTotalPaidOut(paidOutVal);
      setTotalPlatformFee(platformFeeVal);
      setEscrowBalance(heldEscrow);

      // 3. Fetch payout requests
      const payoutQuery = query(
        collection(db, 'payout_requests'),
        where('distributor_id', '==', user.id)
      );
      const payoutSnap = await getDocs(payoutQuery);
      const payoutList: any[] = [];
      payoutSnap.forEach(docSnap => {
        const data = docSnap.data();
        payoutList.push({
          id: docSnap.id,
          ...data,
          requested_at: data.requested_at?.toDate ? data.requested_at.toDate() : new Date(data.requested_at || Date.now())
        });
      });
      payoutList.sort((a, b) => b.requested_at.getTime() - a.requested_at.getTime());
      setPayoutRequests(payoutList);

      // UAT Debug logs
      if (import.meta.env.DEV) {
        console.log(`[UAT DEBUG] Distributor ID: ${user.id}`);
        console.log(`[UAT DEBUG] Wallet Transactions Found: ${txSnap.size}`);
        console.log(`[UAT DEBUG] Orders Found: ${orderSnap.size}`);
        console.log(`[UAT DEBUG] Payout Requests Found: ${payoutSnap.size}`);
      }

    } catch (err) {
      console.error("Gagal memuat data wallet:", err);
      toast.error("Gagal memuat informasi saldo");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [user?.id]);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || isSubmitting) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Nominal pencairan harus berupa angka di atas 0.");
      return;
    }
    if (amountNum > availableBalance) {
      toast.error("Nominal pencairan tidak boleh melebihi saldo tersedia.");
      return;
    }
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      toast.error("Semua kolom informasi rekening bank harus diisi.");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const payload = {
        distributor_id: user.id,
        distributor_name: user.organization_name || user.full_name || 'Distributor',
        amount: amountNum,
        bank_name: bankName.trim(),
        bank_account_number: accountNumber.trim(),
        bank_account_holder: accountHolder.trim(),
        status: 'pending_review',
        requested_at: serverTimestamp()
      };

      await addDoc(collection(db, 'payout_requests'), payload);
      
      toast.success("Pengajuan pencairan berhasil dikirim. Menunggu persetujuan admin.");
      
      // Reset form & close modal
      setAmount('');
      setBankName('');
      setAccountNumber('');
      setAccountHolder('');
      setIsModalOpen(false);
      
      // Refresh
      fetchWalletData();
    } catch (err) {
      console.error("Gagal mengajukan pencairan:", err);
      toast.error("Gagal mengajukan pencairan saldo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="text-xs sm:text-sm text-muted-foreground break-words min-w-0 font-medium">
        <span>Dashboard</span>
        <span className="mx-2">/</span>
        <span className="text-foreground font-black">Saldo & Pencairan</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Wallet className="text-primary h-8 w-8 shrink-0" /> Saldo & Pencairan
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Kelola pendapatan bersih Anda, pantau dana held escrow, dan ajukan pencairan dana.
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider h-11 px-6 rounded-xl shadow-lg shadow-primary/10 hover:shadow-xl shrink-0"
        >
          <Plus size={16} className="mr-1.5" /> Ajukan Pencairan
        </Button>
      </div>

      {/* Payout Notice */}
      <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl flex items-start gap-3">
        <AlertCircle className="text-orange-500 shrink-0 mt-0.5" size={18} />
        <div>
          <p className="text-xs font-bold text-foreground">Informasi Pencairan Dana</p>
          <p className="text-[11px] font-medium text-muted-foreground mt-0.5 leading-relaxed">
            Semua pengajuan pencairan dana akan diproses secara manual oleh tim keuangan PasarMitra ke rekening bank tujuan Anda dalam waktu 1-2 hari kerja.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Tersedia */}
        <div className="p-5 bg-card border border-border/50 rounded-2xl shadow-md space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Saldo Tersedia</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black">
              <Wallet size={16} />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-foreground font-mono">
            Rp {availableBalance.toLocaleString('id-ID')}
          </h3>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Pendapatan bersih yang dapat dicairkan.
          </p>
        </div>

        {/* Card 2: Dana Tertahan */}
        <div className="p-5 bg-card border border-border/50 rounded-2xl shadow-md space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Dana Tertahan</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-black">
              <Clock size={16} />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-foreground font-mono">
            Rp {escrowBalance.toLocaleString('id-ID')}
          </h3>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Pesanan terbayar yang masih tertahan di escrow.
          </p>
        </div>

        {/* Card 3: Total Dicairkan */}
        <div className="p-5 bg-card border border-border/50 rounded-2xl shadow-md space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Total Dicairkan</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-black">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-foreground font-mono">
            Rp {totalPaidOut.toLocaleString('id-ID')}
          </h3>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Akumulasi penarikan dana yang disetujui admin.
          </p>
        </div>

        {/* Card 4: Platform Fee */}
        <div className="p-5 bg-card border border-border/50 rounded-2xl shadow-md space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Platform Fee</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center font-black">
              <Percent size={16} />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-foreground font-mono">
            Rp {totalPlatformFee.toLocaleString('id-ID')}
          </h3>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Total biaya platform terpotong dari pesanan selesai.
          </p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-border/30 flex gap-2">
        <button
          onClick={() => setActiveTab('transactions')}
          className={cn(
            "pb-3 text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-b-2 px-1 cursor-pointer",
            activeTab === 'transactions' 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Riwayat Transaksi
        </button>
        <button
          onClick={() => setActiveTab('payouts')}
          className={cn(
            "pb-3 text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-b-2 px-1 cursor-pointer",
            activeTab === 'payouts' 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Pengajuan Pencairan
        </button>
      </div>

      {/* Tab Contents */}
      {isLoading ? (
        <div className="p-10 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <Loader2 className="animate-spin text-primary" size={24} />
          <p className="text-xs font-bold">Memuat riwayat keuangan...</p>
        </div>
      ) : activeTab === 'transactions' ? (
        <div className="bg-card border border-border/50 rounded-2xl shadow-lg overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
              <p className="text-xs text-muted-foreground font-bold">Belum ada saldo tersedia.</p>
              <p className="text-[11px] text-muted-foreground/80 max-w-sm font-medium">
                Saldo akan muncul setelah pesanan berbayar diselesaikan dan dana escrow dilepas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/30 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <th className="p-4">Tanggal</th>
                    <th className="p-4">Kode Transaksi</th>
                    <th className="p-4">Tipe</th>
                    <th className="p-4 text-right">Gross Amount</th>
                    <th className="p-4 text-right">Fee Platform</th>
                    <th className="p-4 text-right">Net Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 font-bold">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/10">
                      <td className="p-4 text-muted-foreground font-mono">
                        {tx.created_at.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="p-4 text-foreground font-mono">
                        {tx.id}
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded",
                          tx.type === 'order_release' ? "bg-emerald-500/10 text-emerald-500" :
                          tx.type === 'payout' ? "bg-blue-500/10 text-blue-500" :
                          tx.type === 'refund_adjustment' ? "bg-rose-500/10 text-rose-500" :
                          "bg-amber-500/10 text-amber-500"
                        )}>
                          {tx.type === 'order_release' ? 'Pelepasan Escrow' :
                           tx.type === 'payout' ? 'Pencairan' :
                           tx.type === 'refund_adjustment' ? 'Penyesuaian Refund' : 'Penyesuaian Fee'}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-muted-foreground">
                        {tx.gross_amount ? `Rp ${tx.gross_amount.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="p-4 text-right font-mono text-rose-500">
                        {tx.platform_fee_amount ? `-Rp ${tx.platform_fee_amount.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className={cn(
                        "p-4 text-right font-mono font-black",
                        tx.direction === 'credit' ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      )}>
                        {tx.direction === 'credit' ? '+' : '-'}Rp {tx.net_amount.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border/50 rounded-2xl shadow-lg overflow-hidden">
          {payoutRequests.length === 0 ? (
            <div className="p-10 text-center text-xs text-muted-foreground font-bold">
              Belum ada riwayat pengajuan pencairan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/30 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <th className="p-4">Tanggal Pengajuan</th>
                    <th className="p-4">Informasi Rekening</th>
                    <th className="p-4 text-right">Jumlah</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4">Catatan Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 font-bold">
                  {payoutRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-muted/10">
                      <td className="p-4 text-muted-foreground font-mono">
                        {req.requested_at.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="p-4 text-foreground text-xs leading-normal">
                        <div className="flex items-center gap-1 font-black text-muted-foreground uppercase text-[10px]">
                          <Building size={10} /> {req.bank_name}
                        </div>
                        <div className="font-mono mt-0.5">{req.bank_account_number}</div>
                        <div className="text-[10px] text-muted-foreground">a.n. {req.bank_account_holder}</div>
                      </td>
                      <td className="p-4 text-right font-mono font-black text-foreground">
                        Rp {req.amount.toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-center">
                        <span className={cn(
                          "px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border",
                          req.status === 'pending_review' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                          req.status === 'approved' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                          req.status === 'paid' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                          "bg-rose-500/10 text-rose-500 border-rose-500/20"
                        )}>
                          {req.status === 'pending_review' ? 'Menunggu Persetujuan' :
                           req.status === 'approved' ? 'Disetujui Admin' :
                           req.status === 'paid' ? 'Sudah Dibayar' : 'Ditolak'}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground max-w-xs truncate leading-normal text-xs">
                        {req.admin_notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Ajukan Pencairan Form Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border/80 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-border/30 flex justify-between items-center">
                <h3 className="font-black text-base text-foreground flex items-center gap-1.5">
                  <Wallet size={18} className="text-primary" /> Ajukan Pencairan Saldo
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleRequestPayout} className="p-5 space-y-4">
                {/* Saldo Tersedia Display */}
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex justify-between items-center text-xs font-bold text-muted-foreground">
                  <span>Saldo Tersedia:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm font-black">
                    Rp {availableBalance.toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                    Nominal Pencairan (Rupiah)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Masukkan jumlah saldo yang ingin ditarik"
                    required
                    className="w-full h-11 px-4 border border-border rounded-xl bg-background font-mono text-sm font-bold text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                {/* Bank Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                    Bank Tujuan
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Contoh: BCA, Mandiri, BNI, dll"
                    required
                    className="w-full h-11 px-4 border border-border rounded-xl bg-background text-sm font-bold text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                {/* Account Number */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                    Nomor Rekening
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Masukkan nomor rekening bank"
                    required
                    className="w-full h-11 px-4 border border-border rounded-xl bg-background font-mono text-sm font-bold text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                {/* Account Holder */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                    Nama Pemilik Rekening
                  </label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="Sesuai nama di buku tabungan"
                    required
                    className="w-full h-11 px-4 border border-border rounded-xl bg-background text-sm font-bold text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider h-11 rounded-xl shadow-lg shadow-primary/10 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Mengirim...
                      </>
                    ) : (
                      'Kirim Pengajuan'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
