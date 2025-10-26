// NOVO ARQUIVO: src/components/GoalProgressList.jsx
import React from 'react';

// Função auxiliar para cor da barra
const getGoalProgressBarColor = (percentage) => {
    if (percentage >= 100) return 'var(--income-color)'; // Concluído (verde)
    if (percentage >= 75) return 'var(--primary-color)'; // Bom progresso (azul principal)
    // Se quiser usar o --primary-color-light para progresso menor:
    // if (percentage >= 40) return 'var(--primary-color-light)'; // Progresso médio
    return 'var(--pending-color)'; // Progresso inicial (amarelo/laranja)
};

const GoalProgressList = ({ goals = [] }) => {

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

    return (
        <div className="goal-progress-container">
            <h4>Progresso das Metas</h4>
            <ul className="goal-progress-list">
                {goals // Assume que já vem ordenado do Dashboard
                    .map(goal => {
                        const currentAmount = goal.currentAmount || 0;
                        const targetAmount = goal.targetAmount;
                        // Calcula porcentagem, limitando a 100% para a barra
                        const percentage = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0;
                         // Calcula porcentagem real para a cor (pode ser > 100)
                        const realPercentage = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
                        const barColor = getGoalProgressBarColor(realPercentage); // Usa porcentagem real para cor
                        const isComplete = realPercentage >= 100;

                        return (
                            <li key={goal.id} className={`goal-progress-item ${isComplete ? 'complete' : ''}`}>
                                <div className="goal-item-info">
                                    <span className="goal-item-name">
                                        {goal.goalName}
                                    </span>
                                    <span className={`goal-item-values ${isComplete ? 'complete-text' : ''}`}>
                                        {currentAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / 
                                        {' '} 
                                        {targetAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        {` (${percentage.toFixed(0)}%)`} 
                                    </span>
                                </div>
                                <div className="progress-bar-container goal-progress-bar-container">
                                    <div 
                                        className="progress-bar-fill goal-progress-bar-fill"
                                        style={{ width: `${percentage}%`, backgroundColor: barColor }}
                                    >
                                    </div>
                                </div>
                                {/* Futuramente: Adicionar botão aqui para "Adicionar Valor" */}
                                {/* <button className="add-to-goal-button">Contribuir</button> */}
                            </li>
                        );
                    })
                }
            </ul>
        </div>
    );
};

export default GoalProgressList;