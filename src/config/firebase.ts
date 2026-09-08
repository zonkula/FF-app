import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, signInAnonymously, type Auth, type User } from 'firebase/auth'
import { getDatabase, type Database } from 'firebase/database'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Object.values(firebaseConfig).every((value) => Boolean(value))

let cachedApp: FirebaseApp | null = null
let cachedAuth: Auth | null = null
let cachedDatabase: Database | null = null

// The Firebase SDK validates config (and throws synchronously) the moment initializeApp/getAuth/
// getDatabase are called. Doing that at module scope means it happens at *import* time — before
// React even mounts — which blanks the whole page with no chance for our own error handling to
// run. Deferring the call until something actually needs Firebase means a missing/invalid .env
// instead surfaces as an ordinary rejected promise inside the try/catches in DraftContext.
function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured. Add your project credentials to .env (see .env.example).')
  }
  if (!cachedApp) cachedApp = initializeApp(firebaseConfig)
  return cachedApp
}

export function getFirebaseDatabase(): Database {
  if (!cachedDatabase) cachedDatabase = getDatabase(getFirebaseApp())
  return cachedDatabase
}

function getFirebaseAuth(): Auth {
  if (!cachedAuth) cachedAuth = getAuth(getFirebaseApp())
  return cachedAuth
}

let anonymousSignIn: Promise<User> | null = null

/**
 * Ensures this browser has an anonymous Firebase Auth session (required by the Realtime Database
 * security rules — see database.rules.json). Safe to call from multiple places; concurrent callers
 * share the same in-flight sign-in.
 */
export function ensureAnonymousAuth(): Promise<User> {
  const auth = getFirebaseAuth()
  if (auth.currentUser) return Promise.resolve(auth.currentUser)

  if (!anonymousSignIn) {
    anonymousSignIn = new Promise<User>((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          if (user) {
            unsubscribe()
            resolve(user)
          }
        },
        (error) => {
          unsubscribe()
          anonymousSignIn = null
          reject(error)
        },
      )
      signInAnonymously(auth).catch((error) => {
        unsubscribe()
        anonymousSignIn = null
        reject(error)
      })
    })
  }

  return anonymousSignIn
}
