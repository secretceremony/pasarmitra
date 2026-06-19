import { 
  collection, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';

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
    const q = query(
      collection(db, 'partnerships'),
      where('distributor_id', '==', distributorId),
      where('status', '==', 'pending')
    );
    const querySnapshot = await getDocs(q);
    const partnerships: Partnership[] = [];
    
    for (const document of querySnapshot.docs) {
      const data = document.data() as Omit<Partnership, 'id'>;
      const partId = document.id;
      
      // Resolve umkm_profile relation
      let umkm_profile: Partnership['umkm_profile'] = undefined;
      if (data.umkm_id) {
        const profileSnap = await getDoc(doc(db, 'profiles', data.umkm_id));
        if (profileSnap.exists()) {
          const profileData = profileSnap.data();
          umkm_profile = {
            organization_name: profileData.organization_name || '',
            owner_name: profileData.owner_name || '',
            reputation_score: profileData.reputation_score || 0,
            is_verified: profileData.is_verified || false,
          };
        }
      }
      
      partnerships.push({
        id: partId,
        ...data,
        umkm_profile,
      } as Partnership);
    }
    
    return partnerships;
  },

  getActivePartners: async (distributorId: string) => {
    const q = query(
      collection(db, 'partnerships'),
      where('distributor_id', '==', distributorId),
      where('status', '==', 'active')
    );
    const querySnapshot = await getDocs(q);
    const partnerships: Partnership[] = [];
    
    for (const document of querySnapshot.docs) {
      const data = document.data() as Omit<Partnership, 'id'>;
      const partId = document.id;
      
      // Resolve umkm_profile relation
      let umkm_profile: Partnership['umkm_profile'] = undefined;
      if (data.umkm_id) {
        const profileSnap = await getDoc(doc(db, 'profiles', data.umkm_id));
        if (profileSnap.exists()) {
          const profileData = profileSnap.data();
          umkm_profile = {
            organization_name: profileData.organization_name || '',
            owner_name: profileData.owner_name || '',
            reputation_score: profileData.reputation_score || 0,
            is_verified: profileData.is_verified || false,
          };
        }
      }
      
      partnerships.push({
        id: partId,
        ...data,
        umkm_profile,
      } as Partnership);
    }
    
    return partnerships;
  },

  getActiveChats: async (userId: string, role: string) => {
    const field = role === 'UMKM' ? 'umkm_id' : 'distributor_id';
    const q = query(
      collection(db, 'partnerships'),
      where(field, '==', userId),
      where('status', '==', 'active')
    );
    const querySnapshot = await getDocs(q);
    const chats = [];
    
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      const roomId = docSnap.id;
      
      // Get partner profile (if user is UMKM, partner is distributor, and vice versa)
      const partnerId = role === 'UMKM' ? data.distributor_id : data.umkm_id;
      let partnerName = 'Mitra';
      let online = false;
      
      if (partnerId) {
        const profileSnap = await getDoc(doc(db, 'profiles', partnerId));
        if (profileSnap.exists()) {
          const profileData = profileSnap.data();
          partnerName = profileData.organization_name || profileData.business_name || profileData.full_name || 'Mitra';
          online = profileData.status === 'online' || profileData.is_online || false;
        }
      }
      
      // Get last message in room by fetching all messages for room and sorting in memory
      let lastMsg = 'Belum ada pesan. Mulai obrolan...';
      let time = '';
      const msgQuery = query(
        collection(db, 'messages'),
        where('room_id', '==', roomId)
      );
      
      try {
        const msgSnap = await getDocs(msgQuery);
        if (!msgSnap.empty) {
          const msgs = msgSnap.docs.map(d => d.data());
          // Sort descending by created_at
          msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          const latestMsg = msgs[0];
          lastMsg = latestMsg.text || '';
          if (latestMsg.created_at) {
            const date = new Date(latestMsg.created_at);
            time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
        }
      } catch (err) {
        console.error('Error fetching last message:', err);
      }
      
      chats.push({
        id: roomId,
        partner: partnerName,
        lastMsg,
        time,
        unread: 0,
        online,
      });
    }
    
    return chats;
  },

  updatePartnershipStatus: async (id: string, status: Partnership['status']) => {
    const docRef = doc(db, 'partnerships', id);
    await updateDoc(docRef, { status });
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Partnership request not found');
    }
    const data = snap.data() as Omit<Partnership, 'id'>;
    
    // Resolve umkm_profile relation
    let umkm_profile: Partnership['umkm_profile'] = undefined;
    if (data.umkm_id) {
      const profileSnap = await getDoc(doc(db, 'profiles', data.umkm_id));
      if (profileSnap.exists()) {
        const profileData = profileSnap.data();
        umkm_profile = {
          organization_name: profileData.organization_name || '',
          owner_name: profileData.owner_name || '',
          reputation_score: profileData.reputation_score || 0,
          is_verified: profileData.is_verified || false,
        };
      }
    }
    
    return {
      id: snap.id,
      ...data,
      umkm_profile,
    } as Partnership;
  }
};


