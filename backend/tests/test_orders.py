"""Тесты заказов."""
import uuid
from datetime import date, timedelta


class TestOrders:
    """POST /orders, GET /orders"""

    def _create_order(self, client, sample_product, headers):
        """Вспомогательный метод: добавить товар в корзину и оформить заказ."""
        client.post("/cart/items", json={
            "product_id": sample_product.id,
            "quantity": 2,
        }, headers=headers)

        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        res = client.post("/orders", json={
            "full_name": "Иванов Иван",
            "phone": "+79001234567",
            "delivery_address": "ул. Пушкина, д. 10",
            "delivery_date": tomorrow,
            "delivery_time": "10:00-12:00",
            "comment": "Позвонить за 30 мин",
        }, headers=headers)
        return res

    def test_create_order_guest(self, client, sample_product):
        sid = str(uuid.uuid4())
        headers = {"X-Session-ID": sid}
        res = self._create_order(client, sample_product, headers)
        assert res.status_code == 201
        data = res.json()
        assert data["status"] == "new"
        assert data["total_price"] == 400  # 200 * 2
        assert len(data["items"]) == 1

    def test_create_order_auth(self, client, auth_headers, sample_product):
        res = self._create_order(client, sample_product, auth_headers)
        assert res.status_code == 201

    def test_order_empty_cart(self, client):
        sid = str(uuid.uuid4())
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        res = client.post("/orders", json={
            "full_name": "Тест",
            "phone": "+79001234567",
            "delivery_address": "Адрес",
            "delivery_date": tomorrow,
            "delivery_time": "10:00-12:00",
        }, headers={"X-Session-ID": sid})
        assert res.status_code == 400
        assert "empty" in res.json()["detail"].lower()

    def test_list_orders_auth(self, client, auth_headers, sample_product):
        self._create_order(client, sample_product, auth_headers)
        res = client.get("/orders", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data["items"]) >= 1

    def test_order_price_fixed(self, client, sample_product):
        """Цена фиксируется при создании заказа (price_at_purchase)."""
        sid = str(uuid.uuid4())
        headers = {"X-Session-ID": sid}
        res = self._create_order(client, sample_product, headers)
        assert res.status_code == 201
        item = res.json()["items"][0]
        assert item["price_at_purchase"] == 200  # цена на момент покупки
