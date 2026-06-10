import { StrictMode } from 'react'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { getDateKey } from './utils/date.js'

async function addTodo(user, text) {
  const todoInput = screen.getByRole('textbox', { name: '할 일' })
  await user.type(todoInput, text)
  await user.click(screen.getByRole('button', { name: '추가' }))
}

function renderPersistentApp() {
  return render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

function getSelectedDateKey() {
  const selectedDateButton = screen.getByRole('button', { pressed: true })
  return within(selectedDateButton)
    .getByRole('time')
    .getAttribute('datetime')
}

function getStoredTodos() {
  return JSON.parse(localStorage.getItem('my-tasks-todos'))
}

function getWeekDateKeys() {
  const weekView = screen.getByRole('region', { name: '주간 뷰' })
  return within(weekView)
    .getAllByRole('button')
    .map((button) => button.querySelector('time')?.getAttribute('datetime'))
    .filter(Boolean)
}

function getDateButton(dateKey) {
  const weekView = screen.getByRole('region', { name: '주간 뷰' })
  const dateButton = within(weekView)
    .getAllByRole('button')
    .find(
      (button) =>
        button.querySelector('time')?.getAttribute('datetime') === dateKey,
    )

  if (!dateButton) {
    throw new Error(`날짜 버튼을 찾을 수 없습니다: ${dateKey}`)
  }

  return dateButton
}

describe('Todo CRUD', () => {
  it('빈 상태에서 Todo를 추가하고 입력창을 초기화한다', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('할 일이 없습니다.')).toBeInTheDocument()

    await addTodo(user, 'React 상태 관리 학습')

    expect(screen.getByText('React 상태 관리 학습')).toBeInTheDocument()
    expect(screen.queryByText('할 일이 없습니다.')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '할 일' })).toHaveValue('')
  })

  it('Enter 키로 Todo를 추가한다', async () => {
    const user = userEvent.setup()
    render(<App />)

    const todoInput = screen.getByRole('textbox', { name: '할 일' })
    await user.type(todoInput, 'Enter로 추가{Enter}')

    expect(screen.getByText('Enter로 추가')).toBeInTheDocument()
    expect(todoInput).toHaveValue('')
  })

  it('한글 조합 중 Enter는 Todo 추가로 처리하지 않는다', () => {
    render(<App />)

    const todoInput = screen.getByRole('textbox', { name: '할 일' })
    fireEvent.change(todoInput, { target: { value: '조합 중' } })
    fireEvent.keyDown(todoInput, {
      key: 'Enter',
      code: 'Enter',
      isComposing: true,
    })

    expect(screen.queryByText('조합 중')).not.toBeInTheDocument()
    expect(todoInput).toHaveValue('조합 중')
  })

  it('Todo 입력 길이를 100자로 제한한다', async () => {
    const user = userEvent.setup()
    render(<App />)

    const todoInput = screen.getByRole('textbox', { name: '할 일' })
    await user.type(todoInput, '가'.repeat(101))

    expect(todoInput).toHaveValue('가'.repeat(100))
    expect(todoInput).toHaveAttribute('maxlength', '100')
  })

  it('공백 입력은 거부하고 유효한 입력이 시작되면 오류를 해제한다', async () => {
    const user = userEvent.setup()
    render(<App />)

    const todoInput = screen.getByRole('textbox', { name: '할 일' })
    await user.type(todoInput, '   ')
    await user.click(screen.getByRole('button', { name: '추가' }))

    expect(screen.getByRole('alert')).toHaveTextContent('할 일을 입력해주세요.')
    expect(todoInput).toHaveAttribute('aria-invalid', 'true')
    expect(todoInput).toHaveFocus()

    await user.type(todoInput, '새 할 일')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(todoInput).toHaveAttribute('aria-invalid', 'false')
  })

  it('Todo를 완료 상태로 토글한다', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTodo(user, '완료할 일')

    const checkbox = screen.getByRole('checkbox', {
      name: '완료로 표시: 완료할 일',
    })
    await user.click(checkbox)

    expect(checkbox).toBeChecked()
    expect(screen.getByText('완료할 일')).toHaveClass('todo-text')
    expect(checkbox.closest('li')).toHaveClass('is-completed')
  })

  it('Todo를 인라인으로 수정하고 Enter로 저장한다', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTodo(user, '수정 전')

    await user.click(screen.getByRole('button', { name: '수정: 수정 전' }))

    const editInput = screen.getByRole('textbox', { name: '할 일 수정' })
    expect(editInput).toHaveFocus()
    expect(editInput).toHaveValue('수정 전')
    expect(editInput.selectionStart).toBe(editInput.value.length)

    await user.clear(editInput)
    await user.type(editInput, '수정 후{Enter}')

    expect(screen.getByText('수정 후')).toBeInTheDocument()
    expect(
      screen.queryByRole('textbox', { name: '할 일 수정' }),
    ).not.toBeInTheDocument()
  })

  it('빈 편집값은 저장하지 않고 편집 모드와 포커스를 유지한다', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTodo(user, '유지할 내용')
    await user.click(screen.getByRole('button', { name: '수정: 유지할 내용' }))

    const editInput = screen.getByRole('textbox', { name: '할 일 수정' })
    await user.clear(editInput)
    await user.type(editInput, '   {Enter}')

    expect(screen.getByRole('alert')).toHaveTextContent('할 일을 입력해주세요.')
    expect(editInput).toHaveAttribute('aria-invalid', 'true')
    expect(editInput).toHaveFocus()
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument()
  })

  it('Escape 키로 편집을 취소하고 원래 텍스트를 유지한다', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTodo(user, '원래 텍스트')
    await user.click(screen.getByRole('button', { name: '수정: 원래 텍스트' }))

    const editInput = screen.getByRole('textbox', { name: '할 일 수정' })
    await user.clear(editInput)
    await user.type(editInput, '임시 텍스트{Escape}')

    expect(screen.getByText('원래 텍스트')).toBeInTheDocument()
    expect(screen.queryByText('임시 텍스트')).not.toBeInTheDocument()
  })

  it('한 번에 하나만 편집하고 다른 항목의 임시 변경은 취소한다', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTodo(user, '첫 번째')
    await addTodo(user, '두 번째')

    const listItems = screen.getAllByRole('listitem')
    await user.click(
      within(listItems[0]).getByRole('button', { name: '수정: 첫 번째' }),
    )
    const firstEditInput = screen.getByRole('textbox', { name: '할 일 수정' })
    await user.clear(firstEditInput)
    await user.type(firstEditInput, '저장하지 않은 변경')

    await user.click(
      within(listItems[1]).getByRole('button', { name: '수정: 두 번째' }),
    )

    expect(screen.getAllByRole('textbox', { name: '할 일 수정' })).toHaveLength(1)
    expect(screen.getByText('첫 번째')).toBeInTheDocument()
  })

  it('Todo를 삭제하고 마지막 항목 삭제 후 빈 상태를 표시한다', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTodo(user, '삭제할 일')

    await user.click(screen.getByRole('button', { name: '삭제: 삭제할 일' }))

    expect(screen.queryByText('삭제할 일')).not.toBeInTheDocument()
    expect(screen.getByText('할 일이 없습니다.')).toBeInTheDocument()
  })

  it('편집 중인 Todo를 삭제하면 편집 UI도 함께 제거한다', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTodo(user, '편집 중 삭제할 일')

    await user.click(
      screen.getByRole('button', { name: '수정: 편집 중 삭제할 일' }),
    )
    expect(
      screen.getByRole('textbox', { name: '할 일 수정' }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: '삭제: 편집 중 삭제할 일' }),
    )

    expect(
      screen.queryByRole('textbox', { name: '할 일 수정' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('편집 중 삭제할 일')).not.toBeInTheDocument()
  })
})

