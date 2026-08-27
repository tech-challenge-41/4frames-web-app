import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './features/auth/context/auth-context';
import { LoginPage } from './features/auth/components/LoginPage';
import { UploadPage } from './features/upload/components/UploadPage';
import { DownloadPage } from './features/download/components/DownloadPage';
import { AppLayout } from './routes/AppLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/files" element={<UploadPage />} />
            <Route path="/files/download" element={<DownloadPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/files" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
