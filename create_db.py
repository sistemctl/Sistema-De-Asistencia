import psycopg

try:
    conn = psycopg.connect(
        host="localhost", port=5432,
        user="postgres", password="Colombia26*+",
        dbname="postgres",
        autocommit=True
    )
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname='asistencia'")
    if not cur.fetchone():
        cur.execute("CREATE DATABASE asistencia")
        print("✅ Base de datos 'asistencia' creada")
    else:
        print("✅ Base de datos 'asistencia' ya existe")
    conn.close()
except Exception as e:
    print(f"❌ Error: {e}")
