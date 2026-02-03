/**
 * Check Firebase Firestore collections
 * Run with: node scripts/check-firestore.cjs
 */

const { getFirebaseAdmin } = require('./lib/firebase-admin-helper.cjs');

const { db } = getFirebaseAdmin();

async function checkCollections() {
  try {
    console.log('🔍 Listing Firestore collections...\n');

    const collections = await db.listCollections();
    console.log(`Found ${collections.length} collections:\n`);

    for (const collection of collections) {
      console.log(`📁 ${collection.id}`);

      const snapshot = await db.collection(collection.id).limit(1).get();
      console.log(`   Documents: ${snapshot.size}`);

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data();
        console.log(`   Sample data keys: ${Object.keys(data).slice(0, 5).join(', ')}`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCollections().then(() => process.exit(0));
