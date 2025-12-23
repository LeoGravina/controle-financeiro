import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/config';
import '../styles/Auth.css';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/');
        } catch (err) {
            setError('E-mail ou senha inválidos.');
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError('Por favor, digite seu e-mail no campo acima para recuperar a senha.');
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            setSuccessMsg(`Um link de redefinição foi enviado para ${email}`);
            setError(null);
        } catch (err) {
            console.error(err);
            if (err.code === 'auth/user-not-found') {
                setError('Usuário não encontrado.');
            } else if (err.code === 'auth/invalid-email') {
                setError('E-mail inválido.');
            } else {
                setError('Erro ao enviar e-mail de recuperação.');
            }
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Entrar</h2>
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input 
                            type="email" 
                            id="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                            placeholder="seu@email.com"
                        />
                    </div>
                    
                    <div className="input-group">
                        <label htmlFor="password">Senha</label>
                        <input 
                            type={showPassword ? "text" : "password"} 
                            id="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            placeholder="Sua senha"
                        />
                        <div className="password-toggle-icon" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <span className="forgot-password-link" onClick={handleForgotPassword}>
                            Esqueci minha senha
                        </span>
                    </div>

                    <button type="submit" className="auth-button">Entrar</button>
                </form>

                {error && <p className="auth-error">{error}</p>}
                {successMsg && <p className="auth-success">{successMsg}</p>}

                <p className="auth-switch-link">
                    Não tem uma conta? <Link to="/register">Cadastre-se</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;