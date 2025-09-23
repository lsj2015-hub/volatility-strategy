"""
Configuration Manager
설정 관리자 - 동적 설정 변경 및 프리셋 관리
"""

import logging
from typing import Dict, Any, Optional, List, Union
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, asdict, field
from enum import Enum

from app.utils.data_persistence import data_persistence

logger = logging.getLogger(__name__)

class ConfigCategory(str, Enum):
    """설정 카테고리"""
    TRADING = "trading"
    FILTERING = "filtering"
    MONITORING = "monitoring"
    NOTIFICATIONS = "notifications"
    SYSTEM = "system"
    API = "api"

@dataclass
class FilteringPreset:
    """필터링 조건 프리셋"""
    name: str
    description: str
    conditions: Dict[str, Any]
    created_at: datetime = field(default_factory=datetime.now)

    # 기본 조건들
    min_volume: int = 10000
    max_volume: Optional[int] = None
    min_price: int = 1000
    max_price: int = 50000
    min_market_cap: Optional[int] = None

    # 모멘텀 조건
    momentum_score_min: float = 60.0
    price_strength_min: float = 60.0
    volume_strength_min: float = 60.0

    # 고급 조건
    rsi_min: float = 30.0
    rsi_max: float = 70.0
    bollinger_position: float = 0.8

    # 제외 조건
    exclude_sectors: List[str] = field(default_factory=list)
    exclude_symbols: List[str] = field(default_factory=list)

@dataclass
class TradingPreset:
    """거래 설정 프리셋"""
    name: str
    description: str
    created_at: datetime = field(default_factory=datetime.now)

    # 포지션 관리
    max_positions: int = 5
    position_size_percent: float = 20.0  # 각 포지션이 포트폴리오의 20%
    max_investment_per_stock: int = 2000000  # 200만원

    # 위험 관리
    stop_loss_percent: float = -2.0
    target_profit_percent: float = 3.0
    max_hold_hours: int = 6

    # 시간 설정
    entry_start_time: str = "16:00"
    entry_end_time: str = "17:40"
    exit_start_time: str = "09:00"
    force_exit_time: str = "15:20"

    # 매수 조건
    buy_trigger_strength: float = 70.0
    buy_volume_multiplier: float = 1.5
    buy_price_deviation_max: float = 2.0

@dataclass
class MonitoringPreset:
    """모니터링 설정 프리셋"""
    name: str
    description: str
    created_at: datetime = field(default_factory=datetime.now)

    # 모니터링 간격
    price_check_interval: int = 30  # 초
    condition_check_interval: int = 60  # 초
    threshold_adjustment_interval: int = 1800  # 30분

    # 알림 설정
    enable_buy_signals: bool = True
    enable_sell_signals: bool = True
    enable_error_alerts: bool = True

    # 임계값 조정
    auto_adjust_thresholds: bool = True
    adjustment_sensitivity: float = 1.0
    max_adjustment_percent: float = 10.0

@dataclass
class NotificationPreset:
    """알림 설정 프리셋"""
    name: str
    description: str
    created_at: datetime = field(default_factory=datetime.now)

    # 알림 채널
    enable_websocket: bool = True
    enable_email: bool = False
    enable_slack: bool = False

    # 알림 레벨
    notify_buy_signals: bool = True
    notify_sell_signals: bool = True
    notify_position_updates: bool = True
    notify_errors: bool = True
    notify_system_status: bool = False

    # 이메일 설정
    email_recipients: List[str] = field(default_factory=list)
    email_smtp_server: str = ""
    email_smtp_port: int = 587

    # Slack 설정
    slack_webhook_url: str = ""
    slack_channel: str = "#trading"

