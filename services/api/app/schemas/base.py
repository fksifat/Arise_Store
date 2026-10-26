from pydantic import BaseModel, model_validator, ConfigDict


class PatchModel(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    @model_validator(mode="after")
    def reject_required_nulls(self):
        required = {"name", "slug", "status", "price_minor", "stock_quantity", "track_inventory", "is_featured", "sort_order", "inside_dhaka_delivery_fee_minor", "outside_dhaka_delivery_fee_minor"}
        if any(field in required and getattr(self, field) is None for field in self.model_fields_set):
            raise ValueError("Required fields cannot be null")
        if "slug" in self.model_fields_set and not self.slug:
            raise ValueError("Slug cannot be empty")
        return self
