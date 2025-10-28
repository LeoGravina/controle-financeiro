// ATUALIZADO: src/components/TransactionList.jsx
import React from 'react';
import { FaThumbtack } from 'react-icons/fa';

const TransactionList = ({ transactions = [], categories = [], onDeleteTransaction, onEditTransaction, onTogglePaid }) => {

    const handleActionClick = (e) => {
        e.stopPropagation();
    };

    return (
        <div >
            <ul>
                {transactions.length === 0 ? (
                    <p className="empty-message">Nenhuma transação para exibir.</p>
                ) : (
                    transactions
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map(t => {
                        const categoryColor = categories.find(c => c.name === t.category)?.color || '#bdc3c7';
                        const rowClass = t.type === 'income' ? 'income-row' : (t.isPaid ? 'paid-expense-row' : 'unpaid-expense-row');

                        return (
                            <li key={t.id} className={rowClass} style={{ borderLeftColor: categoryColor }}>
                                <div
                                  className="transaction-clickable-area"
                                  onClick={() => !t.isFixed && onEditTransaction(t)}
                                  style={{ cursor: t.isFixed ? 'default' : 'pointer' }}
                                >
                                    {t.type === 'expense' && (
                                        <label 
                                            className="paid-status-toggle" 
                                            onClick={handleActionClick} 
                                            aria-label={`Marcar ${t.description} como ${t.isPaid ? 'não pago' : 'pago'}`}
                                            data-tooltip={t.isPaid ? "Marcar como não pago" : "Marcar como pago"}
                                        >
                                            <input type="checkbox" checked={t.isPaid || false} onChange={() => onTogglePaid(t)} />
                                            <span className="checkmark"></span>
                                        </label>
                                    )}
                                    {t.type === 'income' && <div style={{width: '20px', height: '20px', flexShrink: 0}}></div>}

                                    <div className="transaction-details">
                                        <span>
                                            {t.isFixed && <FaThumbtack className="fixed-expense-icon" title="Gasto Fixo" />}
                                            {t.description}
                                        </span>
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
                                    <button
                                      className="delete-button"
                                      onClick={() => onDeleteTransaction(t.id, 'transaction')}
                                      disabled={t.isFixed}
                                      aria-label={`Excluir transação ${t.description}`}
                                    >
                                      ×
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