import React, { useState, useEffect, useMemo } from 'react';
import CurrencyInput from './CurrencyInput';
import Select from 'react-select';
import { Timestamp } from 'firebase/firestore';
import { FaCalendarAlt } from 'react-icons/fa';

const formatDateForInput = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : date.toDate();
    return d.toISOString().split('T')[0];
};

const paymentMethodOptions = [
    { value: 'debit', label: 'Débito' },
    { value: 'credit', label: 'Crédito' },
    { value: 'cash', label: 'Dinheiro' },
    { value: 'pix', label: 'Pix' }
];

const typeOptions = [
    { value: 'expense', label: 'Despesa' },
    { value: 'income', label: 'Recebimento' }
];

const EditTransactionModal = ({ isOpen, onClose, transaction, categories = [], onSave }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [type, setType] = useState('expense');
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
        if (transaction) {
            setDate(formatDateForInput(transaction.date));
            setType(transaction.type || 'expense');
            const currentCategory = categoryOptions.find(opt => opt.label === transaction.category);
            setCategory(currentCategory || null);
            const currentPayment = paymentMethodOptions.find(opt => opt.value === transaction.paymentMethod);
            setPaymentMethod(currentPayment || null);
            
            const installmentMatch = transaction.description?.match(/\((\d+)\/(\d+)\)$/);
            
            if (installmentMatch) {
                setIsInstallment(true);
                setInstallments(parseInt(installmentMatch[2], 10));
                setDescription(transaction.description.replace(/\s*\(\d+\/\d+\)$/, '').trim());

                if (transaction.installmentGroupId && transaction.totalAmount) {
                    setAmount(transaction.totalAmount);
                } else {
                    setAmount(transaction.amount || '');
                }
            } else {
                setIsInstallment(transaction.isInstallment || false);
                setInstallments(transaction.installments || 2);
                setDescription(transaction.description || '');
                setAmount(transaction.amount || '');
            }
        }
    }, [transaction, categoryOptions]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!description.trim() || !amount || parseFloat(amount) <= 0 || !category || !paymentMethod) {
            alert("Preencha todos os campos corretamente.");
            return;
        }

        const selectedCategoryName = category ? category.label : 'Outros';
        const selectedPaymentMethod = paymentMethod ? paymentMethod.value : '';

        const updatedTransaction = {
            ...transaction,
            description: description.trim(),
            amount: parseFloat(amount), 
            date: Timestamp.fromDate(new Date(date + 'T12:00:00')),
            type,
            category: selectedCategoryName,
            paymentMethod: selectedPaymentMethod,
            isInstallment: type === 'expense' && ['credit', 'debit', 'pix'].includes(selectedPaymentMethod) && isInstallment,
            installments: type === 'expense' && ['credit', 'debit', 'pix'].includes(selectedPaymentMethod) && isInstallment ? installments : 1,
        };
        delete updatedTransaction.isFixed;
        onSave(updatedTransaction);
    };

    if (!isOpen || !transaction) return null;

    const handleContentClick = (e) => e.stopPropagation();

    const currentTypeOption = typeOptions.find(opt => opt.value === type);

    return (
        <div className="modal-overlay open" onClick={onClose}>
            <div className="modal-content" onClick={handleContentClick}>
                <div className="form-container-header" style={{ marginBottom: '20px' }}>
                    <h4>Editar Transação</h4>
                    <div className="form-date-picker">
                        <FaCalendarAlt />
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="auth-form" style={{ gap: '15px' }}>
                    <input type="text" placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} required />
                    
                    <div className="form-row">
                        <CurrencyInput value={amount} onChange={setAmount} />
                        <Select
                            options={paymentMethodOptions}
                            value={paymentMethod}
                            onChange={setPaymentMethod}
                            placeholder="Pagamento"
                            className="react-select-container"
                            classNamePrefix="react-select"
                        />
                    </div>
                    
                    <Select
                        options={categoryOptions}
                        value={category}
                        onChange={setCategory}
                        placeholder="Categoria"
                        className="react-select-container"
                        classNamePrefix="react-select"
                    />

                    <Select
                        options={typeOptions}
                        value={currentTypeOption}
                        onChange={(option) => setType(option.value)}
                        className="react-select-container"
                        classNamePrefix="react-select"
                    />

                    {type === 'expense' && ['credit', 'debit', 'pix'].includes(paymentMethod?.value) && (
                        <div className="installment-section">
                            <label>
                                <input type="checkbox" checked={isInstallment} onChange={e => setIsInstallment(e.target.checked)}/>
                                Parcelado?
                            </label>
                            {isInstallment && (
                                <div className="installment-input-wrapper">
                                    <span>em</span>
                                    <input type="number" value={installments} onChange={e => setInstallments(Math.max(1, parseInt(e.target.value, 10)))} min="1"/>
                                    <span>x</span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="modal-actions" style={{ marginTop: '20px' }}>
                        <button type="button" onClick={onClose} className="modal-button cancel">Cancelar</button>
                        <button type="submit" className="modal-button confirm" style={{ backgroundColor: 'var(--primary-color)' }}>Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditTransactionModal;