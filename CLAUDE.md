# CLAUDE.md

"For this project, the frontend will be developed using Next.js and the backend with FastAPI. For real-time stock data, we will use the KIS Open API."

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a volatility trading strategy implementation project consisting of:

- **Frontend**: Next.js React application with TypeScript and Tailwind CSS (located in `client/`),and using shadcn.
- **Backend**: Python server for trading strategy execution (located in `server/`)
- **Strategy**: Korean momentum-based day trading strategy documented in `strategy.md`

The trading strategy focuses on:
- Day 1: Stock filtering based on momentum indicators and after-hours trading entry
- Day 2: Time-based exit strategy with profit/loss targets
- Dynamic condition adjustment based on market conditions
- Integration with KIS Open API for Korean stock market trading

## Development Commands

### Frontend (Next.js)
Navigate to `client/` directory first:

```bash
cd client
npm run dev          # Start development server with Turbopack
npm run build        # Build for production with Turbopack
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Backend (Python)
Navigate to `server/` directory:

```bash
cd server
source venv/bin/activate           # Activate virtual environment
uvicorn main:app --reload --port 8001  # Start FastAPI server with auto-reload
python main.py                    # Alternative: Start server directly
```

## Architecture

### Frontend (`client/`)
- **Framework**: Next.js 15.5.3 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **State Management**: Zustand for global state (trading mode, settings, data)
- **Trading Mode**: Real-time toggle between mock/real trading with header display
- **Real-time**: WebSocket connection to FastAPI backend
- **Key files**:
  - `src/app/layout.tsx` - Root layout with font configuration
  - `src/app/page.tsx` - Main dashboard
  - `src/app/globals.css` - Global styles with Tailwind
  - `src/lib/` - Utilities, API clients, and types
  - `src/components/` - Reusable UI components
  - `src/stores/` - Zustand state management
  - `src/types/` - TypeScript type definitions (centralized)

### Backend (`server/`)
- **Framework**: FastAPI + Python with virtual environment
- **Purpose**: Trading strategy execution and KIS API integration
- **Architecture**: Clean modular structure without database (file-based storage)
- **Trading Mode**: Dynamic switching between mock/real trading with runtime configuration
- **Key components**:
  - `main.py` - FastAPI application entry point
  - `config.py` - Settings management with Pydantic
  - `app/services/` - KIS API client and business services
  - `app/core/` - Trading strategy logic (filtering, monitoring, execution)
  - `app/api/endpoints/` - REST API endpoints
  - `app/models/` - Pydantic data models
  - `app/schemas/` - API request/response schemas (centralized)
  - `data/` - JSON file storage for configuration and state

### Strategy Implementation
The `strategy.md` file contains detailed specifications for:
- Stock filtering conditions with configurable parameters
- Time-based monitoring and execution schedules
- Dynamic condition adjustment algorithms
- Risk management and exit strategies
- Implementation checklist for KIS Open API integration

## Development Guidelines

- Frontend uses TypeScript with strict type checking
- ESLint configured with Next.js and TypeScript rules
- Path aliases configured: `@/*` maps to `./src/*`
- Turbopack enabled for faster development builds
- Follow Next.js App Router conventions for new features

### Type Management Guidelines

**Frontend Types (`client/src/types/`)**:
- **ALWAYS** store new TypeScript types in `src/types/` directory
- **File naming**: Use descriptive names like `api.ts`, `trading.ts`, `portfolio.ts`
- **Export structure**: Export all types from `src/types/index.ts` for easy imports
- **Shared types**: Types used across multiple components MUST be centralized here
- **Import pattern**: `import { StockData, FilterConditions } from '@/types'`

**Backend Schemas (`server/app/schemas/`)**:
- **ALWAYS** store new Pydantic schemas in `app/schemas/` directory
- **File naming**: Use descriptive names like `stock.py`, `trading.py`, `portfolio.py`
- **Export structure**: Export all schemas from `app/schemas/__init__.py`
- **Shared schemas**: Request/response schemas MUST be centralized here
- **Import pattern**: `from app.schemas import StockDataSchema, FilterConditionsSchema`

**Type Synchronization**:
- Keep client types and server schemas synchronized for API communication
- Use consistent naming between frontend types and backend schemas
- Document any type differences in comments when necessary

## Key Configuration Files

- `client/package.json` - Frontend dependencies and scripts
- `client/tsconfig.json` - TypeScript configuration with path aliases
- `client/eslint.config.mjs` - ESLint rules for Next.js and TypeScript
- `client/next.config.ts` - Next.js configuration
- `server/requirements.txt` - Python dependencies
- `server/.env` - Environment variables (KIS API keys, etc.)
- `server/config.py` - Centralized configuration management

When developing trading strategy features, reference the detailed specifications in `strategy.md` for implementation requirements and parameter configurations.

## Trading Mode Management

### Overview
The system supports dynamic switching between mock trading (모의투자) and real trading (실거래) environments with full backend logic separation and frontend visual indicators.

### Key Features
- **Runtime Mode Switching**: Change between mock/real trading without restart
- **Visual Indicators**: Header displays current mode with color-coded badges
- **Backend Logic Separation**: KIS API automatically routes to appropriate endpoints
- **State Persistence**: Trading mode preferences saved in browser storage
- **Safety First**: Defaults to mock trading for development safety

### Implementation Details

**Backend Components:**
- **API Endpoints**: `/api/trading-mode/status` and `/api/trading-mode/change`
- **Dynamic Configuration**: `KISAPIClient` switches base URLs based on mode
- **Safety Measures**: Separate mock/real API credentials and endpoints
- **Mode Validation**: Real-time mode status and error handling

**Frontend Components:**
- **TradingModeToggle**: Interactive switch component in header
- **Zustand Store**: Global state management with persistence
- **Type Safety**: Complete TypeScript types for trading mode data
- **Error Handling**: Comprehensive error states and retry logic

**File Locations:**
- Backend: `app/api/endpoints/trading_mode.py`, `app/services/kis_api.py`
- Frontend: `src/components/layout/TradingModeToggle.tsx`, `src/stores/trading-mode.ts`
- Types: `src/types/trading.ts` (TradingModeData, TradingModeRequest)

### Configuration
```bash
# Environment Variables (server/.env)
KIS_MOCK_TRADING=true                                    # Default to mock trading
KIS_MOCK_BASE_URL=https://openapivts.koreainvestment.com:29443  # Mock API URL
KIS_BASE_URL=https://openapi.koreainvestment.com:9443   # Real API URL
```

### API Usage
```bash
# Get current trading mode
GET /api/trading-mode/status

# Switch to real trading
POST /api/trading-mode/change
{"is_mock": false}

# Switch to mock trading
POST /api/trading-mode/change
{"is_mock": true}
```

## KIS Open API 토큰 관리 가이드

### 🔑 토큰 재사용 원칙

**⚠️ 중요: 모든 KIS API 로직에서 반드시 적용해야 할 토큰 관리 방법**

### 토큰 확인 순서 (MUST FOLLOW)
1. **기존 메모리 토큰 확인**: `self.access_token`이 유효한지 먼저 검증
2. **저장된 토큰 재로드**: `token_storage.load_token()`으로 파일에서 토큰 다시 확인
3. **유효성 검증**: 5분 여유를 두고 만료 시간 검사
4. **최후 수단**: 위 모든 방법이 실패할 때만 새 토큰 요청

### 핵심 구현 패턴
```python
async def ensure_valid_token(self):
    """KIS API 토큰 관리 표준 패턴 - 모든 KIS API 로직에 적용 필수"""

    # 1. 기존 토큰이 여전히 유효한지 확인
    if (self.access_token is not None and
        self.token_expires_at is not None and
        datetime.now() < self.token_expires_at - timedelta(minutes=5)):
        logger.debug("Using existing valid token")
        return

    # 2. 저장된 토큰 다시 확인 (서버 재시작 등으로 메모리 손실된 경우)
    await self.load_stored_token()

    # 3. 로드된 토큰이 유효한지 확인
    if (self.access_token is not None and
        self.token_expires_at is not None and
        datetime.now() < self.token_expires_at - timedelta(minutes=5)):
        logger.info("Loaded valid token from storage")
        return

    # 4. 새 토큰 발급 (최후의 수단)
    logger.info("Need to request new token")
    await self.get_access_token()
```

### KIS API 제한 에러 처리
```python
# 403 에러 + "1분당 1회" 메시지 시 처리 방법
if response.status == 403 and "1분당 1회" in error_text:
    logger.warning("KIS API token request rate limited (1 per minute). Using fallback.")

    # 기존 저장된 토큰을 유효성 검사 없이 사용
    token_data = token_storage.load_token()
    if token_data and token_data.get("access_token"):
        logger.info("Using stored token despite possible expiry due to rate limit")
        self.access_token = token_data.get("access_token")
        # ... 토큰 설정
        return self.access_token
```

### Trading Mode 변경 시 주의사항
```python
def set_trading_mode(self, is_mock: bool) -> None:
    """Trading mode 변경 시 토큰 관리"""

    # 동일한 모드로 변경 시도 시 조기 반환 (불필요한 토큰 재발급 방지)
    if self.is_mock_trading == is_mock:
        logger.info(f"Trading mode unchanged: {new_mode}")
        return

    # 모드가 실제로 변경될 때만 토큰 재설정
    # ...
```

### 필수 적용 대상
- `app/services/kis_api.py`: 모든 KIS API 호출 메서드
- `app/core/filtering/`: 주식 필터링 로직
- `app/core/trading/`: 매매 실행 로직
- `app/core/monitoring/`: 실시간 모니터링 로직
- 향후 추가될 모든 KIS API 관련 서비스

### 토큰 파일 위치
- **저장 경로**: `server/data/tokens/kis_token.json`
- **자동 생성**: 토큰 요청 성공 시 자동 저장
- **수동 관리 금지**: 토큰 파일을 직접 수정하지 말 것

### 성능 최적화 효과
- **토큰 재사용률**: 24시간 → 95%+ 재사용
- **API 호출 감소**: 불필요한 토큰 요청 90% 감소
- **에러 내성**: KIS API 제한 에러 시에도 서비스 지속 가능

## Frontend Implementation Plan

### Phase 1: Foundation & Setup
- [x] **Next.js Project Setup** (completed)
  - [x] Next.js 15.5.3 with App Router initialized
  - [x] TypeScript configuration with strict mode
  - [x] Tailwind CSS v4 setup
  - [x] Basic layout and routing structure

- [x] **Project Dependencies** (`client/package.json`)
  - [x] Add shadcn/ui components
  - [x] Install Zustand for state management
  - [x] Add date/time utilities (date-fns)
  - [x] Install chart library (recharts)
  - [x] Add form validation (zod + react-hook-form)

- [x] **Base Components** (`src/components/ui/`)
  - [x] shadcn/ui component setup (alert, badge, button, card, input, label, progress, select, separator, table)
  - [x] Layout components (`src/components/layout/` - Header, Sidebar, Footer, MainLayout)
  - [x] Custom trading-specific components foundation
  - [x] Loading and error state components

- [x] **API Client Setup** (`src/lib/api/`)
  - [x] FastAPI client configuration (`client.ts`)
  - [x] Stocks API client (`stocks.ts`)
  - [x] Portfolio API client (`portfolio.ts`)
  - [x] System API client (`system.ts`)
  - [x] Type-safe API response handling
  - [x] Error handling and retry logic
  - [x] Centralized API exports (`index.ts`)

- [x] **Type Definitions** (`src/types/`)
  - [x] Stock data types (`stock.ts` - price, volume, market info)
  - [x] Trading session types (`trading.ts` - status, phase, configuration)
  - [x] Portfolio types (`portfolio.ts` - positions, PnL, allocation)
  - [x] API request/response types (`api.ts`)
  - [x] WebSocket message types (`websocket.ts`)
  - [x] Centralized type exports (`index.ts`)

### Phase 2: Core Dashboard & Layout
- [x] **Main Dashboard** (`src/app/page.tsx`)
  - [x] Daily schedule timeline (Day 1 vs Day 2)
  - [x] Current session status display
  - [x] Real-time portfolio overview
  - [x] System status indicators
  - [x] Live API integration with refresh functionality
  - [x] Error handling and fallback data
  - [x] Real-time status indicators for API connections

- [x] **Navigation Structure** (`src/app/layout.tsx`)
  - [x] Main navigation menu
  - [x] Page routing setup (`/filtering`, `/portfolio`, `/monitoring`, etc.)
  - [x] Responsive layout for mobile/desktop
  - [x] Real-time connection status

- [x] **State Management** (`src/hooks/`)
  - [x] Custom React hooks for data management (`useDashboardData`)
  - [x] Real-time data fetching and caching
  - [x] Error state management
  - [x] Auto-refresh functionality (30-second intervals)
  - [x] Loading state indicators

### Phase 2.5: Trading Mode Management
- [x] **Trading Mode Toggle** (`src/components/layout/TradingModeToggle.tsx`)
  - [x] Interactive switch component with visual indicators
  - [x] Real-time mode switching functionality
  - [x] Error handling and retry logic
  - [x] Loading states and confirmation feedback

- [x] **Global State Management** (`src/stores/trading-mode.ts`)
  - [x] Zustand store for trading mode data
  - [x] Persistent storage of mode preferences
  - [x] API integration for mode switching
  - [x] Error state and loading management

- [x] **Header Integration** (`src/components/layout/Header.tsx`)
  - [x] Trading mode display in header
  - [x] Color-coded mode indicators (mock=blue, real=red)
  - [x] Connection status indicators
  - [x] Responsive layout for mobile/desktop

- [x] **Type Definitions** (`src/types/trading.ts`)
  - [x] TradingModeData interface
  - [x] TradingModeRequest interface
  - [x] API response types
  - [x] Integration with existing trading types

### Phase 3: Stock Filtering Interface (Day 1: 15:30-16:00)
- [x] **Filtering Page** (`src/app/filtering/page.tsx`)
  - [x] Filtering conditions form
  - [x] Real-time condition adjustment interface
  - [x] Filtered stocks results table
  - [x] Dynamic condition suggestions

- [x] **Condition Controls** (`src/components/filtering/`)
  - [x] Slider components for numeric conditions
  - [x] Toggle switches for boolean filters
  - [x] Preset condition buttons (conservative/balanced/aggressive)
  - [x] Custom condition builder
  - [x] Advanced momentum sliders (advanced-momentum-sliders.tsx) - **FIXED: Display issue resolved**

- [x] **Results Display** (`src/components/filtering/`)
  - [x] Sortable stock results table
  - [x] Stock scoring visualization
  - [x] Selection checkboxes for portfolio building
  - [x] Quick stats and summary cards

### Phase 4: Portfolio Management (Day 1: 15:35-16:00)
- [x] **Portfolio Builder** (`src/app/portfolio/page.tsx`)
  - [x] Selected stocks overview
  - [x] Investment amount allocation
  - [x] Risk assessment display
  - [x] Portfolio optimization suggestions

- [x] **Allocation Controls** (`src/components/portfolio/`)
  - [x] Total investment amount input
  - [x] Individual stock allocation sliders
  - [x] Equal/weighted/custom distribution options
  - [x] Real-time allocation calculation
  - [x] Custom allocation with automatic remainder distribution

- [x] **Portfolio Validation** (`src/components/portfolio/`)
  - [x] Risk level indicators
  - [x] Diversification analysis
  - [x] Compliance checks (max positions, etc.)
  - [x] Confirmation dialog before submission

### Phase 5: Real-time Monitoring (Day 1: 16:00-17:40)
- [x] **After-hours Monitoring** (`src/app/monitoring/page.tsx`)
  - [x] 30-minute interval status updates
  - [x] Selected stocks price tracking
  - [x] Buy condition threshold visualization
  - [x] Automatic buy execution notifications
  - [x] Session start/stop controls with error handling
  - [x] Real-time monitoring status display

- [x] **Real-time Components** (`src/components/monitoring/`)
  - [x] Session control buttons (start/stop)
  - [x] Live monitoring status display
  - [x] Threshold adjustment interface
  - [x] Auto-adjustment strategy selection
  - [x] Performance statistics display
  - [x] Target stock monitoring table
  - [x] Error handling and loading states

- [x] **WebSocket Integration** (`src/lib/websocket/`)
  - [x] Real-time price data streaming
  - [x] Buy/sell signal notifications
  - [x] Connection status management
  - [x] Automatic reconnection logic
  - [x] Hybrid approach with polling fallback
  - [x] Adaptive polling based on WebSocket status
  - [x] Integration with existing monitoring hook
  - [x] Bidirectional communication with heartbeat

### Phase 6: Trading Management (Day 2: 09:00-15:30)
- [x] **Trading Dashboard** (`src/app/trading/page.tsx`)
  - [x] Current positions overview
  - [x] Real-time PnL calculation
  - [x] Time-based exit targets
  - [x] Force liquidation countdown

- [ ] **Position Tracking** (`src/components/trading/`)
  - [ ] Individual position cards
  - [ ] Profit/loss visualization
  - [ ] Target price indicators
  - [ ] Exit strategy timeline

- [ ] **Exit Management** (`src/components/trading/`)
  - [ ] Manual exit controls
  - [ ] Partial liquidation options
  - [ ] Emergency stop controls
  - [ ] Exit confirmation dialogs

### Phase 7: Analytics & Settings
- [x] **Performance Analytics** (`src/app/analytics/page.tsx`)
  - [x] Daily/weekly/monthly performance charts
  - [x] Win rate and return statistics
  - [x] Strategy effectiveness analysis
  - [x] Historical trade review

- [x] **Settings Management** (`src/app/settings/page.tsx`)
  - [x] Filtering condition presets
  - [x] Risk management parameters
  - [x] Notification preferences
  - [x] API connection settings

- [ ] **Charts & Visualization** (`src/components/charts/`)
  - [ ] Real-time price charts
  - [ ] Performance trend charts
  - [ ] Portfolio allocation pie charts
  - [ ] Historical performance graphs

## Frontend Development Commands (Updated)

### Client (Next.js)
Navigate to `client/` directory:

```bash
cd client
npm install                      # Install dependencies
npm run dev                      # Start development server
npm run build                    # Build for production
npm run start                    # Start production server
npm run lint                     # Run ESLint
```

### Component Development
```bash
npx shadcn-ui@latest add button  # Add shadcn/ui components
npm run type-check               # TypeScript type checking
npm run format                   # Format with Prettier
```

## Backend Implementation Plan

### Phase 1: Foundation & KIS API Integration
- [x] **FastAPI Project Setup** (completed)
  - [x] FastAPI application with basic structure
  - [x] Pydantic settings configuration
  - [x] Environment variable management
  - [x] Project directory structure created
  - [x] Requirements and dependencies defined

- [x] **KIS API Client Setup** (`app/services/kis_api.py`)
  - [x] OAuth 2.0 authentication implementation
  - [x] Token management (auto-renewal)
  - [x] Base HTTP client with error handling
  - [x] Rate limiting and retry logic
  - [x] Token storage utility (`app/utils/token_storage.py`)
  - [x] Configuration management (`app/utils/config.py`)
  - [x] Enhanced token reuse logic with fallback handling
  - [x] KIS API rate limit error handling (1분당 1회 제한)
  - [x] Trading mode change optimization (duplicate prevention)

- [x] **Data Models** (`app/models/`)
  - [x] Stock data models (price, volume, market info)
  - [x] Filtering condition models (implemented in schemas)
  - [x] Trading session models (implemented in schemas)
  - [x] Position and order models (implemented in schemas)

- [x] **API Schemas** (`app/schemas/`)
  - [x] Stock data schemas (request/response)
  - [x] Trading session schemas (configuration, status)
  - [x] Portfolio schemas (allocation, performance)
  - [x] WebSocket message schemas
  - [x] Error response schemas

- [x] **Basic Market Data API** (`app/services/kis_api.py`)
  - [x] All stocks basic info retrieval (15:30 market close)
  - [x] Individual stock detail lookup
  - [x] After-hours price monitoring
  - [x] Real-time price streaming setup

### Phase 2: Core Trading Logic
- [x] **Stock Filtering Engine** (`app/core/filtering/`)
  - [x] Filter condition processor (volume, momentum, strength, etc.)
  - [x] Stock scoring algorithm
  - [x] Dynamic condition adjustment logic
  - [x] Result ranking and selection

- [x] **API Endpoints** (`app/api/endpoints/`)
  - [x] `/api/auth` - KIS API authentication status
  - [x] `/api/stocks/filter` - Stock filtering execution
  - [x] `/api/stocks/adjust-conditions` - Dynamic condition adjustment
  - [x] `/api/portfolio/configure` - Portfolio setup
  - [x] `/api/stocks/*` - Complete stock data APIs
  - [x] `/api/portfolio/*` - Complete portfolio management APIs
  - [x] `/api/health` - System health check endpoint

### Phase 2.5: Trading Mode Management
- [x] **Trading Mode API** (`app/api/endpoints/trading_mode.py`)
  - [x] GET `/api/trading-mode/status` - Current mode status
  - [x] POST `/api/trading-mode/change` - Dynamic mode switching
  - [x] Request/response validation with Pydantic
  - [x] Error handling and status reporting

- [x] **KIS API Dynamic Configuration** (`app/services/kis_api.py`)
  - [x] Runtime mode switching capability
  - [x] Automatic URL routing (mock vs real endpoints)
  - [x] Mode validation and status reporting
  - [x] Backward compatibility with existing code

- [x] **Configuration Enhancement** (`app/utils/config.py`)
  - [x] Mock trading environment variables
  - [x] Separate base URLs for mock/real trading
  - [x] Default safety settings (mock trading enabled)
  - [x] Account configuration management

- [x] **Type Safety** (`app/schemas/trading.py`)
  - [x] TradingModeRequest schema
  - [x] Enhanced filtering schemas for advanced momentum
  - [x] API response validation
  - [x] Backward compatibility with existing schemas

### Phase 3: Trading Automation
- [x] **Core Module Structure** (`app/core/`)
  - [x] Trading module initialization (`app/core/trading/__init__.py`)
  - [x] Monitoring module initialization (`app/core/monitoring/__init__.py`)
  - [ ] Automated buy order execution
  - [ ] Position management system
  - [ ] Time-based exit strategy implementation
  - [ ] Force liquidation logic (15:20-15:30)

- [x] **Monitoring System** (`app/core/monitoring/`)
  - [x] Session manager implementation (`session_manager.py`)
  - [x] Threshold adjuster implementation (`threshold_adjuster.py`)
  - [x] Real-time after-hours monitoring (16:00-17:40)
  - [x] 30-minute interval checks framework
  - [x] Dynamic threshold adjustment algorithms
  - [x] API endpoints for monitoring control
  - [x] Session lifecycle management
  - [x] Error handling for "already running" sessions
  - [x] WebSocket real-time updates (monitoring status, price updates, buy signals)

### Phase 4: Scheduling & Automation
- [ ] **Task Scheduler** (`app/services/scheduler.py`)
  - [ ] Daily filtering at 15:30
  - [ ] After-hours monitoring schedule (16:00, 16:30, 17:00, 17:30)
  - [ ] Position monitoring during trading hours
  - [ ] Automatic liquidation scheduling

- [x] **WebSocket Implementation** (`app/api/websocket.py`)
  - [x] Real-time price updates
  - [x] Buy/sell signal notifications
  - [x] Portfolio status updates
  - [x] Client connection management
  - [x] Monitoring status broadcasts
  - [x] Heartbeat mechanism
  - [x] Connection state management
  - [x] Auto-generated client IDs
  - [x] Message type routing and handling

### Phase 5: Data Management & Analytics
- [x] **File Storage System** (`data/` directory structure)
  - [x] Token storage directory (`data/tokens/`)
  - [x] Cache directory (`data/cache/`)
  - [x] Logs directory (`data/logs/`)
  - [ ] JSON-based configuration management
  - [ ] Trading session state persistence
  - [ ] Daily performance logging
  - [ ] Settings backup and restore

- [ ] **Performance Analytics** (`app/services/analytics.py`)
  - [ ] Daily/weekly/monthly performance calculation
  - [ ] Win rate and average return metrics
  - [ ] Drawdown analysis
  - [ ] Strategy effectiveness reporting

## Development Commands (Updated)

### Backend (Python)
Navigate to `server/` directory:

```bash
cd server
source venv/bin/activate           # Activate virtual environment
pip install -r requirements.txt   # Install dependencies
python main.py                    # Start FastAPI server
# or
uvicorn main:app --reload         # Start with auto-reload
```

### Testing
```bash
pytest                           # Run all tests
pytest -v app/tests/            # Run with verbose output
black .                         # Format code
isort .                         # Sort imports
```

## Completion Tracking

Mark items with `[x]` when completed. Each major component should be tested individually before moving to the next phase.