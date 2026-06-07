"""
Клиент YandexGPT для извлечения фильтров букета из текста на естественном языке.

Пользователь пишет произвольное описание букета, модель возвращает строгий
JSON с типами цветов и цветами. Полученные значения валидируются по
известным справочникам (синхронным с фронтендом), мусор отсекается.
"""
import json
import logging
import re
from typing import List, Optional

import requests

from app.core.config import settings

logger = logging.getLogger(__name__)

YANDEX_GPT_URL = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion"
TIMEOUT_SECONDS = 15

KNOWN_TYPES = [
    "роза", "кустовая роза", "гортензия", "пион", "гербера",
    "тюльпан", "эустома", "диантус", "ранункулус",
    "хризантема", "кустовая хризантема", "гипсофила", "эвкалипт",
]

KNOWN_COLORS = [
    "белый", "розовый", "красный", "жёлтый",
    "оранжевый", "фиолетовый", "голубой", "зелёный",
]

# Маппинг русских поводов на коды в БД (поле Product.occasions)
OCCASION_MAP = {
    "свадьба": "wedding",
    "день рождения": "birthday",
    "годовщина": "anniversary",
    "без повода": "no_occasion",
}

OCCASION_LABELS = {
    "wedding": "Свадьба",
    "birthday": "День рождения",
    "anniversary": "Годовщина",
    "no_occasion": "Без повода",
}

