// ATUALIZADO: src/components/GoalProgressList.jsx
// - Adicionada prop onAddFundsClick.
// - Adicionado botão "Contribuir" que chama onAddFundsClick.
// - Layout ajustado para o botão.
import React from 'react';

// Função auxiliar para cor da barra
const getGoalProgressBarColor = (percentage) => {
    if (percentage >= 100) return 'var(--income-color)'; 
    if (percentage >= 75) return 'var(--primary-color)'; 
    return 'var(--pending-color)'; 
};

// Adiciona a nova prop onAddFundsClick
const GoalProgressList = ({ goals = [], onAddFundsClick }) => { 

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

    // Função para evitar que o clique no botão propague
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
                                {/* Div para nome e botão */}
                                <div className="goal-item-header"> 
                                    <span className="goal-item-name">
                                        {goal.goalName}
                                    </span>
                                    {/* Botão Contribuir (só aparece se não completa) */}
                                    {!isComplete && (
                                        <button 
                                            className="add-to-goal-button" 
                                            onClick={(e) => { 
                                                handleButtonClick(e); // Impede propagação
                                                // Verifica se a função foi passada antes de chamar
                                                if (onAddFundsClick) {
                                                    onAddFundsClick(goal); // Chama a função do Dashboard
                                                }
                                            }}
                                            title={`Adicionar valor para ${goal.goalName}`}
                                        >
                                            Contribuir
                                        </button>
                                    )}
                                </div>
                                
                                {/* Barra de progresso */}
                                <div className="progress-bar-container goal-progress-bar-container">
                                    <div 
                                        className="progress-bar-fill goal-progress-bar-fill"
                                        style={{ width: `${percentage}%`, backgroundColor: barColor }}
                                    >
                                    </div>
                                </div>
                                
                                {/* Div para valores e badge de concluído */}
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