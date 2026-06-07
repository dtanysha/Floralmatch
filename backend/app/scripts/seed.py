"""
Seed-скрипт: создаёт админа, цветы, букеты и упаковки из CSV-датасетов.

Запуск: PYTHONPATH=backend python3 -m app.scripts.seed (из корня)
"""
import csv
import re
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from sqlalchemy import text

from app.core.security import hash_password
from app.db.database import SessionLocal
from app.models.user import User
from app.models.product import Product


PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DATASETS_DIR = PROJECT_ROOT / "datasets"

# Цены цветов по типу (для расчёта цены букета)
FLOWER_TYPE_PRICES = {}  # заполняется из flowers_dataset.csv

# Рекомендации по уходу за цветами (по типу)
CARE_TIPS = {
    "роза": "Подрежьте стебли под углом 45 градусов, меняйте воду каждые 2 дня. Избегайте прямых солнечных лучей и сквозняков.",
    "кустовая роза": "Подрежьте стебли под углом 45 градусов, меняйте воду каждые 2 дня. Избегайте прямых солнечных лучей и сквозняков.",
    "гортензия": "Гортензия любит обильный полив. Опрыскивайте соцветия водой, подрезайте стебли и меняйте воду ежедневно.",
    "пион": "Поставьте в прохладное место, подрезайте стебли каждые 2 дня. Пионы раскрываются постепенно — наберитесь терпения.",
    "гербера": "Ставьте в неглубокую воду (5-7 см), стебли герберы склонны к загниванию. Меняйте воду ежедневно.",
    "тюльпан": "Тюльпаны продолжают расти в вазе. Ставьте в холодную воду, подрезайте стебли ровно (не под углом).",
    "эустома": "Удаляйте увядшие бутоны — оставшиеся раскроются. Меняйте воду каждые 2 дня, подрезайте стебли.",
    "диантус": "Неприхотливый цветок. Меняйте воду раз в 2-3 дня, избегайте соседства с фруктами (этилен ускоряет увядание).",
    "ранункулус": "Поставьте в прохладное место, в неглубокую воду. Подрезайте стебли каждые 2 дня. Не опрыскивайте бутоны.",
    "хризантема": "Обламывайте (не срезайте) кончики стеблей. Меняйте воду каждые 2-3 дня. Хризантемы стоят до 3 недель.",
    "кустовая хризантема": "Обламывайте (не срезайте) кончики стеблей. Меняйте воду каждые 2-3 дня. Хризантемы стоят до 3 недель.",
    "эвкалипт": "Эвкалипт — стойкая зелень, может стоять до месяца. Меняйте воду раз в 3-4 дня.",
    "гипсофила": "Гипсофила красиво высыхает и может использоваться как сухоцвет. В вазе стоит 1-2 недели.",
}

BOUQUET_ASSEMBLY_FEE = 200  # наценка за сборку букета


def parse_bouquet_filename(filename):
    """
    Парсит имя файла букета для извлечения состава с цветами.
    Пример: 'букет28-гортензия(розовый)роза(красный).png'
    Возвращает список: [{"flower_type": "гортензия", "flower_color": "розовый"}, ...]
    """
    filename = unicodedata.normalize('NFC', filename)
    name = filename.replace('.png', '').replace('.jpg', '').strip()

    # Нормализуем опечатки
    name = name.replace('оранжквый', 'оранжевый')
    name = name.replace('гипсофил(', 'гипсофила(')
    name = name.replace('эустона', 'эустома')

    parts = re.findall(r'([а-яё]+(?: [а-яё]+)?)(?:\(([а-яё-]+)\))?', name, re.IGNORECASE)

    composition = []
    for flower_type, flower_color in parts:
        flower_type = flower_type.strip().lower()
        flower_color = flower_color.strip().lower() if flower_color else None

        if flower_type.startswith('букет'):
            continue

        if flower_color == 'нежно-розовый':
            flower_color = 'розовый'

        # Нормализация: желтый → жёлтый, зеленый → зелёный
        if flower_color == 'желтый':
            flower_color = 'жёлтый'
        if flower_color == 'зеленый':
            flower_color = 'зелёный'

        if flower_type == 'эвкалипт' and not flower_color:
            flower_color = 'зелёный'

        composition.append({
            "flower_type": flower_type,
            "flower_color": flower_color or "белый",
        })

    return composition