SYSTEM_PROMPT = (
    "Ты — помощник флориста. Из текстового описания букета извлекай "
    "три категории фильтров: типы цветов, цвета и повод.\n\n"
    "Жёсткие правила:\n"
    f"1. Тип цветка выбирай ТОЛЬКО из списка: {', '.join(KNOWN_TYPES)}.\n"
    f"2. Цвет выбирай ТОЛЬКО из списка: {', '.join(KNOWN_COLORS)}.\n"
    f"3. Повод выбирай ТОЛЬКО из списка: {', '.join(OCCASION_MAP.keys())} (или null, если повод не упомянут).\n"
    "4. Если пользователь указал ассоциацию (например 'нежный' → розовый/белый, "
    "'яркий' → красный/жёлтый/оранжевый, 'весенний' → жёлтый/зелёный), переводи "
    "её в конкретные цвета из списка.\n"
    "5. 'Свадебный', 'на свадьбу', 'для невесты' → повод 'свадьба'. "
    "'На день рождения', 'на ДР', 'для подруги/мамы' → повод 'день рождения'. "
    "'На годовщину', 'жене на годовщину' → повод 'годовщина'. "
    "'Просто так', 'без повода', 'в подарок', 'на подарок', 'подарочный' → повод 'без повода'.\n"
    "6. ГЛАВНОЕ ПРАВИЛО: извлекай ТОЛЬКО то, что пользователь явно упомянул. "
    "Не додумывай, не подсказывай, не помогай. Выбор за человеком.\n"
    "7. ТИП ЦВЕТКА в types — извлекай ВСЕ упомянутые типы, даже если их несколько в одном запросе. "
    "Не останавливайся на первом найденном типе. Извлекай если назван явно ('роза/розы', "
    "'тюльпан/тюльпаны', 'пион/пионы', 'гербера', 'хризантема', 'гортензия', 'ранункулус', "
    "'эустома', 'диантус', 'гипсофила', 'эвкалипт' и т.п.).\n"
    "   ⚠️ ПРАВИЛО СЕМЕЙСТВ: если пользователь сказал просто 'роза/розы' БЕЗ слова 'кустовая' — "
    "добавляй ОБА типа: 'роза' И 'кустовая роза'. Аналогично 'хризантема/хризантемы' БЕЗ слова "
    "'кустовая' → 'хризантема' И 'кустовая хризантема'. Если пользователь явно сказал 'кустовая роза' "
    "или 'кустовая хризантема' — добавляй ТОЛЬКО кустовую. Если 'обычная роза' / 'не кустовая' — "
    "только 'роза'.\n"
    "   ⚠️ СПЕЦИАЛЬНОЕ ПРАВИЛО про 'зелень': слова 'зелень', 'зеленью', 'с зеленью', "
    "'зелёные веточки' — это НЕ цвет, это декоративные растения. Маппь в types: ['эвкалипт', 'гипсофила']. "
    "В colors зелёный НЕ добавляй. Пример: 'нежный букет роз с зеленью' → "
    "types=['роза', 'эвкалипт', 'гипсофила'], colors=['розовый', 'белый']. БЕЗ зелёного цвета.\n"
    "   Если ни одного типа нет — types = [].\n"
    "8. ЦВЕТ в colors — только если назван явно ('розовый', 'красный', 'белый' и т.д.) "
    "ИЛИ если пользователь использовал ассоциацию-настроение ('нежный' → розовый+белый, "
    "'яркий' → красный+жёлтый+оранжевый, 'весенний' → жёлтый+оранжевый, 'тёмный' → фиолетовый). "
    "Слово 'зелёный' добавляй в colors ТОЛЬКО если пользователь говорит про окраску цветка "
    "('зелёные хризантемы', 'цветок зелёного цвета'). Если речь про 'зелень/зеленью' как "
    "про декоративные растения — в colors зелёный НЕ добавляй (это идёт в types).\n"
    "   Иначе colors = [].\n"
    "9. ПОВОД в occasion — СТРОГО одно из 4 значений ниже или null. Ставь ТОЛЬКО при ЯВНОМ "
    "упоминании конкретного события/праздника:\n"
    "    - 'свадьба' — если есть слово 'свадьб*' или 'невест*' ('свадебный букет', 'на свадьбу')\n"
    "    - 'день рождения' — если есть 'день рождения', 'ДР', 'днюх*', 'днюшка', 'на бёрздей'\n"
    "    - 'годовщина' — если есть 'годовщин*', 'юбилей' (брака/отношений)\n"
    "    - 'без повода' — если ЯВНО написано 'без повода', 'без особого повода'\n"
    "    ⚠️ ВАЖНО: получатель букета НЕ определяет повод. Слова 'для мамы', 'для жены', 'для мужа', "
    "'для подруги', 'для друга', 'жене', 'маме', 'подруге' — НЕ маппятся ни в один occasion. "
    "Маме можно подарить букет на 8 марта, на день рождения, на годовщину или просто так — "
    "ты не знаешь повод, если он не назван. Поэтому если в запросе указан только получатель "
    "без события — оставляй occasion = null.\n"
    "10. ⚠️ КРИТИЧЕСКИ ВАЖНО про слово 'подарок': оно НЕ является поводом и НЕ маппится в occasion. "
    "Слова 'подарок', 'в подарок', 'на подарок', 'подарочный', 'просто так' — это occasion = null. "
    "НО! Слово 'подарок' в запросе не отменяет ОСТАЛЬНЫЕ слова — ассоциации цветов, типы цветов "
    "и другие осмысленные части запроса нужно обрабатывать как обычно по правилам 7-8.\n"
    "11. understood=true ставь если есть ХОТЬ ОДИН непустой фильтр (types, colors, occasion). "
    "understood=false — только если ВСЕ три фильтра пусты И запрос совсем не про букеты "
    "('привет', 'как дела').\n"
    "12. Не выдумывай значения, которых нет в списках.\n"
    "13. Отвечай СТРОГО одним JSON-объектом, без пояснений и markdown. ПРИМЕРЫ:\n"
    '    "букет в подарок" → {"types": [], "colors": [], "occasion": null, "understood": true}\n'
    '    "яркий букет в подарок" → {"types": [], "colors": ["красный", "жёлтый", "оранжевый"], "occasion": null, "understood": true}\n'
    '    "нежный букет в подарок" → {"types": [], "colors": ["розовый", "белый"], "occasion": null, "understood": true}\n'
    '    "красные розы в подарок" → {"types": ["роза", "кустовая роза"], "colors": ["красный"], "occasion": null, "understood": true}\n'
    '    "нежный букет роз" → {"types": ["роза", "кустовая роза"], "colors": ["розовый", "белый"], "occasion": null, "understood": true}\n'
    '    "нежный букет роз с зеленью" → {"types": ["роза", "кустовая роза", "эвкалипт", "гипсофила"], "colors": ["розовый", "белый"], "occasion": null, "understood": true}\n'
    '    "букет с кустовыми розами" → {"types": ["кустовая роза"], "colors": [], "occasion": null, "understood": true}\n'
    '    "букет с хризантемами" → {"types": ["хризантема", "кустовая хризантема"], "colors": [], "occasion": null, "understood": true}\n'
    '    "белые хризантемы" → {"types": ["хризантема", "кустовая хризантема"], "colors": ["белый"], "occasion": null, "understood": true}\n'
    '    "букет с зеленью" → {"types": ["эвкалипт", "гипсофила"], "colors": [], "occasion": null, "understood": true}\n'
    '    "яркий букет с зеленью" → {"types": ["эвкалипт", "гипсофила"], "colors": ["красный", "жёлтый", "оранжевый"], "occasion": null, "understood": true}\n'
    '    "букет с пионами и тюльпанами" → {"types": ["пион", "тюльпан"], "colors": [], "occasion": null, "understood": true}\n'
    '    "зелёные хризантемы" → {"types": ["хризантема"], "colors": ["зелёный"], "occasion": null, "understood": true}\n'
    '    "белые тюльпаны" → {"types": ["тюльпан"], "colors": ["белый"], "occasion": null, "understood": true}\n'
    '    "пионы для мамы" → {"types": ["пион"], "colors": [], "occasion": null, "understood": true}\n'
    '    "красные тона для жены" → {"types": [], "colors": ["красный"], "occasion": null, "understood": true}\n'
    '    "хочу какой-нибудь необычный яркий букет для подруги" → {"types": [], "colors": ["красный", "жёлтый", "оранжевый"], "occasion": null, "understood": true}\n'
    '    "что-нибудь необычное для мамы" → {"types": [], "colors": [], "occasion": null, "understood": false}\n'
    '    "красивый букет жене" → {"types": [], "colors": [], "occasion": null, "understood": false}\n'
    '    "букет для подруги с пионами" → {"types": ["пион"], "colors": [], "occasion": null, "understood": true}\n'
    '    "свадебный букет" → {"types": [], "colors": [], "occasion": "свадьба", "understood": true}\n'
    '    "букет на день рождения подруги" → {"types": [], "colors": [], "occasion": "день рождения", "understood": true}\n'
    '    "яркий букет на день рождения" → {"types": [], "colors": ["красный", "жёлтый", "оранжевый"], "occasion": "день рождения", "understood": true}\n'
    '    "букет жене на годовщину" → {"types": [], "colors": [], "occasion": "годовщина", "understood": true}\n'
)


