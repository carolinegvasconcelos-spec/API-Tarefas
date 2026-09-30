import { useEffect, useMemo, useState } from 'react'
import './App.css'

type User = {
  id: number
  name: string
  username: string
  email: string
}

type Todo = {
  id: number
  userId: number
  title: string
  completed: boolean
}

const API_URL = 'https://jsonplaceholder.typicode.com'
const BRAZILIAN_USER_NAMES: Record<number, string> = {
  1: 'Ana Souza',
  2: 'João Silva',
  3: 'Maria Oliveira',
  4: 'Pedro Santos',
  5: 'Julia Costa',
  6: 'Lucas Pereira',
  7: 'Beatriz Rodrigues',
  8: 'Gabriel Almeida',
  9: 'Mariana Ferreira',
  10: 'Rafael Gomes',
}

function getDisplayName(user: User) {
  return BRAZILIAN_USER_NAMES[user.id] ?? user.name
}

function App() {
  const [users, setUsers] = useState<User[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [activeUserId, setActiveUserId] = useState<number | null>(null)
  const [busyTodoIds, setBusyTodoIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadData() {
      try {
        const [usersResponse, todosResponse] = await Promise.all([
          fetch(`${API_URL}/users`, { signal: controller.signal }),
          fetch(`${API_URL}/todos`, { signal: controller.signal }),
        ])

        if (!usersResponse.ok || !todosResponse.ok) {
          throw new Error('Não foi possível carregar os dados da API.')
        }

        const [usersData, todosData] = await Promise.all([
          usersResponse.json() as Promise<User[]>,
          todosResponse.json() as Promise<Todo[]>,
        ])

        setUsers(usersData)
        setTodos(todosData)
        setActiveUserId(usersData[0]?.id ?? null)
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          setLoadError('Não foi possível carregar as tarefas. Verifique sua conexão e tente novamente.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadData()
    return () => controller.abort()
  }, [])

  const activeUser = users.find((user) => user.id === activeUserId)
  const visibleTodos = useMemo(
    () => todos.filter((todo) => todo.userId === activeUserId),
    [todos, activeUserId],
  )
  const completedCount = visibleTodos.filter((todo) => todo.completed).length
  const pendingCount = visibleTodos.length - completedCount
  const progress = visibleTodos.length ? (completedCount / visibleTodos.length) * 100 : 0

  function setTodoBusy(todoId: number, busy: boolean) {
    setBusyTodoIds((current) => {
      const next = new Set(current)
      if (busy) next.add(todoId)
      else next.delete(todoId)
      return next
    })
  }

  async function toggleTodo(todo: Todo) {
    setTodoBusy(todo.id, true)
    setActionError('')

    try {
      const response = await fetch(`${API_URL}/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed }),
      })

      if (!response.ok) throw new Error('Falha ao atualizar tarefa')
      setTodos((current) => current.map((item) =>
        item.id === todo.id ? { ...item, completed: !todo.completed } : item,
      ))
    } catch {
      setActionError('Não foi possível atualizar a tarefa. Tente novamente.')
    } finally {
      setTodoBusy(todo.id, false)
    }
  }

  async function deleteTodo(todo: Todo) {
    setTodoBusy(todo.id, true)
    setActionError('')

    try {
      const response = await fetch(`${API_URL}/todos/${todo.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Falha ao excluir tarefa')
      setTodos((current) => current.filter((item) => item.id !== todo.id))
    } catch {
      setActionError('Não foi possível excluir a tarefa. Tente novamente.')
    } finally {
      setTodoBusy(todo.id, false)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Tarefas, início">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>tarefas<span className="brand-period">.</span></span>
        </a>
        <span className="topbar-label">ESPAÇO DE TRABALHO</span>
        <span className="connection"><span /> API conectada</span>
      </header>

      <section className="workspace" id="inicio">
        <div className="page-heading">
          <div>
            <p className="eyebrow">ORGANIZAÇÃO PESSOAL <span> / </span> 2026</p>
            <h1>Suas tarefas<span className="heading-period">.</span></h1>
            <p className="heading-copy">Tudo em ordem, uma tarefa de cada vez.</p>
          </div>
          <div className="total-indicator" aria-label={`${todos.length} tarefas no total`}>
            <span className="total-number">{loading ? '—' : String(todos.length).padStart(2, '0')}</span>
            <span className="total-caption">TAREFAS<br />NO TOTAL</span>
          </div>
        </div>

        <div className="people-section">
          <div className="section-label"><span>RESPONSÁVEIS</span><span>{users.length} USUÁRIOS</span></div>
          <div className="user-tabs" role="tablist" aria-label="Tarefas por usuário">
            {loading ? (
              <span className="tabs-loading">Carregando usuários...</span>
            ) : users.map((user, index) => {
              const isActive = user.id === activeUserId
              const userTodos = todos.filter((todo) => todo.userId === user.id)
              const displayName = getDisplayName(user)
              return (
                <button
                  className={`user-tab${isActive ? ' is-active' : ''}`}
                  key={user.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveUserId(user.id)}
                >
                  <span className="tab-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="tab-name">{displayName.split(' ')[0]}</span>
                  <span className="tab-count">{userTodos.length}</span>
                </button>
              )
            })}
          </div>
        </div>

        {loadError ? (
          <div className="message-state" role="alert">
            <span className="message-symbol">!</span>
            <div><strong>Ops, algo não saiu como esperado.</strong><p>{loadError}</p></div>
            <button className="retry-button" type="button" onClick={() => window.location.reload()}>Tentar novamente</button>
          </div>
        ) : loading ? (
          <div className="loading-state" aria-live="polite"><span className="loading-spinner" />Carregando tarefas...</div>
        ) : activeUser ? (
          <section className="task-section" role="tabpanel" aria-label={`Tarefas de ${getDisplayName(activeUser)}`}>
            <div className="user-summary">
              <div className="user-identity">
                <div className="avatar" aria-hidden="true">{getDisplayName(activeUser).split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
                <div>
                  <h2>{getDisplayName(activeUser)}</h2>
                  <p>@{activeUser.username}<span className="identity-divider">·</span>{activeUser.email}</p>
                </div>
              </div>
              <div className="task-stats">
                <span><b>{String(pendingCount).padStart(2, '0')}</b> pendentes</span>
                <span className="stats-divider" />
                <span><b>{String(completedCount).padStart(2, '0')}</b> concluídas</span>
              </div>
            </div>

            <div className="progress-track" aria-label={`${Math.round(progress)}% concluído`}>
              <span style={{ width: `${progress}%` }} />
            </div>

            {actionError && <p className="action-error" role="alert">{actionError}</p>}

            <div className="task-list-heading">
              <h3>Lista de tarefas <span>{String(visibleTodos.length).padStart(2, '0')}</span></h3>
              <span>STATUS</span>
            </div>

            {visibleTodos.length ? (
              <ul className="task-list">
                {visibleTodos.map((todo, index) => {
                  const isBusy = busyTodoIds.has(todo.id)
                  return (
                    <li className={`task-row${todo.completed ? ' is-complete' : ''}`} key={todo.id}>
                      <span className="task-number">{String(index + 1).padStart(2, '0')}</span>
                      <button
                        className="complete-button"
                        type="button"
                        aria-label={todo.completed ? 'Marcar como pendente' : 'Marcar como concluída'}
                        aria-pressed={todo.completed}
                        disabled={isBusy}
                        onClick={() => void toggleTodo(todo)}
                      >
                        {todo.completed && <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8 3 3 6-6" /></svg>}
                      </button>
                      <span className="task-title">{todo.title}</span>
                      <span className="task-status">{isBusy ? 'SALVANDO' : todo.completed ? 'CONCLUÍDA' : 'PENDENTE'}</span>
                      <button
                        className="delete-button"
                        type="button"
                        aria-label={`Excluir tarefa: ${todo.title}`}
                        title="Excluir tarefa"
                        disabled={isBusy}
                        onClick={() => void deleteTodo(todo)}
                      >
                        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 6h11m-9.5 0 .7 10h6.6l.7-10M8 6V4h4v2m-3 3v4m2-4v4" /></svg>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="empty-state"><span className="empty-check">✓</span><p>Nenhuma tarefa para este usuário.</p></div>
            )}
          </section>
        ) : (
          <div className="empty-state"><p>Nenhum usuário encontrado.</p></div>
        )}
      </section>

      <footer className="footer"><span>GERENCIADOR DE TAREFAS</span><span>JSONPLACEHOLDER</span></footer>
    </main>
  )
}

export default App
