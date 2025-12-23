// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FinanceProvider, useFinance } from './contexts/FinanceContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Importando Páginas
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ReportPage from './pages/ReportPage';
import ContatoPage from './pages/ContatoPage';

import Footer from './components/Footer';
import './styles/Auth.css';
import './styles/Dashboard.css';

// Componente auxiliar para proteger rotas usando o contexto
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useFinance();

  if (loading) return <div style={{display:'flex', justifyContent:'center', marginTop:'50px'}}>Carregando...</div>;
  
  return user ? children : <Navigate to="/login" />;
};

// Componente auxiliar para rotas públicas (Login/Register)
const PublicRoute = ({ children }) => {
  const { user, loading } = useFinance();

  if (loading) return null; 
  
  return user ? <Navigate to="/app" /> : children;
};

function App() {
  return (
    <BrowserRouter>
      {/* O Provider engloba toda a árvore de componentes */}
      <FinanceProvider>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/contato" element={<ContatoPage />} />

              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

              <Route 
                path="/app" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/report" 
                element={
                  <ProtectedRoute>
                    <ReportPage />
                  </ProtectedRoute>
                } 
              />
              
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>

          <Footer />
        </div>

        <ToastContainer position="top-right" autoClose={3000} />
      </FinanceProvider>
    </BrowserRouter>
  );
}

export default App;