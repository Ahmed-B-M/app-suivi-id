import { initializeApp, getApps, getApp, type FirebaseApp, App, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from '@/firebase/config';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export async function initializeFirebaseOnServer() {
  const appName = `server-app-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  try {
    const app = initializeApp({
        projectId: firebaseConfig.projectId,
    }, appName);
    
    const sdks = getSdks(app);

    // This is a workaround to ensure the app is gracefully cleaned up
    // This part is a bit of a hack, but it's to manage the lifecycle of the temp app
    const cleanup = async () => {
        try {
            await deleteApp(app);
        } catch (e) {
            // console.error(`Error deleting temporary Firebase app ${appName}:`, e);
        }
    };
    // Attach cleanup function to process exit events.
    process.on('beforeExit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);


    return sdks;

  } catch (error) {
     if (getApps().length > 0) {
        return getSdks(getApp());
    }
    throw error;
  }
}

export function getSdks(firebaseApp: App) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}
