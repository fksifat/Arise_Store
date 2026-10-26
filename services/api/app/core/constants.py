RESERVED_SLUGS = {
    "admin",
    "api",
    "auth",
    "dashboard",
    "login",
    "logout",
    "register",
    "signup",
    "signin",
    "settings",
    "billing",
    "pricing",
    "support",
    "help",
    "terms",
    "privacy",
    "status",
    "health",
    "static",
    "media",
    "public",
    "cdn",
    "mail",
    "smtp",
    "portal",
    "store",
    "shops",
    "checkout",
    "cart",
    "order",
    "orders",
    "themes",
    "platform",
    "root",
    "system",
    "sysadmin"
}

ORDER_STATUSES = [
    "pending",
    "confirmed",
    "processing",
    "ready_to_ship",
    "shipped",
    "delivered",
    "cancelled",
    "returned",
    "refunded"
]

ORDER_TRANSITIONS = {
    "pending": ["confirmed", "cancelled"],
    "confirmed": ["processing", "cancelled"],
    "processing": ["ready_to_ship", "cancelled"],
    "ready_to_ship": ["shipped", "cancelled"],
    "shipped": ["delivered", "returned"],
    "delivered": ["returned"],
    "returned": ["refunded"],
    "cancelled": [],
    "refunded": [],
}

PAYMENT_METHODS = ["cod", "bkash", "nagad", "card"]
PAYMENT_STATUSES = ["unpaid", "pending", "paid", "refunded", "failed"]

SUBSCRIPTION_STATUSES = ["trial", "active", "past_due", "suspended", "cancelled", "expired"]

