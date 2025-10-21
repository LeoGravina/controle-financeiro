import React from 'react';
import '../styles/Dashboard.css'; // Usando o estilo global do Dashboard

const ConfirmationModal = ({ isOpen, onClose, onConfirm, message }) => {
  const modalClass = isOpen ? 'modal-overlay open' : 'modal-overlay';

  // Impede o fechamento ao clicar dentro do modal
  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className={modalClass} onClick={onClose}> {/* Fecha ao clicar fora */}
      <div className="modal-content" onClick={handleContentClick}>
        <h4>Confirmação</h4>
        <p>{message}</p>
        <div className="modal-actions">
          <button onClick={onClose} className="modal-button cancel">
            Cancelar
          </button>
          <button onClick={onConfirm} className="modal-button confirm">
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;