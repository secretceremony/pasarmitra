import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, limit, getDocs, query } from 'firebase/firestore';
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

async function runDiagnostics() {
  console.log('--- Firebase Diagnostics ---');
  console.log('Project ID:', firebaseConfig.projectId);
  console.log('API Key starts with:', firebaseConfig.apiKey?.substring(0, 10));
  
  // 1. Check Auth Status
  try {
    const user = auth.currentUser;
    console.log('Auth Check: Success, current user is:', user ? user.email : 'No active session');
  } catch (e) {
    console.error('Auth Check: Fatal error:', e);
  }

  // 2. Check Database Access
  try {
    const q = query(collection(db, 'profiles'), limit(1));
    const snapshot = await getDocs(q);
    console.log('Database Check (profiles): Success, documents found:', snapshot.size);
  } catch (e) {
    console.error('Database Check (profiles): Fatal error:', e);
  }
}

runDiagnostics();
