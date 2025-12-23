// src/components/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FiInstagram } from 'react-icons/fi'; // Certifique-se de ter react-icons instalado
import '../styles/Footer.css'; // Ou './Footer.css' dependendo de onde você salvou

function Footer() {
    return (
        <footer id="footer" className="footer-container">
            <div className="footer-content">
                <span className="footer-text">
                    &copy; {new Date().getFullYear()} Desenvolvido por <strong>Leonardo Gravina</strong>
                </span>

                <span className="footer-separator">|</span>

                <Link to="/contato" className="footer-link">
                    Entre em contato
                </Link>
            </div>
        </footer>
    );
}

export default Footer;