class YandexGPTError(Exception):
    """Ошибка при обращении к YandexGPT."""


def _call_model(user_query: str) -> str:
    if not settings.YANDEX_API_KEY or not settings.YANDEX_FOLDER_ID:
        raise YandexGPTError("YANDEX_API_KEY или YANDEX_FOLDER_ID не настроены")

    headers = {
        "Authorization": f"Api-Key {settings.YANDEX_API_KEY}",
        "Content-Type": "application/json",
    }
    body = {
        "modelUri": f"gpt://{settings.YANDEX_FOLDER_ID}/{settings.YANDEX_GPT_MODEL}",
        "completionOptions": {
            "temperature": 0.1,
            "maxTokens": 200,
        },
        "messages": [
            {"role": "system", "text": SYSTEM_PROMPT},
            {"role": "user", "text": user_query},
        ],
    }

    try:
        resp = requests.post(YANDEX_GPT_URL, headers=headers, json=body, timeout=TIMEOUT_SECONDS)
    except requests.RequestException as e:
        logger.warning("YandexGPT network error: %s", e)
        raise YandexGPTError("Не удалось связаться с YandexGPT") from e

    if resp.status_code != 200:
        logger.warning("YandexGPT HTTP %s: %s", resp.status_code, resp.text[:300])
        raise YandexGPTError(f"YandexGPT вернул HTTP {resp.status_code}")

    try:
        return resp.json()["result"]["alternatives"][0]["message"]["text"]
    except (KeyError, IndexError, ValueError) as e:
        raise YandexGPTError("Неожиданный формат ответа YandexGPT") from e


def _parse_json_block(text: str) -> dict:
    # Модель иногда оборачивает JSON в ```json ... ```
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise YandexGPTError("В ответе модели нет JSON")
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError as e:
        raise YandexGPTError("Невалидный JSON в ответе модели") from e


def _filter_known(values: List[str], allowed: List[str]) -> List[str]:
    if not isinstance(values, list):
        return []
    allowed_set = {v.lower() for v in allowed}
    seen = set()
    result = []
    for v in values:
        if not isinstance(v, str):
            continue
        normalized = v.strip().lower()
        if normalized in allowed_set and normalized not in seen:
            seen.add(normalized)
            result.append(normalized)
    return result


def _normalize_occasion(value) -> Optional[str]:
    if not isinstance(value, str):
        return None
    normalized = value.strip().lower()
    if not normalized or normalized in {"null", "none", "нет"}:
        return None
    # Поддерживаем и русский ввод, и сразу англ. код (на случай если модель вернёт 'wedding')
    if normalized in OCCASION_MAP:
        return OCCASION_MAP[normalized]
    if normalized in OCCASION_LABELS:
        return normalized
    return None


def extract_filters(query: str) -> dict:
    """Извлекает {types, colors, occasion, understood, message} из произвольного текста."""
    raw = _call_model(query)
    parsed = _parse_json_block(raw)

    types = _filter_known(parsed.get("types", []), KNOWN_TYPES)
    colors = _filter_known(parsed.get("colors", []), KNOWN_COLORS)
    occasion = _normalize_occasion(parsed.get("occasion"))

    any_filter = bool(types or colors or occasion)
    understood = bool(parsed.get("understood", True)) and any_filter

    message: Optional[str] = None
    if not understood:
        message = "Не удалось распознать пожелания. Попробуйте описать букет иначе или выберите фильтры вручную."

    return {
        "types": types,
        "colors": colors,
        "occasion": occasion,
        "occasion_label": OCCASION_LABELS.get(occasion) if occasion else None,
        "understood": bool(understood),
        "message": message,
    }
