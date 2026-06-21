import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  collection, 
  Timestamp 
} from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const testUsers = [
  {
    email: 'admin@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'ADMIN',
      full_name: 'System Admin',
      is_verified: true,
    }
  },
  {
    email: 'distributor@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'DISTRIBUTOR',
      full_name: 'Budi Santoso',
      organization_name: 'Distributor Sembako Utama',
      is_verified: true,
      verification_status: 'VERIFIED',
      address: 'Jl. Industri Utama No. 88, Balikpapan Selatan, Balikpapan',
      reputation_score: 4.8
    }
  },
  {
    email: 'distributor-pending@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'DISTRIBUTOR',
      full_name: 'Andi Wijaya',
      organization_name: 'CV Sayur Makmur Balikpapan',
      is_verified: false,
      verification_status: 'PENDING_REVIEW',
      address: 'Jl. Mulawarman No. 54, Balikpapan Timur, Balikpapan',
      reputation_score: 0.0,
      nib: '9120001234567',
      npwp: '01.234.567.8-901.000',
      warehouse_permit: 'SIPB-99/123/2026',
      nib_url: 'https://pasarmitra.com/docs/nib-pending.pdf',
      npwp_url: 'https://pasarmitra.com/docs/npwp-pending.pdf',
      warehouse_permit_url: 'https://pasarmitra.com/docs/permit-pending.pdf',
      legal_info: {
        company_name: 'CV Sayur Makmur Balikpapan',
        nib: '9120001234567',
        npwp: '01.234.567.8-901.000',
        business_address: 'Jl. Mulawarman No. 54, Balikpapan Timur, Balikpapan',
        phone: '081234567890',
        submitted_at: new Date().toISOString()
      }
    }
  },
  {
    email: 'umkm@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'UMKM',
      full_name: 'Siti Aminah',
      organization_name: 'Warung Sejahtera',
      is_verified: true,
      address: 'Jl. Syarifuddin Yoes No. 42, Balikpapan Selatan, Balikpapan',
      reputation_score: 4.6
    }
  },
  {
    email: 'umkm-unverified@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'UMKM',
      full_name: 'Dewi Lestari',
      organization_name: 'Toko Kelontong Dewi',
      is_verified: false,
      verification_status: 'NOT_SUBMITTED',
      address: 'Jl. Letjen S. Parman No. 12, Balikpapan Tengah, Balikpapan',
      reputation_score: 0.0
    }
  }
];

const nowISO = () => new Date().toISOString();
const offsetISO = (ms: number) => new Date(Date.now() + ms).toISOString();
const nowTimestamp = () => Timestamp.now();
const offsetTimestamp = (ms: number) => Timestamp.fromDate(new Date(Date.now() + ms));

async function seedDatabase() {
  console.log('--- starting PasarMitra Database Seeding ---');
  
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('Error: Firebase configuration missing from environment variables.');
    process.exit(1);
  }

  const uids: Record<string, string> = {};

  // 1. Create/Retrieve Accounts
  for (const u of testUsers) {
    try {
      console.log(`Processing account: ${u.email}...`);
      let uid = '';
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, u.email, u.password);
        uid = userCredential.user.uid;
        console.log(`  Auth user created with UID: ${uid}`);
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          const userCredential = await signInWithEmailAndPassword(auth, u.email, u.password);
          uid = userCredential.user.uid;
          console.log(`  Retrieved existing UID: ${uid}`);
        } else {
          throw err;
        }
      }
      uids[u.email] = uid;
      uids[u.profile.role] = uid; // backwards compat for roles if needed

      // Update Firestore profile doc
      const profileDocRef = doc(db, 'profiles', uid);
      await setDoc(profileDocRef, {
        id: uid,
        email: u.email,
        created_at: nowISO(),
        updated_at: nowISO(),
        ...u.profile
      }, { merge: true });
      console.log(`  Firestore profile populated for email: ${u.email}`);

    } catch (e: any) {
      console.error(`Error processing account ${u.email}:`, e.message || e);
    }
  }

  const distributorId = uids['distributor@pasarmitra.com'];
  const pendingDistributorId = uids['distributor-pending@pasarmitra.com'];
  const buyerId = uids['umkm@pasarmitra.com'];

  if (!distributorId || !pendingDistributorId || !buyerId) {
    console.error('Error: Could not retrieve UIDs for Distributor or UMKM buyer.');
    process.exit(1);
  }

  const verificationRequestPayload = {
    distributor_id: pendingDistributorId,
    distributor_name: 'CV Sayur Makmur Balikpapan',
    distributor_email: 'distributor-pending@pasarmitra.com',
    company_name: 'CV Sayur Makmur Balikpapan',
    nib: '9120001234567',
    npwp: '01.234.567.8-901.000',
    business_address: 'Jl. Mulawarman No. 54, Balikpapan Timur, Balikpapan',
    phone: '081234567890',
    status: 'PENDING_REVIEW',
    submitted_at: nowTimestamp(),
    updated_at: nowTimestamp()
  };

  // ==========================================
  // 2. Seed Settings & Commission Tiers (Admin Role Needed)
  // ==========================================
  try {
    console.log('Authenticating as ADMIN to seed settings and commission tiers...');
    await signInWithEmailAndPassword(auth, 'admin@pasarmitra.com', 'password123');
    console.log('Authenticated as ADMIN.');

    // settings/commission
    try {
      console.log('Seeding settings/commission...');
      await setDoc(doc(db, 'settings', 'commission'), {
        globalBaseline: 1.5,
        updatedAt: nowISO()
      });
    } catch (err: any) {
      console.error('Failed to seed settings/commission:', err.message || err);
    }

    // commission_tiers
    try {
      console.log('Seeding commission tiers...');
      const commissionTiers = {
        'sembako-distributor': {
          name: 'Sembako Distributor',
          category: 'Sembako',
          commission_rate: 0.015,
          is_active: true,
          created_at: nowISO(),
          updated_at: nowISO(),
          partnerType: 'DISTRIBUTOR',
          platformFee: 1.5,
          partnersActive: 12,
          isActive: true,
          description: 'Tier standar untuk distributor sembako dan kebutuhan pokok.'
        },
        'fb-distributor': {
          name: 'F&B Distributor',
          category: 'F&B',
          commission_rate: 0.01,
          is_active: true,
          created_at: nowISO(),
          updated_at: nowISO(),
          partnerType: 'Strategic Enterprise',
          platformFee: 1.0,
          partnersActive: 8,
          isActive: true,
          description: 'Tier untuk produk makanan, minuman kemasan, dan olahan.'
        },
        'sayur-buah': {
          name: 'Sayur & Buah',
          category: 'Sayur & Buah',
          commission_rate: 0.005,
          is_active: true,
          created_at: nowISO(),
          updated_at: nowISO(),
          partnerType: 'Local Farmers',
          platformFee: 0.5,
          partnersActive: 15,
          isActive: true,
          description: 'Tier khusus untuk petani lokal dan supplier produk segar.'
        },
        'frozen-food': {
          name: 'Frozen Food',
          category: 'Frozen Food',
          commission_rate: 0.018,
          is_active: true,
          created_at: nowISO(),
          updated_at: nowISO(),
          partnerType: 'DISTRIBUTOR',
          platformFee: 1.8,
          partnersActive: 6,
          isActive: true,
          description: 'Tier distributor makanan beku dengan logistik khusus.'
        },
        'perlengkapan-usaha': {
          name: 'Perlengkapan Usaha',
          category: 'Perlengkapan Usaha',
          commission_rate: 0.0125,
          is_active: true,
          created_at: nowISO(),
          updated_at: nowISO(),
          partnerType: 'Sembako Wholesale',
          platformFee: 1.25,
          partnersActive: 10,
          isActive: true,
          description: 'Tier untuk distributor non-makanan seperti kemasan dan alat usaha.'
        }
      };

      for (const [id, data] of Object.entries(commissionTiers)) {
        await setDoc(doc(db, 'commission_tiers', id), data);
        console.log(`  Commission tier seeded: ${data.name}`);
      }
    } catch (err: any) {
      console.error('Failed to seed commission tiers:', err.message || err);
    }

    // moderation_items
    try {
      console.log('Seeding moderation items...');
      const moderationItems = {
        'demo-mod-product-pending': {
          type: 'PRODUCT',
          targetType: 'PRODUCT',
          targetId: 'demo-product-gulaku',
          productId: 'demo-product-gulaku',
          title: 'Gula Pasir Gulaku 1kg',
          author: 'Distributor Sembako Utama',
          distributor_id: distributorId,
          status: 'pending',
          reason: 'Persetujuan Produk Baru',
          timestamp: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          created_at: nowISO(),
          updated_at: nowISO(),
          image: '/assets/fallback-product.png'
        },
        'demo-mod-product-reported': {
          type: 'PRODUCT',
          targetType: 'PRODUCT',
          targetId: 'demo-product-bimoli',
          productId: 'demo-product-bimoli',
          title: 'Minyak Goreng Bimoli 2L',
          author: 'Distributor Sembako Utama',
          distributor_id: distributorId,
          status: 'pending_moderation',
          reason: 'Laporan: Indikasi Penipuan Harga / Mark-up Sepihak',
          timestamp: new Date(Date.now() - 3600000).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          created_at: offsetISO(-3600000),
          updated_at: offsetISO(-3600000),
          image: '/assets/fallback-product.png'
        },
        'demo-mod-review-reported': {
          type: 'REVIEW',
          targetType: 'REVIEW',
          targetId: 'rev-seeded-99',
          title: 'Ulasan Produk Minyak Goreng',
          author: 'Akun Kompetitor Palsu',
          status: 'needs_review',
          reason: 'Laporan: Konten review kasar, merendahkan, dan SARA',
          content: 'Barang palsu jangan beli disini, distributor penipu dan pelayanannya sangat buruk sekali!!!',
          timestamp: new Date(Date.now() - 7200000).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          created_at: offsetISO(-7200000),
          updated_at: offsetISO(-7200000),
        }
      };

      for (const [id, data] of Object.entries(moderationItems)) {
        await setDoc(doc(db, 'moderation_items', id), data);
        console.log(`  Moderation item seeded: ${data.reason}`);
      }
    } catch (err: any) {
      console.error('Failed to seed moderation items:', err.message || err);
    }

    // Try seeding verification requests as Admin first, as fallback
    try {
      console.log('Seeding verification request as ADMIN (fallback check)...');
      await setDoc(doc(db, 'verification_requests', 'demo-request-cv-sayur-makmur'), verificationRequestPayload);
      console.log('  Verification request seeded successfully as ADMIN.');
    } catch (err: any) {
      console.log('  Admin write to verification_requests blocked by rules. Will retry as pending distributor.');
    }

  } catch (err: any) {
    console.error('General ADMIN section error:', err.message || err);
  }

  // ==========================================
  // 3. Seed Products (Verified Distributor Role Needed)
  // ==========================================
  try {
    console.log('Authenticating as DISTRIBUTOR to seed products...');
    await signInWithEmailAndPassword(auth, 'distributor@pasarmitra.com', 'password123');
    console.log('Authenticated as DISTRIBUTOR.');

    const products = {
      'demo-product-bimoli': {
        name: 'Minyak Goreng Bimoli 2L',
        category: 'Sembako',
        description: 'Minyak goreng kelapa sawit bermutu tinggi kualitas ekspor.',
        price: 36000,
        stock: 450,
        min_order_quantity: 10,
        unit_type: 'Karton',
        image_url: '/assets/fallback-product.png',
        tiered_pricing: [
          { min_quantity: 10, price_per_unit: 36000 },
          { min_quantity: 50, price_per_unit: 34500 }
        ],
        distributor_id: distributorId,
        distributor_name: 'Distributor Sembako Utama',
        is_active: true,
        moderation_status: 'APPROVED',
        created_at: nowISO(),
        updated_at: nowISO()
      },
      'demo-product-pandan-wangi': {
        name: 'Beras Pandan Wangi 10kg',
        category: 'Sembako',
        description: 'Beras aromatik pandan wangi asli Cianjur, pulen dan segar.',
        price: 145000,
        stock: 200,
        min_order_quantity: 5,
        unit_type: 'Karung',
        image_url: '/assets/fallback-product.png',
        tiered_pricing: [
          { min_quantity: 5, price_per_unit: 145000 },
          { min_quantity: 20, price_per_unit: 140000 }
        ],
        distributor_id: distributorId,
        distributor_name: 'Distributor Sembako Utama',
        is_active: true,
        moderation_status: 'APPROVED',
        created_at: nowISO(),
        updated_at: nowISO()
      },
      'demo-product-gulaku': {
        name: 'Gula Pasir Gulaku 1kg',
        category: 'Sembako',
        description: 'Gula tebu murni kristal putih pilihan keluarga Indonesia.',
        price: 17500,
        stock: 800,
        min_order_quantity: 20,
        unit_type: 'Box',
        image_url: '/assets/fallback-product.png',
        tiered_pricing: [
          { min_quantity: 20, price_per_unit: 17500 },
          { min_quantity: 100, price_per_unit: 16800 }
        ],
        distributor_id: distributorId,
        distributor_name: 'Distributor Sembako Utama',
        is_active: false,
        moderation_status: 'PENDING',
        created_at: nowISO(),
        updated_at: nowISO()
      },
      'demo-product-sariwangi': {
        name: 'Teh Celup SariWangi',
        category: 'Sembako',
        description: 'Teh celup pilihan keluarga Indonesia, harum dan nikmat.',
        price: 8000,
        stock: 300,
        min_order_quantity: 10,
        unit_type: 'Box',
        image_url: '/assets/fallback-product.png',
        tiered_pricing: [
          { min_quantity: 10, price_per_unit: 8000 }
        ],
        distributor_id: distributorId,
        distributor_name: 'Distributor Sembako Utama',
        is_active: false,
        moderation_status: 'APPROVED',
        created_at: nowISO(),
        updated_at: nowISO()
      },
      'demo-product-garam-kapal': {
        name: 'Garam Cap Kapal 500g',
        category: 'Sembako',
        description: 'Garam beryodium konsumsi keluarga, murni dan bersih.',
        price: 5000,
        stock: 150,
        min_order_quantity: 20,
        unit_type: 'Paket',
        image_url: '',
        tiered_pricing: [
          { min_quantity: 20, price_per_unit: 5000 }
        ],
        distributor_id: distributorId,
        distributor_name: 'Distributor Sembako Utama',
        is_active: true,
        moderation_status: 'APPROVED',
        created_at: nowISO(),
        updated_at: nowISO()
      }
    };

    for (const [id, data] of Object.entries(products)) {
      await setDoc(doc(db, 'products', id), data);
      console.log(`  Product seeded: ${data.name}`);
    }

  } catch (err: any) {
    console.error('General DISTRIBUTOR section error:', err.message || err);
  }

  // ==========================================
  // 4. Seed Pending Verification Request (Pending Distributor Role Needed)
  // ==========================================
  try {
    console.log('Authenticating as PENDING DISTRIBUTOR to seed verification request...');
    await signInWithEmailAndPassword(auth, 'distributor-pending@pasarmitra.com', 'password123');
    console.log('Authenticated as PENDING DISTRIBUTOR.');

    try {
      await setDoc(doc(db, 'verification_requests', 'demo-request-cv-sayur-makmur'), verificationRequestPayload);
      console.log('  Verification request seeded successfully as PENDING DISTRIBUTOR.');
    } catch (err: any) {
      console.error('  Failed to seed verification request as PENDING DISTRIBUTOR:', err.message || err);
    }

  } catch (err: any) {
    console.error('General PENDING DISTRIBUTOR section error:', err.message || err);
  }

  // ==========================================
  // 5. Seed Orders, Negotiations, Disputes, and Reviews (UMKM Buyer Role Needed)
  // ==========================================
  try {
    console.log('Authenticating as UMKM to seed orders, negotiations, disputes, and reviews...');
    await signInWithEmailAndPassword(auth, 'umkm@pasarmitra.com', 'password123');
    console.log('Authenticated as UMKM.');

    // Orders
    try {
      console.log('Seeding orders...');
      const orders = {
        'demo-order-pending': {
          order_code: 'ORD-PENDING-99',
          buyer_id: buyerId,
          buyer_email: 'umkm@pasarmitra.com',
          distributor_id: distributorId,
          distributor_name: 'Distributor Sembako Utama',
          total_amount: 360000,
          status: 'pending',
          shipping_address: 'Jl. Syarifuddin Yoes No. 42, Balikpapan Selatan, Balikpapan 76115',
          payment_status: 'unpaid',
          created_at: nowISO(),
          updated_at: nowISO(),
          items: [
            {
              id: 'item-bimoli-1',
              product_id: 'demo-product-bimoli',
              product_name: 'Minyak Goreng Bimoli 2L',
              quantity: 10,
              price_per_unit: 36000,
              total_price: 360000
            }
          ]
        },
        'demo-order-processing': {
          order_code: 'ORD-PROCESS-99',
          buyer_id: buyerId,
          buyer_email: 'umkm@pasarmitra.com',
          distributor_id: distributorId,
          distributor_name: 'Distributor Sembako Utama',
          total_amount: 725000,
          status: 'processing',
          shipping_address: 'Jl. Syarifuddin Yoes No. 42, Balikpapan Selatan, Balikpapan 76115',
          payment_status: 'paid',
          created_at: offsetISO(-86400000),
          updated_at: offsetISO(-86400000),
          items: [
            {
              id: 'item-beras-1',
              product_id: 'demo-product-pandan-wangi',
              product_name: 'Beras Pandan Wangi 10kg',
              quantity: 5,
              price_per_unit: 145000,
              total_price: 725000
            }
          ]
        },
        'demo-order-shipped': {
          order_code: 'ORD-SHIPPED-99',
          buyer_id: buyerId,
          buyer_email: 'umkm@pasarmitra.com',
          distributor_id: distributorId,
          distributor_name: 'Distributor Sembako Utama',
          total_amount: 145000,
          status: 'shipped',
          dispute_status: 'submitted',
          shipping_address: 'Jl. Syarifuddin Yoes No. 42, Balikpapan Selatan, Balikpapan 76115',
          payment_status: 'paid',
          created_at: offsetISO(-129600000),
          updated_at: offsetISO(-129600000),
          items: [
            {
              id: 'item-beras-2',
              product_id: 'demo-product-pandan-wangi',
              product_name: 'Beras Pandan Wangi 10kg',
              quantity: 1,
              price_per_unit: 145000,
              total_price: 145000
            }
          ]
        },
        'demo-order-delivered': {
          order_code: 'ORD-DELIVERED-99',
          buyer_id: buyerId,
          buyer_email: 'umkm@pasarmitra.com',
          distributor_id: distributorId,
          distributor_name: 'Distributor Sembako Utama',
          total_amount: 1085000,
          status: 'delivered',
          shipping_address: 'Jl. Syarifuddin Yoes No. 42, Balikpapan Selatan, Balikpapan 76115',
          payment_status: 'paid',
          created_at: offsetISO(-172800000),
          updated_at: offsetISO(-172800000),
          items: [
            {
              id: 'item-bimoli-2',
              product_id: 'demo-product-bimoli',
              product_name: 'Minyak Goreng Bimoli 2L',
              quantity: 10,
              price_per_unit: 36000,
              total_price: 360000
            },
            {
              id: 'item-beras-3',
              product_id: 'demo-product-pandan-wangi',
              product_name: 'Beras Pandan Wangi 10kg',
              quantity: 5,
              price_per_unit: 145000,
              total_price: 725000
            }
          ]
        },
        'demo-order-refunded': {
          order_code: 'ORD-REFUND-99',
          buyer_id: buyerId,
          buyer_email: 'umkm@pasarmitra.com',
          distributor_id: distributorId,
          distributor_name: 'Distributor Sembako Utama',
          total_amount: 360000,
          status: 'delivered',
          payment_status: 'refunded',
          refund_status: 'refunded',
          dispute_status: 'approved',
          shipping_address: 'Jl. Syarifuddin Yoes No. 42, Balikpapan Selatan, Balikpapan 76115',
          created_at: offsetISO(-259200000),
          updated_at: offsetISO(-259200000),
          items: [
            {
              id: 'item-bimoli-3',
              product_id: 'demo-product-bimoli',
              product_name: 'Minyak Goreng Bimoli 2L',
              quantity: 10,
              price_per_unit: 36000,
              total_price: 360000
            }
          ]
        },
        'demo-order-cancelled': {
          order_code: 'ORD-CANCEL-99',
          buyer_id: buyerId,
          buyer_email: 'umkm@pasarmitra.com',
          distributor_id: distributorId,
          distributor_name: 'Distributor Sembako Utama',
          total_amount: 145000,
          status: 'cancelled',
          shipping_address: 'Jl. Syarifuddin Yoes No. 42, Balikpapan Selatan, Balikpapan 76115',
          payment_status: 'unpaid',
          created_at: offsetISO(-345600000),
          updated_at: offsetISO(-345600000),
          items: [
            {
              id: 'item-beras-4',
              product_id: 'demo-product-pandan-wangi',
              product_name: 'Beras Pandan Wangi 10kg',
              quantity: 1,
              price_per_unit: 145000,
              total_price: 145000
            }
          ]
        }
      };

      for (const [id, data] of Object.entries(orders)) {
        await setDoc(doc(db, 'orders', id), data);
        console.log(`  Order seeded: ${data.order_code}`);
      }
    } catch (err: any) {
      console.error('Failed to seed orders:', err.message || err);
    }

    // B2B Partnerships & Messages
    try {
      console.log('Seeding B2B partnerships & messages...');
      await setDoc(doc(db, 'partnerships', 'demo-partnership-b2b'), {
        distributor_id: distributorId,
        umkm_id: buyerId,
        status: 'active',
        created_at: offsetISO(-604800000)
      });

      const b2bMessages = {
        'demo-partnership-msg-1': {
          room_id: 'demo-partnership-b2b',
          sender_id: buyerId,
          text: 'Halo Budi, apakah stok Beras Pandan Wangi siap kirim besok?',
          type: 'text',
          created_at: offsetISO(-600000)
        },
        'demo-partnership-msg-2': {
          room_id: 'demo-partnership-b2b',
          sender_id: distributorId,
          text: 'Halo Siti, ya stok Pandan Wangi siap dikirim. Mau ambil berapa karung?',
          type: 'text',
          created_at: offsetISO(-300000)
        },
        'demo-partnership-msg-3': {
          room_id: 'demo-partnership-b2b',
          sender_id: buyerId,
          text: 'Saya akan coba order 5 karung dulu lewat checkout, terima kasih.',
          type: 'text',
          created_at: offsetISO(-60000)
        }
      };

      for (const [id, data] of Object.entries(b2bMessages)) {
        await setDoc(doc(db, 'messages', id), data);
      }
      console.log('  B2B partnership messages seeded.');
    } catch (err: any) {
      console.error('Failed to seed B2B partnerships/messages:', err.message || err);
    }

    // Negotiations
    try {
      console.log('Seeding negotiations...');
      const negotiations = {
        'demo-negotiation-bimoli-open': {
          negotiation_code: 'NEG-11111',
          status: 'waiting_distributor',
          distributor_id: distributorId,
          distributor_name: 'Distributor Sembako Utama',
          umkm_id: buyerId,
          buyer_id: buyerId,
          umkm_name: 'Siti Aminah',
          buyer_name: 'Siti Aminah',
          product_id: 'demo-product-bimoli',
          product_name: 'Minyak Goreng Bimoli 2L',
          product_image: '/assets/fallback-product.png',
          original_unit_price: 36000,
          requested_unit_price: 32000,
          quantity: 50,
          latest_message: 'Saya menawarkan Rp 32.000 per karton untuk pembelian 50 karton minyak Bimoli.',
          latest_message_at: nowISO(),
          last_message: 'Saya menawarkan Rp 32.000 per karton untuk pembelian 50 karton minyak Bimoli.',
          last_offer_price: 32000,
          last_offer_by: 'UMKM',
          created_by: buyerId,
          created_at: nowISO(),
          updated_at: nowISO()
        },
        'demo-negotiation-beras-counter': {
          negotiation_code: 'NEG-22222',
          status: 'waiting_buyer',
          distributor_id: distributorId,
          distributor_name: 'Distributor Sembako Utama',
          umkm_id: buyerId,
          buyer_id: buyerId,
          umkm_name: 'Siti Aminah',
          buyer_name: 'Siti Aminah',
          product_id: 'demo-product-pandan-wangi',
          product_name: 'Beras Pandan Wangi 10kg',
          product_image: '/assets/fallback-product.png',
          original_unit_price: 145000,
          requested_unit_price: 142000,
          quantity: 20,
          latest_message: 'Bagaimana jika Rp 142.000? Margin beras kami sangat tipis.',
          latest_message_at: nowISO(),
          last_message: 'Bagaimana jika Rp 142.000? Margin beras kami sangat tipis.',
          last_offer_price: 142000,
          last_offer_by: 'DISTRIBUTOR',
          created_by: buyerId,
          created_at: offsetISO(-3600000),
          updated_at: nowISO()
        },
        'demo-negotiation-bimoli-accepted': {
          negotiation_code: 'NEG-33333',
          status: 'accepted',
          distributor_id: distributorId,
          distributor_name: 'Distributor Sembako Utama',
          umkm_id: buyerId,
          buyer_id: buyerId,
          umkm_name: 'Siti Aminah',
          buyer_name: 'Siti Aminah',
          product_id: 'demo-product-bimoli',
          product_name: 'Minyak Goreng Bimoli 2L',
          product_image: '/assets/fallback-product.png',
          original_unit_price: 36000,
          requested_unit_price: 33000,
          agreed_unit_price: 33000,
          quantity: 30,
          latest_message: 'Penawaran disetujui. Harga akhir telah disepakati.',
          latest_message_at: nowISO(),
          last_message: 'Penawaran disetujui. Harga akhir telah disepakati.',
          last_offer_price: 33000,
          last_offer_by: 'DISTRIBUTOR',
          created_by: buyerId,
          created_at: offsetISO(-7200000),
          updated_at: nowISO()
        },
        'demo-negotiation-beras-checkedout': {
          negotiation_code: 'NEG-44444',
          status: 'checked_out',
          distributor_id: distributorId,
          distributor_name: 'Distributor Sembako Utama',
          umkm_id: buyerId,
          buyer_id: buyerId,
          umkm_name: 'Siti Aminah',
          buyer_name: 'Siti Aminah',
          product_id: 'demo-product-pandan-wangi',
          product_name: 'Beras Pandan Wangi 10kg',
          product_image: '/assets/fallback-product.png',
          original_unit_price: 145000,
          requested_unit_price: 138000,
          agreed_unit_price: 138000,
          quantity: 25,
          latest_message: 'Negosiasi telah dicheckout menjadi pesanan.',
          latest_message_at: nowISO(),
          last_message: 'Negosiasi telah dicheckout menjadi pesanan.',
          last_offer_price: 138000,
          last_offer_by: 'UMKM',
          created_by: buyerId,
          created_at: offsetISO(-10800000),
          updated_at: nowISO(),
          converted_order_id: 'demo-order-processing'
        }
      };

      for (const [id, data] of Object.entries(negotiations)) {
        await setDoc(doc(db, 'negotiations', id), data);
        console.log(`  Negotiation seeded: ${data.negotiation_code}`);
      }

      // Negotiation messages subcollections
      console.log('Seeding negotiation messages...');
      
      // Open
      await setDoc(doc(db, 'negotiations', 'demo-negotiation-bimoli-open', 'messages', 'msg-open-1'), {
        type: 'offer',
        sender_id: buyerId,
        sender_role: 'UMKM',
        sender_name: 'Siti Aminah',
        text: 'Saya menawarkan Rp 32.000 per karton untuk pembelian 50 karton minyak Bimoli.',
        offer: {
          unit_price: 32000,
          quantity: 50,
          note: 'Mohon dipertimbangkan harganya.',
          status: 'pending',
          offer_by: 'UMKM'
        },
        created_at: nowTimestamp()
      });

      // Counter
      await setDoc(doc(db, 'negotiations', 'demo-negotiation-beras-counter', 'messages', 'msg-counter-1'), {
        type: 'offer',
        sender_id: buyerId,
        sender_role: 'UMKM',
        sender_name: 'Siti Aminah',
        text: 'Bisa minta diskon berasnya untuk 20 karung?',
        offer: {
          unit_price: 138000,
          quantity: 20,
          note: '',
          status: 'countered',
          offer_by: 'UMKM'
        },
        created_at: offsetTimestamp(-3600000)
      });
      await setDoc(doc(db, 'negotiations', 'demo-negotiation-beras-counter', 'messages', 'msg-counter-2'), {
        type: 'offer',
        sender_id: distributorId,
        sender_role: 'DISTRIBUTOR',
        sender_name: 'Budi Santoso',
        text: 'Bagaimana jika Rp 142.000? Margin beras kami sangat tipis.',
        offer: {
          unit_price: 142000,
          quantity: 20,
          note: 'Margin beras kami tipis sekali.',
          status: 'pending',
          offer_by: 'DISTRIBUTOR'
        },
        created_at: nowTimestamp()
      });

      // Accepted
      await setDoc(doc(db, 'negotiations', 'demo-negotiation-bimoli-accepted', 'messages', 'msg-accepted-1'), {
        type: 'offer',
        sender_id: buyerId,
        sender_role: 'UMKM',
        sender_name: 'Siti Aminah',
        text: 'Nego minyak Bimoli Rp 33.000 untuk 30 karton.',
        offer: {
          unit_price: 33000,
          quantity: 30,
          note: '',
          status: 'accepted',
          offer_by: 'UMKM'
        },
        created_at: offsetTimestamp(-7200000)
      });
      await setDoc(doc(db, 'negotiations', 'demo-negotiation-bimoli-accepted', 'messages', 'msg-accepted-2'), {
        type: 'system',
        sender_id: 'system-uid',
        sender_role: 'SYSTEM',
        text: 'Tawaran disetujui oleh Distributor. Harga akhir disepakati: Rp 33.000 (Qty: 30).',
        created_at: nowTimestamp()
      });

      // Checkedout
      await setDoc(doc(db, 'negotiations', 'demo-negotiation-beras-checkedout', 'messages', 'msg-checkedout-1'), {
        type: 'offer',
        sender_id: buyerId,
        sender_role: 'UMKM',
        sender_name: 'Siti Aminah',
        text: 'Minta Rp 138.000 untuk 25 karung beras pandan wangi.',
        offer: {
          unit_price: 138000,
          quantity: 25,
          note: '',
          status: 'accepted',
          offer_by: 'UMKM'
        },
        created_at: offsetTimestamp(-10800000)
      });
      await setDoc(doc(db, 'negotiations', 'demo-negotiation-beras-checkedout', 'messages', 'msg-checkedout-2'), {
        type: 'system',
        sender_id: 'system-uid',
        sender_role: 'SYSTEM',
        text: 'Tawaran disetujui oleh Distributor. Harga akhir disepakati: Rp 138.000 (Qty: 25).',
        created_at: offsetTimestamp(-10000000)
      });
      await setDoc(doc(db, 'negotiations', 'demo-negotiation-beras-checkedout', 'messages', 'msg-checkedout-3'), {
        type: 'system',
        sender_id: 'system-uid',
        sender_role: 'SYSTEM',
        text: 'Negosiasi dicheckout oleh Pembeli.',
        created_at: nowTimestamp()
      });

      console.log('  Negotiation messages subcollection seeded successfully.');
    } catch (err: any) {
      console.error('Failed to seed negotiations/messages:', err.message || err);
    }

    // Disputes
    try {
      console.log('Seeding disputes...');
      const disputes = {
        'demo-dispute-submitted': {
          order_id: 'demo-order-shipped',
          orderId: 'demo-order-shipped',
          order_code: 'ORD-SHIPPED-99',
          invoiceId: 'ORD-SHIPPED-99',
          buyer_id: buyerId,
          buyer_name: 'Siti Aminah',
          claimant: 'Siti Aminah',
          distributor_id: distributorId,
          distributor_name: 'Distributor Sembako Utama',
          defendant: 'Distributor Sembako Utama',
          status: 'submitted',
          type: 'damaged_item',
          title: 'Minyak Bocor di Kardus',
          reason: 'Minyak Bocor di Kardus',
          description: 'Dari 10 botol minyak goreng, ada 2 botol yang bocor dan membasahi kardus pengemasan.',
          requested_resolution: 'partial_refund',
          requested_refund_amount: 72000,
          evidence_urls: ['/assets/fallback-product.png'],
          evidence_url: '/assets/fallback-product.png',
          buyer_notes: 'Mohon proses pengembalian dana sebagian untuk botol yang bocor.',
          evidence_note: 'Mohon proses pengembalian dana sebagian untuk botol yang bocor.',
          amount: 'Rp 145.000',
          created_at: nowTimestamp(),
          updated_at: nowTimestamp(),
          created: 'Baru saja'
        },
        'demo-dispute-awaiting': {
          order_id: 'demo-order-delivered',
          orderId: 'demo-order-delivered',
          order_code: 'ORD-DELIVERED-99',
          invoiceId: 'ORD-DELIVERED-99',
          buyer_id: buyerId,
          buyer_name: 'Siti Aminah',
          claimant: 'Siti Aminah',
          distributor_id: distributorId,
          distributor_name: 'Distributor Sembako Utama',
          defendant: 'Distributor Sembako Utama',
          status: 'awaiting_distributor_response',
          type: 'missing_quantity',
          title: 'Beras Kurang 1 Karung',
          reason: 'Beras Kurang 1 Karung',
          description: 'Dipesan 5 karung pandan wangi, namun yang sampai di lokasi hanya 4 karung.',
          requested_resolution: 'partial_refund',
          requested_refund_amount: 145000,
          evidence_urls: ['/assets/fallback-product.png'],
          evidence_url: '/assets/fallback-product.png',
          buyer_notes: 'Kurang 1 karung beras senilai Rp 145.000.',
          evidence_note: 'Kurang 1 karung beras senilai Rp 145.000.',
          amount: 'Rp 1.085.000',
          created_at: offsetTimestamp(-3600000),
          updated_at: offsetTimestamp(-3600000),
          created: '1 jam yang lalu'
        },
        'demo-dispute-review': {
          order_id: 'demo-order-delivered',
          orderId: 'demo-order-delivered',
          order_code: 'ORD-DELIVERED-99',
          invoiceId: 'ORD-DELIVERED-99',
          buyer_id: buyerId,
          buyer_name: 'Siti Aminah',
          claimant: 'Siti Aminah',
          distributor_id: distributorId,
          distributor_name: 'Distributor Sembako Utama',
          defendant: 'Distributor Sembako Utama',
          status: 'under_admin_review',
          type: 'wrong_item',
          title: 'Gula Pasir Tidak Sesuai Merek',
          reason: 'Gula Pasir Tidak Sesuai Merek',
          description: 'Barang dikirim bermerek lokal biasa, bukan Gulaku murni.',
          requested_resolution: 'full_refund',
          requested_refund_amount: 175000,
          evidence_urls: ['/assets/fallback-product.png'],
          evidence_url: '/assets/fallback-product.png',
          buyer_notes: 'Saya minta refund penuh karena merek tidak cocok.',
          evidence_note: 'Saya minta refund penuh karena merek tidak cocok.',
          amount: 'Rp 1.085.000',
          distributor_response: {
            status: 'rejected',
            message: 'Kami mengirimkan sesuai stok yang setara karena Gulaku kosong. Hubungi CS.',
            responded_by: 'Budi Santoso',
            responded_at: offsetTimestamp(-1800000)
          },
          created_at: offsetTimestamp(-7200000),
          updated_at: offsetTimestamp(-1800000),
          created: '2 jam yang lalu'
        },
        'demo-dispute-resolved': {
          order_id: 'demo-order-refunded',
          orderId: 'demo-order-refunded',
          order_code: 'ORD-REFUND-99',
          invoiceId: 'ORD-REFUND-99',
          buyer_id: buyerId,
          buyer_name: 'Siti Aminah',
          claimant: 'Siti Aminah',
          distributor_id: distributorId,
          distributor_name: 'Distributor Sembako Utama',
          defendant: 'Distributor Sembako Utama',
          status: 'approved',
          type: 'not_received',
          title: 'Pengiriman Terlambat & Dibatalkan',
          reason: 'Pengiriman Terlambat & Dibatalkan',
          description: 'Sudah melewati estimasi 3 hari dan barang belum sampai.',
          requested_resolution: 'full_refund',
          requested_refund_amount: 360000,
          evidence_urls: ['/assets/fallback-product.png'],
          evidence_url: '/assets/fallback-product.png',
          buyer_notes: 'Pengiriman sangat terlambat.',
          evidence_note: 'Pengiriman sangat terlambat.',
          amount: 'Rp 360.000',
          distributor_response: {
            status: 'accepted',
            message: 'Kami minta maaf atas keterlambatan armada logistik.',
            responded_by: 'Budi Santoso',
            responded_at: offsetTimestamp(-14400000)
          },
          admin_decision: {
            decision: 'approve_refund',
            notes: 'Refund disetujui penuh oleh admin.',
            refund_amount: 360000,
            decided_by: 'System Admin',
            decided_at: offsetTimestamp(-7200000)
          },
          resolution_type: 'REFUNDED',
          refund_amount: 360000,
          refund_note: 'Refund disetujui penuh oleh admin.',
          refunded_at: offsetTimestamp(-7200000),
          reviewed_by: 'System Admin',
          reviewed_at: offsetTimestamp(-7200000),
          created_at: offsetTimestamp(-28800000),
          updated_at: offsetTimestamp(-7200000),
          created: '8 jam yang lalu'
        }
      };

      for (const [id, data] of Object.entries(disputes)) {
        await setDoc(doc(db, 'disputes', id), data);
        console.log(`  Dispute seeded: ${data.title}`);
      }
    } catch (err: any) {
      console.error('Failed to seed disputes:', err.message || err);
    }

    // Reviews
    try {
      console.log('Seeding reviews...');
      const reviewData = {
        order_id: 'demo-order-refunded',
        product_id: 'demo-product-bimoli',
        distributor_id: distributorId,
        buyer_id: buyerId,
        buyer_name: 'Akun Kompetitor Palsu',
        rating: 1,
        comment: 'Barang palsu jangan beli disini, distributor penipu dan pelayanannya sangat buruk sekali!!!',
        is_hidden: false,
        status: 'reported',
        created_at: offsetISO(-7200000),
        updated_at: offsetISO(-7200000)
      };

      await setDoc(doc(db, 'reviews', 'rev-seeded-99'), reviewData);
      console.log('  Reported review seeded.');
    } catch (err: any) {
      console.error('Failed to seed reviews:', err.message || err);
    }

  } catch (err: any) {
    console.error('General UMKM section error:', err.message || err);
  }

  console.log('--- Database Seeding Complete ---');
  process.exit(0);
}

seedDatabase();
