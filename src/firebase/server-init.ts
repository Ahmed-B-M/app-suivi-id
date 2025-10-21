import { initializeApp, getApps, getApp, type FirebaseApp, App, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from '@/firebase/config';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export async function initializeFirebaseOnServer() {
  const appName = `server-app-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  try {
    // Force la création d'une nouvelle instance à chaque fois
    const app = initializeApp({
        projectId: firebaseConfig.projectId,
    }, appName);
    
    const sdks = getSdks(app);

    // Assure le nettoyage de cette instance temporaire
    const cleanup = async () => {
        try {
            await deleteApp(app);
        } catch (e) {
            // Silence l'erreur si l'app est déjà supprimée, ce qui peut arriver
        }
    };
    
    // Planifie le nettoyage pour la fin de l'exécution du processus
    if (process.env.NODE_ENV === 'development') {
      setTimeout(cleanup, 2000); // Délai pour permettre à l'opération de se terminer en dev
    } else {
       process.on('beforeExit', cleanup);
    }
    
    return sdks;

  } catch (error) {
     if (getApps().length > 0) {
        // En cas d'erreur, tente de réutiliser une app existante comme solution de secours
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
