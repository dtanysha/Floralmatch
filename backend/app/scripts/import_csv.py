"""
Импорт данных из CSV в БД.

Читает flowers_dataset.csv и bouquets_dataset.csv из папки datasets/,
обновляет или создаёт товары в БД.

Запуск: PYTHONPATH=backend python3 -m app.scripts.import_csv
"""
import csv
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from sqlalchemy import text
from app.db.database import SessionLocal
from app.models.product import Product
from app.scripts.seed import FLOWER_TYPE_PRICES, BOUQUET_ASSEMBLY_FEE, CARE_TIPS

DATASETS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "datasets"

OCCASION_MAP = {
    "свадьба": "wedding",
    "день_рождения": "birthday",
    "годовщина": "anniversary",
    "без_повода": "no_occasion",
}

COLOR_NORMALIZE = {
    "желтый": "жёлтый",
    "зеленый": "зелёный",
    "оранжквый": "оранжевый",
}


def normalize_color(color):
    """Нормализует цвет: е→ё, исправляет опечатки."""
    return COLOR_NORMALIZE.get(color.lower(), color.lower())


def clear_products(db):
    db.execute(text("DELETE FROM order_items"))
    db.execute(text("DELETE FROM orders"))
    db.execute(text("DELETE FROM favorites"))
    db.execute(text("DELETE FROM cart_items"))
    db.execute(text("DELETE FROM bouquet_template_items"))
    db.execute(text("DELETE FROM bouquet_templates"))
    db.execute(text("DELETE FROM products"))
    db.commit()
    print("Очищены старые товары.")


def import_flowers(db):
    csv_path = DATASETS_DIR / "flowers_dataset.csv"
    if not csv_path.exists():
        print(f"Файл {csv_path} не найден, пропускаю цветы.")
        return 0

    created = 0
    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            product = Product(
                name=row["название"],
                description=None,
                price=float(row["цена_руб"]),
                image_url=row["изображение"] or None,
                product_type="flower",
                flower_type=row["тип_цветка"],
                flower_color=normalize_color(row["цвет"]),
                composition=None,
                occasions=["no_occasion"],
                size="medium",
                in_stock=row["в_наличии"].strip().lower() == "да",
            )
            db.add(product)
            created += 1

    db.commit()
    print(f"Импортировано цветов: {created}")
    return created


def parse_quantities(qty_str):
    """Парсит строку количеств '1, 3, 2' → [1, 3, 2]."""
    if not qty_str or not qty_str.strip():
        return None
    try:
        return [int(x.strip()) for x in qty_str.split(",")]
    except ValueError:
        return None


def calc_size_price(flower_types, quantities):
    """Считает цену: сумма(тип * кол-во) + сборка."""
    total = 0
    for ft, qty in zip(flower_types, quantities):
        price_per = FLOWER_TYPE_PRICES.get(ft.lower(), 200)
        total += price_per * qty
    return total + BOUQUET_ASSEMBLY_FEE


def make_care_tips_from_types(flower_types):
    """Собирает рекомендации по уходу из типов цветов."""
    tips = []
    seen = set()
    for ft in flower_types:
        ft_lower = ft.strip().lower()
        if ft_lower not in seen and ft_lower in CARE_TIPS:
            tips.append(CARE_TIPS[ft_lower])
            seen.add(ft_lower)
    return " ".join(tips) if tips else None


def parse_colors_from_image(image_url):
    """Парсит цвета из названия файла: букет28-гортензия(розовый)роза(красный).png"""
    if not image_url:
        return {}
    filename = image_url.split("/")[-1].rsplit(".", 1)[0]  # убираем путь и расширение
    # Ищем все пары: тип(цвет)
    matches = re.findall(r'([а-яё\s]+?)\(([а-яё]+)\)', filename, re.IGNORECASE)
    # Строим словарь: тип -> [цвет1, цвет2, ...]
    colors = {}
    for flower, color in matches:
        ft = flower.strip().lower()
        # Убираем номер букета из первого типа (например "букет28-гортензия" -> "гортензия")
        if "-" in ft:
            ft = ft.split("-", 1)[-1].strip()
        if ft not in colors:
            colors[ft] = []
        nc = normalize_color(color)
        if nc not in colors[ft]:
            colors[ft].append(nc)
    return colors


def import_bouquets(db):
    csv_path = DATASETS_DIR / "bouquets_dataset.csv"
    if not csv_path.exists():
        print(f"Файл {csv_path} не найден, пропускаю букеты.")
        return 0

    created = 0
    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            occasion = OCCASION_MAP.get(row["повод"].strip(), "no_occasion")

            # Парсим цвета из названия файла
            image_colors = parse_colors_from_image(row.get("изображение", ""))

            # Парсим состав
            flower_types = []
            composition = []
            if row["состав"]:
                for flower_type in row["состав"].split(", "):
                    ft = flower_type.strip()
                    flower_types.append(ft)
                    # Берём цвет из названия файла, если есть
                    colors = image_colors.get(ft.lower(), ["белый"])
                    for color in colors:
                        composition.append({
                            "flower_type": ft.lower(),
                            "flower_color": color,
                        })

            # Парсим количества для размеров
            qty_small = parse_quantities(row.get("мал", ""))
            qty_medium = parse_quantities(row.get("сред", ""))
            qty_large = parse_quantities(row.get("бол", ""))

            sizes = None
            default_price = sum(FLOWER_TYPE_PRICES.get(ft.lower(), 200) for ft in flower_types) + BOUQUET_ASSEMBLY_FEE

            if qty_small or qty_medium or qty_large:
                sizes = {}
                if qty_small and len(qty_small) == len(flower_types):
                    sizes["small"] = {
                        "quantities": qty_small,
                        "price": calc_size_price(flower_types, qty_small),
                    }
                if qty_medium and len(qty_medium) == len(flower_types):
                    sizes["medium"] = {
                        "quantities": qty_medium,
                        "price": calc_size_price(flower_types, qty_medium),
                    }
                if qty_large and len(qty_large) == len(flower_types):
                    sizes["large"] = {
                        "quantities": qty_large,
                        "price": calc_size_price(flower_types, qty_large),
                    }

            # Цена по умолчанию — средний размер, или если нет размеров — базовая
            if sizes and "medium" in sizes:
                price = sizes["medium"]["price"]
            elif sizes and "small" in sizes:
                price = sizes["small"]["price"]
            else:
                price = default_price

            care_tips = make_care_tips_from_types(flower_types)

            product = Product(
                name=row["название"],
                description=row["состав"],
                price=price,
                image_url=row["изображение"] or None,
                product_type="bouquet",
                flower_type=None,
                flower_color=None,
                composition=composition if composition else None,
                sizes=sizes,
                care_tips=care_tips,
                occasions=[occasion],
                size="medium",
                in_stock=row["в_наличии"].strip().lower() == "да",
            )
            db.add(product)
            created += 1

    db.commit()
    print(f"Импортировано букетов: {created}")
    return created


if __name__ == "__main__":
    db = SessionLocal()
    try:
        clear_products(db)
        import_flowers(db)
        import_bouquets(db)
        print("Импорт завершён.")
    finally:
        db.close()
