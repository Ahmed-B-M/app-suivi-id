import { initializeApp, getApps, getApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from '@/firebase/config';

// Garde une référence à l'instance initialisée
let adminApp: App;

// Fonction pour obtenir les SDKs à partir d'une app
function getSdks(app: App) {
  return {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: getFirestore(app),
  };
}

/**
 * Initialise l'application Firebase Admin côté serveur (si elle ne l'est pas déjà)
 * et retourne les SDKs nécessaires.
 */
export async function initializeFirebaseOnServer() {
  // Si des applications admin existent déjà, on réutilise la première
  if (getApps().length > 0) {
    adminApp = getApp();
    return getSdks(adminApp);
  }

  // Sinon, on initialise une nouvelle application
  try {
    adminApp = initializeApp({
      projectId: firebaseConfig.projectId,
    });
    return getSdks(adminApp);
  } catch (error) {
    // Si l'initialisation échoue mais qu'une app existe (cas rare de concurrence), on la réutilise
    if (getApps().length > 0) {
      return getSdks(getApp());
    }
    console.error("Failed to initialize Firebase Admin SDK:", error);
    throw error;
  }
}
