import { supabase } from '../../../lib/supabase';

export interface Partnership {
  id: string;
  distributor_id: string;
  umkm_id: string;
  status: 'pending' | 'active' | 'rejected' | 'terminated';
  created_at: string;
  umkm_profile?: {
    organization_name: string;
    owner_name: string;
    reputation_score: number;
    is_verified: boolean;
  };
}

export const partnerService = {
  getPartnershipRequests: async (distributorId: string) => {
    const { data, error } = await supabase
      .from('partnerships')
      .select(`
        *,
        umkm_profile:umkm_id (
          organization_name,
          owner_name,
          reputation_score,
          is_verified
        )
      `)
      .eq('distributor_id', distributorId)
      .eq('status', 'pending');
    
    if (error) throw error;
    return data as Partnership[];
  },

  updatePartnershipStatus: async (id: string, status: Partnership['status']) => {
    const { data, error } = await supabase
      .from('partnerships')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Partnership;
  }
};
