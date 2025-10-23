// ATUALIZADO: src/components/FixedExpensesManager.jsx
import React, { useState, useMemo } from 'react';
import CurrencyInput from './CurrencyInput';
import { FaRegTrashAlt } from 'react-icons/fa';
import Select from 'react-select'; // Importa o react-select

const FixedExpensesManager = ({ categories = [], onAddFixedExpense, fixedExpenses = [], onDeleteFixedExpense, onEditFixedExpense }) => {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim() || !amount || !category || !dayOfMonth) { // Verifica se category (objeto) não é null
      alert("Preencha todos os campos do gasto fixo.");
      return;
    }
    onAddFixedExpense({
      description: description.trim(),
      amount: parseFloat(amount),
      category: category.label, // Passa o NOME da categoria (label)
      dayOfMonth: parseInt(dayOfMonth, 10),
    });
    // Limpa o formulário
    setDescription(''); setAmount(''); setCategory(null); setDayOfMonth(1);
  };

  const handleDeleteClick = (e, id) => {
    e.stopPropagation();
    onDeleteFixedExpense(id);
  };

  return (
    <div className="fixed-expenses-manager">
      <h3>Gastos Fixos Recorrentes</h3>
      <form onSubmit={handleSubmit} className="fixed-expense-form">
        <input type="text" placeholder="Descrição (ex: Netflix)" value={description} onChange={e => setDescription(e.target.value)} required />
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

        <div className="day-picker">
          <label htmlFor="day">Dia do Vencimento:</label>
          <input id="day" type="number" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} min="1" max="31" required />
        </div>
        <button type="submit" className="submit-button">Adicionar Gasto Fixo</button>
      </form>

      <ul className="fixed-expense-list">
        {fixedExpenses.length > 0 ? (
          fixedExpenses.map(expense => (
            <li key={expense.id} onClick={() => onEditFixedExpense(expense)} style={{cursor: 'pointer'}}>
              <div className="expense-info">
                <span>{expense.description} - R$ {expense.amount.toFixed(2).replace('.', ',')}</span>
                <small>Todo dia {expense.dayOfMonth} - {expense.category}</small>
              </div>
              <button className="delete-button" onClick={(e) => handleDeleteClick(e, expense.id)}>
                ×
              </button>
            </li>
          ))
        ) : (
          <p className="empty-message" style={{textAlign: "left", padding: "10px 0"}}>Nenhum gasto fixo adicionado.</p>
        )}
      </ul>
    </div>
  );
};

export default FixedExpensesManager;