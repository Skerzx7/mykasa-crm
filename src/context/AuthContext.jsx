import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth, db, pinEmail, pinPass } from '../firebase'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore'
import { chunkArray } from '../utils/helpers'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

async function syncVendorDoc(uid, pin) {
  const ownRef = doc(db, 'users', uid)
  const ownSnap = await getDoc(ownRef)
  if (ownSnap.exists()) {
  const data = ownSnap.data()
  if (!['admin','vendedor'].includes(data.role) || data.pin !== pin) { await signOut(auth); throw new Error('PIN incorrecto') }
  return
}
  const snap = await getDocs(query(collection(db, 'users'), where('pin', '==', pin)))
  if (snap.empty) { await signOut(auth); throw new Error('PIN incorrecto') }
  const oldDoc = snap.docs[0], oldUid = oldDoc.id, oldData = oldDoc.data()
  const { passwordInterno: _drop, ...cleanData } = oldData
  await setDoc(ownRef, { ...cleanData, email: pinEmail(pin), updatedAt: serverTimestamp() })
  const clientesSnap = await getDocs(query(collection(db, 'clientes'), where('vendedorId', '==', oldUid)))
  if (!clientesSnap.empty) {
    for (const chunk of chunkArray(clientesSnap.docs, 400)) {
      const batch = writeBatch(db)
      chunk.forEach(c => batch.update(doc(db, 'clientes', c.id), { vendedorId: uid, updatedAt: serverTimestamp() }))
      await batch.commit()
    }
  }
  await deleteDoc(doc(db, 'users', oldUid))
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async firebaseUser => {
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
          setUserData(snap.exists() ? { id: snap.id, ...snap.data() } : null)
        } catch { setUserData(null) }
        setUser(firebaseUser)
      } else { setUser(null); setUserData(null) }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const login = async (adminEmail, password, pin) => {
    if (pin) {
      const email = pinEmail(pin), pass = pinPass(pin)
      let cred
      try { cred = await signInWithEmailAndPassword(auth, email, pass) }
      catch { throw new Error('PIN incorrecto. Pide al administrador que cree tu cuenta.') }
      await syncVendorDoc(cred.user.uid, pin)
      return
    }
    await signInWithEmailAndPassword(auth, adminEmail, password)
  }

  const logout = () => signOut(auth)

  if (loading) {
    return (
      <div style={{ minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'12px' }}>
        <div style={{ width:'40px',height:'40px',background:'linear-gradient(135deg,var(--v600),var(--v400))',borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px' }}>🏡</div>
        <p style={{ color:'var(--accent)',fontFamily:'inherit',fontSize:'14px' }}>Cargando MyKasa...</p>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, userData, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}