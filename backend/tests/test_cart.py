"""Тесты корзины."""
import uuid


class TestGuestCart:
    """Корзина гостя (по session_id)."""

    def test_add_item_guest(self, client, sample_product):
        sid = str(uuid.uuid4())
        res = client.post("/cart/items", json={
            "product_id": sample_product.id,
            "quantity": 3,
        }, headers={"X-Session-ID": sid})
        assert res.status_code == 200

    def test_get_cart_guest(self, client, sample_product):
        sid = str(uuid.uuid4())
        # Добавить
        client.post("/cart/items", json={
            "product_id": sample_product.id,
            "quantity": 2,
        }, headers={"X-Session-ID": sid})
        # Прочитать
        res = client.get("/cart", headers={"X-Session-ID": sid})
        assert res.status_code == 200
        data = res.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["quantity"] == 2

    def test_update_quantity(self, client, sample_product):
        sid = str(uuid.uuid4())
        add_res = client.post("/cart/items", json={
            "product_id": sample_product.id,
            "quantity": 1,
        }, headers={"X-Session-ID": sid})
        item_id = add_res.json()["items"][0]["id"]

        res = client.put(f"/cart/items/{item_id}", json={
            "quantity": 5,
        }, headers={"X-Session-ID": sid})
        assert res.status_code == 200

        cart = client.get("/cart", headers={"X-Session-ID": sid}).json()
        assert cart["items"][0]["quantity"] == 5

    def test_remove_item(self, client, sample_product):
        sid = str(uuid.uuid4())
        add_res = client.post("/cart/items", json={
            "product_id": sample_product.id,
            "quantity": 1,
        }, headers={"X-Session-ID": sid})
        item_id = add_res.json()["items"][0]["id"]

        res = client.delete(f"/cart/items/{item_id}", headers={"X-Session-ID": sid})
        assert res.status_code == 200

        cart = client.get("/cart", headers={"X-Session-ID": sid}).json()
        assert len(cart["items"]) == 0


class TestAuthCart:
    """Корзина авторизованного пользователя."""

    def test_add_item_auth(self, client, auth_headers, sample_product):
        res = client.post("/cart/items", json={
            "product_id": sample_product.id,
            "quantity": 1,
        }, headers=auth_headers)
        assert res.status_code == 200

    def test_cart_persists_for_user(self, client, auth_headers, sample_product):
        client.post("/cart/items", json={
            "product_id": sample_product.id,
            "quantity": 3,
        }, headers=auth_headers)

        res = client.get("/cart", headers=auth_headers)
        assert res.status_code == 200
        assert len(res.json()["items"]) >= 1
