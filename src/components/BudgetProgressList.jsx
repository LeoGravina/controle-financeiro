import React from 'react';

const getProgressBarColor = (percentage) => {
    if (percentage > 100) return '#e74c3c'; // Vermelho (Estourado)
    if (percentage >= 80) return '#f39c12'; // Laranja (Atenção)
    return '#27ae60'; // Verde (OK)
};

const BudgetProgressList = ({ budgets = [], expensesByCategory = {} }) => {

    if (budgets.length === 0) {
        return (
            <div className="budget-progress-container card-style">
                <h4>Progresso dos Orçamentos</h4>
                <p style={{ color: '#999', padding: '15px 0', fontStyle: 'italic' }}>
                    Nenhum orçamento definido para este mês. Defina na aba 'Orçamentos'.
                </p>
            </div>
        );
    }

    const sortedBudgets = [...budgets].sort((a, b) => {
        const spentA = expensesByCategory[a.categoryName] || 0;
        const pctA = spentA / (a.limitAmount || 1);
        const spentB = expensesByCategory[b.categoryName] || 0;
        const pctB = spentB / (b.limitAmount || 1);
        return pctB - pctA;
    });

    return (
        <div className="budget-progress-container card-style">
            <h4>Progresso dos Orçamentos</h4>
            <ul className="budget-progress-list">
                {sortedBudgets.map(budget => {
                    const spentAmount = expensesByCategory[budget.categoryName] || 0;
                    const limitAmount = budget.limitAmount;
                    
                    const percentage = limitAmount > 0 ? Math.min((spentAmount / limitAmount) * 100, 100) : 0;
                    const realPercentage = limitAmount > 0 ? (spentAmount / limitAmount) * 100 : 0;
                    
                    const barColor = getProgressBarColor(realPercentage);
                    const isOverBudget = realPercentage > 100;

                    return (
                        <li key={budget.id} className="budget-progress-item">
                            
                            {/* Header: Nome e Valores */}
                            <div className="budget-item-header">
                                <span className="budget-item-name">{budget.categoryName}</span>
                                <span className="budget-item-values">
                                    <strong style={{ color: isOverBudget ? '#e74c3c' : 'inherit' }}>
                                        {spentAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </strong>
                                    {' / '}
                                    {limitAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>

                            {/* Barra */}
                            <div className="budget-progress-bar-track">
                                <div 
                                    className="budget-progress-bar-fill"
                                    style={{ 
                                        width: `${percentage}%`, 
                                        backgroundColor: barColor
                                    }}
                                ></div>
                            </div>

                            {/* Aviso */}
                            {isOverBudget && (
                                 <small className="budget-overflow-warning">
                                     ⚠️ Estourado em {(realPercentage - 100).toFixed(1)}%
                                 </small>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default BudgetProgressList;