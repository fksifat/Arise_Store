from pydantic import BaseModel, ConfigDict, Field
from app.schemas.page import WebsiteType


class SetupProgress(BaseModel):
    model_config = ConfigDict(extra='forbid')

    step: int = Field(1, ge=1, le=4)
    website_type: WebsiteType = 'business'
    name: str = Field('', max_length=100)
    slug: str = Field('', max_length=50)
    theme_key: str = Field('business-studio', max_length=100)
