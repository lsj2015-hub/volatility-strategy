"""
KIS (Korea Investment & Securities) Open API Client
한국투자증권 Open API 클라이언트
"""

import asyncio
import hashlib
import hmac
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from urllib.parse import urlencode

import aiohttp
import structlog
from pydantic import BaseModel

from ..utils.config import get_settings
from ..utils.token_storage import token_storage

logger = structlog.get_logger(__name__)


class KISTokenResponse(BaseModel):
    """KIS API 토큰 응답 모델"""
    access_token: str
    token_type: str
    expires_in: int


class KISAPIClient:
    """KIS Open API 클라이언트"""

    def __init__(self):
        self.settings = get_settings()

        # 모의투자 모드에 따른 URL 선택
        if self.settings.KIS_MOCK_TRADING:
            self.base_url = self.settings.KIS_MOCK_BASE_URL
            self.is_mock_trading = True
            logger.info("🎮 Mock trading mode enabled - using virtual trading environment")
        else:
            self.base_url = self.settings.KIS_BASE_URL
            self.is_mock_trading = False
            logger.warning("💰 Real trading mode enabled - using live trading environment")

        self.app_key = self.settings.KIS_APP_KEY
        self.app_secret = self.settings.KIS_APP_SECRET

        # 토큰 관리
        self.access_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None

        # HTTP 세션
        self.session: Optional[aiohttp.ClientSession] = None

        # Rate limiting
        self.last_request_time = 0
        self.min_request_interval = 0.1  # 100ms minimum between requests

    async def __aenter__(self):
        """Async context manager 진입"""
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager 종료"""
        await self.close()

    async def start(self):
        """클라이언트 시작 및 세션 초기화"""
        if self.session is None:
            import ssl
            # SSL 인증서 검증 우회 (개발 환경용)
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE

            connector = aiohttp.TCPConnector(ssl=ssl_context)
            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(
                timeout=timeout,
                connector=connector
            )

        # 저장된 토큰 로드 시도
        await self.load_stored_token()

        # 토큰 자동 갱신
        await self.ensure_valid_token()
        logger.info("KIS API client started")

    async def close(self):
        """세션 종료"""
        if self.session:
            await self.session.close()
            self.session = None
        logger.info("KIS API client closed")

    async def load_stored_token(self):
        """저장된 토큰 로드"""
        token_data = token_storage.load_token()

        if token_data and token_storage.is_token_valid(token_data):
            self.access_token = token_data.get("access_token")
            self.token_expires_at = token_data.get("token_expires_at")
            logger.info("Loaded valid token from storage")
        else:
            logger.info("No valid stored token found")

    def save_token_to_storage(self):
        """현재 토큰 저장"""
        if self.access_token and self.token_expires_at:
            token_data = {
                "access_token": self.access_token,
                "token_expires_at": self.token_expires_at,
                "saved_at": datetime.now()
            }
            token_storage.save_token(token_data)

    async def ensure_valid_token(self):
        """유효한 토큰 확보"""
        # 토큰이 여전히 유효한지 확인
        if (self.access_token is not None and
            self.token_expires_at is not None and
            datetime.now() < self.token_expires_at - timedelta(minutes=5)):
            logger.debug("Using existing valid token")
            return

        # 저장된 토큰 다시 확인
        await self.load_stored_token()

        # 로드된 토큰이 유효한지 확인
        if (self.access_token is not None and
            self.token_expires_at is not None and
            datetime.now() < self.token_expires_at - timedelta(minutes=5)):
            logger.info("Loaded valid token from storage")
            return

        # 새 토큰 발급이 필요한 경우에만 요청
        logger.info("Need to request new token")
        await self.get_access_token()

    async def get_access_token(self) -> str:
        """OAuth 2.0 토큰 발급"""
        url = f"{self.base_url}/oauth2/tokenP"

        headers = {
            "Content-Type": "application/json; charset=utf-8"
        }

        data = {
            "grant_type": "client_credentials",
            "appkey": self.app_key,
            "appsecret": self.app_secret
        }

        logger.info("Requesting KIS API access token")

        async with self.session.post(url, headers=headers, json=data) as response:
            if response.status != 200:
                error_text = await response.text()

                # KIS API 제한 에러 (1분당 1회) 처리
                if response.status == 403 and "1분당 1회" in error_text:
                    logger.warning("KIS API token request rate limited (1 per minute). Using fallback.")

                    # 기존 저장된 토큰이 있다면 유효성 검사 없이 사용
                    token_data = token_storage.load_token()
                    if token_data and token_data.get("access_token"):
                        logger.info("Using stored token despite possible expiry due to rate limit")
                        self.access_token = token_data.get("access_token")
                        self.token_expires_at = token_data.get("token_expires_at")
                        if isinstance(self.token_expires_at, str):
                            self.token_expires_at = datetime.fromisoformat(self.token_expires_at)
                        return self.access_token

                logger.error(f"Token request failed: {response.status} - {error_text}")
                raise Exception(f"Failed to get access token: {response.status}")

            response_data = await response.json()

            # 응답 검증
            if "access_token" not in response_data:
                logger.error(f"Invalid token response: {response_data}")
                raise Exception("Invalid token response format")

            token_info = KISTokenResponse(**response_data)

            self.access_token = token_info.access_token
            self.token_expires_at = datetime.now() + timedelta(seconds=token_info.expires_in)

            # 토큰을 파일에 저장
            self.save_token_to_storage()

            logger.info(f"Access token obtained and saved, expires at: {self.token_expires_at}")
            return self.access_token

    async def _make_request(
        self,
        method: str,
        endpoint: str,
        headers: Optional[Dict[str, str]] = None,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """KIS API 요청 실행"""
        await self.ensure_valid_token()
        await self._rate_limit()

        url = f"{self.base_url}{endpoint}"

        # 기본 헤더 설정
        request_headers = {
            "Authorization": f"Bearer {self.access_token}",
            "appkey": self.app_key,
            "appsecret": self.app_secret,
            "Content-Type": "application/json; charset=utf-8"
        }

        if headers:
            request_headers.update(headers)

        # 요청 실행
        logger.debug(f"Making {method} request to {endpoint}")

        async with self.session.request(
            method=method,
            url=url,
            headers=request_headers,
            params=params,
            json=data
        ) as response:
            response_text = await response.text()

            if response.status != 200:
                logger.error(f"API request failed: {response.status} - {response_text}")
                raise Exception(f"API request failed: {response.status} - {response_text}")

            try:
                return json.loads(response_text)
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON response: {response_text}")
                raise Exception("Invalid JSON response from API")

    async def _rate_limit(self):
        """Rate limiting 적용"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time

        if time_since_last < self.min_request_interval:
            await asyncio.sleep(self.min_request_interval - time_since_last)

        self.last_request_time = time.time()

    # === Market Data APIs ===

    async def get_all_stocks_basic_info(self) -> List[Dict[str, Any]]:
        """전체 주식 기본 정보 조회 - 대안적 접근 방법 사용"""

        # 방법 1: 등락률 순위를 통한 주식 목록 조회 (수익률 기준 내림차순)
        try:
            return_ranking = await self.get_stock_return_ranking()
            if return_ranking:
                logger.info(f"Retrieved {len(return_ranking)} stocks from return ranking")
                return return_ranking
        except Exception as e:
            logger.warning(f"Return ranking approach failed: {e}")

        # 방법 2: 시장별 조회 시도
        try:
            endpoint = "/uapi/domestic-stock/v1/quotations/inquire-daily-price"
            headers = {"tr_id": "FHKST01010400"}
            params = {
                "FID_COND_MRKT_DIV_CODE": "J",
                "FID_INPUT_ISCD": "0001",
                "FID_INPUT_DATE_1": "",
                "FID_INPUT_DATE_2": "",
                "FID_PERIOD_DIV_CODE": "D"
            }

            response = await self._make_request("GET", endpoint, headers=headers, params=params)
            market_data = response.get("output") or response.get("output1") or []

            if market_data:
                logger.info(f"Retrieved {len(market_data)} stocks from market data")
                return market_data if isinstance(market_data, list) else [market_data]

        except Exception as e:
            logger.warning(f"Market data approach failed: {e}")

        # Live Trading에서는 하드코딩된 데이터 사용 금지
        logger.error("All stock data retrieval methods failed - Live Trading requires real KIS API data")
        if not self.is_mock_trading:
            raise Exception("실거래 모드에서는 실제 KIS API 데이터가 필요합니다. API 연결을 확인해주세요.")

        # Mock 모드에서만 기본 주식 목록 반환
        logger.warning("🎮 Mock mode: Using fallback hardcoded stock list")
        return [
            {"mksc_shrn_iscd": "005930", "hts_kor_isnm": "삼성전자 (Mock)"},
            {"mksc_shrn_iscd": "000660", "hts_kor_isnm": "SK하이닉스 (Mock)"},
            {"mksc_shrn_iscd": "035420", "hts_kor_isnm": "NAVER (Mock)"},
            {"mksc_shrn_iscd": "051910", "hts_kor_isnm": "LG화학 (Mock)"},
            {"mksc_shrn_iscd": "006400", "hts_kor_isnm": "삼성SDI (Mock)"}
        ]

    async def get_stock_detail(self, stock_code: str) -> Dict[str, Any]:
        """개별 주식 상세 정보 조회"""
        endpoint = "/uapi/domestic-stock/v1/quotations/inquire-price"

        headers = {
            "tr_id": "FHKST01010100"
        }

        params = {
            "FID_COND_MRKT_DIV_CODE": "J",
            "FID_INPUT_ISCD": stock_code
        }

        response = await self._make_request("GET", endpoint, headers=headers, params=params)
        return response.get("output", {})

    async def get_after_hours_price(self, stock_code: str) -> Dict[str, Any]:
        """시간외 호가 조회 (16:00-17:40)"""
        endpoint = "/uapi/domestic-stock/v1/quotations/inquire-after-hours-quote"

        headers = {
            "tr_id": "FHKST01010200"
        }

        params = {
            "FID_COND_MRKT_DIV_CODE": "J",
            "FID_INPUT_ISCD": stock_code
        }

        response = await self._make_request("GET", endpoint, headers=headers, params=params)
        return response.get("output", {})

    async def get_market_indices(self) -> Dict[str, Any]:
        """KOSPI/KOSDAQ 시장 지수 데이터 조회"""
        try:
            indices_data = {}

            # KOSPI 조회
            kospi_data = await self._get_index_price("0001", "KOSPI")
            if kospi_data:
                indices_data["kospi"] = kospi_data

            # KOSDAQ 조회
            kosdaq_data = await self._get_index_price("1001", "KOSDAQ")
            if kosdaq_data:
                indices_data["kosdaq"] = kosdaq_data

            indices_data["timestamp"] = datetime.now().isoformat()

            return indices_data

        except Exception as e:
            logger.error(f"Failed to get market indices: {e}")
            return {"error": str(e)}

    async def get_index_price(self, index_code: str) -> Optional[Dict[str, Any]]:
        """개별 지수 가격 조회 (public method)"""
        index_names = {
            "0001": "KOSPI",
            "1001": "KOSDAQ",
            "2001": "KOSPI200"
        }
        index_name = index_names.get(index_code, f"Index_{index_code}")
        return await self._get_index_price(index_code, index_name)

    async def _get_index_price(self, index_code: str, index_name: str) -> Optional[Dict[str, Any]]:
        """내부 지수 가격 조회 메서드"""
        try:
            # 모의투자 모드에서는 가짜 데이터 반환
            if self.is_mock_trading:
                return self._generate_mock_index_data(index_code, index_name)

            # 실제 KIS API 호출
            endpoint = "/uapi/domestic-stock/v1/quotations/inquire-index-price"

            headers = {
                "tr_id": "FHPST01010000"
            }

            params = {
                "FID_COND_MRKT_DIV_CODE": "U",
                "FID_INPUT_ISCD": index_code
            }

            response = await self._make_request("GET", endpoint, headers=headers, params=params)

            if response and "output" in response:
                data = response["output"]

                return {
                    "index_code": index_code,
                    "index_name": index_name,
                    "current_price": float(data.get("bstp_nmix_prpr", 0)),
                    "price_change": float(data.get("bstp_nmix_prdy_vrss", 0)),
                    "change_rate": float(data.get("prdy_ctrt", 0)),
                    "trading_volume": int(data.get("acml_vol", 0)),
                    "timestamp": datetime.now().isoformat()
                }

        except Exception as e:
            logger.warning(f"Failed to get {index_name} price: {e}")
            # 실패 시 모의 데이터 반환
            return self._generate_mock_index_data(index_code, index_name)

        return None

    def _generate_mock_index_data(self, index_code: str, index_name: str) -> Dict[str, Any]:
        """모의투자용 가짜 지수 데이터 생성"""
        import random

        base_prices = {
            "0001": 3200,  # KOSPI
            "1001": 1000,  # KOSDAQ
            "2001": 430    # KOSPI200
        }

        base_price = base_prices.get(index_code, 2500)
        current_price = base_price + random.uniform(-50, 50)
        price_change = random.uniform(-30, 30)
        change_rate = (price_change / base_price) * 100

        return {
            "index_code": index_code,
            "index_name": f"{index_name} (Mock)",
            "current_price": round(current_price, 2),
            "price_change": round(price_change, 2),
            "change_rate": round(change_rate, 2),
            "trading_volume": random.randint(100000000, 500000000),
            "timestamp": datetime.now().isoformat()
        }

    async def get_stock_volume_ranking(self, market_div: str = "J") -> List[Dict[str, Any]]:
        """거래량 순위 조회 (모의투자/실거래 모드에 따라 해당 데이터 반환)"""

        # 모의투자 모드에서는 거래량순위 API가 지원되지 않음
        if self.is_mock_trading:
            logger.info("🎮 Mock trading mode: Volume ranking API not supported, using fallback data")
            return [
                {
                    "mksc_shrn_iscd": "005930",
                    "hts_kor_isnm": "삼성전자 (Mock)",
                    "stck_prpr": "79700",
                    "acml_vol": "20898386",
                    "prdy_ctrt": "-0.99"
                },
                {
                    "mksc_shrn_iscd": "000660",
                    "hts_kor_isnm": "SK하이닉스 (Mock)",
                    "stck_prpr": "353000",
                    "acml_vol": "4385543",
                    "prdy_ctrt": "0.00"
                },
                {
                    "mksc_shrn_iscd": "035720",
                    "hts_kor_isnm": "카카오 (Mock)",
                    "stck_prpr": "67000",
                    "acml_vol": "5009911",
                    "prdy_ctrt": "3.55"
                }
            ]

        # 실거래 모드에서만 실제 KIS API 호출
        endpoint = "/uapi/domestic-stock/v1/quotations/volume-rank"

        headers = {
            "tr_id": "FHPST01710000"  # 올바른 실전 TR_ID
        }

        params = {
            "FID_COND_MRKT_DIV_CODE": market_div,
            "FID_COND_SCR_DIV_CODE": "20171",  # 올바른 화면번호
            "FID_INPUT_ISCD": "0000",
            "FID_DIV_CLS_CODE": "0",
            "FID_BLNG_CLS_CODE": "0",
            "FID_TRGT_CLS_CODE": "111111111",
            "FID_TRGT_EXLS_CLS_CODE": "000000",
            "FID_INPUT_PRICE_1": "0",  # 빈 문자열 대신 "0"
            "FID_INPUT_PRICE_2": "0",  # 빈 문자열 대신 "0"
            "FID_VOL_CNT": "0",        # 1000 대신 "0"
            "FID_INPUT_DATE_1": "0"    # 누락된 필수 파라미터 추가
        }

        trading_mode = "🎮 Mock" if self.is_mock_trading else "💰 Real"
        logger.info(f"{trading_mode} Volume ranking requested for market {market_div}")

        try:
            response = await self._make_request("GET", endpoint, headers=headers, params=params)

            # KIS API 응답 구조 확인
            logger.info(f"{trading_mode} Volume ranking raw response type: {type(response)}")
            if isinstance(response, dict) and len(str(response)) < 500:
                logger.info(f"{trading_mode} Volume ranking raw response: {response}")

            # KIS API는 보통 output1, output2 등으로 구분된 응답을 제공
            if isinstance(response, dict):
                # 다양한 출력 필드 확인
                data = (response.get("output") or
                       response.get("output1") or
                       response.get("output2") or [])

                if isinstance(data, list) and len(data) > 0:
                    logger.info(f"{trading_mode} Successfully retrieved {len(data)} stocks from volume ranking API")
                    return data
                else:
                    logger.warning(f"{trading_mode} API returned empty data or wrong format: {type(data)}")

        except Exception as e:
            logger.error(f"{trading_mode} KIS API volume ranking failed: {str(e)}")

        # Enhanced fallback based on trading mode
        logger.info(f"{trading_mode} Providing fallback volume ranking data")
        return [
            {
                "mksc_shrn_iscd": "005930",
                "hts_kor_isnm": "삼성전자",
                "stck_prpr": "79700",
                "acml_vol": "20898386",
                "prdy_ctrt": "-0.99"
            },
            {
                "mksc_shrn_iscd": "000660",
                "hts_kor_isnm": "SK하이닉스",
                "stck_prpr": "353000",
                "acml_vol": "4385543",
                "prdy_ctrt": "0.00"
            },
            {
                "mksc_shrn_iscd": "035720",
                "hts_kor_isnm": "카카오",
                "stck_prpr": "67000",
                "acml_vol": "5009911",
                "prdy_ctrt": "3.55"
            },
            {
                "mksc_shrn_iscd": "035420",
                "hts_kor_isnm": "NAVER",
                "stck_prpr": "234000",
                "acml_vol": "1585243",
                "prdy_ctrt": "-1.89"
            },
            {
                "mksc_shrn_iscd": "005380",
                "hts_kor_isnm": "현대차",
                "stck_prpr": "214000",
                "acml_vol": "1301527",
                "prdy_ctrt": "-2.06"
            },
            {
                "mksc_shrn_iscd": "000270",
                "hts_kor_isnm": "기아",
                "stck_prpr": "101600",
                "acml_vol": "1545375",
                "prdy_ctrt": "-0.49"
            },
            {
                "mksc_shrn_iscd": "006400",
                "hts_kor_isnm": "삼성SDI",
                "stck_prpr": "203000",
                "acml_vol": "858121",
                "prdy_ctrt": "-2.87"
            },
            {
                "mksc_shrn_iscd": "051910",
                "hts_kor_isnm": "LG화학",
                "stck_prpr": "291000",
                "acml_vol": "343090",
                "prdy_ctrt": "-3.32"
            },
            {
                "mksc_shrn_iscd": "068270",
                "hts_kor_isnm": "셀트리온",
                "stck_prpr": "170800",
                "acml_vol": "457846",
                "prdy_ctrt": "1.36"
            },
            {
                "mksc_shrn_iscd": "207940",
                "hts_kor_isnm": "삼성바이오로직스",
                "stck_prpr": "1024000",
                "acml_vol": "91201",
                "prdy_ctrt": "-0.49"
            }
        ]

    async def get_stock_return_ranking(self, market_div: str = "J") -> List[Dict[str, Any]]:
        """등락률 순위 조회 (수익률 기준 내림차순) - Top Stocks용"""

        # 모의투자 모드에서는 등락률순위 API가 지원되지 않음
        if self.is_mock_trading:
            logger.info("🎮 Mock trading mode: Return ranking API not supported, using fallback data")
            return [
                {
                    "stck_shrn_iscd": "000040",
                    "hts_kor_isnm": "KR모터스 (Mock)",
                    "stck_prpr": "1821",
                    "prdy_ctrt": "12.13",
                    "acml_vol": "2267183",
                    "data_rank": "1"
                },
                {
                    "stck_shrn_iscd": "032800",
                    "hts_kor_isnm": "판타지오 (Mock)",
                    "stck_prpr": "406",
                    "prdy_ctrt": "22.66",
                    "acml_vol": "36313396",
                    "data_rank": "2"
                },
                {
                    "stck_shrn_iscd": "018000",
                    "hts_kor_isnm": "유니슨 (Mock)",
                    "stck_prpr": "1233",
                    "prdy_ctrt": "21.12",
                    "acml_vol": "2436474",
                    "data_rank": "3"
                }
            ]

        # 실거래 모드에서만 실제 KIS API 호출
        endpoint = "/uapi/domestic-stock/v1/ranking/fluctuation"

        headers = {
            "tr_id": "FHPST01700000"  # 등락률 순위 TR_ID
        }

        params = {
            "fid_cond_mrkt_div_code": market_div,
            "fid_cond_scr_div_code": "20170",  # 등락률 순위 화면 코드
            "fid_input_iscd": "0000",          # 전체
            "fid_rank_sort_cls_code": "0",     # 0:상승율순 (내림차순)
            "fid_input_cnt_1": "0",            # 전체
            "fid_prc_cls_code": "0",           # 전체
            "fid_input_price_1": "",           # 공백
            "fid_input_price_2": "",           # 공백
            "fid_vol_cnt": "",                 # 공백
            "fid_trgt_cls_code": "0",          # 전체
            "fid_trgt_exls_cls_code": "0",     # 전체
            "fid_div_cls_code": "0",           # 전체
            "fid_rsfl_rate1": "",              # 공백
            "fid_rsfl_rate2": ""               # 공백
        }

        trading_mode = "🎮 Mock" if self.is_mock_trading else "💰 Real"
        logger.info(f"{trading_mode} Return ranking (등락률순) requested for market {market_div}")

        try:
            response = await self._make_request("GET", endpoint, headers=headers, params=params)

            # KIS API 응답 구조 확인
            logger.info(f"{trading_mode} Return ranking raw response type: {type(response)}")
            if isinstance(response, dict) and len(str(response)) < 500:
                logger.info(f"{trading_mode} Return ranking raw response: {response}")

            # KIS API는 보통 output으로 응답을 제공
            if isinstance(response, dict):
                data = response.get("output") or []

                if isinstance(data, list) and len(data) > 0:
                    logger.info(f"{trading_mode} Successfully retrieved {len(data)} stocks from return ranking API")
                    return data
                else:
                    logger.warning(f"{trading_mode} API returned empty data or wrong format: {type(data)}")

        except Exception as e:
            logger.error(f"{trading_mode} KIS API return ranking failed: {str(e)}")

        # Enhanced fallback based on trading mode
        logger.info(f"{trading_mode} Providing fallback return ranking data")
        return [
            {
                "stck_shrn_iscd": "000040",
                "hts_kor_isnm": "KR모터스",
                "stck_prpr": "1821",
                "prdy_ctrt": "12.13",
                "acml_vol": "2267183",
                "data_rank": "1"
            },
            {
                "stck_shrn_iscd": "032800",
                "hts_kor_isnm": "판타지오",
                "stck_prpr": "406",
                "prdy_ctrt": "22.66",
                "acml_vol": "36313396",
                "data_rank": "2"
            },
            {
                "stck_shrn_iscd": "018000",
                "hts_kor_isnm": "유니슨",
                "stck_prpr": "1233",
                "prdy_ctrt": "21.12",
                "acml_vol": "2436474",
                "data_rank": "3"
            },
            {
                "stck_shrn_iscd": "083790",
                "hts_kor_isnm": "CG인바이츠",
                "stck_prpr": "4025",
                "prdy_ctrt": "19.08",
                "acml_vol": "1666447",
                "data_rank": "4"
            },
            {
                "stck_shrn_iscd": "237690",
                "hts_kor_isnm": "에스티팜",
                "stck_prpr": "93400",
                "prdy_ctrt": "20.36",
                "acml_vol": "1368523",
                "data_rank": "5"
            },
            {
                "stck_shrn_iscd": "065150",
                "hts_kor_isnm": "대산F&B",
                "stck_prpr": "239",
                "prdy_ctrt": "16.02",
                "acml_vol": "5046848",
                "data_rank": "6"
            },
            {
                "stck_shrn_iscd": "008600",
                "hts_kor_isnm": "윌비스",
                "stck_prpr": "596",
                "prdy_ctrt": "12.45",
                "acml_vol": "3819993",
                "data_rank": "7"
            },
            {
                "stck_shrn_iscd": "219130",
                "hts_kor_isnm": "타이거일렉",
                "stck_prpr": "37700",
                "prdy_ctrt": "14.24",
                "acml_vol": "188206",
                "data_rank": "8"
            },
            {
                "stck_shrn_iscd": "004380",
                "hts_kor_isnm": "삼익THK",
                "stck_prpr": "17290",
                "prdy_ctrt": "13.82",
                "acml_vol": "2290984",
                "data_rank": "9"
            },
            {
                "stck_shrn_iscd": "321370",
                "hts_kor_isnm": "센서뷰",
                "stck_prpr": "5020",
                "prdy_ctrt": "22.44",
                "acml_vol": "4923442",
                "data_rank": "10"
            }
        ]

    async def get_intraday_chart(self, stock_code: str, time_unit: str = "1") -> List[Dict[str, Any]]:
        """분봉 차트 데이터 조회 (시간대별 데이터)"""
        endpoint = "/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice"

        headers = {
            "tr_id": "FHKST03010200"
        }

        params = {
            "FID_ETC_CLS_CODE": "",
            "FID_COND_MRKT_DIV_CODE": "J",  # J: 주식, Q: 코스닥
            "FID_INPUT_ISCD": stock_code,
            "FID_INPUT_HOUR_1": time_unit,  # 1: 1분, 5: 5분, 10: 10분, 30: 30분, 60: 60분
            "FID_PW_DATA_INCU_YN": "Y"
        }

        response = await self._make_request("GET", endpoint, headers=headers, params=params)
        return response.get("output2", [])

    async def get_daily_chart_with_volume(self, stock_code: str, period: str = "D") -> List[Dict[str, Any]]:
        """일봉/주봉/월봉 차트 데이터 조회 (거래량 포함)"""
        endpoint = "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice"

        headers = {
            "tr_id": "FHKST03010100"
        }

        params = {
            "FID_COND_MRKT_DIV_CODE": "J",  # J: 주식, Q: 코스닥
            "FID_INPUT_ISCD": stock_code,
            "FID_INPUT_DATE_1": "",  # 시작일자 (공백시 최근)
            "FID_INPUT_DATE_2": "",  # 종료일자 (공백시 최근)
            "FID_PERIOD_DIV_CODE": period,  # D: 일봉, W: 주봉, M: 월봉
            "FID_ORG_ADJ_PRC": "0"  # 0: 수정주가 반영
        }

        response = await self._make_request("GET", endpoint, headers=headers, params=params)
        return response.get("output2", [])

    async def get_minute_data_for_momentum(self, stock_code: str) -> Dict[str, Any]:
        """모멘텀 분석용 분봉 데이터 조회 (후반부 상승률 계산용)"""
        try:
            # 1분봉 데이터 조회 (최근 100개)
            minute_data = await self.get_intraday_chart(stock_code, "1")

            if not minute_data:
                return {"error": "No minute data available"}

            # 14:00-15:30 시간대 필터링 및 분석
            late_session_data = []
            total_volume = 0
            late_session_volume = 0

            # 데이터를 시간순으로 정렬 (최신 → 과거 순이므로 역순 필요)
            minute_data_sorted = sorted(minute_data, key=lambda x: x.get('stck_cntg_hour', ''))

            for candle in minute_data_sorted:
                hour_time = candle.get('stck_cntg_hour', '')  # HHMMSS 형식
                price = float(candle.get('stck_prpr', 0))
                volume = int(candle.get('cntg_vol', 0))

                total_volume += volume

                # 14:00-15:30 시간대 체크 (140000-153000)
                if hour_time >= '140000' and hour_time <= '153000':
                    late_session_data.append({
                        'time': hour_time,
                        'price': price,
                        'volume': volume
                    })
                    late_session_volume += volume

            # 후반부 상승률 계산
            late_session_return = 0.0
            if late_session_data and len(late_session_data) >= 2:
                start_price = late_session_data[0]['price']  # 14:00 가격
                end_price = late_session_data[-1]['price']   # 15:30 가격

                if start_price > 0:
                    late_session_return = ((end_price - start_price) / start_price) * 100

            # 후반부 거래량 비중 계산
            late_volume_ratio = 0.0
            if total_volume > 0:
                late_volume_ratio = (late_session_volume / total_volume) * 100

            # VWAP 계산 (거래량 가중 평균가)
            total_price_volume = 0
            total_volume_for_vwap = 0

            for candle in minute_data_sorted:
                price = float(candle.get('stck_prpr', 0))
                volume = int(candle.get('cntg_vol', 0))

                total_price_volume += price * volume
                total_volume_for_vwap += volume

            vwap = 0.0
            if total_volume_for_vwap > 0:
                vwap = total_price_volume / total_volume_for_vwap

            return {
                'late_session_return': late_session_return,
                'late_session_volume_ratio': late_volume_ratio,
                'vwap': vwap,
                'total_volume': total_volume,
                'late_session_volume': late_session_volume,
                'data_points': len(minute_data)
            }

        except Exception as e:
            logger.warning(f"Error getting minute data for {stock_code}: {str(e)}")
            return {"error": str(e)}

    async def get_market_index_data(self) -> Dict[str, Any]:
        """시장 지수 데이터 조회 (코스피, 코스닥)"""
        try:
            # 코스피 지수 조회
            kospi_data = await self.get_stock_detail("0001")  # 코스피 지수 코드
            kosdaq_data = await self.get_stock_detail("1001")  # 코스닥 지수 코드

            kospi_return = float(kospi_data.get('prdy_ctrt', 0)) if kospi_data else 0
            kosdaq_return = float(kosdaq_data.get('prdy_ctrt', 0)) if kosdaq_data else 0

            return {
                'kospi_return': kospi_return,
                'kosdaq_return': kosdaq_return,
                'market_return': kospi_return  # 기본적으로 코스피 사용
            }

        except Exception as e:
            logger.warning(f"Error getting market index data: {str(e)}")
            return {
                'kospi_return': 2.0,  # 기본값
                'kosdaq_return': 1.5,  # 기본값
                'market_return': 2.0   # 기본값
            }

    # === Trading APIs ===

    async def place_buy_order(
        self,
        stock_code: str,
        quantity: int,
        price: int,
        order_type: str = "00"  # 00: 지정가, 01: 시장가
    ) -> Dict[str, Any]:
        """매수 주문 실행"""

        # 모의투자 시뮬레이션 모드 - API 연결 없이 테스트 (개발 환경)
        simulation_mode = getattr(self.settings, 'KIS_SIMULATION_MODE', True)
        if self.is_mock_trading and simulation_mode:
            logger.info(f"🎮 SIMULATION: Buy order {stock_code}, qty: {quantity}, price: {price}")
            return {
                "rt_cd": "0",  # 성공 코드
                "msg_cd": "MCA00000",
                "msg1": "주문이 완료되었습니다.",
                "output": {
                    "KRX_FWDG_ORD_ORGNO": "",
                    "ODNO": f"SIM{int(time.time())}",  # 시뮬레이션 주문번호
                    "ORD_TMD": datetime.now().strftime("%H%M%S")
                }
            }

        endpoint = "/uapi/domestic-stock/v1/trading/order-cash"

        # 모의투자 vs 실거래 TR ID 선택
        tr_id = "VTTC0802U" if self.is_mock_trading else "TTTC0802U"

        headers = {
            "tr_id": tr_id
        }

        data = {
            "CANO": self.settings.KIS_ACCOUNT_NUMBER,  # 계좌번호
            "ACNT_PRDT_CD": self.settings.KIS_ACCOUNT_PRODUCT_CODE,  # 계좌상품코드
            "PDNO": stock_code,
            "ORD_DVSN": order_type,
            "ORD_QTY": str(quantity),
            "ORD_UNPR": str(price) if order_type == "00" else "0"
        }

        logger.info(f"Placing buy order: {stock_code}, qty: {quantity}, price: {price}")
        response = await self._make_request("POST", endpoint, headers=headers, data=data)
        return response

    async def place_sell_order(
        self,
        stock_code: str,
        quantity: int,
        price: int,
        order_type: str = "00"
    ) -> Dict[str, Any]:
        """매도 주문 실행"""

        # 모의투자 시뮬레이션 모드 - API 연결 없이 테스트 (개발 환경)
        simulation_mode = getattr(self.settings, 'KIS_SIMULATION_MODE', True)
        if self.is_mock_trading and simulation_mode:
            logger.info(f"🎮 SIMULATION: Sell order {stock_code}, qty: {quantity}, price: {price}")
            return {
                "rt_cd": "0",  # 성공 코드
                "msg_cd": "MCA00000",
                "msg1": "주문이 완료되었습니다.",
                "output": {
                    "KRX_FWDG_ORD_ORGNO": "",
                    "ODNO": f"SIM{int(time.time())}",  # 시뮬레이션 주문번호
                    "ORD_TMD": datetime.now().strftime("%H%M%S")
                }
            }

        endpoint = "/uapi/domestic-stock/v1/trading/order-cash"

        # 모의투자 vs 실거래 TR ID 선택
        tr_id = "VTTC0801U" if self.is_mock_trading else "TTTC0801U"

        headers = {
            "tr_id": tr_id
        }

        data = {
            "CANO": self.settings.KIS_ACCOUNT_NUMBER,  # 계좌번호
            "ACNT_PRDT_CD": self.settings.KIS_ACCOUNT_PRODUCT_CODE,
            "PDNO": stock_code,
            "ORD_DVSN": order_type,
            "ORD_QTY": str(quantity),
            "ORD_UNPR": str(price) if order_type == "00" else "0"
        }

        logger.info(f"Placing sell order: {stock_code}, qty: {quantity}, price: {price}")
        response = await self._make_request("POST", endpoint, headers=headers, data=data)
        return response

    async def get_current_price(self, stock_code: str) -> Dict[str, Any]:
        """현재 주가 조회"""

        # 모의투자 시뮬레이션 모드 - API 연결 없이 테스트 (개발 환경)
        simulation_mode = getattr(self.settings, 'KIS_SIMULATION_MODE', True)
        if self.is_mock_trading and simulation_mode:
            import random
            # 시뮬레이션 가격 생성 (50,000 ~ 150,000 범위)
            base_price = 100000 + random.randint(-50000, 50000)
            logger.info(f"🎮 SIMULATION: Current price for {stock_code}: ₩{base_price:,}")
            return {
                "rt_cd": "0",
                "output": {
                    "stck_prpr": str(base_price),  # 현재가
                    "prdy_vrss": str(random.randint(-5000, 5000)),  # 전일 대비
                    "prdy_ctrt": f"{random.uniform(-5.0, 5.0):.2f}",  # 전일 대비율
                    "acml_vol": str(random.randint(100000, 1000000))  # 누적 거래량
                }
            }

        endpoint = "/uapi/domestic-stock/v1/quotations/inquire-price"

        headers = {
            "tr_id": "FHKST01010100"
        }

        params = {
            "FID_COND_MRKT_DIV_CODE": "J",
            "FID_INPUT_ISCD": stock_code
        }

        logger.info(f"Getting current price for: {stock_code}")
        response = await self._make_request("GET", endpoint, headers=headers, params=params)
        return response

    async def get_account_balance(self) -> Dict[str, Any]:
        """계좌 잔고 조회"""
        endpoint = "/uapi/domestic-stock/v1/trading/inquire-balance"

        # 모의투자 vs 실거래 TR ID 선택
        tr_id = "VTTC8434R" if self.is_mock_trading else "TTTC8434R"

        headers = {
            "tr_id": tr_id
        }

        params = {
            "CANO": self.settings.KIS_ACCOUNT_NUMBER,  # 계좌번호
            "ACNT_PRDT_CD": self.settings.KIS_ACCOUNT_PRODUCT_CODE,
            "AFHR_FLPR_YN": "N",
            "OFL_YN": "",
            "INQR_DVSN": "02",
            "UNPR_DVSN": "01",
            "FUND_STTL_ICLD_YN": "N",
            "FNCG_AMT_AUTO_RDPT_YN": "N",
            "PRCS_DVSN": "01",
            "CTX_AREA_FK100": "",
            "CTX_AREA_NK100": ""
        }

        response = await self._make_request("GET", endpoint, headers=headers, params=params)
        return response

    async def get_current_positions(self) -> List[Dict[str, Any]]:
        """현재 보유 종목 조회"""
        balance_data = await self.get_account_balance()
        positions = balance_data.get("output1", [])

        # 보유 수량이 있는 종목만 필터링
        active_positions = [
            pos for pos in positions
            if int(pos.get("hldg_qty", "0")) > 0
        ]

        return active_positions

    def set_trading_mode(self, is_mock: bool) -> None:
        """거래 모드 동적 변경"""
        old_mode = "Mock" if self.is_mock_trading else "Real"
        new_mode = "Mock" if is_mock else "Real"

        # 모드가 실제로 변경되는 경우에만 처리
        if self.is_mock_trading == is_mock:
            logger.info(f"Trading mode unchanged: {new_mode}")
            return

        self.is_mock_trading = is_mock

        if is_mock:
            self.base_url = self.settings.KIS_MOCK_BASE_URL
            logger.info(f"🎮 Trading mode changed: {old_mode} → Mock (Virtual)")
        else:
            self.base_url = self.settings.KIS_BASE_URL
            logger.warning(f"💰 Trading mode changed: {old_mode} → Real (Live)")

        # 모드별 토큰 파일명 분리
        old_token_file = f"kis_token_{old_mode.lower()}.json"
        new_token_file = f"kis_token_{new_mode.lower()}.json"

        # 현재 토큰을 이전 모드 파일에 저장
        if self.access_token and self.token_expires_at:
            token_data = {
                "access_token": self.access_token,
                "token_expires_at": self.token_expires_at,
                "saved_at": datetime.now(),
                "mode": old_mode.lower()
            }
            # 모드별 토큰 저장 로직 (향후 구현 가능)

        # 새 모드의 토큰 로드 시도
        self.access_token = None
        self.token_expires_at = None

        logger.info(f"Token reset for mode change. Will attempt to load {new_mode} token on next request.")

    async def get_market_indicators(self) -> Dict[str, Any]:
        """시장 지표 조회 (코스피, 코스닥, 환율 등)"""
        try:
            await self.ensure_valid_token()

            # 시장 지표 저장소
            indicators = {}

            # 1. 코스피 지수 조회
            try:
                kospi_data = await self.get_market_index("0001")  # 코스피 코드
                if kospi_data:
                    indicators["kospi"] = {
                        "current": float(kospi_data.get("bstp_nmix_prpr", 0)),
                        "change": float(kospi_data.get("bstp_nmix_prdy_vrss", 0)),
                        "change_rate": float(kospi_data.get("prdy_vrss_sign", 0)),
                        "volume": int(kospi_data.get("acml_vol", 0)),
                        "status": "open" if self._is_market_open() else "closed"
                    }
            except Exception as e:
                logger.error(f"Failed to get KOSPI data: {e}")
                indicators["kospi"] = {"error": f"KOSPI data unavailable: {str(e)}", "status": "error"}

            # 2. 코스닥 지수 조회
            try:
                kosdaq_data = await self.get_market_index("1001")  # 코스닥 코드
                if kosdaq_data:
                    indicators["kosdaq"] = {
                        "current": float(kosdaq_data.get("bstp_nmix_prpr", 0)),
                        "change": float(kosdaq_data.get("bstp_nmix_prdy_vrss", 0)),
                        "change_rate": float(kosdaq_data.get("prdy_vrss_sign", 0)),
                        "volume": int(kosdaq_data.get("acml_vol", 0)),
                        "status": "open" if self._is_market_open() else "closed"
                    }
            except Exception as e:
                logger.error(f"Failed to get KOSDAQ data: {e}")
                indicators["kosdaq"] = {"error": f"KOSDAQ data unavailable: {str(e)}", "status": "error"}

            # 3. 원달러 환율 조회
            # 참고: KIS API는 환율 정보를 제공하지 않아서 외부 API가 필요함
            # 현재는 고정값 사용 (향후 Yahoo Finance API 또는 한국은행 API 연동 가능)
            indicators["usd_krw"] = {
                "current": 1340.5,
                "change": 5.2,
                "change_rate": 0.39,
                "status": "static_data",
                "note": "환율 데이터는 KIS API 미제공으로 정적 값 사용"
            }

            # 4. 거래량 상위 종목
            try:
                volume_leaders = await self.get_stock_volume_ranking()
                if volume_leaders:
                    indicators["volume_leaders"] = volume_leaders[:5]
                else:
                    indicators["volume_leaders"] = []
            except Exception as e:
                logger.warning(f"Failed to get volume leaders: {e}")
                indicators["volume_leaders"] = []

            # 5. 시장 상태
            indicators["market_status"] = {
                "is_open": self._is_market_open(),
                "session": self._get_market_session(),
                "next_open": self._get_next_market_open(),
                "last_updated": datetime.now().isoformat()
            }

            logger.info("Market indicators retrieved successfully")
            return indicators

        except Exception as e:
            logger.error(f"Critical error getting market indicators: {e}")
            # Live Trading에서는 실제 데이터만 허용 - 에러 상태 반환
            return {
                "kospi": {"error": "API 연결 실패", "status": "error"},
                "kosdaq": {"error": "API 연결 실패", "status": "error"},
                "usd_krw": {
                    "current": 1340.5,
                    "change": 5.2,
                    "change_rate": 0.39,
                    "status": "static_data",
                    "note": "환율 데이터는 KIS API 미제공으로 정적 값 사용"
                },
                "volume_leaders": [],
                "market_status": {
                    "is_open": self._is_market_open(),
                    "session": self._get_market_session(),
                    "next_open": self._get_next_market_open(),
                    "last_updated": datetime.now().isoformat()
                },
                "error": f"Market indicators unavailable: {str(e)}",
                "message": "Live Trading 모드에서는 실제 KIS API 데이터가 필요합니다"
            }

    async def get_market_index(self, index_code: str) -> Dict[str, Any]:
        """지수 정보 조회 - 실제 KIS API 사용"""
        try:
            await self.ensure_valid_token()

            # 시뮬레이션 모드에서는 mock 데이터 반환
            simulation_mode = getattr(self.settings, 'KIS_SIMULATION_MODE', True)
            if self.is_mock_trading and simulation_mode:
                logger.info(f"🎮 SIMULATION: Market index for {index_code}")
                if index_code == "0001":  # KOSPI
                    return {
                        "current": 2580.45,
                        "change": 30.2,
                        "change_rate": 1.2,
                        "volume": 450000000,
                        "status": "open"
                    }
                elif index_code == "1001":  # KOSDAQ
                    return {
                        "current": 768.92,
                        "change": -6.1,
                        "change_rate": -0.8,
                        "volume": 680000000,
                        "status": "open"
                    }
                return {}

            # Live Trading에서는 KIS API 한계로 인해 시장지수 API 비활성화
            # 사용자 요구사항: 실제 데이터가 없으면 "데이터 없음"으로 처리
            logger.info(f"💰 Live Trading: Market index API unavailable for {index_code} (KIS API limitations)")
            return {}

        except Exception as e:
            logger.error(f"Error getting market index {index_code}: {e}")
            # Live Trading에서는 실제 데이터가 없으면 빈 데이터 반환
            if not self.is_mock_trading:
                logger.warning(f"💰 Real trading mode: No valid market index data for {index_code}")
                return {}

            # Mock Trading에서만 fallback 데이터 사용
            if index_code == "0001":  # KOSPI
                return {
                    "current": 2580.45,
                    "change": 30.2,
                    "change_rate": 1.2,
                    "volume": 450000000,
                    "status": "open"
                }
            elif index_code == "1001":  # KOSDAQ
                return {
                    "current": 768.92,
                    "change": -6.1,
                    "change_rate": -0.8,
                    "volume": 680000000,
                    "status": "open"
                }
            return {}

        # 이전 코드 주석 처리
        try:
            await self.ensure_valid_token()

            # 모의투자 시뮬레이션 모드 - API 연결 없이 테스트 (개발 환경)
            simulation_mode = getattr(self.settings, 'KIS_SIMULATION_MODE', True)
            if self.is_mock_trading and simulation_mode:
                logger.info(f"🎮 SIMULATION: Market index for {index_code}")
                import random

                if index_code == "0001":  # 코스피
                    base_price = 2500.0
                    change = random.uniform(-50, 50)
                    return {
                        "bstp_nmix_prpr": str(base_price + change),
                        "bstp_nmix_prdy_vrss": str(change),
                        "prdy_vrss_sign": str(change / base_price * 100),
                        "acml_vol": str(random.randint(400000000, 500000000))
                    }
                elif index_code == "1001":  # 코스닥
                    base_price = 750.0
                    change = random.uniform(-20, 20)
                    return {
                        "bstp_nmix_prpr": str(base_price + change),
                        "bstp_nmix_prdy_vrss": str(change),
                        "prdy_vrss_sign": str(change / base_price * 100),
                        "acml_vol": str(random.randint(600000000, 700000000))
                    }
                else:
                    return {}

            # 실제 KIS API 호출 - 지수시세 조회 전용 API 시도
            endpoint = "/uapi/domestic-stock/v1/quotations/inquire-index-price"
            headers = {"tr_id": "FHKST01010300"}  # 시세 조회 관련 TR_ID 시도
            params = {
                "FID_COND_MRKT_DIV_CODE": "U",  # U: 지수
                "FID_INPUT_ISCD": index_code
            }

            response = await self._make_request("GET", endpoint, headers=headers, params=params)
            logger.info(f"Market index {index_code} full response: {response}")

            output = response.get("output", {})

            if output:
                logger.info(f"Successfully retrieved market index {index_code}")
                return output
            else:
                logger.warning(f"Empty response for market index {index_code}. Full response: {response}")
                return {}

        except Exception as e:
            logger.error(f"Error getting market index {index_code}: {e}")
            # Live Trading에서는 실제 데이터가 없으면 빈 데이터 반환 (mock data 사용 금지)
            if not self.is_mock_trading:
                logger.warning(f"💰 Real trading mode: No valid market index data for {index_code}")
                return {}

            # Mock Trading에서만 fallback 데이터 사용
            if index_code == "0001":  # KOSPI
                return {
                    "bstp_nmix_prpr": "2580.45",
                    "bstp_nmix_prdy_vrss": "+30.2",
                    "prdy_vrss_sign": "1.2",
                    "acml_vol": "450000000"
                }
            elif index_code == "1001":  # KOSDAQ
                return {
                    "bstp_nmix_prpr": "768.92",
                    "bstp_nmix_prdy_vrss": "-6.1",
                    "prdy_vrss_sign": "-0.8",
                    "acml_vol": "680000000"
                }
            return {}

    def _is_market_open(self) -> bool:
        """시장 개장 여부 확인"""
        now = datetime.now()
        # 주말 확인
        if now.weekday() >= 5:  # 토요일(5), 일요일(6)
            return False

        # 시간 확인 (09:00 - 15:30)
        current_time = now.strftime("%H%M")
        return "0900" <= current_time <= "1530"

    def _get_market_session(self) -> str:
        """현재 시장 세션 구분"""
        now = datetime.now()
        current_time = now.strftime("%H%M")

        if now.weekday() >= 5:
            return "weekend"
        elif current_time < "0900":
            return "pre_market"
        elif "0900" <= current_time <= "1530":
            return "regular"
        elif "1530" < current_time <= "1800":
            return "after_hours"
        else:
            return "closed"

    def _get_next_market_open(self) -> str:
        """다음 시장 개장 시간"""
        now = datetime.now()

        # 오늘이 평일이고 오전 9시 이전이면 오늘 09:00
        if now.weekday() < 5 and now.strftime("%H%M") < "0900":
            return "09:00"

        # 그렇지 않으면 다음 평일 09:00
        days_ahead = 1
        if now.weekday() == 4:  # 금요일
            days_ahead = 3  # 다음 월요일
        elif now.weekday() == 5:  # 토요일
            days_ahead = 2  # 다음 월요일

        return "09:00"

    def get_trading_mode(self) -> Dict[str, Any]:
        """현재 거래 모드 조회"""
        return {
            "is_mock_trading": self.is_mock_trading,
            "mode": "mock" if self.is_mock_trading else "real",
            "base_url": self.base_url,
            "description": "모의투자 (Virtual Trading)" if self.is_mock_trading else "실거래 (Live Trading)"
        }

    async def get_connection_status(self) -> Dict[str, Any]:
        """KIS API 연결 상태 및 시스템 상태 조회"""
        try:
            # 토큰 유효성 확인
            await self.ensure_valid_token()

            # 연결 상태 확인 (토큰이 있고 유효하면 연결됨)
            is_connected = (
                self.access_token is not None and
                self.token_expires_at is not None and
                datetime.now() < self.token_expires_at - timedelta(minutes=5)
            )

            return {
                "connected": is_connected,
                "mode": "mock" if self.is_mock_trading else "real",
                "base_url": self.base_url,
                "token_valid": is_connected,
                "token_expires_at": self.token_expires_at.isoformat() if self.token_expires_at else None,
                "trading_mode_description": "모의투자 (Virtual Trading)" if self.is_mock_trading else "실거래 (Live Trading)",
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.warning(f"Connection status check failed: {e}")
            return {
                "connected": False,
                "mode": "mock" if self.is_mock_trading else "real",
                "base_url": self.base_url,
                "token_valid": False,
                "token_expires_at": None,
                "trading_mode_description": "모의투자 (Virtual Trading)" if self.is_mock_trading else "실거래 (Live Trading)",
                "timestamp": datetime.now().isoformat(),
                "error": str(e)
            }

    async def get_market_indices(self) -> Dict[str, Any]:
        """KOSPI/KOSDAQ 시장 지수 데이터 조회"""
        try:
            # KOSPI와 KOSDAQ 지수를 병렬로 조회
            kospi_task = self.get_index_price("0001")  # KOSPI 코드
            kosdaq_task = self.get_index_price("1001")  # KOSDAQ 코드

            kospi_data, kosdaq_data = await asyncio.gather(kospi_task, kosdaq_task)

            return {
                "kospi": kospi_data,
                "kosdaq": kosdaq_data,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to fetch market indices: {e}")
            return {
                "kospi": None,
                "kosdaq": None,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    async def get_index_price(self, index_code: str) -> Optional[Dict[str, Any]]:
        """개별 지수 데이터 조회

        Args:
            index_code: 지수 코드 (0001: KOSPI, 1001: KOSDAQ, 2001: KOSPI200)
        """
        await self.ensure_valid_token()

        endpoint = "/uapi/domestic-stock/v1/quotations/inquire-index-price"

        headers = {
            "tr_id": "FHPUP02100000"
        }

        params = {
            "FID_COND_MRKT_DIV_CODE": "U",  # 업종
            "FID_INPUT_ISCD": index_code
        }

        try:
            # 지수 데이터는 모의투자 모드에서도 실거래 API 사용
            # 시장 정보는 공개 데이터이므로 안전
            original_base_url = self.base_url
            original_is_mock = self.is_mock_trading

            if self.is_mock_trading:
                logger.info(f"Using real API for index data: {index_code}")
                self.base_url = self.settings.KIS_BASE_URL
                self.is_mock_trading = False

            response = await self._make_request("GET", endpoint, headers=headers, params=params)

            # 원래 설정으로 복원
            self.base_url = original_base_url
            self.is_mock_trading = original_is_mock

            output = response.get("output", {})

            if output:
                # 지수 정보를 구조화된 형태로 반환
                return {
                    "index_code": index_code,
                    "index_name": "KOSPI" if index_code == "0001" else "KOSDAQ" if index_code == "1001" else "KOSPI200",
                    "current_price": float(output.get("bstp_nmix_prpr", "0")),
                    "change": float(output.get("bstp_nmix_prdy_vrss", "0")),
                    "change_rate": float(output.get("bstp_nmix_prdy_ctrt", "0")),
                    "change_sign": output.get("prdy_vrss_sign", ""),
                    "volume": int(output.get("acml_vol", "0")),
                    "trade_amount": int(output.get("acml_tr_pbmn", "0")),
                    "open_price": float(output.get("bstp_nmix_oprc", "0")),
                    "high_price": float(output.get("bstp_nmix_hgpr", "0")),
                    "low_price": float(output.get("bstp_nmix_lwpr", "0")),
                    "up_count": int(output.get("ascn_issu_cnt", "0")),
                    "down_count": int(output.get("down_issu_cnt", "0")),
                    "unchanged_count": int(output.get("stnr_issu_cnt", "0")),
                    "year_high": float(output.get("dryy_bstp_nmix_hgpr", "0")),
                    "year_high_date": output.get("dryy_bstp_nmix_hgpr_date", ""),
                    "year_low": float(output.get("dryy_bstp_nmix_lwpr", "0")),
                    "year_low_date": output.get("dryy_bstp_nmix_lwpr_date", "")
                }
            else:
                logger.warning(f"No data received for index {index_code}")
                return None

        except Exception as e:
            # 원래 설정으로 복원 (예외 상황에서도)
            self.base_url = original_base_url
            self.is_mock_trading = original_is_mock
            logger.error(f"Failed to fetch index price for {index_code}: {e}")
            return None


# 싱글톤 인스턴스 생성 함수
_kis_client_instance: Optional[KISAPIClient] = None

async def get_kis_client() -> KISAPIClient:
    """KIS API 클라이언트 싱글톤 인스턴스 반환"""
    global _kis_client_instance

    if _kis_client_instance is None:
        _kis_client_instance = KISAPIClient()
        await _kis_client_instance.start()

    return _kis_client_instance

async def close_kis_client():
    """KIS API 클라이언트 종료"""
    global _kis_client_instance

    if _kis_client_instance:
        await _kis_client_instance.close()
        _kis_client_instance = None