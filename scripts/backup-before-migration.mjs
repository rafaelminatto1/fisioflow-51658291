import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

// Carregar variáveis de ambiente explicitamente
import { config } from 'dotenv';
config({ path: '.env' });

const { Client } = pg;
const sql = new Client();

async function backupSchema() {
  console.log('🔄 Fazendo backup do schema...');

  let client;
  try {
    // Criar conexão
    const connectionString = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_DIRECT_URL ou DATABASE_URL não configurado');
    }

    console.log(`🔗 Conectando ao banco...`);
    client = new Client({ connectionString });
    await client.connect();
    console.log(`✅ Conexão estabelecida`);

    // Backup de todas as tabelas
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tables = tablesResult.rows;
    console.log(`📊 ${tables.length} tabelas encontradas`);

    if (tables.length === 0) {
      console.log('⚠️  Nenhuma tabela encontrada no schema public');
      return null;
    }

    // Criar diretório de backup
    const backupPath = './drizzle/backup';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `schema-backup-${timestamp}.sql`;
    const filepath = path.join(backupPath, filename);

    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
      console.log(`📁 Diretório criado: ${backupPath}`);
    }

    // Backup de schema completo
    const columnsResult = await client.query(`
      SELECT
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    const columns = columnsResult.rows;

    // Backup de índices
    const indexesResult = await client.query(`
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);

    const indexes = indexesResult.rows;

    // Backup de foreign keys
    const fksResult = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, ccu.table_name
    `);

    const fks = fksResult.rows;

    // Gerar arquivo SQL de backup
    let backupContent = `-- ========================================\n`;
    backupContent += `-- Backup do Schema - FisioFlow\n`;
    backupContent += `-- Timestamp: ${new Date().toISOString()}\n`;
    backupContent += `-- Tabelas: ${tables.map(t => t.table_name).join(', ')}\n`;
    backupContent += `-- ========================================\n\n\n`;

    // Adicionar tabelas e colunas
    backupContent += `-- ========================================\n`;
    backupContent += `-- TABELAS E COLUNAS\n`;
    backupContent += `-- ========================================\n\n`;

    tables.forEach(table => {
      backupContent += `-- Tabela: ${table.table_name}\n`;

      const tableColumns = columns.filter(c => c.table_name === table.table_name);
      tableColumns.forEach(col => {
        let colDef = `  ${col.column_name} ${col.data_type}`;

        if (col.character_maximum_length) {
          colDef += `(${col.character_maximum_length})`;
        } else if (col.numeric_precision) {
          if (col.numeric_scale) {
            colDef += `(${col.numeric_precision},${col.numeric_scale})`;
          } else {
            colDef += `(${col.numeric_precision})`;
          }
        }

        if (col.is_nullable === 'NO') {
          colDef += ' NOT NULL';
        }

        if (col.column_default) {
          colDef += ` DEFAULT ${col.column_default}`;
        }

        backupContent += `${colDef},\n`;
      });

      backupContent += `\n`;
    });

    // Adicionar índices
    backupContent += `\n-- ========================================\n`;
    backupContent += `-- ÍNDICES\n`;
    backupContent += `-- ========================================\n\n`;

    indexes.forEach(idx => {
      backupContent += `-- Índice: ${idx.indexname} na tabela ${idx.tablename}\n`;
      backupContent += `${idx.indexdef};\n\n`;
    });

    // Adicionar foreign keys
    backupContent += `\n-- ========================================\n`;
    backupContent += `-- FOREIGN KEYS\n`;
    backupContent += `-- ========================================\n\n`;

    const processedFKs = new Set();
    fks.forEach(fk => {
      const fkKey = `${fk.table_name}=>${fk.foreign_table_name}`;
      if (!processedFKs.has(fkKey)) {
        processedFKs.add(fkKey);
        const tableFKs = fks.filter(f => f.table_name === fk.table_name && f.foreign_table_name === fk.foreign_table_name);
        const fkColumns = tableFKs.map(f => f.column_name).join(', ');
        const fkRefColumns = tableFKs.map(f => f.foreign_column_name).join(', ');

        backupContent += `-- FK: ${fk.table_name} -> ${fk.foreign_table_name}\n`;
        backupContent += `ALTER TABLE ${fk.table_name} ADD CONSTRAINT fk_${fk.table_name}_${fk.foreign_table_name} FOREIGN KEY (${fkColumns}) REFERENCES ${fk.foreign_table_name}(${fkRefColumns});\n\n`;
      }
    });

    // Salvar backup
    fs.writeFileSync(filepath, backupContent);
    console.log(`✅ Backup salvo em: ${filepath}`);
    console.log(`📦 Tamanho: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);

    return filepath;
  } catch (error) {
    console.error('❌ Erro ao fazer backup:', error.message);
    throw error;
  } finally {
    if (client) {
      await client.end();
      console.log('✅ Conexão fechada');
    }
  }
}

backupSchema()
  .then(() => {
    console.log('✨ Backup completado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Backup falhou:', error);
    process.exit(1);
  });
