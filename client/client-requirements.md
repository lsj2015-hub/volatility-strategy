# 클라이언트 (Frontend) 개발 요구사항

## 📋 개요
Next.js + TypeScript + Tailwind CSS + shadcn/ui를 사용한 거래 전략 관리 웹 애플리케이션

## 🎯 핵심 기능

### 1. 대시보드 (메인 화면)
- **일일 운영 스케줄 표시**
  - Day 1 (매수일): 15:30~18:00 진행 상황
  - Day 2 (매도일): 09:00~15:30 진행 상황
- **현재 포지션 현황**
  - 보유 종목 리스트
  - 실시간 손익 현황
  - 포지션별 목표가/손절가 표시
- **오늘의 성과 요약**
  - 승률, 수익률, 매매 횟수

### 2. 종목 필터링 관리 페이지 (15:30-16:00)

#### 2.1 필터링 조건 설정
```typescript
interface FilterConditions {
  volume_multiplier: number;        // 거래량 배수 (1.5~5.0)
  late_session_momentum: number;    // 후반부 상승률 (0.5~3%)
  late_session_volume_ratio: number; // 후반부 거래량 비중 (10~25%)
  strength_threshold: number;       // 체결강도 (105~130)
  relative_return_vs_market: number; // 시장 대비 수익률 (1~3%)
  price_vs_vwap: number;           // VWAP 대비 비율 (101~105%)
}
```

#### 2.2 필터링 결과 화면
- **종목 리스트 테이블**
  - 종목명, 점수, 상대수익률, 체결강도, 거래량배수
  - 점수순 정렬
  - 선택 체크박스
- **시스템 권장 구성안**
  - 보수적/균형형/공격적 프리셋
  - 종목별 추천 배분 비율

#### 2.3 동적 조건 조정 인터페이스
```typescript
interface AdjustmentOptions {
  trigger: 'insufficient' | 'excessive' | 'manual';
  level: '1단계' | '2단계' | '3단계' | '강화';
  adjustments: Partial<FilterConditions>;
}
```
- **조정 트리거 상황 표시**
  - 후보 부족 (0~2개) → 완화 옵션
  - 후보 과다 (20개+) → 강화 옵션
- **실시간 조정 UI**
  - 현재값 vs 조정값 비교 테이블
  - 1/2/3단계 완화, 수동 조정 버튼
  - 조정 후 즉시 재필터링 실행

### 3. 포트폴리오 구성 페이지 (15:35-16:00)

#### 3.1 종목 선택 인터페이스
- **필터링 통과 종목 카드 레이아웃**
- **사용자 입력 폼**
  ```typescript
  interface PortfolioConfig {
    selected_stocks: string[];
    total_investment: number;
    allocation_method: '균등' | '가중' | '수동';
    stock_allocations: Record<string, number>;
  }
  ```

#### 3.2 배분 계산기
- 총 투자금액 입력
- 종목별 배분 비율 슬라이더/입력
- 실시간 배분 금액 계산 표시

### 4. 시간외 거래 모니터링 (16:00-17:40)

#### 4.1 실시간 모니터링 대시보드
- **30분 단위 체크 (16:00, 16:30, 17:00, 17:30)**
- **선택 종목 현황 테이블**
  ```typescript
  interface AfterHoursStatus {
    symbol: string;
    regular_close: number;
    after_hours_price: number;
    change_percent: number;
    buy_status: '완료' | '진입' | '대기';
    threshold: number;
  }
  ```

#### 4.2 시간외 동적 조정
- **조건 미달시 조정 옵션**
  - 임계값 하향 조정 (2% → 1.5% → 1.0%)
  - 백업 종목 리스트 활용
- **실시간 알림 시스템**
  - 매수 조건 만족시 즉시 알림
  - 포지션 현황 업데이트

### 5. 매도 관리 페이지 (Day 2)

#### 5.1 시간대별 목표가 관리
```typescript
interface ExitStrategy {
  time_slot: '09:00-13:00' | '13:00-15:00' | '15:00-15:20' | '15:20-15:30';
  take_profit: number;
  stop_loss: number;
  current_prices: Record<string, number>;
  target_reached: Record<string, boolean>;
}
```

#### 5.2 실시간 손익 모니터링
- **포지션별 현재가/손익률 표시**
- **목표가 달성 알림**
- **강제 청산 카운트다운 (15:20-15:30)**

### 6. 설정 및 관리

#### 6.1 프리셋 관리
- **보수적/균형형/공격적 설정**
- **사용자 커스텀 프리셋 저장/로드**

#### 6.2 성과 분석
- **일별/주별/월별 성과 리포트**
- **승률, 평균 수익률, 최대 드로우다운**
- **전략 효과성 분석 차트**

## 🎨 UI/UX 요구사항

### 디자인 시스템
- **shadcn/ui 컴포넌트 활용**
- **실시간 데이터 표시용 차트 (recharts 등)**
- **반응형 레이아웃 (모바일 대응)**

### 실시간 업데이트
- **WebSocket 연결 상태 표시**
- **자동 새로고침 주기 설정**
- **오프라인 상태 처리**

### 알림 시스템
- **브라우저 알림 (매수/매도 신호)**
- **중요 이벤트 토스트 알림**
- **알림 설정 관리**

## 📱 페이지 구조

```
/                          # 대시보드 (메인)
/filtering                 # 종목 필터링 (Day 1)
/portfolio                 # 포트폴리오 구성 (Day 1)
/monitoring               # 시간외 모니터링 (Day 1)
/trading                  # 매도 관리 (Day 2)
/settings                 # 설정 관리
/analytics               # 성과 분석
```

## 🔧 기술적 요구사항

### 상태 관리
- **Zustand 또는 Redux Toolkit**
- **실시간 데이터 상태 동기화**
- **설정값 로컬 스토리지 저장**

### API 통신
- **FastAPI 백엔드와 REST API 통신**
- **WebSocket을 통한 실시간 데이터 수신**
- **에러 처리 및 재연결 로직**

### 데이터 검증
- **입력값 검증 (zod 스키마)**
- **실시간 데이터 무결성 검사**
- **사용자 입력 제한 및 가이드**

## 🚀 개발 우선순위

1. **Phase 1**: 기본 레이아웃 및 대시보드
2. **Phase 2**: 종목 필터링 및 포트폴리오 구성
3. **Phase 3**: 시간외 모니터링 실시간 기능
4. **Phase 4**: 매도 관리 및 알림 시스템
5. **Phase 5**: 성과 분석 및 고도화