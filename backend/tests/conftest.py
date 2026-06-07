"""
Фикстуры для тестирования FloralMatch API.

Использует отдельную БД floralmatch_test, чтобы не трогать основную.
Каждый тест-сессия: создаёт таблицы → прогоняет тесты → удаляет таблицы.
"""
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from starlette.testclient import TestClient

# Добавляем backend/ и корень в sys.path
ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from app.db.database import Base
from app.db.deps import get_db

TEST_DATABASE_URL = "postgresql://localhost:5432/floralmatch_test"

engine_test = create_engine(TEST_DATABASE_URL)
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Создаёт все таблицы перед тестами и удаляет после."""
    # Импортируем все модели чтобы Base.metadata знал о них
    import app.models.user       # noqa
    import app.models.product    # noqa
    import app.models.cart       # noqa
    import app.models.order      # noqa
    import app.models.favorite   # noqa
    import app.models.bouquet_template  # noqa

    Base.metadata.create_all(bind=engine_test)
    yield
    Base.metadata.drop_all(bind=engine_test)


@pytest.fixture()
def db():
    """Сессия БД для одного теста — откатывается после теста."""
    connection = engine_test.connect()
    transaction = connection.begin()
    session = TestSession(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db):
    """HTTP-клиент FastAPI с подменённой БД."""
    from main import app

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def test_user(client):
    """Создаёт тестового пользователя и возвращает данные + токен."""
    user_data = {
        "email": "test@example.com",
        "password": "test123456",
        "full_name": "Тест Тестов",
        "phone": "+79001234567",
    }
    res = client.post("/auth/register", json=user_data)
    assert res.status_code == 201

    # Логин
    login_res = client.post("/auth/login", data={
        "username": user_data["email"],
        "password": user_data["password"],
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    return {**user_data, "token": token, "id": res.json()["id"]}


@pytest.fixture()
def auth_headers(test_user):
    """Заголовки авторизации."""
    return {"Authorization": f"Bearer {test_user['token']}"}


@pytest.fixture()
def sample_product(db):
    """Создаёт тестовый цветок в БД."""
    from app.models.product import Product
    product = Product(
        name="Роза тестовая",
        price=200,
        product_type="flower",
        flower_type="роза",
        flower_color="красный",
        occasions=["no_occasion"],
        size="medium",
        in_stock=True,
    )
    db.add(product)
    db.flush()
    return product


@pytest.fixture()
def sample_bouquet(db):
    """Создаёт тестовый букет в БД."""
    from app.models.product import Product
    product = Product(
        name="Букет тестовый",
        price=2000,
        product_type="bouquet",
        flower_type=None,
        flower_color=None,
        composition=[
            {"flower_type": "роза", "flower_color": "красный"},
            {"flower_type": "гербера", "flower_color": "белый"},
        ],
        sizes={
            "small": {"price": 1500, "quantities": [3, 2]},
            "medium": {"price": 2000, "quantities": [5, 3]},
            "large": {"price": 3000, "quantities": [7, 5]},
        },
        occasions=["birthday"],
        size="medium",
        in_stock=True,
    )
    db.add(product)
    db.flush()
    return product
