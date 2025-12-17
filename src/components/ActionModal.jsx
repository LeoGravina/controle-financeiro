// ATUALIZADO: src/components/ActionModal.jsx
import React from 'react';
import '../styles/Dashboard.css'; // Reutilizando os estilos de modal

/**
 * Um modal genérico que aceita um array de botões de ação.
 * @param {boolean} isOpen - Controla a visibilidade.
 * @param {function} onClose - Função para fechar o modal (clique no overlay).
 * @param {string} title - O título do modal.
 * @param {string} message - A mensagem de corpo do modal.
 * @param {Array<object>} actions - Array de objetos de ação.
 * Ex: [{ label: 'Confirmar', onClick: () => ..., className: 'confirm' }]
 */
const ActionModal = ({ isOpen, onClose, title, message, actions = [] }) => {
  if (!isOpen) return null;

  const handleContentClick = (e) => e.stopPropagation();

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal-content" onClick={handleContentClick}>
        <h4>{title}</h4>
        <p>{message}</p>
        <div className="modal-actions modal-actions-stacked"> 
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`modal-button ${action.className || 'confirm'}`}
              style={action.style || {}}
              disabled={action.disabled || false}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActionModal;