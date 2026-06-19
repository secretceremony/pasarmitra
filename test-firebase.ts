import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
};

console.log('Testing connection to Firebase Project:', firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  try {
    const q = query(collection(db, 'profiles'), limit(1));
    const snapshot = await getDocs(q);
    console.log('Success! Documents fetched from profiles:', snapshot.size);
  } catch (err) {
    console.error('Fatal Error:', err);
  }
}

test();
