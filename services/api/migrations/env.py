from alembic import context
from app.config import settings
from app.database import Base
from app import models
from sqlalchemy import create_engine, pool

config = context.config
if context.is_offline_mode():
    context.configure(url=settings.DATABASE_URL, target_metadata=Base.metadata, literal_binds=True, render_as_batch=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    engine = create_engine(settings.DATABASE_URL, poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=Base.metadata, render_as_batch=connection.dialect.name == "sqlite", compare_type=True)
        with context.begin_transaction():
            context.run_migrations()
