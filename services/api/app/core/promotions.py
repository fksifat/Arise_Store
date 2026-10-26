import json
from pydantic import ValidationError
from app.models.theme import ShopThemeSetting
from app.schemas.theme import PromotionSettings


def shop_promotion(db, shop_id):
    setting = db.query(ShopThemeSetting).filter(ShopThemeSetting.shop_id == shop_id).first()
    try:
        return PromotionSettings.model_validate(json.loads(setting.settings_json).get('promotion', {})) if setting else PromotionSettings()
    except (ValueError, TypeError, AttributeError, ValidationError):
        return PromotionSettings()


def promotion_discount(subtotal, promotion):
    # Round the product-subtotal discount to the nearest poisha, with halves rounded up.
    return (subtotal * promotion.discount_percent + 50) // 100 if promotion.enabled else 0
