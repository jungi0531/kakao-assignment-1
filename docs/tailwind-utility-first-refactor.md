# Tailwind CSS 유틸리티 퍼스트 리팩토링 프롬프트

React todo 앱의 스타일링 방식을 CSS 클래스 추상화에서 Tailwind CSS v4 유틸리티 퍼스트 방식으로 리팩토링해줘.

## 프로젝트 환경

- Tailwind CSS v4 (tailwind.config.js 없음 — index.css의 @theme {}으로 설정)
- Vite + @tailwindcss/vite 플러그인
- React 19, JavaScript (TypeScript 미사용)
- 디자인 토큰은 src/index.css의 @theme {}에 정의되어 있으며, 아래와 같이 Tailwind 유틸리티로 바로 사용 가능:
  bg-primary, text-primary, border-primary, bg-primary-bg,
  bg-surface, bg-background, bg-danger, bg-danger-bg,
  text-text, text-text-secondary, text-text-muted,
  text-danger, border-border

## 목표

src/App.css를 완전히 제거한다. 모든 스타일을 JSX의 className에 Tailwind 유틸리티 클래스로 인라인 적용한다.
src/index.css는 그대로 유지한다 (@import 'tailwindcss', @theme {}, @layer base {} 만 포함된 올바른 파일임).

## 제거 대상 파일

`src/App.css` — 이 파일의 모든 스타일을 인라인으로 옮긴 뒤 삭제한다.

## 변환 규칙

1. 모든 @apply 기반 유틸리티를 JSX의 className 인라인으로 옮긴다.

2. :hover / :active / :focus-visible / :checked 상태는 Tailwind 수정자로 표현한다.
   - aria-invalid="true"일 때의 스타일은 `aria-[invalid=true]:` 수정자로 표현한다.
   - 예: `aria-[invalid=true]:border-danger aria-[invalid=true]:shadow-[0_0_0_3px_rgb(255_59_48/12%)]`

3. 커스텀 box-shadow, transform 등은 임의값(arbitrary value)으로 표현한다.
   - 예: `shadow-[0_0_0_3px_rgb(103_43_224/12%)]` `focus-visible:shadow-[0_0_0_3px_rgb(103_43_224/30%)]`

4. 동적 상태는 템플릿 리터럴 또는 clsx로 조건부 클래스 처리한다.
   - `todo.completed` 조건: li에 `opacity-60`, span(todo-text)에 `text-text-muted line-through`를 각각 조건부로 추가한다.
     부모 클래스가 아닌 각 해당 요소에 직접 적용해야 한다.
   - `isEditing` 조건: li의 `items-center`를 `isEditing ? 'items-start' : 'items-center'`로 대체한다.
     CSS의 `.todo-item:has(.edit-wrapper)`는 isEditing prop으로 대체하고 CSS에 남기지 않는다.

5. 반응형 분기점은 Tailwind의 `max-[480px]:` 프리픽스로 표현한다.
   - 예: `max-[480px]:text-2xl` `max-[480px]:px-4` `max-[480px]:w-[calc(100%-34px)]` `max-[480px]:ml-[34px] max-[480px]:w-full`

6. focus-visible 공유 선택자(`.add-button:focus-visible, .action-button:focus-visible, .todo-checkbox:focus-visible`)는
   각 요소의 className에 개별적으로 `focus-visible:outline-[3px_solid_rgb(103_43_224/30%)] focus-visible:outline-offset-2`를 추가한다.

7. ::placeholder 가상 요소는 `placeholder:` 수정자로 변환한다.
   - 예: `placeholder:text-text-muted`

8. 체크박스의 체크 표시는 별도 CSS 가상 요소 대신 checkbox와 형제 SVG를 사용한다.
   - checkbox에 `peer` 클래스를 적용한다.
   - SVG는 기본적으로 `opacity-0`, 체크 상태에서는 `peer-checked:opacity-100`으로 표시한다.
   - SVG는 `aria-hidden="true"`와 `pointer-events-none`을 적용해 checkbox의 의미와 클릭을 방해하지 않는다.

   `.todo-item:has(.edit-wrapper)` 관련 margin-top: 3px는 CSS에 남기지 않는다.
   TodoItem.jsx에 `isEditing` prop이 이미 있으므로 checkbox wrapper와 todo-actions에 `isEditing ? 'mt-[3px]' : ''` 조건부 클래스로 처리한다.

9. App.jsx에서 `import './App.css'`를 제거한다.

10. HTML 구조와 동작 로직은 변경하지 않는다. className만 수정한다.

## 수정 대상 파일

- src/App.jsx — className 인라인화, `import './App.css'` 제거
- src/components/TodoInput.jsx — className 인라인화
- src/components/TodoItem.jsx — className 인라인화, 체크 표시 SVG 추가
- src/components/TodoList.jsx — className 인라인화
- src/App.css → 삭제
- src/components/TodoItem.css → 삭제
