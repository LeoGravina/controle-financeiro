// src/pages/LandingPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LandingPage.css';
import { FaChartPie, FaMobileAlt, FaBullseye, FaCheck, FaChevronDown } from 'react-icons/fa';
import dashboardImg from '../assets/dashboard-mobile.png'; 

const LandingPage = () => {
    const navigate = useNavigate();

    // --- FUNÇÃO DE ROLAGEM SUAVE PERSONALIZADA (Estilo Lanterna Mágica) ---
    const rolarParaOFooter = () => {
        const footer = document.getElementById('footer');
        if (!footer) return;

        const targetPosition = footer.getBoundingClientRect().top + window.scrollY;
        const startPosition = window.scrollY;
        const distance = targetPosition - startPosition;
        const duration = 1500; // 1.5 segundos (Ajuste aqui se quiser mais lento)
        let startTime = null;

        // Função de aceleração (Ease-in-out Cubic) para ficar elegante
        const easeInOutCubic = (t) => {
            return t < 0.5 
                ? 4 * t * t * t 
                : 1 - Math.pow(-2 * t + 2, 3) / 2;
        };

        const animation = (currentTime) => {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            const ease = easeInOutCubic(progress);

            window.scrollTo(0, startPosition + (distance * ease));

            if (timeElapsed < duration) {
                requestAnimationFrame(animation);
            }
        };

        requestAnimationFrame(animation);
    };

    return (
        <div className="landing-container">
            {/* NAV BAR */}
            <nav className="landing-nav">
                <h1 className="logo">Finanças<span>App</span></h1>
                <div className="nav-buttons">
                    <button className="btn-text" onClick={() => navigate('/login')}>Entrar</button>
                    <button className="btn-primary" onClick={() => navigate('/register')}>Criar Conta</button>
                </div>
            </nav>

            {/* HERO SECTION */}
            <header className="hero-section">
                <div className="hero-content">
                    <h1>O controle financeiro que você <span>realmente vai usar</span>.</h1>
                    <p>Simples, direto e funciona no seu celular. Pare de brigar com planilhas complexas e comece a ver seu dinheiro sobrar.</p>
                    <button className="btn-hero" onClick={() => navigate('/register')}>Começar Agora (Grátis)</button>
                </div>
                
                <div className="hero-image">
                    <div className="fake-phone">
                        <img src={dashboardImg} alt="Dashboard no celular" className="screen-image" />
                    </div>
                </div>
                
                {/* SETA COM A NOVA ANIMAÇÃO LENTA */}
                <div className="scroll-indicator" onClick={rolarParaOFooter}>
                    <FaChevronDown />
                </div>
            </header>

            {/* FEATURES SECTION */}
            <section className="features-section" id="features">
                <h2>Por que escolher o FinançasApp?</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="icon-bg"><FaChartPie /></div>
                        <h3>Relatórios Visuais</h3>
                        <p>Entenda para onde vai cada centavo com gráficos simples e coloridos.</p>
                    </div>
                    <div className="feature-card">
                        <div className="icon-bg"><FaBullseye /></div>
                        <h3>Metas e Sonhos</h3>
                        <p>Defina objetivos e acompanhe o progresso visualmente.</p>
                    </div>
                    <div className="feature-card">
                        <div className="icon-bg"><FaMobileAlt /></div>
                        <h3>Perfeito no Celular</h3>
                        <p>Interface pensada para você lançar gastos na hora, em qualquer lugar.</p>
                    </div>
                </div>
            </section>

             <section className="pricing-section">
                <h2>Planos simples, sem pegadinhas</h2>
                <div className="plans-container">
                    <div className="plan-card">
                        <h3>Iniciante</h3>
                        <div className="price">R$ 0<span>/mês</span></div>
                        <ul className="plan-features">
                            <li><FaCheck color="green"/> Controle de Entradas/Saídas</li>
                            <li><FaCheck color="green"/> Relatórios Básicos</li>
                            <li><FaCheck color="green"/> Até 3 Categorias</li>
                        </ul>
                        <button className="btn-outline" onClick={() => navigate('/register')}>Criar Conta Grátis</button>
                    </div>

                    <div className="plan-card premium">
                        <div className="badge">MAIS POPULAR</div>
                        <h3>Pro (Vitalício)</h3>
                        <div className="price">R$ 29,90<span>/único</span></div>
                        <p className="pix-note">Pagamento via PIX</p>
                        <ul className="plan-features">
                            <li><FaCheck color="white"/> <strong>Tudo do Grátis</strong></li>
                            <li><FaCheck color="white"/> Categorias Ilimitadas</li>
                            <li><FaCheck color="white"/> Orçamentos Inteligentes</li>
                            <li><FaCheck color="white"/> Gráficos Avançados</li>
                            <li><FaCheck color="white"/> Sem mensalidade</li>
                        </ul>
                        <button className="btn-primary-full" onClick={() => navigate('/register')}>Quero ser PRO</button>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default LandingPage;