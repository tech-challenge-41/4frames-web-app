import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './features/auth/context/auth-context';
import { LoginPage } from './features/auth/components/LoginPage';
import { ConvertPage } from './features/convert/components/ConvertPage';
import { JobStatusPage } from './features/job-status/components/JobStatusPage';
import { MyVideosPage } from './features/my-videos/components/MyVideosPage';
import { AppLayout } from './routes/AppLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/convert" element={<ConvertPage />} />
            <Route path="/my-videos" element={<MyVideosPage />} />
            <Route path="/jobs/:jobId" element={<JobStatusPage />} />
          </Route>
        </Route>

        {/* "Meus vídeos" é a tela principal: a raiz e qualquer endereço desconhecido levam a ela. */}
        <Route path="*" element={<Navigate to="/my-videos" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
