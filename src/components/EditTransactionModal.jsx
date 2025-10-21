import React, { useState, useEffect } from 'react';
import CurrencyInput from './CurrencyInput.jsx';
import { Timestamp } from 'firebase/firestore';

// Função para formatar data (AAAA-MM-DD)
const formatDateForInput = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : date.toDate(); // Converte Timestamp se necessário
    return d.toISOString().split('T')[0];
};


const EditTransactionModal = ({ isOpen, onClose, transaction, categories = [], onSave }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [type, setType] = useState('expense');
    const [category, setCategory] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('debit'); // Novo estado
    const [isInstallment, setIsInstallment] = useState(false); // Já existia
    const [installments, setInstallments] = useState(2);    // Já existia

    useEffect(() => {
        if (transaction) {
            setDescription(transaction.description || '');
            setAmount(transaction.amount || '');
            setDate(formatDateForInput(transaction.date));
            setType(transaction.type || 'expense');
            // Encontra o ID da categoria pelo nome
            const currentCategory = categories.find(cat => cat.name === transaction.category);
            setCategory(currentCategory ? currentCategory.id : '');
            setPaymentMethod(transaction.paymentMethod || 'debit'); // Carrega método
            // Ajusta descrição e estado de parcelas se for uma parcela existente
            const installmentMatch = transaction.description?.match(/\((\d+)\/(\d+)\)$/);
            if (installmentMatch) {
                setIsInstallment(true);
                setInstallments(parseInt(installmentMatch[2], 10));
                // Remove a parte (X/Y) da descrição para edição
                setDescription(transaction.description.replace(/\s*\(\d+\/\d+\)$/, '').trim());
            } else {
                setIsInstallment(transaction.isInstallment || false); // Carrega estado de parcela
                setInstallments(transaction.installments || 2);
            }

        }
    }, [transaction, categories]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!description.trim() || !amount || parseFloat(amount) <= 0 || !category) {
            alert("Por favor, preencha todos os campos corretamente.");
            return;
        }

        const updatedTransaction = {
            ...transaction, // Mantém ID e outros campos não editados
            description: description.trim(),
            amount: parseFloat(amount),
            date: Timestamp.fromDate(new Date(date + 'T12:00:00')), // Salva como Timestamp
            type,
            category: categories.find(c => c.id === category)?.name || 'Outros',
            paymentMethod,
            // Lógica para salvar info de parcela apenas se for crédito parcelado
            isInstallment: paymentMethod === 'credit' && isInstallment,
            installments: paymentMethod === 'credit' && isInstallment ? installments : 1,
        };
        onSave(updatedTransaction);
    };

    if (!isOpen || !transaction) return null;

    const categoriesToShow = categories; // Mostra todas as categorias na edição

    return (
        <div className="modal-overlay open">
            <div className="modal-content">
                <h4>Editar Transação</h4>
                <form onSubmit={handleSubmit} className="auth-form" style={{ gap: '15px' }}>
                    <input type="text" placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} required />
                    <CurrencyInput value={amount} onChange={setAmount} />
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                    <select value={type} onChange={(e) => setType(e.target.value)}>
                        <option value="expense">Despesa</option>
                        <option value="income">Ganho</option>
                    </select>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} required>
                        <option value="" disabled>Selecione a categoria</option>
                        {categoriesToShow.map(cat => ( <option key={cat.id} value={cat.id}>{cat.name}</option> ))}
                    </select>

                    {/* === Novos Campos === */}
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                        <option value="debit">Cartão de Débito</option>
                        <option value="credit">Cartão de Crédito</option>
                        <option value="cash">Dinheiro</option>
                        <option value="pix">Pix</option>
                    </select>

                    {/* Mostra opções de crédito APENAS se for Cartão de Crédito */}
                    {paymentMethod === 'credit' && (
                        <div className="installment-section" style={{marginTop: '0px'}}>
                            <label>
                                <input type="checkbox" checked={isInstallment} onChange={e => setIsInstallment(e.target.checked)}/>
                                Parcelado?
                            </label>
                            {isInstallment && (
                                <input type="number" value={installments} onChange={e => setInstallments(parseInt(e.target.value, 10))} min="2"/>
                            )}
                        </div>
                    )}
                    {/* === Fim Novos Campos === */}


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