import { useState, useRef, useEffect } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const handleLogout = () => {
    logout()
    setIsDropdownOpen(false)
  }

  const handleProfileClick = () => {
    navigate('/profile')
    setIsDropdownOpen(false)
  }

  return (
    <div className="app-shell">
      <header className="app-navbar">
        <div className="app-brand">RobotOps</div>
        <nav className="app-nav-links">
          <Link 
            to="/dashboard" 
            className={location.pathname === '/dashboard' || location.pathname === '/' ? 'active' : ''}
          >
            Dashboard
          </Link>
          <Link 
            to="/groups" 
            className={location.pathname === '/groups' ? 'active' : ''}
          >
            Groups
          </Link>
        </nav>
        <div className="app-nav-links" style={{ position: 'relative' }}>
          <div ref={dropdownRef} className="dropdown">
            <button
              type="button"
              className="dropdown-toggle"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              {user?.name || user?.email}
            </button>
            {isDropdownOpen && (
              <div className="dropdown-menu">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={handleProfileClick}
                >
                  About me
                </button>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item destructive"
                  onClick={handleLogout}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}

