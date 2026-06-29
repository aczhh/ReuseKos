import { Databases } from 'node-appwrite';
import { Client } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '6a3b674f001d52269d60')
  .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);
const DATABASE_ID = 'reusekos_db';
const PRODUCTS_ID = 'products';

async function main() {
  try {
    console.log('Adding is_promoted attribute...');
    await databases.createBooleanAttribute(DATABASE_ID, PRODUCTS_ID, 'is_promoted', false, false);
    console.log('✅ is_promoted added');
  } catch (e: any) {
    if (e.code === 409) {
      console.log('ℹ️  is_promoted already exists');
    } else {
      console.error('❌ is_promoted error:', e.message);
    }
  }

  try {
    console.log('Adding promoted_until attribute...');
    await databases.createStringAttribute(DATABASE_ID, PRODUCTS_ID, 'promoted_until', 50, false);
    console.log('✅ promoted_until added');
  } catch (e: any) {
    if (e.code === 409) {
      console.log('ℹ️  promoted_until already exists');
    } else {
      console.error('❌ promoted_until error:', e.message);
    }
  }
}

main();
