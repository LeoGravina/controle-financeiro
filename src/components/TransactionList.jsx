import React from 'react';

const TransactionList = ({ transactions = [], categories = [], onDeleteTransaction }) => (
    <div className="list-container">
        <h3>Transações do Mês</h3>
        <ul>
            {transactions.length === 0 ? (
                <p className="empty-message">Nenhuma transação neste mês.</p>
            ) : (
                transactions
                  .sort((a, b) => new Date(b.date) - new Date(a.date)) // Ordena pela data mais recente
                  .map(t => {
                    const categoryColor = categories.find(c => c.name === t.category)?.color || '#bdc3c7';
                    return (
                        <li key={t.id} style={{ borderLeftColor: categoryColor }}> {/* Aplica a cor na borda esquerda */}
                            <div className="transaction-details">
                                <span>{t.description}</span>
                                <small>{new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - {t.category}</small>
                            </div>
                            <span className={`transaction-amount ${t.type}`}>
                                {t.type === 'expense' ? '- ' : '+ '}
                                R$ {t.amount.toFixed(2).replace('.', ',')}
                            </span>
                            <button className="delete-btn" onClick={() => onDeleteTransaction(t.id)} aria-label={`Excluir transação ${t.description}`}>
                              🗑️ {/* Ícone de lixeira mais claro */}
                            </button>
                        </li>
                    );
                })
            )}
        </ul>
    </div>
);

export default TransactionList;