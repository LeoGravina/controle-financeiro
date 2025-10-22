// ATUALIZADO: src/components/FixedExpensesManager.jsx
import React, { useState } from 'react';
import CurrencyInput from './CurrencyInput';
import { FaRegTrashAlt } from 'react-icons/fa';

// Recebe a nova prop onEditFixedExpense
const FixedExpensesManager = ({ categories = [], onAddFixedExpense, fixedExpenses = [], onDeleteFixedExpense, onEditFixedExpense }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState(1);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim() || !amount || !category || !dayOfMonth) {
      alert("Preencha todos os campos do gasto fixo.");
      return;
    }
    onAddFixedExpense({
      description: description.trim(),
      amount: parseFloat(amount),
      category: categories.find(c => c.id === category)?.name || 'Outros',
      dayOfMonth: parseInt(dayOfMonth, 10),
    });
    // Limpa o formulário
    setDescription(''); setAmount(''); setCategory(''); setDayOfMonth(1);
  };

  const handleDeleteClick = (e, id) => {
    e.stopPropagation(); // Impede o clique de disparar a edição
    onDeleteFixedExpense(id);
  };

  return (
    <div className="fixed-expenses-manager">
      <h3>Gastos Fixos</h3>
      <form onSubmit={handleSubmit} className="fixed-expense-form">
        <input type="text" placeholder="Descrição (ex: Netflix)" value={description} onChange={e => setDescription(e.target.value)} required />
        <CurrencyInput value={amount} onChange={setAmount} />
        <select value={category} onChange={e => setCategory(e.target.value)} required>
          <option value="" disabled>Selecione a categoria</option>
          {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
        </select>
        <div className="day-picker">
          <label htmlFor="day">Dia do Vencimento:</label>
          <input id="day" type="number" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} min="1" max="31" required />
        </div>
        <button type="submit" className="submit-button">Adicionar Gasto Fixo</button>
      </form>

      <ul className="fixed-expense-list">
        {fixedExpenses.length > 0 ? (
          fixedExpenses.map(expense => (
            // Adiciona onClick na linha para chamar a edição
            <li key={expense.id} onClick={() => onEditFixedExpense(expense)}>
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