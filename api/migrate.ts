import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from '@neondatabase/serverless';

interface Food {
  food_id: string;
  food_name: string;
  category: string;
  source: string;
  basis_qty: number;
  basis_unit: string;
  kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  sat_fat_g: number | null;
  carbs_g: number | null;
  sugars_g: number | null;
  fibre_g: number | null;
  salt_g: number | null;
}

interface LogEntry {
  meal: string;
  food_id: string;
  food_name: string;
  qty: number;
  unit: string;
  kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  sat_fat_g: number | null;
  carbs_g: number | null;
  sugars_g: number | null;
  fibre_g: number | null;
  salt_g: number | null;
}

interface CardapioItem {
  meal: string;
  food_id: string;
  food_name: string;
  qty: number;
  unit: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Drink: 'slate',
  Fruit: 'pink',
  Leaves: 'lime',
  Vegetables: 'green',
  'Main Carb': 'amber',
  'Side Carb': 'yellow',
  Nuts: 'orange',
  Protein: 'red',
  Dairy: 'sky',
  Seasoning: 'violet',
  Tranqueira: 'fuchsia',
};

const MEALS = [
  { sort_order: 1, name: 'Breakfast' },
  { sort_order: 2, name: 'Almoço' },
  { sort_order: 3, name: 'Lanche Tarde' },
  { sort_order: 4, name: 'Jantar' },
  { sort_order: 5, name: 'Colação' },
];

const BATCH_SIZE = 300;

function stripMealPrefix(meal: string): string {
  return meal.replace(/^\d+\.\s*/, '');
}

async function fetchAppsScriptData(
  action: string,
  appsScriptUrl: string,
  appsScriptToken: string,
  from?: string,
  to?: string,
): Promise<unknown> {
  const url = new URL(appsScriptUrl);
  url.searchParams.append('token', appsScriptToken);
  url.searchParams.append('action', action);
  if (from) url.searchParams.append('from', from);
  if (to) url.searchParams.append('to', to);

  const response = await fetch(url.toString(), { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Apps Script API returned status ${response.status}`);
  }
  return response.json();
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  const appsScriptUrl = process.env.APPS_SCRIPT_URL;
  const appsScriptToken = process.env.APPS_SCRIPT_TOKEN;

  if (!databaseUrl) {
    res.status(500).json({
      ok: false,
      error: 'Server configuration error: DATABASE_URL not set',
    });
    return;
  }

  if (!appsScriptUrl || !appsScriptToken) {
    res.status(500).json({
      ok: false,
      error: 'Server configuration error: missing Apps Script credentials',
    });
    return;
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();

    // Idempotency guard: check if migration already ran
    const existingEntries = await client.query('SELECT COUNT(*) as count FROM log_entries');
    if (existingEntries.rows.length > 0 && parseInt(existingEntries.rows[0].count) > 0) {
      res.status(200).json({
        ok: true,
        message: 'Migration already completed',
        alreadyRun: true,
      });
      return;
    }

    // Fetch data from Apps Script before starting transaction
    const baseData = (await fetchAppsScriptData(
      'base',
      appsScriptUrl,
      appsScriptToken,
    )) as {
      ok: boolean;
      foods: Food[];
      cardapio: CardapioItem[];
    };

    if (!baseData.ok || !baseData.foods) {
      throw new Error('Failed to fetch base data from Apps Script');
    }

    // Fetch log data with a broad date range to get all historical logs
    const logData = (await fetchAppsScriptData(
      'log',
      appsScriptUrl,
      appsScriptToken,
      '2000-01-01',
      '2099-12-31',
    )) as {
      ok: boolean;
      entries: LogEntry[];
    };

    if (!logData.ok || !logData.entries) {
      throw new Error('Failed to fetch log data from Apps Script');
    }

    const counts = {
      food_types: 0,
      meals: 0,
      users: 0,
      foods: 0,
      default_menu_items: 0,
      log_entries: 0,
    };

    const warnings = {
      unmappedFoodIds: new Set<string>(),
    };

    // Build category→food_type_id mapping
    const uniqueCategories = [...new Set(baseData.foods.map((f) => f.category))];
    const categoryToFoodTypeId: Record<string, number> = {};

    // Start transaction
    await client.query('BEGIN');

    try {
      // Insert food_types (small number, individual queries fine)
      for (const category of uniqueCategories) {
        const color = CATEGORY_COLORS[category] || 'gray';
        const result = await client.query(
          'INSERT INTO food_types (name, color) VALUES ($1, $2) RETURNING id',
          [category, color],
        );
        if (result.rows.length > 0) {
          categoryToFoodTypeId[category] = result.rows[0].id;
          counts.food_types++;
        }
      }

      // Insert meals (fixed 5, individual queries fine)
      for (const meal of MEALS) {
        await client.query('INSERT INTO meals (name, sort_order) VALUES ($1, $2)', [
          meal.name,
          meal.sort_order,
        ]);
        counts.meals++;
      }

      // Insert user "RR"
      const userResult = await client.query(
        'INSERT INTO users (name, created_at) VALUES ($1, NOW()) RETURNING id',
        ['RR'],
      );
      const userId = userResult.rows.length > 0 ? userResult.rows[0].id : null;
      if (userId) counts.users++;

      if (!userId) {
        throw new Error('Failed to create user');
      }

      // Build old→new food_id mapping via batched inserts with RETURNING
      // PostgreSQL preserves input order in multi-row INSERT ... VALUES ... RETURNING,
      // so we can rely on RETURNING results corresponding to input rows in order
      const oldFoodIdToNewId: Record<string, number> = {};

      for (let i = 0; i < baseData.foods.length; i += BATCH_SIZE) {
        const batch = baseData.foods.slice(i, i + BATCH_SIZE);
        const valuesClauses: string[] = [];
        const params: unknown[] = [];

        batch.forEach((food, idx) => {
          const foodTypeId = categoryToFoodTypeId[food.category];
          if (!foodTypeId) {
            throw new Error(`No food_type_id found for category: ${food.category}`);
          }

          const paramOffset = idx * 13 + 1;
          valuesClauses.push(
            `($${paramOffset}, $${paramOffset + 1}, $${paramOffset + 2}, $${paramOffset + 3}, $${paramOffset + 4}, ` +
              `$${paramOffset + 5}, $${paramOffset + 6}, $${paramOffset + 7}, $${paramOffset + 8}, $${paramOffset + 9}, ` +
              `$${paramOffset + 10}, $${paramOffset + 11}, $${paramOffset + 12})`,
          );

          params.push(
            food.food_name,
            foodTypeId,
            food.basis_qty,
            food.basis_unit,
            food.source,
            food.kcal,
            food.protein_g,
            food.fat_g,
            food.sat_fat_g,
            food.carbs_g,
            food.sugars_g,
            food.fibre_g,
            food.salt_g,
          );
        });

        const query = `INSERT INTO foods (
          name, food_type_id, basis_qty, basis_unit, source, kcal, protein_g,
          fat_g, sat_fat_g, carbs_g, sugars_g, fibre_g, salt_g
        ) VALUES ${valuesClauses.join(', ')} RETURNING id`;

        const result = await client.query(query, params);

        // Build mapping: RETURNING rows are in same order as input batch
        if (result.rows.length === batch.length) {
          for (let idx = 0; idx < batch.length; idx++) {
            oldFoodIdToNewId[batch[idx].food_id] = result.rows[idx].id;
          }
        }

        counts.foods += result.rowCount || 0;
      }

      // Get meal name→meal_id mapping
      const mealsResult = await client.query('SELECT id, name FROM meals ORDER BY sort_order');
      const mealNameToId: Record<string, number> = {};
      for (const meal of mealsResult.rows) {
        mealNameToId[meal.name] = meal.id;
      }

      // Batch insert default_menu_items using oldFoodIdToNewId mapping
      for (let i = 0; i < baseData.cardapio.length; i += BATCH_SIZE) {
        const batch = baseData.cardapio.slice(i, i + BATCH_SIZE);
        const valuesClauses: string[] = [];
        const params: unknown[] = [];

        for (let idx = 0; idx < batch.length; idx++) {
          const item = batch[idx];
          const cleanedMealName = stripMealPrefix(item.meal);
          const mealId = mealNameToId[cleanedMealName];
          const newFoodId = oldFoodIdToNewId[item.food_id];

          if (!mealId) {
            throw new Error(`No meal found for: ${cleanedMealName}`);
          }

          if (!newFoodId) {
            warnings.unmappedFoodIds.add(item.food_id);
            continue;
          }

          const paramOffset = idx * 4 + 1;
          valuesClauses.push(`($${paramOffset}, $${paramOffset + 1}, $${paramOffset + 2}, $${paramOffset + 3})`);

          params.push(userId, mealId, newFoodId, item.qty);
        }

        if (valuesClauses.length > 0) {
          const query = `INSERT INTO default_menu_items (user_id, meal_id, food_id, quantity)
            VALUES ${valuesClauses.join(', ')}`;

          const result = await client.query(query, params);
          counts.default_menu_items += result.rowCount || 0;
        }
      }

      // Batch insert log_entries using oldFoodIdToNewId mapping
      for (let i = 0; i < logData.entries.length; i += BATCH_SIZE) {
        const batch = logData.entries.slice(i, i + BATCH_SIZE);
        const valuesClauses: string[] = [];
        const params: unknown[] = [];

        for (let idx = 0; idx < batch.length; idx++) {
          const entry = batch[idx];
          const cleanedMealName = stripMealPrefix(entry.meal);
          const mealId = mealNameToId[cleanedMealName];
          const newFoodId = oldFoodIdToNewId[entry.food_id] || null;

          if (!mealId) {
            throw new Error(`No meal found for: ${cleanedMealName}`);
          }

          // Track unmapped food_ids: if oldFoodIdToNewId lookup fails, it's unmapped
          if (!newFoodId) {
            warnings.unmappedFoodIds.add(entry.food_id);
          }

          const logDate =
            (entry as unknown as Record<string, unknown>).log_date ||
            new Date().toISOString().split('T')[0];

          const paramOffset = idx * 15 + 1;
          valuesClauses.push(
            `($${paramOffset}, $${paramOffset + 1}, $${paramOffset + 2}, $${paramOffset + 3}, ` +
              `$${paramOffset + 4}, $${paramOffset + 5}, $${paramOffset + 6}, $${paramOffset + 7}, $${paramOffset + 8}, ` +
              `$${paramOffset + 9}, $${paramOffset + 10}, $${paramOffset + 11}, $${paramOffset + 12}, $${paramOffset + 13}, $${paramOffset + 14}, NOW())`,
          );

          params.push(
            userId,
            logDate,
            mealId,
            newFoodId,
            entry.food_name,
            entry.qty,
            entry.unit,
            entry.kcal,
            entry.protein_g,
            entry.fat_g,
            entry.sat_fat_g,
            entry.carbs_g,
            entry.sugars_g,
            entry.fibre_g,
            entry.salt_g,
          );
        }

        const query = `INSERT INTO log_entries (
          user_id, log_date, meal_id, food_id, food_name, quantity, unit,
          kcal, protein_g, fat_g, sat_fat_g, carbs_g, sugars_g, fibre_g, salt_g, created_at
        ) VALUES ${valuesClauses.join(', ')}`;

        const result = await client.query(query, params);
        counts.log_entries += result.rowCount || 0;
      }

      // Commit transaction
      await client.query('COMMIT');

      res.status(200).json({
        ok: true,
        message: 'Migration completed successfully',
        counts,
        warnings: {
          unmappedFoodIds: Array.from(warnings.unmappedFoodIds),
        },
      });
    } catch (error) {
      // Rollback transaction on any error
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Migration error:', errorMessage);
    res.status(500).json({
      ok: false,
      error: errorMessage,
    });
  } finally {
    // Always release the client connection
    await client.end();
  }
}
