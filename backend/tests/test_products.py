"""Тесты каталога товаров."""


class TestProducts:
    """GET /products"""

    def test_list_products(self, client, sample_product):
        res = client.get("/products")
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert data["total"] >= 1

    def test_filter_by_type(self, client, sample_product, sample_bouquet):
        res = client.get("/products", params={"product_type": "flower"})
        assert res.status_code == 200
        for item in res.json()["items"]:
            assert item["product_type"] == "flower"

    def test_filter_by_color(self, client, sample_product):
        res = client.get("/products", params={"flower_color": "красный"})
        assert res.status_code == 200
        for item in res.json()["items"]:
            assert item["flower_color"] == "красный"

    def test_get_product_by_id(self, client, sample_product):
        res = client.get(f"/products/{sample_product.id}")
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "Роза тестовая"
        assert data["flower_color"] == "красный"

    def test_get_product_not_found(self, client):
        res = client.get("/products/999999")
        assert res.status_code == 404

    def test_bouquet_has_sizes(self, client, sample_bouquet):
        res = client.get(f"/products/{sample_bouquet.id}")
        assert res.status_code == 200
        data = res.json()
        assert data["sizes"] is not None
        assert "small" in data["sizes"]
        assert "medium" in data["sizes"]
        assert "large" in data["sizes"]

    def test_pagination(self, client, sample_product):
        res = client.get("/products", params={"page": 1, "per_page": 1})
        assert res.status_code == 200
        data = res.json()
        assert data["per_page"] == 1
        assert len(data["items"]) <= 1
