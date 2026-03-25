import { useState, useEffect } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import { UserProfile } from "../types";

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("useAuth: Starting onAuthStateChanged listener");
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      console.log("useAuth: onAuthStateChanged fired", u?.uid);
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    console.log("useAuth: Starting onSnapshot listener for user", user.uid);
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (doc) => {
      console.log("useAuth: onSnapshot fired, exists:", doc.exists());
      if (doc.exists()) {
        setProfile({ ...doc.data(), uid: doc.id } as UserProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Profile fetch error:", error);
      setLoading(false);
    });

    // Fallback timeout to prevent indefinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("useAuth: Loading timeout reached, forcing loading to false");
        setLoading(false);
      }
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [user]);

  return { user, profile, loading };
}
