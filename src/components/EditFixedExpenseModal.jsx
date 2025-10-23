// ATUALIZADO: src/components/EditFixedExpenseModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import CurrencyInput from './CurrencyInput';
import Select from 'react-select'; // Importa o react-select

const EditFixedExpenseModal = ({ isOpen, onClose, expense, categories = [], onSave }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState(null); // Alterado para null (para react-select)
    const [dayOfMonth, setDayOfMonth] = useState(1);

    // Formata e ordena as categorias para o react-select
    const categoryOptions = useMemo(() =>
        categories
            .map(cat => ({ value: cat.id, label: cat.name }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        [categories]
    );

    useEffect(() => {
        if (expense) {
            setDescription(expense.description || '');
            setAmount(expense.amount || '');
            // Encontra o objeto { value, label } da categoria
            const currentCategory = categoryOptions.find(opt => opt.label === expense.category);
            setCategory(currentCategory || null);
            setDayOfMonth(expense.dayOfMonth || 1);
        }
    }, [expense, categoryOptions]); // Depende de categoryOptions agora

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!description.trim() || !amount || parseFloat(amount) <= 0 || !category || !dayOfMonth) {
            alert("Preencha todos os campos.");
            return;
        }
        const updatedExpense = {
            ...expense,
            description: description.trim(),
            amount: parseFloat(amount),
            category: category.label, // Passa o NOME da categoria (label)
            dayOfMonth: parseInt(dayOfMonth, 10),
        };
        onSave(updatedExpense);
    };

    if (!isOpen || !expense) return null;

    const handleContentClick = (e) => e.stopPropagation();

    return (
        <div className="modal-overlay open" onClick={onClose}>
            <div className="modal-content" onClick={handleContentClick}>
                <h4>Editar Gasto Fixo</h4>
                <form onSubmit={handleSubmit} className="auth-form" style={{ gap: '20px' }}>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição" required />
                    <CurrencyInput value={amount} onChange={setAmount} />
                    
                    {/* Substituído por react-select */}
                    <Select
                        options={categoryOptions}
                        value={category}
                        onChange={setCategory}
                        placeholder="-- Selecione a categoria --"
                        className="react-select-container"
                        classNamePrefix="react-select"
                        noOptionsMessage={() => "Nenhuma categoria"}
                    />

                    <div className="day-picker" style={{ background: 'transparent', border: 'none', padding: 0 }}>
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