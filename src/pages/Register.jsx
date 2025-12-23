import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import '../styles/Auth.css';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // Estados visuais
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '', colorClass: '' });
    
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Calcula força da senha em tempo real
    useEffect(() => {
        if (!password) {
            setPasswordStrength({ score: 0, label: '', colorClass: '' });
            return;
        }

        let score = 0;
        if (password.length >= 6) score += 1;
        if (password.length >= 10) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;

        if (score <= 2) setPasswordStrength({ score: 33, label: 'Fraca', colorClass: 'weak' });
        else if (score <= 4) setPasswordStrength({ score: 66, label: 'Boa', colorClass: 'medium' });
        else setPasswordStrength({ score: 100, label: 'Forte', colorClass: 'strong' });

    }, [password]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError("As senhas não coincidem.");
            return;
        }

        if (password.length < 6) {
            setError("A senha deve ter no mínimo 6 caracteres.");
            return;
        }

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            navigate('/');
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                setError('Este e-mail já está em uso.');
            } else {
                setError('Ocorreu um erro ao criar a conta.');
            }
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Crie sua Conta</h2>
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com"/>
                    </div>

                    {/* Senha Principal */}
                    <div className="input-group">
                        <label htmlFor="password">Senha</label>
                        <input 
                            type={showPassword ? "text" : "password"} 
                            id="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            placeholder="Mínimo 6 caracteres"
                        />
                        <div className="password-toggle-icon" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </div>
                    </div>

                    {/* Barra de Força */}
                    {password && (
                        <div className="password-strength-container">
                            <div className="strength-bar-bg">
                                <div 
                                    className={`strength-bar-fill ${passwordStrength.colorClass}`} 
                                    style={{ width: `${passwordStrength.score}%` }}
                                ></div>
                            </div>
                            <span className={`strength-text ${passwordStrength.colorClass}`}>
                                {passwordStrength.label}
                            </span>
                        </div>
                    )}

                    {/* Confirmação de Senha */}
                    <div className="input-group">
                        <label htmlFor="confirmPassword">Confirmar Senha</label>
                        <input 
                            type={showConfirmPassword ? "text" : "password"} 
                            id="confirmPassword" 
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                            required 
                            placeholder="Digite a senha novamente"
                        />
                        <div className="password-toggle-icon" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                        </div>
                    </div>

                    <button type="submit" className="auth-button">Criar Conta</button>
                </form>
                
                {error && <p className="auth-error">{error}</p>}
                
                <p className="auth-switch-link">
                    Já tem uma conta? <Link to="/login">Faça login</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;