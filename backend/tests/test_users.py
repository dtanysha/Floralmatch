"""Тесты профиля пользователя."""


class TestUserProfile:
    """GET/PUT /users/me"""

    def test_get_profile(self, client, auth_headers, test_user):
        res = client.get("/users/me", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["email"] == test_user["email"]
        assert data["full_name"] == test_user["full_name"]

    def test_update_profile(self, client, auth_headers):
        res = client.put("/users/me", json={
            "full_name": "Новое Имя",
            "phone": "+79009876543",
        }, headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["full_name"] == "Новое Имя"

    def test_change_password(self, client, auth_headers, test_user):
        res = client.put("/users/me", json={
            "password": "newpassword123",
        }, headers=auth_headers)
        assert res.status_code == 200

        # Логин со старым паролем не работает
        old_login = client.post("/auth/login", data={
            "username": test_user["email"],
            "password": test_user["password"],
        })
        assert old_login.status_code == 401

        # Логин с новым паролем работает
        new_login = client.post("/auth/login", data={
            "username": test_user["email"],
            "password": "newpassword123",
        })
        assert new_login.status_code == 200

    def test_profile_requires_auth(self, client):
        res = client.get("/users/me")
        assert res.status_code == 401
