# CollabCore Frontend

A modern React application for student collaboration, built with Vite, React Router, TanStack Query, and Tailwind CSS.

## 🚀 Features

- **Authentication System**: Login, Registration with JWT-based authentication
- **Modern UI**: Beautiful, responsive design using Tailwind CSS
- **Smooth Animations**: Framer Motion for delightful micro-interactions
- **State Management**: AuthContext for global auth state
- **API Integration**: Axios with automatic token refresh
- **Protected Routes**: Route guards for authenticated pages
- **Real-time Ready**: Socket.io client integration for future features

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend API running on `http://localhost:8000`

## 🛠️ Installation

1. Clone the repository and navigate to the frontend directory:
```bash
cd collabcore-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Update the `.env` file with your backend API URL:
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/api/v1/ws
```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```
The application will be available at `http://localhost:5173`

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## 📁 Project Structure

```
src/
├── components/          # Reusable React components
│   ├── auth/           # Authentication components
│   ├── common/         # Common UI components (Header, Footer, etc.)
│   ├── feed/           # Feed-related components (coming soon)
│   ├── profile/        # Profile components (coming soon)
│   ├── projects/       # Project components (coming soon)
│   ├── search/         # Search components (coming soon)
│   ├── team/           # Team collaboration components (coming soon)
│   └── notifications/  # Notification components (coming soon)
├── contexts/           # React Context providers
│   └── AuthContext.jsx # Authentication state management
├── hooks/              # Custom React hooks
│   └── useAuth.js      # Authentication hook
├── pages/              # Page components
│   ├── Home.jsx        # Landing page
│   ├── Login.jsx       # Login page
│   └── Register.jsx    # Registration page
├── services/           # API service layer
│   ├── api.js          # Axios instance with interceptors
│   └── authService.js  # Authentication API calls
├── utils/              # Utility functions
│   ├── constants.js    # App constants
│   ├── helpers.js      # Helper functions
│   └── validators.js   # Form validation functions
├── App.jsx             # Main app component with routing
└── main.jsx            # App entry point
```

## 🎨 Components Created

### Authentication Components
- **LoginForm**: Full-featured login form with validation
- **RegisterForm**: Registration form with role selection
- **ProtectedRoute**: Route wrapper for authenticated pages

### Common Components
- **Header**: Navigation header with auth state
- **Footer**: Site footer with links
- **LoadingSpinner**: Reusable loading indicator

### Pages
- **Home**: Beautiful landing page with features showcase
- **Login**: Login page
- **Register**: Registration page

## 🔐 Authentication Flow

1. User registers/logs in through the forms
2. JWT tokens (access + refresh) are stored in localStorage
3. Axios interceptor automatically adds tokens to requests
4. On 401 errors, automatic token refresh is attempted
5. AuthContext provides global auth state to all components
6. ProtectedRoute guards authenticated pages

## 🎨 Styling & Animations

The app uses Tailwind CSS 4 for styling with a modern, clean design:
- Gradient backgrounds
- Smooth transitions
- Responsive design
- Custom color schemes (blue & purple theme)
- Beautiful form inputs with icons

### Framer Motion Animations
Delightful animations throughout the application:
- **Page entrances**: Smooth fade-in and slide-up effects
- **Scroll animations**: Content reveals as you scroll
- **Hover effects**: Cards lift, icons rotate, buttons scale
- **Form feedback**: Error/success messages with spring physics
- **Micro-interactions**: Every click and hover feels responsive
- **Loading states**: Smooth spinner animations

See `ANIMATIONS_GUIDE.md` for detailed animation documentation.

## 🔄 State Management

- **AuthContext**: Global authentication state
- **TanStack Query**: Server state management (configured but not yet used)
- **React Router**: Routing and navigation

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8000/api/v1` |
| `VITE_WS_URL` | WebSocket URL | `ws://localhost:8000/api/v1/ws` |

## 🧪 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 📦 Key Dependencies

- **react** (v19): UI library
- **react-router-dom** (v7): Routing
- **@tanstack/react-query** (v5): Server state management
- **axios** (v1): HTTP client
- **tailwindcss** (v4): Styling
- **framer-motion** (v11): Animation library
- **lucide-react**: Icon library
- **socket.io-client**: WebSocket client

## 🎯 Next Steps

The following components are planned but not yet implemented:
- Discovery Feed
- Project Management
- Search Functionality
- User Profiles
- Team Collaboration Tools
- Real-time Chat
- Notifications

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run linting: `npm run lint`
4. Submit a pull request

## 📄 License

MIT License - feel free to use this project for learning and development.

## 🐛 Known Issues

- Backend API must be running for full functionality
- Some routes are placeholder implementations
- OAuth integration (Google/GitHub) not yet implemented

## 💡 Tips

- Use the `.env.example` as a reference for required environment variables
- Check browser console for API errors if authentication fails
- Make sure the backend is running before starting the frontend

---

Built with ❤️ for student collaboration
