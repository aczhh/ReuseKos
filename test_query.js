const { Client, Databases, Query } = require('node-appwrite');

const client = new Client()
    .setEndpoint('https://sgp.cloud.appwrite.io/v1')
    .setProject('6a3b674f001d52269d60');

const databases = new Databases(client);

async function run() {
    try {
        const res = await databases.listDocuments('reusekos_db', 'profiles', [
            Query.endsWith('email', 'ub.ac.id')
        ]);
        console.log('Success:', res.documents.length);
    } catch (e) {
        console.error('Error endsWith:', e.message);
        try {
            const res2 = await databases.listDocuments('reusekos_db', 'profiles');
            const filtered = res2.documents.filter(d => d.email.endsWith('ub.ac.id'));
            console.log('Manual filter count:', filtered.length);
        } catch(e2) {}
    }
}
run();
