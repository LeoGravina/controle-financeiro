import React, { useState, useEffect } from 'react';
import CurrencyInput from './CurrencyInput.jsx'; // Caminho corrigido

const getTodayString = () => new Date().toISOString().split('T')[0];

const TransactionForm = ({ categories = [], onAddTransaction }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [type, setType] = useState('expense');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState(2);
  const [category, setCategory] = useState('');

  useEffect(() => {
    if (categories.length > 0) {
      if (!category || !categories.some(cat => cat.id === category)) {
        setCategory(categories[0].id);
      }
    } else {
      setCategory('');
    }
  }, [categories, category]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim() || !amount || parseFloat(amount) <= 0 || !category) {
        alert("Por favor, preencha todos os campos corretamente.");
        return;
    }

    onAddTransaction({
      description: description.trim(),
      amount: parseFloat(amount),
      date: new Date(date + 'T12:00:00'), // Adiciona hora fixa
      type,
      category: categories.find(c => c.id === category)?.name || 'Outros',
      isInstallment,
      installments: isInstallment ? installments : 1,
    });

    setDescription('');
    setAmount('');
    setDate(getTodayString());
    setIsInstallment(false);
  };

  return (
    <div className="form-container">
      <h3>Adicionar Transação</h3>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} required aria-label="Descrição da transação" />
        <CurrencyInput value={amount} onChange={setAmount} aria-label="Valor da transação" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required aria-label="Data da transação" />
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Tipo de transação">
          <option value="expense">Despesa</option>
          <option value="income">Ganho</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} required aria-label="Categoria da transação">
          <option value="" disabled>Selecione a categoria</option>
          {categories.map(cat => ( <option key={cat.id} value={cat.id}>{cat.name}</option> ))}
        </select>
        {type === 'expense' && (
          <div className="installment-section">
            <label>
              <input type="checkbox" checked={isInstallment} onChange={e => setIsInstallment(e.target.checked)} aria-label="Marcar como transação parcelada" />
              Parcelado?
            </label>
            {isInstallment && (
              <input type="number" value={installments} onChange={e => setInstallments(parseInt(e.target.value, 10))} min="2" aria-label="Número de parcelas" />
            )}
          </div>
        )}
        <button type="submit" className="submit-button">Adicionar</button>
      </form>
    </div>
  );
};

export default TransactionForm;