import React from 'react';
import '../styles/Dashboard.css';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, message }) => {
  const modalClass = isOpen ? 'modal-overlay open' : 'modal-overlay';

  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className={modalClass} onClick={onClose}> 
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