// ATUALIZADO: src/components/TransactionList.jsx
import React from 'react';

const TransactionList = ({ transactions = [], categories = [], onDeleteTransaction, onEditTransaction, onTogglePaid }) => {

    const handleActionClick = (e) => {
        e.stopPropagation();
    };

    // Função para determinar a classe da linha
    const getRowClass = (transaction) => {
        if (transaction.type === 'income') {
            return 'income-row';
        } else { // É despesa
            return transaction.isPaid ? 'paid-expense-row' : 'unpaid-expense-row';
        }
    };

    return (
        <div className="list-container">
            <h3>Transações do Mês</h3>
            <ul>
                {transactions.length === 0 ? (
                    <p className="empty-message">Nenhuma transação neste mês.</p>
                ) : (
                    transactions
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map(t => {
                        const categoryColor = categories.find(c => c.name === t.category)?.color || '#bdc3c7';
                        const rowClass = getRowClass(t); // Obtém a classe correta

                        return (
                            // Aplica a classe dinâmica na <li>
                            <li key={t.id} className={rowClass} style={{ borderLeftColor: categoryColor }}>

                                <div className="transaction-clickable-area" onClick={() => onEditTransaction(t)}>
                                    {/* Checkbox customizado - Visível apenas para despesas */}
                                    {t.type === 'expense' && (
                                        <label className="paid-status-toggle" onClick={handleActionClick} aria-label={`Marcar ${t.description} como ${t.isPaid ? 'não pago' : 'pago'}`}>
                                            <input type="checkbox" checked={t.isPaid || false} onChange={() => onTogglePaid(t)} />
                                            <span className="checkmark"></span>
                                        </label>
                                    )}
                                    {/* Espaçador para ganhos, para manter alinhamento */}
                                    {t.type === 'income' && <div style={{width: '20px', height: '20px', flexShrink: 0}}></div>}


                                    <div className="transaction-details">
                                        <span>{t.description}</span>
                                        <small>
                                            {new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - {t.category}
                                            {t.paymentMethod && <span className="transaction-payment-method">{t.paymentMethod}</span>}
                                        </small>
                                    </div>
                                    <div className="transaction-amount-wrapper">
                                        <span className={`transaction-amount ${t.type}`}>
                                            {t.type === 'expense' ? '- ' : '+ '}
                                            {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </div>
                                </div>

                                <div className="transaction-actions" onClick={handleActionClick}>
                                    <button className="delete-list-button" onClick={() => onDeleteTransaction(t.id, 'transaction')} aria-label={`Excluir transação ${t.description}`}>
                                      🗑️
                                    </button>
                                </div>
                            </li>
                        );
                    })
                )}
            </ul>
        </div>
    );
};

export default TransactionList;