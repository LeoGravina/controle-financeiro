// NOVO ARQUIVO: src/components/AddFundsToGoalModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import CurrencyInput from './CurrencyInput'; 
import Select from 'react-select'; 
import { db, auth } from '../firebase/config'; 
import { doc, updateDoc, increment } from 'firebase/firestore'; 

// Opções de pagamento (copiadas do EditTransactionModal)
const paymentMethodOptions = [
    { value: 'debit', label: 'Débito' },
    { value: 'credit', label: 'Crédito' },
    { value: 'cash', label: 'Dinheiro' },
    { value: 'pix', label: 'Pix' }
];

const AddFundsToGoalModal = ({ isOpen, onClose, goal, categories, onSave }) => {
    const [amountToAdd, setAmountToAdd] = useState('');
    const [paymentMethod, setPaymentMethod] = useState(null);
    const [isSaving, setIsSaving] = useState(false); 

    // Limpa o input quando o modal é fechado ou a meta muda
    useEffect(() => {
        if (!isOpen) {
            setAmountToAdd('');
            setPaymentMethod(null);
            setIsSaving(false);
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const amount = parseFloat(amountToAdd);

        if (!amount || amount <= 0) {
            alert("Por favor, insira um valor positivo para adicionar.");
            return;
        }
        if (!paymentMethod) {
            alert("Por favor, selecione a forma de pagamento (de onde o dinheiro saiu).");
            return;
        }
        if (!goal || !goal.id) {
            alert("Erro: Meta não identificada.");
            return;
        }

        setIsSaving(true); 

        try {
            // Chama a função onSave passada pelo Dashboard
            // Passa o objeto goal completo, o valor, e o 'value' do método de pag.
            await onSave(goal, amount, paymentMethod.value); 
            onClose(); // Fecha o modal após sucesso
        } catch (error) {
            console.error("Erro ao adicionar fundos à meta:", error);
            // Mostra o erro específico, como "Categoria 'Metas' não encontrada."
            alert(error.message || "Ocorreu um erro ao tentar salvar. Tente novamente.");
            setIsSaving(false); 
        } 
    };

    if (!isOpen || !goal) return null;

    const handleContentClick = (e) => e.stopPropagation();

    return (
        <div className="modal-overlay open" onClick={onClose}>
            <div className="modal-content" onClick={handleContentClick} style={{ textAlign: 'left' }}>
                <h4>Adicionar Fundos à Meta</h4>
                <p style={{ marginBottom: '10px', fontSize: '1.1rem', fontWeight: '500' }}>
                    Meta: <strong style={{ color: 'var(--primary-color)' }}>{goal.goalName}</strong>
                </p>
                <p style={{ marginBottom: '25px', fontSize: '0.9rem', color: 'var(--text-light-color)' }}>
                    Progresso: {(goal.currentAmount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / {goal.targetAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>

                <form onSubmit={handleSubmit} className="auth-form" style={{ gap: '20px' }}>
                    <CurrencyInput
                        value={amountToAdd}
                        onChange={setAmountToAdd}
                        placeholder="Valor a adicionar (R$)"
                        aria-label="Valor a adicionar à meta"
                        required
                        autoFocus // Foca no input ao abrir
                    />
                    
                    <Select
                        options={paymentMethodOptions}
                        value={paymentMethod}
                        onChange={setPaymentMethod}
                        placeholder="De onde saiu? (Forma Pag.)"
                        className="react-select-container"
                        classNamePrefix="react-select"
                        required
                    />
                    
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="modal-button cancel" disabled={isSaving}>
                            Cancelar
                        </button>
                        <button type="submit" className="modal-button confirm" style={{ backgroundColor: 'var(--income-color)' }} disabled={isSaving}>
                            {isSaving ? 'Salvando...' : 'Adicionar Fundos'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddFundsToGoalModal;