from backend.database import SessionLocal
from sqlalchemy import text

def run_migration():
    db = SessionLocal()
    try:
        print("Starting migration for Positions...")
        
        # 1. Create positions table
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS positions (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                description VARCHAR(255),
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
            );
        """))
        print("✓ Table 'positions' checked/created.")
        
        # 2. Check if employees.position is still a text column or already renamed
        # Let's inspect the columns of the employees table
        result = db.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'employees';
        """))
        columns = {row[0]: row[1] for row in result.fetchall()}
        
        # 3. Add position_id if it doesn't exist
        if 'position_id' not in columns:
            db.execute(text("ALTER TABLE employees ADD COLUMN position_id INTEGER REFERENCES positions(id);"))
            print("✓ Added column 'position_id' to 'employees'.")
        else:
            print("✓ Column 'position_id' already exists in 'employees'.")
            
        # 4. Migrate old position text to new positions table if old position column exists
        if 'position' in columns and columns['position'] != 'integer':
            # Rename position to position_legacy first to make room for relationship
            # But let's first fetch all unique non-null position string values
            pos_result = db.execute(text("SELECT DISTINCT position FROM employees WHERE position IS NOT NULL AND position <> '';"))
            old_positions = [row[0] for row in pos_result.fetchall()]
            
            for pos_name in old_positions:
                # Insert position if not exists
                db.execute(
                    text("INSERT INTO positions (name) VALUES (:name) ON CONFLICT (name) DO NOTHING;"),
                    {"name": pos_name}
                )
            
            # Associate employees with positions
            db.execute(text("""
                UPDATE employees e
                SET position_id = p.id
                FROM positions p
                WHERE e.position = p.name;
            """))
            print(f"✓ Migrated {len(old_positions)} unique positions and updated employees table.")
            
            # Rename column position to position_legacy
            db.execute(text("ALTER TABLE employees RENAME COLUMN position TO position_legacy;"))
            print("✓ Renamed old 'position' column to 'position_legacy'.")
        
        db.commit()
        print("Migration completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"❌ Migration failed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
