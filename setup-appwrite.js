const { Client, Databases, Storage, ID, Permission, Role } = require('node-appwrite');

// Konfigurasi ini harus diisi setelah membuat project di dashboard Appwrite
const API_ENDPOINT = 'https://cloud.appwrite.io/v1'; // Endpoint Appwrite Cloud
const PROJECT_ID = 'isi_dengan_project_id_kamu';
const API_KEY = 'isi_dengan_api_key_kamu'; // Harus punya akses Databases dan Storage (Centang semua permission saat buat API key)

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
            await databases.create(DATABASE_ID, 'ReuseKos DB');
            console.log('✅ Database berhasil dibuat.');
        } catch (error) {
            if (error.code === 409) console.log('⚡ Database sudah ada.');
            else throw error;
        }

        // 2. Buat Collections
        const collections = [
            { id: PROFILES_ID, name: 'Profiles' },
            { id: PRODUCTS_ID, name: 'Products' },
            { id: TRANSACTIONS_ID, name: 'Transactions' }
        ];

        for (const col of collections) {
            try {
                // Document level permissions true agar tiap user bisa punya akses eksklusif ke dokumennya
                await databases.createCollection(DATABASE_ID, col.id, col.name, [
                    Permission.read(Role.any()), // Siapa saja bisa baca
                    Permission.create(Role.users()), // Hanya user terdaftar yang bisa buat
                ], true);
                console.log(`✅ Collection ${col.name} berhasil dibuat.`);
            } catch (error) {
                if (error.code === 409) console.log(`⚡ Collection ${col.name} sudah ada.`);
                else throw error;
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
            await databases.createStringAttribute(DATABASE_ID, PRODUCTS_ID, 'image_url', 1000, true);
            await databases.createBooleanAttribute(DATABASE_ID, PRODUCTS_ID, 'is_sold', false, false);
            // Relationship manual: string berisi profile ID penjual
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
            await storage.createBucket(BUCKET_ID, 'ReuseKos', [
                Permission.read(Role.any()), // Semua orang bisa lihat gambar
                Permission.create(Role.users()), // Hanya user yang bisa upload gambar
                Permission.update(Role.users()),
                Permission.delete(Role.users()),
            ], false, null, null, ['jpg', 'jpeg', 'png', 'webp', 'heic']);
            console.log('✅ Storage Bucket dibuat.');
        } catch (error) {
            if (error.code === 409) console.log('⚡ Storage Bucket sudah ada.');
            else throw error;
        }

        console.log('🎉 Setup Selesai! Tunggu sekitar 1-2 menit agar semua atribut tersedia sepenuhnya di database Appwrite.');

    } catch (error) {
        console.error('❌ Terjadi Error:', error.message);
    }
}

setup();
