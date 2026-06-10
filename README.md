# Kakao Assignment 2

Vanilla JavaScript Todo 앱을 React 함수 컴포넌트 구조로 마이그레이션한
카카오테크 캠퍼스 프리코스 과제입니다.

## 주요 기능

- Todo 생성, 조회, 인라인 수정, 완료 토글, 삭제
- 전체, 진행 중, 완료 상태 필터
- 선택 날짜별 Todo 조회와 생성
- 월요일부터 일요일까지 표시하는 주간 뷰
- 날짜별 전체 Todo 개수 표시
- Todo, 선택 날짜, 선택 주차의 localStorage 저장 및 복원
- 손상된 저장 데이터와 지원 날짜 경계 처리

## 기술 스택

- React 19
- Vite 5
- Tailwind CSS 4
- JavaScript
- Web Storage API
- Vitest, Testing Library

## 실행 방법

```bash
npm install
npm run dev
```

## 검증

```bash
npm test
npm run lint
npm run build
```

현재 사용자 동작과 저장 예외를 검증하는 자동화 테스트 51개가 포함되어 있습니다.

기능별 마이그레이션 명세와 학습 기록은 [`docs/`](./docs)에서 확인할 수 있습니다.
