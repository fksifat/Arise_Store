from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.tenant import get_current_user
from app.database import get_db
from app.models.setup import SetupDraft
from app.models.theme import Theme
from app.models.user import User
from app.schemas.setup import SetupProgress

router = APIRouter(prefix='/setup', tags=['Website setup'])


@router.get('', response_model=SetupProgress | None)
def get_progress(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    draft = db.get(SetupDraft, user.id)
    return SetupProgress.model_validate_json(draft.data_json) if draft else None


@router.put('', response_model=SetupProgress)
def save_progress(progress: SetupProgress, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not db.query(Theme.id).filter(Theme.theme_key == progress.theme_key, Theme.website_type == progress.website_type, Theme.is_active == True).first():
        raise HTTPException(400, 'Choose an available theme for this website type')
    draft = db.get(SetupDraft, user.id)
    if draft:
        draft.data_json = progress.model_dump_json()
    else:
        db.add(SetupDraft(user_id=user.id, data_json=progress.model_dump_json()))
    db.commit()
    return progress
