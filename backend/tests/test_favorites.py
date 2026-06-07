"""Тесты избранного."""


class TestFavorites:
    """GET/POST/DELETE /favorites"""

    def test_add_favorite(self, client, auth_headers, sample_product):
        res = client.post(f"/favorites/{sample_product.id}", headers=auth_headers)
        assert res.status_code in (200, 201)

    def test_list_favorites(self, client, auth_headers, sample_product):
        client.post(f"/favorites/{sample_product.id}", headers=auth_headers)
        res = client.get("/favorites", headers=auth_headers)
        assert res.status_code == 200
        ids = [f["product_id"] for f in res.json()["items"]]
        assert sample_product.id in ids

    def test_remove_favorite(self, client, auth_headers, sample_product):
        client.post(f"/favorites/{sample_product.id}", headers=auth_headers)
        res = client.delete(f"/favorites/{sample_product.id}", headers=auth_headers)
        assert res.status_code == 204

        fav_list = client.get("/favorites", headers=auth_headers).json()
        ids = [f["product_id"] for f in fav_list["items"]]
        assert sample_product.id not in ids

    def test_favorites_require_auth(self, client, sample_product):
        res = client.get("/favorites")
        assert res.status_code == 401