describe('Filter', () => {
  it('"진행 중" 탭은 완료되지 않은 Todo만 표시한다', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTodo(user, '미완료 항목')
    await addTodo(user, '완료 항목')

    await user.click(screen.getByRole('checkbox', { name: '완료로 표시: 완료 항목' }))
    await user.click(screen.getByRole('radio', { name: '진행 중' }))

    expect(screen.getByText('미완료 항목')).toBeInTheDocument()
    expect(screen.queryByText('완료 항목')).not.toBeInTheDocument()
  })

  it('"완료" 탭은 완료된 Todo만 표시한다', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTodo(user, '미완료 항목')
    await addTodo(user, '완료 항목')

    await user.click(screen.getByRole('checkbox', { name: '완료로 표시: 완료 항목' }))
    await user.click(screen.getByRole('radio', { name: '완료' }))

    expect(screen.queryByText('미완료 항목')).not.toBeInTheDocument()
    expect(screen.getByText('완료 항목')).toBeInTheDocument()
  })

  it('탭 전환 후 Todo를 추가해도 현재 필터가 유지된다', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTodo(user, '기존 항목')
    await user.click(screen.getByRole('checkbox', { name: '완료로 표시: 기존 항목' }))
    await user.click(screen.getByRole('radio', { name: '완료' }))

    await addTodo(user, '새 항목')

    expect(screen.queryByText('새 항목')).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '완료' })).toBeChecked()
  })

  it('필터 결과가 없을 때 "해당하는 할 일이 없습니다"를 표시한다', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTodo(user, '미완료 항목')

    await user.click(screen.getByRole('radio', { name: '완료' }))

    expect(screen.getByText('해당하는 할 일이 없습니다.')).toBeInTheDocument()
  })

  it('편집 중인 Todo를 토글하면 편집 상태가 종료된다', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTodo(user, '편집할 항목')

    await user.click(screen.getByRole('button', { name: '수정: 편집할 항목' }))
    expect(screen.getByRole('textbox', { name: '할 일 수정' })).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: '완료로 표시: 편집할 항목' }))

    expect(screen.queryByRole('textbox', { name: '할 일 수정' })).not.toBeInTheDocument()
  })
})

