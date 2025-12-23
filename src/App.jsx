// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';

// Importando Páginas
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ReportPage from './pages/ReportPage';
import ContatoPage from './pages/ContatoPage';

// Importando Componentes Globais
import Footer from './components/Footer';

// Importando Estilos
import './styles/Auth.css';
import './styles/Dashboard.css';

// --- COMPONENTES DE ROTA ---
const ProtectedRoute = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div style={{display:'flex', justifyContent:'center', marginTop:'50px'}}>Carregando...</div>;
  
  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return null; 
  
  return user ? <Navigate to="/app" /> : children;
};

function App() {
  return (
    <BrowserRouter>
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
            
            {/* Rota Coringa: Se digitar qualquer coisa errada, volta pra Landing Page */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>

        {/* Footer Global */}
        <Footer />
        
      </div>
    </BrowserRouter>
  );
}

export default App;