import requests

BASE_URL = "http://localhost:8000/api"

def test_dashboard():
    print("Iniciando pruebas de API de Dashboard...")
    
    # 1. Obtener token de admin
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if response.status_code != 200:
        print(f"Error al iniciar sesion: {response.text}")
        return
        
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Autenticacion exitosa.")

    # 2. Consultar la curva de puntualidad
    response = requests.get(f"{BASE_URL}/dashboard/punctuality-curve", headers=headers)
    if response.status_code != 200:
        print(f"Error al obtener curva de puntualidad: {response.text}")
        return
    
    data = response.json()
    print(f"Respuesta de la curva de puntualidad: {data}")
    assert "labels" in data
    assert "counts" in data
    assert len(data["labels"]) == len(data["counts"])
    print("Estructura de la respuesta verificada exitosamente!")
    
    # 3. Consultar los demas endpoints para verificar estabilidad
    assert requests.get(f"{BASE_URL}/dashboard/kpis", headers=headers).status_code == 200
    assert requests.get(f"{BASE_URL}/dashboard/weekly", headers=headers).status_code == 200
    assert requests.get(f"{BASE_URL}/dashboard/recent-events", headers=headers).status_code == 200
    print("Estabilidad del dashboard verificada con exito.")

    print("Todas las pruebas del dashboard pasaron con exito!")

if __name__ == "__main__":
    test_dashboard()
