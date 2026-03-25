import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Stripe from "stripe";
import * as admin from "firebase-admin";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let firestore: admin.firestore.Firestore;

function getFirestore() {
  if (!firestore) {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: "ai-studio-applet-webapp-6e045",
      });
    }
    firestore = admin.firestore();
  }
  return firestore;
}

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock", {
  apiVersion: "2026-02-25.clover" as any,
});

async function startServer() {
  try {
    const app = express();
    const PORT = 3000;

    app.get("/api/health", (req, res) => {
      res.json({ status: "ok" });
    });

    // Stripe Webhook needs raw body
    app.post("/api/stripe-webhook", express.raw({ type: "application/json" }), async (req, res) => {
      const sig = req.headers["stripe-signature"];
      const stripe = getStripe();
      let event;

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig as string,
          process.env.STRIPE_WEBHOOK_SECRET || "whsec_mock"
        );
      } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const uid = paymentIntent.metadata.uid;
        const coins = parseInt(paymentIntent.metadata.coins);

        if (uid && coins) {
          try {
            const db = getFirestore();
            const userRef = db.collection("users").doc(uid);
            await db.runTransaction(async (t) => {
              const userDoc = await t.get(userRef);
              if (!userDoc.exists) throw new Error("User not found");
              
              const currentCoins = userDoc.data()?.coins || 0;
              t.update(userRef, { coins: currentCoins + coins });
              
              const transRef = db.collection("transactions").doc();
              t.set(transRef, {
                uid,
                type: "purchase",
                amount: coins,
                description: `Purchased ${coins} coins`,
                stripePaymentIntentId: paymentIntent.id,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
              });
            });
            console.log(`Successfully credited ${coins} coins to user ${uid}`);
          } catch (error) {
            console.error("Error updating coins via webhook:", error);
          }
        }
      }

      res.json({ received: true });
    });

    app.use(express.json());

    // API Routes
    app.post("/api/create-payment-intent", async (req, res) => {
      const { uid, coins, amount } = req.body; // amount in cents
      const stripe = getStripe();

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: "usd",
          metadata: { uid, coins: coins.toString() },
          automatic_payment_methods: { enabled: true },
        });

        res.json({ clientSecret: paymentIntent.client_secret });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/spend-coins", async (req, res) => {
      const { uid, coins, description } = req.body;

      try {
        const db = getFirestore();
        const userRef = db.collection("users").doc(uid);
        await db.runTransaction(async (t) => {
          const userDoc = await t.get(userRef);
          if (!userDoc.exists) throw new Error("User not found");
          
          const currentCoins = userDoc.data()?.coins || 0;
          if (currentCoins < coins) throw new Error("Insufficient coins");
          
          t.update(userRef, { coins: currentCoins - coins });
          
          const transRef = db.collection("transactions").doc();
          t.set(transRef, {
            uid,
            type: "spend",
            amount: coins,
            description,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
        });
        res.json({ success: true });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    app.get("/api/transactions/:uid", async (req, res) => {
      const { uid } = req.params;
      try {
        const db = getFirestore();
        const snapshot = await db
          .collection("transactions")
          .where("uid", "==", uid)
          .orderBy("timestamp", "desc")
          .limit(50)
          .get();
        
        const transactions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        }));
        
        res.json(transactions);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Critical error starting server:", error);
  }
}

startServer();
