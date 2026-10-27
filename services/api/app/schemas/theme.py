from typing import Optional, Any, Dict
from datetime import datetime
from pydantic import ConfigDict, BaseModel, Field, field_validator
from urllib.parse import urlsplit
from app.schemas.page import WebsiteType


class BannerContent(BaseModel):
    eyebrow: str = Field('', max_length=80)
    title: str = Field('', max_length=160)
    subtitle: str = Field('', max_length=500)
    button_text: str = Field('', max_length=60)
    image_alt: str = Field('', max_length=160)


class PromotionSettings(BaseModel):
    enabled: bool = Field(False, strict=True)
    message: str = Field('', max_length=160)
    discount_percent: int = Field(0, ge=0, le=100, strict=True)


class StorefrontContentUpdate(BaseModel):
    banner_url: Optional[str] = Field(None, max_length=2048)
    hero: BannerContent
    promotion: PromotionSettings

    @field_validator('banner_url')
    @classmethod
    def valid_banner_url(cls, value):
        if not value:
            return None
        parsed = urlsplit(value)
        if parsed.scheme not in ('http', 'https') or not parsed.hostname or parsed.username or parsed.password:
            raise ValueError('Use an http or https banner image URL')
        return value

class ThemeResponse(BaseModel):
    id: str
    theme_key: str
    website_type: WebsiteType
    name: str
    version: str
    description: Optional[str]
    preview_image_url: Optional[str]
    configuration_schema: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

class ShopThemeSettingUpdate(BaseModel):
    theme_key: Optional[str] = None
    settings_json: Dict[str, Any]

    @field_validator('settings_json')
    @classmethod
    def validate_storefront_fields(cls, value):
        if 'hero' in value:
            BannerContent.model_validate(value['hero'])
        if 'promotion' in value:
            PromotionSettings.model_validate(value['promotion'])
        return value

class ShopThemeSettingResponse(BaseModel):
    shop_id: str
    theme_id: str
    theme_key: str
    theme_name: str
    theme_version: str
    settings: Dict[str, Any]
    updated_at: datetime

