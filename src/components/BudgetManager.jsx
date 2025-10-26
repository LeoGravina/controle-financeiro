// ATUALIZADO: src/components/BudgetManager.jsx
// - Botão Editar removido.
// - Linha (li) agora é clicável para editar (quando não está em modo edição).
// - stopPropagation adicionado ao botão delete.
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore'; // deleteDoc importado
import { db, auth } from '../firebase/config'; 
import Select from 'react-select';
import CurrencyInput from './CurrencyInput';
import { /* FaEdit removido */ FaSave, FaTimes } from 'react-icons/fa'; 

const BudgetManager = ({ categories = [], currentMonth }) => {
    const [budgets, setBudgets] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [editingBudgetId, setEditingBudgetId] = useState(null); 
    const [editAmount, setEditAmount] = useState(''); 
    const [selectedCategoryToAdd, setSelectedCategoryToAdd] = useState(null); 
    const [addAmount, setAddAmount] = useState(''); 

    const user = auth.currentUser;
    const month = currentMonth.getMonth();
    const year = currentMonth.getFullYear();

    // Busca orçamentos do Firestore para o mês/ano atual
    const fetchBudgets = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const q = query(collection(db, 'budgets'),
                where('userId', '==', user.uid),
                where('month', '==', month),
                where('year', '==', year)
            );
            const querySnapshot = await getDocs(q);
            const fetchedBudgets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBudgets(fetchedBudgets);
        } catch (error) {
            console.error("Erro ao buscar orçamentos:", error);
        } finally {
            setLoading(false);
        }
    };

    // Efeito para buscar orçamentos quando o mês ou usuário mudar
    useEffect(() => {
        fetchBudgets();
    }, [currentMonth, user]); 

    // Opções para o Select de adicionar (exclui categorias que JÁ têm orçamento)
    const categoryOptionsToAdd = useMemo(() => {
        const budgetedCategoryNames = budgets.map(b => b.categoryName);
        return categories
            .filter(cat => !budgetedCategoryNames.includes(cat.name)) 
            .map(cat => ({ value: cat.name, label: cat.name })) 
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [categories, budgets]);

    // Função para INICIAR a edição de um orçamento existente
    const handleEditClick = (budget) => {
        setEditingBudgetId(budget.id);
        setEditAmount(budget.limitAmount); 
    };

    // Função para CANCELAR a edição
    const handleCancelEdit = () => {
        setEditingBudgetId(null);
        setEditAmount('');
    };

    // Função para SALVAR um orçamento editado (UPDATE)
    const handleSaveEdit = async (budgetId) => {
        if (!user || editAmount === '' || parseFloat(editAmount) < 0) return;
        
        const newLimit = parseFloat(editAmount);
        const budgetRef = doc(db, 'budgets', budgetId);

        try {
            await updateDoc(budgetRef, { limitAmount: newLimit });
            setBudgets(prevBudgets => 
                prevBudgets.map(b => b.id === budgetId ? { ...b, limitAmount: newLimit } : b)
            );
            handleCancelEdit(); 
        } catch (error) {
            console.error("Erro ao atualizar orçamento:", error);
            alert("Erro ao salvar. Tente novamente.");
        }
    };

     // Função para ADICIONAR um novo orçamento (ADD)
     const handleAddBudget = async (e) => {
        e.preventDefault();
        if (!user || !selectedCategoryToAdd || addAmount === '' || parseFloat(addAmount) <= 0) {
            alert("Selecione uma categoria e insira um limite válido.");
            return;
        }

        const categoryName = selectedCategoryToAdd.value;
        const limitAmount = parseFloat(addAmount);

        const existing = budgets.find(b => b.categoryName === categoryName);
        if (existing) {
            alert("Já existe um orçamento para esta categoria neste mês.");
            return;
        }

        try {
            const docRef = await addDoc(collection(db, 'budgets'), {
                userId: user.uid,
                categoryName,
                month,
                year,
                limitAmount
            });
            setBudgets(prev => [...prev, { id: docRef.id, userId: user.uid, categoryName, month, year, limitAmount }]);
            setSelectedCategoryToAdd(null);
            setAddAmount('');
        } catch (error) {
            console.error("Erro ao adicionar orçamento:", error);
            alert("Erro ao adicionar. Tente novamente.");
        }
    };

    // Função para REMOVER um orçamento
    const handleDeleteBudget = async (e, budgetId, categoryName) => {
        e.stopPropagation(); // Impede que o clique no botão ative a edição da linha
        if (!user || !window.confirm(`Tem certeza que deseja remover o orçamento para "${categoryName}"?`)) return;

        try {
            await deleteDoc(doc(db, 'budgets', budgetId));
            setBudgets(prev => prev.filter(b => b.id !== budgetId));
        } catch (error) {
            console.error("Erro ao remover orçamento:", error);
            alert("Erro ao remover. Tente novamente.");
        }
    }


    if (loading) {
        return <p style={{ padding: '20px', textAlign: 'center' }}>Carregando orçamentos...</p>;
    }
    if (!user) {
         return <p style={{ padding: '20px', textAlign: 'center' }}>Faça login para ver os orçamentos.</p>;
    }

    return (
        <div className="budget-manager">
            <h4>Adicionar Orçamento</h4>
            <form onSubmit={handleAddBudget} className="budget-add-form">
                 <Select
                    options={categoryOptionsToAdd}
                    value={selectedCategoryToAdd}
                    onChange={setSelectedCategoryToAdd}
                    placeholder="-- Categoria --"
                    className="react-select-container budget-category-select" // Adiciona classe específica se precisar
                    classNamePrefix="react-select"
                    noOptionsMessage={() => "Todas as categorias já têm orçamento"}
                    required
                />
                <CurrencyInput 
                    value={addAmount} 
                    onChange={setAddAmount} 
                    placeholder="Limite (R$)"
                    required
                    aria-label="Limite do Orçamento" // Melhora acessibilidade
                />
                <button type="submit" className="submit-button budget-add-button">
                    Adicionar
                </button>
            </form>

            <h4 style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                Orçamentos do Mês
            </h4>
            {budgets.length === 0 ? (
                <p className="empty-message">Nenhum orçamento definido para este mês.</p>
            ) : (
                <ul className="budget-list">
                    {budgets.sort((a,b) => a.categoryName.localeCompare(b.categoryName)).map(budget => (
                        <li 
                            key={budget.id} 
                            onClick={editingBudgetId !== budget.id ? () => handleEditClick(budget) : undefined}
                            className={editingBudgetId !== budget.id ? 'editable' : ''}
                            title={editingBudgetId !== budget.id ? `Editar orçamento de ${budget.categoryName}` : ''} // Adiciona title para acessibilidade
                        >
                            {editingBudgetId === budget.id ? (
                                // Modo Edição
                                <>
                                    <span className="budget-category-name">{budget.categoryName}</span>
                                    <div className="budget-edit-input">
                                        <CurrencyInput 
                                            value={editAmount} 
                                            onChange={setEditAmount}
                                            aria-label={`Novo limite para ${budget.categoryName}`}
                                        />
                                    </div>
                                    <div className="budget-actions">
                                        {/* Adicionado stopPropagation aos botões de salvar/cancelar */}
                                        <button onClick={(e) => { e.stopPropagation(); handleSaveEdit(budget.id); }} className="action-button save" title="Salvar"> <FaSave /> </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }} className="action-button cancel" title="Cancelar"> <FaTimes /> </button>
                                    </div>
                                </>
                            ) : (
                                // Modo Visualização
                                <>
                                    <span className="budget-category-name">{budget.categoryName}</span>
                                    <span className="budget-limit-amount">
                                        {budget.limitAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                    <div className="budget-actions">
                                         {/* Botão Editar REMOVIDO */}
                                         <button onClick={(e) => handleDeleteBudget(e, budget.id, budget.categoryName)} className="action-button delete" title="Remover"> <FaTimes /> </button>
                                    </div>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default BudgetManager;