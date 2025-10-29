// NOVO ARQUIVO: src/components/WithdrawFromGoalModal.jsx
import React, { useState, useEffect } from 'react';
import CurrencyInput from './CurrencyInput'; 
import Select from 'react-select'; 
import { db, auth } from '../firebase/config'; 
import { doc, updateDoc, increment } from 'firebase/firestore'; 

// Opções de pagamento (para onde o dinheiro VAI)
const paymentMethodOptions = [
    { value: 'debit', label: 'Conta Débito' },
    { value: 'credit', label: 'Conta Crédito (Pagar Fatura)' },
    { value: 'cash', label: 'Dinheiro (Em mãos)' },
    { value: 'pix', label: 'Pix (Conta)' }
];

const WithdrawFromGoalModal = ({ isOpen, onClose, goal, categories, onSave }) => {
    const [amountToWithdraw, setAmountToWithdraw] = useState('');
    const [paymentMethod, setPaymentMethod] = useState(null);
    const [isSaving, setIsSaving] = useState(false); 

    // Limpa o input quando o modal é fechado ou a meta muda
    useEffect(() => {
        if (!isOpen) {
            setAmountToWithdraw('');
            setPaymentMethod(null);
            setIsSaving(false);
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const amount = parseFloat(amountToWithdraw);

        if (!amount || amount <= 0) {
            alert("Por favor, insira um valor positivo para resgatar.");
            return;
        }
        if (amount > goal.currentAmount) {
            alert("Você não pode resgatar um valor maior do que o acumulado na meta.");
            return;
        }
        if (!paymentMethod) {
            alert("Por favor, selecione para onde o dinheiro vai (Forma de Pagamento).");
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
            console.error("Erro ao resgatar fundos da meta:", error);
            alert(error.message || "Ocorreu um erro ao tentar salvar. Tente novamente.");
            setIsSaving(false); 
        } 
    };

    if (!isOpen || !goal) return null;

    const handleContentClick = (e) => e.stopPropagation();
    const currentAmount = goal.currentAmount || 0;
    const targetAmount = goal.targetAmount;

    return (
        <div className="modal-overlay open" onClick={onClose}>
            <div className="modal-content" onClick={handleContentClick} style={{ textAlign: 'left' }}>
                <h4>Resgatar Fundos da Meta</h4>
                <p style={{ marginBottom: '10px', fontSize: '1.1rem', fontWeight: '500' }}>
                    Meta: <strong style={{ color: 'var(--primary-color)' }}>{goal.goalName}</strong>
                </p>
                <p style={{ marginBottom: '25px', fontSize: '0.9rem', color: 'var(--text-light-color)' }}>
                    Disponível para Resgate: {currentAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                     / {targetAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>

                <form onSubmit={handleSubmit} className="auth-form" style={{ gap: '20px' }}>
                    <CurrencyInput
                        value={amountToWithdraw}
                        onChange={setAmountToWithdraw}
                        placeholder="Valor a resgatar (R$)"
                        aria-label="Valor a resgatar da meta"
                        required
                        autoFocus 
                    />
                    
                    <Select
                        options={paymentMethodOptions}
                        value={paymentMethod}
                        onChange={setPaymentMethod}
                        placeholder="Para onde vai? (Conta)"
                        className="react-select-container"
                        classNamePrefix="react-select"
                        required
                    />
                    
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="modal-button cancel" disabled={isSaving}>
                            Cancelar
                        </button>
                        <button type="submit" className="modal-button confirm" style={{ backgroundColor: 'var(--expense-color)' }} disabled={isSaving}>
                            {isSaving ? 'Salvando...' : 'Resgatar Fundos'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WithdrawFromGoalModal;