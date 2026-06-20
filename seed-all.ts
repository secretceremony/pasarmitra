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
  addDoc, 
  getDocs, 
  query, 
  where 
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
      address: 'Jl. Industri Utama No. 88, Bandung',
      reputation_score: 4.8
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
      address: 'Jl. Menteng Raya No. 42, Jakarta Pusat',
      reputation_score: 4.6
    }
  }
];

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
      uids[u.profile.role] = uid;

      // Update Firestore profile doc
      const profileDocRef = doc(db, 'profiles', uid);
      await setDoc(profileDocRef, {
        id: uid,
        email: u.email,
        created_at: new Date().toISOString(),
        ...u.profile
      }, { merge: true });
      console.log(`  Firestore profile populated for role: ${u.profile.role}`);

    } catch (e: any) {
      console.error(`Error processing account ${u.email}:`, e.message || e);
    }
  }

  const distributorId = uids['DISTRIBUTOR'];
  const buyerId = uids['UMKM'];

  if (!distributorId || !buyerId) {
    console.error('Error: Could not retrieve UIDs for Distributor or UMKM buyer.');
    process.exit(1);
  }

  // Sign in as distributor to query/seed products
  try {
    console.log('Authenticating as DISTRIBUTOR to seed products...');
    await signInWithEmailAndPassword(auth, 'distributor@pasarmitra.com', 'password123');
    console.log('Authenticated as DISTRIBUTOR.');
  } catch (err: any) {
    console.error('Failed to authenticate as DISTRIBUTOR:', err.message || err);
    process.exit(1);
  }

  // Helper: Clear existing seeded products for this distributor to avoid clutter
  try {
    const q = query(collection(db, 'products'), where('distributor_id', '==', distributorId));
    const snap = await getDocs(q);
    console.log(`Found ${snap.size} existing products for distributor. Keeping them but adding new seed items.`);
  } catch (e) {
    console.error('Error querying products:', e);
  }

  // 2. Seed 3 Products
  console.log('Seeding 3 products...');
  const productsData = [
    {
      name: 'Minyak Goreng Bimoli 2L',
      category: 'Sembako',
      description: 'Minyak goreng kelapa sawit bermutu tinggi kualitas ekspor.',
      price: 36000,
      stock: 450,
      min_order_quantity: 10,
      unit_type: 'Karton',
      image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=400',
      tiered_pricing: [
        { min_quantity: 10, price_per_unit: 36000 },
        { min_quantity: 50, price_per_unit: 34500 }
      ],
      distributor_id: distributorId,
      distributor_name: 'Distributor Sembako Utama',
      is_active: true,
      moderation_status: 'APPROVED',
    },
    {
      name: 'Beras Pandan Wangi 10kg',
      category: 'Sembako',
      description: 'Beras aromatik pandan wangi asli Cianjur, pulen dan segar.',
      price: 145000,
      stock: 200,
      min_order_quantity: 5,
      unit_type: 'Karung',
      image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400',
      tiered_pricing: [
        { min_quantity: 5, price_per_unit: 145000 },
        { min_quantity: 20, price_per_unit: 140000 }
      ],
      distributor_id: distributorId,
      distributor_name: 'Distributor Sembako Utama',
      is_active: true,
      moderation_status: 'APPROVED',
    },
    {
      name: 'Gula Pasir Gulaku 1kg',
      category: 'Sembako',
      description: 'Gula tebu murni kristal putih pilihan keluarga Indonesia.',
      price: 17500,
      stock: 800,
      min_order_quantity: 20,
      unit_type: 'Box',
      image_url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=400',
      tiered_pricing: [
        { min_quantity: 20, price_per_unit: 17500 },
        { min_quantity: 100, price_per_unit: 16800 }
      ],
      distributor_id: distributorId,
      distributor_name: 'Distributor Sembako Utama',
      is_active: false, // Inactive: pending moderation
      moderation_status: 'PENDING',
    }
  ];

  const productIds: string[] = [];
  for (const prod of productsData) {
    const docRef = await addDoc(collection(db, 'products'), {
      ...prod,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    productIds.push(docRef.id);
    console.log(`  Product created: ${prod.name} (ID: ${docRef.id}, is_active: ${prod.is_active})`);
  }

  // 3. Seed 3 Moderation Items (Pending Approval, Reported Product, Reported Review)
  console.log('Seeding 3 moderation items...');
  const moderationItemsData = [
    {
      type: 'PRODUCT',
      targetType: 'PRODUCT',
      targetId: productIds[2], // Gulaku is inactive
      productId: productIds[2],
      title: 'Gula Pasir Gulaku 1kg',
      author: 'Distributor Sembako Utama',
      distributor_id: distributorId,
      status: 'pending',
      reason: 'Persetujuan Produk Baru',
      timestamp: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      image: productsData[2].image_url
    },
    {
      type: 'PRODUCT',
      targetType: 'PRODUCT',
      targetId: productIds[0], // Bimoli is active but reported
      productId: productIds[0],
      title: 'Minyak Goreng Bimoli 2L',
      author: 'Distributor Sembako Utama',
      distributor_id: distributorId,
      status: 'pending_moderation',
      reason: 'Laporan: Indikasi Penipuan Harga / Mark-up Sepihak',
      timestamp: new Date(Date.now() - 3600000).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
      image: productsData[0].image_url
    },
    {
      type: 'REVIEW',
      targetType: 'REVIEW',
      targetId: 'rev-seeded-99',
      title: 'Ulasan Produk Minyak Goreng',
      author: 'Akun Kompetitor Palsu',
      status: 'needs_review',
      reason: 'Laporan: Konten review kasar, merendahkan, dan SARA',
      content: 'Barang palsu jangan beli disini, distributor penipu dan pelayanannya sangat buruk sekali!!!',
      timestamp: new Date(Date.now() - 7200000).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 7200000).toISOString(),
    }
  ];

  for (const mod of moderationItemsData) {
    const docRef = await addDoc(collection(db, 'moderation_items'), mod);
    console.log(`  Moderation item created: ${mod.reason} (ID: ${docRef.id})`);
  }

  // 4. Seed 3 Orders (Pending, Processing, Delivered)
  console.log('Signing in as UMKM buyer to seed orders, partnerships, and messages...');
  try {
    await signInWithEmailAndPassword(auth, 'umkm@pasarmitra.com', 'password123');
    console.log('Authenticated as UMKM buyer.');
  } catch (err: any) {
    console.error('Failed to authenticate as UMKM buyer:', err.message || err);
    process.exit(1);
  }

  console.log('Seeding 3 orders...');
  const ordersData = [
    {
      buyer_id: buyerId,
      distributor_id: distributorId,
      total_amount: 360000, // 10 karton Bimoli
      status: 'pending',
      shipping_address: 'Jl. Menteng Raya No. 42, Jakarta Pusat, DKI Jakarta 10310',
      payment_status: 'unpaid',
      created_at: new Date().toISOString(),
      items: [
        {
          id: 'item-101',
          product_id: productIds[0],
          product_name: 'Minyak Goreng Bimoli 2L',
          quantity: 10,
          price_per_unit: 36000,
          total_price: 360000
        }
      ]
    },
    {
      buyer_id: buyerId,
      distributor_id: distributorId,
      total_amount: 725000, // 5 karung Berhas Pandan Wangi
      status: 'processing',
      shipping_address: 'Jl. Menteng Raya No. 42, Jakarta Pusat, DKI Jakarta 10310',
      payment_status: 'paid',
      created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      items: [
        {
          id: 'item-102',
          product_id: productIds[1],
          product_name: 'Beras Pandan Wangi 10kg',
          quantity: 5,
          price_per_unit: 145000,
          total_price: 725000
        }
      ]
    },
    {
      buyer_id: buyerId,
      distributor_id: distributorId,
      total_amount: 1085000, // 10 karton Bimoli + 5 karung Beras
      status: 'delivered',
      shipping_address: 'Jl. Menteng Raya No. 42, Jakarta Pusat, DKI Jakarta 10310',
      payment_status: 'paid',
      created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      items: [
        {
          id: 'item-103',
          product_id: productIds[0],
          product_name: 'Minyak Goreng Bimoli 2L',
          quantity: 10,
          price_per_unit: 36000,
          total_price: 360000
        },
        {
          id: 'item-104',
          product_id: productIds[1],
          product_name: 'Beras Pandan Wangi 10kg',
          quantity: 5,
          price_per_unit: 145000,
          total_price: 725000
        }
      ]
    }
  ];

  for (const order of ordersData) {
    const docRef = await addDoc(collection(db, 'orders'), order);
    console.log(`  Order created with status ${order.status} (ID: ${docRef.id})`);
  }

  // 5. Seed 1 B2B Partnership Room
  console.log('Seeding 1 B2B active partnership...');
  const partnershipData = {
    distributor_id: distributorId,
    umkm_id: buyerId,
    status: 'active',
    created_at: new Date(Date.now() - 604800000).toISOString() // 7 days ago
  };

  // Find if already exists
  const partQ = query(
    collection(db, 'partnerships'), 
    where('distributor_id', '==', distributorId),
    where('umkm_id', '==', buyerId)
  );
  const partSnap = await getDocs(partQ);
  let partnershipRoomId = '';

  if (partSnap.empty) {
    const docRef = await addDoc(collection(db, 'partnerships'), partnershipData);
    partnershipRoomId = docRef.id;
    console.log(`  Partnership created (ID: ${partnershipRoomId})`);
  } else {
    partnershipRoomId = partSnap.docs[0].id;
    console.log(`  Existing partnership active (ID: ${partnershipRoomId})`);
  }

  // 6. Seed 3 Chat Messages inside the Partnership Room
  console.log('Seeding 3 chat messages...');
  const messagesData = [
    {
      room_id: partnershipRoomId,
      sender_id: buyerId,
      text: 'Halo Budi, apakah stok Beras Pandan Wangi siap kirim besok?',
      type: 'text',
      created_at: new Date(Date.now() - 600000).toISOString() // 10 mins ago
    },
    {
      room_id: partnershipRoomId,
      sender_id: distributorId,
      text: 'Halo Siti, ya stok Pandan Wangi siap dikirim. Mau ambil berapa karung?',
      type: 'text',
      created_at: new Date(Date.now() - 300000).toISOString() // 5 mins ago
    },
    {
      room_id: partnershipRoomId,
      sender_id: buyerId,
      text: 'Saya akan coba order 5 karung dulu lewat checkout, terima kasih.',
      type: 'text',
      created_at: new Date(Date.now() - 60000).toISOString() // 1 min ago
    }
  ];

  for (const msg of messagesData) {
    const docRef = await addDoc(collection(db, 'messages'), msg);
    console.log(`  Chat message logged (ID: ${docRef.id})`);
  }

  console.log('--- Database Seeding Complete ---');
  process.exit(0);
}

seedDatabase();
