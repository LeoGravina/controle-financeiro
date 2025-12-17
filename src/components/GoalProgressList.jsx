import React from 'react';

const getGoalProgressBarColor = (percentage) => {
    if (percentage >= 100) return 'var(--income-color)'; 
    if (percentage >= 75) return 'var(--primary-color)'; 
    return 'var(--pending-color)'; 
};

const GoalProgressList = ({ goals = [], onAddFundsClick, onWithdrawFundsClick, hideActions = false }) => { 

    if (goals.length === 0) {
        return (
            <div className="goal-progress-container">
                <h4>Progresso das Metas</h4>
                <p className="empty-message" style={{ padding: '15px 0'}}>
                    Nenhuma meta criada ainda. Crie na aba 'Metas'.
                </p>
            </div>
        );
    }

    const handleButtonClick = (e) => {
        e.stopPropagation(); 
    }

    return (
        <div className="goal-progress-container">
            <h4>Progresso das Metas</h4>
            <ul className="goal-progress-list">
                {goals 
                    .map(goal => {
                        const currentAmount = goal.currentAmount || 0;
                        const targetAmount = goal.targetAmount;
                        const percentage = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0;
                        const realPercentage = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
                        const barColor = getGoalProgressBarColor(realPercentage); 
                        const isComplete = realPercentage >= 100;

                        return (
                            <li key={goal.id} className={`goal-progress-item ${isComplete ? 'complete' : ''}`}>
                                <div className="goal-item-header"> 
                                    <span className="goal-item-name">
                                        {goal.goalName}
                                    </span>
                                    
                                    {!hideActions && (
                                        <div className="goal-item-actions">
                                            {!isComplete && (
                                                <button 
                                                    className="add-to-goal-button" 
                                                    onClick={(e) => { 
                                                        handleButtonClick(e); 
                                                        if (onAddFundsClick) {
                                                            onAddFundsClick(goal); 
                                                        }
                                                    }}
                                                    title={`Adicionar valor para ${goal.goalName}`}
                                                >
                                                    Contribuir
                                                </button>
                                            )}
                                            {currentAmount > 0 && (
                                                 <button 
                                                    className="withdraw-from-goal-button" 
                                                    onClick={(e) => { 
                                                        handleButtonClick(e); 
                                                        if (onWithdrawFundsClick) {
                                                            onWithdrawFundsClick(goal); 
                                                        }
                                                    }}
                                                    title={`Resgatar valor de ${goal.goalName}`}
                                                >
                                                    Resgatar
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="progress-bar-container goal-progress-bar-container">
                                    <div 
                                        className="progress-bar-fill goal-progress-bar-fill"
                                        style={{ width: `${percentage}%`, backgroundColor: barColor }}
                                    >
                                    </div>
                                </div>
                                
                                <div className="goal-item-values-container"> 
                                    <span className={`goal-item-values ${isComplete ? 'complete-text' : ''}`}>
                                        {currentAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / 
                                        {' '} 
                                        {targetAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        {` (${percentage.toFixed(0)}%)`} 
                                    </span>
                                     {isComplete && <span className="goal-complete-badge">🎉 Concluída!</span>}
                                </div>
                            </li>
                        );
                    })
                }
            </ul>
        </div>
    );
};

export default GoalProgressList;