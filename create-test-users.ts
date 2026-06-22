import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword
} from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
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
      is_active: true,
      is_suspended: false,
    }
  },
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
  }
];

async function createUsers() {
  console.log('--- Creating Test Users in Firebase ---');
  
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('Error: Firebase configuration missing from environment variables.');
    process.exit(1);
  }

  for (const u of testUsers) {
    try {
      console.log(`Processing user: ${u.email}...`);
      let uid = '';
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, u.email, u.password);
        uid = userCredential.user.uid;
        console.log(`  Auth user created with UID: ${uid}`);
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          console.log(`  User ${u.email} already exists in Firebase Auth. Logging in to retrieve UID...`);
          const userCredential = await signInWithEmailAndPassword(auth, u.email, u.password);
          uid = userCredential.user.uid;
          console.log(`  Retrieved UID: ${uid}`);
        } else {
          throw err;
        }
      }

      // Create/Overwrite Firestore profile doc
      const profileDocRef = doc(db, 'profiles', uid);
      await setDoc(profileDocRef, {
        id: uid,
        email: u.email,
        created_at: new Date().toISOString(),
        ...u.profile
      }, { merge: true });
      console.log(`  Firestore profile populated for UID: ${uid}`);

    } catch (e: any) {
      console.error(`Error processing user ${u.email}:`, e.message || e);
    }
  }
  console.log('--- Task Complete ---');
  process.exit(0);
}

createUsers();
