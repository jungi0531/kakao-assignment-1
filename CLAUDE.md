# Project Rules — kakao-assignment-2

## 프로젝트 개요

`kakao-assignment-1`의 바닐라 JS todo 앱을 React 기반으로 마이그레이션하는 프로젝트.
참고 소스: `../kakao-assignment-1/index.html`, `style.css`, `app.js`

---

## 기술 스택 (고정)

| 항목 | 버전 |
|------|------|
| React | v18+ (현재 v19) |
| Vite | v5.x |
| Tailwind CSS | v4.x |
| 언어 | JavaScript (TypeScript 미사용) |
| 상태 지속 | Web Storage API (localStorage) |

---

## 디자인 토큰 (기존 컬러 그대로 유지)

```css
--color-primary:        #672be0
--color-primary-hover:  #7f47e8
--color-primary-active: #5120c4
--color-primary-bg:     #f0ebfd
--color-surface:        #ffffff
--color-background:     #f4f4f6
--color-border:         #e5e5ea
--color-text:           #1a1a1a
--color-text-secondary: #6e6e73
--color-text-muted:     #aeaeb2
--color-danger:         #ff3b30
--color-danger-bg:      #fff0ef
```

---

## 코드 작성 규칙

- **변수명·함수명**: 역할이 바로 드러나도록 명확하게 작성 (`handleAddTodo`, `getFilteredTodos` 등)
- **주석**: 동작 방식을 이해할 수 있도록 로직 단위로 추가 (단순 반복 서술 제외)
- **불변성**: 상태는 항상 새 객체/배열로 교체, 직접 수정 금지
- **파일 크기**: 컴포넌트 파일은 200–400줄 유지, 800줄 초과 금지
- **Best Practices**: 코드 작성 시 해당 기능 구현을 위해 임시 방편적인 방법은 지양하고 최적의 방법을 고민하여 작성할 것 (예: 상태 관리, 이벤트 핸들링, 렌더링 최적화 등), 만약 기능 구현 과정에서 목표 기능 구현을 위해 임시 방편적인 방법이 필요하다고 판단되는 경우, 해당 부분에 대한 설명과 함께 주석으로 명확히 표시할 것

---

## 응답 형식 규칙

- 기능을 추가하거나 수정할 때 → **변경된 파일의 전체 코드를 파일별로** 보여줄 것
- 작업 완료 후 → **구현한 기능을 체크리스트로** 정리해서 답변할 것
