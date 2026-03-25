import * as React from "react";
import { useState, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Heart, 
  X, 
  MessageCircle, 
  User, 
  Compass, 
  Plus, 
  Coins, 
  Settings, 
  Shield, 
  Camera,
  LogOut,
  Star,
  Gift as GiftIcon,
  CheckCircle2,
  Scan,
  UserCheck,
  AlertCircle,
  Loader2,
  ChevronRight
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { useAuth } from "./hooks/useAuth";
import { auth, db, googleProvider, OperationType, handleFirestoreError } from "./firebase";
import { signInWithPopup, signOut, signInAnonymously } from "firebase/auth";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  setDoc, 
  updateDoc,
  getDocs,
  limit,
  orderBy,
  Timestamp,
  arrayUnion,
  increment
} from "firebase/firestore";
import { cn } from "./lib/utils";
import { UserProfile, Swipe, Story, Match, Message, SuperComment } from "./types";
import { formatDistanceToNow } from "date-fns";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe((import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_mock");

// --- Error Boundary ---

class ErrorBoundary extends Component<any, any> {
  state = { hasError: false };

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-app-bg-medium flex flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-serif font-bold text-app-text-dark">Something went wrong</h2>
            <p className="text-zinc-500 text-sm">We've encountered an unexpected error. Please try refreshing the app.</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-app-primary text-white font-bold rounded-full hover:bg-app-secondary transition-all"
          >
            Refresh App
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

// --- Constants ---

const GIFTS = [
  { id: 'rose', name: 'Rose', icon: '🌹', cost: 10 },
  { id: 'coffee', name: 'Coffee', icon: '☕', cost: 25 },
  { id: 'heart', name: 'Heart', icon: '❤️', cost: 50 },
  { id: 'diamond', name: 'Diamond', icon: '💎', cost: 100 },
  { id: 'crown', name: 'Crown', icon: '👑', cost: 500 },
];

// --- Components ---

const Landing = () => {
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      await createProfileIfMissing(user);
    } catch (error: any) {
      console.error("Login error:", error);
      setLoginError(error.message || "Failed to sign in with Google. Try opening in a new tab or use Demo Mode.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const result = await signInAnonymously(auth);
      const user = result.user;
      await createProfileIfMissing(user, "Demo Explorer");
    } catch (error: any) {
      console.error("Demo login error:", error);
      setLoginError("Demo Mode (Anonymous Auth) might not be enabled in Firebase Console. Please use Google Login or enable Anonymous Auth.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const createProfileIfMissing = async (user: any, defaultName?: string) => {
    const userDocRef = doc(db, "users", user.uid);
    const userSnap = await getDocs(query(collection(db, "users"), where("uid", "==", user.uid)));
    
    if (userSnap.empty) {
      await setDoc(userDocRef, {
        uid: user.uid,
        displayName: user.displayName || defaultName || "New User",
        photoURL: user.photoURL || `https://picsum.photos/seed/${user.uid}/200`,
        coins: 100,
        role: 'user',
        isVerified: false,
        privacySettings: {
          showStories: 'everyone',
          showProfile: 'everyone',
          allowChatFrom: 'everyone',
          blockedUsers: []
        },
        lastActive: serverTimestamp()
      });
    }
  };

  return (
    <div className="min-h-screen bg-app-bg-light flex flex-col items-center justify-center p-6 text-app-text-dark overflow-hidden relative font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 text-center space-y-12 max-w-md"
      >
        <div className="space-y-4">
          <h1 className="text-6xl font-serif font-bold tracking-tight text-app-text-dark">Me4U</h1>
          <p className="text-lg text-zinc-500 font-medium italic">
            Designed to be deleted.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 text-left">
          <div className="p-6 bg-white border border-zinc-200 rounded-[32px] shadow-sm">
            <Shield className="w-6 h-6 text-app-secondary mb-3" />
            <h3 className="font-serif font-bold text-lg mb-1 text-app-text-dark">Safe & Intentional</h3>
            <p className="text-sm text-zinc-500">Verified profiles and deep privacy controls for real connections.</p>
          </div>
          <div className="p-6 bg-white border border-zinc-200 rounded-[32px] shadow-sm">
            <Compass className="w-6 h-6 text-app-secondary mb-3" />
            <h3 className="font-serif font-bold text-lg mb-1 text-app-text-dark">Vibe Discovery</h3>
            <p className="text-sm text-zinc-500">Find your energy match through stories and shared vibes.</p>
          </div>
        </div>

        <div className="space-y-4">
          <button 
            disabled={isLoggingIn}
            onClick={handleLogin}
            className="w-full py-4 bg-app-secondary text-white font-bold rounded-full text-lg hover:opacity-90 transition-all active:scale-95 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoggingIn ? <Loader2 className="w-6 h-6 animate-spin" /> : "Get Started with Google"}
          </button>

          <button 
            disabled={isLoggingIn}
            onClick={handleDemoLogin}
            className="w-full py-4 bg-white text-app-text-dark border border-zinc-200 font-bold rounded-full text-lg hover:bg-zinc-50 transition-all active:scale-95 shadow-sm disabled:opacity-50"
          >
            Try Demo Mode
          </button>

          {loginError && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 bg-red-50 text-red-600 text-xs rounded-2xl border border-red-100"
            >
              {loginError}
            </motion.div>
          )}
        </div>

        <p className="text-xs text-zinc-500 px-8">
          By joining, you agree to our terms and respect our community boundaries.
        </p>
      </motion.div>
    </div>
  );
};

const hasProfileAccess = (viewerUid: string, target: UserProfile, matchUids: string[]) => {
  const settings = target.privacySettings;
  if (!settings) return true;
  if (settings.showProfile === 'everyone') return true;
  if (settings.showProfile === 'matches') return matchUids.includes(target.uid);
  return false;
};

const hasStoryAccess = (viewerUid: string, target: UserProfile, matchUids: string[]) => {
  const settings = target.privacySettings;
  if (!settings) return true;
  if (settings.showStories === 'everyone') return true;
  if (settings.showStories === 'matches') return matchUids.includes(target.uid);
  if (settings.showStories === 'nobody') return false;
  return false;
};

const Discovery = ({ 
  userProfile, 
  onReport, 
  onSuperComment 
}: { 
  userProfile: UserProfile, 
  onReport: (uid: string) => void, 
  onSuperComment: (uid: string, id: string, type: 'profile' | 'story') => void 
}) => {
  const [potentialMatches, setPotentialMatches] = useState<UserProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchUids, setMatchUids] = useState<string[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      console.log("Discovery: Fetching users...");
      try {
        const q = query(collection(db, "users"), limit(20));
        const snapshot = await getDocs(q);
        console.log("Discovery: Fetched users count:", snapshot.docs.length);
        const users = snapshot.docs
          .map(d => ({ ...d.data(), uid: d.id } as UserProfile))
          .filter(u => u.uid !== userProfile.uid)
          .filter(u => !userProfile.privacySettings?.blockedUsers?.includes(u.uid));
        console.log("Discovery: Potential matches after filtering:", users.length);
        setPotentialMatches(users);
      } catch (error) {
        console.error("Discovery: Error fetching users:", error);
      }
    };
    fetchUsers();

    console.log("Discovery: Starting matches listener for user", userProfile.uid);
    const mq = query(collection(db, "matches"), where("uids", "array-contains", userProfile.uid));
    const unsubscribe = onSnapshot(mq, (snapshot) => {
      console.log("Discovery: Matches snapshot fired, count:", snapshot.docs.length);
      const uids = snapshot.docs.flatMap(d => (d.data() as Match).uids).filter(id => id !== userProfile.uid);
      setMatchUids(uids);
    }, (error) => {
      console.error("Discovery: Matches fetch error:", error);
      handleFirestoreError(error, OperationType.GET, "matches");
    });
    return unsubscribe;
  }, [userProfile.uid, userProfile.privacySettings?.blockedUsers]);

  const handleBlock = async (targetUid: string) => {
    if (!confirm("Are you sure you want to block this user? They won't be able to see your profile or chat with you.")) return;
    try {
      await updateDoc(doc(db, "users", userProfile.uid), {
        "privacySettings.blockedUsers": arrayUnion(targetUid)
      });
      setCurrentIndex(prev => prev + 1);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}`);
    }
  };

  const handleSwipe = async (type: 'like' | 'dislike' | 'superlike', targetUid: string) => {
    try {
      await addDoc(collection(db, "swipes"), {
        fromUid: userProfile.uid,
        toUid: targetUid,
        type,
        timestamp: serverTimestamp()
      });

      if (type === 'like' || type === 'superlike') {
        const q = query(
          collection(db, "swipes"), 
          where("fromUid", "==", targetUid),
          where("toUid", "==", userProfile.uid),
          where("type", "in", ["like", "superlike"])
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const matchId = userProfile.uid < targetUid ? `${userProfile.uid}_${targetUid}` : `${targetUid}_${userProfile.uid}`;
          await setDoc(doc(db, "matches", matchId), {
            uids: [userProfile.uid, targetUid],
            timestamp: serverTimestamp()
          });
          alert("It's a Match! 🎉");
        }
      }

      setCurrentIndex(prev => prev + 1);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "swipes");
    }
  };

  const currentMatch = potentialMatches[currentIndex];

  return (
    <div className="flex-1 flex flex-col p-4 relative overflow-hidden">
      <div className="flex-1 relative">
        <AnimatePresence mode="popLayout">
          {currentMatch ? (
            <motion.div
              key={currentMatch.uid}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ x: 500, opacity: 0, rotate: 20 }}
              className="absolute inset-0 bg-white rounded-[32px] overflow-hidden shadow-xl border border-zinc-200"
            >
              <div className={cn("w-full h-full relative", !hasProfileAccess(userProfile.uid, currentMatch, matchUids) && "blur-xl")}>
                <img 
                  src={currentMatch.photoURL || `https://picsum.photos/seed/${currentMatch.uid}/800/1200`} 
                  className="w-full h-full object-cover"
                  alt={currentMatch.displayName}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              </div>

              {hasProfileAccess(userProfile.uid, currentMatch, matchUids) && (
                <div className="absolute top-8 left-8 right-8 z-20">
                  <SuperCommentsList targetId={currentMatch.uid} />
                </div>
              )}

              {!hasProfileAccess(userProfile.uid, currentMatch, matchUids) && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center bg-black/20">
                  <Shield className="w-16 h-16 text-white mb-4 opacity-80" />
                  <h3 className="text-2xl font-serif font-bold text-white mb-2">Restricted Access</h3>
                  <p className="text-white/80 text-sm">This user has restricted their profile visibility. Match with them to see more.</p>
                </div>
              )}
              
              <div className="absolute bottom-0 left-0 right-0 p-8 space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-4xl font-serif font-bold text-white">{currentMatch.displayName}</h2>
                  {currentMatch.isVerified && <CheckCircle2 className="w-6 h-6 text-blue-400 fill-blue-400/20" />}
                </div>
                <p className="text-white/90 text-base font-medium leading-relaxed line-clamp-2">{currentMatch.bio || "No bio yet. Just vibes."}</p>
                <div className="flex gap-2 pt-2">
                  <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-bold uppercase tracking-wider text-white">Active Now</span>
                  {currentMatch.isVerified && (
                    <span className="px-4 py-1.5 bg-blue-500/40 text-white backdrop-blur-md rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-6">
              <div className="w-24 h-24 rounded-full bg-white border border-zinc-200 flex items-center justify-center shadow-sm">
                <Compass className="w-10 h-10 animate-pulse text-app-secondary" />
              </div>
              <p className="font-serif font-bold text-xl text-app-text-dark">Finding more vibes...</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {currentMatch && (
        <div className="flex justify-center items-center gap-4 py-10">
          <button 
            onClick={() => onReport(currentMatch.uid)}
            className="w-14 h-14 bg-white border border-zinc-200 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 shadow-sm transition-colors"
            title="Report User"
          >
            <AlertCircle className="w-6 h-6" />
          </button>
          <button 
            onClick={() => onSuperComment(currentMatch.uid, currentMatch.uid, 'profile')}
            className="w-14 h-14 bg-white border border-zinc-200 rounded-full flex items-center justify-center text-app-secondary hover:bg-app-secondary/10 shadow-sm transition-colors"
            title="Super Comment"
          >
            <Star className="w-6 h-6 fill-app-secondary" />
          </button>
          <button 
            onClick={() => handleBlock(currentMatch.uid)}
            className="w-14 h-14 bg-white border border-zinc-200 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 shadow-sm transition-colors"
            title="Block User"
          >
            <Shield className="w-6 h-6" />
          </button>
          <button 
            onClick={() => handleSwipe('dislike', currentMatch.uid)}
            className="w-18 h-18 bg-white border border-zinc-200 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-50 transition-colors shadow-md"
          >
            <X className="w-10 h-10" />
          </button>
          <button 
            onClick={() => handleSwipe('superlike', currentMatch.uid)}
            className="w-16 h-16 bg-app-bg-medium border border-app-secondary/30 rounded-full flex items-center justify-center text-app-secondary hover:bg-app-secondary/20 transition-colors shadow-md"
          >
            <Star className="w-8 h-8 fill-app-secondary" />
          </button>
          <button 
            onClick={() => handleSwipe('like', currentMatch.uid)}
            className="w-18 h-18 bg-app-secondary rounded-full flex items-center justify-center text-white hover:scale-105 transition-transform shadow-xl"
          >
            <Heart className="w-10 h-10 fill-white" />
          </button>
        </div>
      )}
    </div>
  );
};

const Stories = ({ 
  userProfile, 
  onSuperComment 
}: { 
  userProfile: UserProfile, 
  onSuperComment: (uid: string, id: string, type: 'profile' | 'story') => void 
}) => {
  const [stories, setStories] = useState<(Story & { user?: UserProfile })[]>([]);
  const [matchUids, setMatchUids] = useState<string[]>([]);

  useEffect(() => {
    const q = query(collection(db, "stories"), orderBy("timestamp", "desc"), limit(20));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const storyData = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Story));
      
      // Fetch user profiles for stories to check privacy
      const uids = [...new Set(storyData.map(s => s.uid))];
      if (uids.length === 0) {
        setStories([]);
        return;
      }
      
      const userSnapshots = await getDocs(query(collection(db, "users"), where("uid", "in", uids)));
      const userMap = new Map<string, UserProfile>();
      userSnapshots.forEach(snap => {
        const u = { ...snap.data(), uid: snap.id } as UserProfile;
        userMap.set(u.uid, u);
      });

      setStories(storyData.map(s => ({ ...s, user: userMap.get(s.uid) })));
    }, (error) => {
      console.error("Stories: Fetch error:", error);
      handleFirestoreError(error, OperationType.GET, "stories");
    });

    const mq = query(collection(db, "matches"), where("uids", "array-contains", userProfile.uid));
    const mUnsubscribe = onSnapshot(mq, (snapshot) => {
      const uids = snapshot.docs.flatMap(d => (d.data() as Match).uids).filter(id => id !== userProfile.uid);
      setMatchUids(uids);
    }, (error) => {
      console.error("Stories: Matches fetch error:", error);
      handleFirestoreError(error, OperationType.GET, "matches");
    });

    return () => {
      unsubscribe();
      mUnsubscribe();
    };
  }, [userProfile.uid]);

  return (
    <div className="px-4 py-4 border-b border-zinc-200 bg-white">
      <div className="flex gap-5 overflow-x-auto no-scrollbar pb-1">
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="w-18 h-18 rounded-full bg-zinc-50 border-2 border-dashed border-zinc-300 flex items-center justify-center relative">
            <Plus className="w-7 h-7 text-zinc-400" />
            <div className="absolute bottom-0 right-0 bg-app-secondary rounded-full p-1 shadow-md">
              <Plus className="w-3 h-3 text-white" />
            </div>
          </div>
          <span className="text-[11px] font-bold text-zinc-500">Your Story</span>
        </div>

        {stories.map(story => {
          const hasAccess = story.user ? hasStoryAccess(userProfile.uid, story.user, matchUids) : true;
          
          return (
            <div key={story.id} className="flex flex-col items-center gap-2 shrink-0 relative group">
              <div className="w-18 h-18 rounded-full p-0.5 bg-gradient-to-tr from-app-secondary to-app-highlight relative">
                <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-zinc-100 relative">
                  <img 
                    src={story.mediaUrl} 
                    className={cn("w-full h-full object-cover", !hasAccess && "blur-md")} 
                    alt="story" 
                    referrerPolicy="no-referrer" 
                  />
                  {!hasAccess && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Shield className="w-6 h-6 text-white opacity-80" />
                    </div>
                  )}
                </div>
                
                {hasAccess && story.uid !== userProfile.uid && (
                  <button 
                    onClick={() => onSuperComment(story.uid, story.id, 'story')}
                    className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-lg border border-zinc-100 hover:scale-110 transition-transform z-10"
                  >
                    <Star className="w-3 h-3 text-app-secondary fill-app-secondary" />
                  </button>
                )}
              </div>
              <span className="text-[11px] font-bold text-app-text-dark truncate w-18 text-center">
                {story.user?.displayName || "User"}
              </span>
              
              {hasAccess && (
                <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-48 opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none">
                  <SuperCommentsList targetId={story.id} />
                </div>
              )}

              {!hasAccess && (
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-app-text-dark text-white text-[9px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                  Restricted Access
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ChatList = ({ userProfile, onSelectMatch, onReport }: { userProfile: UserProfile, onSelectMatch: (id: string) => void, onReport: (uid: string) => void }) => {
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    const q = query(collection(db, "matches"), where("uids", "array-contains", userProfile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMatches = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Match));
      const filteredMatches = allMatches.filter(m => {
        const otherUid = m.uids.find(id => id !== userProfile.uid);
        return !userProfile.privacySettings?.blockedUsers?.includes(otherUid!);
      });
      setMatches(filteredMatches);
    }, (error) => {
      console.error("ChatList: Matches fetch error:", error);
      handleFirestoreError(error, OperationType.GET, "matches");
    });
    return unsubscribe;
  }, [userProfile.uid, userProfile.privacySettings.blockedUsers]);

  const handleBlock = async (targetUid: string) => {
    if (!confirm("Are you sure you want to block this user?")) return;
    try {
      await updateDoc(doc(db, "users", userProfile.uid), {
        "privacySettings.blockedUsers": arrayUnion(targetUid)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}`);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-app-bg-light">
      <h2 className="text-3xl font-serif font-bold text-app-text-dark">Messages</h2>
      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-80 text-zinc-500 space-y-4">
          <div className="w-20 h-20 rounded-full bg-white border border-zinc-200 flex items-center justify-center shadow-sm">
            <MessageCircle className="w-10 h-10 opacity-30" />
          </div>
          <p className="font-serif font-bold text-lg text-app-text-dark">No matches yet. Keep swiping!</p>
        </div>
      ) : (
        matches.map(match => {
          const otherUid = match.uids.find(id => id !== userProfile.uid)!;
          return (
            <div 
              key={match.id} 
              onClick={() => onSelectMatch(match.id)}
              className="flex items-center gap-5 p-4 bg-white rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
            >
              <div className="w-16 h-16 rounded-full bg-zinc-100 overflow-hidden border border-zinc-200">
                <img src={`https://picsum.photos/seed/${otherUid}/200`} className="w-full h-full object-cover" alt="match" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-lg text-app-text-dark">Vibe Match</h3>
                </div>
                <p className="text-sm text-zinc-500 truncate">Tap to start vibing...</p>
              </div>
              <div className="flex flex-col items-end gap-3">
                <div className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">
                  {match.timestamp?.toDate ? formatDistanceToNow(match.timestamp.toDate()) : "Just now"}
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onReport(otherUid); }}
                    className="p-2 text-zinc-300 hover:text-red-500 transition-colors"
                    title="Report User"
                  >
                    <AlertCircle className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleBlock(otherUid); }}
                    className="p-2 text-zinc-300 hover:text-app-primary transition-colors"
                    title="Block User"
                  >
                    <Shield className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

const PrivacySettingsModal = ({ userProfile, onClose }: { userProfile: UserProfile, onClose: () => void }) => {
  const [settings, setSettings] = useState(userProfile.privacySettings || {
    showStories: 'everyone',
    showProfile: 'everyone',
    allowChatFrom: 'everyone',
    blockedUsers: []
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", userProfile.uid), {
        privacySettings: settings
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-app-text-dark/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
    >
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="w-full max-w-md bg-white border border-zinc-100 rounded-[40px] overflow-hidden shadow-2xl"
      >
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-serif font-bold text-app-text-dark">Privacy Controls</h2>
            <button onClick={onClose} className="p-2 bg-zinc-50 rounded-full text-app-text-dark">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1">Who can see your stories?</label>
              <div className="grid grid-cols-3 gap-2">
                {(['everyone', 'matches', 'nobody'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSettings({ ...settings, showStories: opt })}
                    className={cn(
                      "py-3 rounded-2xl text-xs font-bold border transition-all",
                      settings.showStories === opt ? "bg-app-secondary text-white border-app-secondary" : "bg-zinc-50 text-zinc-500 border-zinc-100"
                    )}
                  >
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1">Who can view your profile?</label>
              <div className="grid grid-cols-2 gap-2">
                {(['everyone', 'matches'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSettings({ ...settings, showProfile: opt })}
                    className={cn(
                      "py-3 rounded-2xl text-xs font-bold border transition-all",
                      settings.showProfile === opt ? "bg-app-secondary text-white border-app-secondary" : "bg-zinc-50 text-zinc-500 border-zinc-100"
                    )}
                  >
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1">Allow chat from</label>
              <div className="grid grid-cols-3 gap-2">
                {(['everyone', 'verified_only', 'matches_only'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSettings({ ...settings, allowChatFrom: opt })}
                    className={cn(
                      "py-3 rounded-2xl text-[10px] font-bold border transition-all leading-tight",
                      settings.allowChatFrom === opt ? "bg-app-secondary text-white border-app-secondary" : "bg-zinc-50 text-zinc-500 border-zinc-100"
                    )}
                  >
                    {opt.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button 
            disabled={saving}
            onClick={handleSave}
            className="w-full py-4 bg-app-primary text-white font-bold rounded-full text-lg hover:bg-app-secondary transition-all active:scale-95 disabled:opacity-50 shadow-lg"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const VerificationModal = ({ userProfile, onClose }: { userProfile: UserProfile, onClose: () => void }) => {
  const [step, setStep] = useState<'intro' | 'scan_id' | 'selfie' | 'processing' | 'success' | 'error'>('intro');
  const [idImage, setIdImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: step === 'scan_id' ? 'environment' : 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Camera access denied. Please enable camera permissions.");
      setStep('error');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  useEffect(() => {
    if (step === 'scan_id' || step === 'selfie') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step]);

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const data = canvasRef.current.toDataURL('image/jpeg');
        if (step === 'scan_id') {
          setIdImage(data);
          setStep('selfie');
        } else {
          setSelfieImage(data);
          setStep('processing');
          processVerification(idImage!, data);
        }
      }
    }
  };

  const processVerification = async (idBase64: string, selfieBase64: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = "gemini-3-flash-preview";
      
      const prompt = `You are a professional identity verification expert. 
      Compare the ID card image and the selfie image. 
      1. Verify if the ID card is a valid government-issued ID.
      2. Compare the face on the ID card with the face in the selfie.
      3. Return a JSON object with:
         - "verified": boolean
         - "confidence": number (0-1)
         - "reason": string (brief explanation)
      Only return the JSON.`;

      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: "image/jpeg", data: idBase64.split(',')[1] } },
              { inlineData: { mimeType: "image/jpeg", data: selfieBase64.split(',')[1] } }
            ]
          }
        ],
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || '{}');
      
      if (result.verified && result.confidence > 0.8) {
        await updateDoc(doc(db, "users", userProfile.uid), {
          isVerified: true
        });
        setStep('success');
      } else {
        setError(result.reason || "Verification failed. Faces did not match or ID was invalid.");
        setStep('error');
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError("An error occurred during processing. Please try again.");
      setStep('error');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] bg-app-text-dark/60 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[40px] overflow-hidden shadow-2xl p-8 space-y-8"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-serif font-bold text-app-text-dark">Verification</h2>
          <button onClick={onClose} className="p-2 bg-zinc-100 rounded-full text-app-text-dark">
            <X className="w-6 h-6" />
          </button>
        </div>

        {step === 'intro' && (
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 bg-app-secondary/5 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-10 h-10 text-app-secondary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-serif font-bold text-app-text-dark">Get the Blue Badge</h3>
              <p className="text-zinc-500 text-sm">Verify your identity to build trust and access exclusive features.</p>
            </div>
            <div className="space-y-3 text-left bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
              <div className="flex items-center gap-3 text-sm font-medium text-app-text-dark">
                <Scan className="w-4 h-4 text-app-secondary" />
                <span>Scan government ID</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-medium text-app-text-dark">
                <UserCheck className="w-4 h-4 text-app-secondary" />
                <span>Take a quick selfie</span>
              </div>
            </div>
            <button 
              onClick={() => setStep('scan_id')}
              className="w-full py-4 bg-app-primary text-white font-bold rounded-full text-lg hover:bg-app-secondary transition-all active:scale-95 shadow-lg"
            >
              Start Verification
            </button>
          </div>
        )}

        {(step === 'scan_id' || step === 'selfie') && (
          <div className="space-y-6">
            <div className="relative aspect-[4/3] bg-black rounded-3xl overflow-hidden border-4 border-app-secondary/20 shadow-2xl">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-2 border-white/30 rounded-2xl m-8 pointer-events-none" />
              <div className="absolute top-4 left-4 bg-app-primary/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                {step === 'scan_id' ? "Scan ID Front" : "Take a Selfie"}
              </div>
            </div>
            <p className="text-center text-sm text-zinc-500 font-medium font-serif">
              {step === 'scan_id' ? "Position your ID within the frame" : "Look directly at the camera"}
            </p>
            <button 
              onClick={capture}
              className="w-full py-4 bg-app-primary text-white font-bold rounded-full text-lg flex items-center justify-center gap-2 hover:bg-app-secondary transition-all active:scale-95 shadow-lg"
            >
              <Camera className="w-6 h-6" />
              Capture
            </button>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {step === 'processing' && (
          <div className="py-12 flex flex-col items-center justify-center space-y-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-app-secondary/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-app-secondary rounded-full border-t-transparent animate-spin" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-serif font-bold text-app-text-dark">Processing...</h3>
              <p className="text-zinc-500 text-sm">Our AI is verifying your identity. This usually takes a few seconds.</p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 flex flex-col items-center justify-center space-y-6 text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-serif font-bold text-app-text-dark">Verified!</h3>
              <p className="text-zinc-500 text-sm">Your profile now features the blue verification badge.</p>
            </div>
            <button 
              onClick={onClose}
              className="w-full py-4 bg-app-primary text-white font-bold rounded-full text-lg hover:bg-app-secondary transition-all active:scale-95 shadow-lg"
            >
              Continue
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="py-8 flex flex-col items-center justify-center space-y-6 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-serif font-bold text-app-text-dark">Verification Failed</h3>
              <p className="text-red-500 text-sm font-medium">{error}</p>
            </div>
            <button 
              onClick={() => setStep('intro')}
              className="w-full py-4 bg-app-primary text-white font-bold rounded-full text-lg hover:bg-app-secondary transition-all active:scale-95 shadow-lg"
            >
              Try Again
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

const ChatScreen = ({ matchId, userProfile, onBack }: { matchId: string, userProfile: UserProfile, onBack: () => void }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [showGiftMenu, setShowGiftMenu] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchOtherUser = async () => {
      const matchDoc = await getDocs(query(collection(db, "matches"), where("__name__", "==", matchId)));
      if (!matchDoc.empty) {
        const matchData = matchDoc.docs[0].data() as Match;
        const otherUid = matchData.uids.find(id => id !== userProfile.uid);
        if (otherUid) {
          const userDoc = await getDocs(query(collection(db, "users"), where("uid", "==", otherUid)));
          if (!userDoc.empty) {
            setOtherUser({ ...userDoc.docs[0].data(), uid: userDoc.docs[0].id } as UserProfile);
          }
        }
      }
    };
    fetchOtherUser();

    const q = query(
      collection(db, "matches", matchId, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Message)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `matches/${matchId}/messages`);
    });
    return unsubscribe;
  }, [matchId, userProfile.uid]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText;
    setInputText("");

    try {
      await addDoc(collection(db, "matches", matchId, "messages"), {
        matchId,
        senderUid: userProfile.uid,
        recipientUid: otherUser?.uid, // Added for security rules check
        text,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `matches/${matchId}/messages`);
    }
  };

  const handleSendGift = async (gift: typeof GIFTS[0]) => {
    if (userProfile.coins < gift.cost) {
      alert("Not enough coins! Buy more to send this gift.");
      return;
    }

    setShowGiftMenu(false);

    try {
      // 1. Deduct coins from sender
      await updateDoc(doc(db, "users", userProfile.uid), {
        coins: increment(-gift.cost)
      });

      // 2. Add coins to recipient
      if (otherUser) {
        await updateDoc(doc(db, "users", otherUser.uid), {
          coins: increment(gift.cost)
        });
      }

      // 3. Create gift record
      await addDoc(collection(db, "gifts"), {
        fromUid: userProfile.uid,
        toUid: otherUser?.uid,
        amount: gift.cost,
        giftId: gift.id,
        timestamp: serverTimestamp()
      });

      // 4. Send a message in chat
      await addDoc(collection(db, "matches", matchId, "messages"), {
        matchId,
        senderUid: userProfile.uid,
        recipientUid: otherUser?.uid,
        text: `Sent a ${gift.name} ${gift.icon}`,
        isGift: true,
        giftId: gift.id,
        timestamp: serverTimestamp()
      });

    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "gifting");
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-app-bg-medium h-full overflow-hidden relative">
      <div className="p-6 bg-white border-b border-zinc-200 flex items-center gap-4 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-zinc-100 rounded-full transition-colors">
          <X className="w-6 h-6 text-app-text-dark" />
        </button>
        <div className="w-12 h-12 rounded-full bg-zinc-100 overflow-hidden border border-zinc-200">
          <img src={otherUser?.photoURL || `https://picsum.photos/seed/${matchId}/200`} className="w-full h-full object-cover" alt="match" referrerPolicy="no-referrer" />
        </div>
        <div className="flex-1">
          <h3 className="font-serif font-bold text-lg text-app-text-dark">{otherUser?.displayName || "Vibe Match"}</h3>
          <p className="text-[10px] font-bold text-app-primary uppercase tracking-widest">Online Now</p>
        </div>
        <button className="p-2 text-zinc-400 hover:text-app-primary transition-colors">
          <Shield className="w-6 h-6" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
        {messages.map((msg) => {
          const isMe = msg.senderUid === userProfile.uid;
          const isGift = (msg as any).isGift;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "max-w-[80%] p-4 rounded-3xl text-sm font-medium shadow-sm",
                isMe 
                  ? "ml-auto bg-app-primary text-white rounded-br-none" 
                  : "mr-auto bg-white text-app-text-dark border border-zinc-200 rounded-bl-none",
                isGift && "bg-gradient-to-br from-yellow-400 to-orange-500 text-white border-none"
              )}
            >
              {isGift && <GiftIcon className="w-4 h-4 mb-2" />}
              {msg.text}
              <div className={cn(
                "text-[9px] mt-1 opacity-60 font-bold uppercase tracking-wider",
                isMe ? "text-right" : "text-left"
              )}>
                {msg.timestamp?.toDate ? formatDistanceToNow(msg.timestamp.toDate()) : "Just now"}
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {showGiftMenu && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute bottom-24 left-6 right-6 bg-white rounded-3xl shadow-2xl border border-zinc-100 p-6 z-50"
          >
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-serif font-bold text-xl text-app-text-dark">Send a Gift</h4>
              <div className="flex items-center gap-1.5 bg-zinc-50 px-3 py-1 rounded-full border border-zinc-100">
                <Coins className="w-3 h-3 text-yellow-600" />
                <span className="text-xs font-bold">{userProfile.coins}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {GIFTS.map(gift => (
                <button
                  key={gift.id}
                  onClick={() => handleSendGift(gift)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-zinc-50 transition-all active:scale-95 border border-transparent hover:border-zinc-100"
                >
                  <span className="text-3xl">{gift.icon}</span>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{gift.name}</span>
                  <div className="flex items-center gap-1">
                    <Coins className="w-2.5 h-2.5 text-yellow-600" />
                    <span className="text-[11px] font-bold text-app-text-dark">{gift.cost}</span>
                  </div>
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowGiftMenu(false)}
              className="w-full mt-6 py-3 text-zinc-400 font-bold text-sm uppercase tracking-widest hover:text-zinc-600 transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-zinc-200 flex gap-3 items-center">
        <button 
          type="button"
          onClick={() => setShowGiftMenu(true)}
          className="w-12 h-12 bg-zinc-50 text-zinc-400 rounded-2xl flex items-center justify-center hover:bg-zinc-100 transition-all active:scale-90 border border-zinc-100"
        >
          <GiftIcon className="w-6 h-6" />
        </button>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-zinc-100 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-app-primary transition-all"
        />
        <button 
          type="submit"
          className="w-12 h-12 bg-app-primary text-white rounded-2xl flex items-center justify-center hover:bg-app-secondary transition-all active:scale-90 shadow-md"
        >
          <Plus className="w-6 h-6 rotate-45" />
        </button>
      </form>
    </div>
  );
};

const ReportModal = ({ reporterUid, reportedUid, onClose }: { reporterUid: string, reportedUid: string, onClose: () => void }) => {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "reports"), {
        reporterUid,
        reportedUid,
        reason,
        details,
        timestamp: serverTimestamp(),
        status: 'pending'
      });
      alert("Report submitted. Thank you for helping keep our community safe.");
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "reports");
    } finally {
      setSubmitting(false);
    }
  };

  const reasons = [
    "Inappropriate content",
    "Harassment or bullying",
    "Fake profile / Spam",
    "Underage user",
    "Other"
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] bg-app-text-dark/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[40px] overflow-hidden shadow-2xl p-8 space-y-8"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-serif font-bold text-app-text-dark">Report User</h2>
          <button onClick={onClose} className="p-2 bg-zinc-50 rounded-full text-app-text-dark">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1">Reason for reporting</label>
            <div className="grid grid-cols-1 gap-2">
              {reasons.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={cn(
                    "w-full py-3 px-5 rounded-2xl text-sm font-bold border text-left transition-all",
                    reason === r ? "bg-app-secondary text-white border-app-secondary" : "bg-zinc-50 text-zinc-500 border-zinc-100"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1">Additional details (Optional)</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-app-secondary transition-all min-h-[100px]"
              placeholder="Tell us more about what happened..."
            />
          </div>

          <button 
            disabled={submitting || !reason}
            onClick={handleSubmit}
            className="w-full py-4 bg-app-highlight text-white font-bold rounded-full text-lg hover:bg-app-highlight/90 transition-all active:scale-95 disabled:opacity-50 shadow-lg"
          >
            {submitting ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const LogoutConfirmationModal = ({ onConfirm, onCancel }: { onConfirm: () => void, onCancel: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-app-text-dark/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm bg-white rounded-[40px] overflow-hidden shadow-2xl p-8 text-center space-y-8"
      >
        <div className="w-20 h-20 bg-red-50/50 rounded-full flex items-center justify-center mx-auto">
          <LogOut className="w-10 h-10 text-red-500" />
        </div>
        
        <div className="space-y-3">
          <h2 className="text-3xl font-serif font-bold text-app-text-dark">Log Out?</h2>
          <p className="text-zinc-500 text-sm">Are you sure you want to log out? You'll need to sign back in to access your matches and messages.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={onCancel}
            className="py-4 bg-zinc-50 text-app-text-dark font-bold rounded-full hover:bg-zinc-100 transition-all active:scale-95"
          >
            No, Stay
          </button>
          <button 
            onClick={onConfirm}
            className="py-4 bg-red-500 text-white font-bold rounded-full hover:bg-red-600 transition-all active:scale-95 shadow-lg shadow-red-100"
          >
            Yes, Log Out
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Profile = ({ userProfile }: { userProfile: UserProfile }) => {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-app-bg-medium">
      <AnimatePresence>
        {showPrivacy && <PrivacySettingsModal userProfile={userProfile} onClose={() => setShowPrivacy(false)} />}
        {showVerification && <VerificationModal userProfile={userProfile} onClose={() => setShowVerification(false)} />}
        {showLogoutConfirm && <LogoutConfirmationModal onConfirm={() => signOut(auth)} onCancel={() => setShowLogoutConfirm(false)} />}
      </AnimatePresence>
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="relative">
          <div className="w-40 h-40 rounded-full p-1 bg-app-secondary shadow-xl">
            <div className="w-full h-full rounded-full border-4 border-white overflow-hidden bg-zinc-100">
              <img src={userProfile.photoURL} className="w-full h-full object-cover" alt="profile" referrerPolicy="no-referrer" />
            </div>
          </div>
          <button className="absolute bottom-2 right-2 bg-white p-3 rounded-full shadow-2xl border border-zinc-100 text-app-text-dark hover:scale-110 transition-transform">
            <Camera className="w-5 h-5 text-app-secondary" />
          </button>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-4xl font-serif font-bold text-app-text-dark">{userProfile.displayName}</h2>
            {userProfile.isVerified && <CheckCircle2 className="w-6 h-6 text-app-secondary fill-app-secondary/10" />}
          </div>
          <p className="text-zinc-500 text-base font-medium">@{userProfile.uid.slice(0, 8)}</p>
        </div>
      </div>

      {!userProfile.isVerified && (
        <button 
          onClick={() => setShowVerification(true)}
          className="w-full p-6 bg-white rounded-[32px] border border-app-secondary/10 flex items-center gap-4 shadow-sm hover:bg-zinc-50 transition-colors group"
        >
          <div className="w-12 h-12 bg-app-secondary/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Shield className="w-6 h-6 text-app-secondary" />
          </div>
          <div className="flex-1 text-left">
            <h4 className="font-serif font-bold text-app-text-dark">Get Verified</h4>
            <p className="text-xs text-zinc-500">Scan ID and selfie to get your badge.</p>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-300" />
        </button>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="p-6 bg-white rounded-[32px] border border-zinc-100 flex flex-col items-center justify-center gap-2 shadow-sm">
          <Coins className="w-7 h-7 text-app-secondary" />
          <span className="text-3xl font-serif font-bold text-app-text-dark">{userProfile.coins}</span>
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Coins</span>
        </div>
        <div className="p-6 bg-white rounded-[32px] border border-zinc-100 flex flex-col items-center justify-center gap-2 shadow-sm">
          <Star className="w-7 h-7 text-app-highlight" />
          <span className="text-3xl font-serif font-bold text-app-text-dark">12</span>
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Superlikes</span>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.25em] px-4">Account Settings</h3>
        <div className="bg-white rounded-[40px] border border-zinc-100 overflow-hidden shadow-sm">
          <button 
            onClick={() => setShowPrivacy(true)}
            className="w-full flex items-center gap-5 p-6 hover:bg-zinc-50 transition-colors border-b border-zinc-50 text-app-text-dark"
          >
            <Settings className="w-6 h-6 text-zinc-400" />
            <span className="flex-1 text-left font-bold text-lg">Privacy Controls</span>
          </button>
          <button className="w-full flex items-center gap-5 p-6 hover:bg-zinc-50 transition-colors border-b border-zinc-50 text-app-text-dark">
            <GiftIcon className="w-6 h-6 text-zinc-400" />
            <span className="flex-1 text-left font-bold text-lg">Earn Coins</span>
          </button>
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-5 p-6 hover:bg-red-50/30 transition-colors text-red-500"
          >
            <LogOut className="w-6 h-6" />
            <span className="flex-1 text-left font-bold text-lg">Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const CheckoutForm = ({ 
  uid, 
  coins, 
  amount, 
  onSuccess 
}: { 
  uid: string, 
  coins: number, 
  amount: number, 
  onSuccess: () => void 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    try {
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, coins, amount }),
      });
      const { clientSecret, error: apiError } = await response.json();
      if (apiError) throw new Error(apiError);

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement) as any,
        },
      });

      if (result.error) {
        setError(result.error.message || "Payment failed");
      } else {
        if (result.paymentIntent.status === "succeeded") {
          onSuccess();
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200">
        <CardElement options={{ style: { base: { fontSize: "16px" } } }} />
      </div>
      {error && <div className="text-red-500 text-xs px-2">{error}</div>}
      <button
        disabled={!stripe || processing}
        className="w-full py-4 bg-app-primary text-white font-bold rounded-full text-lg hover:bg-app-secondary transition-all active:scale-95 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : `Pay $${(amount / 100).toFixed(2)}`}
      </button>
    </form>
  );
};

const CoinStore = ({ userProfile, onClose }: { userProfile: UserProfile, onClose: () => void }) => {
  const [selectedPackage, setSelectedPackage] = useState<{ coins: number, amount: number } | null>(null);

  const packages = [
    { coins: 100, amount: 99, label: "Starter Pack" },
    { coins: 500, amount: 399, label: "Vibe Pack", popular: true },
    { coins: 1200, amount: 799, label: "Super Pack" },
    { coins: 3000, amount: 1499, label: "Legend Pack" },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-app-text-dark/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl border border-zinc-100 flex flex-col max-h-[90vh]"
      >
        <div className="p-8 space-y-6 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-app-secondary/5 rounded-2xl flex items-center justify-center">
              <Coins className="w-6 h-6 text-app-secondary" />
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-zinc-400" />
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-serif font-bold text-app-text-dark">Get More Coins</h3>
            <p className="text-sm text-zinc-500">Unlock premium features and send more gifts.</p>
          </div>

          {!selectedPackage ? (
            <div className="grid grid-cols-1 gap-3">
              {packages.map((pkg) => (
                <button
                  key={pkg.coins}
                  onClick={() => setSelectedPackage(pkg)}
                  className={cn(
                    "p-5 rounded-3xl border-2 transition-all flex items-center justify-between group",
                    pkg.popular ? "border-app-secondary bg-app-secondary/5" : "border-zinc-50 hover:border-app-secondary/30"
                  )}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-app-text-dark">{pkg.coins} Coins</span>
                      {pkg.popular && <span className="text-[9px] bg-app-secondary text-white px-2 py-0.5 rounded-full uppercase">Popular</span>}
                    </div>
                    <span className="text-xs text-zinc-400">{pkg.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-app-secondary">${(pkg.amount / 100).toFixed(2)}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <button 
                onClick={() => setSelectedPackage(null)}
                className="text-xs font-bold text-app-secondary flex items-center gap-1 hover:underline"
              >
                ← Back to packages
              </button>
              <div className="p-5 bg-zinc-50 rounded-3xl border border-zinc-100 flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-app-text-dark">{selectedPackage.coins} Coins</div>
                  <div className="text-xs text-zinc-400">Secure Payment</div>
                </div>
                <div className="text-xl font-bold text-app-secondary">${(selectedPackage.amount / 100).toFixed(2)}</div>
              </div>
              <Elements stripe={stripePromise}>
                <CheckoutForm 
                  uid={userProfile.uid} 
                  coins={selectedPackage.coins} 
                  amount={selectedPackage.amount} 
                  onSuccess={() => {
                    alert("Payment successful! Your coins will be credited shortly.");
                    onClose();
                  }}
                />
              </Elements>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const TransactionHistory = ({ userProfile, onClose }: { userProfile: UserProfile, onClose: () => void }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch(`/api/transactions/${userProfile.uid}`);
        const data = await response.json();
        setTransactions(data);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [userProfile.uid]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-app-text-dark/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl border border-zinc-100 flex flex-col max-h-[90vh]"
      >
        <div className="p-8 space-y-6 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center">
              <History className="w-6 h-6 text-zinc-400" />
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-zinc-400" />
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-serif font-bold text-app-text-dark">Transaction History</h3>
            <p className="text-sm text-zinc-500">Track your coin usage and purchases.</p>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-app-secondary" /></div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-10 text-zinc-400 text-sm">No transactions yet.</div>
            ) : (
              transactions.map((t) => (
                <div key={t.id} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-app-text-dark">{t.description}</div>
                    <div className="text-[10px] text-zinc-400 uppercase tracking-widest">
                      {new Date(t.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={cn(
                    "text-sm font-bold",
                    t.type === "purchase" ? "text-green-500" : "text-app-highlight"
                  )}>
                    {t.type === "purchase" ? "+" : "-"}{t.amount}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const SuperCommentsList = ({ targetId }: { targetId: string }) => {
  const [comments, setComments] = useState<(SuperComment & { user?: UserProfile })[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "super_comments"),
      where("targetId", "==", targetId),
      orderBy("timestamp", "desc"),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const commentData = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as SuperComment));
      
      const uids = [...new Set(commentData.map(c => c.fromUid))];
      if (uids.length === 0) {
        setComments([]);
        return;
      }

      const userSnapshots = await getDocs(query(collection(db, "users"), where("uid", "in", uids)));
      const userMap = new Map<string, UserProfile>();
      userSnapshots.forEach(snap => {
        const u = { ...snap.data(), uid: snap.id } as UserProfile;
        userMap.set(u.uid, u);
      });

      setComments(commentData.map(c => ({ ...c, user: userMap.get(c.fromUid) })));
    }, (error) => {
      console.error("SuperCommentsList: Fetch error:", error);
      // Silently fail for comments to not break UI
    });

    return () => unsubscribe();
  }, [targetId]);

  if (comments.length === 0) return null;

  return (
    <div className="space-y-2">
      {comments.map(comment => (
        <motion.div 
          key={comment.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-r from-app-secondary/10 to-app-highlight/10 backdrop-blur-md border border-white/30 p-3 rounded-2xl flex items-start gap-3 shadow-sm"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white">
            <img 
              src={comment.user?.photoURL || `https://picsum.photos/seed/${comment.fromUid}/100/100`} 
              className="w-full h-full object-cover" 
              alt="avatar"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-app-text-dark truncate">{comment.user?.displayName}</span>
              <Star className="w-2.5 h-2.5 text-app-secondary fill-app-secondary" />
            </div>
            <p className="text-[11px] text-app-text-dark/80 leading-tight font-serif">{comment.text}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

const SuperCommentModal = ({ 
  userProfile, 
  targetUid, 
  targetId, 
  targetType, 
  onClose 
}: { 
  userProfile: UserProfile, 
  targetUid: string, 
  targetId: string, 
  targetType: 'profile' | 'story', 
  onClose: () => void 
}) => {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const cost = 50;

  const handleSend = async () => {
    if (!text.trim() || isSending) return;
    if (userProfile.coins < cost) {
      alert("Not enough coins! Buy more to send a Super Comment.");
      return;
    }

    setIsSending(true);
    try {
      // 1. Spend coins server-side
      const spendResponse = await fetch("/api/spend-coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          uid: userProfile.uid, 
          coins: cost, 
          description: `Super Comment on ${targetType}` 
        }),
      });

      if (!spendResponse.ok) {
        const errorData = await spendResponse.json();
        throw new Error(errorData.error || "Failed to spend coins");
      }

      // 2. Add Super Comment
      await addDoc(collection(db, "super_comments"), {
        fromUid: userProfile.uid,
        targetUid,
        targetId,
        targetType,
        text: text.trim(),
        amount: cost,
        timestamp: serverTimestamp()
      });

      alert("Super Comment sent! 🚀");
      onClose();
    } catch (error: any) {
      alert(error.message || "Something went wrong");
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl border border-zinc-100"
      >
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-app-secondary/10 rounded-2xl flex items-center justify-center">
              <Star className="w-6 h-6 text-app-secondary fill-app-secondary" />
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-zinc-400" />
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-serif font-bold text-app-text-dark">Super Comment</h3>
            <p className="text-sm text-zinc-500">Send a highlighted message that stands out. Costs {cost} coins.</p>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write something playful..."
            className="w-full h-32 bg-zinc-50 border-none rounded-[32px] p-5 text-sm focus:ring-2 focus:ring-app-secondary transition-all resize-none font-serif"
            maxLength={200}
          />

          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-1.5 bg-zinc-50 px-3 py-1 rounded-full border border-zinc-100">
              <Coins className="w-3 h-3 text-yellow-600" />
              <span className="text-xs font-bold">{userProfile.coins}</span>
            </div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{text.length}/200</span>
          </div>

          <button
            disabled={isSending || !text.trim()}
            onClick={handleSend}
            className="w-full py-4 bg-app-primary text-white font-bold rounded-full text-lg hover:bg-app-secondary transition-all active:scale-95 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : `Send for ${cost} Coins`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const { user, profile, loading } = useAuth();

  const [activeTab, setActiveTab] = useState<'discovery' | 'chat' | 'profile'>('discovery');
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [reportingUid, setReportingUid] = useState<string | null>(null);
  const [superCommentTarget, setSuperCommentTarget] = useState<{ uid: string, id: string, type: 'profile' | 'story' } | null>(null);
  const [showCoinStore, setShowCoinStore] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);

  const [showRetry, setShowRetry] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setShowRetry(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-app-bg-light flex flex-col items-center justify-center p-6">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-5xl font-serif font-bold text-app-text-dark mb-8"
        >
          Me4U
        </motion.div>
        
        {showRetry && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center space-y-4"
          >
            <p className="text-zinc-500 text-sm text-center">
              Taking longer than usual. Check your connection or try again.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-app-secondary text-white rounded-full font-bold text-sm shadow-md hover:opacity-90 transition-all"
            >
              Retry Connection
            </button>
          </motion.div>
        )}
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-app-bg-light flex flex-col items-center justify-center p-8 text-center space-y-6">
        <AnimatePresence>
          {showLogoutConfirm && <LogoutConfirmationModal onConfirm={() => signOut(auth)} onCancel={() => setShowLogoutConfirm(false)} />}
        </AnimatePresence>
        <Loader2 className="w-12 h-12 text-app-secondary animate-spin" />
        <div className="space-y-2">
          <h2 className="text-2xl font-serif font-bold text-app-text-dark">Setting up your profile</h2>
          <p className="text-zinc-500 text-sm">We're getting things ready for you. This should only take a moment.</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-app-secondary text-white font-bold rounded-full shadow-md hover:opacity-90 transition-all"
          >
            Refresh App
          </button>
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full py-3 border border-zinc-200 text-zinc-500 font-bold rounded-full hover:bg-zinc-50 transition-all"
          >
            Cancel and Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg-light text-app-text-dark flex flex-col max-w-md mx-auto border-x border-zinc-200 shadow-2xl font-sans relative overflow-hidden">
      <AnimatePresence>
        {reportingUid && (
          <ReportModal 
            reporterUid={user.uid} 
            reportedUid={reportingUid} 
            onClose={() => setReportingUid(null)} 
          />
        )}
        {superCommentTarget && (
          <SuperCommentModal 
            userProfile={profile}
            targetUid={superCommentTarget.uid}
            targetId={superCommentTarget.id}
            targetType={superCommentTarget.type}
            onClose={() => setSuperCommentTarget(null)}
          />
        )}
        {showCoinStore && (
          <CoinStore 
            userProfile={profile} 
            onClose={() => setShowCoinStore(false)} 
          />
        )}
        {showTransactions && (
          <TransactionHistory 
            userProfile={profile} 
            onClose={() => setShowTransactions(false)} 
          />
        )}
      </AnimatePresence>

      {/* Header */}
      {!activeMatchId && (
        <header className="px-8 py-6 flex items-center justify-between border-b border-zinc-100 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <h1 className="text-3xl font-serif font-bold tracking-tight text-app-text-dark">Me4U</h1>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowTransactions(true)}
            className="flex items-center gap-1.5 bg-zinc-50 px-4 py-1.5 rounded-full border border-zinc-200 shadow-sm hover:bg-zinc-100 transition-colors"
          >
            <Coins className="w-3.5 h-3.5 text-yellow-600" />
            <span className="text-xs font-bold text-app-text-dark">{profile.coins}</span>
          </button>
          <button 
            onClick={() => setShowCoinStore(true)}
            className="p-2.5 bg-app-secondary rounded-full text-white shadow-md hover:opacity-90 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </header>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeMatchId ? (
          <ChatScreen 
            matchId={activeMatchId} 
            userProfile={profile} 
            onBack={() => setActiveMatchId(null)} 
          />
        ) : (
          <>
            {activeTab === 'discovery' && (
              <>
                <Stories 
                  userProfile={profile} 
                  onSuperComment={(uid, id, type) => setSuperCommentTarget({ uid, id, type })} 
                />
                <Discovery 
                  userProfile={profile} 
                  onReport={setReportingUid} 
                  onSuperComment={(uid, id, type) => setSuperCommentTarget({ uid, id, type })}
                />
              </>
            )}
            {activeTab === 'chat' && (
              <ChatList 
                userProfile={profile} 
                onSelectMatch={setActiveMatchId} 
                onReport={setReportingUid} 
              />
            )}
            {activeTab === 'profile' && <Profile userProfile={profile} />}
          </>
        )}
      </main>

      {/* Navigation */}
      {!activeMatchId && (
        <nav className="px-10 py-6 bg-white/90 backdrop-blur-2xl border-t border-zinc-100 flex justify-between items-center sticky bottom-0 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
        <button 
          onClick={() => setActiveTab('discovery')}
          className={cn(
            "p-2 transition-all duration-300",
            activeTab === 'discovery' ? "text-app-text-dark scale-125" : "text-zinc-300 hover:text-zinc-500"
          )}
        >
          <Compass className={cn("w-7 h-7", activeTab === 'discovery' && "fill-app-secondary/5")} />
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={cn(
            "p-2 transition-all duration-300",
            activeTab === 'chat' ? "text-app-text-dark scale-125" : "text-zinc-300 hover:text-zinc-500"
          )}
        >
          <MessageCircle className={cn("w-7 h-7", activeTab === 'chat' && "fill-app-secondary/5")} />
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={cn(
            "p-2 transition-all duration-300",
            activeTab === 'profile' ? "text-app-text-dark scale-125" : "text-zinc-300 hover:text-zinc-500"
          )}
        >
          <User className={cn("w-7 h-7", activeTab === 'profile' && "fill-app-secondary/5")} />
        </button>
      </nav>
      )}
    </div>
  );
}
