// ATUALIZADO: src/components/TransactionList.jsx
// - Adicionada prop 'isReadOnly' para desabilitar ações.
import React from 'react';
import { FaThumbtack } from 'react-icons/fa';

// Adiciona a nova prop 'isReadOnly', default é false
const TransactionList = ({ transactions = [], categories = [], onDeleteTransaction, onEditTransaction, onTogglePaid, isReadOnly = false }) => {

    const handleActionClick = (e) => {
        // Impede que o clique nos botões/checkbox ative o onClick da linha (se houver)
        e.stopPropagation();
    };

    return (
        <div> {/* Mantém a div externa por consistência */}
            <ul>
                {transactions.length === 0 ? (
                    <p className="empty-message">Nenhuma transação para exibir.</p>
                ) : (
                    transactions
                      // Ordena pela data mais recente primeiro
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map(t => {
                        const categoryColor = categories.find(c => c.name === t.category)?.color || '#bdc3c7';
                        const rowClass = t.type === 'income' ? 'income-row' : (t.isPaid ? 'paid-expense-row' : 'unpaid-expense-row');

                        return (
                            <li key={t.id} className={rowClass} style={{ borderLeftColor: categoryColor }}>
                                <div
                                  className="transaction-clickable-area"
                                  // Remove o onClick se for readOnly ou se for Gasto Fixo
                                  onClick={!isReadOnly && !t.isFixed ? () => onEditTransaction(t) : undefined}
                                  // Remove o cursor pointer se for readOnly ou Gasto Fixo
                                  style={{ cursor: isReadOnly || t.isFixed ? 'default' : 'pointer' }}
                                >
                                    {/* Checkbox de Pagamento (para Despesas) */}
                                    {t.type === 'expense' && (
                                        <label 
                                            className="paid-status-toggle" 
                                            // Impede que o clique na label propague para a linha
                                            onClick={handleActionClick} 
                                            aria-label={`Marcar ${t.description} como ${t.isPaid ? 'não pago' : 'pago'}`}
                                            data-tooltip={isReadOnly ? '' : (t.isPaid ? "Marcar como não pago" : "Marcar como pago")} // Remove tooltip se readOnly
                                        >
                                            <input 
                                                type="checkbox" 
                                                checked={t.isPaid || false} 
                                                // Desabilita o checkbox se for readOnly
                                                disabled={isReadOnly} 
                                                // Só permite onChange se não for readOnly
                                                onChange={() => !isReadOnly && onTogglePaid(t)} 
                                            />
                                            <span className="checkmark"></span>
                                        </label>
                                    )}
                                    {/* Mantém o espaço vazio para alinhar ganhos */}
                                    {t.type === 'income' && <div style={{width: '20px', height: '20px', flexShrink: 0}}></div>}

                                    {/* Detalhes da Transação */}
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
                                    {/* Valor da Transação */}
                                    <div className="transaction-amount-wrapper">
                                        <span className={`transaction-amount ${t.type}`}>
                                            {t.type === 'expense' ? '- ' : '+ '}
                                            {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Botão de Excluir (Renderiza APENAS se NÃO for readOnly) */}
                                {!isReadOnly && (
                                    <div className="transaction-actions" onClick={handleActionClick}>
                                        <button
                                          className="delete-button"
                                          onClick={() => onDeleteTransaction(t.id, 'transaction')}
                                          // Mantém desabilitado para Gasto Fixo
                                          disabled={t.isFixed} 
                                          aria-label={`Excluir transação ${t.description}`}
                                        >
                                          ×
                                        </button>
                                    </div>
                                )}
                            </li>
                        );
                    })
                )}
            </ul>
        </div>
    );
};

export default TransactionList;