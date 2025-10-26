// NOVO ARQUIVO: src/components/AddFundsToGoalModal.jsx
import React, { useState, useEffect } from 'react';
import CurrencyInput from './CurrencyInput'; 
import { db, auth } from '../firebase/config'; // Para acesso ao usuário se necessário
import { doc, updateDoc, increment } from 'firebase/firestore'; // Importa increment

const AddFundsToGoalModal = ({ isOpen, onClose, goal, onSave }) => {
    const [amountToAdd, setAmountToAdd] = useState('');
    const [isSaving, setIsSaving] = useState(false); // Estado para feedback de salvamento

    // Limpa o input quando o modal é fechado ou a meta muda
    useEffect(() => {
        if (!isOpen) {
            setAmountToAdd('');
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
        if (!goal || !goal.id) {
            alert("Erro: Meta não identificada.");
            return;
        }

        setIsSaving(true); // Ativa indicador de salvamento

        try {
            // Chama a função onSave passada pelo Dashboard
            await onSave(goal.id, amount); 
            onClose(); // Fecha o modal após sucesso
        } catch (error) {
            console.error("Erro ao adicionar fundos à meta:", error);
            alert("Ocorreu um erro ao tentar salvar. Verifique o console ou tente novamente.");
            setIsSaving(false); // Desativa indicador em caso de erro
        } 
        // Não reseta isSaving aqui, pois o modal fecha
    };

    if (!isOpen || !goal) return null;

    const handleContentClick = (e) => e.stopPropagation();

    return (
        <div className="modal-overlay open" onClick={onClose}>
            <div className="modal-content" onClick={handleContentClick} style={{ textAlign: 'left' }}> {/* Alinha conteúdo à esquerda */}
                <h4>Adicionar Fundos à Meta</h4>
                <p style={{ marginBottom: '10px', fontSize: '1.1rem', fontWeight: '500' }}>
                    Meta: <strong style={{ color: 'var(--primary-color)' }}>{goal.goalName}</strong>
                </p>
                <p style={{ marginBottom: '20px', fontSize: '0.9rem', color: 'var(--text-light-color)' }}>
                    Progresso Atual: {goal.currentAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / {goal.targetAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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