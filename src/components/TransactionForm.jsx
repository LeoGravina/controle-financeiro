import React, { useState, useEffect } from 'react';
import CurrencyInput from './CurrencyInput.jsx';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

const getTodayString = () => new Date().toISOString().split('T')[0];

const TransactionForm = ({ categories = [], onAddTransaction, type, setType }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState(2);

  // Efeito para resetar o 'Parcelado?' se o método de pagamento mudar
  useEffect(() => {
    if (paymentMethod !== 'credit' && paymentMethod !== 'debit') {
      setIsInstallment(false);
    }
  }, [paymentMethod]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim() || !amount || parseFloat(amount) <= 0 || !category || !paymentMethod) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    onAddTransaction({
      description: description.trim(),
      amount: parseFloat(amount),
      date: new Date(date + 'T12:00:00'),
      type,
      category: categories.find(c => c.id === category)?.name || 'Outros',
      paymentMethod,
      // Garante que 'isInstallment' só seja verdadeiro para despesas com cartão
      isInstallment: type === 'expense' && (paymentMethod === 'credit' || paymentMethod === 'debit') && isInstallment,
      installments: type === 'expense' && (paymentMethod === 'credit' || paymentMethod === 'debit') && isInstallment ? installments : 1,
      isPaid: false
    });

    // Reset completo do formulário para os padrões
    setDescription('');
    setAmount('');
    setDate(getTodayString());
    setIsInstallment(false);
    setCategory('');
    setPaymentMethod('');
    setType('expense');
  };

  return (
    <div className="form-container">
      <h3>Adicionar Transação</h3>
      <div className="type-toggle-container">
        <button type="button" className={`type-toggle-button income ${type === 'income' ? 'active' : ''}`} onClick={() => setType('income')}>
          <FaArrowUp /> Ganho
        </button>
        <button type="button" className={`type-toggle-button expense ${type === 'expense' ? 'active' : ''}`} onClick={() => setType('expense')}>
          <FaArrowDown /> Gasto
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{marginTop: '0px'}}>
        <input type="text" placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} required />
        <CurrencyInput value={amount} onChange={setAmount} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />

        <select value={category} onChange={(e) => setCategory(e.target.value)} required>
          <option value="" disabled>-- Categoria --</option>
          {categories.map(cat => ( <option key={cat.id} value={cat.id}>{cat.name}</option> ))}
        </select>

        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} required>
            <option value="" disabled>-- Forma de pagamento --</option>
            <option value="debit">Cartão de Débito</option>
            <option value="credit">Cartão de Crédito</option>
            <option value="cash">Dinheiro</option>
            <option value="pix">Pix</option>
        </select>

        {/* --- LÓGICA ATUALIZADA AQUI --- */}
        {/* Mostra a seção de parcelamento APENAS se for GASTO e o método for DÉBITO ou CRÉDITO */}
        {type === 'expense' && (paymentMethod === 'credit' || paymentMethod === 'debit') && (
          <div className="installment-section">
            <label>
              <input type="checkbox" checked={isInstallment} onChange={e => setIsInstallment(e.target.checked)} />
              Parcelado?
            </label>
            {isInstallment && (
               <div className="installment-input-wrapper">
                 <span>em</span>
                 <input type="number" value={installments} onChange={e => setInstallments(Math.max(2, parseInt(e.target.value, 10)))} min="2" />
                 <span>x</span>
               </div>
            )}
          </div>
        )}
        <button type="submit" className="submit-button">Adicionar</button>
      </form>
    </div>
  );
};

export default TransactionForm;