# Маппинг повода из CSV на английский
OCCASION_MAP = {
    "годовщина": "anniversary",
    "свадьба": "wedding",
    "день_рождения": "birthday",
    "без_повода": "no_occasion",
}


def make_care_tips(flower_types):
    """Собирает рекомендации по уходу из типов цветов."""
    tips = []
    seen = set()
    for ft in flower_types:
        ft_lower = ft.lower()
        if ft_lower not in seen and ft_lower in CARE_TIPS:
            tips.append(CARE_TIPS[ft_lower])
            seen.add(ft_lower)
    return " ".join(tips) if tips else None


def seed_admin(db):
    admin = db.query(User).filter(User.email == "admin@floralmatch.com").first()
    if admin:
        print("Admin already exists, skipping.")
        return
    admin = User(
        email="admin@floralmatch.com",
        hashed_password=hash_password("admin123"),
        full_name="Администратор",
        phone="+79001234567",
        is_admin=True,
    )
    db.add(admin)
    db.commit()
    print("Admin created: admin@floralmatch.com / admin123")


def clear_old_products(db):
    """Удаляет старые товары и все связанные данные (FK-безопасно)."""
    db.execute(text("DELETE FROM order_items"))
    db.execute(text("DELETE FROM orders"))
    db.execute(text("DELETE FROM favorites"))
    db.execute(text("DELETE FROM cart_items"))
    db.execute(text("DELETE FROM bouquet_template_items"))
    db.execute(text("DELETE FROM bouquet_templates"))
    db.execute(text("DELETE FROM products"))
    db.commit()
    print("Cleared old products and related data.")


def seed_flowers(db):
    """Создаёт цветы из flowers_dataset.csv."""
    csv_path = DATASETS_DIR / "flowers_dataset.csv"
    if not csv_path.exists():
        print(f"flowers_dataset.csv not found at {csv_path}, skipping.")
        return

    created = 0
    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row["название"]
            flower_type = row["тип_цветка"]
            color = row["цвет"]
            price = int(row["цена_руб"])
            image_url = row["изображение"] or None
            in_stock = row["в_наличии"].strip().lower() == "да"

            # Запоминаем цену для расчёта букетов
            FLOWER_TYPE_PRICES[flower_type] = price

            product = Product(
                name=name,
                description=None,
                price=price,
                image_url=image_url,
                product_type="flower",
                flower_type=flower_type,
                flower_color=color,
                composition=None,
                occasions=["no_occasion"],
                size="medium",
                in_stock=in_stock,
            )
            db.add(product)
            created += 1

    db.commit()
    print(f"Created {created} flowers from CSV")


def parse_quantities(qty_str):
    """Парсит строку количеств: '3, 1, 3' → [3, 1, 3] или '7' → [7]."""
    parts = qty_str.strip().strip('"').split(",")
    return [int(p.strip()) for p in parts if p.strip()]


def seed_bouquets(db):
    """Создаёт букеты из bouquets_dataset.csv."""
    csv_path = DATASETS_DIR / "bouquets_dataset.csv"
    if not csv_path.exists():
        print(f"bouquets_dataset.csv not found at {csv_path}, skipping.")
        return

    created = 0
    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row["название"]
            image_url = row["изображение"]
            in_stock = row["в_наличии"].strip().lower() == "да"

            # Состав: "Гортензия, Роза" → список типов
            flower_types = [t.strip() for t in row["состав"].split(",")]

            # Повод
            occasion_ru = row["повод"].strip()
            occasion = OCCASION_MAP.get(occasion_ru, "no_occasion")

            # Количества для каждого размера
            small_qty = parse_quantities(row["мал"])
            medium_qty = parse_quantities(row["сред"])
            large_qty = parse_quantities(row["бол"])

            # Composition из имени файла (с правильными цветами)
            composition = parse_bouquet_filename(image_url.split("/")[-1]) if image_url else []
            # Фоллбэк: если парсер не справился, берём типы из CSV
            if not composition:
                composition = [{"flower_type": ft.lower(), "flower_color": "белый"} for ft in flower_types]

            # Цена за средний размер: сумма (цена_цветка × количество) + сборка
            medium_price = 0
            for i, ft in enumerate(flower_types):
                ft_lower = ft.lower()
                flower_price = FLOWER_TYPE_PRICES.get(ft_lower, 200)
                qty = medium_qty[i] if i < len(medium_qty) else 1
                medium_price += flower_price * qty
            medium_price += BOUQUET_ASSEMBLY_FEE

            # Цена за маленький и большой
            small_price = 0
            for i, ft in enumerate(flower_types):
                ft_lower = ft.lower()
                flower_price = FLOWER_TYPE_PRICES.get(ft_lower, 200)
                qty = small_qty[i] if i < len(small_qty) else 1
                small_price += flower_price * qty
            small_price += BOUQUET_ASSEMBLY_FEE

            large_price = 0
            for i, ft in enumerate(flower_types):
                ft_lower = ft.lower()
                flower_price = FLOWER_TYPE_PRICES.get(ft_lower, 200)
                qty = large_qty[i] if i < len(large_qty) else 1
                large_price += flower_price * qty
            large_price += BOUQUET_ASSEMBLY_FEE

            sizes = {
                "small": {"price": small_price, "quantities": small_qty},
                "medium": {"price": medium_price, "quantities": medium_qty},
                "large": {"price": large_price, "quantities": large_qty},
            }

            # Описание
            description = ", ".join(ft.capitalize() for ft in flower_types)

            # Рекомендации по уходу
            care_tips = make_care_tips(flower_types)

            product = Product(
                name=name,
                description=description,
                price=medium_price,
                image_url=image_url,
                product_type="bouquet",
                flower_type=None,
                flower_color=None,
                composition=composition,
                sizes=sizes,
                care_tips=care_tips,
                occasions=[occasion],
                size="medium",
                in_stock=in_stock,
            )
            db.add(product)
            created += 1

    db.commit()
    print(f"Created {created} bouquets from CSV")


def seed_wrappings(db):
    """Создаёт товары-упаковки для визуального конструктора."""
    wrappings = [
        {"name": "Упаковка розовая", "color": "розовый", "image": "/constructor/wrap-pink.png"},
        {"name": "Упаковка белая", "color": "белый", "image": "/constructor/wrap-white.png"},
        {"name": "Упаковка крафт", "color": "коричневый", "image": "/constructor/wrap-kraft.png"},
        {"name": "Упаковка голубая", "color": "голубой", "image": "/constructor/wrap-blue.png"},
        {"name": "Упаковка жёлтая", "color": "жёлтый", "image": "/constructor/wrap-yellow.png"},
        {"name": "Упаковка оранжевая", "color": "оранжевый", "image": "/constructor/wrap-orange.png"},
        {"name": "Упаковка красная", "color": "красный", "image": "/constructor/wrap-red.png"},
        {"name": "Упаковка фиолетовая", "color": "фиолетовый", "image": "/constructor/wrap-purple.png"},
        {"name": "Упаковка чёрная", "color": "чёрный", "image": "/constructor/wrap-black.png"},
        {"name": "Упаковка зелёная", "color": "зелёный", "image": "/constructor/wrap-green.png"},
    ]
    created = 0
    for w in wrappings:
        product = Product(
            name=w["name"],
            description="Упаковка для букета",
            price=200,
            image_url=w["image"],
            product_type="wrapping",
            flower_type=None,
            flower_color=w["color"],
            composition=None,
            occasions=None,
            size=None,
            in_stock=True,
        )
        db.add(product)
        created += 1
    db.commit()
    print(f"Created {created} wrappings")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_admin(db)
        clear_old_products(db)
        seed_flowers(db)
        seed_bouquets(db)
        seed_wrappings(db)
    finally:
        db.close()
