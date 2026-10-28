import re
from datetime import datetime
from typing import Literal
from urllib.parse import urlsplit
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

WebsiteType = Literal['business', 'portfolio', 'blog', 'landing_page', 'online_store', 'agency', 'other']


def safe_url(value, image=False):
    if not value:
        return ''
    if re.search(r'[\x00-\x20\x7f\\]', value):
        raise ValueError('URLs cannot contain spaces, control characters or backslashes')
    if value.startswith('/') and not value.startswith('//'):
        return value
    if value.startswith('#') and not image:
        return value
    parsed = urlsplit(value)
    if parsed.scheme in ('http', 'https') and parsed.hostname and not parsed.username and not parsed.password:
        return value
    if not image and parsed.scheme in ('mailto', 'tel') and parsed.path:
        return value
    raise ValueError('Use an http/https URL or a path beginning with one slash')


class ContentItem(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    heading: str = Field('', max_length=120)
    body: str = Field('', max_length=2000)
    image_url: str = Field('', max_length=2048)
    image_alt: str = Field('', max_length=200)
    button_text: str = Field('', max_length=60)
    button_url: str = Field('', max_length=2048)
    _image = field_validator('image_url')(lambda value: safe_url(value, image=True))
    _link = field_validator('button_url')(lambda value: safe_url(value))


class PageSection(ContentItem):
    id: str = Field(..., min_length=1, max_length=64, pattern=r'^[A-Za-z][A-Za-z0-9_-]*$')
    type: Literal['hero', 'text', 'features', 'gallery', 'faq', 'contact', 'cta', 'posts', 'testimonials']
    enabled: bool = Field(True, strict=True)
    eyebrow: str = Field('', max_length=80)
    anchor: str = Field('', max_length=64, pattern=r'^(?:[A-Za-z][A-Za-z0-9_-]*)?$')
    layout: Literal['default', 'center', 'image_left'] = 'default'
    spacing: Literal['default', 'compact', 'relaxed'] = 'default'
    tone: Literal['default', 'soft', 'accent'] = 'default'
    heading: str = Field('', max_length=160)
    body: str = Field('', max_length=12000)
    items: list[ContentItem] = Field(default_factory=list, max_length=12)


class PageContent(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    title: str = Field(..., min_length=1, max_length=160)
    slug: str = Field(..., min_length=1, max_length=80, pattern=r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
    description: str = Field('', max_length=300)
    sections: list[PageSection] = Field(default_factory=list, max_length=30)

    @field_validator('slug')
    @classmethod
    def reserved_slug(cls, value):
        if value in ('blog', 'preview', 'api', 'admin', 'login', 'register'):
            raise ValueError('Choose a different page URL')
        return value

    @model_validator(mode='after')
    def unique_sections(self):
        if len({section.id for section in self.sections}) != len(self.sections):
            raise ValueError('Each section needs a unique ID')
        anchors = [section.anchor or section.id for section in self.sections]
        if len(set(anchors)) != len(anchors) or 'website-main' in anchors:
            raise ValueError('Each section needs a unique anchor; website-main is reserved')
        return self


class PageCreate(PageContent):
    kind: Literal['page', 'post'] = 'page'


class PageSave(PageContent):
    expected_revision: int = Field(..., ge=1, strict=True)


class PageRevision(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expected_revision: int = Field(..., ge=1, strict=True)


class PageSummary(BaseModel):
    id: str
    kind: str
    title: str
    slug: str
    description: str
    revision: int
    published_slug: str | None
    published_at: datetime | None
    updated_at: datetime
    has_unpublished_changes: bool


class PageResponse(PageSummary):
    sections: list[PageSection]
