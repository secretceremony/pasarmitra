import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';

export const authService = {
  async resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
    return true;
  },

  async login(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential;
  },

  async register(email: string, password: string, metadata?: any) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Save metadata to user's profile document in Firestore
    if (metadata) {
      await setDoc(doc(db, 'profiles', user.uid), {
        id: user.uid,
        email: email,
        created_at: new Date().toISOString(),
        ...metadata
      });
    }
    
    return userCredential;
  },

  async logout() {
    await signOut(auth);
  }
};

