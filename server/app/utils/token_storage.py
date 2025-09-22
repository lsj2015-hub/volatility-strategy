"""
Token storage utility for persistent token management
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any

import structlog

logger = structlog.get_logger(__name__)


class TokenStorage:
    """토큰 영구 저장소"""

    def __init__(self, storage_dir: str = "data/tokens"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.token_file = self.storage_dir / "kis_token.json"

    def save_token(self, token_data: Dict[str, Any]):
        """토큰 데이터 저장"""
        try:
            # 데이터 복사본 생성 (원본 수정 방지)
            data_to_save = token_data.copy()

            # datetime 객체를 문자열로 변환
            for key, value in data_to_save.items():
                if isinstance(value, datetime):
                    data_to_save[key] = value.isoformat()

            with open(self.token_file, "w", encoding="utf-8") as f:
                json.dump(data_to_save, f, indent=2, ensure_ascii=False)

            logger.info(f"Token saved to {self.token_file}")

        except Exception as e:
            logger.error(f"Failed to save token: {str(e)}")

    def load_token(self) -> Optional[Dict[str, Any]]:
        """토큰 데이터 로드"""
        try:
            if not self.token_file.exists():
                logger.info("No stored token found")
                return None

            with open(self.token_file, "r", encoding="utf-8") as f:
                token_data = json.load(f)

            # 문자열을 datetime 객체로 변환
            if "token_expires_at" in token_data:
                token_data["token_expires_at"] = datetime.fromisoformat(token_data["token_expires_at"])

            logger.info("Token loaded from storage")
            return token_data

        except Exception as e:
            logger.error(f"Failed to load token: {str(e)}")
            return None

    def is_token_valid(self, token_data: Optional[Dict[str, Any]]) -> bool:
        """토큰 유효성 검사"""
        if not token_data:
            return False

        if "access_token" not in token_data or "token_expires_at" not in token_data:
            return False

        # 5분 여유를 두고 만료 시간 검사
        expires_at = token_data["token_expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)

        from datetime import timedelta
        is_valid = datetime.now() < expires_at - timedelta(minutes=5)

        logger.info(f"Token validity check: {is_valid}, expires at: {expires_at}")
        return is_valid

    def clear_token(self):
        """저장된 토큰 삭제"""
        try:
            if self.token_file.exists():
                os.remove(self.token_file)
                logger.info("Stored token cleared")
        except Exception as e:
            logger.error(f"Failed to clear token: {str(e)}")


# 전역 인스턴스
token_storage = TokenStorage()