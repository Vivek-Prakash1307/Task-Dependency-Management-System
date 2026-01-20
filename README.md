# Task Dependency Management System

A full-stack web application for managing tasks with dependencies, featuring circular dependency detection and interactive graph visualization. Built with Django REST Framework and React.

## 🚀 Features

- ✅ **Task CRUD Operations** - Create, read, update, delete tasks with rich metadata
- ✅ **Dependency Management** - Add/remove task dependencies with validation
- ✅ **Circular Dependency Detection** - DFS-based algorithm prevents dependency cycles
- ✅ **Automatic Status Updates** - Smart status propagation through dependency chains
- ✅ **Interactive Graph Visualization** - Canvas-based dependency graph with zoom/pan
- ✅ **Real-time Updates** - Live status updates and dependency changes
- ✅ **MySQL Database** - Production-ready database backend
- ✅ **Responsive Design** - Works seamlessly on desktop and mobile devices

## 🛠 Tech Stack

### Backend
- **Django 4.2.7** - Web framework
- **Django REST Framework** - API framework  
- **MySQL 8.0+** - Database
- **PyMySQL** - MySQL connector
- **Python 3.11+** - Programming language

### Frontend
- **React 18+** - UI framework
- **Tailwind CSS** - Utility-first styling
- **HTML5 Canvas** - Graph visualization
- **Fetch API** - HTTP client

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.11+** - [Download Python](https://www.python.org/downloads/)
- **Node.js 16+** - [Download Node.js](https://nodejs.org/)
- **MySQL 8.0+** - [Download MySQL](https://dev.mysql.com/downloads/mysql/)
- **Git** - [Download Git](https://git-scm.com/downloads)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd task-dependency-tracker
```

### 2. Backend Setup

#### Create Virtual Environment
```bash
cd backend
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
```

#### Install Dependencies
```bash
pip install -r requirements.txt
```

#### Configure Database

1. **Create MySQL Database**:
```sql
-- Connect to MySQL as root
mysql -u root -p

-- Create database
CREATE DATABASE task_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (optional)
CREATE USER 'taskuser'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON task_management.* TO 'taskuser'@'localhost';
FLUSH PRIVILEGES;

-- Exit MySQL
EXIT;
```

2. **Configure Environment Variables**:

Create or update `backend/.env`:
```env
# Django Settings
SECRET_KEY=your-secret-key-here
DEBUG=True

# Database Configuration
DB_NAME=task_management
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_HOST=localhost
DB_PORT=3306
```

#### Run Database Migrations
```bash
python manage.py migrate
```

#### Create Sample Data (Optional)
```bash
python create_sample_data.py
```

#### Start Backend Server
```bash
python run_server.py
```

The backend will be available at: **http://localhost:8000**

### 3. Frontend Setup

#### Open New Terminal and Navigate to Frontend
```bash
cd frontend
```

#### Install Dependencies
```bash
npm install
```

#### Configure Environment (Optional)

Create `frontend/.env` if you need custom configuration:
```env
REACT_APP_API_URL=http://localhost:8000/api
```

#### Start Frontend Development Server
```bash
npm start
```

The frontend will be available at: **http://localhost:3000**

## 🌐 Access URLs

Once both servers are running:

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/tasks/
- **Django Admin Panel**: http://localhost:8000/admin/

## 📁 Project Structure

```
task-dependency-tracker/
├── backend/                    # Django backend
│   ├── task_management/        # Django project settings
│   │   ├── settings.py         # Main settings
│   │   ├── urls.py            # URL routing
│   │   └── wsgi.py            # WSGI config
│   ├── tasks/                 # Main Django app
│   │   ├── models.py          # Task and TaskDependency models
│   │   ├── views.py           # API views
│   │   ├── serializers.py     # DRF serializers
│   │   ├── urls.py            # App URL routing
│   │   └── migrations/        # Database migrations
│   ├── venv/                  # Virtual environment
│   ├── .env                   # Environment variables
│   ├── manage.py              # Django management script
│   ├── run_server.py          # Development server launcher
│   ├── create_sample_data.py  # Sample data creation
│   └── requirements.txt       # Python dependencies
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── TaskDashboard.js    # Main dashboard
│   │   │   ├── TaskList.js         # Task list view
│   │   │   ├── TaskForm.js         # Task creation/editing
│   │   │   ├── TaskItem.js         # Individual task display
│   │   │   ├── TaskGraph.js        # Dependency graph
│   │   │   ├── DependencyManager.js # Dependency management
│   │   │   └── ...                 # Other components
│   │   ├── contexts/          # React context providers
│   │   │   └── TaskContext.js      # Global state management
│   │   ├── services/          # API services
│   │   │   └── api.js              # API communication
│   │   ├── App.js             # Main app component
│   │   ├── App.css            # Global styles
│   │   └── index.js           # Entry point
│   ├── public/                # Static files
│   ├── package.json           # Node.js dependencies
│   ├── tailwind.config.js     # Tailwind CSS configuration
│   └── .env                   # Environment variables
├── README.md                  # This file
└── DECISIONS.md              # Technical decisions documentation
```

## 🔧 Development

### Backend Development

#### Create New Migrations
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

#### Create Superuser (for Admin Panel)
```bash
python manage.py createsuperuser
```

#### Run Tests
```bash
python manage.py test
```

### Frontend Development

#### Install New Dependencies
```bash
cd frontend
npm install package-name
```

#### Build for Production
```bash
npm run build
```

#### Run Linting
```bash
npm run lint
```

## 📚 API Documentation

### Task Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/` | List all tasks with pagination |
| POST | `/api/tasks/` | Create a new task |
| GET | `/api/tasks/{id}/` | Get specific task details |
| PATCH | `/api/tasks/{id}/` | Update task (partial) |
| DELETE | `/api/tasks/{id}/` | Delete task |

### Dependency Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks/{id}/add_dependency/` | Add dependency to task |
| DELETE | `/api/tasks/{id}/dependencies/{dep_id}/` | Remove dependency |
| GET | `/api/tasks/graph/` | Get dependency graph data |

### Status Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks/{id}/mark_completed/` | Mark task as completed |

### Task Status Values
- `pending` - Task is waiting to be started
- `in_progress` - Task is currently being worked on  
- `completed` - Task has been finished
- `blocked` - Task is blocked by dependencies

### Example API Requests

#### Create Task
```bash
curl -X POST http://localhost:8000/api/tasks/ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Task",
    "description": "Task description",
    "status": "pending"
  }'
```

#### Add Dependency
```bash
curl -X POST http://localhost:8000/api/tasks/1/add_dependency/ \
  -H "Content-Type: application/json" \
  -d '{"depends_on_id": 2}'
```

## 🎯 Key Features Explained

### Circular Dependency Detection

The system uses a **Depth-First Search (DFS)** algorithm to detect circular dependencies:

- **Time Complexity**: O(V + E) where V = tasks, E = dependencies
- **Prevention**: Blocks creation of circular dependencies
- **Path Tracking**: Shows the complete cycle path when detected
- **Real-time**: Validates dependencies before saving

**Example**: If Task A → Task B → Task C, adding Task C → Task A would be blocked.

### Automatic Status Updates

Tasks automatically update their status based on dependency states:

1. **All dependencies completed** → Task becomes `in_progress`
2. **Any dependency blocked** → Task becomes `blocked`  
3. **Dependencies incomplete** → Task remains `pending`
4. **Task completed** → Triggers updates for dependent tasks

### Interactive Graph Visualization

- **Canvas-based rendering** without external libraries
- **Color-coded nodes** by status (gray=pending, blue=in_progress, green=completed, red=blocked)
- **Click nodes** to highlight dependencies
- **Zoom and pan** functionality
- **Performance mode** for large graphs (25+ tasks)

## 🐛 Troubleshooting

### Common Issues

#### Backend Issues

**MySQL Connection Error**:
```bash
# Check MySQL service is running
# Windows: services.msc → MySQL80
# Linux: sudo systemctl status mysql
# Mac: brew services list | grep mysql

# Test connection
mysql -u root -p -h localhost
```

**Migration Errors**:
```bash
# Reset migrations (development only)
python manage.py migrate tasks zero
python manage.py migrate
```

**Port Already in Use**:
```bash
# Find process using port 8000
netstat -ano | findstr :8000  # Windows
lsof -i :8000                 # Linux/Mac

# Kill process or use different port
python run_server.py 8001
```

#### Frontend Issues

**Node Modules Issues**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Port Already in Use**:
```bash
# Kill process on port 3000
npx kill-port 3000

# Or start on different port
PORT=3001 npm start
```

**API Connection Issues**:
- Verify backend is running on http://localhost:8000
- Check CORS settings in Django settings
- Verify API endpoints in browser: http://localhost:8000/api/tasks/

### Environment Issues

**Python Version**:
```bash
python --version  # Should be 3.11+
```

**Node Version**:
```bash
node --version     # Should be 16+
npm --version
```

**MySQL Version**:
```bash
mysql --version    # Should be 8.0+
```

## 🚀 Production Deployment

### Backend Deployment

1. **Update Settings**:
   - Set `DEBUG=False`
   - Configure `ALLOWED_HOSTS`
   - Use environment variables for secrets

2. **Database**:
   - Use production MySQL instance
   - Run migrations: `python manage.py migrate`

3. **Static Files**:
   ```bash
   python manage.py collectstatic
   ```

4. **WSGI Server**:
   ```bash
   pip install gunicorn
   gunicorn task_management.wsgi:application
   ```

### Frontend Deployment

1. **Build Production Bundle**:
   ```bash
   npm run build
   ```

2. **Serve Static Files**:
   - Use nginx, Apache, or CDN
   - Configure API URL for production

## 📄 License

This project is for educational and demonstration purposes.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## 📞 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the DECISIONS.md file for technical details
3. Create an issue in the repository

---

**Happy coding! 🎉**