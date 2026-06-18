import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            'AIzaSyDNFQ7QR8ND5ht7ZLVcMyXLPGAcXLNvEsc',
  authDomain:        'wandr-cba96.firebaseapp.com',
  projectId:         'wandr-cba96',
  storageBucket:     'wandr-cba96.firebasestorage.app',
  messagingSenderId: '121115293183',
  appId:             '1:121115293183:web:0ecd47bae79cc1a3ebe3ca',
  measurementId:     'G-YBNVB04ZFQ',
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
