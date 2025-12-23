import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiPhone, FiLinkedin, FiGithub, FiInstagram } from 'react-icons/fi';
import '../styles/ContatoPage.css';

function ContatoPage() {
    const navigate = useNavigate();

    return (
        <main className="container contato-page-content">
            <div className="contato-card">
                <h1 className="contato-title">Leonardo Gravina</h1>
                <p className="contato-subtitle">Entre em contato comigo</p>

                <div className="contato-info-list">
                    {/* E-mail */}
                    <a 
                        href="https://mail.google.com/mail/?view=cm&fs=1&to=leonardocarlos807@gmail.com" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="contato-item"
                    >
                        <FiMail size={22} />
                        <span>leonardocarlos807@gmail.com</span>
                    </a>
                    
                    {/* Telefone / WhatsApp */}
                    <a href="https://wa.me/5532984057124" target="_blank" rel="noopener noreferrer" className="contato-item">
                        <FiPhone size={24} />
                        <span>(32) 98405-7124</span>
                    </a>

                    {/* Instagram (NOVO) */}
                    <a href="https://www.instagram.com/leo_gravinar" target="_blank" rel="noopener noreferrer" className="contato-item">
                        <FiInstagram size={24} />
                        <span>Instagram</span>
                    </a>

                    {/* LinkedIn */}
                    <a href="https://www.linkedin.com/in/leonardo-gravina-carlos-a770bb237" target="_blank" rel="noopener noreferrer" className="contato-item">
                        <FiLinkedin size={24} />
                        <span>LinkedIn</span>
                    </a>
                    
                    {/* GitHub */}
                    <a href="https://github.com/LeoGravina" target="_blank" rel="noopener noreferrer" className="contato-item">
                        <FiGithub size={24} />
                        <span>GitHub</span>
                    </a>
                </div>

                <button className="secondary-btn" onClick={() => navigate('/')}>
                    Voltar para Home
                </button>
            </div>
        </main>
    );
}

export default ContatoPage;