class ConfigManager:
    """설정 관리자"""

    def __init__(self):
        self.config_cache: Dict[str, Dict[str, Any]] = {}
        self.presets_cache: Dict[str, Dict[str, Any]] = {}
        self._cache_timestamp: Optional[datetime] = None

        # 기본 프리셋 정의
        self.default_presets = {
            ConfigCategory.FILTERING: {
                "conservative": FilteringPreset(
                    name="보수적",
                    description="안정적인 대형주 중심의 보수적 필터링",
                    conditions={},
                    min_volume=50000,
                    min_market_cap=1000000000000,  # 1조원 이상
                    momentum_score_min=50.0,
                    price_strength_min=50.0,
                    volume_strength_min=50.0,
                    rsi_min=40.0,
                    rsi_max=60.0
                ),
                "balanced": FilteringPreset(
                    name="균형",
                    description="중간 위험 수준의 균형잡힌 필터링",
                    conditions={},
                    min_volume=20000,
                    momentum_score_min=60.0,
                    price_strength_min=60.0,
                    volume_strength_min=60.0
                ),
                "aggressive": FilteringPreset(
                    name="공격적",
                    description="높은 수익을 추구하는 공격적 필터링",
                    conditions={},
                    min_volume=10000,
                    momentum_score_min=70.0,
                    price_strength_min=70.0,
                    volume_strength_min=70.0,
                    rsi_min=20.0,
                    rsi_max=80.0
                )
            },
            ConfigCategory.TRADING: {
                "conservative": TradingPreset(
                    name="보수적",
                    description="낮은 위험, 적은 포지션 수",
                    max_positions=3,
                    position_size_percent=15.0,
                    stop_loss_percent=-1.5,
                    target_profit_percent=2.5,
                    max_hold_hours=4
                ),
                "balanced": TradingPreset(
                    name="균형",
                    description="중간 위험, 표준 설정",
                    max_positions=5,
                    position_size_percent=20.0,
                    stop_loss_percent=-2.0,
                    target_profit_percent=3.0,
                    max_hold_hours=6
                ),
                "aggressive": TradingPreset(
                    name="공격적",
                    description="높은 위험, 많은 포지션 수",
                    max_positions=8,
                    position_size_percent=25.0,
                    stop_loss_percent=-2.5,
                    target_profit_percent=4.0,
                    max_hold_hours=8
                )
            },
            ConfigCategory.MONITORING: {
                "realtime": MonitoringPreset(
                    name="실시간",
                    description="실시간 모니터링 (높은 리소스 사용)",
                    price_check_interval=10,
                    condition_check_interval=30,
                    threshold_adjustment_interval=900
                ),
                "normal": MonitoringPreset(
                    name="일반",
                    description="표준 모니터링 간격",
                    price_check_interval=30,
                    condition_check_interval=60,
                    threshold_adjustment_interval=1800
                ),
                "conservative": MonitoringPreset(
                    name="보수적",
                    description="낮은 빈도 모니터링 (낮은 리소스 사용)",
                    price_check_interval=60,
                    condition_check_interval=300,
                    threshold_adjustment_interval=3600
                )
            }
        }

    async def initialize(self):
        """설정 관리자 초기화"""

        # 기본 프리셋 저장
        await self._save_default_presets()

        # 캐시 로드
        await self._load_cache()

        logger.info("Configuration manager initialized")

    async def get_config(self, category: ConfigCategory, key: str = "current") -> Dict[str, Any]:
        """설정 조회"""

        config_data = await data_persistence.load_data("config", f"{category.value}_{key}")

        if config_data is None:
            # 기본 설정 반환
            default_preset = await self.get_preset(category, "balanced")
            if default_preset:
                return asdict(default_preset)
            return {}

        return config_data

    async def save_config(self, category: ConfigCategory, config: Dict[str, Any], key: str = "current") -> bool:
        """설정 저장"""

        config_data = {
            "category": category.value,
            "key": key,
            "config": config,
            "updated_at": datetime.now()
        }

        success = await data_persistence.save_data("config", f"{category.value}_{key}", config_data)

        if success:
            # 캐시 업데이트
            if category.value not in self.config_cache:
                self.config_cache[category.value] = {}
            self.config_cache[category.value][key] = config

            logger.info(f"Configuration saved: {category.value}/{key}")

        return success

    async def get_preset(self, category: ConfigCategory, preset_name: str) -> Optional[Union[FilteringPreset, TradingPreset, MonitoringPreset, NotificationPreset]]:
        """프리셋 조회"""

        preset_data = await data_persistence.load_data("config", f"preset_{category.value}_{preset_name}")

        if preset_data is None:
            # 기본 프리셋 확인
            if category in self.default_presets and preset_name in self.default_presets[category]:
                return self.default_presets[category][preset_name]
            return None

        # 프리셋 타입에 따라 객체 생성
        if category == ConfigCategory.FILTERING:
            return FilteringPreset(**preset_data)
        elif category == ConfigCategory.TRADING:
            return TradingPreset(**preset_data)
        elif category == ConfigCategory.MONITORING:
            return MonitoringPreset(**preset_data)
        elif category == ConfigCategory.NOTIFICATIONS:
            return NotificationPreset(**preset_data)

        return preset_data

    async def save_preset(self, category: ConfigCategory, preset_name: str, preset: Union[FilteringPreset, TradingPreset, MonitoringPreset, NotificationPreset]) -> bool:
        """프리셋 저장"""

        preset_data = asdict(preset)

        success = await data_persistence.save_data("config", f"preset_{category.value}_{preset_name}", preset_data)

        if success:
            # 캐시 업데이트
            if category.value not in self.presets_cache:
                self.presets_cache[category.value] = {}
            self.presets_cache[category.value][preset_name] = preset_data

            logger.info(f"Preset saved: {category.value}/{preset_name}")

        return success

    async def delete_preset(self, category: ConfigCategory, preset_name: str) -> bool:
        """프리셋 삭제"""

        success = await data_persistence.delete_data("config", f"preset_{category.value}_{preset_name}")

        if success:
            # 캐시에서 제거
            if category.value in self.presets_cache and preset_name in self.presets_cache[category.value]:
                del self.presets_cache[category.value][preset_name]

            logger.info(f"Preset deleted: {category.value}/{preset_name}")

        return success

    async def list_presets(self, category: ConfigCategory) -> List[Dict[str, Any]]:
        """프리셋 목록 조회"""

        config_keys = await data_persistence.list_keys("config")
        preset_prefix = f"preset_{category.value}_"

        presets = []

        # 저장된 프리셋
        for key in config_keys:
            if key.startswith(preset_prefix):
                preset_name = key[len(preset_prefix):]
                preset_data = await data_persistence.load_data("config", key)

                if preset_data:
                    presets.append({
                        "name": preset_name,
                        "description": preset_data.get("description", ""),
                        "created_at": preset_data.get("created_at"),
                        "is_default": False
                    })

        # 기본 프리셋 추가
        if category in self.default_presets:
            for preset_name, preset_obj in self.default_presets[category].items():
                # 중복 확인
                if not any(p["name"] == preset_name for p in presets):
                    presets.append({
                        "name": preset_name,
                        "description": preset_obj.description,
                        "created_at": preset_obj.created_at,
                        "is_default": True
                    })

        return sorted(presets, key=lambda x: x["name"])

    async def apply_preset(self, category: ConfigCategory, preset_name: str) -> bool:
        """프리셋을 현재 설정으로 적용"""

        preset = await self.get_preset(category, preset_name)

        if preset is None:
            logger.error(f"Preset not found: {category.value}/{preset_name}")
            return False

        # 프리셋을 딕셔너리로 변환
        preset_dict = asdict(preset) if hasattr(preset, '__dict__') else preset

        # 현재 설정으로 저장
        success = await self.save_config(category, preset_dict, "current")

        if success:
            logger.info(f"Preset applied: {category.value}/{preset_name}")

        return success

    async def create_preset_from_current(self, category: ConfigCategory, preset_name: str, description: str = "") -> bool:
        """현재 설정을 프리셋으로 저장"""

        current_config = await self.get_config(category)

        if not current_config:
            logger.error(f"No current configuration found for {category.value}")
            return False

        # 프리셋 객체 생성
        preset_data = current_config.copy()
        preset_data.update({
            "name": preset_name,
            "description": description,
            "created_at": datetime.now()
        })

        # 카테고리별 프리셋 객체 생성
        try:
            if category == ConfigCategory.FILTERING:
                preset = FilteringPreset(**preset_data)
            elif category == ConfigCategory.TRADING:
                preset = TradingPreset(**preset_data)
            elif category == ConfigCategory.MONITORING:
                preset = MonitoringPreset(**preset_data)
            elif category == ConfigCategory.NOTIFICATIONS:
                preset = NotificationPreset(**preset_data)
            else:
                return False

            return await self.save_preset(category, preset_name, preset)

        except Exception as e:
            logger.error(f"Failed to create preset from current config: {e}")
            return False

    async def export_config(self, category: Optional[ConfigCategory] = None) -> Dict[str, Any]:
        """설정 내보내기"""

        export_data = {
            "exported_at": datetime.now(),
            "categories": {}
        }

        categories = [category] if category else list(ConfigCategory)

        for cat in categories:
            cat_data = {
                "current": await self.get_config(cat),
                "presets": {}
            }

            presets = await self.list_presets(cat)
            for preset_info in presets:
                preset_name = preset_info["name"]
                preset_obj = await self.get_preset(cat, preset_name)
                if preset_obj:
                    cat_data["presets"][preset_name] = asdict(preset_obj) if hasattr(preset_obj, '__dict__') else preset_obj

            export_data["categories"][cat.value] = cat_data

        return export_data

    async def import_config(self, import_data: Dict[str, Any]) -> bool:
        """설정 가져오기"""

        try:
            categories_data = import_data.get("categories", {})

            for category_name, category_data in categories_data.items():
                try:
                    category = ConfigCategory(category_name)
                except ValueError:
                    logger.warning(f"Unknown category in import data: {category_name}")
                    continue

                # 현재 설정 가져오기
                current_config = category_data.get("current")
                if current_config:
                    await self.save_config(category, current_config)

                # 프리셋 가져오기
                presets_data = category_data.get("presets", {})
                for preset_name, preset_data in presets_data.items():
                    try:
                        if category == ConfigCategory.FILTERING:
                            preset = FilteringPreset(**preset_data)
                        elif category == ConfigCategory.TRADING:
                            preset = TradingPreset(**preset_data)
                        elif category == ConfigCategory.MONITORING:
                            preset = MonitoringPreset(**preset_data)
                        elif category == ConfigCategory.NOTIFICATIONS:
                            preset = NotificationPreset(**preset_data)
                        else:
                            continue

                        await self.save_preset(category, preset_name, preset)

                    except Exception as e:
                        logger.error(f"Failed to import preset {category_name}/{preset_name}: {e}")

            logger.info("Configuration import completed")
            return True

        except Exception as e:
            logger.error(f"Failed to import configuration: {e}")
            return False

    async def reset_to_defaults(self, category: ConfigCategory) -> bool:
        """기본 설정으로 초기화"""

        # 기본 프리셋 적용
        return await self.apply_preset(category, "balanced")

    async def _save_default_presets(self):
        """기본 프리셋 저장"""

        for category, presets in self.default_presets.items():
            for preset_name, preset_obj in presets.items():
                # 이미 존재하는지 확인
                existing = await data_persistence.data_exists("config", f"preset_{category.value}_{preset_name}")

                if not existing:
                    await self.save_preset(category, preset_name, preset_obj)

    async def _load_cache(self):
        """캐시 로드"""

        self.config_cache.clear()
        self.presets_cache.clear()

        config_keys = await data_persistence.list_keys("config")

        for key in config_keys:
            data = await data_persistence.load_data("config", key)

            if data is None:
                continue

            if key.startswith("preset_"):
                # 프리셋 캐시
                parts = key.split("_", 2)
                if len(parts) >= 3:
                    category = parts[1]
                    preset_name = parts[2]

                    if category not in self.presets_cache:
                        self.presets_cache[category] = {}
                    self.presets_cache[category][preset_name] = data

            else:
                # 설정 캐시
                if "_" in key:
                    category, config_key = key.rsplit("_", 1)

                    if category not in self.config_cache:
                        self.config_cache[category] = {}
                    self.config_cache[category][config_key] = data.get("config", {})

        self._cache_timestamp = datetime.now()
        logger.debug("Configuration cache loaded")

# 글로벌 설정 관리자 인스턴스
config_manager = ConfigManager()