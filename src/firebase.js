import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

export const pinEmail = pin => `${pin}@app.local`
export const pinPass  = pin => `mk${pin}@@mykasa`

const KEY = import.meta.env.VITE_FIREBASE_API_KEY
const authREST = async (endpoint, body) => {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=${KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data
}

export async function createAuthUser(email, password) {
  const data = await authREST('signUp', { email, password, returnSecureToken: false })
  return data.localId
}

export async function updateAuthCredentials(oldPin, newPin) {
  const { idToken } = await authREST('signInWithPassword', {
    email: pinEmail(oldPin),
    password: pinPass(oldPin),
    returnSecureToken: true
  })
  await authREST('update', {
    idToken,
    email: pinEmail(newPin),
    password: pinPass(newPin),
    returnSecureToken: false
  })
}