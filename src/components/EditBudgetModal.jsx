// NOVO ARQUIVO: src/components/EditBudgetModal.jsx
import React, { useState, useEffect } from 'react';
import CurrencyInput from './CurrencyInput';

const EditBudgetModal = ({ isOpen, onClose, budget, onSave }) => {
    const [amount, setAmount] = useState('');

    useEffect(() => {
        // Popula o modal com o valor atual do orçamento quando ele é aberto
        if (budget) {
            setAmount(budget.limitAmount || '');
        }
    }, [budget]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const newLimitAmount = parseFloat(amount);

        if (amount === '' || newLimitAmount < 0) {
            alert("Por favor, insira um limite válido.");
            return;
        }

        // Envia o objeto 'budget' completo, mas com o 'limitAmount' atualizado
        onSave({ 
            ...budget, 
            limitAmount: newLimitAmount 
        });
    };

    if (!isOpen || !budget) return null;

    const handleContentClick = (e) => e.stopPropagation();

    return (
        <div className="modal-overlay open" onClick={onClose}>
            <div className="modal-content" onClick={handleContentClick}>
                <h4>Editar Orçamento</h4>
                {/* Mostra o nome da categoria como texto simples */}
                <p style={{ 
                    marginBottom: '25px', 
                    fontSize: '1.2rem', 
                    fontWeight: '500', 
                    color: 'var(--primary-color)' 
                }}>
                    Categoria: {budget.categoryName}
                </p>

                <form onSubmit={handleSubmit} className="auth-form" style={{ gap: '20px' }}>
                    <CurrencyInput
                        value={amount}
                        onChange={setAmount}
                        placeholder="Novo Limite (R$)"
                        required
                        autoFocus
                        aria-label="Novo limite do orçamento"
                    />

                    <div className="modal-actions" style={{ marginTop: '10px' }}>
                        <button type="button" onClick={onClose} className="modal-button cancel">Cancelar</button>
                        <button type="submit" className="modal-button confirm" style={{ backgroundColor: 'var(--primary-color)' }}>Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditBudgetModal;