import { sql } from '@vercel/postgres';

async function testGetAll() {
  try {
    console.log('Testing getAllPasswords...');

    const result = await sql`
      SELECT room_id, password FROM conversation_passwords
    `;

    console.log('Result object:', result);
    console.log('Result.rows:', result.rows);
    console.log('Result.rows type:', typeof result.rows);
    console.log('Result.rows length:', result.rows?.length);

    if (result.rows && result.rows.length > 0) {
      console.log('First row:', result.rows[0]);
      console.log('First row keys:', Object.keys(result.rows[0]));
    }

    const passwords = {};
    result.rows.forEach(row => {
      console.log('Processing row:', row);
      passwords[row.room_id] = row.password;
    });

    console.log('Final passwords object:', passwords);
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

testGetAll();
