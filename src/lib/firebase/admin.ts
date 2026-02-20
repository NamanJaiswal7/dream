import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App | undefined;
let db: Firestore | undefined;

function getFirebaseAdmin(): { app: App; db: Firestore } {
    if (!app) {
        const existingApps = getApps();

        if (existingApps.length > 0) {
            app = existingApps[0];
        } else {
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

            if (!projectId || !clientEmail || !privateKey) {
                throw new Error('Missing Firebase Admin credentials. Check environment variables.');
            }

            app = initializeApp({
                credential: cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });
        }
    }

    if (!db) {
        db = getFirestore(app);
    }

    return { app, db };
}

export function getDb(): Firestore {
    return getFirebaseAdmin().db;
}

export { getFirebaseAdmin };
