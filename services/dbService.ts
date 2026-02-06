
import { neon } from '@neondatabase/serverless';
import { UserContext, Milestone, SavedSession } from '../types';

const DATABASE_URL = 'postgresql://neondb_owner:npg_7W1uVGilZYMn@ep-noisy-firefly-aivnu1g0-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

// Inicialização segura do cliente SQL
let sql: any;
try {
  sql = neon(DATABASE_URL);
} catch (e) {
  console.error("Erro ao inicializar cliente Neon:", e);
}

const SESSION_KEY = 'gabriel_odyssey_user_id';

const ensureTableExists = async () => {
  if (!sql) return;
  try {
    // Usamos um timeout para garantir que o app não trave se o banco demorar a responder
    await Promise.race([
      sql`
        CREATE TABLE IF NOT EXISTS trajectories (
          id TEXT PRIMARY KEY,
          name TEXT,
          current_status TEXT,
          ten_year_goal TEXT,
          milestones JSONB,
          current_distance FLOAT DEFAULT 0,
          current_index INTEGER DEFAULT -1,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout Neon')), 5000))
    ]);
  } catch (error) {
    console.warn('DB Service: Tabela não pôde ser verificada ou já existe.', error);
  }
};

const getUserId = () => {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
};

export const saveTrajectory = async (session: SavedSession) => {
  if (!sql) return;
  try {
    await ensureTableExists();
    const id = session.id || getUserId();
    if (!session.id) localStorage.setItem(SESSION_KEY, id);
    
    await sql`
      INSERT INTO trajectories (id, name, current_status, ten_year_goal, milestones, current_distance, current_index, updated_at)
      VALUES (${id}, ${session.context.name}, ${session.context.currentStatus}, ${session.context.tenYearGoal}, ${JSON.stringify(session.milestones)}, ${session.distance}, ${session.currentIndex}, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        current_status = EXCLUDED.current_status,
        ten_year_goal = EXCLUDED.ten_year_goal,
        milestones = EXCLUDED.milestones,
        current_distance = EXCLUDED.current_distance,
        current_index = EXCLUDED.current_index,
        updated_at = CURRENT_TIMESTAMP
    `;
  } catch (error) {
    console.error('Error saving to Neon:', error);
  }
};

export const getAllTrajectories = async (): Promise<SavedSession[]> => {
  if (!sql) return [];
  try {
    await ensureTableExists();
    const result = await sql`SELECT * FROM trajectories ORDER BY updated_at DESC LIMIT 20`;
    return result.map((row: any) => ({
      id: row.id,
      context: {
        name: row.name,
        currentStatus: row.current_status,
        tenYearGoal: row.ten_year_goal
      },
      milestones: typeof row.milestones === 'string' ? JSON.parse(row.milestones) : row.milestones,
      distance: parseFloat(row.current_distance),
      currentIndex: parseInt(row.current_index)
    }));
  } catch (error) {
    console.error('Error fetching all trajectories:', error);
    return [];
  }
};

export const getSavedTrajectory = async (): Promise<SavedSession | null> => {
  if (!sql) return null;
  try {
    await ensureTableExists();
    const id = getUserId();
    const result = await sql`SELECT * FROM trajectories WHERE id = ${id}`;

    if (!result || result.length === 0) return null;

    const row = result[0];
    return {
      id: row.id,
      context: {
        name: row.name,
        currentStatus: row.current_status,
        tenYearGoal: row.ten_year_goal
      },
      milestones: typeof row.milestones === 'string' ? JSON.parse(row.milestones) : row.milestones,
      distance: parseFloat(row.current_distance),
      currentIndex: parseInt(row.current_index)
    };
  } catch (error) {
    console.warn('DB Service: Falha ao carregar dados.', error);
    return null;
  }
};

export const deleteTrajectory = async (id?: string) => {
  if (!sql) return;
  try {
    await ensureTableExists();
    const targetId = id || getUserId();
    await sql`DELETE FROM trajectories WHERE id = ${targetId}`;
    if (!id) localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Error deleting from Neon:', error);
  }
};
