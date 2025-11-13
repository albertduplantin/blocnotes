import { sql } from '@vercel/postgres';

// Créer la table des mots de passe si elle n'existe pas
export async function initDatabase() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS conversation_passwords (
        room_id VARCHAR(255) PRIMARY KEY,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Récupérer le mot de passe d'une conversation
export async function getPassword(roomId) {
  try {
    const result = await sql`
      SELECT password FROM conversation_passwords
      WHERE room_id = ${roomId}
    `;
    return result.rows[0]?.password || '';
  } catch (error) {
    console.error('Error getting password:', error);
    return '';
  }
}

// Définir le mot de passe d'une conversation
export async function setPassword(roomId, password) {
  try {
    console.log(`[setPassword] roomId: ${roomId}, password: ${password}`);
    if (!password || password.trim() === '') {
      // Supprimer le mot de passe si vide
      console.log('[setPassword] Deleting password...');
      const deleteResult = await sql`
        DELETE FROM conversation_passwords
        WHERE room_id = ${roomId}
      `;
      console.log('[setPassword] Delete result:', deleteResult);
    } else {
      // Insérer ou mettre à jour
      console.log('[setPassword] Inserting/updating password...');
      const insertResult = await sql`
        INSERT INTO conversation_passwords (room_id, password, updated_at)
        VALUES (${roomId}, ${password}, CURRENT_TIMESTAMP)
        ON CONFLICT (room_id)
        DO UPDATE SET password = ${password}, updated_at = CURRENT_TIMESTAMP
      `;
      console.log('[setPassword] Insert result:', insertResult);
    }
    console.log('[setPassword] Operation completed successfully');
    return true;
  } catch (error) {
    console.error('[setPassword] Error setting password:', error);
    return false;
  }
}

// Récupérer tous les mots de passe
export async function getAllPasswords() {
  try {
    console.log('[getAllPasswords] Starting query...');

    // Force a fresh connection by using ORDER BY
    const result = await sql`
      SELECT room_id, password FROM conversation_passwords ORDER BY created_at DESC
    `;
    console.log('[getAllPasswords] Query result - rowCount:', result.rowCount);
    console.log('[getAllPasswords] Result.rows:', result.rows);

    const passwords = {};

    if (result.rows && Array.isArray(result.rows)) {
      console.log('[getAllPasswords] Processing', result.rows.length, 'rows');
      for (const row of result.rows) {
        if (row && row.room_id && row.password) {
          console.log(`[getAllPasswords] Adding: ${row.room_id} => ${row.password}`);
          passwords[row.room_id] = row.password;
        } else {
          console.warn('[getAllPasswords] Skipping invalid row:', row);
        }
      }
    } else {
      console.error('[getAllPasswords] result.rows is not an array:', typeof result.rows);
    }

    console.log('[getAllPasswords] Final passwords object:', passwords);
    console.log('[getAllPasswords] Total passwords:', Object.keys(passwords).length);
    return passwords;
  } catch (error) {
    console.error('[getAllPasswords] Error:', error);
    return {};
  }
}
