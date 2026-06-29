const { Client, Databases } = require('node-appwrite');

const API_ENDPOINT = 'https://sgp.cloud.appwrite.io/v1';
const PROJECT_ID = '6a3b674f001d52269d60';
const API_KEY = 'standard_84b1e33dd69025e25916ef940c9069fdb49fe51aad07401e2953a45491c98e5d0fb6437c53d0aac7bdd443549ced9583d0b1dfb0c0195e8f00f1331d71ff3ed4bd92b16d497861b951070e2c0233ce67cf18fb2245aaa93aa492c2b1eb4e5d25df22e6a40f8b61d830e5a9d90e98de1d51862ecf10146860aa2fd55a649dec44';

const client = new Client()
    .setEndpoint(API_ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new Databases(client);

const DATABASE_ID = 'reusekos_db';
const CHATS_ID = 'chats';
const MESSAGES_ID = 'messages';

async function createIndexes() {
    try {
        console.log('⏳ Membuat Indexes untuk Chats...');
        try {
            await databases.createIndex(DATABASE_ID, CHATS_ID, 'buyer_id_idx', 'key', ['buyer_id'], ['ASC']);
            await databases.createIndex(DATABASE_ID, CHATS_ID, 'seller_id_idx', 'key', ['seller_id'], ['ASC']);
            await databases.createIndex(DATABASE_ID, CHATS_ID, 'product_id_idx', 'key', ['product_id'], ['ASC']);
            await databases.createIndex(DATABASE_ID, CHATS_ID, 'last_msg_time_idx', 'key', ['last_message_time'], ['DESC']);
            console.log('✅ Indexes Chats dibuat.');
        } catch(e) { console.log('⚡ Indexes Chats mungkin sudah ada atau gagal:', e.message); }

        console.log('⏳ Membuat Indexes untuk Messages...');
        try {
            await databases.createIndex(DATABASE_ID, MESSAGES_ID, 'chat_id_idx', 'key', ['chat_id'], ['ASC']);
            console.log('✅ Indexes Messages dibuat.');
        } catch(e) { console.log('⚡ Indexes Messages mungkin sudah ada atau gagal:', e.message); }

        console.log('🎉 Setup Indexes Selesai!');
    } catch (error) {
        console.error('❌ Terjadi Error:', error.message);
    }
}

createIndexes();
