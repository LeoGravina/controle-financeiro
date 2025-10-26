// NOVO ARQUIVO: src/components/GoalManager.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, addDoc, Timestamp, deleteDoc, doc } from 'firebase/firestore'; // Importações do Firestore
import { db, auth } from '../firebase/config';
import CurrencyInput from './CurrencyInput';
import { FaTrash } from 'react-icons/fa'; // Ícone para deletar

const GoalManager = () => {
    const [goals, setGoals] = useState([]); // Metas do usuário
    const [loading, setLoading] = useState(true);
    const [goalName, setGoalName] = useState(''); // Input Nome da Meta
    const [targetAmount, setTargetAmount] = useState(''); // Input Valor Alvo

    const user = auth.currentUser;

    // Efeito para buscar as metas do usuário em tempo real
    useEffect(() => {
        if (!user) {
            setGoals([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const q = query(collection(db, 'goals'), where('userId', '==', user.uid));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedGoals = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Ordena as metas, talvez por data de criação ou nome
            fetchedGoals.sort((a, b) => a.goalName.localeCompare(b.goalName)); 
            setGoals(fetchedGoals);
            setLoading(false);
        }, (error) => {
            console.error("Erro ao buscar metas:", error);
            setLoading(false);
        });

        // Limpa o listener ao desmontar
        return () => unsubscribe();

    }, [user]); // Depende do usuário logado

    // Função para adicionar uma nova meta
    const handleAddGoal = async (e) => {
        e.preventDefault();
        if (!user || !goalName.trim() || targetAmount === '' || parseFloat(targetAmount) <= 0) {
            alert("Preencha o nome e um valor alvo válido para a meta.");
            return;
        }

        const newGoal = {
            userId: user.uid,
            goalName: goalName.trim(),
            targetAmount: parseFloat(targetAmount),
            currentAmount: 0, // Começa com 0
            createdAt: Timestamp.now()
        };

        try {
            await addDoc(collection(db, 'goals'), newGoal);
            // Limpa o formulário após adicionar
            setGoalName('');
            setTargetAmount('');
        } catch (error) {
            console.error("Erro ao adicionar meta:", error);
            alert("Erro ao salvar a meta. Tente novamente.");
        }
    };
    
    // Função para deletar uma meta (adicionada para gerenciamento básico)
    const handleDeleteGoal = async (goalId, goalName) => {
        if (!user || !window.confirm(`Tem certeza que deseja excluir a meta "${goalName}"? Todo o progresso será perdido.`)) {
            return;
        }
        try {
            await deleteDoc(doc(db, 'goals', goalId));
            // A lista atualizará automaticamente devido ao onSnapshot
        } catch (error) {
            console.error("Erro ao excluir meta:", error);
            alert("Erro ao excluir a meta. Tente novamente.");
        }
    }


    if (loading) {
        return <p style={{ padding: '20px', textAlign: 'center' }}>Carregando metas...</p>;
    }
     if (!user) {
         return <p style={{ padding: '20px', textAlign: 'center' }}>Faça login para gerenciar suas metas.</p>;
    }

    return (
        <div className="goal-manager"> {/* Classe para estilização */}
            <h4>Criar Nova Meta</h4>
            <form onSubmit={handleAddGoal} className="goal-add-form">
                <input
                    type="text"
                    placeholder="Nome da Meta (ex: Viagem)"
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    required
                />
                <CurrencyInput
                    value={targetAmount}
                    onChange={setTargetAmount}
                    placeholder="Valor Alvo (R$)"
                    required
                    aria-label="Valor Alvo da Meta"
                />
                <button type="submit" className="submit-button goal-add-button">
                    Criar Meta
                </button>
            </form>

            <h4 style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                Minhas Metas
            </h4>
            {goals.length === 0 ? (
                <p className="empty-message">Você ainda não criou nenhuma meta.</p>
            ) : (
                <ul className="goal-list">
                    {goals.map(goal => (
                        <li key={goal.id} className="goal-list-item">
                           <div className="goal-info">
                             <span className="goal-name">{goal.goalName}</span>
                             <small className="goal-target-amount">
                                Alvo: {goal.targetAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                             </small>
                             {/* Futuramente adicionar barra de progresso aqui */}
                           </div>
                           <button 
                                onClick={() => handleDeleteGoal(goal.id, goal.goalName)} 
                                className="action-button delete goal-delete-button" 
                                title={`Excluir meta ${goal.goalName}`}
                           >
                             <FaTrash />
                           </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default GoalManager;