import React from 'react';

const getProgressBarColor = (percentage) => {
    if (percentage > 100) return 'var(--expense-color)'; 
    if (percentage >= 80) return 'var(--pending-color)'; 
    return 'var(--income-color)'; 
};

const BudgetProgressList = ({ budgets = [], expensesByCategory = {} }) => {

    if (budgets.length === 0) {
        return (
            <div className="budget-progress-container">
                <h4>Progresso dos Orçamentos</h4>
                <p className="empty-message" style={{ padding: '15px 0'}}>
                    Nenhum orçamento definido para este mês. Defina na aba 'Orçamentos'.
                </p>
            </div>
        );
    }

    return (
        <div className="budget-progress-container">
            <h4>Progresso dos Orçamentos</h4>
            <ul className="budget-progress-list">
                {budgets
                    .sort((a, b) => a.categoryName.localeCompare(b.categoryName)) 
                    .map(budget => {
                        const spentAmount = expensesByCategory[budget.categoryName] || 0;
                        const limitAmount = budget.limitAmount;
                        const percentage = limitAmount > 0 ? Math.min((spentAmount / limitAmount) * 100, 100) : 0;
                        const realPercentage = limitAmount > 0 ? (spentAmount / limitAmount) * 100 : 0;
                        const barColor = getProgressBarColor(realPercentage);
                        const isOverBudget = realPercentage > 100;

                        return (
                            <li key={budget.id} className={`budget-progress-item ${isOverBudget ? 'over-budget' : ''}`}>
                                <div className="budget-item-info">
                                    <span className="budget-item-category">{budget.categoryName}</span>
                                    <span className={`budget-item-values ${isOverBudget ? 'over-budget-text' : ''}`}>
                                        {spentAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / 
                                        {' '} 
                                        {limitAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </div>
                                <div className="progress-bar-container">
                                    <div 
                                        className="progress-bar-fill"
                                        style={{ width: `${percentage}%`, backgroundColor: barColor }}
                                    >
                                    </div>
                                </div>
                                {isOverBudget && (
                                     <small className="over-budget-warning">Orçamento estourado!</small>
                                )}
                            </li>
                        );
                    })
                }
            </ul>
        </div>
    );
};

export default BudgetProgressList;