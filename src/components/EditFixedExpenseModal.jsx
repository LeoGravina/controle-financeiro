// NOVO: src/components/EditFixedExpenseModal.jsx
import React, { useState, useEffect } from 'react';
import CurrencyInput from './CurrencyInput'; // Sem extensão
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config'; // Sem extensão

const EditFixedExpenseModal = ({ isOpen, onClose, expense, categories = [], onSave }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [dayOfMonth, setDayOfMonth] = useState(1);

    useEffect(() => {
        if (expense) {
            setDescription(expense.description || '');
            setAmount(expense.amount || '');
            const currentCategory = categories.find(cat => cat.name === expense.category);
            setCategory(currentCategory ? currentCategory.id : '');
            setDayOfMonth(expense.dayOfMonth || 1);
        }
    }, [expense, categories]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!description.trim() || !amount || parseFloat(amount) <= 0 || !category || !dayOfMonth) {
            alert("Preencha todos os campos.");
            return;
        }
        const updatedExpense = {
            ...expense, // Mantém ID e userId
            description: description.trim(),
            amount: parseFloat(amount),
            category: categories.find(c => c.id === category)?.name || 'Outros',
            dayOfMonth: parseInt(dayOfMonth, 10),
        };
        onSave(updatedExpense); // Chama a função de update no Dashboard
    };

    if (!isOpen || !expense) return null;

    const handleContentClick = (e) => e.stopPropagation();

    return (
        <div className="modal-overlay open" onClick={onClose}>
            <div className="modal-content" onClick={handleContentClick}>
                <h4>Editar Gasto Fixo</h4>
                <form onSubmit={handleSubmit} className="auth-form" style={{ gap: '20px' }}>
                    <input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Descrição"
                        required
                    />
                    <CurrencyInput value={amount} onChange={setAmount} />
                    <select value={category} onChange={e => setCategory(e.target.value)} required>
                        <option value="" disabled>Selecione a categoria</option>
                        {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                    </select>
                    <div className="day-picker" style={{ background: 'transparent', border: 'none', padding: 0 }}> {/* Remove estilo extra */}
                        <label htmlFor="edit-day">Dia do Vencimento:</label>
                        <input id="edit-day" type="number" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} min="1" max="31" required style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)'}} />
                    </div>
                    <div className="modal-actions" style={{ marginTop: '10px' }}>
                        <button type="button" onClick={onClose} className="modal-button cancel">Cancelar</button>
                        <button type="submit" className="modal-button confirm" style={{ backgroundColor: 'var(--primary-color)' }}>Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditFixedExpenseModal;