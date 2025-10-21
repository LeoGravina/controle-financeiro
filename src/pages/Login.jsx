import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config'; // Caminho Corrigido
import '../styles/Auth.css'; // Caminho Corrigido

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/');
        } catch (err) {
            setError('E-mail ou senha inválidos.');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Entrar</h2>
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Senha</label>
                        <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="auth-button">Entrar</button>
                </form>
                {error && <p className="auth-error">{error}</p>}
                <p className="auth-switch-link">
                    Não tem uma conta? <Link to="/register">Cadastre-se</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;