import React, { useState, useEffect } from 'react';
import CurrencyInput from './CurrencyInput';

const EditGoalModal = ({ isOpen, onClose, goal, onSave }) => {
    const [goalName, setGoalName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');

    useEffect(() => {
        if (goal) {
            setGoalName(goal.goalName || '');
            setTargetAmount(goal.targetAmount || '');
        }
    }, [goal]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const newTargetAmount = parseFloat(targetAmount);

        if (!goalName.trim() || !newTargetAmount || newTargetAmount <= 0) {
            alert("Preencha o nome e um valor alvo válido.");
            return;
        }
        
        if (goal.currentAmount > 0 && newTargetAmount < goal.currentAmount) {
            if (!window.confirm(`Atenção: O novo valor alvo (R$ ${newTargetAmount.toFixed(2)}) é menor que o valor já acumulado (R$ ${goal.currentAmount.toFixed(2)}). Deseja continuar mesmo assim?`)) {
                return; 
            }
        }

        onSave({ 
            ...goal, 
            goalName: goalName.trim(), 
            targetAmount: newTargetAmount 
        });
    };

    if (!isOpen || !goal) return null;

    const handleContentClick = (e) => e.stopPropagation();

    return (
        <div className="modal-overlay open" onClick={onClose}>
            <div className="modal-content" onClick={handleContentClick}>
                <h4>Editar Meta</h4>
                <form onSubmit={handleSubmit} className="auth-form" style={{ gap: '20px' }}>
                    <input
                        type="text"
                        value={goalName}
                        onChange={e => setGoalName(e.target.value)}
                        placeholder="Nome da Meta"
                        required
                        aria-label="Nome da Meta"
                    />
                    
                    <CurrencyInput
                        value={targetAmount}
                        onChange={setTargetAmount}
                        placeholder="Valor Alvo (R$)"
                        required
                        aria-label="Valor Alvo da Meta"
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

export default EditGoalModal;