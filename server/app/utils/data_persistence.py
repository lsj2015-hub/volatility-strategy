"""
Data Persistence Utility
데이터 영속성 관리 - JSON 파일 기반 데이터 저장 및 복원
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List, Union
from datetime import datetime, date
import shutil
import asyncio
from dataclasses import is_dataclass, asdict

logger = logging.getLogger(__name__)

class JSONEncoder(json.JSONEncoder):
    """커스텀 JSON 인코더 - datetime, date 객체 처리"""

    def default(self, obj):
        if isinstance(obj, datetime):
            return {"__datetime__": obj.isoformat()}
        elif isinstance(obj, date):
            return {"__date__": obj.isoformat()}
        elif is_dataclass(obj):
            return asdict(obj)
        return super().default(obj)

def json_decode_hook(dct):
    """JSON 디코드 훅 - datetime, date 객체 복원"""

    if "__datetime__" in dct:
        return datetime.fromisoformat(dct["__datetime__"])
    elif "__date__" in dct:
        return date.fromisoformat(dct["__date__"])
    return dct

class DataPersistence:
    """데이터 영속성 관리자"""

    def __init__(self, base_dir: str = "data"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

        # 디렉토리 구조 생성
        self.subdirs = {
            "config": self.base_dir / "config",
            "sessions": self.base_dir / "sessions",
            "portfolios": self.base_dir / "portfolios",
            "analytics": self.base_dir / "analytics",
            "cache": self.base_dir / "cache",
            "logs": self.base_dir / "logs",
            "backups": self.base_dir / "backups",
            "tokens": self.base_dir / "tokens"
        }

        for subdir in self.subdirs.values():
            subdir.mkdir(parents=True, exist_ok=True)

        logger.info(f"Data persistence initialized: {self.base_dir}")

    async def save_data(
        self,
        category: str,
        key: str,
        data: Any,
        create_backup: bool = True
    ) -> bool:
        """데이터 저장"""

        try:
            if category not in self.subdirs:
                logger.error(f"Invalid category: {category}")
                return False

            file_path = self.subdirs[category] / f"{key}.json"

            # 백업 생성
            if create_backup and file_path.exists():
                await self._create_backup(file_path)

            # 데이터 저장
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, cls=JSONEncoder, ensure_ascii=False, indent=2)

            logger.debug(f"Data saved: {category}/{key}")
            return True

        except Exception as e:
            logger.error(f"Failed to save data {category}/{key}: {e}")
            return False

    async def load_data(
        self,
        category: str,
        key: str,
        default: Any = None
    ) -> Any:
        """데이터 로드"""

        try:
            if category not in self.subdirs:
                logger.error(f"Invalid category: {category}")
                return default

            file_path = self.subdirs[category] / f"{key}.json"

            if not file_path.exists():
                logger.debug(f"Data file not found: {category}/{key}")
                return default

            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f, object_hook=json_decode_hook)

            logger.debug(f"Data loaded: {category}/{key}")
            return data

        except Exception as e:
            logger.error(f"Failed to load data {category}/{key}: {e}")
            return default

    async def delete_data(self, category: str, key: str) -> bool:
        """데이터 삭제"""

        try:
            if category not in self.subdirs:
                logger.error(f"Invalid category: {category}")
                return False

            file_path = self.subdirs[category] / f"{key}.json"

            if file_path.exists():
                # 백업 생성 후 삭제
                await self._create_backup(file_path)
                file_path.unlink()
                logger.info(f"Data deleted: {category}/{key}")
                return True
            else:
                logger.warning(f"Data file not found for deletion: {category}/{key}")
                return False

        except Exception as e:
            logger.error(f"Failed to delete data {category}/{key}: {e}")
            return False

    async def list_keys(self, category: str) -> List[str]:
        """카테고리 내 키 목록 조회"""

        try:
            if category not in self.subdirs:
                logger.error(f"Invalid category: {category}")
                return []

            category_dir = self.subdirs[category]
            keys = []

            for file_path in category_dir.glob("*.json"):
                keys.append(file_path.stem)

            return sorted(keys)

        except Exception as e:
            logger.error(f"Failed to list keys for category {category}: {e}")
            return []

    async def data_exists(self, category: str, key: str) -> bool:
        """데이터 존재 여부 확인"""

        if category not in self.subdirs:
            return False

        file_path = self.subdirs[category] / f"{key}.json"
        return file_path.exists()

    async def get_data_info(self, category: str, key: str) -> Optional[Dict[str, Any]]:
        """데이터 정보 조회 (크기, 수정 시간 등)"""

        try:
            if category not in self.subdirs:
                return None

            file_path = self.subdirs[category] / f"{key}.json"

            if not file_path.exists():
                return None

            stat = file_path.stat()

            return {
                "path": str(file_path),
                "size": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime),
                "created": datetime.fromtimestamp(stat.st_ctime)
            }

        except Exception as e:
            logger.error(f"Failed to get data info {category}/{key}: {e}")
            return None

    async def cleanup_old_data(self, category: str, days_old: int = 30) -> int:
        """오래된 데이터 정리"""

        try:
            if category not in self.subdirs:
                logger.error(f"Invalid category: {category}")
                return 0

            category_dir = self.subdirs[category]
            cutoff_time = datetime.now().timestamp() - (days_old * 24 * 60 * 60)

            cleaned_count = 0

            for file_path in category_dir.glob("*.json"):
                if file_path.stat().st_mtime < cutoff_time:
                    # 백업 생성 후 삭제
                    await self._create_backup(file_path)
                    file_path.unlink()
                    cleaned_count += 1

            logger.info(f"Cleaned up {cleaned_count} old files from {category}")
            return cleaned_count

        except Exception as e:
            logger.error(f"Failed to cleanup old data in {category}: {e}")
            return 0

    async def backup_category(self, category: str) -> bool:
        """카테고리 전체 백업"""

        try:
            if category not in self.subdirs:
                logger.error(f"Invalid category: {category}")
                return False

            category_dir = self.subdirs[category]
            backup_dir = self.subdirs["backups"] / category / datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_dir.mkdir(parents=True, exist_ok=True)

            # 모든 JSON 파일 복사
            copied_count = 0
            for file_path in category_dir.glob("*.json"):
                shutil.copy2(file_path, backup_dir / file_path.name)
                copied_count += 1

            logger.info(f"Backed up {copied_count} files from {category} to {backup_dir}")
            return True

        except Exception as e:
            logger.error(f"Failed to backup category {category}: {e}")
            return False

    async def restore_from_backup(self, category: str, backup_timestamp: str) -> bool:
        """백업에서 복원"""

        try:
            if category not in self.subdirs:
                logger.error(f"Invalid category: {category}")
                return False

            backup_dir = self.subdirs["backups"] / category / backup_timestamp

            if not backup_dir.exists():
                logger.error(f"Backup not found: {backup_dir}")
                return False

            category_dir = self.subdirs[category]

            # 현재 데이터 백업
            await self.backup_category(category)

            # 백업에서 복원
            restored_count = 0
            for backup_file in backup_dir.glob("*.json"):
                shutil.copy2(backup_file, category_dir / backup_file.name)
                restored_count += 1

            logger.info(f"Restored {restored_count} files to {category} from backup {backup_timestamp}")
            return True

        except Exception as e:
            logger.error(f"Failed to restore from backup {category}/{backup_timestamp}: {e}")
            return False

    async def list_backups(self, category: str) -> List[Dict[str, Any]]:
        """백업 목록 조회"""

        try:
            backup_category_dir = self.subdirs["backups"] / category

            if not backup_category_dir.exists():
                return []

            backups = []
            for backup_dir in backup_category_dir.iterdir():
                if backup_dir.is_dir():
                    file_count = len(list(backup_dir.glob("*.json")))
                    stat = backup_dir.stat()

                    backups.append({
                        "timestamp": backup_dir.name,
                        "path": str(backup_dir),
                        "file_count": file_count,
                        "created": datetime.fromtimestamp(stat.st_ctime),
                        "size": sum(f.stat().st_size for f in backup_dir.glob("*.json"))
                    })

            # 최신 순 정렬
            backups.sort(key=lambda x: x["created"], reverse=True)
            return backups

        except Exception as e:
            logger.error(f"Failed to list backups for {category}: {e}")
            return []

    async def get_storage_usage(self) -> Dict[str, Dict[str, Any]]:
        """저장소 사용량 조회"""

        usage = {}

        try:
            for category, dir_path in self.subdirs.items():
                if not dir_path.exists():
                    continue

                file_count = 0
                total_size = 0

                for file_path in dir_path.rglob("*.json"):
                    file_count += 1
                    total_size += file_path.stat().st_size

                usage[category] = {
                    "file_count": file_count,
                    "total_size": total_size,
                    "size_mb": round(total_size / (1024 * 1024), 2),
                    "path": str(dir_path)
                }

        except Exception as e:
            logger.error(f"Failed to calculate storage usage: {e}")

        return usage

    async def _create_backup(self, file_path: Path):
        """개별 파일 백업 생성"""

        try:
            if not file_path.exists():
                return

            # 백업 디렉토리 결정
            relative_path = file_path.relative_to(self.base_dir)
            backup_dir = self.subdirs["backups"] / "auto" / datetime.now().strftime("%Y%m%d")
            backup_dir.mkdir(parents=True, exist_ok=True)

            # 백업 파일명 (타임스탬프 포함)
            timestamp = datetime.now().strftime("%H%M%S")
            backup_filename = f"{file_path.stem}_{timestamp}.json"
            backup_path = backup_dir / backup_filename

            # 백업 생성
            shutil.copy2(file_path, backup_path)

            logger.debug(f"Backup created: {backup_path}")

        except Exception as e:
            logger.warning(f"Failed to create backup for {file_path}: {e}")

# 세션 상태 관리
class SessionManager:
    """세션 상태 관리"""

    def __init__(self, persistence: DataPersistence):
        self.persistence = persistence

    async def save_session_state(self, session_id: str, state: Dict[str, Any]) -> bool:
        """세션 상태 저장"""

        session_data = {
            "session_id": session_id,
            "timestamp": datetime.now(),
            "state": state
        }

        return await self.persistence.save_data("sessions", session_id, session_data)

    async def load_session_state(self, session_id: str) -> Optional[Dict[str, Any]]:
        """세션 상태 로드"""

        session_data = await self.persistence.load_data("sessions", session_id)

        if session_data:
            return session_data.get("state")
        return None

    async def delete_session(self, session_id: str) -> bool:
        """세션 삭제"""

        return await self.persistence.delete_data("sessions", session_id)

    async def list_sessions(self) -> List[Dict[str, Any]]:
        """세션 목록 조회"""

        session_keys = await self.persistence.list_keys("sessions")
        sessions = []

        for key in session_keys:
            session_data = await self.persistence.load_data("sessions", key)
            if session_data:
                sessions.append({
                    "session_id": key,
                    "timestamp": session_data.get("timestamp"),
                    "state_keys": list(session_data.get("state", {}).keys())
                })

        return sessions

# 포트폴리오 상태 관리
class PortfolioStateManager:
    """포트폴리오 상태 관리"""

    def __init__(self, persistence: DataPersistence):
        self.persistence = persistence

    async def save_portfolio_state(self, portfolio_id: str, state: Dict[str, Any]) -> bool:
        """포트폴리오 상태 저장"""

        portfolio_data = {
            "portfolio_id": portfolio_id,
            "timestamp": datetime.now(),
            "state": state
        }

        return await self.persistence.save_data("portfolios", portfolio_id, portfolio_data)

    async def load_portfolio_state(self, portfolio_id: str) -> Optional[Dict[str, Any]]:
        """포트폴리오 상태 로드"""

        portfolio_data = await self.persistence.load_data("portfolios", portfolio_id)

        if portfolio_data:
            return portfolio_data.get("state")
        return None

    async def list_portfolios(self) -> List[Dict[str, Any]]:
        """포트폴리오 목록 조회"""

        portfolio_keys = await self.persistence.list_keys("portfolios")
        portfolios = []

        for key in portfolio_keys:
            portfolio_data = await self.persistence.load_data("portfolios", key)
            if portfolio_data:
                portfolios.append({
                    "portfolio_id": key,
                    "timestamp": portfolio_data.get("timestamp"),
                    "state": portfolio_data.get("state", {})
                })

        return portfolios

# 글로벌 인스턴스
data_persistence = DataPersistence()
session_manager = SessionManager(data_persistence)
portfolio_state_manager = PortfolioStateManager(data_persistence)