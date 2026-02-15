"use server";

import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function verifyAdminPassword(password: string): Promise<boolean> {
    if (!password) return false;

    try {
        // Ideally, we should use the Firebase Admin SDK for server-side operations
        // but for now, we'll access Firestore directly if the environment allows it.
        // However, since we are in a server action, proceed with caution.
        // A better approach for "admin" password is storing it in a secure way.
        // Given the constraints and the user request to "save the password in firebase",
        // we will fetch a specific document.

        // Note: The client-side SDK is initialized in @/lib/firebase using standard keys.
        // If we want to keep this secret from the client bundle, we MUST NOT include the password in the client bundle.
        // Here we are comparing the input password with the one stored in Firestore.

        // WARNING: This assumes the client SDK is initialized. 
        // In a real-world scenario with critical security, use Firebase Admin SDK with service account.
        // For this hackathon/MVP scope:
        const adminDocRef = doc(db, "settings", "admin");
        const adminDoc = await getDoc(adminDocRef);

        if (adminDoc.exists()) {
            const storedPassword = adminDoc.data().password;
            return password === storedPassword;
        }
        return false;
    } catch (error) {
        console.error("Error verifying admin password:", error);
        return false;
    }
}