describe('Weekly view', () => {
  it('저장된 주의 월요일부터 일요일까지 7일과 선택 날짜를 표시한다', () => {
    localStorage.setItem('my-tasks-selected-date', '2026-06-10')
    localStorage.setItem('my-tasks-week-start', '2026-06-08')

    renderPersistentApp()

    expect(getWeekDateKeys()).toEqual([
      '2026-06-08',
      '2026-06-09',
      '2026-06-10',
      '2026-06-11',
      '2026-06-12',
      '2026-06-13',
      '2026-06-14',
    ])
    expect(
      screen.getByRole('button', { name: /2026년 6월 10일 수요일/ }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('날짜를 선택하면 해당 날짜 Todo만 표시하고 선택 날짜를 저장한다', async () => {
    localStorage.setItem(
      'my-tasks-todos',
      JSON.stringify([
        {
          id: 'wednesday-todo',
          text: '수요일 할 일',
          completed: false,
          date: '2026-06-10',
        },
        {
          id: 'thursday-todo',
          text: '목요일 할 일',
          completed: false,
          date: '2026-06-11',
        },
      ]),
    )
    localStorage.setItem('my-tasks-selected-date', '2026-06-10')
    localStorage.setItem('my-tasks-week-start', '2026-06-08')
    const user = userEvent.setup()

    renderPersistentApp()
    await user.click(getDateButton('2026-06-11'))

    expect(screen.queryByText('수요일 할 일')).not.toBeInTheDocument()
    expect(screen.getByText('목요일 할 일')).toBeInTheDocument()
    expect(getDateButton('2026-06-11')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await waitFor(() => {
      expect(localStorage.getItem('my-tasks-selected-date')).toBe(
        '2026-06-11',
      )
    })
  })

  it('주차 이동 시 날짜 목록과 선택 날짜를 7일씩 함께 이동한다', async () => {
    localStorage.setItem('my-tasks-selected-date', '2026-06-10')
    localStorage.setItem('my-tasks-week-start', '2026-06-08')
    const user = userEvent.setup()

    renderPersistentApp()
    await user.click(screen.getByRole('button', { name: '다음 주' }))

    expect(getWeekDateKeys()).toEqual([
      '2026-06-15',
      '2026-06-16',
      '2026-06-17',
      '2026-06-18',
      '2026-06-19',
      '2026-06-20',
      '2026-06-21',
    ])
    expect(getSelectedDateKey()).toBe('2026-06-17')

    await user.click(screen.getByRole('button', { name: '이전 주' }))

    expect(getWeekDateKeys()).toEqual([
      '2026-06-08',
      '2026-06-09',
      '2026-06-10',
      '2026-06-11',
      '2026-06-12',
      '2026-06-13',
      '2026-06-14',
    ])
    expect(getSelectedDateKey()).toBe('2026-06-10')
  })

  it('오늘 날짜를 화면과 접근성 이름에서 함께 구분한다', () => {
    render(<App />)

    const todayButton = getDateButton(getDateKey(new Date()))

    expect(within(todayButton).getByText('오늘')).toBeInTheDocument()
    expect(todayButton).toHaveAccessibleName(/오늘/)
    expect(todayButton).toHaveAttribute('aria-pressed', 'true')
  })

  it.each([
    [
      '같은 연도의 월 경계',
      '2027-03-31',
      '2027-03-29',
      '2027년 3월 29일 - 4월 4일',
    ],
    [
      '연도 경계',
      '2026-12-30',
      '2026-12-28',
      '2026년 12월 28일 - 2027년 1월 3일',
    ],
  ])(
    '%s를 포함하는 주간 범위를 명확하게 표시한다',
    (_, selectedDate, weekStartDate, expectedRange) => {
      localStorage.setItem('my-tasks-selected-date', selectedDate)
      localStorage.setItem('my-tasks-week-start', weekStartDate)

      renderPersistentApp()

      expect(screen.getByText(expectedRange)).toBeInTheDocument()
    },
  )

  it('날짜별 전체 Todo 개수를 표시하고 필터와 독립적으로 유지한다', async () => {
    localStorage.setItem(
      'my-tasks-todos',
      JSON.stringify([
        {
          id: 'active-wednesday',
          text: '수요일 진행 중',
          completed: false,
          date: '2026-06-10',
        },
        {
          id: 'completed-wednesday',
          text: '수요일 완료',
          completed: true,
          date: '2026-06-10',
        },
        {
          id: 'thursday',
          text: '목요일 할 일',
          completed: false,
          date: '2026-06-11',
        },
      ]),
    )
    localStorage.setItem('my-tasks-selected-date', '2026-06-10')
    localStorage.setItem('my-tasks-week-start', '2026-06-08')
    const user = userEvent.setup()

    renderPersistentApp()

    expect(getDateButton('2026-06-10')).toHaveAccessibleName(/할 일 2개/)
    expect(getDateButton('2026-06-11')).toHaveAccessibleName(/할 일 1개/)
    expect(getDateButton('2026-06-12')).toHaveAccessibleName(/할 일 0개/)
    expect(getDateButton('2026-06-12')).not.toHaveTextContent('0')

    await user.click(screen.getByRole('radio', { name: '완료' }))

    expect(screen.queryByText('수요일 진행 중')).not.toBeInTheDocument()
    expect(screen.getByText('수요일 완료')).toBeInTheDocument()
    expect(getDateButton('2026-06-10')).toHaveAccessibleName(/할 일 2개/)
  })

  it('Todo 추가와 삭제를 날짜 셀 개수에 즉시 반영한다', async () => {
    localStorage.setItem('my-tasks-selected-date', '2026-06-10')
    localStorage.setItem('my-tasks-week-start', '2026-06-08')
    const user = userEvent.setup()

    renderPersistentApp()
    expect(getDateButton('2026-06-10')).toHaveAccessibleName(/할 일 0개/)

    await addTodo(user, '개수에 반영할 일')
    expect(getDateButton('2026-06-10')).toHaveAccessibleName(/할 일 1개/)

    await user.click(
      screen.getByRole('button', { name: '삭제: 개수에 반영할 일' }),
    )
    expect(getDateButton('2026-06-10')).toHaveAccessibleName(/할 일 0개/)
  })

  it('Todo 완료 토글과 텍스트 수정은 날짜 셀 개수를 바꾸지 않는다', async () => {
    localStorage.setItem('my-tasks-selected-date', '2026-06-10')
    localStorage.setItem('my-tasks-week-start', '2026-06-08')
    const user = userEvent.setup()

    renderPersistentApp()
    await addTodo(user, '개수를 유지할 일')
    const dateButton = getDateButton('2026-06-10')
    expect(dateButton).toHaveAccessibleName(/할 일 1개/)

    await user.click(
      screen.getByRole('checkbox', { name: '완료로 표시: 개수를 유지할 일' }),
    )
    expect(getDateButton('2026-06-10')).toHaveAccessibleName(/할 일 1개/)

    await user.click(
      screen.getByRole('button', { name: '수정: 개수를 유지할 일' }),
    )
    const editInput = screen.getByRole('textbox', { name: '할 일 수정' })
    await user.clear(editInput)
    await user.type(editInput, '수정해도 같은 개수{Enter}')

    expect(screen.getByText('수정해도 같은 개수')).toBeInTheDocument()
    expect(getDateButton('2026-06-10')).toHaveAccessibleName(/할 일 1개/)
  })

  it('주 이동 결과와 해당 날짜 Todo를 저장하고 재마운트 후 복원한다', async () => {
    localStorage.setItem(
      'my-tasks-todos',
      JSON.stringify([
        {
          id: 'first-week',
          text: '첫 주 수요일',
          completed: false,
          date: '2026-06-10',
        },
        {
          id: 'next-week',
          text: '다음 주 수요일',
          completed: false,
          date: '2026-06-17',
        },
      ]),
    )
    localStorage.setItem('my-tasks-selected-date', '2026-06-10')
    localStorage.setItem('my-tasks-week-start', '2026-06-08')
    const user = userEvent.setup()
    const firstRender = renderPersistentApp()

    await user.click(screen.getByRole('button', { name: '다음 주' }))

    expect(screen.queryByText('첫 주 수요일')).not.toBeInTheDocument()
    expect(screen.getByText('다음 주 수요일')).toBeInTheDocument()
    await waitFor(() => {
      expect(localStorage.getItem('my-tasks-selected-date')).toBe(
        '2026-06-17',
      )
      expect(localStorage.getItem('my-tasks-week-start')).toBe('2026-06-15')
    })

    firstRender.unmount()
    renderPersistentApp()

    expect(getWeekDateKeys()[0]).toBe('2026-06-15')
    expect(getSelectedDateKey()).toBe('2026-06-17')
    expect(screen.getByText('다음 주 수요일')).toBeInTheDocument()
  })

  it.each([
    ['형식 오류', 'not-a-date'],
    ['실제 달력 날짜 아님', '2026-02-30'],
    ['월요일 아님', '2026-06-09'],
    ['선택 날짜와 다른 주', '2026-06-01'],
  ])('잘못된 주 시작값(%s)을 선택 날짜의 주로 교정한다', async (_, value) => {
    localStorage.setItem('my-tasks-selected-date', '2026-06-10')
    localStorage.setItem('my-tasks-week-start', value)

    renderPersistentApp()

    expect(getWeekDateKeys()[0]).toBe('2026-06-08')
    expect(getSelectedDateKey()).toBe('2026-06-10')
    await waitFor(() => {
      expect(localStorage.getItem('my-tasks-week-start')).toBe('2026-06-08')
    })
  })

  it('다른 날짜를 선택했다가 돌아와도 이전 편집 상태를 복원하지 않는다', async () => {
    localStorage.setItem(
      'my-tasks-todos',
      JSON.stringify([
        {
          id: 'editing-todo',
          text: '편집 중인 수요일 할 일',
          completed: false,
          date: '2026-06-10',
        },
      ]),
    )
    localStorage.setItem('my-tasks-selected-date', '2026-06-10')
    localStorage.setItem('my-tasks-week-start', '2026-06-08')
    const user = userEvent.setup()

    renderPersistentApp()
    await user.click(
      screen.getByRole('button', { name: '수정: 편집 중인 수요일 할 일' }),
    )
    await user.click(getDateButton('2026-06-11'))
    await user.click(getDateButton('2026-06-10'))

    expect(
      screen.queryByRole('textbox', { name: '할 일 수정' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('편집 중인 수요일 할 일')).toBeInTheDocument()
  })

  it('다른 주로 이동했다가 돌아와도 이전 편집 상태를 복원하지 않는다', async () => {
    localStorage.setItem(
      'my-tasks-todos',
      JSON.stringify([
        {
          id: 'editing-todo',
          text: '편집 중인 수요일 할 일',
          completed: false,
          date: '2026-06-10',
        },
      ]),
    )
    localStorage.setItem('my-tasks-selected-date', '2026-06-10')
    localStorage.setItem('my-tasks-week-start', '2026-06-08')
    const user = userEvent.setup()

    renderPersistentApp()
    await user.click(
      screen.getByRole('button', { name: '수정: 편집 중인 수요일 할 일' }),
    )
    await user.click(screen.getByRole('button', { name: '다음 주' }))
    await user.click(screen.getByRole('button', { name: '이전 주' }))

    expect(
      screen.queryByRole('textbox', { name: '할 일 수정' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('편집 중인 수요일 할 일')).toBeInTheDocument()
  })

  it('날짜 선택과 주 이동 후에도 현재 필터를 유지한다', async () => {
    localStorage.setItem('my-tasks-selected-date', '2026-06-10')
    localStorage.setItem('my-tasks-week-start', '2026-06-08')
    const user = userEvent.setup()

    renderPersistentApp()
    await user.click(screen.getByRole('radio', { name: '진행 중' }))
    await user.click(getDateButton('2026-06-11'))
    expect(screen.getByRole('radio', { name: '진행 중' })).toBeChecked()

    await user.click(screen.getByRole('button', { name: '다음 주' }))
    expect(screen.getByRole('radio', { name: '진행 중' })).toBeChecked()
  })
})

describe('LocalStorage 지속성', () => {
  it('저장된 Todo와 완료 상태를 초기 렌더에서 복원한다', () => {
    localStorage.setItem(
      'my-tasks-todos',
      JSON.stringify([
        {
          id: 'stored-todo',
          text: '저장된 할 일',
          completed: true,
          date: '2026-06-10',
        },
      ]),
    )
    localStorage.setItem('my-tasks-selected-date', '2026-06-10')

    renderPersistentApp()

    expect(screen.getByText('저장된 할 일')).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: '완료 취소: 저장된 할 일' }),
    ).toBeChecked()
  })

  it('Todo 추가 후 현재 상태를 자동 저장한다', async () => {
    const user = userEvent.setup()
    renderPersistentApp()
    const selectedDateKey = getSelectedDateKey()

    await addTodo(user, '자동 저장할 일')

    await waitFor(() => {
      const storedTodos = getStoredTodos()
      expect(storedTodos).toHaveLength(1)
      expect(storedTodos[0]).toMatchObject({
        text: '자동 저장할 일',
        completed: false,
        date: selectedDateKey,
      })
      expect(storedTodos[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  it('Todo 수정, 완료, 삭제 결과를 차례로 자동 저장한다', async () => {
    const user = userEvent.setup()
    renderPersistentApp()
    await addTodo(user, '변경 전')

    await waitFor(() => {
      expect(getStoredTodos()[0].text).toBe('변경 전')
    })

    await user.click(
      screen.getByRole('checkbox', { name: '완료로 표시: 변경 전' }),
    )

    await waitFor(() => {
      expect(getStoredTodos()[0].completed).toBe(true)
    })

    await user.click(screen.getByRole('button', { name: '수정: 변경 전' }))
    const editInput = screen.getByRole('textbox', { name: '할 일 수정' })
    await user.clear(editInput)
    await user.type(editInput, '변경 후{Enter}')

    await waitFor(() => {
      expect(getStoredTodos()[0].text).toBe('변경 후')
    })

    await user.click(screen.getByRole('button', { name: '삭제: 변경 후' }))

    await waitFor(() => {
      expect(getStoredTodos()).toEqual([])
    })
  })

  it('App을 언마운트한 뒤 다시 마운트해 Todo를 복원한다', async () => {
    const user = userEvent.setup()
    const firstRender = renderPersistentApp()
    await addTodo(user, '재마운트 후 복원')

    await waitFor(() => {
      expect(getStoredTodos()).toHaveLength(1)
    })

    firstRender.unmount()
    renderPersistentApp()

    expect(screen.getByText('재마운트 후 복원')).toBeInTheDocument()
  })

  it('입력 draft, 필터, 편집 상태는 재마운트 후 초기화한다', async () => {
    const user = userEvent.setup()
    const firstRender = renderPersistentApp()
    await addTodo(user, '일시 상태 확인')
    await user.click(screen.getByRole('radio', { name: '진행 중' }))
    await user.click(
      screen.getByRole('button', { name: '수정: 일시 상태 확인' }),
    )
    await user.type(screen.getByRole('textbox', { name: '할 일' }), '입력 중')

    firstRender.unmount()
    renderPersistentApp()

    expect(screen.getByRole('textbox', { name: '할 일' })).toHaveValue('')
    expect(screen.getByRole('radio', { name: '전체' })).toBeChecked()
    expect(
      screen.queryByRole('textbox', { name: '할 일 수정' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('일시 상태 확인')).toBeInTheDocument()
  })

  it('선택 날짜를 저장하고 재마운트 후 복원한다', async () => {
    localStorage.setItem('my-tasks-selected-date', '2026-06-10')
    localStorage.setItem('my-tasks-week-start', '2026-06-08')
    const user = userEvent.setup()
    const firstRender = renderPersistentApp()
    const expectedDateKey = '2026-06-11'

    await user.click(getDateButton(expectedDateKey))

    await waitFor(() => {
      expect(getSelectedDateKey()).toBe(expectedDateKey)
      expect(localStorage.getItem('my-tasks-selected-date')).toBe(
        expectedDateKey,
      )
    })

    firstRender.unmount()
    renderPersistentApp()

    expect(getSelectedDateKey()).toBe(expectedDateKey)
  })

  it('손상된 Todo JSON을 빈 배열로 복구하고 저장값을 교정한다', async () => {
    localStorage.setItem('my-tasks-todos', 'invalid json')

    expect(() => renderPersistentApp()).not.toThrow()
    expect(screen.getByText('할 일이 없습니다.')).toBeInTheDocument()

    await waitFor(() => {
      expect(localStorage.getItem('my-tasks-todos')).toBe('[]')
    })
  })

  it.each([
    ['null', 'null'],
    ['문자열', JSON.stringify('not an array')],
    ['객체', JSON.stringify({ id: 'not-an-array' })],
  ])('배열이 아닌 Todo JSON(%s)을 빈 목록으로 처리한다', async (_, value) => {
    localStorage.setItem('my-tasks-todos', value)

    renderPersistentApp()

    expect(screen.getByText('할 일이 없습니다.')).toBeInTheDocument()
    await waitFor(() => {
      expect(localStorage.getItem('my-tasks-todos')).toBe('[]')
    })
  })

  it('잘못된 Todo와 중복 ID를 제거하고 유효한 데이터만 정규화한다', async () => {
    const validTodos = [
      {
        id: 1,
        text: '  숫자 ID Todo  ',
        completed: false,
        date: '2026-06-10',
        ignored: '추가 필드',
      },
      {
        id: 'valid-id',
        text: '문자열 ID Todo',
        completed: true,
        date: '2026-06-10',
      },
    ]
    const invalidTodos = [
      {
        id: '',
        text: '빈 ID',
        completed: false,
        date: '2026-06-10',
      },
      {
        id: Number.MAX_SAFE_INTEGER + 1,
        text: '안전하지 않은 숫자 ID',
        completed: false,
        date: '2026-06-10',
      },
      {
        id: 'blank-text',
        text: '   ',
        completed: false,
        date: '2026-06-10',
      },
      {
        id: 'long-text',
        text: '가'.repeat(101),
        completed: false,
        date: '2026-06-10',
      },
      {
        id: 'invalid-completed',
        text: '완료 타입 오류',
        completed: 'false',
        date: '2026-06-10',
      },
      {
        id: 'missing-date',
        text: '날짜 없음',
        completed: false,
      },
      {
        id: 'invalid-date',
        text: '실제 달력 날짜 아님',
        completed: false,
        date: '2026-02-31',
      },
      {
        id: 'unsupported-date',
        text: '지원 연도 밖',
        completed: false,
        date: '0999-12-31',
      },
      {
        id: '1',
        text: '숫자 ID와 중복',
        completed: false,
        date: '2026-06-10',
      },
      {
        id: 'valid-id',
        text: '문자열 ID 중복',
        completed: false,
        date: '2026-06-10',
      },
    ]
    localStorage.setItem(
      'my-tasks-todos',
      JSON.stringify([...validTodos, ...invalidTodos]),
    )
    localStorage.setItem('my-tasks-selected-date', '2026-06-10')

    renderPersistentApp()

    expect(screen.getByText('숫자 ID Todo')).toBeInTheDocument()
    expect(screen.getByText('문자열 ID Todo')).toBeInTheDocument()
    expect(screen.queryByText('숫자 ID와 중복')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(getStoredTodos()).toEqual([
        {
          id: '1',
          text: '숫자 ID Todo',
          completed: false,
          date: '2026-06-10',
        },
        {
          id: 'valid-id',
          text: '문자열 ID Todo',
          completed: true,
          date: '2026-06-10',
        },
      ])
    })
  })

  it('잘못된 선택 날짜를 오늘 날짜로 복구하고 저장값을 교정한다', async () => {
    localStorage.setItem('my-tasks-selected-date', '2026-02-31')
    const todayBeforeRender = getDateKey(new Date())

    renderPersistentApp()

    const todayAfterRender = getDateKey(new Date())
    const restoredDateKey = getSelectedDateKey()
    expect([todayBeforeRender, todayAfterRender]).toContain(restoredDateKey)

    await waitFor(() => {
      expect(localStorage.getItem('my-tasks-selected-date')).toBe(
        restoredDateKey,
      )
    })
  })

  it('localStorage 쓰기가 실패해도 Todo와 날짜 UI 상태를 갱신한다', async () => {
    localStorage.setItem('my-tasks-selected-date', '2026-06-10')
    localStorage.setItem('my-tasks-week-start', '2026-06-08')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage write failed')
    })
    const user = userEvent.setup()

    expect(() => renderPersistentApp()).not.toThrow()
    await addTodo(user, '메모리에 유지할 일')

    expect(screen.getByText('메모리에 유지할 일')).toBeInTheDocument()

    await user.click(getDateButton('2026-06-11'))
    expect(getSelectedDateKey()).toBe('2026-06-11')

    await user.click(screen.getByRole('button', { name: '다음 주' }))
    expect(getSelectedDateKey()).toBe('2026-06-18')
  })

  it('복원한 선택 날짜에 해당하는 Todo만 표시한다', () => {
    localStorage.setItem(
      'my-tasks-todos',
      JSON.stringify([
        {
          id: 'selected-date-todo',
          text: '선택 날짜 Todo',
          completed: false,
          date: '2026-06-10',
        },
        {
          id: 'other-date-todo',
          text: '다른 날짜 Todo',
          completed: false,
          date: '2026-06-11',
        },
      ]),
    )
    localStorage.setItem('my-tasks-selected-date', '2026-06-10')

    renderPersistentApp()

    expect(screen.getByText('선택 날짜 Todo')).toBeInTheDocument()
    expect(screen.queryByText('다른 날짜 Todo')).not.toBeInTheDocument()
  })

  it('localStorage 읽기가 실패하면 빈 Todo와 오늘 날짜로 렌더링한다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage read failed')
    })
    const todayBeforeRender = getDateKey(new Date())

    expect(() => renderPersistentApp()).not.toThrow()

    const todayAfterRender = getDateKey(new Date())
    expect(screen.getByText('할 일이 없습니다.')).toBeInTheDocument()
    expect([todayBeforeRender, todayAfterRender]).toContain(
      getSelectedDateKey(),
    )
  })

  it.each([
    [
      '1000-01-01',
      '이전 주',
      '0999-12-30',
      ['0999-12-30', '0999-12-31'],
    ],
    [
      '9999-12-31',
      '다음 주',
      '9999-12-27',
      ['10000-01-01', '10000-01-02'],
    ],
  ])(
    '지원 날짜 경계 %s의 범위 밖 셀을 비활성화하고 주 이동을 막는다',
    async (
      boundaryDate,
      buttonName,
      expectedWeekStart,
      disabledDateKeys,
    ) => {
      localStorage.setItem('my-tasks-selected-date', boundaryDate)
      const user = userEvent.setup()
      renderPersistentApp()

      const initialWeekDateKeys = getWeekDateKeys()

      disabledDateKeys.forEach((dateKey) => {
        const disabledDateButton = getDateButton(dateKey)
        expect(disabledDateButton).toBeDisabled()
        expect(disabledDateButton).not.toHaveAccessibleName(/할 일/)
        expect(disabledDateButton).toHaveAccessibleName(/지원 범위 밖/)
      })

      await user.click(screen.getByRole('button', { name: buttonName }))

      expect(getWeekDateKeys()).toEqual(initialWeekDateKeys)
      expect(getSelectedDateKey()).toBe(boundaryDate)
      await waitFor(() => {
        expect(localStorage.getItem('my-tasks-selected-date')).toBe(
          boundaryDate,
        )
        expect(localStorage.getItem('my-tasks-week-start')).toBe(
          expectedWeekStart,
        )
      })
    },
  )
})
