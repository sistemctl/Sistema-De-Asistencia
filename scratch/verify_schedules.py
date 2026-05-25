import requests

BASE_URL = "http://localhost:8000/api"

def test_schedules():
    print("Iniciando pruebas de API de Horarios...")
    
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

    # 2. Crear un nuevo horario
    new_schedule = {
        "name": "Turno de Prueba L-M-V",
        "shift_type": "continuous",
        "work_start_time": "08:00",
        "work_end_time": "16:00",
        "work_days": "1,3,5" # Lunes, Miercoles, Viernes
    }
    response = requests.post(f"{BASE_URL}/schedules", json=new_schedule, headers=headers)
    if response.status_code != 201:
        print(f"Error al crear horario: {response.text}")
        return
    
    schedule_data = response.json()
    schedule_id = schedule_data["id"]
    print(f"Horario creado exitosamente con ID {schedule_id}: {schedule_data}")
    assert schedule_data["work_days"] == "1,3,5"

    # 3. Obtener el horario individualmente
    response = requests.get(f"{BASE_URL}/schedules/{schedule_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["work_days"] == "1,3,5"
    print("Lectura de horario exitosa.")

    # 4. Actualizar el horario (agregar sabado)
    update_data = {
        "work_days": "1,3,5,6"
    }
    response = requests.put(f"{BASE_URL}/schedules/{schedule_id}", json=update_data, headers=headers)
    assert response.status_code == 200
    assert response.json()["work_days"] == "1,3,5,6"
    print("Actualizacion de horario exitosa.")

    # 5. Eliminar el horario
    response = requests.delete(f"{BASE_URL}/schedules/{schedule_id}", headers=headers)
    assert response.status_code == 204
    print("Eliminacion de horario exitosa.")

    print("Todas las pruebas del CRUD de horarios pasaron con exito!")

if __name__ == "__main__":
    test_schedules()
