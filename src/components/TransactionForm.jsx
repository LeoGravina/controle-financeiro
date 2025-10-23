// ATUALIZADO: src/components/TransactionForm.jsx
import React, { useState, useEffect, useMemo } from 'react';
import CurrencyInput from './CurrencyInput'; // Sem extensão
import { FaArrowUp, FaArrowDown, FaCalendarAlt } from 'react-icons/fa'; // Importa o ícone de calendário
import Select from 'react-select';

const getTodayString = () => new Date().toISOString().split('T')[0];

const paymentMethodOptions = [
    { value: 'debit', label: 'Débito' },
    { value: 'credit', label: 'Crédito' },
    { value: 'cash', label: 'Dinheiro' },
    { value: 'pix', label: 'Pix' }
];

const TransactionForm = ({ categories = [], onAddTransaction, type, setType }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(getTodayString()); // Data ainda é controlada aqui
    const [category, setCategory] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState(null);
    const [isInstallment, setIsInstallment] = useState(false);
    const [installments, setInstallments] = useState(2);

    const categoryOptions = useMemo(() =>
        categories
            .map(cat => ({ value: cat.id, label: cat.name }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        [categories]
    );

    useEffect(() => {
        const pMethod = paymentMethod?.value;
        if (!['credit', 'debit', 'pix'].includes(pMethod)) {
            setIsInstallment(false);
        }
    }, [paymentMethod]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!description.trim() || !amount || parseFloat(amount) <= 0 || !category || !paymentMethod) {
            alert("Por favor, preencha todos os campos obrigatórios.");
            return;
        }

        const selectedCategoryName = category ? category.label : 'Outros';
        const selectedPaymentMethod = paymentMethod ? paymentMethod.value : '';

        onAddTransaction({
            description: description.trim(),
            amount: parseFloat(amount),
            date: new Date(date + 'T12:00:00'), // Pega a data do estado
            type,
            category: selectedCategoryName,
            paymentMethod: selectedPaymentMethod,
            isInstallment: type === 'expense' && ['credit', 'debit', 'pix'].includes(selectedPaymentMethod) && isInstallment,
            installments: type === 'expense' && ['credit', 'debit', 'pix'].includes(selectedPaymentMethod) && isInstallment ? installments : 1,
            isPaid: false
        });

        // Reset Form - Mantém o tipo
        setDescription(''); setAmount(''); setDate(getTodayString()); setIsInstallment(false);
        setCategory(null); setPaymentMethod(null);
    };

    return (
        <div className="form-container">
            {/* *** NOVO CABEÇALHO DO FORMULÁRIO *** */}
            <div className="form-container-header">
                <h3>Adicionar Transação</h3>
                <div className="form-date-picker">
                    <FaCalendarAlt /> {/* Ícone */}
                    <input 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)} 
                        required 
                        aria-label="Data da transação"
                    />
                </div>
            </div>

            {/* Botões de tipo (Ganho/Gasto) */}
            <div className="type-toggle-container">
                <button type="button" className={`type-toggle-button income ${type === 'income' ? 'active' : ''}`} onClick={() => setType('income')}> <FaArrowUp /> Ganho </button>
                <button type="button" className={`type-toggle-button expense ${type === 'expense' ? 'active' : ''}`} onClick={() => setType('expense')}> <FaArrowDown /> Gasto </button>
            </div>

            <form onSubmit={handleSubmit} style={{marginTop: '0px'}}>
                <input type="text" placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} required />
                
                {/* *** NOVO: Linha Valor + Pagamento *** */}
                <div className="form-row">
                    <CurrencyInput value={amount} onChange={setAmount} />
                    <Select
                        options={paymentMethodOptions}
                        value={paymentMethod}
                        onChange={setPaymentMethod}
                        placeholder="Pagamento"
                        className="react-select-container"
                        classNamePrefix="react-select"
                        required
                    />
                </div>

                {/* Categoria agora ocupa linha inteira */}
                <Select
                    options={categoryOptions}
                    value={category}
                    onChange={setCategory}
                    placeholder="Categoria"
                    className="react-select-container"
                    classNamePrefix="react-select"
                    noOptionsMessage={() => "Nenhuma categoria"}
                    required
                />

                {/* Condição de parcelamento (inalterada, mas agora depende da linha acima) */}
                {type === 'expense' && ['credit', 'debit', 'pix'].includes(paymentMethod?.value) && (
                    <div className="installment-section">
                        <label>
                            <input type="checkbox" checked={isInstallment} onChange={e => setIsInstallment(e.target.checked)} />
                            Parcelado?
                        </label>
                        {isInstallment && (
                           <div className="installment-input-wrapper">
                             <span>em</span>
                             <input type="number" value={installments} onChange={e => setInstallments(Math.max(1, parseInt(e.target.value, 10)))} min="1" />
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