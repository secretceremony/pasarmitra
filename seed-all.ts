import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  deleteUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  collection, 
  Timestamp,
  getDocs,
  deleteDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config();

// Safety confirmation check
if (process.env.ALLOW_DEMO_RESET !== 'true' && !process.argv.includes('--confirm-reset')) {
  console.error('================================================================');
  console.error('WARNING: This script will WIPE all non-admin data in Firestore!');
  console.error('To run this script, you must set the environment variable:');
  console.error('  ALLOW_DEMO_RESET=true');
  console.error('or pass the CLI flag:');
  console.error('  --confirm-reset');
  console.error('================================================================');
  process.exit(1);
}

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

// Seed profile accounts definitions
const testUsers = [
  // ADMIN (Preserved)
  {
    email: 'admin@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'ADMIN',
      full_name: 'System Admin',
      is_verified: true,
      is_active: true,
      is_suspended: false,
    }
  },
  // DISTRIBUTORS (15 accounts)
  {
    email: 'distributor-sembako@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'DISTRIBUTOR',
      full_name: 'Budi Santoso',
      organization_name: 'PT Sembako Nusantara Utama',
      business_type: 'Sembako',
      is_verified: true,
      verification_status: 'VERIFIED',
      is_active: true,
      is_suspended: false,
      address: 'Jl. Ahmad Yani No. 12, Balikpapan Tengah, Balikpapan',
      reputation_score: 4.8,
      phone: '081234567801',
      description: 'Penyedia kebutuhan sembako terlengkap untuk UMKM di Balikpapan.'
    }
  },
  {
    email: 'distributor-sayur@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'DISTRIBUTOR',
      full_name: 'Andi Wijaya',
      organization_name: 'CV Segar Alami Balikpapan',
      business_type: 'Sayur & Buah',
      is_verified: true,
      verification_status: 'VERIFIED',
      is_active: true,
      is_suspended: false,
      address: 'Jl. Mulawarman No. 54, Balikpapan Timur, Balikpapan',
      reputation_score: 4.7,
      phone: '081234567802',
      description: 'Supplier sayuran segar langsung dari petani lokal.'
    }
  },
  {
    email: 'distributor-daging@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'DISTRIBUTOR',
      full_name: 'Hendra Wijaya',
      organization_name: 'Jaya Marina Seafood & Meat',
      business_type: 'Daging & Seafood',
      is_verified: true,
      verification_status: 'VERIFIED',
      is_active: true,
      is_suspended: false,
      address: 'Jl. Jenderal Sudirman No. 78, Balikpapan Kota, Balikpapan',
      reputation_score: 4.9,
      phone: '081234567803',
      description: 'Daging sapi, ayam, dan seafood beku berkualitas ekspor.'
    }
  },
  {
    email: 'distributor-bumbu@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'DISTRIBUTOR',
      full_name: 'Siti Rahma',
      organization_name: 'UD Bumbu Ibu Tradisional',
      business_type: 'Bumbu Dapur',
      is_verified: true,
      verification_status: 'VERIFIED',
      is_active: true,
      is_suspended: false,
      address: 'Jl. Soekarno Hatta Km 4.5, Balikpapan Utara, Balikpapan',
      reputation_score: 4.5,
      phone: '081234567804',
      description: 'Bumbu dapur giling dan kering tradisional pilihan.'
    }
  },
  {
    email: 'distributor-frozen@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'DISTRIBUTOR',
      full_name: 'Rian Hidayat',
      organization_name: 'CV Beku Lestari Mandiri',
      business_type: 'Frozen Food',
      is_verified: false,
      verification_status: 'PENDING_REVIEW',
      is_active: true,
      is_suspended: false,
      address: 'Jl. Letjen S. Parman No. 23, Balikpapan Tengah, Balikpapan',
      reputation_score: 0.0,
      phone: '081234567805',
      description: 'Supplier makanan beku siap saji skala industri.',
      nib: '9120005554443',
      npwp: '02.345.678.9-901.000',
      warehouse_permit: 'SIPB-12/2026/FROZEN',
      legal_info: {
        company_name: 'CV Beku Lestari Mandiri',
        nib: '9120005554443',
        npwp: '02.345.678.9-901.000',
        business_address: 'Jl. Letjen S. Parman No. 23, Balikpapan Tengah, Balikpapan',
        phone: '081234567805',
        submitted_at: new Date().toISOString()
      }
    }
  },
  {
    email: 'distributor-kemasan@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'DISTRIBUTOR',
      full_name: 'Susilo Bambang',
      organization_name: 'PT PackIndo Kemasan Pratama',
      business_type: 'Kemasan Makanan',
      is_verified: true,
      verification_status: 'VERIFIED',
      is_active: true,
      is_suspended: false,
      address: 'Jl. Ring Road No. 89, Balikpapan Selatan, Balikpapan',
      reputation_score: 4.6,
      phone: '081234567806',
      description: 'Food grade packaging untuk bisnis kuliner dan UMKM.'
    }
  },
  {
    email: 'distributor-minuman@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'DISTRIBUTOR',
      full_name: 'Indra Lesmana',
      organization_name: 'CV Segar Sentosa',
      business_type: 'Minuman',
      is_verified: true,
      verification_status: 'VERIFIED',
      is_active: true,
      is_suspended: false,
      address: 'Jl. MT Haryono No. 102, Balikpapan Selatan, Balikpapan',
      reputation_score: 4.6,
      phone: '081234567807',
      description: 'Distributor resmi susu UHT, sirup, dan teh bubuk premium.'
    }
  },
  {
    email: 'distributor-kue@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'DISTRIBUTOR',
      full_name: 'Diana Putri',
      organization_name: "Baker's Choice Supply",
      business_type: 'Bahan Kue',
      is_verified: true,
      verification_status: 'VERIFIED',
      is_active: true,
      is_suspended: false,
      address: 'Jl. Ruhui Rahayu No. 44, Balikpapan Selatan, Balikpapan',
      reputation_score: 4.8,
      phone: '081234567808',
      description: 'Penyedia bahan pembuat roti, kue, dan pastry berkualitas.'
    }
  },
  {
    email: 'distributor-bersih@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'DISTRIBUTOR',
      full_name: 'Taufik Hidayat',
      organization_name: 'PT CleanPro Higienis',
      business_type: 'Produk Kebersihan Usaha',
      is_verified: true,
      verification_status: 'VERIFIED',
      is_active: true,
      is_suspended: false,
      address: 'Jl. Marsma R. Iswahyudi No. 15, Balikpapan Selatan, Balikpapan',
      reputation_score: 4.4,
      phone: '081234567809',
      description: 'Sabun cuci piring dan pembersih industri curah harga terjangkau.'
    }
  },
  {
    email: 'distributor-dapur@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'DISTRIBUTOR',
      full_name: 'Lukas Adi',
      organization_name: 'CV Kitchen Tools Jaya',
      business_type: 'Peralatan Dapur Kecil',
      is_verified: true,
      verification_status: 'VERIFIED',
      is_active: true,
      is_suspended: false,
      address: 'Jl. Jenderal Ahmad Yani No. 112, Balikpapan Tengah, Balikpapan',
      reputation_score: 4.5,
      phone: '081234567810',
      description: 'Peralatan memasak stainless steel, blender, wajan teflon.'
    }
  },
  {
    email: 'distributor-kopi@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'DISTRIBUTOR',
      full_name: 'Roni Gunawan',
      organization_name: 'UD Kopi Kita Balikpapan',
      business_type: 'Supplier Kopi/Teh',
      is_verified: false,
      verification_status: 'REJECTED',
      is_active: true,
      is_suspended: false,
      address: 'Jl. Syarifuddin Yoes No. 99, Balikpapan Selatan, Balikpapan',
      reputation_score: 0.0,
      phone: '081234567811',
      description: 'Supplier kopi robusta dan arabika panggangan lokal.',
      rejection_reason: 'Dokumen NIB tidak valid dan tidak sesuai dengan nama perusahaan.',
      nib: '9120004443332',
      npwp: '01.345.678.9-901.000',
      warehouse_permit: 'SIPB-09/2026/KOPI',
      legal_info: {
        company_name: 'UD Kopi Kita Balikpapan',
        nib: '9120004443332',
        npwp: '01.345.678.9-901.000',
        business_address: 'Jl. Syarifuddin Yoes No. 99, Balikpapan Selatan, Balikpapan',
        phone: '081234567811',
        submitted_at: new Date().toISOString()
      }
    }
  },
  {
    email: 'distributor-beras@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'DISTRIBUTOR',
      full_name: 'Ahmad Syarif',
      organization_name: 'Toko Beras Karawang Jaya',
      business_type: 'Supplier Beras',
      is_verified: true,
      verification_status: 'VERIFIED',
      is_active: true,
      is_suspended: false,
      address: 'Jl. Letkol Pol. Asnawi Arbain No. 8, Balikpapan Selatan, Balikpapan',
      reputation_score: 4.9,
      phone: '081234567812',
      description: 'Agen besar beras Karawang Ramos dan pandan wangi.'
    }
  },
  {
    email: 'distributor-telur@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'DISTRIBUTOR',
      full_name: 'Yusuf Mansur',
      organization_name: 'CV Telur Jaya',
      business_type: 'Supplier Telur',
      is_verified: true,
      verification_status: 'VERIFIED',
      is_active: true,
      is_suspended: true,
      address: 'Jl. Soekarno Hatta Km 2.5, Balikpapan Utara, Balikpapan',
      reputation_score: 4.3,
      phone: '081234567813',
      description: 'Supplier telur ayam negeri segar harian langsung dari kandang.'
    }
  },
  {
    email: 'distributor-minyak@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'DISTRIBUTOR',
      full_name: 'Hadi Santoso',
      organization_name: 'CV Sawit Sejahtera Borneo',
      business_type: 'Supplier Minyak Goreng',
      is_verified: false,
      verification_status: 'PENDING_REVIEW',
      is_active: true,
      is_suspended: false,
      address: 'Jl. Mulawarman No. 20, Balikpapan Timur, Balikpapan',
      reputation_score: 0.0,
      phone: '081234567814',
      description: 'Distributor minyak goreng kelapa sawit curah dan kemasan.',
      nib: '9120002223334',
      npwp: '01.456.789.2-901.000',
      warehouse_permit: 'SIPB-08/2026/SAWIT',
      legal_info: {
        company_name: 'CV Sawit Sejahtera Borneo',
        nib: '9120002223334',
        npwp: '01.456.789.2-901.000',
        business_address: 'Jl. Mulawarman No. 20, Balikpapan Timur, Balikpapan',
        phone: '081234567814',
        submitted_at: new Date().toISOString()
      }
    }
  },
  {
    email: 'distributor-gula@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'DISTRIBUTOR',
      full_name: 'Eko Prasetyo',
      organization_name: 'CV Gula Manis Utama',
      business_type: 'Supplier Gula & Tepung',
      is_verified: true,
      verification_status: 'VERIFIED',
      is_active: true,
      is_suspended: false,
      address: 'Jl. Letjen Suprapto No. 67, Balikpapan Barat, Balikpapan',
      reputation_score: 4.7,
      phone: '081234567815',
      description: 'Gula tebu, gula aren bubuk, tepung tapioka, dan tepung beras.'
    }
  },
  // UMKMs (12 accounts)
  {
    email: 'umkm-warungmakan@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'UMKM',
      full_name: 'Siti Aminah',
      organization_name: 'Warung Nasi Bu Susi',
      business_type: 'Warung Makan',
      is_active: true,
      is_suspended: false,
      address: 'Jl. Syarifuddin Yoes No. 42, Balikpapan Selatan, Balikpapan',
      reputation_score: 4.6,
      phone: '085234567901',
      description: 'Warung makan sederhana menyajikan masakan khas Jawa.'
    }
  },
  {
    email: 'umkm-kedaikopi@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'UMKM',
      full_name: 'Rudi Hermawan',
      organization_name: 'Kedai Kopi Kebun',
      business_type: 'Kedai Kopi',
      is_active: true,
      is_suspended: false,
      address: 'Jl. MT Haryono No. 15, Balikpapan Selatan, Balikpapan',
      reputation_score: 4.7,
      phone: '085234567902',
      description: 'Kedai kopi outdoor dengan konsep alam di tengah kota.'
    }
  },
  {
    email: 'umkm-tokokue@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'UMKM',
      full_name: 'Dewi Lestari',
      organization_name: 'Cake Story Balikpapan',
      business_type: 'Toko Kue',
      is_active: true,
      is_suspended: false,
      address: 'Jl. Letjen S. Parman No. 12, Balikpapan Tengah, Balikpapan',
      reputation_score: 4.5,
      phone: '085234567903',
      description: 'Spesialis kue tart, bolu gulung, dan kue kering pesanan.'
    }
  },
  {
    email: 'umkm-catering@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'UMKM',
      full_name: 'Hajah Halimah',
      organization_name: 'Catering Barokah',
      business_type: 'Catering Rumahan',
      is_active: true,
      is_suspended: false,
      address: 'Jl. Ruhui Rahayu No. 8, Balikpapan Selatan, Balikpapan',
      reputation_score: 4.8,
      phone: '085234567904',
      description: 'Catering prasmanan dan nasi kotak untuk berbagai acara.'
    }
  },
  {
    email: 'umkm-frozen@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'UMKM',
      full_name: 'Dian Wahyu',
      organization_name: 'Kedai Frozen Balikpapan',
      business_type: 'Penjual Frozen Food',
      is_active: true,
      is_suspended: false,
      address: 'Jl. Ruhui Rahayu I No. 3, Balikpapan Selatan, Balikpapan',
      reputation_score: 4.4,
      phone: '085234567905',
      description: 'Menjual aneka nugget, sosis, dan kentang beku retail.'
    }
  },
  {
    email: 'umkm-sembako@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'UMKM',
      full_name: 'Amin Rais',
      organization_name: 'Warung Kelontong Amin',
      business_type: 'Warung Sembako',
      is_active: true,
      is_suspended: false,
      address: 'Jl. Jenderal Sudirman No. 45, Balikpapan Kota, Balikpapan',
      reputation_score: 4.5,
      phone: '085234567906',
      description: 'Menjual barang kebutuhan pokok harian rumah tangga.'
    }
  },
  {
    email: 'umkm-gorengan@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'UMKM',
      full_name: 'Bambang Slamet',
      organization_name: 'Gorengan Crispy Mas Bambang',
      business_type: 'Pedagang Gorengan',
      is_active: true,
      is_suspended: false,
      address: 'Jl. Soekarno Hatta Km 1, Balikpapan Utara, Balikpapan',
      reputation_score: 4.3,
      phone: '085234567907',
      description: 'Gorengan tempe mendoan, tahu isi, bakwan, pisang goreng.'
    }
  },
  {
    email: 'umkm-minuman@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'UMKM',
      full_name: 'Siska Natalia',
      organization_name: 'Teh Manis Solo Laris',
      business_type: 'Usaha Minuman',
      is_active: true,
      is_suspended: false,
      is_inactive: true,
      status: 'INACTIVE',
      address: 'Jl. Ruhui Rahayu No. 50, Balikpapan Selatan, Balikpapan',
      reputation_score: 0.0,
      phone: '085234567908',
      description: 'Booth minuman es teh solo rasa premium manis legit.'
    }
  },
  {
    email: 'umkm-bakery@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'UMKM',
      full_name: 'Rina Wati',
      organization_name: 'Roti Wangi Bakery',
      business_type: 'Bakery Kecil',
      is_active: true,
      is_suspended: false,
      address: 'Jl. MT Haryono No. 89, Balikpapan Selatan, Balikpapan',
      reputation_score: 4.7,
      phone: '085234567909',
      description: 'Roti manis, roti tawar, dan donat buatan sendiri harian.'
    }
  },
  {
    email: 'umkm-depot@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'UMKM',
      full_name: 'Joko Widodo',
      organization_name: 'Depot Selera Baru',
      business_type: 'Depot Makanan',
      is_active: true,
      is_suspended: false,
      address: 'Jl. Marsma R. Iswahyudi No. 54, Balikpapan Selatan, Balikpapan',
      reputation_score: 4.6,
      phone: '085234567910',
      description: 'Depot makan dengan menu Chinese Food halal dan seafood.'
    }
  },
  {
    email: 'umkm-snack@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'UMKM',
      full_name: 'Fitriani',
      organization_name: 'Snack Rumahan Gurih',
      business_type: 'Snack Rumahan',
      is_active: true,
      is_suspended: false,
      address: 'Jl. Letjen Suprapto No. 10, Balikpapan Barat, Balikpapan',
      reputation_score: 4.4,
      phone: '085234567911',
      description: 'Pengemas makaroni pedas, keripik pisang, dan kacang bawang.'
    }
  },
  {
    email: 'umkm-angkringan@pasarmitra.com',
    password: 'password123',
    profile: {
      role: 'UMKM',
      full_name: 'Joko Susilo',
      organization_name: 'Angkringan Mas Joko',
      business_type: 'Angkringan/Kedai Malam',
      is_active: true,
      is_suspended: false,
      is_inactive: true,
      status: 'INACTIVE',
      address: 'Jl. Ahmad Yani No. 154, Balikpapan Tengah, Balikpapan',
      reputation_score: 0.0,
      phone: '085234567912',
      description: 'Nasi kucing, sate usus, sate kulit, wedang jahe malam hari.'
    }
  }
];

