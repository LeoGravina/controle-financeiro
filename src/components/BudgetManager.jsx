// ATUALIZADO: src/components/BudgetManager.jsx
// - REMOVIDO o estado interno de 'budgets'.
// - REMOVIDO 'fetchBudgets' e seu 'useEffect'.
// - O componente agora recebe 'budgets' como prop (vinda do Dashboard).
// - Funções de Add/Update/Delete não precisam mais de 'setBudgets' (o onSnapshot do Dashboard cuida disso).
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore'; 
import { db, auth } from '../firebase/config'; 
import Select from 'react-select';
import CurrencyInput from './CurrencyInput';
import { FaTimes } from 'react-icons/fa'; 
import EditBudgetModal from './EditBudgetModal';

// 1. Recebe 'budgets' como prop
const BudgetManager = ({ categories = [], currentMonth, budgets = [] }) => {
    
    // 2. REMOVIDO: const [budgets, setBudgets] = useState([]); 
    // 3. REMOVIDO: const [loading, setLoading] = useState(true); 

    const [selectedCategoryToAdd, setSelectedCategoryToAdd] = useState(null); 
    const [addAmount, setAddAmount] = useState(''); 
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState(null);

    const user = auth.currentUser;
    const month = currentMonth.getMonth();
    const year = currentMonth.getFullYear();

    // 4. REMOVIDO: a função 'fetchBudgets'
    // 5. REMOVIDO: o 'useEffect' que chamava 'fetchBudgets'

    // Opções para o Select (sem alteração, agora usa a prop 'budgets')
    const categoryOptionsToAdd = useMemo(() => {
        const budgetedCategoryNames = budgets.map(b => b.categoryName);
        return categories
            .filter(cat => !budgetedCategoryNames.includes(cat.name)) 
            .map(cat => ({ value: cat.name, label: cat.name })) 
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [categories, budgets]); // Depende da prop 'budgets'

    
    // Funções do Modal (sem alteração)
    const openEditModal = (budget) => {
        setEditingBudget(budget);
        setIsEditModalOpen(true);
    };
    const closeEditModal = () => {
        setEditingBudget(null);
        setIsEditModalOpen(false);
    };

    // Função para SALVAR o orçamento
    const handleUpdateBudget = async (updatedBudget) => {
        if (!user || !updatedBudget || !updatedBudget.id) {
            alert("Erro: Orçamento inválido.");
            return;
        }
        
        const newLimit = parseFloat(updatedBudget.limitAmount);
        const budgetRef = doc(db, 'budgets', updatedBudget.id);

        try {
            await updateDoc(budgetRef, { limitAmount: newLimit });
            // 6. REMOVIDO: setBudgets(...) 
            // O onSnapshot do Dashboard vai atualizar a prop
            closeEditModal(); 
        } catch (error) {
            console.error("Erro ao atualizar orçamento:", error);
            alert("Erro ao salvar. Tente novamente.");
        }
    };


    // Função para ADICIONAR um novo orçamento
    const handleAddBudget = async (e) => {
        e.preventDefault();
        // ... (validação)
        if (!user || !selectedCategoryToAdd || addAmount === '' || parseFloat(addAmount) <= 0) {
            alert("Selecione uma categoria e insira um limite válido.");
            return;
        }

        const categoryName = selectedCategoryToAdd.value;
        const limitAmount = parseFloat(addAmount);

        // ... (validação 'existing')
        const existing = budgets.find(b => b.categoryName === categoryName);
        if (existing) {
            alert("Já existe um orçamento para esta categoria neste mês.");
            return;
        }

        try {
            // Apenas adiciona o documento.
            await addDoc(collection(db, 'budgets'), {
                userId: user.uid,
                categoryName,
                month,
                year,
                limitAmount
            });
            // 7. REMOVIDO: setBudgets(...)
            // O onSnapshot do Dashboard vai atualizar a prop
            setSelectedCategoryToAdd(null);
            setAddAmount('');
        } catch (error) {
            console.error("Erro ao adicionar orçamento:", error);
            alert("Erro ao adicionar. Tente novamente.");
        }
    };

    // Função para REMOVER um orçamento
    const handleDeleteBudget = async (e, budgetId, categoryName) => {
        e.stopPropagation(); 
        if (!user || !window.confirm(`Tem certeza que deseja remover o orçamento para "${categoryName}"?`)) return;

        try {
            await deleteDoc(doc(db, 'budgets', budgetId));
            // 8. REMOVIDO: setBudgets(...)
            // O onSnapshot do Dashboard vai atualizar a prop
        } catch (error) {
            console.error("Erro ao remover orçamento:", error);
            alert("Erro ao remover. Tente novamente.");
        }
    }

    // 9. REMOVIDO: a checagem de 'loading' e 'user' (o Dashboard já faz isso)

    return (
        <>
            <EditBudgetModal 
                isOpen={isEditModalOpen}
                onClose={closeEditModal}
                budget={editingBudget}
                onSave={handleUpdateBudget}
            />

            <div className="budget-manager">
                <h4>Adicionar Orçamento</h4>
                <form onSubmit={handleAddBudget} className="budget-add-form">
                    <Select
                        options={categoryOptionsToAdd}
                        value={selectedCategoryToAdd}
                        onChange={setSelectedCategoryToAdd}
                        placeholder="-- Categoria --"
                        className="react-select-container budget-category-select"
                        classNamePrefix="react-select"
                        // 'budgets' e 'categories' agora são props e estão sempre em sincronia
                        noOptionsMessage={() => "Todas as categorias já têm orçamento"}
                        required
                    />
                    <CurrencyInput 
                        value={addAmount} 
                        onChange={setAddAmount} 
                        placeholder="Limite (R$)"
                        required
                        aria-label="Limite do Orçamento"
                    />
                    <button type="submit" className="submit-button budget-add-button">
                        Adicionar
                    </button>
                </form>

                <h4 style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    Orçamentos do Mês
                </h4>
                {/* A prop 'budgets' é usada aqui */}
                {budgets.length === 0 ? (
                    <p className="empty-message">Nenhum orçamento definido para este mês.</p>
                ) : (
                    // E aqui
                    <ul className="budget-list">
                        {budgets.sort((a,b) => a.categoryName.localeCompare(b.categoryName)).map(budget => (
                            <li 
                                key={budget.id} 
                                onClick={() => openEditModal(budget)}
                                className={'editable'}
                                title={`Editar orçamento de ${budget.categoryName}`}
                            >
                                <span className="budget-category-name">{budget.categoryName}</span>
                                <span className="budget-limit-amount">
                                    {budget.limitAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                                <div className="budget-actions">
                                     <button onClick={(e) => handleDeleteBudget(e, budget.id, budget.categoryName)} className="action-button delete" title="Remover"> <FaTimes /> </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
};

export default BudgetManager;