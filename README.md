# Real-time Coding Monitor

A web-based application that allows teachers to monitor students' coding activities in real-time, similar to Google Meet's video tile layout.

## Features

- **Teacher Dashboard**: Grid layout showing all connected students with live code preview
- **Student Coding Interface**: Monaco Editor with console output
- **Real-time Sync**: See every keystroke from students via WebSocket
- **Remote Code Editing**: Teachers can click on student tiles to edit their code
- **Code Execution**: Run Python and JavaScript code with captured output
- **Error Notifications**: Instant alerts when students encounter errors

## Tech Stack

### Backend
- Django 5.x with Django REST Framework
- Django Channels for WebSocket support
- SQLite (development) / PostgreSQL (production)
- JWT Authentication

### Frontend
- React 18 with Vite
- Monaco Editor (VS Code editor)
- Tailwind CSS
- WebSocket client

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Start server
python manage.py runserver
```

Backend will be available at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:5173`

## Docker Deployment

### Quick Start with Docker

```bash
# Clone and navigate to project
cd caonsoleshare

# Copy environment file and configure
cp .env.example .env
# Edit .env with your production settings

# Build and run with Docker Compose
docker-compose up --build -d

# View logs
docker-compose logs -f
```

The app will be available at `http://localhost` (port 80)

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DJANGO_SECRET_KEY` | Django secret key | Required for production |
| `DEBUG` | Enable debug mode | `False` in Docker |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts | `localhost,127.0.0.1` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost` |
| `DATABASE_URL` | PostgreSQL connection string | SQLite |

### Production Deployment

For production deployment:

1. Set a strong `DJANGO_SECRET_KEY`
2. Configure `ALLOWED_HOSTS` with your domain
3. Set up PostgreSQL and configure `DATABASE_URL`
4. Consider using Redis for WebSocket channel layer

```bash
# Production example
DJANGO_SECRET_KEY=your-super-secret-key
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
DATABASE_URL=postgres://user:pass@host:5432/dbname
```

## Usage

### For Teachers

1. Register as a **Teacher**
2. Create a new coding session
3. Share the 6-character session code with students
4. View the live dashboard as students join and code
5. Click on any student tile to enter edit mode and help them

### For Students

1. Register as a **Student**
2. Enter the session code provided by your teacher
3. Write code in the Monaco Editor
4. Click "Run Code" to execute
5. View output in the console panel

## API Endpoints

### Authentication
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login
- `GET /api/auth/profile/` - Get user profile

### Sessions
- `POST /api/sessions/create/` - Create session (teacher)
- `POST /api/sessions/join/` - Join session (student)
- `GET /api/sessions/` - List sessions
- `GET /api/sessions/{code}/dashboard/` - Get dashboard data

### WebSocket
- `ws://localhost:8000/ws/session/{code}/?token={jwt}` - Session WebSocket

## Project Structure

```
├── backend/
│   ├── config/          # Django settings, ASGI, routing
│   ├── authentication/  # User auth, JWT
│   ├── sessions/        # Session management
│   ├── coding/          # WebSocket consumers, code execution
│   └── manage.py
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Common/   # Header, Login, Register
    │   │   ├── Teacher/  # Dashboard, StudentTile
    │   │   └── Student/  # CodingInterface, Console
    │   ├── context/      # Auth, WebSocket contexts
    │   └── services/     # API client
    └── package.json
```

## License

MIT License
