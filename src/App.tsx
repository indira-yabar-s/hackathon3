import { Route, Routes, useLocation, type Location } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useAuth } from './hooks/useAuth';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { NewsDetailModal, NewsDetailPage } from './pages/NewsDetailPage';
import { NewsFeedPage } from './pages/NewsFeedPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage';
import { SagaStoryPage } from './pages/SagaStoryPage';
import { SagasPage } from './pages/SagasPage';
import { WantedDetailPage } from './pages/WantedDetailPage';
import { WantedListPage } from './pages/WantedListPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { PublicOnlyRoute } from './routes/PublicOnlyRoute';

// Si el detalle de una noticia se abrió desde el feed, el feed (background) sigue renderizado detrás
function getBackgroundLocation(state: unknown): Location | null {
  if (typeof state === 'object' && state !== null && 'background' in state) {
    const background = state.background;
    if (typeof background === 'object' && background !== null && 'pathname' in background) {
      return background as Location;
    }
  }
  return null;
}

function App() {
  const location = useLocation();
  const { status } = useAuth();
  const background = getBackgroundLocation(location.state);

  return (
    <>
      <Routes location={background ?? location}>
        {/* Públicas: si ya hay sesión, redirigen a la app */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Privadas: requieren sesión */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/wanted" element={<WantedListPage />} />
            <Route path="/wanted/:id" element={<WantedDetailPage />} />
            <Route path="/news" element={<NewsFeedPage />} />
            <Route path="/news/:id" element={<NewsDetailPage />} />
            <Route path="/sagas" element={<SagasPage />} />
            <Route path="/sagas/:id" element={<SagaStoryPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* El modal solo existe con sesión (las rutas de arriba ya se encargan del login) */}
      {background && status === 'authenticated' && (
        <Routes>
          <Route path="/news/:id" element={<NewsDetailModal />} />
        </Routes>
      )}
    </>
  );
}

export default App;
