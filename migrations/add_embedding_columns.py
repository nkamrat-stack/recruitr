"""
Migration: Add embedding columns to candidate_profiles and jobs tables
Date: 2025-10-29
Description: Adds profile_embedding to candidate_profiles and job_embedding to jobs
"""
import sqlite3
import os

def run_migration():
    db_path = "recruitr.db"
    
    if not os.path.exists(db_path):
        print(f"Error: Database file {db_path} not found!")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("Starting migration: Adding embedding columns...")
        
        # Check if profile_embedding column exists in candidate_profiles
        cursor.execute("PRAGMA table_info(candidate_profiles)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'profile_embedding' not in columns:
            print("Adding profile_embedding column to candidate_profiles table...")
            cursor.execute("""
                ALTER TABLE candidate_profiles 
                ADD COLUMN profile_embedding TEXT
            """)
            print("✓ Successfully added profile_embedding column")
        else:
            print("ℹ profile_embedding column already exists in candidate_profiles")
        
        # Check if job_embedding column exists in jobs
        cursor.execute("PRAGMA table_info(jobs)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'job_embedding' not in columns:
            print("Adding job_embedding column to jobs table...")
            cursor.execute("""
                ALTER TABLE jobs 
                ADD COLUMN job_embedding TEXT
            """)
            print("✓ Successfully added job_embedding column")
        else:
            print("ℹ job_embedding column already exists in jobs")
        
        # Commit the changes
        conn.commit()
        print("\n✅ Migration completed successfully!")
        print("   - candidate_profiles.profile_embedding: ready for JSON-encoded embeddings")
        print("   - jobs.job_embedding: ready for JSON-encoded embeddings")
        
        # Verify the changes
        print("\nVerifying changes...")
        cursor.execute("PRAGMA table_info(candidate_profiles)")
        profile_cols = cursor.fetchall()
        cursor.execute("PRAGMA table_info(jobs)")
        job_cols = cursor.fetchall()
        
        print(f"  candidate_profiles now has {len(profile_cols)} columns")
        print(f"  jobs now has {len(job_cols)} columns")
        
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        return False
        
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    success = run_migration()
    exit(0 if success else 1)
