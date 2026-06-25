const { Client, Databases, Storage, ID, Permission, Role } = require('node-appwrite');

// Konfigurasi ini harus diisi setelah membuat project di dashboard Appwrite
const API_ENDPOINT = 'https://sgp.cloud.appwrite.io/v1'; // Endpoint Appwrite Cloud
const PROJECT_ID = '6a3b674f001d52269d60';
const API_KEY = 'standard_84b1e33dd69025e25916ef940c9069fdb49fe51aad07401e2953a45491c98e5d0fb6437c53d0aac7bdd443549ced9583d0b1dfb0c0195e8f00f1331d71ff3ed4bd92b16d497861b951070e2c0233ce67cf18fb2245aaa93aa492c2b1eb4e5d25df22e6a40f8b61d830e5a9d90e98de1d51862ecf10146860aa2fd55a649dec44'; // Ganti dengan API Key milikmuDatabases dan Storage (Centang semua permission saat buat API key)

const client = new Client()
    .setEndpoint(API_ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

// Kita bisa pakai ID konstan atau biarkan Appwrite generate ID unik
const DATABASE_ID = 'reusekos_db';
const PROFILES_ID = 'profiles';
const PRODUCTS_ID = 'products';
const TRANSACTIONS_ID = 'transactions';
const BUCKET_ID = 'reusekos';

async function setup() {
    try {
        console.log('🚀 Memulai setup Appwrite...');

        // 1. Buat Database
        try {
            await databases.get(DATABASE_ID);
            console.log('⚡ Database sudah ada.');
        } catch (err) {
            if (err.code === 404) {
                await databases.create(DATABASE_ID, 'ReuseKos DB');
                console.log('✅ Database berhasil dibuat.');
            } else {
                throw err;
            }
        }

        // 2. Buat Collections
        const collections = [
            { id: PROFILES_ID, name: 'Profiles' },
            { id: PRODUCTS_ID, name: 'Products' },
            { id: TRANSACTIONS_ID, name: 'Transactions' }
        ];

        for (const c of collections) {
            try {
                await databases.getCollection(DATABASE_ID, c.id);
                console.log(`⚡ Collection ${c.name} sudah ada.`);
            } catch (err) {
                if (err.code === 404) {
                    await databases.createCollection(DATABASE_ID, c.id, c.name, [
                        Permission.read(Role.any()), 
                        Permission.create(Role.users()), 
                    ], true);
                    console.log(`✅ Collection ${c.name} berhasil dibuat.`);
                } else throw err;
            }
        }

        // 3. Buat Attributes untuk Profiles
        console.log('⏳ Membuat atribut Profiles...');
        try {
            await databases.createStringAttribute(DATABASE_ID, PROFILES_ID, 'user_id', 255, true);
            await databases.createStringAttribute(DATABASE_ID, PROFILES_ID, 'email', 255, true);
            await databases.createStringAttribute(DATABASE_ID, PROFILES_ID, 'full_name', 255, true);
            await databases.createStringAttribute(DATABASE_ID, PROFILES_ID, 'jurusan', 255, true);
            await databases.createStringAttribute(DATABASE_ID, PROFILES_ID, 'whatsapp', 50, true);
            await databases.createStringAttribute(DATABASE_ID, PROFILES_ID, 'role', 50, true);
            await databases.createIntegerAttribute(DATABASE_ID, PROFILES_ID, 'saldo', false, 0, 1000000000, 0);
            console.log('✅ Atribut Profiles dibuat.');
        } catch(e) { console.log('⚡ Atribut Profiles mungkin sudah ada.'); }

        // 4. Buat Attributes untuk Products
        console.log('⏳ Membuat atribut Products...');
        try {
            await databases.createStringAttribute(DATABASE_ID, PRODUCTS_ID, 'title', 255, true);
            await databases.createStringAttribute(DATABASE_ID, PRODUCTS_ID, 'description', 5000, true);
            await databases.createIntegerAttribute(DATABASE_ID, PRODUCTS_ID, 'price', true, 0, 100000000);
            await databases.createStringAttribute(DATABASE_ID, PRODUCTS_ID, 'category', 100, true);
            await databases.createStringAttribute(DATABASE_ID, PRODUCTS_ID, 'photos', 1000, true, undefined, true); // array
            await databases.createStringAttribute(DATABASE_ID, PRODUCTS_ID, 'video_url', 1000, false);
            await databases.createStringAttribute(DATABASE_ID, PRODUCTS_ID, 'conditions', 255, false, undefined, true); // array
            await databases.createFloatAttribute(DATABASE_ID, PRODUCTS_ID, 'lat', false);
            await databases.createFloatAttribute(DATABASE_ID, PRODUCTS_ID, 'lng', false);
            await databases.createStringAttribute(DATABASE_ID, PRODUCTS_ID, 'address', 1000, false);
            await databases.createBooleanAttribute(DATABASE_ID, PRODUCTS_ID, 'is_sold', false, false);
            await databases.createStringAttribute(DATABASE_ID, PRODUCTS_ID, 'seller_id', 255, true);
            console.log('✅ Atribut Products dibuat.');
        } catch(e) { console.log('⚡ Atribut Products mungkin sudah ada.'); }

        // 5. Buat Attributes untuk Transactions
        console.log('⏳ Membuat atribut Transactions...');
        try {
            await databases.createStringAttribute(DATABASE_ID, TRANSACTIONS_ID, 'product_id', 255, true);
            await databases.createStringAttribute(DATABASE_ID, TRANSACTIONS_ID, 'buyer_id', 255, true);
            await databases.createStringAttribute(DATABASE_ID, TRANSACTIONS_ID, 'seller_id', 255, true);
            await databases.createStringAttribute(DATABASE_ID, TRANSACTIONS_ID, 'status', 50, false, 'pending'); // pending, paid, completed
            await databases.createIntegerAttribute(DATABASE_ID, TRANSACTIONS_ID, 'amount', true);
            console.log('✅ Atribut Transactions dibuat.');
        } catch(e) { console.log('⚡ Atribut Transactions mungkin sudah ada.'); }

        // 6. Buat Storage Bucket
        console.log('⏳ Membuat Storage Bucket...');
        try {
            await storage.getBucket(BUCKET_ID);
            console.log('⚡ Storage Bucket sudah ada.');
        } catch (err) {
            if (err.code === 404) {
                await storage.createBucket(BUCKET_ID, 'ReuseKos', [
                    Permission.read(Role.any()), // Semua orang bisa lihat gambar
                    Permission.create(Role.users()), // Hanya user yang bisa upload gambar
                    Permission.update(Role.users()),
                    Permission.delete(Role.users()),
                ], false, true, undefined, ['jpg', 'jpeg', 'png', 'webp', 'heic', 'mp4']);
                console.log('✅ Storage Bucket dibuat.');
            } else throw err;
        }

        console.log('🎉 Setup Selesai! Tunggu sekitar 1-2 menit agar semua atribut tersedia sepenuhnya di database Appwrite.');

    } catch (error) {
        console.error('❌ Terjadi Error:', error.message);
    }
}

setup();
