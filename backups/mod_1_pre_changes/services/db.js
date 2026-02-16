import { db } from '../firebase.js';
export * from 'firebase/firestore';

export { db };

// Helper to log DB operations (Audit Trail)
export const logDB = (op, path) => {
    console.log(`[Database V10] ${op.toUpperCase()} @ ${path} - ${new Date().toISOString()}`);
};