const nowISO = () => new Date().toISOString();
const offsetISO = (ms: number) => new Date(Date.now() + ms).toISOString();
const nowTimestamp = () => Timestamp.now();
const offsetTimestamp = (ms: number) => Timestamp.fromDate(new Date(Date.now() + ms));

async function clearCollection(name: string): Promise<number> {
  const snapshot = await getDocs(collection(db, name));
  let count = 0;
  const batch = writeBatch(db);
  snapshot.forEach((d) => {
    batch.delete(d.ref);
    count++;
  });
  if (count > 0) {
    await batch.commit();
  }
  return count;
}

async function clearNegotiations(): Promise<number> {
  const snapshot = await getDocs(collection(db, 'negotiations'));
  let count = 0;
  for (const negDoc of snapshot.docs) {
    // Safety check: Delete subcollection messages first to prevent orphaned data
    const subMsgs = await getDocs(collection(db, 'negotiations', negDoc.id, 'messages'));
    const batch = writeBatch(db);
    subMsgs.forEach((subDoc) => {
      batch.delete(subDoc.ref);
    });
    batch.delete(negDoc.ref);
    await batch.commit();
    count++;
  }
  return count;
}

async function clearProfilesExceptAdmin(): Promise<number> {
  const snapshot = await getDocs(collection(db, 'profiles'));
  let count = 0;
  const batch = writeBatch(db);
  snapshot.forEach((d) => {
    const data = d.data();
    if (data.role !== 'ADMIN' && data.email !== 'admin@pasarmitra.com') {
      batch.delete(d.ref);
      count++;
    }
  });
  if (count > 0) {
    await batch.commit();
  }
  return count;
}

