"""Тесты регистрации и авторизации."""


class TestRegister:
    """POST /auth/register"""

    def test_register_success(self, client):
        res = client.post("/auth/register", json={
            "email": "new@example.com",
            "password": "secure123",
            "full_name": "Мария Иванова",
            "phone": "+79001112233",
        })
        assert res.status_code == 201
        data = res.json()
        assert data["email"] == "new@example.com"
        assert data["full_name"] == "Мария Иванова"
        assert "hashed_password" not in data  # пароль не утекает

    def test_register_duplicate_email(self, client, test_user):
        res = client.post("/auth/register", json={
            "email": test_user["email"],
            "password": "another123",
            "full_name": "Дубликат",
            "phone": "+79009999999",
        })
        assert res.status_code == 400
        assert "already registered" in res.json()["detail"]

    def test_register_short_password(self, client):
        res = client.post("/auth/register", json={
            "email": "short@example.com",
            "password": "123",
            "full_name": "Тест",
            "phone": "+79001234567",
        })
        assert res.status_code == 422  # validation error

    def test_register_invalid_email(self, client):
        res = client.post("/auth/register", json={
            "email": "not-an-email",
            "password": "secure123",
            "full_name": "Тест",
            "phone": "+79001234567",
        })
        assert res.status_code == 422

    def test_register_missing_name(self, client):
        res = client.post("/auth/register", json={
            "email": "noname@example.com",
            "password": "secure123",
            "phone": "+79001234567",
        })
        assert res.status_code == 422

    def test_register_invalid_phone(self, client):
        res = client.post("/auth/register", json={
            "email": "badphone@example.com",
            "password": "secure123",
            "full_name": "Тест",
            "phone": "abc",
        })
        assert res.status_code == 422


class TestLogin:
    """POST /auth/login"""

    def test_login_success(self, client, test_user):
        res = client.post("/auth/login", data={
            "username": test_user["email"],
            "password": test_user["password"],
        })
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, test_user):
        res = client.post("/auth/login", data={
            "username": test_user["email"],
            "password": "wrongpassword",
        })
        assert res.status_code == 401

    def test_login_nonexistent_user(self, client):
        res = client.post("/auth/login", data={
            "username": "ghost@example.com",
            "password": "whatever",
        })
        assert res.status_code == 401
