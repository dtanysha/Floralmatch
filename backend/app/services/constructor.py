"""
Сервис конструктора букетов.

Вспомогательные функции для подбора цветов
и расчёта стоимости букета по заданным параметрам.
"""
from typing import List, Optional

from sqlalchemy.orm import Session


SIZE_MAP = {
    "small": 5,
    "medium": 9,
    "large": 15,
}


def generate_suggestions(
    db: Session,
    occasion: str,
    flower_color: str,
    favorite_type: str,
    size: str,
    budget: Optional[float] = None,
) -> List[dict]:
    """Генерация предложений букетов по параметрам пользователя."""
    return []