async function seedDatabase() {
  console.log('--- starting PasarMitra Database Seeding ---');

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('Error: Firebase configuration missing from environment variables.');
    process.exit(1);
  }

  // 1. Authenticate as ADMIN first
  console.log('Authenticating as ADMIN for data cleanup and initial settings...');
  let adminUid = '';
  try {
    const adminCred = await signInWithEmailAndPassword(auth, 'admin@pasarmitra.com', 'password123');
    adminUid = adminCred.user.uid;
    console.log(`Authenticated as ADMIN (UID: ${adminUid}) successfully.`);
  } catch (err: any) {
    console.error('Fatal: Failed to login as ADMIN. Check if admin credentials exist.', err.message || err);
    process.exit(1);
  }

  // 2. Clear old developer accounts in Firebase Auth safely
  console.log('--- Cleaning up old non-admin Auth users ---');
  const oldEmailsToDelete = [
    'distributor@pasarmitra.com',
    'distributor-pending@pasarmitra.com',
    'umkm@pasarmitra.com',
    'umkm-unverified@pasarmitra.com'
  ];
  let deletedAuthUsersCount = 0;
  for (const email of oldEmailsToDelete) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, 'password123');
      if (userCredential.user) {
        await deleteUser(userCredential.user);
        console.log(`  Successfully deleted old Auth user: ${email}`);
        deletedAuthUsersCount++;
      }
    } catch (e) {
      // Ignore if user doesn't exist
    }
  }
  console.log(`--- Cleaned up ${deletedAuthUsersCount} old Auth users ---`);

  // Re-authenticate as ADMIN (since deleting a user signs out the current session)
  console.log('Re-authenticating as ADMIN to perform Firestore reset...');
  await signInWithEmailAndPassword(auth, 'admin@pasarmitra.com', 'password123');

  // 3. Clear Firestore Collections
  console.log('--- Wiping Firestore collections (except Admin) ---');
  const deletedProfiles = await clearProfilesExceptAdmin();
  const deletedProducts = await clearCollection('products');
  const deletedOrders = await clearCollection('orders');
  const deletedNegotiations = await clearNegotiations();
  const deletedDisputes = await clearCollection('disputes');
  const deletedMessages = await clearCollection('messages');
  const deletedPartnerships = await clearCollection('partnerships');
  const deletedVerificationRequests = await clearCollection('verification_requests');
  const deletedWalletTransactions = await clearCollection('wallet_transactions');
  const deletedModerationItems = await clearCollection('moderation_items');
  const deletedReviews = await clearCollection('reviews');
  const deletedAuditLogs = await clearCollection('audit_logs');
  const deletedPayoutRequests = await clearCollection('payout_requests');
  const deletedNotifications = await clearCollection('notifications');

  console.log(`--- Wiped Firestore Complete ---`);
  console.log(`  Profiles Deleted: ${deletedProfiles}`);
  console.log(`  Products Deleted: ${deletedProducts}`);
  console.log(`  Orders Deleted: ${deletedOrders}`);
  console.log(`  Negotiations Deleted: ${deletedNegotiations}`);
  console.log(`  Disputes Deleted: ${deletedDisputes}`);
  console.log(`  B2B Messages Deleted: ${deletedMessages}`);
  console.log(`  Partnerships Deleted: ${deletedPartnerships}`);
  console.log(`  Verification Requests Deleted: ${deletedVerificationRequests}`);
  console.log(`  Wallet Transactions Deleted: ${deletedWalletTransactions}`);
  console.log(`  Moderation Items Deleted: ${deletedModerationItems}`);
  console.log(`  Reviews Deleted: ${deletedReviews}`);
  console.log(`  Audit Logs Deleted: ${deletedAuditLogs}`);
  console.log(`  Payout Requests Deleted: ${deletedPayoutRequests}`);
  console.log(`  Notifications Deleted: ${deletedNotifications}`);

  // 4. Create/Retrieve Accounts in Auth and populate profiles
  console.log('--- Creating and seeding new realistic profiles ---');
  const uids: Record<string, string> = {};
  let createdAccountsCount = 0;
  let reusedAccountsCount = 0;
  let seededProfilesCount = 0;

  for (const u of testUsers) {
    try {
      console.log(`Processing user: ${u.email}...`);
      let uid = '';
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, u.email, u.password);
        uid = userCredential.user.uid;
        console.log(`  Auth user created with UID: ${uid}`);
        createdAccountsCount++;
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          const userCredential = await signInWithEmailAndPassword(auth, u.email, u.password);
          uid = userCredential.user.uid;
          console.log(`  Retrieved existing UID: ${uid}`);
          reusedAccountsCount++;
        } else {
          throw err;
        }
      }
      uids[u.email] = uid;

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
      seededProfilesCount++;

    } catch (e: any) {
      console.error(`Error processing account ${u.email}:`, e.message || e);
    }
  }

  // Re-authenticate as ADMIN to continue seeding child data collections
  console.log('Re-authenticating as ADMIN for data seeding...');
  await signInWithEmailAndPassword(auth, 'admin@pasarmitra.com', 'password123');

  // Grab UIDs of interest
  const sembakoDistId = uids['distributor-sembako@pasarmitra.com'];
  const sayurDistId = uids['distributor-sayur@pasarmitra.com'];
  const dagingDistId = uids['distributor-daging@pasarmitra.com'];
  const bumbuDistId = uids['distributor-bumbu@pasarmitra.com'];
  const frozenDistId = uids['distributor-frozen@pasarmitra.com'];
  const kemasanDistId = uids['distributor-kemasan@pasarmitra.com'];
  const minumanDistId = uids['distributor-minuman@pasarmitra.com'];
  const kueDistId = uids['distributor-kue@pasarmitra.com'];
  const bersihDistId = uids['distributor-bersih@pasarmitra.com'];
  const dapurDistId = uids['distributor-dapur@pasarmitra.com'];
  const kopiDistId = uids['distributor-kopi@pasarmitra.com'];
  const berasDistId = uids['distributor-beras@pasarmitra.com'];
  const telurDistId = uids['distributor-telur@pasarmitra.com'];
  const minyakDistId = uids['distributor-minyak@pasarmitra.com'];
  const gulaDistId = uids['distributor-gula@pasarmitra.com'];

  const umkmWarungId = uids['umkm-warungmakan@pasarmitra.com'];
  const umkmKopiId = uids['umkm-kedaikopi@pasarmitra.com'];
  const umkmKueId = uids['umkm-tokokue@pasarmitra.com'];
  const umkmCateringId = uids['umkm-catering@pasarmitra.com'];
  const umkmFrozenId = uids['umkm-frozen@pasarmitra.com'];
  const umkmSembakoId = uids['umkm-sembako@pasarmitra.com'];
  const umkmGorenganId = uids['umkm-gorengan@pasarmitra.com'];
  const umkmMinumanId = uids['umkm-minuman@pasarmitra.com'];
  const umkmBakeryId = uids['umkm-bakery@pasarmitra.com'];
  const umkmDepotId = uids['umkm-depot@pasarmitra.com'];
  const umkmSnackId = uids['umkm-snack@pasarmitra.com'];
  const umkmAngkringanId = uids['umkm-angkringan@pasarmitra.com'];

  // ==========================================
  // 5. Seed Settings & Commission Tiers
  // ==========================================
  try {
    console.log('Seeding settings/commission...');
    await setDoc(doc(db, 'settings', 'commission'), {
      globalBaseline: 1.5,
      updatedAt: nowISO()
    });

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
        partnersActive: 15,
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
        partnersActive: 12,
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
    }
  } catch (err: any) {
    console.error('Failed to seed settings/commission_tiers:', err.message || err);
  }

  // ==========================================
  // 6. Seed Products
  // ==========================================
  console.log('Seeding products...');
  const productsList = {
    // Sembako
    'prod-sembako-1': {
      name: 'Beras Pandan Wangi 10kg',
      category: 'Sembako',
      description: 'Beras pandan wangi premium asli Cianjur, pulen dan wangi alami.',
      price: 145000,
      stock: 120,
      min_order_quantity: 5,
      unit_type: 'Karung',
      image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
      tiered_pricing: [{ min_quantity: 5, price_per_unit: 145000 }, { min_quantity: 20, price_per_unit: 140000 }],
      distributor_id: sembakoDistId,
      distributor_name: 'PT Sembako Nusantara Utama',
      is_active: true,
      moderation_status: 'APPROVED',
      created_at: nowISO(),
      updated_at: nowISO()
    },
    'prod-sembako-2': {
      name: 'Minyak Goreng Bimoli 2L',
      category: 'Sembako',
      description: 'Minyak goreng kelapa sawit berkualitas tinggi untuk gorengan renyah.',
      price: 36000,
      stock: 350,
      min_order_quantity: 10,
      unit_type: 'Karton',
      image_url: 'https://images.unsplash.com/photo-1620706857370-e1b977f7de5e?auto=format&fit=crop&w=600&q=80',
      tiered_pricing: [{ min_quantity: 10, price_per_unit: 36000 }, { min_quantity: 50, price_per_unit: 34500 }],
      distributor_id: sembakoDistId,
      distributor_name: 'PT Sembako Nusantara Utama',
      is_active: true,
      moderation_status: 'APPROVED',
      created_at: nowISO(),
      updated_at: nowISO()
    },
    'prod-sembako-3': {
      name: 'Gula Pasir Gulaku 1kg',
      category: 'Sembako',
      description: 'Gula pasir kristal putih murni higienis cocok untuk aneka minuman.',
      price: 17500,
      stock: 500,
      min_order_quantity: 20,
      unit_type: 'Karton',
      image_url: 'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?auto=format&fit=crop&w=600&q=80',
      tiered_pricing: [{ min_quantity: 20, price_per_unit: 17500 }],
      distributor_id: sembakoDistId,
      distributor_name: 'PT Sembako Nusantara Utama',
      is_active: true,
      moderation_status: 'APPROVED',
      created_at: nowISO(),
      updated_at: nowISO()
    },
    // Sayur
    'prod-sayur-1': {
      name: 'Tomat Ceri Segar 500g',
      category: 'Sayur & Buah',
      description: 'Tomat ceri segar manis cocok untuk salad and masakan.',
      price: 15000,
      stock: 80,
      min_order_quantity: 5,
      unit_type: 'Paket',
      image_url: 'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=600&q=80',
      tiered_pricing: [{ min_quantity: 5, price_per_unit: 15000 }],
      distributor_id: sayurDistId,
      distributor_name: 'CV Segar Alami Balikpapan',
      is_active: true,
      moderation_status: 'APPROVED',
      created_at: nowISO(),
      updated_at: nowISO()
    },
    'prod-sayur-2': {
      name: 'Kentang Dieng Super 1kg',
      category: 'Sayur & Buah',
      description: 'Kentang Dieng berkualitas ukuran besar dan mulus.',
      price: 18000,
      stock: 200,
      min_order_quantity: 10,
      unit_type: 'Kg',
      image_url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80',
      tiered_pricing: [{ min_quantity: 10, price_per_unit: 18000 }, { min_quantity: 50, price_per_unit: 16500 }],
      distributor_id: sayurDistId,
      distributor_name: 'CV Segar Alami Balikpapan',
      is_active: true,
      moderation_status: 'APPROVED',
      created_at: nowISO(),
      updated_at: nowISO()
    },
    // Daging
    'prod-daging-1': {
      name: 'Daging Sapi Sirloin Steak 1kg',
      category: 'Daging & Seafood',
      description: 'Daging sapi sirloin beku asal Australia tender juicy.',
      price: 135000,
      stock: 60,
      min_order_quantity: 2,
      unit_type: 'Pack',
      image_url: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=600&q=80',
      tiered_pricing: [{ min_quantity: 2, price_per_unit: 135000 }, { min_quantity: 10, price_per_unit: 130000 }],
      distributor_id: dagingDistId,
      distributor_name: 'Jaya Marina Seafood & Meat',
      is_active: true,
      moderation_status: 'APPROVED',
      created_at: nowISO(),
      updated_at: nowISO()
    },
    'prod-daging-2': {
      name: 'Fillet Dada Ayam Tanpa Kulit 1kg',
      category: 'Daging & Seafood',
      description: 'Daging dada ayam fillet segar bersih tanpa tulang.',
      price: 55000,
      stock: 150,
      min_order_quantity: 5,
      unit_type: 'Kg',
      image_url: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=600&q=80',
      tiered_pricing: [{ min_quantity: 5, price_per_unit: 55000 }, { min_quantity: 20, price_per_unit: 52000 }],
      distributor_id: dagingDistId,
      distributor_name: 'Jaya Marina Seafood & Meat',
      is_active: true,
      moderation_status: 'APPROVED',
      created_at: nowISO(),
      updated_at: nowISO()
    },
    // Kue
    'prod-kue-1': {
      name: 'Mentega Wisman Butter 250g',
      category: 'Bahan Kue',
      description: 'Mentega impor kualitas premium aromatik tinggi untuk kue lezat.',
      price: 95000,
      stock: 100,
      min_order_quantity: 4,
      unit_type: 'Tin',
      image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=600&q=80',
      tiered_pricing: [{ min_quantity: 4, price_per_unit: 95000 }, { min_quantity: 20, price_per_unit: 90000 }],
      distributor_id: kueDistId,
      distributor_name: "Baker's Choice Supply",
      is_active: true,
      moderation_status: 'APPROVED',
      created_at: nowISO(),
      updated_at: nowISO()
    },
    // Minuman
    'prod-minuman-1': {
      name: 'Susu UHT Greenfields Full Cream 1L',
      category: 'Minuman',
      description: 'Susu cair segar UHT kemasan karton isi 1 liter.',
      price: 21000,
      stock: 240,
      min_order_quantity: 12,
      unit_type: 'Karton',
      image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80',
      tiered_pricing: [{ min_quantity: 12, price_per_unit: 21000 }],
      distributor_id: minumanDistId,
      distributor_name: 'CV Segar Sentosa',
      is_active: true,
      moderation_status: 'APPROVED',
      created_at: nowISO(),
      updated_at: nowISO()
    },
    // Kebersihan
    'prod-bersih-1': {
      name: 'Sabun Cuci Piring Cair Sunlight 5L',
      category: 'Produk Kebersihan Usaha',
      description: 'Sabun cuci piring konsentrat kemasan jerigen 5 liter hemat usaha.',
      price: 85000,
      stock: 50,
      min_order_quantity: 2,
      unit_type: 'Jerigen',
      image_url: 'https://images.unsplash.com/photo-1585832770485-e28e329d77f3?auto=format&fit=crop&w=600&q=80',
      tiered_pricing: [{ min_quantity: 2, price_per_unit: 85000 }],
      distributor_id: bersihDistId,
      distributor_name: 'PT CleanPro Higienis',
      is_active: true,
      moderation_status: 'APPROVED',
      created_at: nowISO(),
      updated_at: nowISO()
    },
    // Bumbu Dapur
    'prod-bumbu-1': {
      name: 'Bawang Merah Brebes Super 1kg',
      category: 'Bumbu Dapur',
      description: 'Bawang merah Brebes berkualitas kering, bersih, dan harum.',
      price: 32000,
      stock: 120,
      min_order_quantity: 5,
      unit_type: 'Kg',
      image_url: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=600&q=80',
      tiered_pricing: [{ min_quantity: 5, price_per_unit: 32000 }],
      distributor_id: bumbuDistId,
      distributor_name: 'UD Bumbu Ibu Tradisional',
      is_active: true,
      moderation_status: 'APPROVED',
      created_at: nowISO(),
      updated_at: nowISO()
    },
    // Kemasan Makanan
    'prod-kemasan-1': {
      name: 'Paper Bowl Food Grade 500ml',
      category: 'Kemasan Makanan',
      description: 'Mangkuk kertas tahan panas isi 50pcs per pack anti bocor.',
      price: 45000,
      stock: 200,
      min_order_quantity: 5,
      unit_type: 'Pack',
      image_url: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=600&q=80',
      tiered_pricing: [{ min_quantity: 5, price_per_unit: 45000 }],
      distributor_id: kemasanDistId,
      distributor_name: 'PT PackIndo Kemasan Pratama',
      is_active: true,
      moderation_status: 'APPROVED',
      created_at: nowISO(),
      updated_at: nowISO()
    },
    // Peralatan Dapur
    'prod-dapur-1': {
      name: 'Wajan Teflon Maxim 30cm',
      category: 'Peralatan Dapur Kecil',
      description: 'Wajan penggorengan anti lengket ukuran 30cm.',
      price: 185000,
      stock: 30,
      min_order_quantity: 1,
      unit_type: 'Pcs',
      image_url: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=600&q=80',
      tiered_pricing: [{ min_quantity: 1, price_per_unit: 185000 }],
      distributor_id: dapurDistId,
      distributor_name: 'CV Kitchen Tools Jaya',
      is_active: true,
      moderation_status: 'APPROVED',
      created_at: nowISO(),
      updated_at: nowISO()
    },
    // Beras
    'prod-beras-1': {
      name: 'Beras Ramos Sentra Karawang 10kg',
      category: 'Supplier Beras',
      description: 'Beras ramos pulen tanpa pemutih asli Karawang.',
      price: 135000,
      stock: 150,
      min_order_quantity: 5,
      unit_type: 'Karung',
      image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
      tiered_pricing: [{ min_quantity: 5, price_per_unit: 135000 }],
      distributor_id: berasDistId,
      distributor_name: 'Toko Beras Karawang Jaya',
      is_active: true,
      moderation_status: 'APPROVED',
      created_at: nowISO(),
      updated_at: nowISO()
    },
    // Gula & Tepung
    'prod-gula-1': {
      name: 'Tepung Tapioka Cap Tani 1kg',
      category: 'Supplier Gula & Tepung',
      description: 'Tepung tapioka berkualitas tinggi cocok untuk bakso and cireng.',
      price: 12000,
      stock: 400,
      min_order_quantity: 10,
      unit_type: 'Pack',
      image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
      tiered_pricing: [{ min_quantity: 10, price_per_unit: 12000 }],
      distributor_id: gulaDistId,
      distributor_name: 'CV Gula Manis Utama',
      is_active: true,
      moderation_status: 'APPROVED',
      created_at: nowISO(),
      updated_at: nowISO()
    }
  };

  let productsCount = 0;
  for (const [id, data] of Object.entries(productsList)) {
    await setDoc(doc(db, 'products', id), data);
    productsCount++;
  }
  console.log(`  Seeded ${productsCount} products.`);

  // ==========================================
  // 7. Seed B2B Partnerships & Messages
  // ==========================================
  console.log('Seeding B2B partnerships and messages...');
  try {
    await setDoc(doc(db, 'partnerships', 'partner-warung-sembako'), {
      distributor_id: sembakoDistId,
      umkm_id: umkmWarungId,
      status: 'active',
      created_at: offsetISO(-604800000)
    });

    const b2bMessages = {
      'b2b-msg-1': {
        room_id: 'partner-warung-sembako',
        sender_id: umkmWarungId,
        text: 'Halo Pak Budi, apakah Beras Pandan Wangi siap kirim besok?',
        type: 'text',
        created_at: offsetISO(-600000)
      },
      'b2b-msg-2': {
        room_id: 'partner-warung-sembako',
        sender_id: sembakoDistId,
        text: 'Halo Bu Siti, ya stok Pandan Wangi siap dikirim. Mau pesan berapa karung?',
        type: 'text',
        created_at: offsetISO(-300000)
      },
      'b2b-msg-3': {
        room_id: 'partner-warung-sembako',
        sender_id: umkmWarungId,
        text: 'Saya sudah buat order 5 karung beras pandan wangi lewat sistem ya.',
        type: 'text',
        created_at: offsetISO(-60000)
      }
    };

    for (const [id, data] of Object.entries(b2bMessages)) {
      await setDoc(doc(db, 'messages', id), data);
    }
  } catch (err: any) {
    console.error('Failed to seed B2B partnerships:', err.message || err);
  }

  // ==========================================
  // 8. Seed Negotiations
  // ==========================================
  console.log('Seeding negotiations...');
  try {
    const negotiations = {
      'neg-sembako-open': {
        negotiation_code: 'NEG-10001',
        status: 'waiting_distributor',
        distributor_id: sembakoDistId,
        distributor_name: 'PT Sembako Nusantara Utama',
        umkm_id: umkmWarungId,
        buyer_id: umkmWarungId,
        umkm_name: 'Siti Aminah',
        buyer_name: 'Siti Aminah',
        product_id: 'prod-sembako-2',
        product_name: 'Minyak Goreng Bimoli 2L',
        product_image: '/assets/fallback-product.png',
        original_unit_price: 36000,
        requested_unit_price: 33500,
        quantity: 40,
        latest_message: 'Saya menawarkan Rp 33.500 per karton untuk pembelian 40 karton minyak Bimoli.',
        latest_message_at: nowISO(),
        last_message: 'Saya menawarkan Rp 33.500 per karton untuk pembelian 40 karton minyak Bimoli.',
        last_offer_price: 33500,
        last_offer_by: 'UMKM',
        created_by: umkmWarungId,
        created_at: nowISO(),
        updated_at: nowISO()
      },
      'neg-minuman-counter': {
        negotiation_code: 'NEG-10002',
        status: 'waiting_buyer',
        distributor_id: minumanDistId,
        distributor_name: 'CV Segar Sentosa',
        umkm_id: umkmKopiId,
        buyer_id: umkmKopiId,
        umkm_name: 'Rudi Hermawan',
        buyer_name: 'Rudi Hermawan',
        product_id: 'prod-minuman-1',
        product_name: 'Suku UHT Greenfields Full Cream 1L',
        product_image: '/assets/fallback-product.png',
        original_unit_price: 21000,
        requested_unit_price: 19500,
        quantity: 120,
        latest_message: 'Bagaimana jika Rp 20.000? Margin susu kami tipis sekali.',
        latest_message_at: nowISO(),
        last_message: 'Bagaimana jika Rp 20.000? Margin susu kami tipis sekali.',
        last_offer_price: 20000,
        last_offer_by: 'DISTRIBUTOR',
        created_by: umkmKopiId,
        created_at: offsetISO(-3600000),
        updated_at: nowISO()
      },
      'neg-kue-accepted': {
        negotiation_code: 'NEG-10003',
        status: 'accepted',
        distributor_id: kueDistId,
        distributor_name: "Baker's Choice Supply",
        umkm_id: umkmKueId,
        buyer_id: umkmKueId,
        umkm_name: 'Dewi Lestari',
        buyer_name: 'Dewi Lestari',
        product_id: 'prod-kue-1',
        product_name: 'Mentega Wisman Butter 250g',
        product_image: '/assets/fallback-product.png',
        original_unit_price: 95000,
        requested_unit_price: 90000,
        agreed_unit_price: 90000,
        quantity: 20,
        latest_message: 'Penawaran disetujui. Silakan checkout produk dengan harga kesepakatan.',
        latest_message_at: nowISO(),
        last_message: 'Penawaran disetujui. Silakan checkout produk dengan harga kesepakatan.',
        last_offer_price: 90000,
        last_offer_by: 'DISTRIBUTOR',
        created_by: umkmKueId,
        created_at: offsetISO(-7200000),
        updated_at: nowISO()
      },
      'neg-daging-checkedout': {
        negotiation_code: 'NEG-10004',
        status: 'checked_out',
        distributor_id: dagingDistId,
        distributor_name: 'Jaya Marina Seafood & Meat',
        umkm_id: umkmCateringId,
        buyer_id: umkmCateringId,
        umkm_name: 'Hajah Halimah',
        buyer_name: 'Hajah Halimah',
        product_id: 'prod-daging-2',
        product_name: 'Fillet Dada Ayam Tanpa Kulit 1kg',
        product_image: '/assets/fallback-product.png',
        original_unit_price: 55000,
        requested_unit_price: 52000,
        agreed_unit_price: 52000,
        quantity: 30,
        latest_message: 'Negosiasi telah dicheckout menjadi pesanan ORD-DELIVERED-104.',
        latest_message_at: nowISO(),
        last_message: 'Negosiasi telah dicheckout menjadi pesanan ORD-DELIVERED-104.',
        last_offer_price: 52000,
        last_offer_by: 'UMKM',
        created_by: umkmCateringId,
        created_at: offsetISO(-10800000),
        updated_at: nowISO(),
        converted_order_id: 'ORD-DELIVERED-104'
      }
    };

    for (const [id, data] of Object.entries(negotiations)) {
      await setDoc(doc(db, 'negotiations', id), data);
    }

    // Seed negotiation messages
    await setDoc(doc(db, 'negotiations', 'neg-sembako-open', 'messages', 'msg-1'), {
      type: 'offer',
      sender_id: umkmWarungId,
      sender_role: 'UMKM',
      sender_name: 'Siti Aminah',
      text: 'Saya menawarkan Rp 33.500 per karton untuk pembelian 40 karton minyak Bimoli.',
      offer: {
        unit_price: 33500,
        quantity: 40,
        note: 'Mohon dipertimbangkan harganya untuk usaha warung makan saya.',
        status: 'pending',
        offer_by: 'UMKM'
      },
      created_at: nowTimestamp()
    });

    await setDoc(doc(db, 'negotiations', 'neg-minuman-counter', 'messages', 'msg-1'), {
      type: 'offer',
      sender_id: umkmKopiId,
      sender_role: 'UMKM',
      sender_name: 'Rudi Hermawan',
      text: 'Bisa minta diskon susunya untuk pemesanan 120 karton?',
      offer: {
        unit_price: 19500,
        quantity: 120,
        note: 'Untuk stok kedai kopi kami sebulan.',
        status: 'countered',
        offer_by: 'UMKM'
      },
      created_at: offsetTimestamp(-3600000)
    });
    await setDoc(doc(db, 'negotiations', 'neg-minuman-counter', 'messages', 'msg-2'), {
      type: 'offer',
      sender_id: minumanDistId,
      sender_role: 'DISTRIBUTOR',
      sender_name: 'Indra Lesmana',
      text: 'Bagaimana jika Rp 20.000? Margin susu kami tipis sekali.',
      offer: {
        unit_price: 20000,
        quantity: 120,
        note: 'Harga pas dari kami Rp 20.000.',
        status: 'pending',
        offer_by: 'DISTRIBUTOR'
      },
      created_at: nowTimestamp()
    });

  } catch (err: any) {
    console.error('Failed to seed negotiations:', err.message || err);
  }

  // ==========================================
  // 9. Seed Orders
  // ==========================================
  console.log('Seeding orders...');
  try {
    const orders = {
      'ORD-PENDING-101': {
        order_code: 'ORD-PENDING-101',
        buyer_id: umkmWarungId,
        buyer_email: 'umkm-warungmakan@pasarmitra.com',
        distributor_id: sembakoDistId,
        distributor_name: 'PT Sembako Nusantara Utama',
        total_amount: 535000,
        subtotal: 535000,
        platform_fee_rate: 1.5,
        platform_fee_amount: 8025,
        distributor_net_amount: 526975,
        status: 'pending',
        shipping_address: 'Jl. Syarifuddin Yoes No. 42, Balikpapan Selatan, Balikpapan 76115',
        payment_status: 'unpaid',
        created_at: nowISO(),
        updated_at: nowISO(),
        items: [
          {
            id: 'item-1',
            product_id: 'prod-sembako-1',
            product_name: 'Beras Pandan Wangi 10kg',
            quantity: 5,
            price_per_unit: 145000,
            total_price: 725000
          }
        ]
      },
      'ORD-PROCESS-102': {
        order_code: 'ORD-PROCESS-102',
        buyer_id: umkmKopiId,
        buyer_email: 'umkm-kedaikopi@pasarmitra.com',
        distributor_id: minumanDistId,
        distributor_name: 'CV Segar Sentosa',
        total_amount: 820000,
        subtotal: 820000,
        platform_fee_rate: 1.5,
        platform_fee_amount: 12300,
        distributor_net_amount: 807700,
        status: 'processing',
        shipping_address: 'Jl. MT Haryono No. 15, Balikpapan Selatan, Balikpapan 76114',
        payment_status: 'paid',
        created_at: offsetISO(-86400000),
        updated_at: offsetISO(-86400000),
        items: [
          {
            id: 'item-2',
            product_id: 'prod-minuman-1',
            product_name: 'Susu UHT Greenfields Full Cream 1L',
            quantity: 24,
            price_per_unit: 21000,
            total_price: 504000
          }
        ]
      },
      'ORD-SHIPPED-103': {
        order_code: 'ORD-SHIPPED-103',
        buyer_id: umkmKueId,
        buyer_email: 'umkm-tokokue@pasarmitra.com',
        distributor_id: kueDistId,
        distributor_name: "Baker's Choice Supply",
        total_amount: 1120000,
        subtotal: 1120000,
        platform_fee_rate: 1.5,
        platform_fee_amount: 16800,
        distributor_net_amount: 1103200,
        status: 'shipped',
        dispute_status: 'submitted',
        shipping_address: 'Jl. Letjen S. Parman No. 12, Balikpapan Tengah, Balikpapan 76113',
        payment_status: 'paid',
        created_at: offsetISO(-129600000),
        updated_at: offsetISO(-129600000),
        items: [
          {
            id: 'item-3',
            product_id: 'prod-kue-1',
            product_name: 'Mentega Wisman Butter 250g',
            quantity: 12,
            price_per_unit: 95000,
            total_price: 1140000
          }
        ]
      },
      'ORD-DELIVERED-104': {
        order_code: 'ORD-DELIVERED-104',
        buyer_id: umkmCateringId,
        buyer_email: 'umkm-catering@pasarmitra.com',
        distributor_id: dagingDistId,
        distributor_name: 'Jaya Marina Seafood & Meat',
        total_amount: 2450000,
        subtotal: 2450000,
        platform_fee_rate: 1.5,
        platform_fee_amount: 36750,
        distributor_net_amount: 2413250,
        status: 'delivered',
        escrow_status: 'released',
        released_at: nowISO(),
        shipping_address: 'Jl. Ruhui Rahayu No. 8, Balikpapan Selatan, Balikpapan 76115',
        payment_status: 'paid',
        created_at: offsetISO(-172800000),
        updated_at: offsetISO(-172800000),
        items: [
          {
            id: 'item-4',
            product_id: 'prod-daging-1',
            product_name: 'Daging Sapi Sirloin Steak 1kg',
            quantity: 15,
            price_per_unit: 135000,
            total_price: 2025000
          }
        ]
      },
      'ORD-REFUNDED-105': {
        order_code: 'ORD-REFUNDED-105',
        buyer_id: umkmWarungId,
        buyer_email: 'umkm-warungmakan@pasarmitra.com',
        distributor_id: sayurDistId,
        distributor_name: 'CV Segar Alami Balikpapan',
        total_amount: 250000,
        subtotal: 250000,
        platform_fee_rate: 1.5,
        platform_fee_amount: 3750,
        distributor_net_amount: 246250,
        status: 'delivered',
        payment_status: 'refunded',
        refund_status: 'refunded',
        dispute_status: 'approved',
        shipping_address: 'Jl. Syarifuddin Yoes No. 42, Balikpapan Selatan, Balikpapan 76115',
        created_at: offsetISO(-259200000),
        updated_at: offsetISO(-259200000),
        items: [
          {
            id: 'item-5',
            product_id: 'prod-sayur-2',
            product_name: 'Kentang Dieng Super 1kg',
            quantity: 15,
            price_per_unit: 18000,
            total_price: 270000
          }
        ]
      },
      'ORD-CANCELLED-106': {
        order_code: 'ORD-CANCELLED-106',
        buyer_id: umkmGorenganId,
        buyer_email: 'umkm-gorengan@pasarmitra.com',
        distributor_id: sembakoDistId,
        distributor_name: 'PT Sembako Nusantara Utama',
        total_amount: 350000,
        subtotal: 350000,
        platform_fee_rate: 1.5,
        platform_fee_amount: 5250,
        distributor_net_amount: 344750,
        status: 'cancelled',
        shipping_address: 'Jl. Soekarno Hatta Km 1, Balikpapan Utara, Balikpapan 76111',
        payment_status: 'unpaid',
        created_at: offsetISO(-345600000),
        updated_at: offsetISO(-345600000),
        items: [
          {
            id: 'item-6',
            product_id: 'prod-sembako-3',
            product_name: 'Gula Pasir Gulaku 1kg',
            quantity: 20,
            price_per_unit: 17500,
            total_price: 350000
          }
        ]
      }
    };

    for (const [id, data] of Object.entries(orders)) {
      await setDoc(doc(db, 'orders', id), data);
    }
  } catch (err: any) {
    console.error('Failed to seed orders:', err.message || err);
  }

  // ==========================================
  // 10. Seed Disputes
  // ==========================================
  console.log('Seeding disputes...');
  try {
    const disputes = {
      'disp-sembako-dam': {
        order_id: 'ORD-SHIPPED-103',
        orderId: 'ORD-SHIPPED-103',
        order_code: 'ORD-SHIPPED-103',
        invoiceId: 'ORD-SHIPPED-103',
        buyer_id: umkmKueId,
        buyer_name: 'Dewi Lestari',
        claimant: 'Dewi Lestari',
        distributor_id: kueDistId,
        distributor_name: "Baker's Choice Supply",
        defendant: "Baker's Choice Supply",
        status: 'submitted',
        type: 'damaged_item',
        title: 'Kemasan Mentega Wisman Penyok & Rusak',
        reason: 'Kemasan Mentega Wisman Penyok & Rusak',
        description: 'Ada 4 kaleng mentega Wisman yang penyok parah dan penutupnya pecah saat paket sampai.',
        requested_resolution: 'partial_refund',
        requested_refund_amount: 380000,
        evidence_urls: ['/assets/fallback-product.png'],
        evidence_url: '/assets/fallback-product.png',
        buyer_notes: 'Mohon ajukan pengembalian dana untuk 4 kaleng yang rusak tersebut.',
        evidence_note: 'Mohon ajukan pengembalian dana untuk 4 kaleng yang rusak tersebut.',
        amount: 'Rp 1.120.000',
        created_at: nowTimestamp(),
        updated_at: nowTimestamp(),
        created: 'Baru saja'
      },
      'disp-meat-quality': {
        order_id: 'ORD-DELIVERED-104',
        orderId: 'ORD-DELIVERED-104',
        order_code: 'ORD-DELIVERED-104',
        invoiceId: 'ORD-DELIVERED-104',
        buyer_id: umkmCateringId,
        buyer_name: 'Hajah Halimah',
        claimant: 'Hajah Halimah',
        distributor_id: dagingDistId,
        distributor_name: 'Jaya Marina Seafood & Meat',
        defendant: 'Jaya Marina Seafood & Meat',
        status: 'under_admin_review',
        type: 'wrong_item',
        title: 'Daging Sirloin Tidak Segar / Berbau',
        reason: 'Daging Sirloin Tidak Segar / Berbau',
        description: 'Daging sirloin steak yang dikirim tidak beku sempurna, mengeluarkan bau tidak sedap, dan berwarna kecokelatan.',
        requested_resolution: 'full_refund',
        requested_refund_amount: 2025000,
        evidence_urls: ['/assets/fallback-product.png'],
        evidence_url: '/assets/fallback-product.png',
        buyer_notes: 'Daging rusak tidak bisa dipakai catering. Minta refund penuh.',
        evidence_note: 'Daging rusak tidak bisa dipakai catering. Minta refund penuh.',
        amount: 'Rp 2.450.000',
        distributor_response: {
          status: 'rejected',
          message: 'Daging keluar dari gudang kami dalam keadaan beku suhu -18 C. Keterlambatan kurir logistik bukan tanggung jawab kami.',
          responded_by: 'Hendra Wijaya',
          responded_at: offsetTimestamp(-1800000)
        },
        created_at: offsetTimestamp(-7200000),
        updated_at: offsetTimestamp(-1800000),
        created: '2 jam yang lalu'
      },
      'disp-sayur-resolved': {
        order_id: 'ORD-REFUNDED-105',
        orderId: 'ORD-REFUNDED-105',
        order_code: 'ORD-REFUNDED-105',
        invoiceId: 'ORD-REFUNDED-105',
        buyer_id: umkmWarungId,
        buyer_name: 'Siti Aminah',
        claimant: 'Siti Aminah',
        distributor_id: sayurDistId,
        distributor_name: 'CV Segar Alami Balikpapan',
        defendant: 'CV Segar Alami Balikpapan',
        status: 'approved',
        type: 'missing_quantity',
        title: 'Kentang Dieng Kurang 3kg',
        reason: 'Kentang Dieng Kurang 3kg',
        description: 'Timbangan kentang Dieng hanya 12kg setelah diukur ulang, kurang 3kg dari pesanan 15kg.',
        requested_resolution: 'partial_refund',
        requested_refund_amount: 54000,
        evidence_urls: ['/assets/fallback-product.png'],
        evidence_url: '/assets/fallback-product.png',
        buyer_notes: 'Kekurangan kentang 3kg senilai Rp 54.000.',
        evidence_note: 'Kekurangan kentang 3kg senilai Rp 54.000.',
        amount: 'Rp 250.000',
        distributor_response: {
          status: 'accepted',
          message: 'Mohon maaf atas kelalaian tim timbang packing kami. Refund disetujui.',
          responded_by: 'Andi Wijaya',
          responded_at: offsetTimestamp(-14400000)
        },
        admin_decision: {
          decision: 'approve_refund',
          notes: 'Disetujui sebagian oleh sistem.',
          refund_amount: 54000,
          decided_by: 'System Admin',
          decided_at: offsetTimestamp(-7200000)
        },
        resolution_type: 'REFUNDED',
        refund_amount: 54000,
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
    }
  } catch (err: any) {
    console.error('Failed to seed disputes:', err.message || err);
  }

  // ==========================================
  // 11. Seed Wallet Transactions
  // ==========================================
  console.log('Seeding wallet transactions...');
  try {
    const walletTransactions = {
      'release_ORD-DELIVERED-104': {
        id: 'release_ORD-DELIVERED-104',
        distributor_id: dagingDistId,
        order_id: 'ORD-DELIVERED-104',
        order_code: 'ORD-DELIVERED-104',
        type: 'order_release',
        direction: 'credit',
        gross_amount: 2450000,
        platform_fee_rate: 1.5,
        platform_fee_amount: 36750,
        net_amount: 2413250,
        status: 'completed',
        created_at: serverTimestamp()
      },
      'refund_adjust_ORD-REFUNDED-105': {
        id: 'refund_adjust_ORD-REFUNDED-105',
        distributor_id: sayurDistId,
        order_id: 'ORD-REFUNDED-105',
        order_code: 'ORD-REFUNDED-105',
        type: 'refund_adjustment',
        direction: 'debit',
        gross_amount: 250000,
        platform_fee_rate: 1.5,
        platform_fee_amount: 3750,
        net_amount: 246250,
        status: 'completed',
        created_at: serverTimestamp()
      }
    };

    for (const [id, data] of Object.entries(walletTransactions)) {
      await setDoc(doc(db, 'wallet_transactions', id), data);
    }
  } catch (err: any) {
    console.error('Failed to seed wallet transactions:', err.message || err);
  }

  // ==========================================
  // 12. Seed Verification Requests
  // ==========================================
  console.log('Seeding verification requests...');
  try {
    const verRequests = {
      'req-cv-beku': {
        distributor_id: frozenDistId,
        distributor_name: 'CV Beku Lestari Mandiri',
        distributor_email: 'distributor-frozen@pasarmitra.com',
        company_name: 'CV Beku Lestari Mandiri',
        nib: '9120005554443',
        npwp: '02.345.678.9-901.000',
        business_address: 'Jl. Letjen S. Parman No. 23, Balikpapan Tengah, Balikpapan',
        phone: '081234567805',
        status: 'PENDING_REVIEW',
        submitted_at: nowTimestamp(),
        updated_at: nowTimestamp()
      },
      'req-sawit-sejahtera': {
        distributor_id: minyakDistId,
        distributor_name: 'CV Sawit Sejahtera Borneo',
        distributor_email: 'distributor-minyak@pasarmitra.com',
        company_name: 'CV Sawit Sejahtera Borneo',
        nib: '9120002223334',
        npwp: '01.456.789.2-901.000',
        business_address: 'Jl. Mulawarman No. 20, Balikpapan Timur, Balikpapan',
        phone: '081234567814',
        status: 'PENDING_REVIEW',
        submitted_at: nowTimestamp(),
        updated_at: nowTimestamp()
      }
    };

    for (const [id, data] of Object.entries(verRequests)) {
      await setDoc(doc(db, 'verification_requests', id), data);
    }
  } catch (err: any) {
    console.error('Failed to seed verification requests:', err.message || err);
  }

  // ==========================================
  // 13. Seed Moderation Items
  // ==========================================
  console.log('Seeding moderation items...');
  try {
    const moderationItems = {
      'mod-prod-1': {
        type: 'PRODUCT',
        targetType: 'PRODUCT',
        targetId: 'prod-gula-1',
        productId: 'prod-gula-1',
        title: 'Tepung Tapioka Cap Tani 1kg',
        author: 'CV Gula Manis Utama',
        distributor_id: gulaDistId,
        status: 'pending',
        reason: 'Persetujuan Produk Baru',
        timestamp: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        created_at: nowISO(),
        updated_at: nowISO(),
        image: '/assets/fallback-product.png'
      },
      'mod-rev-1': {
        type: 'REVIEW',
        targetType: 'REVIEW',
        targetId: 'rev-report-1',
        title: 'Ulasan Produk Sembako',
        author: 'Akun Kompetitor Palsu',
        status: 'needs_review',
        reason: 'Laporan: Ulasan mengandung konten fitnah / provokatif sepihak.',
        content: 'Barang yang dikirim berkualitas sangat buruk dan kotor! Penjual tidak profesional!',
        timestamp: new Date(Date.now() - 3600000).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        created_at: offsetISO(-3600000),
        updated_at: offsetISO(-3600000),
      }
    };

    for (const [id, data] of Object.entries(moderationItems)) {
      await setDoc(doc(db, 'moderation_items', id), data);
    }
  } catch (err: any) {
    console.error('Failed to seed moderation items:', err.message || err);
  }

  // ==========================================
  // 14. Seed Reviews
  // ==========================================
  console.log('Seeding reviews...');
  try {
    const reviews = {
      'rev-1': {
        order_id: 'ORD-DELIVERED-104',
        product_id: 'prod-sembako-1',
        distributor_id: sembakoDistId,
        buyer_id: umkmWarungId,
        buyer_name: 'Siti Aminah',
        rating: 5,
        comment: 'Beras pandan wangi sangat pulen dan wangi alami. Langganan setia di sini!',
        is_hidden: false,
        status: 'approved',
        created_at: offsetISO(-86400000),
        updated_at: offsetISO(-86400000)
      },
      'rev-report-1': {
        order_id: 'ORD-DELIVERED-104',
        product_id: 'prod-sembako-2',
        distributor_id: sembakoDistId,
        buyer_id: umkmWarungId,
        buyer_name: 'Akun Kompetitor Palsu',
        rating: 1,
        comment: 'Barang yang dikirim berkualitas sangat buruk dan kotor! Penjual tidak profesional!',
        is_hidden: false,
        status: 'reported',
        created_at: offsetISO(-3600000),
        updated_at: offsetISO(-3600000)
      }
    };

    for (const [id, data] of Object.entries(reviews)) {
      await setDoc(doc(db, 'reviews', id), data);
    }
  } catch (err: any) {
    console.error('Failed to seed reviews:', err.message || err);
  }

  // ==========================================
  // 15. Seed Audit Logs
  // ==========================================
  console.log('Seeding audit logs...');
  try {
    const auditLogs = {
      'audit-log-1': {
        event: 'USER_SUSPENDED',
        status: 'BLOCK',
        user: 'admin@pasarmitra.com',
        details: 'Menangguhkan akun CV Telur Jaya (distributor-telur@pasarmitra.com) karena pelanggaran syarat & ketentuan.',
        ip: '127.0.0.1',
        targetCollection: 'profiles',
        targetId: telurDistId,
        timestamp: offsetISO(-7200000),
        created_at: offsetISO(-7200000)
      },
      'audit-log-2': {
        event: 'COMMISSION_TIER_UPDATED',
        status: 'SUCCESS',
        user: 'admin@pasarmitra.com',
        details: 'Mengubah platform fee tier Sembako Distributor menjadi 1.5%.',
        ip: '127.0.0.1',
        targetCollection: 'commission_tiers',
        targetId: 'sembako-distributor',
        timestamp: offsetISO(-3600000),
        created_at: offsetISO(-3600000)
      }
    };

    for (const [id, data] of Object.entries(auditLogs)) {
      await setDoc(doc(db, 'audit_logs', id), data);
    }
  } catch (err: any) {
    console.error('Failed to seed audit logs:', err.message || err);
  }

  // ==========================================
  // Summary Stats Logs
  // ==========================================
  console.log('\n================ SEEDING COMPLETE STATISTICS ================');
  console.log(`- Firestore Profiles Wiped (non-admin): ${deletedProfiles}`);
  console.log(`- Firestore Products Wiped:            ${deletedProducts}`);
  console.log(`- Old Firebase Auth Users Deleted:      ${deletedAuthUsersCount}`);
  console.log(`- New Auth Users Created:               ${createdAccountsCount}`);
  console.log(`- Existing Auth Users Reused:           ${reusedAccountsCount}`);
  console.log(`- New Profiles Seeded in Firestore:     ${seededProfilesCount}`);
  console.log(`  * Distributors Seeded:                15`);
  console.log(`  * UMKMs Seeded:                       12`);
  console.log(`- Products Seeded:                      ${productsCount}`);
  console.log(`- Active B2B Partnerships Seeded:       1`);
  console.log(`- Negotiations Seeded:                  4`);
  console.log(`- Orders Seeded:                        6`);
  console.log(`- Disputes Seeded:                      3`);
  console.log(`- Wallet Transactions Seeded:           2`);
  console.log(`- Verification Requests Seeded:         2`);
  console.log(`- Moderation Items Seeded:              2`);
  console.log(`- Reviews Seeded:                       2`);
  console.log(`- System Audit Logs Seeded:             2`);
  console.log('==============================================================');

  process.exit(0);
}

seedDatabase();
