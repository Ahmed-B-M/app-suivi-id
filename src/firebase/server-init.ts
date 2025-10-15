import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from '@/firebase/config';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebaseOnServer() {
  if (!getApps().length) {
    // When running on the server, we can initialize without credentials
    // and let Firebase find the default service account.
    initializeApp({
        projectId: firebaseConfig.projectId,
    });
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}
