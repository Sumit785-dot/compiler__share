import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './components/Common/Login'
import Register from './components/Common/Register'
import TeacherDashboard from './components/Teacher/Dashboard'
import StudentInterface from './components/Student/CodingInterface'
import SessionManager from './components/Teacher/SessionManager'
import JoinSession from './components/Student/JoinSession'
import Header from './components/Common/Header'

function App() {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-spin"
                        style={{ animationDuration: '1.5s' }}>
                    </div>
                    <p className="text-gray-400 text-lg">Loading CodeMonitor...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            {user && <Header />}
            <main className={user ? 'pt-16' : ''}>
                <Routes>
                    {/* Public routes */}
                    <Route
                        path="/login"
                        element={user ? <Navigate to={user.role === 'teacher' ? '/dashboard' : '/code'} /> : <Login />}
                    />
                    <Route
                        path="/register"
                        element={user ? <Navigate to={user.role === 'teacher' ? '/dashboard' : '/code'} /> : <Register />}
                    />

                    {/* Teacher routes */}
                    <Route
                        path="/dashboard"
                        element={user?.role === 'teacher' ? <SessionManager /> : <Navigate to="/login" />}
                    />
                    <Route
                        path="/session/:sessionCode"
                        element={user?.role === 'teacher' ? <TeacherDashboard /> : <Navigate to="/login" />}
                    />

                    {/* Student routes */}
                    <Route
                        path="/join"
                        element={user?.role === 'student' ? <JoinSession /> : <Navigate to="/login" />}
                    />
                    <Route
                        path="/code/:sessionCode?"
                        element={user?.role === 'student' ? <StudentInterface /> : <Navigate to="/login" />}
                    />

                    {/* Default redirect */}
                    <Route
                        path="/"
                        element={
                            user
                                ? <Navigate to={user.role === 'teacher' ? '/dashboard' : '/join'} />
                                : <Navigate to="/login" />
                        }
                    />

                    {/* 404 */}
                    <Route
                        path="*"
                        element={
                            <div className="min-h-screen flex items-center justify-center">
                                <div className="text-center">
                                    <h1 className="text-6xl font-bold text-gradient mb-4">404</h1>
                                    <p className="text-gray-400">Page not found</p>
                                </div>
                            </div>
                        }
                    />
                </Routes>
            </main>
        </div>
    )
}

export default App
